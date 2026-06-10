# Monitoring & Alerting Setup

ระบบ production ของ HARI ใช้ 2 service ภายนอกในการ monitor:

| Service | จับอะไร | Free tier |
|---|---|---|
| **Sentry** | errors, exceptions, error rate (frontend + backend) | 5,000 events/month |
| **UptimeRobot** | service ตอบ HTTP request ปกติไหม (uptime) | 50 monitors, 5-min interval |

Alert ทั้งหมดส่งเข้า **email** ที่ `nattapat@aiya.ai`

---

## Part 1 — Sentry setup

### 1.1 สร้าง account + projects

1. ไปที่ https://sentry.io → Sign up (ใช้ Google login กับ `nattapat@aiya.ai` ได้)
2. ตั้งชื่อ organization: `aiya` (หรือ `hari`)
3. สร้าง **2 projects**:
   - Project A: `hari-web` → Platform = **React**
   - Project B: `hari-api` → Platform = **Node.js / Express**

### 1.2 Copy DSN

แต่ละ project Sentry จะให้ DSN หน้าตาประมาณนี้:

```
https://abc123...@o12345.ingest.sentry.io/67890
```

หา DSN ได้ที่: Project → Settings → Client Keys (DSN)

### 1.3 ตั้ง env vars

**Vercel (frontend):**

```
Settings → Environment Variables → เพิ่ม:
  Name:   VITE_SENTRY_DSN
  Value:  <DSN ของ hari-web>
  Scope:  Production
```

**Render (backend):**

```
Service → Environment → เพิ่ม:
  Key:    SENTRY_DSN
  Value:  <DSN ของ hari-api>
```

Redeploy ทั้ง 2 service หลังเพิ่ม env

### 1.4 ตั้ง email alert rule

ใน Sentry ทำซ้ำสำหรับ **ทั้ง 2 projects**:

1. Project → Alerts → Create Alert Rule
2. Template: **Number of errors in an issue is more than 10 in 5 minutes**
3. Action: Send email to `nattapat@aiya.ai`
4. Save

นอกจาก rule นี้ Sentry จะส่ง email ให้อยู่แล้วเมื่อเจอ error ใหม่ที่ไม่เคยเห็น (new issue)

### 1.5 ทดสอบ

**Frontend:** เปิด production app ใน browser → DevTools console → run:
```js
throw new Error('Sentry smoke test from web');
```
→ ภายใน 30 วินาที error ต้องโผล่ใน Sentry → `hari-web` project

**Backend:** ใช้ curl ตี endpoint ที่ throw error (สร้าง temp endpoint หรือใช้ที่ trigger 500 ได้)
→ error ต้องโผล่ใน `hari-api` project

---

## Part 2 — UptimeRobot setup

### 2.1 สร้าง account

1. ไปที่ https://uptimerobot.com → Sign up (free tier)
2. Verify email

### 2.2 เพิ่ม monitors

ต้องการ **2 monitors:**

**Monitor 1 — Backend health:**
```
Type:           HTTP(s)
Friendly Name:  HARI API (production)
URL:            https://<your-render-url>.onrender.com/api/health
Interval:       5 minutes
Alert if:       Status code is NOT 200
```

**Monitor 2 — Frontend:**
```
Type:           HTTP(s)
Friendly Name:  HARI Web (production)
URL:            https://<your-vercel-url>.vercel.app
Interval:       5 minutes
Alert if:       Status code is NOT 200
```

### 2.3 ตั้ง alert contact

1. My Settings → Alert Contacts → Add
2. Type: **Email**
3. Email: `nattapat@aiya.ai`
4. กลับไปแต่ละ monitor → Edit → Alert Contacts → tick contact ที่เพิ่ง add → Save

### 2.4 ทดสอบ

- ทั้ง 2 monitors ต้องโชว์ status เป็น **"Up"** (เขียว) ภายใน 5 นาที
- ทดสอบ alert: หยุด Render service ชั่วคราว → ภายใน ~10 นาที UptimeRobot ส่ง email "API is DOWN"
- กลับมา restore service → ได้ email "API is back UP"

---

## Part 3 — Verify everything works

หลัง setup เสร็จควรได้ behavior แบบนี้:

| Scenario | Result |
|---|---|
| Frontend throw error ที่ไม่เคยเจอ | email จาก Sentry ภายใน 1-2 นาที |
| Backend 5xx error 10+ ครั้งใน 5 นาที | email จาก Sentry (rule ที่ตั้งไว้) |
| Render service ล่ม / `/api/health` ตอบไม่ได้ | email จาก UptimeRobot ภายใน 10 นาที |
| DB connection ล่ม | `/api/health` คืน 503 → email จาก UptimeRobot |

---

## Architecture notes

- `/api/health` ตอน sprint นี้ถูก harden ให้ ping DB ก่อนตอบ (เดิมตอบ `{status: "ok"}` แม้ DB ล่ม)
- ใน `apps/api/src/middlewares/errorHandler.ts` เพิ่ม `captureError()` สำหรับ 5xx เท่านั้น (4xx ไม่ส่งเพราะเป็น expected errors)
- Sentry init ใน backend อยู่ที่ **ต้น** `apps/api/src/index.ts` (ก่อน import อื่น) — จำเป็นสำหรับ OpenTelemetry instrumentation
- Sentry Express handler register ก่อน `errorHandler` ของเรา → Sentry capture ก่อน, แล้ว errorHandler ส่ง response ให้ client
- Sample rate ใน production = 10% (`tracesSampleRate: 0.1`) เพื่อประหยัด free tier quota

## Out of scope

ยังไม่ทำใน MVP นี้:
- LINE Notify / Slack webhook (alert ทาง email พอ)
- Structured logging (winston/pino) — ใช้ console.log อยู่
- APM dashboards / p95 latency tracking
- Synthetic uptime จาก multiple regions
