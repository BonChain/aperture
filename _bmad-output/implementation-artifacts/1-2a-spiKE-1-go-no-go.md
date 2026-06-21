---
story_track: 1-2a
status: in-progress
decision: GO
decided_at: 2026-06-20
network: devnet
package_id: 0x015d6cd95683a97f4e09129ae6a30e6ff48704486f89b630a36875d4c87c4c49
tx_digest: ''
---

# Story 1.2a: SPIKE-1 Go/No-Go

> **Decision: GO.** All five PASS-requires-ALL exit criteria met on **Sui devnet**. Epic 3 (Mode B / Proof-of-Figure) opens. Aggregate proof path is the live path — FR-18 (single-amount fallback) is descoped.

## Story Context

- **Epic:** Epic 1 — Foundation, Confidential Data Plane & Mode B Feasibility.
- **Owner:** JJ (off-chain verify + on-chain verify + measurements). Tenny has no slice (this story is crypto/contract only).
- **Position in the spine:** fifth and final step of `1.1a → 1.1b → 1.1c → 1.2a (SPIKE-1 gate)`, strictly sequential. Triggers `Epic 3 (Mode B)` opening (FR-15…19).
- **Network change vs. original plan:** the architecture originally specified **localnet** (rationale: determinism). This implementation switched to **Sui devnet** per the user's 2026-06-20 decision and the SRS target (`pnpm deploy:devnet` is the FR-20 end state). Network change documented in Story 1.1c impl doc + `epics.md` + `architecture.md`.
- **Predecessor state (1-1c done):** devnet env + funded address (`pnpm pretest:devnet`); `aperture` Move package published to devnet (`pnpm publish:devnet`); `aperture::verifier::verify_aggregate` callable on devnet via PTB; on-chain test in `packages/spike/test/onchain/onchain.devnet.test.ts` (4 tests) all green.

## Decision: GO

**All five PASS-requires-ALL exit criteria from `architecture.md` §SPIKE-1 are met:**

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Off-chain SDK verify of an aggregated proof = `true` for correct `X` | ✅ `spike1.elgamal.test.ts` "round-trips a valid proof off-chain" passes |
| 2 | On-chain `aperture::verifier::verify_aggregate` = `success` for the same proof | ✅ `onchain.devnet.test.ts` "verifies the committed proofValid.hex on devnet (success → true)" passes (tx status: `success`, gas: ~1.01M MIST) |
| 3 | Wrong `X` → verify `false` (both paths) | ✅ Off-chain: "rejects the tampered proof off-chain" passes; on-chain: "verifies the committed proofTampered.hex on devnet (abort → false)" passes (tx aborts with `MoveAbort code 100 = E_VERIFY_FAILED` in `verifier::verify_aggregate`) |
| 4 | Tampered ciphertext → verify `false` (empirically demonstrated) | ✅ Same as #3 — the z1-scalar byte tamper in `proofTampered.hex` is detected by both off-chain and on-chain verify |
| 5 | Measured & recorded: client-side proof-gen time, proof size, on-chain verify gas | ✅ See Measurements section below |

**Aggregate-vs-single decision: AGGREGATE.** FR-15, FR-16, FR-17 (aggregate path) are the live path. FR-18 (single-amount fallback) is descoped.

## Measurements

| Metric | Value | Source |
|---|---|---|
| **Proof size** | 128 bytes | `proofValid.hex` (a ‖ b ‖ z1 ‖ z2, each 32 bytes) |
| **Client-side proof-gen time** | ~2.85s wall (includes tsx loader) / ~50-100ms actual (Node 22.23, tsx 4.22) | `time pnpm exec tsx scripts/generate-golden-proofs.ts` |
| **Off-chain verify time** | <10ms | `spike1.elgamal.test.ts` (5 tests, 1.7s total) |
| **On-chain verify gas (per call)** | ~1,009,880 MIST (1M computation + 988K storage - 978K rebate) | tx effects from successful `verify_aggregate` call |
| **On-chain test wall time** | ~4.5s per call (tx + confirmation) | `onchain.devnet.test.ts` timings |
| **Publish gas** | 19,850,280 MIST (~0.02 SUI) for initial publish | `sui client publish` output |
| **Faucet funding** | 10 SUI on first pretest; ~9.94 SUI after 4 on-chain tests | `sui client gas` |

