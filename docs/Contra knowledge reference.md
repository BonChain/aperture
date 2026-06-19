# Contra (Sui Confidential Transfers) — Knowledge Reference

> สรุปทุกอย่างที่รู้เกี่ยวกับ `MystenLabs/confidential-transfers` จากการอ่าน repo จริง
> ใช้เป็น base ของ `CLAUDE.md` ใน workspace เพื่อกัน AI เดา API ผิด
> สถานะ repo: **WIP, unaudited, ห้ามใช้ production** — เปิด public beta บน Devnet 8 มิ.ย. 2026

---

## 1. มันคืออะไร (one paragraph)

Confidential token transfers บน Sui — **balance และจำนวนเงินโอนถูกเข้ารหัส** ด้วย Twisted ElGamal (homomorphic) + zero-knowledge proofs โดย network ยัง verify ได้ว่าทุกธุรกรรมถูกต้อง (ไม่ overdraft, ไม่ inflate) `Coin<T>` ปกติตัวไหนก็ wrap เข้า confidential แล้ว unwrap กลับได้ → layer ทับ token standard เดิม

## 2. Privacy boundary (กฎเหล็ก — จำให้ขึ้นใจ)

- **ในโดเมน confidential (transfer ระหว่าง registered accounts):** ซ่อน **amount** เปิดเผย **sender, receiver, timing**
- **ข้ามขอบ (wrap เข้า / unwrap ออก):** แตะ public coin layer → **เปิดเผยจำนวนและคู่กรณีของ operation นั้น** เหมือน Sui coin tx ปกติ
- **เจ้าของบัญชีเท่านั้นที่ถอด balance ตัวเองได้** (เว้นแต่มี auditor — ดูข้อ 8)
- → design ที่ถูก: wrap **ก้อนรวมก้อนเดียว** เข้า treasury แล้วกระจายภายในโดเมน ห้าม wrap รายคน

## 3. กลไกเข้ารหัส (ที่ต้องเข้าใจเพื่อ debug ได้)

Twisted ElGamal over Ristretto255 สอง generator `g`, `h` (ไม่รู้ความสัมพันธ์ dlog):
```
pk = x*g                      (x = secret key)
c  = r*g + m*h   (ciphertext)
d  = r*pk        (decryption handle)
ถอด: c - d/x = m*h  แล้วแก้ dlog  m = log_h(m*h)
```
- **Additively homomorphic:** บวก ciphertext component-wise = เข้ารหัสผลรวม (นี่คือฐานของ merge และของ proof-of-figure)
- **Message อยู่ใน exponent → ถอดต้องแก้ dlog → ทำได้เฉพาะช่วงเล็ก**
- **u16 limbs:** ทุก amount แตกเป็น 4 limb ขนาด u16 เข้ารหัสแยกกัน → balance หนึ่ง = 4 ciphertext
  `amount = l0 + l1·2^16 + l2·2^32 + l3·2^48`
- ถอดด้วย baby-step giant-step กับ **precomputed DiscreteLogTable** (default 16-bit) — **ต้องมี table นี้ถึงจะ getBalance/decrypt ได้**

## 4. Balance model (จุดที่ทำ UX พังถ้าพลาด)

3 ยอดต่อบัญชี:
| ยอด | คือ |
|---|---|
| **Active encrypted** | ยอดใช้จ่ายได้ — transfer/unwrap หักจากตรงนี้ |
| **Pending encrypted** | เงินที่รับมาจาก account อื่น รอ merge |
| **Pending public** | เงินจาก wrap (public coin) รอ merge |

- **เงินเข้าตก pending เสมอ ไม่เข้า active ตรงๆ** — เพราะ proof commit กับ snapshot ของ active balance ถ้า active โดน deposit แทรกระหว่างนั้น proof จะ invalid → แยก pending กันชน
- เจ้าของเรียก **merge** เพื่อพับ pending → active ก่อนใช้
- **Bounded aggregation:** พับได้สูงสุด ~`2^16` deposit ก่อน limb ใหญ่เกิน 2^32 (ถอดไม่ออก) → เกินแล้ว deposit ใหม่ถูก reject จนกว่าจะ merge

