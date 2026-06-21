import type { CSSProperties } from 'react';

import { NoticeDisclaimer } from '../../shared/components/NoticeDisclaimer';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { color, glassStrong, radius, space, typeClass } from '../../theme/tokens';
import { usd } from '../../shared/format';
import type { DemoRequest } from './demoRequest';

export interface VerifierRequestCardProps {
	request: DemoRequest;
	/** Set when proof is generated; undefined until then. */
	provedAmount?: bigint;
	/** Undefined or 'pending' = idle; 'verified' or 'failed' = terminal result. */
	verifyResult?: 'verified' | 'failed' | 'pending';
}

const cardStyle: CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: space.s4,
	...glassStrong,
	borderRadius: radius.lg,
	padding: `${space.s4} ${space.s5}`,
};

const rolePillStyle: CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	background: color.roleAuditorMuted,
	color: color.roleAuditor,
	borderRadius: radius.full,
	padding: `${space.s1} ${space.s3}`,
	fontSize: '11px',
	fontWeight: 600,
	letterSpacing: '0.04em',
	textTransform: 'uppercase',
};

const DISCLAIMER =
	'The proof shows the selected sum only — not total income or which entries were included.';

/**
 * VerifierRequestCard — Story 4.4
 *
 * Read-only display of the verifier's proof request. Shows the requester's ask,
 * required amount, current proof status, and the scoped-claim honesty notice.
 * No interactive elements (UX-DR24). No @mysten/* or node:* imports (AR-14, AR-15).
 */
export function VerifierRequestCard({
	request,
	provedAmount,
	verifyResult,
}: VerifierRequestCardProps) {
	const isIdle = verifyResult === undefined || verifyResult === 'pending';

	return (
		<div data-testid="verifier-request-card" style={cardStyle}>
			{/* 1. Header row: role pill + requester name */}
			<div style={{ display: 'flex', alignItems: 'center', gap: space.s3, flexWrap: 'wrap' }}>
				<span aria-label="Role: Verifier" style={rolePillStyle}>
					Verifier
				</span>
				<span className={typeClass.heading} style={{ color: color.inkPrimary }}>
					{request.requesterName}
				</span>
			</div>

			{/* 2. Request message */}
			<p
				className={typeClass.body}
				style={{ color: color.inkSecondary, margin: 0 }}
			>
				{request.message}
			</p>

			{/* 3. Required amount */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: space.s1 }}>
				<span className={typeClass.label} style={{ color: color.inkSecondary }}>
					Requested amount
				</span>
				<span className={typeClass.dataLg} style={{ color: color.inkPrimary }}>
					{usd(request.requiredAmount)}
				</span>
			</div>

			{/* 4. Status slot */}
			<div data-testid="verdict-area">
				{isIdle ? (
					<span
						className={typeClass.label}
						style={{ color: color.inkDisabled }}
					>
						Awaiting proof…
					</span>
				) : verifyResult === 'verified' ? (
					<div style={{ display: 'flex', flexDirection: 'column', gap: space.s2 }}>
						<StatusBadge verdict="verified" label="Verified — request satisfied" />
						{provedAmount !== undefined && (
							<span className={typeClass.dataLg} style={{ color: color.inkPrimary }}>
								{usd(provedAmount)}
							</span>
						)}
					</div>
				) : (
					<StatusBadge verdict="failed" label="Doesn't verify" />
				)}
			</div>

			{/* 5. Scoped-claim disclaimer — always visible (NFR-9) */}
			<NoticeDisclaimer>{DISCLAIMER}</NoticeDisclaimer>
		</div>
	);
}
