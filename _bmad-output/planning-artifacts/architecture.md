---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-20'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Aperture-2026-06-19/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Aperture-2026-06-19/addendum.md
  - docs/Aperture srs.md
  - docs/Contra knowledge reference.md
  - docs/Privpnl knowledge reference.md
  - docs/Sui audit console privpnl mapping.md
workflowType: 'architecture'
project_name: 'Aperture'
user_name: 'Tenny'
date: '2026-06-19'
---

# Architecture Decision Document — Aperture

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (22 FRs, 4 feature groups):**
- *Confidential Payments Data Plane* (FR-1…FR-8): org/recipient management, register, single aggregate wrap, batch run ≤7, holder balance/claim/withdraw. Architecturally: backend builds PTBs against Contra; off-chain store holds amounts; on-chain `aperture` anchor + `PaymentRun` event.
- *Mode A — Auditor Console* (FR-9…FR-14): designated-auditor key published at registration, scoped auth, `recoverPrivateKey` view, per-run report/export, audit-trail-of-audit, privacy-posture panel. God-key-per-account model — safe, buildable baseline.
- *Mode B — Proof-of-Figure* (FR-15…FR-19, SPIKE-1-gated): select entries → `Ciphertext.add` → `ElGamalNizk` → verify off-chain/on-chain (`nizk::verify_elgamal`); single-amount fallback (FR-18). The differentiated wedge.
- *Platform & Demo* (FR-20…FR-22): one-command deploy+seed, role-switch, explorer deep-links.

