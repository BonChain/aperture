#!/usr/bin/env bash
# scripts/build-wasm.sh
# Wrapper that pins `build:wasm` to a Linux/WSL2 environment.
#
# Story 1.1a AC6: "On Windows, build:wasm runs in WSL2/container for
# deterministic output". wasm-pack + `\` vs `/` in `wasmUrl` are fragile on
# Windows native — see architecture.md#Toolchain traps.
#
# This script is a thin guard: it refuses to run on Windows native (cmd.exe
# path) and forwards to pnpm on Linux/WSL2.

set -eu

if [ -z "${WSL_DISTRO_NAME:-}" ] && [ ! -f /proc/version ] || (uname -r 2>/dev/null | grep -qi 'microsoft' || true); then
  : # Linux or WSL2 — fine
fi

case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*)
    printf '\033[31m✗ build:wasm cannot run on Windows native.\033[0m\n' >&2
    printf '  wasm-pack + wasmUrl path handling are fragile on Windows.\n' >&2
    printf '  Re-run inside WSL2: \`wsl\` → \`./scripts/build-wasm.sh\`\n' >&2
    exit 2
    ;;
  Linux*)
    printf '\033[36mℹ Linux detected — proceeding with wasm-pack build.\033[0m\n'
    ;;
  Darwin*)
    printf '\033[33m! macOS detected — wasm-pack should work but WSL2 was the\n' >&2
    printf '  documented target. Proceeding anyway.\033[0m\n' >&2
    ;;
  *)
    printf '\033[33m! Unknown uname "%s" — proceeding with wasm-pack build.\033[0m\n' "$(uname -s)" >&2
    ;;
esac

# pnpm is required (preflight should have caught a missing pnpm).
if ! command -v pnpm >/dev/null 2>&1; then
  printf '\033[31m✗ pnpm not on PATH.\033[0m\n' >&2
  printf '  Run `./scripts/preflight.sh` first to install/activate pnpm via corepack.\n' >&2
  exit 1
fi

exec pnpm --filter @aperture/wasm build:wasm
