# Aperture — Evaluator Personas & Demo Re-Review

**Purpose:** define the *behavior* of the three people Aperture pitches to — the **Hackathon Judge**, the **Chain / Ecosystem (Mysten / Sui BD)**, and the **VC** — then re-review the updated demo (post-2026-06-21 fixes) through each lens.

How to use this doc: rehearse the demo with one persona's rubric open at a time. If you can survive all three sections in **Part B**, you're ready to record.

---

## Part A — Persona behaviors

Each persona is written so you can *role-play* it: what they optimize for, what makes them lean in, what makes them check out, the literal questions they ask, and how they score.

---

### Persona 1 — The Hackathon Judge (Mysten / Sui technical reviewer)

**Who they are.** A protocol engineer or DevRel who knows confidential transfers cold. They watch 40+ submissions. They've seen every "we put X on Sui" deck. They are allergic to hand-waving and they *will* read your repo.

**Optimizes for:** does it actually work, and do you understand *why* it works. Signal over polish.

**Leans in when:**
- The crypto narration is correct and specific (Twisted ElGamal, Ristretto255, Fiat-Shamir, byte sizes) — and matches what the code does.
- You show the thing running, not slides about the thing.
- You name the exact Sui primitive you build on and where your code touches it (`verifier::verify_aggregate` → confidential-transfer NIZK verify).
- You volunteer your limitations before they ask.

**Checks out when:**
- A claimed "on-chain" moment doesn't produce an on-chain artifact. Instant vaporware flag.
- Buzzwords without a referent ("we use ZK") when the repo shows something else.
- A demo step that visibly doesn't do what the narration says (e.g. a disabled button you talked over).
- Dead infrastructure (a retired explorer, a broken link) — reads as "they didn't run this recently."

**Questions they ask (rehearse answers):**
- "Where exactly is the proof verified, and can you show me the transaction or the test?"
- "What's the 65,535 bound — protocol limit or UI choice? What happens above it?"
- "Is the key really client-side? Show me."
- "What's mocked right now and what's real?"
- "What did you *not* build?"

**Scoring lens (their internal rubric):** Working demo (30) · Technical depth & correctness (25) · Sui-primitive integration (20) · Problem/market (15) · Honesty & polish (10). They forgive narrow scope; they do not forgive a claim that collapses on inspection.

---

### Persona 2 — The Chain / Ecosystem (Mysten Labs / Sui Foundation BD)

**Who they are.** Strategy/BD. Less interested in your Ristretto math, intensely interested in *whether you unblock adoption of the primitive they just shipped*. They think in ecosystem gaps, design-partner fit, and category ownership.

**Optimizes for:** "does this make confidential transfers more adoptable by the issuers and institutions we want?" They want a credible *first* compliance/disclosure app on the primitive.

**Leans in when:**
- You frame Aperture as the **missing layer** between "cool privacy feature" and "a stablecoin issuer can actually use it."
- You cite the real regulatory drivers (Travel Rule in force, AMLR 2027) accurately and sourced.
- You point at a concrete ecosystem path (Hydropower, Direct Strategic Investment) and a realistic design-partner shape (an issuer *exploring* confidential flows — framed as exploratory, not a closed partnership).
- You show you'd design *with* the primitive, not bolt on after — i.e. you want their input.

**Checks out when:**
- You over-claim partnerships ("Bridge is our partner") or endorsements ("TRM endorses us"). They know the real state and it damages trust instantly.
- You position as a competitor to the primitive instead of a complement to it.
- You cite stale or recycled ecosystem facts (the "$50M fund" 2023 recycle) — signals you didn't do the homework.
- The thing can't survive a live demo — BD still has to believe the team ships.

**Questions they ask:**
- "Who's the first issuer that uses this, and what do you need from us to get there?"
- "How is this different from the god-key auditor model already in the primitive?"
- "Is this a feature Mysten should just absorb, or a real standalone layer?"
- "What's your ask, specifically?"

**Scoring lens:** Ecosystem-gap fit · Adoption-unlock potential · Category-ownership credibility · Team-can-ship signal · Cleanliness/accuracy of the regulatory & partnership claims. They fund *positioning backed by a working wedge*, and they punish hype.

---

### Persona 3 — The VC

**Who they are.** Early-stage investor. Pattern-matches on team, market, and whether the demo proves the team can build the hard part. Sees the deck *and* the demo. Thinks in TAM, moat, and "why this team, why now."

**Optimizes for:** a big, legally-driven market + a defensible wedge + a team that's honest about what's real. Honesty is itself a diligence signal — overclaimers are a future-blowup risk.

**Leans in when:**
- "Compliance is legally non-optional" lands with primary sources (Travel Rule + AMLR), and the market is framed as multi-billion without fabricated precision.
- The product *does the hard thing* live — prove-a-figure end to end — so the technical risk is visibly retired.
- The moat story is coherent: first-credible-app + becomes-the-disclosure-format + network effect.
- The team flags bets as bets ([BET] vs [EVIDENCED]) — reads as low-ego, high-rigor.

**Checks out when:**
- TAM is a made-up number, or comps are stale/unlabeled (the refuted GII/RegTech-endpoint figures).
- The headline demo doesn't actually demonstrate the headline capability (e.g. a threshold the product can't reach).
- "First" / "best" claims that don't survive a single follow-up.
- No crisp ask, or an ask tied to a phantom fund.

**Questions they ask:**
- "Show me the product doing the one thing that matters." (the proof, end to end)
- "What's actually defensible here in 18 months?"
- "What's your real number for the market — and which part is a bet?"
- "What breaks if Mysten just builds this themselves?"

