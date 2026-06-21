// apps/web/src/features/landing/FlowDiagram.tsx
//
// Visual "how it works" flow for the landing page: a left-to-right node flow
// (Encrypted activity → Pick → Prove → Verify → Share the total) followed by a
// "revealed vs stays private" split — the contrast that makes the idea click.
// Tonal hierarchy only (no gradients/glow); responsive via flex-wrap + grid.

import { Fragment } from 'react';

import {
	IconArrowRight,
	IconBadgeCheck,
	IconEye,
	IconListChecks,
	IconLock,
	IconSparkle,
	type IconComponent,
} from '../../shared/components/icons';
import { color, glass, radius, space } from '../../theme/tokens';

interface FlowNode {
	n: number;
	title: string;
	sub: string;
	Icon: IconComponent;
}

const NODES: readonly FlowNode[] = [
	{ n: 1, title: 'Encrypted activity', sub: 'Your amounts are hidden on-chain.', Icon: IconLock },
	{ n: 2, title: 'Pick what counts', sub: 'You choose which entries to include.', Icon: IconListChecks },
	{ n: 3, title: 'Prove the total', sub: 'A 128-byte proof, made in your browser.', Icon: IconSparkle },
	{ n: 4, title: 'Verifier checks', sub: 'No key, no entries — just the math.', Icon: IconBadgeCheck },
	{ n: 5, title: 'Share only the total', sub: 'They learn the figure, nothing else.', Icon: IconEye },
];

function Node({ node }: { node: FlowNode }) {
	const Icon = node.Icon;
	return (
		<div
			style={{
				flex: '1 1 150px',
				minWidth: '150px',
				display: 'flex',
				flexDirection: 'column',
				gap: space.s2,
				padding: space.s4,
				...glass,
				borderRadius: radius.lg,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<span
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: '34px',
						height: '34px',
						borderRadius: radius.md,
						background: color.surfaceOverlay,
						color: color.cipherReveal,
					}}
				>
					<Icon size={18} />
				</span>
				<span className="type-data" style={{ color: color.borderStrong }}>
					{node.n}
				</span>
			</div>
			<span className="type-label" style={{ color: color.inkPrimary }}>
				{node.title}
			</span>
			<span className="type-caption" style={{ color: color.inkSecondary }}>
				{node.sub}
			</span>
		</div>
	);
}

function SplitPanel({
	tone,
	heading,
	items,
}: {
	tone: string;
	heading: string;
	items: readonly string[];
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: space.s2,
				padding: space.s4,
				background: 'var(--glass-bg)',
				backdropFilter: 'blur(var(--glass-blur))',
				WebkitBackdropFilter: 'blur(var(--glass-blur))',
				border: `1px solid ${tone}`,
				borderRadius: radius.lg,
			}}
		>
			<span className="type-label" style={{ color: tone }}>
				{heading}
			</span>
			<ul style={{ margin: 0, paddingLeft: space.s4, display: 'flex', flexDirection: 'column', gap: space.s1 }}>
				{items.map((it) => (
					<li key={it} className="type-caption" style={{ color: color.inkSecondary }}>
						{it}
					</li>
				))}
			</ul>
		</div>
	);
}

export function FlowDiagram() {
	return (
		<div data-testid="flow-diagram" style={{ display: 'flex', flexDirection: 'column', gap: space.s5 }}>
			{/* Node flow */}
			<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: space.s2 }}>
				{NODES.map((node, i) => (
					<Fragment key={node.n}>
						<Node node={node} />
						{i < NODES.length - 1 && (
							<span
								aria-hidden="true"
								style={{
									display: 'flex',
									alignItems: 'center',
									color: color.inkDisabled,
									flex: '0 0 auto',
								}}
							>
								<IconArrowRight size={18} />
							</span>
						)}
					</Fragment>
				))}
			</div>

			{/* Revealed vs private — the contrast that makes it click */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
					gap: space.s4,
				}}
			>
				<SplitPanel
					tone={color.verified}
					heading="Revealed ✓"
					items={['The one total you chose to prove (e.g. “≥ $45,000”).']}
				/>
				<SplitPanel
					tone={color.cipherReveal}
					heading="Stays private 🔒"
					items={[
						'Which entries you picked',
						'The entries you left out',
						'Your balance and your other activity',
						'Your decryption key',
					]}
				/>
			</div>
		</div>
	);
}
