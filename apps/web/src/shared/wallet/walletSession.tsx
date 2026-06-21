// apps/web/src/shared/wallet/walletSession.tsx
//
// Wallet seam (AR-15 pattern). This directory — /shared/wallet/ — is the ONLY
// place @mysten/* may be imported from non-test apps/web source, mirroring the
// /shared/adapters/ crypto seam. scripts/guardrails.mjs exempts this path.
//
// The session is exposed via React context with a SAFE DISCONNECTED DEFAULT, so
// components (and provider-less tests) can call useWalletSession() without a
// provider and without throwing. dapp-kit hooks run ONLY inside
// WalletSessionProvider, which is rendered under the dapp-kit providers in
// production (see WalletProviders.tsx).

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react';

import {
	useConnectWallet,
	useCurrentAccount,
	useSignAndExecuteTransaction,
	useSignPersonalMessage,
	useSuiClient,
	useWallets,
} from '@mysten/dapp-kit';
import { FaucetRateLimitError, getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';

import type { SessionKey } from '@aperture/core/proof';

import { aperturePackageId } from '../aperture';
import { deriveSessionKey, randomSessionKey } from '../../lib/keys';

export type WalletStatus =
	| 'disconnected'
	| 'connecting'
	| 'signing'
	| 'ready'
	| 'error';

/** Result of an on-chain (devnet) verification via devInspect (read-only). */
export type OnChainResult = 'success' | 'failure' | 'unavailable';

/** Result of a real on-chain submission (a committed transaction). */
export type OnChainSubmitResult =
	| { digest: string; status: 'success' | 'failure' }
	| { error: string };

export interface OnChainVerifyInput {
	pk: Uint8Array;
	ciphertext: Uint8Array;
	decryptionHandle: Uint8Array;
	/** 128-byte proof (a‖b‖z1‖z2). */
	proof: Uint8Array;
	amount: bigint;
	/** Domain separation tag; the app uses an empty DST. */
	dst?: Uint8Array;
}

/** Build the verify_aggregate moveCall — shared by devInspect and real submit. */
function buildVerifyTx(pkg: string, input: OnChainVerifyInput): Transaction {
	const tx = new Transaction();
	tx.moveCall({
		target: `${pkg}::verifier::verify_aggregate`,
		arguments: [
			tx.pure.vector('u8', input.dst ?? new Uint8Array(0)),
			tx.pure.vector('u8', input.pk),
			tx.pure.vector('u8', input.ciphertext),
			tx.pure.vector('u8', input.decryptionHandle),
			tx.pure.u64(input.amount),
			tx.pure.vector('u8', input.proof.slice(0, 32)),
			tx.pure.vector('u8', input.proof.slice(32, 64)),
			tx.pure.vector('u8', input.proof.slice(64, 96)),
			tx.pure.vector('u8', input.proof.slice(96, 128)),
		],
	});
	return tx;
}

const ZERO_SENDER = `0x${'0'.repeat(64)}`;

export interface WalletSession {
	/** Connected wallet address, or null when no wallet is connected. */
	address: string | null;
	/** Derived holder session key, or null until the user signs. */
	sessionKey: SessionKey | null;
	status: WalletStatus;
	error: string | null;
	/** Connect Slush (if needed) and sign once to derive the holder session key. */
	signIn: () => Promise<void>;
	/** Drop the derived key (does not disconnect the wallet). */
	reset: () => void;
	/** Verify a proof on devnet (read-only devInspect — no gas, no signature). */
	verifyOnChain: (input: OnChainVerifyInput) => Promise<OnChainResult>;
	/** Submit a real verify transaction on devnet (wallet signs + pays gas). */
	submitOnChain: (input: OnChainVerifyInput) => Promise<OnChainSubmitResult>;
	/** Request devnet SUI from the faucet for the connected address (free test gas). */
	requestFaucet: () => Promise<{ ok: true } | { error: string }>;
}

const DISCONNECTED: WalletSession = {
	address: null,
	sessionKey: null,
	status: 'disconnected',
	error: null,
	signIn: async () => {},
	reset: () => {},
	verifyOnChain: async () => 'unavailable',
	submitOnChain: async () => ({ error: 'Wallet unavailable.' }),
	requestFaucet: async () => ({ error: 'Connect a wallet first.' }),
};

const WalletSessionContext = createContext<WalletSession>(DISCONNECTED);

/** Read the wallet session. Returns a safe disconnected default with no provider. */
export function useWalletSession(): WalletSession {
	return useContext(WalletSessionContext);
}

// Message contract (AR-8 / D3): the signature over this message is the only
// secret input to the HKDF key derivation. Per-role info bytes keep keys distinct.
const SIGN_MESSAGE = 'Aperture: derive Holder session key';

/** True when a signing error is an explicit user reject (vs. a wallet failure we can fall back from). */
function isUserRejection(e: unknown): boolean {
	const msg = e instanceof Error ? e.message : String(e);
	return /reject|denied|cancel/i.test(msg);
}

/**
 * Map an on-chain submit failure to a user-facing message. Submit (signAndExecute)
 * works for every account type incl. zkLogin — so an "Incorrect password" here is
 * a transient Slush vault-lock hiccup (retry/unlock), not an account limitation.
 */
export function submitErrorMessage(e: unknown): string {
	if (isUserRejection(e)) return 'Submission cancelled.';
	const msg = e instanceof Error ? e.message : '';
	if (/incorrect password/i.test(msg)) {
		return 'Wallet couldn’t sign the transaction. Unlock Slush (or re-login) and try again.';
	}
	return msg || 'Submission failed.';
}

export function WalletSessionProvider({ children }: { children: ReactNode }) {
	const account = useCurrentAccount();
	const wallets = useWallets();
	const suiClient = useSuiClient();
	const { mutateAsync: connect } = useConnectWallet();
	const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
	const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

	const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
	const [status, setStatus] = useState<WalletStatus>('disconnected');
	const [error, setError] = useState<string | null>(null);

	// Drop the derived key if the wallet disconnects or the account changes —
	// a key derived from one account must never be used under another (AC-3).
	const accountAddress = account?.address ?? null;
	useEffect(() => {
		if (!accountAddress) {
			setSessionKey(null);
			setStatus('disconnected');
		}
	}, [accountAddress]);

	const reset = useCallback(() => {
		setSessionKey(null);
		setError(null);
		setStatus(accountAddress ? 'connecting' : 'disconnected');
	}, [accountAddress]);

	const signIn = useCallback(async () => {
		setError(null);
		try {
			if (!account) {
				const slush = wallets.find((w) => /slush/i.test(w.name)) ?? wallets[0];
				if (!slush) {
					setStatus('error');
					setError('No Sui wallet found. Install Slush to continue.');
					return;
				}
				setStatus('connecting');
				await connect({ wallet: slush });
			}
			setStatus('signing');
			let key: SessionKey;
			try {
				const { signature } = await signPersonalMessage({
					message: new TextEncoder().encode(SIGN_MESSAGE),
				});
				key = await deriveSessionKey(fromBase64(signature), 'holder');
			} catch (signErr) {
				// Some wallet states can't decrypt the signing key and surface this as
				// "Incorrect password" even when the password is correct (e.g. an expired
				// zkLogin session). Fall back to a locally-generated session key so the
				// flow still works — it only seeds proof nonces. An explicit user reject
				// is a real cancellation, not a fallback case — rethrow it.
				if (isUserRejection(signErr)) throw signErr;
				key = randomSessionKey();
			}
			setSessionKey(key);
			setStatus('ready');
		} catch (e) {
			setStatus('error');
			setError(e instanceof Error ? e.message : 'Sign-in was cancelled.');
		}
	}, [account, wallets, connect, signPersonalMessage]);

	const verifyOnChain = useCallback(
		async (input: OnChainVerifyInput): Promise<OnChainResult> => {
			const pkg = aperturePackageId();
			if (!pkg) return 'unavailable';
			if (input.proof.length !== 128) return 'unavailable';
			try {
				const tx = buildVerifyTx(pkg, input);
				const res = await suiClient.devInspectTransactionBlock({
					sender: accountAddress ?? ZERO_SENDER,
					transactionBlock: tx,
				});
				const status = res.effects?.status?.status;
				if (status === 'success') return 'success';
				if (status === 'failure') return 'failure';
				return 'unavailable';
			} catch {
				return 'unavailable';
			}
		},
		[suiClient, accountAddress],
	);

	const submitOnChain = useCallback(
		async (input: OnChainVerifyInput): Promise<OnChainSubmitResult> => {
			const pkg = aperturePackageId();
			if (!pkg) return { error: 'No package id configured.' };
			if (!accountAddress) return { error: 'Connect a wallet to submit on-chain.' };
			if (input.proof.length !== 128) return { error: 'Proof must be 128 bytes.' };
			try {
				const tx = buildVerifyTx(pkg, input);
				const res = await signAndExecute({ transaction: tx });
				// Wait for finality so we can read the committed effects status.
				const finalized = await suiClient.waitForTransaction({
					digest: res.digest,
					options: { showEffects: true },
				});
				const ok = finalized.effects?.status?.status === 'success';
				return { digest: res.digest, status: ok ? 'success' : 'failure' };
			} catch (e) {
				return { error: submitErrorMessage(e) };
			}
		},
		[accountAddress, suiClient, signAndExecute],
	);

	const requestFaucet = useCallback(async (): Promise<{ ok: true } | { error: string }> => {
		if (!accountAddress) return { error: 'Connect a wallet first.' };
		try {
			await requestSuiFromFaucetV2({
				host: getFaucetHost('devnet'),
				recipient: accountAddress,
			});
			return { ok: true };
		} catch (e) {
			if (e instanceof FaucetRateLimitError) {
				return { error: 'Faucet rate-limited — wait a minute and try again.' };
			}
			return { error: e instanceof Error ? e.message : 'Faucet request failed.' };
		}
	}, [accountAddress]);

	const value: WalletSession = {
		address: accountAddress,
		sessionKey,
		status: sessionKey ? 'ready' : status,
		error,
		signIn,
		reset,
		verifyOnChain,
		submitOnChain,
		requestFaucet,
	};

	return (
		<WalletSessionContext.Provider value={value}>
			{children}
		</WalletSessionContext.Provider>
	);
}
