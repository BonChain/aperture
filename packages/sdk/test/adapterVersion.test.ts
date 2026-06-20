// packages/sdk/test/adapterVersion.test.ts
//
// Asserts that the vendored Contra ts-sdk version matches the canonical pin in
// vendor/contra/PINNED_VERSION. Per Story 1.1a AC4: "CI fails on skew".
//
// In 1.1a, the test reads the canonical pin file and asserts the in-tree
// ts-sdk package.json's `version` field matches. The full SDK build (and
// runtime version assertion) lands in Story 1.1b.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// REPO_ROOT is 3 levels up from this test file:
//   packages/sdk/test/adapterVersion.test.ts  →  packages/sdk/test  →  packages/sdk  →  packages  →  REPO_ROOT
const REPO_ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");

function readPin(): { moveGitSha: string; tsSdkVersion: string } {
  const pinPath = join(REPO_ROOT, "vendor", "contra", "PINNED_VERSION");
  if (!existsSync(pinPath)) {
    throw new Error(
      `PINNED_VERSION not found at ${pinPath}. ` +
        `Run \`git submodule update --init --recursive\` and re-run.`,
    );
  }
  const text = readFileSync(pinPath, "utf8");
  const move = text.match(/Move git sha:\s*([0-9a-f]{40})/i);
  const tsSdk = text.match(/ts-sdk version:\s*(\S+)/);
  if (!move) throw new Error(`PINNED_VERSION missing 'Move git sha' line`);
  if (!tsSdk) throw new Error(`PINNED_VERSION missing 'ts-sdk version' line`);
  return { moveGitSha: move[1], tsSdkVersion: tsSdk[1] };
}

function readVendoredTsSdkVersion(): string {
  const pkgPath = join(REPO_ROOT, "vendor", "contra", "ts-sdk", "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(
      `Vendored ts-sdk package.json not found at ${pkgPath}. ` +
        `Did the submodule finish cloning?`,
    );
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
  if (!pkg.version) {
    throw new Error(`Vendored ts-sdk package.json has no 'version' field`);
  }
  return pkg.version;
}

describe("@aperture/sdk adapter — pinned version assert", () => {
  it("PINNED_VERSION file exists and parses", () => {
    const pin = readPin();
    expect(pin.moveGitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(pin.tsSdkVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("vendored ts-sdk package.json version matches PINNED_VERSION", () => {
    const pin = readPin();
    const tsSdkVersion = readVendoredTsSdkVersion();
    expect(tsSdkVersion).toBe(pin.tsSdkVersion);
  });

  it("the pinned Move git sha matches the active submodule HEAD", () => {
    // The submodule is at REPO_ROOT/vendor/contra; the active commit is what
    // git tracks. We compare it against the PINNED_VERSION line. If they
    // diverge, the pin is stale.
    const pin = readPin();
    // Submodule HEAD via raw fs read of .git/modules/vendor/contra/HEAD
    // is fragile across git versions. We instead re-verify via `git` only
    // if it's available; otherwise skip with a clear message.
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    let submoduleHead: string;
    try {
      submoduleHead = execSync("git -C vendor/contra rev-parse HEAD", {
        cwd: REPO_ROOT,
        encoding: "utf8",
      }).trim();
    } catch (err) {
      // Skip on systems without git (e.g. some CI sandboxes).
      console.warn("git unavailable — skipping submodule HEAD assert");
      return;
    }
    expect(submoduleHead).toBe(pin.moveGitSha);
  });
});
