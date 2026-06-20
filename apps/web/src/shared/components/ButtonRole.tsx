import type { ButtonHTMLAttributes, CSSProperties } from 'react';

import { radius, roleAccent, space, type Role } from '../../theme/tokens';

export interface ButtonRoleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** Active role — the fill uses this role's accent + its `-foreground`. */
	role: Role;
}

/**
 * In-lens hero CTA (DR6): fill is the *active role's* accent (e.g. amber "Execute
 * payment run" in the Payer lens), text is that role's `-foreground`. `rounded/md`,
 * never a pill.
 */
export function ButtonRole({ role, style, ...rest }: ButtonRoleProps) {
	const accent = roleAccent(role);
	const base: CSSProperties = {
		background: accent.accent,
		color: accent.foreground,
		border: `1px solid ${accent.accent}`,
		borderRadius: radius.md,
		padding: `${space.s2} ${space.s4}`,
		fontFamily: 'inherit',
		fontWeight: 600,
		cursor: rest.disabled ? 'not-allowed' : 'pointer',
		opacity: rest.disabled ? 0.4 : 1,
		...style,
	};
	return <button {...rest} data-role={role} className="type-body" style={base} />;
}
