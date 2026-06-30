# Project Handover — HARI HR System

> เอกสารส่งมอบโปรเจคจากผู้ฝึกงานสู่ทีมงาน
> **ผู้ส่งมอบ:** Nattapat _(เติมชื่อเต็ม / อีเมล / ช่องทางติดต่อหลังจบการฝึกงาน)_
> **วันที่ส่งมอบ:** 2026-06-30
> **ผู้รับมอบ:** _________________ _(เติมชื่อทีม/ผู้รับผิดชอบต่อ)_

ไฟล์นี้สรุป **สถานะปัจจุบัน + สิ่งที่ต้องรู้เพื่อรับช่วงต่อ** ส่วนรายละเอียดทางเทคนิคเชิงลึกอยู่ในโฟลเดอร์ `docs/` แล้ว (ดูหัวข้อ [เอกสารอ้างอิง](#เอกสารอ้างอิง))

---

## 1. ภาพรวมโปรเจค

ระบบ HR (HARI HR System) — monorepo ประกอบด้วย:

| ส่วน | เทคโนโลยี | ตำแหน่ง |
|------|-----------|---------|
| **API** | Node.js + Express + TypeScript + PostgreSQL | `apps/api` |
| **Web** | React + Vite + TypeScript + Tailwind | `apps/web` |
| **Shared types** | TypeScript package (ใช้ร่วมทั้งสองฝั่ง) | `packages/shared-types` |

ฟีเจอร์หลัก: พนักงาน/โครงสร้างองค์กร, ลงเวลา (GPS check-in + WFH + regularization), ลางาน, OT, เงินเดือน (payroll), ประเมินผล (performance review + 360 peer review), onboarding/offboarding, การแจ้งเตือน (push/email), 2FA, analytics

> ข้อมูลบริษัท: ออฟฟิศที่ Vanit Place (อารีย์) — GPS geofence ปิดเป็นค่าเริ่มต้น

---

## 2. วิธีรันโปรเจค (อ่าน README.md และ docs/SETUP_GUIDE.md ประกอบ)

### ทางที่ง่ายที่สุด — Docker (ครบทั้ง stack + Postgres ในตัว)
```bash
docker compose up --build
# Web → http://localhost:8080   API → http://localhost:3001
```

### ทางสำหรับพัฒนา (hot-reload)
```bash
npm install                       # ติดตั้ง dependency ทั้ง workspace
npm run build:shared              # ⚠️ ต้อง build packages/shared-types ก่อน ไม่งั้น API/Web พังตอน import
cp apps/api/.env.example apps/api/.env   # แล้วเติมค่า (ดู SECRETS_HANDOVER_CHECKLIST.md)
npm run build --workspace=apps/api && npm run seed --workspace=apps/api  # สร้าง schema + admin
npm run dev                       # Web → :5173  API → :3001
```

> **กับดักที่เจอบ่อย:**
> - ลืม `npm run build:shared` → error `Cannot find module '@hari/shared-types'`
> - ลืม `npm install` หลัง `git pull` ที่มี dependency ใหม่ → error เช่น `Cannot find module 'pino'`
> - API ไม่ start ถ้า `TOTP_ENCRYPTION_KEY` ไม่ใช่ 64 hex chars

---

## 3. สถานะปัจจุบัน (ณ วันส่งมอบ)

### ทำงานได้ครบและ deploy ขึ้น `main` แล้ว
โค้ดทั้งหมด push ขึ้น `origin/main` เรียบร้อย — `git status` สะอาด ไม่มีงานค้างในเครื่องผู้ส่งมอบ

### งานล่าสุดที่เพิ่งเสร็จ (ดู git log)
- `4b9d272` — ปรับปรุง PDF export ของ performance review (clamp rating, parallel fetch, map BusinessError→404)
- `0fa04bf` — batch 2026-06-30: pagination i18n, bulk delete, column customization, review templates
- `e07faf2` — 360 peer review + predictive analytics
- `f6785eb` — attendance regularization + two-tier approval

ไทม์ไลน์โปรเจค: เริ่ม 2026-01-12 → ล่าสุด 2026-06-30 (พัฒนาแบบ daily/weekly sprint)

### ไม่มี tech-debt marker ค้างในโค้ด
ตรวจ `TODO`/`FIXME`/`HACK`/`XXX` ทั้ง repo แล้ว = **0 รายการใน first-party source** (รายละเอียด: `docs/TECH_DEBT_TRIAGE.md`)
โปรเจคนี้**ไม่ได้ใช้ inline TODO เป็น backlog** — งานค้างถูกติดตามที่:
- **AIYA Task** (`task.aiya.me`, space *HARI Internal*) ← sprint board หลัก _(ต้องโอนสิทธิ์ให้ทีม)_
- `docs/HIGH_PRIORITY_IMPROVEMENTS.md` ← ลิสต์งานที่ควรทำต่อ จัดลำดับความสำคัญแล้ว

### งานที่แนะนำให้ทีมทำต่อ (เติม/แก้ตามจริง)
- [ ] _เติม: ฟีเจอร์ที่ยังค้าง / กำลังทำครึ่งทาง_
- [ ] ตรวจ `npm audit` — มี vulnerabilities ค้างอยู่ (1 low, 23 moderate, 10 high, 2 critical ณ วันส่งมอบ)
- [ ] _เติม: สิ่งที่อยากเตือนทีมเป็นพิเศษ_

---

## 4. Deployment & CI

- **CI:** GitHub Actions — `.github/workflows/ci.yml` (lint, API tests, Web build, E2E)
  - CI ใช้ secret แบบ inline สำหรับ test เท่านั้น (`JWT_SECRET` test value, Postgres service container) — **ไม่ต้องตั้ง GitHub Secrets เพิ่มสำหรับให้ CI ผ่าน**
  - Web E2E ถูกตั้งเป็น non-blocking (ดู commit `2488b9f`)
- **Production deploy:** _โค้ดอ้างถึง `process.env.VERCEL` → คาดว่า deploy บน Vercel — **ผู้ส่งมอบโปรดยืนยัน/เติม:** deploy ที่ไหน, ใครเป็นเจ้าของ, ตั้งค่า env production ที่ไหน_
- **Health check:** `GET /api/health` (ใช้สำหรับ uptime monitoring — ดู `docs/MONITORING_SETUP.md`)
- **Container images:** `apps/api/Dockerfile`, `apps/web/Dockerfile` (web เสิร์ฟผ่าน nginx, proxy `/api`)

---

## 5. ฐานข้อมูลและ Migrations

- **Schema เริ่มต้น:** `npm run seed --workspace=apps/api` (รัน `scripts/init-db.ts`)
- **Migration scripts:** มี ~40 ไฟล์ใน `apps/api/src/scripts/` (รันด้วย `ts-node`) — บางตัวมี npm script ย่อ เช่น `db:migrate:indexes`, `db:migrate:totp`, `db:migrate:offboarding`, `db:migrate:attendance-reg`
- **⚠️ ผู้ส่งมอบโปรดเติม:** production database รัน migration ไปถึงตัวไหนแล้ว เพื่อให้ทีมรู้ว่าต้องรัน script ไหนต่อหากมีของใหม่
- **Backup:** `npm run db:backup` / `npm run db:restore` (`scripts/backup-db.ts`)

---

## 6. Secrets & บริการภายนอกที่ต้องโอน

👉 **ดูไฟล์แยก: [`SECRETS_HANDOVER_CHECKLIST.md`](./SECRETS_HANDOVER_CHECKLIST.md)**

สรุปสั้น ๆ: ต้องส่งมอบค่า `.env` (ไม่อยู่ใน Git) + โอนสิทธิ์บัญชี Neon / Cloudflare R2 / AWS SES / Sentry / Vercel / Google Analytics / AIYA Task ให้บริษัท
**ส่งผ่านช่องทางปลอดภัยเท่านั้น** (password manager / เอกสารลับ — ไม่ใช่แชต/อีเมลธรรมดา)

---

## 7. ⚠️ สิ่งที่ต้องทำก่อนผู้ฝึกงานออกจริง

- [ ] **โอนความเป็นเจ้าของ GitHub repo** — ปัจจุบันอยู่ใต้ `isola513i` (ตรวจว่าเป็นบัญชีส่วนตัวหรือ org บริษัท); ถ้าเป็นส่วนตัวให้ transfer ไป org บริษัท หรือเพิ่มทีมเป็น admin
- [ ] **ส่งมอบ secrets ทั้งหมด** ตาม `SECRETS_HANDOVER_CHECKLIST.md`
- [ ] **โอนสิทธิ์บริการภายนอก** ทุกตัว (ไม่ให้ผูกกับบัญชี/อีเมลส่วนตัวของผู้ฝึกงาน)
- [ ] **เปลี่ยนรหัส admin** จาก default `Welcome123!` และส่งมอบบัญชี admin จริง
- [ ] **ให้ทีม clone + รันขึ้นจริง** บนเครื่องเขา (`docker compose up --build`) ขณะผู้ฝึกงานยังอยู่ เผื่อติดปัญหา
- [ ] **นัด walkthrough** อธิบายสถาปัตยกรรม + ส่วนที่ซับซ้อนให้ทีมก่อนวันสุดท้าย
- [ ] _เติม: คนติดต่อหลังออก (ถ้ามี) + ระยะเวลาที่ยินดีตอบคำถาม_

---

## เอกสารอ้างอิง (มีอยู่แล้วในโปรเจค)

| ไฟล์ | เนื้อหา |
|------|---------|
| `README.md` | ภาพรวม + วิธีติดตั้ง |
| `docs/SETUP_GUIDE.md` | คู่มือ setup ละเอียด |
| `docs/ARCHITECTURE.md` | สถาปัตยกรรมระบบ |
| `docs/API_DOCUMENTATION.md` | เอกสาร API (มี Swagger JSDoc ครบทุก endpoint) |
| `docs/CONTRIBUTING.md` | แนวทางการพัฒนา/ส่ง PR |
| `docs/HIGH_PRIORITY_IMPROVEMENTS.md` | งานที่ควรทำต่อ |
| `docs/TECH_DEBT_TRIAGE.md` | ผลตรวจ tech debt |
| `docs/MONITORING_SETUP.md` | การตั้ง monitoring/uptime |
| `docs/PERFORMANCE_OPTIMIZATION.md` | บันทึกการ optimize |
| `docs/TESTING-INSTRUCTIONS.md` | วิธีรันเทสต์ |
| `DEMO_SCRIPT.md` | สคริปต์สาธิตระบบ |
