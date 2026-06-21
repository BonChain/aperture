// apps/web/src/lenses/AuditorLens.tsx
import { CipherCell } from '../shared/components/CipherCell';
import { NoticeDisclaimer } from '../shared/components/NoticeDisclaimer';
import { RoleBanner } from '../shared/components/RoleBanner';
import { SIGNATURE_CIPHER } from '../shared/fixtures';
import { color, radius, space } from '../theme/tokens';
import { VerifyProof, type VerifyProofInitial } from '../features/auditor/VerifyProof';
import { ProofTrace } from '../features/auditor/ProofTrace';
import type { GenerateProofResult } from '../features/holder/ProofGenerator';

function toHex(b: Uint8Array): string {
	let out = '';
	for (const byte of b) out += byte.toString(16).padStart(2, '0');
	return out;
}

export interface AuditorLensProps {
	/** The most recent proof generated in the Holder lens — pre-fills the form. */
	proof?: GenerateProofResult | null;
}

/**
 * Auditor lens (AC-1, AC-5, Story 3.3).
 *
 * Trust boundary: CipherCell masked (Auditor accesses via designated audit flow).
 * Renders the VerifyProof panel so the Auditor can verify a holder's proof
 * without the holder's secret key (FR-17, AR-6). When the holder has just
 * generated a proof, the fields arrive pre-filled and verify on devnet.
 */
export default function AuditorLens({ proof }: AuditorLensProps = {}) {
	const initial: VerifyProofInitial | undefined = proof
		? {
				pubkeyHex: toHex(proof.pk),
				ciphertextHex: toHex(proof.c1),
				dhHex: toHex(proof.dh),
				amountStr: proof.amount.toString(),
				proofHex: toHex(proof.proof),
			}
		: undefined;

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
				<span className="type-label">Verifier — confirms the total, never holds the key</span>
				<CipherCell
					cipherId={SIGNATURE_CIPHER.cipherId}
					value={SIGNATURE_CIPHER.value}
					state="masked"
				/>
			</div>

			{initial && (
				<div
					data-testid="prefilled-from-holder"
					className="type-caption"
					style={{
						padding: `${space.s2} ${space.s3}`,
						background: 'var(--glass-bg)',
						backdropFilter: 'blur(var(--glass-blur))',
						WebkitBackdropFilter: 'blur(var(--glass-blur))',
						border: `1px solid ${color.roleHolder}`,
						borderRadius: radius.md,
						color: color.roleHolder,
					}}
				>
					Loaded from the holder's proof — verify it below, including on devnet.
				</div>
			)}

			{/* Story 3.3: Verify panel — pre-filled from the holder, or paste proof hex */}
			<VerifyProof initial={initial} />

			{/* Trace the data on the proof — statement + components + Suiscan link */}
			{proof && <ProofTrace proof={proof} />}

			<NoticeDisclaimer>Verifier uses the public key + ciphertext only — secret key never leaves the holder.</NoticeDisclaimer>
		</div>
	);
}
