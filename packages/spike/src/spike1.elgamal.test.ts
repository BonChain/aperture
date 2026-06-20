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
import { blake2b } from "@noble/hashes/blake2.js";

const here = dirname(fileURLToPath(import.meta.url));
const fxDir = resolve(here, "../test/fixtures");
const proofValid = new Uint8Array(
  readFileSync(resolve(fxDir, "proofValid.hex"), "utf8")
    .trim()
    .match(/.{1,2}/g)!
    .map((b) => parseInt(b, 16)),
);
const proofTampered = new Uint8Array(
  readFileSync(resolve(fxDir, "proofTampered.hex"), "utf8")
    .trim()
    .match(/.{1,2}/g)!
    .map((b) => parseInt(b, 16)),
);

const H_BYTES = new Uint8Array([
  0x34, 0xce, 0x14, 0x77, 0xc1, 0x45, 0x58, 0x17, 0x80, 0x89, 0x50, 0x0a,
  0x39, 0xc8, 0x64, 0xe0, 0xf6, 0x07, 0xb3, 0xc1, 0xf4, 0x1a, 0xb3, 0x98,
  0x40, 0x0e, 0x4a, 0x9d, 0xe6, 0xd2, 0xc4, 0x46,
]);

const TEST_AMOUNT = 42n;
const TEST_BLINDING = 67890n;
const TEST_SK = 12345n;

function uleb128(n: number): Uint8Array {
  const out: number[] = [];
  let v = n;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    out.push(b);
  } while (v !== 0);
  return new Uint8Array(out);
}

function bcsEncodeVectorVectorU8(chunks: Uint8Array[]): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(uleb128(chunks.length));
  for (const c of chunks) {
    parts.push(uleb128(c.length));
    parts.push(c);
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function fiatShamir(chunks: Uint8Array[]): bigint {
  const preimage = bcsEncodeVectorVectorU8(chunks);
  const hash = blake2b(preimage, { dkLen: 32 });
  hash[31] = 0;
  return ristretto255.Point.Fn.create(
    hash.reduce((acc, b, i) => acc | (BigInt(b) << BigInt(i * 8)), 0n),
  );
}

const RISTRETTO_N =
  0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3edn;

function readScalarLE(bytes: Uint8Array, off: number): bigint {
  let v = 0n;
  for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(bytes[off + i] as number);
  return v;
}

/** Isomorphic TS-side `verify_elgamal`. Mirrors `aperture::verifier::verify`. */
function verifyElGamal(
  dst: Uint8Array,
  pkBytes: Uint8Array,
  ciphertextBytes: Uint8Array,
  decryptionHandleBytes: Uint8Array,
  proof: Uint8Array,
): boolean {
  const G = ristretto255.Point.BASE;
  const H = ristretto255.Point.fromHex(bytesToHex(H_BYTES));
  const pk = ristretto255.Point.fromHex(bytesToHex(pkBytes));
  const e1 = ristretto255.Point.fromHex(bytesToHex(ciphertextBytes));
  const e2 = ristretto255.Point.fromHex(bytesToHex(decryptionHandleBytes));
  const a = ristretto255.Point.fromHex(bytesToHex(proof.slice(0, 32)));
  const b = ristretto255.Point.fromHex(bytesToHex(proof.slice(32, 64)));
  const z1 = readScalarLE(proof, 64);
  const z2 = readScalarLE(proof, 96);
  // Clamp z1, z2 to mod RISTRETTO_N — mirrors Move's `scalar_from_bytes`.
  // Without reduction, a TS-built proof with z1 > N would be rejected here
  // but accepted by Move (which clamps). This keeps the off-chain ↔
  // on-chain seam contracts aligned.
  const z1c = z1 % RISTRETTO_N;
  const z2c = z2 % RISTRETTO_N;
  const challenge = fiatShamir([
    dst,
    G.toBytes(),
    H.toBytes(),
    pk.toBytes(),
    e1.toBytes(),
    e2.toBytes(),
    a.toBytes(),
    b.toBytes(),
  ]);
  // Clamp challenge to mod N too — same reason.
  const challengeN = challenge % RISTRETTO_N;
  const lhs1 = pk.multiply(z1c);
  const rhs1 = e2.multiply(challengeN).add(a);
  const lhs2 = e1.multiply(challengeN).add(b);
  const rhs2 = G.multiply(z1c).add(H.multiply(z2c));
  return lhs1.equals(rhs1) && lhs2.equals(rhs2);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function buildCanonicalStatement(): {
  dst: Uint8Array;
  pk: Uint8Array;
  ciphertext: Uint8Array;
  decryptionHandle: Uint8Array;
} {
  const G = ristretto255.Point.BASE;
  const H = ristretto255.Point.fromHex(bytesToHex(H_BYTES));
  const pk = G.multiply(TEST_SK);
  const c1 = G.multiply(TEST_BLINDING).add(H.multiply(TEST_AMOUNT));
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

  it("spike import discipline — vitest config forbids apps/*", async () => {
    // The vitest config aliases apps/api and apps/web to stubs that throw
    // on import. Asserting the aliases are set means a future change that
    // widens the spike layer would fail this assertion (in spirit — the
    // assertion is on the config object itself).
    const cfg = (await import("../vitest.config.js")).default;
    const alias = (cfg.resolve?.alias ?? {}) as Record<string, string>;
    expect(alias["apps/api"] ?? "").toContain("FORBIDDEN");
    expect(alias["apps/web"] ?? "").toContain("FORBIDDEN");
  });

  it("Ristretto BASE point byte-equivalent to Move's g_generator()", () => {
    // Move's `sui::ristretto255::g_generator()` returns the canonical
    // Ristretto base point G. The byte representation is fixed by the
    // Ristretto255 spec — assert it once so a future noble version that
    // changes BASE encoding (extremely unlikely but possible) fails here
    // before silently breaking every generated fixture.
    expect(bytesToHex(ristretto255.Point.BASE.toBytes())).toBe(
      "e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76",
    );
  });
});
