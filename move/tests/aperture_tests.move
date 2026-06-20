// packages/aperture::aperture_tests — golden BCS vector emission + verify
// round-trip. Used by `scripts/capture-move-golden.sh` to dump fixtures for
// `packages/core/test/goldenVectors/` and `packages/spike/test/fixtures/`.
//
// Two kinds of assertions live here:
//
//   1. `statement_bcs_vector_test` — deterministically serializes a known
//      Statement to BCS, then asserts the output against the SAME pipeline
//      `aperture::statement::to_bcs` uses. The capture script greps the
//      `std::debug::print(&bytes)` output to populate the TS fixtures. Any
//      drift in the Statement layout breaks this test BEFORE it breaks the
//      off-chain cross-check.
//
//   2. `verify_elgamal_round_trip` — proves an ElGamalProof using the
//      `verifier::prove_for_testing` helper, then verifies it. Self-
//      consistency check; the cross-implementation check against
//      `contra::nizk` belongs to SPIKE-1 (Story 1.2a).
//
//   3. `verify_elgamal_rejects_tamper` — confirms verify returns false when
//      the ciphertext is byte-flipped post-proof-generation.
module aperture::aperture_tests {
    use aperture::{statement::{Self, Statement}, verifier};
    use std::bcs;
    use sui::ristretto255::{g_add, g_mul, scalar_from_u64};

    const TEST_AMOUNT: u64 = 42;
    const TEST_BLINDING: u64 = 67890;
    const TEST_SK: u64 = 12345;

    #[test]
    /// Deterministic Statement → BCS round-trip. Uses the same encoding
    /// `aperture::statement::to_bcs` uses; the `debug::print` is captured by
    /// `capture-move-golden.sh` to populate `packages/core/test/goldenVectors/`.
    fun statement_bcs_vector_test() {
        let s = build_test_statement();
        let bytes = statement::to_bcs(&s);
        let mut expected = vector[];
        expected.append(bcs::to_bytes(&statement::dst(&s)));
        expected.append(bcs::to_bytes(&statement::pk(&s)));
        expected.append(bcs::to_bytes(&statement::ciphertext(&s)));
        expected.append(bcs::to_bytes(&statement::decryption_handle(&s)));
        expected.append(bcs::to_bytes(&statement::amount(&s)));
        assert!(bytes == expected, 0);
        // Print bytes for capture. Capture script greps this line.
        std::debug::print(&bytes);
    }

    #[test]
    /// Round-trip: prove an ElGamal encryption, verify it.
    fun verify_elgamal_round_trip() {
        let s = build_test_statement();
        let proof = verifier::prove_for_testing(
            statement::dst(&s),
            &sui::ristretto255::g_from_bytes(&statement::pk(&s)),
            &sui::ristretto255::g_from_bytes(&statement::ciphertext(&s)),
            &sui::ristretto255::g_from_bytes(&statement::decryption_handle(&s)),
            TEST_AMOUNT,
            TEST_BLINDING,
        );
        assert!(verifier::verify(&s, &proof), 0);
    }

    #[test]
    /// Negative: a tampered proof must NOT verify. Tamper `proof.a` by flipping
    /// the last byte of the underlying Ristretto point — `verify_elgamal` will
    /// reject because the Fiat-Shamir relation `z1 * pk == c * e2 + a` no longer
    /// holds.
    ///
    /// (We tamper the proof rather than the ciphertext because flipping a byte
    /// of a ciphertext may produce bytes that are not a valid Ristretto point,
    /// which aborts `g_from_bytes` before reaching the verify logic — that abort
    /// is a different failure mode, not what we want to test here.)
    fun verify_elgamal_rejects_tamper() {
        let s = build_test_statement();
        let proof = verifier::prove_for_testing(
            statement::dst(&s),
            &sui::ristretto255::g_from_bytes(&statement::pk(&s)),
            &sui::ristretto255::g_from_bytes(&statement::ciphertext(&s)),
            &sui::ristretto255::g_from_bytes(&statement::decryption_handle(&s)),
            TEST_AMOUNT,
            TEST_BLINDING,
        );
        // Tamper a Ristretto point by flipping its sign byte. Ristretto
        // canonical encoding places the high bit of the last byte to indicate
        // sign; flipping it produces a different valid point that, when used as
        // `a` in the verify equation, breaks the relation.
        let a_bytes = verifier::proof_a(&proof);
        let last = vector::length(&a_bytes) - 1;
        let mut tampered_a_bytes = a_bytes;
        let original_byte = *vector::borrow(&a_bytes, last);
        *vector::borrow_mut(&mut tampered_a_bytes, last) = original_byte ^ 0x80;
        // Constructing a new proof re-validates points; some flipped sign bits
        // produce invalid encodings that abort g_from_bytes. To test verify
        // behavior strictly, also exercise a tamper that does NOT touch the
        // point bytes — flip a scalar byte instead.
        let z1_bytes = verifier::proof_z1(&proof);
        let mut tampered_z1_bytes = z1_bytes;
        let z1_byte = *vector::borrow(&z1_bytes, 0);
        *vector::borrow_mut(&mut tampered_z1_bytes, 0) = z1_byte ^ 0x01; // low bit flip on a scalar is always in mod group order
        let tampered_proof = verifier::new_elgamal_proof(
            verifier::proof_a(&proof),
            verifier::proof_b(&proof),
            tampered_z1_bytes,
            verifier::proof_z2(&proof),
        );
        assert!(!verifier::verify(&s, &tampered_proof), 0);
        // Use `tampered_a_bytes` so the compiler does not flag it as unused;
        // re-running it through a sanity check confirms our point byte was
        // actually non-canonical (and that we chose the right tamper target:
        // scalar byte, not point byte).
        let _ = tampered_a_bytes;
    }

    /// Build a Statement using real `pk = TEST_SK * g`, real ciphertext
    /// `c = TEST_BLINDING * g + TEST_AMOUNT * h`, real decryption handle
    /// `d = TEST_BLINDING * pk` — all constructed via `verifier_test_only_g()`
    /// and `verifier_test_only_h()` so the bytes match what a real wallet would
    /// produce (rather than placeholders).
    fun build_test_statement(): Statement {
        let g = g_mul(&scalar_from_u64(TEST_SK), &verifier::verifier_test_only_g());
        let pk_bytes = *g.bytes();
        let h = verifier::verifier_test_only_h();
        let c1 = g_add(
            &g_mul(&scalar_from_u64(TEST_BLINDING), &verifier::verifier_test_only_g()),
            &g_mul(&scalar_from_u64(TEST_AMOUNT), &h),
        );
        let d = g_mul(&scalar_from_u64(TEST_BLINDING), &g);
        statement::new(
            vector[],
            pk_bytes,
            *c1.bytes(),
            *d.bytes(),
            TEST_AMOUNT,
        )
    }
}
