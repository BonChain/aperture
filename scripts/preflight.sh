#!/usr/bin/env bash
# scripts/preflight.sh
# Verify Aperture dev toolchain. Fails fast with an actionable message per missing tool.
# Source: Story 1.1a AC1 (AR-2, NFR-10) — preflight must fail fast.
#
# This script also regenerates vendor/contra/PINNED_VERSION before the toolchain
# checks (per code-review P8). The same regen runs as `pnpm postinstall`, so on
# a normal `pnpm install` flow the pin file is already in place — preflight just
# guarantees it before the toolchain check.
set -eu
set -o pipefail

PASS=0
WARN=0
FAIL=0

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
warn() { printf "  \033[33m!\033[0m %s — %s\n" "$1" "$2"; WARN=$((WARN+1)); }
die()  { printf "  \033[31m✗\033[0m %s — %s\n" "$1" "$2"; FAIL=$((FAIL+1)); }

have() { command -v "$1" >/dev/null 2>&1; }

min_version() {
  # min_version <current> <required>
  # returns 0 if current >= required (semver-ish)
  local cur="$1" req="$2"
  awk -v c="$cur" -v r="$req" 'BEGIN {
    n=split(c,a,"."); m=split(r,b,".");
    for(i=1;i<=m;i++){ if((a[i]+0) < (b[i]+0)) exit 1; if((a[i]+0) > (b[i]+0)) exit 0; }
    exit 0;
  }'
}

# P-LOW-1: derive REPO_ROOT from $0 so preflight works from any subdirectory,
# not just the repo root. regen-pin.sh / verify-pin.sh already do this.
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

printf "\n\033[1mAperture preflight\033[0m\n"
printf "Regenerating pin file from tracked sources...\n"
"$REPO_ROOT/scripts/regen-pin.sh"
printf "\nChecking required toolchain...\n\n"

# 1. rustc
if have rustc; then
  RUSTC_VER=$(rustc --version | awk '{print $2}')
  ok "rustc ${RUSTC_VER}"
else
  die "rustc" "install via \`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && source \$HOME/.cargo/env\`"
fi

# 2. rustup target add wasm32-unknown-unknown
if have rustup; then
  if rustup target list --installed 2>/dev/null | grep -q '^wasm32-unknown-unknown$'; then
    ok "rustup target wasm32-unknown-unknown"
  else
    die "wasm32-unknown-unknown target" "run \`rustup target add wasm32-unknown-unknown\`"
  fi
else
  # P-LOW-4 (AC1 gap): if rustup is missing, we can't verify the wasm32 target.
  # Previously this was a `warn`, letting preflight pass on a box that can't
  # actually build wasm. Treat as a hard failure per AC1 "fails fast".
  die "rustup" "rustup not found — install via \`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y\` then \`source \$HOME/.cargo/env\`. Required to verify wasm32-unknown-unknown target per AC1."
fi

# 3. wasm-pack
if have wasm-pack; then
  WP_VER=$(wasm-pack --version | awk '{print $2}')
  ok "wasm-pack ${WP_VER}"
else
  die "wasm-pack" "install via \`cargo install wasm-pack\` (or \`curl https://rustwasm.github.io/wasm-pack/installer/init.sh | sh\`)"
fi

# 4. node >= 20
if have node; then
  NODE_VER=$(node -v | sed 's/^v//')
  if min_version "$NODE_VER" "20.0.0"; then
    ok "node v${NODE_VER}"
  else
    die "node" "current v${NODE_VER} < 20 — install Node 20+ via nvm: \`nvm install 20 && nvm use 20\`"
  fi
else
  die "node" "install Node 20+ via nvm: \`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && nvm install 20 && nvm use 20\`"
fi

# 5. pnpm
if have pnpm; then
  PNPM_VER=$(pnpm -v)
  ok "pnpm ${PNPM_VER}"
else
  die "pnpm" "enable corepack and activate: \`corepack enable && corepack prepare pnpm@latest --activate\`"
fi

# 6. git (sanity — story runs in a git repo)
if have git; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    ok "git (inside a repo)"
  else
    die "git repo" "this script must run from inside a git working tree"
  fi
else
  die "git" "install git (e.g. \`sudo apt install git\`)"
fi

# 7. sui CLI on devnet channel (SPIKE-1 on devnet — Story 1.1c)
#    Warn (not fail) if the sui binary is missing or on a non-devnet channel;
#    off-chain work (1.1a/1.1b) doesn't need it. The `pnpm pretest:devnet`
#    script and the on-chain test fail loud on the wrong channel.
if have sui; then
  SUI_VER=$(sui --version 2>/dev/null | awk '{print $NF}' || echo "unknown")
  SUI_ACTIVE=$(sui client active-env 2>/dev/null | tr -d '[]' | awk '{print $NF}' || echo "unknown")
  if [ "$SUI_ACTIVE" = "devnet" ]; then
    ok "sui ${SUI_VER} (active env: devnet)"
  else
    warn "sui active env" "currently '${SUI_ACTIVE}' — SPIKE-1 on-chain needs \`sui client switch --env devnet\`"
  fi
else
  warn "sui CLI" "not found — install via \`suiup install sui@devnet-1.73.0 && suiup default set sui@devnet-1.73.0\` (required for Story 1.1c on-chain)"
fi

printf "\n\033[1mSummary:\033[0m pass=%d warn=%d fail=%d\n" "$PASS" "$WARN" "$FAIL"

if [ "$FAIL" -gt 0 ]; then
  printf "\n\033[31mPreflight FAILED.\033[0m Install the missing tools above, then re-run.\n"
  exit 1
fi

if [ "$WARN" -gt 0 ]; then
  printf "\n\033[33mPreflight passed with warnings.\033[0m Review them above before continuing.\n"
fi

printf "\n\033[32mPreflight OK.\033[0m\n"
exit 0
