#!/usr/bin/env bash
# scripts/publish-devnet.sh
#
# Story 1.1c on devnet — publish the `aperture` Move package to devnet, capture
# the published package id, and persist to `scripts/.published-devnet.json`
# (gitignored).
#
# Idempotent:
#   - If `scripts/.published-devnet.json` exists AND its `moveSourcesHash`
#     matches the current `git -C move rev-parse HEAD:move/sources`, the
#     publish is skipped and the cached packageId is reused.
#   - If the Move sources changed, republishes and overwrites the JSON.
#   - If the cached packageId 404s on-chain (devnet reset), republishes.
#
# Requires: `pnpm pretest:devnet` to have just succeeded (sui env on devnet,
# funded address).
#
# Exit codes:
#   EXIT_OK               = 0
#   EXIT_PRETEST_FAILED   = 20 ; pretest-devnet failed
#   EXIT_PUBLISH_FAILED   = 21 ; sui client publish failed
#   EXIT_CAPTURE_FAILED   = 22 ; could not parse packageId from effects

set -eu
set -o pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

CONFIG_PATH="$REPO_ROOT/scripts/.published-devnet.json"
MOVE_DIR="$REPO_ROOT/move"
DEVNET_RPC="https://fullnode.devnet.sui.io:443"
GAS_BUDGET=500000000  # 0.5 SUI; aperture package is small

EXIT_OK=0
EXIT_PRETEST_FAILED=20
EXIT_PUBLISH_FAILED=21
EXIT_CAPTURE_FAILED=22

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m %s — %s\n" "$1" "$2"; }
die()  { printf "  \033[31m✗\033[0m %s — %s\n" "$1" "$2"; exit "$3"; }

# 0. pretest must have just run successfully
if ! "$REPO_ROOT/scripts/pretest-devnet.sh" >/dev/null 2>&1; then
  die "pretest" "pretest-devnet failed. Run \`pnpm pretest:devnet\` first and resolve any errors." "$EXIT_PRETEST_FAILED"
fi
ok "pretest-devnet green"

# 1. compute current move sources hash
MOVE_SOURCES_HASH=$(git -C "$REPO_ROOT" rev-parse HEAD:move 2>/dev/null || echo "no-git")
ok "move sources hash: ${MOVE_SOURCES_HASH}"

