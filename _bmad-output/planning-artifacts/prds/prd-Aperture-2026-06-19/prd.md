---
title: Aperture — Product Requirements Document
status: final
created: 2026-06-19
updated: 2026-06-19
---

# PRD: Aperture
*Confidential Compliance & Disclosure Layer on Sui — PoC/MVP scope.*

## 0. Document Purpose

This PRD is for the BMad downstream workflow owners (Architect, Scrum Master, Dev, QA) and project stakeholders building **Aperture** for **Sui Overflow 2026 (DeFi & Payments track)**. It is derived from the source SRS at `docs/Aperture srs.md` and preserves that document's requirement IDs for traceability — each FR carries its `(SRS FRn)` tag and each NFR its `(SRS NFRn)` tag. Vocabulary is anchored in the §3 Glossary; features are grouped with FRs nested and globally numbered; assumptions are tagged inline and indexed in §13. **Implementation detail — SDK method surface, REST API shapes, the off-chain data model, and proposed architecture — lives in `addendum.md`, not here**; this PRD states capabilities, the addendum states the how (input for the Architect). Aperture does not implement cryptography; all confidential money movement and proof primitives come from Contra (Mysten Labs `confidential-transfers`).

## 1. Vision

Confidential payments are arriving on every major chain — Solana, Circle's Arc, Aleo, and now Sui via Mysten's `confidential-transfers` ("Contra"). They hide *amounts* while keeping sender, receiver, and timing public. But "private by default" creates an immediate institutional problem: **how do you satisfy an auditor, an accountant, or a counterparty without throwing privacy away?** Today the answer is a blunt one — hand over a viewing key and expose everything.

**Aperture is the disclosure layer that sits beside confidential tokens on Sui.** It gives an organization two precise instruments instead of one blunt one. **Mode A (Auditor Console)** lets a *designated* auditor read *only* the activity they are entitled to — with every read itself logged in an immutable audit-trail-of-audit. **Mode B (Proof-of-Figure)** lets a token holder *prove a single figure* about their own encrypted activity — "these payouts sum to exactly $X" — to a verifier who confirms it against on-chain ciphertext **without the holder's secret key and without seeing any other row**.

Mode B is the wedge. Designated-auditor keys are becoming table-stakes (Solana, Circle, Zcash, Aleo all ship a variant). Holder-side, per-disclosure *proof over encrypted rows without surrendering the key* is the genuinely differentiated capability — it is "proof of reserves," but holder-controlled and scoped to one disclosure at a time. Aperture demonstrates the full loop end-to-end on Sui Devnet: real confidential payroll-style activity, an auditor reading it under permission, and a holder proving a figure to a verifier who never sees the rest.

## 2. Target User

