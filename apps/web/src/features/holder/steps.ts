// apps/web/src/features/holder/steps.ts
//
// Single source of truth for the guided Proof-of-Figure flow. The rail and the
// per-step explanation header both read from this so labels and order never drift.

import {
	IconWallet,
	IconListChecks,
	IconSparkle,
	IconBadgeCheck,
	IconFlag,
	type IconComponent,
} from '../../shared/components/icons';

export interface FlowStep {
	label: string;
	title: string;
	/** One sentence: what happens here and why it's safe. No jargon. */
	detail: string;
	/** Plain-language analogy for a non-technical user. */
	example: string;
	Icon: IconComponent;
}

// The whole flow follows one concrete story: a person proving they earn enough
// for a loan, without showing their bank statement.
export const FLOW_STEPS: readonly FlowStep[] = [
	{
		label: 'Connect',
		title: 'Connect & sign',
		detail:
			'Connect your Slush wallet and sign once. Your key is derived locally from that signature — it never leaves this browser, and nothing is spent.',
		example:
			'Like signing in with your wallet instead of a password — you prove it’s you, and it costs nothing.',
		Icon: IconWallet,
	},
	{
		label: 'Select',
		title: 'Select what to include',
		detail:
			'Choose which of your encrypted amounts go into the total. The entries you leave out stay private — the other side never sees them.',
		example:
			'Like choosing which payslips to show a landlord — you decide what counts; the rest stays hidden.',
		Icon: IconListChecks,
	},
	{
		label: 'Generate',
		title: 'Generate the proof',
		detail:
			'A small (128-byte) proof that your selected total equals what you claim — built from the encrypted amounts, never from a plain number.',
		example:
			'Like sealing those payslips in a tamper-proof envelope that shows only the total — not the individual slips.',
		Icon: IconSparkle,
	},
	{
		label: 'Verify',
		title: 'Verify without the key',
		detail:
			'The other side checks the proof and learns only the total — never your key, never which entries you chose.',
		example:
			'Like the landlord checking the seal is genuine — they trust the total without opening your bank statement.',
		Icon: IconBadgeCheck,
	},
	{
		label: 'Done',
		title: 'Disclosed — and only that',
		detail:
			'The lender has a verified total. Everything you did not select stays confidential. Selective disclosure, end to end.',
		example:
			'The lender knows you earn enough. They never saw your balance, or the payments you left out.',
		Icon: IconFlag,
	},
] as const;
