---
story_track: 4-2
status: ready-for-dev
---

# Story 4.2: Explorer Deep-Links

Status: ready-for-dev

## Story

As a viewer/judge,
I want every on-chain tx to deep-link to the Sui explorer,
so that I can confirm amounts are encrypted on-chain.

## Story Context

- **Epic:** Epic 4 — Demo Narrative & Polish.
- **Owner:** Tenny (lead, solo).
- **Position in the spine:** Scoped sprint focus is Mode B (Epic 3) + Demo (Epic 4). Data plane (Stories 1.3–1.9) and Auditor Console (Epic 2) are parked. This story therefore has a narrower scope than the epics.md AC implies.
- **Predecessor state:** Story 3.3 (Verify Proof Without Secret Key) exists and renders a verdict badge for the on-chain `verify_aggregate` call. That verify tx is the **only** on-chain transaction currently reachable in the Mode B + Demo sprint. The data plane (fund, register, run, transfer rows) is parked and not in scope here.
- **What it is (in this sprint):**
  1. A shared helper `explorerTxUrl(txDigest, network)` in `apps/web/src/shared/explorerLink.ts`.
  2. A deep-link on the verify result component from Story 3.3 — the `badge-verified` / `badge-failed` area gains a tx digest (monospace, truncated) + an external-link icon that opens the Sui explorer in a new tab.
  3. A documented NFR-1 visual check: the linked explorer page shows only proof bytes, not a plaintext per-recipient amount — confirming confidentiality is visible on-chain even without the data plane.
- **What it is not:** It does not add deep-links to data-plane rows (run, fund, register, transfer) — those are parked. It does not add automated scraping of explorer payloads — the NFR-1 check is manual/visual in this sprint. Data-plane stories (when implemented) will reuse the helper from this story.
- **Scope decision (PM):** The full epics.md AC ("every on-chain row") is architecturally correct as written. For this sprint, "every on-chain surface currently in scope" = one: the verify tx from Story 3.3. The helper is written generically so later stories can call it without revisiting this one.

## Acceptance Criteria

