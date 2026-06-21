// walletSession.test.ts — pure error-mapping for on-chain submit failures.
import { describe, expect, it } from 'vitest';

import { submitErrorMessage } from './walletSession';

describe('submitErrorMessage', () => {
	it('treats an explicit user reject as a cancellation', () => {
		expect(submitErrorMessage(new Error('Rejected from user'))).toBe('Submission cancelled.');
	});

	it('treats a transient "Incorrect password" as an unlock/retry hint', () => {
		const msg = submitErrorMessage(new Error('Incorrect password'));
		expect(msg).toMatch(/Unlock Slush/);
		expect(msg).toMatch(/try again/);
	});

	it('passes through other wallet error messages', () => {
		expect(submitErrorMessage(new Error('Insufficient gas'))).toBe('Insufficient gas');
	});

	it('falls back to a generic message for non-Error throws', () => {
		expect(submitErrorMessage('boom')).toBe('Submission failed.');
	});
});
