#!/usr/bin/env bash
# scripts/pretest-devnet.sh
#
# Story 1.1c on devnet — idempotent pretest fixture:
#   1. Asserts `sui` is on PATH and on the `devnet` env
#   2. Reads the active address
#   3. Asserts the address has gas; if below threshold, requests from faucet
#   4. Asserts the devnet chain id is reachable
#
# Idempotent: re-runnable any number of times. On a devnet reset:
#   - the active address loses all objects (including any published package)
#   - gas is empty; the faucet request is needed
#   - the faucet may rate-limit → exit FAUCET_THROTTLED with actionable message
#
# Exit codes (named so the on-chain test / pnpm scripts can branch on them):
#   EXIT_OK               = 0  ; all checks passed
#   EXIT_NO_SUI           = 10 ; sui CLI not on PATH
#   EXIT_WRONG_ENV        = 11 ; sui client active-env is not `devnet`
#   EXIT_NO_ADDRESS       = 12 ; sui client active-address is empty
#   EXIT_NO_GAS           = 13 ; gas is below threshold AND faucet request failed (non-throttle)
#   EXIT_FAUCET_THROTTLED = 14 ; faucet rate-limited — user must wait
#   EXIT_RPC_DOWN         = 15 ; cannot reach fullnode.devnet.sui.io:443
#
# Re-pin policy: when the devnet chain id changes (network reset), update the
# `DEVNET_CHAIN_ID` value below and re-run.

set -u
set -o pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Configurable thresholds
GAS_THRESHOLD_MIST=500000000   # 0.5 SUI
DEVNET_RPC="https://fullnode.devnet.sui.io:443"
# Current devnet chain id (as of 2026-06-20). When devnet resets, this changes
# and `sui client chain-identifier` returns a new hex. Update here.
DEVNET_CHAIN_ID="5ea2c653"

EXIT_OK=0
EXIT_NO_SUI=10
EXIT_WRONG_ENV=11
EXIT_NO_ADDRESS=12
EXIT_NO_GAS=13
EXIT_FAUCET_THROTTLED=14
EXIT_RPC_DOWN=15

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m %s — %s\n" "$1" "$2"; }
die()  { printf "  \033[31m✗\033[0m %s — %s\n" "$1" "$2"; exit "$3"; }

# 1. sui on PATH
if ! command -v sui >/dev/null 2>&1; then
  die "sui" "not on PATH — install: \`suiup install sui@devnet-1.73.0 && suiup default set sui@devnet-1.73.0\`" "$EXIT_NO_SUI"
fi
SUI_VER=$(sui --version 2>/dev/null | awk '{print $NF}')
ok "sui ${SUI_VER} on PATH"

# 2. active env = devnet
ACTIVE_ENV=$(sui client active-env 2>/dev/null | tr -d '[]' | awk '{print $NF}')
if [ "$ACTIVE_ENV" != "devnet" ]; then
  die "active env" "currently '${ACTIVE_ENV:-<none>}' — run \`sui client switch --env devnet\`" "$EXIT_WRONG_ENV"
fi
ok "active env: devnet"

# 3. RPC reachable + chain id matches
CHAIN_ID=$(sui client chain-identifier 2>/dev/null || true)
if [ -z "$CHAIN_ID" ]; then
  die "devnet RPC" "no response from $DEVNET_RPC — check network or try \`sui client new-env --alias devnet --rpc $DEVNET_RPC\`" "$EXIT_RPC_DOWN"
fi
if [ "$CHAIN_ID" != "$DEVNET_CHAIN_ID" ]; then
  warn "devnet chain id" "current ${CHAIN_ID} differs from pinned ${DEVNET_CHAIN_ID} (likely post-reset). Update DEVNET_CHAIN_ID in this script and verify the move/Move.toml pin still applies."
else
  ok "chain id: ${CHAIN_ID}"
fi

# 4. active address
ACTIVE_ADDR=$(sui client active-address 2>/dev/null || true)
if [ -z "$ACTIVE_ADDR" ]; then
  die "active address" "empty — run \`sui client new-address devnet-fixture\` (or any alias) and \`sui client switch --address <addr>\`" "$EXIT_NO_ADDRESS"
fi
ok "active address: ${ACTIVE_ADDR}"

# 5. gas balance
GAS_MIST=$(sui client gas --json 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        total = sum(int(c.get('mistBalance', c.get('balance', 0))) for c in data)
        print(total)
    else:
        print(0)
except Exception:
    print(0)
" 2>/dev/null || echo 0)

if [ "${GAS_MIST:-0}" -lt "$GAS_THRESHOLD_MIST" ]; then
  printf "  gas: %s MIST (below threshold %s) — requesting from faucet...\n" "${GAS_MIST:-0}" "$GAS_THRESHOLD_MIST"
  # No --url flag: let sui pick the faucet for the active env (devnet). The
  # `sui client faucet --url <host>` flag exists in some versions but
  # rejects unknown hosts with 405; the env-aware default is what we want.
  FAUCET_OUT=$(sui client faucet 2>&1) || {
    if printf '%s' "$FAUCET_OUT" | grep -qiE 'throttl|too many|rate limit|429'; then
      die "faucet" "rate-limited. Wait a few hours or use a different address. Output: $FAUCET_OUT" "$EXIT_FAUCET_THROTTLED"
    fi
    die "faucet" "request failed. Output: $FAUCET_OUT" "$EXIT_NO_GAS"
  }
  # Re-read gas
  sleep 2
  GAS_MIST=$(sui client gas --json 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        print(sum(int(c.get('mistBalance', c.get('balance', 0))) for c in data))
    else:
        print(0)
except Exception:
    print(0)
" 2>/dev/null || echo 0)
  if [ "${GAS_MIST:-0}" -lt "$GAS_THRESHOLD_MIST" ]; then
    die "gas" "still ${GAS_MIST:-0} MIST after faucet request. Address may be new and not yet credited. Re-run after a minute." "$EXIT_NO_GAS"
  fi
fi
ok "gas: ${GAS_MIST} MIST"

printf "\n\033[32m✓ pretest-devnet: all checks passed.\033[0m Active env ready for on-chain test.\n"
exit "$EXIT_OK"
