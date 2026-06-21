import { describe, expect, it } from 'vitest';

import { explorerObjectUrl, explorerTxUrl } from './explorerLink';

const DIGEST_44 = 'Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1';

describe('explorerTxUrl', () => {
	it('returns devnet URL under /devnet/tx/', () => {
		expect(explorerTxUrl('deadbeef', 'devnet')).toBe(
			'https://suiscan.xyz/devnet/tx/deadbeef',
		);
	});

	it('returns testnet URL under /testnet/tx/', () => {
		expect(explorerTxUrl('deadbeef', 'testnet')).toBe(
			'https://suiscan.xyz/testnet/tx/deadbeef',
		);
	});

	it('returns mainnet URL under /mainnet/tx/', () => {
		expect(explorerTxUrl('deadbeef', 'mainnet')).toBe(
			'https://suiscan.xyz/mainnet/tx/deadbeef',
		);
	});

	it('includes the full digest in the URL', () => {
		const url = explorerTxUrl(DIGEST_44, 'devnet');
		expect(url).toContain(DIGEST_44);
	});

	it('builds a Suiscan object/package URL', () => {
		expect(explorerObjectUrl('0xabc', 'devnet')).toBe('https://suiscan.xyz/devnet/object/0xabc');
	});
});
