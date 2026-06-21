// NFR-1 note: The Sui explorer shows the on-chain verify tx payload (DST, pk, ciphertext,
// proof bytes) but no plaintext per-recipient amount. See
// _bmad-output/implementation-artifacts/1-2a-spiKE-1-go-no-go.md for what the
// verify_aggregate call looks like.

export type SuiNetwork = 'devnet' | 'testnet' | 'mainnet';

export function explorerTxUrl(txDigest: string, network: SuiNetwork): string {
	if (network === 'mainnet') {
		return `https://suiexplorer.com/txblock/${txDigest}`;
	}
	return `https://suiexplorer.com/txblock/${txDigest}?network=${network}`;
}
