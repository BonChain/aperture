// Fixture entries for Story 3.1 UI and Story 3.2 proof generation.
// Amounts match SPIKE-1 aggregate round-trip constants. Do not rename ids.
// Note: A+B = 70000 > 65535 (LIMB0_MAX) — the bound fires when both are selected.

export interface MockEntry {
	id: string;
	label: string;
	amount: bigint;
	blinding: bigint;
}

export const MOCK_ENTRIES: readonly MockEntry[] = [
	{ id: 'entry-a', label: 'Consulting — Q1', amount: 40000n, blinding: 11111n },
	{ id: 'entry-b', label: 'Consulting — Q2', amount: 30000n, blinding: 22222n },
	{ id: 'entry-c', label: 'Workshop fee', amount: 8000n, blinding: 33333n },
	{ id: 'entry-d', label: 'Reimbursement', amount: 500n, blinding: 44444n },
] as const;
