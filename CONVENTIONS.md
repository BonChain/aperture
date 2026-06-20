# CONVENTIONS — Forked / Modified / Built-new Ledger

> Provenance ledger for the Aperture project (Story 1.1a).
> Tag `upstream-baseline` marks the vanilla Contra baseline; every commit after
> that tag must be classifiable under one of: **Forked**, **Modified**, or **Built-new**.

## Pins
- **Upstream:** `https://github.com/MystenLabs/confidential-transfers` @ `a0ec1e08996074b11ade2a1ede035cf5a108d291` (HEAD of `main` on 2026-06-20)
- **Pinned ts-sdk version:** `1.0.0`
- See `vendor/contra/PINNED_VERSION` for the canonical pair (Move sha + ts-sdk version).
- **Sui Move framework rev:** `73dd2c2ba6f9fdb21d7ffde2b50a3f2f0ac39bc1`
  - Matches the framework rev pinned in `vendor/contra/move/Move.lock` (devnet + mainnet environments).
  - Pinned in `aperture/move/Move.toml` `[dependencies] Sui = { ... rev = "73dd2c2…" }` (lands in Story 1.1b).
  - **Decision rationale (2026-06-20):** option (a) — pin to vendor/contra's rev for "no drift" with the vendored upstream. The v1.73.2 sui binary (newer than this rev) is back-compatible with this framework rev at build time. Note: running `sui move build` in `vendor/contra/move/` with the v1.73.2 binary will rewrite `vendor/contra/move/Move.lock` to the binary's bundled rev — this is expected Move behavior (Move.lock is a derived artifact), not a pin drift. To re-pin: update this entry + the Sui rev in `aperture/move/Move.toml` atomically.

## Toolchain
- **sui CLI:** `sui 1.73.2-1f6e1e6dd72d` (`mainnet-v1.73.2`, published 2026-06-17)
  - Installed at `~/sui/bin/sui` (WSL2 Ubuntu 26.04)
  - PATH export: `export PATH="$HOME/sui/bin:$PATH"` (in `~/.bashrc`)
  - Source: prebuilt tarball from `https://github.com/MystenLabs/sui/releases/download/mainnet-v1.73.2/sui-mainnet-v1.73.2-ubuntu-x86_64.tgz`
  - Re-pin policy: when the installed `sui` binary changes, record the new version here AND update `scripts/preflight.sh` so the version assertion tracks.

## Ledger

| Class        | Scope                                                                 | Notes                                                                                  |
|--------------|-----------------------------------------------------------------------|----------------------------------------------------------------------------------------|
| **Forked**   | `vendor/contra/` (read-only submodule)                                | Vendored, NEVER edit in place. Re-pin only via the submodule machinery.                 |
| **Built-new**| Mode B (Proof-of-Figure)                                                | Aggregated disclosure proof + verifier (own invention, not derived from Contra).         |
| **Built-new**| `move/` — role-disclosure + recipient-cap + treasury wrap logic        | Aperture-specific Move contracts, NOT in upstream Contra.                                |
| **Built-new**| `packages/core/crypto/` — isomorphic ElGamal/bulletproofs helpers      | Thin shim over vendored `bulletproofs-wasm`; no `node:*` imports.                       |
| **Built-new**| `packages/sdk/` — `@aperture/sdk` adapter                              | Re-exports vendored Contra ts-sdk with a single pinned-version assert.                   |
| **Modified** | (none yet)                                                            | Future kaisho web-base prune (Tenny's collaborator slice, feeds Story 1.0).              |

## Anti-reskin statement
`git diff upstream-baseline..HEAD` (and `git diff upstream-baseline..HEAD -- vendor/contra`) is the
auditable evidence of original work. The upstream subtree is the unchanged vanilla baseline; every
Aperture change is a new commit on top.

## Re-pin policy
When the upstream Contra commit changes, all three pin locations must be updated atomically:
1. `vendor/contra` submodule HEAD (set explicitly via `git -C vendor/contra checkout <NEW_SHA>`; do **not** rely on `git submodule update --remote` — the `.gitmodules` deliberately omits `branch =` to disable that path, per code-review D1)
2. `move/Move.toml` `rev = "..."` (and Move sources rebuilt via Story 1.1b/1.1c)
3. `.npmrc` pin comment + the adapter test in `packages/sdk/adapterVersion.test.ts`

The 4th location — `vendor/contra/PINNED_VERSION` — is regenerated on every `pnpm install`
(via the `postinstall` script in the root `package.json`, per code-review D2). It is the only
way a fresh clone gets a valid pin file before `pnpm test` runs.
