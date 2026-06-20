import type { CSSProperties, ReactNode } from 'react';

import { color, space } from './theme/tokens';
import { RoleSwitcher } from './shared/RoleSwitcher';
import {
	AuditLogRow,
	ButtonPrimary,
	ButtonRole,
	CipherCell,
	DataTable,
	DisclosureReceiptCard,
	EmptyState,
	ErrorCard,
	NoticeDisclaimer,
	SkeletonLoader,
	StatusBadge,
} from './shared/components';
import {
	ADDRESS_FIXTURE,
	AMOUNT_FIXTURES,
	AUDIT_ENTRIES_FIXTURE,
	HOLDER_PUBKEY_FIXTURE,
	PROOF_BLOB_FIXTURE,
	SIGNATURE_CIPHER,
} from './shared/fixtures';

const section: CSSProperties = { display: 'flex', flexDirection: 'column', gap: space.s4 };
const sectionTitle: CSSProperties = { color: color.inkSecondary };

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section style={section}>
			<h2 className="type-label" style={sectionTitle}>
				{title}
			</h2>
			{children}
		</section>
	);
}

/**
 * Fixture-only contract surface (Story 1.0). The app boots on the Role-switcher
 * shell (Mode B Holder front door), then exhibits every contract component against
 * fixtures. No lens wires to real data; no `@mysten/*` / `core/crypto` is touched.
 */
export default function App() {
	return (
		<RoleSwitcher>
			<div style={{ display: 'flex', flexDirection: 'column', gap: space.s10 }}>
				<h1 className="type-display">UI Contract — fixture exhibit</h1>

				<Section title="Buttons">
					<div style={{ display: 'flex', gap: space.s3 }}>
						<ButtonPrimary>Verify</ButtonPrimary>
						<ButtonPrimary variant="secondary">Export</ButtonPrimary>
						<ButtonRole role="holder">Generate proof</ButtonRole>
					</div>
				</Section>

				<Section title="Cipher cell — the signature (same cipherId, two states)">
					<div style={{ display: 'flex', gap: space.s10 }}>
						<CipherCell cipherId={SIGNATURE_CIPHER.cipherId} value={SIGNATURE_CIPHER.value} />
						<CipherCell
							cipherId={SIGNATURE_CIPHER.cipherId}
							value={SIGNATURE_CIPHER.value}
							state="revealed"
						/>
					</div>
				</Section>

				<Section title="Status badges">
					<div style={{ display: 'flex', gap: space.s3 }}>
						<StatusBadge verdict="verified" />
						<StatusBadge verdict="failed" label="Doesn't verify" />
					</div>
				</Section>

				<Section title="Notice / disclaimer">
					<NoticeDisclaimer>
						Proves a selected sum — not total income, nor which entries were included.
					</NoticeDisclaimer>
				</Section>

				<Section title="Data table (frame)">
					<DataTable columns={['Recipient', 'Amount', 'Status']}>
						{AMOUNT_FIXTURES.map((c, i) => (
							<tr key={c.cipherId}>
								<td className="type-data" style={{ padding: `${space.rowY} ${space.s4}` }}>
									{ADDRESS_FIXTURE.slice(0, 10)}…
								</td>
								<td style={{ padding: `${space.rowY} ${space.s4}`, textAlign: 'right' }}>
									<CipherCell cipherId={c.cipherId} value={c.value} state={i === 2 ? 'revealed' : 'masked'} />
								</td>
								<td style={{ padding: `${space.rowY} ${space.s4}` }}>
									<StatusBadge verdict="verified" label="Registered" />
								</td>
							</tr>
						))}
					</DataTable>
				</Section>

				<Section title="Audit log (frame — append-only, no edit/delete)">
					<div>
						{AUDIT_ENTRIES_FIXTURE.map((e) => (
							<AuditLogRow key={e.seq} chained={!e.genesis}>
								{e.actor} · {e.action} · {e.at}
							</AuditLogRow>
						))}
					</div>
				</Section>

				<Section title="Disclosure receipt (frame)">
					<DisclosureReceiptCard
						holder={HOLDER_PUBKEY_FIXTURE}
						disclosed="3,000.00 USDC"
						includedCount="3 entries included"
						proofBlob={PROOF_BLOB_FIXTURE}
						result={<StatusBadge verdict="verified" />}
					/>
				</Section>

				<Section title="State primitives">
					<SkeletonLoader />
					<ErrorCard>Couldn't reach the network. Try again.</ErrorCard>
					<EmptyState title="No recipients yet.">Add up to 7 to start a payment run.</EmptyState>
				</Section>
			</div>
		</RoleSwitcher>
	);
}
