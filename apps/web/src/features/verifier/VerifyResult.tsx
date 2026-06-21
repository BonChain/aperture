import type { CSSProperties } from 'react';

import { StatusBadge } from '../../shared/components/StatusBadge';
import { explorerTxUrl } from '../../shared/explorerLink';
import type { SuiNetwork } from '../../shared/explorerLink';

export interface VerifyResultProps {
	verdict: 'verified' | 'failed' | null;
	txDigest?: string;
	network?: SuiNetwork;
}

function truncateDigest(digest: string): string {
	if (digest.length <= 20) return digest;
	return `${digest.slice(0, 8)}…${digest.slice(-8)}`;
}

const monoStyle: CSSProperties = {
	fontFamily: "'IBM Plex Mono', monospace",
	fontSize: '13px',
	fontVariantNumeric: 'tabular-nums',
};

const linkStyle: CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: '4px',
	textDecoration: 'none',
	color: 'inherit',
};

export function VerifyResult({ verdict, txDigest, network = 'devnet' }: VerifyResultProps) {
	return (
		<div style={{ display: 'inline-flex', flexDirection: 'column', gap: '8px' }}>
			{verdict !== null && <StatusBadge verdict={verdict} />}
			{txDigest && (
				<a
					href={explorerTxUrl(txDigest, network)}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={`View transaction ${txDigest} on Sui Explorer`}
					title={txDigest}
					style={linkStyle}
				>
					<span style={monoStyle}>{truncateDigest(txDigest)}</span>
					<span aria-hidden="true">↗</span>
				</a>
			)}
		</div>
	);
}
