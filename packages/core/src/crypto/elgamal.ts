// packages/core/src/crypto/elgamal.ts
//
// Isomorphic ElGamal NIZK primitives extracted from packages/spike/src/_bcs.ts.
// No `node:*` imports — browser-safe (uses @noble/hashes blake2b for the
// Fiat-Shamir hash, matching the Move verifier transcript exactly).
//
// Story 3.2: shared helpers for spike tests (via re-exports in _bcs.ts) and
// ClientProofAdapter in apps/web. Extracted here so apps/web can import from
// @aperture/core without depending on packages/spike.

import { blake2b } from "@noble/hashes/blake2.js";
import { ristretto255 } from "@noble/curves/ed25519.js";

import { H_BYTES } from "./hBytes.js";

// ---------------------------------------------------------------------------
// Scalar / encoding helpers
// ---------------------------------------------------------------------------

/** Ristretto group order. */
export const RISTRETTO_N =
  0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn;

/** Write a bigint as `len` little-endian bytes. */
export function bytesFromBigIntLE(n: bigint, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let v = n;
  for (let i = 0; i < len; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** Read a little-endian 32-byte scalar at offset `off` in `bytes`. */
export function readScalarLE(bytes: Uint8Array, off: number): bigint {
  let v = 0n;
  for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(bytes[off + i] as number);
  return v;
}

// ---------------------------------------------------------------------------
// BCS encoding helpers (mirrors Move's bcs::to_bytes for vector<vector<u8>>)
// ---------------------------------------------------------------------------

/** ULEB128 length prefix — matches `bcs::to_bytes(&vector<u8>)`. */
export function uleb128(n: number): Uint8Array {
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

/** BCS-encode a `vector<vector<u8>>`. */
export function bcsEncodeVectorVectorU8(chunks: Uint8Array[]): Uint8Array {
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

// ---------------------------------------------------------------------------
// Fiat-Shamir transcript
// ---------------------------------------------------------------------------

/** Mirrors `contra::nizk::fiat_shamir_challenge`. Blake2b256 over BCS-encoded
 *  `vector<vector<u8>>`, top byte zeroed so the result is below N. */
export function fiatShamirChallenge(chunks: Uint8Array[]): Uint8Array {
  const preimage = bcsEncodeVectorVectorU8(chunks);
  const hash = blake2b(preimage, { dkLen: 32 });
  hash[31] = 0;
  return hash;
}

/** Convert a 32-byte LE-encoded hash to a clamped Ristretto scalar — mirrors
 *  Sui's `scalar_from_bytes` which reduces mod N. */
export function hashToScalar(bytes: Uint8Array): bigint {
  let v = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    v = (v << 8n) | BigInt(bytes[i] as number);
  }
  return v % RISTRETTO_N;
}

// ---------------------------------------------------------------------------
// Generator helpers
// ---------------------------------------------------------------------------

/** Canonical Ristretto255 base point bytes (matches Move's g_generator()). */
export const G_BYTES = new Uint8Array([
  0xe2, 0xf2, 0xae, 0x0a, 0x6a, 0xbc, 0x4e, 0x71, 0xa8, 0x84, 0xa9, 0x61,
  0xc5, 0x00, 0x51, 0x5f, 0x58, 0xe3, 0x0b, 0x6a, 0xa5, 0x82, 0xdd, 0x8d,
  0xb6, 0xa6, 0x59, 0x45, 0xe0, 0x8d, 0x2d, 0x76,
]);

/** Convert bytes to hex string (local copy — avoids circular import with index.ts). */
function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Get the Ristretto BASE point as a noble Point. */
export function G() {
  return ristretto255.Point.fromHex(toHex(G_BYTES));
}

/** Get the H blinding generator as a noble Point. */
export function H() {
  return ristretto255.Point.fromHex(toHex(H_BYTES));
}

// ---------------------------------------------------------------------------
// ElGamal NIZK prove
// ---------------------------------------------------------------------------

/**
 * Produce a 128-byte NIZK proof for the ElGamal relation:
 *   c1 = blinding * G + amount * H
 *   dh = blinding * pk
 *
 * Proof layout: a ‖ b ‖ z1 ‖ z2 (each 32 bytes).
 *
 * @param dst  Domain-separation tag (may be empty).
 * @param blinding  Aggregate blinding scalar (witness).
 * @param amount    Aggregate amount (witness).
 * @param pk        Holder public key point.
 * @param c1        Aggregate ciphertext point.
 * @param dh        Aggregate decryption handle point.
 * @param r1        Deterministic nonce (caller must derive; see AR-12).
 * @param r2        Deterministic nonce (caller must derive; see AR-12).
 */
export function elgamalProve(
  dst: Uint8Array,
  blinding: bigint,
  amount: bigint,
  pk: InstanceType<typeof ristretto255.Point>,
  c1: InstanceType<typeof ristretto255.Point>,
  dh: InstanceType<typeof ristretto255.Point>,
  r1: bigint,
  r2: bigint,
): Uint8Array {
  const Gp = G();
  const Hp = H();

  const a = pk.multiply(r1);
  const b = Gp.multiply(r1).add(Hp.multiply(r2));

  const c = hashToScalar(
    fiatShamirChallenge([
      dst,
      Gp.toBytes(),
      Hp.toBytes(),
      pk.toBytes(),
      c1.toBytes(),
      dh.toBytes(),
      a.toBytes(),
      b.toBytes(),
    ]),
  );

  const z1 = ((r1 + c * blinding) % RISTRETTO_N + RISTRETTO_N) % RISTRETTO_N;
  const z2 = ((r2 + amount * c) % RISTRETTO_N + RISTRETTO_N) % RISTRETTO_N;

  const proof = new Uint8Array(128);
  proof.set(a.toBytes(), 0);
  proof.set(b.toBytes(), 32);
  proof.set(bytesFromBigIntLE(z1, 32), 64);
  proof.set(bytesFromBigIntLE(z2, 32), 96);
  return proof;
}

/**
 * Verify a 128-byte NIZK proof for the ElGamal relation.
 * Returns true iff the proof is valid.
 */
export function verifyElGamal(
  dst: Uint8Array,
  pk: InstanceType<typeof ristretto255.Point>,
  c1: InstanceType<typeof ristretto255.Point>,
  dh: InstanceType<typeof ristretto255.Point>,
  proof: Uint8Array,
): boolean {
  if (proof.length !== 128) return false;
  const Gp = G();
  const Hp = H();

  const a = ristretto255.Point.fromHex(toHex(proof.slice(0, 32)));
  const b = ristretto255.Point.fromHex(toHex(proof.slice(32, 64)));
  const z1 = readScalarLE(proof, 64) % RISTRETTO_N;
  const z2 = readScalarLE(proof, 96) % RISTRETTO_N;

  const c = hashToScalar(
    fiatShamirChallenge([
      dst,
      Gp.toBytes(),
      Hp.toBytes(),
      pk.toBytes(),
      c1.toBytes(),
      dh.toBytes(),
      a.toBytes(),
      b.toBytes(),
    ]),
  );

  const lhs1 = pk.multiply(z1);
  const rhs1 = dh.multiply(c).add(a);
  const lhs2 = c1.multiply(c).add(b);
  const rhs2 = Gp.multiply(z1).add(Hp.multiply(z2));

  return lhs1.equals(rhs1) && lhs2.equals(rhs2);
}
