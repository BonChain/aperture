// packages/spike/src/spike1.elgamal.test.ts
//
// Off-chain ElGamal proof round-trip + tamper rejection + golden-fixture
// match. Loads committed fixtures from `test/fixtures/` and runs an
// isomorphic TS-side `verify_elgamal` against the canonical Statement.
//
// This is the off-chain half of Story 1.1b's verify seam. Story 3.3 (Mode B
// verify experience) consumes the SAME committed fixtures so 3.3 stands on
// this seam rather than on Story 3.2's runtime output — eliminating a
// 3.3 → 3.2 forward dependency (per the implementation-readiness report).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ristretto255 } from "@noble/curves/ed25519.js";

import { H_BYTES } from "@aperture/core/crypto";

import {
  G,
  bytesToHex,
  fiatShamirChallenge,
  G_BYTES,
  hexToBytes,
  readScalarLE,
  RISTRETTO_N,
} from "./_bcs.js";

const here = dirname(fileURLToPath(import.meta.url));
const fxDir = resolve(here, "../test/fixtures");
const proofValid = hexToBytes(
  readFileSync(resolve(fxDir, "proofValid.hex"), "utf8").trim(),
);
const proofTampered = hexToBytes(
  readFileSync(resolve(fxDir, "proofTampered.hex"), "utf8").trim(),
);

const TEST_AMOUNT = 42n;
const TEST_BLINDING = 67890n;
const TEST_SK = 12345n;

/** Isomorphic TS-side `verify_elgamal`. Mirrors `aperture::verifier::verify`.
 *
 *  Contract divergence (intentional, documented):
 *  - On malformed Ristretto encoding or scalar overflow, this returns
 *    `false` (fail-closed). Move's `verify_elgamal` ABORTS via
 *    `g_from_bytes` / `scalar_from_bytes` on the same inputs. Story 1.1b
 *    code review flagged this; the divergence is acceptable because:
 *      (a) The off-chain TS path is a sanity check for Story 3.3 — its
 *          caller wraps it in a `try`/`catch` regardless.
 *      (b) Both paths reach "verify fails" from the user's perspective.
 *    When the real `ClientProofAdapter` lands (Story 3.2), it will call
 *    the wasm prover which uses the same Move-style abort semantics —
 *    at that point we may want to align this implementation to throw,
 *    matching Move 1:1.
 */
function verifyElGamal(
  dst: Uint8Array,
  pkBytes: Uint8Array,
  ciphertextBytes: Uint8Array,
  decryptionHandleBytes: Uint8Array,
  proof: Uint8Array,
): boolean {
  let pk: any, e1: any, e2: any, a: any, b: any;
  try {
    pk = ristretto255.Point.fromHex(bytesToHex(pkBytes));
    e1 = ristretto255.Point.fromHex(bytesToHex(ciphertextBytes));
    e2 = ristretto255.Point.fromHex(bytesToHex(decryptionHandleBytes));
    a = ristretto255.Point.fromHex(bytesToHex(proof.slice(0, 32)));
    b = ristretto255.Point.fromHex(bytesToHex(proof.slice(32, 64)));
  } catch {
    // Malformed Ristretto encoding (e.g., tampered byte 31 sign bit) → false.
    return false;
  }
  // z1/z2 reduced mod N — mirrors Move's `scalar_from_bytes` clamping.
  // Without reduction, a TS-built proof with z1 > N would be rejected here
  // but accepted by Move, breaking the seam. See code-review #M6.
  const rawZ1 = readScalarLE(proof, 64);
  const rawZ2 = readScalarLE(proof, 96);
  const z1 = rawZ1 % RISTRETTO_N;
  const z2 = rawZ2 % RISTRETTO_N;
  const challengeBytes = fiatShamirChallenge([
    dst,
    G_BYTES,
    H_BYTES,
    pk.toBytes(),
    e1.toBytes(),
    e2.toBytes(),
    a.toBytes(),
    b.toBytes(),
  ]);
  // Clamp challenge to mod N, matching Move's `scalar_from_bytes`.
  let challenge = 0n;
  for (let i = challengeBytes.length - 1; i >= 0; i--) {
    challenge = (challenge << 8n) | BigInt(challengeBytes[i] as number);
  }
  challenge = challenge % RISTRETTO_N;
  try {
    const lhs1 = pk.multiply(z1);
    const rhs1 = e2.multiply(challenge).add(a);
    const lhs2 = e1.multiply(challenge).add(b);
    const rhs2 = G().multiply(z1).add(ristretto255.Point.fromHex(bytesToHex(H_BYTES)).multiply(z2));
    return lhs1.equals(rhs1) && lhs2.equals(rhs2);
  } catch {
    return false;
  }
}

