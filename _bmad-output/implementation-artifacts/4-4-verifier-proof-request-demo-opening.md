---
story_track: 4-4
status: ready-for-dev
---

# Story 4.4: Verifier Proof Request (Demo Opening)

Status: ready-for-dev

## Story

As a Verifier (e.g. a lender),
I want to issue a proof request that the Holder's Prove flow answers,
so that the demo opens with a motivated ask ("you asked → I proved → you verified") instead of an unmotivated figure.

## Story Context

- **Epic:** Epic 4 — Demo, Polish & Continuity. Depends on Epics 1–3 existing: Stories 3.1, 3.2, 3.3 done.
- **Owner:** Tenny (lead, solo — frontend + demo narrative).
- **Position in the Epic 4 spine:** this is the last wiring story before the demo runs end-to-end. Stories 4.1–4.3 (session-key auth, state coverage audit, accessibility sweep) precede it; Story 4.5 (one-command seed script + continuity fallback) comes after.
- **What this story delivers:**
  - A static `DEMO_REQUEST` fixture object that frames every interaction as a response to a named ask.
  - A `VerifierRequestCard` component that renders that request at the top of the Holder lens (left panel).
  - URL query-param loading (`/?request=demo-verifier-1`) so the card pre-populates when sharing the demo link.
  - Wiring into the existing `SelectEntries` (3.1) and proof generator (3.2/3.3) flows: the request's `requiredAmount` seeds the target, and the verify result updates the card to `badge-verified` or `badge-failed`.
  - The front-door layout: left `VerifierRequestCard` + right `SelectEntries`/prove flow, role-switcher in header, stubs for Payer/Auditor.
  - The scoped-claim honesty notice inside the request card.
- **What this story does NOT do:**
  - Build a real Verifier backend, an API endpoint, or any network call for the request. The fixture is hardcoded.
  - Implement QR codes or full deeplink infrastructure beyond the single `?request=` query param.
  - Touch Stories 3.1–3.3 logic. This story wires the framing UI only.

## Acceptance Criteria

1. **Demo front door opens on Mode B Holder flow (UX-DR23).** Given the app boots (with or without `?request=demo-verifier-1`), when the Holder lens is active, then the `VerifierRequestCard` renders above or left of the Holder prove flow — visible without scrolling, not behind a nav step.

2. **Verifier request artifact present at boot (UX-DR23, demo narrative).** Given the front door, when the app loads with `?request=demo-verifier-1` (or no param, since demo always uses this fixture), then the `VerifierRequestCard` shows:
   - Requester name: "Acme Lender"
   - Request message: "Prove your selected total ≥ 50,000 MIST to proceed with your loan application."
   - Required amount (`data-lg` styled): `50,000 MIST`
   - Status slot: initially `idle` — "Awaiting proof"
   - The scoped-claim disclaimer inside the card: "The proof shows the selected sum only — not total income or which entries were included."

3. **Request → prove → verify loop is closed (FR-17, SM-3).** Given the Holder generates a proof that passes Story 3.3 verify, when the verify result resolves, then:
   - The `VerifierRequestCard` status slot updates to `badge-verified` "Verified — request satisfied" (green, `{colors.verified}`).
   - The disclosed `X` shown in the card matches the `X` that the proof was generated for (same value, rendered `data-lg`).
   - Given the verify result is `failed` (tampered X or bad proof), then the status slot shows `badge-failed` "Doesn't verify" (red, `{colors.failed}`).

4. **Opening question and closing verdict reference the same X (FR-17, SM-3).** Given the full loop runs, then:
   - The request card's `requiredAmount` (50,000 MIST) is visible before proof generation.
   - After verify, the card shows the proved `X` alongside the `badge-verified` result.
   - No other value is implied as the target. The user never free-enters X.

5. **Shareable link pre-populates the card (demo narrative).** Given a URL with `?request=demo-verifier-1`, when the app loads, then the `VerifierRequestCard` renders with the fixture data pre-populated (identical to the default state). Given a URL with no param or an unrecognized param value, then the card still renders with the default `DEMO_REQUEST` (graceful fallback — never a white screen or crash).

6. **Scoped-claim disclaimer visible in request card (NFR-9, UX-DR24).** Given the `VerifierRequestCard` is rendered, then the DOM contains the exact string: `"The proof shows the selected sum only — not total income or which entries were included."` This must be present at all times (idle, generating, verified, failed) — snapshot-locked.

## Dev Agent Technical Context

### The DEMO_REQUEST fixture

Define this constant in a new file `apps/web/src/features/holder/demoRequest.ts`:

```ts
export const DEMO_REQUEST = {
  requestId: "demo-verifier-1",
  requesterName: "Acme Lender",
  requiredAmount: 50_000n, // MIST
  message:
    "Prove your selected total ≥ 50,000 MIST to proceed with your loan application.",
} as const;

export type DemoRequest = typeof DEMO_REQUEST;
```

