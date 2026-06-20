#!/usr/bin/env bash
# scripts/build-wasm.sh
# Wrapper that pins `build:wasm` to a Linux/WSL2 environment.
#
# Story 1.1a AC6: "On Windows, build:wasm runs in WSL2/container for
# deterministic output". wasm-pack + `\` vs `/` in `wasmUrl` are fragile on
# Windows native — see architecture.md#Toolchain traps.
#
# This script is a thin guard: it refuses to run on Windows native (cmd.exe
# path) and forwards to pnpm on Linux/WSL2. macOS is also refused in CI
# (story says the documented target is WSL2); developers on a Mac can run
# `pnpm --filter @aperture/wasm build:wasm` directly while iterating, but
# CI should gate on this script's exit code.

set -eu
set -o pipefail

EXIT_OK=0
EXIT_TOOLCHAIN=1      # preflight-class error (tooling missing)
EXIT_UNSUPPORTED_OS=2 # host OS is not in the supported matrix

case "$(uname -s 2>/dev/null)" in
  MINGW*|MSYS*|CYGWIN*)
    printf '\033[31m✗ build:wasm cannot run on Windows native.\033[0m\n' >&2
    printf '  wasm-pack + wasmUrl path handling are fragile on Windows.\n' >&2
    printf '  Re-run inside WSL2: \`wsl\` → \`./scripts/build-wasm.sh\`\n' >&2
    exit "$EXIT_UNSUPPORTED_OS"
    ;;
  Linux*)
    printf '\033[36mℹ Linux detected — proceeding with wasm-pack build.\033[0m\n'
    ;;
  Darwin*)
    # Per the story's documented target (WSL2) and the architecture
    # toolchain-trap note, macOS is out of the supported matrix for CI.
    # Local devs can run `pnpm --filter @aperture/wasm build:wasm` directly.
    printf '\033[31m✗ build:wasm is not supported on macOS (CI target is WSL2/Linux only).\033[0m\n' >&2
    printf '  For local iteration, run \`pnpm --filter @aperture/wasm build:wasm\` directly.\n' >&2
    exit "$EXIT_UNSUPPORTED_OS"
    ;;
  *)
    printf '\033[31m✗ build:wasm: unknown uname "%s" — refusing to build.\033[0m\n' "$(uname -s)" >&2
    printf '  Supported: Linux (incl. WSL2). Refusing on Windows native and macOS.\n' >&2
    exit "$EXIT_UNSUPPORTED_OS"
    ;;
esac

# pnpm is required (preflight should have caught a missing pnpm).
if ! command -v pnpm >/dev/null 2>&1; then
  printf '\033[31m✗ pnpm not on PATH.\033[0m\n' >&2
  printf '  Run `./scripts/preflight.sh` first to install/activate pnpm via corepack.\n' >&2
  exit "$EXIT_TOOLCHAIN"
fi

exec pnpm --filter @aperture/wasm build:wasm
exit "$EXIT_OK"  # unreachable (exec replaces the process) but documents the success code
