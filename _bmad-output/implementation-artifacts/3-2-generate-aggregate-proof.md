---
story_track: 3-2
status: ready-for-dev
---

# Story 3.2: Generate Aggregate Proof

Status: ready-for-dev

## Story

As a Holder,
I want to generate a proof that my selected aggregate encrypts the disclosed `X` under my public key,
so that I can share a figure without surrendering my key.

## Story Context

- **Epic:** Epic 3 — Proof-of-Figure (Mode B). Gate: SPIKE-1 returned **GO** on 2026-06-20.
- **Owner:** Tenny (lead, solo — PM + full-stack). Epics.md listed JJ as lead on the crypto slice; with a solo dev, Tenny owns both slices.
- **Position in Epic 3 spine:** Story 3.1 (selection + aggregate value `X`) → **3.2 (this)** → 3.3 (verify). Depends on Story 3.1 being done; feeds Story 3.3.
- **What this story delivers:**
  - The real `ClientProofAdapter` implementation at `apps/web/src/shared/adapters/clientProofAdapter.ts`. Currently only `fakeProofAdapter.ts` exists in `packages/core/src/proof/`.
  - The proof-generator UI: spinner, measured elapsed time, `aria-live` announcement, output passed to Story 3.3.
- **What this story does NOT do:**
  - Build `packages/wasm` or integrate the real Contra wasm prover. The addendum to Story 1.2a is explicit: "full wasm-prover ↔ Move-verifier parity is still pending the real wasm build." Use the same TS proof-generation from `packages/spike/src/spike1.aggregate.test.ts` (proven on devnet).
  - Replace Story 3.3's verify seam — Story 3.3 stands on the committed golden fixtures from Story 1.1b, not on this story's runtime output. No forward dependency.
  - Handle session key derivation via HKDF from a real wallet signature — that is Story 4.1. For this story, the holder's "session key" is the fixture private key scalar `12345n` (same as the SPIKE-1 aggregate fixture).

## Acceptance Criteria

1. **Homomorphic aggregation + proof generation (FR-16).** Given a selection from Story 3.1 (N entries with known plaintext amounts and ciphertext components), when the Holder clicks "Generate proof", then:
   - Selected ciphertexts are aggregated homomorphically: `c1_agg = c1A.add(c1B)...` (component-wise Ristretto point addition on both `c1` and `dh`, exactly as in `spike1.aggregate.test.ts:buildAggregateStatement`).
   - A NIZK proof is generated for the aggregate statement `(dst, pk, c1_agg, dh_agg)` using `ElGamalNizk.prove`, yielding a 128-byte proof (`a ‖ b ‖ z1 ‖ z2`, each 32 bytes).
   - The output `{ proof: Uint8Array (128 bytes), ciphertext: { c1: Point, dh: Point }, amount: bigint }` is available for Story 3.3's verify path.

2. **Client-side generation — key never leaves the browser (AR-6, NFR-8).** Given D1 Split-Hybrid, then:
   - Generation runs entirely in the browser via `ClientProofAdapter` at `apps/web/src/shared/adapters/clientProofAdapter.ts`.
   - `ClientProofAdapter` implements the `ProofAdapter` interface from `packages/core/src/proof/proofAdapter.ts`.
   - The holder's key (secret key scalar) never appears in any network request. The UI copy notes: "Your key never leaves this browser."
   - Network tab during proof generation shows zero outbound requests carrying key material.

3. **Loading state — spinner with measured elapsed time (FR-16, NFR-6, UX-DR15/21).** Given proof generation is in progress, then:
   - A spinner renders with text updating in real time: `"Generating proof… 2.4s"` (format: one decimal place, seconds). Use `performance.now()` for measurement — capture start before the async call, capture end in the resolved callback.
   - The spinner element carries `aria-live="polite"` so screen readers announce progress.
   - On completion the spinner is replaced by the disclosure output (or an error state).
   - Target: < 10s per figure on reference hardware (SPIKE-1 measured ~50–100ms actual; the UI must surface the real elapsed time regardless).