### Merge-then-spend race (ต้อง handle ใน UI)
SDK `transfer`/`unwrap` default `merge: true` → prepend merge ใน tx เดียว
- ไม่มี deposit แทรก → สำเร็จเต็ม
- มี deposit แทรก → merge สำเร็จ แต่ proof transfer fail → emit `TryTransferFailedEvent`/`TryUnwrapFailedEvent` (**ไม่ abort, เงินไม่หาย**)
- แก้: retry ด้วย `merge: false` จะผ่านทันที (pending ถูกพับไป active แล้วจากรอบแรก)

## 5. 4 Flows หลัก

| Flow | คือ | amount เปิด/ปิด |
|---|---|---|
| **register** | setup ครั้งเดียวต่อ (user, token T) — publish pk + (ถ้ามี auditor) key เข้ารหัสถึง auditor + proof → สร้าง `TokenAccount<T>` | — |
| **wrap** | public `Coin<T>` → pending public ของ account; coin เก็บใน `Pool<T>` reserve | **เปิด** |
| **transfer** | confidential→confidential; active ของ sender ลด, pending encrypted ของ receiver เพิ่ม | **ปิด** |
| **unwrap** | active ลด → จ่าย public `Coin<T>` จาก `Pool<T>` ให้ recipient | **เปิด** |

## 6. TS SDK — API surface ที่ใช้จริง

### `ContraClient` (สร้างด้วย `ContraClientOptions`)
```ts
{ suiClient, packageConfig, table: DiscreteLogTable, wasmUrl? }
// wasmUrl จำเป็นใน browser (bulletproofs .wasm), Node ไม่ต้อง
```
**เมธอด** (ส่วนใหญ่คืน `(tx: Transaction) => TransactionResult` = PTB builder → compose ลง tx เดียวได้):
| เมธอด | sync/async | option type | หมายเหตุ |
|---|---|---|---|
| `newAccount` | sync builder | `NewAccountOptions {owner}` | สร้าง Account object (ครั้งเดียวต่อ address ทุก token) |
| `register` | async builder | `RegisterOptions {tokenAccount, account?}` | ลงทะเบียน pk + auditor material ต่อ token |
| `wrap` | sync builder | `WrapOptions {coin, receiver, tokenType, memo?}` | coin = objectId หรือ tx arg (จาก splitCoins) |
| `transfer` | async builder | `TransferOptions {tokenAccount, receiverAddress, amount, merge?}` | 1 ผู้รับ |
| `transferBatch` | async builder | `BatchedTransferOptions {tokenAccount, recipients[], merge?, auth?}` | **≤ 7 ผู้รับ** ดูข้อ 9 |
| `unwrap` | async builder | `UnwrapOptions {tokenAccount, amount, merge?}` | → public coin |
| `updateBalance` | builder | `UpdateBalanceOptions` | merge pending→active |
| `getBalance` | async | (tokenAccount) | คืน `{balance, pending, pendingPublicBalance}` ถอดรหัสแล้ว (ต้องมี table+sk) |
| `getAccountStatus` | async | (address, tokenType) | `{isFrozen}` |
| `getPublicKey` | async | (address, tokenType) | |
| `getAuditors` | async | (tokenType) | |
| `isTokenFrozen` | async | (tokenType) | global pause |
| `pauseAccount`/`unpauseAccount` | builder | | |
| `rotateKey*` | async builder | | + `rotateKeyAndTransferBatch` |

**Pattern ประกอบ PTB:**
```ts
const tx = new Transaction();
client.wrap({ coin, receiver, tokenType })(tx);          // sync
const batch = await client.transferBatch({ tokenAccount, recipients });
batch(tx);                                                // async-built, applied
await signAndExecute({ transaction: tx });
```

### `ContraAuditor` (สร้างด้วย `ContraAuditorOptions`)
```ts
recoverPrivateKey({ ciphertext, version }): PrivateKey  // กู้ viewing key ของ user จาก key escrow
getTokenAccount(address): Promise<TokenAccount>         // ดึง account → เอา sk ที่กู้มา decrypt
```

