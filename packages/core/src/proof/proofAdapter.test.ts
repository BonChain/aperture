// packages/core/src/proof/proofAdapter.test.ts
//
// Confirms the adapter interface shape, that `makeSessionKey` rejects
// wrong-length inputs, and that `SessionKey.toJSON` throws (so secrets
// cannot leak via JSON.stringify / devtools / etc.).
//
// Also asserts that `fakeProofAdapter` returns EXACTLY the bytes from the
// committed fixture — Story 1.1b code review (finding B2) caught a prior
// version that returned 126 bytes of an inline hex placeholder; this test
// would have flagged it at write time if the assertion were strong
// enough. The hard fixture equality check makes the seam contract
// enforceable in CI.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { hexToBytes } from "../crypto/index.js";

import {
  fakeProofAdapter,
  makeSessionKey,
  type SessionKey,
} from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const committedValidProof = hexToBytes(
  readFileSync(
    resolve(here, "../../../spike/test/fixtures/proofValid.hex"),
    "utf8",
  ).trim(),
);

describe("ProofAdapter (interface + fake)", () => {
  it("fakeProofAdapter.generateProof returns the committed fixture byte-for-byte", async () => {
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
    // Hard byte-equality against the committed fixture. Any drift
    // (size, content) fails CI — Story 1.1b code review's BLOCKER #B2
    // mitigation.
    expect(out.proof).toBeInstanceOf(Uint8Array);
    expect(out.proof.length).toBe(128);
    expect(Array.from(out.proof)).toEqual(Array.from(committedValidProof));
    // `ciphertext` field per `proofAdapter.ts` docstring is the
    // pk ‖ ct ‖ dh triple (96 bytes for twisted ElGamal). The fake
    // returns the first 96 bytes of the committed proof for now
    // (placeholder until the real adapter lands in 1.2a).
    expect(out.ciphertext.length).toBe(96);
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
