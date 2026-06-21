// apps/web/src/shared/components/StepRail.tsx
//
// Guided progress rail: a numbered, icon-led stepper that lights up as the holder
// advances Connect → Select → Generate → Verify → Done. Presentational only —
// the active index is computed by the parent flow. Tonal hierarchy only (no glow).

import { color, glass, radius, space } from '../../theme/tokens';
import type { IconComponent } from './icons';

export interface RailStep {
	label: string;
	Icon: IconComponent;
}

export interface StepRailProps {
	steps: readonly RailStep[];
	/** Zero-based index of the active step. Earlier steps render as done. */
	current: number;
}

export function StepRail({ steps, current }: StepRailProps) {
	return (
		<ol
			data-testid="step-rail"
			aria-label="Progress"
			style={{
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				gap: space.s2,
				listStyle: 'none',
				padding: space.s3,
				margin: 0,
				...glass,
				borderRadius: radius.lg,
			}}
		>
			{steps.map((step, i) => {
				const done = i < current;
				const active = i === current;
				const Icon = step.Icon;

				const dotBg = active ? color.primary : done ? color.surfaceOverlay : 'transparent';
				const dotFg = active ? color.primaryForeground : done ? color.cipherReveal : color.inkDisabled;
				const dotBorder = active ? color.primary : done ? color.borderStrong : color.borderHairline;
				const labelColor = active ? color.inkPrimary : done ? color.inkSecondary : color.inkDisabled;

				return (
					<li
						key={step.label}
						aria-current={active ? 'step' : undefined}
						style={{ display: 'flex', alignItems: 'center', gap: space.s2 }}
					>
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '26px',
								height: '26px',
								borderRadius: radius.full,
								background: dotBg,
								color: dotFg,
								border: `1px solid ${dotBorder}`,
								flexShrink: 0,
							}}
						>
							{done ? <span aria-hidden="true">✓</span> : <Icon size={15} />}
						</span>
						<span className="type-label" style={{ color: labelColor, whiteSpace: 'nowrap' }}>
							{step.label}
						</span>
						{i < steps.length - 1 && (
							<span
								aria-hidden="true"
								style={{
									width: '20px',
									height: '1px',
									background: done ? color.borderStrong : color.borderHairline,
									margin: `0 ${space.s1}`,
								}}
							/>
						)}
					</li>
				);
			})}
		</ol>
	);
}