### Crypto primitives (export จาก index)
- `Ciphertext` (มี `.add()` — homomorphic), `EncryptedAmount`, `MultiRecipientEncryption`
- `DiscreteLogTable` (`.create(numBits=16)`, `computeTableEntries`)
- `TokenAccount` (ถือ address, tokenType, privateKey, publicKey)
- NIZK: `ElGamalNizk` (พิสูจน์ ciphertext well-formed: รู้ r,m ที่ c=r·g+m·h, d=r·pk), `DdhTupleNizk` (DDH equality), `KeyConsistencyProof`
- `scalarToLimbs`/`limbsToScalar` (8× u32 — match Move)
- `KeyEncryption`, `G`, `randomScalar`, `point`

### Error types
`ContraError` (base), `InvalidArgumentError`, `InsufficientBalanceError`, `ReceiverDoesNotAcceptDepositsError`, `DepositsMustBePausedError`, `TokenAccountDoesNotExistError`, `ContraInternalError`, `DecryptionFailedError`

## 7. Move modules (on-chain)

| module | หน้าที่ |
|---|---|
| `contra.move` | entry point หลัก — issuer + user flows ทั้งหมด |
| `twisted_elgamal.move` | encryption scheme |
| `balance.move` | `EncryptedBalance<T>` + merge count |
| `encrypted_amount.move` | encrypted amount + bulletproof version |
| `nizk.move` | proofs + **`verify_elgamal()` / `verify_ddh()` / `verify_key_consistency()` (verify บน chain ได้)** |
| `policy.move` | access policy ของ `ConfidentialToken<T>` |
| `auditors.move` | auditor set / bulletproof version |
| `deny_list.move` | freeze check |
| `events.move`, `decode.move` | events / deserialization |

### Auth (`Auth<T>`) — 3 constructor
- `authorize_as_sender` — auth `ctx.sender()` (path มาตรฐานของ wallet)
- `authorize_as_object` — auth address ที่ derive จาก object UID (เมื่อ access คุมด้วย Move object — payment-channel ใช้ตัวนี้)
- `authorize_with_witness` — auth ภายใต้ witness `W` ที่ policy ต้องการ (สำหรับ permissioned flow แบบ custom)

## 8. Compliance controls (issuer ถือ)

- **Per-account freeze:** ผ่าน `DenyCapV2` (กระทบทั้ง public+private) หรือ freeze admin ผ่าน `ManagementCap<T>` (เฉพาะ private); ปลด freeze ได้เฉพาะ `TreasuryCap<T>` — freeze บล็อกอนาคต ไม่ย้ายเงิน
- **Global pause:** flag `is_active` (freeze admin ปิดได้, เปิดได้เฉพาะ issuer) หรือ deny-list global pause
- **Seize / direct balance write:** `TreasuryCap<T>` overwrite encrypted balance ตรงๆ (court order, กู้ key, fraud reversal) — ต้องคุม supply เองด้วย wrap/unwrap คู่กัน
- **Permissioned flows:** `set_policy` gate `register`/`wrap`/`unwrap` หลัง witness `W` (KYC, screening, rate limit) — **transfer ระหว่าง registered accounts permissionless เสมอ** แม้ policy เข้มสุด

### Auditor model (2 ตัวเลือก — สำคัญต่อ Audit Console)
- **Option 1 per-transfer:** ทุก transfer แนบ ciphertext เพิ่มต่อ auditor key + proof ว่าตรงกับ amount จริง; auditor เห็นทุก transfer amount, reconstruct balance แบบ stateful; overhead ต่อ transfer = O(n auditors)
- **Option 2 per-account (= `recoverPrivateKey`):** ตอน register ผู้ใช้เข้ารหัส viewing key ของตัวเองใต้ auditor pk เก็บบน chain + proof; auditor ถอด viewing key ทีเดียว → อ่านทุกอย่างที่เจ้าของเห็น (stateless); transfer ไม่มี overhead
  - ⚠ **เป็นโมเดล god-key per account** ("everything the account owner can see") — คล้าย Starknet ที่ตลาดวิจารณ์
- key rotation: hash-chain จาก master secret ให้ auditor ใหม่เห็นย้อนหลังได้
- **Selective disclosure (อิสระจาก auditor):** ผู้ใช้เปิดค่า (balance หรือ amount ของ TransferEvent) + ZK proof ว่า cleartext ตรง ciphertext ใต้ pk ของตัวเอง → verifier เช็คด้วย pk ไม่ต้องรู้ sk ← **นี่คือฐานของ proof-of-figure / PrivPNL-style**

