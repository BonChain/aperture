// packages/aperture::statement — Mode B statement schema authority.
//
// This module defines the canonical BCS layout for a Mode B "Proof-of-Figure"
// statement. Off-chain `packages/core/src/crypto/statementCodec.ts` MUST
// reproduce these bytes exactly; any drift breaks the off-chain verify path
// (`packages/spike/`) and the eventual on-chain `verify_elgamal` call from
// `aperture::verifier`.
//
// Layout (BCS, fixed-size per field):
//   dst              : vector<u8>  (length-prefixed by BCS)
//   pk               : vector<u8>  (32-byte compressed Ristretto point)
//   ciphertext       : vector<u8>  (32-byte compressed Ristretto point)
//   decryption_handle: vector<u8>  (32-byte compressed Ristretto point)
//   amount           : u64         (the disclosed value X, Mode B claim)
//
// "amount" is the public claimed aggregate (MIST). The proof (in
// `ElGamalProof`, separate) shows the ciphertext decrypts to `amount` under
// `pk` — without revealing the secret key.
module aperture::statement {
    use sui::bcs;

    /// Canonical Mode B statement. `drop` so it can be passed to one-shot
    /// verifiers without explicit destruction.
    public struct Statement has copy, drop, store {
        dst: vector<u8>,
        pk: vector<u8>,
        ciphertext: vector<u8>,
        decryption_handle: vector<u8>,
        amount: u64,
    }

    /// BCS-canonical byte encoding of a `Statement`. The TS codec must reproduce
    /// this exact layout — used as the round-trip target in
    /// `packages/core/src/crypto/statementCodec.test.ts` against the golden
    /// fixture emitted by `aperture::aperture_tests::statement_bcs_vector_test`.
    public fun to_bcs(s: &Statement): vector<u8> {
        let mut buf = vector[];
        buf.append(bcs::to_bytes(&s.dst));
        buf.append(bcs::to_bytes(&s.pk));
        buf.append(bcs::to_bytes(&s.ciphertext));
        buf.append(bcs::to_bytes(&s.decryption_handle));
        buf.append(bcs::to_bytes(&s.amount));
        buf
    }

    /// Construct a Statement. Public so off-chain capture scripts and tests can
    /// build one without reaching into private fields.
    public fun new(
        dst: vector<u8>,
        pk: vector<u8>,
        ciphertext: vector<u8>,
        decryption_handle: vector<u8>,
        amount: u64,
    ): Statement {
        Statement { dst, pk, ciphertext, decryption_handle, amount }
    }

    // Public field getters — Move 2024 restricts struct field access to the
    // defining module, so callers (verifier, off-chain BCS capture, tests) must
    // go through these.

    public fun dst(s: &Statement): vector<u8> { s.dst }

    public fun pk(s: &Statement): vector<u8> { s.pk }

    public fun ciphertext(s: &Statement): vector<u8> { s.ciphertext }

    public fun decryption_handle(s: &Statement): vector<u8> { s.decryption_handle }

    public fun amount(s: &Statement): u64 { s.amount }
}
