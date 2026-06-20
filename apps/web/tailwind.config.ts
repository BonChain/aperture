import type { Config } from 'tailwindcss';

// Aperture reskins the inherited kaisho base. Tailwind's theme is wired to the
// Aperture design tokens (CSS custom properties in src/theme/tokens.css) so any
// utility class resolves to an Aperture token — never a raw kaisho hex. Where a
// kaisho token would have conflicted, the Aperture value defined here wins.
export default {
	content: ['./index.html', './src/**/*.{ts,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
				mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
			},
			colors: {
				surface: {
					base: 'var(--surface-base)',
					raised: 'var(--surface-raised)',
					overlay: 'var(--surface-overlay)',
					sunken: 'var(--surface-sunken)',
				},
				ink: {
					primary: 'var(--ink-primary)',
					secondary: 'var(--ink-secondary)',
					disabled: 'var(--ink-disabled)',
					inverse: 'var(--ink-inverse)',
				},
				edge: {
					hairline: 'var(--border-hairline)',
					strong: 'var(--border-strong)',
				},
				primary: {
					DEFAULT: 'var(--primary)',
					hover: 'var(--primary-hover)',
					foreground: 'var(--primary-foreground)',
				},
				verified: 'var(--verified)',
				failed: 'var(--failed)',
				notice: 'var(--notice)',
				cipher: {
					masked: 'var(--cipher-masked)',
					reveal: 'var(--cipher-reveal)',
				},
				role: {
					payer: 'var(--role-payer)',
					holder: 'var(--role-holder)',
					auditor: 'var(--role-auditor)',
				},
				ring: 'var(--ring)',
			},
			borderRadius: {
				sm: 'var(--radius-sm)',
				md: 'var(--radius-md)',
				lg: 'var(--radius-lg)',
				full: 'var(--radius-full)',
			},
		},
	},
	plugins: [],
} satisfies Config;