4. **Deterministic proof generation (AR-12).** Given the same selection and the same session key scalar, then:
   - Re-generating a proof produces byte-identical output.
   - The proof nonces (`r1`, `r2`) are deterministic: derived as `H(domain_sep_tag ‖ sessionKey ‖ input_commitment)` — not random.
   - For the demo fixture, `sessionKey = 12345n` (the same fixture sk as SPIKE-1). Plugging in different inputs must yield different proofs; same inputs must yield the same proof.

5. **Import discipline — adapter isolation (AR-15, AR-14).** Given the adapter isolation lint zone, then:
   - `ClientProofAdapter` imports ONLY from `@aperture/core` (crypto primitives, ProofAdapter interface, branded types). It does NOT import from `@mysten/*` — that is for the Contra SDK adapter in `apps/api/adapters/`, not the web proof adapter.
   - No `@mysten/*` import appears in `apps/web/src/shared/adapters/clientProofAdapter.ts` (assertable by lint zone `no-restricted-imports`).
   - The adapter does not import `node:*` (must be browser-safe, isomorphic).

## Dev Agent Technical Context

### The proof generation flow (from SPIKE-1 — reuse exactly)

Reference: `packages/spike/scripts/generate-aggregate-proof.ts` and `packages/spike/src/spike1.aggregate.test.ts`.

The aggregate proof for N entries follows these steps:

```
1. Rebuild each entry's ciphertext points from the selection:
     c1_i = blinding_i * G + amount_i * H
     dh_i = blinding_i * pk

2. Aggregate (Ciphertext.add — component-wise Ristretto addition):
     c1_agg = c1_A.add(c1_B)  [.add(...c1_N)]
     dh_agg = dh_A.add(dh_B)  [.add(...dh_N)]

   The homomorphic identity holds:
     c1_agg == agg_blinding * G + agg_amount * H
     dh_agg == agg_blinding * pk
   where agg_blinding = Σ blinding_i, agg_amount = Σ amount_i.

3. Prove (ElGamalNizk.prove over the aggregate statement):
     a  = r1 * pk
     b  = r1 * G + r2 * H
     c  = Fiat-Shamir challenge(dst, G, H, pk, c1_agg, dh_agg, a, b)
     z1 = r1 + c * agg_blinding  (mod N)
     z2 = r2 + agg_amount * c    (mod N)

   Proof bytes: a ‖ b ‖ z1 ‖ z2  (each 32 bytes, z1/z2 as little-endian scalars)

4. Output: { proof: Uint8Array (128 bytes), c1_agg, dh_agg, amount: agg_amount }
```

The Fiat-Shamir challenge computation is in `packages/spike/src/_bcs.ts` (`fiatShamirChallenge` + `hashToScalar`). The `H` generator is `H_BYTES` from `@aperture/core/crypto`. The nonces `r1`, `r2` must be deterministic — see deterministic randomness below.

### Deterministic randomness (AR-12)

For demo/PoC, derive nonces deterministically:
```
r1 = H_BYTES_blake2b("aperture:elgamal:r1" ‖ sessionKeyBytes ‖ inputCommitment)  mod N
r2 = H_BYTES_blake2b("aperture:elgamal:r2" ‖ sessionKeyBytes ‖ inputCommitment)  mod N
```
where `inputCommitment` is the BCS-serialized aggregate statement bytes (or a stable hash of the selection). The exact KDF doesn't need to match any external spec — it just needs to be deterministic and domain-separated so r1 ≠ r2. Use `H_BYTES` from `@aperture/core/crypto` for the hash primitive.

For the demo fixture, the session key is `BigInt(12345)` converted to a 32-byte LE buffer. This matches the `AGG_SK = 12345n` in SPIKE-1.

### Where ClientProofAdapter lives

Path: `apps/web/src/shared/adapters/clientProofAdapter.ts`

It implements `ProofAdapter` from `packages/core/src/proof/proofAdapter.ts`:

```ts
import type { ProofAdapter, GenerateProofInput, GenerateProofOutput } from "@aperture/core/proof";

export const clientProofAdapter: ProofAdapter = {
  async generateProof(input: GenerateProofInput): Promise<GenerateProofOutput> { ... },
  async auditorDecrypt(_input) { throw new Error("auditorDecrypt not available client-side"); },
};
```

