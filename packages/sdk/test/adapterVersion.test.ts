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
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// REPO_ROOT is 4 `..` up from this test file:
//   packages/sdk/test/adapterVersion.test.ts  →  packages/sdk/test  →  packages/sdk  →  packages  →  REPO_ROOT
const REPO_ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");

function readPin(): { moveGitSha: string; tsSdkVersion: string } {
  const pinPath = join(REPO_ROOT, "vendor", "contra", "PINNED_VERSION");
  if (!existsSync(pinPath)) {
    throw new Error(
      `PINNED_VERSION not found at ${pinPath}. ` +
        `Run \`pnpm install\` (which triggers postinstall → scripts/regen-pin.sh).`,
    );
  }
  const text = readFileSync(pinPath, "utf8");
  const move = text.match(/Move git sha:\s*([0-9a-f]{40})/i);
  const tsSdk = text.match(/ts-sdk version:\s*(\S+)/);
  if (!move) throw new Error(`PINNED_VERSION missing 'Move git sha' line`);
  if (!tsSdk) throw new Error(`PINNED_VERSION missing 'ts-sdk version' line`);
  // Patching P17: normalize the captured SHA to lowercase so a hand-typed
  // uppercase hex in PINNED_VERSION can't sneak past the regex while the
  // submodule comparison fails on case mismatch.
  return {
    moveGitSha: move[1].toLowerCase(),
    tsSdkVersion: tsSdk[1],
  };
}

function readVendoredTsSdkVersion(): string {
  const pkgPath = join(REPO_ROOT, "vendor", "contra", "ts-sdk", "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(
      `Vendored ts-sdk package.json not found at ${pkgPath}. ` +
        `Did the submodule finish cloning?`,
    );
  }
  let pkg: { version?: string };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse vendored ts-sdk package.json: ${msg}`);
  }
  if (!pkg.version) {
    throw new Error(`Vendored ts-sdk package.json has no 'version' field`);
  }
  return pkg.version;
}

async function readNpmrc(): Promise<string> {
  const npmrcPath = join(REPO_ROOT, ".npmrc");
  if (!existsSync(npmrcPath)) {
    throw new Error(`.npmrc not found at ${npmrcPath}`);
  }
  return readFile(npmrcPath, "utf8");
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
    // Patching P2: do not silently skip when git is missing — that would let
    // a real skew pass green in a sandbox without git. Refuse to run instead.
    if (!existsSync(join(REPO_ROOT, "vendor", "contra", ".git"))) {
      throw new Error(
        "vendor/contra/.git missing — submodule not initialised. " +
          "Run `git submodule update --init --recursive`.",
      );
    }
    const pin = readPin();
    const submoduleHead = execSync("git -C vendor/contra rev-parse HEAD", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    })
      .trim()
      .toLowerCase();
    expect(submoduleHead).toBe(pin.moveGitSha);
  });

  it("the pinned Move git sha is mirrored in move/Move.toml 'rev =' line", () => {
    // Patching P3: anchor the Move.toml assert to the `rev =` line so a
    // drift between the comment and the rev field fails the test.
    const pin = readPin();
    const moveTomlPath = join(REPO_ROOT, "move", "Move.toml");
    if (!existsSync(moveTomlPath)) {
      throw new Error(`move/Move.toml not found at ${moveTomlPath}`);
    }
    const text = readFileSync(moveTomlPath, "utf8");
    const revLine = text.match(/^\s*rev\s*=\s*"([0-9a-f]{40})"/im);
    if (!revLine) {
      throw new Error(`move/Move.toml has no 'rev = "..."' line`);
    }
    expect(revLine[1].toLowerCase()).toBe(pin.moveGitSha);
  });

  it("the pinned Move git sha is mirrored in .npmrc comment (P4/P10)", async () => {
    // Patching P4: the third leg of the anti-drift triangle — the .npmrc
    // pin comment — was previously not asserted. Cover it here.
    const pin = readPin();
    const npmrc = await readNpmrc();
    if (!npmrc.includes(pin.moveGitSha)) {
      throw new Error(
        `.npmrc does not mention the pinned Move sha ${pin.moveGitSha}. ` +
          `Update the pin comment to mirror the canonical pin.`,
      );
    }
  });
});
