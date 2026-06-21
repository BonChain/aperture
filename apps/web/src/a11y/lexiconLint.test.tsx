// apps/web/src/a11y/lexiconLint.test.tsx
//
// Story 4.3: Honesty guardrail — zero banned words in rendered DOM (AC-3, NFR-9, UX-DR19).
//
// Renders each Mode B component with fixture props and scans textContent for banned words.
// Also asserts required copy strings are present.

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SelectEntries } from '../features/holder/SelectEntries';
import { VerifierRequestCard } from '../features/holder/VerifierRequestCard';
import { VerifyResult } from '../features/verifier/VerifyResult';
import { DEMO_REQUEST } from '../features/holder/demoRequest';

// ---------------------------------------------------------------------------
// Banned words (NFR-9, UX-DR19) — must never appear in user-facing DOM text
// ---------------------------------------------------------------------------

const BANNED = [
	'anonymous',
	'untraceable',
	'fully compliant',
	'ElGamal',
	'ciphertext',
	'BCS',
	'Fiat-Shamir',
	'PTB',
	'limb',
] as const;

// ---------------------------------------------------------------------------
// Required copy strings (snapshot-locked by AC-3)
// ---------------------------------------------------------------------------

// Verbatim scoped-claim disclaimer (must appear in SelectEntries, AC-3)
const SCOPED_CLAIM = 'Proves a selected sum — not total income, nor which entries were included.';

// ---------------------------------------------------------------------------
// Component fixtures
// ---------------------------------------------------------------------------

type ComponentFixture = { name: string; element: React.ReactElement };

const fixtures: ComponentFixture[] = [
	{
		name: 'SelectEntries (default entries)',
		element: <SelectEntries />,
	},
	{
		name: 'SelectEntries (empty entries)',
		element: <SelectEntries entries={[]} />,
	},
	{
		name: 'VerifierRequestCard (idle)',
		element: <VerifierRequestCard request={DEMO_REQUEST} />,
	},
	{
		name: 'VerifierRequestCard (verified)',
		element: (
			<VerifierRequestCard
				request={DEMO_REQUEST}
				verifyResult="verified"
				provedAmount={50000n}
			/>
		),
	},
	{
		name: 'VerifierRequestCard (failed)',
		element: <VerifierRequestCard request={DEMO_REQUEST} verifyResult="failed" />,
	},
	{
		name: 'VerifyResult (verified)',
		element: <VerifyResult verdict="verified" />,
	},
	{
		name: 'VerifyResult (failed)',
		element: <VerifyResult verdict="failed" />,
	},
	{
		name: 'VerifyResult (null)',
		element: <VerifyResult verdict={null} />,
	},
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Lexicon lint — banned words (AC-3, NFR-9)', () => {
	for (const { name, element } of fixtures) {
		for (const word of BANNED) {
			it(`${name}: does not contain banned word "${word}"`, () => {
				const { container } = render(element);
				const text = container.textContent ?? '';
				expect(text).not.toContain(word);
			});
		}
	}
});

describe('Lexicon lint — required copy (AC-3)', () => {
	it('SelectEntries contains the verbatim scoped-claim disclaimer', () => {
		const { container } = render(<SelectEntries />);
		expect(container.textContent).toContain(SCOPED_CLAIM);
	});

	it('SelectEntries with default entries contains the scoped-claim (not the non-production disclaimer, which belongs in App)', () => {
		// The non-production disclaimer lives in App.tsx, not in SelectEntries.
		const { container } = render(<SelectEntries />);
		expect(container.textContent).toContain(SCOPED_CLAIM);
	});

	it('VerifierRequestCard contains the scoped-claim disclaimer copy', () => {
		const { container } = render(<VerifierRequestCard request={DEMO_REQUEST} />);
		// VerifierRequestCard renders its own version of the scoped-claim
		const text = container.textContent ?? '';
		// It uses a slightly different phrasing: "not total income or which entries were included"
		expect(text).toContain('not total income');
		expect(text).toContain('which entries were included');
	});
});

// ---------------------------------------------------------------------------
// Additional honesty guardrail: private / anonymous / untraceable — case-insensitive
// ---------------------------------------------------------------------------

describe('Lexicon lint — case-insensitive honesty (AC-3)', () => {
	it('SelectEntries contains no "private" used to imply anonymity', () => {
		const { container } = render(<SelectEntries />);
		const text = (container.textContent ?? '').toLowerCase();
		// "private" in context of anonymity is banned; "private" as in "private key" in UI is also avoided
		// We specifically check for "private" as a standalone claim
		expect(text).not.toContain('private');
	});

	it('VerifierRequestCard contains no anonymity-implying "private"', () => {
		const { container } = render(<VerifierRequestCard request={DEMO_REQUEST} />);
		const text = (container.textContent ?? '').toLowerCase();
		expect(text).not.toContain('private');
	});
});
