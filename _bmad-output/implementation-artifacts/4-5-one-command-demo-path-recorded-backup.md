---
story_track: 4-5
status: ready-for-dev
---

# Story 4.5: One-Command Demo Path & Recorded Backup

Status: ready-for-dev

## Story

As a demo operator,
I want a one-command scripted demo path with a recorded backup,
so that the Mode B flow runs in one pass on a fresh Devnet and survives technical issues during the Sui Overflow presentation.

## Story Context

- **Epic:** Epic 4 — Demo Narrative & Polish.
- **Owner:** Tenny (lead, solo — PM + full-stack. Scripts + presentation + recorded backup).
- **Position in the epic spine:** This is the **last story**. Depends on Stories 3.1, 3.2, 3.3 (Mode B flow), Story 4.4 (Verifier request card), and Story 4.1 (role-switch polish). Nothing follows.
- **Scope adjustment from epics.md:** The original Story 4.5 assumed the full 8-step demo loop across all roles (create org → register → fund → run → claim → report → prove → verify). Since Epic 1 (data plane) and Epic 2 (Mode A console) are parked, the demo path is **Mode B only — 3 steps**:
  1. App opens with the Verifier request card (from Story 4.4): "Prove your selected total = 50,000 MIST."
  2. Holder switches role, signs, selects 2 entries, generates aggregate proof (~50–100ms actual, surfaced as elapsed time).
  3. Verifier verifies — off-chain: `badge-verified` instantly; on-chain: tx submitted → `badge-verified` + Sui explorer deep-link.
- **SPIKE-1 status:** GO (2026-06-20). Aggregate proof path is live. Package at `0x015d6cd95683a97f4e09129ae6a30e6ff48704486f89b630a36875d4c87c4c49` on Sui devnet.
- **Demo infrastructure already in place:** `pnpm pretest:devnet` (env + funded address) and `pnpm publish:devnet` (idempotent deploy) both exist in `package.json`. This story chains them into a single `pnpm demo` entry-point and adds `DEMO.md` + the recorded backup.

## Acceptance Criteria

1. **One-command startup (FR-20b, NFR-7).** Given a fresh Devnet with sui CLI on PATH and keystore funded, when `pnpm demo` runs, then:
   - `pnpm pretest:devnet` executes first (idempotent: devnet env active, funded address topped up if < 0.5 SUI).
   - `pnpm publish:devnet` executes next (idempotent: reuses cached package ID if Move sources unchanged, republishes if stale).
   - `pnpm --filter @aperture/web dev` starts the web app last.
   - The full chain completes < 5 min.
   - The app opens to the Mode B Holder front door (UX-DR23) with the Verifier request card pre-loaded (Story 4.4).

2. **Scripted path runs end-to-end in one pass (FR-20b).** Given the app is running after `pnpm demo`, when the 3-step demo script is followed, then:
   - Step 1 (Verifier opens): the request card is visible — "Prove your selected total = 50,000 MIST."
   - Step 2 (Holder proves): role-switch to Holder → sign → select 2 entries → "Generate proof" → spinner with elapsed time → `proofValid.hex`-equivalent output.
   - Step 3 (Verifier verifies): off-chain verify → `badge-verified` "Verified"; on-chain verify tx → `badge-verified` + Sui explorer deep-link with encrypted amount visible.
   - No manual intervention is needed between steps.

3. **Devnet reset recovery (NFR-7).** Given a Devnet reset that makes the cached package ID stale, when the operator runs `pnpm pretest:devnet && pnpm publish:devnet && pnpm --filter @aperture/web dev`, then the environment is fully re-established and the demo path runs again. This is documented as the recovery procedure in `DEMO.md`.

4. **Encrypted amounts on-chain invariant (NFR-1).** Given the demo's on-chain verify step, when the Sui explorer deep-link is followed, then the tx payload shows ciphertext (not a plaintext MIST amount) — the explorer confirms amounts are encrypted. This is the primary on-chain trust signal for judges.

5. **Recorded backup exists and is referenced (continuity insurance).** Given the recorded backup, then:
   - A screen recording (or GIF) of the full 3-step Mode B flow exists and is stored in `docs/demo-backup/` or linked from `DEMO.md`.
   - The recording uses the committed golden proof fixtures (`proofAggregateValid.hex`) so the result is always "Verified" — it cannot fail.
   - `DEMO.md` documents the fallback: "If devnet is down or a live error occurs, open [link to recording]."
   - The recording copy note: "Recording uses fixture data. Live demo uses real proof generation."

6. **`DEMO.md` exists at repo root.** Given `DEMO.md`, then it contains:
   - Prerequisites (sui CLI version, pnpm, keystore funded with ≥ 1 SUI).
   - One-command startup: `pnpm demo`.
   - The 3-step demo script with talking points.
   - Recovery: if package ID stale, run `pnpm pretest:devnet && pnpm publish:devnet`.
   - Fallback: if devnet is down, use the recorded backup.
   - The three Aperture talking points (see Dev Agent Technical Context §Talking Points).

