// apps/web/src/shared/components/SiteFooter.tsx
//
// Shared footer. Brand + three link columns + ecosystem credit + honesty note.
// Links are presentational anchors (in-page scroll or external) — no router dep.

import { BrandLockup } from './Brand';
import { NoticeDisclaimer } from './NoticeDisclaimer';
import { aperturePackageId, APERTURE_NETWORK } from '../aperture';
import { explorerObjectUrl } from '../explorerLink';
import { color, space } from '../../theme/tokens';

interface Col {
	heading: string;
	links: readonly { label: string; href: string }[];
}

export function SiteFooter() {
	const COLUMNS: readonly Col[] = [
		{
			heading: 'Product',
			links: [
				{ label: 'How it works', href: '#how' },
				{ label: 'Use cases', href: '#use-cases' },
				{ label: 'Why Sui', href: '#why-sui' },
			],
		},
		{
			heading: 'On-chain',
			links: [
				{ label: 'Verifier module (Suiscan)', href: explorerObjectUrl(aperturePackageId(), APERTURE_NETWORK) },
				{ label: 'Suiscan · devnet', href: 'https://suiscan.xyz/devnet' },
			],
		},
		{
			heading: 'Ecosystem',
			links: [
				{ label: 'Sui confidential transfers', href: 'https://blog.sui.io/confidential-transfers-public-beta/' },
				{ label: 'Sui', href: 'https://sui.io' },
			],
		},
	];

	return (
		<footer
			style={{
				borderTop: '1px solid var(--glass-border)',
				background: 'var(--glass-bg)',
				backdropFilter: 'blur(var(--glass-blur))',
				WebkitBackdropFilter: 'blur(var(--glass-blur))',
			}}
		>
			<div
				style={{
					maxWidth: '1040px',
					margin: '0 auto',
					padding: `${space.s10} ${space.pageMargin}`,
					display: 'flex',
					flexDirection: 'column',
					gap: space.s6,
				}}
			>
				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: space.s8,
						justifyContent: 'space-between',
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'column', gap: space.s2, maxWidth: '300px' }}>
						<BrandLockup size={24} tagline />
						<span className="type-caption" style={{ color: color.inkSecondary }}>
							Private from the public, provable to whoever you choose.
						</span>
						<span className="type-caption" style={{ color: color.inkDisabled }}>
							Sui Overflow 2026 · DeFi &amp; Payments
						</span>
					</div>

					<div style={{ display: 'flex', gap: space.s8, flexWrap: 'wrap' }}>
						{COLUMNS.map((col) => (
							<div key={col.heading} style={{ display: 'flex', flexDirection: 'column', gap: space.s2 }}>
								<span className="type-label" style={{ color: color.inkSecondary }}>
									{col.heading}
								</span>
								{col.links.map((l) => (
									<a
										key={l.label}
										href={l.href}
										target={l.href.startsWith('http') ? '_blank' : undefined}
										rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
										className="type-caption"
										style={{ color: color.inkSecondary, textDecoration: 'none' }}
									>
										{l.label}
									</a>
								))}
							</div>
						))}
					</div>
				</div>

				<NoticeDisclaimer>
					Demo on Sui devnet — supports selective disclosure as required by Travel Rule / AMLR. Not for
					production use.
				</NoticeDisclaimer>

				<span className="type-caption" style={{ color: color.inkDisabled }}>
					© 2026 Aperture · Built on Sui confidential transfers.
				</span>
			</div>
		</footer>
	);
}
