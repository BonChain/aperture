---
story_track: 4-3
status: ready-for-dev
---

# Story 4.3: Global State & Accessibility Sweep

Status: ready-for-dev

## Story

As any user,
I want complete empty/error/loading states and WCAG 2.2 AA across all lenses,
so that the demo never white-screens and the tool is accessible.

## Story Context

- **Epic:** Epic 4 — Demo Narrative & Polish.
- **Owner:** Tenny (lead, solo — all frontend + copy gate).
- **Position in the spine:** runs after Stories 3.1, 3.2, 3.3, 4.1, and 4.2 are done. This story audits what is built, fills gaps, and sweeps the whole rendered surface for state coverage and accessibility. It does not add new features.
- **Predecessor state:** Story 1.0 done (state primitives — `SkeletonLoader`, `ErrorCard`, `EmptyState` — exist in `apps/web/src/shared/components/StatePrimitives.tsx`). Stories 3.1, 3.2, 3.3 (Mode B), 4.1 (role-switch), 4.2 (explorer links) are done. The full rendered surface exists.
- **Sprint scope:** because Epic 2 (Auditor Console) and data plane (Stories 1.3–1.9) are **parked**, the state-coverage audit applies only to the **Mode B flows** (3.1 select, 3.2 generate, 3.3 verify) and the **role-switcher** (4.1). The WCAG sweep and copy gate cover ALL rendered UI including parked-but-rendered stub lenses.
- **What it is:** An audit + gap-fill story. Read every rendered surface, compare against the state list below, add missing states, run an axe scan, run the copy gate lexicon lint.
- **What it is not:** It does not build new Mode B features. It does not build the data plane or Auditor Console. It does not add production auth or key management beyond what is already built.

## Acceptance Criteria

1. **Complete state coverage — no white screen (UX-DR20).** Given each Mode B lens and the role-switcher, when audited, then every async action has `idle | loading | success | error` and the scoped state list renders correctly (see Dev Agent Technical Context for the exact list). At no point does the app render a blank screen or unhandled error boundary.

2. **WCAG 2.2 AA — zero axe violations (UX-DR21).** Given the full rendered app (all roles, Mode B flows), when an automated axe scan runs (`@axe-core/react` or `vitest-axe`), then zero violations are reported. Additionally: trust boundary is conveyed beyond color (masked `••••` glyph; unlock marker for revealed), verdicts carry text + icon (never color alone), tab order matches reading order, `Esc` closes the top dialog, and `aria-live` is present on proof-gen and balance-decrypt progress.

3. **Honesty guardrail — zero banned words in rendered DOM (NFR-9, UX-DR19).** Given all rendered Mode B component copy, when the lexicon lint runs (a Vitest test that renders each Mode B component and reads `document.body.textContent`), then zero occurrences of the following appear: `"anonymous"`, `"untraceable"`, `"fully compliant"`, `"ElGamal"`, `"ciphertext"`, `"BCS"`, `"Fiat-Shamir"`, `"PTB"`, `"limb"`. The exact scoped-claim disclaimer string `"Proves a selected sum — not total income, nor which entries were included."` is present in the Mode B selection panel.

4. **Non-production keys disclaimer visible (NFR-8).** Given the app renders in any role, when the page loads, then a `NoticeDisclaimer` (or equivalent) component is visible somewhere on screen with the exact text `"Demo keypairs — not for production use"`.

## Dev Agent Technical Context

### Scoped state list for Mode B (the exhaustive set for this sprint)

The following states must each render correctly. For every state listed, there must be a Vitest test or a manual-check item in the task list verifying it renders the correct UI and does **not** white-screen.

| State key | Trigger | Expected UI |
|---|---|---|
| `no-session-key` | Holder role entered but no wallet signature yet | Key-dependent buttons (`data-testid="generate-proof-btn"`, `data-testid="verify-btn"`) render disabled with label `"Sign to unlock →"`. Never a crash. |
| `proof-generating` | Story 3.2 `GenerateProof` action in flight | Spinner + elapsed timer `"Generating proof… Xs"` (IBM Plex Mono). `aria-live="polite"` announces progress. |
| `proof-done` | Story 3.3 verify returns success | `StatusBadge` `badge-verified` variant renders with text `"Verified"` + icon. |
| `proof-failed` | Story 3.3 verify returns failure / tampered input | `StatusBadge` `badge-failed` variant renders with text `"Doesn't verify"` + icon. Never a blank. |
| `aggregate-out-of-range` | Story 3.1 bound-and-reject fires | Entry checkbox disabled, inline message `"Adding this entry exceeds what can be proven in one figure. Prove a smaller selection."` |
| `mode-b-unavailable` | devnet unreachable at runtime (caught error) | `ErrorCard` (from `StatePrimitives`) with message `"Mode B is currently unavailable. The demo keypairs are loaded and ready — reconnect to continue."` and a "Retry" button. **No white screen.** |
| `empty-entries` | Holder lens, no fixture entries loaded | `EmptyState` (from `StatePrimitives`) with message `"No encrypted entries yet. Connect your wallet to see entries."` |

