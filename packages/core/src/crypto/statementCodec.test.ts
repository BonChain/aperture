// packages/core/src/crypto/statementCodec.test.ts
//
// Cross-checks the TS BCS codec against the Move-emitted golden vector at
// `packages/core/test/goldenVectors/statement.bcs.hex`. Captured by
// `scripts/capture-move-golden.sh`. Any drift fails the build in CI.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  deserializeStatement,
  encodeAmount,
  encodeUleb128,
  serializeStatement,
  type Statement,
} from "./statementCodec.js";

// encodeUleb128 is exported by statementCodec.ts for testability but not
// part of the package's public surface — re-import for the test only.
// (No-op here since the import above already pulls it in; this comment
// documents intent so a future cleanup does not "tidy" the export away.)

const here = dirname(fileURLToPath(import.meta.url));
const goldenPath = resolve(here, "../../test/goldenVectors/statement.bcs.hex");
const goldenHex = readFileSync(goldenPath, "utf8").trim();
const goldenBytes = new Uint8Array(
  goldenHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
);

describe("statementCodec (BCS canonical, matches move/sources/statement.move)", () => {
  it("decode(encode(s)) round-trips byte-exactly for a minimal Statement", () => {
    const s: Statement = {
      dst: new Uint8Array([]),
      pk: new Uint8Array(32).fill(0xaa),
      ciphertext: new Uint8Array(32).fill(0xbb),
      decryptionHandle: new Uint8Array(32).fill(0xcc),
      amount: 42n,
    };
    const bytes = serializeStatement(s);
    const back = deserializeStatement(bytes);
    expect(Array.from(back.dst)).toEqual(Array.from(s.dst));
    expect(Array.from(back.pk)).toEqual(Array.from(s.pk));
    expect(Array.from(back.ciphertext)).toEqual(Array.from(s.ciphertext));
    expect(Array.from(back.decryptionHandle)).toEqual(Array.from(s.decryptionHandle));
    expect(back.amount).toBe(s.amount);
  });

  it("matches the Move-emitted golden vector byte-for-byte (round-trip)", () => {
    // Round-trip: decode the golden bytes, re-encode, compare. Proves the
    // codec is self-consistent with the golden fixture.
    const decoded = deserializeStatement(goldenBytes);
    const reencoded = serializeStatement(decoded);
    expect(Array.from(reencoded)).toEqual(Array.from(goldenBytes));
  });

  it("matches the Move-emitted golden vector byte-for-byte (forward assertion)", () => {
    // Forward assertion: construct a Statement from the KNOWN field bytes
    // (derived from `aperture::aperture_tests::build_test_statement` with
    // TEST_SK=12345, TEST_BLINDING=67890, TEST_AMOUNT=42) and assert that
    // `serializeStatement` produces the exact golden hex — WITHOUT going
    // through `deserializeStatement`. This catches symmetric encode/decode
    // bugs that the round-trip test cannot detect.
    //
    // Field bytes extracted from the 108-byte golden vector by manual BCS
    // parse: dst(0) + pk(32) + ciphertext(32) + decryptionHandle(32) + amount(8).
    const knownStatement: Statement = {
      dst: new Uint8Array([]),
      pk: new Uint8Array([
        0xb4, 0xc1, 0xb3, 0xcd, 0xef, 0x7b, 0xa1, 0xbd,
        0x94, 0xfa, 0x95, 0xc7, 0xb7, 0x36, 0x62, 0x20,
        0x46, 0xef, 0x66, 0x32, 0x85, 0x81, 0x3c, 0x22,
        0x93, 0xc5, 0x2c, 0x5f, 0x4f, 0x9f, 0xb0, 0x11,
      ]),
      ciphertext: new Uint8Array([
        0xe4, 0xd4, 0xf1, 0xaf, 0x00, 0xdb, 0xe1, 0xad,
        0x5b, 0xfe, 0xfc, 0xbb, 0x21, 0xf7, 0x44, 0x9f,
        0x8b, 0x8e, 0x81, 0x35, 0x16, 0x7c, 0x64, 0xb7,
        0x21, 0xbc, 0x65, 0xb4, 0xc2, 0x5f, 0xf9, 0x2f,
      ]),
      decryptionHandle: new Uint8Array([
        0x3a, 0x06, 0x48, 0x70, 0x6c, 0xbb, 0x91, 0xee,
        0x39, 0x6c, 0x41, 0xea, 0x2c, 0x9a, 0x57, 0xb4,
        0x0e, 0xc5, 0xfa, 0xb4, 0x67, 0xec, 0xdb, 0xee,
        0x05, 0x69, 0x30, 0x78, 0xe4, 0x59, 0xfb, 0x5d,
      ]),
      amount: 42n,
    };
    const serialized = serializeStatement(knownStatement);
    expect(Array.from(serialized)).toEqual(Array.from(goldenBytes));
  });

  it("ULEB128 length prefix: empty vector = 0x00, 32-byte vector = 0x20", () => {
    expect(Array.from(encodeUleb128(0))).toEqual([0x00]);
    expect(Array.from(encodeUleb128(32))).toEqual([0x20]);
    expect(Array.from(encodeUleb128(127))).toEqual([0x7f]); // single-byte max
    expect(Array.from(encodeUleb128(128))).toEqual([0x80, 0x01]); // multi-byte
  });

  it("amount encodes as 8 little-endian bytes", () => {
    expect(Array.from(encodeAmount(0n))).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(Array.from(encodeAmount(42n))).toEqual([42, 0, 0, 0, 0, 0, 0, 0]);
    expect(Array.from(encodeAmount(0xffffffffffffffffn))).toEqual([
      255, 255, 255, 255, 255, 255, 255, 255,
    ]);
    // Round-trip a few values
    for (const n of [0n, 1n, 42n, 1000000n, 0xffffffffn, 0xffffffffffffffffn]) {
      const buf = encodeAmount(n);
      // back-decode
      let v = 0n;
      for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(buf[i] as number);
      expect(v).toBe(n);
    }
  });

  it("rejects out-of-range u64", () => {
    expect(() => encodeAmount(-1n)).toThrow();
    expect(() => encodeAmount(0x10000000000000000n)).toThrow();
  });
});
