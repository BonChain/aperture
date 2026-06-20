// packages/core/src/proof/fakeProofAdapter.ts
//
// `FakeProofAdapter` returns COMMITTED golden fixtures (NOT random data).
// Story 3.3's `verify` path tests against the same fixtures so 3.3 stands
// on this seam rather than on Story 3.2's runtime output — eliminating a
// 3.3 → 3.2 forward dependency (per the readiness report).
//
// Real implementations (`ClientProofAdapter`, `ServerProofAdapter`) land
// after SPIKE-1 (Story 1.2a) confirms the off-chain ↔ on-chain round-trip
// is byte-identical. Until then, downstream code wires to `fakeProofAdapter`
// and the integration contract is stable.

import type {
  AuditorDecryptInput,
  AuditorDecryptOutput,
  GenerateProofInput,
  GenerateProofOutput,
  ProofAdapter,
} from "./proofAdapter.js";

/** Committed valid proof bytes. Hex: see `packages/spike/test/fixtures/proofValid.hex`. */
const VALID_PROOF_HEX =
  "20b4c1b3cdef7ba1bd94fa95c7b736622046ef663285813c2293c52c5f4f9fb" +
  "20b4c1b3cdef7ba1bd94fa95c7b736622046ef663285813c2293c52c5f4f9fb" +
  "20b4c1b3cdef7ba1bd94fa95c7b736622046ef663285813c2293c52c5f4f9fb" +
  "20b4c1b3cdef7ba1bd94fa95c7b736622046ef663285813c2293c52c5f4f9fb";

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error(`odd-length hex: ${hex.length}`);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

const VALID_PROOF = hexToBytes(VALID_PROOF_HEX);

/** The plaintext value the fake auditor "decrypts" to — matches `statement.amount`
 *  in the golden fixture. Mirrors the deterministic fixture used for AC5. */
const FAKE_PLAINTEXT = 42n;

export const fakeProofAdapter: ProofAdapter = {
  async generateProof(_input: GenerateProofInput): Promise<GenerateProofOutput> {
    // NOTE: ignores the input shape — returns the committed valid proof.
    // Once the real adapter lands, drop this and pass through the witness.
    return {
      proof: VALID_PROOF,
      ciphertext: new Uint8Array(VALID_PROOF), // opaque placeholder for now
    };
  },
  async auditorDecrypt(_input: AuditorDecryptInput): Promise<AuditorDecryptOutput> {
    return FAKE_PLAINTEXT;
  },
};
