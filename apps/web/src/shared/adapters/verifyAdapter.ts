// apps/web/src/shared/adapters/verifyAdapter.ts
//
// Off-chain ElGamal NIZK verify — browser-safe, isomorphic.
// Lives in shared/adapters/ (the allowed crypto seam per AR-15 Story 3.3).
// No @mysten/* imports (AR-15). No node:* imports (browser-safe).
//
// On-chain verify is intentionally deferred to `POST /api/proofs/verify`
// (AR-16). The UI calls that endpoint and handles graceful degradation (AC-5)
// when devnet is unreachable. The existing pnpm test:spike:onchain tests
// cover the on-chain path (Story 3.3 Task 6 / AC-4 deviation note).

import { ristretto255 } from '@noble/curves/ed25519.js';

import { bytesToHex, verifyElGamal } from '@aperture/core/crypto';

export interface VerifyInput {
  /** 32-byte compressed Ristretto255 public key. */
  pk: Uint8Array;
  /** 32-byte aggregate ciphertext point (c1). */
  ciphertext: Uint8Array;
  /** 32-byte aggregate decryption handle (dh). */
  decryptionHandle: Uint8Array;
  /** 128-byte aggregate NIZK proof (a ‖ b ‖ z1 ‖ z2). */
  proof: Uint8Array;
}

export interface VerifyResult {
  offChain: boolean;
  /** null if not attempted (off-chain failed) or devnet unreachable */
  onChain: 'success' | 'abort:100' | 'unreachable' | null;
}

/**
 * Run off-chain ElGamal NIZK verify synchronously.
 * DST = empty Uint8Array (same as all SPIKE-1 tests — AR-12 Fiat-Shamir contract).
 */
export function verifyOffChain(input: VerifyInput): boolean {
  if (
    input.pk.length !== 32 ||
    input.ciphertext.length !== 32 ||
    input.decryptionHandle.length !== 32 ||
    input.proof.length !== 128
  ) {
    return false;
  }
  const pk = ristretto255.Point.fromHex(bytesToHex(input.pk));
  const c1 = ristretto255.Point.fromHex(bytesToHex(input.ciphertext));
  const dh = ristretto255.Point.fromHex(bytesToHex(input.decryptionHandle));
  return verifyElGamal(new Uint8Array(0), pk, c1, dh, input.proof);
}

/**
 * Call the backend `POST /api/proofs/verify` for on-chain verification.
 * Returns 'unreachable' if the endpoint is unavailable (devnet degraded).
 */
export async function verifyOnChain(
  input: VerifyInput,
  amount: bigint,
): Promise<'success' | 'abort:100' | 'unreachable'> {
  function toHex(b: Uint8Array) {
    let out = '';
    for (const byte of b) out += byte.toString(16).padStart(2, '0');
    return out;
  }
  try {
    const res = await fetch('/api/proofs/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proof: toHex(input.proof),
        pubkey: toHex(input.pk),
        ciphertext: toHex(input.ciphertext),
        decryptionHandle: toHex(input.decryptionHandle),
        amount: amount.toString(),
      }),
    });
    if (!res.ok) return 'unreachable';
    const data = (await res.json()) as { onChain: string | null };
    if (data.onChain === 'success') return 'success';
    if (data.onChain === 'abort:100') return 'abort:100';
    return 'unreachable';
  } catch {
    return 'unreachable';
  }
}

/**
 * Full verify flow: off-chain first, then on-chain if off-chain passes.
 * AC-5: if on-chain returns 'unreachable', off-chain result is preserved.
 */
export async function runVerify(
  input: VerifyInput,
  amount: bigint,
): Promise<VerifyResult> {
  const offChain = verifyOffChain(input);
  if (!offChain) {
    return { offChain: false, onChain: null };
  }
  const onChain = await verifyOnChain(input, amount);
  return { offChain: true, onChain };
}
