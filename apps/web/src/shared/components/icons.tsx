// apps/web/src/shared/components/icons.tsx
//
// Inline stroke icons (no icon dependency — matches the existing IconCheck/IconX
// style). currentColor + 1.6 stroke so they inherit token colors from the parent.

import type { CSSProperties, ReactElement, ReactNode } from 'react';

export interface IconProps {
	size?: number;
	style?: CSSProperties;
}

/** A stroke icon component (React 19 has no global JSX namespace — use this). */
export type IconComponent = (props: IconProps) => ReactElement;

function Svg({ size = 20, style, children }: IconProps & { children: ReactNode }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			style={style}
		>
			{children}
		</svg>
	);
}

export function IconShield(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M12 3l7 3v5c0 4-3 7.2-7 8-4-.8-7-4-7-8V6l7-3z" />
		</Svg>
	);
}

export function IconUsers(p: IconProps) {
	return (
		<Svg {...p}>
			<circle cx="9" cy="8" r="3" />
			<path d="M3.5 20c0-3 2.7-5 5.5-5s5.5 2 5.5 5" />
			<path d="M16 5.2a3 3 0 010 5.6M17.5 20c0-2.3-1-3.9-2.5-4.6" />
		</Svg>
	);
}

export function IconEye(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
			<circle cx="12" cy="12" r="3" />
		</Svg>
	);
}

export function IconWallet(p: IconProps) {
	return (
		<Svg {...p}>
			<rect x="3" y="6" width="18" height="13" rx="2" />
			<path d="M3 10h18" />
			<circle cx="17" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
		</Svg>
	);
}

export function IconListChecks(p: IconProps) {
	return (
		<Svg {...p}>
			<rect x="3" y="3" width="18" height="18" rx="3" />
			<path d="M8 12l2.5 2.5L16 9" />
		</Svg>
	);
}

export function IconSparkle(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4L12 3z" />
		</Svg>
	);
}

export function IconBadgeCheck(p: IconProps) {
	return (
		<Svg {...p}>
			<circle cx="12" cy="12" r="9" />
			<path d="M8 12l2.6 2.6L16 9" />
		</Svg>
	);
}

export function IconFlag(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M6 21V4" />
			<path d="M6 4h11l-2.2 3L17 10H6" />
		</Svg>
	);
}

export function IconArrowRight(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M5 12h13" />
			<path d="M12.5 6l6 6-6 6" />
		</Svg>
	);
}

export function IconBuilding(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
			<path d="M3 21h18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
		</Svg>
	);
}

export function IconFileCheck(p: IconProps) {
	return (
		<Svg {...p}>
			<path d="M14 3H7a1 1 0 00-1 1v16a1 1 0 001 1h10a1 1 0 001-1V8z" />
			<path d="M14 3v5h5" />
			<path d="M9.5 14.5l2 2 3.5-4" />
		</Svg>
	);
}

export function IconLock(p: IconProps) {
	return (
		<Svg {...p}>
			<rect x="5" y="11" width="14" height="9" rx="2" />
			<path d="M8 11V8a4 4 0 018 0v3" />
		</Svg>
	);
}
