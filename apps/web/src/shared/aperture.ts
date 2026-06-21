// apps/web/src/shared/aperture.ts
//
// Single source for the on-chain aperture package coordinates. Devnet resets
// mint a new package id — override with VITE_APERTURE_PACKAGE_ID per deploy.

export type SuiNetwork = 'devnet' | 'testnet' | 'mainnet';

/** Last-published devnet package (scripts/.published-devnet.json). */
export const APERTURE_DEVNET_PACKAGE_ID =
	'0x015d6cd95683a97f4e09129ae6a30e6ff48704486f89b630a36875d4c87c4c49';

export const APERTURE_NETWORK: SuiNetwork = 'devnet';

/** Resolve the active package id: env override wins, else the baked devnet id. */
export function aperturePackageId(): string {
	const env = (import.meta.env.VITE_APERTURE_PACKAGE_ID as string | undefined)?.trim();
	return env || APERTURE_DEVNET_PACKAGE_ID;
}
