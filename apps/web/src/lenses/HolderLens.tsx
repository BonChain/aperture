// apps/web/src/lenses/HolderLens.tsx
import { useState } from 'react';

import type { SessionKey } from '@aperture/core/proof';

import { ButtonPrimary } from '../shared/components/ButtonPrimary';
import { CipherCell } from '../shared/components/CipherCell';
import { StepRail } from '../shared/components/StepRail';
import { IconArrowRight } from '../shared/components/icons';
import { SIGNATURE_CIPHER } from '../shared/fixtures';
import { useWalletSession } from '../shared/wallet/walletSession';
import { usd } from '../shared/format';
import { color, glassStrong, radius, space } from '../theme/tokens';
import { SelectEntries } from '../features/holder/SelectEntries';
import { DEMO_REQUEST } from '../features/holder/demoRequest';
import { VerifierRequestCard } from '../features/holder/VerifierRequestCard';
import {
	ProofGenerator,
	type GenerateProofResult,
} from '../features/holder/ProofGenerator';
import { ProofVerifyStep } from '../features/holder/ProofVerifyStep';
import { MOCK_ENTRIES } from '../features/holder/mockEntries';
import { FLOW_STEPS } from '../features/holder/steps';

export interface HolderLensProps {
	/**
	 * Test/override hook. When provided (including `null`) it wins over the wallet
	 * context: `null` forces the locked Connect step, a key unlocks the flow.
	 */
	sessionKey?: SessionKey | null;
	/** Called whenever a fresh proof is generated — lifted so the Auditor can verify it. */
	onProofGenerated?: (result: GenerateProofResult) => void;
	/** Jump to the Verifier (Auditor) lens — the proof is already pre-filled there. */
	onGoToVerifier?: () => void;
}

/** Small section heading used inside the unlocked work area. */
function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<span className="type-label" style={{ color: color.inkSecondary }}>
			{children}
		</span>
	);
}

/**
 * Holder lens — guided Proof-of-Figure flow (Connect → Select → Generate →
 * Verify → Done). Each step carries its own explanation; the proof is handed
 * straight to an inline verify step, and the result flows back to the request
 * card so the loop closes on screen.
 */
