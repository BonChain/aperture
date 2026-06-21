import { describe, expect, it } from 'vitest';

import { explorerTxUrl } from './explorerLink';

const DIGEST_44 = 'Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1';

describe('explorerTxUrl', () => {
	it('returns devnet URL with ?network=devnet', () => {
		expect(explorerTxUrl('deadbeef', 'devnet')).toBe(
			'https://suiexplorer.com/txblock/deadbeef?network=devnet',
		);
	});

	it('returns testnet URL with ?network=testnet', () => {
		expect(explorerTxUrl('deadbeef', 'testnet')).toBe(
			'https://suiexplorer.com/txblock/deadbeef?network=testnet',
		);
	});

	it('returns mainnet URL without a network param', () => {
		expect(explorerTxUrl('deadbeef', 'mainnet')).toBe(
			'https://suiexplorer.com/txblock/deadbeef',
		);
	});

	it('includes the full digest in the URL', () => {
		const url = explorerTxUrl(DIGEST_44, 'devnet');
		expect(url).toContain(DIGEST_44);
	});
});