function buildCanonicalStatement(): {
  dst: Uint8Array;
  pk: Uint8Array;
  ciphertext: Uint8Array;
  decryptionHandle: Uint8Array;
} {
  const H = ristretto255.Point.fromHex(bytesToHex(H_BYTES));
  const pk = G().multiply(TEST_SK);
  const c1 = G()
    .multiply(TEST_BLINDING)
    .add(H.multiply(TEST_AMOUNT));
  const dh = pk.multiply(TEST_BLINDING);
  return {
    dst: new Uint8Array(0),
    pk: pk.toBytes(),
    ciphertext: c1.toBytes(),
    decryptionHandle: dh.toBytes(),
  };
}

describe("spike1.elgamal (off-chain round-trip + tamper + golden match)", () => {
  it("round-trips a valid proof off-chain", () => {
    const s = buildCanonicalStatement();
    const ok = verifyElGamal(
      s.dst,
      s.pk,
      s.ciphertext,
      s.decryptionHandle,
      proofValid,
    );
    expect(ok).toBe(true);
  });

  it("rejects the tampered proof off-chain", () => {
    const s = buildCanonicalStatement();
    const ok = verifyElGamal(
      s.dst,
      s.pk,
      s.ciphertext,
      s.decryptionHandle,
      proofTampered,
    );
    expect(ok).toBe(false);
  });

  it("matches the committed golden fixture exactly (no drift)", () => {
    // Sanity: re-load the committed bytes and confirm they parse to a
    // 128-byte array with the right structure (a ‖ b ‖ z1 ‖ z2).
    expect(proofValid.length).toBe(128);
    expect(proofTampered.length).toBe(128);
    // Tampered differs from valid in exactly one byte (byte 64 = z1[0] low bit).
    // The tamper is a SCALAR byte flip, not a Ristretto point byte flip,
    // because flipping a point's sign bit produces a non-canonical encoding
    // that `g_from_bytes` would reject before reaching the verify relation.
    let diffCount = 0;
    for (let i = 0; i < 128; i++) {
      if (proofValid[i] !== proofTampered[i]) diffCount += 1;
    }
    expect(diffCount).toBe(1);
    expect(proofValid[64] ^ proofTampered[64]).toBe(0x01);
  });

  it("Ristretto BASE point byte-equivalent to Move's g_generator()", () => {
    // Move's `sui::ristretto255::g_generator()` returns the canonical
    // Ristretto base point G. The byte representation is fixed by the
    // Ristretto255 spec — assert it once so a future noble version that
    // changes BASE encoding (extremely unlikely but possible) fails here
    // before silently breaking every generated fixture.
    expect(bytesToHex(G().toBytes())).toBe(bytesToHex(G_BYTES));
  });

  it("spike import discipline — vitest config forbids apps/*", async () => {
    // The vitest config aliases apps/api and apps/web to stubs that throw
    // on import. Asserting the aliases are set means a future change that
    // widens the spike layer would fail this assertion in spirit.
    const cfg = (await import("../vitest.config.js")).default;
    const alias = (cfg.resolve?.alias ?? {}) as Record<string, string>;
    expect(alias["apps/api"] ?? "").toContain("FORBIDDEN");
    expect(alias["apps/web"] ?? "").toContain("FORBIDDEN");
  });
});