# 2. check cached config
NEED_PUBLISH=1
if [ -f "$CONFIG_PATH" ]; then
  CACHED_HASH=$(python3 -c "
import json, sys
try:
    print(json.load(open('$CONFIG_PATH')).get('moveSourcesHash', ''))
except Exception:
    print('')
")
  CACHED_PKG=$(python3 -c "
import json, sys
try:
    print(json.load(open('$CONFIG_PATH')).get('packageId', ''))
except Exception:
    print('')
")

  if [ -n "$CACHED_HASH" ] && [ "$CACHED_HASH" = "$MOVE_SOURCES_HASH" ] && [ -n "$CACHED_PKG" ]; then
    # Verify the cached packageId still resolves on devnet (not a stale id
    # from before a devnet reset). We use a read-only `sui client object`
    # call on the package id — if the object doesn't exist, sui errors.
    if sui client object --id "$CACHED_PKG" --json 2>/dev/null | grep -q '"objectId"'; then
      ok "reusing cached packageId: ${CACHED_PKG}"
      NEED_PUBLISH=0
    else
      warn "cached packageId" "${CACHED_PKG} no longer exists on devnet (likely post-reset) — republishing"
    fi
  fi
fi

# 3. publish if needed
PACKAGE_ID=""
TX_DIGEST=""
if [ "$NEED_PUBLISH" = "1" ]; then
  printf "  publishing aperture package to devnet (gas budget %s MIST)...\n" "$GAS_BUDGET"
  PUBLISH_OUT=$(sui client publish "$MOVE_DIR" --gas-budget "$GAS_BUDGET" --json 2>&1) || {
    # Handle the "already published" case: read the existing packageId from
    # `move/Published.toml` (sui writes this on a successful publish) and
    # treat it as the source of truth. This keeps the script idempotent
    # across re-runs even if the JSON config was lost.
    if printf '%s' "$PUBLISH_OUT" | grep -qE 'already published|Published\.toml'; then
      PUBLISHED_TOML="$MOVE_DIR/Published.toml"
      if [ -f "$PUBLISHED_TOML" ]; then
        TOML_PKG=$(python3 -c "
import re
with open('$PUBLISHED_TOML') as f:
    text = f.read()
m = re.search(r'published-at\s*=\s*\"(0x[0-9a-fA-F]+)\"', text)
print(m.group(1) if m else '')
")
        TOML_CHAIN=$(python3 -c "
import re
with open('$PUBLISHED_TOML') as f:
    text = f.read()
# chain-id is bare hex (no 0x prefix) in Published.toml
m = re.search(r'chain-id\s*=\s*\"([0-9a-fA-F]+)\"', text)
print(m.group(1) if m else '')
")
        if [ -n "$TOML_PKG" ] && [ -n "$TOML_CHAIN" ]; then
          ok "package already published (idempotent); reusing ${TOML_PKG} (chain ${TOML_CHAIN})"
          PACKAGE_ID="$TOML_PKG"
          # No tx digest available from Published.toml; that's fine.
          TX_DIGEST=""
        else
          die "sui client publish" "already-published but Published.toml missing fields. Inspect $PUBLISHED_TOML. Output: $PUBLISH_OUT" "$EXIT_CAPTURE_FAILED"
        fi
      else
        die "sui client publish" "already-published but no Published.toml. Output: $PUBLISH_OUT" "$EXIT_CAPTURE_FAILED"
      fi
    else
      die "sui client publish" "failed. Output: $PUBLISH_OUT" "$EXIT_PUBLISH_FAILED"
    fi
  }

  # If the TOML-fallback didn't already set PACKAGE_ID, parse the JSON
  # success output. Sui's publish output uses `type: "published"` with a
  # top-level `packageId` field on the same object — distinct from object
  # types like `0x2::package::Package`.
  if [ -z "$PACKAGE_ID" ]; then
    PACKAGE_ID=$(printf '%s' "$PUBLISH_OUT" | python3 -c "
import sys, json
text = sys.stdin.read()
start = text.find('{')
if start == -1:
    sys.exit(0)
try:
    data = json.loads(text[start:])
except Exception:
    sys.exit(0)
effects = data.get('effects', data)
for c in effects.get('created', []):
    if c.get('type') == 'published' and 'packageId' in c:
        print(c['packageId'])
        sys.exit(0)
" 2>/dev/null || true)

    if [ -z "$PACKAGE_ID" ]; then
      die "capture packageId" "could not parse from publish effects. Inspect with: $PUBLISH_OUT | head -40" "$EXIT_CAPTURE_FAILED"
    fi

    TX_DIGEST=$(printf '%s' "$PUBLISH_OUT" | python3 -c "
import sys, json
text = sys.stdin.read()
start = text.find('{')
if start == -1:
    sys.exit(0)
try:
    data = json.loads(text[start:])
    print(data.get('digest', ''))
except Exception:
    pass
" 2>/dev/null || true)

    ok "published packageId: ${PACKAGE_ID}"
    ok "tx digest: ${TX_DIGEST}"
  fi

  # 4. write config
  cat > "$CONFIG_PATH" <<EOF
{
  "packageId": "${PACKAGE_ID}",
  "txDigest": "${TX_DIGEST}",
  "moveSourcesHash": "${MOVE_SOURCES_HASH}",
  "publishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  ok "wrote $CONFIG_PATH"
fi

printf "\n\033[32m✓ publish-devnet: packageId available for on-chain test.\033[0m\n"
exit "$EXIT_OK"