**States NOT required this sprint (parked with data plane):** balance decrypting, empty recipients, 8th-recipient reject, unregistered-at-run block, run executing, claim-race, withdraw-crossing, non-designated fails-closed, empty audit trail. These belong to the parked data plane and Auditor Console stories.

### axe-core integration — dev-only, zero production cost

Use `@axe-core/react` in the Vitest browser environment OR `vitest-axe`. Do NOT add axe to the production bundle.

**Option A — vitest-axe (recommended; no browser env required):**

```ts
// apps/web/src/a11y/axe.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

it('Mode B Holder flow has zero axe violations', async () => {
  const { container } = render(<HolderFlow />); // or the full <App /> with Holder role
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

Check whether `vitest-axe` is already in `apps/web/package.json`. If not, add it as a `devDependency`. Do NOT add `axe-core` directly to the production bundle.

**Option B — @axe-core/react in dev mode:**

```ts
// apps/web/src/main.tsx (dev guard)
if (import.meta.env.DEV) {
  const axe = await import('@axe-core/react');
  const React = await import('react');
  const ReactDOM = await import('react-dom');
  axe.default(React.default, ReactDOM.default, 1000);
}
```

Only choose Option B if Option A produces environment incompatibilities. Record the choice in the Dev Agent Record.

### Honesty copy rules (NFR-9, UX-DR19) — enforce in the lexicon lint test

**NEVER in any rendered DOM:**
- `"anonymous"`, `"untraceable"`, `"fully compliant"`, `"private"` (when used to imply anonymity)
- Jargon: `"ElGamal"`, `"ciphertext"`, `"BCS"`, `"Fiat-Shamir"`, `"PTB"`, `"limb"`

**ALWAYS in Mode B selection panel:**
- Phrase: `"amount-confidential, selectively disclosable"` (at minimum somewhere in Mode B copy)
- Scoped-claim disclaimer (verbatim, snapshot-locked by AC-3):
  > `"Proves a selected sum — not total income, nor which entries were included."`

**Non-production disclaimer (verbatim, required by AC-4):**
> `"Demo keypairs — not for production use"`

The lexicon lint test renders each Mode B component in isolation (using `@testing-library/react` `render()`) and calls `container.textContent` to inspect the full rendered text. Assert zero occurrences of banned words using a simple string scan — no regex required.

```ts
// apps/web/src/a11y/lexiconLint.test.tsx
const BANNED = [
  'anonymous', 'untraceable', 'fully compliant',
  'ElGamal', 'ciphertext', 'BCS', 'Fiat-Shamir', 'PTB', 'limb',
];

const components = [
  <SelectEntries />,
  <GenerateProof ... />,
  <VerifyProof ... />,
  // add each Mode B component here
];

