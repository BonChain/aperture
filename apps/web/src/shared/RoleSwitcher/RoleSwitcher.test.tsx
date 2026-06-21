import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { RoleSwitcher } from './RoleSwitcher';

describe('RoleSwitcher shell (AC-6)', () => {
	it('boots on the Mode B Holder front door', () => {
		const { container } = render(<RoleSwitcher />);
		const banner = container.querySelector('[data-component="role-banner"]') as HTMLElement;
		expect(banner).toHaveAttribute('data-role', 'holder');
		expect(screen.getByRole('button', { name: 'Holder' })).toHaveAttribute('aria-current', 'page');
	});

	it('renders three lens slots', () => {
		const { container } = render(<RoleSwitcher />);
		expect(container.querySelectorAll('[data-lens-slot]')).toHaveLength(3);
	});

	it('renders the lens descriptions and the Suiscan module link', () => {
		render(<RoleSwitcher />);
		expect(
			screen.getByText('Prove a figure about your encrypted activity.'),
		).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Suiscan/ })).toBeInTheDocument();
	});

	it('re-lenses on role switch (banner + accent follow the active role)', async () => {
		const user = userEvent.setup();
		const { container } = render(<RoleSwitcher />);
		await user.click(screen.getByRole('button', { name: 'Auditor' }));
		const banner = container.querySelector('[data-component="role-banner"]') as HTMLElement;
		expect(banner).toHaveAttribute('data-role', 'auditor');
		expect(banner).toHaveTextContent('designated read only');
	});
});
