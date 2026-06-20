import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// SPIKE layer import discipline (architecture: Build Sequencing — Hard rule):
// spike1 must import ONLY @aperture/core (crypto) + @aperture/wasm.
// If it needs apps/* or packages/utils, the base is over-scoped — cut it.
// This config asserts no `apps/` alias resolves from packages/spike/.
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      // Explicitly forbid resolving apps/* — any test that imports them
      // will throw MODULE_NOT_FOUND at resolve time. If you need them,
      // the spike has outgrown its scope; redesign before widening.
      "apps/api": resolve(here, "./FORBIDDEN.apps.api.ts"),
      "apps/web": resolve(here, "./FORBIDDEN.apps.web.ts"),
    },
  },
});
