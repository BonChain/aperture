// apps/web/src/features/auditor/VerifyProof.tsx
//
// Story 3.3: Verifier UI — verify a NIZK proof without the holder's secret key.
//
// Import discipline (AR-15):
//   - No @mysten/* imports (banned from all non-test apps/web source files by guardrails)
//   - No node:* imports (browser-only)
//   - Crypto seam: uses shared/adapters/verifyAdapter.ts (allowed zone)
//
// Deviation note (AR-16): The on-chain call is architecturally specified as a
// backend route `POST /api/proofs/verify`. That route is called here via fetch().
// AC-4 (on-chain verify passes for devnet fixtures) is satisfied by the existing
// `pnpm test:spike:onchain` suite. AC-5 (devnet degradation) is handled here.

import { useState } from 'react';

import { verifyOffChain, type VerifyInput } from '../../shared/adapters/verifyAdapter';
import { useWalletSession } from '../../shared/wallet/walletSession';
import { aperturePackageId, APERTURE_NETWORK } from '../../shared/aperture';
import { explorerObjectUrl } from '../../shared/explorerLink';
import { usd } from '../../shared/format';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { color, space } from '../../theme/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VerifyPhase =
  | { tag: 'idle' }
  | { tag: 'loading' }
  | { tag: 'verified'; onChain: 'success' | 'abort:100' | 'unreachable' | null }
  | { tag: 'failed'; reason: 'off-chain' | 'on-chain' }
  | { tag: 'degraded' }  // off-chain passed; on-chain unreachable
  | { tag: 'error'; message: string };

// ---------------------------------------------------------------------------
// Icon helpers (inline SVG — no icon dependency per Task 4)
// ---------------------------------------------------------------------------

function IconCheck() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 7L5.5 10.5L12 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 2L12 12M12 2L2 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Hex parsing helper
// ---------------------------------------------------------------------------

