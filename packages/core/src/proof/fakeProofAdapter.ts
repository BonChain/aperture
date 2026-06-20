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

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { hexToBytes } from "../crypto/index.js";

import type {
  AuditorDecryptInput,
  AuditorDecryptOutput,
  GenerateProofInput,
  GenerateProofOutput,
  ProofAdapter,
} from "./proofAdapter.js";

const here = dirname(fileURLToPath(import.meta.url));

// Load the committed fixture (Story 1.1b Task 7 — same file spike1.elgamal.test.ts uses).
// Centralizing here means a fixture update is committed once; both the spike test and
// this adapter see the same bytes.
//
// Path is relative to this file at packages/core/src/proof/ → up 3 to project root,
// then into packages/spike/.
const VALID_PROOF: Uint8Array = (() => {
  const fixturePath = resolve(
    here,
    "../../../spike/test/fixtures/proofValid.hex",
  );
  const hex = readFileSync(fixturePath, "utf8").trim();
  const bytes = hexToBytes(hex);
  if (bytes.length !== 128) {
    throw new Error(
      `fakeProofAdapter: proofValid.hex must be exactly 128 bytes (got ${bytes.length}). ` +
        `Re-run packages/spike/scripts/generate-golden-proofs.ts to regenerate.`,
    );
  }
  return bytes;
})();

/** The plaintext value the fake auditor "decrypts" to — matches `statement.amount`
 *  in the golden fixture (TEST_AMOUNT=42). Mirrors the deterministic fixture used for AC5. */
const FAKE_PLAINTEXT = 42n;

export const fakeProofAdapter: ProofAdapter = {
  async generateProof(_input: GenerateProofInput): Promise<GenerateProofOutput> {
    // NOTE: ignores the input shape — returns the committed valid proof.
    // Once the real adapter lands, drop this and pass through the witness.
    return {
      proof: VALID_PROOF,
      // `ciphertext` field per `proofAdapter.ts` docstring is the pk‖ct‖dh
      // triple (96 bytes for twisted ElGamal). The fake returns the same
      // fixture bytes for now (consumers parse this in 1.2a when real
      // encryption lands); size asserted above.
      ciphertext: VALID_PROOF.slice(0, 96),
    };
  },
  async auditorDecrypt(_input: AuditorDecryptInput): Promise<AuditorDecryptOutput> {
    return FAKE_PLAINTEXT;
  },
};
