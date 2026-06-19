# PRD Quality Review — Aperture

*Reviewer calibration: HACKATHON PoC / Sui Overflow 2026 entry. Enterprise ceremony (ROI, stakeholder sign-off, SLAs, rollout/GTM, multi-quarter metrics) is intentionally **not** demanded. The bar is: can the SM/Architect build from this without re-litigating scope, and is the spike-gating safe?*

## Overall verdict

**PASS-WITH-FIXES.** This is a strong, unusually honest PoC PRD: FRs are testable, IDs are stable and SRS-traceable, the glossary is real and used consistently, success metrics trace back to concrete FRs/NFRs with counter-metrics, and the SPIKE-1→Mode B gate is stated three times in non-contradictory language. What holds up is the scope discipline and the disclosure-honesty thesis. What is at risk is a small set of cross-reference / ID hygiene defects (a constraint numbered out of order, one glossary term used with a casing variant, and a couple of "validates"/"realizes" links that don't fully resolve) plus one genuinely under-specified NFR (NFR-5 tamper-evidence) that is correctly flagged as an Open Question but is also asserted as a testable invariant — that tension should be reconciled before build. None of these block the hackathon; all are cheap to fix and worth fixing because the downstream SM/Architect source-extract directly from these IDs.

## Decision-readiness — strong

A decision-maker (here: the team + judges) can act on this. The central bet is named explicitly and repeatedly: Mode B (holder-controlled, per-disclosure proof without key surrender) is "the wedge" (§1, §11), and Mode A is deliberately demoted to "the read half" that must never be sold alone as compliance (§4.2, §6.2). Trade-offs are surfaced with what was given up, not smoothed to neutral — the clearest example is the per-account vs per-row honesty note (§4.2): the PRD volunteers that Mode A is a "god-key per account, decrypt-everything" model rather than hiding behind "least-visibility." That is the opposite of a PRD that balances everything.

Open Questions (§12) are genuinely open — SPIKE-1 outcome, one-PTB conflict, tamper-evidence mechanism, reference hardware, range/overflow — not rhetorical. The `[NOTE FOR PM]` at §8.2 (FR-19 is the most demo-friendly Mode B extension, revisit if Mode B lands early) sits at a real decision point.

### Findings
- **low** Single PM callout density (§8.2) — Only one `[NOTE FOR PM]` exists. For a PoC this is fine; the decisions that would otherwise need callouts are already captured as Open Questions or spike gates. No fix required.

## Substance over theater — strong

Little furniture here. The personas (Priya/Payer, Hassan/Holder, Aisha/Auditor, plus the judge as observer) each drive concrete FRs and edge cases — Priya drives the ≤7 cap and aggregate-wrap (UJ-1 → FR-2/FR-4/FR-5), Hassan drives the selected-sum-not-completeness scope honesty (UJ-2 → FR-15), Aisha drives fail-closed + audit-trail (UJ-3 → FR-11/FR-13). No persona is decorative. Four "personas" but the fourth (judge) is an observer lens, not a fifth user role — acceptable.

NFRs are not boilerplate: each carries a product-specific, testable threshold (NFR-1 "no per-recipient plaintext on-chain or via public API," NFR-6 "< 2 s warm / < 10 s proof-gen informative," NFR-7 "< 5 min re-seed"). The "Why Now" (§11) is earned by a real market-timing argument (Contra fresh on Devnet; Solana/Circle/Aleo convergence) rather than template differentiation. The no-tagging-key observation (§11, §6.2 upside) is a genuine technical insight, not innovation theater.

### Findings
- *(none — substance bar met)*

## Strategic coherence — strong

The PRD has a thesis and the features serve it. The arc is: a confidential data plane exists only to "create real encrypted activity for the rest of the system to act on" (§4.1) so that Mode A (read) and Mode B (prove) operate on genuine ciphertext, not mocks. Prioritization follows the thesis: the data plane and Mode A are Must, Mode B's differentiated path is `M*` (must-conditional-on-spike), and the genuinely deferrable items are S/C. Success metrics validate the thesis (SM-3 disclosure correctness is the Mode B proof; SM-1 is the full loop) rather than measuring vanity activity. Counter-metrics (SM-C1 honesty, SM-C2 no scope-widening) are present and directly guard the two reputational risks the thesis depends on. MVP scope kind is coherent: this is a "prove a capability end-to-end" PoC and the scope logic matches.

### Findings
- *(none)*

## Done-ness clarity — adequate (one soft NFR)

This is where downstream story creation leans hardest, and the PRD mostly holds. Every Must FR has at least one testable consequence: FR-2 ("8th recipient rejected with a clear, user-actionable message"), FR-3 ("transfer to unregistered recipient fails with actionable message"), FR-5 ("event records count+timestamp and **no amounts**"), FR-17 ("tampered X fails verification"). The demo path (§4.4) gives an explicit, orderable acceptance sequence (fund → run → claim → report → prove → verify). NFRs carry bounds, not adjectives.

Two soft spots:
1. **NFR-5 / audit-trail tamper-evidence.** NFR-5 asserts entries are append-only and "cannot be edited/deleted via the API" — that *is* testable. But Open Question §12.3 and addendum §A.2 admit the *tamper-evidence mechanism* (append-only DB vs hash-chain vs on-chain anchor) is undecided, and SM-2/SM-3 don't cover it. So "append-only via API" is testable, but "tamper-evident" (the word used in §12.3) is not yet, because the mechanism is open. This is correctly surfaced, but the FR-13 "immutable" / NFR-5 "append-only" language slightly over-claims relative to "Architect to decide." Reconcile: scope NFR-5's *testable* claim to "no edit/delete API surface" for the PoC and explicitly defer cryptographic tamper-evidence.
2. **FR-7 "claim auto-retries on the merge race"** has a clear consequence, but no bound on retry count/timeout. At demo scale this is immaterial (C7 noted), so acceptable for PoC — flagging only so the SM doesn't invent one.

### Findings
- **medium** NFR-5 "append-only/immutable" asserted as testable but mechanism is an Open Question (§5 NFR-5, §4.2/FR-13 "immutable", §12.3, addendum §A.2) — The verifiable PoC claim is "no edit/delete API surface"; true tamper-evidence is undecided. *Fix:* narrow NFR-5's testable assertion to API-surface immutability for the PoC and explicitly mark cryptographic tamper-evidence as deferred-to-Architect, so FR-13/NFR-5/SM coverage are consistent.
- **low** FR-7 retry has no bound (§4.1 FR-7) — Acceptable at demo scale per C7, but unbounded "auto-retries" is an adjective. *Fix:* note "best-effort retry, demo scale only — no SLA" so the SM doesn't over-engineer.

## Scope honesty — strong

Omissions are explicit and load-bearing. §7 Non-Goals does real work (not anonymity, not crypto impl, not derived/computed disclosures like FIFO/tax basis, not mainnet/SaaS/Travel-Rule). The `[NON-GOAL for MVP]` callout on FR-8 and the `[NOTE FOR PM]` on FR-19 mark deferrals in-line. The most important scope-honesty move — that a Mode B proof attests to a *selected* sum, **not completeness** — is stated in UJ-2, FR-15 consequences, §6.2, and §7, i.e. four times, which is correct for the claim most likely to be over-sold. De-scoping is proposed honestly (FR-18 single-amount fallback if SPIKE-1 fails) rather than done silently.

Open-items density is appropriate for the stakes: 5 Open Questions + 2 open `[ASSUMPTION]` + 1 `[NOTE FOR PM]`, on an explicitly spike-gated PoC. That is not a blocker for a hackathon green-light; it would be for an enterprise build, but the calibration here is correct.

### Findings
- *(none)*

## Downstream usability — adequate (ID/glossary hygiene)

This PRD is explicitly chain-top: it feeds the Architect (addendum), SM (epics in addendum §E), Dev, QA. So traceability matters here. Mostly it is excellent — FRs preserve SRS IDs (`SRS FRn`), NFRs likewise, constraints map to FRs in §6.1 and addendum §D, and the §E epic→story breakdown is already pre-sharded with the SPIKE-1 gate restated. Each section reads standalone via glossary terms.

However there are mechanical defects that downstream source-extraction will trip on:

1. **Constraint numbering is out of order.** §6.1 lists C1, C2, **C7**, C3, C4, C5, C6 — C7 appears third, between C2 and C3. The traceability summary (addendum §D) and §12.3 reference these by number. An out-of-order list invites a missed constraint when the SM scans sequentially.
2. **Glossary term casing drift: "Payment Run" vs "PaymentRun".** The glossary (§3) and FR-5 prose use "Payment Run"; UJ-1 climax and the §3 glossary entry itself both use the code-style `PaymentRun` event. FR-5 says "`Payment Run` event." The data model (addendum §C) uses `PaymentRun`. This is a code-identifier-vs-domain-noun ambiguity — minor, but the rubric asks for terms used verbatim.
3. **SM→FR traceability has a partial gap.** SM-1 says it validates "FR-11/12, FR-16/17" but the demo loop also exercises FR-1–FR-4 (org/recipients/register/fund) and FR-6/FR-7 (claim) and FR-21/FR-22 (role-switch/explorer) — those FRs have no SM that validates them. For a PoC that's tolerable (SM-1's loop implicitly covers them), but a strict source-extraction would find FR-1, FR-3, FR-9, FR-10, FR-13, FR-14, FR-19, FR-20(partly), FR-21, FR-22 without an explicit owning SM. NFR-4/NFR-5 are validated only via counter-metric SM-C2 / not-at-all respectively.

