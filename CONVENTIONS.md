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
- **sui CLI (target for SPIKE-1 on devnet):** `sui@devnet-1.73.0` (protocol 125, matches the devnet chain id pinned in `move/Move.toml`)
  - Install via `suiup install sui@devnet-1.73.0 && suiup default set sui@devnet-1.73.0`
  - Verified: `sui --version` reports `1.73.0-...`
- **sui CLI (currently installed on this box, recorded 2026-06-20):** `sui 1.73.1-ff1fe0ec4551` (testnet channel, installed via suiup)
  - Installed at `$HOME/.local/bin/sui` (WSL2 Ubuntu 26.04)
  - This was installed prior to the SPIKE-1 devnet decision (1.1a baseline). SPIKE-1 on devnet requires the **devnet channel** sui binary; re-pin to `sui@devnet-1.73.0` per the target above.
  - PATH export: `export PATH="$HOME/.local/bin:$PATH"` (suiup default location; in `~/.bashrc`)
  - Re-pin policy: when the installed `sui` binary changes, record the new version here AND update `scripts/preflight.sh` so the version assertion tracks.

## Devnet (SPIKE-1 on-chain target)
- **Active env:** `devnet` (`https://fullnode.devnet.sui.io:443`)
- **Current devnet chain id (as of 2026-06-20):** `5ea2c653` — see `sui client chain-identifier` after `sui client switch --env devnet`.
- **Pin in `move/Move.toml`:** `devnet = "4fe43958"` (historical chain id from the vendored Contra submodule at the time of pinning; the upstream vendor carries this exact value).
- **Chain id drift handling:** the historical pin in `Move.toml` is the *build-time* assertion, not the *publish-time* target. `sui move build` resolves the framework rev via the pin; `sui client publish` targets the CLI's active env. If the build errors with a chain-id mismatch, see Story 1.1c "devnet reset" section below.
- **Devnet reset policy:** devnet is periodically wiped. After a reset:
  1. The pinned Move framework rev may advance (regen `move/Move.lock`).
  2. Published `aperture` package ids from before the reset are lost.
  3. Re-run `pnpm pretest:devnet && pnpm publish:devnet` to republish; `scripts/.published-devnet.json` regenerates with the new id.

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
