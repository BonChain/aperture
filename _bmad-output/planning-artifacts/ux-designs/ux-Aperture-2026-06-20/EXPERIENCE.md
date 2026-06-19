---
name: Aperture
description: Experience spine for Aperture — a disclosure layer for confidential payments on Sui. Desktop web console, three role lenses (Payer / Holder / Auditor-Verifier) behind a demo role-switcher. Paired with DESIGN.md (visual identity).
status: final
project: Aperture
created: 2026-06-20
updated: 2026-06-20
sources:
  - prd-Aperture-2026-06-19
  - architecture.md
  - Aperture srs.md
references:
  design: ./DESIGN.md
---

# Aperture — Experience Spine

> Finalized 2026-06-20 (Fast path). `[ASSUMPTION]` tags mark accepted defaults made in the absence of an explicit source decision — revisit if a source decision later contradicts them. DESIGN.md owns *how it looks*; this spine owns *how it works*. Both spines win over any mock on conflict.

## Foundation

**Desktop-first web console**, no mobile. React 19 + Vite, built on a reskinned `kaisho` base (copied from Contra); state via React Query; a dlog web worker decrypts balances client-side. `DESIGN.md` is the visual-identity reference — this spine specifies behavior, IA, states, interaction, accessibility, and flows.

The app is **one application with three role lenses** — Payer/Issuer, Holder/Recipient, Auditor/Verifier — toggled by a **role-switcher** (FR-21, demo only; no production auth). One wallet drives all three roles. Entering a role triggers a **lazy wallet signature** that deterministically derives that role's session key — nothing is stored or spent. The session key lives in browser memory only and **never appears** in logs, errors, query keys, or devtools (it is a branded type whose serialization throws).

This is a **hackathon PoC on Sui Devnet**, demo-shaped: it opens on the Mode B Holder flow (not a wallet wall), every on-chain action deep-links to the Sui explorer, and the whole thing re-seeds from one command. **Mode B (Proof-of-Figure) is gated on SPIKE-1** — its surfaces are fully specified here but flagged; if the aggregate path proves infeasible, the single-amount fallback (FR-18) applies with reframed copy.

## Information Architecture

| Surface | Lens | Reached from | Purpose |
|---|---|---|---|
| **Role switcher** | global | Persistent left-rail header | Toggle Payer / Holder / Auditor. Shows current lens; switching re-lenses the app (`{components.role-banner}`) and lazily signs for the new role. |
| **Payer · Org & Recipients** | Payer | Default Payer view | Create org (name + designated auditor key), add ≤7 recipients (name, address, off-chain amount), register accounts. |
| **Payer · Treasury & Run** | Payer | Payer nav | Fund treasury via single aggregate wrap; execute batch payment run; view run history with explorer deep-links. |
| **Holder · Balance** | Holder | Default Holder view (demo entry point) | See available + arriving funds (plain language), claim, withdraw. |
| **Holder · Prove a Figure** | Holder | Holder nav (Mode B) | Select own entries, generate proof of the selected sum, export disclosure receipt. *Gated on SPIKE-1.* |
| **Auditor · Scope** | Auditor | Default Auditor view | List of designated orgs/accounts only; non-designated never appears. |
| **Auditor · Account Detail** | Auditor | Scope row | Decrypted balance + transfer history table; generate per-run report; export CSV/JSON. |
| **Auditor · Audit Trail** | Auditor | Auditor nav | Append-only, read-only log of this auditor's own reads (who/what/when/under which designation). |
| **Auditor · Privacy Posture** | Auditor | Auditor nav | Read-only panel enumerating what is public on-chain vs what requires the auditor key. |
| **Verify a Proof** | Auditor / external | Auditor nav · or standalone receipt link | Paste/upload a disclosure receipt; off-chain + on-chain verification; unambiguous pass/fail. |

Navigation is a **persistent left rail** scoped to the active role, topped by the role-switcher. Modal depth is **one level** (a dialog over a surface, never a dialog over a dialog). Every on-chain row carries an **explorer deep-link** (FR-22) — the chain shows encrypted amounts, reinforcing the privacy claim.

→ Composition references will land in `mockups/` at Finalize. Spine wins on conflict.

## Voice and Tone

Microcopy. Brand voice and aesthetic posture live in `DESIGN.md`. The governing rule is **honest precision** — never over-claim, and speak each role in its own register.

