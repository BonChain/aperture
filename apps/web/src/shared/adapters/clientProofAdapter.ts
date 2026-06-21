// apps/web/src/shared/adapters/clientProofAdapter.ts
//
// ClientProofAdapter — Mode B proof generation, client-side only.
// AR-15: no @mysten/* imports; no node:* imports (browser-safe).
// AR-12: deterministic nonces derived via Blake2b over domain-separated inputs.
// AR-6: key never leaves this browser.
//
// Story 3.2 delivers this real implementation replacing fakeProofAdapter for
// the Holder Mode B flow. Session key integration (HKDF from wallet sig) is
// deferred to Story 4.1; for the demo fixture, the session key bytes carry
// the 12345n scalar (AGG_SK).

import { blake2b } from '@noble/hashes/blake2.js';
import { ristretto255 } from '@noble/curves/ed25519.js';

import type { ProofAdapter, GenerateProofInput, GenerateProofOutput } from '@aperture/core/proof';
import {
  elgamalProve,
  bytesToHex,
  hashToScalar,
} from '@aperture/core/crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a deterministic scalar nonce for r1 or r2.
 *  domain_sep = "aperture:elgamal:r1" or "aperture:elgamal:r2"
 *  output = hashToScalar(blake2b(domain_sep ‖ sessionKeyBytes ‖ inputCommitment)) */
function deriveNonce(domainSep: string, sessionKeyBytes: Uint8Array, inputCommitment: Uint8Array): bigint {
  const tag = new TextEncoder().encode(domainSep);
  const preimage = new Uint8Array(tag.length + sessionKeyBytes.length + inputCommitment.length);
  preimage.set(tag, 0);
  preimage.set(sessionKeyBytes, tag.length);
  preimage.set(inputCommitment, tag.length + sessionKeyBytes.length);
  const hash = blake2b(preimage, { dkLen: 32 });
  return hashToScalar(hash);
}

/** Build a stable commitment from the aggregate statement bytes for nonce derivation. */
function buildInputCommitment(
  pk: Uint8Array,
  c1: Uint8Array,
  dh: Uint8Array,
  amount: bigint,
): Uint8Array {
  // 32 + 32 + 32 + 8 = 104 bytes
  const out = new Uint8Array(104);
  out.set(pk, 0);
  out.set(c1, 32);
  out.set(dh, 64);
  // amount as 8 LE bytes
  let v = amount;
  for (let i = 0; i < 8; i++) {
    out[96 + i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const clientProofAdapter: ProofAdapter = {
  async generateProof(input: GenerateProofInput): Promise<GenerateProofOutput> {
    const { statement, witness, sessionKey } = input;

    if (statement.pk.length !== 32)
      throw new Error(`clientProofAdapter: pk must be 32 bytes (got ${statement.pk.length})`);
    if (statement.ciphertext.length !== 32)
      throw new Error(`clientProofAdapter: ciphertext must be 32 bytes (got ${statement.ciphertext.length})`);
    if (statement.decryptionHandle.length !== 32)
      throw new Error(`clientProofAdapter: decryptionHandle must be 32 bytes (got ${statement.decryptionHandle.length})`);

    // Deserialize Ristretto points from statement bytes.
    const pk = ristretto255.Point.fromHex(bytesToHex(statement.pk));
    const c1 = ristretto255.Point.fromHex(bytesToHex(statement.ciphertext));
    const dh = ristretto255.Point.fromHex(bytesToHex(statement.decryptionHandle));

    // Derive deterministic nonces (AR-12).
    const inputCommitment = buildInputCommitment(
      statement.pk,
      statement.ciphertext,
      statement.decryptionHandle,
      statement.amount,
    );
    const r1 = deriveNonce('aperture:elgamal:r1', sessionKey.bytes, inputCommitment);
    const r2 = deriveNonce('aperture:elgamal:r2', sessionKey.bytes, inputCommitment);

    // Produce the 128-byte NIZK proof.
    const dst = statement.dst;
    const proof = elgamalProve(dst, witness.blinding, statement.amount, pk, c1, dh, r1, r2);

    if (proof.length !== 128) {
      throw new Error(`clientProofAdapter: proof must be 128 bytes (got ${proof.length})`);
    }

    // Ciphertext output: pk ‖ c1 ‖ dh (96 bytes), same shape as fakeProofAdapter.
    const ciphertext = new Uint8Array(96);
    ciphertext.set(statement.pk, 0);
    ciphertext.set(statement.ciphertext, 32);
    ciphertext.set(statement.decryptionHandle, 64);

    return { proof, ciphertext };
  },

  async auditorDecrypt(): Promise<never> {
    throw new Error('auditorDecrypt not available client-side');
  },
};
