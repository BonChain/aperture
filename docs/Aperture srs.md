# Software Requirements Specification — Aperture
### Confidential Compliance & Disclosure Layer on Sui
**Version:** 0.1 (PoC/MVP scope) · **Status:** Draft for BMAD intake · **Target:** Sui Overflow 2026, DeFi & Payments

> **How to use with BMAD:** This doc is written to serve as the PRD input. Sections 2–6 give context + enumerated `FR*`/`NFR*` requirements; Section 7 holds BMAD-ready **Epics → Stories** with acceptance criteria for the SM/Dev/QA agents to shard. Recommended next step in BMAD: run the Architect agent against Sections 4–6 to produce `architecture.md`, then shard Section 7 into stories. **Mode B (Epic 3) is spike-gated — see §8.1; do not let the SM schedule Epic 3 stories before SPIKE-1 passes.**

---

## 1. Introduction

### 1.1 Purpose
Specify requirements for **Aperture**, a compliance & disclosure layer that sits beside confidential tokens on Sui (built on Mysten's `confidential-transfers` / "Contra"). Aperture lets a designated auditor read encrypted activity *with permission* (Mode A) and lets a token holder *prove a figure* about their encrypted activity without revealing the underlying rows or surrendering their key (Mode B).

### 1.2 Scope (this version)
A demonstrable end-to-end PoC on **Sui Devnet** comprising: a minimal confidential-payments data plane (so there is real encrypted activity to act on), the **Auditor Console (Mode A)**, and **Proof-of-Figure (Mode B)**. Out of scope for this version: mainnet, multi-issuer SaaS, billing, Travel-Rule production integration, recurring scheduling, mobile. See §9.

### 1.3 Definitions & acronyms
- **Contra** — Sui confidential transfers primitive (`MystenLabs/confidential-transfers`).
- **Confidential domain** — state where amounts/balances are encrypted (Twisted ElGamal).
- **Wrap/Unwrap** — move a public `Coin<T>` into/out of the confidential domain (amount is **visible** at the crossing).
- **Mode A / Auditor Console** — designated-auditor read path via `ContraAuditor.recoverPrivateKey`.
- **Mode B / Proof-of-Figure** — holder-generated proof that an aggregate (or single) encrypted amount equals a disclosed value `X`, verifiable without the holder's secret key.
- **dlog table** — `DiscreteLogTable`, precomputed table required to decrypt.
- **Payer/Issuer, Holder, Auditor/Verifier** — the three roles (§2.3).
- **AC** — acceptance criteria. **FR/NFR** — functional / non-functional requirement.

### 1.4 References
- Contra knowledge reference (internal) — SDK surface, balance model, constraints.
- PrivPNL knowledge reference (internal) — Mode B conceptual blueprint.
- Repo: https://github.com/MystenLabs/confidential-transfers · Docs: AUDITORS.md in repo.

---

## 2. Overall Description

### 2.1 Product perspective
Aperture is an **application + tooling layer**; it does not implement cryptography. All confidential money movement and proof primitives come from Contra via its TS SDK and Move package. Aperture adds: business/workflow objects, role-based UIs, the auditor workflow, the proof-of-figure workflow, and a verifier.

### 2.2 High-level architecture (informative; Architect to finalize)
- **Move package `aperture`** — thin on-chain anchor: org/payer object, recipient registry references, payment-run events; optional on-chain verifier entry wrapping Contra's `nizk::verify_elgamal`.
- **Backend service (Node/TS)** — holds off-chain sensitive data (e.g., per-recipient amounts), builds PTBs, hosts the dlog table, exposes REST API, runs auditor decryption and proof generation/verification.
- **Frontend (Vite/React)** — three role views; reuses Contra example hooks (`useContraClient`, `useDLogTable`, `useContraAuditor`).
- **External:** Sui Devnet; Contra SDK + deployed Contra package (pinned commit).

### 2.3 User roles
| Role | Description |
|---|---|
| **Payer/Issuer** | Funds a confidential treasury, runs payments to recipients, designates the auditor. |
| **Holder/Recipient** | Receives confidential funds, claims/withdraws, generates a Proof-of-Figure. |
| **Auditor/Verifier** | Reads designated activity via Mode A; verifies Proof-of-Figure submissions (Mode B). |

### 2.4 Assumptions & dependencies
- Contra is deployable to Devnet and its TS SDK is usable from Node + browser (with bulletproofs wasm).
- A test token (Contra's BU, presented as mock "USDC") is available.
- Devnet may reset; the system must be re-deployable and re-seedable by script.

### 2.5 Constraints (hard — inherited from Contra; non-negotiable)
- **C1 — Batch limit:** a single `transferBatch` call serves **≤ 7 recipients** (`MAX_BATCH_RECIPIENTS = 7`).
- **C2 — Decryption needs the dlog table:** any balance/amount decryption requires an initialized `DiscreteLogTable`.
- **C3 — Pending vs active:** incoming funds land in *pending* and must be *merged* to *active* before spend; merge-then-spend can fail under concurrent deposit and must be retried (`merge:false`).
- **C4 — Register before receive:** a recipient must have a registered `TokenAccount<T>` before it can receive a transfer.
- **C5 — Privacy boundary:** wrap/unwrap expose amount; only intra-domain transfers hide amount; sender/receiver/timing are always public.
- **C6 — Beta/unaudited:** pin a Contra commit; deploy own instance; do not rely on a shared deployment.

---

## 3. Functional Requirements

Priority: **M** = must (PoC pass), **S** = should, **C** = could.

### 3.1 Data plane — confidential payments (supporting)
- **FR1 (M):** Payer can create an organization/payer entity; the system records an on-chain anchor object and an off-chain record.
- **FR2 (M):** Payer can add recipients (address + display name + amount), with the recipient count capped at 7 (per C1); amounts are stored off-chain only, never written on-chain in plaintext (per C5/NFR1).
- **FR3 (M):** Payer can register a recipient's confidential `TokenAccount<T>` (per C4) before any payment.
- **FR4 (M):** Payer can fund the treasury by wrapping a single aggregate public coin into the confidential domain (per C5 — one aggregate wrap, never per-recipient).
- **FR5 (M):** Payer can execute a payment run that issues confidential transfers to all recipients; for ≤7 recipients this is one `transferBatch`; the run records a `PaymentRun` event with recipient count and timestamp (no amounts).
- **FR6 (M):** Holder can view their own decrypted balance (active + pending) (per C2).
- **FR7 (S):** Holder can claim (merge pending→active, handling the C3 retry) and withdraw (unwrap to a public coin).
- **FR8 (S):** Payment run supporting >7 recipients via automatic chunking into multiple `transferBatch` calls. *(Deferred unless SPIKE-2 shows headroom.)*

### 3.2 Mode A — Auditor Console
- **FR9 (M):** At registration, the recipient's viewing-key material is encrypted to the designated auditor's key and published on-chain with the correctness proof (Contra Option-2 auditor model).
- **FR10 (M):** Auditor can authenticate to the console with their auditor key and see only the orgs/tokens they are designated for.
- **FR11 (M):** Auditor can recover a designated account's viewing key (`recoverPrivateKey`) and view that account's decrypted balances and transfer history.
- **FR12 (M):** Auditor can produce a per-run report listing recipients and decrypted amounts for an org/payment-run, exportable (CSV/JSON).
- **FR13 (M):** Every auditor read action is recorded in an immutable **audit-trail-of-audit** (who, which account, when, under which designation), viewable in the console.
- **FR14 (S):** Console surfaces the privacy posture explicitly (what is public on-chain vs what required the auditor key), to avoid over-claiming.

### 3.3 Mode B — Proof-of-Figure (spike-gated, see §8.1)
- **FR15 (M\*):** Holder can select a set of their own encrypted transfer/balance entries to include in a figure. *(M\* = must, conditional on SPIKE-1.)*
- **FR16 (M\*):** System aggregates the selected encrypted entries homomorphically (`Ciphertext.add()`) and generates an `ElGamalNizk` proof that the aggregate encrypts a disclosed value `X` under the holder's public key.
- **FR17 (M\*):** A Verifier can verify the proof against the holder's public key and the on-chain ciphertext(s) **without** the holder's secret key, off-chain (SDK) and/or on-chain (`nizk::verify_elgamal`).
- **FR18 (S):** Fallback mode — prove a **single** encrypted amount equals `X` (lower complexity) if aggregate proving (FR16) does not pass SPIKE-1 in time.
- **FR19 (C):** Holder can package a proof + minimal metadata into a shareable artifact (e.g., a JSON "disclosure receipt") for an external party.

### 3.4 Shared / platform
- **FR20 (M):** One-command deploy + seed script that (re)deploys the pinned Contra package + `aperture` package and seeds a demo org with registered recipients on a fresh Devnet (per §2.4).
- **FR21 (M):** Role switching in the UI for demo purposes (Payer / Holder / Auditor-Verifier) without production-grade auth.
- **FR22 (S):** Explorer deep-links for each on-chain tx so a viewer can confirm amounts are encrypted.

---

## 4. External Interface Requirements

### 4.1 Sui / Contra
- **EIF1:** All chain interaction targets Sui Devnet via `@mysten/sui`. Contra package id is configuration, pinned to a known commit (C6).
- **EIF2:** SDK methods used: `newAccount`, `register`, `wrap`, `transfer`/`transferBatch`, `unwrap`, `updateBalance`, `getBalance`, `getAuditors` (`ContraClient`); `recoverPrivateKey`, `getTokenAccount` (`ContraAuditor`); `Ciphertext.add`, `ElGamalNizk`, `DiscreteLogTable` (primitives).

### 4.2 Backend API (REST; Architect may revise shape)
`POST /orgs` · `POST /orgs/:id/recipients` · `POST /recipients/:id/register` · `POST /orgs/:id/fund` · `POST /orgs/:id/run` · `GET /holders/:id/balance` · `POST /holders/:id/claim` · `POST /holders/:id/withdraw` · `GET /orgs/:id/audit` · `POST /audit/log` (internal) · `POST /proofs/figure` (Mode B generate) · `POST /proofs/verify` (Mode B verify).

### 4.3 UI
Three role views (Payer dashboard, Holder view, Auditor/Verifier console). Must show loading state during proof generation, empty states, and the C4 error ("recipient not registered") as a user-actionable message.

---

## 5. Non-Functional Requirements

- **NFR1 — Amount confidentiality:** No per-recipient amount is ever persisted on-chain in plaintext nor exposed via any public API to a non-owner/non-designated party. (Invariant; testable by inspecting chain + API outputs.)
- **NFR2 — Privacy boundary integrity:** Funding uses a single aggregate wrap (C5). A test must assert no per-recipient wrap occurs.
- **NFR3 — Disclosure correctness:** A Mode B proof must verify **iff** the disclosed `X` equals the true aggregate; a tampered `X` must fail verification. (Security-critical AC for Epic 3.)
- **NFR4 — Least-visibility for Mode A:** Auditor sees only designated accounts; attempting to read a non-designated account fails closed.
- **NFR5 — Auditability:** Audit-trail-of-audit entries are append-only and cannot be edited/deleted via the API.
- **NFR6 — Performance:** dlog table initialized once and cached; balance reads return < 2 s after cache warm. Proof generation time is measured and surfaced; target < 10 s per figure on reference hardware (informative — confirm in SPIKE-1).
- **NFR7 — Reliability under Devnet reset:** Full environment re-deployable + re-seedable via a single command in < 5 min (per FR20).
- **NFR8 — Security/keys (PoC):** Demo keypairs are stored server-side in a keystore/env and clearly marked non-production; no secret keys are sent to the browser except the holder's own for local decrypt.
- **NFR9 — Honesty of claims:** UI/marketing copy must not assert anonymity or "fully compliant"; language limited to "amount-confidential, selectively disclosable." (Reputational/compliance guardrail.)
- **NFR10 — Tech baseline:** Node 20+, TS strict; Move builds with pinned toolchain; SDK is open for inspection (supports the open-core trust requirement).

---

## 6. Data Model (logical; off-chain store)

```
Org        { id, onchainAnchorId, payerAddress, auditorPublicKey }
Recipient  { id, orgId, address, displayName, amount: bigint, registered: bool }   // amount: confidential, off-chain only
PaymentRun { id, orgId, runIndex, txDigest, recipientCount, at }
AuditLog   { id, auditorId, orgId, targetAccount, action, at }                      // append-only
Disclosure { id, holderId, includedRefs[], disclosedValue X, proof, createdAt }     // Mode B
```
On-chain holds: `aperture` anchor/registry + `PaymentRun` events; all balances/amounts live encrypted inside Contra. No plaintext amount on-chain (NFR1).

---

## 7. Epics & Stories (BMAD intake)

> Story format: *As a {role}, I want {capability}, so that {value}.* Each story lists numbered ACs. Sequenced so each epic ends demoable.

### EPIC 1 — Foundation & Confidential Payments Data Plane
*Goal: stand up the project, deploy Contra + `aperture` on Devnet, and produce real encrypted payment activity for later epics.*

**Story 1.1 — Project & deploy scaffolding**
As a developer, I want a monorepo (move / backend / frontend) with pinned Contra and a one-command deploy+seed, so that the environment is reproducible across Devnet resets.
- AC1: `pnpm deploy:devnet` deploys pinned Contra + `aperture` and writes config (package ids) consumable by backend/frontend.
- AC2: `pnpm seed` creates a demo org and ≥3 registered recipients.
- AC3: Full deploy+seed completes < 5 min on a fresh Devnet (NFR7).

**Story 1.2 — Org & recipient management**
As a Payer, I want to create an org and add recipients with amounts, so that I can prepare a payment run.
- AC1: Create org persists off-chain record + on-chain anchor (FR1).
- AC2: Add recipient stores amount **off-chain only**; a test asserts no plaintext amount on-chain/API (FR2, NFR1).
- AC3: Adding a 8th recipient is rejected with a clear message (C1).

**Story 1.3 — Register recipients**
As a Payer, I want to register each recipient's confidential account, so that they can receive funds.
- AC1: Registration creates `TokenAccount<T>` and publishes auditor key material + proof (FR3, FR9).
- AC2: Attempting a transfer to an unregistered recipient yields the C4 error surfaced as actionable UI text.

**Story 1.4 — Fund treasury (single aggregate wrap)**
As a Payer, I want to fund the treasury with one wrap, so that the public chain shows only a total, not per-recipient amounts.
- AC1: Funding performs exactly one aggregate wrap (FR4); test asserts no per-recipient wrap (NFR2).

**Story 1.5 — Run batch payment (≤7)**
As a Payer, I want to pay all recipients in one run, so that salaries/payouts settle atomically with hidden amounts.
- AC1: A run issues one `transferBatch` to all (≤7) recipients and records a `PaymentRun` event with count + timestamp, no amounts (FR5).
- AC2: Explorer link shows encrypted transfers (FR22).
- AC3: SPIKE-2 result (wrap+batch in one PTB or split) is reflected in the implementation.

**Story 1.6 — Holder balance & claim/withdraw**
As a Holder, I want to see, claim, and withdraw my funds, so that I can use what I received.
- AC1: Balance view shows decrypted active+pending using the cached dlog table (FR6, C2, NFR6).
- AC2: Claim merges pending→active and auto-retries with `merge:false` on the C3 race.
- AC3: Withdraw unwraps to a public coin (FR7). No crypto jargon (pending/merge/limbs) in Holder UI.

### EPIC 2 — Auditor Console (Mode A)
*Goal: a designated auditor can read and report on designated activity, with an audit trail of their own reads.*

**Story 2.1 — Auditor auth & scope**
As an Auditor, I want to authenticate and see only my designated orgs, so that I cannot read beyond my mandate.
- AC1: Auth with auditor key lists only designated orgs/tokens (FR10).
- AC2: Reading a non-designated account fails closed (NFR4).

**Story 2.2 — Recover & view**
As an Auditor, I want to decrypt a designated account's balances and history, so that I can verify activity.
- AC1: `recoverPrivateKey` recovers the viewing key; balances + transfer history render decrypted (FR11).

**Story 2.3 — Per-run report & export**
As an Auditor, I want a per-run report of recipients and amounts, exportable, so that I can hand evidence to accountants.
- AC1: Report lists recipients + decrypted amounts for a run; exports CSV/JSON (FR12).

**Story 2.4 — Audit-trail-of-audit**
As a compliance owner, I want every auditor read logged immutably, so that "who saw what" is itself accountable.
- AC1: Each read writes an append-only AuditLog entry (who/account/when/designation) (FR13).
- AC2: API offers no edit/delete for AuditLog (NFR5).
- AC3: Console shows the trail.

**Story 2.5 — Privacy posture panel**
As an Auditor/observer, I want a clear statement of what is public vs auditor-only, so that the tool does not over-claim.
- AC1: Panel enumerates public (sender/receiver/timing) vs encrypted (amount) and the basis of auditor access (FR14, NFR9).

### EPIC 3 — Proof-of-Figure (Mode B) — **GATED on SPIKE-1**
*Goal: a holder proves a disclosed figure about their encrypted activity to a verifier without revealing other rows or surrendering their key.*

**Story 3.0 — SPIKE-1 (research/enabler, do first)**
As a developer, I want to prove an aggregate (or single) encrypted amount equals X and verify it, so that we know Mode B is feasible before building UI.
- AC1: A script aggregates ≥2 encrypted amounts via `Ciphertext.add()`, builds an `ElGamalNizk`, and verifies it both off-chain (SDK) and on-chain (`nizk::verify_elgamal`).
- AC2: A tampered X fails verification (NFR3).
- AC3: Decision recorded: proceed with aggregate (FR16) or fall back to single-amount (FR18). Measured proof-gen time recorded (NFR6).

**Story 3.1 — Select entries & disclose value**
As a Holder, I want to pick which of my entries to include and state the figure, so that I control scope.
- AC1: Holder selects own entries; system computes the true aggregate locally (FR15).

**Story 3.2 — Generate proof**
As a Holder, I want a proof that my figure is correct, so that I can share it without my key.
- AC1: System produces the proof per the SPIKE-1 decision (FR16 or FR18); loading state shown (FR/EIF UI).

**Story 3.3 — Verify proof**
As a Verifier, I want to check a holder's proof, so that I trust the figure without seeing the rest.
- AC1: Verifier validates against holder public key + on-chain ciphertext, no secret key needed (FR17).
- AC2: Verification result (pass/fail) is unambiguous; tampered inputs fail (NFR3).

**Story 3.4 — Disclosure receipt (could)**
As a Holder, I want to export a proof artifact, so that an external party can verify offline.
- AC1: Export JSON disclosure receipt verifiable by the verifier endpoint (FR19).

### EPIC 4 — Demo polish & narrative (thin)
*Goal: the system tells the story in one demo pass.*
- **Story 4.1:** Role-switch UX + explorer deep-links (FR21, FR22).
- **Story 4.2:** Empty/error/loading states across all views; C4 message; proof-gen spinner.
- **Story 4.3:** Seed data + scripted demo path: fund → run → holder claim → auditor report → holder prove → verifier verify.

---

## 8. Risks & Spike Gates

### 8.1 Spike gates (must resolve before dependent stories)
- **SPIKE-1 (gates Epic 3):** aggregate ciphertext → `ElGamalNizk` → `verify_elgamal` round-trip + tamper test (Story 3.0). If it fails by the planned date, drop FR16/FR15 aggregate path, ship FR18 single-amount fallback, and reframe Mode B copy accordingly.
- **SPIKE-2 (gates Story 1.5/FR8):** can `wrap` + `transferBatch` (+ event) compose in one PTB without balance-update conflict? If not, split funding and payment into two txs (still satisfies FR5).

### 8.2 Other risks
- Contra breaking changes (C6) → pin commit; isolate SDK calls behind a backend adapter so an upgrade touches one layer.
- Browser proof-gen too slow (NFR6) → move proof generation server-side for the payer/holder where keys allow; keep only holder-local decrypt in browser.
- Devnet instability → all flows resumable from FR20 deploy+seed.

---

## 9. Out of Scope (this version) / Future
zkLogin auth; encrypted payslips on Walrus+Seal; recurring/scheduled runs; >7 recipient production chunking at scale; multi-issuer SaaS, billing, subscription/usage metering; production Travel-Rule VASP integration; mainnet deployment; mobile. Tracked as roadmap, not requirements.

---

## 10. Traceability (summary)
- Privacy invariants: NFR1, NFR2, NFR9 ← C5.
- Batch limit: C1 ← FR2 (cap), FR5, FR8, SPIKE-2.
- Decryption table: C2 ← FR6, NFR6.
- Pending/merge: C3 ← FR7 (Story 1.6 AC2).
- Register-before-receive: C4 ← FR3, Story 1.3 AC2.
- Mode B correctness: NFR3 ← Epic 3 (Story 3.0 AC2, 3.3 AC2).