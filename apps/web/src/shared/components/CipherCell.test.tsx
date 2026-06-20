import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CipherCell } from './CipherCell';

describe('CipherCell — masked state (AC-3, AC-8)', () => {
	it('renders fixed-width dots in cipher-masked and announces sealed beyond color', () => {
		const { container } = render(<CipherCell cipherId="c1" value="3,000.00" />);
		const cell = container.querySelector('[data-cipher-id="c1"]')!;
		expect(cell).toHaveAttribute('data-cipher-state', 'masked');
		expect(cell).toHaveAttribute('data-sealed', 'true');
		expect(cell).toHaveAttribute('aria-label', 'Sealed value');
		// Glyph distinguishes sealed beyond color (a11y).
		const dots = cell.querySelector('[data-glyph="dots"]')!;
		expect(dots.textContent).toBe('••••••••');
		expect((cell as HTMLElement).style.color).toBe('var(--cipher-masked)');
	});
});

describe('CipherCell — revealed state (AC-3, AC-8)', () => {
	it('shows the real figure with the unlock marker and is no longer sealed', () => {
		const { container } = render(<CipherCell cipherId="c1" value="3,000.00" state="revealed" />);
		const cell = container.querySelector('[data-cipher-id="c1"]')!;
		expect(cell).toHaveAttribute('data-cipher-state', 'revealed');
		expect(cell).toHaveAttribute('data-sealed', 'false');
		expect(cell.textContent).toContain('3,000.00');
		// Unlock marker glyph — revealed is distinguishable beyond color.
		expect(cell.querySelector('[data-glyph="unlock"]')).not.toBeNull();
		expect((cell as HTMLElement).style.color).toBe('var(--ink-primary)');
	});
});

describe('CipherCell — no column reflow on reveal (AC-3)', () => {
	it('reserves the maskWidth even when the revealed value is shorter, so the column never reflows', () => {
		// Short value (4 chars) with a wide maskWidth (12) — masked and revealed must have the same minWidth.
		const masked = render(<CipherCell cipherId="a" value="1.00" maskWidth={12} />);
		const revealed = render(<CipherCell cipherId="b" value="1.00" maskWidth={12} state="revealed" />);
		const w1 = (masked.container.firstChild as HTMLElement).style.minWidth;
		const w2 = (revealed.container.firstChild as HTMLElement).style.minWidth;
		expect(w1).toBe(w2);
		expect(w1).toBe('12ch');
	});

	it('reserves the value length when it exceeds maskWidth', () => {
		const masked = render(<CipherCell cipherId="c" value="1,234,567.89 USDC" maskWidth={8} />);
		const revealed = render(<CipherCell cipherId="d" value="1,234,567.89 USDC" maskWidth={8} state="revealed" />);
		const w1 = (masked.container.firstChild as HTMLElement).style.minWidth;
		const w2 = (revealed.container.firstChild as HTMLElement).style.minWidth;
		expect(w1).toBe(w2);
		expect(w1).toMatch(/^\d+ch$/);
	});
});

describe('CipherCell — identity invariant (AC-4)', () => {
	it('carries the same stable cipherId masked in one lens and revealed in another', () => {
		const sealed = render(<CipherCell cipherId="shared-anchor" value="9.00" />);
		const open = render(<CipherCell cipherId="shared-anchor" value="9.00" state="revealed" />);
		const idA = sealed.container.querySelector('[data-cipher-id]')!.getAttribute('data-cipher-id');
		const idB = open.container.querySelector('[data-cipher-id]')!.getAttribute('data-cipher-id');
		expect(idA).toBe('shared-anchor');
		expect(idA).toBe(idB);
	});
});

describe('CipherCell — error state', () => {
	it('renders an error marker and status role', () => {
		const { container } = render(<CipherCell cipherId="e" state="error" />);
		const cell = container.querySelector('[data-cipher-id="e"]')!;
		expect(cell).toHaveAttribute('data-cipher-state', 'error');
		expect(cell.querySelector('[data-glyph="error"]')).not.toBeNull();
	});
});
