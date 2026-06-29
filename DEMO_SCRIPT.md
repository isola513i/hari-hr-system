# HARI HR System — Demo Script (July 3 Presentation)

> เป้าหมาย: demo เสถียร โชว์ 2 flagship features (360 peer review + predictive analytics)
> บนฐาน HR platform ที่สมบูรณ์ เวลาประมาณ 12–15 นาที

---

## ก่อนเริ่ม (เตรียมล่วงหน้า — ทำคืนก่อน/เช้าวัน present)

1. **Seed ฐานข้อมูลใหม่สด** (สำคัญ — ข้อมูล demo ต้องครบ 12 เดือน):
   ```bash
   cd apps/api && npx ts-node src/scripts/seed-demo.ts
   ```
   > ถ้า DB มีข้อมูลเดิม seed จะ skip — ต้องใช้ DB เปล่า (drop schema → init → seed) สำหรับ demo สด
2. **Start ทั้งสองฝั่ง:**
   ```bash
   npm run dev      # web :5173, api :3001
   ```
3. **Checklist ก่อนขึ้นเวที:**
   - [ ] Login ได้ทั้ง admin + employee
   - [ ] หน้า Analytics โหลด chart ครบ (ไม่มีช่องว่าง)
   - [ ] หน้า Performance เปิด review แล้วเห็น 360 panel มีข้อมูล
   - [ ] ไม่มี error ใน browser console
   - [ ] เปิด `/api-docs` ได้ (Swagger)

### บัญชี Demo
| บทบาท | Email | Password |
|---|---|---|
| HR Admin | `admin@aiya.ai` | `Welcome123!` |
| Manager (Eng) | `priya@aiya.ai` | `Demo123!` |
| Employee (peer) | `linmei@aiya.ai` *(หรือพนักงานคนอื่น)* | `Demo123!` |

---

## ลำดับการ Demo

### 1. ภาพรวม + Dashboard (2 นาที)
- Login `admin@aiya.ai`
- โชว์ **Dashboard**: headcount, attendance วันนี้, การ์ดสรุป, chart
- พูดถึง: React 19 + TypeScript, real-time ผ่าน Socket.io, responsive (ย่อหน้าจอโชว์ได้)

### 2. ความปลอดภัย (2 นาที) — จุดแข็งที่ทำเสร็จแล้ว
- **2FA**: Settings → Security → โชว์ TOTP setup (QR code)
- **RBAC**: อธิบาย HR Admin vs Manager vs Employee เห็นข้อมูลต่างกัน
- **Audit log**: หน้า Compliance → โชว์ log การกระทำ (login, CRUD, ใคร/เมื่อไหร่/IP)

### 3. 🌟 360-degree Peer Review (4 นาที) — FLAGSHIP #1
- ไปหน้า **Performance Reviews**
- เปิด review ของ **Tanaka** (Sr Engineer) → กดขยาย
- โชว์ **360° Score Breakdown**: Manager / Peers / Overall (มีข้อมูล seed อยู่แล้ว)
  - มี peer feedback 2 คน submitted + 1 คน pending
- กด **"Request Peer Review"** → เลือกเพื่อนร่วมงานเพิ่ม 1 คน → ส่งคำขอ
  - อธิบาย: peer ได้รับ notification
- *(ถ้ามีเวลา/อยากโชว์ flow เต็ม)* เปิด tab ใหม่ login เป็น peer คนนั้น → submit feedback (rating + comment + anonymous toggle) → กลับมา refresh เห็น score อัปเดต
- จุดขาย: การประเมินแบบ 360 องศา (self + manager + peers) ถ่วงน้ำหนัก, รักษาความเป็นส่วนตัวของ anonymous feedback

### 4. 🌟 Predictive Analytics (4 นาที) — FLAGSHIP #2
- ไปหน้า **Analytics**
- โชว์ section **"Predictive Insights"** (อยู่บนสุด):
  - **Headcount Projection**: เส้นทึบ = ข้อมูลจริง 12 เดือน, เส้นประ = พยากรณ์ 3 เดือนข้างหน้า + แถบความเชื่อมั่น (confidence band) + badge momentum
  - **Leave Demand Forecast**: bar ข้อมูลจริง + bar พยากรณ์ความต้องการลาเดือนหน้า
  - **Attrition Risk by Department**: ตารางแสดงอัตราการลาออกต่อแผนก + badge ความเสี่ยง (เขียว/เหลือง/แดง)
- จุดขาย: ใช้ linear regression (least-squares) คำนวณบน server — คาดการณ์แนวโน้มได้โดยไม่ต้องพึ่ง ML library, มี unit test ครบ
- เลื่อนลงดู 6 charts เดิม (headcount growth, department, attendance, leave, performance, turnover)

### 5. Multi-language (1 นาที)
- Settings → เปลี่ยนภาษา **EN ↔ TH** → โชว์ว่า UI แปลครบ (i18next, 22 ไฟล์/ภาษา)

### 6. Q&A / เอกสาร (1 นาที)
- เปิด `/api-docs` → โชว์ Swagger ครบ 230+ endpoints
- ตอบคำถามอาจารย์

---

## คำพูดเปิด (ร่าง)
> "HARI เป็นระบบ HR แบบครบวงจรที่เราพัฒนาด้วย React, TypeScript และ PostgreSQL
> วันนี้จะโชว์ feature เด่น 2 อย่างที่เพิ่งทำเสร็จ — การประเมินผลงานแบบ 360 องศา
> และระบบวิเคราะห์เชิงคาดการณ์ บนพื้นฐานของระบบความปลอดภัยระดับองค์กร"

## แผนสำรอง (ถ้ามีปัญหา)
- ถ้า chart ใดว่าง → seed DB ใหม่ก่อนขึ้นเวที (ดูขั้นเตรียม)
- ถ้า live peer submit มีปัญหา → ใช้ข้อมูล seed ที่มีอยู่แล้วโชว์ aggregate panel (ไม่ต้อง live submit)
- ถ้า Socket/real-time มีปัญหา → refresh หน้าเว็บ (REST ยังทำงานปกติ)
- เตรียม screenshot/วิดีโอสำรองของ 2 flagship features เผื่อ network/DB ล่ม
