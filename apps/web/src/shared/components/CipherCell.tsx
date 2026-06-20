import type { CSSProperties } from 'react';

import { CIPHER_REVEAL_TRANSITION, color, font, space } from '../../theme/tokens';

export type CipherState = 'masked' | 'revealing' | 'revealed' | 'error';

export interface CipherCellProps {
	/**
	 * Stable identity anchor (AC-4). The SAME ciphertext rendered masked in one
	 * lens and revealed in another carries the SAME `cipherId`, so the reveal
	 * reads as continuity (same cell) — not coincidence. Stories 2.3 and 4.1
	 * consume this; they must not re-describe the reveal.
	 */
	cipherId: string;
	/** The real figure — shown only in the `revealed` state. */
	value?: string;
	/** masked (default) / revealing / revealed / error. */
	state?: CipherState;
	/** Glyph count reserved when masked. Width never reflows on reveal. */
	maskWidth?: number;
}

/**
 * The trust-boundary primitive. Masked = fixed-width `••••` in `cipher-masked`
 * slate; revealed = the real figure in `ink-primary` with a `cipher-reveal` aqua
 * left-bar + unlock marker. The masked→revealed change is an authorization STATE
 * rendered per {@link CIPHER_REVEAL_TRANSITION} (instantaneous swap, never an
 * animation, never a hover trick). Sealed vs revealed is distinguishable by
 * glyph, not color alone (a11y, AC-8).
 */
export function CipherCell({ cipherId, value, state = 'masked', maskWidth = 8 }: CipherCellProps) {
	// Use at least the default mask width so a zero/small maskWidth never produces 0ch.
	const reserveCh = Math.max(maskWidth > 0 ? maskWidth : 8, value?.length ?? 0);
	const base: CSSProperties = {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: space.s2,
		fontFamily: font.data,
		fontVariantNumeric: 'tabular-nums',
		// Reserve the column so a sibling revealing never reflows it.
		minWidth: `${reserveCh}ch`,
		// Reveal is a state swap, not a flourish.
		transition: CIPHER_REVEAL_TRANSITION.durationMs === 0 ? 'none' : undefined,
	};

	const sealed = state === 'masked' || state === 'revealing';

	const common = {
		'data-cipher-id': cipherId,
		'data-cipher-state': state,
		'data-sealed': sealed,
	} as const;

	if (state === 'revealed') {
		return (
			<span
				{...common}
				className="type-data"
				aria-label={`Revealed value ${value ?? '—'}`}
				style={{
					...base,
					color: color.inkPrimary,
					borderLeft: `2px solid ${color.cipherReveal}`,
					paddingLeft: space.s2,
				}}
			>
				{/* Unlock marker — glyph distinguishes revealed beyond color. */}
				<span aria-hidden="true" data-glyph="unlock" style={{ color: color.cipherReveal }}>
					⊙
				</span>
				{value ?? '—'}
			</span>
		);
	}

	if (state === 'error') {
		return (
			<span
				{...common}
				className="type-data"
				role="status"
				aria-label="Decryption error"
				style={{ ...base, color: color.failed }}
			>
				<span aria-hidden="true" data-glyph="error">
					×
				</span>
				—
			</span>
		);
	}

	// masked / revealing — fixed-width dots glyph.
	return (
		<span
			{...common}
			className="type-data"
			aria-label="Sealed value"
			aria-busy={state === 'revealing' ? true : undefined}
			style={{ ...base, color: color.cipherMasked }}
		>
			<span data-glyph="dots" aria-label="sealed">
				{'•'.repeat(maskWidth)}
			</span>
		</span>
	);
}
