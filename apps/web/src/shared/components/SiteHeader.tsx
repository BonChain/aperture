// apps/web/src/shared/components/SiteHeader.tsx
//
// Shared sticky top bar for the whole site (landing + demo). Logo → home,
// in-page nav (landing only), a primary "Launch demo" CTA, and a devnet pill.
// Tonal only — solid surface, hairline underline, no gradient/glow.

import { BrandLockup } from './Brand';
import { ButtonPrimary } from './ButtonPrimary';
import { IconArrowRight } from './icons';
import { aperturePackageId, APERTURE_NETWORK } from '../aperture';
import { explorerObjectUrl } from '../explorerLink';
import { color, radius, space } from '../../theme/tokens';

export type SiteView = 'landing' | 'demo';

const NAV: readonly { label: string; id: string }[] = [
	{ label: 'How it works', id: 'how' },
	{ label: 'Why Sui', id: 'why-sui' },
	{ label: 'Use cases', id: 'use-cases' },
	{ label: 'Roadmap', id: 'roadmap' },
];

function scrollTo(id: string) {
	if (typeof document !== 'undefined') {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
}

export function SiteHeader({
	view,
	onLaunch,
	onHome,
}: {
	view: SiteView;
	onLaunch: () => void;
	onHome: () => void;
}) {
	return (
		<header
			style={{
				position: 'sticky',
				top: 0,
				zIndex: 50,
				background: 'var(--glass-bg-strong)',
				backdropFilter: 'blur(var(--glass-blur))',
				WebkitBackdropFilter: 'blur(var(--glass-blur))',
				borderBottom: '1px solid var(--glass-border)',
			}}
		>
			<div
				style={{
					maxWidth: '1040px',
					margin: '0 auto',
					padding: `${space.s3} ${space.pageMargin}`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: space.s4,
				}}
			>
				<button
					type="button"
					onClick={onHome}
					aria-label="Aperture home"
					style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
				>
					<BrandLockup size={24} />
				</button>

				<nav style={{ display: 'flex', alignItems: 'center', gap: space.s4, flexWrap: 'wrap' }}>
					{view === 'landing' ? (
						NAV.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => scrollTo(item.id)}
								className="type-caption"
								style={{
									background: 'none',
									border: 'none',
									color: color.inkSecondary,
									cursor: 'pointer',
									padding: 0,
								}}
							>
								{item.label}
							</button>
						))
					) : (
						<button
							type="button"
							onClick={onHome}
							className="type-caption"
							style={{ background: 'none', border: 'none', color: color.inkSecondary, cursor: 'pointer', padding: 0 }}
						>
							← Overview
						</button>
					)}

					<a
						href={explorerObjectUrl(aperturePackageId(), APERTURE_NETWORK)}
						target="_blank"
						rel="noopener noreferrer"
						className="type-caption"
						title="View the deployed verifier module on Suiscan"
						style={{
							padding: `${space.s1} ${space.s3}`,
							borderRadius: radius.full,
							border: `1px solid ${color.roleHolder}`,
							color: color.roleHolder,
							textDecoration: 'none',
						}}
					>
						devnet ↗
					</a>

					{view === 'landing' && (
						<ButtonPrimary onClick={onLaunch} data-action="header-launch">
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: space.s2 }}>
								Launch demo <IconArrowRight size={14} />
							</span>
						</ButtonPrimary>
					)}
				</nav>
			</div>
		</header>
	);
}
