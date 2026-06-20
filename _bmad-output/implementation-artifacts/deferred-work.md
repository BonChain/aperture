# Deferred Work

Items consciously deferred from prior code review sessions, with reason
and the story in which they will be addressed.

## Deferred from: code review of 1-1a-vendored-pinned-baseline-first-green-build (2026-06-20)

### [Review][Defer · LOW] `timingSafeEqual` leaks length / not constant-time across unequal lengths

- **Location:** `packages/core/src/crypto/index.ts` → `timingSafeEqual(a, b)`
- **Why deferred:** The early `return false` on length mismatch is observably
  faster than the subsequent XOR loop, leaking the length comparison timing.
  Node's own `crypto.timingSafeEqual` *throws* on length mismatch instead. The
  equal-length comparison itself is constant-time and correct.
- **Accepted for:** Story 1.1a placeholder scope (per Tenny's PR #1 review).
  No real key comparison happens against untrusted input yet — only the helper
  exists for downstream stories.
- **Will be addressed in:** Story 1.1b (real key-comparison work). Will
  replace with: pre-check `a.length === b.length` then XOR-and-OR pattern that
  runs in fixed time regardless of input, **or** throw on length mismatch
  (matching Node's API) and let callers ensure equal-length pre-conditions.
- **Status:** no change required now. Tracked here for traceability.
