// Fixture-only lint zone for apps/web (Story 1.0, AC-1 + AC-9 / AR-15).
//
// Enforces three boundaries with zero extra runtime deps:
//   1. no `node:*` imports anywhere in apps/web  (keeps the web bundle browser-safe)
//   2. no `@mysten/*` or `core/crypto` import from a lens/component (fixture-only)
//   3. no hex color literals in components — colors come from tokens only
//
// `scanForViolations` is pure so the guardrails test can prove it catches a
// deliberate violation. `pnpm lint` runs `main()` over the real tree.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

const RULES = [
	{
		id: 'no-node-import',
		appliesTo: () => true,
		test: (line) => /(?:from|import|require\()\s*['"]node:/.test(line),
		message: "node:* import is banned in apps/web (must stay browser-safe).",
	},
	{
		id: 'no-mysten-import',
		appliesTo: () => true,
		test: (line) => /(?:from|import|require\()\s*['"]@mysten\//.test(line),
		message: '@mysten/* import is banned from a lens/component (fixture-only, AR-15).',
	},
	{
		id: 'no-crypto-import',
		appliesTo: () => true,
		test: (line) => /(?:from|import|require\()\s*['"][^'"]*core\/crypto/.test(line),
		message: 'core/crypto import is banned from a lens/component (fixture-only, AR-15).',
	},
	{
		id: 'no-hex-in-component',
		// Components only — the theme layer legitimately defines hex tokens.
		appliesTo: (path) => !path.replace(/\\/g, '/').includes('/theme/'),
		// Strip line comments before matching to avoid false-positives on git SHAs,
		// CSS id selectors (#root), anchor hrefs, and TS private field syntax (#field).
		test: (line) => /#[0-9a-fA-F]{3,8}\b/.test(line.replace(/\/\/.*$/, '')),
		message: 'hex color literal in a component — read from tokens instead (AC-1).',
	},
];

/** @returns {{id:string,line:number,text:string,message:string}[]} */
export function scanForViolations(path, source) {
	const violations = [];
	const lines = source.split('\n');
	for (const rule of RULES) {
		if (!rule.appliesTo(path)) continue;
		lines.forEach((line, i) => {
			if (rule.test(line)) {
				violations.push({ id: rule.id, line: i + 1, text: line.trim(), message: rule.message });
			}
		});
	}
	return violations;
}

function walk(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		// Test files are intentionally excluded: the test infrastructure legitimately uses
		// node:* imports (fs/path/url) to walk the source tree and prove violations are caught.
		// The lint zone guards production source; test files have no bundle boundary to protect.
		else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) out.push(full);
	}
	return out;
}

function main() {
	if (!existsSync(SRC)) {
		console.error(`guardrails: SRC directory not found: ${SRC}`);
		console.error('Run this script from the apps/web directory.');
		process.exit(1);
	}
	const files = walk(SRC);
	let total = 0;
	for (const file of files) {
		let src;
		try {
			src = readFileSync(file, 'utf8');
		} catch (e) {
			console.error(`guardrails: cannot read ${relative(SRC, file)}: ${e.message}`);
			total += 1;
			continue;
		}
		const violations = scanForViolations(file, src);
		for (const v of violations) {
			total += 1;
			console.error(`${relative(SRC, file)}:${v.line}  [${v.id}] ${v.message}`);
			console.error(`    ${v.text}`);
		}
	}
	if (total > 0) {
		console.error(`\n✖ ${total} lint-zone violation(s).`);
		process.exit(1);
	}
	console.log(`✓ lint zones clean (${files.length} files).`);
}

if (process.argv[1] && process.argv[1].endsWith('guardrails.mjs')) {
	main();
}
