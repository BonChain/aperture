---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-06-20'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Aperture-2026-06-19/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Aperture-2026-06-19/addendum.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Aperture-2026-06-20/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Aperture-2026-06-20/EXPERIENCE.md
project_name: Aperture
user_name: Tenny
---

# Aperture - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Aperture, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories. Aperture is a confidential disclosure layer on Sui (PoC/MVP for Sui Overflow 2026): **Mode A** (designated Auditor Console) and **Mode B** (holder Proof-of-Figure), operating on real Contra confidential-transfer ciphertext. **Epic 3 (Mode B) is gated on SPIKE-1** — its build stories must not be scheduled until SPIKE-1 passes.

## Requirements Inventory

### Functional Requirements

> Priority: **M** = must (PoC pass), **S** = should, **C** = could. **M\*** = must, conditional on SPIKE-1. IDs preserve SRS numbering for traceability.

**Group 1 — Confidential Payments Data Plane** *(supporting; generates real on-chain ciphertext for Modes A & B)*

FR-1 (M): Create organization — A Payer creates an org/payer entity; an on-chain anchor object and a one-to-one off-chain record are both created. *(SRS FR1)*
FR-2 (M): Add recipients (capped at 7) — A Payer adds recipients (address + display name + amount); amount is stored off-chain only, never on-chain in plaintext; an 8th recipient is rejected with a clear, actionable message. *(SRS FR2)*
FR-3 (M): Register recipient accounts — A Payer registers a recipient's confidential account before any payment; two steps — `newAccount` (once per address) then `register` (once per token); a transfer to an unregistered recipient fails with an actionable "recipient not registered" message. *(SRS FR3)*
FR-4 (M): Fund treasury via single aggregate wrap — A Payer funds the treasury by wrapping exactly one aggregate public coin into the confidential domain; no per-recipient wrap ever occurs (privacy boundary). *(SRS FR4)*
FR-5 (M): Execute batch payment run (≤7) — A Payer issues confidential transfers to all (≤7) recipients in one batch; a `PaymentRun` event records recipient count + timestamp and no amounts. *(SRS FR5)*
FR-6 (M): Holder balance view — A Holder views their own decrypted balance (requires cached dlog table **and** holder secret key, C2); reads < 2 s after cache warm; the three buckets (active, pending, pending-public) are presented meaningfully without crypto jargon. *(SRS FR6)*
FR-7 (S): Holder claim & withdraw — A Holder claims (merge pending→active, auto-retry on race) and withdraws (unwrap to a public coin); no crypto jargon (pending/merge/limbs) in the Holder UI. *(SRS FR7)*
FR-8 (S): Payment run > 7 recipients via chunking — **[NON-GOAL for MVP]** deferred unless SPIKE-2 shows headroom. *(SRS FR8)*

**Group 2 — Mode A: Auditor Console** *(designated read + accountable reads)*

FR-9 (M): Publish auditor key material at registration — At registration, the recipient's viewing-key material is encrypted to the designated auditor's key and published on-chain with a correctness proof; designation established at registration time, not retroactively. *(SRS FR9)*
FR-10 (M): Auditor auth & scope — An Auditor authenticates with their auditor key and sees only the orgs/tokens they are designated for. *(SRS FR10)*
FR-11 (M): Recover & view designated account — An Auditor recovers a designated account's viewing key and views that account's decrypted balances and transfer history. *(SRS FR11)*
FR-12 (M): Per-run report & export — An Auditor produces a per-run report listing recipients and decrypted amounts for an org/payment-run, exportable as CSV/JSON. *(SRS FR12)*
FR-13 (M): Audit-trail-of-audit — Every auditor read is recorded in an immutable, append-only audit-trail-of-audit (who / which account / when / under which designation), viewable in the console; the API exposes no edit or delete. *(SRS FR13)*
FR-14 (S): Privacy posture panel — The console surfaces the privacy posture explicitly (what is public on-chain vs. what required the auditor key) and the basis of auditor access, to avoid over-claiming. *(SRS FR14)*

**Group 3 — Mode B: Proof-of-Figure** *(spike-gated — SPIKE-1; the differentiated wedge)*

FR-15 (M\*): Select entries & disclose value — A Holder selects a set of their own encrypted entries to include in a figure; the system computes the true aggregate locally; the proof attests only that the selected ciphertexts sum to `X` and makes no claim of completeness; the UI defines/displays which entries are in scope and must not imply exhaustiveness. *(SRS FR15)*
FR-16 (M\*): Generate aggregate proof — The system aggregates selected encrypted entries homomorphically and generates a proof that the aggregate encrypts the disclosed value `X` under the holder's public key; a loading state and measured proof-gen time are surfaced. *(SRS FR16)*
FR-17 (M): Verify proof without secret key — A Verifier verifies the proof against the holder's public key and the on-chain ciphertext(s) **without** the holder's secret key, off-chain and/or on-chain; pass/fail is unambiguous; a tampered `X` or input fails (security-critical, NFR-3). Required by both the aggregate path and the FR-18 fallback — **not** droppable on a SPIKE-1 miss. *(SRS FR17)*
FR-18 (S): Single-amount fallback — Prove a single encrypted amount equals `X` (lower complexity), used if the aggregate path (FR-16) does not pass SPIKE-1 in time. *(SRS FR18)*
FR-19 (C): Disclosure receipt — A Holder packages a proof + minimal metadata into a shareable JSON disclosure receipt for an external party to verify offline. *(SRS FR19)*

**Group 4 — Platform & Demo Narrative**

FR-20 (M): One-command deploy + seed — A single command (re)deploys the pinned Contra + `aperture` packages and seeds a demo org with registered recipients on a fresh Devnet; completes < 5 min. *(SRS FR20)*
FR-21 (M): Demo role switching — The UI switches between Payer / Holder / Auditor-Verifier roles for demo purposes, without production-grade auth. *(SRS FR21)*
FR-22 (S): Explorer deep-links — Each on-chain tx has a Sui explorer deep-link so a viewer can confirm amounts are encrypted. *(SRS FR22)*

**Demo path (must work in one pass):** create org → register → fund → run → holder claim → auditor report → holder prove → verifier verify — with empty/error/loading states across all views.

### NonFunctional Requirements

NFR-1 (invariant): Amount confidentiality — No per-recipient amount is ever persisted on-chain in plaintext nor exposed via any public API to a non-owner/non-designated party. Testable by inspecting chain + API outputs. *(SRS NFR1)*
NFR-2: Privacy boundary integrity — Funding uses a single aggregate wrap; a test must assert no per-recipient wrap occurs. *(SRS NFR2)*
NFR-3 (security-critical): Disclosure correctness — A Mode B proof verifies **iff** the disclosed `X` equals the true aggregate; a tampered `X` must fail. *(SRS NFR3)*
NFR-4: Least-visibility (Mode A) — An auditor sees only designated accounts; reading a non-designated account fails closed. Scope boundary is per-account, not per-row (within a designated account the auditor decrypts everything). *(SRS NFR4)*
NFR-5: Auditability — Audit-trail-of-audit entries are append-only; the API exposes no edit or delete operation on AuditLog. Cryptographic tamper-evidence mechanism = hash-chain (Architecture); cryptographic immutability not claimed beyond that. *(SRS NFR5)*
NFR-6: Performance — dlog table initialized once and cached; balance reads < 2 s after cache warm; proof-gen time measured and surfaced; target < 10 s per figure on reference hardware (informative — confirm in SPIKE-1). *(SRS NFR6)*
NFR-7: Reliability under Devnet reset — Full environment re-deployable + re-seedable via a single command in < 5 min. *(SRS NFR7)*
NFR-8: Security/keys (PoC) — Demo keypairs stored server-side, clearly marked non-production; no secret keys sent to the browser except the holder's own for local decrypt. *(Relaxed for Mode A server-side decrypt only, labeled — Architecture D1.)* *(SRS NFR8)*
NFR-9 (guardrail): Honesty of claims — UI/marketing copy must not assert "anonymity" or "fully compliant"; language limited to "amount-confidential, selectively disclosable." *(SRS NFR9)*
NFR-10: Tech baseline — Node 20+, TS strict; Move builds with pinned toolchain; SDK open for inspection (open-core trust). *(SRS NFR10)*

### Additional Requirements

> Technical/infrastructure requirements from the Architecture document and PRD addendum that shape epics and stories. These are not capabilities themselves but constrain how stories are built.

**Project initialization & build (Epic 1, Story 1.1 / FR-20):**
- AR-1: **Hybrid starter** — vendored pinned Contra as a read-only `git submodule` @ PINNED_COMMIT; the `web` app starts by copying `kaisho` whole (dlog worker + WASM + COOP/COEP + Vite worker config) then pruning wallet routes; `spike` and `utils` extracted. First commit tagged `upstream-baseline` for provenance (`git diff upstream-baseline..HEAD` = evidence of original work) + Forked/Modified/Built-new contribution ledger.
- AR-2: **First-green build gate** (narrow, before any feature work): preflight (rustc, wasm32 target, wasm-pack, node, pnpm) → submodule init + verify hash → build order `wasm → sdk → core → apps`; `prettier --check` + `prettier-plugin-move` both pass; spike smoke 100% green. Pin reflected in 3 places (submodule HEAD, `Move.toml rev`, `.npmrc`); CI asserts version skew via `vendor/contra/PINNED_VERSION`.
- AR-3: **Toolchain traps documented & guarded:** wasm re-pack on `file:` sdk dep; bulletproofs `wasmUrl` resolves at runtime (copy `pkg/*.wasm` to `public/`); dlog table transferred via transferable/SharedArrayBuffer (never postMessage whole); `Move.toml rev` == submodule hash; run `build:wasm` in WSL2/container on Windows.

