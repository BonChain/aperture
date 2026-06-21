// apps/web/src/lenses/AuditorLens.tsx
import { CipherCell } from '../shared/components/CipherCell';
import { NoticeDisclaimer } from '../shared/components/NoticeDisclaimer';
import { SIGNATURE_CIPHER } from '../shared/fixtures';
import { space } from '../theme/tokens';

/**
 * Auditor lens stub (AC-1, AC-5).
 *
 * Trust boundary: CipherCell masked (Auditor accesses via designated audit flow — future story).
 * Honest stub — Auditor console is coming soon (hackathon demo scope).
 */
export default function AuditorLens() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: space.s6 }}>
			{/* Trust-boundary fixture — same cipherId, masked state for Auditor (AC-5) */}
			<div
				data-testid="trust-boundary"
				data-role="auditor"
				data-trust-scope="auditor: designated audit scope"
				style={{ display: 'flex', alignItems: 'center', gap: space.s3 }}
			>
				<span className="type-label">Auditor lens — amount sealed</span>
				<CipherCell
					cipherId={SIGNATURE_CIPHER.cipherId}
					value={SIGNATURE_CIPHER.value}
					state="masked"
				/>
			</div>

			<NoticeDisclaimer>Auditor console — coming soon.</NoticeDisclaimer>
		</div>
	);
}
