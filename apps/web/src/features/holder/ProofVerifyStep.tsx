// apps/web/src/features/holder/ProofVerifyStep.tsx
//
// Step 4 of the guided flow: the verifier checks the holder's proof WITHOUT the
// holder's secret key. Reuses the real verify seam (shared/adapters/verifyAdapter)
// — off-chain verify runs in-browser; on-chain is exercised by the devnet test
// suite (the app degrades gracefully when no backend is configured).

import { useState } from 'react';

import { runVerify, type VerifyInput } from '../../shared/adapters/verifyAdapter';
import { ButtonPrimary } from '../../shared/components/ButtonPrimary';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { usd } from '../../shared/format';
import { color, space } from '../../theme/tokens';
import type { GenerateProofResult } from './ProofGenerator';

type Phase =
	| { tag: 'idle' }
	| { tag: 'loading' }
	| { tag: 'verified'; onChain: 'success' | 'abort:100' | 'unreachable' | null }
	| { tag: 'failed' }
	| { tag: 'error'; message: string };

export interface ProofVerifyStepProps {
	result: GenerateProofResult;
	onVerified?: (ok: boolean) => void;
}

export function ProofVerifyStep({ result, onVerified }: ProofVerifyStepProps) {
	const [phase, setPhase] = useState<Phase>({ tag: 'idle' });

	async function handleVerify() {
		const input: VerifyInput = {
			pk: result.pk,
			ciphertext: result.c1,
			decryptionHandle: result.dh,
			proof: result.proof,
		};
		setPhase({ tag: 'loading' });
		try {
			const r = await runVerify(input, result.amount);
			if (!r.offChain) {
				setPhase({ tag: 'failed' });
				onVerified?.(false);
			} else {
				setPhase({ tag: 'verified', onChain: r.onChain });
				onVerified?.(true);
			}
		} catch (e) {
			setPhase({ tag: 'error', message: e instanceof Error ? e.message : String(e) });
		}
	}

	return (
		<div
			data-testid="proof-verify-step"
			style={{ display: 'flex', flexDirection: 'column', gap: space.s3 }}
		>
			<p className="type-caption" style={{ color: color.inkSecondary, margin: 0 }}>
				The verifier checks the proof — no secret key is used.
			</p>

			{phase.tag === 'idle' && (
				<ButtonPrimary onClick={() => void handleVerify()} data-action="verify-proof">
					Verify the proof
				</ButtonPrimary>
			)}

			{phase.tag === 'loading' && (
				<p className="type-body" role="status" aria-live="polite" aria-busy="true" style={{ margin: 0 }}>
					Verifying…
				</p>
			)}

			{phase.tag === 'verified' && (
				<div
					data-testid="verify-result-verified"
					style={{ display: 'flex', flexDirection: 'column', gap: space.s2 }}
				>
					<StatusBadge verdict="verified" label="Verified" />
					<span className="type-caption" style={{ color: color.inkSecondary }}>
						The total is {usd(result.amount)} — confirmed without revealing the individual entries.
						{phase.onChain === null &&
							' Off-chain verified in the browser; on-chain verify runs in the devnet test suite.'}
						{phase.onChain === 'success' && ' On-chain verification passed.'}
					</span>
				</div>
			)}

			{phase.tag === 'failed' && (
				<div data-testid="verify-result-failed">
					<StatusBadge verdict="failed" label="Doesn't verify" />
				</div>
			)}

			{phase.tag === 'error' && (
				<p className="type-caption" style={{ color: color.notice, margin: 0 }}>
					{phase.message}
				</p>
			)}
		</div>
	);
}
