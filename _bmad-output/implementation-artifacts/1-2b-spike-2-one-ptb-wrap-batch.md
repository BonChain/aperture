---
story_track: 1-2b
status: ready-for-dev
---

# Story 1.2b: SPIKE-2 One-PTB Wrap+Batch

Status: ready-for-dev

## Story

As a tech lead,
I want SPIKE-2 to settle whether wrap + batch (+ event) compose in one PTB,
so that the payment-run (FR-5) is built on the right transaction shape — independent of SPIKE-1's go/no-go.

## Story Context

- **Epic:** Epic 1 — Foundation, Confidential Data Plane & Mode B Feasibility.
- **Owner:** JJ (PTB composition decision). Tenny has no slice — this story is backend/crypto only.
- **Position in the spine:** SPIKE-2 runs after SPIKE-1 GO (1.2a done 2026-06-20). Independent of the 1.1a→1.1b→1.1c spine. Feeds Story 1.7 (Execute Batch Payment Run) — the PTB shape 1.7 builds depends on this decision. [Source: epics.md#AR-5]
- **What 1.2b IS:** (1) build and wire `@aperture/sdk` as a real re-export of the vendored Contra ts-sdk; (2) write a SPIKE-2 test that tries to compose `wrap + transferBatch` in one PTB on a live Contra devnet instance; (3) execute the test and record the one-PTB-vs-two-PTB decision; (4) the decision is the deliverable — the test code is just the evidence. **Is NOT:** data-plane features (1.3–1.9), any app/UI/API code, `packages/utils` (not needed here), Move source changes, the full Contra deployment (use the existing/bootstrapped instance), or the Aperture `aperture.move` / `events.move` modules (see PaymentRun note below).
- **Predecessor state (1-2a GO, 1-1c done):** devnet env + funded address (`pnpm pretest:devnet`); `aperture` Move package published to devnet; 34/34 off-chain tests + 6/6 on-chain tests green; `@aperture/sdk` is a stub with version assert only — no src/index.ts, no file: dep on contra ts-sdk; `packages/spike/src/` import discipline (no `@mysten/*`) is preserved; Contra is used in `vendor/contra/ts-sdk/` but not yet wired as `@aperture/sdk` for use outside the spike.

## Acceptance Criteria

1. **AC1: One-PTB composition tested.** Given wrap + transferBatch in one PTB, when executed on the spike harness against a live Contra devnet instance, then either the PTB succeeds without a balance-update conflict OR it aborts with a verifiable error (Move abort / proof mismatch), and the result is recorded. *(AR-5)*

2. **AC2: Decision recorded.** Given the test result, then the one-PTB-vs-two-PTB decision is written in this story file's Decision Record section (below) in the same format as 1.2a, and the decision feeds Story 1.7's run shape. *(AR-5)*

3. **AC3: SPIKE-2 independence.** Then SPIKE-2's outcome — pass or fail — does NOT change the SPIKE-1 GO decision or Epic 3 openness. Separate decisions; SPIKE-2 only shapes FR-5 and FR-8. *(party-mode ruling)* *(Already true since 1.2a is done.)*

## Dev Agent Technical Context

### Critical SDK Insight: Balance Proofs Are Computed at BUILD TIME

**This is the core architectural fact for SPIKE-2.** The Contra `ContraClient.transferBatch` (`vendor/contra/ts-sdk/src/client.ts:1023`) is an `async` method that fetches the sender's current on-chain balance AND computes cryptographic balance proofs at BUILD TIME — before the returned thunk is added to the PTB:

```ts
// Called at BUILD TIME (before PTB submission):
const { shouldMerge, newBalance, balanceProof } = await this.#createBalanceUpdate(
    tokenAccount,
    totalAmount,
    merge,          // if true: reads pending_public_balance + pending + active
    totalSenderEnc, // total re-encrypted sender amount
);
// ...returns a thunk that uses pre-computed proofs
return (tx: Transaction): TransactionResult => { /* uses balanceProof, newBalance */ };
```

`#createBalanceUpdate` (`client.ts:507`) calls `getBalance(tokenAccount)` which reads the live on-chain balance. The balance proofs are cryptographically bound to the state at read time.

**`wrap` is SYNCHRONOUS** (`client.ts:484`) — it returns a PTB call thunk immediately with no on-chain reads.

### The Balance Conflict Hypothesis

**Scenario tested:** Payer wraps a public coin into their confidential account AND immediately runs a batch transfer to recipients in the SAME PTB.

**Build sequence (client-side):**
1. `const wrapThunk = contraClient.wrap({ coin, receiver: payerAddr, tokenType })` — synchronous, reads nothing
2. `const transferThunk = await contraClient.transferBatch({ tokenAccount, recipients, merge: true })` — reads current balance (pre-wrap), computes proofs on that state
3. `tx.add(wrapThunk)` → `tx.add(transferThunk)` → submit PTB

**On-chain execution sequence:**
1. `wrap` executes → payer's `pending_public_balance += wrappedAmount`
2. `transferBatch` executes with pre-wrap proofs → the Move code sees post-wrap state (higher pending) but receives proofs computed for pre-wrap state → likely `E_VERIFY_FAILED` or balance proof mismatch

**Expected outcome: ONE-PTB FAILS.** The Move verifier checks the new-balance proof against the current on-chain balance. After wrap runs, the balance differs from what the proof assumed. This should cause a Move abort.

**Exception case that might succeed:** If the payer already has sufficient ACTIVE balance (from a prior wrap in a previous TX) AND the test uses `merge: false` (skip pending merge), the wrap in the PTB wouldn't affect the active-balance proof. One-PTB with `merge: false` might succeed but this is NOT the real use case (FR-4 wraps first, then FR-5 immediately transfers).

**The test should try the realistic case: fresh wrap + immediate batch (merge: true). Record success or abort code.**

### @aperture/sdk Setup (Required First)

`packages/sdk/package.json` currently has NO dependency on the vendored Contra ts-sdk and NO `src/index.ts`. This story should wire it:

**`packages/sdk/package.json` needs:**
```json
{
  "dependencies": {
    "@aperture/contra-sdk": "file:../../vendor/contra/ts-sdk"
  },
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```
*(Use the alias `@aperture/contra-sdk` or `contra` — whatever the vendored package.json `name` field says. Check `vendor/contra/ts-sdk/package.json`)*

**`packages/sdk/src/index.ts` (re-export):**
```ts
// Re-export the vendored Contra ts-sdk under @aperture/sdk.
// Callers import from "@aperture/sdk", not from the vendor path directly.
// Adapter isolation rule (AR-9): @mysten/* + core/crypto only via this re-export.
export * from "@aperture/contra-sdk";
```

This lets the SPIKE-2 test import `ContraClient`, `Ciphertext`, etc. from `@aperture/sdk` rather than vendor paths. The `adapterVersion.test.ts` already asserts the pinned version — do NOT modify it.

### Contra Devnet Instance Setup

SPIKE-2 needs a RUNNING CONTRA INSTANCE on devnet — not just the Aperture verifier package (which is what SPIKE-1 needed). The full Contra contract has shared objects: `AccountRegistry`, `TokenRegistry`, `ConfidentialToken<SUI>`.

**Option A (preferred): Bootstrap from the kaisho deploy flow**
The vendored kaisho app (`vendor/contra/apps/kaisho/`) has scripts to deploy Contra to devnet and initialize a token. Run those scripts against the funded devnet address (from `pnpm pretest:devnet`). Capture the resulting `packageId`, `accountRegistryId`, `tokenRegistryId` to `scripts/.published-contra-devnet.json` (gitignored, same pattern as `.published-devnet.json`).

**Option B: Check for an existing public Contra devnet deployment**
Contra may already be deployed on devnet by Mysten. Check `vendor/contra/apps/kaisho/` for any hardcoded devnet deployment config. If a working instance exists, use it and skip re-deployment.

**What you need in the SPIKE-2 test config:**
```ts
const CONTRA_CONFIG = {
  packageId: "0x...",       // Contra Move package on devnet
  accountRegistryId: "0x...",
  tokenRegistryId: "0x...",
};
const TOKEN_TYPE = "0x2::sui::SUI"; // or the BU test token if deployed
```

### Account Registration Prerequisite

Before the wrap + transferBatch test can run, the test accounts must be registered:
- Payer: call `contraClient.newAccount(...)` + `contraClient.register(...)` for the payer address + SUI token
- Recipients (at least 2): same sequence for each recipient

**This setup can be in a `beforeAll` block in the test, or a separate setup script.** Use the funded keypair from `~/.sui/sui_config/sui.keystore` (same pattern as the on-chain SPIKE-1 test in `packages/spike/test/onchain/onchain.devnet.test.ts:103`).

For recipients, derive deterministic addresses (e.g., from `crypto.getRandomValues` + `Ed25519Keypair.generate()`) — no need to use real distinct wallets for a spike. Register their accounts under the payer keypair (you control the PTBs).

### Test File Location and Import Discipline

SPIKE-2 needs `@mysten/sui` (to call Contra on devnet) and `@aperture/sdk` (ContraClient). Both are forbidden in `packages/spike/src/` by the 1.1b import discipline rule.

**SPIKE-2 test location:** `packages/spike/test/spike2/` (new workspace package), mirroring the `test/onchain/` pattern:

```
packages/spike/test/spike2/
  package.json   (name: @aperture/spike2, deps: @aperture/sdk, @mysten/sui)
  spike2.ptb.test.ts
  vitest.config.ts
  tsconfig.json
```

Add `packages/spike/test/spike2` to `pnpm-workspace.yaml` and add `"test:spike2": "pnpm --filter @aperture/spike2 test"` to the root `package.json`.

### PaymentRun Event Note

The architecture asks about "wrap + batch + event." The custom Aperture `PaymentRun` event (defined in the not-yet-written `move/sources/events.move`) would be a simple Move `event::emit` call added to the PTB alongside wrap + transferBatch. A custom event:
- Does NOT touch any balance or account objects
- Cannot cause a balance-update conflict
- Can trivially be added to either a one-PTB or two-PTB flow

**Conclusion:** The event test is NOT necessary for the core SPIKE-2 decision. If one-PTB works for wrap + transferBatch, adding the event is trivially safe. If one-PTB fails on wrap + transferBatch, the event is moot. Test wrap + transferBatch; the event is inferred.

### Deferred Items Not in Scope

- `packages/utils/deploy.ts` / `seed.ts` — these are for Stories 4.5 / FR-20; DO NOT build here
- `apps/api` / `apps/web` — not yet built; do NOT start
- Any Aperture Move changes beyond what's already published
- `packages/wasm` real build (still a stub from 1.1a; the wasm question is a Story 3.1+ concern)
- FR-8 chunking or >7 recipient scenarios
- The `timingSafeEqual` / other deferred-work.md items (tracked there, not here)

## Tasks / Subtasks

- [ ] **Task 1 — Wire `@aperture/sdk`**
  - [ ] Check `vendor/contra/ts-sdk/package.json` → note the `name` field (likely `@contra/ts-sdk` or similar)
  - [ ] Update `packages/sdk/package.json`: add `file:../../vendor/contra/ts-sdk` as a dependency under the correct package name; add `main`/`exports`/`type: "module"` consistent with the vendored ts-sdk
  - [ ] Create `packages/sdk/src/index.ts`: re-export everything from the vendored SDK
  - [ ] Run `pnpm --filter @aperture/sdk test:adapter-version` — the existing adapter version tests must still pass
  - [ ] Add `packages/sdk/src/` to `tsconfig.json` if not already present

- [ ] **Task 2 — Set up Contra devnet instance**
  - [ ] Check `vendor/contra/apps/kaisho/` for devnet deployment config or scripts
  - [ ] If no existing public deployment: use the kaisho deploy flow to publish the Contra package to devnet and initialize a SUI ConfidentialToken
  - [ ] Capture `packageId`, `accountRegistryId`, `tokenRegistryId` to `scripts/.published-contra-devnet.json` (gitignored)
  - [ ] Add `pnpm pretest:spike2` root script alias pointing to whatever setup is needed

- [ ] **Task 3 — Create SPIKE-2 test package**
  - [ ] `packages/spike/test/spike2/package.json` — name `@aperture/spike2`, deps: `@aperture/sdk` (workspace:*), `@mysten/sui`, devDeps: `typescript`, `vitest`
  - [ ] `packages/spike/test/spike2/vitest.config.ts` — separate vitest project, 60s timeout (devnet network calls)
  - [ ] `packages/spike/test/spike2/tsconfig.json` — extends base, noEmit
  - [ ] Add `packages/spike/test/spike2` to `pnpm-workspace.yaml`
  - [ ] Add `"test:spike2": "pnpm --filter @aperture/spike2 test"` to root `package.json`

- [ ] **Task 4 — Write the SPIKE-2 test**
  - [ ] `packages/spike/test/spike2/spike2.ptb.test.ts`:
    - `beforeAll`: Load Contra config from `scripts/.published-contra-devnet.json`; read funded keypair from keystore; create `ContraClient` with devnet `SuiJsonRpcClient`; register payer + 2 recipient accounts (if not already registered)
    - Test: "one-PTB wrap+transferBatch — resolves or aborts": Build `wrapThunk = contraClient.wrap(...)` (payer wraps e.g. 0.01 SUI to themselves); then `await contraClient.transferBatch({ recipients: [{receiverAddress: r1, amount: 5000n}], merge: true })` (reads pre-wrap balance, computes proofs); compose in one PTB; `client.signAndExecuteTransaction`; assert tx status (success → ONE-PTB OK, abort → TWO-PTB required); record abort code if applicable
    - Test: "two-PTB wrap then transferBatch — succeeds" (the baseline that MUST pass to prove the test setup is valid)
    - Stale config guard (same pattern as onchain.devnet.test.ts)
  - [ ] Use the same keypair discovery helper as `onchain.devnet.test.ts:103` (copy the `readActiveKeypair` function or extract to a shared helper in `@aperture/spike`)

- [ ] **Task 5 — Run the test and record the decision**
  - [ ] `pnpm pretest:devnet && pnpm pretest:spike2` (ensure env + Contra instance)
  - [ ] `pnpm test:spike2`
  - [ ] Fill in the **Decision Record** section below based on the test results
  - [ ] Update this story's `status` field to `done`

## Decision Record

*(Fill in after running Task 5. Use the same table format as Story 1.2a.)*

| # | Test | Result |
|---|------|--------|
| 1 | One-PTB: wrap + transferBatch (merge: true) | ⏳ pending |
| 2 | One-PTB: wrap + transferBatch (merge: false, sufficient active balance) | ⏳ pending |
| 3 | Two-PTB baseline: wrap PTB, then transferBatch PTB | ⏳ pending |

**Decision: ONE-PTB / TWO-PTB** *(fill in)*

**Impact on Story 1.7:**
- ONE-PTB: Story 1.7 can compose fund + run in a single PTB. `pnpm publish:devnet` would need to run both operations together.
- TWO-PTB: Story 1.7 splits into two separate transactions. Funding (FR-4, Story 1.6) stays as a separate operation from the batch run (FR-5, Story 1.7). The `transferBatch` in Story 1.7 uses `merge: true` to pull in the funds wrapped in Story 1.6.

**Change Log:**
- **2026-06-21** — Story 1.2b created (ready-for-dev).

## Files Added / Changed

**`packages/sdk/`:**
- `packages/sdk/package.json` — add `file:../../vendor/contra/ts-sdk` dependency + `main`/`exports`; update `type: "module"`
- `packages/sdk/src/index.ts` — new: re-export all from vendored Contra ts-sdk

**`packages/spike/test/spike2/`** (new workspace package):
- `package.json` — new
- `spike2.ptb.test.ts` — new: SPIKE-2 PTB composition test
- `vitest.config.ts` — new
- `tsconfig.json` — new

**`scripts/`:**
- `scripts/.published-contra-devnet.json` — new, gitignored: Contra deployment config for devnet

**Root:**
- `pnpm-workspace.yaml` — add `packages/spike/test/spike2`
- `package.json` — add `test:spike2` script alias; optionally add `pretest:spike2` alias