**Spike gates (do FIRST, before dependent features):**
- AR-4: **SPIKE-1** (gates ALL Mode B build, Epic 3) — prove the `Ciphertext.add → ElGamalNizk → nizk::verify_elgamal` round-trip. **PASS requires ALL:** (1) off-chain SDK verify true for correct X; (2) on-chain `verify_elgamal` success for the same proof; (3) wrong X → false (both paths); (4) tampered ciphertext → false; (5) measured & recorded client-side proof-gen time, proof size, on-chain verify gas. **#1 blocker = Fiat-Shamir transcript byte-parity** (wasm prover vs Move verifier): write an interop vector test first. Idempotent on-chain `pretest` fixture: devnet env active, funded address, `aperture` Move package published + id captured to `scripts/.published-devnet.json`, dlog-table-needed question resolved. Owner + due date + timebox required. On miss → FR-18 single-amount (if it passes) or recorded clip + live Mode A.
- AR-5: **SPIKE-2** (shapes FR-5, gates FR-8) — can wrap + batch (+ event) compose in one PTB without a balance-update conflict? Fallback: split funding and payment into two txs (still satisfies FR-5). Low severity; runs in parallel with SPIKE-1.

**Core architectural decisions (cross-cutting):**
- AR-6: **D1 Split-Hybrid crypto execution** — Mode B proof-generation runs **client-side** (holder key never leaves the browser); Mode A auditor-decrypt runs **server-side** (labeled honest shortcut); verification runs both off-chain AND on-chain. Enforced via a `ProofAdapter` seam (`ClientProofAdapter` web / `ServerProofAdapter` api, HTTP wrapped inside) with a contract test running both impls against the same `nizk::verify_elgamal`.
- AR-7: **D2 Off-chain store = SQLite** (better-sqlite3); re-seed = delete file (NFR-7); tables per addendum §C (`Org`, `Recipient`, `PaymentRun`, `AuditLog`, `Disclosure`); amounts stored as MIST integer strings in `TEXT` columns; Zod validation at API boundary; no migrations (seed creates schema).
- AR-8: **D3 Key provenance** — session key derived deterministically (HKDF) from a wallet signature; per-request re-derive on the server path, never persisted; client path caches the Mode B session key in browser memory only. `SessionKey` is a branded type whose serialization throws (never logged/serialized/persisted/in query keys).
- AR-9: **Contra SDK adapter (C6)** — one module isolating all `@mysten/*` calls; `adapterVersion.test.ts` asserts the pinned SDK version; case-boundary normalization (snake↔camel) inside the adapter via explicit manual mappers (a wrong key silently becomes `undefined`).
- AR-10: **Audit-trail hash-chain (NFR-5 mechanism)** — `entry_hash = SHA256(prev_hash || ":" || JCS(payload))` (RFC 8785, not raw JSON.stringify); `seq` inside hashed payload; `UNIQUE INDEX(seq)`; genesis = local deterministic seed `H(config)` (no Sui dependency to write audit); `onchainAnchor` optional per-entry attestation (backfillable); periodic `(seq, entry_hash, count)` checkpoint outside SQLite for truncate-tail. Claim = tamper-EVIDENT, not tamper-proof.
- AR-11: **Mode B range bound-and-reject** — each plaintext limb must stay < 2¹⁶ to remain decryptable via the 16-bit dlog table (a limb-0 carry yields an UNDECRYPTABLE sum, not a wrap; C1 batch≤7 does NOT bound this). Bound-and-reject at selection time; do NOT hand-roll a range proof; prove the bound empirically in SPIKE-1.
- AR-12: **Idempotency / demo robustness** — deterministic `idem_key` per op in `op_ledger(idem_key UNIQUE, status, tx_digest, result)`; check-before-send + Move-side guard + write-pending→submit→write-done; **ElGamal encryption randomness derived deterministically** `r = H(domain_sep_tag || sessionKey || input_commitment)` so re-run yields identical ciphertext; test: run-twice → `chain.txCount === 1`. C3 race: detect `TryTransferFailedEvent`/`TryUnwrapFailedEvent` (no abort) → retry with same idem_key, `merge:false`.

**Structure / contract boundaries:**
- AR-13: **Statement serialization authority** — `move/statement.move` is the BCS canonical schema authority; `core/crypto/statementCodec.ts` reproduces bytes exactly; golden vectors generated by `move/tests` are committed and cross-checked in CI.
- AR-14: **Dependency direction = trust boundary** — `packages/core` (types + isomorphic crypto + ProofAdapter interface) NEVER imports from `apps/*`; both apps import `core`. Move package independent (`aperture.move`, `events.move` (PaymentRun), `statement.move`, `verifier.move`).
- AR-15: **Enforcement set** — zod at external boundaries; 2 lint zones (ban `node:*` in `core`+`apps/web`; adapter isolation for `@mysten/*` + `core/crypto`); 3 KAT/round-trip tests (amount, hex, mapper hard-case); hash-chain happy + tamper tests; **NFR-1/2 invariant test in CI** (no plaintext on-chain/API + exactly one aggregate wrap). Branded types (`MistAmount`, `HexBytes`, `SuiId`, `Ciphertext`, `Plaintext`, `ProofBlob`, `SessionKey`) for every value crossing the D1 boundary.

**REST API surface (addendum §B.2 — Architect may revise shape):**
- AR-16: `POST /orgs` · `POST /orgs/:id/recipients` · `POST /recipients/:id/register` · `POST /orgs/:id/fund` · `POST /orgs/:id/run` · `GET /holders/:id/balance` · `POST /holders/:id/claim` · `POST /holders/:id/withdraw` · `GET /orgs/:id/audit` · `POST /audit/log` (internal) · `POST /proofs/figure` (Mode B generate) · `POST /proofs/verify` (Mode B verify). Errors: `{error:{code,message}}` → meaningful HTTP status; lists = bare arrays (no pagination).

### UX Design Requirements

> First-class actionable UX work items from DESIGN.md (visual identity) and EXPERIENCE.md (behavior). Each is specific enough to generate a story with testable acceptance criteria. The Aperture token set reskins the inherited `kaisho` base; where tokens conflict, Aperture wins.

**Design system / foundations:**
- UX-DR1: **Aperture token set (dark-default)** — implement/consolidate the full token system reskinning kaisho: surface ramp (`base/raised/overlay/sunken`), ink ramp, hairline/strong borders, trust-blue `primary` + `ring`, semantic `verified`/`failed`/`notice`, the **trust-boundary pair** `cipher-masked`/`cipher-reveal`, and three role accents (Payer amber / Holder aqua / Auditor violet) each with `-foreground` + `-muted`. No fourth role hue; amber only inside the Payer lens; green/red never decorative.
- UX-DR2: **Typography system** — Inter for all UI (`display`/`heading`/`body`/`label`/`caption`); **IBM Plex Mono** for ALL data (amounts, addresses, object ids, tx digests, ciphertext/hex, hashes, timestamps) with **tabular figures** so audit columns align. `data` 13px in tables; `data-lg` 22px for the prominent balance figure.
- UX-DR3: **Spacing / radius / elevation system** — 4-based scale + named tokens (`gutter`, `page-margin`, `row-y`); **tonal elevation** (surface ramp carries rank, no drop-shadow-as-hierarchy; true shadows only on floating dialogs/popovers with a `border-strong` edge); instrument corners (`sm/md/lg`, `full` reserved for role badges + status dots). No gradients/glow/neon.

**Signature & reusable components:**
- UX-DR4: **Role banner** — full-width strip per lens; active role `-muted` wash + accent left-border; states the lens ("Auditor lens — designated read only"); changes first on role switch (primary orientation cue).
- UX-DR5: **Cipher cell** (the signature primitive) — masked `••••••••` (`cipher-masked`, fixed width, no reflow) vs revealed (real figure in `ink-primary` mono + `cipher-reveal` aqua left-bar/unlock marker). Reveal is an **authorization state**, never a hover trick; never animated as decoration. The same ciphertext masked in one lens and revealed in another is the product's core truth.
- UX-DR6: **Button variants** — `button-primary` (trust-blue, system actions: Sign/Verify/Export) and `button-role` (active role accent, in-lens hero CTA: "Execute payment run", "Generate proof"); secondary/ghost inherit neutral `border-strong`/`ink-secondary`. No pill buttons.
- UX-DR7: **Status badge** — `badge-verified` (emerald) / `badge-failed` (rose), `rounded-full`, text + dot, one verdict per badge; for proof results, registration status, run outcomes.
- UX-DR8: **Notice / disclaimer block** — bordered `surface-overlay`, neutral `notice` slate text, info glyph (never a warning triangle / never red); carries the scoped-claim disclaimer and privacy-posture notes.
- UX-DR9: **Data table** — `surface-sunken` body, uppercase `ink-secondary` `label` headers, `border-hairline` dividers, dense `row-y` padding, monospace `data` cells with tabular figures, sortable columns + sticky header (Auditor console workhorse).
- UX-DR10: **Audit-log row** — append-only, read-only; faint `chain-marker` glyph linking each entry to the previous (visual analog of the SHA-256 hash chain); **no edit/delete affordance ever renders**.
- UX-DR11: **Disclosure-receipt card** — holder public key, disclosed value `X` (`data-lg`), included-entry **count only** (never *which* entries), truncated proof blob in a `surface-sunken` well, and a `badge-verified`/`badge-failed` result slot for the verifier; JSON export.