**Scoring lens:** Market pull · Team credibility & honesty · Technical de-risking shown live · Moat plausibility · Ask clarity. A clean, honest, *working* 3-minute demo beats a glossy one with a hole in the middle.

---

## Part B — Re-review of the UPDATED demo

Applying each persona to the demo *after* the 2026-06-21 fixes (threshold 50,000 → 45,000 so a valid in-bound selection clears it; Scenes 3 & 5 re-scripted to off-chain-in-browser + on-chain-in-test-suite; explorer switched to Suiscan; all 231 web tests green).

### Through the Judge's eyes

- **Scene 4 now works.** Selecting Salary 40,000 + Bonus 8,000 = 48,000 ≥ 45,000 is reachable; the running total updates; the proof generates for real. The dead-zone trap is gone. ✅
- **The bounded-range beat is now an asset.** Instead of talking over a disabled button, you *explain* it ("single figure proves a bounded range; larger sums split"). That answers the judge's "what's the 65,535 bound?" question before they ask. ✅ — but **rehearse the honest answer to the follow-up**: it's a UI guard (`SelectEntries.tsx`), and the proof system itself handles larger aggregates (the on-chain suite verifies a 2-entry sum > 2¹⁶). Say that plainly if pushed.
- **The on-chain claim now has an artifact.** Scene 5 points at `pnpm test:spike:onchain` (6 tests on devnet) instead of a UI tx that never appears. The "On-chain verification unavailable" caption is narrated, not hidden. No vaporware flag. ✅
- **Explorer is live.** Suiscan resolves; suiexplorer.com would have read as stale. ✅
- **Residual risk:** the on-chain proof is a *terminal*, not the browser. A strict judge may still want to *see* a devnet tx digest. **Mitigation:** if you can, run `pnpm demo:onchain` beforehand and show the deployed `aperture::verifier` package page on Suiscan during Scene 5.

**Verdict:** Passes. The two collapse-on-inspection holes are closed. Score moves from "fails the working-demo criterion" to "narrow but honest and real."

### Through the Chain / Ecosystem's eyes

- **Positioning is unchanged and strong** — first credible compliance/disclosure app on the primitive, regulatory drivers sourced, ask is concrete (Hydropower / Direct Strategic Investment). ✅
- **The honesty repair compounds the BD trust story.** Scene 5 no longer overclaims an on-chain capability — consistent with the deck's "don't claim closed partnerships / don't recycle the $50M" discipline. A BD reviewer reading both will see a team that says only what's true. ✅
- **The bounded-range framing reinforces "selective, not god-key,"** which is exactly the differentiation against the primitive's built-in auditor model they'll probe. ✅
- **Watch:** keep Scene 3's optional Suiscan step framed as "the deployed module / a real confidential transfer," never as "our live compliance partner." Stay on the exploratory side of every partnership claim.

**Verdict:** Funds-the-positioning case intact, and the working wedge now survives the live demo. Improved.

### Through the VC's eyes

- **The headline capability is now demonstrated.** Before, the product literally could not prove the number the lender asked for — a hole exactly where the technical risk lives. Now the prove-a-figure flow runs end to end and clears the threshold. The single most important thing a VC needs to see is present. ✅
- **Honesty signal is strong.** Off-chain-in-browser / on-chain-in-suite is stated plainly; the demo guide carries an explicit "Things to NOT say" guardrail. Low-ego, low-blowup-risk. ✅
- **Market story is sourced and labeled** (Travel Rule + AMLR evidenced; TAM kept qualitative per the opportunity map's killed-numbers list). ✅
- **Residual risk they'll name:** "what breaks if Mysten builds this?" — answer with the category-ownership/network-effect arc and the design-partner ask, not with a technical moat claim you can't defend.

**Verdict:** The de-risking-shown-live box is now ticked. A clean, honest 3-minute demo with the hard part working — fundable conversation.

---

## One-line summary per persona

- **Judge:** "It's narrow, but everything it claims is real and inspectable." → pass.
- **Chain:** "First credible disclosure layer on our primitive, and the team only says true things." → worth a Hydropower/DSI conversation.
- **VC:** "The hard part works live and they're honest about the rest." → take the meeting.

---

## Pre-record checklist (derived from the above)

- [ ] **Slush** installed, unlocked, set to **devnet** (no SUI needed — signing is free).
- [ ] `pnpm demo` opens the **landing page**; "Enter the demo →" leads to the Holder with the step rail.
- [ ] Step 1 **Connect**: "Sign to unlock →" triggers the Slush popup; approving advances the rail.
- [ ] Acme Lender shows **≥ 45,000 MIST**.
- [ ] Scene 4: Salary 40,000 + Bonus 8,000 = **48,000** generates a **128-byte** proof in < 1s; Consulting 30,000 greys out (explain the bound).
- [ ] You can explain the **65,535 bound** as a UI guard (proof system handles more).
- [ ] Scene 5: the proof auto-hands to **Verify** inline → green **Verified** → **Done ✓**; you narrate the "off-chain only" caption honestly.
- [ ] Terminal ready: `pnpm test:spike:onchain` → **6 passing** (devnet up) *or* `pnpm --filter web test src/demo.test.ts` (offline backup).
- [ ] **Suiscan devnet** (`https://suiscan.xyz/devnet`) loads; no suiexplorer.com anywhere.
- [ ] You can answer all three personas' lead questions in one breath each.

> **Redesign note (2026-06-21):** the demo is now a guided flow — front-door landing → real Slush connect/sign → numbered rail (Connect → Select → Generate → Verify → Done) with the proof handed straight to an inline verify (no lens-switching). This closes the two dead-ends a judge would have hit: a non-clickable sign button, and a proof that went nowhere after "ready." All 232 web tests + lint + build green.
</content>
</invoke>
