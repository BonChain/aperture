# SRS ↔ PRD Reconciliation — Aperture

**Date:** 2026-06-19
**Source of truth:** `docs/Aperture srs.md`
**Derived artifacts:** `prds/prd-Aperture-2026-06-19/prd.md` + `addendum.md`
**Question:** What does the SRS contain that the PRD + addendum FAILED to capture or DISTORTED?

**Overall verdict:** Coverage is unusually strong. Every FR, NFR, constraint, spike, and epic/story is represented. The derivation is largely *additive* — the PRD enriches the SRS with verified facts (C7, the two-step account setup, three balance buckets, browser WASM, the Move format CI gate) and a sharper honesty framing. There are **no material requirement omissions**. The findings below are mostly *drifts, additions that need a back-check, and a small number of details that fell out of the requirement contract into prose only.* One genuine downgrade of testability is flagged (Finding D-1).

---

## 1. Requirement-by-requirement coverage

### Functional Requirements (FR1–FR22)

| SRS FR | In PRD? | In Addendum? | Status |
|---|---|---|---|
| FR1 create org | FR-1 | — | OK |
| FR2 add recipients (cap 7) | FR-2 | — | OK |
| FR3 register recipient | FR-3 | B.1 (two-step note) | OK (enriched) |
| FR4 single aggregate wrap | FR-4 | — | OK |
| FR5 batch run ≤7 | FR-5 | — | OK |
| FR6 holder balance | FR-6 | B.1 (3 buckets) | OK (enriched) — see D-2 |
| FR7 claim/withdraw | FR-7 | — | OK (enriched w/ C7) |
| FR8 >7 chunking | FR-8 | — | OK (marked NON-GOAL) |
| FR9 publish auditor key material | FR-9 | B.1 | OK |
| FR10 auditor auth & scope | FR-10 | — | OK |
| FR11 recover & view | FR-11 | — | OK |
| FR12 per-run report & export | FR-12 | — | OK |
| FR13 audit-trail-of-audit | FR-13 | A.2 | OK |
| FR14 privacy posture panel | FR-14 | — | OK |
| FR15 select entries & disclose | FR-15 | — | OK (enriched w/ completeness honesty) |
| FR16 aggregate proof | FR-16 | B.1 | OK |
| FR17 verify without secret key | FR-17 | B.1 | OK |
| FR18 single-amount fallback | FR-18 | — | OK |
| FR19 disclosure receipt | FR-19 | — | OK |
| FR20 one-command deploy+seed | FR-20 | B.4 (Move fmt gate) | OK (enriched) |
| FR21 demo role switching | FR-21 | — | OK |
| FR22 explorer deep-links | FR-22 | — | OK |

**No FR missing.** All 22 carry their `(SRS FRn)` tag.

### Non-Functional Requirements (NFR1–NFR10)

| SRS NFR | In PRD? | Status |
|---|---|---|
| NFR1 amount confidentiality | NFR-1 | OK |
| NFR2 privacy boundary integrity | NFR-2 | OK |
| NFR3 disclosure correctness | NFR-3 | OK |
| NFR4 least-visibility Mode A | NFR-4 | OK — but meaning **narrowed**, see D-3 |
| NFR5 auditability append-only | NFR-5 | OK |
| NFR6 performance | NFR-6 | OK |
| NFR7 reliability under reset | NFR-7 | OK |
| NFR8 security/keys PoC | NFR-8 | OK |
| NFR9 honesty of claims | NFR-9 | OK (amplified) |
| NFR10 tech baseline | NFR-10 | OK |

**No NFR missing.**

### Constraints (C1–C6)

All six present in PRD §6.1. The PRD **adds C7** (bounded ~2¹⁶ aggregation) which the SRS did not carry as a constraint (SRS mentioned it nowhere; it is new verified detail). See A-1.

- **C2 drift (benign/correct):** SRS C2 = "decryption needs the dlog table." PRD C2 = "needs the dlog table **and** a secret key." This is a *correction/enrichment*, not a distortion — it propagated into FR-6 and NFR-6 consistently. Acceptable, but it is a change of meaning from the literal SRS text; flagged for awareness.

### Spikes (SPIKE-1, SPIKE-2)

