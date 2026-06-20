import type { CSSProperties, ReactNode } from 'react';

import { color, radius, space } from '../../theme/tokens';

export interface DataTableProps {
	/** Uppercase `label` column headers. */
	columns: string[];
	/** Row slots (`<tr>`). Story 1.0 binds no real data — frame/rhythm only. */
	children?: ReactNode;
}

/**
 * The workhorse table FRAME (DR9): `surface-sunken` body, uppercase `ink-secondary`
 * `label` headers, `border-hairline` dividers, dense `row-y` padding, monospace
 * `data` cell slots, sticky header. Story 1.0 establishes the frame only — real
 * column/event/proof data binds in later stories (2.3 / 2.4).
 */
export function DataTable({ columns, children }: DataTableProps) {
	const container: CSSProperties = {
		background: color.surfaceSunken,
		border: `1px solid ${color.borderHairline}`,
		borderRadius: radius.md,
		overflow: 'auto',
	};
	const table: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
	const th: CSSProperties = {
		position: 'sticky',
		top: 0,
		background: color.surfaceOverlay,
		color: color.inkSecondary,
		textAlign: 'left',
		padding: `${space.rowY} ${space.s4}`,
		borderBottom: `1px solid ${color.borderHairline}`,
	};
	return (
		<div data-component="data-table" style={container}>
			<table style={table}>
				<thead>
					<tr>
						{columns.map((c, i) => (
							<th key={`${c}-${i}`} scope="col" className="type-label" style={th}>
								{c}
							</th>
						))}
					</tr>
				</thead>
				<tbody>{children}</tbody>
			</table>
		</div>
	);
}
