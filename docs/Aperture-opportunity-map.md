# Aperture — Opportunity Map & Pitch Research

> Audience: **Mysten Labs / Sui ecosystem** (BD + grants framing). Anchor: **EU regulation**.
> Source: deep-research run 2026-06-20 — 23 sources fetched, 25 claims adversarially verified (3-vote), **0 refuted**.
> ⚖️ **Honesty rule (carry into the deck):** mark each line **[EVIDENCED]** vs **[BET]** (positioning, not verified). Never put a [BET] on a slide as fact in front of Mysten.

---

## 0. The verified gold (use these verbatim — they're primary-sourced)

| # | Fact | Source | Tag |
|---|------|--------|-----|
| 1 | **EU Travel Rule (Reg (EU) 2023/1113)** binds **ALL CASPs** to collect/transmit full originator + beneficiary identity on **every** crypto transfer, **ZERO value threshold** (stricter than FATF's $1,000), fully applicable since **30 Dec 2024**. | europarl / Freshfields / amlbot | [EVIDENCED] |
| 2 | **EU AMLR (Reg (EU) 2024/1624)**, applicable **~July 2027**, brings **all CASPs** into AML scope (vs 2 types before) and **bans anonymous crypto accounts at regulated institutions** — but **not** self-custody/P2P. | Freshfields / BeInCrypto (Circle) | [EVIDENCED] |
| 3 | Privacy-payments field is documented as moving **toward auditability + selective disclosure**, with AML/CFT as the explicit driver. Source's *own words*: "auditability and **selective disclosure**." | Bank of Italy survey, ACM DLT (peer-reviewed) | [EVIDENCED] |
| 4 | Sui confidential transfers are **public beta on Devnet (8 Jun 2026)**, **Testnet "later this year,"** explicitly **unaudited / not production-ready**. | blog.sui.io (primary) | [EVIDENCED] |
| 5 | Mysten is **collaborating with Bridge** (Stripe-owned, issuer of USDsui) to explore confidential flows incl. **compliance considerations**. | blog.sui.io | [EVIDENCED] — but "explore" = early; **don't claim a closed partnership** |
| 6 | **TRM Labs and Merkle Science are only *exploring*** how monitoring/investigations work under encryption — **none have shipped** a confidential-transfer compliance product. | blog.sui.io / crypto.news | [EVIDENCED] for TRM+Merkle. ⚠️ **Chainalysis is NOT named — don't cite these for Chainalysis** |
| 7 | **TRM Labs whitepaper (Feb 2026):** "The policy question is no longer privacy versus compliance" — it's which privacy regime + compliance model meets all stakeholders' needs. **Rejects anonymity, endorses selective disclosure.** | trmlabs.com (primary) | [EVIDENCED] — category endorsement, **not** a product endorsement |
| 8 | TRM: for disclosed data to be **legally usable** it must be **tamper-evident (crypto signatures + append-only logs) with documented chain of custody.** | trmlabs.com | [EVIDENCED] — validates your **audit-trail-of-audit** as legal-grade |
| 9 | TRM: **issuer-held / single-key escrow disclosure = concentration risk** ("issuer breach = all users exposed"); recommends threshold/MPC. | trmlabs.com | [EVIDENCED] — independent support for **"selective disclosure, not god-key"** |
| 10 | **Aztec PrivPNL** = browser ZK "proof of private P&L," uses **recursive ZK ("Chonk")**. Proves the proof-of-figure category is real and demand-validated. | aztec.network (primary) | [EVIDENCED] that Aztec *uses* recursive ZK. **[BET]** that it "doesn't port to Sui" / that homomorphic is *superior* |
| 11 | **Aleo** view-key spectrum: **AVK** reveals *all* account activity (broad god-key style); **TVK** decrypts *one* transaction. | aleo.org (primary) | [EVIDENCED] — the disclosure-granularity spectrum your Mode B differentiates against |

---

## 1. Opportunity map (per stakeholder)

### A. Token issuers / operators (the payers)
- **Pain:** EU Travel Rule (zero-threshold, every transfer) + AMLR (all CASPs, anonymity ban at institutions) make traceability/disclosure **legally non-optional** — and confidential transfers **break the stack that assumed amounts were readable**. [EVIDENCED #1,#2]
- **How Aperture captures it:** Mode A gives the issuer a designated-auditor console that restores legal-grade disclosure *without* turning privacy off.
- **Design partner:** **Bridge/USDsui** is a real, named exploratory target in the Sui ecosystem — but frame as "Mysten is exploring this with Bridge," not "Bridge is our partner." [EVIDENCED #5]

### B. Regulators (EU-anchored)
- **What they actually need:** traceability + disclosure-on-order + tamper-evident records — **not** the ability to see everything always. The selective-disclosure direction is *the* regulatory trajectory. [EVIDENCED #1,#2,#3,#7]
- **How Aperture captures it:** "provable to whoever you choose" = disclosure-on-order; audit-trail-of-audit = the tamper-evident chain of custody TRM says legal use *requires*. [EVIDENCED #8]
- **Sharp line for the deck:** *"We're not asking regulators to trust privacy — we give them selective disclosure, which is exactly the direction EU AMLR 2027 and FATF are already moving."*

### C. Chain / ecosystem (Mysten & Sui) — **your primary audience**
- **The strategic gap:** Mysten shipped a powerful privacy primitive that **breaks compliance tooling**, and the incumbents they invited (TRM, Merkle) are **still only exploring** — no one has shipped the compliance layer that institutional/stablecoin adoption needs. [EVIDENCED #4,#6]
- **The wedge:** Aperture is the **first credible compliance/disclosure app on the primitive** — the missing piece between "cool privacy feature" and "stablecoin issuers can actually use it." [EVIDENCED for the gap; "first credible app" is a fair claim given no shipped competitor]
- **The ask logic:** fund/partner with the category leader *now*, while it's devnet and the relationship is uncontested.

### D. End users / holders (Mode B)
- **Value:** prove income/payroll/tax total to a lender or tax authority **without exposing full balance or which payments** — selective disclosure as a user right.
- **Evidence status:** **[BET / analogy]** — direct demand data is thin; the strongest proxy is **Aztec PrivPNL's own "prove capital gains to a tax authority"** use case, which validates the *category* of consumer demand. [EVIDENCED #10 as analogy]

### E. Auditors / compliance firms (Mode A users)
- **Value:** designated, bounded, fully-logged reads (the "audit of the audit").
- **Killer alignment:** **TRM Labs — a would-be competitor — independently validates your exact design principles**: selective disclosure over anonymity (#7), tamper-evident append-only logs for legal use (#8), and anti-concentration / anti-god-key custody (#9). Partner-or-compete tilts toward **"we're the application layer they plug into,"** since they're tooling, not shipping apps.

### F. Investors / market
- **Business model logic:** "compliance is legally non-optional" is **well-supported** (Travel Rule + AMLR). [EVIDENCED #1,#2]
- **⚠️ Gap:** **TAM figures, comparable raises, and pricing benchmarks did NOT survive verification** — this segment is under-evidenced. Don't fabricate a number; either source it properly or keep the investor slide qualitative. (See Gaps.)

---

## 2. Pitch narrative arc (Mysten/ecosystem framing)

1. **Mysten shipped confidential transfers** — a category-defining privacy primitive (public beta, Jun 2026). [#4]
2. **…but it breaks compliance** — the tooling that assumed readable amounts goes dark, and that's the **blocker to stablecoin/institutional adoption** Mysten actually wants. [#1,#2,#6]
3. **The incumbents aren't there** — TRM and Merkle are *exploring*, not shipping; the compliance layer is **wide open**. [#6]
4. **Aperture is the first credible one** — Mode A (designated, legal-grade disclosure) + Mode B (prove a figure, no god-key), built to the exact principles TRM itself published. [#7,#8,#9]
5. **Network effect → category lock-in** — become the default audit/disclosure layer; more issuers → auditors learn the format → it sets the standard.
6. **The ask** — back the category leader now, intro to one confidential-token issuer, Mysten's eyes on the disclosure model.

---

## 3. Slide-ready bullets (paste-in, with tags)

**Problem (S2)**
- EU Travel Rule: identity data on **every** crypto transfer, **zero threshold**, in force since Dec 2024. Confidential transfers blind it. [EVIDENCED]
- The shipped auditor model is god-key — and **TRM Labs warns single-key disclosure = "issuer breach = all users exposed."** [EVIDENCED]

**Why Now (S3)**
- Confidential transfers: **public beta Jun 8 2026, testnet later this year** — the compliance layer is being built *now* or not at all. [EVIDENCED]
- **EU AMLR clock: July 2027** — all CASPs in AML scope, anonymous institutional accounts banned. [EVIDENCED]
- TRM + Merkle invited by Mysten — **still only exploring.** No one has shipped. [EVIDENCED]

**Solution (S4)**
- The field's "third generation" balances privacy with **auditability + selective disclosure** — Aperture *is* that generation, on Sui. [EVIDENCED — Bank of Italy]

**Defensibility (S6)**
- **TRM Labs (a competitor) validates our thesis:** "no longer privacy versus compliance" — selective disclosure + governance is the answer. [EVIDENCED]
- Aztec proved the proof-of-figure category — but on **recursive ZK**; Aleo leans on **broad view-keys (AVK reveals everything).** Aperture's selected-sum, no-god-key model sits where TRM says the market should be. [EVIDENCED for competitors' designs; **superiority = [BET]**]

**Regulatory tailwind (NEW slide — strongly recommended)**
- Travel Rule (in force) + AMLR (2027) + FATF + Bank of Italy + TRM **all point the same way: selective disclosure, not anonymity.** Aperture is built on that exact line. [EVIDENCED]

**Stats worth a slide**
- "**Zero-threshold** Travel Rule — every transfer, no minimum." [EVIDENCED]
- "**0** shipped confidential-transfer compliance apps from the incumbents Mysten invited." [EVIDENCED that TRM/Merkle are exploring; the "0" is fair but is absence-of-evidence — phrase as "none shipped yet"]

---

## 4. Deck-change map (which slide each finding upgrades)

| Slide | Add / strengthen with |
|-------|----------------------|
| S2 Problem | #1 Travel Rule zero-threshold · #9 TRM god-key critique |
| S3 Why Now | #4 Sui beta dates · #6 TRM/Merkle still exploring · #2 AMLR 2027 clock |
| S4 Solution | #3 Bank of Italy "third generation" framing |
| S6 Defensibility | #7 TRM category endorsement · #10 Aztec recursive-ZK · #11 Aleo view-keys |
| **NEW: Regulatory Tailwind** | #1 #2 #3 #7 stacked — primary-sourced, very credible to Mysten |
| S7 Business Model | #1 #2 "legally non-optional" (TAM still a gap) |
| S8 GTM | #5 Bridge (as *exploratory*) · #6 Mysten courting TRM/Merkle |
| S10 Ask | needs a concrete grant-program citation (gap) |

---

## 5. Gaps & honesty flags (fix before you present)

**Positioning bets — keep them as belief, not fact:**
- "No incumbent has *any* working confidential-transfer compliance app" → say **"none shipped yet"** (absence of evidence).
- Mode B homomorphic is *technically superior to* Aztec recursive-ZK / Aleo keys → **unverified**; claim *"lighter-weight, no recursive circuits,"* not *"better."*
- Aztec's architecture "doesn't port to Sui" → **unverified**; soften to *"different chain, different primitives."*
- TRM/Aleo **never name or endorse Aperture** — category-level support only. Don't imply endorsement.

**Under-evidenced — needs dedicated sourcing:**
- ~~Investor/market: TAM, comparable raises~~ → **now filled, see §6** (with REFUTED numbers flagged).
- ~~Mysten/Sui grant program~~ → **now filled, see §6** (real pathways found; the "$50M" is a 2023 recycle — do NOT use).
- **Contra's native per-account auditor "god-key":** asserted in your framing but **not independently verified** — confirm from Sui docs before you contrast against it on a slide.
- **End-user Mode B demand:** rests on the Aztec tax-authority analogy, not direct demand data.

**Nomenclature:** **No public source calls the primitive "Contra"** — that's your internal name. On public/Mysten-facing slides, say **"Sui confidential transfers,"** cite the timeline, not the codename.

---

---

## 6. Investor & Ask slides — follow-up research (2026-06-20, pass 2)

> 18 claims confirmed, **7 killed**. The killed numbers are listed at the bottom — **do not let them onto a slide.**

### 6.1 The Ask slide (Sui/Mysten funding pathways)

**Real, current pathways Aperture can target [EVIDENCED]:**
| Program | What it is | Fit for Aperture |
|---------|-----------|------------------|
| **Hydropower accelerator** | Sui Foundation's official accelerator, **no equity taken up front**, ~8-week cohorts of 12 teams (Cohort 1 Jan 2025). | ✅ Strong fit — concrete, equity-free pathway to name in the ask. |
| **RFP grant program** (launched 4 Mar 2024) + **Direct Strategic Investment** | Structured apply → committee review → signed grant agreement; Direct Investment for teams building **core primitives / ecosystem-wide apps.** | ✅ Best fit for a compliance/infra layer — but RFPs are scoped to Foundation-defined challenges, so timing depends on an open matching RFP. |
| **DeFi Moonshots** | Up to **$500k in liquidity incentives** + DeFi engineering support. | ⚠️ It's **liquidity incentives for DeFi *protocol* teams**, not a cash grant — Aperture is infra, **don't claim you're squarely eligible.** |
| **Academic Research Award** | **$25k.** | Minor; mention only if relevant. |

> Source: sui.io/programs-funding (primary), blog.sui.io/grants-rfp-process, blog.sui.io/12-teams...hydropower
> **How to use it:** ask for **Hydropower / Direct Strategic Investment**, not "a grant from the $50M fund."

**🚨 THE $50M TRAP — [REFUTED as current funding]:**
The "$50M Sui grants (Feb 2026)" article (theweal.com) is a **recycled re-date** of the Sui Foundation's **October 2023** reallocation of 117M SUI (~$50.3–51.3M, reclaimed from market makers → DeFi grants/DeepBook). The 2023 event is real; the **"new $50M fund in 2026" framing is false.** The official Programs page lists **no aggregate grant-pool total at all.** → **Never put a $50M Sui grant figure on a slide as current.**

### 6.2 The Investor slide (market + comps)

**Safe to use [EVIDENCED / labelled]:**
- **Stablecoin TAM (your customers):** JPMorgan (Jul 2025, conservative) — **~$250B today → $500B by 2028**; bullish $1–2T calls deemed "too optimistic" (Standard Chartered's $2T = the upside case). Label *conservative bank forecast*. [EVIDENCED]
- **RegTech market:** **~$19–24B in 2025, ~16–23% CAGR** (Precedence / Fortune Business Insights / IMARC). Present as a **range**, label **[SECONDARY/ESTIMATE]**. (The "$85.48B by 2035" endpoint was **REFUTED** — drop it.)
- **Comparable raises (label as historical anchors):**
  - **Chainalysis** — **$8.6B valuation** at $170M Series F (2022); **~$537M raised** across 11 rounds; fresh Series F Oct 2025. The compliance category leader. [EVIDENCED, valuation 2022-dated]
  - **Aleo** — **$200M Series B at $1.45B valuation** (2022) — marquee privacy/ZK comp. [EVIDENCED, 2022-dated]

> **How to use it:** Frame as *"compliance is a multi-billion category (Chainalysis $8.6B, RegTech ~$20B) and stablecoins — our paying customers — go $250B→$500B by 2028. We're the compliance layer for the confidential slice of that flow."*

**🚫 REFUTED — DO NOT USE ON ANY SLIDE:**
- Crypto-compliance/blockchain-analytics market sizing from GII Research ($2.90B 2025 → $14.63B 2032, 26% CAGR) — **all killed.**
- RegTech "$85.48B by 2035" endpoint — killed.
- Crypto-security market "$2.2B 2023 → $16.7B 2033" — killed.

**Still-open gaps (not found / not verified — leave qualitative):**
- A credible standalone **crypto-compliance / blockchain-analytics** market size (GII was the only one and it's refuted).
- 2024–2026 raises for **TRM Labs, Elliptic, Merkle Science, Aztec, Zcash/ECC** — not verified (only Chainalysis + Aleo survived, both 2022).
- **Pricing benchmarks** (open-core / per-issuer / per-proof) — only blog-quality sources; don't cite a number.

---

## 7. Paste-ready slide copy

### NEW SLIDE — "REGULATORY TAILWIND"  (place right after S3 "Why Now")

**REGULATORY TAILWIND**
*The law is already moving toward selective disclosure — exactly what Aperture is built on.*

- **The Travel Rule is live.** EU Reg 2023/1113 — identity data on **every** crypto transfer, **zero threshold**, in force since Dec 2024. Confidential transfers blind it.
- **The 2027 clock is ticking.** EU AMLR (Reg 2024/1624) pulls **all** CASPs into AML scope and bans anonymous accounts at regulated institutions — compliance is **legally non-optional** for issuers. *(Self-custody untouched.)*
- **Not anonymity — auditability.** Peer-reviewed research (Bank of Italy) finds privacy payments are moving to *"auditability and selective disclosure."*
- **Even the incumbents agree.** TRM Labs: *"the question is no longer privacy versus compliance"* — they endorse selective disclosure over anonymity.

> **Aperture is built on that exact line: private from the public, provable to whoever you choose.**

`Sources: EU Reg 2023/1113 (Travel Rule) · EU Reg 2024/1624 (AMLR, 2027) · Bank of Italy / ACM DLT survey 2026 · TRM Labs whitepaper, Feb 2026`

*Speaker note:* AMLR does **not** ban self-custody or P2P — it targets CASPs. The point isn't "regulators will force this," it's "the regulatory direction is selective disclosure, and Aperture restores compliance **without turning privacy off.**"

---

### REVISED SLIDE — "ROADMAP & ASK" (replaces S10's ask)

**ROADMAP & ASK**
*What we ship, and what we need.*

- **Now — Devnet PoC.** End-to-end demo: Mode A console + Mode B proof-of-figure that verifies on-chain.
- **Next — Testnet.** Harden the proof layer; land the first design-partner issuer; Travel-Rule disclosure flow.
- **Then — Mainnet.** Open-core launch; become the default audit/disclosure layer for confidential tokens on Sui.

**The ask**
- **A place in Hydropower or Direct Strategic Investment** — Sui's equity-free accelerator / core-infra investment track.
- **An intro to one confidential-token issuer on Sui** — a stablecoin issuer already exploring confidential flows.
- **Mysten's eyes on the disclosure model** — so the compliance layer is designed *with* the primitive, not bolted on after.

`Sources: Sui Foundation Programs & Funding (Hydropower · RFP · Direct Strategic Investment), sui.io/programs-funding`

*Speaker note:* Do **not** cite a "$50M fund" (that's a recycled 2023 number). Hydropower is **equity-free**. Don't name DeFi Moonshots — it's liquidity incentives for DeFi *protocol* teams, not infra like us.

---

### Source list (verified)
- EU: europarl.europa.eu (Travel Rule summary) · freshfields.com (AMLR) · amlbot.com · beincrypto.com
- Academic: arxiv.org/pdf/2505.21008 (Bank of Italy)
- Sui: blog.sui.io/confidential-transfers-public-beta · crypto.news
- Competitive: trmlabs.com (on-chain privacy & compliance) · aztec.network · aleo.org
- Funding/market (pass 2): sui.io/programs-funding · blog.sui.io/grants-rfp-process · coindesk.com (JPMorgan stablecoin) · precedenceresearch.com (RegTech) · research.contrary.com (Chainalysis) · businesswire.com (Aleo Series B) · decrypt.co (Sui 2023 fund)