- SPIKE-1: present (PRD §10.1), **substantially enriched** — PRD reframes it from "is it feasible" to "feasibility is grounded; the real unknowns are pinned-commit integration / empirical tamper-soundness / timing." This is a deliberate, well-reasoned upgrade backed by §13 resolved assumptions. Not a distortion but a *stance change* — see D-4.
- SPIKE-2: present (PRD §10.1), faithful.

### Epics & Stories (§7)

All four epics and all stories are preserved in **addendum §E** (compact form) with a pointer back to `docs/Aperture srs.md §7` for full AC text. The PRD itself does not restate stories (by design — it states capabilities). Epic 3 SPIKE-1 gate is preserved in both PRD §10 and addendum §E.

**Story-level AC details that live ONLY in the SRS** (acceptable since addendum points to source, but worth noting they are not re-asserted anywhere downstream-readable):
- Story 1.1 AC2: "≥3 registered recipients" in seed — the specific *count* is not in PRD/addendum prose (FR-20 just says "registered recipients").
- Story 1.5 AC3: "SPIKE-2 result reflected in implementation" — captured via SPIKE-2 gating FR-5.
- Story 3.0 AC1: "aggregate **≥2** encrypted amounts" — the ≥2 minimum is implicit in addendum B.1 but not stated as an AC anywhere outside the SRS.

These are **not gaps** (addendum explicitly defers full AC text to the SRS), but anyone reading only the PRD+addendum loses the numeric ACs.

---

## 2. Drifts & distortions (ranked)

### D-1. NFR2 testability phrasing weakened — minor
SRS NFR2: "A test **must assert** no per-recipient wrap occurs." PRD NFR-2 preserves "a test must assert no per-recipient wrap." Faithful. (No issue — included to confirm the assertion-grade wording survived; it did.)

### D-2. FR6 scope quietly expanded (likely correct)
SRS FR6: holder views "decrypted balance (active + pending)." PRD FR-6 + addendum add a **third bucket** (`pendingPublicBalance` from wraps). This is a *meaning change* vs. the SRS's "active + pending" — almost certainly a correction from the real `getBalance` shape, but it is a divergence from the literal SRS requirement. Architect/QA should treat the 3-bucket model as the contract.

### D-3 / NFR4. Least-visibility meaning NARROWED (the most important honesty drift — but disclosed)
SRS NFR4 reads as a clean "auditor sees only designated accounts; non-designated fails closed." The PRD **correctly discloses** (in §4.2, §6.2, NFR-4 footnote, and addendum B.1) that Contra's Option-2 model is a **per-account "god-key": once designated, the auditor decrypts *everything* that account can see, not a per-row subset.** 

This is the single biggest semantic shift between the documents — but it is a **strengthening of honesty, not a distortion**: the SRS's FR11 already said "decrypted balances **and transfer history**," which is consistent with decrypt-everything. The PRD surfaces an implication the SRS left implicit. Flagged because it materially changes how NFR4 should be read and tested (scope boundary is per-account, never per-row). No contradiction; an honest sharpening.

### D-4. SPIKE-1 risk posture shifted from "feasibility unknown" → "feasibility grounded, integration unknown"
SRS §8.1 framed SPIKE-1 as proving Mode B is *feasible* before building. PRD §10.1 + §13 assert feasibility is **already confirmed** against internal references and redefine the spike as de-risking integration/soundness/timing. This is backed by the resolved-assumptions log and is reasonable, but it is a **stance change** a reader of the SRS alone would not expect. If the internal references are wrong, the PRD has under-weighted the existential risk the SRS kept open. Worth an explicit Architect confirmation (the PRD does flag this as an open `[ASSUMPTION]`).

---

## 3. Qualitative intent — tone, framing, narrative

