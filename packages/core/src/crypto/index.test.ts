// packages/core/src/crypto/index.test.ts
// Co-located Vitest tests for the crypto helpers. Story 1.1a keeps these
// minimal — full ElGamal KAT vectors are deferred until SPIKE-1 decrypts a
// correct value once (don't freeze vectors on a scheme that may be rebuilt).

import { describe, it, expect } from "vitest";
import {
  SECRET_KEY_HEX_LENGTH,
  bytesToHex,
  hexToBytes,
  secretKeyFromBytes,
  timingSafeEqual,
} from "./index.js";

describe("crypto helpers (isomorphic, no node:*)", () => {
  it("bytesToHex is the lowercase inverse of hexToBytes", () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 127, 128, 254, 255]);
    const hex = bytesToHex(bytes);
    expect(hex).toBe("00010f107f80feff");
    expect(hexToBytes(hex)).toEqual(bytes);
  });

  it("hexToBytes rejects odd-length input", () => {
    expect(() => hexToBytes("abc")).toThrow(/even/);
  });

  it("hexToBytes rejects non-hex characters", () => {
    expect(() => hexToBytes("zz")).toThrow(/non-hex/);
  });

  it("secretKeyFromBytes accepts exactly 32 bytes", () => {
    const k = secretKeyFromBytes(new Uint8Array(32));
    expect(k.length).toBe(SECRET_KEY_HEX_LENGTH);
  });

  it("secretKeyFromBytes rejects wrong length", () => {
    expect(() => secretKeyFromBytes(new Uint8Array(31))).toThrow(/32 bytes/);
    expect(() => secretKeyFromBytes(new Uint8Array(33))).toThrow(/32 bytes/);
  });

  it("timingSafeEqual returns true for identical buffers", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(timingSafeEqual(a, b)).toBe(true);
  });

  it("timingSafeEqual returns false for different buffers of equal length", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 5]);
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  it("timingSafeEqual returns false for different lengths", () => {
    expect(
      timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3, 4])),
    ).toBe(false);
  });
});
