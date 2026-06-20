import type { CSSProperties, ReactNode } from 'react';

import { color, space } from '../../theme/tokens';

export interface AuditLogRowProps {
	/** Row content slot (who / action / when / designation). Frame only in 1.0. */
	children?: ReactNode;
	/** Whether to render the hash-chain link marker (false for the genesis row). */
	chained?: boolean;
}

/**
 * Append-only, read-only audit-log row FRAME (DR10). Carries a faint `chain-marker`
 * glyph linking each entry to the previous (the visual analog of the SHA-256
 * chain). **No edit/delete affordance ever renders** — not even as a stub (UX-DR24).
 */
export function AuditLogRow({ children, chained = true }: AuditLogRowProps) {
	const row: CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		gap: space.s3,
		background: color.surfaceSunken,
		borderBottom: `1px solid ${color.borderHairline}`,
		padding: `${space.rowY} ${space.s4}`,
	};
	const marker: CSSProperties = {
		color: color.inkDisabled,
		fontFamily: 'var(--font-data)',
		flexShrink: 0,
		display: chained ? 'inline' : 'none',
	};
	return (
		<div data-component="audit-log-row" className="type-data" style={row}>
			<span aria-hidden="true" data-glyph="chain-marker" title="hash-chain link" style={marker}>
				⛓
			</span>
			<div style={{ flex: 1 }}>{children}</div>
		</div>
	);
}