| SRS intent | Carried? | Notes |
|---|---|---|
| Honesty / no-overclaim stance (NFR9) | **Yes, amplified** | PRD §6.2 lists 3 specific claims to avoid; SM-C1 counter-metric ("zero claims of anonymity/compliant"); UJ-4 judge persona checks honesty. Stronger than SRS. |
| "amount-confidential, selectively disclosable" exact phrasing | Yes | Preserved verbatim in NFR-9 and §6.2. |
| Mode B as "the wedge" / differentiator | Yes, expanded | SRS implied it; PRD §1, §11 make it explicit with market framing. **This is an ADDITION** (competitive landscape, "no tagging key" advantage) not present in SRS — flagged as net-new framing, tagged `[ASSUMPTION]` in §13. |
| Demo narrative / scripted path | Yes | PRD §4.4 + SM-1 capture "fund → run → claim → audit report → prove → verify" (SRS Story 4.3). Faithful. |
| Selective *readability* not *discovery* | **Added** | SRS never framed this; PRD §7, §11 introduce it. Net-new, reasonable. |
| Roadmap / Out-of-scope (§9) | Yes | PRD §7 Non-Goals + §11 future. **All §9 items present:** zkLogin, Walrus+Seal payslips, recurring runs, >7 production chunking, multi-issuer SaaS, billing, metering, Travel-Rule/VASP, mainnet, mobile. Plus PRD adds explicit non-goals (no derived/computed disclosures, no discovery-without-readability) — additive. |
| Traceability (§10) | Yes | Addendum §D reproduces the SRS §10 trace map. **One simplification:** SRS traced C3 → "FR7 (Story 1.6 AC2)" and C4 → "FR3, Story 1.3 AC2"; addendum drops the story-AC pointers (now just C3←FR-7, C4←FR-3). Minor loss of granularity. |

**Tone:** The PRD is more assertive/marketing-flavored in §1 and §11 than the SRS's neutral spec tone. Given it is a PRD this is appropriate, and it does not cross into over-claiming (the honesty guardrails are intact and stronger).

---

## 4. Contradictions (PRD vs SRS)

**None found.** All apparent divergences are corrections/enrichments propagated consistently (C2 dlog+key, FR-6 third bucket, NFR-4 god-key disclosure, SPIKE-1 stance). Where the PRD changes a meaning, it does so deliberately and consistently across all dependent requirements, and discloses the change. No place asserts something the SRS denies.

---

## 5. Net-new content in PRD/addendum NOT in SRS (for awareness, not gaps)

- **C7** — bounded ~2¹⁶ unmerged-deposit aggregation (addendum B.1, PRD §6.1).
- **Two-step account setup** — `newAccount` (per address) + `register` (per token) (FR-3 note, addendum B.1).
- **Three balance buckets** — `balance/pending/pendingPublicBalance` (FR-6, addendum B.1).
- **Browser bulletproofs WASM mandatory** (`wasmUrl`) (addendum B.1) — informs server-side proof-gen default.
- **Move format CI gate** — `prettier-plugin-move -w` or CI fails (addendum B.4).
- **Reusable Contra assets** — `kaisho`, `closed-loop`, `payment-channel` (addendum A.1).
- **Success metrics SM-1…SM-5 + counter-metrics SM-C1/C2** — SRS had no metrics section.
- **Open Questions §12** — SRS had no dedicated open-questions list (it had risks).
- **Competitive / "why now" framing** — Solana/Circle/Aleo, "no tagging key" vs Aztec (PRD §1, §11).
- **UJ-4 judge/observer persona** — net-new JTBD beyond SRS's three roles.

All of these are upgrades. The only caution: the competitive framing and feasibility-confirmation rest on internal references the SRS did not cite; both are correctly tagged `[ASSUMPTION]` in PRD §13.

---

## 6. Bottom line

- **Missing requirements:** none (FR1–22, NFR1–10, C1–6, SPIKE-1/2, all 4 epics + stories all present).
- **Meaning drift to watch (all disclosed, none accidental):**
  1. **NFR-4 god-key narrowing** — per-account decrypt-everything, not per-row (biggest semantic shift; honesty-positive).
  2. **FR-6 / C2** — added secret-key requirement and third balance bucket vs. SRS literal text.
  3. **SPIKE-1 posture** — recast from "feasibility unknown" to "feasibility grounded," resting on internal refs.
- **Lost granularity (minor):** story-level numeric ACs (seed ≥3 recipients, aggregate ≥2 amounts) and C3/C4→story-AC trace pointers live only in the SRS; addendum points back to it rather than restating.
- **Contradictions:** none.
