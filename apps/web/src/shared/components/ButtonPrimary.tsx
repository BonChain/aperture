import type { ButtonHTMLAttributes, CSSProperties } from 'react';

import { color, radius, space } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonPrimaryProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** `primary` = trust-blue system action; `secondary`/`ghost` = neutral chrome. */
	variant?: ButtonVariant;
}

function variantStyle(variant: ButtonVariant): CSSProperties {
	switch (variant) {
		case 'secondary':
			return {
				background: 'transparent',
				color: color.inkSecondary,
				border: `1px solid ${color.borderStrong}`,
			};
		case 'ghost':
			return {
				background: 'transparent',
				color: color.inkSecondary,
				border: '1px solid transparent',
			};
		case 'primary':
		default:
			return {
				background: color.primary,
				color: color.primaryForeground,
				border: `1px solid ${color.primary}`,
			};
	}
}

/**
 * System-action button (DR6): Trust-Blue fill, white text, `rounded/md`. Used for
 * Sign / Verify / Export — role-independent. No pill shape. `secondary`/`ghost`
 * inherit neutral `border-strong` / `ink-secondary`.
 */
export function ButtonPrimary({ variant = 'primary', style, ...rest }: ButtonPrimaryProps) {
	const base: CSSProperties = {
		borderRadius: radius.md,
		padding: `${space.s2} ${space.s4}`,
		fontFamily: 'inherit',
		fontWeight: 600,
		cursor: rest.disabled ? 'not-allowed' : 'pointer',
		opacity: rest.disabled ? 0.4 : 1,
		...variantStyle(variant),
		...style,
	};
	return <button {...rest} className="type-body" style={base} />;
}
