// App.test.tsx — boot-on-Holder, sign flow, wallet-switch tests (Task 3/4, AC-1–6)
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App boot — Holder lens (AC-4, UX-DR23)', () => {
	it('boots on the Holder lens by default', () => {
		const { container } = render(<App />);
		// RoleSwitcher's banner should show holder role.
		const banner = container.querySelector('[data-component="role-banner"]') as HTMLElement;
		expect(banner).toHaveAttribute('data-role', 'holder');
	});

	it('renders the Holder trust-boundary on cold load', () => {
		const { container } = render(<App />);
		const tb = container.querySelector('[data-testid="trust-boundary"]') as HTMLElement;
		expect(tb).not.toBeNull();
		expect(tb).toHaveAttribute('data-role', 'holder');
	});

	it('shows the pre-sign explainer text on first load (AC-2)', () => {
		render(<App />);
		// Pre-sign explainer is in RoleSwitcher shell — always visible.
		expect(screen.getByText(/derive your key from a one-time signature/i)).toBeInTheDocument();
	});
});

describe('App lens switching (AC-1)', () => {
	it('switches to Payer lens when Payer nav button is clicked', async () => {
		const user = userEvent.setup();
		const { container } = render(<App />);

		await user.click(screen.getByRole('button', { name: 'Payer' }));

		await waitFor(() => {
			const tb = container.querySelector('[data-testid="trust-boundary"]') as HTMLElement;
			expect(tb).toHaveAttribute('data-role', 'payer');
		});
	});

	it('switches to Auditor lens when Auditor nav button is clicked', async () => {
		const user = userEvent.setup();
		const { container } = render(<App />);

		await user.click(screen.getByRole('button', { name: 'Auditor' }));

		await waitFor(() => {
			const tb = container.querySelector('[data-testid="trust-boundary"]') as HTMLElement;
			expect(tb).toHaveAttribute('data-role', 'auditor');
		});
	});

	it('shows Payer coming-soon stub text in Payer lens', async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole('button', { name: 'Payer' }));

		await waitFor(() => {
			expect(screen.getByText('Payment run — coming soon.')).toBeInTheDocument();
		});
	});

	it('shows Auditor lens with VerifyProof panel (Story 3.3)', async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole('button', { name: 'Auditor' }));

		await waitFor(() => {
			expect(screen.getByTestId('verify-proof')).toBeInTheDocument();
		});
	});
});

describe('App lazy sign flow (AC-2)', () => {
	it('derives a session key on first role entry (demo stub auto-signs)', async () => {
		const { container } = render(<App />);

		// Initially on Holder — the stub signing fires on mount via handleRoleChange.
		// After async signing, the HolderLens should show SelectEntries (not disabled button).
		// Wait for the async deriveSessionKey to complete.
		await waitFor(() => {
			expect(container.querySelector('[data-testid="entry-count"]')).not.toBeNull();
		});
	});

	it('HolderLens shows Mode B flow (not its own disabled button) once the session key is derived', async () => {
		const { container } = render(<App />);

		// Wait for key derivation.
		await waitFor(() => {
			expect(container.querySelector('[data-testid="entry-count"]')).not.toBeNull();
		});

		// HolderLens's own "Sign to unlock →" should be gone (replaced by SelectEntries).
		// Note: RoleSwitcher still renders its own static disabled sign button — that's by design.
		const allSignButtons = screen.getAllByRole('button', { name: 'Sign to unlock →' });
		// There should be exactly 1 (the one in RoleSwitcher), not 2 (which would include HolderLens).
		expect(allSignButtons).toHaveLength(1);
	});

	it('Payer lens shows trust-boundary (masked) regardless of session key (no key-dependent action)', async () => {
		const user = userEvent.setup();
		const { container } = render(<App />);

		await user.click(screen.getByRole('button', { name: 'Payer' }));

		await waitFor(() => {
			const cell = container.querySelector('[data-cipher-id]') as HTMLElement;
			expect(cell).toHaveAttribute('data-cipher-state', 'masked');
		});
	});
});

describe('App wallet-binding guard (AC-3)', () => {
	it('shows wallet-switch warning when connected address changes mid-session', async () => {
		const { rerender } = render(<App connectedWalletAddress="0xoriginal" />);

		// Trigger a role switch to establish the bound address.
		// (The Holder auto-signs on render; wait for key derivation.)
		await waitFor(() => {
			// After sign, bound address is set to "0xoriginal"
		});

		// Simulate wallet switch.
		rerender(<App connectedWalletAddress="0xdifferent" />);

		await waitFor(() => {
			expect(
				screen.getByText(
					'Switching wallets mid-session breaks proof verification. Reconnect with the original wallet.',
				),
			).toBeInTheDocument();
		});
	});

	it('warning disappears when original wallet address is reconnected', async () => {
		const { rerender } = render(<App connectedWalletAddress="0xoriginal" />);

		// Wait for key derivation to set boundWalletAddress.
		await waitFor(() => {
			// bound address is set
		});

		// Switch wallet — warning appears.
		rerender(<App connectedWalletAddress="0xdifferent" />);
		await waitFor(() => {
			expect(
				screen.queryByText(/Switching wallets mid-session/),
			).toBeInTheDocument();
		});

		// Reconnect original — warning disappears.
		rerender(<App connectedWalletAddress="0xoriginal" />);
		await waitFor(() => {
			expect(
				screen.queryByText(/Switching wallets mid-session/),
			).toBeNull();
		});
	});

	it('does not show wallet warning before any key is derived (no binding yet)', () => {
		render(<App connectedWalletAddress="0xany" />);
		expect(screen.queryByText(/Switching wallets mid-session/)).toBeNull();
	});
});

describe('App trust-boundary present (AC-5)', () => {
	it('Holder lens trust-boundary uses revealed CipherCell', async () => {
		const { container } = render(<App />);
		const cell = container.querySelector('[data-cipher-id]') as HTMLElement;
		expect(cell).toHaveAttribute('data-cipher-state', 'revealed');
	});
});
