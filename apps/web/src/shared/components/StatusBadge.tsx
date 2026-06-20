import type { CSSProperties } from 'react';

import { color, radius, space } from '../../theme/tokens';

export type Verdict = 'verified' | 'failed';

export interface StatusBadgeProps {
	/** One real verdict per badge — emerald `verified` or rose `failed`. Never decorative. */
	verdict: Verdict;
	/** Optional label override; defaults to "Verified" / "Failed". */
	label?: string;
}

const PALETTE: Record<Verdict, { bg: string; fg: string; defaultLabel: string }> = {
	verified: { bg: color.verified, fg: color.verifiedForeground, defaultLabel: 'Verified' },
	failed: { bg: color.failed, fg: color.failedForeground, defaultLabel: 'Failed' },
};

/**
 * Verdict badge (DR7): `rounded/full`, dot + text, one verdict per badge. The dot
 * is text-redundant so the verdict survives without color (a11y).
 */
export function StatusBadge({ verdict, label }: StatusBadgeProps) {
	const p = PALETTE[verdict];
	const style: CSSProperties = {
		display: 'inline-flex',
		alignItems: 'center',
		gap: space.s2,
		background: p.bg,
		color: p.fg,
		borderRadius: radius.full,
		padding: `${space.s1} ${space.s3}`,
	};
	const dot: CSSProperties = {
		width: space.s2,
		height: space.s2,
		borderRadius: radius.full,
		background: p.fg,
	};
	return (
		<span role="img" aria-label={label ?? p.defaultLabel} data-verdict={verdict} className="type-label" style={style}>
			<span aria-hidden="true" style={dot} />
			{label ?? p.defaultLabel}
		</span>
	);
}
