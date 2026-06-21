import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VerifyResult } from './VerifyResult';

// Typical Sui tx digest — 44 base58 chars.
const DIGEST = 'Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1Abc1';

describe('VerifyResult', () => {
	it('renders a "Verified" badge for verdict="verified"', () => {
		render(<VerifyResult verdict="verified" />);
		expect(screen.getByRole('img', { name: 'Verified' })).toBeTruthy();
	});

	it('renders a "Failed" badge for verdict="failed"', () => {
		render(<VerifyResult verdict="failed" />);
		expect(screen.getByRole('img', { name: 'Failed' })).toBeTruthy();
	});

	it('renders no badge when verdict is null', () => {
		render(<VerifyResult verdict={null} />);
		expect(screen.queryByRole('img')).toBeNull();
	});

	describe('with txDigest', () => {
		it('renders a link with the correct href (devnet default)', () => {
			render(<VerifyResult verdict="verified" txDigest={DIGEST} />);
			const link = screen.getByRole('link') as HTMLAnchorElement;
			expect(link.getAttribute('href')).toBe(
				`https://suiscan.xyz/devnet/tx/${DIGEST}`,
			);
		});

		it('opens in a new tab with noopener noreferrer', () => {
			render(<VerifyResult verdict="verified" txDigest={DIGEST} />);
			const link = screen.getByRole('link') as HTMLAnchorElement;
			expect(link.getAttribute('target')).toBe('_blank');
			expect(link.getAttribute('rel')).toBe('noopener noreferrer');
		});

		it('has correct aria-label containing the full digest', () => {
			render(<VerifyResult verdict="verified" txDigest={DIGEST} />);
			const link = screen.getByRole('link') as HTMLAnchorElement;
			expect(link.getAttribute('aria-label')).toBe(
				`View transaction ${DIGEST} on Sui Explorer`,
			);
		});

		it('displays a truncated digest for a 44-char digest', () => {
			render(<VerifyResult verdict="verified" txDigest={DIGEST} />);
			// first8 + ellipsis + last8
			expect(screen.getByText('Abc1Abc1…Abc1Abc1')).toBeTruthy();
		});

		it('uses the network prop when provided', () => {
			render(<VerifyResult verdict="verified" txDigest={DIGEST} network="testnet" />);
			const link = screen.getByRole('link') as HTMLAnchorElement;
			expect(link.getAttribute('href')).toBe(
				`https://suiscan.xyz/testnet/tx/${DIGEST}`,
			);
		});
	});

	describe('without txDigest', () => {
		it('renders no link when txDigest is absent', () => {
			render(<VerifyResult verdict="verified" />);
			expect(screen.queryByRole('link')).toBeNull();
		});
	});
});