| Do | Don't |
|---|---|
| **Holder (no crypto jargon, FR-7):** "Available: 1,500.00 USDC", "Arriving — claim to use", "Claim", "Withdraw to wallet" | "Pending balance", "Merge limbs", "pendingPublicBalance", "unwrap" |
| **Auditor (technical, compliance register):** "Designated read", "Export run report (CSV)", "Recovered viewing key for {account}" | Casual or playful phrasing; emoji |
| **Honesty (NFR-9), everywhere:** "Amount-confidential, selectively disclosable" | "Anonymous", "untraceable", "fully compliant" |
| **Scoped-claim disclaimer (Mode B/A):** "Proves a selected sum — not total income, nor which entries were included." | "Verified income", "proves their balance" |
| **Errors are actionable:** "Recipient {name} isn't registered yet. Register before running this payment." | "Error: recipient not registered" |
| **Signature explainer:** "Entering as {Role} — derive your key from a one-time signature. Nothing is stored or spent." | "Please sign this transaction" |

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| **Role switcher** | Global | Click a role → if no session key for it, show the pre-sign explainer, then lazily sign; on success, re-lens (banner, nav, accent). Switching *wallets* mid-demo is blocked with a clear notice (breaks decrypt/verify). Key-dependent actions stay disabled with "Sign to unlock →" until signed — never a crash or white screen. |
| **Cipher cell** | Any amount column | Renders masked `••••` (`{components.cipher-cell-masked}`) by default; renders the real figure with the reveal marker (`{components.cipher-cell-revealed}`) only when the current lens is authorized (Holder's own account; Auditor's designated decrypt). Fixed width so reveal never reflows the column. |
| **Recipient editor** | Payer · Org & Recipients | Add up to 7 rows. The 8th add is rejected inline (see State Patterns). Amount is an off-chain field, monospace, MIST-validated (integer string, no decimal/sign/leading zero). Each row shows a registration `{components.badge-verified}`/pending state. |
| **Balance panel** | Holder · Balance | Shows one prominent **Available** figure (`{typography.data-lg}`) and an **Arriving** line. "Claim" merges arriving→available (auto-retries on race, transparently). "Withdraw" moves to a public coin (warns once that the amount becomes visible on-chain at the crossing). No bucket math exposed. |
| **Entry-selection checklist** | Holder · Prove a Figure | "X of N entries selected." Live running total of the selected sum (`{typography.data-lg}`). Bound-and-reject at selection time if the aggregate would exceed the decryptable range (limb-0 < 2¹⁶) — the offending entry can't be added, with an explanation. |
| **Proof generator** | Holder · Prove a Figure | "Generate proof" runs client-side; shows a spinner with a **measured elapsed time** (target < 10s, NFR-6). On success → disclosure-receipt card + Export. Key never leaves the browser; copy says so. |
| **Disclosure-receipt card** | Holder export / Verify | Shows disclosed value `X`, included-entry **count only** (never which entries), truncated proof blob, holder public key. Export as JSON. In Verify, gains a `badge-verified`/`badge-failed` result slot. |
| **Designated-scope list** | Auditor · Scope | Lists only designated orgs/accounts. Non-designated entities are absent, not greyed — least-visibility (NFR-4). Selecting an account recovers its viewing key (server-side, Mode A) and opens Account Detail. |
| **Per-run report** | Auditor · Account Detail | Generates a decrypted recipient×amount table for a run; Export CSV / JSON. Generating a report writes an audit-log entry. |
| **Audit-trail viewer** | Auditor · Audit Trail | Read-only, append-only. No edit/delete affordance exists anywhere in the UI. Rows show the hash-chain link marker; tamper would break the chain visibly. |
| **Privacy-posture panel** | Auditor | Two columns: "Public on-chain" (sender, receiver, token, timing) vs "Requires auditor key" (amounts). Frames the auditor's legal basis; pure read. |
| **Notice / disclaimer** | Mode A & B | The scoped-claim disclaimer renders as a neutral `{components.notice-disclaimer}` block beside any decrypted figure or proof — sober, info glyph, never red. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| **No session key (role not signed)** | Any lens | Key-dependent buttons disabled, labeled "Sign to unlock →". Pre-sign explainer on the first action. Never a white screen. |
| **Balance decrypting** | Holder · Balance | Spinner; "Reading your balance…" (covers dlog table init; < 2s warm). |
| **Empty recipients** | Payer | "No recipients yet. Add up to 7 to start a payment run." |
| **8th recipient** | Payer | Inline reject: "A run is limited to 7 recipients. Remove one to add another." (C1). |
| **Unregistered recipient at run** | Payer | Blocking, actionable: "Recipient {name} isn't registered yet. Register before running this payment." (C4). |
| **Run executing** | Payer · Treasury & Run | Spinner; "Running payment…"; on success, run row with recipient count + timestamp (no amounts) + explorer link. |
| **Claim race** | Holder · Balance | Auto-retry, transparent: "Finishing up…"; resolves to "Claimed." No jargon, no manual merge step. |
| **Withdraw crossing** | Holder · Balance | One-time confirm: "Withdrawing makes this amount visible on-chain. Continue?" |
| **Proof generating** | Holder · Prove a Figure | Spinner + live elapsed timer; "Generating proof… {n.n}s". |
| **Proof done / failed** | Holder / Verify | `badge-verified` "Verified" or `badge-failed` "Doesn't verify" — unambiguous. Tampered `X` always fails (NFR-3). |
| **Aggregate out of range** | Holder · Prove a Figure | Entry can't be selected: "Adding this entry exceeds what can be proven in one figure. Prove a smaller selection." |
| **Mode B unavailable (SPIKE-1 not passed)** | Holder · Prove a Figure | Fallback to single-amount proof with reframed copy (FR-18); or a "Coming soon — pending feasibility" state if disabled. `[ASSUMPTION]` exact gating UI confirmed at Finalize. |
| **Non-designated access** | Auditor | Fails closed: the account simply isn't in scope; if reached by URL, "You aren't designated for this account." No partial data (NFR-4). |
| **Empty audit trail** | Auditor · Audit Trail | "No reads recorded yet. Your reads will appear here, permanently." |

