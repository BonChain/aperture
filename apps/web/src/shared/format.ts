// apps/web/src/shared/format.ts
//
// Demo money formatting. The on-chain unit is MIST; for the lender story we
// present amounts as dollars in user-facing copy (MIST stays in technical detail).

/** Format an amount as "$1,234" for the demo narrative. */
export function usd(amount: bigint | number | string): string {
	let n: bigint;
	if (typeof amount === 'bigint') n = amount;
	else if (typeof amount === 'number') n = BigInt(Math.trunc(amount));
	else n = BigInt(amount.trim() === '' ? '0' : amount.trim());
	return `$${n.toLocaleString('en-US')}`;
}
