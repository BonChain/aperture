//! Aperture wasm — first-green stub.
//!
//! The real bulletproofs wasm is vendored at `vendor/contra/utils/bulletproofs-wasm`
//! and re-exported by this package in Story 1.1b. This stub exists so that the
//! wasm-pack build pipeline is proven end-to-end before any cryptography lands.
//!
//! Per Story 1.1a AC3: "first-green = wasm builds + core/crypto compiles,
//! with sdk excluded".

use wasm_bindgen::prelude::*;

/// Returns a fixed u32 sentinel. Used as a canary: if `apertureStub` resolves
/// to `42` at runtime, the wasm pipeline (build → pkg/ → load) is wired up.
#[wasm_bindgen]
pub fn aperture_stub() -> u32 {
    42
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stub_returns_sentinel() {
        assert_eq!(aperture_stub(), 42);
    }
}