## Dev Agent Technical Context

### One-Command Script to Add

Add to root `package.json` `scripts`:

```json
"demo": "pnpm pretest:devnet && pnpm publish:devnet && pnpm --filter @aperture/web dev"
```

Current scripts already present in `package.json`:
- `"pretest:devnet": "./scripts/pretest-devnet.sh"` — idempotent: sets devnet env, tops up faucet if < 0.5 SUI.
- `"publish:devnet": "./scripts/publish-devnet.sh"` — idempotent: reuses cached `scripts/.published-devnet.json` if `git rev-parse HEAD:move` unchanged, republishes otherwise. **Known limitation (from SPIKE-1 review):** only tracks committed Move sources — unstaged changes won't trigger republish. Operator must commit Move changes before running `pnpm demo`.

No other `package.json` changes are needed. The `pnpm --filter @aperture/web dev` pattern matches the workspace filter convention used throughout the repo.

### Prerequisites (for DEMO.md)

- `sui` CLI on PATH at devnet-compatible version (Story 1.2a used `devnet-1.73.0`; run `suiup default set sui@devnet-1.73.0` if mismatched).
- Active keystore with ≥ 1 SUI on devnet (the `pretest:devnet` script tops up via faucet if balance < 0.5 SUI, but requires an existing active address).
- `pnpm` 11.8.0 and Node 20+.
- WSL2/container for any `build:wasm` steps (Windows wasm-pack path issue documented in AR-3; `pnpm demo` itself does not rebuild wasm — build artifacts must already exist).

### How to Re-Run (from SPIKE-1 Story 1.2a)

The "How to re-run" section of `1-2a-spiKE-1-go-no-go.md` is the basis for the `pnpm demo` chain:

```bash
# One-time toolchain (if version changed)
suiup install sui@devnet-1.73.0
suiup default set sui@devnet-1.73.0

# Full demo startup (wraps all three steps)
pnpm demo

# Recovery if package ID stale (devnet reset)
pnpm pretest:devnet && pnpm publish:devnet && pnpm --filter @aperture/web dev
```

### Package ID

Current devnet package: `0x015d6cd95683a97f4e09129ae6a30e6ff48704486f89b630a36875d4c87c4c49`

Captured at `scripts/.published-devnet.json`. If devnet resets, `pnpm publish:devnet` republishes and updates this file. The on-chain verify step in Story 3.3 reads the package ID from this file at runtime — no hardcoding in UI code.

### Golden Proof Fixtures (for Recorded Backup)

The recorded backup uses the committed aggregate fixtures from Story 1.2a / SPIKE-1 addendum:
- `proofAggregateValid.hex` — 2-entry aggregate (amounts 40000 + 30000 MIST, sum 70000), verified on devnet (tx status: success).
- `proofAggregateTampered.hex` — same proof with z1-scalar byte tampered, aborts with `E_VERIFY_FAILED` (code 100).

Generated by `scripts/generate-aggregate-proof.ts`. These fixtures always produce deterministic results and are the right choice for a recorded demo that cannot fail.

### Demo Script (3 Steps with Talking Points)

**Step 1 — Verifier opens the app:**
> "The app opens with a request from a lender: prove your selected total equals 50,000 MIST. This is the ask the Holder needs to answer."

The Verifier request card (Story 4.4) is pre-loaded — no setup visible to judges.

**Step 2 — Holder proves:**
> "I switch to the Holder. I sign once — my key is derived locally, never sent anywhere. I select two entries. Watch: the system aggregates them homomorphically and generates a proof. The amount is encrypted on-chain — the key never leaves this browser."

- Role-switch → pre-sign explainer → wallet signature → Holder lens.
- Selection checklist: 2 entries selected, live running total visible (UX-DR14).
- "Generate proof" → spinner with elapsed time (target ~100ms actual) → proof output.

**Step 3 — Verifier verifies:**
> "Back to the Verifier. Off-chain verify: badge-verified instantly. On-chain: I submit to Sui. Here's the transaction — click the explorer link. You can see the ciphertext, not the number. The proof verifies without revealing the Holder's key or which entries were included. This is Contra's confidential transfer plus Aperture's selective disclosure layer."

- Off-chain verify → `badge-verified` "Verified" (< 10ms).
- On-chain verify → tx submitted → `badge-verified` + Sui explorer deep-link.
- Explorer shows ciphertext in the tx payload (no plaintext amount visible).

### Talking Points (verbatim for DEMO.md)

- "The amount is encrypted on-chain — the explorer shows ciphertext, not the number."
- "The proof verifies without revealing the holder's key or which entries were included."
- "This is Contra's confidential transfer + Aperture's selective disclosure layer."

