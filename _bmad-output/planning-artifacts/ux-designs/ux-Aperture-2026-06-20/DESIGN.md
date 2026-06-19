---
name: Aperture
description: Disclosure layer for confidential payments on Sui. Dark-default, institutional/audit-grade console. Reskins the inherited `kaisho` (React 19 + Vite) UI base with a fresh Aperture token set. Three role lenses (Payer / Holder / Auditor) over one app.
status: final
project: Aperture
created: 2026-06-20
updated: 2026-06-20
colors:
  # Dark is the DEFAULT scheme — base tokens hold the dark values.
  # `-light` variants define the optional light theme. [ASSUMPTION] exact hex
  # values are a first proposal; confirm at Finalize against a rendered mock.

  # Surfaces — tonal layering carries hierarchy (no shadows for rank).
  surface-base: '#0B0F1A'        # app canvas (deep ink-navy)
  surface-raised: '#131926'      # cards, panels, console columns
  surface-overlay: '#1B2433'     # popovers, dialogs, dropdowns, sticky headers
  surface-sunken: '#070A12'      # data wells — hex/ciphertext blocks, code, table body
  # Ink — text ramp.
  ink-primary: '#E6EAF2'         # primary text, revealed amounts
  ink-secondary: '#9AA4B8'       # secondary text, table labels, captions
  ink-disabled: '#5A6478'        # disabled, placeholder, the masked •••• glyph
  ink-inverse: '#0B0F1A'         # text on bright accent fills
  # Borders — lowest-contrast hairlines for dense tables.
  border-hairline: '#1E2738'     # table row dividers, section rules
  border-strong: '#2C3850'       # input borders, card edges, focused wells
  # Primary — trust-blue. Brand action color, role-independent chrome.
  primary: '#3B82F6'
  primary-hover: '#2563EB'
  primary-foreground: '#FFFFFF'
  ring: '#3B82F6'                # focus ring (AA against surface-base)
  # Semantic state — proof / verification / access outcomes.
  verified: '#34D399'            # proof verified, pass, registered, success
  verified-foreground: '#04231A'
  failed: '#FB7185'             # proof failed, tamper, fails-closed, destructive
  failed-foreground: '#2A0710'
  notice: '#94A3B8'             # honesty disclaimers — neutral, NOT alarmist
  # Trust-boundary — Aperture's signature semantic pair.
  cipher-masked: '#5A6478'       # the •••• sealed/encrypted state (Payer/Auditor view)
  cipher-reveal: '#22D3EE'       # the "decrypted, visible to you" marker (Holder view)
  # Role accents — the role-switcher re-lenses the whole app.
  role-payer: '#F59E0B'          # amber
  role-payer-foreground: '#1A1208'
  role-payer-muted: '#2A2110'    # translucent banner / accent wash
  role-holder: '#06B6D4'         # aqua
  role-holder-foreground: '#04222A'
  role-holder-muted: '#0A2129'
  role-auditor: '#8B5CF6'        # violet
  role-auditor-foreground: '#14082A'
  role-auditor-muted: '#1C1430'

  # Optional light theme (scheme = both was NOT chosen; light kept as a stub).
  surface-base-light: '#F8FAFC'
  surface-raised-light: '#FFFFFF'
  ink-primary-light: '#0F172A'
  ink-secondary-light: '#475569'
  border-hairline-light: '#E2E8F0'
typography:
  # UI in Inter; ALL data (amounts, addresses, hashes, ciphertext, timestamps)
  # in a monospace with tabular figures — this is an audit tool, columns must align.
  display:
    fontFamily: 'Inter'
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  heading:
    fontFamily: 'Inter'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: 'Inter'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'Inter'
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.04em        # uppercase table headers / form labels
  caption:
    fontFamily: 'Inter'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  data:
    fontFamily: 'IBM Plex Mono'  # [ASSUMPTION] mono choice; JetBrains Mono is the alt
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.45'           # tabular-nums; for amounts, addresses, hex, hashes
  data-lg:
    fontFamily: 'IBM Plex Mono'
    fontSize: 22px
    fontWeight: '500'
    lineHeight: '1.2'            # the prominent balance figure
