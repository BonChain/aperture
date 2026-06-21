// apps/web/src/lenses/HolderLens.tsx
import { useState } from 'react';

import type { SessionKey } from '@aperture/core/proof';

import { ButtonPrimary } from '../shared/components/ButtonPrimary';
import { CipherCell } from '../shared/components/CipherCell';
import { SIGNATURE_CIPHER } from '../shared/fixtures';
import { space } from '../theme/tokens';
import { SelectEntries } from '../features/holder/SelectEntries';
import { DEMO_REQUEST } from '../features/holder/demoRequest';
import { VerifierRequestCard } from '../features/holder/VerifierRequestCard';

export interface HolderLensProps {
	sessionKey: SessionKey | null;
}

/**
 * Holder lens (AC-1, AC-4, AC-5, AC-6).
 *
 * Trust boundary: CipherCell rendered revealed (Holder has the key).
 * If sessionKey is null, key-dependent actions are disabled ("Sign to unlock →").
 * If sessionKey exists, renders the Mode B two-column layout (Story 4.4):
 *   left: VerifierRequestCard, right: SelectEntries + proof flow (Stories 3.1–3.3).
 */
export default function HolderLens({ sessionKey }: HolderLensProps) {
	// Story 4.4: lift verifyResult + provedAmount for two-column layout wiring.
	const [verifyResult, setVerifyResult] = useState<'verified' | 'failed' | 'pending' | undefined>(undefined);
	const [provedAmount, setProvedAmount] = useState<bigint | undefined>(undefined);

	// Suppress unused-var lint until Story 3.3 wires onVerifyComplete into this lens.
	void setVerifyResult;
	void setProvedAmount;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: space.s6 }}>
			{/* Trust-boundary fixture — same cipherId, revealed state for Holder (AC-5) */}
			<div
				data-testid="trust-boundary"
				data-role="holder"
				data-trust-scope="holder: own encrypted entries only"
				style={{ display: 'flex', alignItems: 'center', gap: space.s3 }}
			>
				<span className="type-label">Your keys — your view</span>
				<CipherCell
					cipherId={SIGNATURE_CIPHER.cipherId}
					value={SIGNATURE_CIPHER.value}
					state="revealed"
				/>
			</div>

			{sessionKey === null ? (
				/* Key-dependent action — disabled until signature is obtained (AC-6) */
				<div>
					<ButtonPrimary disabled aria-disabled="true" data-action="sign-to-unlock">
						Sign to unlock →
					</ButtonPrimary>
				</div>
			) : (
				/* Mode B two-column layout — Story 4.4 (UX-DR23) */
				<div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
					{/* Left: VerifierRequestCard (~40%) */}
					<div style={{ flex: '0 0 40%' }}>
						<VerifierRequestCard
							request={DEMO_REQUEST}
							verifyResult={verifyResult}
							provedAmount={provedAmount}
						/>
					</div>
					{/* Right: SelectEntries + ProofGenerator (3.2) + VerifyResult (3.3) */}
					<div style={{ flex: '1' }}>
						<SelectEntries />
						{/* ProofGenerator slots in here in Story 3.2 */}
					</div>
				</div>
			)}
		</div>
	);
}
