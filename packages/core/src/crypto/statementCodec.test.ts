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

  it("matches the Move-emitted golden vector byte-for-byte", () => {
    // The golden vector was emitted by
    // `aperture::aperture_tests::statement_bcs_vector_test` which uses real
    // group ops (TEST_SK * g, etc.) — so this test asserts our codec agrees
    // with Move on a real wire shape.
    const decoded = deserializeStatement(goldenBytes);
    // Re-serializing must reproduce the same bytes (BCS is canonical).
    const reencoded = serializeStatement(decoded);
    expect(Array.from(reencoded)).toEqual(Array.from(goldenBytes));
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
