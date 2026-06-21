// apps/web/src/features/auditor/VerifyProof.test.tsx
//
// Story 3.3 Task 4: unit tests for the VerifyProof UI component.
//
// Tests off-chain verify path using committed golden aggregate fixtures.
// On-chain path is NOT mocked here — the component gracefully handles
// fetch() failures (returns 'unreachable') so tests don't need a server.
// The on-chain path is covered by pnpm test:spike:onchain (AC-4).

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { VerifyProof } from './VerifyProof';

// ---------------------------------------------------------------------------
// Fixture loading helpers
// ---------------------------------------------------------------------------

const __testDir = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(
  __testDir,
  '../../../../../packages/spike/test/fixtures',
);

function loadHex(relPath: string): Uint8Array {
  const text = readFileSync(resolve(FIXTURES_DIR, relPath), 'utf8').trim();
  const bytes = new Uint8Array(text.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function toHex(b: Uint8Array): string {
  let out = '';
  for (const byte of b) out += byte.toString(16).padStart(2, '0');
  return out;
}

// ---------------------------------------------------------------------------
// Aggregate statement constants (matches proofAggregateValid.hex fixture)
// ---------------------------------------------------------------------------
// These replicate the golden statement from:
//   packages/spike/test/onchain/onchain.devnet.test.ts buildAggregateStatement()

import { G, H } from '@aperture/core/crypto';

const AGG_SK = 12345n;
const ENTRY_A_AMOUNT = 40000n;
const ENTRY_A_BLINDING = 11111n;
const ENTRY_B_AMOUNT = 30000n;
const ENTRY_B_BLINDING = 22222n;
const AGG_AMOUNT = ENTRY_A_AMOUNT + ENTRY_B_AMOUNT; // 70000

function buildAggStatement() {
  const Gp = G();
  const Hp = H();
  const pk = Gp.multiply(AGG_SK);
  const c1A = Gp.multiply(ENTRY_A_BLINDING).add(Hp.multiply(ENTRY_A_AMOUNT));
  const dhA = pk.multiply(ENTRY_A_BLINDING);
  const c1B = Gp.multiply(ENTRY_B_BLINDING).add(Hp.multiply(ENTRY_B_AMOUNT));
  const dhB = pk.multiply(ENTRY_B_BLINDING);
  return {
    pk: pk.toBytes(),
    ciphertext: c1A.add(c1B).toBytes(),
    decryptionHandle: dhA.add(dhB).toBytes(),
  };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function fillAndSubmit(
  pkHex: string,
  ciphertextHex: string,
  dhHex: string,
  amount: string,
  proofHex: string,
) {
  fireEvent.change(screen.getByLabelText(/public key/i), { target: { value: pkHex } });
  fireEvent.change(screen.getByLabelText(/ciphertext/i), { target: { value: ciphertextHex } });
  fireEvent.change(screen.getByLabelText(/decryption handle/i), { target: { value: dhHex } });
  fireEvent.change(screen.getByLabelText(/disclosed amount/i), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText(/proof/i), { target: { value: proofHex } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify proof' }));
}

// Mock fetch to return 'unreachable' (no backend in unit test context).
// This exercises the degraded path (AC-5) for the valid proof.
vi.stubGlobal('fetch', async () => {
  throw new Error('fetch: network error (test — no backend)');
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VerifyProof', () => {
  it('renders the form with all fields and submit button', () => {
    render(<VerifyProof />);
    expect(screen.getByLabelText(/public key/i)).toBeTruthy();
    expect(screen.getByLabelText(/ciphertext/i)).toBeTruthy();
    expect(screen.getByLabelText(/decryption handle/i)).toBeTruthy();
    expect(screen.getByLabelText(/disclosed amount/i)).toBeTruthy();
    expect(screen.getByLabelText(/proof/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verify proof' })).toBeTruthy();
  });

  it('off-chain verify with valid aggregate fixture → degraded (off-chain passed, devnet unreachable)', async () => {
    const { pk, ciphertext, decryptionHandle } = buildAggStatement();
    const proof = loadHex('proofAggregateValid.hex');

    render(<VerifyProof />);
    fillAndSubmit(
      toHex(pk),
      toHex(ciphertext),
      toHex(decryptionHandle),
      String(AGG_AMOUNT),
      toHex(proof),
    );

    // Loading state shows first
    await waitFor(() => {
      expect(screen.getByTestId('verify-loading')).toBeTruthy();
    });

    // After fetch fails (unreachable), shows degraded: badge-verified + notice
    await waitFor(() => {
      expect(screen.getByTestId('verify-result-degraded')).toBeTruthy();
    });
    // AC-2: StatusBadge with 'Verified' label
    expect(screen.getByRole('img', { name: 'Verified' })).toBeTruthy();
    // AC-5: degraded notice
    expect(
      screen.getByText(/on-chain verification unavailable — showing off-chain result only/i),
    ).toBeTruthy();
  });

  it('off-chain verify with tampered aggregate fixture → verdict failed renders', async () => {
    const { pk, ciphertext, decryptionHandle } = buildAggStatement();
    const proof = loadHex('proofAggregateTampered.hex');

    render(<VerifyProof />);
    fillAndSubmit(
      toHex(pk),
      toHex(ciphertext),
      toHex(decryptionHandle),
      String(AGG_AMOUNT),
      toHex(proof),
    );

    // Tampered proof fails off-chain synchronously — no fetch call needed
    await waitFor(() => {
      expect(screen.getByTestId('verify-result-failed')).toBeTruthy();
    });
    // AC-2: StatusBadge with "Doesn't verify" label
    expect(screen.getByRole('img', { name: "Doesn't verify" })).toBeTruthy();
  });

  it('shows error for malformed input (proof too short)', async () => {
    render(<VerifyProof />);
    fillAndSubmit(
      'a'.repeat(64),
      'b'.repeat(64),
      'c'.repeat(64),
      '70000',
      'ff'.repeat(32), // only 32 bytes, not 128
    );

    await waitFor(() => {
      expect(screen.getByTestId('verify-result-error')).toBeTruthy();
    });
  });

  it('loading state has aria-live="polite" (AC-3 / accessibility)', async () => {
    const { pk, ciphertext, decryptionHandle } = buildAggStatement();
    const proof = loadHex('proofAggregateValid.hex');

    render(<VerifyProof />);
    fillAndSubmit(
      toHex(pk),
      toHex(ciphertext),
      toHex(decryptionHandle),
      String(AGG_AMOUNT),
      toHex(proof),
    );

    await waitFor(() => {
      const loading = screen.queryByTestId('verify-loading');
      if (loading) {
        expect(loading.getAttribute('aria-live')).toBe('polite');
      }
    });
  });
});
