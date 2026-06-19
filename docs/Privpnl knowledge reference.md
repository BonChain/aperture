# PrivPNL — Knowledge Reference (+ มุมพอร์ตมา Contra/Sui)

> สรุปทุกอย่างที่รู้เกี่ยวกับ PrivPNL จากการอ่าน repo จริง `jp4g/aztec-pnl-proof` + เว็บ + บทความ Aztec
> เป้าของเอกสารนี้: เข้าใจ PrivPNL ลึกพอจะ "ยืมแนวคิด" มาทำ Mode B (proof-of-figure) บน Contra
> สถานะ PrivPNL: **proof of concept** บน Aztec, proof gen ในเบราว์เซอร์ทั้งหมด, live ที่ aztec-pnl-proof.vercel.app

---

## 1. มันคืออะไร (one paragraph)

ZK proof ของ **capital gain/loss** จากการเทรดบน private AMM (Aztec) **โดยไม่เปิดเผยแต่ละ trade** ผู้ใช้ถอดรหัส swap event ของตัวเอง → พิสูจน์ว่า encrypted log แต่ละอันตรงกับ on-chain → คำนวณ PnL ด้วย FIFO cost basis ตามราคา oracle สาธารณะ → รวมทุกอันเป็น **recursive proof เดียว** ผู้ตรวจเห็นแค่ **net PnL + ใช้ oracle ตัวไหน** ไม่เห็นรายการ, ยอด, หรือกลยุทธ์

หัวใจที่ยืมมาได้: **"พิสูจน์ค่าที่คำนวณจากข้อมูลเข้ารหัสหลายรายการ โดยเปิดแค่ผลลัพธ์"** — นี่คือ atom เดียวกับ proof-of-figure ที่เราจะทำ (พิสูจน์ยอดจ่ายรวม/ภาษี โดยไม่เปิดรายการ)

## 2. Use case ที่เขาชู(= ตลาดเป้าหมายของ Mode B เราด้วย)

- **Tax reporting** — พิสูจน์ capital gain/loss ต่อสรรพากร โดยไม่เปิด portfolio/กลยุทธ์
- **Fund compliance** — โชว์ auditor ว่า PnL ที่รายงานถูกต้อง โดยไม่เปิด position/counterparty
- **Reputation** — พิสูจน์ว่าเป็นเทรดเดอร์กำไร โดยไม่ dox alpha

## 3. Proof เปิดอะไร / ซ่อนอะไร (สำคัญที่สุด)

**เปิด (public output):**
| output | คือ |
|---|---|
| `pnl` (i64) | net realized PnL รวม (signed บวก/ลบได้) |
| `root` | merkle root ของ leaf hash ของ swap event (ผูก proof กับ log บน chain) |
| `price_feed_address` | oracle ที่ใช้ |
| `block_number` | block ล่าสุดใน batch |
| `initial_lot_state_root` / `remaining_lot_state_root` | สถานะ portfolio ก่อน/หลัง batch |

**ซ่อน:** จำนวน/โทเคน/ทิศของแต่ละ swap, จำนวน swap, ยอดคงเหลือ, องค์ประกอบ portfolio, cost basis lots, กลยุทธ์, ตัวตน/wallet

## 4. 3 สเต็ปจากมุมผู้ใช้

1. **Trade privately** — swap บน private DEX (Aztec); trade/balance/position เข้ารหัสบน chain
2. **Disclose selectively** — แชร์ **tagging key** ให้ auditor เพื่อให้ "ค้นเจอ" swap ที่จะพิสูจน์ **โดยไม่เปิดอย่างอื่น** (discovery without readability)
3. **Prove in ZK** — พิสูจน์แต่ละ swap ใน circuit → aggregate เป็น PnL/ภาษีรวมเป็น proof เดียว → เปิดแค่ "ได้เท่าไหร่" ไม่เปิด "ได้มายังไง"

## 5. สถาปัตยกรรม (2 circuit + recursive aggregation)

```
encrypted swap events (on-chain AMM logs)
        → [Individual Swap Circuit]  (ต่อ 1 swap)
        → [Summary Tree Circuit]     (รวมแบบ recursive)
        → final proof (pnl, root, oracle, block)
```