## 9. ข้อจำกัด / ค่าคงที่สำคัญ

- **`MAX_BATCH_RECIPIENTS = 7`** — Move verify aggregated bulletproof ได้ 8, เหลือ 1 ให้ sender → batch จ่ายได้ ≤ 7 คน/call; เกินต้อง chunk หลาย call
- **merge bound ~`2^16` deposit** ก่อนบังคับ merge
- **decryption ต้องมี DiscreteLogTable** (compute ครั้งเดียว cache; browser ทำใน web worker)
- **browser ต้องมี bulletproofs wasm** (ส่ง `wasmUrl`)

## 10. Example apps (ใช้เป็นฐาน)

| app | คือ | ต่อยอดเป็น |
|---|---|---|
| **kaisho** | wallet เต็ม + issuer setup (deploy BU token + Contra) + auditor view; มี dlog table ใน web worker (`tableWorker.ts`, `useDLogTable.ts`, `useContraClient.ts`, `useContraAuditor.ts`) — มี deploy จริงที่ kaisho-wallet.vercel.app | frontend layer / hooks ของเรา (ยกมาใช้ตรงๆ) |
| **closed-loop** | permissioned token: BU → pBU 1:1, gate `register` ด้วย whitelist (`pbu.move`, `confidential_pbu.move`) | **B2B settlement / closed payroll registry** |
| **throttler** | unwrap หน่วงเวลา: coin ค้างใน `ThrottledPool`, ดึงได้หลัง `min_duration`; issuer ปรับ delay/seize ได้ | **withdrawal window / review / spending cap** |
| **payment-channel** | unidirectional channel; `Channel<T>` ถือ confidential `Account` ผ่าน `as_object()` auth; มี TS ครบ (sender/receiver/setup/deploy/client + e2e test) | **test harness แม่แบบ + streaming (phase หลัง)**; canonical reference ของ `authorize_as_object` |
| **utils** | test_token (BU), ts-utils (publish/setup/contra_initializer), bulletproofs-wasm | deploy/seed scripts |

## 11. Build / Test commands

```
# Move (ใน move/)
sui move build ; sui move test ; sui move test <filter>
npx @mysten/prettier-plugin-move -w <file>   # ต้อง format ไม่งั้น CI fail (build ไม่จับ)

# WASM (ใน utils/bulletproofs-wasm/) — ต้อง build ก่อน ts-sdk
pnpm build:wasm    # ต้องมี Rust + wasm32-unknown-unknown + wasm-pack

# TS SDK (ใน ts-sdk/)
pnpm install ; pnpm build ; pnpm test ; pnpm vitest <filter>
```
ลำดับ: `build:wasm` → ts-sdk (pnpm pack `file:` dep ตอน install)
อ้าง `ts-sdk/test/e2e/token_issuer.ts` (`init`) เป็น e2e ตัวอย่าง issuer setup

## 12. สิ่งที่ต้องยืนยันด้วยการรันจริง (spike สัปดาห์ 1)

1. wrap + transferBatch ใน PTB เดียวได้ไหม (balance update ต่อเนื่องไม่ชน)
2. วัด: เวลา compute dlog table, ขนาด memory, เวลา proof gen ต่อ batch, gas/คน
3. ยืนยันลิมิต 7 จริง + พฤติกรรมตอน chunk หลาย batch
4. (ถ้าทำ Mode B) รวม `Ciphertext.add()` → `ElGamalNizk` → `verify_elgamal` ผ่าน 1 รอบ

## 13. ลิงก์

- repo: https://github.com/MystenLabs/confidential-transfers
- ts-sdk: https://github.com/MystenLabs/confidential-transfers/tree/main/ts-sdk
- move: https://github.com/MystenLabs/confidential-transfers/tree/main/move
- AUDITORS.md: https://github.com/MystenLabs/confidential-transfers/blob/main/AUDITORS.md
- blog: https://blog.sui.io/confidential-transfers-public-beta/
- kaisho demo: https://kaisho-wallet.vercel.app/