// packages/core/src/crypto/hBytes.ts
//
// Single source of truth for the `h` blinding-generator Ristretto point
// used in twisted ElGamal. Must stay equal to `contra::twisted_elgamal::h()`
// and `aperture::verifier::H_BYTES`. If Contra is re-pinned to a commit
// that changes this value, update THIS file (and the Move `H_BYTES`
// constant) — the off-chain ↔ on-chain verify seam breaks otherwise.
//
// Source of truth: vendor/contra/move/sources/twisted_elgamal.move:49-52
// (`h = g_from_bytes(&x"34ce…2c446")`).

export const H_BYTES: Uint8Array = new Uint8Array([
  0x34, 0xce, 0x14, 0x77, 0xc1, 0x45, 0x58, 0x17, 0x80, 0x89, 0x50, 0x0a,
  0x39, 0xc8, 0x64, 0xe0, 0xf6, 0x07, 0xb3, 0xc1, 0xf4, 0x1a, 0xb3, 0x98,
  0x40, 0x0e, 0x4a, 0x9d, 0xe6, 0xd2, 0xc4, 0x46,
]);
