# Sui Audit Console — ถอด Aztec PrivPNL แล้ว map ลง Contra

## Finding ที่เปลี่ยนทุกอย่าง (อ่านก่อน)

อ่าน `AUDITORS.md` + SDK ของ Contra แล้วเจอความจริง 2 ข้อ:

**1. auditor model ของ Contra = แบบ "designated key" (เหมือน Starknet ที่ตลาดวิจารณ์) ไม่ใช่แบบ Aztec**
`ContraAuditor.recoverPrivateKey()` ทำงานแบบนี้: ตอน register บัญชี ผู้ใช้เข้ารหัส viewing key ของตัวเองด้วย public key ของ auditor เก็บไว้บน chain → auditor ถอด viewing key นั้นทีเดียว แล้ว **เห็นทุกอย่างที่เจ้าของบัญชีเห็น** (active/pending balance + ทุก transfer) เอกสารเขียนตรงๆ ว่า "Effectively, everything the account owner can see"
→ นี่คือ god-key per account ซึ่งคือโมเดลที่ตลาด **ไม่ชอบ**

**2. แต่ Contra แจก building block ให้สร้างโมเดลแบบ Aztec (scoped disclosure) ได้เอง**
- `Ciphertext.add()` — บวก ciphertext ได้โดยไม่ถอดรหัส (homomorphic) → รวมยอดหลายรายการเป็นก้อนเดียวที่ยังเข้ารหัส
- `ElGamalNizk` — พิสูจน์ว่า ciphertext หนึ่ง "เข้ารหัสค่า m ที่รู้" โดยไม่เปิด key (รู้ r, m ที่ทำให้ c = r·g + m·h)
- ฝั่ง Move มี `nizk::verify_elgamal()` / `verify_ddh()` → **verify proof บน chain ได้จริง**

**แปลว่า:** ส่วนที่ทำให้ PrivPNL เท่ (พิสูจน์ "ค่ารวม/ค่าเดียว" โดยไม่ยกทั้ง portfolio) — Contra **ไม่ได้ให้สำเร็จรูป** แต่ **ให้วัตถุดิบครบที่จะ build เอง** และนี่แหละคือ "งานจริง" ที่ทำให้ผลงานคุณไม่ใช่แค่ wrapper

---

## PrivPNL flow (Aztec) → ทำบน Contra ยังไง

PrivPNL ทำ 4 สเต็ป: private trades → tagging-key ให้ auditor "ค้นเจอ" data เข้ารหัส → เบราว์เซอร์ gen ZK proof ของ PnL → auditor verify proof โดย prover เปิดแค่ยอดที่ต้องเปิด

| # | Aztec PrivPNL ทำ | Contra equivalent | สถานะ | effort |
|---|---|---|---|---|
| 1 | Private positions/trades (amount + graph ซ่อน) | confidential balance + transfer (amount ซ่อน, **graph เปิด**) | **ฟรี** | 0 |
| 2 | tagging key ให้ auditor ค้นเจอ tx ในรูปเข้ารหัส | **ไม่ต้องมี** — sender/receiver/token เปิดบน chain อยู่แล้ว ค้นเจอฟรี | **ฟรี (ง่ายกว่า)** | 0 |
| 3a | รวมรายการเป็นค่าเดียว (PnL/total) แบบเข้ารหัส | `Ciphertext.add()` รวม EncryptedAmount หลายตัว → ก้อนรวมเข้ารหัส | **ฟรี** | ต่ำ |
| 3b | gen ZK proof ว่าค่ารวม = X โดยไม่เปิดคีย์ | สร้าง `ElGamalNizk` บนก้อนรวม (พิสูจน์ว่าเข้ารหัสค่า X) | **build** | กลาง-สูง |
| 4 | auditor verify proof, prover เปิดแค่ X | verify off-chain ด้วย SDK หรือ on-chain ด้วย `nizk::verify_elgamal` | **build (มีฐาน)** | กลาง |
| – | "discovery without readability" (tagging แยกจาก read) | ไม่มีใน Contra — ต้องออกแบบเอง | **skip** | สูงมาก |
| – | derived statement ซับซ้อน (tax basis จาก logic) | ต้องเขียน circuit เอง | **skip** | สูงมาก/เสี่ยง |

