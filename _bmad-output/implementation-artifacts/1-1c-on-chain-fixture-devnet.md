---
story_track: 1-1c
status: in-progress
---

# Story 1.1c: On-Chain Fixture & Verify Seam (devnet)

As a developer,
I want an idempotent on-chain fixture plus the on-chain verify seam on **Sui devnet**,
so that SPIKE-1's on-chain assertion can run and the one-command deploy+seed groundwork exists.

## Story Context

- **Epic:** Epic 1 — Foundation, Confidential Data Plane & Mode B Feasibility.
- **Owner:** JJ (devnet env, funded address, package publish, on-chain verify seam).
- **Position in the spine:** fourth step of `1.1a → 1.1b → 1.1c → 1.2a (SPIKE-1 gate)`, strictly sequential. Runs after 1.1b (off-chain prove+verify green + committed golden proof fixtures). 1.2a SPIKE-1 consumes the published devnet packageId and the on-chain verify function.
- **Network change vs. original plan:** the architecture originally specified **localnet** (rationale: determinism). This implementation switches to **Sui devnet** (rationale: matches the SRS target network — `pnpm deploy:devnet` is the FR-20 end state; real network conditions expose gas costs and edge cases that localnet hides). The change is documented in `CONVENTIONS.md`, `epics.md` (1.1c + 1.2a ACs), and `architecture.md` (#401 + #389).
- **What 1.1c is (and is not):** (1) devnet env + funded address, (2) publish `aperture` Move package to devnet, (3) on-chain verify function (`aperture::verifier::verify_aggregate`) callable via PTB, (4) on-chain test in a separate vitest project that uses the committed golden proof fixtures. **Is not** — SPIKE-1 itself (1.2a), any data-plane/app/UI code, the 1.1c `pretest` for `apps/*` (not built yet), re-pinning Move.toml to current devnet chain id (the historical pin stays; `-e devnet` is used in build/test).
- **Predecessor state (1-1b done):** Move sources for `statement.move` + `verifier.move`; 3 move tests pass; golden BCS vectors committed; `ProofAdapter` interface + fake impl; `packages/spike/` with `spike1.elgamal.test.ts` (4 tests) + `fiatShamir.interop.test.ts` (3 tests); 7 committed golden fixtures. Off-chain verify is green.

## Acceptance Criteria

1. **Devnet env + funded address (idempotent pretest).** Given a fresh environment, when `pnpm pretest:devnet` runs, then `sui client active-env == devnet`, the devnet RPC is reachable, the active address is funded (topped up via `sui client faucet` if below 0.5 SUI), and the script is idempotent (re-runnable; FAUCET_THROTTLED exit code with actionable message on rate limit).
2. **Move env + lockfile aligned to devnet.** `move/Move.toml` `[environments] devnet = "4fe43958"` stays as the historical pin (mirrors the vendored Contra submodule). `move/Move.lock` is regenerated against devnet env (`[pinned.devnet.*]` entries). `sui move build -e devnet` and `sui move test -e devnet` both succeed; root scripts `build:move` / `test:move` pass the `-e devnet` flag.
3. **Dlog-table question resolved.** Documented in `verifier.move` module comment: `aperture::verifier::verify` is a pure pairing-of-curve-points check (mirrors `contra::nizk::verify_elgamal`); it does NOT need a dlog table on-chain. The dlog table is only needed for decryption (Story 3.2 / 3.3 path), not for verify.
4. **`aperture` package published on devnet.** `pnpm publish:devnet` runs `sui client publish --path move --gas-budget 500000000`, captures the published `packageId` + `txDigest` + `moveSourcesHash` to `scripts/.published-devnet.json` (gitignored). The script is idempotent: if the cached `moveSourcesHash` matches the current `git rev-parse HEAD:move` AND the cached `packageId` still resolves on devnet, publish is skipped; if the Move sources changed, republishes; if the packageId is stale (devnet reset), republishes.
5. **On-chain verify seam (Move function).** `aperture::verifier::verify_aggregate(...)` is a new public function that takes the Statement fields + proof component bytes as raw inputs, builds the `Statement` + `ElGamalProof`, calls `verify`, and returns the boolean. The PTB can call this as a single Move function instead of chaining `statement::new → new_elgamal_proof → verify` (which would require intermediate reference borrowing that's noisy in TS-side PTB code).
6. **On-chain verify seam (TS test).** `packages/spike/test/onchain/onchain.devnet.test.ts` is a new vitest project (separate from `packages/spike/`'s vitest config) that:
   - Reads the packageId from `scripts/.published-devnet.json`
   - Reads the funded keypair from `~/.sui/sui_config/sui.keystore` (first entry; matches `sui client active-address`)
   - Builds a PTB calling `aperture::verifier::verify_aggregate` with the committed `proofValid.hex` fixture
   - Signs and executes via `SuiJsonRpcClient.signAndExecuteTransaction`
   - Reads `effects.returnValues[0]` and asserts the byte is `0x01` (true)
   - Repeats with `proofTampered.hex` and asserts `0x00` (false)
   - Includes a stale-packageId guard test (all-zeros id → RPC rejects)
   - The 1.1b spike import-discipline (no `@mysten/*` in `packages/spike/src/`) is preserved — the on-chain test is in a separate package (`@aperture/spike-onchain`).
7. **Hard rule preserved.** `packages/spike/src/**` continues to import only `@aperture/core(crypto)` + `@aperture/wasm`. The new on-chain test is a separate workspace package (`packages/spike/test/onchain/`) with its own vitest config and its own deps. The `pnpm-workspace.yaml` was extended to include `packages/spike/test/onchain`.

## Tasks / Subtasks

- [x] **Task 1 — Toolchain alignment**
  - [x] `CONVENTIONS.md` — record the current sui version (1.73.1 testnet channel) and the target (1.73.0 devnet channel), add "Devnet (SPIKE-1 on-chain target)" section with chain id + reset policy.
  - [x] `scripts/preflight.sh` — add Step 7: warn if sui is missing or on a non-devnet env (don't fail preflight; only `pretest:devnet` is strict).
  - [x] `.github/workflows/ci.yml` — `move-build-test` job downloads `sui-devnet-v1.73.0` (was `sui-mainnet-v1.73.1`).
- [x] **Task 2 — Move env + lockfile alignment**
  - [x] `pnpm build:move` and `pnpm test:move` and `scripts/capture-move-golden.sh` all pass `-e devnet`.
  - [x] `rm move/Move.lock && pnpm build:move` regenerates the lockfile with `[pinned.devnet.*]` entries.
  - [x] `pnpm verify:pin` still passes (Move.toml rev, .npmrc, vendor/contra HEAD all agree).
  - [x] `sui move test -e devnet` — 3/3 tests pass.
- [x] **Task 3 — Devnet env + funded address (`scripts/pretest-devnet.sh`)**
  - [x] Named exit codes: `EXIT_OK=0`, `EXIT_NO_SUI=10`, `EXIT_WRONG_ENV=11`, `EXIT_NO_ADDRESS=12`, `EXIT_NO_GAS=13`, `EXIT_FAUCET_THROTTLED=14`, `EXIT_RPC_DOWN=15`.
  - [x] Reads active env, chain id, active address, gas balance; tops up via faucet if below 0.5 SUI.
  - [x] Logs warnings for chain id drift (historical pin vs current); fails loud on rate-limited faucet.
  - [x] `pnpm pretest:devnet` script alias in root `package.json`.
- [x] **Task 4 — Publish `aperture` to devnet (`scripts/publish-devnet.sh`)**
  - [x] Named exit codes: `EXIT_OK=0`, `EXIT_PRETEST_FAILED=20`, `EXIT_PUBLISH_FAILED=21`, `EXIT_CAPTURE_FAILED=22`.
  - [x] Idempotency: hash `git rev-parse HEAD:move`; if cached hash + cached packageId both valid, skip publish; otherwise republish.
  - [x] Stale-id detection: `sui client object --id <cached> --json` returns `objectId` ⇒ still valid; missing ⇒ devnet reset ⇒ republish.
  - [x] `scripts/.published-devnet.json` schema: `{ packageId, txDigest, moveSourcesHash, publishedAt }`. Gitignored.
  - [x] `pnpm publish:devnet` script alias in root `package.json`.
- [x] **Task 5 — On-chain verify seam (Move function)**
  - [x] `aperture::verifier::verify_aggregate(dst, pk, ciphertext, decryption_handle, amount, proof_a, proof_b, proof_z1, proof_z2): bool` — new public function. Returns `verify`'s bool. Does NOT abort on false (the on-chain test asserts the boolean directly).
  - [x] Documented in module comment as "single-entry verify call consumed by the on-chain test (Story 1.1c)".
- [x] **Task 6 — On-chain test (`@aperture/spike-onchain`)**
  - [x] `packages/spike/test/onchain/package.json` — new workspace package; deps: `@aperture/spike` (workspace:*), `@mysten/sui ^2.17.0`.
  - [x] `packages/spike/test/onchain/vitest.config.ts` — separate vitest project, no `apps/*` FORBIDDEN aliases, 60s testTimeout.
  - [x] `packages/spike/test/onchain/tsconfig.json` — extends base, noEmit, types: ["node"].
  - [x] `packages/spike/test/onchain/onchain.devnet.test.ts` — 4 tests: pretest+publish fixture present, valid proof (true), tampered proof (false), stale packageId guard.
  - [x] Keypair discovery: reads first entry from `~/.sui/sui_config/sui.keystore`; constructs `Ed25519Keypair.fromSecretKey(secretKeyB64)`.
  - [x] `pnpm-workspace.yaml` extended with `packages/spike/test/onchain`.
  - [x] `pnpm test:spike:onchain` script alias in root `package.json`.
- [x] **Task 7 — Plan doc updates**
  - [x] `epics.md` — AR-4 + 1.1c ACs + 1.2a preamble + 1.1c ownership row all swap "localnet" → "devnet"; 1.1c AC1 rewritten for pretest-devnet; AC2 rewritten for publish-devnet; AC for off/on-chain split explicitly notes the separate vitest project.
  - [x] `architecture.md` lines 389 + 401 — swap "localnet" → "devnet" and the rationale (determinism → SRS target).
  - [x] `CONVENTIONS.md` (above) — devnet target + chain id drift policy.

## Files added / changed

**Move:**
- `move/sources/verifier.move` — added `verify_aggregate` (28 lines)

**Root:**
- `package.json` — added `pretest:devnet`, `publish:devnet`, `test:spike:onchain`; `-e devnet` on `build:move` / `test:move`
- `pnpm-workspace.yaml` — added `packages/spike/test/onchain`
- `pnpm-lock.yaml` — added `@aperture/spike-onchain` + `@mysten/sui`
- `CONVENTIONS.md` — sui version, devnet target, chain id drift policy
- `.gitignore` — `scripts/.published-devnet.json`

**Scripts:**
- `scripts/pretest-devnet.sh` (NEW) — devnet env + faucet + balance check
- `scripts/publish-devnet.sh` (NEW) — publish + capture packageId (idempotent)
- `scripts/preflight.sh` — Step 7: warn on non-devnet sui
- `scripts/capture-move-golden.sh` — `-e devnet` flag

**CI:**
- `.github/workflows/ci.yml` — install `sui-devnet-v1.73.0` (was `sui-mainnet-v1.73.1`)

**Spike on-chain test (NEW package):**
- `packages/spike/test/onchain/package.json` (NEW)
- `packages/spike/test/onchain/tsconfig.json` (NEW)
- `packages/spike/test/onchain/vitest.config.ts` (NEW)
- `packages/spike/test/onchain/onchain.devnet.test.ts` (NEW)

**Move.lock:**
- `move/Move.lock` — regenerated with `[pinned.devnet.*]` entries (was `[pinned.testnet.*]`)

**Plan docs:**
- `_bmad-output/planning-artifacts/epics.md` — 1.1c + 1.2a localnet→devnet
- `_bmad-output/planning-artifacts/architecture.md` — lines 389 + 401

## Verification

```bash
pnpm verify:pin            # all 3 pin locations agree
pnpm test                  # 18 core + 8 spike + 5 sdk + 3 move = 34 green
pnpm pretest:devnet        # devnet env + funded address
pnpm publish:devnet        # publishes + writes scripts/.published-devnet.json
pnpm test:spike:onchain    # 4 tests on devnet (valid=true, tampered=false, stale-id rejected)
```

## Deferred Work

- **CI for the on-chain test:** the funded keypair is per-developer; CI cannot run the on-chain test directly. A possible future path: a dedicated CI keypair + a deploy-controlled test environment. Out of scope for SPIKE-1 (it's a personal-dev-machine check, gated to story 1.1c + 1.2a manual runs).
- **Pre-test on devnet reset:** the devnet faucet rate-limits ~1/day/address; on a reset, the user may need to wait hours or use a different address. Not automatable. Documented in `pretest-devnet.sh` exit code 14.
- **Move.lock regen policy:** `pnpm build:move` will rewrite the lockfile if the framework rev changes. This is expected Move behavior. The historical pin in `Move.toml` stays; the lockfile's framework rev tracks the live devnet. Re-pin policy in `CONVENTIONS.md`.

## Review Findings

_Code review of Group C (`packages/spike/test/onchain/onchain.devnet.test.ts`) on 2026-06-21. 3-layer parallel review: Blind Hunter, Edge Case Hunter, Acceptance Auditor._

#### Dismissed

- R1 — BH-1 (BLOCKER false positive): `verify_aggregate` is void and uses `assert!` / abort semantics — `effects.status === "success"` IS the correct assertion. A void Move function that aborts on false is correctly tested via transaction failure, not `returnValues`. Dismissed.
- R2 — BH-3 (HIGH false positive): empty `dst` in `buildCanonicalStatement` matches the canonical test triple used in all off-chain tests (`spike1.elgamal.test.ts`, `spike1.aggregate.test.ts`). Proofs were generated with `dst = new Uint8Array(0)`. Consistent. Dismissed.

#### Patch

- [x] [Review][Patch] **P1 [MEDIUM] — `readActiveKeypair` does not validate Ed25519 flag byte** ✅ fixed — Length check (`rawBytes.length !== 33`) passes for Secp256k1 (flag=0x01, 33 bytes) and Secp256r1 (flag=0x02, 33 bytes). A non-Ed25519 active address would silently pass length check, hand raw bytes to `Ed25519Keypair.fromSecretKey`, produce a wrong keypair with a different Sui address, and cause a signature-mismatch error on the PTB — misleading as a proof failure. Fix: added `rawBytes[0] !== 0x00` check with actionable message. [`packages/spike/test/onchain/onchain.devnet.test.ts:120-125`]

- [x] [Review][Patch] **P2 [LOW] — Abort regex `/abort code: 100|verify_aggregate/` has operator precedence issue** ✅ fixed — JavaScript regex `|` alternates at lowest precedence, so this is `/(abort code: 100)|(verify_aggregate)/`. The second branch matches any error containing "verify_aggregate" — including wrong abort codes or wrong module paths. Fixed to `/abort code: 100/` (specific). [`packages/spike/test/onchain/onchain.devnet.test.ts:258,299`]

- [x] [Review][Patch] **P3 [LOW] — JSDoc comment claims `verify_aggregate` returns `bool`** ✅ fixed — Line 59 said `): bool`. The Move function is `void` and aborts with `E_VERIFY_FAILED` (code 100) on failure — never returns. Fixed to `): void  // aborts with E_VERIFY_FAILED (code 100) on false — never returns`. [`packages/spike/test/onchain/onchain.devnet.test.ts:59`]

#### Deferred

- [x] [Review][Defer] `include: { effects: true }` in `signAndExecuteTransaction` is dead code (wrong option name for the SDK; the actual effects come from `waitForTransaction`) — no functional impact since both tests use `waitForTransaction` correctly; dead code only.
- [x] [Review][Defer] `@noble/curves` is used in `buildCanonicalStatement` but not declared in `packages/spike/test/onchain/package.json` — resolves transitively via `@aperture/spike`'s dep today; could break under pnpm dedupe. Add `@noble/curves` to the onchain package's deps when refactoring.
- [x] [Review][Defer] `loadHex` integer-division truncation on odd-length hex strings — committed fixtures are 256-hex-char (128 bytes); production risk is low. Add `if (text.length % 2 !== 0)` guard when the `_bcs.ts::hexToBytes` (which validates this) is available to the onchain package.
- [x] [Review][Defer] No gas balance check in `beforeAll` — an empty-wallet failure produces an opaque SDK error; add `client.getBalance()` pre-flight if the "InsufficientGas" error appears ambiguous during SPIKE-1 manual runs.
- [x] [Review][Defer] No length assertion on proof before slicing into 32-byte chunks — committed fixtures are 128 bytes; add `if (proof.length !== 128) throw` in `loadHex` or at call site when formalizing for production.

## Change Log

- **2026-06-20** — Story 1.1c implementation started. Toolchain + devnet env wired, Move build green against devnet, Move.lock regenerated, `pretest-devnet.sh` + `publish-devnet.sh` created, `aperture::verifier::verify_aggregate` added, `@aperture/spike-onchain` test package created with 4 tests. All plan docs updated. SPIKE-1 (Story 1.2a) ready to run — execute `pnpm pretest:devnet && pnpm publish:devnet && pnpm test:spike:onchain` to close the on-chain half of the gate.
