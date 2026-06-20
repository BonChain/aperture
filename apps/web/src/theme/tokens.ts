/**
 * Typed token map — mirrors src/theme/tokens.css.
 *
 * Every value is a `var(--token)` reference, never a raw hex/px literal, so any
 * component that styles itself through this map is guaranteed token-driven. This
 * is the TypeScript half of the AC-1 contract ("named CSS variables + a typed
 * token map; no hex literals in components"). Aperture tokens win over kaisho.
 */

export const color = {
	surfaceBase: 'var(--surface-base)',
	surfaceRaised: 'var(--surface-raised)',
	surfaceOverlay: 'var(--surface-overlay)',
	surfaceSunken: 'var(--surface-sunken)',

	inkPrimary: 'var(--ink-primary)',
	inkSecondary: 'var(--ink-secondary)',
	inkDisabled: 'var(--ink-disabled)',
	inkInverse: 'var(--ink-inverse)',

	borderHairline: 'var(--border-hairline)',
	borderStrong: 'var(--border-strong)',

	primary: 'var(--primary)',
	primaryHover: 'var(--primary-hover)',
	primaryForeground: 'var(--primary-foreground)',
	ring: 'var(--ring)',

	verified: 'var(--verified)',
	verifiedForeground: 'var(--verified-foreground)',
	failed: 'var(--failed)',
	failedForeground: 'var(--failed-foreground)',
	notice: 'var(--notice)',

	cipherMasked: 'var(--cipher-masked)',
	cipherReveal: 'var(--cipher-reveal)',

	// Role accent triads — static entries mirror CSS vars; roleAccent() is a convenience helper.
	rolePayer: 'var(--role-payer)',
	rolePayerForeground: 'var(--role-payer-foreground)',
	rolePayerMuted: 'var(--role-payer-muted)',
	roleHolder: 'var(--role-holder)',
	roleHolderForeground: 'var(--role-holder-foreground)',
	roleHolderMuted: 'var(--role-holder-muted)',
	roleAuditor: 'var(--role-auditor)',
	roleAuditorForeground: 'var(--role-auditor-foreground)',
	roleAuditorMuted: 'var(--role-auditor-muted)',
} as const;

export const space = {
	s1: 'var(--space-1)',
	s2: 'var(--space-2)',
	s3: 'var(--space-3)',
	s4: 'var(--space-4)',
	s5: 'var(--space-5)',
	s6: 'var(--space-6)',
	s8: 'var(--space-8)',
	s10: 'var(--space-10)',
	s12: 'var(--space-12)',
	s16: 'var(--space-16)',
	gutter: 'var(--gutter)',
	pageMargin: 'var(--page-margin)',
	rowY: 'var(--row-y)',
} as const;

export const radius = {
	sm: 'var(--radius-sm)',
	md: 'var(--radius-md)',
	lg: 'var(--radius-lg)',
	full: 'var(--radius-full)',
} as const;

export const font = {
	ui: 'var(--font-ui)',
	data: 'var(--font-data)',
} as const;

/** Typography scale — class names defined in src/theme/typography.css. */
export const typeClass = {
	display: 'type-display',
	heading: 'type-heading',
	body: 'type-body',
	label: 'type-label',
	caption: 'type-caption',
	data: 'type-data',
	dataLg: 'type-data-lg',
} as const;

export type Role = 'payer' | 'holder' | 'auditor';

/** Canonical role order; also the front-door default lives in RoleSwitcher. */
export const ROLES = ['payer', 'holder', 'auditor'] as const satisfies readonly Role[];

export interface RoleAccent {
	accent: string;
	foreground: string;
	muted: string;
}

/** Resolve a role's accent triad to token references (banner, nav, in-lens CTA). */
export function roleAccent(role: Role): RoleAccent {
	return {
		accent: `var(--role-${role})`,
		foreground: `var(--role-${role}-foreground)`,
		muted: `var(--role-${role}-muted)`,
	};
}

/**
 * THE canonical masked→revealed transition spec — authored ONCE here (AC-4) and
 * consumed by Story 2.3 (auditor designated decrypt) and Story 4.1 (cross-lens
 * switch). Those stories must reference this constant, never re-describe it.
 *
 * Reveal is an authorization STATE, not a flourish: the masked `••••` glyph is
 * replaced by the real figure as an instantaneous in-place content swap. There
 * is deliberately NO decrypt-in-place animation and NO hover trigger — both are
 * banned by EXPERIENCE.md (#Interaction Primitives — Banned everywhere).
 */
export const CIPHER_REVEAL_TRANSITION = {
	kind: 'swap',
	durationMs: 0,
	easing: 'none',
	trigger: 'authorization-state',
	note: 'Instantaneous content swap on authorization. No animation, no hover-to-peek.',
} as const;
