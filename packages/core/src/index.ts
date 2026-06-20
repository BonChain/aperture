// Re-exports for the Aperture core package.
// Story 1.1a only ships `crypto/` — `types`, `proof`, and other modules are
// deferred until after SPIKE-1 (per AC3 / architecture "Crypto Architecture Rule D1").
export * as crypto from "./crypto/index.js";
