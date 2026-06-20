---
baseline_commit: 5d86f04bd84f38ee568d23fd1e882ea05f2d28db
---

# Story 1.1a: Vendored Pinned Baseline & First-Green Build

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a vendored, pinned Contra baseline with a narrow first-green build,
so that all later work rests on a reproducible foundation and the SPIKE-1 import surface is ready.

## Story Context

- **Epic:** Epic 1 — Foundation, Confidential Data Plane & Mode B Feasibility.
- **Owner:** JJ (vendor/pin, wasm, core/crypto, version assert). Collaborator slice: **Tenny prunes the kaisho web base.** [Source: epics.md#Ownership & Work Split]
- **Position in the spine:** This is the **root of the crypto/contract chain** `1.1a → 1.1b → 1.1c → 1.2a (SPIKE-1 gate)`, strictly sequential after it. It runs **in parallel with Story 1.0** (UI spine) — neither depends on the other's output. [Source: epics.md#Ordered story spine, #Epic 1 — Shared root + fork]
- **What "first-green" means HERE (narrow):** for **1.1a specifically**, green = **`wasm` builds + `core/crypto` compiles**, with the **`sdk` excluded**. The Move build/test + off-chain spike harness is Story **1.1b**; the on-chain fixture is **1.1c**. Do not over-scope 1.1a into building the whole tree. [Source: epics.md#Story 1.1a AC3; architecture.md#Build Sequencing]
- **Greenfield reality:** at story-creation the directory is **not a git repository** and none of `vendor/`, `packages/`, `move/` exist. This story includes `git init`, the vendored submodule, the workspace scaffold, and the `upstream-baseline` provenance tag. It is the literal bootstrap of the repo.

## Acceptance Criteria

1. **Preflight fails fast (AR-2, NFR-10).** Given a clean clone, when preflight runs, then `rustc` / `wasm32-unknown-unknown` target / `wasm-pack` / Node 20+ / pnpm presence is verified and **fails fast with an actionable message if missing**.

2. **Pinned submodule, hash-verified, pinned in 3 places (AR-1/3, C6).** Given the pinned commit, when `git submodule update --init --recursive` runs, then `vendor/contra` resolves at **`PINNED_COMMIT`**, the hash is verified, and the pin is reflected in **submodule HEAD, `Move.toml rev`, and `.npmrc`**.

3. **Narrow first-green: wasm → core/crypto, sdk excluded (AR-2).** Given build order, when `build:wasm` then `core/crypto` build run, then both compile **with `sdk` excluded** — first-green = **wasm builds + core/crypto compiles**.

4. **Toolchain + pinned-adapter asserted (NFR-10, C6, AR-9).** Given the tech baseline, when the toolchain is asserted, then **Node 20+, TS strict, and the pinned Move toolchain** are enforced, and the Contra SDK adapter asserts the **single pinned version** (`vendor/contra/PINNED_VERSION` pairs the Move git sha with the ts-sdk npm version; **CI fails on skew**).

5. **Provenance (AR-1).** Given provenance, when the baseline is committed, then **commit 0 is tagged `upstream-baseline`** and a **Forked / Modified / Built-new contribution ledger** is started.

6. **Windows determinism (AR-3).** Given Windows, when `build:wasm` runs, then it executes in **WSL2/container** for deterministic output (documented).

## Tasks / Subtasks

- [ ] **Task 1 — Preflight script (AC: 1)**
  - [ ] Write a preflight that checks and reports, failing fast on any missing tool: `rustc`, `rustup target add wasm32-unknown-unknown` present, `wasm-pack`, `node -v` (≥20), `pnpm -v`. Each failure names the fix.
- [ ] **Task 2 — Repo init + vendored pinned submodule (AC: 2, 5)**
  - [ ] `git init`; create the root workspace files: `package.json` (root build scripts), `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`, `tsconfig.base.json`, `.gitmodules`.
  - [ ] Add `vendor/contra` as a **read-only git submodule pinned at `PINNED_COMMIT`** (see Open Questions — the exact commit is not in the planning docs and must be supplied).
  - [ ] `git submodule update --init --recursive`; `git -C vendor/contra rev-parse HEAD` to verify the hash.
  - [ ] Create `vendor/contra/PINNED_VERSION` pairing the **Move git sha** with the **ts-sdk npm version**.
  - [ ] Reflect the pin in **3 places**: submodule HEAD, `move/Move.toml rev`, `.npmrc` comment. (`Move.toml rev` MUST equal the submodule hash.)
  - [ ] **Commit 0 = the vanilla baseline; tag it `upstream-baseline`.** Start a `CONVENTIONS.md`/ledger documenting Forked / Modified / Built-new (Built-new = Mode B + Move + role-disclosure logic).
- [ ] **Task 3 — Minimal package scaffold for the narrow green (AC: 3)**
  - [ ] Create only what the narrow green needs: `packages/wasm/` (real `build:wasm` pipeline, `pkg/` gitignored, `main → pkg/`) and `packages/core/` with a **minimal `crypto/` that stands alone** (no `types`/`proof`/abstraction yet — those are deferred until after SPIKE-1).
  - [ ] **Do NOT scaffold** `apps/api`, `apps/web` features, full `packages/core` (`types`/`proof`), `packages/utils`, `tests/invariant`, or full CI/lint across the tree — those are gated until SPIKE-1 is green. [Source: architecture.md#Build Sequencing — ⛔ Do Not build]
  - [ ] Wire root build order to **wasm → core/crypto** (pnpm topo order does NOT see Rust artifacts — enforce ordering in the root script, not via pnpm alone).
  - [ ] Verify: `pnpm build:wasm` then `core/crypto` build both succeed with `sdk` **excluded**.
- [ ] **Task 4 — Toolchain + pinned-version assertion (AC: 4)**
  - [ ] Enforce Node 20+ (`.nvmrc`), **TS strict** in `tsconfig.base.json`, and the pinned Move toolchain.
  - [ ] In `packages/sdk` (wrapper re-exporting the vendored Contra ts-sdk as `@aperture/sdk`), add `adapterVersion.test.ts` that **asserts the pinned SDK version** and a CI step that asserts the resolved ts-sdk matches `PINNED_VERSION` (**fail on skew**). NOTE: the `sdk` package may be created/wired here for the version assert but is **excluded from the first-green build target** — its full build belongs to 1.1b/SPIKE-2.
- [ ] **Task 5 — Windows wasm determinism (AC: 6)**
  - [ ] Document and script `build:wasm` to run in **WSL2/container** on this Windows 11 machine (wasm-pack + `\` vs `/` in `wasmUrl` are fragile on Windows native).
- [ ] **Task 6 — Verify the gate**
  - [ ] From a clean clone: preflight passes → submodule resolves at `PINNED_COMMIT` & hash verified → `build:wasm` green (in WSL2) → `core/crypto` compiles → `adapterVersion.test.ts` passes → `upstream-baseline` tag present. Confirm the build does **not** require `apps/*` or full-core.

## Dev Notes

### What this story is (and is not)
- **Is:** repo bootstrap + vendored pinned Contra + the wasm pipeline + an isomorphic `core/crypto` that compiles + the pinned-version assertion + provenance tag. The narrowest reproducible foundation. [Source: epics.md#Story 1.1a; architecture.md#First green build]
- **Is not:** the Move build/spike harness (that's 1.1b), the on-chain localnet fixture (1.1c), or any feature code. **Hard rule: the spike layer imports only `@aperture/core` (crypto) + `@aperture/wasm`** — if the base needs `apps/*`/`utils`/full-core, it is over-scoped; cut it. [Source: architecture.md#Build Sequencing — Hard rule]

### Selected starter = Hybrid (vendored pinned Contra + copy-then-prune kaisho)
Rationale to preserve while implementing: [Source: architecture.md#Selected Starter]
- **Pinning safety (C6):** keep Contra OUT of our build graph as a **read-only submodule** at the pinned commit; we copy from it, we don't depend on its lockfile.
- **Copy-then-prune, don't reassemble:** the `web` package starts by COPYING `kaisho` whole (worker + wasm + COOP/COEP + Vite worker config that already works), then prunes wallet routes in place — **deleting working code is safer than assembling new code.** (The prune is Tenny's slice and feeds Story 1.0.)
- **Extract the rest:** `spike` (from `payment-channel` e2e harness) and `utils` — but those land in later stories, not 1.1a.
- **Provenance / anti-reskin:** first commit is the vanilla baseline tagged `upstream-baseline`, so `git diff upstream-baseline..HEAD` is evidence of original work.

### Repo layout (target)
[Source: architecture.md#Selected Starter — Repo layout, #Complete Project Directory Structure]
```
aperture/
  pnpm-workspace.yaml ; package.json (root scripts) ; .npmrc ; .nvmrc
  tsconfig.base.json ; .gitmodules (vendor/contra @ PINNED_COMMIT)
  vendor/contra/            # submodule, read-only, PINNED_COMMIT
    PINNED_VERSION          # Move git sha + ts-sdk npm version (paired; CI asserts)
  packages/
    wasm/                   # build:wasm target (wasm-pack out); pkg/ gitignored
    core/                   # crypto/ isomorphic (no node:*), stands alone for spike1
    sdk/                    # wraps vendored Contra ts-sdk -> @aperture/sdk; adapterVersion.test.ts
  move/                     # Move.toml rev = PINNED_COMMIT  (sources land in 1.1b)
```
Pin once, reflected in 3 places (submodule HEAD, `Move.toml rev`, `.npmrc`). **No drift.** [Source: architecture.md#Selected Starter]

### First-green build commands (reference — narrow subset for 1.1a)
[Source: architecture.md#First green build]
```bash
# 0. preflight (fail fast): rustc ; rustup target add wasm32-unknown-unknown ; wasm-pack ; node -v ; pnpm -v
git submodule update --init --recursive            # vendor/contra @ PINNED_COMMIT
git -C vendor/contra rev-parse HEAD                  # verify hash
pnpm install
pnpm build:wasm                                      # wasm FIRST (run in WSL2 on Windows)
# core/crypto compiles — this is the 1.1a green line (sdk excluded)
```
The full sequence (`sdk` pack, `pnpm -r build`, prettier(+move), spike e2e smoke) belongs to **1.1b+**, not 1.1a.

### Toolchain traps (must be handled / documented)
[Source: architecture.md#Toolchain traps; epics.md AR-3]
- Build order is **wasm → sdk → apps**; pnpm topo order does NOT see Rust artifacts — **enforce in the root script.**
- `file:` ts-sdk dep does **not re-pack automatically** — a stale `.tgz` fails silently; add a `prebuild` hook / single rebuild script. (Relevant when `sdk` is built in 1.1b; note it now.)
- bulletproofs `wasmUrl` must resolve at **runtime** (Vite: copy `pkg/*.wasm` → `public/` or `?url` import) — forgetting = white screen at prove time, not build time.
- dlog table: **never `postMessage` the whole table** — use transferable/`SharedArrayBuffer`; copy kaisho's worker file as-is (tuned).
- **`Move.toml rev` must equal the submodule hash** or on-chain types won't match the SDK at runtime.
- `prettier-plugin-move` is a **SEPARATE CI gate** from `prettier` — run both; add a pre-commit hook. (Active once Move sources land in 1.1b.)
- **Windows (this machine): run `build:wasm` in WSL2/container** — wasm-pack + `\` vs `/` in `wasmUrl` are fragile natively. [Source: architecture.md#Toolchain traps; SPIKE-1 Day-1 Blockers]

### Crypto package rule (set the boundary correctly from the start)
- Primitives live **only in `packages/core/crypto`, isomorphic — no `node:*`, no DOM** (Web Crypto / noble). It MUST stand alone for SPIKE-1 with no `types`/`proof`/abstraction. [Source: architecture.md#Crypto Architecture Rule (D1), #Build Sequencing]
- Lint zone (defer the full set, but keep the principle): ban `node:*` in `core`; `@mysten/*` + `core/crypto` not imported outside adapters. Full lint across the tree is **deferred until SPIKE-1 green** — do not block 1.1a on it. [Source: architecture.md#Enforcement, #Build Sequencing]
- **Deferred to post-SPIKE-1 (do NOT build in 1.1a):** ElGamal KAT vectors, Mode B/A split lint zone, type-aware SessionKey lint, SDK version *runtime* assertion (the *test-time* pinned-version assert IS in scope here), idempotency ledger. [Source: architecture.md#Enforcement — Deferred]

### Naming & formats
- TS: `camelCase`/`PascalCase`/`SCREAMING_SNAKE`; files components `PascalCase.tsx`, other TS `camelCase.ts`, tests `*.test.ts` co-located. Move: `snake_case` modules/functions, `PascalCase` structs. [Source: architecture.md#Naming]

### Testing
- Framework: **Vitest** (kaisho precedent). [Source: architecture.md#Dev Workflow]
- In-scope tests for 1.1a: `packages/sdk/adapterVersion.test.ts` (asserts pinned SDK version) + a CI version-skew assert against `PINNED_VERSION`. The crypto round-trip / ElGamal KAT tests are **deferred** until SPIKE-1 decrypts a correct value once (don't freeze vectors on a scheme that may be rebuilt). [Source: architecture.md#Crypto Architecture Rule, #Enforcement]

### Latest-tech / version policy (critical)
- **Pin, do NOT chase latest** (C6). Vite/React/sui-sdk versions follow the **pinned Contra commit**, not npm latest. Latest-for-awareness only (do **not** upgrade to these): `@mysten/sui 2.17.0`, Vite 8.0.9, React 19. Upgrades are **atomic** and re-pin all 3 places. [Source: architecture.md#Architectural decisions provided, #Version skew]
- Contra is **unaudited beta** — pinning gives reproducibility, NOT correctness/security assurance. This is an accepted hackathon-scope risk; the single SDK adapter layer absorbs API drift. [Source: architecture.md#Gap Analysis — Accepted risks; C6]

### Project Context Reference
- No `project-context.md` exists at story-creation; guardrails derive from `epics.md` + `architecture.md` cited inline. No git history exists yet (greenfield), so no prior-commit intelligence is available — this story creates commit 0.

### Project Structure Notes
- **Shared scaffold overlap with Story 1.0:** the one-time scaffold (pnpm workspace + submodule + copy-then-pruned kaisho web base) is the predecessor of both 1.0 and 1.1a. The vendor/pin + workspace root belong to 1.1a (JJ); the **kaisho web prune is Tenny's collaborator slice** but is what Story 1.0 consumes. Coordinate so the scaffold is created once. See Open Questions. [Source: epics.md#Epic 1 — Shared root + fork, #Ownership & Work Split]
- The `apps/web` prune produces the base Story 1.0 builds on, but `apps/web` is otherwise **gated** (not built in the 1.1a first-green target).

### References
- [Source: epics.md#Story 1.1a: Vendored Pinned Baseline & First-Green Build] — story statement + all 6 ACs.
- [Source: epics.md#Ordered story spine; #Epic 1 — Shared root + fork; #Ownership & Work Split] — sequencing, parallelism, owner split.
- [Source: architecture.md#Selected Starter (Hybrid)] — rationale, repo layout, first-green commands, toolchain traps, provenance.
- [Source: architecture.md#Build Sequencing (gate-zero minimal scaffolding)] — narrow first-green definition + the ⛔ do-not-build list + the spike import hard rule.
- [Source: architecture.md#Crypto Architecture Rule (D1); #Enforcement; #Version skew] — isomorphic crypto, deferred enforcement, pinned-version assertion.
- [Source: architecture.md#SPIKE-1 Day-1 Prerequisites & Blockers] — WSL2 wasm, submodule verify (sets up 1.1b/1.1c/1.2a).

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.

### File List

## Open Questions for Tenny / JJ

1. **`PINNED_COMMIT` is unspecified.** The exact Contra git commit (and the paired ts-sdk npm version for `PINNED_VERSION`) is **not in `epics.md` or `architecture.md`**. JJ must supply the specific Contra commit to pin before this story can be implemented — it is the single most load-bearing decision in the repo.
2. **Scaffold ownership.** Should the one-time scaffold (workspace root + submodule + pruned kaisho web base) be a tiny shared task so Story 1.0 (Tenny) and the rest of 1.1a (JJ) start cleanly in parallel, or does JJ create the root + submodule and Tenny prune the web base as a coordinated first commit? (Same question mirrored in Story 1.0.)
3. **Is `packages/sdk` in or out of 1.1a?** AC3 says first-green excludes `sdk`, but AC4 requires the pinned-SDK-version assertion (which lives in `packages/sdk/adapterVersion.test.ts`). Confirm the intended split: create + test-assert `sdk` here, but exclude it from the *build* target — that's how this story is written. Flag if you want the version assert moved earlier/later.