The `generateProof` input carries:
- `input.statement`: `{ pk, ciphertext (c1), decryptionHandle (dh), amount }` — the aggregate statement built from Story 3.1's selection.
- `input.witness.secretKey`: the holder's 32-byte secret key (fixture: LE bytes of `12345n`).
- `input.witness.blinding`: the aggregate blinding scalar (Σ blinding_i).
- `input.sessionKey`: a `SessionKey` branded type — use `.bytes` for the deterministic nonce derivation.

The output carries:
- `proof`: `Uint8Array` (128 bytes) — the NIZK.
- `ciphertext`: concatenation `pk ‖ c1_agg ‖ dh_agg` (96 bytes), mirroring `fakeProofAdapter.ts`'s layout, so Story 3.3's verify path receives the same shape.

### Statement construction (caller's job — Story 3.1 prerequisite)

Story 3.1 computes the aggregate `X` and must pass the aggregate ciphertext points and blinding sum into Story 3.2's `generateProof` call. The statement shape is defined in `packages/core/src/crypto/statementCodec.ts`. The `ClientProofAdapter` does NOT reconstruct entry ciphertexts from scratch — it receives the aggregate statement already built by the caller.

### Proof size

128 bytes exactly. The adapter should assert `proof.length === 128` before returning, mirroring the size-guard in `fakeProofAdapter.ts`.

### UI component

The proof-generator UI lives in the Holder lens, likely at `apps/web/src/features/holder/ProofGenerator.tsx` (or similar). It:
1. Receives the selection (entries + aggregate `X`) from Story 3.1's `<EntrySelection>` component.
2. Calls `clientProofAdapter.generateProof(...)` on button click.
3. While awaiting: renders a spinner with live elapsed time ("Generating proof… 2.4s"). Use a `setInterval` at 100ms to update the displayed seconds, driven by `performance.now()` delta from when the call started. The interval is cleared on resolve/reject.
4. On success: passes `{ proof, ciphertext, amount }` to Story 3.3's verify surface.
5. On error: renders the error-card shell from Story 1.0's state primitives with an actionable message.

The status element carrying the live timer text must have `aria-live="polite"` (UX-DR21).

### Mock data for the demo (fixture values from SPIKE-1)

For the demo, wire the selection to two fixture entries so the flow works end-to-end without a running data plane:
```
Entry A: amount = 40000n, blinding = 11111n
Entry B: amount = 30000n, blinding = 22222n
Holder sk: 12345n (as 32-byte LE Uint8Array)
```
These match `AGG_SK`, `ENTRY_A_*`, `ENTRY_B_*` in `spike1.aggregate.test.ts`. The generated proof will be byte-identical to `proofAggregateValid.hex` when the same deterministic nonces are used.

### What NOT to do

- Do NOT build `packages/wasm` or attempt to load/call the Contra wasm prover. The in-house TS prove implementation from the spike scripts is the correct approach for this story.
- Do NOT add `@mysten/*` imports to `clientProofAdapter.ts`.
- Do NOT call `ClientProofAdapter` from `packages/core` — it lives in `apps/web` and calls into `@aperture/core`.
- Do NOT generate random nonces — proofs must be deterministic (AR-12).
- Do NOT wire Story 3.3's verify to Story 3.2's runtime output at test time — Story 3.3 uses the committed golden fixtures from Story 1.1b for its tests.

## Tasks / Subtasks

- [ ] **Task 1 — `ClientProofAdapter` crypto logic (AC: 1, 4, 5)**
  - [ ] Create `apps/web/src/shared/adapters/clientProofAdapter.ts` implementing `ProofAdapter`.
  - [ ] Port the prove logic from `packages/spike/scripts/generate-aggregate-proof.ts`: Ristretto point operations via `@noble/curves/ed25519` (`ristretto255`), `H_BYTES` from `@aperture/core/crypto`, `fiatShamirChallenge` + `hashToScalar` from `packages/spike/src/_bcs.ts` (these need to be extracted to `@aperture/core/crypto` so `apps/web` can import them without depending on `packages/spike`).
  - [ ] Implement deterministic nonce derivation (`r1`, `r2`) using domain-separated `H_BYTES` hashes over `(domain_sep ‖ sessionKey.bytes ‖ inputCommitment)`.
  - [ ] Assert `proof.length === 128` before returning.
  - [ ] `auditorDecrypt` throws `"auditorDecrypt not available client-side"` — Mode A is server-side only.
  - [ ] Verify import discipline: zero `@mysten/*` and zero `node:*` imports.

