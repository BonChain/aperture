import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Landing } from './Landing';

// Honesty lexicon (NFR-9) — the front door must not over-claim.
const BANNED = ['anonymous', 'untraceable', 'fully compliant', 'ElGamal', 'ciphertext'];

describe('Landing — front door', () => {
	it('renders the pitch cards (Problem / Who / How)', () => {
		render(<Landing onEnter={() => {}} />);
		expect(screen.getByText('Problem')).toBeInTheDocument();
		expect(screen.getByText(/Who/)).toBeInTheDocument();
		expect(screen.getByText('How it works')).toBeInTheDocument();
	});

	it('calls onEnter when an "Enter the demo" button is clicked', async () => {
		const user = userEvent.setup();
		const onEnter = vi.fn();
		render(<Landing onEnter={onEnter} />);
		// Hero + final CTA both offer the action — clicking either enters the demo.
		const buttons = screen.getAllByRole('button', { name: /Enter the demo/ });
		expect(buttons.length).toBeGreaterThanOrEqual(1);
		await user.click(buttons[0]);
		expect(onEnter).toHaveBeenCalledOnce();
	});

	it('contains no banned over-claiming words', () => {
		const { container } = render(<Landing onEnter={() => {}} />);
		const text = (container.textContent ?? '').toLowerCase();
		for (const word of BANNED) {
			expect(text).not.toContain(word.toLowerCase());
		}
	});
});
