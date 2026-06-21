import { defineConfig } from "vitest/config";

// On-chain test config — SEPARATE from packages/spike/vitest.config.ts.
// This project INTENTIONALLY uses @mysten/sui (which the spike layer
// forbids). The 1.1b hard rule — "spike1 imports only @aperture/core +
// @aperture/wasm" — applies to packages/spike/src/**, NOT here.
export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000, // on-chain PTB confirmations need more than default 5s
    hookTimeout: 60_000,
  },
  resolve: {
    // We do NOT alias apps/* to FORBIDDEN here — this is the on-chain seam
    // and it may legitimately depend on apps/* later (Story 1.1c → 1.3).
  },
});
