export const DEMO_REQUEST = {
	requestId: 'demo-verifier-1',
	requesterName: 'Acme Lender',
	requiredAmount: 50_000n, // MIST
	message:
		'Prove your selected total ≥ 50,000 MIST to proceed with your loan application.',
} as const;

export type DemoRequest = typeof DEMO_REQUEST;

/**
 * Returns the active request by reading the `?request=` URL param.
 * Unknown or missing param always falls back to DEMO_REQUEST — never null, never crashes.
 */
export function getActiveRequest(): DemoRequest {
	if (typeof window !== 'undefined') {
		const param = new URLSearchParams(window.location.search).get('request');
		if (param === DEMO_REQUEST.requestId) return DEMO_REQUEST;
	}
	return DEMO_REQUEST;
}
