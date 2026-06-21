// packages/spike/scripts/generate-aggregate-proof.ts
//
// SPIKE-1 addendum (2026-06-21): the `Ciphertext.add → ElGamalNizk →
// verify_elgamal` AGGREGATE round-trip that AR-4 mandates but the original
// single-amount golden fixtures (generate-golden-proofs.ts) did not exercise.
//
// What this closes
// ----------------
// The original SPIKE-1 fixtures prove the verify RELATION for a single
// encrypted amount. The relation is shared by the single-amount (FR-18) and
// aggregate (FR-15/16) paths, so single-amount verify alone does NOT prove
// the aggregate path. This generator builds TWO entries under one holder pk,
// homomorphically sums their ciphertexts (`Ciphertext.add` = component-wise
// Ristretto point addition on c1 AND the decryption handle), and proves the
// AGGREGATE encrypts the summed amount. The committed fixtures verify
// off-chain (spike1.aggregate.test.ts) AND on-chain (onchain.devnet.test.ts).
//
// Carry case
// ----------
// The two amounts sum PAST 2^16 (40000 + 30000 = 70000) on purpose, to
// exercise architecture.md line 51's limb-0-carry concern at the proof
// boundary. NOTE the honest scope: this spike uses a single-scalar ElGamal
// (amount is a full Ristretto scalar), NOT Contra's multi-limb twisted
// ElGamal + 16-bit dlog table. So this proves the PROOF/aggregation half is
// carry-safe (the relation verifies for any scalar amount). The
// DECRYPTABILITY half — that a real Contra aggregate whose limb-0 carries
// past 2^16 becomes undecryptable — is NOT modelled here and remains a
// Story 3.1 prerequisite: bound-and-reject at selection time. See the
// SPIKE-1 go/no-go addendum.
//
// Usage: `pnpm exec tsx scripts/generate-aggregate-proof.ts`. After running,
// COMMIT the regenerated files. Do NOT regenerate without a corresponding
// Story update — the fixtures are part of the seam contract.

import { ristretto255 } from "@noble/curves/ed25519.js";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { H_BYTES } from "@aperture/core/crypto";

import {
  G,
  RISTRETTO_N,
  bytesToHex,
  bytesFromBigIntLE,
  fiatShamirChallenge,
  hashToScalar,
} from "../src/_bcs.js";

// --- Aggregate test constants. MUST match spike1.aggregate.test.ts +
//     onchain.devnet.test.ts (aggregate block) + aperture_tests.move
//     (verify_elgamal_aggregate_round_trip). ---
const AGG_SK = 12345n; // same holder pk as the single-amount fixture (TEST_SK)
const ENTRY_A_AMOUNT = 40000n;
const ENTRY_A_BLINDING = 11111n;
const ENTRY_B_AMOUNT = 30000n;
const ENTRY_B_BLINDING = 22222n;
// Aggregate = sum of the two entries (Ciphertext.add is additively
// homomorphic, so the summed ciphertext encrypts the summed amount under the
// summed blinding). 70000 > 2^16 = 65536 — the deliberate limb-0 carry.
const AGG_AMOUNT = ENTRY_A_AMOUNT + ENTRY_B_AMOUNT; // 70000
const AGG_BLINDING = ENTRY_A_BLINDING + ENTRY_B_BLINDING; // 33333
const PROOF_R1 = 1234n; // same nonces as generate-golden-proofs.ts
const PROOF_R2 = 5678n;

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, "../test/fixtures");

const H = ristretto255.Point.fromHex(bytesToHex(H_BYTES));
const pk = G().multiply(AGG_SK);

// Two encrypted entries under the same pk:
//   c1 = blinding * g + amount * h ;  dh = blinding * pk
const c1A = G().multiply(ENTRY_A_BLINDING).add(H.multiply(ENTRY_A_AMOUNT));
const dhA = pk.multiply(ENTRY_A_BLINDING);
const c1B = G().multiply(ENTRY_B_BLINDING).add(H.multiply(ENTRY_B_AMOUNT));
const dhB = pk.multiply(ENTRY_B_BLINDING);

// Ciphertext.add — component-wise Ristretto point addition. This is the step
// the original fixtures never exercised.
const c1Agg = c1A.add(c1B);
const dhAgg = dhA.add(dhB);

// Sanity: the homomorphic sum must equal a fresh encryption of the summed
// amount under the summed blinding. If this throws, the aggregation identity
// is broken and the whole Mode B premise is wrong — fail loud here.
const c1Direct = G().multiply(AGG_BLINDING).add(H.multiply(AGG_AMOUNT));
const dhDirect = pk.multiply(AGG_BLINDING);
if (!c1Agg.equals(c1Direct) || !dhAgg.equals(dhDirect)) {
  throw new Error(
    "Ciphertext.add identity failed: summed ciphertext != encryption of summed amount",
  );
}

// prove_elgamal over the AGGREGATE statement (dst, pk, c1Agg, dhAgg):
//   a  = r1 * pk
//   b  = r1 * g + r2 * h
//   c  = challenge(dst, g, h, pk, c1Agg, dhAgg, a, b)
//   z1 = r1 + c * AGG_BLINDING
//   z2 = r2 + c * AGG_AMOUNT
const dst = new Uint8Array(0); // matches the single-amount fixture + Move
const a = pk.multiply(PROOF_R1);
const b = G().multiply(PROOF_R1).add(H.multiply(PROOF_R2));

const challenge = hashToScalar(
  fiatShamirChallenge([
    dst,
    G().toBytes(),
    H.toBytes(),
    pk.toBytes(),
    c1Agg.toBytes(),
    dhAgg.toBytes(),
    a.toBytes(),
    b.toBytes(),
  ]),
);

const z1 = (((PROOF_R1 + challenge * AGG_BLINDING) % RISTRETTO_N) + RISTRETTO_N) % RISTRETTO_N;
const z2 = (((PROOF_R2 + challenge * AGG_AMOUNT) % RISTRETTO_N) + RISTRETTO_N) % RISTRETTO_N;

const proofBytes = new Uint8Array(128);
proofBytes.set(a.toBytes(), 0);
proofBytes.set(b.toBytes(), 32);
proofBytes.set(bytesFromBigIntLE(z1, 32), 64);
proofBytes.set(bytesFromBigIntLE(z2, 32), 96);

// Tampered: flip the low bit of z1's first byte — a SCALAR tamper that stays
// well-formed under scalar_from_bytes but breaks the Fiat-Shamir relation.
// Same pattern as generate-golden-proofs.ts.
const tampered = new Uint8Array(proofBytes);
tampered[64] = (tampered[64] as number) ^ 0x01;

writeFileSync(
  resolve(fixturesDir, "proofAggregateValid.hex"),
  bytesToHex(proofBytes) + "\n",
  "utf8",
);
writeFileSync(
  resolve(fixturesDir, "proofAggregateTampered.hex"),
  bytesToHex(tampered) + "\n",
  "utf8",
);

console.log(
  `✓ wrote aggregate proof (2 entries, summed amount ${AGG_AMOUNT} > 2^16) ` +
    `+ tampered variant to ${fixturesDir}`,
);