### Findings
- **high** Constraint list out of numerical order (§6.1: C1,C2,**C7**,C3,C4,C5,C6) — C7 is interleaved between C2 and C3; cross-refs in addendum §D and §12.3 are by number. *Fix:* reorder to C1–C7 sequential (or renumber), so sequential scanning by SM/Architect can't drop a constraint.
- **medium** Glossary casing drift "Payment Run" vs `PaymentRun` (§3, §4.1 FR-5, UJ-1, addendum §C) — domain noun vs on-chain event identifier used interchangeably. *Fix:* in the glossary, define both explicitly — "**Payment Run** (domain term); emits the on-chain **`PaymentRun`** event" — and use each form consistently.
- **medium** Incomplete SM→FR traceability (§9) — Several Must FRs (FR-1, FR-3, FR-9, FR-10, FR-13, FR-14, FR-21, FR-22) and NFR-4/NFR-5 have no SM explicitly validating them; SM-1 only enumerates FR-5/11/12/16/17/20. *Fix:* either state that SM-1's end-to-end loop implicitly validates the data-plane + platform FRs, or add the missing FR IDs to SM-1's "Validates" list so QA can build a coverage matrix.

## Shape fit — strong

The shape matches the product. Aperture is a multi-stakeholder system (Payer / Holder / Auditor-Verifier) with meaningful, divergent UX per role, so the named-protagonist UJs (Priya / Hassan / Aisha) are load-bearing, not overhead — each carries entry state, path, climax, resolution, and an edge case. This is correct for a consumer-/B2B-shaped product and not over-formalized. The PoC is correctly rigor-light where it should be (NFR-8 "demo keypairs server-side, non-production"; FR-21 "without production-grade auth") while keeping the substance bar high on the differentiated capability (Mode B). No section has been forced into a shape that fights the product. The brownfield-adjacent dependency (Contra) is handled correctly: existing primitives are cited concretely (addendum §B.1, §A.1) and the adapter-isolation discipline (C6) keeps the dependency at one layer.