### 2.1 Jobs To Be Done
- **As a Payer/Issuer**, I need to pay a set of recipients confidentially (so per-recipient amounts aren't public) while still being able to *designate* an auditor who can later verify the books.
- **As a Holder/Recipient**, I need to receive and use confidential funds, and occasionally *prove a fact* about them (e.g., income figure, total received) to a third party **without** revealing my full history or handing over my key.
- **As an Auditor/Verifier**, I need to read exactly the activity I'm authorized for (no more), produce an exportable report, and verify holder-submitted proofs — and I need my own access to be accountable.
- **As a hackathon judge / observer**, I need to see, in one demo pass, that amounts are genuinely encrypted on-chain and that disclosure is selective and honest (not over-claimed).

### 2.2 Non-Users (v1)
- Production enterprises needing mainnet, multi-issuer SaaS, billing, or production Travel-Rule/VASP integration (see §6, §11).
- End users expecting *anonymity* — Aperture hides amounts, **not** sender/receiver/timing. This is a deliberate, stated boundary, not a gap.

### 2.3 Key User Journeys

- **UJ-1. Priya the Payer runs confidential payroll.**
  - **Persona + context:** Priya runs ops at a small DAO-adjacent studio paying contractors; she wants payout amounts off the public chain but a clean audit path.
  - **Entry state:** Authenticated into the Payer dashboard via demo role-switch; treasury unfunded.
  - **Path:** Creates an org → adds ≤7 recipients with amounts (stored off-chain only) → registers each recipient's confidential account → funds the treasury with **one aggregate wrap** → executes a single batch payment run.
  - **Climax:** The run posts; the explorer deep-link shows transfers whose amounts are encrypted and a `PaymentRun` event carrying only a count + timestamp.
  - **Resolution:** Recipients hold confidential balances; an auditor has been designated; nothing per-recipient is public. **Edge case:** adding an 8th recipient is rejected with a clear message (batch limit).

- **UJ-2. Hassan the Holder proves a figure without his key.**
  - **Persona + context:** Hassan, a contractor, needs to show a lender that a **specific set** of his payouts (e.g., one client's invoices) totals exactly $X — without revealing the amounts of the individual entries or surrendering his key. *(Note: the proof attests that the **selected** entries sum to X; it does not assert that this is his total income — completeness is the holder's claim, not the proof's, see FR-15.)*
  - **Entry state:** Authenticated as Holder; has several confidential transfer entries.
  - **Path:** Opens the Holder view → selects the specific entries to include → the system computes the true aggregate locally and generates a proof that the aggregate equals the disclosed `X` → he exports a disclosure receipt.
  - **Climax:** A loading state resolves into a shareable proof artifact; measured proof-gen time is shown.
  - **Resolution:** Hassan hands the receipt to the verifier; his key and other rows never leave his control. **Edge case:** if Mode B's aggregate path failed its spike gate, he proves a *single* amount equals `X` instead (fallback), with copy reframed accordingly.

- **UJ-3. Aisha the Auditor reads only what she's designated.**
  - **Persona + context:** Aisha is an external auditor engaged for one org's books.
  - **Entry state:** Authenticates to the Auditor Console with her auditor key.
  - **Path:** Sees only the orgs/tokens she's designated for → recovers a designated account's viewing key → views decrypted balances + transfer history → generates a per-run report → exports CSV/JSON. Separately, she verifies Hassan's proof against his public key and the on-chain ciphertext.
  - **Climax:** The report renders decrypted amounts she's entitled to; a non-designated account fails closed when she probes it.
  - **Resolution:** Every read she made is recorded immutably in the audit-trail-of-audit, visible in the console; the verification returns an unambiguous pass/fail.

## 3. Glossary

- **Contra** — Sui confidential-transfers primitive (`MystenLabs/confidential-transfers`); provides all cryptography. Public beta on Devnet, unaudited.
- **Confidential domain** — state where amounts/balances are encrypted (Twisted ElGamal).
- **Wrap / Unwrap** — moving a public `Coin<T>` into / out of the confidential domain; the amount is **visible** at the crossing.
- **Mode A / Auditor Console** — the designated-auditor read path (`recoverPrivateKey`).
- **Mode B / Proof-of-Figure** — a holder-generated proof that an aggregate (or single) encrypted amount equals a disclosed value `X`, verifiable without the holder's secret key.
- **dlog table** — `DiscreteLogTable`, the precomputed table required to decrypt any balance/amount.
- **Payment Run** — (domain noun) one execution paying all recipients of an org. It emits the on-chain **`PaymentRun`** event (the code identifier) carrying recipient count + timestamp, **no amounts**. Use "Payment Run" in prose and `PaymentRun` only when referring to the on-chain event/identifier.
- **Designated auditor** — an auditor whose key material was published, at recipient registration, encrypted to that auditor; only such an auditor can read the account (Mode A).
- **Audit-trail-of-audit** — the append-only log of every auditor read (who / which account / when / under which designation).
- **Disclosure receipt** — a shareable artifact packaging a Mode B proof + minimal metadata for offline verification.
- **Roles** — **Payer/Issuer**, **Holder/Recipient**, **Auditor/Verifier** (see §2).
- **Pending vs active** — incoming confidential funds land *pending* and must be *merged* to *active* before spend.
- **SPIKE-1 / SPIKE-2** — gating research tasks (see §10) that must pass before their dependent requirements are built.

## 4. Features

> FR numbering matches the source SRS (FR-1 … FR-22) for stable downstream references. Priority: **M** = must (PoC pass), **S** = should, **C** = could. Mode B requirements tagged **M\*** are *must, conditional on SPIKE-1*.

### 4.1 Confidential Payments Data Plane *(supporting)*
**Description:** The data plane creates *real encrypted activity* for the rest of the system to act on. The Payer stands up an org, registers and pays recipients confidentially, and the Holder sees/claims/withdraws funds. It exists so Modes A and B operate on genuine on-chain ciphertext, not mocks. Realizes UJ-1, UJ-2. Honors hard Contra constraints (§8): batch ≤7, register-before-receive, single aggregate wrap, pending→active merge with retry.

**Functional Requirements:**

#### FR-1 (M): Create organization *(SRS FR1)*
A Payer can create an org/payer entity. **Consequences:** an on-chain anchor object and an off-chain record are both created (one-to-one). Realizes UJ-1.

#### FR-2 (M): Add recipients (capped) *(SRS FR2)*
A Payer can add recipients (address + display name + amount), capped at 7. **Consequences:** amount is stored **off-chain only**, never written on-chain in plaintext; an 8th recipient is rejected with a clear, user-actionable message. Realizes UJ-1.

#### FR-3 (M): Register recipient accounts *(SRS FR3)*
A Payer can register a recipient's confidential account before any payment. **Consequences:** the recipient's confidential token account is created and ready to receive; a transfer to an unregistered recipient fails with an actionable "recipient not registered" message. **Note:** account setup is two distinct steps — `newAccount` (once per address, all tokens) then `register` (once per token); the seed/register flow must do both (Architect — see addendum).

#### FR-4 (M): Fund treasury via single aggregate wrap *(SRS FR4)*
A Payer can fund the treasury by wrapping **one** aggregate public coin into the confidential domain. **Consequences:** exactly one aggregate wrap occurs; no per-recipient wrap ever occurs (privacy boundary, §8). Realizes UJ-1.

#### FR-5 (M): Execute batch payment run (≤7) *(SRS FR5)*
A Payer can execute a payment run issuing confidential transfers to all (≤7) recipients in one batch. **Consequences:** a `Payment Run` event is recorded with recipient count + timestamp and **no amounts**; the run is demoable end-to-end. Realizes UJ-1.

#### FR-6 (M): Holder balance view *(SRS FR6)*
A Holder can view their own decrypted balance. **Consequences:** decryption uses the cached dlog table **and the holder's secret key** (both are required, see C2); reads return < 2 s after cache warm (NFR-6). **Note:** the underlying balance has three buckets — active, pending, and pending-public (from wraps); the Holder view must present these meaningfully (without crypto jargon, per FR-7).

#### FR-7 (S): Holder claim & withdraw *(SRS FR7)*
A Holder can claim (merge pending→active) and withdraw (unwrap to a public coin). **Consequences:** claim auto-retries on the pending/active merge race; withdraw unwraps to a public coin; **no crypto jargon** (pending/merge/limbs) appears in the Holder UI. **Note:** a bounded number of unmerged deposits (~2¹⁶) can accumulate before new deposits are rejected until a merge — not a concern at demo scale, but claim should keep the holder merged.

#### FR-8 (S): Payment run > 7 recipients via chunking *(SRS FR8)*
A Payer can run payments for > 7 recipients by automatic chunking into multiple batches. **[NON-GOAL for MVP]** Deferred unless SPIKE-2 shows headroom (§10).

### 4.2 Mode A — Auditor Console
**Description:** A designated auditor reads and reports on *designated* activity, and their own reads are themselves accountable. At registration, each recipient's viewing-key material is encrypted to the designated auditor's key and published on-chain with a correctness proof. **Important honesty note:** this is Contra's Option-2 "per-account designated key" model — once designated, the auditor can decrypt **everything that account can see** (balances + full transfer history), not a per-row subset. Least-visibility (NFR-4) therefore holds *at the per-account designation boundary* — an auditor has keys only for accounts that encrypted to them, and a non-designated account has no recoverable key (fails closed) — but **within** a designated account, access is decrypt-everything. Mode A must not be marketed alone as "compliance"; it is the *read* half, paired with Mode B's *prove* half. Realizes UJ-3.

**Functional Requirements:**

#### FR-9 (M): Publish auditor key material at registration *(SRS FR9)*
At registration, the recipient's viewing-key material is encrypted to the designated auditor's key and published on-chain with the correctness proof. **Consequences:** designation is established on-chain at registration time, not retroactively.

#### FR-10 (M): Auditor auth & scope *(SRS FR10)*
An Auditor can authenticate with their auditor key and see only the orgs/tokens they are designated for. Realizes UJ-3.

#### FR-11 (M): Recover & view designated account *(SRS FR11)*
An Auditor can recover a designated account's viewing key and view that account's decrypted balances and transfer history. Realizes UJ-3.

#### FR-12 (M): Per-run report & export *(SRS FR12)*
An Auditor can produce a per-run report listing recipients and decrypted amounts for an org/payment-run, exportable as CSV/JSON. Realizes UJ-3.

#### FR-13 (M): Audit-trail-of-audit *(SRS FR13)*
Every auditor read action is recorded in an immutable audit-trail-of-audit (who / which account / when / under which designation), viewable in the console. **Consequences:** entries are append-only; the API exposes no edit or delete (see NFR-5).

#### FR-14 (S): Privacy posture panel *(SRS FR14)*
The console surfaces the privacy posture explicitly — what is public on-chain (sender/receiver/timing) vs. what required the auditor key (amount) — and the basis of auditor access, to avoid over-claiming (see NFR-9).

### 4.3 Mode B — Proof-of-Figure *(spike-gated — see §10)*
**Description:** A holder proves a disclosed figure about their encrypted activity to a verifier **without revealing other rows or surrendering their key**. This is Aperture's differentiated wedge. The capability is gated on **SPIKE-1**: if the aggregate proof path proves infeasible by the planned date, the single-amount fallback (FR-18) ships instead and the copy is reframed. Realizes UJ-2.

**Functional Requirements:**

#### FR-15 (M\*): Select entries & disclose value *(SRS FR15)*
A Holder can select a set of their own encrypted entries to include in a figure, and the system computes the true aggregate locally. **Consequences (scope honesty):** the resulting proof attests only that the **selected** ciphertexts sum to `X`. It makes **no claim of completeness** — the holder could omit entries, and because P2P transfers are always possible on Sui, the proof cannot assert "this is your total/net." The UI must define and display *which entries* are in scope and must not imply the figure is exhaustive. Realizes UJ-2.

#### FR-16 (M\*): Generate aggregate proof *(SRS FR16)*
The system aggregates the selected encrypted entries homomorphically and generates a proof that the aggregate encrypts the disclosed value `X` under the holder's public key. **Consequences:** a loading state is shown during generation; measured proof-gen time is surfaced.

#### FR-17 (M): Verify proof without secret key *(SRS FR17)*
A Verifier can verify the proof against the holder's public key and the on-chain ciphertext(s) **without** the holder's secret key, off-chain and/or on-chain. **Consequences:** the pass/fail result is unambiguous; a tampered `X` or tampered input fails verification (security-critical, NFR-3). **Note:** verification is required by *both* the aggregate path and the FR-18 single-amount fallback, so it is **not** droppable on a SPIKE-1 miss — only FR-15/FR-16 (the aggregate-specific steps) are. Realizes UJ-3.

#### FR-18 (S): Single-amount fallback *(SRS FR18)*
Prove a **single** encrypted amount equals `X` (lower complexity), used if the aggregate path (FR-16) does not pass SPIKE-1 in time.

#### FR-19 (C): Disclosure receipt *(SRS FR19)*
A Holder can package a proof + minimal metadata into a shareable JSON disclosure receipt for an external party to verify offline. Realizes UJ-2.

### 4.4 Platform & Demo Narrative
**Description:** The connective tissue that makes the system reproducible on a resetting Devnet and lets it tell its story in one demo pass.

#### FR-20 (M): One-command deploy + seed *(SRS FR20)*
A single command (re)deploys the pinned Contra + `aperture` packages and seeds a demo org with registered recipients on a fresh Devnet. **Consequences:** full deploy + seed completes < 5 min (NFR-7).

#### FR-21 (M): Demo role switching *(SRS FR21)*
The UI supports switching between Payer / Holder / Auditor-Verifier roles for demo purposes, without production-grade auth.

#### FR-22 (S): Explorer deep-links *(SRS FR22)*
Each on-chain tx has an explorer deep-link so a viewer can confirm amounts are encrypted. Realizes UJ-1.

**Demo path (must work in one pass):** fund → run → holder claim → auditor report → holder prove → verifier verify. Plus empty/error/loading states across all views (including the "recipient not registered" message and the proof-gen spinner).

## 5. Cross-Cutting NFRs

- **NFR-1 — Amount confidentiality *(invariant)* *(SRS NFR1)*:** No per-recipient amount is ever persisted on-chain in plaintext nor exposed via any public API to a non-owner/non-designated party. Testable by inspecting chain + API outputs.
- **NFR-2 — Privacy boundary integrity *(SRS NFR2)*:** Funding uses a single aggregate wrap; a test must assert no per-recipient wrap occurs.
- **NFR-3 — Disclosure correctness *(security-critical) *(SRS NFR3)*:** A Mode B proof verifies **iff** the disclosed `X` equals the true aggregate; a tampered `X` must fail.
- **NFR-4 — Least-visibility (Mode A) *(SRS NFR4)*:** An auditor sees only designated accounts; reading a non-designated account fails closed. *Scope boundary is per-account, not per-row: within a designated account the auditor decrypts everything (see §4.2).*
- **NFR-5 — Auditability *(SRS NFR5)*:** Audit-trail-of-audit entries are append-only. **PoC-testable claim:** the API exposes *no* edit or delete operation on AuditLog (assert by inspecting the API surface). **Deferred:** cryptographic tamper-evidence (hash-chain / on-chain anchor) is an Architect decision (§12.3, addendum §A.2) — do not claim cryptographic immutability until that mechanism is chosen.
- **NFR-6 — Performance *(SRS NFR6)*:** dlog table initialized once and cached; balance reads < 2 s after cache warm. Proof-gen time measured and surfaced; target < 10 s per figure on reference hardware (informative — confirm in SPIKE-1).
- **NFR-7 — Reliability under Devnet reset *(SRS NFR7)*:** Full environment re-deployable + re-seedable via a single command in < 5 min.
- **NFR-8 — Security/keys (PoC) *(SRS NFR8)*:** Demo keypairs stored server-side, clearly marked non-production; no secret keys sent to the browser except the holder's own for local decrypt.
- **NFR-9 — Honesty of claims *(guardrail) *(SRS NFR9)*:** UI/marketing copy must not assert "anonymity" or "fully compliant"; language limited to "amount-confidential, selectively disclosable."
- **NFR-10 — Tech baseline *(SRS NFR10)*:** Node 20+, TS strict; Move builds with pinned toolchain; SDK open for inspection (open-core trust).

## 6. Constraints & Guardrails

### 6.1 Hard constraints (inherited from Contra — non-negotiable)
- **C1 — Batch limit:** a single batch serves **≤ 7** recipients. (Drives FR-2 cap, FR-5, FR-8, SPIKE-2.)
- **C2 — Decryption needs the dlog table *and* a secret key:** any decryption requires both an initialized `DiscreteLogTable` and the relevant secret key (holder's own, or the auditor's recovered viewing key). (Drives FR-6, FR-11, NFR-6.)
- **C3 — Pending vs active:** incoming funds land pending and must be merged before spend; merge-then-spend can fail under concurrent deposit and must be retried. (Drives FR-7 / UJ retry.)
- **C4 — Register before receive:** a recipient must have a registered account before receiving. (Drives FR-3.)
- **C5 — Privacy boundary:** wrap/unwrap expose amount; only intra-domain transfers hide amount; sender/receiver/timing are always public. (Drives NFR-1, NFR-2, NFR-9.)
- **C6 — Beta/unaudited:** pin a Contra commit; deploy your own instance; do not rely on a shared deployment. *(Architect: isolate SDK calls behind a backend adapter so an upgrade touches one layer — see addendum.)*
- **C7 — Bounded aggregation:** ~2¹⁶ unmerged deposits can accumulate before new deposits are rejected until a merge occurs. (Drives FR-7; immaterial at demo scale but real.)

### 6.2 Honesty guardrail (reputational)
Aperture is **amount-confidential and selectively disclosable** — not anonymous, not "compliant." It *enables* disclosure; it does not *ensure* compliance. The privacy-posture panel (FR-14) and copy review (NFR-9) enforce this. Three specific claims to avoid:
- **Not anonymous.** Sender, receiver, token type, and timing remain public on-chain (C5). *(Upside: this also means no "tagging key" is needed for auditors to discover transactions — a problem Aztec-style systems must solve — see §11.)*
- **Mode A is not "compliance" on its own.** It is Contra's per-account designated-key ("god-key") model: decrypt-everything for designated accounts. Pair it with Mode B; never sell the read path alone as compliance.
- **Mode B proves a selected sum, not completeness.** A figure proof says "these chosen entries sum to X," not "this is the holder's total." Never imply exhaustiveness.

## 7. Non-Goals (Explicit)

- Not anonymity — Aperture hides amounts only (C5).
- Not a cryptography implementation — all primitives come from Contra.
- **Not discovery-without-readability** — Contra's graph is public, so there is nothing to "discover privately"; Aperture does not attempt selective *discovery*, only selective *readability*.
- **Not derived/computed disclosures** — Mode B proves "sum/single value = X against on-chain ciphertext." It does **not** prove statements derived from complex logic (e.g., tax basis, FIFO P&L, net income). Out of scope and not to be claimed.
- Not a shared/managed deployment — each instance deploys its own pinned Contra (C6).
- Not mainnet, multi-issuer SaaS, billing, or subscription/usage metering.
- Not production Travel-Rule / VASP integration.
- Not recurring/scheduled payment runs, zkLogin auth, encrypted payslips (Walrus+Seal), or mobile.

## 8. MVP Scope

### 8.1 In Scope
- Confidential-payments data plane sufficient to generate real encrypted activity (FR-1 … FR-7).
- Mode A Auditor Console with audit-trail-of-audit (FR-9 … FR-14).
- Mode B Proof-of-Figure, **subject to SPIKE-1** (FR-15 … FR-17, with FR-18 fallback).
- One-command deploy+seed, demo role-switching, explorer deep-links, full demo path (FR-20 … FR-22).

### 8.2 Out of Scope for MVP
- FR-8 (>7-recipient chunking) — deferred unless SPIKE-2 shows headroom.
- FR-19 (disclosure receipt) — "could," include only if time permits. `[NOTE FOR PM]` this is the most demo-friendly Mode B extension; revisit if Mode B lands early.
- Everything in §7 Non-Goals.

## 9. Success Metrics

**Primary**
- **SM-1 — Demo loop completes:** the scripted path (create org → register → fund → run → claim → audit report → prove → verify), exercised across all three roles via role-switch with explorer deep-links, runs end-to-end on a fresh Devnet in one pass. Validates FR-1, FR-3, FR-5, FR-9, FR-10, FR-11, FR-12, FR-16, FR-17, FR-20, FR-21, FR-22.
- **SM-2 — Privacy invariant holds:** automated test confirms no per-recipient plaintext amount on-chain or via public API, and exactly one aggregate wrap. Validates NFR-1, NFR-2.
- **SM-3 — Disclosure correctness:** a correct `X` verifies and a tampered `X` fails, demonstrably. Validates NFR-3, FR-17.

**Secondary**
- **SM-4 — Reproducibility:** deploy+seed completes < 5 min on a fresh Devnet. Validates NFR-7, FR-20.
- **SM-5 — Performance felt in demo:** balance reads < 2 s warm; proof-gen time measured and shown. Validates NFR-6.
- **SM-6 — Auditability is real:** every auditor read produces an AuditLog entry visible in the console; the API exposes no edit/delete; the privacy-posture panel renders. Validates FR-13, FR-14, NFR-5.

**Counter-metrics (do not optimize)**
- **SM-C1 — Don't trade honesty for polish:** number of claims in UI/copy asserting anonymity or "compliant" must be **zero**. Counterbalances any push to make SM-1's demo more impressive than the system honestly is (NFR-9).
- **SM-C2 — Don't widen auditor visibility for convenience:** zero reads of non-designated accounts succeed. Counterbalances making Mode A demos smoother by loosening scope (NFR-4).

## 10. Risks & Spike Gates

### 10.1 Spike gates (must resolve before dependent requirements)
- **SPIKE-1 *(gates Mode B / §4.3)*:** aggregate ciphertext → proof → verify round-trip + tamper test. The cryptography is *grounded* (reference confirms `Ciphertext.add` is homomorphic and `nizk::verify_elgamal` verifies on-chain — this is **lighter** than recursive-proof approaches, no FIFO/oracle/lot-tree needed). The **real unknowns** the spike must close are: (a) do `Ciphertext.add` outputs feed `ElGamalNizk` / `verify_elgamal` cleanly on the *pinned commit*; (b) **empirically prove NFR-3** — a tampered `X` actually fails (do not assume soundness, demonstrate it); (c) measure proof-gen time vs the NFR-6 target. Single-value proof (FR-18) is the easier floor and the safe fallback. **If the spike fails by the planned date:** drop the aggregate path (FR-15/FR-16), ship FR-18, reframe copy. **The SM and Dev must not schedule Mode B build stories before SPIKE-1 passes.**
- **SPIKE-2 *(gates FR-8 and shapes FR-5)*:** can wrap + batch (+ event) compose in one transaction without a balance-update conflict? **If not:** split funding and payment into two txs (still satisfies FR-5).

### 10.2 Other risks & mitigations
- **Contra breaking changes (C6):** pin a commit; isolate SDK calls behind a backend adapter so an upgrade touches one layer.
- **Browser proof-gen too slow (NFR-6):** move proof generation server-side where keys allow; keep only holder-local decrypt in the browser.
- **Devnet instability:** all flows resumable from the FR-20 deploy+seed.
- **Contra is unaudited beta; some protocol specifics (e.g., exact batch mechanics) are not fully verifiable from public docs** `[ASSUMPTION]` — the Architect should confirm against the pinned source before locking SPIKE designs.

## 11. Why Now

Confidential transfers landed on Sui via Mysten's `confidential-transfers` (public beta on Devnet), and the broader market — Solana Token-2022, Circle's Arc, Aleo×Circle USDCx — is converging on "private by default + selective disclosure." Designated-auditor keys are becoming commodity; the open question the whole space is circling is *holder-controlled, per-disclosure proof without key surrender*. Sui Overflow 2026 (DeFi & Payments) is the venue to demonstrate that wedge on Sui while the primitive is fresh and the design space is open.

Contra's design also removes a class of friction that competing privacy stacks carry: because the transaction graph (sender/receiver/timing) stays public, **auditors and verifiers can find the relevant ciphertexts directly — no "tagging key" or private-discovery layer is required** (the problem Aztec-style systems must engineer around). Aperture leans into exactly the seam Contra leaves open: selective *readability*, not selective *discovery*.

## 12. Open Questions

1. SPIKE-1 outcome: aggregate proof path vs. single-amount fallback — unknown until the spike runs. Blocks final Mode B scope.
2. SPIKE-2 outcome: one-PTB wrap+batch vs. split txs — the SDK *supports* composition syntactically; the open question is whether sequential balance updates conflict. Shapes FR-5.
3. **Audit-trail-of-audit tamper-evidence mechanism (NFR-5):** append-only DB only, on-chain anchor, or hash-chain? The references treat the trail as a key differentiator but are silent on *how* it is made tamper-evident. Architect to decide.
4. Reference hardware for the NFR-6 proof-gen target (< 10 s) — define before measuring; browser proof-gen may force server-side generation.
5. Aggregate ciphertext range/overflow handling in Mode B — silent in sources; Architect to confirm against pinned Contra.

## 13. Assumptions Index

*Most prior assumptions were resolved against the internal Contra / PrivPNL / Sui-mapping references on 2026-06-19 — see `.decision-log.md`.*

- ✅ **RESOLVED** — Batch limit ≤7 (`MAX_BATCH_RECIPIENTS=7`), Option-2 auditor model, Twisted ElGamal, pending/merge retry, register-before-receive, and the SDK surface are all **confirmed** by the Contra reference.
- ✅ **RESOLVED** — Mode B is **feasible**: `Ciphertext.add` (homomorphic) + `ElGamalNizk` + on-chain `nizk::verify_elgamal` are all confirmed primitives; SPIKE-1 now de-risks integration/soundness/timing, not existence.
- `[ASSUMPTION]` (open) §10.1 / §12.5 — Exact behavior on the *pinned commit* (one-PTB balance conflict, aggregate range/overflow, empirical tamper-soundness) still needs primary-source confirmation in the spikes.
- `[ASSUMPTION]` (open) §1 / §11 — Competitive framing (auditor keys are table-stakes; holder-side proof + no-tagging-key are the differentiators) is from a light landscape pass, not exhaustive market analysis.
