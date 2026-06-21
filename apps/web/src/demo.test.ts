// apps/web/src/demo.test.ts
//
// Story 4.5: Smoke test for the recorded backup path.
// Verifies that the committed golden fixture from SPIKE-1 verifies off-chain,
// and that the tampered fixture fails. These tests run without devnet — they
// are the continuity insurance for when the live demo has network issues.
//
// node:* imports are intentional — test infrastructure only.
// The lint zone scanner excludes *.test.* files.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

import { G, H, verifyElGamal } from '@aperture/core/crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../../../packages/spike/test/fixtures');

function loadHex(filename: string): Uint8Array {
  const text = readFileSync(resolve(FIXTURES_DIR, filename), 'utf8').trim();
  const bytes = new Uint8Array(text.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Fixture constants — must match SPIKE-1 generate-aggregate-proof.ts.
const SK = 12345n;
const AMOUNT_A = 40000n;
const BLIND_A = 11111n;
const AMOUNT_B = 30000n;
const BLIND_B = 22222n;

/** Rebuild aggregate statement from the two SPIKE-1 fixture entries. */
function buildAggStatement() {
  const Gp = G();
  const Hp = H();
  const pk = Gp.multiply(SK);
  const c1A = Gp.multiply(BLIND_A).add(Hp.multiply(AMOUNT_A));
  const dhA = pk.multiply(BLIND_A);
  const c1B = Gp.multiply(BLIND_B).add(Hp.multiply(AMOUNT_B));
  const dhB = pk.multiply(BLIND_B);
  return { pk, c1: c1A.add(c1B), dh: dhA.add(dhB) };
}

describe('Demo recorded backup (SPIKE-1 golden fixtures)', () => {
  it('proofAggregateValid.hex verifies off-chain (recorded backup passes)', () => {
    const { pk, c1, dh } = buildAggStatement();
    const proof = loadHex('proofAggregateValid.hex');
    expect(proof.length).toBe(128);
    expect(verifyElGamal(new Uint8Array(0), pk, c1, dh, proof)).toBe(true);
  });

  it('proofAggregateTampered.hex fails off-chain (tamper detection)', () => {
    const { pk, c1, dh } = buildAggStatement();
    const proof = loadHex('proofAggregateTampered.hex');
    expect(proof.length).toBe(128);
    expect(verifyElGamal(new Uint8Array(0), pk, c1, dh, proof)).toBe(false);
  });
});
