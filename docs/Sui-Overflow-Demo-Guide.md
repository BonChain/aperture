# Aperture — Sui Overflow 2026 Demo Guide

**Track:** DeFi & Payments · **Mode:** Mode B (Proof-of-Figure) PoC
**What this doc covers:** exactly what to do before the video starts, what to show, and what to say at each moment.

---

## Part 1 — Setup (do before you hit record)

### 1.1 Start the app

```bash
cd /path/to/aperture
pnpm demo
```

Opens at **http://localhost:5173** — no wallet extension needed, no real SUI required.

> If you want the on-chain verify transaction to appear in the explorer (recommended for judges): make sure your Sui CLI is on devnet with funded gas and run `pnpm demo:onchain` instead. Allow ~4 min for it to start.

### 1.2 Browser prep (do this before recording)

- Open `http://localhost:5173` and let the page fully load
- Open a second tab: `https://suiexplorer.com/?network=devnet` — you'll switch to it live to show the encrypted tx
- Zoom browser to **110%** so UI text is readable in the recording
- Use a **1280×720** window — don't go fullscreen (cuts off the tab bar which proves you're on a real site)
- Close all other tabs and notifications

### 1.3 What the app shows out of the box

When you load the app, it boots on the **Holder lens** automatically. You will see:

- **Left panel** — a pre-loaded verifier request from "Acme Lender" asking for proof of ≥ 50,000 MIST
- **Right panel** — four encrypted entries you can select from

No additional setup or data entry needed. The fixture matches the SPIKE-1 devnet proof constants.

---

## Part 2 — The Demo Script (what to record)

Target length: **3–5 minutes.** Judges skim — every screen should earn its time.

---

### Scene 1 — Open with the problem (30 seconds, no screen needed)

Speak to camera or voiceover before showing the app:

> "Sui's confidential transfers are live on devnet. Amounts are encrypted — the explorer shows ciphertext, not numbers. That's powerful for privacy. But it breaks every compliance tool that assumed amounts were readable.
>
> The EU Travel Rule requires identity data on **every** crypto transfer. EU AMLR bans anonymous accounts at institutions. The incumbents Mysten invited — TRM Labs, Merkle Science — are still only exploring. No one has shipped the compliance layer yet.
>
> Aperture is that layer. Mode B — Proof-of-Figure — lets a holder **prove a sum** about their encrypted activity to a lender or auditor, without revealing which entries, without handing over their key."

---

### Scene 2 — Show the app boots on the Holder (30 seconds)

**What to show:** The app loading at `localhost:5173`.

**What to say:**

> "The app opens on the Holder lens. On the left — a request from Acme Lender: prove your selected total is at least 50,000 MIST. On the right — the holder's encrypted entries."

**What judges see:**
- The role switcher at the top (Holder / Payer / Auditor)
- The verifier request card with the lender's name and required amount
- The entry checklist with four rows

---

### Scene 3 — Show the encryption is real (45 seconds)

**What to show:** Switch to the Sui Explorer tab you opened in prep.

**What to say:**

> "Before we prove anything — let me show you the encryption is real, not mocked."

Navigate to a recent transaction on the devnet explorer. Show a confidential transfer — point to the payload where the amount field shows a ciphertext blob, not a number.

> "The amount field is a 32-byte ElGamal ciphertext. There is no plaintext number anywhere on-chain. This is Mysten's Contra primitive — we're building on top of it, not reimplementing it."

Switch back to the app.

> "The holder knows what's in each entry because they hold the decryption key. Nobody else does."

---

### Scene 4 — Select entries + generate proof (90 seconds) ← THE CORE DEMO

**What to show:** Tick two entries in the right panel, then click "Generate proof."

**What to say:**

> "The holder selects two entries — 40,000 MIST and 30,000 MIST. Watch the running total: 70,000 MIST. That's above the lender's threshold of 50,000."

Tick both entries. The selected-total counter updates live.

> "Now — generate. The key is derived locally from a one-time signature. It never leaves this browser."

Click **Generate proof**.

While the spinner runs (target < 1 second):

> "The system aggregates the two ciphertexts homomorphically — adding them in the encrypted domain — then runs a Twisted ElGamal NIZK. Fiat-Shamir transform, Ristretto255 group. The output is a 128-byte proof."

When the proof appears:

> "Done. 128 bytes. The proof says: 'this aggregate ciphertext encrypts exactly 70,000 MIST under this public key' — without revealing which entries contributed, without revealing the other two entries the holder didn't select."

