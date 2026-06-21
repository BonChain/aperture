import { useState } from 'react';

import { AuditorLens, HolderLens, PayerLens } from './lenses';
import type { GenerateProofResult } from './features/holder/ProofGenerator';
import { RoleSwitcher } from './shared/RoleSwitcher';
import { NoticeDisclaimer } from './shared/components/NoticeDisclaimer';
import type { Role } from './theme/tokens';
import { space } from './theme/tokens';

/**
 * App root. Boots on the Holder front door (AC-4, UX-DR23). The Holder lens
 * owns its own wallet session via useWalletSession(). The last proof generated
 * by the Holder is lifted here so the Auditor lens can pre-fill + verify it.
 */
export default function App() {
	const [activeRole, setActiveRole] = useState<Role>('holder');
	const [lastProof, setLastProof] = useState<GenerateProofResult | null>(null);

	function renderLens() {
		if (activeRole === 'holder')
			return (
				<HolderLens
					onProofGenerated={setLastProof}
					onGoToVerifier={() => setActiveRole('auditor')}
				/>
			);
		if (activeRole === 'payer') return <PayerLens />;
		return <AuditorLens proof={lastProof} />;
	}

	return (
		<RoleSwitcher defaultRole="holder" activeRole={activeRole} onRoleChange={setActiveRole}>
			<div
				data-testid="app-lens-content"
				style={{ display: 'flex', flexDirection: 'column', gap: space.s4 }}
			>
				{/* Non-production disclaimer — always visible (NFR-8, AC-4). */}
				<NoticeDisclaimer>Demo keypairs — not for production use</NoticeDisclaimer>

				{renderLens()}
			</div>
		</RoleSwitcher>
	);
}
