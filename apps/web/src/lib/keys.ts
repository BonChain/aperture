// apps/web/src/lib/keys.ts
import { makeSessionKey, type SessionKey } from '@aperture/core/proof';

/**
 * Derive a session key from a wallet signature via HKDF-SHA256.
 *
 * The signature bytes come from `signPersonalMessage` (Mysten wallet adapter).
 * info = role name (e.g. "holder") as UTF-8 bytes so each role derives a
 * distinct key even from the same signature.
 *
 * The result is a 32-byte SessionKey branded type. It is cached in React
 * state only — never persisted, never serialised (toJSON throws on SessionKey).
 */
export async function deriveSessionKey(sigBytes: Uint8Array, role: string): Promise<SessionKey> {
	// Copy into a guaranteed ArrayBuffer-backed Uint8Array (TypeScript strict BufferSource requirement).
	const sigBuf: Uint8Array<ArrayBuffer> = new Uint8Array(sigBytes);
	const keyMaterial = await crypto.subtle.importKey(
		'raw', sigBuf, { name: 'HKDF' }, false, ['deriveBits'],
	);
	const info = new TextEncoder().encode(role);
	const saltBuf: Uint8Array<ArrayBuffer> = new Uint8Array(32);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'HKDF', hash: 'SHA-256', salt: saltBuf, info },
		keyMaterial, 256,
	);
	return makeSessionKey(new Uint8Array(bits));
}
