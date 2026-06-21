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

    // Aggregate constants (SPIKE-1 addendum) — match
    // packages/spike/scripts/generate-aggregate-proof.ts,
    // packages/spike/src/spike1.aggregate.test.ts, and the aggregate block of
    // packages/spike/test/onchain/onchain.devnet.test.ts.
    const ENTRY_A_AMOUNT: u64 = 40000;
    const ENTRY_A_BLINDING: u64 = 11111;
    const ENTRY_B_AMOUNT: u64 = 30000;
    const ENTRY_B_BLINDING: u64 = 22222;

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
        let proof = prove_for_statement(&s);
        assert!(verifier::verify(&s, &proof), 0);
    }

    #[test]
    /// Negative: a tampered proof must NOT verify. We flip the low bit of
    /// `proof.z1` (a 32-byte LE scalar). `scalar_from_bytes` accepts any
    /// 32-byte input and reduces mod the group order, so the tampered
    /// scalar remains well-formed; what fails is the Fiat-Shamir
    /// relation `z1 * pk == c * e2 + a` in `verify`.
    ///
    /// Note: we tamper a SCALAR byte, not a Ristretto POINT byte. Flipping
    /// a sign bit of a Ristretto point (the obvious tamper) often
    /// produces a non-canonical encoding that aborts at `g_from_bytes`
    /// rather than failing the verify relation — a different (and
    /// less interesting) failure mode for what this test is meant to
    /// exercise. Story 1.1b code review flagged this; the scalar-byte
    /// tamper is the cleanest way to assert the verify relation is
    /// actually broken by an off-by-one-bit mistake.
    fun verify_elgamal_rejects_tamper() {
        let s = build_test_statement();
        let proof = prove_for_statement(&s);
        // Flip the low bit of z1's first byte. Stays in mod group order
        // because scalar_from_bytes clamps; breaks the relation.
        let z1_bytes = verifier::proof_z1(&proof);
        let mut tampered_z1_bytes = z1_bytes;
        let z1_byte = *vector::borrow(&z1_bytes, 0);
        *vector::borrow_mut(&mut tampered_z1_bytes, 0) = z1_byte ^ 0x01;
        let tampered_proof = verifier::new_elgamal_proof(
            verifier::proof_a(&proof),
            verifier::proof_b(&proof),
            tampered_z1_bytes,
            verifier::proof_z2(&proof),
        );
        assert!(!verifier::verify(&s, &tampered_proof), 0);
    }

    #[test]
    /// SPIKE-1 addendum: AGGREGATE round-trip. Encrypt two entries under one
    /// pk, sum the ciphertexts (`Ciphertext.add` = `g_add` on c1 AND the
    /// decryption handle), prove the aggregate, verify. The summed amount
    /// (70000) exceeds 2^16 — the deliberate limb-0 carry from
    /// `architecture.md` line 51. This proves the proof RELATION is carry-safe
    /// (the aggregate verifies on-chain). The DECRYPTABILITY bound (a real
    /// Contra aggregate becoming undecryptable past 2^16 on the 16-bit dlog
    /// table) is NOT modelled by this single-scalar ElGamal and stays a
    /// Story 3.1 prerequisite: bound-and-reject at selection time.
    fun verify_elgamal_aggregate_round_trip() {
        let g = verifier::verifier_test_only_g();
        let h = verifier::verifier_test_only_h();
        let pk = g_mul(&scalar_from_u64(TEST_SK), &g);

        // Two encrypted entries: c1 = blinding*g + amount*h ; dh = blinding*pk
        let c1_a = g_add(
            &g_mul(&scalar_from_u64(ENTRY_A_BLINDING), &g),
            &g_mul(&scalar_from_u64(ENTRY_A_AMOUNT), &h),
        );
        let dh_a = g_mul(&scalar_from_u64(ENTRY_A_BLINDING), &pk);
        let c1_b = g_add(
            &g_mul(&scalar_from_u64(ENTRY_B_BLINDING), &g),
            &g_mul(&scalar_from_u64(ENTRY_B_AMOUNT), &h),
        );
        let dh_b = g_mul(&scalar_from_u64(ENTRY_B_BLINDING), &pk);

        // Ciphertext.add — component-wise Ristretto addition.
        let c1_agg = g_add(&c1_a, &c1_b);
        let dh_agg = g_add(&dh_a, &dh_b);

        let agg_amount = ENTRY_A_AMOUNT + ENTRY_B_AMOUNT; // 70000 > 2^16
        let agg_blinding = ENTRY_A_BLINDING + ENTRY_B_BLINDING;
        let s = statement::new(
            vector[],
            *pk.bytes(),
            *c1_agg.bytes(),
            *dh_agg.bytes(),
            agg_amount,
        );
        let proof = verifier::prove_for_testing(
            statement::dst(&s),
            &pk,
            &c1_agg,
            &dh_agg,
            agg_amount,
            agg_blinding,
        );
        assert!(verifier::verify(&s, &proof), 0);
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

    /// Prove a Statement built with the test triple's TEST_AMOUNT /
    /// TEST_BLINDING. Story 1.1b code review (finding M8) flagged that
    /// passing the constants again in each test body risks internal
    /// drift (someone bumps TEST_BLINDING in `build_test_statement` but
    /// not in `prove_for_testing`; the prove still verifies against
    /// the OLD statement because Move's relation is internally
    /// consistent). Centralizing here means a single source of truth
    /// for the prove parameters.
    fun prove_for_statement(s: &Statement): verifier::ElGamalProof {
        verifier::prove_for_testing(
            statement::dst(s),
            &sui::ristretto255::g_from_bytes(&statement::pk(s)),
            &sui::ristretto255::g_from_bytes(&statement::ciphertext(s)),
            &sui::ristretto255::g_from_bytes(&statement::decryption_handle(s)),
            TEST_AMOUNT,
            TEST_BLINDING,
        )
    }
}
