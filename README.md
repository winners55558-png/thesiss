# JobNble — Digital Platform for Inclusive Employment Opportunities

แพลตฟอร์มหางานสำหรับผู้พิการโดยเฉพาะ พัฒนาด้วย HTML/CSS/JS + Node.js + MySQL + Python FastAPI (Gemini AI)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js (Express) |
| Database | MySQL (XAMPP) |
| AI/Matching | Python FastAPI + Google Gemini 2.5 Flash |
| Payment | Omise (Demo) |

---

## Requirements

ก่อนรันโปรเจกต์ ต้องติดตั้งสิ่งต่อไปนี้ก่อน:

- [Node.js](https://nodejs.org/) v18 ขึ้นไป
- [XAMPP](https://www.apachefriends.org/) (สำหรับ MySQL + phpMyAdmin)
- [Python](https://www.python.org/) 3.10 ขึ้นไป (สำหรับ AI matching)
- [VS Code](https://code.visualstudio.com/) + Extension **Live Server** (สำหรับเปิดหน้าเว็บ)

---

## Installation

### 1. Clone หรือแตกไฟล์โปรเจกต์

```bash
cd Desktop
# วางโฟลเดอร์ JobNble_Thesis ไว้ที่ Desktop หรือที่ใดก็ได้
```

### 2. ติดตั้ง Node.js dependencies

```bash
cd JobNble_Thesis
npm install
```

### 3. ตั้งค่า Database

1. เปิด **XAMPP** แล้วกด **Start** ที่ Apache และ MySQL
2. เปิด browser ไปที่ `http://localhost/phpmyadmin`
3. สร้าง database ใหม่ชื่อ `jobnble_db`
4. คลิกที่ `jobnble_db` → แท็บ **Import** → เลือกไฟล์ `jobnble_db.sql` → กด **Go**
5. รอจนเสร็จ จะเห็นตาราง `employers`, `job_seekers`, `jobs_post`, `applications`, `resumes`, `smart_matches`

### 4. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจกต์:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=jobnble_db
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
```

> หมายเหตุ: `DB_PASSWORD` ปล่อยว่างถ้าใช้ XAMPP default

### 5. ติดตั้ง Python dependencies (สำหรับ AI Matching)

```bash
pip install fastapi uvicorn google-generativeai python-dotenv
```

---

## Running the Project

ต้องรันพร้อมกัน **2 server** ค่ะ

### Terminal 1 — Node.js Backend

```bash
cd JobNble_Thesis
node server.js
```

ถ้าสำเร็จจะเห็น:
```
Server running on port 3000
เชื่อมต่อ MySQL สำเร็จ!
```

### Terminal 2 — Python AI Server

```bash
cd JobNble_Thesis
uvicorn main:app --reload --port 8000
```

### Terminal 3 — Frontend (Live Server)

1. เปิดโฟลเดอร์โปรเจกต์ใน **VS Code**
2. คลิกขวาที่ `Index.html` → **Open with Live Server**
3. หรือกดปุ่ม **Go Live** ที่ status bar ล่างขวา
4. Browser จะเปิดที่ `http://127.0.0.1:5500`

---

## Project Structure

```
JobNble_Thesis/
├── Index.html                  # หน้าแรก
├── home-jobseeker.html         # หน้าหลักผู้หางาน
├── home-employer.html          # หน้าหลักนายจ้าง
├── login-jobseeker.html        # เข้าสู่ระบบ/สมัครสมาชิกผู้หางาน
├── login-employer.html         # เข้าสู่ระบบ/สมัครสมาชิกนายจ้าง
├── resume.html                 # กรอกข้อมูลเรซูเม่ (Step 1)
├── resume2.html                # เลือก Template เรซูเม่ (Step 2)
├── resume3.html                # ดูตัวอย่างเรซูเม่ (Step 3)
├── resume-accessible.html      # เรซูเม่แบบ Accessible สำหรับ screen reader
├── resume-database.html        # ดูเรซูเม่ผู้หางานทั้งหมด (นายจ้าง)
├── profile-job.html            # โปรไฟล์ผู้หางาน
├── profile-em.html             # โปรไฟล์นายจ้าง
├── post-employer.html          # โพสต์ประกาศงาน
├── job-detail.html             # รายละเอียดงาน
├── payment.html                # หน้าชำระเงิน (Demo)
├── script.js                   # JavaScript หลัก
├── server.js                   # Node.js Backend
├── style.css                   # CSS หลัก
├── main.py                     # Python FastAPI (AI Matching)
└── jobnble_db.sql              # Database schema + sample data
```

---

## Key Features

### สำหรับผู้หางาน (ผู้พิการ)
- ✅ สมัครสมาชิกและเข้าสู่ระบบ
- ✅ สร้างเรซูเม่ภายในแพลตฟอร์มพร้อมเลือก Template (4 แบบ)
- ✅ ระบุประเภทและระดับความพิการ (ทางการมองเห็น / ทางการได้ยิน / ทางร่างกาย)
- ✅ ดูเรซูเม่แบบ Accessible สำหรับผู้ใช้ Screen Reader
- ✅ ค้นหาและกรองงานตามประเภทความพิการ
- ✅ ดูสถานะการสมัครงาน (Status Stepper)
- ✅ Export เรซูเม่เป็น PDF

### สำหรับนายจ้าง
- ✅ โพสต์ประกาศงานพร้อมระบุนโยบายรองรับผู้พิการ
- ✅ ระบบ Subscription 4 แบบ (Free Trial / Pay Per Post / Monthly / Yearly)
- ✅ AI Match Score แสดงคะแนนความเหมาะสมของผู้สมัคร
- ✅ ดูเรซูเม่ผู้หางานทั้งหมด (เฉพาะ Monthly/Yearly)
- ✅ Demo Payment ด้วย Omise

### Accessibility (WCAG 2.1)
- ✅ Screen Reader รองรับ VoiceOver (macOS) + NVDA (Windows)
- ✅ Skip link ทุกหน้า
- ✅ `aria-label`, `aria-labelledby`, `role` ครบทุก interactive element
- ✅ Tab order เป็นลำดับที่สมเหตุสมผล
- ✅ `lang="th"` ในทุกไฟล์ HTML

---

## Test Accounts (Sample Data)

### ผู้หางาน
| Email | Password |
|-------|----------|
| manee05elle@gmail.com | 12345678 |
| natsiriprapa@gmail.com | 099699 |

### นายจ้าง
| Email | Password | Subscription |
|-------|----------|-------------|
| employer@test.com | 12345678 | monthly |

> หมายเหตุ: ข้อมูลเหล่านี้มาจาก `jobnble_db.sql` ที่แนบมาให้

---

## Testing Accessibility with Screen Reader

### macOS — VoiceOver
1. กด `Command + F5` เพื่อเปิด VoiceOver
2. เปิด **VoiceOver Utility** → **Speech** → เพิ่ม **Kanya (Thai)** ใน Additional Voices
3. ติ๊ก **Detect Languages** เพื่อให้สลับภาษาอัตโนมัติ
4. ใช้ `Tab` นำทาง และ `Control + Option + A` เพื่ออ่านทั้งหน้า

### Windows — NVDA (ฟรี)
1. ดาวน์โหลด [NVDA](https://www.nvaccess.org/download/)
2. ติดตั้งและเปิดใช้งาน
3. ใช้ `Tab` นำทาง และ `NVDA + Down Arrow` เพื่ออ่านทั้งหน้า

---

## Troubleshooting

| ปัญหา | วิธีแก้ |
|-------|---------|
| `Cannot find module 'dotenv'` | รัน `npm install` ใหม่ |
| `เชื่อมต่อฐานข้อมูลล้มเหลว` | เช็คว่า XAMPP MySQL กำลัง Start อยู่ |
| `PayloadTooLargeError` | เช็คว่า `server.js` มี `bodyParser limit: '10mb'` |
| หน้าเว็บไม่โหลด | ตรวจสอบว่า Live Server รันอยู่ที่ port 5500 |
| AI Matching ไม่ทำงาน | ตรวจสอบ `GEMINI_API_KEY` ใน `.env` และ Python server รันอยู่ |

---

## Developer

พัฒนาโดย **ศิริประภา ยอดยิ่งวรพันธุ์**
สาขาวิชา — มหาวิทยาลัยศิลปากร สาขาธุรกิจดิจิดัล —
Thesis: JobNble — Digital Platform for Inclusive Employment Opportunities

---

*© 2026 JobNble — Digital Platform for Inclusive Employment Opportunities*