### Findings
- *(none)*

## Spike-gating safety (focus area) — strong

The SPIKE-1 → Mode B gate is unambiguous and safe for downstream, which is the single most important thing for the SM/Architect here. It is stated consistently in four places with no contradiction:
- §4.3 header "spike-gated"; Mode B FRs tagged `M*` = "must, conditional on SPIKE-1" (§4 preamble defines `M*`).
- §10.1 SPIKE-1 names the *real unknowns* (does `Ciphertext.add` feed `verify_elgamal` on the pinned commit; empirically prove NFR-3 tamper-failure; measure proof-gen vs NFR-6) and the explicit fail action ("drop FR-15/FR-16, ship FR-18, reframe copy") plus the scheduling rule: "**The SM and Dev must not schedule Mode B build stories before SPIKE-1 passes.**"
- §8.1 In Scope: "Mode B … **subject to SPIKE-1**."
- Addendum §E: "**Epic 3 is gated on SPIKE-1 — do not schedule its build stories until SPIKE-1 passes**" with story 3.0 = "SPIKE-1 enabler, do first."

The fallback (FR-18 single-amount) is a real, lower-complexity floor, and the gate distinguishes existence (already confirmed in §13/addendum §B.1 — primitives exist) from integration/soundness/timing (what the spike actually closes). That distinction is important and correct: it prevents the spike from being treated as a yes/no on feasibility when the genuine risk is integration on the pinned commit. SPIKE-2 (gates FR-8, shapes FR-5) is similarly clear with a defined fallback (split into two txs). The empirical-tamper requirement ("do not assume soundness, demonstrate it") is exactly the right instruction for a security-critical NFR-3.

