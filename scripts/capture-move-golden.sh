#!/usr/bin/env bash
# scripts/capture-move-golden.sh
#
# Captures the BCS golden vector emitted by
# `aperture::aperture_tests::statement_bcs_vector_test` and writes it to
# `packages/core/test/goldenVectors/statement.bcs.hex`. Run once after any
# intentional change to the Statement layout; commit the result. The Vitest
# `statementCodec.test.ts` asserts equality against this file byte-for-byte.
#
# Convention: any drift between the captured hex and the live Move test
# output indicates the Statement layout changed. Update the fixture AND the
# TS codec in the same commit (do not pin one without the other).

set -eu
set -o pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

OUT_DIR="$REPO_ROOT/packages/core/test/goldenVectors"
OUT_FILE="$OUT_DIR/statement.bcs.hex"
mkdir -p "$OUT_DIR"

# Run only the BCS vector test to keep output tight. The filter matches the
# fully-qualified test name as a substring; `--path move` scopes the run.
OUTPUT="$(sui move test --path move statement_bcs_vector_test 2>&1)" || {
  echo "✗ sui move test failed; cannot capture golden vector" >&2
  exit 1
}

# Grep the hex string from the [debug] line. Pattern: '[debug] 0x<hex>'.
HEX="$(printf '%s\n' "$OUTPUT" | grep -E '^\[debug\] 0x[0-9a-fA-F]+$' | head -1 | sed -E 's/^\[debug\] 0x([0-9a-fA-F]+)$/\1/')"

if [ -z "$HEX" ]; then
  echo "✗ no [debug] hex line found in move test output" >&2
  echo "  (expected `std::debug::print(&bytes)` in statement_bcs_vector_test)" >&2
  echo "  --- output ---" >&2
  printf '%s\n' "$OUTPUT" >&2
  exit 2
fi

printf '%s\n' "$HEX" > "$OUT_FILE"
printf '✓ captured %d bytes to %s\n' "$((${#HEX} / 2))" "$OUT_FILE"