## Interaction Primitives

**Pointer-first console** (desktop web; keyboard accessible per the floor below). The product is a dense audit instrument, not a power-user keyboard app — so primitives favor clarity and accountability over speed.

- **Role-switch is the master gesture.** It changes the lens, the data visibility, and the accent in one act. Every other interaction lives inside a lens.
- **Reveal is a state, not a hover trick.** A masked amount becomes visible because the viewer is authorized (lens + decrypt), never on mouseover. No hover-to-peek on confidential data.
- **Destructive/irreversible-on-chain actions confirm once** (execute run, withdraw-crossing) with plain stakes stated. Idempotent re-runs are safe (same `idem_key` → identical result); a failed step is safe to retry.
- **Export is explicit** (CSV/JSON, disclosure receipt) — a deliberate button, with the scoped-claim disclaimer adjacent.

**Banned everywhere:** hover-to-reveal confidential amounts; any edit/delete on the audit trail; modal stacks > 1 deep; surfacing *which* entries a proof included; showing the session key in any UI, error, or URL; animating masked→revealed as decoration.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md` (dark palette designed to WCAG AA; verify the `cipher-masked`/`cipher-reveal` pair against `surface-sunken`).

- **WCAG 2.2 AA** across the console. `[ASSUMPTION]` — not stated in sources; adopted as the floor for a compliance-facing tool.
- The trust boundary must be **conveyed by more than color**: masked shows the `••••` glyph; revealed shows the unlock marker + the actual figure. A colorblind auditor must still distinguish sealed from revealed.
- Status verdicts (`Verified` / `Doesn't verify`) carry **text + icon**, never color alone.
- **Tab order matches reading order** on every surface; tables are keyboard-navigable; `Esc` closes the topmost dialog/popover.
- Proof generation and balance decryption announce progress via `aria-live` ("Generating proof, 3 seconds…", "Balance ready").
- Focus ring inherits `{colors.ring}`, visible at AA against `{colors.surface-base}`.
- No crypto jargon in the Holder lens (FR-7) is itself an accessibility decision — cognitive load, not just contrast.

## Responsive & Platform

Desktop-first web; **no mobile surface in scope**. The console assumes a laptop/desktop viewport for dense tables (Auditor history, Payer recipients, run log). `[ASSUMPTION]` minimum supported width ≈ 1024px; below that, tables scroll horizontally rather than reflow. One wallet/browser session drives the whole demo; switching wallets mid-session is blocked (breaks decrypt/verify).

## Inspiration & Anti-patterns

