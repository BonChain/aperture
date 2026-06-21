# Aperture — Demo Video Plan & New Slide

**Submission requirement:** a video demo is mandatory and **must be ≤ 5 minutes** — anything after 5:00 is *not considered*. This plan is built to land at **~4:55** with margin.

This doc has three parts:
1. **New slide spec** — paste into `Aperture-Pitch-v2.pptx` (keep your theme). Bridges the aspirational deck to the running PoC.
2. **The ≤5-minute agenda** — scene-by-scene, timed, mapped to the live pages in `apps/web`.
3. **Cut list & honesty guardrails** — what to drop if you run long, what never to say.

> Source of truth for *setup* (wallet, devnet, `pnpm demo`) stays in **`Sui-Overflow-Demo-Guide.md`**. This doc is the *timing + narration* layer on top of it. Where they overlap, this doc wins on timing; that guide wins on setup detail.

---

## Part 1 — New slide spec

The current deck (v2, 11 slides) is the **aspirational north-star** (Mode A console + Mode B). It does not yet show *what actually runs*. Add **one slide** between **Slide 5 (The Solution)** and the back half — recommended position: **new Slide 6**, pushing the rest down — or drop it in as the final-before-ask slide. It earns the judges' "working demo" checkbox before you spend a word on roadmap.

### NEW SLIDE — "What we shipped" (live, on devnet)

**Eyebrow / kicker:** `LIVE TODAY` · DeFi & Payments
**Title:** **Mode B is built — and it runs on devnet right now**
**Subhead:** A real holder proves a figure about encrypted activity, and a verifier confirms it — no key shared, no entries revealed.

**Left column — "What's live" (✓ green ticks):**
- **Real wallet.** Connect Slush, sign once — key derived locally, never leaves the browser, zero gas. (Signing a message is not a transaction.)
- **Real proof.** Selected encrypted amounts aggregated homomorphically → a **128-byte** proof generated in **< 1 second**, in-browser.
- **Off-chain verify.** Verifier checks the proof in **< 10 ms** — pure math, no network, no key.
- **On-chain verify, on live devnet.** Auditor lens runs a read-only `devInspect` against our Move module `verifier::verify_aggregate` (gasless), with a **"View on Suiscan"** trace link.
- **On-chain test suite.** `pnpm test:spike:onchain` — **6 tests** submit committed proofs to the deployed module on devnet: valid proofs accepted, **tampered proof aborts (code 100)**.

**Right column — "Honest scope" (so judges trust the rest):**
- **Selective, not anonymous.** One figure proves a **bounded range (≤ 65,535 MIST)**; the UI greys out selections that exceed it — selective disclosure by design.
- **Mode A (Auditor Console) is roadmap**, not in this build. The "Auditor lens" here is a **verifier**, not the full org-decrypt console.
- **Payer lens** is an honest stub — "coming soon."
- **Demo keypairs** — fixture keys, not production HKDF (banner says so on every screen).

**Footer strip (the through-line):** *Private from the public, provable to whoever you choose.*

**Speaker notes (≤20s if you narrate the slide at all — ideally you just cut straight to the live demo):**
> "Everything on the left is running, not mocked — you're about to see it end to end. Everything on the right is us being precise about what this is and isn't. Let me show you."

### Optional 1-line honesty edits to existing slides (keep deck and build aligned)
- **Slide 5 (Solution) / Slide 11 (Roadmap):** footnote — *"Devnet PoC ships Mode B (Proof-of-Figure) end-to-end; Mode A Auditor Console is designed, not yet built."* Prevents a judge thinking the console is live.
- Everywhere you say "verifies on-chain": prefer *"verifies off-chain in the browser; the on-chain path is exercised on live devnet (devInspect + test suite)."*

---

## Part 2 — The ≤5-minute agenda

**Target runtime 4:55.** Each scene lists: **screen** (where you are in `apps/web`), **show** (the action), **say** (tight voiceover). Keep the browser tab bar visible (1280×720, 110% zoom) — it proves it's a real site.

