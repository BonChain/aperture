---
story_track: 3-1
status: ready-for-dev
---

# Story 3.1: Select Entries & Disclose Value

Status: ready-for-dev

## Story

As a Holder,
I want to select a subset of my own encrypted entries and have the system compute their true aggregate locally,
so that I can disclose a precise figure `X` scoped to exactly those entries.

## Story Context

- **Epic:** Epic 3 — Proof-of-Figure (Mode B). Gate: SPIKE-1 returned **GO** on 2026-06-20.
- **Owner:** Tenny (lead, solo — all frontend + arithmetic). No JJ slice: Story 3.1 is pure UI + bigint arithmetic, no new crypto, no backend call.
- **Position in the spine:** first Mode B build story. Produces the selection state that Story 3.2 (Generate Aggregate Proof) consumes. Story 3.3 (Verify) can proceed in parallel off the committed fixtures.
- **Predecessor state:** Story 1.0 done (CipherCell, tokens, role-switcher shell, NoticeDisclaimer, SkeletonLoader/ErrorCard/EmptyState, data-lg class all exist in `apps/web/src/shared/components/`). SPIKE-1 GO confirmed and the aggregate round-trip addendum (2026-06-21) closed.
- **What it is:** A selection checklist UI over mock fixture entries with a live running sum and a client-side bound-and-reject check. No proof is generated here — that is Story 3.2.
- **What it is not:** It does not call `@aperture/core/crypto`. It does not generate or verify a proof. It does not read from the chain or the API. It does not work with real on-chain entries — the data plane (Epic 1 stories 1.3–1.9) is parked; real entries bind in a later story.

## Acceptance Criteria

1. **Selection checklist with live sum (FR-15, UX-DR14).** Given the Holder's fixture entries, when they check or uncheck an entry, then the panel shows "X of N entries selected" (updated immediately) and a live running selected-sum total styled `data-lg` (22px IBM Plex Mono, tabular figures).

2. **Client-side aggregate only (FR-15).** Given the selection state, when entries are selected, then the disclosed `X` displayed is the plain-arithmetic sum of the selected entries' known plaintext amounts (from the fixture) — not a free text input and not a server fetch.

3. **Bound-and-reject at selection time (AR-11, UX-DR14/20).** Given a selection where the running sum is at or approaching the limb-0 limit, when checking an entry would push `runningSum + entryAmount > 65535n`, then the checkbox for that entry is disabled and an inline message reads: "Adding this entry exceeds what can be proven in one figure. Prove a smaller selection." The entry remains uncheckable until the sum drops back below the limit.

4. **Scope honesty — snapshot-locked DOM (FR-15, NFR-9, UX-DR19).** Given the selection panel, when it renders in any selection state (zero, some, all), then:
   - The DOM contains the string `"N entries in scope"` (where N is the total fixture entry count).
   - The DOM contains the exact string `"Proves a selected sum — not total income, nor which entries were included."` inside a `NoticeDisclaimer` component.
   - The DOM contains **no** occurrence of the words `"total"`, `"income"`, or `"net"` outside of the disclaimer string above.
   - A snapshot test locks these three invariants so they cannot regress silently.

## Dev Agent Technical Context

### Mock data — use SPIKE-1 fixture constants

There are no real on-chain entries yet (data plane parked). The component works against **fixture entries defined inline in the component file**. Use values that match the SPIKE-1 aggregate round-trip so they stay coherent with Story 3.2:

```ts
// Derived from packages/spike/src/spike1.aggregate.test.ts constants.
// AGG_SK = 12345n; blinding factors 11111n / 22222n are private to the prover (not needed here).
const FIXTURE_ENTRIES = [
  { id: "entry-a", label: "Salary — June",    amount: 40000n },
  { id: "entry-b", label: "Consulting — Q2",  amount: 30000n },
  { id: "entry-c", label: "Bonus — H1",       amount: 8000n  },
  { id: "entry-d", label: "Reimbursement",    amount: 500n   },
] as const;
```