### Findings
- **low** FR-17 (verify) is `M*` but is reachable via the FR-18 fallback too — §4.3 tags FR-15/16/17 as `M*`, and §10.1 says on failure "drop FR-15/FR-16, ship FR-18." FR-17 (verify) is needed by *both* the aggregate and single-amount paths, so it is not truly droppable. *Fix:* clarify that FR-17 survives the fallback (verify is path-independent); only FR-15/FR-16 are the aggregate-specific casualties. Minor — §10.1 already implies this, but the `M*` tag on FR-17 reads as "droppable."

## Mechanical notes

- **Glossary drift:** "Payment Run" vs `PaymentRun` (see Downstream finding). Otherwise terms are used verbatim — "audit-trail-of-audit," "disclosure receipt," "designated auditor," "dlog table," "pending/active," "Contra," "Mode A/Mode B" are consistent across FRs, UJs, NFRs, §6, §9.
- **ID continuity:** FR-1…FR-22 contiguous, unique, no gaps. NFR-1…NFR-10 contiguous. SM-1…SM-5 + SM-C1/SM-C2 clean. UJ-1…UJ-3 clean. **Constraints C1–C7 are present but listed out of order in §6.1** (C7 interleaved) — the only ID-continuity defect, raised as a `high` because cross-refs are by number.
- **Cross-references that resolve:** §6.1 constraint→FR maps resolve; addendum §D traceability resolves; SPIKE references (§10/§12/§13/addendum §E) resolve. SM "Validates" links resolve where present but are incomplete (see §9 finding). FR "Realizes UJ-n" links resolve. NFR cross-refs (NFR-6 from FR-6, NFR-3 from FR-17, NFR-9 from FR-14) resolve.
- **Assumptions Index roundtrip (§13):** Two open `[ASSUMPTION]` entries are indexed and both point to in-text locations (§10.1/§12.5 and §1/§11). The inline `[ASSUMPTION]` at §10.2 (Contra batch mechanics not fully verifiable) maps to the §13 "§10.1/§12.5" entry by topic but the §-pointer in the index (§10.1/§12.5) doesn't list §10.2 explicitly — minor index-pointer imprecision, not a missing entry. Resolved assumptions are marked ✅ with a decision-log reference. Roundtrip is essentially clean.
- **UJ protagonist naming:** All three UJs have named protagonists (Priya, Hassan, Aisha) carrying context inline. No floating UJs.
- **Required sections for stakes/type:** Vision, Target User + JTBD + Non-Users + UJs, Glossary, Features/FRs, NFRs, Constraints, Non-Goals, MVP Scope, Success Metrics + counter-metrics, Risks/Spike-gates, Why Now, Open Questions, Assumptions Index — all present. Implementation detail correctly quarantined to addendum. Appropriate and complete for a chain-top PoC PRD.

## Fix summary (ranked)

1. **(high)** Reorder §6.1 constraints to C1–C7 sequential so no constraint is dropped on a sequential scan.
2. **(medium)** Reconcile NFR-5/FR-13 immutability language with the open tamper-evidence mechanism (§12.3): scope the testable PoC claim to "no edit/delete API surface," defer crypto tamper-evidence to Architect.
3. **(medium)** Resolve "Payment Run" vs `PaymentRun` in the glossary and use each form consistently.
4. **(medium)** Complete SM→FR traceability in §9 (either state SM-1 implicitly covers the data-plane/platform FRs, or list the missing FR IDs) so QA can build a coverage matrix.
5. **(low)** Clarify FR-17 (verify) survives the SPIKE-1 fallback — only FR-15/FR-16 are aggregate-specific casualties.

None of these block the hackathon build. Fixes 1–4 are worth doing before the SM shards stories, because downstream workflows source-extract directly from these IDs and the glossary.
