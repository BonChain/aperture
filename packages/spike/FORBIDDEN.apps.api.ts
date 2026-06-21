// Sentinel file for the spike import-discipline guard. If a test file
// somehow resolves `apps/api`, vitest will load this stub instead — and
// the import-time throw makes the failure mode obvious instead of silently
// passing through to a real (and out-of-scope) implementation.
throw new Error(
  "Forbidden: packages/spike/ is not allowed to import apps/api. " +
    "The spike layer must depend only on @aperture/core + @aperture/wasm.",
);

export {};
