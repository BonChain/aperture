import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SelectEntries } from './SelectEntries';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the checkbox input by matching label text. */
function getCheckbox(labelText: string | RegExp): HTMLInputElement {
	return screen.getByRole('checkbox', { name: labelText }) as HTMLInputElement;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SelectEntries — initial state', () => {
	it('renders all 4 entries', () => {
		render(<SelectEntries />);
		expect(screen.getByRole('checkbox', { name: /Salary — June/ })).not.toBeNull();
		expect(screen.getByRole('checkbox', { name: /Consulting — Q2/ })).not.toBeNull();
		expect(screen.getByRole('checkbox', { name: /Bonus — H1/ })).not.toBeNull();
		expect(screen.getByRole('checkbox', { name: /Reimbursement/ })).not.toBeNull();
	});

	it('shows "0 of 4 entries selected" on mount', () => {
		render(<SelectEntries />);
		const el = screen.getByTestId('entry-count');
		expect(el.textContent).toContain('0 of 4 entries selected');
	});

	it('shows running sum of 0 on mount', () => {
		render(<SelectEntries />);
		const el = screen.getByTestId('selected-total');
		expect(el.textContent).toContain('0');
	});

	it('all checkboxes are enabled on mount', () => {
		render(<SelectEntries />);
		const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
		for (const box of boxes) {
			expect(box.disabled).toBe(false);
		}
	});

	it('renders the exact scoped-claim disclaimer', () => {
		render(<SelectEntries />);
		const note = screen.getByRole('note');
		expect(note.textContent).toContain(
			'Proves a selected sum — not total income, nor which entries were included.',
		);
	});

	it('renders the "N entries in scope" label', () => {
		const { container } = render(<SelectEntries />);
		expect(container.textContent).toContain('4 entries in scope');
	});
});

describe('SelectEntries — single selection', () => {
	it('selecting entry A shows running sum 40000 and updates count', () => {
		render(<SelectEntries />);
		fireEvent.click(getCheckbox(/Salary — June/));
		expect(screen.getByTestId('entry-count').textContent).toContain('1 of 4 entries selected');
		expect(screen.getByTestId('selected-total').textContent).toContain('40000');
	});
});

describe('SelectEntries — two entries within limit', () => {
	it('selecting A then C gives sum 48000 and both remain checked', () => {
		render(<SelectEntries />);
		fireEvent.click(getCheckbox(/Salary — June/));
		fireEvent.click(getCheckbox(/Bonus — H1/));
		expect(screen.getByTestId('entry-count').textContent).toContain('2 of 4 entries selected');
		expect(screen.getByTestId('selected-total').textContent).toContain('48000');
		expect(getCheckbox(/Salary — June/).checked).toBe(true);
		expect(getCheckbox(/Bonus — H1/).checked).toBe(true);
	});

	it('selecting A then attempting B — B is disabled because 70000 > 65535', () => {
		render(<SelectEntries />);
		fireEvent.click(getCheckbox(/Salary — June/));
		// B checkbox should now be disabled
		expect(getCheckbox(/Consulting — Q2/).disabled).toBe(true);
		// Bound-reject message should be visible somewhere in the container
		const { container } = render(<SelectEntries />);
		fireEvent.click(screen.getAllByRole('checkbox', { name: /Salary — June/ })[1]);
		expect(container.textContent).toContain(
			'Adding this entry exceeds what can be proven in one figure. Prove a smaller selection.',
		);
	});

	it('C and D are NOT disabled when only A is selected (C+D are small)', () => {
		// With A selected (40000), C (8000) and D (500) are still within 65535.
		render(<SelectEntries />);
		fireEvent.click(getCheckbox(/Salary — June/));
		// C: 40000+8000=48000 ≤ 65535 → enabled
		expect(getCheckbox(/Bonus — H1/).disabled).toBe(false);
		// D: 40000+500=40500 ≤ 65535 → enabled
		expect(getCheckbox(/Reimbursement/).disabled).toBe(false);
	});
});

describe('SelectEntries — bound-and-reject then unblock', () => {
	it('deselecting A re-enables B', () => {
		render(<SelectEntries />);
		// Select A — B gets disabled
		fireEvent.click(getCheckbox(/Salary — June/));
		expect(getCheckbox(/Consulting — Q2/).disabled).toBe(true);
		// Deselect A — B should be enabled again
		fireEvent.click(getCheckbox(/Salary — June/));
		expect(getCheckbox(/Consulting — Q2/).disabled).toBe(false);
	});
});

describe('SelectEntries — onSelectionChange callback', () => {
	it('fires with correct ids on each selection change', () => {
		const onChange = vi.fn();
		render(<SelectEntries onSelectionChange={onChange} />);

		fireEvent.click(getCheckbox(/Salary — June/));
		expect(onChange).toHaveBeenCalledTimes(1);
		const firstCall = onChange.mock.calls[0][0] as string[];
		expect(firstCall).toContain('entry-a');

		fireEvent.click(getCheckbox(/Bonus — H1/));
		expect(onChange).toHaveBeenCalledTimes(2);
		const secondCall = onChange.mock.calls[1][0] as string[];
		expect(secondCall).toContain('entry-a');
		expect(secondCall).toContain('entry-c');
	});

	it('fires with empty array after deselecting all', () => {
		const onChange = vi.fn();
		render(<SelectEntries onSelectionChange={onChange} />);
		fireEvent.click(getCheckbox(/Salary — June/));
		fireEvent.click(getCheckbox(/Salary — June/));
		const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
		expect(lastCall).toEqual([]);
	});
});

describe('SelectEntries — scope honesty (AC-4)', () => {
	it('count string, disclaimer present, no forbidden words outside disclaimer with A+C selected', () => {
		const { container } = render(<SelectEntries />);
		fireEvent.click(getCheckbox(/Salary — June/));
		fireEvent.click(getCheckbox(/Bonus — H1/));

		// Count string present
		expect(screen.getByTestId('entry-count').textContent).toContain('2 of 4 entries selected');

		// Disclaimer present verbatim inside the note element
		const noteEl = container.querySelector('[role="note"]') as HTMLElement;
		expect(noteEl).not.toBeNull();
		expect(noteEl.textContent).toContain(
			'Proves a selected sum — not total income, nor which entries were included.',
		);

		// No forbidden words outside the disclaimer
		const noteText = noteEl?.textContent ?? '';
		const fullText = container.textContent ?? '';
		// Remove note text to get text outside disclaimer
		const outsideText = fullText.replace(noteText, '');

		expect(outsideText.toLowerCase()).not.toMatch(/\btotal\b/);
		expect(outsideText.toLowerCase()).not.toMatch(/\bincome\b/);
		expect(outsideText.toLowerCase()).not.toMatch(/\bnet\b/);
	});
});
