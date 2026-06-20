import type { CSSProperties, ReactNode } from 'react';

import { color, radius, space } from '../../theme/tokens';

export interface NoticeDisclaimerProps {
	children: ReactNode;
}

/**
 * Honesty disclaimer (DR8): bordered block on `surface-overlay`, neutral `notice`
 * slate text, an **info** glyph (never a warning triangle, never red). Carries the
 * scoped-claim disclaimer and privacy-posture notes — sober, informational.
 */
export function NoticeDisclaimer({ children }: NoticeDisclaimerProps) {
	const style: CSSProperties = {
		display: 'flex',
		alignItems: 'flex-start',
		gap: space.s3,
		background: color.surfaceOverlay,
		border: `1px solid ${color.borderStrong}`,
		borderRadius: radius.md,
		color: color.notice,
		padding: `${space.s3} ${space.s4}`,
	};
	return (
		<div role="note" className="type-body" style={style}>
			{/* Info glyph — explicitly NOT a warning triangle. */}
			<svg
				data-glyph="info"
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				stroke={color.notice}
				strokeWidth="1.5"
				aria-hidden="true"
				style={{ flexShrink: 0, marginTop: '2px' }}
			>
				<circle cx="8" cy="8" r="6.5" />
				<line x1="8" y1="7" x2="8" y2="11" />
				<circle cx="8" cy="4.75" r="0.75" fill={color.notice} stroke="none" />
			</svg>
			<span>{children}</span>
		</div>
	);
}