- **Lifted from audit/ledger tools:** dense monospace tables with tabular figures, append-only read-only logs, CSV/JSON export as a first-class action. The audit trail behaves like a real immutable ledger — no edit, ever.
- **Lifted from Contra/`kaisho`:** the component plumbing, hooks, and dlog worker. Aperture is *what we reskin and layer on top*, a deliberate posture (architecture decision), not a shortcut.
- **Aperture's own invention — the trust-boundary cell:** the same ciphertext rendered sealed in one lens and revealed in another, as a literal, on-screen demonstration of selective disclosure.
- **Rejected — anonymity framing:** Aperture hides amounts only; sender/receiver/timing are public. No copy, badge, or visual implies anonymity or untraceability (NFR-9).
- **Rejected — showing which entries a proof included:** would break the holder's confidentiality. The verifier learns the *sum* and the *count*, never the membership.
- **Rejected — hover-to-peek on confidential amounts:** reveal is an authorization state, not a convenience gesture.
- **Rejected — gamified/crypto-native neon:** the trust story is institutional sobriety, not ecosystem flash (see DESIGN.md).

## Key Flows

### Flow 1 — Confidential payroll (Priya, ops lead at a small studio, Friday payout)

1. Priya opens Aperture, lands in the **Payer lens** (amber banner: "Payer lens"), signs once to derive her Payer key.
2. She creates an org, naming the **designated auditor** by public key.
3. She adds five contractors — name, address, off-chain amount each — and registers their accounts. A sixth and seventh add fine; when she fat-fingers an **eighth**, the row is rejected inline: "A run is limited to 7 recipients."
4. She funds the treasury with a **single aggregate wrap** — one operation, no per-recipient amounts touching the chain.
5. **Climax:** She hits "Execute payment run" (the amber in-lens CTA), confirms once, and the run posts. The new run row reads **"5 recipients · 14:02 UTC"** with an explorer link — and *no amounts anywhere*. She clicks through to the Sui explorer and sees the transfers sitting there **encrypted**. The payout is done and the dollar figures never left her side of the boundary.

Failure: a recipient wasn't registered → blocking message names them and links to register; she fixes it and re-runs (idempotent — no double payment).

### Flow 2 — Prove one client's total without the key (Hassan, contractor, applying for a loan)

1. Hassan switches to the **Holder lens** (aqua banner), signs his Holder key. The app opened here — it's the demo's front door.
2. His **Balance** reads "Available: 4,200.00 USDC" with an "Arriving" line; he clicks **Claim**, which finishes with a brief "Finishing up…" and no jargon.
3. He opens **Prove a Figure**, and from his entries selects just the three payments from one client. The running total ticks to **3,000.00 USDC**; "3 of 11 entries selected."
4. He clicks **Generate proof**. A spinner counts up — **"Generating proof… 2.4s"** — client-side; his key never leaves the browser.
5. **Climax:** A **disclosure receipt** appears: disclosed value **3,000.00**, "3 entries included" (never *which*), a proof blob, and the scoped-claim disclaimer in sober slate: *"Proves a selected sum — not total income, nor which entries were included."* He exports the JSON and sends it to the lender. His key, his other eight payments, and his full balance all stay sealed.

Failure: the selected aggregate would exceed the provable range → the offending entry can't be added, with a plain explanation to prove a smaller selection.

### Flow 3 — Designated read, fully logged (Aisha, external auditor engaged for one org)

1. Aisha enters the **Auditor lens** (violet banner), authenticates with her auditor key.
2. **Scope** shows exactly one org — the one she's designated for. No other org or account is visible (least-visibility). She tries a hunch URL for a non-designated account; it **fails closed**: "You aren't designated for this account."
3. She opens an account; its viewing key is recovered (server-side, Mode A) and the **balance + transfer history** decrypt into a dense monospace table — the same figures that read `••••` in Priya's lens now show in full beside the aqua reveal marker.
4. She generates a **per-run report** and exports it as CSV for her working papers.
5. **Climax:** She opens the **Audit Trail** and sees her own read recorded a moment ago — account, action, timestamp, designation — on an append-only, hash-chained log with **no edit or delete control anywhere on screen**. The privacy-posture panel beside it spells out what she *can't* see. Her access is real, bounded, and permanently accountable — the audit of the audit is the point.

Failure: she's handed a holder's disclosure receipt with a tampered value → **Verify** returns an unambiguous `badge-failed` "Doesn't verify"; the figure is rejected.
