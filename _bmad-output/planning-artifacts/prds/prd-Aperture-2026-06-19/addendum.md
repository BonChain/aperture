# Aperture PRD — Addendum (technical depth for downstream workflows)

This addendum preserves implementation-level detail extracted from the source SRS (`docs/Aperture srs.md`) that does **not** belong in the capability-focused PRD but is load-bearing input for the **Architect** (`bmad-create-architecture`) and downstream Dev/QA. Nothing here is a requirement in itself; the requirements live in `prd.md`. Where the SRS marked something "informative" or "Architect to finalize," that disposition is preserved.

---

## A. Proposed architecture (informative — Architect to finalize)

- **Move package `aperture`** — thin on-chain anchor: org/payer object, recipient registry references, payment-run events; optional on-chain verifier entry wrapping Contra's `nizk::verify_elgamal`.
- **Backend service (Node/TS)** — holds off-chain sensitive data (per-recipient amounts), builds transactions (PTBs), hosts the dlog table, exposes REST API, runs auditor decryption and proof generation/verification.
- **Frontend (Vite/React)** — three role views; reuses Contra example hooks (`useContraClient`, `useDLogTable`, `useContraAuditor`).
- **External:** Sui Devnet; Contra SDK + deployed Contra package (pinned commit).
- **Adapter discipline (mitigation for C6):** isolate all Contra SDK calls behind a single backend adapter layer so a Contra upgrade touches one layer only.

### A.1 Reusable Contra assets (concrete starting points — confirmed in references)
- **`kaisho`** — ships the exact frontend hooks the addendum names (`useContraClient`, `useDLogTable`, `useContraAuditor`) **plus the dlog table running in a web worker**. Strong starting point for the frontend + balance reads.
- **`closed-loop`** — template for **permissioned / whitelisted registration**; relevant if Mode A registration needs gating to designated participants.
- **`payment-channel`** — the canonical **end-to-end TS test harness**; reuse as the basis for the NFR-1/NFR-2 invariant tests and the demo-path automation.

### A.2 Audit-trail-of-audit — tamper-evidence options (Open Question §12.3)
The references confirm the trail as a differentiator but are **silent on storage/tamper-evidence**. Architect to choose among: (a) append-only DB with no edit/delete API surface (simplest; satisfies NFR-5 at PoC honesty level); (b) hash-chained entries (each entry commits to the prior hash); (c) periodic on-chain anchoring of the log root. Pick the lightest option that the demo can *show* is tamper-evident.

## B. External interface detail

### B.1 Sui / Contra
- All chain interaction targets **Sui Devnet** via `@mysten/sui`. Contra package id is configuration, pinned to a known commit (C6).
- SDK surface in use:
  - `ContraClient`: `newAccount`, `register`, `wrap`, `transfer` / `transferBatch`, `unwrap`, `updateBalance`, `getBalance`, `getAuditors`.
  - `ContraAuditor`: `recoverPrivateKey`, `getTokenAccount`.
  - Primitives: `Ciphertext.add`, `ElGamalNizk`, `DiscreteLogTable`.
- Auditor model: Contra **Option-2** auditor model (viewing-key material encrypted to the designated auditor at registration, published on-chain with a correctness proof). **Confirmed = "god-key per account":** `recoverPrivateKey` yields the account's viewing key → decrypt-everything for that account (not per-row). This is the Starknet-style designated-key model; honesty framing lives in PRD §4.2 / §6.2.
- **Account setup is two steps:** `newAccount` is **once per address** (covers all tokens); `register` is **once per token**. The seed/register flow (FR-3, FR-20) must perform both.
- **Balance shape:** `getBalance` returns `{ balance (active), pending, pendingPublicBalance }` — three buckets. FR-6's Holder view must account for pending-public (from wraps), not just active+pending.
- **Decryption requires table *and* secret key** (C2) — both the initialized `DiscreteLogTable` and the relevant secret/viewing key.
- **Browser bulletproofs WASM is mandatory** — a `wasmUrl` must be provided when running in the browser (not needed in Node). This bears directly on the NFR-6 decision of whether proof generation runs browser-side or server-side; default to server-side generation, keep only holder-local *decrypt* in the browser.
- **Bounded aggregation (C7):** ~2¹⁶ unmerged deposits accumulate before new deposits are rejected until merge. Immaterial at demo scale; keep holders merged.
- **Verified primitives for Mode B:** `nizk.move` exposes `verify_elgamal()`, `verify_ddh()`, `verify_key_consistency()`; `ElGamalNizk` proves a ciphertext encrypts a known `m` (`c = r·g + m·h`, `d = r·pk`). Combined with `Ciphertext.add`, the SPIKE-1 aggregate path is grounded.
- **Confirm against pinned source (still open):** one-PTB wrap+batch balance-conflict, aggregate range/overflow handling, and empirical tamper-soundness (NFR-3). Contra is unaudited beta.

