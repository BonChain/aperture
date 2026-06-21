// apps/web/src/shared/adapters/aggregateStatement.ts
//
// Builds the aggregate ElGamal statement from a set of fixture entries.
// Lives in shared/adapters/ (allowed crypto seam per AR-15).
// Called by ProofGenerator.tsx — keeps ristretto operations out of the component layer.

import { ristretto255 } from '@noble/curves/ed25519.js';

import { G, H } from '@aperture/core/crypto';
import type { MockEntry } from '../../features/holder/mockEntries';

// Fixture holder pk: pk = G * 12345n. Story 4.1 derives from real sessionKey.
const FIXTURE_SK = 12345n;

export interface AggregateStatementResult {
  statement: {
    dst: Uint8Array;
    pk: Uint8Array;
    ciphertext: Uint8Array;
    decryptionHandle: Uint8Array;
    amount: bigint;
  };
  aggBlinding: bigint;
}

/**
 * Build the aggregate ElGamal statement from selected entries.
 * Performs homomorphic Ciphertext.add (component-wise Ristretto point addition).
 *
 * @param entries  Selected fixture entries (must have amount + blinding).
 * @param totalAmount  The pre-computed aggregate amount (from SelectEntries).
 */
export function buildAggregateStatement(
  entries: readonly MockEntry[],
  totalAmount: bigint,
): AggregateStatementResult {
  if (entries.length === 0) {
    throw new Error('buildAggregateStatement: no entries provided');
  }

  const Gp = G();
  const Hp = H();
  const pk = Gp.multiply(FIXTURE_SK);

  let aggBlinding = 0n;
  let c1Agg = ristretto255.Point.ZERO;
  let dhAgg = ristretto255.Point.ZERO;

  for (const entry of entries) {
    const c1i = Gp.multiply(entry.blinding).add(Hp.multiply(entry.amount));
    const dhi = pk.multiply(entry.blinding);
    c1Agg = c1Agg.add(c1i);
    dhAgg = dhAgg.add(dhi);
    aggBlinding += entry.blinding;
  }

  const statement = {
    dst: new Uint8Array(0),
    pk: pk.toBytes(),
    ciphertext: c1Agg.toBytes(),
    decryptionHandle: dhAgg.toBytes(),
    amount: totalAmount,
  };

  return { statement, aggBlinding };
}
