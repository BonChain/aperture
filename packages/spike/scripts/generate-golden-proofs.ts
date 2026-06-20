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
// Usage: `pnpm exec tsx scripts/generate-golden-proofs.ts`. After running, COMMIT
// the regenerated files. Do NOT regenerate without a corresponding Story
// update — the fixtures are part of the seam contract.

import { ristretto255 } from "@noble/curves/ed25519.js";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { H_BYTES } from "@aperture/core/crypto";

import {
  G,
  bytesToHex,
  bytesFromBigIntLE,
  fiatShamirChallenge,
  hashToScalar,
} from "../src/_bcs.js";

const TEST_AMOUNT = 42n;
const TEST_BLINDING = 67890n;
const TEST_SK = 12345n;

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, "../test/fixtures");

// Compute the canonical Statement + proof bytes for the test triple.
const skScalar = TEST_SK;
const blindingScalar = TEST_BLINDING;
const amountScalar = TEST_AMOUNT;

const pk = G().multiply(skScalar);
const H = ristretto255.Point.fromHex(bytesToHex(H_BYTES));
const c1 = G().multiply(blindingScalar).add(H.multiply(amountScalar));
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
const b = G().multiply(r1).add(H.multiply(r2));

const challenge = hashToScalar(
  fiatShamirChallenge([
    dst,
    G().toBytes(),
    H.toBytes(),
    pk.toBytes(),
    c1.toBytes(),
    dh.toBytes(),
    a.toBytes(),
    b.toBytes(),
  ]),
);

const z1 = r1 + challenge * blindingScalar;
const z2 = r2 + challenge * amountScalar;

// Reduce z1/z2 modulo the Ristretto group order. Move's `scalar_add` /
// `scalar_mul` reduce mod n at every step, so on-chain z1/z2 are always
// in [0, n). We do the same here so the fixtures match the canonical
// wire shape and noble's `Point.multiply` accepts the values.
const N = 0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn;
const z1Reduced = ((z1 % N) + N) % N;
const z2Reduced = ((z2 % N) + N) % N;

const proofBytes = new Uint8Array(128);
proofBytes.set(a.toBytes(), 0);
proofBytes.set(b.toBytes(), 32);
proofBytes.set(bytesFromBigIntLE(z1Reduced, 32), 64);
proofBytes.set(bytesFromBigIntLE(z2Reduced, 32), 96);

// Tampered: flip the low bit of z1's first byte. This is a SCALAR tamper
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
  `✓ wrote ${proofBytes.length}-byte valid proof and tampered variant to ${fixturesDir}`,
);
