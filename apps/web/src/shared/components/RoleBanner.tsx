import type { CSSProperties } from 'react';

import { color, radius, roleAccent, space, type Role } from '../../theme/tokens';

export interface RoleBannerProps {
	/** Active lens. Drives the wash + accent left-border (the primary orientation cue). */
	role: Role;
	/** Lens label, e.g. "Auditor lens — designated read only". */
	label: string;
}

/**
 * Full-width strip at the top of each lens (DR4). Background is the active role's
 * `-muted` wash; the left border is the role accent. Changing role changes this
 * banner first — it is wayfinding.
 */
export function RoleBanner({ role, label }: RoleBannerProps) {
	const accent = roleAccent(role);
	const style: CSSProperties = {
		background: accent.muted,
		borderLeft: `3px solid ${accent.accent}`,
		borderRadius: radius.lg,
		color: color.inkPrimary,
		padding: `${space.s3} ${space.s5}`,
	};
	return (
		<div data-component="role-banner" data-role={role} className="type-heading" style={style}>
			{label}
		</div>
	);
}
