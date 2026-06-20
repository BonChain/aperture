// packages/spike/scripts/generate-golden-proofs.ts
//
// One-shot generator for the committed golden proof fixtures at
// `packages/spike/test/fixtures/proofValid.hex` and `proofTampered.hex`.
//
// Algorithm matches `aperture::aperture_tests::verify_elgamal_round_trip`
// (Move) — same TEST_AMOUNT / TEST_BLINDING / TEST_SK so the TS-side proof
// verifies against the same `aperture::statement::Statement` the Move test
// produced. Story 3.3's verify will consume these committed bytes — NOT
// Story 3.2's runtime output — to eliminate the 3.3 → 3.2 forward
// dependency (per the implementation-readiness report).
//
// Usage: `pnpm tsx scripts/generate-golden-proofs.ts`. After running, COMMIT
// the regenerated files. Do NOT regenerate without a corresponding Story
// update — the fixtures are part of the seam contract.

import { ristretto255 } from "@noble/curves/ed25519.js";
import { blake2b } from "@noble/hashes/blake2.js";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_AMOUNT = 42n;
const TEST_BLINDING = 67890n;
const TEST_SK = 12345n;

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, "../test/fixtures");

// Same `h` bytes as `aperture::verifier::H_BYTES` and `contra::twisted_elgamal::h()`.
const H_BYTES = new Uint8Array([
  0x34, 0xce, 0x14, 0x77, 0xc1, 0x45, 0x58, 0x17, 0x80, 0x89, 0x50, 0x0a,
  0x39, 0xc8, 0x64, 0xe0, 0xf6, 0x07, 0xb3, 0xc1, 0xf4, 0x1a, 0xb3, 0x98,
  0x40, 0x0e, 0x4a, 0x9d, 0xe6, 0xd2, 0xc4, 0x46,
]);

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

function fiatShamir(chunks: Uint8Array[]): bigint {
  const preimage = bcsEncodeVectorVectorU8(chunks);
  const hash = blake2b(preimage, { dkLen: 32 });
  hash[31] = 0;
  return ristretto255.Point.Fn.create(
    hash.reduce((acc, b, i) => acc | (BigInt(b) << BigInt(i * 8)), 0n),
  );
}

function bytesFromBigIntLE(n: bigint, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let v = n;
  for (let i = 0; i < len; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

// Compute the canonical Statement + proof bytes for the test triple.
const G = ristretto255.Point.BASE;
const H = ristretto255.Point.fromHex(bytesToHex(H_BYTES));

const skScalar = TEST_SK;
const blindingScalar = TEST_BLINDING;
const amountScalar = TEST_AMOUNT;

const pk = G.multiply(skScalar);
const c1 = G.multiply(blindingScalar).add(H.multiply(amountScalar));
const dh = pk.multiply(blindingScalar);

const dst = new Uint8Array(0); // matches Move prove_for_testing call

// prove_elgamal (mirrors Move):
//   r1 = scalar_from_u64(1234)
//   r2 = scalar_from_u64(5678)
//   a  = r1 * pk
//   b  = r1 * g + r2 * h
//   c  = challenge(dst, g, h, pk, c1, dh, a, b)
//   z1 = r1 + c * blinding
//   z2 = r2 + c * amount
const r1 = 1234n;
const r2 = 5678n;
const a = pk.multiply(r1);
const b = G.multiply(r1).add(H.multiply(r2));

const challenge = fiatShamir([
  dst,
  G.toBytes(),
  H.toBytes(),
  pk.toBytes(),
  c1.toBytes(),
  dh.toBytes(),
  a.toBytes(),
  b.toBytes(),
]);

const z1 = r1 + challenge * blindingScalar;
const z2 = r2 + challenge * amountScalar;

// Reduce z1/z2 modulo the Ristretto group order. Move's `scalar_add` /
// `scalar_mul` reduce mod n at every step, so on-chain z1/z2 are always in
// [0, n). We do the same here so the fixtures match the canonical wire
// shape and noble's `Point.multiply` accepts the values.
const N = 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn;
const z1Reduced = ((z1 % N) + N) % N;
const z2Reduced = ((z2 % N) + N) % N;

const proofBytes = new Uint8Array(128);
proofBytes.set(a.toBytes(), 0);
proofBytes.set(b.toBytes(), 32);
proofBytes.set(bytesFromBigIntLE(z1Reduced, 32), 64);
proofBytes.set(bytesFromBigIntLE(z2Reduced, 32), 96);

// Tamper: flip the low bit of z1's first byte. This is a SCALAR tamper
// (z1 is a 32-byte LE Ristretto scalar); `scalar_from_bytes` accepts any
// 32-byte input and reduces mod group order, so the tampered scalar
// remains well-formed. What fails is the Fiat-Shamir relation in
// `verify` — same as the Move test pattern (avoiding point-byte tamper
// which aborts at `g_from_bytes` on a non-canonical Ristretto encoding).
const tampered = new Uint8Array(proofBytes);
tampered[64] = (tampered[64] as number) ^ 0x01; // flip low bit of z1 byte 0

writeFileSync(
  resolve(fixturesDir, "proofValid.hex"),
  bytesToHex(proofBytes) + "\n",
  "utf8",
);
writeFileSync(
  resolve(fixturesDir, "proofTampered.hex"),
  bytesToHex(tampered) + "\n",
  "utf8",
);

console.log(
  `✓ wrote ${proofBytes.length}-byte valid proof and tampered variant (z1 low-bit flip) to ${fixturesDir}`,
);

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}