1. **Deep-link on verify result (FR-22, UX-DR22).** Given the verify result panel (Story 3.3's verdict component), when a verification completes (pass or fail), then the tx digest is displayed in IBM Plex Mono, truncated to `{first8}…{last8}` chars with the full digest in a `title` attribute, and an external-link icon beside it links to `https://suiexplorer.com/txblock/{txDigest}?network=devnet` opening in a new tab (`target="_blank" rel="noopener noreferrer"`). The link renders for both `badge-verified` and `badge-failed` outcomes.

2. **Helper function (FR-22).** Given `apps/web/src/shared/explorerLink.ts` exists, when called as `explorerTxUrl(txDigest, 'devnet')`, then it returns `https://suiexplorer.com/txblock/{txDigest}?network=devnet`. It also handles `'testnet'` and `'mainnet'` (returning the same URL with the appropriate `?network=` param). The function is pure, has no side-effects, and has no external imports.

3. **NFR-1 visual check documented (NFR-1, UJ-1).** Given the verify tx deep-link, when a judge follows the link to Sui explorer, then the explorer shows the tx's input bytes (DST, pk, ciphertext fields, proof bytes) — NOT a plaintext per-recipient amount. This is confirmed visually against the SPIKE-1 devnet tx digests. A `// NFR-1 note` comment in the `explorerLink.ts` file points to the 1.2a story doc as the reference for what the on-chain tx payload looks like. No automated test is required for this check — visual suffices in the demo context.

4. **Audit of on-chain surfaces — no gaps in scope (UX-DR22).** Given all currently-in-scope on-chain surfaces, when audited, then every surface that produces a tx digest has a deep-link — no in-scope surface is missing one. In this sprint, the complete surface list is: verify result (Story 3.3). A comment in the story file (this doc) is the record; a lint or test is not required. Data-plane stories (1.3–1.9) must add deep-links when implemented, using `explorerTxUrl` from this story.

5. **UX rules (UX-DR22, UX-DR2, UX-DR21).** The deep-link:
   - Renders the digest in IBM Plex Mono (`font-mono` or the `data` typography class) with tabular figures.
   - Uses a small external-link icon (e.g., `↗` or an SVG icon from the existing icon set) — does not use text like "View on Explorer".
   - Opens in a new tab (`target="_blank" rel="noopener noreferrer"`).
   - Does NOT navigate away from the app in the same tab.
   - The icon + digest are accessible: the `<a>` has `aria-label="View transaction {txDigest} on Sui Explorer"`.

## Dev Agent Technical Context

### Explorer URL pattern

Sui devnet explorer URL:

```ts
// apps/web/src/shared/explorerLink.ts
export type SuiNetwork = 'devnet' | 'testnet' | 'mainnet';

export function explorerTxUrl(txDigest: string, network: SuiNetwork): string {
  return `https://suiexplorer.com/txblock/${txDigest}?network=${network}`;
}
```

This is a pure function with no imports. Keep it exactly this simple — do not add error handling for empty digests, URL encoding, or network validation. Those are speculative and not asked for.

> Note on `suiscan.xyz` vs `suiexplorer.com`: both work for devnet. Use `suiexplorer.com` (the official Mysten explorer) as the canonical URL. If it becomes unreachable on devnet, `suiscan.xyz/devnet/tx/{txDigest}` is the fallback URL pattern (do NOT add a fallback mechanism in code — just know this for the demo).

### NFR-1 on-chain evidence

The SPIKE-1 on-chain verify calls (Story 1.2a) call `aperture::verifier::verify_aggregate` on devnet. That Move function takes `vector<u8>` arguments for `dst`, `pk`, `ciphertext`, `decryption_handle`, and the proof scalars. None of these fields is a plaintext per-recipient amount — `amount` is passed as `u64` but it is the **disclosed figure X** from the holder's proof, not an individual recipient's payment. The explorer displays the PTB input bytes — no plaintext amount from the data plane appears.

The `scripts/.published-devnet.json` file has `"txDigest": ""` (the publish tx digest was not captured). The tx digest from Story 3.3's runtime verify call will be what the deep-link shows. Until Story 3.3 is wired to a real on-chain verify call, the deep-link component can accept a `txDigest: string | null` prop and render nothing when null (empty state: no link, no placeholder text).

### Where Story 3.3's verify result lives

Story 3.3 owns the verify result panel (the `badge-verified` / `badge-failed` verdict area). This story adds the tx digest + deep-link to that panel. Do not recreate the badge — import `StatusBadge` from `apps/web/src/shared/components/` (already exists from Story 1.0) and add the deep-link as a sibling element below or beside the badge.

The expected props addition to Story 3.3's verify result component:

```ts
// Extend whatever prop shape Story 3.3 uses for the verdict — add:
txDigest?: string;   // undefined until the on-chain call returns
network?: SuiNetwork; // default: 'devnet'
```

If Story 3.3's component does not yet exist, create a minimal `VerifyResult` component in `apps/web/src/features/verifier/VerifyResult.tsx` that accepts `{ verdict: 'verified' | 'failed' | null; txDigest?: string; network?: SuiNetwork }` and renders the badge + deep-link. Do not build the full verify flow here — that belongs to Story 3.3.

### Digest display format

Truncate long digests for display: show first 8 chars + `…` + last 8 chars. Full digest goes in the `title` attribute and the `aria-label`. Example:

```ts
function truncateDigest(digest: string): string {
  if (digest.length <= 20) return digest;
  return `${digest.slice(0, 8)}…${digest.slice(-8)}`;
}
```

Sui tx digests are base58-encoded, typically 44 characters. `truncateDigest` is a local helper — do not export it.

### Architecture rules that apply

- **AR-14 (dependency direction):** `apps/web` may import `packages/core/types`. `explorerLink.ts` has no imports at all — it is a pure TS utility. No `@mysten/*`, no `node:*`.
- **AR-15 (lint zone):** `apps/web` bans `node:*` imports. `explorerLink.ts` uses no imports.
- **UX-DR24 (interaction bans):** The deep-link must open in a new tab, never navigate the app away.

### Reuse from Story 1.0

| What | Component | From |
|---|---|---|
| Verdict badge | `StatusBadge` | `apps/web/src/shared/components/StatusBadge.tsx` |
| Typography data class | `font-mono` / `data` class | `apps/web/src/theme/` |
| Shared components barrel | `apps/web/src/shared/components/index.ts` | Already exists |

### Testing notes

- Co-locate tests at `apps/web/src/shared/explorerLink.test.ts`.
- Tests: `explorerTxUrl` returns correct URL for devnet / testnet / mainnet; truncateDigest handles short digest (≤20), long digest (44 chars).
- For the UI component: test that a rendered `VerifyResult` with `txDigest` present shows the truncated digest, the correct `href`, `target="_blank"`, and `aria-label`. Test that with `txDigest` absent, no `<a>` element renders.
- Framework: Vitest + jsdom (same as the rest of `apps/web`).
- Do NOT use `@testing-library/user-event` if it is not already a project dependency — use `fireEvent`.

## Tasks / Subtasks

- [ ] **Task 1 — `explorerLink.ts` helper**
  - [ ] Create `apps/web/src/shared/explorerLink.ts`.
  - [ ] Export `SuiNetwork` type (`'devnet' | 'testnet' | 'mainnet'`).
  - [ ] Export `explorerTxUrl(txDigest: string, network: SuiNetwork): string` — single template-literal return, no imports.
  - [ ] Add `// NFR-1 note` comment: "The Sui explorer shows the on-chain verify tx payload (DST, pk, ciphertext, proof bytes) but no plaintext per-recipient amount. See _bmad-output/implementation-artifacts/1-2a-spiKE-1-go-no-go.md for what the verify_aggregate call looks like."
  - [ ] Write co-located tests at `apps/web/src/shared/explorerLink.test.ts`.

- [ ] **Task 2 — `VerifyResult` component (or extend Story 3.3's component)**
  - [ ] If Story 3.3's verify result component already exists: add `txDigest?: string` and `network?: SuiNetwork` props to it.
  - [ ] If it does not exist yet: create `apps/web/src/features/verifier/VerifyResult.tsx` accepting `{ verdict: 'verified' | 'failed' | null; txDigest?: string; network?: SuiNetwork }`.
  - [ ] Render `StatusBadge` for the verdict.
  - [ ] When `txDigest` is provided: render the truncated digest in `font-mono` (`data` class, 13px) and an external-link icon as an `<a>` with correct `href`, `target="_blank"`, `rel="noopener noreferrer"`, and `aria-label="View transaction {txDigest} on Sui Explorer"`.
  - [ ] When `txDigest` is absent: render the badge only, no link, no placeholder.
  - [ ] `network` defaults to `'devnet'`.

- [ ] **Task 3 — Tests**
  - [ ] `explorerLink.test.ts`: three URL assertions (devnet, testnet, mainnet); truncateDigest edge cases.
  - [ ] `VerifyResult.test.tsx`: badge renders for `'verified'` and `'failed'`; with txDigest → link present with correct href and aria-label; without txDigest → no `<a>` in DOM; truncated display correct for a 44-char digest.

- [ ] **Task 4 — Verify**
  - [ ] `pnpm --filter web test` passes (all existing tests + new).
  - [ ] `pnpm --filter web lint` passes (no `node:*`, no `@mysten/*` in new files).
  - [ ] `pnpm --filter web build` passes.
  - [ ] Manual: render `VerifyResult` with a fixture tx digest (e.g., any 44-char base58 string), confirm the link opens `https://suiexplorer.com/txblock/...?network=devnet` in a new tab.

## Files Added / Changed

**Added:**
- `apps/web/src/shared/explorerLink.ts` — pure helper, `SuiNetwork` type + `explorerTxUrl` function
- `apps/web/src/shared/explorerLink.test.ts` — unit tests for the helper
- `apps/web/src/features/verifier/VerifyResult.tsx` — verdict badge + tx deep-link component (if Story 3.3 has not already created this)
- `apps/web/src/features/verifier/VerifyResult.test.tsx` — component tests

**Possibly touched (if Story 3.3's component already exists):**
- `apps/web/src/features/verifier/{Story3.3Component}.tsx` — add `txDigest?` and `network?` props + deep-link render
- `apps/web/src/features/verifier/{Story3.3Component}.test.tsx` — extend with deep-link assertions
