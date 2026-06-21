# Aperture — Competitive Landscape (confidential compliance / selective disclosure)

> Deep-research run 2026-06-22 · 22 sources fetched, 91 claims extracted, **25 adversarially verified (3-vote), 24 confirmed / 1 refuted**.
> Honesty rule: each line tagged **[VERIFIED]** (survived 3-vote) · **[SOURCED]** (a source returned it but it wasn't in the verified top-25) · **[UNVERIFIED/GAP]** (could not confirm this run).

---

## TL;DR — the three things that matter

1. **Aperture's exact niche is empty. [VERIFIED]** "Prove a *sum/aggregate* over chosen encrypted entries, without surrendering a decryption key" is offered by **none** of the players surveyed. Everyone else falls into one of two buckets:
   - **(a) key-disclosure / decrypt-and-reveal** — Aleo view keys, Zcash viewing keys, Sui's auditor keys. The verifier gets *read access to the underlying entries*.
   - **(b) membership / origin proofs** — Privacy Pools association sets. Proves *where funds came from*, not a *number*.
2. **You're built on the same primitive as Sui itself, and it's academically grounded. [VERIFIED]** Twisted ElGamal on Ristretto255 + ZK proofs — the exact stack in `vendor/contra` and in the peer-reviewed **PGC / ADCP paper** (ePrint 2019/319), whose whole thesis is "a middle ground between privacy and auditability." So you're not betting on unproven crypto; you're differentiating at the *disclosure-semantics* layer.
3. **Your single biggest risk is soundness, and there's a recent cautionary tale. [VERIFIED]** The **June 2025 Solana "Phantom Challenge" bug** was a missing Fiat-Shamir transcript absorption in the *same NIZK family* you use — it let an attacker forge proofs (arbitrary mint/burn). **Get Aperture's proof code independently audited before any compliance claim.**

---

## By project

### Key-disclosure models (the "give them a key" camp Aperture positions against)

**Aleo — view-key spectrum. [VERIFIED]**
- *What:* Account View Key (AVK) = read-only visibility into **all** account activity, past *and* future (no spend). Transaction View Key (TVK) = decrypts **one** transaction's private inputs/outputs.
- *vs Aperture:* pure decrypt-and-reveal — you surrender entry-level read access. **No native way to prove an aggregate without revealing entries.** (Caveat: Aleo is general-purpose zkSNARK/Leo, so a dev *could* hand-write an aggregate program — but it's not a product feature.)
- *Funding:* **[SOURCED]** ~$200M raise (Series B, 2022, ~$1.45B valuation per prior research) — not re-verified this run.
- Source: aleo.org/post/aleo-view-key-compliance, docs.aleo.org

**Zcash / Electric Coin Co — viewing keys. [VERIFIED]**
- *What:* a viewing key discloses **all** transactions for a shielded address (value, memo, target), read-only, spend key stays offline. Narrowest tool ("payment disclosure") is still **per-transaction**.
- *vs Aperture:* full-account decrypt-and-reveal; even its finest granularity is one tx, never a selected sum.
- Source: electriccoin.co/blog/viewing-keys-selective-disclosure

**Mysten Labs / Sui confidential transfers — the primitive you build on. [VERIFIED]**
- *What:* balances & amounts encrypted on-chain; **sender, receiver, token type, timestamp stay public** (metadata is *not* hidden). Twisted ElGamal/Ristretto255 + Bulletproof range proofs. Public beta **June 8, 2026** on devnet.
- *Auditor model:* **issuer-controlled key-disclosure**, not one global god-key. Issuers set policy; designated auditor keys **decrypt** balances when required; **issuers retain freeze/seize**. Disclosure is "deliberate, purpose-bound, auditable."
- *vs Aperture:* this is exactly the key-surrender model you contrast against. **Caveat from the research:** "god-key" slightly overstates it — it's *per-issuer/per-asset*, not network-wide. Recommend you say **"per-issuer auditor key / key-disclosure"** rather than "god-key" to stay accurate.
- *Note that explains your 65,535 cap:* twisted-ElGamal **decryption requires solving a discrete log**, so it only works over a small message space. That decrypt-side limit is almost certainly why the UI capped sums — worth confirming it bounds your max provable figure.
- Source: blog.sui.io/confidential-transfers-public-beta, crypto.news, `vendor/contra`

### Membership / origin proofs (ZK, but proving a different predicate)

**Privacy Pools (Buterin, Soleimani, et al., 2023; 0xbow). [VERIFIED]**
- *What:* publish a ZK proof that your funds **do / don't** originate from known (un)lawful sources, via membership/exclusion in curated "association sets" — without revealing your transaction graph. Framed as "prove regulatory compliance without revealing your entire history."
- *vs Aperture:* closest in *philosophy* (selective, no full reveal) but proves **provenance/origin**, not a **numeric aggregate**. Complementary, not competing. ("Lawfulness" is delegated to whoever curates the set.)
- Source: SSRN 4563364, ScienceDirect

### Compliance-analytics vendors (potential partners, not apps)

**TRM Labs — the category-definer. [VERIFIED]**
- *What:* their **Feb 19, 2026 whitepaper** reframes the debate from "privacy vs compliance" to *"which privacy regime + compliance model + governance."* It evaluates **five** disclosure regimes: transaction view keys, address view keys, set-membership proofs, asset view keys, allow-lists.
- *Strategic gold + risk:* **there is NO "selected-sum / prove-an-aggregate" category in TRM's taxonomy.** That's your sharpest positioning evidence — *and* your biggest market-education burden (you must teach a category the leading analyst doesn't yet name).
- *Compliance-under-encryption in practice:* on Canton, TRM reads private data via a **TEE** + observer roles ("only the information required"). Conceptually adjacent to your minimize-disclosure goal, but hardware/role-based, not a NIZK.
- *Funding:* **[SOURCED]** Fortune (Feb 2026) reports a TRM Series C / unicorn round with Goldman — not re-verified this run.
- Source: trmlabs.com/reports-and-whitepapers/on-chain-privacy-and-financial-compliance

**Chainalysis & Merkle Science. [UNVERIFIED/GAP]** Surveyed but produced **no surviving verified claims** about a *selective-disclosure-under-encryption* capability. One Chainalysis claim (Travel-Rule = full-PII disclosure to counterparty, no crypto selective-disclosure) was **REFUTED 1-2** — so don't assert it. Prior research had Chainalysis at ~$8.6B valuation / ~$537M raised (2022); treat as background, not fresh.

### FHE peers (different paradigm)

**Zama / fhEVM (and Fhenix / Inco). [VERIFIED — tech only]** Core tech is **fully homomorphic encryption** — compute over ciphertext in smart contracts. A different paradigm from your NIZK-over-homomorphic-ciphertext sum-proof. (Funding/positioning not verified this run.)

---

## Comparison table

| Project | What it does | Proof / disclosure technique | Granularity | Chain | Funding (confidence) | Regulatory framing |
|---|---|---|---|---|---|---|
| **Aperture** | Prove a *total* over chosen encrypted entries, no key handover | Twisted ElGamal NIZK (Ristretto255, Fiat-Shamir), homomorphic sum | **Selected-sum** | Sui | n/a (PoC) | "selective disclosure, not a master key" |
| Aleo | Confidential L1 + view-key auditing | View keys (decrypt) | Everything (AVK) / per-tx (TVK) | Aleo | ~$200M [SOURCED] | view-key spectrum |
| Zcash / ECC | Shielded payments | Viewing keys / payment disclosure | Everything / per-tx | Zcash | — [GAP] | selective disclosure via keys |
| Sui (Mysten) | Confidential balances/amounts (your primitive) | Twisted ElGamal + Bulletproofs; issuer auditor key | per-issuer key-disclosure | Sui | — | "keeps regulators in the loop"; freeze/seize |
| Privacy Pools | Prove (non-)origin from (un)lawful sources | ZK association-set membership | provenance, not a number | Ethereum | — [GAP] | compliance without full history |
| TRM Labs | Compliance analytics + policy framing | TEE + observer roles; 5-regime taxonomy | n/a (analyst) | multi / Canton | unicorn [SOURCED] | **defines** the regime debate; no "sum" category |
| Chainalysis / Merkle | Analytics / Travel-Rule | (no verified selective-disclosure-under-encryption) | — | multi | ~$8.6B (Chainalysis) [background] | Travel-Rule tooling |
| Zama / Fhenix / Inco | Confidential smart contracts | FHE (compute on ciphertext) | n/a (different paradigm) | EVM/L2 | — [GAP] | privacy-preserving compute |

---

## Where Aperture is differentiated vs. where it's exposed

**Differentiated (well-supported):**
- **Empty niche.** Selected-sum disclosure is genuinely unoccupied — confirmed against every surveyed player. Closest is set-membership (different predicate) and view-keys (key-surrender).
- **No key surrender.** Everyone credible in this space either hands over a decryption key or proves provenance. "Prove the number, keep the entries and the key" is a real, defensible gap.
- **Built on a sound, peer-reviewed primitive** (PGC/ADCP), and on Sui's *own* stack — feasibility is not the question.

**Exposed (act on these):**
1. **Soundness is the real risk.** The Phantom Challenge bug is the same NIZK family — a missing transcript absorption forged proofs. **Independent audit of your Fiat-Shamir transcript handling is non-negotiable before any compliance claim.**
2. **Category education.** TRM — the field's definer — has *no* name for what you do. Great wedge, but you carry the burden of teaching it; expect "is this just a range proof / view key?" every meeting.
3. **"God-key" overstates Sui's model.** It's per-issuer key-disclosure, not one network key. Use accurate wording or a knowledgeable judge will dock you.
4. **The decryption small-message-space constraint** likely bounds your max provable sum (your 65,535 cap). Confirm and be ready to explain it.

---

---

## Second pass (2026-06-22) — is there a direct competitor? + funding

> Run 2: 21 sources, 89 claims, **25 verified / 22 confirmed / 3 refuted**.

### Yes — a near-direct selected-sum competitor exists: **PrivPNL** (but it's a PoC, not a product) [VERIFIED]
- **What:** `aztec-pnl-proof.vercel.app` (repo `jp4g/aztec-pnl-proof`, org `aztec-pioneers`). Client-side ZK aggregates a holder's **chosen** encrypted DEX swaps into a **net realized PnL** (signed i64 sum + Merkle root binding to on-chain logs), disclosed via a **tagging key** (lets an auditor *locate* data without decrypting) — hiding individual swaps, counts, tokens, cost-basis, and wallet identity. Demo copy: *"selectively disclose how much you made without disclosing how you made it."* **That is essentially your flagship trick.**
- **But the threat is conceptual, not shipped:** it's a **community proof-of-concept** by Jack Gilcrest ("jp4g", of Mach-34 — a *funded Aztec ecosystem builder*, so "independent" is fair but he's Aztec-adjacent), **not an official Aztec Labs product**, absent from Aztec's official Noir showcase. Hackathon-grade: **1 star, 0 forks, no releases**, self-labeled *"not financial software — a demonstration."* Aztec mainnet only enabled transactions in **early 2026**, so the stack it rides is itself nascent.
- **Your defensible differences:** different chain + primitive (**Sui confidential transfers / Twisted-ElGamal homomorphic sum + on-chain Move verify** vs **Aztec/Noir recursive ZK over AMM swaps**); productized with a **Mode A auditor console**; over confidential *transfers* not just DEX trades.
- **What this means for your pitch:** drop unqualified **"first."** Say **"first *productized* selected-sum disclosure"** / **"first on Sui / over confidential transfers"** — PrivPNL proves the category is real (good: demand signal) and would make an unqualified "no one has done this" *false* in front of a knowledgeable judge.

### No other project does prover-selected subset-sum [VERIFIED]
Adjacent prior art proves **thresholds/relations over fixed aggregates**, not a free-form selected sum:
- **Provisions** (CCS 2015) — proof of solvency (reserves ≥ liabilities) over Pedersen commitments.
- **ZK proof-of-reserves** (Binance zkmerkle, Vitalik's Merkle-sum-tree) — sum of hidden components = 0.
- **zkMe** — "Financial Capacity Attestation" / zkCreditScore: prove assets/score **exceed a threshold** via zkTLS (shipped 2025).
- **Privacy Pools** — association/membership proof of provenance; **does not sum at all.**
- ⚠️ The general primitive (aggregation ZK / sum-check / homomorphic commitments) is **academically well-established — not novel.** Your differentiation is the *product framing + selected-subset-sum over confidential transfers*, not the crypto. (Two over-claims were **refuted**: that aggregation-ZK generically "guarantees the verifier learns nothing beyond the aggregate," and that Aztec's tagging-secret alone suffices to prove derived figures — don't assert either.)

### Funding & traction (verified ✓ / sourced-not-verified ~)

| Project | Total raised | Latest round | Valuation | Notable backers | Traction |
|---|---|---|---|---|---|
| **Zama** ✓ | >$150M | $57M Series B (Jun 2025) | **>$1B — "first FHE unicorn"** | Blockchange, Pantera | launched Confidential Blockchain Protocol |
| **Aleo** ✓ | ~$228M | $200M Series B (Feb 2022) | $1.45B post | Kora, SoftBank VF2, a16z, Tiger, Samsung Next | mainnet live |
| **Zcash / ZODL** ✓ | $25M+ seed (Mar 2026) | seed | — | Paradigm, a16z crypto, Winklevoss, Coinbase Ventures | new dev lab; ⚠️ ECC team resigned Jan 2026 |
| **0xbow / Privacy Pools** ✓ | $3.5M seed (Nov 2025) | seed | undisclosed | Starbloom, Coinbase Ventures, BOOST, Status | live on ETH mainnet since Mar 2025; ~$6M vol, 1,500+ users |
| **TRM Labs** ~ | — | Series C, "unicorn" (Feb 2026) | unicorn | Goldman (per Fortune) | analyst/leader |
| **Chainalysis** ~ | ~$537M | $170M Series F | $8.6B (GIC) | — | category leader |
| **Merkle Science** ~ | (Tracxn) | — | — | — | — |
| **Aztec Labs, ECC, Fhenix, Inco, Mysten/Sui** | [GAP] | not verified this run | — | — | — |

✓ = 3-vote verified this run · ~ = a source returned it but it wasn't in the verified top-25 (treat as a lead) · [GAP] = unverified.

---

## Honest gaps (don't treat absence as evidence)
- **Funding for Aztec Labs, Electric Coin Co (vs ZODL), Fhenix, Inco, and Mysten/Sui Foundation** still unverified.
- **Nightfall (EY), Namada, Penumbra** — no surviving verified claims; not reportable.
- **Will Aztec Labs (not a community dev) ship an official proof-of-figure** now that mainnet is live? Open — the strongest future competitive risk.
- Several academic PDFs (PGC, Provisions, Privacy Pools) and zkMe/zk.me were 403 on direct fetch; verified via rendered search + corroboration (wording matched, confidence high).
</content>
