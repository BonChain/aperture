import type { CSSProperties, ReactNode } from 'react';

import { color, radius, space } from '../../theme/tokens';

/**
 * The single source for async-surface feedback shells (DR20): skeleton-loader,
 * error-card, empty-state. Every async surface in later stories pulls these from
 * here — they are not re-invented per feature.
 */

export interface SkeletonLoaderProps {
	/** Number of stacked placeholder lines. */
	lines?: number;
	/** Accessible status text announced while loading. */
	label?: string;
}

export function SkeletonLoader({ lines = 3, label = 'Loading…' }: SkeletonLoaderProps) {
	const safeLines = Math.max(1, lines);
	const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: space.s2 };
	return (
		<div role="status" aria-busy="true" aria-label={label} style={wrap}>
			{Array.from({ length: safeLines }, (_, i) => (
				<div
					key={i}
					className="aperture-skeleton"
					data-skeleton-line={i}
					style={{ height: space.s4, width: i === safeLines - 1 ? '60%' : '100%' }}
				/>
			))}
		</div>
	);
}

export interface ErrorCardProps {
	title?: string;
	children?: ReactNode;
	/** Optional action slot (e.g. a retry button). */
	action?: ReactNode;
}

export function ErrorCard({ title = 'Something went wrong', children, action }: ErrorCardProps) {
	const card: CSSProperties = {
		display: 'flex',
		flexDirection: 'column',
		gap: space.s2,
		background: color.surfaceRaised,
		border: `1px solid ${color.borderStrong}`,
		borderRadius: radius.md,
		padding: space.s4,
	};
	return (
		<div role="alert" data-component="error-card" style={card}>
			<div className="type-heading" style={{ color: color.failed }}>
				{title}
			</div>
			{children && (
				<div className="type-body" style={{ color: color.inkSecondary }}>
					{children}
				</div>
			)}
			{action && <div>{action}</div>}
		</div>
	);
}

export interface EmptyStateProps {
	title: string;
	children?: ReactNode;
	action?: ReactNode;
}

export function EmptyState({ title, children, action }: EmptyStateProps) {
	const box: CSSProperties = {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: space.s2,
		textAlign: 'center',
		padding: space.s10,
		color: color.inkSecondary,
	};
	return (
		<div data-component="empty-state" style={box}>
			<div className="type-heading" style={{ color: color.inkPrimary }}>
				{title}
			</div>
			{children && <div className="type-body">{children}</div>}
			{action && <div>{action}</div>}
		</div>
	);
}
