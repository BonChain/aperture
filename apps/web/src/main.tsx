import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactDOM from 'react-dom/client';

import Root from './Root';
import { WalletProviders } from './shared/wallet/WalletProviders';

import './index.css';

// React Query is the single state library (architecture rule) and is also
// required by the dapp-kit wallet providers.
const queryClient = new QueryClient();

// NOTE: no <React.StrictMode>. Its dev-only double-mount races dapp-kit's wallet
// connection (autoConnect), which poisons the Slush session — every signature
// after the first then fails with "Incorrect password" in `pnpm demo`. Production
// builds don't double-invoke, so this only ever bit the dev server. See the wallet
// seam in shared/wallet/walletSession.tsx.
ReactDOM.createRoot(document.getElementById('root')!).render(
	<QueryClientProvider client={queryClient}>
		<WalletProviders>
			<Root />
		</WalletProviders>
	</QueryClientProvider>,
);