rounded:
  sm: 4px      # inputs, badges, status pills' inner
  md: 6px      # buttons, cards, table container
  lg: 8px      # dialogs, panels, the role banner
  full: 9999px # role badges, status dots
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
  '12': 48px
  '16': 64px
  gutter: 24px        # column / card gutters
  page-margin: 32px   # console outer margin (desktop)
  row-y: 10px         # data-table vertical cell padding (dense)
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  button-role:
    # Primary CTA inside a role lens uses that role's accent (set per active role).
    background: '{colors.role-holder}'        # placeholder; resolver swaps per active role
    foreground: '{colors.role-holder-foreground}'
    radius: '{rounded.md}'
  role-banner:
    background: '{colors.role-holder-muted}'  # swaps per active role
    border: '{colors.role-holder}'
    radius: '{rounded.lg}'
  cipher-cell-masked:
    foreground: '{colors.cipher-masked}'
    fontFamily: '{typography.data.fontFamily}'
  cipher-cell-revealed:
    foreground: '{colors.ink-primary}'
    marker: '{colors.cipher-reveal}'          # left-edge bar / unlock glyph
    fontFamily: '{typography.data.fontFamily}'
  badge-verified:
    background: '{colors.verified}'
    foreground: '{colors.verified-foreground}'
    radius: '{rounded.full}'
  badge-failed:
    background: '{colors.failed}'
    foreground: '{colors.failed-foreground}'
    radius: '{rounded.full}'
  notice-disclaimer:
    background: '{colors.surface-overlay}'
    border: '{colors.border-strong}'
    foreground: '{colors.notice}'
    radius: '{rounded.md}'
  data-table:
    surface: '{colors.surface-sunken}'
    header-foreground: '{colors.ink-secondary}'
    row-divider: '{colors.border-hairline}'
    cell-y: '{spacing.row-y}'
  audit-log-row:
    surface: '{colors.surface-sunken}'
    divider: '{colors.border-hairline}'
    chain-marker: '{colors.ink-disabled}'     # hash-chain link glyph, monospace
---

## Brand & Style

Aperture is a disclosure layer for confidential payments on Sui — it hides *amounts* while sender, receiver, and timing stay public, and it lets the right person reveal exactly what they choose to. The name is the brief: an aperture is a controlled opening, a lens that admits precisely as much light as you set it to. The product is two precise instruments, not one blunt disclosure — **Mode A** (a designated auditor reads designated accounts) and **Mode B** (a holder proves a selected sum without surrendering their key).

The aesthetic posture is **institutional and audit-grade**: sober, dense, quietly authoritative. This is a tool an auditor, a lender, and a regulator should trust on sight. It runs **dark by default** — a deep ink canvas with restrained chrome, where the few colors that appear all *mean something*. Hierarchy comes from tonal surface layering and typography, not decoration. There are no gradients, no glows, no ornament. The one place color is allowed to be vivid is the **role lens** (amber Payer / aqua Holder / violet Auditor) and the **trust boundary** (the sealed `••••` versus the revealed figure) — because those two things are the entire story.

This DESIGN.md **reskins** the inherited `kaisho` base (React 19 + Vite, copied from Contra): the component plumbing and hooks are reused, but the visual identity below is Aperture's own. Where `kaisho`'s tokens conflict with the tokens here, **these win**.

## Colors

The palette is disciplined: a neutral dark substrate, one brand action color, two semantic-state colors, the trust-boundary pair, and three role accents. Nothing else gets a hue.

- **Surfaces** (`surface-base #0B0F1A` → `surface-raised #131926` → `surface-overlay #1B2433`, with `surface-sunken #070A12` for data wells) carry *all* hierarchy. A card is a card because it is one tone lighter than the canvas, not because it floats. Tables and ciphertext blocks sit in `surface-sunken` so dense data reads as an inset ledger.
- **Trust-Blue (`primary #3B82F6`)** is the brand action color — primary buttons, links, the focus `ring`. It is role-independent: it means "the system acts," not "which lens you're in." Never used for state or decoration.
- **Verified Emerald (`#34D399`)** and **Failed Rose (`#FB7185`)** are the only outcome colors. Emerald = proof verified, recipient registered, run succeeded. Rose = proof failed, tampered value, access *failed-closed*, destructive confirm. Because these carry compliance weight, they are never used decoratively — a green pill always means a real positive verdict.
- **Trust boundary — the signature.** `cipher-masked #5A6478` colors the `••••` glyph wherever an amount is sealed (the Payer's and Auditor's default view of a confidential figure). `cipher-reveal #22D3EE` is the marker on a *decrypted* value the current viewer is authorized to see (a left-edge bar / unlock glyph beside the figure in the Holder's own view, or in the Auditor's designated-decrypt). The same ciphertext rendered `masked` in one lens and `revealed` in another is the product's core truth made visible — protect this contrast above all else.
- **Role accents** re-lens the app: **Payer = amber `#F59E0B`**, **Holder = aqua `#06B6D4`**, **Auditor = violet `#8B5CF6`**. Each has a `-foreground` for accent fills and a `-muted` wash for the role banner. The accent appears on the role banner, the active nav lens, and the in-lens primary CTA (`button-role`). It is wayfinding — you should always know which lens you are in from the banner color alone.
- **Notice Slate (`#94A3B8`)** carries the honesty disclaimers (the scoped-claim warning, the privacy-posture notes). Deliberately *neutral*, not amber-alarm — these are sober legal clarifications, and the institutional tone reads them as information, not danger. (This also keeps amber reserved strictly for the Payer lens.)

Avoid: a fourth role color, hue-coding the balance buckets, amber anywhere outside the Payer lens, green/red used decoratively, gradients or glow on any surface.

## Typography

Two families, strictly divided by job:

