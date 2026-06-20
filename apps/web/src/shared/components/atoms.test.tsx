import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ButtonPrimary } from './ButtonPrimary';
import { ButtonRole } from './ButtonRole';
import { NoticeDisclaimer } from './NoticeDisclaimer';
import { RoleBanner } from './RoleBanner';
import { StatusBadge } from './StatusBadge';

describe('RoleBanner (DR4)', () => {
	it('washes the active role muted + accent left-border and states the lens', () => {
		const { container } = render(<RoleBanner role="auditor" label="Auditor lens — designated read only" />);
		const banner = container.querySelector('[data-component="role-banner"]') as HTMLElement;
		expect(banner).toHaveAttribute('data-role', 'auditor');
		expect(banner).toHaveTextContent('Auditor lens — designated read only');
		expect(banner.style.background).toBe('var(--role-auditor-muted)');
		expect(banner.style.borderLeft).toContain('var(--role-auditor)');
	});
});

describe('ButtonPrimary (DR6)', () => {
	it('primary variant uses trust-blue from tokens', () => {
		render(<ButtonPrimary>Verify</ButtonPrimary>);
		const btn = screen.getByRole('button', { name: 'Verify' });
		expect(btn.style.background).toBe('var(--primary)');
		expect(btn.style.color).toBe('var(--primary-foreground)');
	});

	it('secondary variant inherits neutral border-strong / ink-secondary', () => {
		render(<ButtonPrimary variant="secondary">Export</ButtonPrimary>);
		const btn = screen.getByRole('button', { name: 'Export' });
		expect(btn.style.color).toBe('var(--ink-secondary)');
		expect(btn.style.border).toContain('var(--border-strong)');
	});
});

describe('ButtonRole (DR6)', () => {
	it('fills with the active role accent + its foreground', () => {
		render(<ButtonRole role="payer">Execute payment run</ButtonRole>);
		const btn = screen.getByRole('button', { name: 'Execute payment run' });
		expect(btn.style.background).toBe('var(--role-payer)');
		expect(btn.style.color).toBe('var(--role-payer-foreground)');
	});
});

describe('StatusBadge (DR7)', () => {
	it('renders one verdict with a text-redundant dot (a11y beyond color)', () => {
		render(<StatusBadge verdict="verified" />);
		const badge = screen.getByRole('img', { name: 'Verified' });
		expect(badge).toHaveAttribute('data-verdict', 'verified');
		expect(badge).toHaveTextContent('Verified');
		expect(badge.style.background).toBe('var(--verified)');
	});

	it('supports a failed verdict with a label override', () => {
		render(<StatusBadge verdict="failed" label="Doesn't verify" />);
		expect(screen.getByRole('img', { name: "Doesn't verify" })).toHaveTextContent("Doesn't verify");
	});
});

describe('NoticeDisclaimer (DR8)', () => {
	it('is a sober note with an info glyph — never a warning triangle, never red', () => {
		const { container } = render(
			<NoticeDisclaimer>Proves a selected sum — not total income.</NoticeDisclaimer>,
		);
		const note = screen.getByRole('note');
		expect(note.style.color).toBe('var(--notice)');
		expect(note.style.background).toBe('var(--surface-overlay)');
		expect(container.querySelector('[data-glyph="info"]')).not.toBeNull();
		expect(container.querySelector('[data-glyph="warning"]')).toBeNull();
	});
});
