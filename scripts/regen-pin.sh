#!/usr/bin/env bash
# scripts/regen-pin.sh
# Regenerate vendor/contra/PINNED_VERSION from the tracked sources of truth.
# The 3 tracked pin locations (per Story 1.1a AC2) are:
#   1. vendor/contra submodule HEAD  (read-only, set by `git submodule update`)
#   2. move/Move.toml  'rev ='        (tracked in this repo)
#   3. .npmrc comment                  (tracked in this repo)
# This script mirrors the canonical pair (sha + ts-sdk version) into
# vendor/contra/PINNED_VERSION so the adapterVersion test (which expects the
# file at that path per the story spec) can read it. The file inside the
# submodule is untracked by design (the submodule is read-only).
#
# Invoked by:
#   - `pnpm postinstall` (root package.json) on every install → mandatory for fresh clones
#   - `./scripts/preflight.sh` at the top of the toolchain check
#   - `scripts/verify-pin.sh` to cross-check the 3 tracked locations
set -eu
set -o pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIN_PATH="$REPO_ROOT/vendor/contra/PINNED_VERSION"
VENDORED_CONTRA="$REPO_ROOT/vendor/contra"
VENDORED_TS_SDK_PKG="$VENDORED_CONTRA/ts-sdk/package.json"

# 0. Refuse to run if the submodule isn't initialised. Patching P22b: a
#    `mkdir -p` here would silently create vendor/contra as a regular
#    directory, masking the missing-submodule state.
if [ ! -d "$VENDORED_CONTRA" ] || { [ ! -e "$VENDORED_CONTRA/.git" ] && [ ! -f "$VENDORED_CONTRA/.git" ]; }; then
  printf '\033[31m✗ regen-pin: vendor/contra submodule is not initialised.\033[0m\n' >&2
  printf '  Run \`git submodule update --init --recursive\` first.\n' >&2
  exit 1
fi

# 1. Extract the Move git sha from move/Move.toml (tracked source of truth).
#    Accept mixed-case SHAs (humans paste them) and lowercase-normalise so the
#    shell layer agrees with adapterVersion.test.ts:readPin() (P-MED-3).
MOVE_SHA=$(grep -E '^\s*rev\s*=\s*"[0-9a-fA-F]{40}"' "$REPO_ROOT/move/Move.toml" \
  | head -1 | sed -E 's/.*"([0-9a-fA-F]{40})".*/\1/' | tr 'A-F' 'a-f')

if [ -z "$MOVE_SHA" ]; then
  printf '\033[31m✗ regen-pin: could not extract Move git sha from move/Move.toml\033[0m\n' >&2
  exit 1
fi

# 2. Extract the ts-sdk version from the vendored package.json. Patching P11:
#    do NOT fall back to "1.0.0" if the submodule hasn't been cloned — the
#    adapterVersion test would then assert against a fake version and pass
#    green even when the pin is unverified. Fail loudly instead.
if [ ! -f "$VENDORED_TS_SDK_PKG" ]; then
  printf '\033[31m✗ regen-pin: vendored ts-sdk package.json missing at %s\033[0m\n' "$VENDORED_TS_SDK_PKG" >&2
  printf '  Submodule is initialised but ts-sdk/ is absent. Did the clone complete?\n' >&2
  exit 1
fi

# Patching P21: wrap JSON.parse in try/catch so a corrupted submodule clone
# gives a useful error instead of an opaque SyntaxError.
TS_SDK_VERSION=""
if command -v node >/dev/null 2>&1; then
  # P-MED-1: capture stdout only on the success path so Node deprecation
  # warnings / ExperimentalWarnings don't get concatenated into TS_SDK_VERSION
  # and silently corrupt PINNED_VERSION. On failure, re-run the node command
  # to surface the real error to stderr.
  TS_SDK_VERSION=$(node -e '
    const fs = require("node:fs");
    try {
      const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      if (!pkg.version) { process.stderr.write("ts-sdk package.json has no version field\n"); process.exit(2); }
      process.stdout.write(pkg.version);
    } catch (e) {
      process.stderr.write("failed to parse ts-sdk package.json: " + e.message + "\n");
      process.exit(2);
    }
  ' "$VENDORED_TS_SDK_PKG" 2>/dev/null) || {
    node -e 'process.stderr.write("ts-sdk parse failed; see below\n")' >&2
    node -e '
      const fs = require("node:fs");
      const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    ' "$VENDORED_TS_SDK_PKG" >&2 || true
    exit 1
  }
else
  # Fallback path for systems without node (rare; preflight should have
  # caught it). Patching P12: anchor to `^\s*"version"` so nested package
  # metadata doesn't win the first-match race. Patching P22: accept
  # pre-release/suffix versions like 1.0.0-rc.1.
  TS_SDK_VERSION=$(grep -E '^\s*"version"\s*:\s*"[^"]+"' "$VENDORED_TS_SDK_PKG" \
    | head -1 | sed -E 's/.*"version"\s*:\s*"([^"]+)".*/\1/')
  if [ -z "$TS_SDK_VERSION" ]; then
    printf '\033[31m✗ regen-pin: could not extract ts-sdk version from %s\033[0m\n' "$VENDORED_TS_SDK_PKG" >&2
    exit 1
  fi
fi

# 3. Cross-check: the submodule HEAD should equal MOVE_SHA. If not, the pin
#    is stale (the submodule has been updated but Move.toml hasn't). Warn,
#    don't abort — let preflight be the gate.
SUB_SHA=""
if command -v git >/dev/null 2>&1; then
  SUB_SHA=$(git -C "$VENDORED_CONTRA" rev-parse HEAD 2>/dev/null || true)
fi

# 4. Write the canonical pin file inside the submodule (untracked, regenerated).
mkdir -p "$(dirname "$PIN_PATH")"
cat > "$PIN_PATH" << EOF
Move git sha: $MOVE_SHA
ts-sdk version: $TS_SDK_VERSION
upstream: https://github.com/MystenLabs/confidential-transfers
# No "branch =" line — the pin is SHA-only by design (D1). Re-pinning
# means: git -C vendor/contra checkout <NEW_SHA> + pnpm postinstall.
pinned_at: $(date -u +%Y-%m-%d)
EOF

# 5. Sanity-print.
printf '\033[32m✓\033[0m regenerated %s\n' "$PIN_PATH"
printf '  Move git sha:   %s\n' "$MOVE_SHA"
printf '  ts-sdk version: %s\n' "$TS_SDK_VERSION"
if [ -n "$SUB_SHA" ] && [ "$SUB_SHA" != "$MOVE_SHA" ]; then
  printf '\033[33m!\033[0m submodule HEAD (%s) does not match Move.toml rev (%s)\n' \
    "$SUB_SHA" "$MOVE_SHA"
  printf '  → run \`git submodule update --init --recursive\` and re-pin\n'
fi
