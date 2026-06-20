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

import { describe, it, expect } from "vitest";
import { blake2b } from "@noble/hashes/blake2.js";
import { ristretto255 } from "@noble/curves/ed25519.js";

/** BCS-encode a `vector<vector<u8>>`: outer length (ULEB128) + each chunk's
 *  length (ULEB128) + each chunk's bytes. */
function bcsEncodeVectorVectorU8(chunks: Uint8Array[]): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(uleb128(chunks.length));
  for (const c of chunks) {
    parts.push(uleb128(c.length));
    parts.push(c);
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function uleb128(n: number): Uint8Array {
  const out: number[] = [];
  let v = n;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    out.push(b);
  } while (v !== 0);
  return new Uint8Array(out);
}

/** Mirrors `contra::nizk::fiat_shamir_challenge`. */
function fiatShamirChallenge(chunks: Uint8Array[]): Uint8Array {
  const preimage = bcsEncodeVectorVectorU8(chunks);
  const hash = blake2b(preimage, { dkLen: 32 });
  hash[31] = 0; // clear top byte — same as Move `*vector::borrow_mut(&mut hash, 31) = 0`
  return hash;
}

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

  it("the cleared top byte is observable — top-bit input produces a different hash", () => {
    const a = new Uint8Array(32); // all zero
    const b = new Uint8Array(32);
    b[31] = 0xff; // would change hash pre-clear, but should NOT post-clear
    const hA = fiatShamirChallenge([a]);
    const hB = fiatShamirChallenge([b]);
    // After clearing byte 31 of the Blake2b256 output, the two inputs
    // (which differ ONLY in the byte that affects input slicing, not the
    // output's cleared byte) still produce different outputs — this test
    // documents that the clear is a structural Move compatibility thing,
    // not a security-by-obscurity.
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
    // scalar_from_bytes clamps to mod group order; any 32-byte input is valid
    const scalar = ristretto255.Point.Fn.create(bytesToBigIntLE(challenge));
    expect(scalar).toBeGreaterThanOrEqual(0n);
    expect(scalar).toBeLessThan(
      0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn,
    );
  });
});

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function bytesToBigIntLE(bytes: Uint8Array): bigint {
  let v = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    v = (v << 8n) | BigInt(bytes[i] as number);
  }
  return v;
}
