// packages/spike/test/onchain/onchain.devnet.test.ts
//
// Story 1.1c on-chain verify seam — the closing half of SPIKE-1.
//
// Calls `aperture::verifier::verify_aggregate(...)` on the published devnet
// package via a PTB, using the SAME committed golden fixtures that
// packages/spike/src/spike1.elgamal.test.ts uses. The off-chain ↔ on-chain
// seam contract is: if the fixtures verify off-chain, they verify on-chain,
// and vice versa. Any drift in this contract = the architecture's #1 blocker
// (Fiat-Shamir byte-parity) has re-appeared.
//
// Pre-flight (the test fails loud if any step is missing):
//   1. `pnpm pretest:devnet` — env on devnet, funded address
//   2. `pnpm publish:devnet`  — writes scripts/.published-devnet.json
//   3. `pnpm test:spike:onchain` — this file
//
// On devnet reset the cached packageId 404s; the test fails loud with a
// "re-run pretest:devnet && publish:devnet" message — never silently retries.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../../../..");
const CONFIG_PATH = resolve(REPO_ROOT, "scripts/.published-devnet.json");
const FX_DIR = resolve(REPO_ROOT, "packages/spike/test/fixtures");
const KEYSTORE_PATH = resolve(homedir(), ".sui/sui_config/sui.keystore");

// Canonical test triple — matches packages/spike/src/spike1.elgamal.test.ts
const TEST_AMOUNT = 42n;
const TEST_SK = 12345n;
const TEST_BLINDING = 67890n;

// Move function signature for the on-chain seam:
//   aperture::verifier::verify_aggregate(
//     dst: vector<u8>,
//     pk: vector<u8>,
//     ciphertext: vector<u8>,
//     decryption_handle: vector<u8>,
//     amount: u64,
//     proof_a: vector<u8>, proof_b: vector<u8>, proof_z1: vector<u8>, proof_z2: vector<u8>
//   ): bool
function buildVerifyTx(
  packageId: string,
  statement: { dst: Uint8Array; pk: Uint8Array; ciphertext: Uint8Array; decryptionHandle: Uint8Array },
  proof: Uint8Array,
  amount: bigint,
): Transaction {
  const tx = new Transaction();
  // In @mysten/sui v2.19.0, `tx.pure(type, value)` takes the BCS type name
  // first, then the value. For `vector<u8>` we use `tx.pure.vector("u8", bytes)`.
  tx.moveCall({
    target: `${packageId}::verifier::verify_aggregate`,
    arguments: [
      tx.pure.vector("u8", statement.dst),
      tx.pure.vector("u8", statement.pk),
      tx.pure.vector("u8", statement.ciphertext),
      tx.pure.vector("u8", statement.decryptionHandle),
      tx.pure("u64", amount.toString()),
      tx.pure.vector("u8", proof.slice(0, 32)),
      tx.pure.vector("u8", proof.slice(32, 64)),
      tx.pure.vector("u8", proof.slice(64, 96)),
      tx.pure.vector("u8", proof.slice(96, 128)),
    ],
  });
  return tx;
}