### Recorded Backup

- **Format:** screen recording (MP4) or animated GIF. GIF preferred for instant playback without a media player.
- **Storage:** `docs/demo-backup/mode-b-demo.mp4` (or `.gif`) committed to the repo, OR linked from `DEMO.md` to a hosted URL (YouTube unlisted / Loom) if file size is prohibitive for git.
- **Content:** the full 3-step flow using fixture data. The recording should clearly show:
  1. The Verifier request card.
  2. The Holder proof generation with elapsed time visible.
  3. The on-chain verify `badge-verified` and the Sui explorer link.
  4. The explorer page showing ciphertext (not a plaintext amount).
- **Timestamp watermark:** include the recording date so judges know it is a live demo of the actual app, not a mockup.

### `DEMO.md` Structure

Create `/home/tenni/aperture/DEMO.md` with:

```
# Aperture Demo Runbook

## Prerequisites
## One-Command Startup
## Demo Script (3 Steps)
  ### Step 1: Verifier Request
  ### Step 2: Holder Proves
  ### Step 3: Verifier Verifies
## Talking Points
## Recovery: If Package ID Is Stale
## Fallback: If Devnet Is Down
```

### Devnet Reset Recovery Detail

A Devnet reset causes `scripts/.published-devnet.json` to contain a stale package ID. Symptoms: on-chain verify tx aborts with `E_PACKAGE_NOT_FOUND` or similar. Recovery:

1. Run `pnpm pretest:devnet` — tops up faucet, confirms devnet is live.
2. Run `pnpm publish:devnet` — detects stale ID (hash mismatch or RPC lookup fails), republishes, writes new package ID to `scripts/.published-devnet.json`.
3. Restart the web app: `pnpm --filter @aperture/web dev`.

Total recovery time < 5 min (NFR-7). The web app reads the package ID at runtime from the config file — no rebuild needed after republish.

## Tasks / Subtasks

**Task 1: Add `pnpm demo` script to `package.json`**
- [ ] Add `"demo": "pnpm pretest:devnet && pnpm publish:devnet && pnpm --filter @aperture/web dev"` to the `scripts` block in `/home/tenni/aperture/package.json`.
- Verify: `pnpm demo` on a clean devnet state runs all three phases without error.

**Task 2: Create `DEMO.md` at repo root**
- [ ] Create `/home/tenni/aperture/DEMO.md` with prerequisites, one-command startup, 3-step demo script, talking points, recovery procedure, and fallback link.
- [ ] Include the three verbatim talking points from §Talking Points above.
- [ ] Reference the recorded backup location (`docs/demo-backup/` or hosted URL).
- Verify: a non-technical reader can run the demo from `DEMO.md` alone in < 10 min.

**Task 3: Record the demo backup**
- [ ] Run the 3-step demo script against the committed golden fixtures (`proofAggregateValid.hex`).
- [ ] Record screen capture of the full flow — request card visible, proof generation with elapsed time, on-chain `badge-verified`, explorer link showing ciphertext.
- [ ] Store at `docs/demo-backup/mode-b-demo.mp4` (or `.gif`) or link from `DEMO.md` to hosted URL.
- [ ] Add a note in `DEMO.md`: "Recording uses fixture data (`proofAggregateValid.hex`). Live demo uses real proof generation."
- Verify: the recording plays end-to-end and shows all three steps with `badge-verified` at the end.

**Task 4: Verify `pnpm demo` on a simulated fresh state**
- [ ] Delete `scripts/.published-devnet.json` (simulate Devnet reset).
- [ ] Run `pnpm pretest:devnet && pnpm publish:devnet` — confirm new package ID is written.
- [ ] Run the 3-step demo script — confirm on-chain verify passes with the new package ID.
- Verify: recovery < 5 min end-to-end (NFR-7).

**Task 5: Smoke-test the on-chain invariant**
- [ ] After `pnpm demo`, open the Sui explorer deep-link from the on-chain verify step.
- [ ] Confirm the tx payload shows ciphertext and no plaintext MIST amount.
- Verify: NFR-1 invariant confirmed visually for the demo path.

## Files Added / Changed

| File | Action | Purpose |
|------|--------|---------|
| `/home/tenni/aperture/package.json` | Edit — add `"demo"` to `scripts` | One-command startup entry point |
| `/home/tenni/aperture/DEMO.md` | Create | Demo runbook: prerequisites, 3-step script, talking points, recovery, fallback |
| `/home/tenni/aperture/docs/demo-backup/mode-b-demo.mp4` (or `.gif`, or link) | Create | Recorded backup of full Mode B flow — continuity insurance |

No other files are changed. The `pretest-devnet.sh` and `publish-devnet.sh` scripts already exist and are not modified by this story.
