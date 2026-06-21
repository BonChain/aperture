// apps/web/src/features/holder/ProofGenerator.tsx
//
// Story 3.2: Proof-generator UI.
// Displays a "Generate proof" button, live elapsed-time spinner (aria-live),
// and on success shows the proof size and passes the result to the parent.
// AC-3: live elapsed timer at 100ms intervals using performance.now().
// UX-DR15 / NFR-8: "Your key never leaves this browser."

import { useState, useEffect, useRef } from 'react';

import type { SessionKey } from '@aperture/core/proof';

import { clientProofAdapter } from '../../shared/adapters/clientProofAdapter';
import { buildAggregateStatement } from '../../shared/adapters/aggregateStatement';
import { MOCK_ENTRIES } from './mockEntries';
import { ButtonPrimary } from '../../shared/components/ButtonPrimary';
import { ErrorCard } from '../../shared/components/StatePrimitives';
import { color, space } from '../../theme/tokens';

// SPIKE-1 fixture sk (12345n as 32-byte LE). Story 4.1 replaces with real HKDF.
// 12345 = 0x3039 → LE bytes: [0x39, 0x30, 0, 0, ..., 0]
const FIXTURE_SK = new Uint8Array(32);
FIXTURE_SK[0] = 0x39;
FIXTURE_SK[1] = 0x30;

export interface GenerateProofResult {
  proof: Uint8Array;
  c1: Uint8Array;
  dh: Uint8Array;
  amount: bigint;
}

export interface ProofGeneratorProps {
  selectedIds: string[];
  totalAmount: bigint;
  sessionKey: SessionKey | null;
  onProofReady?: (result: GenerateProofResult) => void;
}

type State =
  | { phase: 'idle' }
  | { phase: 'generating'; startMs: number; elapsedS: string }
  | { phase: 'done'; result: GenerateProofResult; elapsedS: string }
  | { phase: 'error'; message: string; networkError?: boolean };

export function ProofGenerator({
  selectedIds,
  totalAmount,
  sessionKey,
  onProofReady,
}: ProofGeneratorProps) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  const canGenerate = selectedIds.length > 0 && sessionKey !== null;

  async function handleGenerate() {
    if (!canGenerate || !sessionKey) return;

    // Resolve the selected entries (with blinding) from mockEntries.
    const selectedEntries = MOCK_ENTRIES.filter((e) => selectedIds.includes(e.id));
    if (selectedEntries.length === 0) {
      setState({ phase: 'error', message: 'No entries selected.' });
      return;
    }

    const startMs = performance.now();
    setState({ phase: 'generating', startMs, elapsedS: '0.0' });

    // Start the live timer (100ms granularity).
    intervalRef.current = setInterval(() => {
      const elapsed = ((performance.now() - startMs) / 1000).toFixed(1);
      setState((prev) =>
        prev.phase === 'generating' ? { ...prev, elapsedS: elapsed } : prev,
      );
    }, 100);

    try {
      // Build the aggregate ciphertext statement from selected entries.
      // buildAggregateStatement lives in shared/adapters/ (allowed crypto seam).
      const { statement, aggBlinding } = buildAggregateStatement(selectedEntries, totalAmount);

      const output = await clientProofAdapter.generateProof({
        statement,
        witness: { secretKey: FIXTURE_SK, blinding: aggBlinding },
        sessionKey,
      });

      const endMs = performance.now();
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const elapsedS = ((endMs - startMs) / 1000).toFixed(1);
      const result: GenerateProofResult = {
        proof: output.proof,
        c1: statement.ciphertext,
        dh: statement.decryptionHandle,
        amount: totalAmount,
      };

      setState({ phase: 'done', result, elapsedS });
      onProofReady?.(result);
    } catch (err) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      const message = err instanceof Error ? err.message : String(err);
      // Detect network/devnet failures for the mode-b-unavailable state (DR20).
      const networkError =
        err instanceof TypeError ||
        (typeof message === 'string' && /fetch|network|connect|unreachable/i.test(message));
      setState({ phase: 'error', message, networkError });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space.s4 }}>
      {/* Privacy notice — UX-DR15 / NFR-8 */}
      <p className="type-caption" style={{ color: color.inkSecondary, margin: 0 }}>
        Your key never leaves this browser.
      </p>

      <ButtonPrimary
        onClick={() => void handleGenerate()}
        disabled={!canGenerate || state.phase === 'generating'}
        aria-disabled={!canGenerate || state.phase === 'generating'}
        data-action="generate-proof"
      >
        Generate proof
      </ButtonPrimary>

      {state.phase === 'generating' && (
        <p
          className="type-body"
          role="status"
          aria-live="polite"
          aria-busy="true"
          style={{ color: color.inkSecondary, margin: 0 }}
        >
          Generating proof… {state.elapsedS}s
        </p>
      )}

      {state.phase === 'done' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: space.s2,
            padding: space.s3,
            background: color.surfaceRaised,
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span
            className="type-label"
            style={{ color: color.verified }}
            data-testid="proof-ready"
          >
            Proof ready ✓
          </span>
          <span className="type-caption" style={{ color: color.inkSecondary }}>
            {state.result.proof.length} bytes · {state.elapsedS}s
          </span>
        </div>
      )}

      {state.phase === 'error' && (
        state.networkError ? (
          <ErrorCard
            title="Mode B unavailable"
            action={
              <ButtonPrimary
                variant="secondary"
                onClick={() => setState({ phase: 'idle' })}
                data-action="retry"
              >
                Retry
              </ButtonPrimary>
            }
          >
            Mode B is currently unavailable. The demo keypairs are loaded and ready — reconnect to
            continue.
          </ErrorCard>
        ) : (
          <ErrorCard
            title="Proof generation failed"
            action={
              <ButtonPrimary
                variant="secondary"
                onClick={() => setState({ phase: 'idle' })}
                data-action="retry"
              >
                Retry
              </ButtonPrimary>
            }
          >
            {state.message}
          </ErrorCard>
        )
      )}
    </div>
  );
}
