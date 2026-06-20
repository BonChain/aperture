import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuditLogRow } from './AuditLogRow';
import { DataTable } from './DataTable';
import { DisclosureReceiptCard } from './DisclosureReceiptCard';
import { EmptyState, ErrorCard, SkeletonLoader } from './StatePrimitives';

describe('DataTable frame (DR9)', () => {
	it('renders uppercase label headers and a sunken body, slots rows', () => {
		render(
			<DataTable columns={['Recipient', 'Amount']}>
				<tr>
					<td>r1</td>
					<td>x</td>
				</tr>
			</DataTable>,
		);
		expect(screen.getByRole('columnheader', { name: 'Recipient' })).toHaveClass('type-label');
		expect(screen.getByText('r1')).toBeInTheDocument();
	});
});

describe('AuditLogRow frame (DR10, UX-DR24)', () => {
	it('renders a hash-chain marker and NO edit/delete affordance ever', () => {
		const { container } = render(<AuditLogRow>actor · action · time</AuditLogRow>);
		expect(container.querySelector('[data-glyph="chain-marker"]')).not.toBeNull();
		expect(container.querySelector('button')).toBeNull();
		expect(screen.queryByRole('button', { name: /edit|delete|remove/i })).toBeNull();
	});

	it('hides the chain marker for the genesis row', () => {
		const { container } = render(<AuditLogRow chained={false}>genesis</AuditLogRow>);
		const marker = container.querySelector('[data-glyph="chain-marker"]') as HTMLElement;
		expect(marker.style.display).toBe('none');
	});
});

describe('DisclosureReceiptCard frame (DR11)', () => {
	it('lays out holder / disclosed / count / proof / result slots', () => {
		render(
			<DisclosureReceiptCard
				holder="0xabc"
				disclosed="3,000.00"
				includedCount="3 entries included"
				proofBlob="0a3f…"
				result={<span>ok</span>}
			/>,
		);
		expect(screen.getByText('0xabc')).toBeInTheDocument();
		expect(screen.getByText('3,000.00')).toHaveClass('type-data-lg');
		expect(screen.getByText('3 entries included')).toBeInTheDocument();
	});
});

describe('state primitives (DR20)', () => {
	it('SkeletonLoader is a busy status', () => {
		render(<SkeletonLoader lines={2} />);
		expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
	});
	it('ErrorCard is an alert', () => {
		render(<ErrorCard>boom</ErrorCard>);
		expect(screen.getByRole('alert')).toHaveTextContent('boom');
	});
	it('EmptyState shows its title', () => {
		render(<EmptyState title="No recipients yet.">add some</EmptyState>);
		expect(screen.getByText('No recipients yet.')).toBeInTheDocument();
	});
});
