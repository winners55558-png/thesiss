# JobNble — CLAUDE.md

## โปรเจกต์คืออะไร

JobNble เป็นแพลตฟอร์มหางานสำหรับผู้พิการ พัฒนาเป็นวิทยานิพนธ์ ประกอบด้วยระบบ Matching Algorithm ระหว่างผู้หางานกับนายจ้าง, AI Resume Coach, และ AI Job Match Advisor

---

## Tech Stack

### Frontend
- **Vanilla HTML / CSS / JavaScript** (ไม่มี framework)
- ไฟล์ HTML แยกต่างหากต่อหน้า เช่น `Index.html`, `home-jobseeker.html`, `home-employer.html`
- ไฟล์ CSS หลัก: `style.css`, `admin-style.css`
- ไฟล์ JS หลัก: `script.js` (logic ฝั่ง client ทั้งหมด)
- Google OAuth 2.0 (client-side) + callback page `google-callback.html`
- ข้อมูล JSON สำหรับ dropdown: `provinces.json`, `districts.json`

### Backend — Node.js API Server
- **Runtime:** Node.js
- **Framework:** Express.js v5
- **Entry point:** `thesis/server.js` (port 3000)
- **Database:** MySQL (local, database: `jobnble_db`) ผ่าน `mysql2`
- **Auth:** Google OAuth via `google-auth-library`
- **Dependencies:** `axios`, `body-parser`, `cors`, `dotenv`, `express`, `google-auth-library`, `mysql2`

### Backend — Python AI Server
- **Framework:** FastAPI + Uvicorn
- **Entry point:** `thesis/main.py` (port 8000)
- **AI Model:** Gemini 2.5 Flash Lite (`google-generativeai`)
- **Endpoints:**
  - `POST /api/ai/coach` — ปรับปรุงข้อความเรซูเม่
  - `POST /api/ai/match` — วิเคราะห์ความเหมาะสมงาน-ผู้สมัคร
  - `POST /api/ai/analyze-match` — สรุปบทวิเคราะห์ความเหมาะสม

### Database
- **MySQL** — schema อยู่ที่ `jobnble_db.sql` (root directory)
- ตาราง auto-created ผ่าน `server.js` เช่น `saved_jobs`
- `ensureColumn()` helper สำหรับ migration แบบ on-the-fly

### Environment Variables (`.env` อยู่ใน `thesis/`)
| Key | ใช้ทำอะไร |
|-----|-----------|
| `GEMINI_API_KEY` | Google Gemini API |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `ADMIN_USER` | Admin login username |
| `ADMIN_PASS` | Admin login password |
| `ADMIN_KEY` | Admin secret key |

---

## โครงสร้างไฟล์หลัก

```
JobNble_Thesis-main 2/
├── jobnble_db.sql          # DB schema
├── thesis/
│   ├── server.js           # Node.js/Express API (port 3000)
│   ├── main.py             # FastAPI AI server (port 8000)
│   ├── script.js           # Frontend JS ทั้งหมด
│   ├── style.css           # CSS หลัก
│   ├── admin-style.css     # CSS สำหรับ admin
│   ├── package.json        # Node dependencies
│   ├── .env                # Environment variables
│   ├── provinces.json      # ข้อมูลจังหวัด
│   ├── districts.json      # ข้อมูลอำเภอ
│   ├── asset/              # รูปภาพ, โลโก้
│   └── *.html              # หน้าต่างๆ ของระบบ
```

### หน้า HTML หลัก
| ไฟล์ | หน้าที่ |
|------|---------|
| `Index.html` | Landing page |
| `login-jobseeker.html` | Login ผู้หางาน |
| `login-employer.html` | Login นายจ้าง |
| `home-jobseeker.html` | หน้าหลักผู้หางาน |
| `home-employer.html` | หน้าหลักนายจ้าง |
| `profile-job.html` | โปรไฟล์ผู้หางาน |
| `profile-em.html` | โปรไฟล์นายจ้าง |
| `post-employer.html` | โพสต์งาน |
| `job-detail.html` | รายละเอียดงาน |
| `resume.html` | สร้างเรซูเม่ |
| `resume-database.html` | ฐานข้อมูลเรซูเม่ (admin/employer) |
| `payment.html` | หน้าชำระเงิน |
| `admin.html` | Admin dashboard |
| `aboutus.html` | เกี่ยวกับเรา |

---

## วิธีรันโปรเจกต์

```bash
# 1. รัน Node.js server
cd thesis
node server.js          # http://localhost:3000

# 2. รัน Python AI server (terminal แยก)
cd thesis
python main.py          # http://localhost:8000
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

---

## ข้อควรระวัง

- ไฟล์ `.env` มี credentials จริง — **ห้าม commit** ขึ้น public repo
- `server.js` ใช้ `mysql.createConnection` (ไม่ใช่ pool) — restart server หาก connection หลุด
- Python server ต้องรันแยก; ถ้าไม่รัน ฟีเจอร์ AI จะใช้งานไม่ได้
- Schema migration ทำแบบ `ensureColumn()` ใน `server.js` — ไม่มี migration file แยก
