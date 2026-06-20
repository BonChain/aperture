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
set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIN_PATH="$REPO_ROOT/vendor/contra/PINNED_VERSION"

# 1. Extract the Move git sha from move/Move.toml (tracked source of truth).
MOVE_SHA=$(grep -E '^\s*rev\s*=\s*"[0-9a-f]{40}"' "$REPO_ROOT/move/Move.toml" \
  | head -1 | sed -E 's/.*"([0-9a-f]{40})".*/\1/')

if [ -z "$MOVE_SHA" ]; then
  printf '\033[31m✗ regen-pin: could not extract Move git sha from move/Move.toml\033[0m\n' >&2
  exit 1
fi

# 2. Extract the ts-sdk version from the vendored package.json. Fall back to
#    "1.0.0" if the submodule hasn't been cloned yet (CI bootstrap).
TS_SDK_VERSION="1.0.0"
if [ -f "$REPO_ROOT/vendor/contra/ts-sdk/package.json" ]; then
  TS_SDK_VERSION=$(grep -E '"version"\s*:\s*"[0-9.]+"' \
    "$REPO_ROOT/vendor/contra/ts-sdk/package.json" \
    | head -1 | sed -E 's/.*"version"\s*:\s*"([^"]+)".*/\1/')
fi

# 3. Cross-check: the submodule HEAD should equal MOVE_SHA. If not, the pin
#    is stale (the submodule has been updated but Move.toml hasn't). Warn,
#    don't abort — let preflight be the gate.
SUB_SHA=""
if command -v git >/dev/null 2>&1 && [ -d "$REPO_ROOT/vendor/contra/.git" ]; then
  SUB_SHA=$(git -C "$REPO_ROOT/vendor/contra" rev-parse HEAD 2>/dev/null || true)
fi

# 4. Write the canonical pin file inside the submodule (untracked, regenerated).
mkdir -p "$(dirname "$PIN_PATH")"
cat > "$PIN_PATH" << EOF
Move git sha: $MOVE_SHA
ts-sdk version: $TS_SDK_VERSION
upstream: https://github.com/MystenLabs/confidential-transfers
branch: main
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