for (const component of components) {
  it(`${component.type.name} contains no banned words`, () => {
    const { container } = render(component);
    const text = container.textContent ?? '';
    for (const word of BANNED) {
      expect(text).not.toContain(word);
    }
  });
}
```

### Trust boundary beyond color (UX-DR21)

The `CipherCell` component (Story 1.0) already renders masked `••••` as a glyph (not just grey color). Confirm for this story:

1. `CipherCell` masked state: `aria-label` is `"Encrypted — value hidden"` (or equivalent meaningful string, NOT `"Revealed value "` with trailing space — that was patched in 1.0 review).
2. `CipherCell` revealed state: unlock marker (`🔓` or `.cipher-reveal` left-bar CSS) is present **and** the `aria-label` names the value.
3. The axe scan will catch any color-only distinction — zero violations = this is covered.

### Reuse from Story 1.0 — do NOT create new loading/error components

All state primitive shells already exist in `apps/web/src/shared/components/StatePrimitives.tsx`:

| What to reuse | Export name | When to use |
|---|---|---|
| Loading feedback | `SkeletonLoader` | Any async idle/loading state that doesn't have a more specific spinner |
| Error feedback | `ErrorCard` | `mode-b-unavailable` and any caught error state |
| Empty feedback | `EmptyState` | `empty-entries` and any zero-item list state |

Import from `apps/web/src/shared/components` (barrel). Do NOT import `StatePrimitives.tsx` directly by filename — use the barrel.

The `NoticeDisclaimer` component (Story 1.0) carries the non-production disclaimer (AC-4). If it is not already rendered somewhere globally visible, add it to `App.tsx` or the Holder role shell.

### `aria-live` requirements (UX-DR21)

Two places require `aria-live`:

1. **Proof generation (Story 3.2's `GenerateProof` component):** The elapsed-time string `"Generating proof… Xs"` must be inside a `<span aria-live="polite">` or `<div aria-live="polite">` so screen readers announce updates without interrupting. Confirm this is wired; add it if missing.

2. **Balance decryption (Story 1.8 — parked, but if the Holder lens renders a balance placeholder):** `"Reading your balance…"` should announce via `aria-live="polite"`. If the balance panel is a stub in this sprint, ensure the stub renders `aria-live` in the correct slot so it does not need to be retrofitted later.

### `Esc` closes the top dialog (UX-DR21)

If any dialog/modal is present in the rendered app (e.g., the pre-sign explainer from Story 4.1), confirm that pressing `Esc` closes it. The `useEffect` pattern:

```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [onClose]);
```

The axe scan will not catch a missing `Esc` handler — add a manual Vitest test using `fireEvent.keyDown(document, { key: 'Escape' })`.

### File locations — where to add missing states

- `mode-b-unavailable` state: add to `apps/web/src/features/holder/GenerateProof.tsx` (the component closest to the devnet call), wrapped in a `try/catch` that renders `<ErrorCard>` on network failure.
- `empty-entries` state: add to `apps/web/src/features/holder/SelectEntries.tsx` as the zero-entries branch (render `<EmptyState message="No encrypted entries yet. Connect your wallet to see entries." />`). Currently `FIXTURE_ENTRIES` is always non-empty — add a `props.entries` override that defaults to `FIXTURE_ENTRIES` so tests can pass an empty array.
- Non-production disclaimer: if `NoticeDisclaimer` with `"Demo keypairs — not for production use"` is not already in the rendered Holder lens, add it to `apps/web/src/App.tsx` below the `RoleBanner`.
- `aria-live` for proof generation: `apps/web/src/features/holder/GenerateProof.tsx`.
- `Esc` handler: wherever the pre-sign explainer dialog is rendered (Story 4.1, likely `apps/web/src/shared/RoleSwitcher/RoleSwitcher.tsx` or a modal wrapper).

### Architecture rules that apply

- **AR-15 (lint zone):** `apps/web` bans `node:*` imports. `vitest-axe` and `@axe-core/react` are dev dependencies only. Neither enters the production bundle.
- **AR-14 (dependency direction):** test files in `apps/web` may import from `apps/web/src` only. The lexicon lint tests import components directly — no backend call, no `@mysten/*`.
- **NFR-8 (keys PoC):** the disclaimer is a frontend label, not a real key-management mechanism. Its presence satisfies the "clearly marked non-production" requirement for the demo.
- **NFR-9 (honesty guardrail):** enforced by the lexicon lint test (AC-3). The test is the guardrail; copy reviews without a test are insufficient.

## Tasks / Subtasks

- [ ] **Task 1 — Audit: map current components to state list**
  - [ ] Read `apps/web/src/features/holder/SelectEntries.tsx` — confirm `empty-entries` state branch exists; add if missing (pass `entries` prop that defaults to `FIXTURE_ENTRIES`; when empty, render `<EmptyState message="No encrypted entries yet. Connect your wallet to see entries." />`).
  - [ ] Read `apps/web/src/features/holder/GenerateProof.tsx` — confirm `proof-generating` spinner with elapsed timer (`aria-live="polite"`) and `mode-b-unavailable` error catch are present; add any missing state.
  - [ ] Read `apps/web/src/features/holder/VerifyProof.tsx` (or wherever the verify result renders from Story 3.3) — confirm `proof-done` (`badge-verified` "Verified") and `proof-failed` (`badge-failed` "Doesn't verify") both render correctly with text + icon (not color alone).
  - [ ] Confirm `no-session-key` state: in the Holder lens, before signing, `data-testid="generate-proof-btn"` and `data-testid="verify-btn"` render disabled with text `"Sign to unlock →"`.
  - [ ] Confirm `aggregate-out-of-range` state in `SelectEntries` (already required by Story 3.1 AC-3; re-verify it still renders correctly end-to-end).

- [ ] **Task 2 — Add non-production disclaimer if missing (AC-4)**
  - [ ] Search rendered Holder lens DOM for `"Demo keypairs — not for production use"`.
  - [ ] If missing: add `<NoticeDisclaimer>Demo keypairs — not for production use</NoticeDisclaimer>` to `apps/web/src/App.tsx` in a position visible to all roles (below the `RoleBanner`, above the lens content).
  - [ ] Write a Vitest test confirming the string is present in the rendered `<App />` DOM for each role.

- [ ] **Task 3 — axe scan test (AC-2)**
  - [ ] Check whether `vitest-axe` is in `apps/web/package.json` `devDependencies`. If not, add it.
  - [ ] Create `apps/web/src/a11y/axe.test.tsx`.
  - [ ] Write one axe test per major Mode B surface: `SelectEntries`, `GenerateProof`, `VerifyProof`, and the full `<App />` rendered in the Holder role.
  - [ ] Run `pnpm --filter web test` — fix every violation reported by axe until zero remain.
  - [ ] Common fixes to check first: missing `alt` on icon images, missing `label` on checkboxes, color-contrast violations (use tokens — `cipher-masked` and `cipher-reveal` are designed for AA contrast), missing `aria-live` on timers, incorrect `role` attrs (e.g. `role="banner"` on non-landmark elements — already patched in 1.0 review but confirm it didn't regress).

- [ ] **Task 4 — `aria-live` wiring (AC-2)**
  - [ ] Confirm `GenerateProof`'s elapsed-time output is inside `<span aria-live="polite">`. If not, wrap it.
  - [ ] Write a Vitest test: after proof generation starts (mock the async), the elapsed timer element has `aria-live="polite"`.

- [ ] **Task 5 — `Esc` closes top dialog (AC-2)**
  - [ ] Identify which component renders the pre-sign explainer dialog from Story 4.1.
  - [ ] Confirm it listens for `keydown` `Escape` and calls its close/dismiss handler.
  - [ ] Write a Vitest test: `fireEvent.keyDown(document, { key: 'Escape' })` while dialog is open → dialog is removed from the DOM.

- [ ] **Task 6 — Lexicon lint test (AC-3)**
  - [ ] Create `apps/web/src/a11y/lexiconLint.test.tsx`.
  - [ ] Import `SelectEntries`, `GenerateProof`, `VerifyProof` (and any other Mode B component with visible copy).
  - [ ] For each component, `render()` it with fixture props, read `container.textContent`, and assert no banned word appears.
  - [ ] Also assert `SelectEntries` rendered text contains the exact disclaimer string `"Proves a selected sum — not total income, nor which entries were included."`.
  - [ ] Run `pnpm --filter web test` — fix any failing assertions by editing the component's copy (remove banned words; add missing disclaimer).

- [ ] **Task 7 — Trust boundary beyond color (AC-2)**
  - [ ] Confirm `CipherCell` masked state: the glyph `"••••"` is present in the DOM and NOT `aria-hidden="true"` (this was a 1.0 review patch — verify it landed). The `aria-label` on the masked cell must describe the hidden state, not be empty.
  - [ ] Confirm `CipherCell` revealed state: the unlock marker (`.cipher-reveal` left-bar or `🔓` icon) is present in the DOM in addition to the numeric value.
  - [ ] Write or confirm a Vitest test: `CipherCell` rendered in masked state has an accessible name that does not depend on color; same for revealed state.

- [ ] **Task 8 — Verify all (AC-1 through AC-4)**
  - [ ] `pnpm --filter web test` — all tests pass (existing 33 + new a11y + lexicon lint + state-coverage tests).
  - [ ] `pnpm --filter web lint` — clean (no banned imports).
  - [ ] `pnpm --filter web build` — production build succeeds. Confirm axe is not in the production bundle (check output for `axe-core`).
  - [ ] Manual walkthrough: open the app in the Holder role, step through `no-session-key → sign → select entries → bound-reject → generate proof → proof-done/failed`. Confirm no white screen at any step.
  - [ ] Manual check: tab through the Holder lens; confirm tab order matches reading order and focus ring is visible.

## Files Added / Changed

**Added:**
- `apps/web/src/a11y/axe.test.tsx` — automated axe scan for Mode B surfaces + full Holder role App
- `apps/web/src/a11y/lexiconLint.test.tsx` — banned-word lexicon lint over all Mode B component copy

**Possibly modified (gap-fill only — touch only what is missing):**
- `apps/web/src/features/holder/SelectEntries.tsx` — add `entries` prop with `FIXTURE_ENTRIES` default; add `empty-entries` branch rendering `<EmptyState>`
- `apps/web/src/features/holder/GenerateProof.tsx` — add `aria-live="polite"` on elapsed timer; add `mode-b-unavailable` error catch rendering `<ErrorCard>`
- `apps/web/src/App.tsx` — add `<NoticeDisclaimer>Demo keypairs — not for production use</NoticeDisclaimer>` if missing
- `apps/web/src/shared/RoleSwitcher/RoleSwitcher.tsx` (or whichever file owns the pre-sign dialog) — add `Esc` keydown handler if missing
- `apps/web/src/shared/components/CipherCell.tsx` — confirm `aria-hidden` patch from 1.0 review landed; fix if not
- `apps/web/package.json` — add `vitest-axe` to `devDependencies` if not already present
