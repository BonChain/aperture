import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEMO_REQUEST, getActiveRequest } from './demoRequest';
import { VerifierRequestCard } from './VerifierRequestCard';

// ---------------------------------------------------------------------------
// demoRequest fixture tests
// ---------------------------------------------------------------------------

describe('demoRequest — fixture', () => {
	it('DEMO_REQUEST has required fields', () => {
		expect(DEMO_REQUEST.requestId).toBe('demo-verifier-1');
		expect(DEMO_REQUEST.requiredAmount).toBe(50_000n);
		expect(DEMO_REQUEST.requesterName).toBe('Acme Lender');
		expect(DEMO_REQUEST.message).toContain('50,000 MIST');
	});

	it('getActiveRequest() returns DEMO_REQUEST when no URL param', () => {
		// jsdom environment: window.location.search is '' by default
		expect(getActiveRequest()).toBe(DEMO_REQUEST);
	});

	it('getActiveRequest() returns DEMO_REQUEST for param matching requestId', () => {
		Object.defineProperty(window, 'location', {
			writable: true,
			value: { ...window.location, search: '?request=demo-verifier-1' },
		});
		expect(getActiveRequest()).toBe(DEMO_REQUEST);
		// Reset
		Object.defineProperty(window, 'location', {
			writable: true,
			value: { ...window.location, search: '' },
		});
	});

	it('getActiveRequest() returns DEMO_REQUEST for unknown param (graceful fallback)', () => {
		Object.defineProperty(window, 'location', {
			writable: true,
			value: { ...window.location, search: '?request=unknown-request' },
		});
		expect(getActiveRequest()).toBe(DEMO_REQUEST);
		// Reset
		Object.defineProperty(window, 'location', {
			writable: true,
			value: { ...window.location, search: '' },
		});
	});
});

// ---------------------------------------------------------------------------
// VerifierRequestCard component tests
// ---------------------------------------------------------------------------

describe('VerifierRequestCard — idle (no verifyResult)', () => {
	it('renders the root with data-testid="verifier-request-card"', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} />);
		expect(screen.getByTestId('verifier-request-card')).toBeInTheDocument();
	});

	it('renders requester name "Acme Lender"', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} />);
		expect(screen.getByText('Acme Lender')).toBeInTheDocument();
	});

	it('renders the request message', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} />);
		expect(
			screen.getByText(
				'Prove your selected total ≥ 50,000 MIST to proceed with your loan application.',
			),
		).toBeInTheDocument();
	});

	it('renders the required amount label "Requested figure"', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} />);
		expect(screen.getByText('Requested figure')).toBeInTheDocument();
	});

	it('renders "Awaiting proof…" in idle state', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} />);
		expect(screen.getByTestId('verdict-area').textContent).toContain('Awaiting proof');
	});

	it('renders the scoped-claim disclaimer verbatim', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} />);
		const note = screen.getByRole('note');
		expect(note.textContent).toContain(
			'The proof shows the selected sum only — not total income or which entries were included.',
		);
	});

	it('snapshot: idle state locks disclaimer and absence of forbidden words', () => {
		const { container } = render(<VerifierRequestCard request={DEMO_REQUEST} />);
		const text = container.textContent ?? '';
		// Disclaimer always present
		expect(text).toContain(
			'The proof shows the selected sum only — not total income or which entries were included.',
		);
		// Forbidden framing words not used
		expect(text.toLowerCase()).not.toContain('anonymous');
		expect(text.toLowerCase()).not.toContain('compliant');
		expect(text.toLowerCase()).not.toContain('proven balance');
		expect(text.toLowerCase()).not.toContain('income verified');
	});
});

describe('VerifierRequestCard — pending state', () => {
	it('shows "Awaiting proof…" when verifyResult is "pending"', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} verifyResult="pending" />);
		expect(screen.getByTestId('verdict-area').textContent).toContain('Awaiting proof');
	});

	it('disclaimer is still visible in pending state', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} verifyResult="pending" />);
		const note = screen.getByRole('note');
		expect(note.textContent).toContain(
			'The proof shows the selected sum only — not total income or which entries were included.',
		);
	});
});

describe('VerifierRequestCard — verified state', () => {
	it('renders badge-verified element when verifyResult is "verified"', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} verifyResult="verified" />);
		const badge = screen.getByRole('img', { name: 'Verified — request satisfied' });
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveAttribute('data-verdict', 'verified');
	});

	it('renders provedAmount when provided', () => {
		render(
			<VerifierRequestCard
				request={DEMO_REQUEST}
				verifyResult="verified"
				provedAmount={48000n}
			/>,
		);
		const verdictArea = screen.getByTestId('verdict-area');
		expect(verdictArea.textContent).toContain('48,000 MIST');
	});

	it('disclaimer is still visible in verified state (NFR-9)', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} verifyResult="verified" />);
		const note = screen.getByRole('note');
		expect(note.textContent).toContain(
			'The proof shows the selected sum only — not total income or which entries were included.',
		);
	});
});

describe('VerifierRequestCard — failed state', () => {
	it('renders badge-failed element when verifyResult is "failed"', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} verifyResult="failed" />);
		const badge = screen.getByRole('img', { name: "Doesn't verify" });
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveAttribute('data-verdict', 'failed');
	});

	it('disclaimer is still visible in failed state (NFR-9)', () => {
		render(<VerifierRequestCard request={DEMO_REQUEST} verifyResult="failed" />);
		const note = screen.getByRole('note');
		expect(note.textContent).toContain(
			'The proof shows the selected sum only — not total income or which entries were included.',
		);
	});
});
