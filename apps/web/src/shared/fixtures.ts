/**
 * Fixture data for the UI contract layer (Story 1.0). Pure literals — NO network,
 * NO chain, NO crypto. These exist only so the components render in isolation and
 * in tests. Amounts are MIST integer strings (architecture Formats rule).
 */

export interface CipherFixture {
	cipherId: string;
	/** The real figure, revealed only when authorized. */
	value: string;
}

/** The signature demo pair: the SAME cipherId rendered sealed in one lens, open in another. */
export const SIGNATURE_CIPHER: CipherFixture = {
	cipherId: 'run-2026-06-20:recipient-03:amount',
	value: '3,000.00 USDC',
};

export const AMOUNT_FIXTURES: CipherFixture[] = [
	{ cipherId: 'run-2026-06-20:recipient-01:amount', value: '1,500.00 USDC' },
	{ cipherId: 'run-2026-06-20:recipient-02:amount', value: '2,250.00 USDC' },
	SIGNATURE_CIPHER,
];

export const ADDRESS_FIXTURE = '0x9c3f1a7b2e4d6f80a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718';

export const PROOF_BLOB_FIXTURE =
	'0a3f5c91d2e4b6a8c0f1e2d3b4a59687c8d9e0f1a2b3c4d5e6f70819' + '…';

export const HOLDER_PUBKEY_FIXTURE = '0x4b5c6d7e8f90a1b2c3d4e5f6071829';

export const AUDIT_ENTRIES_FIXTURE = [
	{ seq: 0, actor: '0xaud…01', action: 'auditor_read', at: '2026-06-20T14:02:11Z', genesis: true },
	{ seq: 1, actor: '0xaud…01', action: 'report_export', at: '2026-06-20T14:05:42Z', genesis: false },
];
