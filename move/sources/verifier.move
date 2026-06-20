// packages/aperture::verifier — Mode B off-chain + on-chain verify seam.
//
// Why this re-implements `contra::nizk::verify_elgamal`
// ------------------------------------------------------
// `contra::nizk::verify_elgamal` is `public(package)` in the pinned Contra
// package — only callable from within `contra` itself. Aperture is a separate
// Move package that consumes Contra as a `local` dependency, so it cannot
// invoke that function directly without forking Contra (which would break the
// pin policy in `vendor/contra/PINNED_VERSION`).
//
// To preserve the pin AND give Aperture an on-chain verify entry, we mirror
// the `verify_elgamal` algorithm here using `sui::ristretto255::*` primitives
// directly. The algorithm, the transcript layout (Blake2b256 over BCS-encoded
// `vector<vector<u8>>` with the top byte zeroed), and the hardcoded `g` and
// `h` generators MUST stay byte-identical to `contra::nizk::verify_elgamal` —
// any drift will cause the off-chain `statementCodec` cross-check
// (Story 1.1b AC2) and the on-chain TS-built proof to verify path
// (Story 3.3) to silently break.
//
// Source of truth (must keep in sync):
//   vendor/contra/move/sources/nizk.move:117-133       (verify_elgamal)
//   vendor/contra/move/sources/nizk.move:233-253       (challenge_elgamal)
//   vendor/contra/move/sources/nizk.move:284-290       (fiat_shamir_challenge)
//   vendor/contra/move/sources/twisted_elgamal.move:43 (g())
//   vendor/contra/move/sources/twisted_elgamal.move:49 (h())
//
// `h` is the hash-to-curve blinding generator derived from
// "fastcrypto-blinding-gen-01"; it is hardcoded here to the same 32-byte
// constant Contra uses, so any re-pinning of Contra that changes this value
// will require updating this module AND `packages/core/src/crypto/`.
module aperture::verifier {
    use aperture::statement::Statement;
    use std::bcs;
    use sui::{
        group_ops::Element,
        hash,
        ristretto255::{Self, Scalar, g_add, g_generator, g_mul, scalar_from_bytes}
    };

    /// `h` is the canonical blinding generator used by `contra::twisted_elgamal`.
    /// Hardcoded because `twisted_elgamal::h()` is `public(package)` (same
    /// constraint as `verify_elgamal`). MUST stay equal to the bytes in
    /// `contra::twisted_elgamal::h()` — see source-of-truth comment above.
    const H_BYTES: vector<u8> = x"34ce1477c14558178089500a39c864e0f607b3c1f41ab398400e4a9de6d2c446";

    /// `g` is the standard Ristretto generator. Fetched from the framework rather
    /// than hardcoded so any future framework change is picked up automatically;
    /// the value is fixed by the Ristretto255 spec and must not change.
    fun g(): Element<ristretto255::G> { g_generator() }

    /// `h` is the hash-to-curve blinding generator (see module doc).
    #[allow(implicit_const_copy)] // H_BYTES is small + immutable; const-copy is intentional
    fun h(): Element<ristretto255::G> { ristretto255::g_from_bytes(&H_BYTES) }

    /// Verify a Mode B statement against an `ElGamalProof`.
    ///
    /// Mirrors `contra::nizk::verify_elgamal` exactly:
    ///   1. Rebuild the Fiat-Shamir challenge from `(dst, g, h, pk, e1, e2, a, b)`.
    ///   2. Assert `z1 * pk == c * e2 + a`.
    ///   3. Assert `c * e1 + b == z1 * g + z2 * h`.
    ///
    /// The `amount` field on `Statement` is NOT verified here — it is a public
    /// claim that the *ciphertext* decrypts to `amount`. `verify_elgamal` only
    /// confirms well-formedness; the equality of decrypted plaintext to `amount`
    /// requires the matching decryption machinery, which is downstream (3.2/3.3).
    public fun verify(statement: &Statement, proof: &ElGamalProof): bool {
        let pk = ristretto255::g_from_bytes(&aperture::statement::pk(statement));
        let e1 = ristretto255::g_from_bytes(&aperture::statement::ciphertext(statement));
        let e2 = ristretto255::g_from_bytes(&aperture::statement::decryption_handle(statement));
        let g = g();
        let h = h();
        let challenge = challenge_elgamal(
            aperture::statement::dst(statement),
            &g,
            &h,
            &pk,
            &e1,
            &e2,
            &proof.a,
            &proof.b,
        );
        let lhs1 = g_mul(&proof.z1, &pk);
        let rhs1 = g_add(&g_mul(&challenge, &e2), &proof.a);
        let lhs2 = g_add(&g_mul(&challenge, &e1), &proof.b);
        let rhs2 = g_add(&g_mul(&proof.z1, &g), &g_mul(&proof.z2, &h));
        lhs1 == rhs1 && lhs2 == rhs2
    }

