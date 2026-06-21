# Aperture Demo Runbook

**Sui Overflow 2026 · Proof-of-Figure PoC · Mode B only**

---

## Prerequisites

- **Node 20+** and **pnpm 11.8.0**
- **`sui` CLI** on PATH at devnet-compatible version:
  ```bash
  suiup install sui@devnet-1.73.0
  suiup default set sui@devnet-1.73.0
  ```
- **Active keystore** with ≥ 1 SUI on devnet. The `pretest:devnet` script tops up via faucet if balance < 0.5 SUI, but requires an existing active address.
- **WSL2 / Linux** for any `build:wasm` steps (AR-3). The `pnpm demo` command does not rebuild WASM — build artifacts must already exist.
- **Known limitation:** `publish:devnet` only tracks committed Move sources. Commit any Move changes before running `pnpm demo`.

---

## One-Command Startup

```bash
pnpm demo
```

This chains three idempotent steps:

1. `pnpm pretest:devnet` — confirms devnet is live, tops up faucet if balance < 0.5 SUI.
2. `pnpm publish:devnet` — reuses cached package ID if Move sources are unchanged; republishes if stale.
3. `pnpm --filter @aperture/web dev` — starts the app at http://localhost:5173.

Full chain completes < 5 min.

---

## Demo Script (3 Steps)

### Step 1: Verifier Request

> "The app opens with a request from a lender: prove your selected total equals 50,000 MIST. This is the ask the Holder needs to answer."

The Verifier request card is pre-loaded — no setup visible to judges.

### Step 2: Holder Proves

> "I switch to the Holder. I sign once — my key is derived locally, never sent anywhere. I select two entries. Watch: the system aggregates them homomorphically and generates a proof. The amount is encrypted on-chain — the key never leaves this browser."

- Role-switch → pre-sign explainer → wallet signature → Holder lens.
- Selection checklist: 2 entries selected, live running total visible.
- Click **Generate proof** → spinner with elapsed time (target ~100 ms) → 128-byte ZK aggregate proof produced in-browser.

### Step 3: Verifier Verifies

> "Back to the Verifier. Off-chain verify: badge-verified instantly. On-chain: I submit to Sui. Here's the transaction — click the explorer link. You can see the ciphertext, not the number. The proof verifies without revealing the Holder's key or which entries were included. This is Contra's confidential transfer plus Aperture's selective disclosure layer."

- Off-chain verify → `badge-verified` "Verified" (< 10 ms).
- On-chain verify → tx submitted → `badge-verified` + Sui explorer deep-link.
- Explorer shows ciphertext in the tx payload — no plaintext amount visible.

---

## Talking Points

- "The amount is encrypted on-chain — the explorer shows ciphertext, not the number."
- "The proof verifies without revealing the holder's key or which entries were included."
- "This is Contra's confidential transfer + Aperture's selective disclosure layer."

---

## Recovery: If Package ID Is Stale

A devnet reset makes `scripts/.published-devnet.json` stale. Symptom: on-chain verify tx aborts with `E_VERIFY_FAILED` or package-not-found error.

Recovery (< 5 min):

```bash
pnpm pretest:devnet && pnpm publish:devnet && pnpm --filter @aperture/web dev
```

This re-tops faucet, republishes Move with a fresh package ID, and restarts the app. No rebuild needed — the app reads the package ID at runtime.

---

## Fallback: If Devnet Is Down

A screen recording of the full 3-step Mode B flow is stored at:

```
docs/demo-backup/mode-b-demo.mp4
```

Or linked here: _(add hosted URL — YouTube unlisted / Loom — if file size is prohibitive for git)_

The recording uses the committed golden proof fixtures (`proofAggregateValid.hex`) so the result is always "Verified" and cannot fail.

> **Note:** Recording uses fixture data (`proofAggregateValid.hex`). Live demo uses real proof generation.

To run the off-chain verify against the fixture directly:

```bash
cd packages/spike && npx vitest run
```

---

## On-Chain Invariant (NFR-1)

After the on-chain verify step, follow the Sui explorer deep-link. The tx payload shows ciphertext, not a plaintext MIST amount — this is the primary trust signal for judges confirming that amounts stay encrypted throughout.

Current devnet package: `0x015d6cd95683a97f4e09129ae6a30e6ff48704486f89b630a36875d4c87c4c49`
