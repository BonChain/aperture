# Aperture — WSL2 Dev Environment Setup Checklist

> เป้าหมาย: ตั้ง dev environment ครบสำหรับ Aperture (Sui/Move + bulletproofs-wasm + Node backend/frontend) บน WSL2 Ubuntu
> หลักการ: **ทุกอย่างอยู่ใน WSL2 + repo อยู่ใน Linux filesystem (`~/`) ห้ามอยู่บน `/mnt/...`**

---

## 0. ติดตั้ง WSL2 (รันใน PowerShell ฝั่ง Windows — ครั้งเดียว)

```powershell
wsl --install -d Ubuntu        # ลง WSL2 + Ubuntu (reboot ถ้าถูกขอ)
wsl --set-default-version 2
wsl --status                   # ยืนยันว่า default version = 2
```
เปิด Ubuntu ครั้งแรก → ตั้ง username/password ของ Linux

> ทุก step ต่อจากนี้ **รันใน Ubuntu shell** (ไม่ใช่ PowerShell)

---

## 1. System packages (build deps สำหรับ Sui + wasm + native modules)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  curl git build-essential pkg-config \
  libssl-dev libclang-dev libpq-dev \
  cmake ca-certificates
```

---

## 2. Rust + wasm toolchain (สำหรับ utils/bulletproofs-wasm → ต้อง build ก่อน ts-sdk)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustc --version

# wasm target + wasm-pack
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
wasm-pack --version
```

---

## 3. Node 22+ และ pnpm (pnpm ล่าสุดต้องการ Node 22+)

```bash
# nvm เพื่อ pin Node version
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

nvm install 22
nvm use 22
nvm alias default 22
node --version          # ต้อง >= 22

# pnpm ผ่าน corepack
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

---

## 4. Sui CLI (Move build/test/deploy + Devnet)

> **เวอร์ชัน network ปัจจุบัน (เช็ค 19 มิ.ย. 2026):**
> | network | tag | protocol |
> |---|---|---|
> | mainnet | `mainnet-v1.73.2` | v126 |
> | testnet | `testnet-v1.73.1` | v126 |
> | **devnet** (เป้าหมาย SRS) | **`devnet-v1.73.0`** | **v125** |
>
> ⚠️ devnet ค้างที่ 1.73.0/protocol 125 ส่วน mainnet/testnet ขยับไป protocol 126 แล้ว
> → **pin `sui` ให้ตรง network ที่ deploy จริง** ไม่ใช่เวอร์ชันสูงสุด (protocol mismatch = tx เพี้ยน)
> ก่อนติดตั้งให้เปิด https://github.com/MystenLabs/sui/releases เช็ค devnet tag ล่าสุดอีกครั้ง

ติดตั้งผ่าน **suiup** (official toolchain manager — สลับ/pin version ง่าย เหมาะกับ devnet reset)

```bash
# 1) ติดตั้ง suiup เอง (ครั้งเดียว)
curl -sSfL https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh | sh
source ~/.bashrc                       # ให้ ~/.local/bin เข้า PATH

# 2) ติดตั้ง sui แบบ pin version ตรง network (devnet protocol 125)
suiup install sui@devnet-1.73.0

# 3) ตั้งเป็น default
suiup default set sui@devnet-1.73.0
suiup default get                      # ยืนยัน default
sui --version                          # ต้องโชว์ 1.73.0
```

หมายเหตุ:
- `suiup` วาง binary ไว้ที่ `$HOME/.local/bin` → ต้องอยู่ใน PATH (ลำดับใน PATH มีผล)
- ตอน devnet reset/อัป protocol: `suiup install sui@devnet-<new>` แล้ว `suiup default set ...` — ไม่ต้องโหลด tar เอง
- ดู version ที่ลงไว้: `suiup list` / `suiup show` · หา binary: `suiup which`
- ถ้าต้องการ build จาก branch (เช่นทดสอบ fix): `suiup install sui --nightly` (ต้องมี Rust)

### ตั้งค่า Devnet env + faucet
```bash
sui client                              # ครั้งแรกจะถามให้สร้าง config → เลือก devnet
sui client new-env --alias devnet --rpc https://fullnode.devnet.sui.io:443
sui client switch --env devnet
sui client active-address
sui client faucet                       # ขอ test SUI สำหรับ gas
sui client gas                          # ยืนยันว่ามี gas เข้า
```

---

## 5. ดึง repo เข้า Linux filesystem (สำคัญ!)

```bash
# ⚠️ วางใน ~ ไม่ใช่ /mnt/d — I/O เร็วกว่ามากและ line-ending ไม่เพี้ยน
cd ~
git clone https://github.com/MystenLabs/confidential-transfers.git
# (Aperture monorepo ของเราเอง: clone/ย้ายเข้ามาไว้ที่ ~ เช่นกัน)
```

ถ้าต้องการ access ไฟล์เดิมที่ `D:\work\my-project\Aperture` ชั่วคราว:
`/mnt/d/work/my-project/Aperture` — แต่ **ทำงานจริงให้ย้ายเข้า `~`**

---

## 6. Build order (Contra: wasm → ts-sdk → Move)

```bash
# 1) bulletproofs wasm ก่อน (ts-sdk depend ผ่าน file:)
cd ~/confidential-transfers/utils/bulletproofs-wasm
pnpm build:wasm

# 2) ts-sdk
cd ~/confidential-transfers/ts-sdk
pnpm install
pnpm build
pnpm test            # smoke test SDK

# 3) Move package
cd ~/confidential-transfers/move
sui move build
sui move test
```

---

## 7. ยืนยันพร้อมทำงาน (ตรงกับ SPIKE-1 / Story 3.0)

- [ ] `sui --version` + `sui client gas` มี gas บน devnet
- [ ] `node --version` ≥ 20, `pnpm --version` ทำงาน
- [ ] `wasm-pack --version` + `pnpm build:wasm` ผ่าน
- [ ] `sui move build` + `sui move test` ผ่านใน `move/`
- [ ] ts-sdk `pnpm test` ผ่าน
- [ ] repo อยู่ใน `~` ไม่ใช่ `/mnt/`

---

## เครื่องมือเสริม (แนะนำ)

- **VS Code + WSL extension** — เปิด project จาก `~` ด้วย `code .` ใน Ubuntu; editor อยู่ Windows แต่ทุกอย่างรันใน Linux
- **`prettier-plugin-move`** — ต้อง format Move ไม่งั้น CI fail: `npx @mysten/prettier-plugin-move -w <file>`
- ตั้ง `git config --global core.autocrlf input` ใน WSL กัน CRLF เพี้ยน

---

## หมายเหตุ version pinning (C6)

Contra เป็น beta/unaudited → **pin commit** ของ repo + ใช้ Sui CLI channel `devnet` ที่ตรงกัน
ก่อนเริ่ม ให้จดไว้: Contra commit hash, Sui CLI version, Node version, Rust version
→ เก็บใน config ของ Aperture เพื่อ re-deploy ได้ตรงทุกครั้งหลัง Devnet reset (FR20/NFR7)
