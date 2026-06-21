// lenses.test.tsx — trust-boundary and stub-content tests (Task 2, AC-5)
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SIGNATURE_CIPHER } from '../shared/fixtures';
import AuditorLens from './AuditorLens';
import HolderLens from './HolderLens';
import PayerLens from './PayerLens';

describe('HolderLens (AC-5, AC-6)', () => {
	it('renders [data-testid="trust-boundary"] with correct data-trust-scope', () => {
		const { container } = render(<HolderLens sessionKey={null} />);
		const tb = container.querySelector('[data-testid="trust-boundary"]') as HTMLElement;
		expect(tb).not.toBeNull();
		expect(tb).toHaveAttribute('data-trust-scope', 'holder: own encrypted entries only');
	});

	it('renders CipherCell in "revealed" state inside trust-boundary', () => {
		const { container } = render(<HolderLens sessionKey={null} />);
		const cell = container.querySelector(
			`[data-cipher-id="${SIGNATURE_CIPHER.cipherId}"]`,
		) as HTMLElement;
		expect(cell).not.toBeNull();
		expect(cell).toHaveAttribute('data-cipher-state', 'revealed');
	});

	it('shows "Sign to unlock →" button when sessionKey is null', () => {
		render(<HolderLens sessionKey={null} />);
		const btn = screen.getByRole('button', { name: 'Sign to unlock →' });
		expect(btn).toBeDisabled();
		expect(btn).toHaveAttribute('aria-disabled', 'true');
	});

	it('shows the Mode B flow (SelectEntries) when sessionKey is provided', async () => {
		const { makeSessionKey } = await import('@aperture/core/proof');
		const testKey = makeSessionKey(new Uint8Array(32).fill(1));
		render(<HolderLens sessionKey={testKey} />);
		// Real SelectEntries component renders entry-count (Story 3.1)
		expect(screen.getByTestId('entry-count')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Sign to unlock →' })).toBeNull();
	});
});

describe('PayerLens (AC-5)', () => {
	it('renders [data-testid="trust-boundary"] with correct data-trust-scope', () => {
		const { container } = render(<PayerLens />);
		const tb = container.querySelector('[data-testid="trust-boundary"]') as HTMLElement;
		expect(tb).not.toBeNull();
		expect(tb).toHaveAttribute('data-trust-scope', 'payer: organization scope');
	});

	it('renders CipherCell in "masked" state inside trust-boundary', () => {
		const { container } = render(<PayerLens />);
		const cell = container.querySelector(
			`[data-cipher-id="${SIGNATURE_CIPHER.cipherId}"]`,
		) as HTMLElement;
		expect(cell).not.toBeNull();
		expect(cell).toHaveAttribute('data-cipher-state', 'masked');
	});

	it('shows the coming-soon stub text', () => {
		render(<PayerLens />);
		expect(screen.getByRole('note')).toHaveTextContent('Payment run — coming soon.');
	});
});

describe('AuditorLens (AC-5)', () => {
	it('renders [data-testid="trust-boundary"] with correct data-trust-scope', () => {
		const { container } = render(<AuditorLens />);
		const tb = container.querySelector('[data-testid="trust-boundary"]') as HTMLElement;
		expect(tb).not.toBeNull();
		expect(tb).toHaveAttribute('data-trust-scope', 'auditor: designated audit scope');
	});

	it('renders CipherCell in "masked" state inside trust-boundary', () => {
		const { container } = render(<AuditorLens />);
		const cell = container.querySelector(
			`[data-cipher-id="${SIGNATURE_CIPHER.cipherId}"]`,
		) as HTMLElement;
		expect(cell).not.toBeNull();
		expect(cell).toHaveAttribute('data-cipher-state', 'masked');
	});

	it('shows the privacy disclaimer (Story 3.3: stub replaced by VerifyProof)', () => {
		render(<AuditorLens />);
		expect(screen.getByRole('note')).toHaveTextContent('secret key never leaves the holder');
	});

	it('uses the same SIGNATURE_CIPHER.cipherId across all three lenses (identity invariant, AC-5)', () => {
		const { container: holderContainer } = render(<HolderLens sessionKey={null} />);
		const { container: payerContainer } = render(<PayerLens />);
		const { container: auditorContainer } = render(<AuditorLens />);

		const holderCell = holderContainer.querySelector('[data-cipher-id]') as HTMLElement;
		const payerCell = payerContainer.querySelector('[data-cipher-id]') as HTMLElement;
		const auditorCell = auditorContainer.querySelector('[data-cipher-id]') as HTMLElement;

		expect(holderCell.getAttribute('data-cipher-id')).toBe(SIGNATURE_CIPHER.cipherId);
		expect(payerCell.getAttribute('data-cipher-id')).toBe(SIGNATURE_CIPHER.cipherId);
		expect(auditorCell.getAttribute('data-cipher-id')).toBe(SIGNATURE_CIPHER.cipherId);
	});
});