**Role-flow surfaces & behavior:**
- UX-DR12: **Role switcher** — persistent left-rail header; click a role → pre-sign explainer ("Entering as {Role} — derive your key from a one-time signature. Nothing is stored or spent.") → lazy wallet signature → re-lens (banner, nav, accent); wallet-switch mid-demo blocked with a clear notice; key-dependent actions disabled with "Sign to unlock →" until signed (never a crash/white-screen).
- UX-DR13: **Balance panel (Holder)** — one prominent **Available** figure (`data-lg`) + an **Arriving** line; "Claim" merges arriving→available (transparent auto-retry, "Finishing up…"); "Withdraw" warns once that the amount becomes visible on-chain at the crossing; **no bucket math / no crypto jargon** (FR-7).
- UX-DR14: **Entry-selection checklist (Mode B)** — "X of N entries selected" + live running selected-sum total (`data-lg`); **bound-and-reject at selection time** if the aggregate would exceed the decryptable range (limb-0 < 2¹⁶) — offending entry can't be added, with explanation.
- UX-DR15: **Proof generator (Mode B)** — "Generate proof" runs client-side; spinner with **measured elapsed time** ("Generating proof… 2.4s", target < 10 s); on success → disclosure-receipt card; copy states the key never leaves the browser.
- UX-DR16: **Designated-scope list (Auditor)** — lists only designated orgs/accounts; non-designated entities are **absent, not greyed** (least-visibility, NFR-4); selecting an account recovers its viewing key (server-side) and opens Account Detail.
- UX-DR17: **Per-run report (Auditor)** — decrypted recipient×amount table for a run; Export CSV / JSON; generating a report writes an audit-log entry.
- UX-DR18: **Privacy-posture panel (Auditor)** — two columns: "Public on-chain" (sender, receiver, token, timing) vs "Requires auditor key" (amounts); pure read; frames the auditor's legal basis.

