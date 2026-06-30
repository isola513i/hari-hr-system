# Secrets & Services Handover Checklist

> รายการนี้สแกนจากการใช้งานจริงในโค้ด (`process.env.*` ใน `apps/api/src`, `import.meta.env.*` ใน `apps/web`) ณ 2026-06-30 — จึงครบถ้วนตามที่โปรแกรมเรียกใช้จริง
>
> ⚠️ **ห้าม commit ค่า secret ลง Git** — ส่งมอบผ่าน password manager หรือเอกสารลับเท่านั้น
> ✍️ ช่อง "ค่า/ที่อยู่" ให้ผู้ส่งมอบเติมเอง (หรือเขียนว่าเก็บไว้ที่ไหน เช่น "อยู่ใน 1Password vault: HARI")

---

## A. API — ค่าที่ "จำเป็น" (ระบบไม่ทำงาน/ไม่ start ถ้าขาด)

| Env var | ใช้ทำอะไร | ค่า/ที่อยู่ (เติมเอง) |
|---------|-----------|----------------------|
| `DATABASE_URL` | connection string ของ Postgres production (Neon) | _____________ |
| `JWT_SECRET` | กุญแจเซ็น JWT access token — ถ้าเปลี่ยน ผู้ใช้ทุกคนถูก logout | _____________ |
| `TOTP_ENCRYPTION_KEY` | กุญแจเข้ารหัส PII + 2FA secret (64 hex chars). **⚠️ ถ้าหาย → ข้อมูลที่เข้ารหัสไว้ถอดไม่ได้ถาวร** API จะไม่ start ถ้าค่าไม่ถูกต้อง | _____________ |

---

## B. API — URLs / CORS (ต้องตั้งให้ตรง domain production)

| Env var | ใช้ทำอะไร | ค่า production (เติมเอง) |
|---------|-----------|--------------------------|
| `FRONTEND_URL` | origin ของเว็บ ใช้ทำ CORS | _____________ |
| `ALLOWED_ORIGINS` | รายการ origin ที่อนุญาต (คั่นด้วย comma) — CSRF defense | _____________ |
| `API_BASE_URL` | base URL ของ API ใช้สร้างลิงก์ในอีเมล/ไฟล์ | _____________ |

---

## C. API — บริการภายนอก (optional แต่ฟีเจอร์จะปิดถ้าไม่ตั้ง) → **ต้องโอนบัญชีด้วย**

### อีเมล — AWS SES
| Env var | |
|---------|--|
| `AWS_SES_REGION` | _____________ |
| `AWS_SES_ACCESS_KEY_ID` | _____________ |
| `AWS_SES_SECRET_ACCESS_KEY` | _____________ |
| `AWS_SES_FROM_EMAIL` | _____________ |

→ **โอน:** บัญชี AWS / IAM user ที่ออก key นี้ + ยืนยัน domain/email ใน SES (ออกจาก sandbox หรือยัง?)

### ที่เก็บไฟล์ — Cloudflare R2 (ถ้าไม่ตั้ง ระบบ fallback ไปเก็บ local disk)
| Env var | |
|---------|--|
| `R2_ACCOUNT_ID` | _____________ |
| `R2_ACCESS_KEY_ID` | _____________ |
| `R2_SECRET_ACCESS_KEY` | _____________ |
| `R2_BUCKET_NAME` | _____________ |
| `R2_PUBLIC_URL` | _____________ |

→ **โอน:** บัญชี Cloudflare + ความเป็นเจ้าของ bucket + ไฟล์ที่อัปโหลดไว้แล้ว (เอกสารพนักงาน ฯลฯ)

### Web Push — VAPID
| Env var | |
|---------|--|
| `VAPID_PUBLIC_KEY` | _____________ |
| `VAPID_PRIVATE_KEY` | _____________ |
| `VAPID_SUBJECT` | _____________ |

→ เป็น keypair ที่ generate (`npx web-push generate-vapid-keys`) — แค่ส่งมอบค่า ไม่มีบัญชี แต่ถ้าเปลี่ยน key ผู้ใช้ต้อง subscribe push ใหม่

### Error tracking — Sentry
| Env var | |
|---------|--|
| `SENTRY_DSN` | _____________ |

