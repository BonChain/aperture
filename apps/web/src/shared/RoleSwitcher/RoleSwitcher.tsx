import { useState, type CSSProperties, type ReactNode } from 'react';

import { color, radius, roleAccent, ROLES, space, type Role } from '../../theme/tokens';
import { ButtonPrimary, RoleBanner } from '../components';

const ROLE_LABELS: Record<Role, string> = {
	payer: 'Payer lens',
	holder: 'Holder lens',
	auditor: 'Auditor lens — designated read only',
};

const ROLE_NAMES: Record<Role, string> = {
	payer: 'Payer',
	holder: 'Holder',
	auditor: 'Auditor',
};

export interface RoleSwitcherProps {
	/**
	 * The app boots on the Mode B Holder front door (UX-DR12/23, FR-21) — NOT a
	 * wallet wall. Default lens is the Holder.
	 */
	defaultRole?: Role;
	onRoleChange?: (role: Role) => void;
	/** Content rendered inside the main area after the role banner and sign prompt. */
	children?: ReactNode;
}

/**
 * Role-switcher shell (FR-21, demo only). A persistent left-rail header with three
 * lens slots (stubs). Switching re-lenses the app (banner + accent). Key-dependent
 * actions render disabled with "Sign to unlock →" — there is no real signing in
 * Story 1.0 (fixture-only).
 */
export function RoleSwitcher({ defaultRole = 'holder', onRoleChange, children }: RoleSwitcherProps) {
	const [active, setActive] = useState<Role>(defaultRole);

	function select(role: Role) {
		setActive(role);
		onRoleChange?.(role);
	}

	const shell: CSSProperties = { display: 'flex', minHeight: '100vh' };
	const rail: CSSProperties = {
		display: 'flex',
		flexDirection: 'column',
		gap: space.s2,
		width: '240px',
		flexShrink: 0,
		background: color.surfaceRaised,
		borderRight: `1px solid ${color.borderHairline}`,
		padding: space.s4,
	};
	const main: CSSProperties = {
		flex: 1,
		display: 'flex',
		flexDirection: 'column',
		gap: space.s6,
		padding: space.pageMargin,
	};

	return (
		<div data-component="role-switcher" style={shell}>
			<nav aria-label="Role switcher" style={rail}>
				<div className="type-label" style={{ color: color.inkSecondary }}>
					Aperture
				</div>
				{ROLES.map((role) => {
					const isActive = role === active;
					const accent = roleAccent(role);
					const lensSlot: CSSProperties = {
						textAlign: 'left',
						background: isActive ? accent.muted : 'transparent',
						color: color.inkPrimary,
						border: `1px solid ${isActive ? accent.accent : 'transparent'}`,
						borderLeft: `3px solid ${isActive ? accent.accent : 'transparent'}`,
						borderRadius: radius.md,
						padding: `${space.s2} ${space.s3}`,
						cursor: 'pointer',
						font: 'inherit',
					};
					return (
						<button
							key={role}
							type="button"
							data-role={role}
							data-lens-slot={role}
							aria-current={isActive ? 'page' : undefined}
							className="type-body"
							style={lensSlot}
							onClick={() => select(role)}
						>
							{ROLE_NAMES[role]}
						</button>
					);
				})}
			</nav>

			<main style={main}>
				<RoleBanner role={active} label={ROLE_LABELS[active]} />

				{/* Signature explainer + the disabled "Sign to unlock →" front door. */}
				<p className="type-body" style={{ color: color.inkSecondary, maxWidth: '640px' }}>
					Entering as {ROLE_NAMES[active]} — derive your key from a one-time signature. Nothing is
					stored or spent.
				</p>
				<div>
					<ButtonPrimary disabled data-action="sign-to-unlock" aria-disabled="true">
						Sign to unlock →
					</ButtonPrimary>
				</div>
				{children}
			</main>
		</div>
	);
}
