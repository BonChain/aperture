// packages/spike/src/_bcs.ts — internal shared helpers.
//
// BCS-canonical encoding primitives shared across spike tests + scripts.
// Per architecture: spike layer may not import `@mysten/sui` or other
// heavy SDK packages — hand-roll the minimal BCS layout we need
// (ULEB128 + `vector<vector<u8>>` nesting for the Fiat-Shamir preimage).
//
// All consumers MUST import from here; do not re-roll `uleb128` or
// `bcsEncodeVectorVectorU8` per-file (drift risk between Move and TS).

import { blake2b } from "@noble/hashes/blake2.js";
import { ristretto255 } from "@noble/curves/ed25519.js";

/** ULEB128 length prefix for a byte vector. Matches `bcs::to_bytes(&vector<u8>)`. */
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

/** BCS-encode a `vector<vector<u8>>`: outer length (ULEB128) + each chunk's
 *  length (ULEB128) + each chunk's bytes. */
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

/** Mirrors `contra::nizk::fiat_shamir_challenge`. Blake2b256 over BCS-encoded
 *  `vector<vector<u8>>`, then top byte zeroed so the result is below the
 *  Ristretto group order. */
export function fiatShamirChallenge(chunks: Uint8Array[]): Uint8Array {
  const preimage = bcsEncodeVectorVectorU8(chunks);
  const hash = blake2b(preimage, { dkLen: 32 });
  hash[31] = 0;
  return hash;
}

/** Ristretto group order (modular). */
export const RISTRETTO_N =
  0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn;

/** Convert a 32-byte LE-encoded hash to a clamped Ristretto scalar — mirrors
 *  Sui's `scalar_from_bytes` which reduces mod N. */
export function hashToScalar(bytes: Uint8Array): bigint {
  let v = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    v = (v << 8n) | BigInt(bytes[i] as number);
  }
  return v % RISTRETTO_N;
}

/** Read a little-endian 32-byte scalar at offset `off` in `bytes`. */
export function readScalarLE(bytes: Uint8Array, off: number): bigint {
  let v = 0n;
  for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(bytes[off + i] as number);
  return v;
}

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

/** Hex string → Uint8Array. Throws on odd-length or non-hex input. */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`hex string length must be even (got ${hex.length})`);
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error("hex string contains non-hex characters");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Ristretto255 canonical base point byte representation (G). Must match
 *  Move's \`ristretto255::g_generator()\`. Asserted at test time
 *  (see \`spike1.elgamal.test.ts\`). */
export const G_BYTES = new Uint8Array([
  0xe2, 0xf2, 0xae, 0x0a, 0x6a, 0xbc, 0x4e, 0x71, 0xa8, 0x84, 0xa9, 0x61,
  0xc5, 0x00, 0x51, 0x5f, 0x58, 0xe3, 0x0b, 0x6a, 0xa5, 0x82, 0xdd, 0x8d,
  0xb6, 0xa6, 0x59, 0x45, 0xe0, 0x8d, 0x2d, 0x76,
]);

/** Get the Ristretto BASE point as a noble Point. */
export function G() {
  return ristretto255.Point.fromHex(bytesToHex(G_BYTES));
}
