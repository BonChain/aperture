// packages/core/src/proof/proofAdapter.ts
//
// `ProofAdapter` seam per architecture (D1 — Crypto Architecture Rule).
// Two operations:
//
//   generateProof: Mode B — produce a NIZK over a Statement claiming a
//     ciphertext decrypts to `amount` under `pk`. Client-side per D1 split.
//     Real impl lands after SPIKE-1; for now `fakeProofAdapter` returns
//     committed golden fixtures (Task 7).
//
//   auditorDecrypt: Mode A — designated auditor recovers the plaintext.
//     Server-side per D1 split. Real impl also lands after SPIKE-1; fake
//     returns a known plaintext for the fixture ciphertext.
//
// `SessionKey` is a branded type with `toJSON` throwing — secrets must
// never leak via JSON.stringify / inspection / devtools. Branded types
// give us this for free at the type level.

import type { Statement } from "../crypto/statementCodec.js";

declare const sessionKeyBrand: unique symbol;
export type SessionKey = {
  readonly [sessionKeyBrand]: "SessionKey";
  readonly bytes: Uint8Array;
};

export function makeSessionKey(bytes: Uint8Array): SessionKey {
  if (bytes.length !== 32) {
    throw new Error(
      `SessionKey must be exactly 32 bytes (got ${bytes.length}). ` +
        `Refusing to construct — pin a real key once SPIKE-1 picks a curve.`,
    );
  }
  // toJSON throws on purpose — secrets must never serialize via
  // JSON.stringify / devtools / etc. Defined as a method on the literal so
  // the object remains frozen (defineProperty on frozen objects throws).
  const sk = Object.freeze({
    bytes,
    toJSON() {
      throw new Error("SessionKey.toJSON is forbidden — secrets must never be serialized");
    },
  }) as unknown as SessionKey;
  return sk;
}

/** Witness for `generateProof`. Carries the secret-side inputs needed to build
 *  the proof but not the public outputs. Never logged, never persisted. */
export interface ProofWitness {
  /** Secret key bytes (32 bytes). NEVER log; branded equivalent. */
  readonly secretKey: Uint8Array;
  /** Blinding factor used during encryption; deterministic per (sessionKey, inputCommitment). */
  readonly blinding: bigint;
}

/** Inputs to `generateProof`. */
export interface GenerateProofInput {
  readonly statement: Statement;
  readonly witness: ProofWitness;
  readonly sessionKey: SessionKey;
}

/** Result of `generateProof`. */
export interface GenerateProofOutput {
  /** The NIZK proving ciphertext decrypts to `statement.amount` under `statement.pk`. */
  readonly proof: Uint8Array;
  /** The full ciphertext bytes (re-exposed so the caller does not need to round-trip via Statement). */
  readonly ciphertext: Uint8Array;
}

/** Inputs to `auditorDecrypt`. */
export interface AuditorDecryptInput {
  /** ElGamal ciphertext bytes: pk ‖ ciphertext ‖ decryption_handle (96 bytes). */
  readonly ciphertext: Uint8Array;
  readonly auditorKey: SessionKey;
}

/** Result of `auditorDecrypt`. */
export type AuditorDecryptOutput = bigint;

/** The seam. `ClientProofAdapter` and `ServerProofAdapter` (future) implement this. */
export interface ProofAdapter {
  generateProof(input: GenerateProofInput): Promise<GenerateProofOutput>;
  auditorDecrypt(input: AuditorDecryptInput): Promise<AuditorDecryptOutput>;
}