This is the only request the demo supports. No map, no registry. The `requestId` is used only to match the URL param.

### URL param handling

In `apps/web/src/App.tsx` (or wherever routing lives), read `?request=` at app boot:

```ts
const params = new URLSearchParams(window.location.search);
const requestId = params.get("request");
const activeRequest =
  requestId === DEMO_REQUEST.requestId ? DEMO_REQUEST : DEMO_REQUEST;
// Always resolves to DEMO_REQUEST — the param gates future extensibility only.
// For the demo, the card is always shown.
```

No router dependency needed. `window.location.search` is sufficient. Do not add `react-router` if it is not already a dependency.

### VerifierRequestCard component

New file: `apps/web/src/features/holder/VerifierRequestCard.tsx`

Props:

```ts
interface VerifierRequestCardProps {
  request: DemoRequest;
  provedAmount?: bigint;       // set when proof is generated; undefined until then
  verifyResult?: "verified" | "failed" | "pending";
}
```

Render structure (top-down within the card):

1. **Header row:** Role pill "Verifier" (violet accent, `{colors.role-auditor}`) + requester name "Acme Lender" in `{typography.heading}`.
2. **Request message:** `request.message` in `{typography.body}`, `{colors.ink-secondary}`.
3. **Required amount:** Label "Requested figure" (`{typography.label}`), value `50,000 MIST` in `{typography.data-lg}` (IBM Plex Mono 22px, `{colors.ink-primary}`).
4. **Status slot:**
   - `verifyResult` undefined or `"pending"` → neutral pill "Awaiting proof" (`{colors.ink-disabled}`).
   - `verifyResult === "verified"` → `badge-verified` "Verified — request satisfied" + `provedAmount` rendered `data-lg` beside it.
   - `verifyResult === "failed"` → `badge-failed` "Doesn't verify".
5. **Disclaimer block:** `NoticeDisclaimer` (reuse from Story 1.0) with verbatim text: `"The proof shows the selected sum only — not total income or which entries were included."`

Card surface: `{colors.surface-raised}`, border `{colors.border-strong}`, radius `{rounded.lg}`. This is a read-only display — no interactive elements beyond what the parent wires.

### Front-door layout in App.tsx

The Holder lens view renders a two-column layout when Mode B is active:

```
┌──────────────────────────┬─────────────────────────────────┐
│  VerifierRequestCard     │  SelectEntries (3.1)            │
│  (left, ~40% width)      │  + ProofGenerator (3.2)         │
│                          │  + VerifyResult (3.3)           │
└──────────────────────────┴─────────────────────────────────┘
```

Use a CSS flex row (or grid). The right panel already exists from Stories 3.1–3.3. The left panel is the `VerifierRequestCard` added by this story.

Pass the verify result from Story 3.3's output up to the parent so both the left card and the right disclosure-receipt card update on the same event. The simplest approach: lift `verifyResult` state into the Holder lens container component and pass it down as props to both `VerifierRequestCard` and the Story 3.3 verify surface.

### State lifting — minimal pattern

In the Holder lens container (wherever Stories 3.1–3.3 are wired):

```ts
const [verifyResult, setVerifyResult] =
  React.useState<"verified" | "failed" | "pending" | undefined>(undefined);
const [provedAmount, setProvedAmount] = React.useState<bigint | undefined>(undefined);

// Pass to Story 3.3's verify component:
// onVerifyComplete={(result, amount) => { setVerifyResult(result); setProvedAmount(amount); }}

// Pass to VerifierRequestCard:
// verifyResult={verifyResult} provedAmount={provedAmount}
```

No global store. No React Query (no fetch). Keep it local to the Holder lens.

### Architecture rules

- **AR-14 (dependency direction):** `VerifierRequestCard` imports only from React, shared components (`apps/web/src/shared/components/`), and `demoRequest.ts`. No `@aperture/core/crypto`, no `@mysten/*`, no `node:*`.
- **AR-15 (lint zone):** no `node:*` imports anywhere in this story's new files.
- **UX-DR24 (interaction bans):** the card has no edit affordance, no hover-to-reveal, no modal. Read-only display only.
- **NFR-9 (honesty):** the disclaimer is always visible. It is never hidden on verify success.

### Reuse from earlier stories (do not recreate)

| What | Component | Source story |
|---|---|---|
| Scoped-claim disclaimer | `NoticeDisclaimer` | Story 1.0 |
| `badge-verified` / `badge-failed` pills | Design token classes | Story 1.0 |
| `data-lg` class (IBM Plex Mono 22px) | `apps/web/src/theme/typography.css` | Story 1.0 |
| `SkeletonLoader`, `ErrorCard`, `EmptyState` | `apps/web/src/shared/components/` | Story 1.0 |
| Role banner (Holder aqua accent) | `RoleBanner` | Story 1.0 |

