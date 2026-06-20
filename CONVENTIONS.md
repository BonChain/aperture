# CONVENTIONS — Forked / Modified / Built-new Ledger

> Provenance ledger for the Aperture project (Story 1.1a).
> Tag `upstream-baseline` marks the vanilla Contra baseline; every commit after
> that tag must be classifiable under one of: **Forked**, **Modified**, or **Built-new**.

## Pins
- **Upstream:** `https://github.com/MystenLabs/confidential-transfers` @ `a0ec1e08996074b11ade2a1ede035cf5a108d291` (HEAD of `main` on 2026-06-20)
- **Pinned ts-sdk version:** `1.0.0`
- See `vendor/contra/PINNED_VERSION` for the canonical pair (Move sha + ts-sdk version).

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
1. `vendor/contra` submodule HEAD (via `git submodule update --remote vendor/contra` + new commit)
2. `move/Move.toml` `rev = "..."` (and Move sources rebuilt via Story 1.1b/1.1c)
3. `.npmrc` pin comment + the adapter test in `packages/sdk/adapterVersion.test.ts`
