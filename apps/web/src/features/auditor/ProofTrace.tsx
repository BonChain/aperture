// apps/web/src/features/auditor/ProofTrace.tsx
//
// "Trace the data on the proof" — decomposes a proof into the exact arguments
// the on-chain verifier checks: the statement (public key, encrypted amount,
// decryption handle, disclosed figure) and the 128-byte proof split into its
// four components (a ‖ b ‖ z1 ‖ z2). Links to the deployed module on Suiscan,
// and can submit a REAL verify transaction (committed on-chain, traceable).

import { useState } from 'react';

import { aperturePackageId, APERTURE_NETWORK } from '../../shared/aperture';
import { explorerObjectUrl, explorerTxUrl } from '../../shared/explorerLink';
import { usd } from '../../shared/format';
import { useWalletSession } from '../../shared/wallet/walletSession';
import { ButtonPrimary } from '../../shared/components/ButtonPrimary';
import { IconArrowRight } from '../../shared/components/icons';
import { color, glass, radius, space } from '../../theme/tokens';
import type { GenerateProofResult } from '../holder/ProofGenerator';

function toHex(b: Uint8Array): string {
	let out = '';
	for (const byte of b) out += byte.toString(16).padStart(2, '0');
	return out;
}

function trunc(hex: string): string {
	return hex.length <= 22 ? hex : `${hex.slice(0, 12)}…${hex.slice(-8)}`;
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'baseline',
				gap: space.s4,
				padding: `${space.s1} 0`,
			}}
		>
			<span className="type-label" style={{ color: color.inkSecondary }}>
				{label}
			</span>
			<span className="type-data" style={{ color: color.inkPrimary }} title={value}>
				{trunc(value)}
			</span>
		</div>
	);
}

type SubmitState =
	| { tag: 'idle' }
	| { tag: 'submitting' }
	| { tag: 'done'; digest: string; status: 'success' | 'failure' }
	| { tag: 'error'; message: string };

type FaucetState = { tag: 'idle' | 'loading' | 'done' } | { tag: 'error'; message: string };

export function ProofTrace({ proof }: { proof: GenerateProofResult }) {
	const wallet = useWalletSession();
	const [submit, setSubmit] = useState<SubmitState>({ tag: 'idle' });
	const [faucet, setFaucet] = useState<FaucetState>({ tag: 'idle' });

	async function handleFaucet() {
		setFaucet({ tag: 'loading' });
		const res = await wallet.requestFaucet();
		setFaucet('ok' in res ? { tag: 'done' } : { tag: 'error', message: res.error });
	}

	const pkg = aperturePackageId();
	const a = toHex(proof.proof.slice(0, 32));
	const b = toHex(proof.proof.slice(32, 64));
	const z1 = toHex(proof.proof.slice(64, 96));
	const z2 = toHex(proof.proof.slice(96, 128));

	async function handleSubmit() {
		setSubmit({ tag: 'submitting' });
		const res = await wallet.submitOnChain({
			pk: proof.pk,
			ciphertext: proof.c1,
			decryptionHandle: proof.dh,
			proof: proof.proof,
			amount: proof.amount,
		});
		if ('error' in res) setSubmit({ tag: 'error', message: res.error });
		else setSubmit({ tag: 'done', digest: res.digest, status: res.status });
	}

	return (
		<div
			data-testid="proof-trace"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: space.s3,
				padding: space.s4,
				...glass,
				borderRadius: radius.lg,
			}}
		>
			<span className="type-label" style={{ color: color.inkPrimary }}>
				Proof data — what the verifier checked
			</span>

			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<span className="type-label" style={{ color: color.cipherReveal, marginBottom: space.s1 }}>
					Statement
				</span>
				<Row label="Public key" value={toHex(proof.pk)} />
				<Row label="Encrypted amount (c1)" value={toHex(proof.c1)} />
				<Row label="Decryption handle" value={toHex(proof.dh)} />
				<Row label="Amount disclosed" value={`${usd(proof.amount)} (${proof.amount.toString()} MIST)`} />
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					paddingTop: space.s3,
					borderTop: `1px solid ${color.borderHairline}`,
				}}
			>
				<span className="type-label" style={{ color: color.cipherReveal, marginBottom: space.s1 }}>
					Proof — 128 bytes
				</span>
				<Row label="a (commitment)" value={a} />
				<Row label="b (commitment)" value={b} />
				<Row label="z1 (response)" value={z1} />
				<Row label="z2 (response)" value={z2} />
			</div>

			{/* On-chain: read-only module link + optional real submission */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: space.s2,
					paddingTop: space.s3,
					borderTop: `1px solid ${color.borderHairline}`,
				}}
			>
				<a
					href={explorerObjectUrl(pkg, APERTURE_NETWORK)}
					target="_blank"
					rel="noopener noreferrer"
					className="type-label"
					style={{ display: 'inline-flex', alignItems: 'center', gap: space.s1, color: color.primary, textDecoration: 'none' }}
				>
					View verifier module on Suiscan
					<IconArrowRight size={14} style={{ transform: 'rotate(-45deg)' }} />
				</a>

				{wallet.address ? (
					<>
						<div style={{ display: 'flex', gap: space.s2, flexWrap: 'wrap' }}>
							<ButtonPrimary
								variant="secondary"
								onClick={() => void handleFaucet()}
								disabled={faucet.tag === 'loading'}
								data-action="faucet"
							>
								{faucet.tag === 'loading' ? 'Requesting…' : 'Get devnet gas (faucet)'}
							</ButtonPrimary>
							<ButtonPrimary
								onClick={() => void handleSubmit()}
								disabled={submit.tag === 'submitting'}
								data-action="submit-onchain"
							>
								{submit.tag === 'submitting' ? 'Submitting…' : 'Submit on-chain (real tx) →'}
							</ButtonPrimary>
						</div>
						{faucet.tag === 'done' && (
							<span className="type-caption" style={{ color: color.verified }}>
								Faucet requested ✓ — devnet SUI is on the way (a few seconds). Then submit.
							</span>
						)}
						{faucet.tag === 'error' && (
							<span className="type-caption" style={{ color: color.notice }}>
								{faucet.message}
							</span>
						)}
						<span className="type-caption" style={{ color: color.inkSecondary }}>
							Submitting commits a real transaction on devnet (your wallet pays a little gas — use
							the faucet if you have none). The simulated verify above uses no gas.
						</span>
					</>
				) : (
					<span className="type-caption" style={{ color: color.inkSecondary }}>
						Connect a wallet to submit a real, traceable transaction (free devnet gas via the faucet).
					</span>
				)}

				{submit.tag === 'done' && (
					<div
						data-testid="submit-result"
						className="type-caption"
						style={{ color: submit.status === 'success' ? color.verified : color.failed }}
					>
						{submit.status === 'success' ? 'Transaction committed ✓ — ' : 'Transaction reverted (proof rejected) — '}
						<a
							href={explorerTxUrl(submit.digest, APERTURE_NETWORK)}
							target="_blank"
							rel="noopener noreferrer"
							style={{ color: color.primary }}
						>
							View transaction on Suiscan ↗
						</a>
					</div>
				)}

				{submit.tag === 'error' && (
					<span className="type-caption" style={{ color: color.notice }}>
						{submit.message}
					</span>
				)}
			</div>
		</div>
	);
}
