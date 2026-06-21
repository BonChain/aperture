// NFR-1 note: The Sui explorer shows the on-chain verify tx payload (DST, pk, ciphertext,
// proof bytes) but no plaintext per-recipient amount. See
// _bmad-output/implementation-artifacts/1-2a-spiKE-1-go-no-go.md for what the
// verify_aggregate call looks like.

export type SuiNetwork = 'devnet' | 'testnet' | 'mainnet';

export function explorerTxUrl(txDigest: string, network: SuiNetwork): string {
	// suiexplorer.com was retired by Mysten; Suiscan is the current explorer and
	// supports devnet/testnet/mainnet under a uniform /<network>/tx/<digest> path.
	return `https://suiscan.xyz/${network}/tx/${txDigest}`;
}

/** Suiscan page for an object/package (e.g. the deployed verifier module). */
export function explorerObjectUrl(objectId: string, network: SuiNetwork): string {
	return `https://suiscan.xyz/${network}/object/${objectId}`;
}
