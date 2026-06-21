// AuditorLens.prefill.test.tsx — the holder→auditor handoff: a generated proof
// pre-fills the verify fields so the auditor can verify it (incl. on devnet).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AuditorLens from './AuditorLens';
import type { GenerateProofResult } from '../features/holder/ProofGenerator';

function bytes(n: number, fill: number): Uint8Array {
	return new Uint8Array(n).fill(fill);
}
function toHex(b: Uint8Array): string {
	let out = '';
	for (const x of b) out += x.toString(16).padStart(2, '0');
	return out;
}

describe('AuditorLens — pre-fill from holder proof', () => {
	const proof: GenerateProofResult = {
		pk: bytes(32, 0xaa),
		c1: bytes(32, 0xbb),
		dh: bytes(32, 0xcc),
		proof: bytes(128, 0xdd),
		amount: 48000n,
	};

	it('pre-fills the verify fields and shows the handoff banner', () => {
		render(<AuditorLens proof={proof} />);
		expect(screen.getByTestId('prefilled-from-holder')).toBeInTheDocument();
		expect((screen.getByLabelText(/public key/i) as HTMLInputElement).value).toBe(toHex(proof.pk));
		expect((screen.getByLabelText(/ciphertext/i) as HTMLInputElement).value).toBe(toHex(proof.c1));
		expect((screen.getByLabelText(/decryption handle/i) as HTMLInputElement).value).toBe(toHex(proof.dh));
		expect((screen.getByLabelText(/disclosed amount/i) as HTMLInputElement).value).toBe('48000');
		expect((screen.getByLabelText(/^proof/i) as HTMLInputElement).value).toBe(toHex(proof.proof));
	});

	it('shows the proof-trace breakdown with a Suiscan module link', () => {
		render(<AuditorLens proof={proof} />);
		expect(screen.getByTestId('proof-trace')).toBeInTheDocument();
		const link = screen.getByRole('link', { name: /Suiscan/i }) as HTMLAnchorElement;
		expect(link.getAttribute('href')).toContain('suiscan.xyz/devnet/object/');
	});

	it('renders an empty form (no banner, no trace) when no proof is handed in', () => {
		render(<AuditorLens />);
		expect(screen.queryByTestId('prefilled-from-holder')).toBeNull();
		expect(screen.queryByTestId('proof-trace')).toBeNull();
		expect((screen.getByLabelText(/public key/i) as HTMLInputElement).value).toBe('');
	});
});