→ **โอน:** บัญชี/โปรเจค Sentry

---

## D. API — ค่า config (ไม่ใช่ secret มี default — ตั้งเฉพาะเมื่ออยากเปลี่ยน)

`PORT` · `NODE_ENV` · `LOG_LEVEL` · `DATABASE_SSL` · `DEFAULT_ADMIN_PASSWORD` · `STORAGE_LIMIT_GB`
Rate limit: `RATE_LIMIT_GENERAL_MAX` · `RATE_LIMIT_API_MAX` · `RATE_LIMIT_AUTH_MAX` · `RATE_LIMIT_AUTH_WINDOW_MS` · `RATE_LIMIT_FORGOT_PASSWORD_MAX` · `RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS` · `RATE_LIMIT_BACKUP_CODE_MAX` · `RATE_LIMIT_BACKUP_CODE_WINDOW_MS`
Cron: `CRON_AUTO_CHECKOUT` · `CRON_AUTO_ABSENT` · `CRON_MILESTONE` · `CRON_TIMEZONE`
อื่น ๆ: `VERCEL` (แพลตฟอร์มตั้งให้อัตโนมัติ)

> 🔁 **เปลี่ยน `DEFAULT_ADMIN_PASSWORD` (default `Welcome123!`) ก่อนขึ้น production แน่นอน**

---

## E. Web (Vite) — ตัวแปรที่ฝั่ง browser ใช้

| Env var | ใช้ทำอะไร | ค่า production (เติมเอง) |
|---------|-----------|--------------------------|
| `VITE_API_URL` | URL ของ API (local dev เว้นว่างได้ Vite proxy ให้) | _____________ |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4 (ปิดถ้าไม่ตั้ง) | _____________ |
| `VITE_SENTRY_DSN` | Sentry ฝั่ง frontend (ปิดถ้าไม่ตั้ง) | _____________ |

→ **โอน:** บัญชี Google Analytics (ถ้าใช้)

---

## F. บัญชี/แพลตฟอร์มที่ต้องโอน (ไม่ใช่ env var แต่สำคัญ)

- [ ] **GitHub repo** — ปัจจุบันใต้ `isola513i`; โอนไป org บริษัท หรือเพิ่มทีมเป็น admin
- [ ] **Hosting / Deploy** — โค้ดอ้าง `process.env.VERCEL` → คาดว่า **Vercel**; โอน project + ตั้ง env production บนแพลตฟอร์มให้ทีม _(ยืนยันแพลตฟอร์มจริง)_
- [ ] **Neon** (Postgres) — โอน project/org
- [ ] **Cloudflare** (R2 storage) — โอนบัญชี + bucket + ไฟล์ที่มีอยู่
- [ ] **AWS** (SES email) — โอนบัญชี/IAM + domain verification
- [ ] **Sentry** — โอนโปรเจค
- [ ] **Google Analytics** — โอน property (ถ้าใช้)
- [ ] **AIYA Task** (`task.aiya.me`, space *HARI Internal*) — sprint board; โอน/เพิ่มสมาชิกทีม
- [ ] **บัญชี admin ในระบบ HARI** — ส่งมอบ + เปลี่ยนรหัส default

---

## G. หมายเหตุ / ความไม่สอดคล้องที่ตรวจพบ

- **`JWT_REFRESH_SECRET`** ถูกตั้งใน `docker-compose.yml` แต่ **ไม่มีการใช้จริงในโค้ด** (`apps/api/src` ไม่มีการอ้างถึง) — เป็น config ที่หลงเหลือ ทีมจะลบทิ้งหรือเก็บไว้เผื่ออนาคตก็ได้ ไม่กระทบการทำงานปัจจุบัน
- ค่า dev เริ่มต้นใน `docker-compose.yml` (`JWT_SECRET`, `TOTP_ENCRYPTION_KEY` ฯลฯ) เป็น **dev-only ห้ามใช้ใน production**
- ค่าใน `.github/workflows/ci.yml` เป็น secret สำหรับ test แบบ inline — ปลอดภัยที่จะอยู่ใน Git (ไม่ใช่ค่าจริง) และ CI ไม่ต้องตั้ง GitHub Secrets เพิ่ม
