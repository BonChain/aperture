// node:* imports below are intentional — test infrastructure only.
// The lint zone scanner excludes *.test.* files so test files can use Node APIs
// (fs/path/url) to walk the real source tree and prove violations are caught.
// These imports never enter the browser bundle.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { scanForViolations } from '../../scripts/guardrails.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) out.push(full);
	}
	return out;
}

describe('lint zone — real source is clean (AC-1, AC-9)', () => {
	it('has no node:* / @mysten/* / core-crypto imports and no hex literals in components', () => {
		const violations = walk(SRC).flatMap((f) => scanForViolations(f, readFileSync(f, 'utf8')));
		expect(violations).toEqual([]);
	});
});

describe('lint zone — fails on a deliberate violation (Task 7)', () => {
	it('catches a @mysten import from a component', () => {
		const v = scanForViolations('src/shared/components/Bad.tsx', "import { x } from '@mysten/sui';");
		expect(v.map((x) => x.id)).toContain('no-mysten-import');
	});

	it('catches a core/crypto import from a component', () => {
		const v = scanForViolations('src/shared/components/Bad.tsx', "import { e } from '../core/crypto';");
		expect(v.map((x) => x.id)).toContain('no-crypto-import');
	});

	it('catches a node:* import', () => {
		const v = scanForViolations('src/shared/components/Bad.tsx', "import { readFileSync } from 'node:fs';");
		expect(v.map((x) => x.id)).toContain('no-node-import');
	});

	it('allows @mysten import from the wallet seam (shared/wallet/)', () => {
		const v = scanForViolations(
			'src/shared/wallet/walletSession.tsx',
			"import { useCurrentAccount } from '@mysten/dapp-kit';",
		);
		expect(v.map((x) => x.id)).not.toContain('no-mysten-import');
	});

	it('catches a hex color literal in a component but allows it in the theme layer', () => {
		const comp = scanForViolations('src/shared/components/Bad.tsx', 'const c = "#0B0F1A";');
		expect(comp.map((x) => x.id)).toContain('no-hex-in-component');
		const theme = scanForViolations('src/theme/tokens.ts', 'const c = "#0B0F1A";');
		expect(theme.map((x) => x.id)).not.toContain('no-hex-in-component');
	});
});
