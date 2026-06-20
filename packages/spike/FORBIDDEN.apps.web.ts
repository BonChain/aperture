throw new Error(
  "Forbidden: packages/spike/ is not allowed to import apps/web. " +
    "The spike layer must depend only on @aperture/core + @aperture/wasm.",
);

export {};
