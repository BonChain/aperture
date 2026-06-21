// apps/web/src/lenses/PayerLens.tsx
import { CipherCell } from '../shared/components/CipherCell';
import { NoticeDisclaimer } from '../shared/components/NoticeDisclaimer';
import { SIGNATURE_CIPHER } from '../shared/fixtures';
import { space } from '../theme/tokens';

/**
 * Payer lens stub (AC-1, AC-5).
 *
 * Trust boundary: CipherCell masked (Payer does not hold the decryption key).
 * Honest stub — Payment run is coming soon (hackathon demo scope).
 */
export default function PayerLens() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: space.s6 }}>
			{/* Trust-boundary fixture — same cipherId, masked state for Payer (AC-5) */}
			<div
				data-testid="trust-boundary"
				data-role="payer"
				data-trust-scope="payer: organization scope"
				style={{ display: 'flex', alignItems: 'center', gap: space.s3 }}
			>
				<span className="type-label">Payer lens — amount sealed</span>
				<CipherCell
					cipherId={SIGNATURE_CIPHER.cipherId}
					value={SIGNATURE_CIPHER.value}
					state="masked"
				/>
			</div>

			<NoticeDisclaimer>Payment run — coming soon.</NoticeDisclaimer>
		</div>
	);
}