Entry C and D are additions for a richer demo (they don't correspond to a fixture proof; Story 3.2 will use only entries A+B unless new proofs are generated). That is fine — 3.1 is UI-only.

### Bound-and-reject arithmetic

The check is pure bigint arithmetic on plaintext amounts — no crypto:

```ts
const LIMB0_MAX = 65535n; // 2^16 - 1

function canAdd(runningSum: bigint, entryAmount: bigint): boolean {
  return runningSum + entryAmount <= LIMB0_MAX;
}
```

This is the client-side guard that AR-11 requires at selection time. The real bound-and-reject against encrypted values (where the component doesn't know the plaintext) is deferred to Story 3.2. For 3.1, since the fixture carries known plaintext amounts, this simple arithmetic is correct and sufficient.

Note: the SPIKE-1 aggregate proof intentionally sums past 2^16 (40000 + 30000 = 70000) to prove the proof relation is carry-safe. Story 3.1 must therefore **reject** the combination of entries A+B (70000 > 65535). The user can select A alone (40000 ✓), B alone (30000 ✓), A+C (48000 ✓), A+D (40500 ✓), B+C (38000 ✓), but NOT A+B together or any combination summing > 65535.

### Architecture rules that apply

- **AR-11:** bound-and-reject at selection time. Implemented above as plain arithmetic.
- **AR-14 (dependency direction):** `apps/web` may import from `packages/core/types` and `packages/core/proof` (the ProofAdapter interface), but never from `apps/api`. This component imports **neither** — it is self-contained.
- **AR-15 (lint zone):** `apps/web` bans `node:*` imports. Do not use `node:crypto`, `node:fs`, or any Node built-in. The bigint arithmetic uses no imports.
- **No `@mysten/*`** in this component. Import discipline: the only imports are React, the shared component kit (`apps/web/src/shared/components`), and the fixture constant defined at the top of the file.

### Reuse from Story 1.0 (do not recreate these)

All of these already exist in `apps/web/src/shared/components/`:

| What to reuse | Component | Story 1.0 reference |
|---|---|---|
| Scoped-claim disclaimer | `NoticeDisclaimer` | AC-2, UX-DR8 |
| Live sum display | `data-lg` Tailwind class (IBM Plex Mono 22px tabular) | Token layer, UX-DR2 |
| Loading / error shells | `SkeletonLoader`, `ErrorCard`, `EmptyState` | AC-7, UX-DR20 |
| CipherCell (masked amounts if needed) | `CipherCell` | AC-3 |

The `data-lg` class is in `apps/web/src/theme/typography.css`. Use `className="data-lg"` on the running sum `<span>`.

### Scoped-claim disclaimer — verbatim copy (do not paraphrase)

The exact string the `NoticeDisclaimer` must render (snapshot-locked by AC-4):

> "Proves a selected sum — not total income, nor which entries were included."

### File location

New file: `apps/web/src/features/holder/SelectEntries.tsx`

There is no `features/holder/` directory yet — create it. No barrel index needed at this stage.

### Voice / microcopy (UX-DR19)

- Entry row labels: plain language ("Salary — June", not "Entry 0x3a…").
- Running sum label: "Selected total" or "Figure to prove" — not "aggregate", "sum", or any crypto term.
- Bound-reject message (verbatim): "Adding this entry exceeds what can be proven in one figure. Prove a smaller selection."
- Count label: "X of N entries selected" (e.g. "2 of 4 entries selected").
- In-scope count: "N entries in scope" (used in the scope-honesty DOM check, AC-4).
- No "anonymous", "compliant", "total income", "net", or banned terms anywhere.

### State shape

Keep the state local and simple — no global store, no React Query (there's no fetch):

```ts
const [selected, setSelected] = React.useState<Set<string>>(new Set());
```

Derive everything else from `selected`:
- `runningSum = entries.filter(e => selected.has(e.id)).reduce((acc, e) => acc + e.amount, 0n)`
- `canAddEntry(id) = !selected.has(id) && canAdd(runningSum, entryById(id).amount)`
- The "X of N" count and the running sum display both derive from `selected` + `FIXTURE_ENTRIES`.

Export the `selected` Set (or a derived array of selected entry ids) so Story 3.2 can consume it. A simple prop callback `onSelectionChange?: (selectedIds: string[]) => void` is sufficient.

### Testing notes

- Framework: Vitest + jsdom (same as Story 1.0). Co-locate test at `SelectEntries.test.tsx`.
- Tests must cover: initial state (nothing selected, sum = 0, disclaimer present); select one entry (count updates, sum updates); select two entries whose sum is within limit; attempt to add an entry that pushes sum > 65535 (checkbox disabled, reject message shown); deselect an entry to unblock a previously disabled one.
- Snapshot test locks the AC-4 DOM invariants (count string, disclaimer string, no forbidden words).
- Do NOT use `@testing-library/user-event` if it is not already a dependency — use `fireEvent` from `@testing-library/react`.

## Tasks / Subtasks

- [ ] **Task 1 — Fixture data + canAdd helper**
  - [ ] Define `FIXTURE_ENTRIES` const at the top of `SelectEntries.tsx` with the four entries above (ids, labels, amounts as `bigint`).
  - [ ] Implement `canAdd(runningSum: bigint, entryAmount: bigint): boolean` — returns `runningSum + entryAmount <= 65535n`.
  - [ ] Verify by hand: A+B = 70000 → canAdd returns false. A alone = 40000 → true. A+C = 48000 → true.

- [ ] **Task 2 — SelectEntries component**
  - [ ] Create `apps/web/src/features/holder/SelectEntries.tsx`.
  - [ ] Local state: `selected` as `Set<string>`, initialized empty.
  - [ ] Render a checklist: one row per fixture entry with a checkbox, a plain-language label, and the amount formatted as a monospace string (use `data` class, not `data-lg`).
  - [ ] "X of N entries selected" count line — update on every selection change.
  - [ ] Running selected-sum in `data-lg` labeled "Selected total" (or "Figure to prove").
  - [ ] Disable checkbox and show bound-reject message inline for any entry that would push sum > 65535n.
  - [ ] `NoticeDisclaimer` below the list with the exact disclaimer string (see above).
  - [ ] "N entries in scope" count rendered in the DOM (AC-4 check).
  - [ ] `onSelectionChange?: (selectedIds: string[]) => void` callback prop — call on every selection change.
  - [ ] No `@mysten/*`, no `node:*`, no `@aperture/core/crypto` imports.

- [ ] **Task 3 — Tests (co-located `SelectEntries.test.tsx`)**
  - [ ] Test: initial render → "0 of 4 entries selected", sum = 0 or "0", all checkboxes enabled.
  - [ ] Test: select entry A (40000) → "1 of 4 entries selected", sum shows 40000.
  - [ ] Test: select entry A then entry C → sum shows 48000, still within limit, both checked.
  - [ ] Test: select entry A then attempt entry B → entry B checkbox is disabled, bound-reject message visible.
  - [ ] Test: select entry A+B is rejected; deselect A → entry B becomes enabled again.
  - [ ] Test: `onSelectionChange` callback fires with correct ids on each change.
  - [ ] Snapshot test: render with A+C selected → snapshot locks "2 of 4 entries selected", disclaimer string present, no "total"/"income"/"net" outside disclaimer.

- [ ] **Task 4 — Verify**
  - [ ] `pnpm --filter web test` passes (all existing 33 tests + new SelectEntries tests).
  - [ ] `pnpm --filter web lint` passes (no `node:*`, `@mysten/*`, or `core/crypto` imports in the new file).
  - [ ] `pnpm --filter web build` passes.
  - [ ] Manual check: render the component in the Holder lens shell (wire into `App.tsx` behind the Holder role or open standalone in a fixture page) and confirm the bound-reject blocks A+B selection visually.

## Files Added / Changed

**Added:**
- `apps/web/src/features/holder/SelectEntries.tsx` — the selection checklist component
- `apps/web/src/features/holder/SelectEntries.test.tsx` — co-located tests

**Possibly touched (if wiring the component into the Holder lens shell):**
- `apps/web/src/App.tsx` — add the Holder feature route/slot (or a fixture page render) so the component is reachable in the running app
