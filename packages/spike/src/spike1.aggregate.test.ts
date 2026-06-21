// packages/spike/src/spike1.aggregate.test.ts
//
// SPIKE-1 addendum (2026-06-21): off-chain half of the AGGREGATE round-trip.
//
// The original spike1.elgamal.test.ts proves the verify relation for a SINGLE
// encrypted amount. That relation is shared by the single-amount (FR-18) and
// aggregate (FR-15/16) paths, so it does NOT by itself prove the aggregate
// path that AR-4 mandates ("Ciphertext.add → ElGamalNizk → verify_elgamal").
// This file closes that gap: it reconstructs two encrypted entries, performs
// `Ciphertext.add` (component-wise Ristretto addition on c1 AND the
// decryption handle), and asserts the committed aggregate proof verifies.
//
// Fixtures come from scripts/generate-aggregate-proof.ts. The on-chain
// counterpart (same fixtures, same Ciphertext.add) is in
// packages/spike/test/onchain/onchain.devnet.test.ts.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ristretto255 } from "@noble/curves/ed25519.js";

import { H_BYTES } from "@aperture/core/crypto";

import {
  G,
  RISTRETTO_N,
  bytesToHex,
  readScalarLE,
  fiatShamirChallenge,
  hashToScalar,
} from "./_bcs.js";

// MUST match scripts/generate-aggregate-proof.ts + onchain.devnet.test.ts +
// aperture_tests.move (verify_elgamal_aggregate_round_trip).
const AGG_SK = 12345n;
const ENTRY_A_AMOUNT = 40000n;
const ENTRY_A_BLINDING = 11111n;
const ENTRY_B_AMOUNT = 30000n;
const ENTRY_B_BLINDING = 22222n;
const AGG_AMOUNT = ENTRY_A_AMOUNT + ENTRY_B_AMOUNT; // 70000 > 2^16

const here = dirname(fileURLToPath(import.meta.url));
const fxDir = resolve(here, "../test/fixtures");

function loadProof(name: string): Uint8Array {
  return new Uint8Array(
    readFileSync(resolve(fxDir, name), "utf8")
      .trim()
      .match(/.{1,2}/g)!
      .map((b) => parseInt(b, 16)),
  );
}

const proofAggValid = loadProof("proofAggregateValid.hex");
const proofAggTampered = loadProof("proofAggregateTampered.hex");

/** Isomorphic TS-side `verify_elgamal`. Mirrors `aperture::verifier::verify`
 *  (move/sources/verifier.move) — the canonical relation. Built on the shared
 *  `_bcs.ts` primitives so the Fiat-Shamir transcript cannot drift. */
function verifyElGamal(
  dst: Uint8Array,
  pk: InstanceType<typeof ristretto255.Point>,
  e1: InstanceType<typeof ristretto255.Point>, // ciphertext
  e2: InstanceType<typeof ristretto255.Point>, // decryption handle
  proof: Uint8Array,
): boolean {
  const Gp = G();
  const H = ristretto255.Point.fromHex(bytesToHex(H_BYTES));
  const a = ristretto255.Point.fromHex(bytesToHex(proof.slice(0, 32)));
  const b = ristretto255.Point.fromHex(bytesToHex(proof.slice(32, 64)));
  // scalar_from_bytes clamps mod N; mirror that so off-chain ↔ on-chain agree.
  const z1 = readScalarLE(proof, 64) % RISTRETTO_N;
  const z2 = readScalarLE(proof, 96) % RISTRETTO_N;
  const c = hashToScalar(
    fiatShamirChallenge([
      dst,
      Gp.toBytes(),
      H.toBytes(),
      pk.toBytes(),
      e1.toBytes(),
      e2.toBytes(),
      a.toBytes(),
      b.toBytes(),
    ]),
  );
  const lhs1 = pk.multiply(z1);
  const rhs1 = e2.multiply(c).add(a);
  const lhs2 = e1.multiply(c).add(b);
  const rhs2 = Gp.multiply(z1).add(H.multiply(z2));
  return lhs1.equals(rhs1) && lhs2.equals(rhs2);
}

/** Rebuild the aggregate statement by encrypting two entries and summing the
 *  ciphertexts with `Ciphertext.add`. Returns the aggregate (pk, c1, dh). */
function buildAggregateStatement() {
  const H = ristretto255.Point.fromHex(bytesToHex(H_BYTES));
  const pk = G().multiply(AGG_SK);
  const c1A = G().multiply(ENTRY_A_BLINDING).add(H.multiply(ENTRY_A_AMOUNT));
  const dhA = pk.multiply(ENTRY_A_BLINDING);
  const c1B = G().multiply(ENTRY_B_BLINDING).add(H.multiply(ENTRY_B_AMOUNT));
  const dhB = pk.multiply(ENTRY_B_BLINDING);
  return {
    dst: new Uint8Array(0),
    pk,
    ciphertext: c1A.add(c1B), // Ciphertext.add
    decryptionHandle: dhA.add(dhB), // Ciphertext.add
  };
}

describe("spike1.aggregate (Ciphertext.add → prove → verify, off-chain)", () => {
  it("verifies an aggregate proof over two summed ciphertexts", () => {
    const s = buildAggregateStatement();
    const ok = verifyElGamal(
      s.dst,
      s.pk,
      s.ciphertext,
      s.decryptionHandle,
      proofAggValid,
    );
    expect(ok).toBe(true);
  });

  it("rejects a tampered aggregate proof", () => {
    const s = buildAggregateStatement();
    const ok = verifyElGamal(
      s.dst,
      s.pk,
      s.ciphertext,
      s.decryptionHandle,
      proofAggTampered,
    );
    expect(ok).toBe(false);
  });

  it("Ciphertext.add is homomorphic — summed ciphertext == encryption of summed amount", () => {
    const H = ristretto255.Point.fromHex(bytesToHex(H_BYTES));
    const pk = G().multiply(AGG_SK);
    const s = buildAggregateStatement();
    const aggBlinding = ENTRY_A_BLINDING + ENTRY_B_BLINDING;
    const directC1 = G().multiply(aggBlinding).add(H.multiply(AGG_AMOUNT));
    const directDh = pk.multiply(aggBlinding);
    expect(s.ciphertext.equals(directC1)).toBe(true);
    expect(s.decryptionHandle.equals(directDh)).toBe(true);
  });

  it("carry case: the aggregate sum exceeds 2^16 yet the proof still verifies", () => {
    // architecture.md line 51: a limb-0 carry past 2^16. The PROOF relation is
    // over full Ristretto scalars, so it is carry-safe (verified by the first
    // test, whose AGG_AMOUNT = 70000 > 65536). This asserts the boundary is
    // genuinely crossed.
    //
    // HONEST SCOPE: this spike uses single-scalar ElGamal, NOT Contra's
    // multi-limb twisted ElGamal + 16-bit dlog table. The DECRYPTABILITY
    // failure (a real Contra aggregate becoming undecryptable when limb-0
    // carries past 2^16) is NOT modelled here and is NOT closed by this test.
    // It remains a Story 3.1 prerequisite: bound-and-reject at selection time.
    expect(AGG_AMOUNT).toBeGreaterThan(65536n);
  });
});