**Non-Functional Requirements (10 NFRs) — architectural drivers:**
- NFR-1/NFR-2 (privacy invariant): no per-recipient plaintext amount on-chain or via public API; exactly one aggregate wrap. Drives storage boundary + API authz + an automated invariant test.
- NFR-3 (disclosure correctness, security-critical): Mode B verifies iff X is true; tamper fails. Drives SPIKE-1 design (must include negative + tamper assertions).
- NFR-4 (least-visibility): per-account designation boundary; non-designated fails closed.
- NFR-5 (auditability): append-only audit trail; PoC claim = no edit/delete API; crypto tamper-evidence = **hash-chain** (chosen, see Cross-Cutting #10), on-chain anchor as roadmap.
- NFR-6 (performance): dlog table init-once/cache; balance < 2s warm; proof-gen measured; browser needs bulletproofs WASM (`wasmUrl`). **Proof-gen location (client vs server) is an OPEN decision — resolve in tech-stack step.**
- NFR-7 (reliability): full re-deploy+seed < 5 min on fresh Devnet (also the Devnet-reset recovery path).
- NFR-8 (keys, PoC): server-side keystore, non-production; only holder's own sk to browser for local decrypt (subject to the client/server proof-gen decision).
- NFR-9 (honesty): copy limited to "amount-confidential, selectively disclosable"; never "anonymous"/"compliant". Mode B = attestation of a positive claim, not a fraud-detection system.
- NFR-10 (tech baseline): Node 20+, TS strict; Move pinned toolchain (incl. `prettier-plugin-move` CI gate); open SDK.

### Scale & Complexity
- Primary domain: full-stack Web3 on Sui — Move (on-chain) + Node/TS backend + React/Vite frontend.
- Complexity level: medium–high (cryptographic integration, on/off-chain split, 3 roles, spike-gated capability), scoped to a single-operator-per-role PoC.
- Estimated architectural components: Move `aperture` package; Contra SDK adapter; backend API + services (org, payment, auditor, proof, audit-log); off-chain store; dlog/WASM/key infra; React 3-role app; deploy+seed tooling.

### Technical Constraints & Dependencies (C1–C7, inherited from Contra)
- C1 batch ≤7 (`MAX_BATCH_RECIPIENTS=7`); C2 decryption needs dlog table + secret key; C3 pending→active merge with `merge:false` retry on race (tx does not abort — emits `TryTransferFailedEvent`/`TryUnwrapFailedEvent`); C4 register-before-receive; C5 wrap/unwrap expose amount, intra-domain hides amount, graph always public; C6 pinned unaudited beta → own deployment + single SDK adapter layer (assert pinned version in adapter); C7 bounded aggregation (~2¹⁶ unmerged deposits).
- **Mode B aggregation range (added from architecture review):** `Ciphertext.add` is EC-point addition (no overflow in the ciphertext itself), but each plaintext limb must stay < 2¹⁶ to remain decryptable via the 16-bit dlog table — a limb-0 carry past 2¹⁶ yields an **UNDECRYPTABLE** sum, not a wrap. NOTE: **C1 (batch ≤7) does NOT bound this — Mode B aggregation is a different axis from `MAX_BATCH_RECIPIENTS`.** Resolution: bound-and-reject at selection time; do NOT hand-roll a range proof; prove the bound empirically in SPIKE-1 (test a deliberate limb-0 carry, assert decrypted aggregate is correct).
- External: Sui Devnet; Contra SDK + deployed Contra package (pinned commit); bulletproofs WASM; reusable apps `kaisho` (hooks + dlog web worker), `closed-loop` (permissioned registration), `payment-channel` (canonical e2e test harness + `authorize_as_object`), `utils` (test token BU, deploy/seed).

### Cross-Cutting Concerns Identified
1. Privacy boundary integrity (no plaintext amount anywhere) — spans storage, API, on-chain, copy.
2. Key management — server keystore vs holder-local decrypt; auditor recovered viewing keys.
3. Audit-trail integrity / tamper-evidence — chosen mechanism: hash-chain (see #10).
4. Performance infra — dlog table caching (web worker; consider IndexedDB persist + SharedArrayBuffer for table transfer), WASM loading, proof-generation cost.
5. Contra SDK adapter isolation (C6) — one layer absorbs upgrades; adapter test asserts pinned SDK version.
6. Spike-gating discipline — Mode B (Epic 3) blocked until SPIKE-1 passes; SPIKE-1 is a go/no-go gate done FIRST, before business objects; SPIKE-2 shapes FR-5 (fallback: split into two PTBs).
7. Honesty/no-overclaim guardrail (NFR-9) — Mode A never sold alone as "compliance"; Mode B proves a selected sum, not total income (attestation tool, not fraud detection).
8. **Client-side key lifecycle/provenance** — where each user's/auditor's secret key is born, held, destroyed. PoC default: derive deterministically from a wallet signature, never persisted. OPEN: whether proof-gen + auditor decrypt run client-side (trust story "we never see your key") or server-side (bulletproofs prove is CPU/wasm-heavy, can block the browser). Decision deferred to tech-stack step; affects UX of all 3 roles.
9. **Demo-loop robustness** — the 8-step chain (create org → register → fund → run → claim → report → prove → verify) is the #1 risk to a one-pass demo. Needs idempotency + safe re-run from a failed step without rebuilding the org. Architect priority over gold-plated edge cases.
10. **Dependency & continuity** — pinned-beta SDK version asserted in the adapter (catch API drift); off-chain store ↔ on-chain anchor checksum/reconcile; audit-trail tamper-evidence via hash-chain (`hash(prev_hash || payload)`), on-chain anchoring of the head as roadmap; recorded demo backup + Devnet-reset recovery via one-command re-seed (NFR-7).

### Open Decisions Carried Forward (from architecture review / party-mode)
- **D1 — Proof-generation & auditor-decrypt location:** client (kaisho worker) vs server (Node). Trade-off: trust story vs WASM/CPU cost. Resolve in tech-stack step.
- **D2 — SPIKE sequencing & ownership:** SPIKE-1 first (go/no-go for Mode B) with happy/negative/tamper assertions; SPIKE-2 (one-PTB wrap+transferBatch) in parallel, low severity (two-PTB fallback). Each spike needs an owner + due date.
- **D3 — Demo-loop idempotency/re-run strategy** and **recorded backup** as continuity insurance.

## Starter Template Evaluation

### Primary Technology Domain
Full-stack Web3 on Sui: Move (on-chain) + Node/TS backend + Vite/React frontend in a pnpm monorepo. Generic web starters were rejected — the hard part is Contra SDK integration (dlog table worker, bulletproofs WASM, Move↔TS PTB composition), which they don't address.

### Starter Options Considered
- **Generic Vite+React / T3** — rejected: nothing for Contra/Move; would rebuild the dlog worker + SDK hooks from scratch.
- **@mysten/create-dapp (Sui dApp starter)** — partial: plain Sui dApp only, no confidential-transfer hooks or dlog worker.
- **Fork-whole Contra example apps** — considered; risk: drags kaisho wallet UI/routing (~70% unused) into our build graph; pinning pain.
- **Extract-pieces only** — considered; risk: we re-own transitive deps + worker/wasm wiring (the #1 demo-robustness risk).
- **HYBRID (SELECTED)** — vendored pinned baseline + copy-then-prune for the parts that are tuned, extract for the rest.

### Selected Starter: Hybrid — vendored pinned Contra + copy-then-prune `kaisho`

**Rationale (reconciles the trade-offs):**
- Pinning safety (C6): keep Contra OUT of our build graph as a read-only `git submodule` at the pinned commit; we copy from it, we don't depend on its lockfile.
- Don't re-debug tuned wiring: the `web` package starts by COPYING `kaisho` whole (gets the worker + wasm + COOP/COEP + Vite worker config that already works), then prune wallet routes in place — deleting working code is safer than assembling new code.
- Extract the rest: `spike` (from `payment-channel` e2e harness + `authorize_as_object`) and `utils` (test token BU + publish/initializer → deploy+seed FR-20).
- Provenance / anti-reskin: first commit is the vanilla baseline, tagged `upstream-baseline`, so `git diff upstream-baseline..HEAD` is evidence of original work.

**Repo layout:**
```
aperture/
  pnpm-workspace.yaml ; package.json (root scripts) ; .npmrc ; .nvmrc
  vendor/contra/            # git submodule @ PINNED_COMMIT (read-only)
  packages/
    move/                   # aperture Move sources ; Move.toml rev = PINNED_COMMIT
    wasm/                   # build:wasm target (wasm-pack out)
    sdk/                    # Contra ts-sdk packed (.tgz) -> file: dep
    spike/                  # SPIKE-1/2 harness (from payment-channel)
    web/                    # our app: copy-then-pruned kaisho (hooks + dlog worker)
    utils/                  # deploy/seed + test token BU (from utils)
```
Pin once, reflected in 3 places: submodule HEAD, `Move.toml rev`, `.npmrc` comment. No drift.

**First green build (must pass before ANY feature work):**
```bash
# 0. preflight (fail fast): rustc ; rustup target add wasm32-unknown-unknown ; wasm-pack ; node -v ; pnpm -v
git submodule update --init --recursive            # vendor/contra @ PINNED_COMMIT
git -C vendor/contra rev-parse HEAD                  # verify hash
pnpm install
pnpm build:wasm                                      # wasm FIRST
pnpm --filter @aperture/sdk build && pnpm --filter @aperture/sdk pack   # .tgz file: dep
pnpm -r build                                        # web + spike
npx @mysten/prettier-plugin-move -w packages/move/sources && pnpm prettier --check .
pnpm --filter @aperture/spike test:e2e              # smoke: 100% green
```

**Toolchain traps (documented):**
- Build order is wasm → sdk → apps; pnpm topo order does NOT see Rust artifacts — enforce in root script.
- `file:` ts-sdk dep does not re-pack automatically — add a `prebuild` hook or one rebuild script (stale `.tgz` fails silently).
- bulletproofs `wasmUrl` must resolve at runtime (Vite: copy `pkg/*.wasm` to `public/` or `?url` import) — forgetting = white screen at prove time, not build time. Cover in smoke.
- dlog table: never `postMessage` the whole table — use transferable/SharedArrayBuffer; copy kaisho's worker file as-is (it's tuned).
- `Move.toml rev` must equal the submodule hash or on-chain types won't match the SDK at runtime.
- `prettier-plugin-move` is a SEPARATE CI gate from `prettier` — run both; add a pre-commit hook.
- **Windows (this machine): wasm-pack + `\` vs `/` in wasmUrl are fragile — run `build:wasm` in WSL/container for deterministic output.**

**Architectural decisions provided:** TypeScript strict + Node 20+; Move pinned toolchain; Vite/React versions follow the pinned Contra commit's kaisho (NOT latest — C6; latest for awareness: @mysten/sui 2.17.0, Vite 8.0.9, React 19); pnpm workspaces; Vitest + payment-channel e2e pattern; one Contra SDK adapter that asserts the pinned version.

### Provenance & Anti-Reskin (decision)
- Commit 0 = vanilla baseline, tagged `upstream-baseline`; maintain a Forked / Modified / Built-new contribution ledger mapping "Built-new" to Mode B + Move + role-disclosure logic.
- Visual differentiation focused on the role-switcher and the proof-of-figure flow; demo OPENS with Mode B (verifier requests proof that holder's total = X), not the wallet screen.

**Note:** Project initialization (vendor + pin + first-green build + `upstream-baseline` tag) is the first implementation story (PRD Story 1.1 / FR-20).

## Core Architectural Decisions

### Decision Priority Analysis
**Critical (block implementation):**
- D1 — Crypto execution location: **Split Hybrid.** Mode B proof-generation runs **client-side** (≥1 demo happy-path) so the holder's key never leaves the browser ("prove without surrendering your key"). Mode A auditor-decrypt runs **server-side** (an auditor is entitled to decrypt — honest shortcut). Verification runs both off-chain and on-chain (`nizk::verify_elgamal`).
- D2 — Off-chain store: **SQLite** (better-sqlite3).
- D3 — Key provenance: **derived deterministically from a wallet signature; per-request re-derive, never persisted.**
- SPIKE-1 gates all Mode B build work.

**Important (shape architecture):** single Contra SDK adapter (C6) asserting pinned version; `ProofAdapter` seam (server↔client swap); audit-trail hash-chain + external anchor; Mode B range bound-and-reject; deterministic ElGamal randomness for idempotency.

**Deferred / out of scope:** client-side migration of Mode A; on-chain anchoring beyond the genesis tie; FR-8 chunking; hand-rolled range proofs; production auth.

### Data Architecture
- **Store:** SQLite (better-sqlite3); re-seed = delete file (NFR-7). Tables per addendum §C.
- **Audit-trail (NFR-5) — corrected claim:** `AuditLog` append-only **hash-chain**, `entry_hash = SHA256(prev_hash || ":" || JCS(payload))` using **JCS / RFC 8785** (not raw `JSON.stringify`); `seq` is inside the hashed payload; `UNIQUE INDEX(seq)`. **Honest claim = tamper-EVIDENT to mid-chain mutation, NOT tamper-proof.** **Genesis is a local deterministic seed (`H(config)`), NOT the on-chain tx** — so audit writes never depend on Sui being up (revised from an earlier draft; see structure §Boundaries). The on-chain tx digest is carried as an **optional `onchainAnchor` field per entry** (best-effort attestation, backfillable). Truncate-tail still needs a periodic `(seq, entry_hash, count)` checkpoint stored outside SQLite. *Keep this lightweight — do not gold-plate beyond what the demo shows (party-mode: judges don't see it).*
- **Validation:** Zod at API boundary; bigint amounts checked against the Mode B limb bound at selection.
- **Migrations:** none (seed script creates schema). **Caching:** dlog table only.

### Authentication & Security
- **Demo auth:** role-switch (Payer / Holder / Auditor-Verifier), no production auth (FR-21).
- **Key provenance (D3):** key derived deterministically (HKDF) from a wallet signature; **per-request re-derive on the server path, never cached server-side**; client path caches the Mode B session key in browser memory only.
- **Key use location (D1 Split Hybrid):**
  - **Mode B (gen) → client:** holder's key never leaves the browser; pitch is verifiable in the network tab ("proof out, key never out"). **NFR-8 upheld for Mode B.**
  - **Mode A (decrypt) → server:** auditor key passed per-request, in-memory, never persisted; **NFR-8 relaxed for Mode A only**, labeled in demo + slide (honesty guardrail NFR-9).
- **Privacy invariant (NFR-1/2):** amounts off-chain only; API returns amounts only to owner/designated auditor; automated test asserts no plaintext on-chain/API + exactly one aggregate wrap.
- **Least-visibility (NFR-4):** per-account designation; non-designated read fails closed.

### API & Communication Patterns
- **Style:** REST (addendum §B.2).
- **`ProofAdapter` seam (enables D1 split + future migration):**
  ```ts
  interface ProofAdapter {
    generateProof(input: { statement; witness; sessionKey: SessionKey }): Promise<{ proof; ciphertext }>;
    auditorDecrypt(input: { ciphertext; auditorKey: SessionKey }): Promise<Plaintext>;
  }
  type SessionKey = { readonly __brand: 'SessionKey'; readonly bytes: Uint8Array }; // no toJSON
  ```
  Mode B uses a `ClientProofAdapter` (gen in browser); Mode A uses a `ServerProofAdapter` (HTTP wrapped INSIDE the adapter so callers know only the interface). Contract test runs both impls against the same `nizk::verify_elgamal`.
- **Contra SDK adapter (C6):** one module; adapter test asserts the pinned SDK version.
- **Error handling:** C4 "recipient not registered" → actionable UI; C3 race → detect `TryTransferFailedEvent`/`TryUnwrapFailedEvent` (no abort) → retry with the SAME idem_key using `merge:false`; terminal state + manual retry.
- **Idempotency (demo robustness):** deterministic `idem_key` per op recorded in `op_ledger(idem_key UNIQUE, status, tx_digest, result)`; check-before-send + Move-side guard + write-pending→submit→write-done. Keys: create_org `H(owner||name)`, register `H(org||member)`, fund `H(org||round||amount||deterministic_nonce)` (**no random nonce**), run `H(round||input_commitment)`, claim `H(round||claimant)`. **ElGamal encryption randomness derived deterministically** `H(sessionKey||input_commitment)` so re-run yields identical ciphertext (else idempotency breaks). Test: run-twice → `chain.txCount === 1`.

### Frontend Architecture
- **Base:** copy-then-pruned `kaisho`; reuse hooks + dlog web worker (transferable, not postMessage).
- **State:** kaisho's React Query + light local state; no second state lib.
- **Role-switch UX (trust boundaries, not 3 accounts):** switching changes the whole lens (accent color + header banner + what's visible). Signature is **lazy** (only on first entry to a role) with a **pre-sign explainer** (*"Entering as Auditor — derive your key from a one-time signature, nothing stored/spent"*) and a human-readable sign message (`Aperture: derive Auditor session key`); derived key cached in session memory.
- **Trust-boundary visual:** show the **same ciphertext "open" for the Holder and "closed (•••••)" for Payer/Auditor** — visual proof of confidentiality. Pair Mode A (decrypt-with-authority) and Mode B (verify-without-decrypt) as the compliance narrative.
- **Anti-overclaim UI:** Holder shows a selection checklist (X of N entries); Auditor verify shows a **scoped claim** + ⚠️ *"Does not prove this is their total income, nor which entries were included"*; auditor sees only "a selected subset" (opaque — never which entries, or confidentiality breaks).
- **Graceful states:** rejected signature / no-key → key-dependent buttons disabled with "Sign to unlock →", never crash/white-screen; proof-gen loading + measured time; C4 message. Demo OPENS on the Mode B flow.

### Infrastructure & Deployment
- **Chain:** Sui Devnet; pinned Contra; own deployment (C6).
- **Deploy+seed (FR-20):** one command (wasm→sdk→apps build, deploy, write config, seed org + ≥3 recipients), < 5 min; doubles as Devnet-reset recovery.
- **Hosting:** frontend on Vercel (kaisho precedent); backend local Node; SQLite file local.
- **Demo lock:** one wallet drives all 3 roles via role-switch (derived keys are wallet-bound — switching wallets mid-demo breaks decrypt/verify). Don't switch wallets mid-demo.
- **Continuity:** recorded demo backup + one-command re-seed; explorer deep-links (FR-22) as on-chain trust surface; minimal structured logging.

### Decision Impact Analysis
**Implementation sequence:**
1. Project init: vendor+pin, first-green build, tag `upstream-baseline` (FR-20).
2. **SPIKE-1** (Mode B go/no-go, incl. the client-side gen path + negative + tamper) + **SPIKE-2** (one-PTB wrap+batch) on `spike` harness — before features.
3. Data plane (FR-1…FR-7) → Mode A console + hash-chain audit trail (FR-9…FR-14) → demo loop green end-to-end on Mode A.
4. Mode B client-side gen (FR-15…FR-17) gated on SPIKE-1; FR-18 fallback ready.
5. Demo polish (FR-20…FR-22), recorded backup.

**Cross-component dependencies:**
- D1 split → Mode B caller uses `ClientProofAdapter`; Mode A uses `ServerProofAdapter` (HTTP inside); both verify via the same on-chain entry.
- D3 per-request derive → role-switch triggers a wallet signature per role; server never caches keys.
- Deterministic ElGamal randomness ↔ idempotency ↔ re-runnable demo are one coupled requirement.
- Hash-chain genesis ties to the on-chain org-create tx → audit trail depends on FR-1.
- SPIKE-1 result → Mode B scope (aggregate vs single-amount) before Epic 3 stories are scheduled.

## Implementation Patterns & Consistency Rules

> Scope: hackathon PoC. Principle (Winston): *boundary the compiler can enforce = architecture; boundary that needs a package as a wall = ceremony.* Keep what's expensive to retrofit; defer what's cheap to add later. ElGamal-scheme-specific tests wait until SPIKE-1 proves Mode B.

### Package Layout (lean — collapse now, split later)
```
vendor/contra/   # pinned submodule (read-only)
packages/
  core/          # SINGLE shared package (split later only on a real trigger)
    types/       # DTOs + branded types + zod schemas (the contract anchor)
    crypto/      # isomorphic ElGamal/proof + deterministic randomness — NO node:* imports
    proof/       # ProofAdapter interface + a fake impl (real impl lands after SPIKE-1)
  wasm/          # bulletproofs build target
  spike/         # SPIKE-1/2 harness
  utils/         # deploy/seed + test token BU
apps/
  web/           # React (copy-then-pruned kaisho) — ClientProofAdapter (Mode B gen)
  api/           # Node/Express — ServerProofAdapter (Mode A decrypt) in adapters/
move/            # aperture Move sources (folder, not a package)
```
**Dependency direction is the real trust boundary:** `core` must NEVER import from `apps/*` (one-way). `apps/web` + `apps/api` depend on `core`. Split `core` into `contracts`+`crypto` only when crypto needs a separate WASM target or a second team touches types alone.

### Naming
- **TS:** `camelCase` vars/functions; `PascalCase` types/components; `SCREAMING_SNAKE` consts. Files: components `PascalCase.tsx`, other TS `camelCase.ts`, tests `*.test.ts` co-located.
- **Move:** modules/functions `snake_case`; structs `PascalCase`; consts `SCREAMING_SNAKE` (`prettier-plugin-move` formats; identifier case is review-enforced).
- **SQLite:** tables `snake_case` singular; columns `snake_case`; PK `id`; FK `<entity>_id`.
- **REST:** lowercase plural nouns; `:id`; query params `camelCase`; headers `X-Aperture-*`.

### Case Boundary (snake↔camel) — KEEP (runtime-critical)
Sui RPC returns `snake_case`; a wrong key silently becomes `undefined` and breaks the tx builder. Rules:
- Normalize to `camelCase` **inside the adapter** — no `snake_case` enters services/components. Repository converts camel↔snake at the SQL edge only.
- **Explicit manual mappers, one per entity** (no auto camelize).
- Hard-case ground-truth table (authoritative): `disclosure_id→disclosureId`, `payment_run→paymentRun`, `elgamal_r→elgamalR`, `object_id→objectId`, `tx_digest→txDigest`. Allowlist kept verbatim: `id`, `url`, hex/blob fields.

### Formats — KEEP (runtime-critical)
- **Amounts:** `bigint` as **MIST integer strings** (`"1500000"` — no decimal/sign/leading-zero). Never `number`. **SQLite column = `TEXT`** (INTEGER overflows at 2⁵³).
- **Crypto blobs:** hex strings, **encode/decode in the adapter only** (domain logic sees one representation — never hex-of-hex). Convention: Sui address/object id `0x`-prefixed lowercase; app-generated blobs no prefix, lowercase, even length.
- **Branded types for every value crossing the D1 boundary** (compiler enforces it for free, ~zero cost up front, expensive to retrofit): `MistAmount`, `HexBytes`, `SuiId`, `Ciphertext`, `Plaintext`, `ProofBlob`, `SessionKey` (no `toJSON`).
- **Responses:** resource direct; lists = bare array (no pagination). **Errors:** `{error:{code:SCREAMING_SNAKE,message}}` → meaningful HTTP status (400/403/404/409/422/500).
- **Dates:** `new Date().toISOString()` (UTC). **IDs:** off-chain = `crypto.randomUUID()` (server); on-chain = Sui object id. *(No formal ISO/UUID pattern doc — the stdlib calls are the convention.)*

### Contract Anchor
`packages/core/types` is the single source of truth for wire DTOs + the `ProofAdapter` interface; both apps import from it (no wire type defined elsewhere). **zod schemas validate at EXTERNAL boundaries only** (Sui RPC responses, tx inputs, API requests where a human/judge supplies data) — internal calls trust the types. Types are inferred from zod (no duplicate defs). Each DTO field has a one-line JSDoc stating unit/format.

### Crypto Architecture Rule (D1)
- **Primitives live only in `packages/core/crypto`, isomorphic (no `node:*`, no DOM — Web Crypto / noble).** All crypto access goes through a `ProofAdapter` impl — never touched by routes/services/components/hooks.
- `ProofAdapter` is an **interface in `core/proof` with a fake impl now**; the real impl lands after SPIKE-1. `ClientProofAdapter` (web) does Mode B gen; `ServerProofAdapter` (api) does Mode A decrypt + verify; both implement the same interface, both call `core/crypto`.
- **Mode B gen client-side, Mode A decrypt server-side** — enforced for now by module separation + dependency direction + branded types + code review (NOT a lint zone — that's deferred until SPIKE-1 settles the boundary).
- **Deterministic ElGamal randomness:** `r = H(domain_sep_tag || sessionKey || input_commitment)` — design noted now; **KAT vectors deferred until SPIKE-1 decrypts a correct value once** (don't freeze vectors on a scheme that may be rebuilt).

### Process
- **Validation:** zod at external boundaries; amount strings → `bigint`, bound-checked against the Mode B limb cap before any crypto op.
- **Errors:** typed `ApertureError(code)` → one middleware maps to the error format; C4 ("not registered") + C3 surface as actionable UI; no stack traces to client.
- **Retry (C3 race):** detect `TryTransferFailedEvent`/`TryUnwrapFailedEvent` (no abort) → retry with `merge:false`. *(Idempotency ledger deferred unless the demo exposes a re-submit/retry button.)*
- **Loading:** every async action has `idle|loading|success|error`; proof-gen surfaces measured elapsed time.

### Project-Critical Rules (non-negotiable)
1. Crypto only behind `ProofAdapter` / in `core/crypto`.
2. `SessionKey`/secrets NEVER logged, serialized, persisted, in error messages, devtools-visible state, or query keys (branded, `toJSON` throws).
3. Plaintext amounts NEVER logged or returned to a non-owner/non-designated party (NFR-1).
4. `core` never imports from `apps/*` (dependency direction = trust boundary).
5. Verify both off-chain AND on-chain; a Mode B feature isn't done until on-chain `nizk::verify_elgamal` passes.

### Enforcement (minimal set covering the runtime-breakers)
- **zod** at external boundaries (covers mapper output, MistAmount, hex format in one place).
- **2 lint zones (`no-restricted-imports`):** (a) ban `node:*` in `core` + `apps/web` (keeps crypto isomorphic / browser-safe); (b) adapter isolation — `@mysten/*` + `core/crypto` not imported outside adapters.
- **3 KAT/round-trip tests:** amount round-trip, hex round-trip, mapper hard-case table.
- **hash-chain T1 + T4** (happy + tamper-detect) now; T2/T3 if time.
- **NFR-1/2 invariant test** in CI.
- **Deferred to post-SPIKE-1:** ElGamal KAT vectors, Mode B/A split lint zone, type-aware SessionKey lint, SDK version runtime assertion, full hex-4-ways, idempotency ledger.
- Formatting: `prettier --check` + `prettier-plugin-move` (both gates).

### Examples
**Good:** `amount:"1500000"`; object id `"0x9c…"`; app blob `"0a3f…"` (no prefix); `GET /orgs/:id/audit → 200 [{seq:1,actor:"0x…",action:"auditor_read",at:"2026-…Z"}]`.
**Anti-pattern:** `amount:1500000` / `"1.5"`; `0x`-prefixed app blob; `console.log(sessionKey)`; `contraClient.*` in a route; `node:crypto` imported in `core/crypto`; wire type defined outside `packages/core`.

## Project Structure & Boundaries

### Complete Project Directory Structure
```
aperture/
├── README.md ; package.json (root build scripts) ; pnpm-workspace.yaml
├── .npmrc ; .nvmrc ; .gitmodules (vendor/contra @ PINNED_COMMIT)
├── tsconfig.base.json ; tsconfig.json (project references)
├── vitest.workspace.ts ; .eslintrc.cjs ; .prettierrc
├── turbo.json (or root scripts)        # enforce build order wasm→sdk→core→apps
├── CONVENTIONS.md ; .env.example
├── .github/workflows/ci.yml            # build + lint + prettier(+move) + test + version-skew assert
├── vendor/
│   └── contra/                         # submodule, read-only, PINNED_COMMIT
│       └── PINNED_VERSION               # Move git sha + ts-sdk npm version (paired; CI asserts)
├── move/
│   ├── Move.toml (rev=PINNED_COMMIT) ; Move.lock
│   ├── sources/
│   │   ├── aperture.move ; events.move (PaymentRun)
│   │   ├── statement.move               # SCHEMA AUTHORITY for Mode B statement (BCS canonical)
│   │   └── verifier.move                # wraps Contra nizk::verify_elgamal
│   └── tests/aperture_tests.move        # also emits golden BCS vectors for TS cross-check
├── packages/
│   ├── sdk/                             # wrapper re-exporting vendored Contra ts-sdk as @aperture/sdk
│   │   ├── package.json (dep: file:../../vendor/contra/ts-sdk) ; src/index.ts ; tsconfig.json
│   │   └── adapterVersion.test.ts       # asserts pinned SDK version (C6)
│   ├── core/                            # leaf — NEVER imports apps/*
│   │   ├── src/
│   │   │   ├── crypto/                  # isomorphic (no node:*); MUST stand alone for spike1
│   │   │   │   ├── elgamal.ts ; nizk.ts ; dlog.ts
│   │   │   │   └── statementCodec.ts    # BCS serialize; conforms to move/statement.move via golden vectors
│   │   │   ├── types/ (dto.ts, branded.ts, schemas.ts, errors.ts)
│   │   │   └── proof/ (proofAdapter.ts interface, fakeProofAdapter.ts)
│   │   ├── package.json ; tsconfig.json (composite, refs)
│   │   └── test/goldenVectors/          # BCS fixtures generated from move tests, asserted here
│   ├── wasm/                            # package.json (main→pkg/, script build:wasm) ; pkg/ (gitignored)
│   ├── spike/                           # deps ONLY @aperture/core(crypto)+@aperture/wasm(+sdk for spike2)
│   │   ├── spike1.elgamal.test.ts ; spike2.ptb.test.ts ; vitest.config.ts
│   └── utils/                           # deploy.ts ; seed.ts ; tsconfig.json   (built AFTER spike green)
├── apps/                                # ⛔ built AFTER SPIKE-1 green
│   ├── api/  (Node/Express)
│   │   ├── src/main.ts
│   │   ├── routes/ (orgs, holders, audit, proofs)
│   │   ├── services/ ; adapters/ (contra.ts, serverProofAdapter.ts)
│   │   ├── db/ (schema.sql, migrate.ts, migrations/, repositories/ camel↔snake)
│   │   └── audit/hashChain.ts           # genesis = H(config) local seed; onchainAnchor optional field
│   │   └── package.json ; tsconfig.json ; vitest.config.ts
│   └── web/  (React+Vite, pruned kaisho)
│       ├── vite.config.ts               # worker.format:'es', fs.allow, wasm asset
│       ├── scripts/copy-wasm.mjs        # postinstall: packages/wasm/pkg/*.wasm → public/
│       ├── src/features/{payer,holder,auditor} ; shared/{hooks,worker,adapters/clientProofAdapter,RoleSwitcher,components}
│       ├── src/lib/keys.ts (derive SessionKey from wallet sig, not persisted)
│       ├── public/*.wasm ; package.json ; tsconfig.json
└── tests/invariant/                     # NFR-1/2 (built with data plane, step 3)
```

### Build Sequencing (gate-zero minimal scaffolding)
- **Day-1 (only what SPIKE-1 needs):** root `pnpm install` works; `move/` Mode-B-primitive stub (`statement.move`+`verifier.move`); `packages/wasm` real pipeline; `packages/core/crypto` minimal (stands alone — no `types`/`proof`/abstraction); `packages/spike` harness. `packages/sdk` only if SPIKE-2 (on-chain) needs it.
- **"First-green" redefined (narrow):** green = `wasm` builds + `core/crypto` compiles + `spike1` runs + `move` builds/tests. NOT the whole tree. Tag `upstream-baseline` on this subset.
- **⛔ Do NOT build until SPIKE-1 green:** `apps/api`, `apps/web`, full `packages/core` (`types`/`proof`), `packages/utils`, `tests/invariant`, full CI/lint across the tree.
- **Hard rule:** `spike1` imports only `@aperture/core` (crypto) + `@aperture/wasm`. If it needs `apps/*`/`utils`/full-core, the base is over-scoped — cut it.

### Architectural Boundaries
- **API:** REST (addendum §B.2); validated by `core` zod at external boundaries; amounts MIST strings, blobs hex.
- **Crypto (D1):** primitives only in `core/crypto`, accessed via `ProofAdapter`; `ClientProofAdapter` (web, Mode B gen — key stays in browser), `ServerProofAdapter` (api, Mode A decrypt + verify).
- **Statement serialization (Move↔TS):** **`move/statement.move` is the schema authority** (BCS canonical). `core/crypto/statementCodec.ts` must reproduce bytes exactly; **golden vectors generated by `move/tests` are committed and cross-checked in CI** — no "both sides assume they match."
- **Version skew:** `vendor/contra/PINNED_VERSION` pairs the Move git sha with the ts-sdk npm version; CI asserts the resolved ts-sdk matches; upgrades are atomic.
- **Data:** SQLite owned by `apps/api/db`; repositories = only raw SQL + snake_case. `audit_log` append-only via `hashChain.ts`; **genesis = local deterministic seed, integrity self-contained (no Sui dependency to write audit)**; `onchainAnchor` is an optional per-entry attestation, backfillable.
- **Dependency direction (trust boundary):** `core` → used by `apps/*`; `core` never imports apps. `move` independent. `sdk` wraps vendor; apps import `@aperture/sdk`, never the vendor path.

### Requirements → Structure Mapping
- **Epic 1 (FR-1…8):** `move/{aperture,events}.move`; `apps/api/{routes/orgs,holders;services;adapters/contra}`; `apps/web/features/{payer,holder}`; `packages/utils` (FR-20).
- **Epic 2 / Mode A (FR-9…14):** `apps/api/{routes/audit;services/auditor;adapters/serverProofAdapter;audit/hashChain}`; `apps/web/features/auditor`.
- **Epic 3 / Mode B (FR-15…19, SPIKE-1-gated):** `packages/core/{crypto,proof}`; `move/{statement,verifier}.move`; `apps/web/shared/adapters/clientProofAdapter`+`features/{holder,auditor}`; `packages/spike/spike1`.
- **Epic 4 (FR-20…22):** `apps/web/shared/RoleSwitcher`+states; `packages/utils/seed`; recorded backup (ops).
- **Cross-cutting:** invariant→`tests/invariant`; audit→`apps/api/audit`; keys→`apps/web/lib/keys`+`core` `SessionKey`; SDK isolation→`apps/api/adapters/contra`+`packages/sdk`.

### Integration & Data Flow
- **Internal:** web→REST→api services→`contra` adapter→Sui; api→SQLite via repositories; web crypto via `ClientProofAdapter`→`core/crypto`.
- **External:** Sui Devnet (pinned Contra), bulletproofs WASM, Sui explorer (deep-links).
- **Demo loop:** seed → fund(one wrap)/run(transferBatch+PaymentRun) → holder balance(client dlog decrypt) → auditor recover+report(server decrypt)+audit_log(hash-chain) → holder select+prove(client gen) → verify(off-chain + on-chain nizk::verify_elgamal).

### Dev Workflow
- **Dev:** `pnpm build:wasm` → `pnpm -r build` → `--filter web dev` + `--filter api dev`; copy-wasm postinstall; `.env` from deploy output.
- **Build:** ordered wasm→sdk→core→apps; prettier(+move) + lint zones; version-skew assert in CI.
- **Deploy:** web→Vercel; api→local Node; one-command deploy+seed (FR-20) = Devnet-reset recovery.

## Architecture Validation Results

### Coherence Validation ✅
- **Decision compatibility:** D1 Split Hybrid, SQLite, derived keys, hash-chain (genesis reconciled to local-seed + optional `onchainAnchor`), bound-and-reject, and the package layout are mutually consistent. Versions pinned to the Contra commit (C6).
- **Pattern consistency:** naming/format/crypto rules align; the D1 boundary is enforced by module + dependency direction + branded types.
- **Structure alignment:** the tree realizes every boundary (crypto behind ProofAdapter, repositories own SQL, `core` never imports apps, Move = statement schema authority + golden vectors).

### Requirements Coverage Validation
- **FR coverage:** all FR-1…FR-22 mapped to locations. **Caveat:** FR-15…FR-17 (Mode B) are DESIGN-complete but FEASIBILITY-unproven until SPIKE-1; FR-18 fallback wired.
- **NFR coverage:** NFR-1/2/4/5/7/9/10 addressed in design; **NFR-3 (disclosure correctness) and NFR-6 (proof-gen perf) are UNVERIFIED until SPIKE-1 produces measured results**; NFR-8 relaxed for Mode A only (labeled).
- **Constraints:** C1–C7 represented.

### Implementation Readiness Validation
- **Decision/structure/pattern completeness:** the architecture *document* is complete. **This measures documentation, not validated feasibility** (red-team correction) — the Mode B core mechanism is not yet empirically proven.

### Gap Analysis Results
- **CRITICAL (OPEN):** **Mode B feasibility is unproven** — the differentiator depends on the `Ciphertext.add → ElGamalNizk → verify_elgamal` round-trip succeeding off-chain AND on-chain, which SPIKE-1 has not yet run. This is an open critical-path risk, NOT a closed gate. It is mitigated (FR-18 fallback + recorded-clip plan) but not resolved.
- **CRITICAL (OPEN):** SPIKE-1 on-chain assertion has un-called-out prerequisites (localnet, published Move package + id, funded address, dlog-table question) — must be a fixture before "green."
- **Important:** NFR-6 reference hardware undefined; no standalone UX spec; one-wallet-3-roles weakens the confidentiality narrative (demo item to resolve).
- **Accepted risks (explicit):** Contra is **unaudited beta** — pinning gives reproducibility, NOT correctness/security assurance; building a financial-confidentiality PoC on it is an accepted hackathon-scope risk. Honesty guardrail ("selected sum ≠ total income") is a trust/UX claim not yet validated with users.

### SPIKE-1 Exit Criteria (written BEFORE running)
- **PASS requires ALL:** (1) off-chain SDK verify of an aggregated proof = true for correct X; (2) on-chain `nizk::verify_elgamal` = success for the same proof; (3) wrong X → verify false (both paths); (4) tampered ciphertext → verify false; (5) **measured & recorded**: client-side proof-gen time, proof size, on-chain verify gas.
- **Timebox:** a fixed, short window (owner-set). **If not PASS in the box → fallback:** ship FR-18 (single-amount) if it passes; else demo Mode B via **recorded clip** + run Mode A live. Decide aggregate-vs-single per Story 3.0 AC3.
- **Owner + due date required** before starting (no spike without a deadline).

### SPIKE-1 Day-1 Prerequisites & Blockers
- **#1 blocker — Fiat-Shamir transcript byte-parity:** wasm prover vs Move verifier must agree byte-for-byte on challenge-hash serialization (domain-sep tag, Ristretto point compression, scalar endianness). **Write an interop vector test first** (wasm prove → dump bytes → assert against a fixture) BEFORE touching the chain — off-chain green / on-chain red is the classic failure here.
- **Toolchain landmines:** run `build:wasm` in **WSL2/container** (not Windows native); `git submodule update --init --recursive` + verify pinned commit; pin `curve25519-dalek`/feature flags.
- **Hidden on-chain prereqs (make an idempotent `pretest` fixture):** (1) **localnet** validator running (not Devnet — determinism); (2) Move package **published** + package id written back to SDK config; (3) active address **funded**; (4) confirm whether on-chain verify needs a **dlog table** or checks commitment-equality with X as public input.
- **Test split:** separate `it('verifies off-chain')` (core+wasm, green first) from `it('verifies on-chain')` (gated behind the fixture) so a red result is unambiguous.

### Architecture Completeness Checklist
*(measures documentation completeness; feasibility is tracked separately above)*
**Requirements Analysis:** [x] context · [x] scale · [x] constraints · [x] cross-cutting
**Architectural Decisions:** [x] decisions w/ versions · [x] stack · [x] integration patterns · [ ] **performance — PENDING SPIKE-1** (client proof-gen time/size unmeasured)
**Implementation Patterns:** [x] naming · [x] structure · [x] communication · [x] process
**Project Structure:** [x] directory · [x] boundaries · [x] integration points · [x] requirements mapping

### Architecture Readiness Assessment
**Overall Status: CONDITIONAL** (15/16 documented; 1 PENDING; one open critical feasibility risk). Split verdict:
- **Mode A + data plane + platform: READY FOR IMPLEMENTATION** (high confidence).
- **Mode B: BLOCKED ON SPIKE-1** — design ready, feasibility unproven; do not build Mode B app/UI until SPIKE-1 passes.
**Confidence:** High for Mode A/plumbing; **Medium overall** until SPIKE-1 yields measured numbers.
**Key Strengths:** honest trust model (D1 split), reuse of tuned Contra assets, compiler-enforced boundaries, spike-gated sequencing, lean scope, explicit accepted risks.
**Areas for Future Enhancement:** client-side Mode A migration, on-chain audit anchoring, observability, FR-8 chunking, production auth, UX spec.

### Implementation Handoff
**AI Agent Guidelines:** follow decisions exactly; crypto only behind `ProofAdapter`/`core/crypto`; amounts MIST strings, blobs hex; never log secrets/plaintext amounts; `core` never imports apps; Mode B verified off-chain AND on-chain.
**First Implementation Priority (in order):** (1) project init (vendor+pin, gate-zero build, `upstream-baseline` tag); (2) SPIKE-1 with the exit criteria + day-1 fixture above — **status is BLOCKED ON SPIKE-1 for Mode B; no production code until SPIKE-1 yields real numbers**; (3) on PASS → data plane → Mode A → demo loop green on Mode A → Mode B; on FAIL → FR-18 / recorded-clip path. Maps to PRD Story 1.1 → 3.0.
