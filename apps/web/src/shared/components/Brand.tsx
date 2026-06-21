// apps/web/src/shared/components/Brand.tsx
//
// The Aperture mark — a camera-aperture iris (six blades + ring). The brand
// motif: an aperture opens selectively, which is exactly the product — private
// from the public, provable to whoever you choose. currentColor throughout.

import type { CSSProperties } from 'react';

import { color, space } from '../../theme/tokens';

export function ApertureMark({ size = 28, style }: { size?: number; style?: CSSProperties }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.4}
			strokeLinejoin="round"
			aria-hidden="true"
			style={style}
		>
			<circle cx="12" cy="12" r="9.2" />
			{/* Six iris blades — each a chord skipping one vertex of the hexagon. */}
			<path d="M20.4 13.2 8.8 19.9" />
			<path d="M16.5 19.9 3.6 12.4" />
			<path d="M8.8 19.9 8.8 4.1" />
			<path d="M3.6 12.4 16.5 4.1" />
			<path d="M8.8 4.1 20.4 10.8" />
			<path d="M16.5 4.1 16.5 19.9" />
		</svg>
	);
}

export function BrandLockup({
	size = 28,
	tagline = false,
	style,
}: {
	size?: number;
	tagline?: boolean;
	style?: CSSProperties;
}) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: space.s3, ...style }}>
			<span style={{ color: color.cipherReveal, display: 'inline-flex' }}>
				<ApertureMark size={size} />
			</span>
			<div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
				<span
					className="type-heading"
					style={{ color: color.inkPrimary, letterSpacing: '-0.01em' }}
				>
					Aperture
				</span>
				{tagline && (
					<span className="type-caption" style={{ color: color.inkSecondary }}>
						Confidential compliance on Sui
					</span>
				)}
			</div>
		</div>
	);
}
