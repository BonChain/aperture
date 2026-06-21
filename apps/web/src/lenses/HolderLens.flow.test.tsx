// HolderLens.flow.test.tsx — the guided flow handoff: the proof generated in the
// Holder lens is handed straight to the inline verify step and reaches Done,
// without switching lenses. Locks the fix for the old dead-end.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { makeSessionKey } from '@aperture/core/proof';

import HolderLens from './HolderLens';

describe('HolderLens — guided flow (proof → verify → done)', () => {
	it('select Salary + Bonus (48,000), generate, verify, reach Done', async () => {
		const user = userEvent.setup();
		const key = makeSessionKey(new Uint8Array(32).fill(7));
		render(<HolderLens sessionKey={key} />);

		// Step 2 — select two entries that clear 45,000 within the single-figure bound.
		await user.click(screen.getByRole('checkbox', { name: /Salary/ }));
		await user.click(screen.getByRole('checkbox', { name: /Bonus/ }));
		expect(screen.getByTestId('selected-total').textContent).toContain('48,000');

		// Step 3 — generate the proof.
		await user.click(screen.getByRole('button', { name: 'Generate proof' }));
		await waitFor(() => expect(screen.getByTestId('proof-verify-step')).toBeInTheDocument(), {
			timeout: 5000,
		});

		// Step 4 — verify it (no secret key used).
		await user.click(screen.getByRole('button', { name: 'Verify the proof' }));
		await waitFor(
			() => expect(screen.getByTestId('verify-result-verified')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		// Step 5 — Done.
		expect(screen.getByTestId('flow-done')).toBeInTheDocument();
	});
});
