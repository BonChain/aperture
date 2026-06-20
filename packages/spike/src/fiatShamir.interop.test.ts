// packages/spike/src/fiatShamir.interop.test.ts
//
// Architecture #1 blocker (SPIKE-1 Day-1 Prerequisites): wasm prover vs Move
// verifier MUST agree byte-for-byte on Fiat-Shamir challenge bytes. This
// test asserts the TS implementation reproduces Move's `fiat_shamir_challenge`
// for the canonical regression input:
//
//   dst = vector::tabulate!(21, |i| i as u8)  // bytes 0..20
//   p1  = vector::tabulate!(32, |i| i as u8)  // bytes 0..31
//
// Expected challenge bytes (from `vendor/contra/move/sources/nizk.move:308-314`,
// `fiat_shamir_challenge_regression`):
//
//   0xaf00c4976049ed81805c76d3c5ba7cfaeb1550e44f5978cffb12b285a5e25a00
//
// If this test fails, STOP — do not proceed to on-chain work in 1.1c.
// Architecture marks this as the #1 blocker; a red result here is the
// classic "off-chain green / on-chain red" failure mode.
//
// The Move `fiat_shamir_challenge` (vendor/contra/move/sources/nizk.move:284-290):
//
//   let mut hash = sui::hash::blake2b256(&bcs::to_bytes(&random_oracle_inputs));
//   *vector::borrow_mut(&mut hash, 31) = 0;
//   scalar_from_bytes(&hash)
//
// Limitation (documented): this test uses `@noble/hashes/blake2.js` directly,
// NOT the eventual wasm package — `packages/wasm/` is still the 1.1a stub.
// The test currently proves the noble-based algorithm matches Move; a
// parallel test against the wasm blake2b will be added when the wasm
// package is built (1.1c or later).

import { describe, it, expect } from "vitest";

import { bytesToHex, fiatShamirChallenge, hashToScalar } from "./_bcs.js";

describe("Fiat-Shamir interop vector (architecture #1 blocker)", () => {
  it("matches Move's `fiat_shamir_challenge_regression` byte-for-byte", () => {
    // Input from vendor/contra/move/sources/nizk.move:308-314
    const dst = new Uint8Array(21);
    for (let i = 0; i < 21; i++) dst[i] = i;
    const p1 = new Uint8Array(32);
    for (let i = 0; i < 32; i++) p1[i] = i;

    const challenge = fiatShamirChallenge([dst, p1]);

    // Expected from vendor/contra/move/sources/nizk.move:313
    const expected =
      "af00c4976049ed81805c76d3c5ba7cfaeb1550e44f5978cffb12b285a5e25a00";
    expect(bytesToHex(challenge)).toBe(expected);
  });

  it("the cleared top byte is part of the output, not the input", () => {
    // Two inputs that differ ONLY in byte 31 (which the Move side clears
    // after hashing) still produce different hashes — the clear is a
    // Move-side post-processing step for group-order compatibility, not
    // a hash-input transformation.
    const a = new Uint8Array(32); // all zero
    const b = new Uint8Array(32);
    b[31] = 0xff;
    const hA = fiatShamirChallenge([a]);
    const hB = fiatShamirChallenge([b]);
    expect(bytesToHex(hA)).not.toBe(bytesToHex(hB));
    // And byte 31 of both outputs is 0 (the clear).
    expect(hA[31]).toBe(0);
    expect(hB[31]).toBe(0);
  });

  it("challenge bytes interpreted as a scalar are within Ristretto group order", () => {
    const dst = new Uint8Array(21);
    for (let i = 0; i < 21; i++) dst[i] = i;
    const p1 = new Uint8Array(32);
    for (let i = 0; i < 32; i++) p1[i] = i;
    const challenge = fiatShamirChallenge([dst, p1]);
    const scalar = hashToScalar(challenge);
    expect(scalar).toBeGreaterThanOrEqual(0n);
    expect(scalar).toBeLessThan(
      0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn,
    );
  });
});
