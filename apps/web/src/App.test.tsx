// App.test.tsx — boot-on-Holder, role switching, and the cold-load Connect step.
// The Holder lens owns its wallet session via useWalletSession(); with no wallet
// provider in tests, it returns the safe disconnected default → the Connect step.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App boot — Holder lens (AC-4, UX-DR23)', () => {
	it('boots on the Holder lens by default', () => {
		const { container } = render(<App />);
		const banner = container.querySelector('[data-component="role-banner"]') as HTMLElement;
		expect(banner).toHaveAttribute('data-role', 'holder');
	});

	it('renders the Holder trust-boundary on cold load', () => {
		const { container } = render(<App />);
		const tb = container.querySelector('[data-testid="trust-boundary"]') as HTMLElement;
		expect(tb).not.toBeNull();
		expect(tb).toHaveAttribute('data-role', 'holder');
	});

	it('shows the connect-step explainer on first load (AC-2)', () => {
		render(<App />);
		// Holder boots on the Connect step; its explainer reassures about the key.
		expect(screen.getByText(/never leaves this browser/i)).toBeInTheDocument();
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

describe('App Holder cold load — Connect step (no wallet)', () => {
	it('shows the guided step rail and the Connect (Sign to unlock) action', () => {
		const { container } = render(<App />);
		expect(screen.getByTestId('step-rail')).toBeInTheDocument();
		// The Holder lens own sign-in action is the Connect step.
		expect(container.querySelector('[data-action="holder-sign-in"]')).not.toBeNull();
	});

	it('does not show the proof flow (entry list) until a key is derived', () => {
		const { container } = render(<App />);
		expect(container.querySelector('[data-testid="entry-count"]')).toBeNull();
	});
});

describe('App trust-boundary present (AC-5)', () => {
	it('Holder lens trust-boundary uses revealed CipherCell', () => {
		const { container } = render(<App />);
		const cell = container.querySelector('[data-cipher-id]') as HTMLElement;
		expect(cell).toHaveAttribute('data-cipher-state', 'revealed');
	});
});