**Cross-cutting UX:**
- UX-DR19: **Microcopy / voice rules** — Holder register has **no crypto jargon** (FR-7: "Available", "Arriving — claim to use", not "pending balance/merge limbs/unwrap"); Auditor register is technical/compliance; honesty everywhere ("amount-confidential, selectively disclosable", never "anonymous"/"fully compliant", NFR-9); scoped-claim disclaimer verbatim ("Proves a selected sum — not total income, nor which entries were included"); errors are actionable (name the recipient + the fix); signature explainer copy.
- UX-DR20: **Complete state coverage** — every async action has `idle|loading|success|error`; specific states implemented: no-session-key (disabled + "Sign to unlock →"), balance decrypting ("Reading your balance…"), empty recipients, 8th-recipient inline reject (C1), unregistered-at-run block (C4), run executing, claim-race transparent auto-retry, withdraw-crossing one-time confirm, proof generating timer, proof done/failed (unambiguous), aggregate out-of-range, Mode B unavailable (SPIKE-1 fallback/coming-soon), non-designated fails-closed, empty audit trail. Never a white screen.
- UX-DR21: **Accessibility floor (WCAG 2.2 AA)** — trust boundary conveyed **beyond color** (masked `••••` glyph; revealed unlock marker + figure) so a colorblind auditor distinguishes sealed from revealed; verdicts carry text + icon (never color alone); tab order = reading order; tables keyboard-navigable; `Esc` closes the topmost dialog; `aria-live` announces proof-gen and balance-decrypt progress; focus ring = `ring`, AA against `surface-base`.
- UX-DR22: **Console IA & layout** — persistent role-scoped left rail + role-switcher; modal depth max 1 (no dialog-over-dialog); explorer deep-link on every on-chain row (FR-22); desktop-first ≥ 1024px, no mobile (tables scroll horizontally below, never reflow).
- UX-DR23: **Demo front door** — the app **opens on the Mode B Holder flow** (a verifier requesting proof that a holder's selected total = X), not a wallet wall; pairs Mode A (decrypt-with-authority) and Mode B (verify-without-decrypt) as the compliance narrative.
- UX-DR24: **Interaction bans (enforced everywhere)** — no hover-to-reveal confidential amounts; no edit/delete on the audit trail; no modal stacks > 1; never surface *which* entries a proof included (verifier learns sum + count only); never show the session key in any UI/error/URL; no decorative masked→revealed animation.

### FR Coverage Map

> Every FR maps to at least one epic. FR-17, FR-20, and FR-21 deliberately span epics (verify primitive vs. experience; init/seed vs. scripted path; role-switcher shell vs. behavior vs. polish) — split by altitude per the party-mode review.

- FR-1: Epic 1 — Create organization
- FR-2: Epic 1 — Add recipients (≤7)
- FR-3: Epic 1 — Register recipient accounts
- FR-4: Epic 1 — Fund treasury via single aggregate wrap
- FR-5: Epic 1 — Execute batch payment run (≤7) *(shaped by SPIKE-2)*
- FR-6: Epic 1 — Holder balance view
- FR-7: Epic 1 — Holder claim & withdraw *(PRD "should", but **demo-critical** — it sits on the SM-1 loop; treat as must for the demo)*
- FR-8: **Deferred non-goal** — >7-recipient chunking (SPIKE-2 dependent)
- FR-9: Epic 2 — Publish auditor key material at registration
- FR-10: Epic 2 — Auditor auth & scope
- FR-11: Epic 2 — Recover & view designated account
- FR-12: Epic 2 — Per-run report & export
- FR-13: Epic 2 — Audit-trail-of-audit
- FR-14: Epic 2 — Privacy posture panel
- FR-15: Epic 3 — Select entries & disclose value
- FR-16: Epic 3 — Generate aggregate proof
- FR-17: **Epic 1** (verify primitive + ProofAdapter verify-seam, proven by SPIKE-1) **+ Epic 3** (verify experience) — Verify proof without secret key
- FR-18: Epic 3 — Single-amount fallback
- FR-19: Epic 3 — Disclosure receipt (could) *(**PARKED below the demo line** — not on the judged-demo critical path; build only if Mode B lands early)*
- FR-20: **Epic 1** (FR-20a: init/seed + on-chain fixture) **+ Epic 4** (FR-20b: scripted demo path + recorded backup) — One-command deploy + seed
- FR-21: **Epic 1** (role-switcher shell + theme tokens) **+ Epic 3** (lazy-sign re-lens behavior) **+ Epic 4** (full cross-role switch polish) — Demo role switching
- FR-22: Epic 4 — Explorer deep-links

## Epic List

### Epic 1: Foundation, Confidential Data Plane & Mode B Feasibility
The project stands up reproducibly; the UI spine (theme-token contract + `<CipherCell>` + role-switcher shell + shared state primitives) exists so all three lenses share one visual contract and cannot drift; **Mode B feasibility is settled via SPIKE-1 (go/no-go) before downstream budget is spent**; and a Payer can run confidential payroll while a Holder sees/claims funds in plain language — producing the real on-chain ciphertext that Modes A & B operate on.

**Ordered story spine (story detail in Step 3):**
- **1.0 — UI Contract & Signature Cell** *(fixture-only; sequenced before crypto work)*: theme-token contract (amber/aqua/violet), `<CipherCell>` state machine (masked/revealing/revealed/error), role-switcher **shell** + "open on Mode B" front door, shared state primitives (skeleton/error/empty). No `apps/web` feature wired to real data here. *(UX-DR1–5, 8–11; FR-21 shell only)*
- **1.1a** — vendor+pin Contra submodule + build `wasm` + `core/crypto`; narrow first-green (sdk excluded). *(AR-1/2/3)*
- **1.1b** — Move build/test wiring + off-chain spike harness + **verify primitive & ProofAdapter verify-seam (off-chain)**. *(AR-6/13/14; FR-17 primitive)*
- **1.1c** — on-chain fixture: devnet env active + funded address + publish Move `aperture` package + capture package-id to `scripts/.published-devnet.json` + resolve dlog-table question + on-chain verify seam (PTB calls `aperture::verifier::verify_aggregate`). *(FR-20a init/seed; AR-4 prereqs)*
- **1.2 — SPIKE-1 go/no-go** *(gates Epic 3; DECISION-BY before Epic 2 closes)* + **SPIKE-2** (one-PTB wrap+batch) shaping FR-5. *(AR-4/5/11; NFR-3/6 measured here)*
- **1.3–1.7** — data plane features: create org + add recipients (FR-1/2), register accounts (FR-3), fund via single aggregate wrap (FR-4), execute batch run (FR-5), Holder balance + claim/withdraw (FR-6/7).

**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-20a, FR-17 *(verify primitive/seam)*, FR-21 *(shell only)*. FR-8 deferred non-goal.
**Cross-cutting realized:** SQLite store (AR-7), SDK adapter + version assert (AR-9), idempotency + deterministic ElGamal randomness (AR-12), NFR-1/2 invariant test (AR-15), dependency-direction trust boundary (AR-14).

### Epic 2: Auditor Console (Mode A)
A designated Auditor authenticates, sees only the accounts they are designated for, recovers viewing keys to read decrypted balances + transfer history, produces and exports per-run reports — and every read is permanently recorded in an append-only audit-trail-of-audit. Consumes Epic 1's `<CipherCell>` (revealed state) and state primitives; owns its own empty/error/loading content. By the end of this epic the demo loop is green on Mode A — the safe-cut narrative if Mode B slips.

**FRs covered:** FR-9, FR-10, FR-11, FR-12, FR-13, FR-14
**Cross-cutting realized:** server-side decrypt via `ServerProofAdapter` (AR-6), hash-chain audit trail (AR-10), least-visibility fails-closed (NFR-4), honesty guardrail copy (NFR-9 / UX-DR8/19).

### Epic 3: Proof-of-Figure (Mode B) — ⚠️ GATED on SPIKE-1 (Story 1.2)
> **Gate preamble:** Epic 3 (FR-15…FR-17 aggregate path) opens **only if Story 1.2 returned GO**. On NO-GO, Epic 3 does not open as designed; Mode B descopes to **FR-18** (single-amount proof) if it passed SPIKE-1, else to a recorded clip + live Mode A. FR-17 (verify experience) is required by both the aggregate and single-amount paths and is **not** droppable. DECISION-BY: before Epic 2 close.

A Holder selects a subset of their own encrypted entries and proves the selected sum equals `X` **without surrendering their key**; a Verifier confirms it against the holder's public key and on-chain ciphertext, off-chain and on-chain. Rests on Epic 1's verify seam; owns the FR-21 lazy-sign re-lens behavior (first demoed here) and its own empty/error/loading states.

**FRs covered:** FR-15, FR-16, FR-17 *(verify experience)*, FR-18, FR-19
**Cross-cutting realized:** client-side gen via `ClientProofAdapter`, key never leaves browser (AR-6 / NFR-8); range bound-and-reject (AR-11); statement-codec golden vectors (AR-13); scoped-claim disclaimer (NFR-9 / UX-DR8/19/24).

### Epic 4: Demo Narrative & Polish
The whole loop demos in one pass across all three lenses, with a recorded backup that cannot fail. Shrunk to honest polish because the cross-role spine was already declared in Epic 1.

**FRs covered:** FR-20b *(scripted demo path)*, FR-22 *(explorer deep-links)*, FR-21 *(full cross-role switch polish)*
**Cross-cutting realized:** global WCAG 2.2 AA sweep (UX-DR21), explorer deep-link audit (UX-DR22), complete state-coverage audit across lenses (UX-DR20), **pre-written Mode-A-only fallback demo script + recorded backup** (continuity insurance), demo opens on Mode B (UX-DR23).

## Ownership & Work Split

Two-person team. **Tenny** — PM (owns this doc + prioritization) + **frontend** (`apps/web`, lenses, components, UX) + **presentation** (demo, recorded backup). **JJ** — **backend** (`apps/api`, services, SQLite, adapters) + **smart contract** (`move/`) + **crypto/build** (`packages/core/crypto`, `wasm`, `sdk`, `spike`, `utils`). Full-stack stories list **Lead** first, then the collaborator's slice.

| Story | Owner(s) | Split |
|---|---|---|
| 1.0 UI Contract & Signature Cell | **Tenny** | Tokens, atoms, CipherCell, shell, state primitives — fixture-only |
| 1.1a Vendored Baseline & First-Green | **JJ** | vendor/pin, wasm, core/crypto, version assert · Tenny: prune kaisho web base |
| 1.1b Move Build + Off-Chain Spike + Verify Seam | **JJ** | move, spike harness, verify seam, golden vectors |
| 1.1c On-Chain Fixture & Verify Seam (devnet) | **JJ** | devnet env, pretest faucet, publish Move pkg, capture packageId, on-chain verify |
| 1.2a SPIKE-1 Go/No-Go | **JJ** | aggregate proof round-trip, on/off-chain, measurements |
| 1.2b SPIKE-2 One-PTB Wrap+Batch | **JJ** | PTB composition decision |
| 1.3 Create Organization | **JJ** + Tenny | JJ: on-chain anchor + `POST /orgs` + store · Tenny: Payer create form |
| 1.4 Add Recipients with Cap | **JJ** + Tenny | JJ: recipients API + store + cap rule · Tenny: recipient editor + 8th-reject UX |
| 1.5 Register & Designate Auditor | **JJ** + Tenny | JJ: `newAccount`/`register` + FR-9 publish · Tenny: registration UI + badges |
| 1.6 Fund via Single Aggregate Wrap | **JJ** + Tenny | JJ: wrap + NFR-1/2 invariant tests · Tenny: fund UI + crossing copy |
| 1.7 Execute Batch Payment Run | **JJ** + Tenny | JJ: PTB/`transferBatch` + `PaymentRun` event + retry · Tenny: run UI + states |
| 1.8 Holder Balance View | **Tenny** + JJ | Tenny: balance panel + client dlog decrypt (worker) · JJ: `getBalance` adapter |
| 1.9 Holder Claim & Withdraw | **JJ** + Tenny | JJ: claim/unwrap + race retry · Tenny: claim/withdraw UI + confirm |
| 2.1 Auditor Auth & Designated Scope | **JJ** + Tenny | JJ: scope API + fail-closed · Tenny: scope list + lazy-sign UX |
| 2.2 Audit-Trail Infra & Viewer | **JJ** + Tenny | JJ: hash-chain + append-only API · Tenny: read-only viewer |
| 2.3 Recover & View Designated Account | **JJ** + Tenny | JJ: server `recoverPrivateKey` + ServerProofAdapter · Tenny: account table + reveal |
| 2.4 Per-Run Report & Export | **JJ** + Tenny | JJ: decrypt + CSV/JSON export · Tenny: report table UI |
| 2.5 Privacy Posture Panel | **Tenny** | Static read panel (frontend) |
| 3.1 Select Entries & Disclose Value | **Tenny** + JJ | Tenny: selection checklist + live total · JJ: bound-and-reject in core/crypto |
| 3.2 Generate Aggregate Proof | **JJ** + Tenny | JJ: ClientProofAdapter + core/crypto gen · Tenny: proof-generator UI + timer |
| 3.3 Verify Proof Without Secret Key | **JJ** + Tenny | JJ: verify seam off+on-chain · Tenny: verify UI + verdict |
| 3.4 Single-Amount Fallback | **JJ** + Tenny | JJ: single-amount crypto path · Tenny: reframed copy/UI |
| 3.5 Disclosure Receipt *(parked)* | **Tenny** + JJ | Tenny: export UI · JJ: receipt schema/validation |
| 4.1 Full Cross-Role Switch & Lens Polish | **Tenny** | Frontend |
| 4.2 Explorer Deep-Links | **Tenny** + JJ | Tenny: deep-link UI · JJ: NFR-1 explorer-payload check |
| 4.3 Global State & Accessibility Sweep | **Tenny** | Frontend + copy gate |
| 4.4 Verifier Proof Request (Demo Opening) | **Tenny** | Frontend + demo narrative |
| 4.5 One-Command Demo Path & Recorded Backup | **JJ** + Tenny | JJ: deploy/seed scripts (`utils`) · Tenny: presentation + recorded backup |

> **Load balance:** JJ leads the foundation sub-phase (1.1a–1.2b) — the critical-path crypto/contract spike — while Tenny builds Story 1.0 (the UI spine) in parallel, since 1.0 is fixture-only and has no backend dependency. From Epic 1's data plane onward, most stories pair a JJ backend/contract lead with a Tenny frontend slice. Epic 4 is Tenny-heavy (presentation), with JJ on the deploy/seed scripts.

## Epic 1: Foundation, Confidential Data Plane & Mode B Feasibility

The project stands up reproducibly; the shared UI spine (theme-token contract + `<CipherCell>` + role-switcher shell + state primitives) exists so all three lenses share one visual contract and cannot drift; **Mode B feasibility is settled via SPIKE-1 (go/no-go) before downstream budget is spent**; and a Payer can run confidential payroll while a Holder sees/claims funds in plain language — producing the real on-chain ciphertext that Modes A & B operate on.

> **Shared root + fork.** A one-time repo scaffold — `pnpm` workspace + vendored pinned Contra submodule + copy-then-pruned kaisho web base — is the predecessor of **both** Story 1.0 and Story 1.1a. From that root the work forks: **Tenny → Story 1.0** (UI spine, fixture-only, consumes the pruned web base) runs in parallel with **JJ → 1.1a → 1.1b → 1.1c → 1.2a** (crypto/contract spine). Neither 1.0 nor 1.1a depends on the other's output — no forward dependency.
>
> **Then strictly sequential:** 1.1a → 1.1b → 1.1c → 1.2a (SPIKE-1 gate). 1.2b (SPIKE-2) needs only the 1.1b harness. Data-plane features (1.3 → 1.9) build on `apps/api` + `sdk`, which the architecture builds **after SPIKE-1 (1.2a) is green** — so they correctly follow the spike. **FR-9's on-chain publish executes at registration (Story 1.5)** — Contra's Option-2 model couples `register` with auditor designation; the auditor's *use* of it is Epic 2.

### Story 1.0: UI Contract & Signature Cell *(fixture-only)*

As a developer building three role lenses,
I want a shared UI contract — design tokens, atomic components, the `<CipherCell>` component, a role-switcher shell, and state primitives — established against fixtures before any lens is built,
So that all three lenses share one visual identity and the signature masked↔revealed cell can never drift.

> **Component ownership (per UX review):** 1.0 builds the design system + atomic components for real, and **stub-frames** for `data-table` (DR9), `audit-log-row` (DR10), and `disclosure-receipt-card` (DR11) — their data binding lands in their feature stories (2.3, 2.4, 3.5). DR19 microcopy is authored per-flow against a single voice contract recorded in EXPERIENCE.md (registers + banned-word lists per lens).

**Acceptance Criteria:**

**Given** the copy-then-pruned kaisho web base, **When** the design-token layer is built, **Then** the **typography scale** (DR2), the **spacing + tonal-elevation scale** (DR3), the surface/ink/semantic tokens, the `cipher-masked`/`cipher-reveal` pair, and amber/aqua/violet role tokens exist as named CSS variables + a typed token map, **And** no hex literals appear in components (Aperture tokens override kaisho on conflict). *(UX-DR1/2/3)*

**Given** the atomic-component kit, **When** built, **Then** `role-banner` (DR4), `button-primary` + `button-role` (DR6), `status-badge` verified/failed (DR7), and `notice-disclaimer` (DR8) render against fixtures and read all visual values from tokens. *(UX-DR4/6/7/8)*

**Given** a fixture ciphertext value, **When** `<CipherCell>` renders, **Then** it shows masked `••••` (fixed width, `cipher-masked`) by default and the real figure with the `cipher-reveal` marker when `revealed=true`, **And** the column does not reflow on reveal, **And** the change is a state — never a hover trick. *(UX-DR5/24)*

**Given** the **CipherCell identity invariant** (signature demo moment), **When** the same ciphertext token is rendered masked in one lens and revealed in another, **Then** it carries a shared stable identifier/anchor so the reveal reads as continuity (same cell), not coincidence; **And** the masked→revealed transition (duration/easing/swap-vs-decrypt-in-place) is specified once here and **consumed** by Stories 2.3 and 4.1, never re-described. *(UX-DR5; owned here)*

**Given** stub-framed components, **When** `data-table` (DR9), `audit-log-row` (DR10), and `disclosure-receipt-card` (DR11) are built, **Then** only their frame/rhythm/slot layout exists in 1.0 (row/header/cell density, badge slot, card frame); real column/event/proof data binds in 2.3/2.4/3.5. *(UX-DR9/10/11)*

**Given** the app boots, **When** no role is selected, **Then** the role-switcher shell renders three lens slots (stubs), opens on the Mode B Holder front door, **And** key-dependent actions render disabled with "Sign to unlock →". *(UX-DR12/23; FR-21 shell)*

**Given** any async surface, **When** it needs feedback, **Then** reusable skeleton-loader, error-card, and empty-state shells are available from one source. *(UX-DR20)*

**Given** WCAG 2.2 AA, **When** the trust boundary renders, **Then** sealed vs revealed is distinguishable by glyph/marker, not color alone. *(UX-DR21)*

**Given** this is fixture-only, **Then** no lens wires to real data and no `@mysten/*`/`core/crypto` call is made from a lens (lint zones enforce). *(AR-15)*

### Story 1.1a: Vendored Pinned Baseline & First-Green Build

As a developer,
I want a vendored, pinned Contra baseline with a narrow first-green build,
So that all later work rests on a reproducible foundation and the SPIKE-1 import surface is ready.

**Acceptance Criteria:**

**Given** a clean clone, **When** preflight runs, **Then** rustc / wasm32 target / wasm-pack / Node 20+ / pnpm presence is verified and fails fast if missing. *(AR-2, NFR-10)*

**Given** the pinned commit, **When** `git submodule update --init --recursive` runs, **Then** `vendor/contra` resolves at PINNED_COMMIT, the hash is verified, **And** the pin is reflected in submodule HEAD, `Move.toml rev`, and `.npmrc`. *(AR-1/3, C6)*

**Given** build order, **When** `build:wasm` then `core/crypto` build, **Then** both compile with **sdk excluded** — first-green = wasm builds + core/crypto compiles. *(AR-2)*

**Given** the tech baseline and pinned-adapter constraint, **When** the toolchain is asserted, **Then** Node 20+, TS strict, and the pinned Move toolchain are enforced, **And** the Contra SDK adapter asserts the single pinned version (`vendor/contra/PINNED_VERSION` pairs Move git sha with ts-sdk npm version; CI fails on skew). *(NFR-10, C6, AR-9)*

**Given** provenance, **When** the baseline is committed, **Then** commit 0 is tagged `upstream-baseline` and a Forked/Modified/Built-new ledger is started. *(AR-1)*

**Given** Windows, **When** `build:wasm` runs, **Then** it executes in WSL2/container for deterministic output (documented). *(AR-3)*

### Story 1.1b: Move Package Build & Off-Chain Spike Harness + Verify Seam

As a developer,
I want the Move package building/testing and an off-chain spike harness carrying the verify primitive & ProofAdapter verify-seam,
So that SPIKE-1 can attempt the off-chain proof→verify round-trip and the verify seam exists as Epic-1-owned plumbing.

**Acceptance Criteria:**

**Given** move sources, **When** `prettier-plugin-move` + move build/test run, **Then** `statement.move` + `verifier.move` (wraps `nizk::verify_elgamal`) build and tests pass, **And** move tests emit golden BCS vectors. *(AR-13, addendum §B.4)*

**Given** `core/crypto`, **When** `statementCodec` serializes a statement, **Then** bytes match the committed golden vectors, cross-checked in CI. *(AR-13)*

**Given** the ProofAdapter interface + fake impl + off-chain verify path, **When** the harness calls generate/verify, **Then** it imports **only** `@aperture/core(crypto)` + `@aperture/wasm` (not `apps/*`/`utils`). *(AR-6/14)*

**Given** Fiat-Shamir parity is the #1 blocker, **When** the wasm prover dumps challenge-hash bytes, **Then** an interop vector test asserts them against a fixture **before** any chain interaction. *(AR-4)*

**Given** downstream verify needs a stable input, **When** the harness runs, **Then** it emits **committed golden proof fixtures** (valid + tampered) that Story 3.3's verify is tested against — so 3.3 stands on this seam, not on Story 3.2's runtime output. *(seam pin for 3.3)*

### Story 1.1c: On-Chain Fixture & Verify Seam *(FR-20a)*

As a developer,
I want an idempotent on-chain fixture plus the on-chain verify seam,
So that SPIKE-1's on-chain assertion can run and the one-command deploy+seed groundwork exists.

**Acceptance Criteria:**

**Given** a fresh environment, **When** the `pretest-devnet` fixture runs, **Then** the sui CLI is on the `devnet` env, the devnet RPC is reachable, the active address is funded (topped up via faucet if below 0.5 SUI), **And** the fixture is idempotent (re-runnable). *(AR-4)*

**Given** the dlog-table question, **When** the fixture initializes, **Then** whether on-chain verify needs a dlog table (vs commitment-equality with X as public input) is resolved and documented. *(AR-4)*

**Given** the on-chain verify seam, **When** the `publish-devnet` script runs, **Then** the `aperture` Move package is published to devnet with its package-id captured to `scripts/.published-devnet.json`, **And** `aperture::verifier::verify_aggregate` is invokable on devnet via a PTB and returns a result. *(FR-17 primitive, on-chain)*

**Given** FR-20a, **When** seed runs, **Then** it creates the SQLite schema and is the basis for one-command deploy+seed; re-seed = delete file. *(AR-7, NFR-7)*

**Given** the off/on-chain split, **Then** `it('verifies off-chain')` (in `packages/spike/`) and `it('verifies on-chain')` (in `packages/spike/test/onchain/`) are separate tests in separate vitest projects so a red result is unambiguous. The on-chain test uses `@mysten/sui` and is OUTSIDE the 1.1b spike import-discipline (which forbids `@mysten/*` in `packages/spike/src/`). *(AR-4)*

### Story 1.2a: SPIKE-1 Go/No-Go *(gates Epic 3)*

As a tech lead,
I want SPIKE-1 to return an empirical go/no-go on the Mode B aggregate proof path,
So that Epic 3 scope is decided with runway to pivot before Epic 2 closes.

> **Runs early, in parallel with the foundation sub-phase** (start trigger = Story 1.1c fixture green; not blocked behind data-plane features). Its import surface is `@aperture/core(crypto)` + `@aperture/wasm` + the 1.1c devnet fixture. The on-chain half of SPIKE-1 lives in `packages/spike/test/onchain/` (separate vitest project, uses `@mysten/sui`); the 1.1b import discipline (no `@mysten/*` in `packages/spike/src/`) is preserved.

**Acceptance Criteria (PASS requires ALL):**

**Given** a correct `X`, **When** an aggregated proof is generated and verified, **Then** off-chain SDK verify = true **And** on-chain `nizk::verify_elgamal` = success. *(FR-16/17)*

**Given** a wrong `X`, **Then** verify = false on both paths. *(NFR-3)*

**Given** a tampered ciphertext, **Then** verify = false — empirically demonstrated, not assumed. *(NFR-3)*

**Given** a deliberate limb-0 carry past 2¹⁶, **Then** the bound is enforced (decrypted aggregate asserted correct / entry rejected). *(AR-11)*

**Given** measurement, **Then** client-side proof-gen time, proof size, and on-chain verify gas are recorded. *(NFR-6)*

**Given** a timebox + owner + due date, **When** the box expires without PASS, **Then** fallback = FR-18 (if it passes) else recorded clip + live Mode A, **And** the GO/NO-GO + aggregate-vs-single decision is recorded. *(AR-4)*

### Story 1.2b: SPIKE-2 One-PTB Wrap+Batch *(shapes FR-5)*

As a tech lead,
I want SPIKE-2 to settle whether wrap + batch (+ event) compose in one PTB,
So that the payment-run (FR-5) is built on the right transaction shape — independent of SPIKE-1's go/no-go.

**Acceptance Criteria:**

**Given** wrap+batch(+event) in one PTB, **When** executed on the spike harness, **Then** either it composes without a balance-update conflict **Or** the two-PTB split is adopted for FR-5. *(AR-5)*

**Given** the outcome, **Then** the one-PTB-vs-two-PTB decision is recorded and feeds Story 1.7's run shape. *(AR-5)*

**Given** independence, **Then** a SPIKE-2 failure does **not** block Story 1.2a's go/no-go gate (separate decisions). *(party-mode ruling)*

### Story 1.3: Create Organization

As a Payer,
I want to create an org/payer entity,
So that I have an anchored home for recipients and payment runs.

**Acceptance Criteria:**

**Given** an authenticated Payer (role-switch), **When** they create an org with a name + designated auditor public key, **Then** an on-chain anchor object and a one-to-one off-chain `Org` record `{id, onchainAnchorId, payerAddress, auditorPublicKey}` are created. *(FR-1, addendum §C)*

**Given** idempotency, **When** create_org re-runs with `idem_key = H(owner||name)`, **Then** `chain.txCount === 1`. *(AR-12)*

**Given** the audit-trail genesis, **Then** the hash-chain genesis seed is local-deterministic `H(config)` (no dependency on the org-create tx), with `onchainAnchor` backfillable. *(AR-10)*

**Given** honesty copy, **Then** no "anonymous"/"compliant" language appears. *(NFR-9)*

### Story 1.4: Add Recipients with Cap

As a Payer,
I want to add up to 7 recipients with off-chain amounts,
So that I can prepare a confidential run without exposing amounts on-chain.

**Acceptance Criteria:**

**Given** an org, **When** the Payer adds a recipient (address + display name + amount), **Then** a `Recipient` record `{orgId, address, displayName, amount: MIST string, registered:false}` is stored off-chain only — never on-chain in plaintext. *(FR-2, NFR-1)*

**Given** amount validation, **When** an amount is entered, **Then** it must be a MIST integer string (no decimal/sign/leading zero), stored as `TEXT`. *(AR-7)*

**Given** the batch cap (C1), **When** an 8th recipient is added, **Then** it is rejected inline: "A run is limited to 7 recipients. Remove one to add another." *(UX-DR20)*

**Given** empty state, **When** no recipients exist, **Then** "No recipients yet. Add up to 7 to start a payment run." renders. *(UX-DR20)*

### Story 1.5: Register Recipient Accounts & Designate Auditor

As a Payer,
I want to register each recipient's confidential account and designate the auditor at registration,
So that recipients can receive confidential transfers and Mode A designation is established on-chain.

**Acceptance Criteria:**

**Given** an unregistered recipient, **When** register runs, **Then** `newAccount` (once per address) then `register` (once per token) both execute. *(FR-3, addendum §B.1)*

**Given** Contra's Option-2 model, **When** register runs, **Then** the recipient's viewing-key material is encrypted to the org's designated auditor key and published on-chain with the correctness proof — establishing designation at registration time. *(FR-9 on-chain half)*

**Given** register-before-receive (C4), **When** a transfer targets an unregistered recipient, **Then** it fails with "Recipient {name} isn't registered yet. Register before running this payment." *(FR-3, UX-DR19)*

**Given** idempotency, **When** register re-runs with `idem_key = H(org||member)`, **Then** `txCount === 1`. *(AR-12)*

**Given** the recovery contract, **When** the auditor key material is published, **Then** it is in the exact form Story 2.3's `recoverPrivateKey` consumes — a cross-checked fixture asserts 1.5 output satisfies 2.3 input, so no late integration break. *(seam pin for 2.3)*

**Given** a registration badge, **Then** each recipient row shows registered/pending state. *(UX-DR7)*

### Story 1.6: Fund Treasury via Single Aggregate Wrap

As a Payer,
I want to fund the treasury with exactly one aggregate wrap,
So that no per-recipient amount crosses the privacy boundary.

**Acceptance Criteria:**

**Given** an org with registered recipients, **When** the Payer funds the treasury, **Then** exactly one aggregate public coin is wrapped into the confidential domain. *(FR-4)*

**Given** the privacy boundary, **When** funding completes, **Then** an automated test asserts no per-recipient wrap occurred (exactly one aggregate wrap). *(NFR-2, AR-15)*

**Given** the amount-confidentiality invariant, **When** the fund + run complete, **Then** a CI negative test asserts no per-recipient plaintext amount appears on-chain, in any emitted event, or via any public API to a non-owner/non-designated party. *(NFR-1, AR-15, SM-2)*

**Given** idempotency, **When** fund re-runs with `idem_key = H(org||round||amount||deterministic_nonce)` (no random nonce), **Then** `txCount === 1`. *(AR-12)*

**Given** the crossing is visible (C5), **Then** copy notes the amount is visible at the wrap crossing. *(NFR-9)*

### Story 1.7: Execute Batch Payment Run

As a Payer,
I want to issue confidential transfers to all (≤7) recipients in one run,
So that recipients receive funds with no amounts public.

**Acceptance Criteria:**

**Given** a funded treasury + registered recipients, **When** the Payer executes a run, **Then** confidential transfers issue to all (≤7) recipients in one batch (or two PTBs per the SPIKE-2 fallback). *(FR-5, AR-5)*

**Given** the event, **When** the run posts, **Then** a `PaymentRun` event records recipient count + timestamp and **no amounts**, **And** an off-chain `PaymentRun` record `{runIndex, txDigest, recipientCount, at}` is written. *(FR-5, NFR-1)*

**Given** deterministic ElGamal randomness, **When** the run re-runs with `idem_key = H(round||input_commitment)`, **Then** identical ciphertext is produced and `txCount === 1`. *(AR-12)*

**Given** the C3 race, **When** a merge race occurs (`TryTransferFailedEvent`, no abort), **Then** retry with the same idem_key, `merge:false`. *(AR-12)*

**Given** run states, **Then** "Running payment…" loading and a success run row with explorer deep-link render. *(UX-DR20/22)*

### Story 1.8: Holder Balance View

As a Holder,
I want to view my own decrypted balance in plain language,
So that I know what I have without crypto jargon.

**Acceptance Criteria:**

**Given** the cached dlog table **and** the holder's secret key (C2), **When** they open Balance, **Then** the decrypted Available figure renders < 2 s after cache warm. *(FR-6, NFR-6)*

**Given** the three buckets (active/pending/pending-public), **When** the balance panel renders, **Then** it presents exactly two figures — **Available** (active) and **Arriving** (pending + pending-public) — and the DOM exposes no bucket labels and no terms from the banned-jargon lexicon. *(FR-6/7, UX-DR13/19)*

**Given** decryption progress, **Then** "Reading your balance…" announces via `aria-live`. *(UX-DR21)*

**Given** the holder's key, **Then** it is used only for local browser decrypt, never sent elsewhere. *(NFR-8)*

### Story 1.9: Holder Claim & Withdraw

As a Holder,
I want to claim arriving funds and withdraw to a public coin,
So that I can use my funds without seeing crypto mechanics.

**Acceptance Criteria:**

**Given** arriving (pending) funds, **When** the Holder clicks Claim, **Then** pending merges to active, auto-retrying transparently on the race ("Finishing up…" → "Claimed."), with no manual merge step or jargon. *(FR-7, AR-12, UX-DR13)*

**Given** withdraw, **When** the Holder withdraws, **Then** funds unwrap to a public coin after a one-time confirm "Withdrawing makes this amount visible on-chain. Continue?" *(FR-7, C5)*

**Given** bounded aggregation (C7), **Then** claim keeps the holder merged (immaterial at demo scale but handled). *(FR-7)*

**Given** the no-jargon rule, **When** any Holder-lens copy renders, **Then** a lexicon lint over rendered strings finds zero terms from the banned list `[pending, merge, limb, unwrap, ElGamal, ciphertext, dlog, BCS, Fiat-Shamir, PTB]`. *(FR-7, UX-DR19)*

## Epic 2: Auditor Console (Mode A)

A designated Auditor authenticates, sees only the accounts they are designated for, recovers viewing keys to read decrypted balances + transfer history, produces and exports per-run reports — and every read is permanently recorded in an append-only audit-trail-of-audit. By the end of this epic the demo loop is green on Mode A — the safe-cut narrative if Mode B slips.

> Builds on Epic 1's on-chain designations (FR-9, Story 1.5) and the shared `<CipherCell>` (revealed state) + state primitives. **The audit-trail infrastructure (Story 2.2) is built before the read stories (2.3/2.4) so reads can log into it — no forward dependency.** Each story owns its own empty/error/loading content.

### Story 2.1: Auditor Authentication & Designated Scope

As an Auditor,
I want to authenticate with my auditor key and see only the orgs/accounts I'm designated for,
So that my access is bounded to my engagement and a non-designated account is never even visible.

**Acceptance Criteria:**

**Given** a role-switch to Auditor, **When** entering the lens, **Then** a pre-sign explainer ("Entering as Auditor — derive your key from a one-time signature. Nothing is stored or spent.") then a wallet signature derives the auditor session key (HKDF), cached in session memory only. *(FR-21 behavior, AR-8, UX-DR12)*

**Given** the designations published at registration (FR-9), **When** the designated-scope list loads, **Then** only orgs/accounts that encrypted viewing-key material to this auditor's key appear; non-designated entities are **absent, not greyed**. *(FR-10, NFR-4, UX-DR16)*

**Given** fail-closed least-visibility, **When** a route-table test loads one designated + one non-designated + one unknown account URL, **Then** the designated route returns data, **And** both the non-designated and unknown routes return deny by default with zero audit data in the DOM ("You aren't designated for this account."). *(NFR-4, SM-C2)*

**Given** the session key, **Then** it is a branded type, never logged/serialized/in query keys/devtools. *(AR-8, UX-DR24)*

### Story 2.2: Audit-Trail-of-Audit Infrastructure & Viewer

As an org and an Auditor,
I want every auditor read recorded in an append-only, hash-chained trail with a read-only viewer,
So that auditor access is itself accountable — built before any read so reads can log into it.

**Acceptance Criteria:**

**Given** the `AuditLog` table, **When** an append is requested, **Then** an entry `{auditorId, orgId, targetAccount, action, at}` is written with `entry_hash = SHA256(prev_hash || ":" || JCS(payload))`, `seq` inside the payload, `UNIQUE(seq)`; genesis = local seed `H(config)`; `onchainAnchor` optional. *(FR-13, NFR-5, AR-10)*

**Given** the API surface, **Then** no edit or delete operation on `AuditLog` exists (assertable by inspecting the API). *(NFR-5, SM-6)*

**Given** the viewer, **When** rendered, **Then** rows are read-only with a hash-chain link marker; **no edit/delete affordance renders anywhere**. *(UX-DR10/24)*

**Given** a mid-chain mutation, **Then** the chain breaks visibly — tamper-**evident**, not tamper-proof (honest claim). *(NFR-5)*

**Given** empty, **When** no reads exist yet, **Then** "No reads recorded yet. Your reads will appear here, permanently." *(UX-DR20)*

### Story 2.3: Recover & View Designated Account

As an Auditor,
I want to recover a designated account's viewing key and view its decrypted balances and transfer history,
So that I can examine the books I'm entitled to — with the read logged.

**Acceptance Criteria:**

**Given** a designated account, **When** the Auditor opens it, **Then** `recoverPrivateKey` runs **server-side** (`ServerProofAdapter`); the viewing key is passed per-request, in-memory, never persisted. *(FR-11, AR-6, D1)*

**Given** recovery, **When** the account renders, **Then** decrypted balances + transfer history bind into the `data-table` frame from Story 1.0 (DR9 data binding lands here), **And** the same ciphertext that read `••••` in the Payer lens shows **revealed** with the `cipher-reveal` marker — consuming Story 1.0's CipherCell identity invariant (same cell, not a coincidental re-render). *(FR-11, UX-DR5/9)*

**Given** Contra's Option-2 model, **Then** within a designated account the auditor decrypts everything (god-key per account, not per-row), and this is labeled. *(§4.2, NFR-8 relaxed/labeled, NFR-9)*

**Given** the read occurs, **Then** an `AuditLog` entry is appended via Story 2.2. *(FR-13)*

### Story 2.4: Per-Run Report & Export

As an Auditor,
I want a per-run report of recipients and decrypted amounts, exportable as CSV/JSON,
So that I have working papers — with the generation logged.

**Acceptance Criteria:**

**Given** a designated org/run, **When** the Auditor generates a report, **Then** a decrypted recipient×amount table for that run renders, **And** the `audit-log-row` frame from Story 1.0 binds real audit-event data here (DR10 data binding lands in 2.2/2.4). *(FR-12, UX-DR10)*

**Given** export, **When** the Auditor exports, **Then** CSV and JSON are produced via an explicit button, with the scoped-claim disclaimer adjacent. *(FR-12, UX-DR17/19)*

**Given** generation, **Then** an `AuditLog` entry is appended via Story 2.2. *(FR-13)*

**Given** amounts, **Then** they render monospace/tabular and are never returned to a non-owner/non-designated party. *(NFR-1)*

### Story 2.5: Privacy Posture Panel

As an Auditor,
I want a panel stating what's public on-chain vs what required my key,
So that Mode A is never over-claimed as "compliance" on its own.

**Acceptance Criteria:**

**Given** the Auditor lens, **When** the panel renders, **Then** two columns: "Public on-chain" (sender, receiver, token, timing) vs "Requires auditor key" (amounts); pure read. *(FR-14, UX-DR18)*

**Given** honesty, **Then** copy frames the auditor's legal basis and avoids "compliant"/"anonymous". *(NFR-9)*

**Given** the pairing, **Then** the panel notes Mode A is the read half, paired with Mode B's prove half — not sold alone as compliance. *(§4.2/§6.2, NFR-9)*

## Epic 3: Proof-of-Figure (Mode B) — ⚠️ GATED on SPIKE-1 (Story 1.2)

> **Gate preamble:** This epic opens **only if Story 1.2 returned GO** on the aggregate path. On aggregate-NO-GO: Stories 3.1/3.2 do not build; Mode B descopes to **Story 3.4 (single-amount)** if SPIKE-1 passed it, else to a recorded clip + live Mode A. **Story 3.3 (verify) is required by both paths and is never dropped.** DECISION-BY: before Epic 2 close.

A Holder selects a subset of their own encrypted entries and proves the selected sum equals `X` **without surrendering their key**; a Verifier confirms it against the holder's public key and on-chain ciphertext, off-chain and on-chain. Rests on Epic 1's verify seam; owns its own empty/error/loading states. This is Aperture's differentiated wedge.

### Story 3.1: Select Entries & Disclose Value

As a Holder,
I want to select a subset of my own encrypted entries and have the system compute their true aggregate locally,
So that I can disclose a precise figure `X` scoped to exactly those entries.

**Acceptance Criteria:**

**Given** the Holder's entries, **When** they select entries, **Then** a checklist shows "X of N entries selected" with a live running selected-sum total (`data-lg`). *(FR-15, UX-DR14)*

**Given** local computation, **When** entries are selected, **Then** the true aggregate is computed locally (client-side) — disclosed `X` derives from the selection, not free-entry. *(FR-15)*

**Given** the range bound, **When** adding an entry would push the aggregate's limb-0 past 2¹⁶, **Then** the entry can't be added: "Adding this entry exceeds what can be proven in one figure. Prove a smaller selection." *(AR-11, UX-DR14/20)*

**Given** scope honesty, **When** the selection panel renders, **Then** the DOM shows the in-scope entry count and the scoped-claim disclaimer string, **And** contains no "total"/"income"/"net" claim — snapshot-locked. *(FR-15, NFR-9, UX-DR19)*

### Story 3.2: Generate Aggregate Proof

As a Holder,
I want to generate a proof that my selected aggregate encrypts the disclosed `X` under my public key,
So that I can share a figure without surrendering my key.

**Acceptance Criteria:**

**Given** a selection, **When** the Holder clicks Generate proof, **Then** selected ciphertexts are aggregated homomorphically (`Ciphertext.add`) and a proof that the aggregate encrypts `X` under the holder's pubkey is generated. *(FR-16)*

**Given** client-side gen (D1), **Then** generation runs in the browser via `ClientProofAdapter`; the holder's key never leaves the browser (verifiable in the network tab). *(AR-6, NFR-8)*

**Given** loading, **When** generating, **Then** a spinner shows measured elapsed time ("Generating proof… 2.4s", target < 10 s) and `aria-live` announces progress. *(FR-16, NFR-6, UX-DR15/21)*

**Given** determinism, **Then** ElGamal randomness is derived deterministically so re-generation is reproducible. *(AR-12)*

### Story 3.3: Verify Proof Without Secret Key

As a Verifier,
I want to verify a holder's proof against their public key and on-chain ciphertext without their secret key,
So that I get an unambiguous pass/fail.

**Acceptance Criteria:**

**Given** a proof + holder pubkey + on-chain ciphertext(s), **When** the Verifier verifies, **Then** it passes **without** the holder's secret key, off-chain **and** on-chain (`nizk::verify_elgamal`) — tested against the **committed golden proof fixtures from Story 1.1b**, not Story 3.2's runtime output (no forward dependency). *(FR-17, AR-6)*

**Given** a correct `X`, **Then** result = `badge-verified` "Verified"; given a tampered `X` or input, **Then** result = `badge-failed` "Doesn't verify" — unambiguous. *(FR-17, NFR-3, UX-DR7)*

**Given** the verdict, **Then** it carries text + icon, not color alone. *(UX-DR21)*

**Given** the done-definition, **Then** a Mode B feature isn't done until on-chain `verify_elgamal` passes. *(AR-15 rule 5)*

### Story 3.4: Single-Amount Fallback

As a Holder,
I want to prove a single encrypted amount equals `X` (lower complexity),
So that disclosure still works if the aggregate path didn't pass SPIKE-1.

**Acceptance Criteria:**

**Given** a single entry, **When** the Holder generates a single-amount proof, **Then** it proves that one encrypted amount equals `X` under their pubkey, verified by Story 3.3. *(FR-18)*

**Given** the descope path, **When** SPIKE-1 was aggregate-NO-GO / single-GO, **Then** copy reframes from "selected sum" to "this amount equals X" and the scoped-claim disclaimer adjusts. *(FR-18, UX-DR19/20)*

**Given** verify reuse, **Then** Story 3.3's verify handles both aggregate and single-amount proofs — not duplicated. *(FR-17)*

### Story 3.5: Disclosure Receipt *(could — PARKED below the demo line)*

> **Priority (PM ruling):** FR-19 is a "could" and is **not on the judged-demo critical path** — no judge scores a receipt. Park this below the demo line; build only if Mode B lands early with spare time.

As a Holder,
I want to package a proof + minimal metadata into a shareable JSON receipt,
So that an external party can verify offline.

**Acceptance Criteria:**

**Given** a generated proof, **When** the Holder exports, **Then** the `disclosure-receipt-card` frame from Story 1.0 binds real data (DR11 binding lands here): holder pubkey, disclosed value `X` (`data-lg`), included-entry **count only**, truncated proof blob, and a verified/failed result slot. *(FR-19, UX-DR11)*

**Given** confidentiality, **When** the receipt JSON is produced, **Then** schema validation permits keys `{holderPubkey, disclosedValue, includedCount, proofBlob, result}` and **rejects any key matching `/amount|mist|value(?!d)|balance|entryId|which/`** — count only, never which entries. *(UX-DR11/24)*

**Given** offline verify, **When** an external party loads the receipt into Verify, **Then** it verifies against pubkey + on-chain ciphertext, returning pass/fail. *(FR-19/17)*

## Epic 4: Demo Narrative & Polish

The whole loop demos in one pass across all three lenses, with a recorded backup that cannot fail. Shrunk to honest polish because the cross-role spine was declared in Epic 1.

> Depends on Epics 1–3 existing (the scripted path walks real features). Story 4.4 is last — it orchestrates everything.

### Story 4.1: Full Cross-Role Switch & Lens Polish

As a demo operator,
I want the role-switcher to fully re-lens the app across Payer/Holder/Auditor with lazy signing,
So that the cross-role story reads as one coherent product.

**Acceptance Criteria:**

**Given** the shell from Story 1.0, **When** switching roles, **Then** the whole lens changes (accent + header banner + visible surfaces) and a lazy signature derives that role's session key on first entry only (session memory). *(FR-21, UX-DR12)*

**Given** wallet binding, **When** a different wallet is selected mid-demo, **Then** it's blocked with a clear notice (breaks decrypt/verify). *(UX-DR12, demo-lock)*

**Given** the front door, **When** the app boots, **Then** it opens on the Mode B Holder flow, not a wallet wall. *(UX-DR23)*

**Given** the trust-boundary visual, **When** switching lenses, **Then** each lens renders a `[data-testid=trust-boundary]` element with the correct per-role scope label, **And** the same ciphertext (same identity anchor from Story 1.0's CipherCell invariant) shows open for the Holder and `••••` for Payer/Auditor — consuming the 1.0 invariant, not re-describing the reveal. *(UX-DR5)*

**Given** no key / rejected signature, **Then** key-dependent buttons stay disabled with "Sign to unlock →", never crash/white-screen. *(UX-DR12/20)*

### Story 4.2: Explorer Deep-Links

As a viewer/judge,
I want every on-chain tx to deep-link to the Sui explorer,
So that I can confirm amounts are encrypted on-chain.

**Acceptance Criteria:**

**Given** any on-chain row (run, register, fund, transfer), **When** rendered, **Then** it carries a Sui explorer deep-link. *(FR-22, UX-DR22)*

**Given** the explorer, **When** a deep-link is followed, **Then** the viewer sees transfers with encrypted amounts, **And** a check asserts the explorer payload exposes no plaintext per-recipient amount (the on-chain half of the NFR-1 invariant). *(FR-22, NFR-1, UJ-1)*

**Given** an audit across surfaces, **Then** every on-chain action surface is checked for a deep-link — no gaps. *(UX-DR22)*

### Story 4.3: Global State & Accessibility Sweep

As any user,
I want complete empty/error/loading states and WCAG 2.2 AA across all lenses,
So that the demo never white-screens and the tool is accessible.

**Acceptance Criteria:**

**Given** each lens, **When** audited, **Then** every async action has idle/loading/success/error and the full state list renders (no-key, decrypting, empty recipients, 8th reject, unregistered-at-run, run executing, claim race, withdraw crossing, proof generating, proof done/failed, aggregate out-of-range, Mode B unavailable, non-designated fails-closed, empty audit trail); never a white screen. *(UX-DR20)*

**Given** WCAG 2.2 AA, **When** swept, **Then** an automated axe scan returns zero violations, **And** trust boundary conveyed beyond color, verdicts text+icon, tab order = reading order, tables keyboard-navigable, `Esc` closes top dialog, `aria-live` for proof-gen/decrypt, focus ring AA. *(UX-DR21)*

**Given** the honesty guardrail + voice contract, **When** the copy gate runs, **Then** a lexicon lint over all rendered copy finds zero "anonymous"/"untraceable"/"fully compliant" claims, **And** each lens's copy conforms to its register in the EXPERIENCE.md voice contract (Holder no-jargon / Auditor formal / scoped-claim). *(NFR-9, SM-C1, UX-DR19)*

**Given** the keys-PoC posture, **When** the app renders, **Then** a visible non-production-keys disclaimer is present (Mode A server-side decrypt labeled; demo keypairs marked non-production). *(NFR-8)*

### Story 4.4: Verifier Proof Request (Demo Opening)

As a Verifier (e.g. a lender),
I want to issue a proof request that the Holder's Prove flow answers,
So that the demo opens with a motivated ask ("you asked → I proved → you verified") instead of an unmotivated figure.

**Acceptance Criteria:**

**Given** the demo front door, **When** the app opens on the Mode B Holder flow, **Then** a Verifier request artifact (a shareable prompt/link stating "prove your selected total = X to me") is present and is what the Holder's Story 3.1/3.2 Prove flow responds to. *(UX-DR23, demo narrative)*

**Given** the request → prove → verify loop, **When** the Holder answers a specific request, **Then** the resulting disclosure (Story 3.3 verify) is tied back to that request — the opening question and the closing verdict reference the same `X`. *(FR-17, SM-3)*

**Given** Mode B is unavailable (SPIKE-1 NO-GO), **Then** the request reframes to the single-amount (FR-18) ask, or is replaced by the Mode-A-only opening in Story 4.5. *(FR-18, continuity)*

### Story 4.5: One-Command Demo Path & Recorded Backup

As a demo operator,
I want a one-command scripted demo path with a recorded backup and a Mode-A-only fallback script,
So that the full loop runs in one pass on a fresh Devnet and survives a Mode B slip.

**Acceptance Criteria:**

**Given** a fresh Devnet, **When** the one command runs, **Then** deploy+seed completes < 5 min and the scripted path (verifier request → create org → register → fund → run → claim → report → prove → verify) runs end-to-end in one pass across all three roles. *(FR-20b, NFR-7, SM-1/SM-4)*

**Given** cross-flow continuity, **When** the scripted path runs, **Then** the same org/run flows through every lens — the run Priya executes is the one Hassan claims and Aisha audits, and the figure Hassan proves traces to those entries — so the three flows read as one story, not three disconnected scenes. *(SM-1, demo continuity)*

**Given** a Devnet reset, **When** re-seeded, **Then** the environment is fully re-deployable/re-seedable via the single command (recovery path). *(NFR-7)*

**Given** Mode B risk, **When** SPIKE-1 was NO-GO, **Then** a pre-written **Mode-A-only fallback demo script** exists and runs the coherent loop without Mode B. *(continuity insurance)*

**Given** continuity, **Then** a **recorded demo backup** of the safe path is captured. *(continuity insurance)*

**Given** the invariant, **Then** the scripted run holds SM-2 (no per-recipient plaintext on-chain/API + exactly one aggregate wrap). *(NFR-1/2)*