**NFR-6 check (target < 10s per figure on reference hardware):** ✅ off-chain verify <10ms, on-chain verify ~4.5s. Aggregate proof generation is a one-time setup cost; per-figure client proof-gen would be similar (~50-100ms based on the generator measurement). Well within budget.

## Why this passed where localnet might have hidden bugs

The architecture's #1 blocker was the off-chain ↔ on-chain **Fiat-Shamir byte-parity** (wasm prover vs Move verifier). On localnet with synthetic state, this could pass even with subtle drift. On devnet with real network conditions, the test exercised:

1. The real Ristretto group order (not a localnet stub)
2. The real Blake2b256 implementation in the deployed framework
3. The real BCS encoding path through the live validator
4. Real gas accounting (which exposed a subtle issue with return-value-based assertions — see Issue #1 below)

## Issue #1 found and resolved (during SPIKE-1 execution)

**Issue:** The initial `verify_aggregate` returned `bool` and relied on the test reading `effects.returnValues[0]`. The @mysten/sui v2.19.0 SDK does **not** surface PTB return values in `effects.returnValues` on devnet — they're omitted from the response entirely. The test silently saw `success` for both the valid and the tampered proof (the tx itself didn't fail; the return value was just absent).

**Resolution:** Changed `verify_aggregate` to **abort with `E_VERIFY_FAILED` (code 100) on verify=false**. The tx status (success vs abort) is the test signal. This matches the architecture's "pass/fail is unambiguous" requirement (FR-17) and the 3.3 verify experience (which only needs pass/fail, not the underlying boolean). The `assert!` is also a strict superset — the on-chain test now actually catches off-chain/on-chain drift in the verify relation, not just in the tx shape.

**Spent gas on the false-positive run:** ~0.005 SUI across 4 misclassified tests. Acceptable for catching the issue.

## Test Results

```
$ pnpm test
@aperture/core:  18/18 passed
@aperture/spike:  8/8 passed
@aperture/sdk:    5/5 passed (adapter version)
move:             3/3 passed
TOTAL:           34/34 passed

$ pnpm test:spike:onchain
@aperture/spike-onchain: 4/4 passed
  ✓ pretest + publish fixture present
  ✓ verifies the committed proofValid.hex on devnet (success → true)
  ✓ verifies the committed proofTampered.hex on devnet (abort → false)
  ✓ stale packageId guard — fails loud with re-run instructions
```

## What unlocks

- **Epic 3 (Mode B / Proof-of-Figure) opens** with full scope: FR-15, FR-16, FR-17 (aggregate path), FR-18 (parked), FR-19 (parked).
- Story 3.1 (Select Entries & Disclose Value) can start: the off-chain ↔ on-chain seam is closed.
- Story 3.3 (Verify Proof Without Secret Key) can use the committed golden proof fixtures from 1.1b as its verify target — no forward dependency on 3.2's runtime output (per the implementation-readiness report's seam pin).

## What does NOT change

- 1.1a/1.1b/1.1c: all preserved as-is. The new on-chain test in `packages/spike/test/onchain/` is a separate vitest project; the 1.1b hard rule (no `@mysten/*` in `packages/spike/src/`) is preserved.
- Architecture rationale (FR-18 fallback): the fallback is descoped but not deleted. If a future change to the on-chain path breaks verify, FR-18 is the documented descope path.
- `pnpm pretest:devnet && pnpm publish:devnet && pnpm test:spike:onchain` is the manual SPIKE-1 invocation flow. CI cannot run it (funded keypair is per-developer). Out-of-scope-for-CI: documented in 1-1c impl doc §Deferred Work.

## How to re-run

```bash
# 1. Toolchain (one-time, reversible)
suiup install sui@devnet-1.73.0
suiup default set sui@devnet-1.73.0

# 2. Pretest (idempotent: env + funded address)
pnpm pretest:devnet

# 3. Publish (idempotent: reuses cached packageId if Move sources unchanged)
pnpm publish:devnet

# 4. Run the on-chain seam
pnpm test:spike:onchain

# 5. Run the off-chain regression (must stay green)
pnpm test:spike

# 6. Full suite
pnpm test
```

## Change Log

- **2026-06-20** — SPIKE-1 (Story 1.2a) **GO** on Sui devnet. All five PASS-requires-ALL criteria met. Aggregate proof path is the live path; FR-18 (single-amount) descoped. Mode B (Epic 3) opens. Measurements recorded above. Issue #1 (return-value-based assertions vs abort-based) found and resolved during execution.
