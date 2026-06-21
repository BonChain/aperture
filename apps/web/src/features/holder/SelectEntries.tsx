import React from 'react';

import { EmptyState } from '../../shared/components/StatePrimitives';
import { NoticeDisclaimer } from '../../shared/components/NoticeDisclaimer';
import { usd } from '../../shared/format';
import { color, space } from '../../theme/tokens';

// ---------------------------------------------------------------------------
// Fixture data — values match the SPIKE-1 aggregate round-trip constants.
// Story 3.2 will consume these same ids/amounts; do not rename them.
// ---------------------------------------------------------------------------

export interface MockEntry {
	id: string;
	label: string;
	amount: bigint;
}

export const FIXTURE_ENTRIES: readonly MockEntry[] = [
	{ id: 'entry-a', label: 'Salary — June', amount: 40000n },
	{ id: 'entry-b', label: 'Consulting — Q2', amount: 30000n },
	{ id: 'entry-c', label: 'Bonus — H1', amount: 8000n },
	{ id: 'entry-d', label: 'Reimbursement', amount: 500n },
] as const;

// AR-11: client-side guard at selection time.
const LIMB0_MAX = 65535n;

function canAdd(runningSum: bigint, entryAmount: bigint): boolean {
	return runningSum + entryAmount <= LIMB0_MAX;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SelectEntriesProps {
	onSelectionChange?: (selectedIds: string[]) => void;
	/** Override the entry list; defaults to FIXTURE_ENTRIES. Pass [] to test the empty-entries state. */
	entries?: readonly MockEntry[];
}

export function SelectEntries({ onSelectionChange, entries = FIXTURE_ENTRIES }: SelectEntriesProps) {
	const [selected, setSelected] = React.useState<Set<string>>(new Set());

	const runningSum = entries.filter((e) => selected.has(e.id)).reduce(
		(acc, e) => acc + e.amount,
		0n,
	);

	function toggle(id: string) {
		// Compute the next selection in the event handler (not inside the state
		// updater) so the parent callback never fires during render.
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		setSelected(next);
		onSelectionChange?.([...next]);
	}

	const selectedCount = selected.size;
	const totalCount = entries.length;

	// empty-entries state — no entries loaded (DR20).
	if (totalCount === 0) {
		return (
			<EmptyState title="No encrypted entries yet. Connect your wallet to see entries." />
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: space.s4 }}>
			{/* Scope label — AC-4 DOM check */}
			<p className="type-label" style={{ color: color.inkSecondary }}>
				{totalCount} entries in scope
			</p>

			{/* Entry checklist */}
			<ul
				style={{
					listStyle: 'none',
					padding: 0,
					margin: 0,
					display: 'flex',
					flexDirection: 'column',
					gap: space.s2,
				}}
			>
				{entries.map((entry) => {
					const isChecked = selected.has(entry.id);
					const wouldExceed = !isChecked && !canAdd(runningSum, entry.amount);
					return (
						<li
							key={entry.id}
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: space.s1,
								padding: `${space.s2} ${space.s3}`,
								background: color.surfaceRaised,
								borderRadius: 'var(--radius-sm)',
							}}
						>
							<label
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: space.s3,
									cursor: wouldExceed ? 'not-allowed' : 'pointer',
									opacity: wouldExceed ? 0.5 : 1,
								}}
							>
								<input
									type="checkbox"
									checked={isChecked}
									disabled={wouldExceed}
									onChange={() => toggle(entry.id)}
									title={
										wouldExceed
											? 'Adding this entry exceeds what can be proven in one figure. Prove a smaller selection.'
											: undefined
									}
								/>
								<span className="type-body" style={{ flex: 1 }}>
									{entry.label}
								</span>
								<span className="type-data" style={{ color: color.inkSecondary }}>
									{usd(entry.amount)}
								</span>
							</label>
							{wouldExceed && (
								<p
									className="type-caption"
									style={{
										color: color.notice,
										margin: 0,
										paddingLeft: 'calc(16px + var(--space-3))',
									}}
								>
									Adding this entry exceeds what can be proven in one figure. Prove a smaller
									selection.
								</p>
							)}
						</li>
					);
				})}
			</ul>

			{/* Selection summary */}
			<div style={{ display: 'flex', alignItems: 'baseline', gap: space.s3 }}>
				<span
					data-testid="entry-count"
					className="type-label"
					style={{ color: color.inkSecondary }}
				>
					{selectedCount} of {totalCount} entries selected
				</span>
			</div>

			{/* Running selected-sum — AC-1, UX-DR14 */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: space.s1 }}>
				<span className="type-label" style={{ color: color.inkSecondary }}>
					Amount to prove
				</span>
				<span data-testid="selected-total" className="type-data-lg">
					{usd(runningSum)}
				</span>
			</div>

			{/* Scoped-claim disclaimer — AC-4, verbatim (snapshot-locked) */}
			<NoticeDisclaimer>
				Proves a selected sum — not total income, nor which entries were included.
			</NoticeDisclaimer>
		</div>
	);
}
