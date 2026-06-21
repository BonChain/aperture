// apps/web/src/lenses/AuditorLens.tsx
import { CipherCell } from '../shared/components/CipherCell';
import { NoticeDisclaimer } from '../shared/components/NoticeDisclaimer';
import { RoleBanner } from '../shared/components/RoleBanner';
import { SIGNATURE_CIPHER } from '../shared/fixtures';
import { space } from '../theme/tokens';
import { VerifyProof } from '../features/auditor/VerifyProof';

/**
 * Auditor lens (AC-1, AC-5, Story 3.3).
 *
 * Trust boundary: CipherCell masked (Auditor accesses via designated audit flow).
 * Renders the VerifyProof panel so the Auditor can verify a holder's proof
 * without the holder's secret key (FR-17, AR-6).
 */
export default function AuditorLens() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: space.s6 }}>
			<RoleBanner role="auditor" label="Auditor lens — designated read only" />

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

			{/* Story 3.3: Verify panel — paste proof hex to verify without secret key */}
			<VerifyProof />

			<NoticeDisclaimer>Verifier uses the public key + ciphertext only — secret key never leaves the holder.</NoticeDisclaimer>
		</div>
	);
}
