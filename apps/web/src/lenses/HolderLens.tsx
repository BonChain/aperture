// apps/web/src/lenses/HolderLens.tsx
import type { SessionKey } from '@aperture/core/proof';

import { ButtonPrimary } from '../shared/components/ButtonPrimary';
import { CipherCell } from '../shared/components/CipherCell';
import { SIGNATURE_CIPHER } from '../shared/fixtures';
import { space } from '../theme/tokens';
import { SelectEntries } from '../features/holder/SelectEntries';

export interface HolderLensProps {
	sessionKey: SessionKey | null;
}

/**
 * Holder lens (AC-1, AC-4, AC-5, AC-6).
 *
 * Trust boundary: CipherCell rendered revealed (Holder has the key).
 * If sessionKey is null, key-dependent actions are disabled ("Sign to unlock →").
 * If sessionKey exists, renders the Mode B flow (SelectEntries, Story 3.1+).
 */
export default function HolderLens({ sessionKey }: HolderLensProps) {
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
				/* Mode B flow — SelectEntries receives the session key for proof generation (AC-2) */
				<SelectEntries />
			)}
		</div>
	);
}