| # | Scene | Screen | Time | Running |
|---|-------|--------|------|---------|
| 1 | The problem | Landing | 0:00–0:30 | 0:30 |
| 2 | Connect & sign | Holder · Step 1 | 0:30–1:05 | 1:05 |
| 3 | Select + bounded range | Holder · Step 2 | 1:05–1:55 | 1:55 |
| 4 | Generate the proof | Holder · Step 3 | 1:55–2:30 | 2:30 |
| 5 | Verify (off-chain, in-flow) | Holder · Step 4–5 | 2:30–3:05 | 3:05 |
| 6 | Verify on devnet (live) | Auditor lens | 3:05–3:55 | 3:55 |
| 7 | On-chain evidence | Terminal | 3:55–4:25 | 4:25 |
| 8 | Close + the ask | Camera / landing | 4:25–4:55 | 4:55 |

---

### Scene 1 — The problem (0:00–0:30) · Landing
**Show:** Land on the front-door page. Let the hero + the regulatory stat strip (Zero-threshold · July 2027 · Still exploring · 128 bytes) be on screen. Don't scroll the whole page.
**Say:**
> "Sui's confidential transfers encrypt amounts on-chain. Great for privacy — but they blind every compliance tool that assumed amounts were readable. The EU Travel Rule already demands identity on every transfer; AMLR in 2027 bars unidentified institutional accounts. The incumbents Mysten invited are still only exploring. Aperture is the disclosure layer: prove a figure about your encrypted activity — without revealing which entries, or your key."

Click **Enter the demo →**.

### Scene 2 — Connect & sign (0:30–1:05) · Holder, Step 1
**Show:** Holder lens, step rail at top (Connect → Select → Generate → Verify → Done), Step 1 active. Click **Sign to unlock →**; approve the Slush signature popup.
**Say:**
> "The app opens on the holder. Step one — I connect Slush and sign one message. The key is derived locally from that signature; it never leaves the browser, and nothing is spent. Signing a message isn't a transaction."

Rail advances to **Select**; the Acme Lender request (**prove ≥ $45,000**) and four encrypted entries appear.

### Scene 3 — Select + the bounded-range beat (1:05–1:55) · Holder, Step 2 ← core
**Show:** Tick **Salary — June (40,000)**. **Consulting — Q2 (30,000)** greys out. Then tick **Bonus — H1 (8,000)**. Watch "Amount to prove" land on **48,000** and the live "You'll share ✓ / Stays private 🔒" panel update.
**Say:**
> "The holder picks what counts — Salary, 40,000, and the H1 bonus, 8,000: total 48,000, above the lender's 45,000. Notice Consulting greys out — a single figure proves a bounded range, so to include it you'd issue a *second* figure. That's selective disclosure, scoped by design. And the panel is explicit: you share the total; the entries you didn't pick, your balance, and your key all stay private."

### Scene 4 — Generate the proof (1:55–2:30) · Holder, Step 3
**Show:** Click **Generate proof**. The "Your key never leaves this browser" line is visible; the timer ticks; "Proof ready ✓ · 128 bytes · 0.Xs" appears.
**Say:**
> "It aggregates the two encrypted amounts homomorphically and produces a 128-byte proof in under a second — built from ciphertext, never from a plaintext number. The proof says this aggregate encrypts exactly 48,000 under the holder's key, without revealing which entries contributed."

Point at the disclaimer — *"Proves a selected sum — not total income, nor which entries were included."*
> "Explicit about what's proved. No over-claiming."

### Scene 5 — Verify off-chain, in the same flow (2:30–3:05) · Holder, Step 4–5
**Show:** Flow auto-advances to **Verify**; the proof is handed straight through. Click **Verify the proof** → green **Verified** badge, **Done ✓**.
**Say:**
> "The proof goes straight to the verifier — who never gets the holder's key. Off-chain verify in the browser, under 10 milliseconds, pure math, no network call. Verified: the aggregate is 48,000. The lender learns the holder clears the request — not whether it's salary plus bonus or any other split. Just the total, and that it's correct."

