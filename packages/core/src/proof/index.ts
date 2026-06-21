// packages/core/src/proof/index.ts — barrel for the ProofAdapter surface.

export type {
  AuditorDecryptInput,
  AuditorDecryptOutput,
  GenerateProofInput,
  GenerateProofOutput,
  ProofAdapter,
  ProofWitness,
  SessionKey,
} from "./proofAdapter.js";

export { makeSessionKey } from "./proofAdapter.js";
export { fakeProofAdapter } from "./fakeProofAdapter.js";
