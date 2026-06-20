// packages/spike/scripts/generate-fiat-shamir-fixture.ts
//
// Writes the canonical Fiat-Shamir regression fixture (matches Move's
// `fiat_shamir_challenge_regression` at vendor/contra/move/sources/nizk.move:308-314).
// The spike test loads this file to assert byte-for-byte agreement with Move
// on the same input. Architecture #1 blocker.

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { bytesToHex, fiatShamirChallenge } from "../src/_bcs.js";

const dst = new Uint8Array(21);
for (let i = 0; i < 21; i++) dst[i] = i;
const p1 = new Uint8Array(32);
for (let i = 0; i < 32; i++) p1[i] = i;

const hash = fiatShamirChallenge([dst, p1]);
const hex = bytesToHex(hash);

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, "../test/fixtures");
writeFileSync(
  resolve(fixturesDir, "fiatShamirBlake2b256.hex"),
  hex + "\n",
  "utf8",
);
console.log(`✓ wrote 32-byte Fiat-Shamir fixture to ${fixturesDir}`);
console.log(`  hex: ${hex}`);