**ความต่างที่เป็นบวกกับคุณ:** Aztec ซ่อน graph เลยต้องมี tagging key ให้ auditor หา data เจอ — **Contra เปิด graph อยู่แล้ว สเต็ป 2 จึงหายไปฟรีๆ** discovery ไม่ใช่ปัญหาบน Sui งานเหลือแค่ "พิสูจน์ตัวเลข" ซึ่งคือแก่นจริง

---

## แปลเป็น product: Console 2 โหมด

**Mode A — Auditor Console (ของฟรี, รันได้ชัวร์)**
auditor ที่ถูก designate → `recoverPrivateKey` → decrypt balance/transfer ของ org ที่ดูแล → dashboard + export report + **audit-trail-of-audit** (ใครเปิดดูอะไรเมื่อไหร่)
→ นี่คือโมเดล Starknet (god-key) ใช้เป็น baseline ที่กดได้แน่ในสัปดาห์แรก

**Mode B — Proof-of-Figure (ของ build, คือพระเอกที่ทำให้ชนะ)**
เจ้าของบัญชีเลือกชุดรายการ → รวมด้วย `Ciphertext.add()` → gen `ElGamalNizk` ว่า "ผลรวม = X" → ส่ง proof ให้ผู้ตรวจ/ธนาคาร/สรรพากร verify โดย **ไม่ยก viewing key, ไม่เปิดรายการอื่น**
→ นี่คือ PrivPNL-equivalent บน Sui ตัวแรก และเป็นฝั่ง disclosure ที่ตลาด endorse (Aztec-style, scoped, ผู้ใช้คุม)

**Positioning ที่จะโม้:** "Sui มี auditor model แบบ decrypt-everything มาให้ — เราเพิ่มชั้น **scoped proof-of-figure** ที่ผู้ใช้คุมเอง พิสูจน์ค่าโดยไม่เปิดทั้งบัญชี = นำโมเดล disclosure ที่ดีที่สุด (Aztec) มาให้ Sui ที่ยังไม่มี"

---

## ความเสี่ยง / กับดัก

1. **3b คือหัวใจและเป็นงาน crypto จริง** — ต้องเข้าใจว่า `ElGamalNizk` พิสูจน์อะไรพอดี ก่อนอ้างว่า "พิสูจน์ผลรวมได้" ⚠ spike: ทดสอบ flow รวม ciphertext → prove → verify ให้ผ่าน 1 รอบ **ก่อน** ลงทุนทำ UI ถ้า 3b ไม่ผ่านในสัปดาห์ 1 → ส่งแค่ Mode A + พิสูจน์ "ค่าเดียว" (ง่ายกว่าผลรวม) แทน
2. **อย่าสัญญา discovery-without-readability หรือ derived statement ซับซ้อน** — Contra ไม่มี ถ้าใส่ใน pitch แล้ว demo ไม่มี = ตายข้อ "รันได้จริง"
3. **god-key risk ต้องพูดให้ถูก** — อย่าขาย Mode A เดี่ยวๆ ว่า "compliant" เพราะมันคือโมเดลที่โดนวิจารณ์ ต้องคู่กับ Mode B เพื่อโชว์ว่าคุณเข้าใจความต่าง
4. **proof generation ช้าบน browser** — เหมือนทุกงาน ZK วัดจริงสัปดาห์ 1

---

## PoC slice ที่แนะนำ (เรียงตามลำดับทำ)

1. Mode A console รันได้ (recoverPrivateKey + decrypt + report) — ของฟรี ได้ "รันได้จริง"
2. ⚠ spike 3b: รวม ciphertext + ElGamalNizk + verify ผ่าน 1 รอบใน script
3. ถ้า 2 ผ่าน → Mode B UI: เลือกรายการ → gen proof → verifier verify
4. audit-trail-of-audit (ของที่ทีมอื่นไม่ทำ ทำให้ดู regulator-grade)
5. narrative: government/regulator-ready ห่อรอบของที่กดได้จริง

reuse จาก spec payroll เดิม: auditor view (View C) เลื่อนเป็นพระเอก; employer/employee view ลดเหลือ "ตัว gen ข้อมูลให้ตรวจ" ใน demo — โครง backend/frontend/hooks ใช้ซ้ำได้เกือบหมด