    /// `ElGamalProof` layout — mirrors `contra::nizk::ElGamalProof`. Re-declared
    /// here because we cannot use `contra::nizk::ElGamalProof` directly from a
    /// different package (the struct IS public, but the verify function we'd
    /// normally call is `public(package)`, so we keep the type definition local
    /// for consistency with our local `verify`).
    public struct ElGamalProof has copy, drop {
        a: Element<ristretto255::G>,
        b: Element<ristretto255::G>,
        z1: Element<Scalar>,
        z2: Element<Scalar>,
    }

    /// Build an `ElGamalProof` from raw byte inputs (32-byte Ristretto points for
    /// `a, b`, 32-byte little-endian scalars for `z1, z2`). Used by the off-chain
    /// golden fixture capture path; the TS proof generator emits these bytes.
    public fun new_elgamal_proof(
        a: vector<u8>,
        b: vector<u8>,
        z1: vector<u8>,
        z2: vector<u8>,
    ): ElGamalProof {
        ElGamalProof {
            a: ristretto255::g_from_bytes(&a),
            b: ristretto255::g_from_bytes(&b),
            z1: scalar_from_bytes(&z1),
            z2: scalar_from_bytes(&z2),
        }
    }

    // Field accessors — Move 2024 restricts field access to the defining module.
    // Off-chain capture / tests use these.

    public fun proof_a(p: &ElGamalProof): vector<u8> { *p.a.bytes() }

    public fun proof_b(p: &ElGamalProof): vector<u8> { *p.b.bytes() }

    public fun proof_z1(p: &ElGamalProof): vector<u8> { *p.z1.bytes() }

    public fun proof_z2(p: &ElGamalProof): vector<u8> { *p.z2.bytes() }

    /// Fiat-Shamir challenge for the ElGamal proof — mirrors
    /// `contra::nizk::challenge_elgamal`.
    #[allow(implicit_const_copy)]
    fun challenge_elgamal(
        dst: vector<u8>,
        g: &Element<ristretto255::G>,
        h: &Element<ristretto255::G>,
        pk: &Element<ristretto255::G>,
        e1: &Element<ristretto255::G>,
        e2: &Element<ristretto255::G>,
        a: &Element<ristretto255::G>,
        b: &Element<ristretto255::G>,
    ): Element<Scalar> {
        let mut hash = sui::hash::blake2b256(
            &bcs::to_bytes(
                &vector[
                    dst,
                    *g.bytes(),
                    *h.bytes(),
                    *pk.bytes(),
                    *e1.bytes(),
                    *e2.bytes(),
                    *a.bytes(),
                    *b.bytes(),
                ],
            ),
        );
        *vector::borrow_mut(&mut hash, 31) = 0;
        scalar_from_bytes(&hash)
    }

    #[test_only]
    /// Test-only accessor for `g`. Exposed so `aperture_tests` can build real
    /// group elements using the same generator `verify` uses internally.
    public fun verifier_test_only_g(): Element<ristretto255::G> { g() }

    #[test_only]
    /// Test-only accessor for `h`.
    public fun verifier_test_only_h(): Element<ristretto255::G> { h() }

    #[test_only]
    /// Test helper: prove an ElGamal encryption for `amount` with `blinding`
    /// under `pk`. Mirrors `contra::nizk::prove_elgamal` (test-only in Contra).
    public fun prove_for_testing(
        dst: vector<u8>,
        pk: &Element<ristretto255::G>,
        ciphertext: &Element<ristretto255::G>,
        decryption_handle: &Element<ristretto255::G>,
        amount: u64,
        blinding: u64,
    ): ElGamalProof {
        let g = g();
        let h = h();
        let r1 = scalar_from_u64_test(1234);
        let r2 = scalar_from_u64_test(5678);
        let a = g_mul(&r1, pk);
        let b = g_add(&g_mul(&r1, &g), &g_mul(&r2, &h));
        let challenge = challenge_elgamal(
            dst,
            &g,
            &h,
            pk,
            ciphertext,
            decryption_handle,
            &a,
            &b,
        );
        let z1 = scalar_add_test(
            &r1,
            &scalar_mul_test(&challenge, &scalar_from_u64_test(blinding)),
        );
        let z2 = scalar_add_test(&r2, &scalar_mul_test(&challenge, &scalar_from_u64_test(amount)));
        ElGamalProof { a, b, z1, z2 }
    }

    #[test_only]
    fun scalar_add_test(a: &Element<Scalar>, b: &Element<Scalar>): Element<Scalar> {
        sui::ristretto255::scalar_add(a, b)
    }

    #[test_only]
    fun scalar_mul_test(a: &Element<Scalar>, b: &Element<Scalar>): Element<Scalar> {
        sui::ristretto255::scalar_mul(a, b)
    }

    #[test_only]
    fun scalar_from_u64_test(v: u64): Element<Scalar> {
        sui::ristretto255::scalar_from_u64(v)
    }

    #[test_only]
    /// Test helper: build a Statement from raw bytes + amount.
    public fun statement_for_testing(
        dst: vector<u8>,
        pk: vector<u8>,
        ciphertext: vector<u8>,
        decryption_handle: vector<u8>,
        amount: u64,
    ): Statement {
        aperture::statement::new(dst, pk, ciphertext, decryption_handle, amount)
    }
}