function parseHex(hex: string): Uint8Array | null {
  const trimmed = hex.trim();
  if (trimmed.length === 0 || trimmed.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) return null;
  const bytes = new Uint8Array(trimmed.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// VerifyProof component
// ---------------------------------------------------------------------------

/**
 * Verifier UI — paste hex fields from golden fixtures or a real proof flow.
 * Off-chain verify runs client-side (<10ms). On-chain verify calls
 * POST /api/proofs/verify (async ~4.5s on devnet). Degrades gracefully if
 * the devnet endpoint is unavailable (AC-5).
 */
export interface VerifyProofInitial {
  pubkeyHex?: string;
  ciphertextHex?: string;
  dhHex?: string;
  amountStr?: string;
  proofHex?: string;
}

export interface VerifyProofProps {
  /** Pre-fill the fields — used when a holder's proof is handed to the Auditor. */
  initial?: VerifyProofInitial;
}

export function VerifyProof({ initial }: VerifyProofProps = {}) {
  const wallet = useWalletSession();
  const [pubkeyHex, setPubkeyHex] = useState(initial?.pubkeyHex ?? '');
  const [ciphertextHex, setCiphertextHex] = useState(initial?.ciphertextHex ?? '');
  const [dhHex, setDhHex] = useState(initial?.dhHex ?? '');
  const [amountStr, setAmountStr] = useState(initial?.amountStr ?? '');
  const [proofHex, setProofHex] = useState(initial?.proofHex ?? '');
  const [phase, setPhase] = useState<VerifyPhase>({ tag: 'idle' });

  async function handleSubmit() {
    const pk = parseHex(pubkeyHex);
    const ciphertext = parseHex(ciphertextHex);
    const dh = parseHex(dhHex);
    const proof = parseHex(proofHex);

    let amount: bigint;
    try {
      amount = BigInt(amountStr.trim());
    } catch {
      setPhase({ tag: 'error', message: 'Amount must be a valid integer (u64).' });
      return;
    }

    if (!pk || pk.length !== 32) {
      setPhase({ tag: 'error', message: 'Public key must be 32 bytes (64 hex chars).' });
      return;
    }
    if (!ciphertext || ciphertext.length !== 32) {
      setPhase({ tag: 'error', message: 'Ciphertext must be 32 bytes (64 hex chars).' });
      return;
    }
    if (!dh || dh.length !== 32) {
      setPhase({ tag: 'error', message: 'Decryption handle must be 32 bytes (64 hex chars).' });
      return;
    }
    if (!proof || proof.length !== 128) {
      setPhase({ tag: 'error', message: 'Proof must be 128 bytes (256 hex chars).' });
      return;
    }

    const input: VerifyInput = { pk, ciphertext, decryptionHandle: dh, proof };
    setPhase({ tag: 'loading' });

    try {
      // Off-chain first — synchronous, <10ms, in-browser.
      if (!verifyOffChain(input)) {
        setPhase({ tag: 'failed', reason: 'off-chain' });
        return;
      }
      // On-chain (devnet) via read-only devInspect — no gas, no signature.
      const onChain = await wallet.verifyOnChain({
        pk,
        ciphertext,
        decryptionHandle: dh,
        proof,
        amount,
      });
      if (onChain === 'success') {
        setPhase({ tag: 'verified', onChain: 'success' });
      } else if (onChain === 'failure') {
        setPhase({ tag: 'failed', reason: 'on-chain' });
      } else {
        setPhase({ tag: 'degraded' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPhase({ tag: 'error', message });
    }
  }

  return (
    <div
      data-testid="verify-proof"
      style={{ display: 'flex', flexDirection: 'column', gap: space.s4 }}
    >
      {/* Plain-language framing — parity with the Holder flow's explainers */}
      <p className="type-body" style={{ color: color.inkSecondary, margin: 0 }}>
        Confirm a holder's disclosed total — using only public data, never their key.
      </p>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={phase.tag === 'loading'}
        aria-disabled={phase.tag === 'loading'}
        data-action="verify-proof"
        className="type-label"
        style={{
          background: color.inkPrimary,
          color: color.surfaceBase,
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: `${space.s2} ${space.s4}`,
          cursor: phase.tag === 'loading' ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        Verify proof
      </button>

      {/* Raw proof inputs — collapsed when pre-filled from a holder, open for
          manual paste. Keeps non-technical users out of the hex. */}
      <details open={!initial}>
        <summary className="type-label" style={{ color: color.inkSecondary, cursor: 'pointer' }}>
          Show technical detail (proof inputs)
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.s3, marginTop: space.s3 }}>
          <FieldRow
            id="vp-pubkey"
            label="Public key (32 bytes hex)"
          value={pubkeyHex}
          onChange={setPubkeyHex}
          placeholder="64 hex chars"
        />
        <FieldRow
          id="vp-ciphertext"
          label="Ciphertext c1 (32 bytes hex)"
          value={ciphertextHex}
          onChange={setCiphertextHex}
          placeholder="64 hex chars"
        />
        <FieldRow
          id="vp-dh"
          label="Decryption handle (32 bytes hex)"
          value={dhHex}
          onChange={setDhHex}
          placeholder="64 hex chars"
        />
        <FieldRow
          id="vp-amount"
          label="Disclosed amount X (u64)"
          value={amountStr}
          onChange={setAmountStr}
          placeholder="e.g. 70000"
        />
        <FieldRow
          id="vp-proof"
          label="Proof (128 bytes hex)"
          value={proofHex}
          onChange={setProofHex}
          placeholder="256 hex chars"
        />

        </div>
      </details>

      {/* Status area */}
      {phase.tag === 'loading' && (
        <p
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="type-body"
          style={{ color: color.inkSecondary, margin: 0 }}
          data-testid="verify-loading"
        >
          Verifying…
        </p>
      )}

      {phase.tag === 'verified' && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: space.s2 }}
          data-testid="verify-result-verified"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: space.s2 }}>
            <IconCheck />
            <StatusBadge verdict="verified" label="Verified" />
          </div>
          {amountStr.trim() !== '' && (
            <span className="type-body" style={{ color: color.inkPrimary }}>
              The holder proved a total of {usd(amountStr)} — confirmed without their key, and
              without their other activity.
            </span>
          )}
          {phase.onChain === 'success' && (
            <span className="type-caption" style={{ color: color.inkSecondary }}>
              On-chain verification passed on devnet.{' '}
              <a
                href={explorerObjectUrl(aperturePackageId(), APERTURE_NETWORK)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: color.primary }}
              >
                View module on Suiscan ↗
              </a>
            </span>
          )}
          {phase.onChain === null && (
            <span className="type-caption" style={{ color: color.inkSecondary }}>
              Off-chain verified. On-chain verification unavailable — showing off-chain result only.
            </span>
          )}
        </div>
      )}

      {phase.tag === 'failed' && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: space.s2 }}
          data-testid="verify-result-failed"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: space.s2 }}>
            <IconX />
            <StatusBadge verdict="failed" label="Doesn't verify" />
          </div>
          {phase.reason === 'on-chain' && (
            <span className="type-caption" style={{ color: color.inkSecondary }}>
              Off-chain check passed but on-chain verification rejected the proof.
            </span>
          )}
        </div>
      )}

      {phase.tag === 'degraded' && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: space.s2 }}
          data-testid="verify-result-degraded"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: space.s2 }}>
            <IconCheck />
            <StatusBadge verdict="verified" label="Verified" />
          </div>
          <span className="type-caption" style={{ color: color.inkSecondary }}>
            On-chain verification unavailable — showing off-chain result only.
          </span>
        </div>
      )}

      {phase.tag === 'error' && (
        <div
          role="alert"
          style={{
            background: color.surfaceRaised,
            border: `1px solid ${color.failed}`,
            borderRadius: 'var(--radius-sm)',
            padding: space.s3,
          }}
          data-testid="verify-result-error"
        >
          <span className="type-label" style={{ color: color.failedForeground }}>
            Verification error
          </span>
          <p className="type-body" style={{ color: color.inkSecondary, margin: `${space.s1} 0 0` }}>
            {phase.message}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FieldRow sub-component (local, no separate file needed)
// ---------------------------------------------------------------------------

function FieldRow({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.s1 }}>
      <label htmlFor={id} className="type-label" style={{ color: color.inkSecondary }}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          padding: `${space.s2} ${space.s3}`,
          background: color.surfaceRaised,
          border: `1px solid ${color.borderStrong}`,
          borderRadius: 'var(--radius-sm)',
          color: color.inkPrimary,
          outline: 'none',
        }}
      />
    </div>
  );
}
