# Story 1.0: UI Contract & Signature Cell *(fixture-only)*

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer building three role lenses,
I want a shared UI contract — design tokens, atomic components, the `<CipherCell>` component, a role-switcher shell, and state primitives — established against fixtures before any lens is built,
so that all three lenses share one visual identity and the signature masked↔revealed cell can never drift.

## Story Context

- **Epic:** Epic 1 — Foundation, Confidential Data Plane & Mode B Feasibility.
- **Owner:** Tenny (frontend). Runs **in parallel with Story 1.1a** (JJ, crypto/build) — neither depends on the other's output. [Source: epics.md#Ownership & Work Split]
- **Scope flag — FIXTURE-ONLY:** No lens wires to real data. **No `@mysten/*` and no `core/crypto` call is made from any lens/component in this story.** This is the visual contract layer only. [Source: epics.md#Story 1.0 — final AC]
- **Why this is first:** It is sequenced *before* crypto work so the masked↔revealed `<CipherCell>` and the token system exist as one contract that the Payer/Holder/Auditor lenses (Epics 1–4) consume and can never re-describe or drift from. [Source: epics.md#Ordered story spine]
- **Shared predecessor:** A one-time repo scaffold (pnpm workspace + vendored pinned Contra submodule + **copy-then-pruned kaisho web base**). Story 1.0 consumes the pruned `apps/web` base. See "Project Structure Notes" for the ownership question. [Source: epics.md#Epic 1 — Shared root + fork; architecture.md#Selected Starter]

## Acceptance Criteria

1. **Design-token layer (UX-DR1/2/3).** Given the copy-then-pruned kaisho web base, when the design-token layer is built, then the **typography scale** (DR2), the **spacing + tonal-elevation scale** (DR3), the surface/ink/semantic tokens, the `cipher-masked`/`cipher-reveal` pair, and amber/aqua/violet role tokens exist as **named CSS variables + a typed token map**, and **no hex literals appear in components** (Aperture tokens override kaisho on conflict).

2. **Atomic-component kit (UX-DR4/6/7/8).** Given the kit, when built, then `role-banner` (DR4), `button-primary` + `button-role` (DR6), `status-badge` verified/failed (DR7), and `notice-disclaimer` (DR8) render against fixtures and **read all visual values from tokens** (zero hardcoded color/spacing).

3. **`<CipherCell>` state machine (UX-DR5/24).** Given a fixture ciphertext value, when `<CipherCell>` renders, then it shows masked `••••` (fixed width, `cipher-masked`) by default and the real figure with the `cipher-reveal` marker when `revealed=true`, and **the column does not reflow on reveal**, and the change is a **state — never a hover trick**.

4. **CipherCell identity invariant (signature demo moment, owned here).** Given the same ciphertext token rendered masked in one lens and revealed in another, then it carries a **shared stable identifier/anchor** so the reveal reads as continuity (same cell), not coincidence; **and the masked→revealed transition (duration/easing/swap-vs-decrypt-in-place) is specified once here** and consumed by Stories 2.3 and 4.1, never re-described.

5. **Stub-framed components (UX-DR9/10/11).** Given stub-framed components, when `data-table` (DR9), `audit-log-row` (DR10), and `disclosure-receipt-card` (DR11) are built, then **only their frame/rhythm/slot layout exists in 1.0** (row/header/cell density, badge slot, card frame); real column/event/proof data binds later in 2.3 / 2.4 / 3.5.

6. **Role-switcher shell + Mode B front door (UX-DR12/23; FR-21 shell).** Given the app boots, when no role is selected, then the role-switcher shell renders three lens slots (stubs), **opens on the Mode B Holder front door**, and key-dependent actions render **disabled with "Sign to unlock →"**.

7. **State primitives (UX-DR20).** Given any async surface, when it needs feedback, then **reusable skeleton-loader, error-card, and empty-state shells are available from one source**.

8. **Accessibility — trust boundary beyond color (UX-DR21).** Given WCAG 2.2 AA, when the trust boundary renders, then **sealed vs revealed is distinguishable by glyph/marker, not color alone**.

9. **Fixture-only boundary (AR-15).** Given this is fixture-only, then no lens wires to real data and **no `@mysten/*` / `core/crypto` call is made from a lens/component** (lint zones enforce).

## Tasks / Subtasks

- [ ] **Task 1 — Token layer: CSS variables + typed token map (AC: 1)**
  - [ ] Author the full token set as named CSS custom properties on the dark-default `:root`, sourced verbatim from `DESIGN.md` frontmatter (see Dev Notes "Token Reference"). Include surfaces, ink ramp, borders, primary/ring, semantic (`verified`/`failed`/`notice`), the trust pair (`cipher-masked`/`cipher-reveal`), and the three role accents each with `-foreground` + `-muted`.
  - [ ] Create a **typed token map** (TS) mirroring the variables so components reference tokens by name, never raw values. Infer/keep types strict.
  - [ ] Implement the typography scale (`display`/`heading`/`body`/`label`/`caption`/`data`/`data-lg`) — Inter for UI, **IBM Plex Mono with tabular figures** for all `data`/`data-lg`. Load both font families.
  - [ ] Implement the spacing scale (4-based + named `gutter`/`page-margin`/`row-y`), radius tokens (`sm/md/lg/full`), and **tonal elevation** (surface ramp carries rank; true shadows only on floating dialogs/popovers with a `border-strong` edge).
  - [ ] Confirm Aperture tokens override kaisho where they conflict.
- [ ] **Task 2 — Atomic component kit, token-driven (AC: 2)**
  - [ ] `RoleBanner` — full-width strip; active role `-muted` wash + accent left-border; states the lens label (e.g. "Auditor lens — designated read only"). [DR4]
  - [ ] `ButtonPrimary` (trust-blue, system actions) + `ButtonRole` (active-role accent, in-lens hero CTA); secondary/ghost inherit neutral `border-strong`/`ink-secondary`. **No pill buttons.** [DR6]
  - [ ] `StatusBadge` — `badge-verified` (emerald) / `badge-failed` (rose), `rounded-full`, text + dot, one verdict per badge. [DR7]
  - [ ] `NoticeDisclaimer` — bordered `surface-overlay`, neutral `notice` slate text, **info glyph (never a warning triangle, never red)**. [DR8]
- [ ] **Task 3 — `<CipherCell>` + identity invariant (AC: 3, 4, 8)**
  - [ ] Build the `<CipherCell>` state machine with states **masked / revealing / revealed / error** (epics names all four).
  - [ ] Masked = `••••••••` fixed-width in `cipher-masked` mono; revealed = real figure in `ink-primary` mono with the `cipher-reveal` aqua left-bar / unlock marker. Guarantee **no column reflow** on reveal (reserve width).
  - [ ] Accept a **stable `cipherId`/anchor prop** so the same ciphertext masked in one lens and revealed in another is provably the same cell.
  - [ ] **Specify the masked→revealed transition ONCE here** (duration / easing / swap-vs-decrypt-in-place) and document it inline as the canonical source for Stories 2.3 + 4.1. Reveal is an **authorization state, never animated as decoration / never a hover trick**.
  - [ ] A11y: convey sealed vs revealed by **glyph/marker in addition to color** (masked `••••` glyph; revealed unlock marker + figure).
- [ ] **Task 4 — Stub-framed components (AC: 5)**
  - [ ] `DataTable` frame — `surface-sunken` body, uppercase `ink-secondary` `label` headers, `border-hairline` dividers, dense `row-y` padding, monospace `data` cell slots, sticky-header slot. Frame/rhythm only; no data binding. [DR9]
  - [ ] `AuditLogRow` frame — append-only read-only row with `chain-marker` glyph slot; **no edit/delete affordance renders**. Frame only. [DR10]
  - [ ] `DisclosureReceiptCard` frame — slots for holder pubkey, disclosed `X` (`data-lg`), included-count slot, truncated proof-blob well (`surface-sunken`), result badge slot. Frame only. [DR11]
- [ ] **Task 5 — Role-switcher shell + Mode B front door + state primitives (AC: 6, 7)**
  - [ ] `RoleSwitcher` shell in a persistent left-rail header with three lens slots (Payer/Holder/Auditor) as stubs; **app boots on the Mode B Holder front door**, not a wallet wall.
  - [ ] Key-dependent action stubs render **disabled with "Sign to unlock →"** (no real signing in this story).
  - [ ] Single source for `SkeletonLoader`, `ErrorCard`, `EmptyState` shells.
- [ ] **Task 6 — Fixture harness + enforcement (AC: 1, 2, 9)**
  - [ ] Render every component against **fixtures** (no real data, no network, no crypto).
  - [ ] Add the lint zone that bans `node:*` in `apps/web` and asserts **no `@mysten/*` / `core/crypto` import from a lens/component**. [AR-15]
  - [ ] Add a check/lint that **no hex color literals** appear in components (tokens only). [AC-1]
- [ ] **Task 7 — Verify**
  - [ ] Component tests against fixtures for the token-driven render of each atom + `<CipherCell>` masked/revealed/no-reflow + identity-anchor continuity.
  - [ ] Confirm trust boundary distinguishable without color (glyph/marker present in DOM).
  - [ ] Confirm the fixture-only / no-crypto-import lint zone fails on a deliberate violation.

## Dev Notes

### Architecture & altitude
- **Base = copy-then-pruned `kaisho`** (React 19 + Vite, copied from Contra). Component plumbing + hooks + the dlog worker are reused; the **visual identity is Aperture's own and wins on conflict** with kaisho tokens. [Source: DESIGN.md#Brand & Style; architecture.md#Frontend Architecture]
- **State:** kaisho's React Query + light local state — **do not add a second state library.** [Source: architecture.md#Frontend Architecture]
- **No mobile.** Desktop-first console, min width ≈ 1024px; below that tables scroll horizontally, never reflow. [Source: EXPERIENCE.md#Responsive & Platform]
- This story creates **no** backend, no `apps/api`, no real crypto. It is purely `apps/web` presentation + a typed token contract.

### Token Reference (authoritative — copy verbatim from DESIGN.md frontmatter)
Dark is the default scheme; base tokens hold the dark values. [Source: DESIGN.md frontmatter `colors`/`typography`/`rounded`/`spacing`/`components`]

- **Surfaces:** `surface-base #0B0F1A`, `surface-raised #131926`, `surface-overlay #1B2433`, `surface-sunken #070A12`.
- **Ink:** `ink-primary #E6EAF2`, `ink-secondary #9AA4B8`, `ink-disabled #5A6478` (also the masked `••••` glyph), `ink-inverse #0B0F1A`.
- **Borders:** `border-hairline #1E2738`, `border-strong #2C3850`.
- **Primary / focus:** `primary #3B82F6`, `primary-hover #2563EB`, `primary-foreground #FFFFFF`, `ring #3B82F6` (AA against `surface-base`).
- **Semantic:** `verified #34D399` (+`-foreground #04231A`), `failed #FB7185` (+`-foreground #2A0710`), `notice #94A3B8` (neutral slate, NOT alarmist).
- **Trust boundary (the signature):** `cipher-masked #5A6478`, `cipher-reveal #22D3EE`.
- **Role accents:** Payer `role-payer #F59E0B` (+`-foreground #1A1208`, `-muted #2A2110`); Holder `role-holder #06B6D4` (+`-foreground #04222A`, `-muted #0A2129`); Auditor `role-auditor #8B5CF6` (+`-foreground #14082A`, `-muted #1C1430`).
- **Typography:** Inter — `display` 28px/600, `heading` 18px/600, `body` 14px/400, `label` 12px/500 uppercase (letter-spacing .04em), `caption` 12px/400. **IBM Plex Mono** (JetBrains Mono is the noted alt) — `data` 13px (tabular-nums) for amounts/addresses/object-ids/tx-digests/ciphertext/hashes/timestamps; `data-lg` 22px/500 for the one prominent balance figure.
- **Radius:** `sm 4px` (inputs/badges), `md 6px` (buttons/cards/table container), `lg 8px` (dialogs/panels/role banner), `full 9999px` (**reserved for role badges + status dots only**).
- **Spacing:** 4-based `4/8/12/16/20/24/32/40/48/64` + `gutter 24px`, `page-margin 32px`, `row-y 10px`.

### Hard design rules (enforce in components)
- **No hex literals in components** — everything reads from the token map/variables. [AC-1; DESIGN.md#Do's and Don'ts]
- **Tonal elevation only** — surface ramp carries rank; **no drop-shadow-as-hierarchy**; true shadows only on floating dialogs/popovers (+ `border-strong` edge). **No gradients / glow / neon.** [Source: DESIGN.md#Elevation & Depth, #Shapes]
- **All data in monospace with tabular figures** (amounts/addresses/hashes/ciphertext/timestamps). Never set ledger data in proportional Inter. [Source: DESIGN.md#Typography]
- **Role accent discipline:** amber only inside the Payer lens; never a fourth role hue; never mix role colors; green/rose never decorative — only real verdicts. [Source: DESIGN.md#Colors, #Do's and Don'ts]
- **Reveal = state, never hover.** No hover-to-peek on confidential data; **no decorative masked→revealed animation.** [Source: EXPERIENCE.md#Interaction Primitives — Banned everywhere]
- **Audit-log frame:** no edit/delete affordance ever renders (even as a stub). [Source: DESIGN.md#Components — audit-log-row; UX-DR24]

### CipherCell — the signature primitive (owned by this story)
- It is "the same ciphertext rendered sealed in one lens and revealed in another" — **the product's core truth made visible; protect this contrast above all.** [Source: DESIGN.md#Colors — Trust boundary]
- States: **masked / revealing / revealed / error** (epics enumerate all four). [Source: epics.md#Story 1.0 AC3]
- Masked must be **fixed-width** so a column never reflows when a sibling reveals. [Source: DESIGN.md#Components — Cipher cell]
- The **identity invariant** (shared anchor + the single transition spec) is authored here and *consumed* by Story 2.3 (auditor designated decrypt) and Story 4.1 (cross-lens switch) — those stories must not re-describe the reveal. [Source: epics.md#Story 1.0 AC4, #Story 2.3, #Story 4.1]

### Voice / microcopy contract (for the labels that appear in this story)
- The EXPERIENCE.md voice table is the single voice contract; copy is authored per-flow against it. For 1.0, the only live copy is shell-level: the **"Sign to unlock →"** disabled-action label and the signature explainer *"Entering as {Role} — derive your key from a one-time signature. Nothing is stored or spent."* [Source: EXPERIENCE.md#Voice and Tone, #Component Patterns — Role switcher]
- Honesty guardrail everywhere: never "anonymous"/"untraceable"/"fully compliant". [Source: EXPERIENCE.md#Voice and Tone; NFR-9]

### File & structure targets
Per the architecture tree, frontend lives under `apps/web`: [Source: architecture.md#Complete Project Directory Structure]
- `apps/web/src/shared/components/` — atoms (`RoleBanner`, `ButtonPrimary`, `ButtonRole`, `StatusBadge`, `NoticeDisclaimer`, `CipherCell`) + stub frames (`DataTable`, `AuditLogRow`, `DisclosureReceiptCard`) + state primitives (`SkeletonLoader`, `ErrorCard`, `EmptyState`).
- `apps/web/src/shared/RoleSwitcher/` — the shell.
- Token layer: a `theme/` (CSS variables + typed token map) under `apps/web/src` (place alongside kaisho's existing style entry; Aperture tokens override on conflict).
- `vite.config.ts` already carries `worker.format:'es'`, `fs.allow`, wasm asset handling from the pruned kaisho base — **do not rip these out** (they're needed by later stories' dlog worker). [Source: architecture.md tree — `apps/web/vite.config.ts`]

### Naming conventions
- TS: `camelCase` vars/functions, `PascalCase` types/components, `SCREAMING_SNAKE` consts. Files: components `PascalCase.tsx`, other TS `camelCase.ts`, tests `*.test.ts` co-located. [Source: architecture.md#Naming]

### Testing
- Framework: **Vitest** (kaisho precedent); co-locate `*.test.ts`. [Source: architecture.md#Architectural decisions provided, #Dev Workflow]
- Tests are **fixture-driven** — no network, no chain, no crypto. Cover: each atom renders from tokens (no hardcoded values); `<CipherCell>` masked/revealed states + no-reflow + identity-anchor continuity; trust boundary present beyond color in the DOM; lint zone rejects a deliberate `@mysten/*`/`core/crypto` import from a component.

### Latest-tech / version policy (read before installing anything)
- **Pin to the Contra commit. Do NOT chase latest** (C6). Vite/React versions follow the pinned Contra commit's kaisho, not npm latest. Latest-for-awareness only (do not upgrade to these): `@mysten/sui 2.17.0`, Vite 8.0.9, React 19. [Source: architecture.md#Architectural decisions provided; epics.md AR-1/3]
- The pruned kaisho base already brings its own React/Vite versions — inherit them; adding newer majors is an anti-pattern that breaks the pinned-baseline guarantee.

### Project Context Reference
- No `project-context.md` exists in the repo at story-creation time; this story's guardrails derive entirely from `epics.md`, `architecture.md`, `DESIGN.md`, and `EXPERIENCE.md` cited above.

### Project Structure Notes
- **Greenfield:** at story-creation the repo is not yet initialized and `apps/web` does not exist. Story 1.0 cannot start until the **shared scaffold predecessor** (pnpm workspace + copy-then-pruned kaisho `apps/web`) exists. The work-split table assigns "prune kaisho web base" to Tenny as the collaborator slice of **Story 1.1a** — so the pruned base is produced under 1.1a even though 1.0 consumes it. epics.md asserts "neither 1.0 nor 1.1a depends on the other's output" at the *feature* level, but the **pruned web base is a true prerequisite** for 1.0. **Open question (see below) — confirm the scaffold sequencing so 1.0 isn't blocked.** [Source: epics.md#Epic 1 — Shared root + fork, #Ownership & Work Split]

### References
- [Source: epics.md#Story 1.0: UI Contract & Signature Cell (fixture-only)] — story statement + all 9 ACs + component-ownership note.
- [Source: epics.md#Epic 1 — Shared root + fork] — parallelism with 1.1a, scaffold predecessor.
- [Source: DESIGN.md frontmatter + #Components + #Colors + #Typography + #Elevation & Depth + #Shapes + #Do's and Don'ts] — token values + component visual specs.
- [Source: EXPERIENCE.md#Component Patterns + #State Patterns + #Voice and Tone + #Interaction Primitives + #Accessibility Floor] — behavior, states, bans, voice, a11y.
- [Source: architecture.md#Frontend Architecture + #Complete Project Directory Structure + #Naming + #Enforcement] — base, structure, naming, lint zones.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.

### File List

## Open Questions for Tenny

1. **Scaffold sequencing (blocking dependency).** The pruned kaisho `apps/web` base is assigned to Story 1.1a's collaborator slice but is a hard prerequisite for Story 1.0. Should the one-time scaffold (pnpm workspace + submodule + pruned web base) be split out as a tiny shared "Story 1.0-pre / scaffold" task so both 1.0 and 1.1a can truly start in parallel, or does Tenny prune the web base first as the opening move of 1.0?
2. **Mono font choice.** DESIGN.md marks IBM Plex Mono as `[ASSUMPTION]` with JetBrains Mono as the alternate. Confirm IBM Plex Mono before the font is wired (changing it later touches every data cell).
3. **Light theme.** DESIGN.md keeps a light-theme stub but "scheme = both was NOT chosen." Confirm we ship **dark-only** for the PoC (so the token layer doesn't need a full light ramp).
