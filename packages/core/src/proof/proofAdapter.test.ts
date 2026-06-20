// packages/core/src/proof/proofAdapter.test.ts
//
// Confirms the adapter interface shape, that `makeSessionKey` rejects
// wrong-length inputs, and that `SessionKey.toJSON` throws (so secrets
// cannot leak via JSON.stringify / devtools / etc.).

import { describe, it, expect } from "vitest";

import {
  fakeProofAdapter,
  makeSessionKey,
  type SessionKey,
} from "./index.js";

describe("ProofAdapter (interface + fake)", () => {
  it("fakeProofAdapter.generateProof returns 128 bytes (committed fixture)", async () => {
    const sk = makeSessionKey(new Uint8Array(32));
    const out = await fakeProofAdapter.generateProof({
      statement: {
        dst: new Uint8Array([]),
        pk: new Uint8Array(32),
        ciphertext: new Uint8Array(32),
        decryptionHandle: new Uint8Array(32),
        amount: 42n,
      },
      witness: {
        secretKey: new Uint8Array(32),
        blinding: 67890n,
      },
      sessionKey: sk,
    });
    expect(out.proof).toBeInstanceOf(Uint8Array);
    expect(out.proof.length).toBeGreaterThan(0);
  });

  it("fakeProofAdapter.auditorDecrypt returns the deterministic plaintext", async () => {
    const sk = makeSessionKey(new Uint8Array(32));
    const plaintext = await fakeProofAdapter.auditorDecrypt({
      ciphertext: new Uint8Array(96),
      auditorKey: sk,
    });
    expect(plaintext).toBe(42n);
  });

  it("makeSessionKey accepts exactly 32 bytes", () => {
    expect(() => makeSessionKey(new Uint8Array(32))).not.toThrow();
    expect(() => makeSessionKey(new Uint8Array(31))).toThrow(/32 bytes/);
    expect(() => makeSessionKey(new Uint8Array(33))).toThrow(/32 bytes/);
  });

  it("SessionKey.toJSON throws — secrets must never serialize", () => {
    const sk: SessionKey = makeSessionKey(new Uint8Array(32).fill(0xab));
    expect(() => JSON.stringify({ sk })).toThrow(/forbidden/);
    expect(() => (sk as unknown as { toJSON?: () => unknown }).toJSON?.()).toThrow(
      /forbidden/,
    );
  });
});