### Closed-system assumption (เงื่อนไขที่ทำให้ PnL พิสูจน์ได้)
โทเคนเกิดได้แค่ mint (deposit) / burn (withdraw) / swap บน AMM — **ไม่มี P2P transfer** → ทุกหน่วยมี cost basis ต้นทางที่ traceable เสมอ (mint หรือ swap acquisition) **นี่คือ assumption ที่ critical** ถ้ามี transfer อิสระ การพิสูจน์ FIFO PnL จะพัง

### Lot State Tree (portfolio เป็น merkle tree)
height-3 merkle tree, 8 token slots; แต่ละ leaf commit ถึง lot array ของ token นั้น
`Li = poseidon2_hash([token_address, num_lots, lot0.amount, lot0.cost, ...])` (66-field: token + count + 32 lots × 2)
ติดตามทุก token พร้อมกันใน tree เดียว (ไม่ต้องรัน circuit แยกต่อ token); ทุก swap แก้ 2 leaf: ฝั่งขาย (FIFO consume) + ฝั่งซื้อ (เพิ่ม lot)

### Individual Swap Circuit (input private ทั้งหมด, output 6 public)
ตรรกะ 5 ขั้น:
1. **Verify encryption** — derive shared secret จาก viewing key + ephemeral PK → derive AES key → เข้ารหัส plaintext เทียบ ciphertext → **พิสูจน์ว่า plaintext ตรงกับ encrypted log บน chain**
2. **Compute leaf** — `leaf = poseidon2_hash(ciphertext)` → auditor hash log บน chain เองเพื่อ verify ได้
3. **Extract** token_in/out, amount_in/out จาก plaintext
4. **Chronological order** — `block_number >= previous_block_number`
5. **FIFO PnL** — verify sell lots กับ root, อ่านราคา oracle ผ่าน public-data-tree proof, consume lot เก่าสุดก่อน, `PnL = (sell_price - cost_basis) * amount`, แล้ว update lot tree (sell root → intermediate root → buy root)

### Summary Tree Circuit (recursive)
รวม proof ทีละคู่ (individual หรือ summary) เป็น proof เดียว; เลขคี่ pad ด้วย zero hash; บังคับ:
- verify child proofs
- hash leaves เป็น merkle root
- **sum signed PnL (i64)**
- **lot root chain continuity:** `swap[N].remaining_root == swap[N+1].initial_root`
- chronological block ordering
→ proof สุดท้าย: initial_root ของอันแรก = portfolio เริ่มต้น, remaining_root ของอันท้าย = portfolio จบ

(มี circuit ที่ 3 `capital_gains_tax` ต่อยอดจาก PnL → ภาระภาษี)

## 6. โครงสร้าง repo (jp4g/aztec-pnl-proof)

```
packages/
  circuits/   Noir: individual_swap, swap_summary_tree, capital_gains_tax
  contracts/  Noir: amm_contract, price_feed_contract
  frontend/   UI (trade / price / prove / faq)
  proof/      (proving harness)
src/
  swap-prover.ts      orchestrate individual proofs
  swap-proof-tree.ts  recursive aggregation
  lot-state-tree.ts   lot state tree (TS)
  decrypt.ts          AES decrypt swap events
  event-reader.ts     discover encrypted swaps ผ่าน tags  ← นี่คือกลไก tagging-key discovery
test/
  pnl.test.ts         e2e: 3 tokens, 3 pools, 6 swaps, price change, full proof
```
ทั้งหมด **Noir circuits + client-side proving** — สถาปัตยกรรมต่างจาก Contra สิ้นเชิง (Aztec = note-based + client proof; Sui Contra = ElGamal ciphertext + on-chain verify)

---

## 7. มุมพอร์ตมา Contra/Sui — อะไรยืมได้ อะไรพังถ้าลอกตรงๆ

