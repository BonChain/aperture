// packages/core/src/crypto/statementCodec.ts
//
// BCS-canonical codec for `aperture::statement::Statement`. Layout is fixed
// by the Move side (must stay in sync — see `move/sources/statement.move`):
//
//   dst              : vector<u8>  (ULEB128 length + bytes)
//   pk               : vector<u8>  (ULEB128 length + bytes; 32-byte Ristretto)
//   ciphertext       : vector<u8>  (ULEB128 length + bytes; 32-byte Ristretto)
//   decryption_handle: vector<u8>  (ULEB128 length + bytes; 32-byte Ristretto)
//   amount           : u64         (8 bytes little-endian)
//
// `serializeStatement` produces bytes that `aperture::statement::to_bcs`
// MUST reproduce exactly; the Vitest in `statementCodec.test.ts` asserts
// byte-equality against `packages/core/test/goldenVectors/statement.bcs.hex`
// (captured from Move by `scripts/capture-move-golden.sh`).
//
// No `node:*`, no DOM — isomorphic like the rest of `core/crypto` (D1).

export interface Statement {
  readonly dst: Uint8Array;
  readonly pk: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly decryptionHandle: Uint8Array;
  readonly amount: bigint;
}

/** Encode a ULEB128 length prefix for a byte vector. Exported for tests. */
export function encodeUleb128(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`ULEB128 length must be a non-negative integer (got ${n})`);
  }
  const out: number[] = [];
  let value = n;
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) byte |= 0x80;
    out.push(byte);
  } while (value !== 0);
  return new Uint8Array(out);
}

/** Decode a ULEB128 length prefix; returns `[length, bytesConsumed]`.
 *  Caps at `MAX_VECTOR_LENGTH` (2^32-1, BCS-sane) to prevent DoS via
 *  attacker-controlled `vector<u8>` length prefixes. */
const MAX_VECTOR_LENGTH = 0xffffffff; // 2^32 - 1; BCS-sane cap.
function decodeUleb128(
  bytes: Uint8Array,
  offset: number,
): readonly [number, number] {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (true) {
    if (i >= bytes.length) {
      throw new Error("ULEB128 decode: truncated input");
    }
    const byte = bytes[i] as number;
    value = (value | ((byte & 0x7f) << shift)) >>> 0; // >>> 0 keeps value unsigned 32-bit
    i += 1;
    if ((byte & 0x80) === 0) break;
    shift += 7;
    // 5 bytes × 7 bits = 35 bits, exactly covers 2^32. The 6th byte
    // would push us past MAX_VECTOR_LENGTH — reject so callers don't
    // silently allocate ~4 TB.
    if (shift >= 35) {
      throw new Error(
        `ULEB128 decode: length exceeds ${MAX_VECTOR_LENGTH} (DoS guard)`,
      );
    }
  }
  return [value, i - offset];
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Serialize a Statement to BCS bytes. Mirrors `aperture::statement::to_bcs`. */
export function serializeStatement(s: Statement): Uint8Array {
  return concatBytes([
    encodeUleb128(s.dst.length),
    s.dst,
    encodeUleb128(s.pk.length),
    s.pk,
    encodeUleb128(s.ciphertext.length),
    s.ciphertext,
    encodeUleb128(s.decryptionHandle.length),
    s.decryptionHandle,
    encodeAmount(s.amount),
  ]);
}

/** Deserialize BCS bytes to a Statement. Throws on truncated/malformed input. */
export function deserializeStatement(bytes: Uint8Array): Statement {
  let off = 0;
  const [dstLen, dstLenBytes] = decodeUleb128(bytes, off);
  off += dstLenBytes;
  const dst = bytes.slice(off, off + dstLen);
  off += dstLen;

  const [pkLen, pkLenBytes] = decodeUleb128(bytes, off);
  off += pkLenBytes;
  if (pkLen !== 32) throw new Error(`deserializeStatement: pk must be 32 bytes (got ${pkLen})`);
  const pk = bytes.slice(off, off + pkLen);
  off += pkLen;

  const [ctLen, ctLenBytes] = decodeUleb128(bytes, off);
  off += ctLenBytes;
  if (ctLen !== 32) throw new Error(`deserializeStatement: ciphertext must be 32 bytes (got ${ctLen})`);
  const ciphertext = bytes.slice(off, off + ctLen);
  off += ctLen;

  const [dhLen, dhLenBytes] = decodeUleb128(bytes, off);
  off += dhLenBytes;
  if (dhLen !== 32) throw new Error(`deserializeStatement: decryptionHandle must be 32 bytes (got ${dhLen})`);
  const decryptionHandle = bytes.slice(off, off + dhLen);
  off += dhLen;

  if (off + 8 !== bytes.length) {
    throw new Error(
      `deserializeStatement: expected exactly 8 trailing bytes for amount, got ${bytes.length - off}`,
    );
  }
  const amount = decodeAmount(bytes.slice(off));

  return { dst, pk, ciphertext, decryptionHandle, amount };
}

/** Encode a u64 as 8 little-endian bytes. */
export function encodeAmount(n: bigint): Uint8Array {
  if (n < 0n || n > 0xffffffffffffffffn) {
    throw new Error(`amount out of u64 range: ${n}`);
  }
  const out = new Uint8Array(8);
  let v = n;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** Decode 8 little-endian bytes as a u64. */
export function decodeAmount(bytes: Uint8Array): bigint {
  if (bytes.length !== 8) {
    throw new Error(`decodeAmount: expected 8 bytes, got ${bytes.length}`);
  }
  let v = 0n;
  for (let i = 7; i >= 0; i--) {
    v = (v << 8n) | BigInt(bytes[i] as number);
  }
  return v;
}
