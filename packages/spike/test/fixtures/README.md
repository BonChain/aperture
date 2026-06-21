# Spike Golden Fixtures (Story 1.1b, Task 7)

These fixtures are the **committed seam** between the off-chain spike harness
(`packages/spike/`) and downstream verify work (Story 3.3). They are NOT
regenerated as part of the test suite — `generate-golden-proofs.ts` and
`generate-fiat-shamir-fixture.ts` are run **once** when the Statement layout,
the test triple, or the `h` constant changes, and the results committed.

## Files

| File | Size | Purpose |
|---|---|---|
| `fiatShamirBlake2b256.hex` | 32 bytes | Canonical Fiat-Shamir challenge for `dst = [0..20]`, `p1 = [0..31]` — asserts TS Blake2b256 + BCS `vector<vector<u8>>` layout matches `contra::nizk::fiat_shamir_challenge` byte-for-byte. |
| `proofValid.hex` | 128 bytes | Valid `ElGamalProof` (a ‖ b ‖ z1 ‖ z2, each 32 bytes) over the canonical test Statement (TEST_SK=12345, TEST_BLINDING=67890, TEST_AMOUNT=42). Used by `spike1.elgamal.test.ts` to assert `verify(statement, proof) === true`. |
| `proofTampered.hex` | 128 bytes | Same as `proofValid.hex` but with byte 64 (first byte of scalar `z1`) XORed by `0x01` (low bit flip). Tampers a SCALAR byte, not a Ristretto point byte, so `g_from_bytes` does not abort before the relation check. Used to assert `verify(tampered_proof) === false`. |
| `proofAggregateValid.hex` | 128 bytes | **SPIKE-1 addendum.** Valid `ElGamalProof` over the AGGREGATE of two entries (40000 + 30000) summed via `Ciphertext.add` under pk = 12345·g. The sum (70000) exceeds 2¹⁶ — the deliberate limb-0 carry. Used by `spike1.aggregate.test.ts` (off-chain) and `onchain.devnet.test.ts` (on-chain) to prove the `Ciphertext.add → prove → verify` round-trip AR-4 mandates. |
| `proofAggregateTampered.hex` | 128 bytes | Same as `proofAggregateValid.hex` but with byte 64 (z1[0] low bit) flipped. Used to assert the aggregate verify returns false / aborts. |

## Why committed, not regenerated

If the fixtures were regenerated on every test run, the tests would never
fail on drift — they would silently keep up with the production code,
breaking the seam contract with Story 3.3 (which needs a STABLE input to
verify against, NOT 3.2's runtime output — per the implementation-readiness
report). Committed fixtures enforce the contract: any drift requires an
explicit Story update that explains the change.

## Regenerating (when intentionally updating)

```bash
# From packages/spike/:
pnpm exec tsx scripts/generate-golden-proofs.ts
pnpm exec tsx scripts/generate-fiat-shamir-fixture.ts
pnpm exec tsx scripts/generate-aggregate-proof.ts   # SPIKE-1 aggregate addendum
git diff test/fixtures/  # inspect the change
git add test/fixtures/
# Then update packages/core/test/goldenVectors/statement.bcs.hex via:
# (repo root) pnpm exec ./scripts/capture-move-golden.sh
# and update packages/spike/src/spike1.elgamal.test.ts if the inputs changed.
```

After regenerating, the `verify_elgamal_round_trip` Move test (which uses
the SAME TEST_SK/BLINDING/AMOUNT constants) MUST still pass byte-for-byte
when the new fixtures are loaded. If it doesn't, the seam has drifted and
Story 3.3's verify contract is at risk.
