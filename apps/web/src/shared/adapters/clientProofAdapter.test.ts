// apps/web/src/shared/adapters/clientProofAdapter.test.ts
//
// Story 3.2 AC: 1 (128-byte proof), 2 (client-side), 4 (determinism), 5 (import discipline).
// Uses fixture entries matching AGG_SK / ENTRY_A_* / ENTRY_B_* from spike1.aggregate.test.ts.

import { describe, it, expect } from 'vitest';
import { ristretto255 } from '@noble/curves/ed25519.js';

import { makeSessionKey } from '@aperture/core/proof';
import {
  G,
  H,
  bytesToHex,
  verifyElGamal,
  timingSafeEqual,
  bytesFromBigIntLE,
} from '@aperture/core/crypto';

import { clientProofAdapter } from './clientProofAdapter.js';

// ---------------------------------------------------------------------------
// Fixture constants — must match packages/spike scripts and aggregate test.
// ---------------------------------------------------------------------------
const AGG_SK = 12345n;
const ENTRY_A_AMOUNT = 40000n;
const ENTRY_A_BLINDING = 11111n;
const ENTRY_B_AMOUNT = 30000n;
const ENTRY_B_BLINDING = 22222n;
const AGG_AMOUNT = ENTRY_A_AMOUNT + ENTRY_B_AMOUNT; // 70000
const AGG_BLINDING = ENTRY_A_BLINDING + ENTRY_B_BLINDING; // 33333

/** Build the aggregate statement from the two fixture entries. */
function buildFixtureStatement() {
  const Hp = H();
  const Gp = G();
  const pk = Gp.multiply(AGG_SK);

  const c1A = Gp.multiply(ENTRY_A_BLINDING).add(Hp.multiply(ENTRY_A_AMOUNT));
  const dhA = pk.multiply(ENTRY_A_BLINDING);
  const c1B = Gp.multiply(ENTRY_B_BLINDING).add(Hp.multiply(ENTRY_B_AMOUNT));
  const dhB = pk.multiply(ENTRY_B_BLINDING);

  const c1Agg = c1A.add(c1B);
  const dhAgg = dhA.add(dhB);

  return {
    dst: new Uint8Array(0),
    pk: pk.toBytes(),
    ciphertext: c1Agg.toBytes(),
    decryptionHandle: dhAgg.toBytes(),
    amount: AGG_AMOUNT,
  };
}

/** Build the demo session key from AGG_SK (32 LE bytes). */
function buildDemoSessionKey() {
  return makeSessionKey(bytesFromBigIntLE(AGG_SK, 32));
}

describe('clientProofAdapter (Story 3.2)', () => {
  it('generates a 128-byte proof for the two fixture entries (AC-1)', async () => {
    const statement = buildFixtureStatement();
    const sessionKey = buildDemoSessionKey();
    const secretKey = bytesFromBigIntLE(AGG_SK, 32);

    const output = await clientProofAdapter.generateProof({
      statement,
      witness: { secretKey, blinding: AGG_BLINDING },
      sessionKey,
    });

    expect(output.proof).toBeInstanceOf(Uint8Array);
    expect(output.proof.length).toBe(128);
  });

  it('the generated proof verifies off-chain (AC-1)', async () => {
    const statement = buildFixtureStatement();
    const sessionKey = buildDemoSessionKey();
    const secretKey = bytesFromBigIntLE(AGG_SK, 32);

    const output = await clientProofAdapter.generateProof({
      statement,
      witness: { secretKey, blinding: AGG_BLINDING },
      sessionKey,
    });

    const pk = ristretto255.Point.fromHex(bytesToHex(statement.pk));
    const c1 = ristretto255.Point.fromHex(bytesToHex(statement.ciphertext));
    const dh = ristretto255.Point.fromHex(bytesToHex(statement.decryptionHandle));

    const ok = verifyElGamal(statement.dst, pk, c1, dh, output.proof);
    expect(ok).toBe(true);
  });

  it('proof generation is deterministic — same inputs produce identical bytes (AC-4)', async () => {
    const statement = buildFixtureStatement();
    const sessionKey = buildDemoSessionKey();
    const secretKey = bytesFromBigIntLE(AGG_SK, 32);
    const input = { statement, witness: { secretKey, blinding: AGG_BLINDING }, sessionKey };

    const out1 = await clientProofAdapter.generateProof(input);
    const out2 = await clientProofAdapter.generateProof(input);

    expect(timingSafeEqual(out1.proof, out2.proof)).toBe(true);
  });

  it('a proof for a wrong amount fails verification (AC-4 guard)', async () => {
    const statement = buildFixtureStatement();
    const sessionKey = buildDemoSessionKey();
    const secretKey = bytesFromBigIntLE(AGG_SK, 32);

    // Generate proof with the correct statement
    const output = await clientProofAdapter.generateProof({
      statement,
      witness: { secretKey, blinding: AGG_BLINDING },
      sessionKey,
    });

    // Verify against a statement with the wrong amount (different c1 point)
    // Build a ciphertext for a different amount (amount + 1n)
    const wrongAmount = AGG_AMOUNT + 1n;
    const Hp = H();
    const Gp = G();
    const pk = Gp.multiply(AGG_SK);
    // c1 for wrong amount with same blinding
    const wrongC1 = Gp.multiply(AGG_BLINDING).add(Hp.multiply(wrongAmount));
    const dh = ristretto255.Point.fromHex(bytesToHex(statement.decryptionHandle));

    const ok = verifyElGamal(statement.dst, pk, wrongC1, dh, output.proof);
    expect(ok).toBe(false);
  });

  it('different session keys produce different proofs (AC-4 domain separation)', async () => {
    const statement = buildFixtureStatement();
    const sessionKey1 = buildDemoSessionKey();
    const sessionKey2 = makeSessionKey(bytesFromBigIntLE(99999n, 32));
    const secretKey = bytesFromBigIntLE(AGG_SK, 32);

    const out1 = await clientProofAdapter.generateProof({
      statement,
      witness: { secretKey, blinding: AGG_BLINDING },
      sessionKey: sessionKey1,
    });
    const out2 = await clientProofAdapter.generateProof({
      statement,
      witness: { secretKey, blinding: AGG_BLINDING },
      sessionKey: sessionKey2,
    });

    expect(timingSafeEqual(out1.proof, out2.proof)).toBe(false);
  });

  it('ciphertext output is 96 bytes: pk ‖ c1 ‖ dh', async () => {
    const statement = buildFixtureStatement();
    const sessionKey = buildDemoSessionKey();
    const secretKey = bytesFromBigIntLE(AGG_SK, 32);

    const output = await clientProofAdapter.generateProof({
      statement,
      witness: { secretKey, blinding: AGG_BLINDING },
      sessionKey,
    });

    expect(output.ciphertext.length).toBe(96);
    // First 32 bytes are pk
    expect(timingSafeEqual(output.ciphertext.slice(0, 32), statement.pk)).toBe(true);
    // Next 32 bytes are c1
    expect(timingSafeEqual(output.ciphertext.slice(32, 64), statement.ciphertext)).toBe(true);
    // Last 32 bytes are dh
    expect(timingSafeEqual(output.ciphertext.slice(64, 96), statement.decryptionHandle)).toBe(true);
  });

  it('auditorDecrypt throws (not available client-side)', async () => {
    const sessionKey = buildDemoSessionKey();
    await expect(
      clientProofAdapter.auditorDecrypt({ ciphertext: new Uint8Array(96), auditorKey: sessionKey })
    ).rejects.toThrow('not available client-side');
  });
});