- **Inter** for all UI — `display` (page titles, 28px), `heading` (18px), `body` (14px), `label` (uppercase 12px table/form labels), `caption` (12px).
- **IBM Plex Mono** [ASSUMPTION — JetBrains Mono is the alternate] for **all data**: amounts (MIST integer strings), Sui addresses (`0x…`), object ids, transaction digests, ciphertext/hex blobs, hashes, and timestamps. `data` (13px) in tables; `data-lg` (22px) for the one prominent balance figure. Every monospace number uses **tabular figures** so columns align down an audit table — non-negotiable for a ledger tool.

The institutional voice means headings are frequent and structural (this is a console, not a marketing page) but never oversized. No display type as decoration; the largest type on screen is a page title or the headline balance figure.

## Layout & Spacing

A 4-based scale (`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`) plus named tokens: `gutter 24px`, `page-margin 32px`, `row-y 10px` (dense table cells). The product is **desktop-first web, no mobile** — optimize for information density on a laptop/desktop console.

Each role surface is a **console layout**: a persistent left rail (role-scoped navigation + the role-switcher) and a primary work area that is either a dense data table (Auditor history, Payer recipients, run log) or a focused panel (Holder balance, proof generation). Comfortable max content width for tables is wide (the Auditor needs columns); focused panels cap around 640px so a single figure or form isn't lost in a field of dark.

## Elevation & Depth

Elevation is **tonal, not cast**. Rank is read from the surface ramp (`base` < `raised` < `overlay`), never from drop shadows used as hierarchy. The only true shadows are on genuinely floating layers — dialogs, popovers, the command/role menu — paired with a `border-strong` edge so they read crisply on the dark canvas. Sticky table headers sit on `surface-overlay` with a hairline bottom rule. No glow, no neon, no elevation theater.

## Shapes

Tight, instrument-like corners: `rounded/sm 4px` (inputs, badges), `rounded/md 6px` (buttons, cards, table container), `rounded/lg 8px` (dialogs, panels, the role banner). `rounded/full` is reserved for **role badges and status dots** only. The crispness reads "audit instrument," not "consumer app." No pill-shaped buttons.

## Components

- **Role banner** (`role-banner`) — full-width strip at the top of each lens. Background is the active role's `-muted` wash, left border is the role accent, label states the lens ("Auditor lens — designated read only"). Changing role changes this banner first; it is the primary orientation cue.
- **Button — primary** (`button-primary`) — Trust-Blue fill, white text, `rounded/md`. System actions (Sign, Verify, Export). **Button — role** (`button-role`) — the in-lens hero CTA (e.g., "Execute payment run," "Generate proof"); fill is the *active role's* accent with its `-foreground`. Other variants (secondary outline, ghost) inherit neutral `border-strong` / `ink-secondary`.
- **Cipher cell** — the trust-boundary primitive in any amount column. **Masked** (`cipher-cell-masked`): renders `••••••••` in `cipher-masked` slate, monospace, fixed width so the column doesn't reflow on reveal. **Revealed** (`cipher-cell-revealed`): the real figure in `ink-primary` monospace with a `cipher-reveal` aqua left-bar / unlock glyph signaling "you are authorized to see this." Never animate masked→revealed as decoration; the change is a state, not a flourish.
- **Status badge** — `badge-verified` (emerald) / `badge-failed` (rose), `rounded/full`, used for proof results, registration status, run outcomes. Text + dot; one verdict per badge.
- **Notice / disclaimer** (`notice-disclaimer`) — bordered block on `surface-overlay`, `notice` slate text, info glyph (not a warning triangle). Carries the scoped-claim disclaimer ("Proves a selected sum — not total income, nor which entries were included") and privacy-posture notes. Sober, never red.
- **Data table** (`data-table`) — the workhorse: `surface-sunken` body, `ink-secondary` uppercase `label` headers, `border-hairline` row dividers, `row-y` dense padding, monospace `data` cells with tabular figures, sortable columns for the Auditor console. Sticky header on scroll.
- **Audit-log row** (`audit-log-row`) — append-only, read-only. Monospace, with a faint `chain-marker` glyph linking each entry to the previous (the visual analog of the SHA-256 hash chain). No edit/delete affordances ever render.
- **Disclosure-receipt card** — the Mode B export artifact: holder, disclosed value `X` (monospace `data-lg`), included-entry count (never *which* entries), proof blob (truncated hex in a `surface-sunken` well), and a `badge-verified`/`badge-failed` slot for the verifier's result.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Let surface tone (`base`/`raised`/`overlay`/`sunken`) carry hierarchy | Use drop shadows as a ranking device |
| Reserve each role accent for its lens (banner, nav, in-lens CTA) | Use amber outside the Payer lens, or mix role colors |
| Render all amounts/addresses/hashes in monospace with tabular figures | Set ledger data in proportional Inter |
| Keep `cipher-masked` ↔ `cipher-reveal` contrast unmistakable | Animate or decorate the masked→revealed transition |
| Use emerald/rose only for real verdicts (verified / failed / fails-closed) | Use green/red decoratively or for chrome |
| Carry disclaimers in neutral `notice` slate with an info glyph | Render honesty disclaimers as red alarms |
| Keep the dark canvas restrained — no gradients, glow, or ornament | Add "crypto-native" neon to chase the ecosystem look |
