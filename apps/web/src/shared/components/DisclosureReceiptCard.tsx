import type { CSSProperties, ReactNode } from 'react';

import { color, radius, space } from '../../theme/tokens';

export interface DisclosureReceiptCardProps {
	/** Holder public key slot. */
	holder?: ReactNode;
	/** Disclosed value `X` — the one prominent figure (`data-lg`). */
	disclosed?: ReactNode;
	/** Included-entry COUNT only — never which entries. */
	includedCount?: ReactNode;
	/** Truncated proof blob, sits in a `surface-sunken` well. */
	proofBlob?: ReactNode;
	/** Result badge slot (StatusBadge in Verify). */
	result?: ReactNode;
}

const labelStyle: CSSProperties = { color: color.inkSecondary };

/**
 * Mode B export artifact card FRAME (DR11): holder pubkey, disclosed `X` in
 * `data-lg`, included-count slot, truncated proof-blob well, result badge slot.
 * Story 1.0 lays out the frame/slots only; real proof data binds in Story 3.5.
 */
export function DisclosureReceiptCard({
	holder,
	disclosed,
	includedCount,
	proofBlob,
	result,
}: DisclosureReceiptCardProps) {
	const card: CSSProperties = {
		display: 'flex',
		flexDirection: 'column',
		gap: space.s4,
		background: color.surfaceRaised,
		border: `1px solid ${color.borderHairline}`,
		borderRadius: radius.lg,
		padding: space.s6,
	};
	const well: CSSProperties = {
		background: color.surfaceSunken,
		border: `1px solid ${color.borderHairline}`,
		borderRadius: radius.sm,
		padding: space.s3,
		color: color.inkSecondary,
		overflowWrap: 'anywhere',
	};
	return (
		<div data-component="disclosure-receipt-card" style={card}>
			<div>
				<div className="type-label" style={labelStyle}>
					Holder
				</div>
				<div className="type-data" data-slot="holder">
					{holder}
				</div>
			</div>
			<div>
				<div className="type-label" style={labelStyle}>
					Disclosed value
				</div>
				<div className="type-data-lg" data-slot="disclosed" style={{ color: color.inkPrimary }}>
					{disclosed}
				</div>
			</div>
			<div>
				<div className="type-label" style={labelStyle}>
					Entries included
				</div>
				<div className="type-data" data-slot="included-count">
					{includedCount}
				</div>
			</div>
			<div>
				<div className="type-label" style={labelStyle}>
					Proof
				</div>
				<div className="type-data" data-slot="proof-blob" style={well}>
					{proofBlob}
				</div>
			</div>
			<div data-slot="result">{result}</div>
		</div>
	);
}
