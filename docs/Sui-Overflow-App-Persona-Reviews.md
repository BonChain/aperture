# Aperture — VC / Founder / DAO Walkthroughs of the App

Three evaluators opened the **running app cold** (landing → Holder flow → Auditor lens) and reacted in character, reading the real UI copy. This captures where each gets confused, whether the app justifies *why it's needed*, the *potential* they see, and the fixes that would move them. Reviewed 2026-06-21 against the current build.

> How to read this: the **Convergence** section is what all three independently hit — fix those first. The per-persona sections keep their sharpest quotes.

---

## Convergence — what all three flagged (fix these first)

1. **The app leads with the *weakest-evidenced* use case.** The whole demo is the **Holder / Mode B** "prove a figure" journey — which the opportunity map itself marks **[BET]**. The **evidenced** value (Mode A: designated auditor console + the **audit-trail-of-audit**) is barely in the app. VC: *"you're leading the product with your weakest-evidenced use case."* Founder: *"the app demos the holder's party trick while my pain… is the part I can't actually click."* DAO: *"emphasizes the speculative half and under-shows the evidenced half."*

2. **Crypto-internals leak into user-facing copy** — worst on the Auditor lens. All three named: `"Ciphertext c1 (32 bytes hex)"`, `"Decryption handle"`, `"u64"`, `"Disclosed amount X"`, `"MIST"`, and the `a · b · z1 · z2` proof breakdown. Founder: *"a cryptographer's panel, not a compliance officer's… my auditor is an accountant."* The Holder flow is clean; that discipline didn't reach the Auditor lens (which is the *buyer's* screen).

3. **"Prove a figure" is undefined jargon.** "Figure" reads as a chart or a person; you mean **a total/amount**. It appears in the hero, cards, and every step before it's ever grounded.

4. **The Auditor lens has no plain-language explainer** — the exact screen a skeptic visits to check the claim is real. The Holder flow has a per-step "what happens & why it's safe"; the Auditor lens has none.

5. **"MIST" / "X" instead of real money.** Show `$70,000`, not `70000 MIST` / `Disclosed amount X`.

6. **The differentiator is asserted, never shown.** "Selective disclosure, **not a master key**" is the sharpest line (and TRM-validated) — but the app never *demonstrates* the contrast vs. a god-key, and the **audit-trail-of-audit doesn't appear at all**.

7. **Pick one protagonist and run the whole demo on it.** The "lender" only shows up at the payoff (*"the lender has a verified figure"*) but was never set up; the landing lists three equal use cases instead.

8. **"degraded = green Verified" integrity smell.** Showing a green **Verified** badge with *"On-chain verification unavailable — showing off-chain result only"* reads as over-claiming to someone stress-testing the demo. Use a distinct state.

---

## VC (early-stage crypto)

- **First 30s:** headline lands — *"Private from the public, provable to whoever you choose"* is a great 8-word wedge. Then the **stat strip kills momentum**: three of four "stats" are sentences, and the strongest line — **"None shipped"** ("compliance apps from the incumbents… still only exploring") — is buried as 11px caption #3. *"Lead with it."* "128 bytes" is noise to a generalist.
- **Why-needed:** the *landing copy* argues it well, but **the app never shows the pain** — you never see a compliance tool go dark or the god-key alternative. *"The app demonstrates that a proof verifies. It does not demonstrate why the world is worse without Aperture."*
- **Potential:** why-now is real and well-evidenced (Travel Rule + AMLR + unaudited devnet primitive); "first credible app" land-grab; TRM endorsing your principles. Unproven: Mode B demand ([BET]), no buyer in the loop, thin moat (app layer on someone else's primitive), devnet PoC.
- **Verdict:** *"I'd take the meeting on the market timing and the honesty, not on the demo."*

## Founder (stablecoin/token issuer — the customer)

- **First impression:** *"speaks past me."* The hero's second sentence is the **holder** story (*"prove a figure about **your** activity… **your** key"*), not the issuer's. The regulatory stat strip + "None shipped" is what grabbed them, not the headline.
- **Confusion:** *"the whole demo is the wrong persona for me… Where's my console?"* The Holder/Payer/Auditor **lens model is never explained**. The Auditor view is raw hex. *"My compliance team won't touch 256 hex chars or z1/z2."*
- **Why-needed / objections:** *"Can't I just give my designated auditor the viewing key?"* — the answer (selective disclosure, not a god-key) is right but **never demonstrated**, and the **audit-trail-of-audit (the legally load-bearing differentiator) does not appear in the app at all.** Also: *"what do I run and what does it cost me?"* is unanswered.
- **Verdict:** *"Tentative yes to a conversation, not a pilot — and that's on the regulatory framing, not the demo. Show me Mode A from my seat — designate an auditor, watch a bounded read, see the append-only log — and I'll take the pilot call."*

## DAO / grants-and-treasury (the ecosystem)

- **First impression:** conveys ecosystem relevance fast — *"break every compliance tool that assumed amounts were readable"* is the thesis in one line. **But** the framing is holder/issuer benefit; **"why Sui the ecosystem wins" is implied, never stated on screen.**
- **Confusion:** "a figure" is abstract; **"128 bytes" wastes a hero slot** on a non-technical voter; the Auditor lens is *"the most confusing surface in the app"* with zero plain-language; **"designated read only" is never defined** — the whole god-key differentiator hinges on "designated."
- **Why-needed (ecosystem):** *not obvious from the app.* It never says "this unblocks stablecoin/institutional adoption **on Sui**," never signals the verifier/SDK is **open/inspectable** (the public-good case a grants committee funds on).
- **Potential:** category ownership while uncontested; a fixed-format proof + public verifier is exactly what a **standard** forms around (the app *has* the artifact — it just doesn't frame it as one). Unproven: Mode B demand, devnet/unaudited maturity, Mode A under-built.
- **Verdict:** *"Strong, honest demo that nails the problem and the user. It under-sells the ecosystem — the exact axis a grants committee funds on."*

---

## Prioritized fix list (merged & ranked)

1. **Surface Mode A in the app** — designate an auditor, show a bounded read, and **show the append-only audit-trail-of-audit** (SRS Story 2.4/2.5). Converts the #1 differentiator from jargon into a visible, fundable, demonstrable feature. (All three.)
2. **De-jargon the Auditor lens.** Replace hex-paste + `a/b/z1/z2` with a compliance view: *"Holder proved their total = $70,000 ✓ — verified without their key."* Put raw hex / proof components / Suiscan behind a "Show technical detail" toggle. Lead the trace with the **Suiscan link**.
3. **Fix the words:** "figure" → "total/amount"; "MIST" / "X" → real currency ("$70,000"); define "designated read only" in plain words; add a one-line "what is proof-of-figure, and why not just show the number?" explainer at first use.
4. **Pick one protagonist (lender) and run the whole demo on it** — set up the lender on the landing, carry it through to the payoff.
5. **State the ecosystem payoff on the landing** (for the DAO axis): one line on *what Sui gets* + that the verifier/SDK is open/inspectable. Lead with **"None shipped / first credible"**; demote "128 bytes."
6. **Resolve the "degraded = green Verified" state** so on-chain-unavailable looks like rigor, not a gap.

> Already shipped this round (partial credit): the Holder flow now carries a **plain-language "For example —" line per stage** (the income-to-lender story), and the Auditor lens can now **fund gas via the faucet** and **submit a real, traceable transaction** to Suiscan. Items 1–6 above are the remaining high-leverage work.
