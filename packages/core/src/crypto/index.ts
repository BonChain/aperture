// packages/core/src/crypto/index.ts
//
// Isomorphic crypto helpers — NO `node:*` imports, NO DOM imports.
// Web Crypto + @noble/curves (when added) are the only allowed sources of
// randomness / primitives. This is the hard rule for the spike layer.
//
// Story 1.1a intentionally keeps this minimal — just enough that the package
// compiles and the tsconfig strictness + lint boundary are enforced. Real
// ElGamal/bulletproofs wrappers land after SPIKE-1.

/**
 * A 32-byte secret key, hex-encoded for transport. Pure type — no node:* deps.
 * Used as a placeholder until SPIKE-1 lands and we know which ElGamal curve
 * we are committing to.
 */
export type SecretKeyHex = string & { readonly __brand: "SecretKeyHex" };

/** Length of a hex-encoded 32-byte secret. */
export const SECRET_KEY_HEX_LENGTH = 64;

/**
 * Build a `SecretKeyHex` from a 32-byte buffer. Throws on wrong length.
 * This is the only allowed construction site — keeps the brand airtight.
 */
export function secretKeyFromBytes(bytes: Uint8Array): SecretKeyHex {
  if (bytes.length !== 32) {
    throw new Error(
      `SecretKey must be 32 bytes (got ${bytes.length}). ` +
        `Refusing to construct — pin a real key once SPIKE-1 picks a curve.`,
    );
  }
  return bytesToHex(bytes) as SecretKeyHex;
}

/** Convert a Uint8Array to a lowercase hex string (no node:*). */
export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

/** Convert a hex string to a Uint8Array (no node:*). Throws on bad input. */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`hex string length must be even (got ${hex.length})`);
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error("hex string contains non-hex characters");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Constant-time equality on equal-length Uint8Arrays. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
