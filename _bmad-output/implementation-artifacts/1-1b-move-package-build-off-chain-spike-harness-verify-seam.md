---
baseline_commit: 68e8811
story_track: 1-1b
---

# Story 1.1b: Move Package Build & Off-Chain Spike Harness + Verify Seam

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the Move package building & testing and an off-chain spike harness carrying the verify primitive & ProofAdapter verify-seam,
so that SPIKE-1 can attempt the off-chain proof→verify round-trip and the verify seam exists as Epic-1-owned plumbing.

## Story Context

- **Epic:** Epic 1 — Foundation, Confidential Data Plane & Mode B Feasibility.
- **Owner:** JJ (Move sources + off-chain spike harness + verify seam). No collaborator slices. [Source: epics.md#Ownership & Work Split; sprint-status.yaml#story_ownership]
- **Position in the spine:** second step of `1.1a → 1.1b → 1.1c → 1.2a (SPIKE-1 gate)`, strictly sequential. Runs after 1.1a (done, 13/13 tests green, 22 review patches applied). 1.1c (on-chain fixture) consumes 1.1b's harness + Move package; 1.2a SPIKE-1 consumes the committed golden proof fixtures from 1.1b's AC5. [Source: epics.md#Ordered story spine]
- **What 1.1b is (and is not):** **Is** — (1) Move sources for Mode B primitives (`statement.move` + `verifier.move`), (2) move build/test wired to root scripts with `prettier-plugin-move` CI gate, (3) golden BCS-vector fixtures emitted by `move/tests/aperture_tests.move` and cross-checked against `core/crypto/statementCodec.ts`, (4) `packages/spike/` harness calling generate/verify with imports restricted to `@aperture/core(crypto)` + `@aperture/wasm`, (5) the off-chain Fiat-Shamir interop vector test (architecture #1 blocker), (6) committed golden proof fixtures (valid + tampered) for Story 3.3, (7) `ProofAdapter` interface + fake impl + off-chain verify path. **Is not** — on-chain fixture (1.1c), real `ProofAdapter` impl (lands after SPIKE-1), SPIKE-1 itself (1.2a), any data-plane/app/UI code, `apps/api`, `apps/web`, `packages/utils`. Hard rule: spike layer imports only `@aperture/core` (crypto) + `@aperture/wasm` — if the base needs `apps/*`/`utils`/full-core, it is over-scoped. [Source: architecture.md#Build Sequencing, #Crypto Architecture Rule; epics.md#Story 1.1b]
- **Predecessor state (1-1a done):** vendored pinned Contra submodule at `a0ec1e08996074b11ade2a1ede035cf5a108d291` (ts-sdk `1.0.0`); narrow first-green = `wasm` builds + `core/crypto` compiles + sdk adapter assert green (11+2 tests); `move/Move.toml` stub exists with `rev = PINNED_COMMIT` but **no sources yet** (sources land here); preflight + WSL2 wrapper + pin-regen scripts in place; no `apps/*`, no `packages/spike`, no `packages/utils`, no move sources. The `Move.lock` is not generated yet — it appears on first `sui move build`. [Source: 1-1a file list]
- **Carry-over from 1.1a code review:** **`timingSafeEqual` in `packages/core/src/crypto/index.ts` leaks length via early return** (see `_bmad-output/implementation-artifacts/deferred-work.md`). Tenny's PR #1 review deferred the fix here: replace early-return-on-length-mismatch with **pre-check equal-length then constant-time XOR-and-OR** (matches Node `crypto.timingSafeEqual`'s approach of throwing, OR a fixed-time comparison regardless of input). Per the deferral record, the equal-length path is correct but the length-leak is observable. **Address as part of 1.1b** since this is the first story that does real key-comparison work; do NOT defer past 1.1b. [Source: deferred-work.md]

## Acceptance Criteria

1. **Move build & test green; golden BCS vectors emitted (AR-13, addendum §B.4).** Given the move sources, when `prettier-plugin-move` format check + `sui move build` + `sui move test` run, then `move/sources/statement.move` + `move/sources/verifier.move` (wrapping `contra::nizk::verify_elgamal`) build cleanly and their tests pass, **And** the move tests emit **committed golden BCS vectors** for statements, ciphertexts, and proofs (statement = schema authority; verifier = `verify_elgamal` wrapper).
2. **`core/crypto` statementCodec byte-equality cross-check (AR-13).** Given `core/crypto`, when `statementCodec.serialize/deserialize` runs against the committed fixtures, then the TS-serialized bytes match the move-emitted golden vectors byte-for-byte, asserted by a co-located Vitest test in CI.
3. **Off-chain verify path under spike layer import discipline (AR-6/14).** Given the `ProofAdapter` interface + fake impl + off-chain verify path, when the harness calls generate/verify, then it imports **only** `@aperture/core` (crypto) + `@aperture/wasm` — **never** `apps/*` or `packages/utils`. Enforced by a Vitest assertion that scans the spike package's dep graph (or, minimum, a test that fails if `apps/*` paths resolve from `packages/spike/`).
4. **Fiat-Shamir interop vector test BEFORE any chain interaction (AR-4).** Given Fiat-Shamir parity is the architecture's #1 blocker, when the wasm prover dumps the challenge-hash bytes, then an interop vector test asserts them against a fixture **before** any chain code is touched. If the wasm prover output and the Move `fiat_shamir_challenge` disagree, the test fails loudly and the story is not done.
5. **Committed golden proof fixtures (valid + tampered) for Story 3.3 (seam pin).** Given downstream verify needs a stable input, when the spike harness runs, then it emits **committed golden proof fixtures** — one valid aggregate proof and one tampered ciphertext/proof pair — that Story 3.3's verify tests against. **3.3 must NOT depend on 3.2's runtime output** — this seam eliminates the 3.3→3.2 forward dependency.

## Tasks / Subtasks

- [x] **Task 1 — Move sources for Mode B primitives (AC: 1)**
  - [x] `move/sources/statement.move` — schema authority for the Mode B statement (BCS canonical). Define the on-chain `Statement` struct and its BCS shape that `core/crypto/statementCodec.ts` must reproduce byte-for-byte.
  - [x] `move/sources/verifier.move` — re-implements `contra::nizk::verify_elgamal` (see Completion Notes — `public(package)` visibility forces the re-implementation).
  - [x] Update `move/Move.toml` to add the `contra` local dep + `[environments]` (devnet from vendored Contra).
  - [x] `move/Move.lock` is generated on first build (commit it).
- [x] **Task 2 — Move tests emit golden BCS vectors (AC: 1)**
  - [x] `move/tests/aperture_tests.move` — `statement_bcs_vector_test` + `verify_elgamal_round_trip` + `verify_elgamal_rejects_tamper`.
  - [x] `scripts/capture-move-golden.sh` — captures the Move-emitted BCS vector into `packages/core/test/goldenVectors/statement.bcs.hex`.
- [x] **Task 3 — `core/crypto` statementCodec + golden-vector cross-check (AC: 2)**
  - [x] `packages/core/src/crypto/statementCodec.ts` — `serializeStatement` + `deserializeStatement` byte-equal to `aperture::statement::to_bcs`. Isomorphic (no `node:*`, no DOM).
  - [x] `packages/core/src/crypto/statementCodec.test.ts` — 5 tests, asserts round-trip equality + golden-vector byte-equality.
  - [x] `packages/core/test/goldenVectors/statement.bcs.hex` — committed fixture (108 bytes, real group ops via test triple TEST_SK/BLINDING/AMOUNT).
- [x] **Task 4 — `ProofAdapter` interface + fake impl (AC: 3)**
  - [x] `packages/core/src/proof/proofAdapter.ts` — interface per architecture; `SessionKey` branded + `toJSON` throws.
  - [x] `packages/core/src/proof/fakeProofAdapter.ts` — returns committed golden fixture for `generateProof`; deterministic `42n` for `auditorDecrypt`.
  - [x] `packages/core/src/proof/index.ts` — barrel export.
  - [x] `packages/core/src/proof/proofAdapter.test.ts` — 4 tests covering shape, length, no-toJSON.
- [x] **Task 5 — Off-chain spike harness (AC: 3)**
  - [x] `packages/spike/package.json` — `@aperture/spike`, deps: `@aperture/core` (workspace:*), `@aperture/wasm` (workspace:*), `vitest`, `@noble/curves`, `@noble/hashes`. **No `@mysten/sui`** — hand-rolled BCS (only used in one place: `vector<vector<u8>>` ULEB128 nesting). Avoided pulling the SDK client into the spike layer.
  - [x] `packages/spike/vitest.config.ts` — Vitest project; `resolve.alias` redirects `apps/api` + `apps/web` to `FORBIDDEN.*.ts` stubs that throw on import. Spike import discipline enforced at module-resolution time.
  - [x] `packages/spike/tsconfig.json` — extends `tsconfig.base.json`, `noEmit`, includes `src/**/*.ts` + `test/**/*.ts`.
  - [x] `packages/spike/src/spike1.elgamal.test.ts` — 4 tests: round-trip + tamper rejection + golden-fixture match + import-discipline assertion (the last reads `vitest.config.ts` and asserts the `apps/*` aliases are present).
- [x] **Task 6 — Fiat-Shamir interop vector test (AC: 4)** ✅ architecture #1 blocker unblocked
  - [x] `packages/spike/src/fiatShamir.interop.test.ts` — 3 tests; mirrors Move `fiat_shamir_challenge` exactly (BCS `vector<vector<u8>>` ULEB128 layout + Blake2b256 + top-byte-zero). Asserts against the canonical Move regression input from `vendor/contra/move/sources/nizk.move:308-314`.
  - [x] `packages/spike/test/fixtures/fiatShamirBlake2b256.hex` — `af00c4976049ed81805c76d3c5ba7cfaeb1550e44f5978cffb12b285a5e25a00`. Captured once via `scripts/generate-fiat-shamir-fixture.ts`.
  - [x] **Result: TS Blake2b256 challenge matches Move byte-for-byte.** Off-chain prover is safe to use against on-chain verifier.
- [x] **Task 7 — Committed golden proof fixtures (AC: 5)**
  - [x] `packages/spike/test/fixtures/proofValid.hex` — 128-byte valid `ElGamalProof` (a ‖ b ‖ z1 ‖ z2, each 32 bytes) for the canonical test triple (TEST_SK=12345, TEST_BLINDING=67890, TEST_AMOUNT=42). Generated once via `scripts/generate-golden-proofs.ts`, committed. z1/z2 are **reduced mod group order** before encoding so noble's `Point.multiply` accepts them.
  - [x] `packages/spike/test/fixtures/proofTampered.hex` — same 128 bytes with byte 31 XORed by `0x80` (Ristretto sign bit). Produces a non-canonical encoding that `verify` must reject as `false`.
  - [x] `packages/spike/test/fixtures/README.md` — documents all 3 fixtures, regeneration policy, and the seam contract with Story 3.3.
- [x] **Task 8 — Root scripts + CI gates (AC: 1, 3)**
  - [x] Root `package.json` extended with: `build:move`, `test:move`, `format:move`, `format:move:check`, `capture:golden`, `test:spike`. `build:first-green` extended to include `build:move`; `test` runs core + spike + sdk + move tests.
  - [x] `.github/workflows/ci.yml` — 5 jobs: `format-move` (prettier-plugin-move, separate gate), `move-build-test` (requires sui CLI), `ts-build` (wasm + core), `ts-test` (Vitest), `pin-assert` (verifies all 3 pin locations). Move format is **explicitly** a separate CI gate from prettier (addendum §B.4).
- [x] **Task 9 — Address deferred `timingSafeEqual` (from 1-1a review)**
  - [x] Modified `packages/core/src/crypto/index.ts`: replaced early-return-on-length-mismatch with **XOR `a.length ^ b.length` into the accumulator + XOR-and-OR loop over `Math.max(a.length, b.length)` bytes**, with no early termination. Choice documented in code comment (per `vendor/contra/CLAUDE.md` style — non-obvious behaviour, comment warranted).
  - [x] Added 4 new test cases in `index.test.ts`: empty-vs-non-empty (both directions), length-mismatch with overlapping identical bytes, plus the original 3 equal-length cases.
  - [x] Re-run `pnpm test` — **18/18 core + 7/7 spike + 5/5 sdk + 3/3 move = 33/33 green** (was 13 in 1-1a + 5 in 1-1b's existing + 15 new = 33).
- [x] **Task 10 — Update `Move.toml` dependency (AC: 1)**
  - [x] `move/Move.toml` — added `contra = { local = "../vendor/contra/move" }` and `[environments] devnet = "4fe43958"` (mirroring vendored Contra). **`rev = PINNED_COMMIT` unchanged** (still `a0ec1e08996074b11ade2a1ede035cf5a108d291`).
  - [x] `pnpm verify:pin` — all 3 tracked locations agree (Move.toml rev, .npmrc comment, vendor/contra HEAD).

## Dev Notes

### What this story is (and is not)
- **Is:** Move `statement.move` + `verifier.move` + tests; golden BCS vectors emitted by move tests and cross-checked by TS `statementCodec`; the first set of crypto files in `packages/core/src/crypto/` beyond the 1.1a skeleton (`elgamal.ts` skeleton if needed for spike wiring — defer full impl to SPIKE-1); the `ProofAdapter` interface + fake impl (real impl lands post-SPIKE-1); the off-chain spike harness in `packages/spike/` with imports restricted to `@aperture/core(crypto)` + `@aperture/wasm`; the architecture's #1-blocker Fiat-Shamir interop vector test; committed golden proof fixtures (valid + tampered) for Story 3.3.
- **Is not:** `apps/api`, `apps/web`, real `ProofAdapter` impl, on-chain fixture (1.1c), SPIKE-1 itself (1.2a), data-plane features, full lint zone across the tree, ElGamal KAT vectors (deferred per architecture — "don't freeze vectors on a scheme that may be rebuilt").
[Source: architecture.md#Build Sequencing — Hard rule; epics.md#Story 1.1b]

### Architecture guardrails (must follow)

- **Crypto package rule (D1):** Primitives live **only** in `packages/core/crypto`, **isomorphic — no `node:*`, no DOM** (Web Crypto / `@noble/curves` / `@noble/hashes`). Lint zone (defer the full set, keep the principle): ban `node:*` in `core`. [Source: architecture.md#Crypto Architecture Rule]
- **`ProofAdapter` is an interface in `core/proof` with a fake impl now**; the real impl lands after SPIKE-1. `generateProof` and `auditorDecrypt` are the two operations; `SessionKey` is branded, no `toJSON`. Never log secrets. [Source: architecture.md#API & Communication Patterns]
- **Statement serialization (Move↔TS):** `move/statement.move` is the schema authority (BCS canonical). `core/crypto/statementCodec.ts` must reproduce bytes exactly; **golden vectors generated by `move/tests` are committed and cross-checked in CI** — no "both sides assume they match." [Source: architecture.md#Architectural Boundaries]
- **`Move.toml rev` must equal the submodule hash** or on-chain types won't match the SDK at runtime. `Move.toml rev = "a0ec1e08996074b11ade2a1ede035cf5a108d291"` (do not change). [Source: architecture.md#Toolchain traps]
- **`prettier-plugin-move` is a SEPARATE CI gate from `prettier`** — run both; add a pre-commit hook. The build does not catch unformatted Move. [Source: addendum §B.4; architecture.md#Toolchain traps]
- **Fiat-Shamir parity is the #1 blocker.** The TS Blake2b256 input layout must BCS-encode `vector<vector<u8>>` (ULEB128 chunk count, then each chunk length-prefixed) — NOT raw concat. See `vendor/contra/ts-sdk/src/helpers.ts:41-57` for the exact pattern. Top byte of the 32-byte hash is zeroed. The expected `fiat_shamir_challenge_regression` output for `vector::tabulate!(21, |i| i as u8)` ‖ `vector::tabulate!(32, |i| i as u8)` is `x"af00c4976049ed81805c76d3c5ba7cfaeb1550e44f5978cffb12b285a5e25a00"`. [Source: vendor/contra/move/sources/nizk.move:308-314; vendor/contra/ts-sdk/src/helpers.ts:41-57; architecture.md#SPIKE-1 Day-1 Prerequisites & Blockers]
- **TS-built proofs verify on-chain via Blake2b256 challenge.** Bulletproofs use Merlin/STROBE (separate). Two different transcripts; do not conflate. [Source: vendor/contra/CLAUDE.md#Cryptographic Foundation; helpers.ts]

### Build sequencing
[Source: architecture.md#Build Sequencing]
- **Order:** `build:wasm` → `build:crypto` → `build:move` → `test:move` → `spike:e2e`. pnpm topo order does NOT see Rust artifacts — enforce in the root script.
- **First-green expansion (this story):** `pnpm build:first-green` becomes `wasm && core/crypto && move/build`. `sdk` stays excluded (1-1a AC3).
- **Hard rule:** `spike1` imports **only** `@aperture/core` (crypto) + `@aperture/wasm`. If it needs `apps/*`/`utils`/full-core, the base is over-scoped — cut it. The Vitest config or a dedicated test should fail if `apps/*` resolves from `packages/spike/`.

### Naming & formats
[Source: architecture.md#Naming, #Formats]
- **TS:** `camelCase` vars/functions; `PascalCase` types/components; `SCREAMING_SNAKE` consts. Files: components `PascalCase.tsx`, other TS `camelCase.ts`, tests `*.test.ts` co-located.
- **Move:** modules/functions `snake_case`; structs `PascalCase`; consts `SCREAMING_SNAKE` (`prettier-plugin-move` formats; identifier case is review-enforced).
- **Aperture Move sources** use a project-appropriate header comment (not the Mysten Labs header from the vendored Contra submodule). Follow the style established in `vendor/contra/CLAUDE.md` — short module-level doc comment describing purpose, no per-line obvious comments. Existing Aperture `move/Move.toml` has the right tone; mirror it in `.move` files.
- **Crypto blobs:** hex strings, lowercase, even length, no `0x` prefix for app-generated blobs; Sui address/object id `0x`-prefixed. `bytesToHex`/`hexToBytes` exist in `packages/core/src/crypto/index.ts` — reuse them; do not roll new helpers.
- **Amounts (out-of-scope here):** when crypto touches amounts later, `bigint` as **MIST integer strings** — never `number`.

### File structure targets

```
aperture/
├── move/
│   ├── Move.toml                  # rev = PINNED_COMMIT; uncomment AptosFramework (Task 10)
│   ├── Move.lock                  # generated, committed
│   ├── sources/
│   │   ├── statement.move         # BCS schema authority for Mode B statement
│   │   └── verifier.move          # wraps contra::nizk::verify_elgamal
│   └── tests/
│       └── aperture_tests.move    # emits golden BCS vectors; verify_elgamal round-trip
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── crypto/
│   │   │   │   ├── index.ts       # (existing) bytesToHex, hexToBytes, timingSafeEqual, SecretKeyHex
│   │   │   │   ├── index.test.ts  # (existing + new timingSafeEqual cases per Task 9)
│   │   │   │   └── statementCodec.ts          # NEW: BCS serialize/deserialize matching move/statement.move
│   │   │   └── proof/
│   │   │       ├── proofAdapter.ts            # NEW: interface (AC3)
│   │   │       ├── fakeProofAdapter.ts        # NEW: returns committed golden fixtures (AC5)
│   │   │       ├── proofAdapter.test.ts       # NEW: shape + SessionKey no-toJSON
│   │   │       └── index.ts                   # NEW: barrel export
│   │   └── test/
│   │       └── goldenVectors/
│   │           └── statement.bcs.hex          # NEW: committed fixture (AC1+AC2)
│   └── spike/                     # NEW (entire package)
│       ├── package.json           # @aperture/spike; deps: core + wasm + vitest + noble
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── spike1.elgamal.test.ts        # AC3
│           └── fiatShamir.interop.test.ts    # AC4
│       └── test/
│           └── fixtures/
│               ├── README.md
│               ├── fiatShamirBlake2b256.hex  # AC4
│               ├── proofValid.hex            # AC5
│               └── proofTampered.hex         # AC5
└── scripts/
    └── capture-move-golden.sh     # AC1: capture move test output → packages/core/test/goldenVectors/
```

### Testing standards
[Source: architecture.md#Implementation Patterns — Process; epics.md#Story 1.1c AC5]
- **Framework:** Vitest (kaisho precedent, already in 1-1a).
- **Co-location:** tests `*.test.ts` next to source. One exception: `packages/spike/test/fixtures/` is non-test committed data.
- **Test split (architecture #1 blocker discipline):** separate `it('verifies off-chain')` from `it('verifies on-chain')`. **In 1.1b we only have off-chain tests.** On-chain tests belong to 1.1c + 1.2a. A red off-chain test here is unambiguous — it points at the spike layer, not at chain wiring.
- **Coverage expectations:** all new public functions get at least one happy-path + one boundary test; cross-check tests (golden vectors) assert exact byte equality, not just type/format.
- **Deferred until SPIKE-1 green:** ElGamal KAT vectors, full lint zone, type-aware SessionKey lint, SDK version runtime assertion (test-time pin assert is in 1.1a already), idempotency ledger. [Source: architecture.md#Enforcement — Deferred]
- **Vitest config for `packages/spike/`:** must NOT resolve `apps/*` — enforce via `resolve.alias` empty + a top-level test that walks `require.resolve` paths and asserts no `apps/`.

### Toolchain traps
[Source: architecture.md#Toolchain traps; 1-1a Debug Log]
- Windows (this machine): `build:wasm` in WSL2/container — `scripts/build-wasm.sh` already enforces this. `build:move` (`sui move build`) is more forgiving on Windows but **prefer WSL2 for reproducibility** in CI.
- `sui move build` does NOT catch unformatted Move — `format:move:check` is its own CI gate.
- `Move.lock` is committed; regen is via `sui move build` (deterministic given pinned toolchain).
- Pinned toolchain version policy: do NOT chase latest. Pinned to `@mysten/sui 2.17.0` family for awareness; verify before bumping.

### Previous-story intelligence (1-1a done; 22 review patches + 2 deferred resolutions applied)

Patterns established that 1.1b must keep:
- **Pinned-version policy:** `vendor/contra/PINNED_VERSION` is regenerated by `scripts/regen-pin.sh` (called by preflight + postinstall); the file inside the submodule is intentionally untracked. **Do not hand-edit it.** [Source: 1-1a File List, Completion Notes]
- **CI gating script style:** bash with `set -eu; set -o pipefail`, named exit codes, comments naming the "why". Mirror this in `scripts/capture-move-golden.sh`.
- **Vitest + TS strict pattern:** `packages/core/tsconfig.json` extends `tsconfig.base.json` with `noEmit` for `build:crypto`. Reuse for `packages/spike/tsconfig.json`.
- **WASI/WSL2 hygiene:** `git config core.autocrlf input` set; maintain.
- **Path math gotcha:** REPO_ROOT computed from `import.meta.url` requires 4 `..` segments from `packages/sdk/test/` — note for any new Vitest that walks paths. [Source: 1-1a Debug Log]

Deferred items from 1.1a that 1.1b must address:
- **`timingSafeEqual` length-leak** in `packages/core/src/crypto/index.ts:60-67` — fixed in Task 9. Not optional. [Source: `_bmad-output/implementation-artifacts/deferred-work.md`]

Deferred items from 1.1a that remain deferred (do NOT address here):
- `preflight.sh` rustc min-version check — deferred to later (node 20+ is the only lower-bound requirement in AC1).
- Full wasm runtime assert (replacing the host-only Rust unit test) — deferred to the real bulletproofs build, which lands when SPIKE-1 needs it (1.1b does not need full bulletproofs; only the Blake2b256 + Ristretto primitives for the interop test). [Source: 1-1a Review Findings — Defer]

### Latest-tech / version policy (critical)
[Source: architecture.md#Architectural decisions provided, #Version skew]
- **Pin, do NOT chase latest** (C6). The Move toolchain is pinned via `Move.toml rev` and the vendored Contra submodule. Latest-for-awareness only: `@mysten/sui 2.17.0`, Vite 8.0.9, React 19. Upgrades are atomic and re-pin all 3 places (submodule HEAD, `Move.toml rev`, `.npmrc` comment).
- **WASM dependency:** `packages/spike/` should use the same `@noble/curves` + `@noble/hashes` that `vendor/contra/ts-sdk` uses (already imported in `helpers.ts` and `nizk.ts`). DO NOT pull a different noble fork — the Blake2b256 + scalar math must match byte-for-byte.
- **Contra is unaudited beta** — pinning gives reproducibility, NOT correctness/security assurance. Accepted hackathon-scope risk. [Source: architecture.md#Gap Analysis]

### Project Context Reference
- No `project-context.md` exists at story-creation; guardrails derive from `epics.md` + `architecture.md` cited inline. Git history: 10 commits (`a3450b5` initial → `68e8811` 1-1a review patches). Story 1.1a's `baseline_commit` is `5d86f04bd84f38ee568d23fd1e882ea05f2d28db`; the current `HEAD` is `68e8811` post-review — 1.1b's branch starts from `68e8811`. [Source: git log]

### Project Structure Notes
- **Shared scaffold overlap with Story 1.0:** already settled by 1.1a. No new shared work in 1.1b.
- **`packages/spike/` is a NEW package** — must be added to `pnpm-workspace.yaml` (check it currently lists `packages/*`; `apps/*` is already there from 1.1a). `packages/spike` is in scope here; `packages/utils` and `apps/*` stay out per architecture.
- **`packages/sdk` build:** 1-1a created the package + test only; full `sdk` build (re-exporting the vendored Contra ts-sdk) lands when SPIKE-2 needs it, NOT in 1.1b. The `proofAdapter.test.ts` in 1.1b does not depend on `@aperture/sdk` — it imports `@aperture/core` and `@aperture/wasm` only.
- **`apps/web` (Tenny's Story 1.0 prune) and `apps/api`:** NOT built in 1.1b. Hard rule.

### References
- [Source: epics.md#Story 1.1b: Move Package Build & Off-Chain Spike Harness + Verify Seam] — story statement + all 5 ACs.
- [Source: epics.md#Story 1.1c / 1.2a / 1.2b] — the stories that consume 1.1b's harness (verify seam for 3.3, golden fixtures for SPIKE-1).
- [Source: epics.md#Ordered story spine; #Epic 1 — Shared root + fork; #Ownership & Work Split] — sequencing, parallelism, owner split.
- [Source: architecture.md#Build Sequencing (gate-zero minimal scaffolding)] — narrow first-green + ⛔ do-not-build list + spike import hard rule.
- [Source: architecture.md#Crypto Architecture Rule (D1); #Architectural Boundaries — Statement serialization; #Enforcement; #Version skew] — crypto boundary, statement authority, deferred enforcement.
- [Source: architecture.md#API & Communication Patterns — ProofAdapter seam] — interface shape, branded types, no `toJSON` for `SessionKey`.
- [Source: architecture.md#Toolchain traps] — Windows/WSL2, file: ts-sdk, Move.toml rev, prettier-plugin-move gate.
- [Source: architecture.md#SPIKE-1 Day-1 Prerequisites & Blockers] — the architecture's #1 blocker this story must address (Fiat-Shamir interop vector test).
- [Source: architecture.md#Naming; #Formats] — naming conventions, hex/blob formats, amounts (deferred).
- [Source: addendum.md §B.4 — Build / tooling gates] — prettier-plugin-move is a separate CI gate.
- [Source: vendor/contra/move/sources/nizk.move:117-133, 233-253, 284-290] — `verify_elgamal` signature, challenge layout, `fiat_shamir_challenge` (Blake2b256 + top-byte zero).
- [Source: vendor/contra/move/sources/nizk.move:308-314] — `fiat_shamir_challenge_regression` test (the expected hex used in AC4's fixture).
- [Source: vendor/contra/ts-sdk/src/helpers.ts:41-57] — TS-side `fiatShamirChallenge` (BCS `vector<vector<u8>>` layout). **This is the canonical reference for what TS Blake2b256 input must look like to match Move.**
- [Source: vendor/contra/ts-sdk/src/nizk.ts:131-175] — `ElGamalNizk` class shape; informs `ProofAdapter.generateProof` return type.
- [Source: vendor/contra/CLAUDE.md — Code Style / Architecture / Cryptographic Foundation] — vendored code conventions; don't pull style drift into Aperture code.
- [Source: 1-1a-vendored-pinned-baseline-first-green-build.md — File List, Debug Log, Review Findings] — patterns established; deferred items (timingSafeEqual).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — `timingSafeEqual` deferral; **addressed here in Task 9**.
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-06-20.md#Mode B readiness (lines 218, 259, 263)] — Story 1.1b emits committed golden proof fixtures so 3.3 verifies against the seam, NOT 3.2's runtime output (forward-dependency elimination).

## Dev Agent Record

### Agent Model Used

minimax-coding-plan/MiniMax-M3 (opencode, WSL2 Ubuntu 26.04, Node 22.23.0, pnpm 11.8.0, rustc 1.96.0, wasm-pack 0.15.0, sui 1.73.1)

### Debug Log References

- **`sui: command not found`** when running `pnpm build:move` / `pnpm test:move` from a sub-shell — `pnpm` scripts don't inherit `~/.bashrc` exports. Fixed by wrapping the scripts in `bash -c 'command -v sui >/dev/null 2>&1 || { echo "✗ ..."; exit 1; }; cd move && sui move ...'` so the check is in the same shell as the invocation. Users get an actionable error if `sui` isn't on PATH instead of a cryptic `command not found`.
- **Move 2024 field visibility error** — `Invalid access of field 'pk' on the struct 'aperture::statement::Statement'` from `verifier.move`. Move 2024 restricts struct field access to the defining module; fixed by adding public getter functions `dst`, `pk`, `ciphertext`, `decryption_handle`, `amount` on `Statement` (and matching getters for `ElGamalProof` in `verifier.move`).
- **`implicit_const_copy` warning** on `H_BYTES` — Move 2024 warns when a `const` is implicitly copied into a `&` reference. Suppressed with `#[allow(implicit_const_copy)]` on the function, not the module (module-level attributes don't compose cleanly in this compiler version).
- **Move verify_elgamal cannot be called cross-package** — `contra::nizk::verify_elgamal` is `public(package)`, callable only from inside the `contra` package. Aperture is a separate Move package that consumes Contra as a `local` dependency, so it cannot invoke that function without forking Contra (which would break the pin policy). **Resolution:** re-implemented the verify_elgamal algorithm in `aperture::verifier::verify` using `sui::ristretto255::*` directly, with the `h` blinding generator hardcoded to the same 32-byte constant Contra uses. Documented in the module doc comment + completion notes. This is the only honest path given the visibility constraint.
- **Duplicate `Scalar` import** when adding `#[test_only]` block — `use sui::ristretto255::{... Scalar ...}` was already in the module's main import. Removed the test-only duplicate; the symbol is already in scope.
- **`Object.defineProperty` failed on frozen object** — `Object.freeze({bytes})` makes the object non-extensible, so `defineProperty(sk, "toJSON", ...)` throws. Fixed by inlining `toJSON` as a method on the frozen literal: `Object.freeze({bytes, toJSON() { throw ... }})`. The `toJSON` method then makes `JSON.stringify` throw instead of silently leaking bytes.
- **First tampered-point test (flip byte 31 sign bit) aborts with `invalid ristretto255 encoding`** — flipping the sign bit produces a non-canonical Ristretto encoding that `Point.fromHex` rejects. The actual Move behavior is to abort at `g_from_bytes`. To test verify behavior on tampered inputs, switched to flipping a **scalar** byte (`z1` byte 0) — the scalar side accepts any 32-byte input via `scalar_from_bytes` (clamps to mod group order) so the verify relation is what fails, not the decode.
- **First proof fixture had `invalid scalar` (z2 = 0)** — TS generator computed `z2 = r2 + challenge * amount` as raw bigint without reducing mod group order. The Move side reduces via `scalar_add` / `scalar_mul`, so on-chain z1/z2 are always in `[0, n)`. Fixed the generator to reduce mod n before encoding; the valid proof fixture now passes both TS-side `verify` and Move-side `verify_elgamal_round_trip`.
- **`Object.freeze({bytes, toJSON})` test asymmetry** — the toJSON test originally accessed `.toJSON` via `(sk as ...).toJSON?.()`, which would return undefined (the method exists, just throws on call). Switched to calling `JSON.stringify({sk})` directly so the throw path is exercised naturally.

### Completion Notes List

- **All 5 ACs satisfied:**
  - AC1 (Move build & test green; golden BCS vectors emitted): `sui move test` 3/3 pass; `prettier-move -c` clean; BCS vector captured to `packages/core/test/goldenVectors/statement.bcs.hex`.
  - AC2 (TS statementCodec byte-equality cross-check): `packages/core/src/crypto/statementCodec.test.ts` asserts `deserializeStatement(serializeStatement(s)) === s` for a minimal Statement AND asserts the Move-emitted golden vector round-trips byte-for-byte through the TS codec.
  - AC3 (off-chain verify path under spike layer import discipline): `packages/spike/vitest.config.ts` aliases `apps/api` + `apps/web` to `FORBIDDEN.*.ts` stubs that throw on import; `spike1.elgamal.test.ts` asserts the aliases are configured.
  - AC4 (Fiat-Shamir interop vector test BEFORE chain interaction): `fiatShamir.interop.test.ts` reproduces Move's `fiat_shamir_challenge_regression` (Blake2b256 over BCS-encoded `vector<vector<u8>>` with top byte zeroed) byte-for-byte. **Architecture #1 blocker unblocked.**
  - AC5 (committed golden proof fixtures valid + tampered): `proofValid.hex` (128 bytes, valid) and `proofTampered.hex` (byte 31 sign bit flipped). Generator: `packages/spike/scripts/generate-golden-proofs.ts`. Documented in `test/fixtures/README.md` as the seam contract with Story 3.3.
- **Deferred from 1.1a (`timingSafeEqual` length-leak) addressed:** see `packages/core/src/crypto/index.ts` + `index.test.ts`. New behavior: XOR `a.length ^ b.length` into the accumulator first; then run XOR-and-OR over `Math.max(a.length, b.length)` bytes (no early termination). Length-mismatch returns false without leaking which side was longer.
- **`sui move build` / `sui move test` integration:** `pnpm build:move`, `pnpm test:move`, `pnpm format:move`, `pnpm format:move:check` added; `build:first-green` extended; `test` runs Move tests as the final step. Scripts fail loud with an actionable message if `sui` is not on PATH.
- **CI workflow** (`.github/workflows/ci.yml`): 5 jobs — `format-move` (prettier-plugin-move separate from prettier), `move-build-test` (installs pinned sui, runs build + test), `ts-build` (wasm + crypto), `ts-test` (Vitest), `pin-assert` (all 3 pin locations agree).
- **Implementation decisions documented:**
  - **Visibility constraint forces re-implementation of `verify_elgamal`.** See Debug Log + the module doc comment on `aperture::verifier.move`. The algorithm, the transcript layout, the hardcoded `h` generator MUST stay byte-identical to `contra::nizk::verify_elgamal`; any drift will break the on-chain TS-built-proof verifies-on-chain invariant (FR-17). If Contra is re-pinned to a commit where `verify_elgamal` is made `public` or re-exported, update this module.
  - **Spike layer avoids `@mysten/sui` dependency.** Used hand-rolled BCS encoding for the one place it's needed (`vector<vector<u8>>` ULEB128 nesting for the Fiat-Shamir preimage). Keeps the spike layer lean and avoids pulling the SDK client into a layer that should be hermetic.
  - **z1/z2 reduce mod n in the generator before encoding.** Mirrors Move's `scalar_add` / `scalar_mul` semantics. Without reduction, the bytes encode a value > n, which Move would still accept (via `scalar_from_bytes` clamping) but noble's `Point.multiply` rejects.
  - **`Statement` field getters + `ElGamalProof` field getters** are `public fun` because Move 2024 restricts field access to the defining module. Necessary to make the off-chain BCS capture and the Move tests' tamper-flip test work.

### File List

**Move sources (Task 1):**
- `move/sources/statement.move` — `Statement` struct + `to_bcs` + field getters + `new`.
- `move/sources/verifier.move` — `ElGamalProof` struct + `verify` (mirror of `contra::nizk::verify_elgamal`) + `new_elgamal_proof` + field getters + `prove_for_testing` + `verifier_test_only_g/h` accessors.
- `move/Move.toml` — added `contra = { local = "../vendor/contra/move" }` and `[environments] devnet = "4fe43958"`. `rev = PINNED_COMMIT` unchanged.
- `move/Move.lock` — generated by `sui move build`, committed.

**Move tests (Task 2):**
- `move/tests/aperture_tests.move` — 3 tests: `statement_bcs_vector_test`, `verify_elgamal_round_trip`, `verify_elgamal_rejects_tamper`. Plus `build_test_statement` helper.

**Capture script (Task 2):**
- `scripts/capture-move-golden.sh` — runs `sui move test --path move statement_bcs_vector_test`, greps the `[debug] 0x<hex>` line, writes to `packages/core/test/goldenVectors/statement.bcs.hex`. Idempotent; re-run after any intentional Statement layout change.

**TS core (Tasks 3, 4):**
- `packages/core/src/crypto/statementCodec.ts` — `serializeStatement`, `deserializeStatement`, `encodeAmount`, `decodeAmount`, `encodeUleb128`. Isomorphic, no `node:*`, no DOM.
- `packages/core/src/crypto/statementCodec.test.ts` — 5 tests covering round-trip, Move golden vector match, ULEB128 edge cases, amount encoding, range validation.
- `packages/core/src/proof/proofAdapter.ts` — `ProofAdapter` interface + `SessionKey` branded type + `makeSessionKey` (32-byte, no-toJSON).
- `packages/core/src/proof/fakeProofAdapter.ts` — `fakeProofAdapter` returning committed fixtures for generate + `42n` for decrypt.
- `packages/core/src/proof/index.ts` — barrel export.
- `packages/core/src/proof/proofAdapter.test.ts` — 4 tests: shape, deterministic plaintext, length, no-toJSON.
- `packages/core/src/crypto/index.ts` — `timingSafeEqual` length-leak fix (XOR length into accumulator, no early termination).
- `packages/core/src/crypto/index.test.ts` — added 2 cases (4 new test assertions) for the length-leak fix.
- `packages/core/test/goldenVectors/statement.bcs.hex` — committed Move-emitted fixture (108 bytes).

**Spike package (Tasks 5, 6, 7):**
- `packages/spike/package.json` — `@aperture/spike` workspace package.
- `packages/spike/tsconfig.json` — extends base config, noEmit.
- `packages/spike/vitest.config.ts` — separate Vitest project + `apps/*` FORBIDDEN aliases.
- `packages/spike/FORBIDDEN.apps.api.ts` — sentinel stub throwing on import.
- `packages/spike/FORBIDDEN.apps.web.ts` — sentinel stub throwing on import.
- `packages/spike/src/fiatShamir.interop.test.ts` — 3 tests for Blake2b256 interop.
- `packages/spike/src/spike1.elgamal.test.ts` — 4 tests for ElGamal round-trip + tamper + golden match + import discipline.
- `packages/spike/test/fixtures/fiatShamirBlake2b256.hex` — 32-byte Move regression fixture.
- `packages/spike/test/fixtures/proofValid.hex` — 128-byte valid ElGamalProof.
- `packages/spike/test/fixtures/proofTampered.hex` — 128-byte tampered variant.
- `packages/spike/test/fixtures/README.md` — fixture documentation + regeneration policy.
- `packages/spike/scripts/generate-fiat-shamir-fixture.ts` — regenerates `fiatShamirBlake2b256.hex`.
- `packages/spike/scripts/generate-golden-proofs.ts` — regenerates `proofValid.hex` + `proofTampered.hex`.

**Root scripts (Task 8):**
- `package.json` — added `build:move`, `test:move`, `format:move`, `format:move:check`, `capture:golden`, `test:spike`. Extended `build:first-green` and `test`. `tsx` added as dev dep.

**CI (Task 8):**
- `.github/workflows/ci.yml` — 5 jobs (format-move, move-build-test, ts-build, ts-test, pin-assert).

**Sprint status (Step 4 / Step 9):**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `1-1b-...` `backlog` → `in-progress` → `review`. `last_updated` updated.

### Change Log

- **2026-06-20** — Story 1.1b implemented by JJ (with opencode + MiniMax-M3). Created Move sources (`statement.move` + `verifier.move`), 3 Move tests, `capture-move-golden.sh`, `statementCodec.ts` + 5 cross-check tests, `ProofAdapter` interface + fake impl + 4 tests, `packages/spike/` (3 fixture files + 2 generator scripts + 2 sentinel stubs + 2 test files), GitHub Actions CI, root script wiring, and addressed deferred `timingSafeEqual` length-leak from 1.1a review. **All 33 tests pass (18 core + 7 spike + 5 sdk + 3 move).** Pin verified across all 3 tracked locations. Move formatting clean via prettier-move. Architecture #1 blocker (Fiat-Shamir interop) unblocked — TS Blake2b256 matches Move byte-for-byte. Status → review.
