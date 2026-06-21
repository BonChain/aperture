import { useEffect, useState } from 'react';

import type { SessionKey } from '@aperture/core/proof';

import { deriveSessionKey } from './lib/keys';
import { AuditorLens, HolderLens, PayerLens } from './lenses';
import { RoleSwitcher } from './shared/RoleSwitcher';
import { NoticeDisclaimer } from './shared/components/NoticeDisclaimer';
import type { Role } from './theme/tokens';
import { space } from './theme/tokens';

/**
 * Session key cache — one key per role per browser session.
 * Never written to storage; closing the tab clears all keys (AC-2, D3).
 */
type SessionKeys = Partial<Record<Role, SessionKey>>;

/** Routes the active role to its lens component (AC-1). */
function LensContent({
	role,
	sessionKey,
}: {
	role: Role;
	sessionKey: SessionKey | null;
}) {
	if (role === 'holder') return <HolderLens sessionKey={sessionKey} />;
	if (role === 'payer') return <PayerLens />;
	return <AuditorLens />;
}

export interface AppProps {
	/**
	 * Optional: inject the current wallet address from outside for testing or
	 * future wallet-adapter wiring. When this changes mid-session after a key
	 * has been derived, the wallet-binding guard fires (AC-3).
	 *
	 * TODO Story 4.5: replace with real wallet adapter hook.
	 */
	connectedWalletAddress?: string;
}

/**
 * App root (Story 4.1 — Full Cross-Role Switch & Lens Polish).
 *
 * Wires:
 * - RoleSwitcher → lens router (AC-1, AC-4)
 * - Lazy signing on first role entry (AC-2) — DEMO-STUB until Story 4.5
 * - Session-key cache per role, never persisted (AC-2, D3)
 * - Wallet-binding guard (AC-3)
 * - Front door boots on Holder (AC-4, UX-DR23)
 */
export default function App({ connectedWalletAddress }: AppProps = {}) {
	// Lens router state — boots on Holder (AC-4, UX-DR23).
	const [activeRole, setActiveRole] = useState<Role>('holder');

	// Session keys: derived on first role visit, cached in memory (AC-2).
	const [sessionKeys, setSessionKeys] = useState<SessionKeys>({});

	// Wallet-binding guard state (AC-3).
	const [boundWalletAddress, setBoundWalletAddress] = useState<string | null>(null);
	const [walletSwitched, setWalletSwitched] = useState(false);

	// Detect wallet changes mid-session (AC-3).
	useEffect(() => {
		if (connectedWalletAddress === undefined) return;
		if (boundWalletAddress === null) return;
		if (connectedWalletAddress !== boundWalletAddress) {
			setWalletSwitched(true);
		} else {
			setWalletSwitched(false);
		}
	}, [connectedWalletAddress, boundWalletAddress]);

	// Trigger lazy sign for the initial default role (holder) on mount (AC-4, UX-DR23).
	// Without this, the Holder lens stays in the "Sign to unlock →" state until
	// the user clicks a different role and back — which is wrong for the front door UX.
	useEffect(() => {
		handleRoleChange('holder');
		// Only run once on mount — exhaustive-deps is intentionally suppressed here
		// because re-running on every render would re-derive the key unnecessarily.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function handleRoleChange(role: Role) {
		setActiveRole(role);

		if (sessionKeys[role]) {
			// Session cache hit — no re-sign needed (AC-2).
			return;
		}

		// DEMO-STUB: replace with real signPersonalMessage in Story 4.5.
		// Message contract (AR-8/D3): "Aperture: derive {Role} session key"
		// const signMessage = `Aperture: derive ${ROLE_NAMES[role]} session key`;
		// Deterministic per-role stub bytes so tests can verify key isolation.
		const stubSigBytes = new Uint8Array(64).fill(role === 'holder' ? 1 : role === 'payer' ? 2 : 3);

		try {
			const key = await deriveSessionKey(stubSigBytes, role);
			setSessionKeys((prev) => ({ ...prev, [role]: key }));

			// Bind the wallet address on first successful signature (AC-3).
			if (boundWalletAddress === null) {
				// DEMO-STUB: use a placeholder address until real wallet adapter lands in Story 4.5.
				const address = connectedWalletAddress ?? '0xdemo-wallet-address';
				setBoundWalletAddress(address);
			}
		} catch {
			// Sign failed or was cancelled — leave sessionKeys[role] unset (AC-6).
			// TODO Story 4.5: revert activeRole to the previous role on cancel.
		}
	}

	// Effective session key: null when wallet has switched mid-session (AC-3).
	const effectiveKey = walletSwitched ? null : (sessionKeys[activeRole] ?? null);

	return (
		<RoleSwitcher defaultRole="holder" onRoleChange={handleRoleChange}>
			<div
				data-testid="app-lens-content"
				style={{ display: 'flex', flexDirection: 'column', gap: space.s4 }}
			>
				{/* Non-production disclaimer — always visible (NFR-8, AC-4). */}
				<NoticeDisclaimer>Demo keypairs — not for production use</NoticeDisclaimer>

				{/* Wallet-binding warning (AC-3). */}
				{walletSwitched && (
					<NoticeDisclaimer>
						Switching wallets mid-session breaks proof verification. Reconnect with the original
						wallet.
					</NoticeDisclaimer>
				)}

				<LensContent role={activeRole} sessionKey={effectiveKey} />
			</div>
		</RoleSwitcher>
	);
}