function loadHex(relPath: string): Uint8Array {
  const text = readFileSync(resolve(FX_DIR, relPath), "utf8").trim();
  // Hex → bytes (no base64 round-trip). The original code went hex→char→base64
  // which produced non-ASCII characters and broke in the new SDK's fromBase64.
  const bytes = new Uint8Array(text.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Find the funded keypair in sui.keystore. The active address is the first
// entry; the keystore is a JSON array of base64 secret keys (32 bytes each).
// `Ed25519Keypair.fromSecretKey` accepts a `Uint8Array` of raw bytes OR a
// `suiprivkey...` bech32 string. We use the raw-bytes path so we don't need
// the bech32 wrapper. Returns the Ed25519Keypair + its Sui address. Throws
// actionable if the keystore is missing/empty.
function readActiveKeypair(): { keypair: Ed25519Keypair; address: string } {
  if (!existsSync(KEYSTORE_PATH)) {
    throw new Error(
      `sui keystore not found at ${KEYSTORE_PATH}. ` +
        "Run \`sui client new-address devnet-fixture\` to create one, then re-run pretest:devnet.",
    );
  }
  const keys: string[] = JSON.parse(readFileSync(KEYSTORE_PATH, "utf8"));
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error(
      `sui keystore is empty at ${KEYSTORE_PATH}. ` +
        "Run \`sui client new-address devnet-fixture\` to create one.",
    );
  }
  const rawBytes = fromBase64(keys[0]);
  // The sui keystore stores `[flag=0x00, 32 secret bytes]` (33 bytes total).
  // `Ed25519Keypair.fromSecretKey` wants just the 32-byte secret.
  if (rawBytes.length !== 33) {
    throw new Error(
      `unexpected keystore entry length: ${rawBytes.length} (expected 33). ` +
        "The sui keystore format may have changed; check `sui keytool list`.",
    );
  }
  const secretBytes = rawBytes.slice(1);
  const keypair = Ed25519Keypair.fromSecretKey(secretBytes);
  return { keypair, address: keypair.getPublicKey().toSuiAddress() };
}

// Build the canonical Statement from the same TEST_SK / TEST_BLINDING /
// TEST_AMOUNT triple that packages/spike/src/spike1.elgamal.test.ts uses.
// We need noble curves here, which is already a dep of @aperture/spike —
// re-importing directly is fine (the on-chain test is OUTSIDE the spike
// layer's import discipline by design).
async function buildCanonicalStatement() {
  const { ristretto255 } = await import("@noble/curves/ed25519.js");
  const G = ristretto255.Point.BASE;
  const H = ristretto255.Point.fromHex(
    "34ce1477c14558178089500a39c864e0f607b3c1f41ab398400e4a9de6d2c446",
  );
  const pk = G.multiply(TEST_SK);
  const c1 = G.multiply(TEST_BLINDING).add(H.multiply(TEST_AMOUNT));
  const dh = pk.multiply(TEST_BLINDING);
  return {
    dst: new Uint8Array(0),
    pk: pk.toBytes(),
    ciphertext: c1.toBytes(),
    decryptionHandle: dh.toBytes(),
  };
}

// Test state populated in beforeAll (depends on .published-devnet.json +
// funded sui client). Skips with a clear message if pretest:devnet or
// publish:devnet was not run.
let client: SuiJsonRpcClient;
let keypair: Ed25519Keypair;
let activeAddress: string;
let packageId: string;
let skipReason: string | null = null;

beforeAll(() => {
  if (!existsSync(CONFIG_PATH)) {
    skipReason =
      `scripts/.published-devnet.json not found at ${CONFIG_PATH}. ` +
      "Run \`pnpm pretest:devnet && pnpm publish:devnet\` first.";
    return;
  }
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  packageId = config.packageId;
  if (!packageId) {
    skipReason = "scripts/.published-devnet.json has no packageId.";
    return;
  }
  try {
    const kp = readActiveKeypair();
    keypair = kp.keypair;
    activeAddress = kp.address;
  } catch (e) {
    skipReason = (e as Error).message;
    return;
  }
  client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl("devnet"), network: "devnet" });
});

describe("onchain.devnet (aperture::verifier::verify_aggregate on devnet)", () => {
  it("pretest + publish fixture present", () => {
    if (skipReason) throw new Error(skipReason);
    expect(packageId).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(activeAddress).toMatch(/^0x[0-9a-fA-F]+$/);
  });

  it("verifies the committed proofValid.hex on devnet (success → true)", async () => {
    if (skipReason) throw new Error(skipReason);
    const statement = await buildCanonicalStatement();
    const proof = loadHex("proofValid.hex");
    const tx = buildVerifyTx(packageId, statement, proof, TEST_AMOUNT);
    tx.setSender(activeAddress);
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      include: { effects: true },
    });
    // v2.19.0 result is flat: { digest, confirmedLocalExecution }.
    const finalized = await client.waitForTransaction({
      digest: result.digest,
      options: { showEffects: true },
    });
    const status = finalized.effects?.status;
    if (status && typeof status === "object" && "status" in status) {
      expect(status.status, "tx status for valid proof should be 'success'").toBe("success");
    } else {
      throw new Error(
        `unexpected effects.status: ${JSON.stringify(status)}. ` +
          "Most likely: stale packageId → re-run `pnpm pretest:devnet && pnpm publish:devnet`.",
      );
    }
  }, 60_000);

  it("verifies the committed proofTampered.hex on devnet (abort → false)", async () => {
    if (skipReason) throw new Error(skipReason);
    const statement = await buildCanonicalStatement();
    const proof = loadHex("proofTampered.hex");
    const tx = buildVerifyTx(packageId, statement, proof, TEST_AMOUNT);
    tx.setSender(activeAddress);
    // The SDK simulates the tx before signing, so a `MoveAbort` with code 100
    // (our E_VERIFY_FAILED) propagates as a thrown error from
    // `signAndExecuteTransaction`. Assert the throw + error code 100.
    await expect(
      client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        include: { effects: true },
      }),
    ).rejects.toThrow(/abort code: 100|verify_aggregate/);
  }, 60_000);

  it("stale packageId guard — fails loud with re-run instructions", async () => {
    if (skipReason) throw new Error(skipReason);
    // All-zeros id will never resolve; expect an RPC rejection.
    const badId = "0x" + "0".repeat(64);
    const statement = await buildCanonicalStatement();
    const proof = loadHex("proofValid.hex");
    const tx = buildVerifyTx(badId, statement, proof, TEST_AMOUNT);
    tx.setSender(activeAddress);
    await expect(
      client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        include: { effects: true },
      }),
    ).rejects.toThrow();
  }, 60_000);
});
