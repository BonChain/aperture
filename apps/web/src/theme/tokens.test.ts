import { describe, expect, it } from 'vitest';

import { CIPHER_REVEAL_TRANSITION, color, radius, roleAccent, ROLES, space } from './tokens';

describe('token map (AC-1)', () => {
	it('exposes every value as a CSS var() reference — never a raw hex literal', () => {
		const all = [...Object.values(color), ...Object.values(space), ...Object.values(radius)];
		for (const v of all) {
			expect(v).toMatch(/^var\(--[a-z0-9-]+\)$/);
			expect(v).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		}
	});

	it('carries the signature trust-boundary pair', () => {
		expect(color.cipherMasked).toBe('var(--cipher-masked)');
		expect(color.cipherReveal).toBe('var(--cipher-reveal)');
	});
});

describe('role accents', () => {
	it('lists the three roles in canonical order', () => {
		expect(ROLES).toEqual(['payer', 'holder', 'auditor']);
	});

	it('resolves each role to its accent triad', () => {
		expect(roleAccent('payer')).toEqual({
			accent: 'var(--role-payer)',
			foreground: 'var(--role-payer-foreground)',
			muted: 'var(--role-payer-muted)',
		});
		expect(roleAccent('auditor').accent).toBe('var(--role-auditor)');
	});
});

describe('canonical reveal transition (AC-4, authored once)', () => {
	it('is an instantaneous authorization-state swap — never a decorative animation', () => {
		expect(CIPHER_REVEAL_TRANSITION.kind).toBe('swap');
		expect(CIPHER_REVEAL_TRANSITION.durationMs).toBe(0);
		expect(CIPHER_REVEAL_TRANSITION.trigger).toBe('authorization-state');
	});
});
