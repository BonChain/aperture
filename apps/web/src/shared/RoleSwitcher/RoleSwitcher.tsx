import { useState, type CSSProperties, type ReactNode } from 'react';

import { color, radius, roleAccent, ROLES, space, type Role } from '../../theme/tokens';
import { RoleBanner } from '../components';
import { BrandLockup } from '../components/Brand';
import { aperturePackageId, APERTURE_NETWORK } from '../aperture';
import { explorerObjectUrl } from '../explorerLink';

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

const ROLE_DESC: Record<Role, string> = {
	payer: 'Fund a treasury and run confidential payouts.',
	holder: 'Prove a figure about your encrypted activity.',
	auditor: "Verify a holder's proof — no key needed.",
};

export interface RoleSwitcherProps {
	/**
	 * The app boots on the Mode B Holder front door (UX-DR12/23, FR-21) — NOT a
	 * wallet wall. Default lens is the Holder.
	 */
	defaultRole?: Role;
	/** Controlled active role. When provided, it wins over internal state — lets
	 * the app switch lenses programmatically (e.g. "See it verified →"). */
	activeRole?: Role;
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
export function RoleSwitcher({ defaultRole = 'holder', activeRole, onRoleChange, children }: RoleSwitcherProps) {
	const [internal, setInternal] = useState<Role>(defaultRole);
	const active = activeRole ?? internal;

	function select(role: Role) {
		if (activeRole === undefined) setInternal(role);
		onRoleChange?.(role);
	}

	const shell: CSSProperties = { display: 'flex', minHeight: '100vh' };
	const rail: CSSProperties = {
		display: 'flex',
		flexDirection: 'column',
		gap: space.s2,
		width: '240px',
		flexShrink: 0,
		background: 'var(--glass-bg)',
		backdropFilter: 'blur(var(--glass-blur))',
		WebkitBackdropFilter: 'blur(var(--glass-blur))',
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
				<div style={{ paddingBottom: space.s2 }}>
					<BrandLockup size={22} />
				</div>
				{ROLES.map((role) => {
					const isActive = role === active;
					const accent = roleAccent(role);
					const lensSlot: CSSProperties = {
						textAlign: 'left',
						background: isActive ? accent.muted : 'var(--glass-bg)',
						backdropFilter: 'blur(var(--glass-blur))',
						WebkitBackdropFilter: 'blur(var(--glass-blur))',
						color: color.inkPrimary,
						border: `1px solid ${isActive ? accent.accent : 'var(--glass-border)'}`,
						borderLeft: `3px solid ${isActive ? accent.accent : 'var(--glass-border)'}`,
						borderRadius: radius.md,
						padding: `${space.s2} ${space.s3}`,
						cursor: 'pointer',
						font: 'inherit',
						width: '100%',
					};
					return (
						<div key={role} style={{ display: 'flex', flexDirection: 'column', gap: space.s1 }}>
							<button
								type="button"
								data-role={role}
								data-lens-slot={role}
								aria-current={isActive ? 'page' : undefined}
								className="type-body lens-btn"
								style={lensSlot}
								onClick={() => select(role)}
							>
								{ROLE_NAMES[role]}
							</button>
							<span
								className="type-caption"
								style={{ color: color.inkSecondary, paddingLeft: space.s3, opacity: isActive ? 1 : 0.7 }}
							>
								{ROLE_DESC[role]}
							</span>
						</div>
					);
				})}

				{/* Network / deployment — real project data + a correct Suiscan link */}
				<div
					style={{
						marginTop: 'auto',
						display: 'flex',
						flexDirection: 'column',
						gap: space.s1,
						paddingTop: space.s4,
						borderTop: `1px solid ${color.borderHairline}`,
					}}
				>
					<span className="type-label" style={{ color: color.inkSecondary }}>
						Network
					</span>
					<span className="type-caption" style={{ color: color.inkSecondary }}>
						Sui devnet · verifier module deployed
					</span>
					<a
						href={explorerObjectUrl(aperturePackageId(), APERTURE_NETWORK)}
						target="_blank"
						rel="noopener noreferrer"
						className="type-caption"
						style={{ color: color.primary, textDecoration: 'none' }}
					>
						View module on Suiscan ↗
					</a>
				</div>
			</nav>

			<main style={main}>
				<RoleBanner role={active} label={ROLE_LABELS[active]} />
				{children}
			</main>
		</div>
	);
}
