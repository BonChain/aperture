// packages/spike/scripts/generate-fiat-shamir-fixture.ts
//
// Writes the canonical Fiat-Shamir regression fixture (matches Move's
// `fiat_shamir_challenge_regression` at vendor/contra/move/sources/nizk.move:308-314).
// The spike test loads this file to assert byte-for-byte agreement with Move
// on the same input. Architecture #1 blocker.

import { blake2b } from "@noble/hashes/blake2.js";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const dst = new Uint8Array(21);
for (let i = 0; i < 21; i++) dst[i] = i;
const p1 = new Uint8Array(32);
for (let i = 0; i < 32; i++) p1[i] = i;

const hash = blake2b(bcsEncodeVectorVectorU8([dst, p1]), { dkLen: 32 });
hash[31] = 0;

const hex = Array.from(hash)
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, "../test/fixtures");
writeFileSync(
  resolve(fixturesDir, "fiatShamirBlake2b256.hex"),
  hex + "\n",
  "utf8",
);
console.log(`✓ wrote 32-byte Fiat-Shamir fixture to ${fixturesDir}`);
console.log(`  hex: ${hex}`);
