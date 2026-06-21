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

## Deferred from: code review of 1-1b-move-package-build-off-chain-spike-harness-verify-seam (2026-06-21)

- **`fakeProofAdapter.ts` imports `node:fs`** (`packages/core/src/proof/fakeProofAdapter.ts`) — potential D1 isomorphic-rule violation for `@aperture/core`. Accepted: the fake is an explicit temporary placeholder; the real `ClientProofAdapter` (post-SPIKE-1) must be isomorphic. Address when implementing the real adapter.
- **`SessionKey.bytes` publicly readable** (`packages/core/src/proof/proofAdapter.ts`) — raw key bytes accessible on the object via `.bytes`. By design: hiding bytes would prevent the adapter from using the key for crypto operations. Accepted for now; revisit if a key-isolation pattern (e.g., a `sign(data)` method instead of exposed bytes) is adopted post-SPIKE-1.
- **`SessionKey` runtime brand doesn't prevent structural forgery** (`packages/core/src/proof/proofAdapter.ts`) — `declare const sessionKeyBrand` is TypeScript-only; a `{ bytes: ... } as unknown as SessionKey` compiles. TypeScript limitation; accepted for the spike scope.
- **`prove_for_testing` hardcoded nonces** (`move/sources/verifier.move`) — `r1=1234, r2=5678` are deterministic. Safe because the function is `#[test_only]` and all callers use known test constants, not real keys. Document clearly if the function is ever called with real material.
- **`fakeProofAdapter` breaks outside monorepo** (`packages/core/src/proof/fakeProofAdapter.ts`) — `readFileSync` at module-load time with a `../../../spike/` relative path fails if `packages/spike` is absent. Intentional limitation of the fake; documented in `proofAdapter.ts` as "placeholder until SPIKE-1."
- **No Move test for non-empty `dst`** (`move/tests/aperture_tests.move`) — All Move tests use `dst = vector[]`. A non-empty domain separator produces a different Fiat-Shamir challenge; parity with the TS side is untested. Low priority for current sprint; add when `dst` becomes user-controlled in Epic 3.
- **No Move test for `amount=0`** (`move/tests/aperture_tests.move`) — Zero-amount encrypts `0*h` (identity component). No test verifies the verify relation still holds. Add when zero-amount paths are in scope (Story 3.1 bound-and-reject logic touches this).
- **`timingSafeEqual` comment "strictly worse" claim** (`packages/core/src/crypto/index.ts`) — The claim that the `Math.max` loop approach is "strictly worse" is mildly inaccurate (it's a different trade-off, not strictly worse). Secondary to D2 decision-needed item; resolve wording once D2 is settled.
- **`serializeStatement` no field-length validation** (`packages/core/src/crypto/statementCodec.ts`) — `serializeStatement` accepts any `Uint8Array` length for `pk`, `ciphertext`, `decryptionHandle` without asserting 32 bytes. Callers own their inputs at encode time; fail-fast is handled at decode. Address if the codec is ever used as a public-facing API with untrusted inputs.

## Deferred from: code review of 1-1b Group B (spike harness) (2026-06-21)

- **Import discipline test checks config object, not live import** (`packages/spike/src/spike1.elgamal.test.ts:201-210`) — `(await import("../vitest.config.js")).default.resolve.alias["apps/api"]` checks that the alias string is registered, not that a live `import "apps/api"` would throw. Functional since the FORBIDDEN stubs DO throw at module eval; a sound fix would do `await expect(import("apps/api")).rejects.toThrow()`. Low priority.
- **`bcsEncodeVectorVectorU8` empty-vector edge cases untested** (`packages/spike/src/_bcs.ts`) — `bcsEncodeVectorVectorU8([])` and `bcsEncodeVectorVectorU8([new Uint8Array(0)])` are correct but untested. Future refactors could accidentally break this canonical BCS case without a failing test. Low priority.
- **Fiat-Shamir fixture validates 2-chunk case only** (`packages/spike/scripts/generate-fiat-shamir-fixture.ts`) — The regression vector uses `[dst(21), p1(32)]` (2 chunks). The ElGamal transcript uses 8 chunks `[dst, G, H, pk, e1, e2, a, b]`. ULEB128 is validated for small counts only; multi-byte chunk counts untested. Low priority.
- **`scripts/` excluded from `tsconfig.json`** (`packages/spike/tsconfig.json`) — `generate-golden-proofs.ts` and `generate-fiat-shamir-fixture.ts` are outside `include`. Type errors in generator scripts surface only at `tsx` runtime, not at `tsc` build time. Low risk (fixtures are committed), but worth noting if generators are modified.

## Deferred from: code review of 1-1c/1-2a Group D (scripts + CI) (2026-06-21)

- **`PINNED_MOVE_SHA` env var in `ci.yml` is dead documentation** (`.github/workflows/ci.yml:10`) — declared at top level but never referenced; actual pin verification reads from `move/Move.toml`. Remove or comment it as "documentary only."
- **`@aperture/spike` not type-checked in CI** (`.github/workflows/ci.yml`) — `ts-build` runs `pnpm build:crypto` (which does `tsc --noEmit` for `@aperture/core`) but has no equivalent for `@aperture/spike`. Type errors in spike only surface at Vitest esbuild runtime. Add `pnpm --filter @aperture/spike build` or `tsc --noEmit` step.
- **`pretest-devnet.sh` missing `set -e`** (`scripts/pretest-devnet.sh`) — uses `set -u` + `set -o pipefail` + explicit `die()`, but an unexpected failure before a `die()` call could silently continue. Low risk for manual-only script; add `set -e` for defense-in-depth.
- **`publish-devnet.sh` path injection in Python3 heredoc** (`scripts/publish-devnet.sh`) — `$CONFIG_PATH` interpolated bare in single-quoted Python string; a path with a quote causes SyntaxError silently caught by `|| true`, skipping hash check and republishing every run. Use `sys.argv` to pass the path safely.
- **`publish-devnet.sh` uncommitted sources bypass idempotency** (`scripts/publish-devnet.sh`) — hash is `git rev-parse HEAD:move` (committed only); unstaged edits reuse stale package ID. Document "commit before publish" requirement in script header.
- **`verify-pin.sh` SHA grep too loose** (`scripts/verify-pin.sh`) — `grep -qF "$SHA"` matches the SHA string anywhere in `.npmrc` (URLs, comments). Add a pattern that checks the SHA appears on a pin line, not just anywhere.
- **`pin-assert` job duplicates `verify-pin.sh` call** (`.github/workflows/ci.yml`) — now that `move-build-test` calls `bash scripts/verify-pin.sh` directly, `pin-assert` is redundant. Remove duplicate or make `pin-assert` canonical with a `needs: [move-build-test]` guard.

## Deferred from: code review of 1-0-ui-contract-signature-cell (2026-06-20)

- `sprint-status.yaml` `last_updated` field uses freeform date+notes string instead of a parseable date scalar — pre-existing convention established before this story; no downstream tooling currently parses it as a typed date
- `CipherCell` `revealing` state renders identically to `masked` with only `aria-busy=true` distinction; no visual progress indicator — instantaneous-swap transition is specified for 1.0; real revealing visual treatment (e.g. spinner or progress ring) comes with async crypto in Stories 2.3/4.1
- `DataTable` empty `columns` array renders an empty `<thead>` with no accessible column scope — stub frame only; real column validation comes with data binding in later stories
- `RoleSwitcher` `defaultRole` prop changes after mount are silently ignored (uncontrolled `useState` pattern) — fixture-only stub; no external controlled switching needed until lens routing is wired in later stories
- `tokens.ts` `roleAccent()` called with a non-typed string from JS interop returns undefined CSS vars (`var(--role-undefined)`) — TypeScript union prevents this at compile time; no JS interop exists in this story's scope
- `AuditLogRow` `chained=true` with undefined `children` renders a row with only the chain-marker glyph and no content text — stub frame; fixture always provides children; real validation comes with audit-log data binding in Story 2.2