### B.2 Backend API (REST — Architect may revise shape)
`POST /orgs` · `POST /orgs/:id/recipients` · `POST /recipients/:id/register` · `POST /orgs/:id/fund` · `POST /orgs/:id/run` · `GET /holders/:id/balance` · `POST /holders/:id/claim` · `POST /holders/:id/withdraw` · `GET /orgs/:id/audit` · `POST /audit/log` (internal) · `POST /proofs/figure` (Mode B generate) · `POST /proofs/verify` (Mode B verify).

### B.3 UI
Three role views (Payer dashboard, Holder view, Auditor/Verifier console). Must show loading state during proof generation, empty states, and the C4 error ("recipient not registered") as a user-actionable message.

### B.4 Build / tooling gates
- **Move format gate:** `npx @mysten/prettier-plugin-move -w` must be run or **CI fails** (the build does not catch unformatted Move). Wire this into the FR-20 one-command flow / pre-commit.
- **Toolchain pinning:** Move builds with a pinned toolchain (NFR-10); Node 20+, TS strict.

## C. Data model (logical; off-chain store)

```
Org        { id, onchainAnchorId, payerAddress, auditorPublicKey }
Recipient  { id, orgId, address, displayName, amount: bigint, registered: bool }   // amount: confidential, off-chain only
PaymentRun { id, orgId, runIndex, txDigest, recipientCount, at }
AuditLog   { id, auditorId, orgId, targetAccount, action, at }                      // append-only
Disclosure { id, holderId, includedRefs[], disclosedValue X, proof, createdAt }     // Mode B
```

On-chain holds: `aperture` anchor/registry + `PaymentRun` events; all balances/amounts live encrypted inside Contra. No plaintext amount on-chain (NFR-1).

## D. Traceability summary (from SRS §10)

- Privacy invariants: NFR-1, NFR-2, NFR-9 ← C5.
- Batch limit: C1 ← FR-2 (cap), FR-5, FR-8, SPIKE-2.
- Decryption table: C2 ← FR-6, NFR-6.
- Pending/merge: C3 ← FR-7.
- Register-before-receive: C4 ← FR-3.
- Mode B correctness: NFR-3 ← Mode B verify (FR-17).

## E. Source epics → stories (verbatim from SRS §7, for the SM)

> Preserved for `bmad-create-epics-and-stories`. The PRD's FRs are the contract; these stories are the SRS's pre-sharded intake. **Epic 3 is gated on SPIKE-1 — do not schedule its build stories until SPIKE-1 passes.**

**EPIC 1 — Foundation & Confidential Payments Data Plane** (1.1 deploy scaffolding; 1.2 org & recipient mgmt; 1.3 register recipients; 1.4 fund via single aggregate wrap; 1.5 batch run ≤7; 1.6 holder balance & claim/withdraw).

**EPIC 2 — Auditor Console / Mode A** (2.1 auth & scope; 2.2 recover & view; 2.3 per-run report & export; 2.4 audit-trail-of-audit; 2.5 privacy posture panel).

**EPIC 3 — Proof-of-Figure / Mode B — GATED on SPIKE-1** (3.0 SPIKE-1 enabler, do first; 3.1 select entries & disclose value; 3.2 generate proof; 3.3 verify proof; 3.4 disclosure receipt — could).

**EPIC 4 — Demo polish & narrative** (4.1 role-switch + explorer deep-links; 4.2 empty/error/loading states; 4.3 seed data + scripted demo path).

Full AC text for each story lives in `docs/Aperture srs.md §7`.