### Scene 6 — Verify on devnet, live (3:05–3:55) · Auditor lens
**Show:** Click **See it on the Verifier (devnet) →** (or the role switcher → Auditor). The fields are **pre-filled from the proof you just generated** ("Loaded from the holder's proof"). Click **Verify proof** → green badge. Scroll to the **proof-trace panel** (statement + `a · b · z1 · z2`) and the **"View verifier module on Suiscan"** link.
**Say:**
> "The verifier pasted nothing — the holder's proof carried straight over. This runs the same check and then verifies it **on live devnet** with a read-only `devInspect` call to our Move module — no gas, no signature. Below it, the proof decomposes into the exact four arguments the on-chain `verifier::verify_aggregate` receives, with a link to the deployed module on Suiscan. The chain accepts the proof, and the amount stays encrypted."

*(If devnet is unreachable, it degrades to the off-chain result — say so honestly and move on.)*

### Scene 7 — On-chain evidence (3:55–4:25) · Terminal
**Show:** Cut to a terminal. Run `pnpm test:spike:onchain`. Let the 6 green checks land.
**Say:**
> "And to prove the chain itself enforces it: six tests submit our committed proofs to the deployed module on devnet. Valid proof — accepted. Tampered proof — it aborts with code 100. On-chain, the proof verifies and the number stays encrypted."

### Scene 8 — Close + the ask (4:25–4:55) · Camera or landing
**Say:**
> "End-to-end Proof-of-Figure: a real wallet, a 128-byte proof in under a second, off-chain verify in the browser, and on-chain verification on live devnet. Selective disclosure — not a master key, not anonymity — exactly where the Travel Rule, AMLR, and TRM Labs point. We're asking for a place in Hydropower or Direct Strategic Investment, an intro to one confidential-token issuer, and Mysten's eyes on the disclosure model. Aperture — private from the public, provable to whoever you choose."

---

## Part 3 — Cut list & guardrails

**If you're over 5:00, cut in this order (each buys ~25–40s):**
1. **Scene 7 terminal** — fold its claim into Scene 6 ("…and our test suite asserts the same on devnet, including a tampered-proof abort") instead of showing it.
2. **Scene 6 proof-trace / Suiscan scroll** — keep the green devnet badge, drop the decomposition tour.
3. **Scene 3 narration trim** — let the greyed-out Consulting row speak for itself; one sentence instead of three.
4. **Scene 1** — open on the hero only, skip reading the stat strip aloud.

**Never cut:** Scene 2 (real signature), Scene 4 (live proof-gen), Scene 5 (live verify). Those three *are* the "working demo" the judges score.

**Honesty guardrails (from the demo guide — keep these exact):**
| Don't say | Say instead |
|---|---|
| "Anonymous / untraceable" | "Amount-confidential / encrypted" |
| "The app verifies on-chain in a live transaction" | "Off-chain in the browser; on-chain on devnet via devInspect + test suite" |
| "Fully compliant" | "Supports selective disclosure as Travel Rule / AMLR require" |
| "No wallet needed" | "Connect Slush and sign once — local, free, no SUI" |
| "Mode A console is live" | "Mode A is designed; this build ships Mode B end-to-end" |
| "First / only to prove a figure" | "First **productized**, on **Sui**, over **confidential transfers**" |

**Pre-record checklist (see `Sui-Overflow-Demo-Guide.md` §1 for full setup):** Slush unlocked on **devnet**; `pnpm demo` (or `pnpm demo:onchain` for the live devnet path) running on :5173; second tab on `suiscan.xyz/devnet`; 1280×720 window at 110%; notifications off; for the freshly-published package, `export VITE_APERTURE_PACKAGE_ID=0x…` before `pnpm demo`.
</content>
</invoke>