| ชิ้นส่วน PrivPNL | บน Contra ทำได้ไหม | หมายเหตุ |
|---|---|---|
| พิสูจน์ "ค่ารวม" โดยเปิดแค่ผลลัพธ์ (แนวคิดหลัก) | **ยืมได้** | นี่คือ Mode B ของเรา |
| รวมหลายรายการเป็นก้อนเดียว | **ง่ายกว่าบน Contra** | `Ciphertext.add()` homomorphic — ไม่ต้อง recursive proof tree เหมือน Aztec |
| Verify ว่า plaintext ตรง ciphertext | **มีให้** | Contra: `ElGamalNizk` + selective disclosure (proof ว่า cleartext ตรง ciphertext ใต้ pk) |
| Verify บน chain | **มีให้** | Contra Move: `nizk::verify_elgamal` |
| tagging-key discovery (ค้นโดยไม่อ่าน) | **ไม่ต้อง/ทำไม่ได้แบบเดียวกัน** | Sui เปิด sender/receiver/graph อยู่แล้ว → discovery ฟรี ไม่ต้องมี tagging key |
| FIFO cost basis + oracle price + lot tree | **หนักและเกินจำเป็น** | นั่นคือความซับซ้อนเฉพาะ PnL/ภาษี; payroll/settlement ใช้แค่ "พิสูจน์ผลรวม = X" ไม่ต้อง FIFO |
| recursive proof aggregation (Noir) | **ไม่ต้อง** | Contra ใช้ homomorphic sum แทน recursion ได้ |
| closed-system / no-P2P assumption | **ระวัง** | บน Contra transfer ระหว่าง account ทำได้เสมอ → ถ้าจะพิสูจน์ "ยอดสุทธิ" ต้องนิยาม scope ให้ชัดว่านับ event ชุดไหน |

### บทเรียนสำคัญ 3 ข้อ
1. **ความซับซ้อนของ PrivPNL ส่วนใหญ่มาจาก "PnL/FIFO/oracle" ไม่ใช่จาก "selective disclosure"** — ของเรา (payroll/settlement) ไม่ต้องการ FIFO เลย แค่ "พิสูจน์ผลรวมของชุดรายการ = X" ซึ่งบน Contra ทำด้วย `add()` + `ElGamalNizk` → **งานเบากว่า PrivPNL มาก**
2. **Aztec ต้อง recursive proof tree เพราะ proof เป็น client-side note-based** — Contra ได้ homomorphic addition ฟรี เลยข้าม recursion ทั้งก้อนได้ นี่คือข้อได้เปรียบเชิงสถาปัตยกรรมของเรา
3. **Aztec ต้องมี tagging key เพื่อ discovery เพราะซ่อน graph** — Sui เปิด graph อยู่แล้ว สเต็ป 2 ของ PrivPNL หายไปฟรี เหลือแค่ "พิสูจน์ตัวเลข"

### Mode B บน Contra = PrivPNL ฉบับลดรูป
```
PrivPNL:  decrypt → verify-each-encryption → FIFO PnL → recursive aggregate → proof(pnl)
Mode B:   เลือก EncryptedAmount ชุดหนึ่ง → Ciphertext.add() รวม → ElGamalNizk(ผลรวม=X) → verify_elgamal
```
→ ตัด FIFO/oracle/lot-tree/recursion ออกหมด เหลือแก่นที่ Contra รองรับ native

## 8. สิ่งที่ต้องระวัง (อย่าเผลอ over-claim ตาม PrivPNL)

- PrivPNL พิสูจน์ "ค่าที่ derive จาก logic ซับซ้อน (FIFO/oracle)" — **อย่าสัญญาแบบนั้นบน Contra** เว้นแต่จะเขียน circuit เอง (เสี่ยงสูงมากสำหรับ solo)
- สิ่งที่ Contra ทำได้แน่: พิสูจน์ "ผลรวม/ค่าเดียว = X ตรงกับ ciphertext บน chain" — ขอบเขตนี้พอสำหรับ payroll total / settlement amount / proof-of-income
- tagging-key model ของ Aztec แก้ปัญหาที่ Sui ไม่มี (ซ่อน graph) — อย่าเอามาเป็น feature ของเรา เพราะมันไม่ใช่ปัญหาบน Sui

## 9. ลิงก์

- live: https://aztec-pnl-proof.vercel.app/
- repo: https://github.com/jp4g/aztec-pnl-proof
- Aztec disclosure architecture: https://aztec.network/blog/fully-confidential-ethereum-transactions-aztec-networks-privacy-architecture
- "WTF is Aztec": https://aztec.network/blog/wtf-is-aztec