**Key moment for judges:** Point to the disclaimer below the entry list: *"Proves a selected sum — not total income, nor which entries were included."* Say:

> "We're explicit about what's proved and what isn't. No over-claiming."

---

### Scene 5 — Verify without the secret key (60 seconds)

**What to show:** Switch to the Auditor lens using the role switcher at the top.

**What to say:**

> "Switch to the Auditor. The verifier gets the proof — they do not get the holder's key."

Click **Verify** (or let it auto-populate from the proof).

While verification runs:

> "Off-chain verify first — less than 10 milliseconds. Recomputes the Fiat-Shamir challenge and checks the proof equations. Pure math — no network call."

When the green badge appears:

> "Verified. The aggregate is 70,000 MIST. The lender knows the holder can satisfy the request. The lender does not know the holder has 40+30 vs 55+15 — just the total, and that it's correct."

If on-chain verify is running:

> "On-chain: we submit the proof to our Move module — `verify_aggregate` wraps Contra's `nizk::verify_elgamal`. If it were false, the transaction would abort with code 100."

When the explorer link appears, click it:

> "The transaction is live on devnet. The payload shows the ciphertext — not the amount. The proof verifies on-chain, but the number stays encrypted."

---

### Scene 6 — Close with the ask (30 seconds, camera or voiceover)

> "What we've shown: end-to-end Proof-of-Figure on Sui devnet. Browser-native proof generation, 128 bytes, under a second. Off-chain verify under 10ms. On-chain verify in a live transaction.
>
> Selective disclosure — not a god-key, not anonymity. Exactly the direction TRM Labs, the Bank of Italy, and EU AMLR point to.
>
> We're looking for: a place in Hydropower or Sui's Direct Strategic Investment, an intro to one confidential-token issuer, and Mysten's eyes on the disclosure model so the compliance layer is designed with the primitive — not bolted on after.
>
> Aperture — private from the public, provable to whoever you choose."

---

## Part 3 — What Judges Will Look For (and how you hit each one)

| Criterion | What they want to see | Where you hit it |
|---|---|---|
| **Working demo** | Real on-chain transactions, not mockups | Scene 3 (explorer), Scene 5 (on-chain verify tx) |
| **Technical depth** | You understand the primitives | Scene 4 narration (Twisted ElGamal, Ristretto255, Fiat-Shamir, 128-byte proof) |
| **Sui integration** | Uses Sui/Mysten primitives, not just deployed on Sui | Scenes 3 & 5 — Contra's `nizk::verify_elgamal`, devnet explorer link |
| **Real problem** | Market/regulatory context | Scene 1 — Travel Rule, AMLR, TRM Labs naming |
| **Differentiation** | Not just another ZK project | Scene 4 — homomorphic aggregation (no recursive ZK needed), browser-native, selective not god-key |
| **Honesty** | No over-claiming | Scene 4 — disclaimer visible on screen |

---

## Part 4 — Backup Plan (if devnet is down during recording)

The full proof path is 100% browser-native and works offline. Only Scene 3 (explorer) and the on-chain verify in Scene 5 need devnet.

**Cut list if devnet is down:**
- **Scene 3** → replace with: "The encryption is real — here's the fixture ciphertext from our devnet deploy" and show the hex in the test fixtures. Skip the live explorer.
- **On-chain verify in Scene 5** → say: "On-chain verify requires a live devnet node. The off-chain path is what matters for this demo — the on-chain path is exercised in our test suite." Show the terminal running `pnpm test:spike:onchain` with 6 passing tests.

Golden fixture: `packages/spike/test/fixtures/proofAggregateValid.hex` — this is the actual 128-byte proof from the SPIKE-1 devnet verification. The off-chain verify of this fixture always passes.

---

## Part 5 — Things to NOT say (honesty guardrail)

These phrases will undermine credibility with Mysten judges who know the space:

| Don't say | Say instead |
|---|---|
| "Anonymous" or "untraceable" | "Amount-confidential" or "encrypted" |
| "Fully compliant" | "Supports selective disclosure as required by Travel Rule / AMLR" |
| "Better than Aztec / Aleo" | "Lighter-weight — no recursive circuits needed for the sum-proof case" |
| "TRM endorses Aperture" | "TRM's whitepaper validates this category" |
| "Contra" (our internal name) | "Sui confidential transfers" or "Mysten's confidential transfer primitive" |
| "$50M Sui grant fund" | "Hydropower accelerator / Direct Strategic Investment" |
| "The amounts are hidden on-chain forever" | "Amounts are encrypted; the holder can selectively disclose to whoever they choose" |