export default function HolderLens({ sessionKey, onProofGenerated, onGoToVerifier }: HolderLensProps) {
	const wallet = useWalletSession();
	const key = sessionKey !== undefined ? sessionKey : wallet.sessionKey;

	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [proofResult, setProofResult] = useState<GenerateProofResult | null>(null);
	const [verified, setVerified] = useState<boolean | null>(null);

	const totalAmount = MOCK_ENTRIES.filter((e) => selectedIds.includes(e.id)).reduce(
		(acc, e) => acc + e.amount,
		0n,
	);

	function handleSelectionChange(ids: string[]) {
		setSelectedIds(ids);
		setProofResult(null);
		setVerified(null);
	}

	let current = 0;
	if (key) {
		if (verified === true) current = 4;
		else if (proofResult) current = 3;
		else if (selectedIds.length > 0) current = 2;
		else current = 1;
	}

	const step = FLOW_STEPS[current];
	const StepIcon = step.Icon;

	const verifyResult =
		verified === true ? 'verified' : verified === false ? 'failed' : proofResult ? 'pending' : undefined;
	const provedAmount = verified === true && proofResult ? proofResult.amount : undefined;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: space.s5 }}>
			{/* Trust-boundary fixture — revealed for the Holder (AC-5) */}
			<div
				data-testid="trust-boundary"
				data-role="holder"
				data-trust-scope="holder: own encrypted entries only"
				style={{ display: 'flex', alignItems: 'center', gap: space.s3 }}
			>
				<span className="type-label" style={{ color: color.inkSecondary }}>
					Your keys — your view
				</span>
				<CipherCell
					cipherId={SIGNATURE_CIPHER.cipherId}
					value={SIGNATURE_CIPHER.value}
					state="revealed"
				/>
			</div>

			<StepRail steps={FLOW_STEPS} current={current} />

			{/* Per-step explanation — what happens here and why it's safe */}
			<div
				style={{
					display: 'flex',
					gap: space.s4,
					alignItems: 'flex-start',
					padding: space.s4,
					...glassStrong,
					borderRadius: radius.lg,
				}}
			>
				<span
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: '40px',
						height: '40px',
						flexShrink: 0,
						borderRadius: radius.md,
						background: color.surfaceOverlay,
						color: color.cipherReveal,
					}}
				>
					<StepIcon size={20} />
				</span>
				<div style={{ display: 'flex', flexDirection: 'column', gap: space.s1 }}>
					<span className="type-label" style={{ color: color.inkSecondary }}>
						Step {current + 1} of {FLOW_STEPS.length}
					</span>
					<span className="type-heading" style={{ color: color.inkPrimary }}>
						{step.title}
					</span>
					<span className="type-body" style={{ color: color.inkSecondary, maxWidth: '640px' }}>
						{step.detail}
					</span>
					<span
						className="type-caption"
						style={{ color: color.cipherReveal, maxWidth: '640px', fontStyle: 'italic' }}
					>
						For example — {step.example}
					</span>
				</div>
			</div>

			{key === null ? (
				/* Step 1 — Connect Slush & sign to unlock (AC-6) */
				<div style={{ display: 'flex', flexDirection: 'column', gap: space.s3, maxWidth: '520px' }}>
					<div>
						<ButtonPrimary
							onClick={() => void wallet.signIn()}
							disabled={wallet.status === 'connecting' || wallet.status === 'signing'}
							data-action="holder-sign-in"
						>
							Sign to unlock →
						</ButtonPrimary>
					</div>
					{(wallet.status === 'connecting' || wallet.status === 'signing') && (
						<p className="type-caption" role="status" aria-live="polite" style={{ margin: 0 }}>
							{wallet.status === 'connecting' ? 'Connecting wallet…' : 'Waiting for signature…'}
						</p>
					)}
					{wallet.error && (
						<p className="type-caption" style={{ color: color.notice, margin: 0 }}>
							{wallet.error}
						</p>
					)}
				</div>
			) : (
				/* Steps 2–5 — the Mode B two-column flow */
				<div style={{ display: 'flex', gap: space.s6, alignItems: 'flex-start' }}>
					<div style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', gap: space.s4 }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: space.s2 }}>
							<SectionLabel>Verifier request</SectionLabel>
							<VerifierRequestCard
								request={DEMO_REQUEST}
								verifyResult={verifyResult}
								provedAmount={provedAmount}
							/>
						</div>

						{/* Live "what you share vs what stays private" — updates as you select */}
						<div
							data-testid="disclosure-summary"
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: space.s3,
								padding: space.s4,
								...glassStrong,
								borderRadius: radius.lg,
							}}
						>
							<div style={{ display: 'flex', flexDirection: 'column', gap: space.s1 }}>
								<span className="type-label" style={{ color: color.verified }}>
									You'll share ✓
								</span>
								<span className="type-data-lg" style={{ color: color.inkPrimary }}>
									{selectedIds.length > 0 ? usd(totalAmount) : '—'}
								</span>
							</div>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: space.s1,
									paddingTop: space.s3,
									borderTop: `1px solid ${color.borderHairline}`,
								}}
							>
								<span className="type-label" style={{ color: color.cipherReveal }}>
									Stays private 🔒
								</span>
								<ul
									style={{ margin: 0, paddingLeft: space.s4, display: 'flex', flexDirection: 'column', gap: space.s1 }}
								>
									<li className="type-caption" style={{ color: color.inkSecondary }}>
										The {MOCK_ENTRIES.length - selectedIds.length} entr
										{MOCK_ENTRIES.length - selectedIds.length === 1 ? 'y' : 'ies'} you didn't pick
									</li>
									<li className="type-caption" style={{ color: color.inkSecondary }}>
										Your balance &amp; other activity
									</li>
									<li className="type-caption" style={{ color: color.inkSecondary }}>
										Your decryption key
									</li>
								</ul>
							</div>
						</div>
					</div>
					<div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: space.s5 }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: space.s2 }}>
							<SectionLabel>Your encrypted entries</SectionLabel>
							<SelectEntries onSelectionChange={handleSelectionChange} />
						</div>

						<ProofGenerator
							selectedIds={selectedIds}
							totalAmount={totalAmount}
							sessionKey={key}
							onProofReady={(r) => {
								setProofResult(r);
								setVerified(null);
								onProofGenerated?.(r);
							}}
						/>

						{proofResult && (
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: space.s2,
									paddingTop: space.s4,
									borderTop: `1px solid ${color.borderHairline}`,
								}}
							>
								<span
									className="type-label"
									style={{ color: color.cipherReveal, display: 'inline-flex', alignItems: 'center', gap: space.s1 }}
								>
									Next: Verify <IconArrowRight size={14} />
								</span>
								<ProofVerifyStep result={proofResult} onVerified={setVerified} />
							</div>
						)}

						{verified === true && (
							<div
								data-testid="flow-done"
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: space.s3,
									padding: space.s4,
									...glassStrong,
									borderRadius: radius.md,
								}}
							>
								<span className="type-label" style={{ color: color.verified }}>
									Done ✓ — the lender has a verified total, and your other entries stay private.
								</span>
								{onGoToVerifier && (
									<ButtonPrimary
										variant="secondary"
										onClick={onGoToVerifier}
										data-action="go-to-verifier"
									>
										See it on the Verifier (devnet) →
									</ButtonPrimary>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
