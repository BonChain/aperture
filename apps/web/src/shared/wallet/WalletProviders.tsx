// apps/web/src/shared/wallet/WalletProviders.tsx
//
// Wallet seam (see walletSession.tsx). Wraps the app in the dapp-kit providers
// (Sui devnet client + wallet adapter) and the WalletSessionProvider. Rendered
// once, in main.tsx, inside the existing QueryClientProvider.

import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import type { ReactNode } from 'react';

import { WalletSessionProvider } from './walletSession';

import '@mysten/dapp-kit/dist/index.css';

const { networkConfig } = createNetworkConfig({
	devnet: { network: 'devnet', url: getJsonRpcFullnodeUrl('devnet') },
});

export function WalletProviders({ children }: { children: ReactNode }) {
	return (
		<SuiClientProvider networks={networkConfig} defaultNetwork="devnet">
			<WalletProvider autoConnect>
				<WalletSessionProvider>{children}</WalletSessionProvider>
			</WalletProvider>
		</SuiClientProvider>
	);
}