- [ ] **Task 2 — Extract shared prove primitives to `@aperture/core/crypto` (AC: 1, 5)**
  - [ ] `fiatShamirChallenge`, `hashToScalar`, `G`, `RISTRETTO_N`, `bytesFromBigIntLE`, `readScalarLE`, `bytesToHex` are currently in `packages/spike/src/_bcs.ts`. They need to be accessible from `apps/web` without importing spike. Extract the isomorphic subset (no `node:*`) into `packages/core/src/crypto/` (e.g. `elgamal.ts` or `ristretto.ts`) and export from `packages/core/src/crypto/index.ts`. Spike tests continue to import from the core re-export.
  - [ ] Confirm no `node:*` import sneaks into the extracted module — the lint zone bans it.

- [ ] **Task 3 — Proof-generator UI component (AC: 3)**
  - [ ] Create `apps/web/src/features/holder/ProofGenerator.tsx` (or integrate into the existing Holder flow from Story 3.1).
  - [ ] "Generate proof" button wired to `clientProofAdapter.generateProof(...)`.
  - [ ] Live elapsed timer: start `performance.now()` before the async call, `setInterval` at 100ms updating display, cleared on resolve/reject. Display format: `"Generating proof… 2.4s"`.
  - [ ] Status element has `aria-live="polite"`.
  - [ ] On success: passes output to Story 3.3's verify surface (even if 3.3 isn't wired yet, the output shape must be ready).
  - [ ] On error: renders error-card from Story 1.0 state primitives with a plain-language message.
  - [ ] Copy: "Your key never leaves this browser." adjacent to the Generate button (UX-DR15 / NFR-8).

- [ ] **Task 4 — Wire demo fixture data (AC: 1, 4)**
  - [ ] Provide fixture entries (40000n / 11111n and 30000n / 22222n, holder sk 12345n) as mock data so the Holder flow runs end-to-end without the data plane.
  - [ ] Confirm determinism: call generateProof twice with the same inputs and assert byte-equality of the two proofs (a unit test or a sanity log in dev mode).

- [ ] **Task 5 — Unit test for `ClientProofAdapter` (AC: 1, 2, 4, 5)**
  - [ ] Test file: `apps/web/src/shared/adapters/clientProofAdapter.test.ts`.
  - [ ] Test: `generateProof` with the two fixture entries produces a proof that `verifyElGamal(...)` accepts (import the off-chain verify from `packages/spike/src/spike1.aggregate.test.ts` or from its soon-to-be-extracted `@aperture/core` home).
  - [ ] Test: determinism — same call twice → `timingSafeEqual(proof1, proof2)`.
  - [ ] Test: wrong amount → verify returns `false`.
  - [ ] Import discipline guard: confirm `@mysten/*` does not appear in the adapter file (static grep in CI or lint zone).

## Files Added / Changed

| File | Action | Notes |
|---|---|---|
| `apps/web/src/shared/adapters/clientProofAdapter.ts` | **Add** | The real `ClientProofAdapter` — Mode B proof generation, browser-only. |
| `apps/web/src/shared/adapters/clientProofAdapter.test.ts` | **Add** | Unit tests: correct proof, determinism, wrong-amount rejection. |
| `apps/web/src/features/holder/ProofGenerator.tsx` | **Add** | Proof-generator UI: button, live timer, aria-live, output slot. |
| `packages/core/src/crypto/elgamal.ts` (or `ristretto.ts`) | **Add** | Extracted isomorphic prove primitives from `packages/spike/src/_bcs.ts`. |
| `packages/core/src/crypto/index.ts` | **Change** | Export the new extracted primitives. |
| `packages/spike/src/_bcs.ts` | **Change** (minimal) | Re-export from `@aperture/core/crypto` for the extracted symbols so existing spike tests continue to pass without change. |
| `apps/web/src/features/holder/` (existing Holder feature) | **Change** | Wire `ProofGenerator` into the Holder lens flow. |