### Microcopy (voice/tone — UX-DR19)

| Location | Exact copy |
|---|---|
| Card header | "Acme Lender" |
| Request message | "Prove your selected total ≥ 50,000 MIST to proceed with your loan application." |
| Required amount label | "Requested figure" |
| Status — idle | "Awaiting proof" |
| Status — verified | "Verified — request satisfied" |
| Status — failed | "Doesn't verify" |
| Disclaimer | "The proof shows the selected sum only — not total income or which entries were included." |

Do not use: "anonymous", "compliant", "proven balance", "income verified", "total balance", or any superlative about what Aperture guarantees.

### Testing notes

- Framework: Vitest + jsdom. Co-locate at `VerifierRequestCard.test.tsx`.
- Test: renders idle state (requester name, message, required amount, "Awaiting proof", disclaimer all present).
- Test: renders verified state (badge-verified text, provedAmount shown, disclaimer still present).
- Test: renders failed state (badge-failed text present, disclaimer still present).
- Test: URL param `?request=demo-verifier-1` results in same card as default (param matches fixture id).
- Test: URL param absent or unrecognized → card still renders (no crash, no blank).
- Snapshot: idle state → locks disclaimer string presence + absence of "income"/"anonymous"/"compliant" in rendered output.

## Tasks / Subtasks

- [ ] **Task 1 — DEMO_REQUEST fixture**
  - [ ] Create `apps/web/src/features/holder/demoRequest.ts` with the `DEMO_REQUEST` const and `DemoRequest` type as above.

- [ ] **Task 2 — VerifierRequestCard component**
  - [ ] Create `apps/web/src/features/holder/VerifierRequestCard.tsx`.
  - [ ] Implement the five render sections (header, message, required amount, status slot, disclaimer) per the spec above.
  - [ ] Status slot: idle → "Awaiting proof"; verified → `badge-verified` + proved amount; failed → `badge-failed`.
  - [ ] `NoticeDisclaimer` with the verbatim disclaimer string — always visible, never conditional.
  - [ ] No interactive elements. Read-only display.

- [ ] **Task 3 — URL param handling**
  - [ ] In `App.tsx` (or the Holder lens container), read `?request=` at boot via `window.location.search`.
  - [ ] If param equals `DEMO_REQUEST.requestId`, use `DEMO_REQUEST`; otherwise use `DEMO_REQUEST` as fallback. Never crash or blank on unknown param.

- [ ] **Task 4 — Front-door layout wiring**
  - [ ] In the Holder lens container, add the two-column flex row: left `VerifierRequestCard` (~40%), right existing prove flow (3.1/3.2/3.3).
  - [ ] Lift `verifyResult` and `provedAmount` state into the Holder lens container.
  - [ ] Wire Story 3.3's `onVerifyComplete` callback to set `verifyResult` + `provedAmount`.
  - [ ] Pass `verifyResult` and `provedAmount` down to `VerifierRequestCard`.
  - [ ] Pass `request.requiredAmount` to `SelectEntries` (3.1) as a context prop (optional display only — do not change 3.1's selection logic).

- [ ] **Task 5 — Tests**
  - [ ] Create `apps/web/src/features/holder/VerifierRequestCard.test.tsx`.
  - [ ] Cover: idle render, verified render, failed render, URL param match, URL param absent/unrecognized, snapshot with disclaimer invariant.
  - [ ] `pnpm --filter web test` passes (all existing tests + new).

- [ ] **Task 6 — Verify**
  - [ ] `pnpm --filter web lint` passes (no `node:*`, `@mysten/*`, `core/crypto` in new files).
  - [ ] `pnpm --filter web build` passes.
  - [ ] Manual: boot the app, confirm front-door shows left card + right prove flow; run the full loop (select entries → generate proof → verify → card turns badge-verified); confirm disclaimer is visible throughout.
  - [ ] Manual: load `/?request=demo-verifier-1` and confirm card pre-populates correctly.
  - [ ] Manual: load `/?request=unknown` and confirm card still renders (no blank/crash).

## Files Added / Changed

**Added:**
- `apps/web/src/features/holder/demoRequest.ts` — `DEMO_REQUEST` fixture + `DemoRequest` type
- `apps/web/src/features/holder/VerifierRequestCard.tsx` — the verifier request card component
- `apps/web/src/features/holder/VerifierRequestCard.test.tsx` — co-located tests

**Changed:**
- `apps/web/src/App.tsx` (or Holder lens container) — add URL param read, two-column layout, lift `verifyResult`/`provedAmount` state, wire `VerifierRequestCard` into the Holder lens
