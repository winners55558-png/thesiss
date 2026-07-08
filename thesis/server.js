require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');

// ── Admin server-side sessions ──
const adminSessions = new Map();

// ── Nodemailer transporter (Gmail) ──
const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(__dirname)); 

// ==========================================
// 1. การเชื่อมต่อ MySQL
// ==========================================
// 1. การเชื่อมต่อ MySQL (เปลี่ยนมาใช้ createPool แทน createConnection)
const db = mysql.createPool({
    host: 'mysql-3bf4aa3a-winners55558-146e.k.aivencloud.com',
    port: 21516,
    user: 'avnadmin',
    password: 'AVNS_J_JXTkSKT23RJu6azsK', // ⚠️ อย่าลืมใส่รหัสผ่านจริงของ Aiven นะครับ
    database: 'defaultdb',
    ssl: {
        rejectUnauthorized: false
    },
    // ตั้งค่าสำหรับ Pool เพื่อให้มันต่ออายุอัตโนมัติเวลาหลุด
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ทดสอบการเชื่อมต่อ
db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('เชื่อมต่อ MySQL แบบ Pool สำเร็จและพร้อมใช้งาน!');
    connection.release(); // คืนสถานะกลับสู่ Pool
});

    // ── สร้าง saved_jobs table ทันที (ไม่รอ ensureColumn chain) ──
    db.query(`
        CREATE TABLE IF NOT EXISTS saved_jobs (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            seeker_id  INT NOT NULL,
            job_id     INT NOT NULL,
            saved_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_save (seeker_id, job_id)
        )
    `, (err) => {
        if (err) console.error('saved_jobs CREATE TABLE error:', err.message);
        else     console.log('✅ saved_jobs table พร้อมใช้งาน');
    });

    // ── helper: ตรวจ & เพิ่ม column ถ้ายังไม่มี ──
    function ensureColumn(table, column, definition, cb) {
        db.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA='jobnble_db' AND TABLE_NAME=? AND COLUMN_NAME=?`,
            [table, column],
            (err, rows) => {
                if (err) { console.error(`ตรวจ ${table}.${column} ล้มเหลว:`, err.message); return cb && cb(); }
                if (rows.length === 0) {
                    db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`, (err) => {
                        if (err) console.error(`ADD COLUMN ${table}.${column} ล้มเหลว:`, err.message);
                        else console.log(`✅ เพิ่ม column ${table}.${column} สำเร็จ`);
                        cb && cb();
                    });
                } else {
                    console.log(`✅ column ${table}.${column} พร้อมใช้งาน`);
                    cb && cb();
                }
            }
        );
    }

    // ── ตรวจสอบ & สร้าง column profile_pic (MEDIUMTEXT) ──
    db.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA='jobnble_db' AND TABLE_NAME='resumes' AND COLUMN_NAME='profile_pic'`,
    (err, rows) => {
        if (err) return console.error('ตรวจ column ล้มเหลว:', err.message);
        if (rows.length === 0) {
            db.query(`ALTER TABLE resumes ADD COLUMN profile_pic MEDIUMTEXT`, (err) => {
                if (err) console.error('ADD COLUMN profile_pic ล้มเหลว:', err.message);
                else console.log('✅ เพิ่ม column profile_pic (MEDIUMTEXT) สำเร็จ');
            });
        } else {
            // column มีอยู่แล้ว — ตรวจให้แน่ใจว่าเป็น MEDIUMTEXT (รองรับ base64)
            db.query(`ALTER TABLE resumes MODIFY COLUMN profile_pic MEDIUMTEXT`, (err) => {
                if (err) console.error('MODIFY COLUMN profile_pic ล้มเหลว:', err.message);
                else console.log('✅ column profile_pic พร้อมใช้งาน (MEDIUMTEXT)');
            });
        }
    });

    // ── ตรวจสอบ & สร้าง columns ที่ขาดหายใน jobs_post / employers ──
    ensureColumn('jobs_post', 'job_category', "VARCHAR(100) DEFAULT NULL AFTER `job_title`", function () {
        ensureColumn('jobs_post', 'expires_at', "DATETIME DEFAULT NULL", function () {
            ensureColumn('employers', 'subscription_plan', "VARCHAR(50) DEFAULT NULL", function () {
                ensureColumn('employers', 'subscription_expires_at', "DATETIME DEFAULT NULL", function () {
                    ensureColumn('employers', 'created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP", function () {
                        ensureColumn('applications', 'match_score', "INT DEFAULT 0", function () {
                            ensureColumn('applications', 'match_details', "TEXT DEFAULT NULL", function () {
                                ensureColumn('applications', 'is_starred', "TINYINT(1) DEFAULT 0", function () {
                                ensureColumn('jobs_post', 'work_mode', "VARCHAR(50) DEFAULT NULL", function () {
                                    ensureColumn('jobs_post', 'req_education', "VARCHAR(100) DEFAULT NULL", function () {
                                        ensureColumn('jobs_post', 'age_min', "INT DEFAULT NULL", function () {
                                            ensureColumn('jobs_post', 'age_max', "INT DEFAULT NULL", function () {
                                                ensureColumn('resumes', 'preferred_work_mode', "VARCHAR(50) DEFAULT NULL", function () {
                                                    ensureColumn('employers', 'verification_status', "VARCHAR(20) DEFAULT 'pending'", function() {
                                        // ── Auto-create saved_jobs table ──
                                        db.query(`CREATE TABLE IF NOT EXISTS saved_jobs (
                                            id INT AUTO_INCREMENT PRIMARY KEY,
                                            seeker_id INT NOT NULL,
                                            job_id INT NOT NULL,
                                            saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                            UNIQUE KEY unique_save (seeker_id, job_id)
                                        )`, (err) => {
                                            if (err) console.error('saved_jobs table error:', err.message);
                                            else console.log('✅ saved_jobs table พร้อมใช้งาน');
                                        });

                                        // ── Auto-create match_analysis table ──
                                        db.query(`CREATE TABLE IF NOT EXISTS match_analysis (
                                            id INT AUTO_INCREMENT PRIMARY KEY,
                                            seeker_id INT NOT NULL,
                                            job_id INT NOT NULL,
                                            match_score INT DEFAULT 0,
                                            reasons JSON,
                                            ai_narrative TEXT DEFAULT NULL,
                                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                            UNIQUE KEY uk_seeker_job (seeker_id, job_id)
                                        )`, (err) => {
                                            if (err) console.error('match_analysis table error:', err.message);
                                            else {
                                                console.log('✅ match_analysis table พร้อมใช้งาน');
                                                // เพิ่ม column ai_narrative ถ้ายังไม่มี (กรณี table มีอยู่แล้ว)
                                                ensureColumn('match_analysis', 'ai_narrative', 'TEXT DEFAULT NULL', () => {});
                                            }
                                        });
                                        // ── Auto-create seeker_notifications table ──
                                        db.query(`CREATE TABLE IF NOT EXISTS seeker_notifications (
                                            id INT AUTO_INCREMENT PRIMARY KEY,
                                            seeker_id INT NOT NULL,
                                            application_id INT NOT NULL,
                                            job_title VARCHAR(255),
                                            company_name VARCHAR(255),
                                            result ENUM('approved','rejected') NOT NULL,
                                            is_read TINYINT(1) DEFAULT 0,
                                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                        )`, (err) => {
                                            if (err) console.error('seeker_notifications table error:', err.message);
                                            else console.log(' seeker_notifications table พร้อมใช้งาน');
                                        });
                                                                            });
                                }); // is_starred
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

// ==========================================
// 🛡️ ฟังก์ชันช่วยเหลือ (Helper) ป้องกันค่า Null
// ==========================================
const safeStr = (val) => {
    if (val === undefined || val === null) return '';
    return val;
};

// ── ลบ comma ออกจากค่าเงินเดือน เพื่อป้องกัน Number() ได้ NaN ──
// เช่น "30,000" → "30000"  |  30000 → "30000"  |  null → null
const cleanSalary = (val) => {
    if (val === undefined || val === null || val === '') return null;
    return String(val).replace(/,/g, '').trim();
};

const safeJson = (val) => {
    if (val === undefined || val === null || val === '') return '[]';
    return val;
};

// ==========================================
// 🧮 Rule-Based Match Score (6 หมวด รวม 100 คะแนน)
// ==========================================

// ── โหลดพิกัดจังหวัดและอำเภอไทย ──
const PROVINCES = require('./provinces.json');
const DISTRICTS = require('./districts.json');

// ── ค้นหาพิกัดระดับอำเภอ (จังหวัด + อำเภอ) ──
function getDistrictCoords(province, district) {
    if (!province || !district) return null;
    const provKey = Object.keys(DISTRICTS).find(p =>
        province.includes(p) || p.includes(province)
    );
    if (!provKey) return null;
    const distData = DISTRICTS[provKey];
    const distKey  = Object.keys(distData).find(d =>
        district.includes(d) || d.includes(district)
    );
    return distKey ? distData[distKey] : null;
}

// ── ค้นหาพิกัดระดับจังหวัด ──
function getProvinceCoords(text) {
    if (!text) return null;
    const t = text.trim();
    for (const [name, coords] of Object.entries(PROVINCES)) {
        if (t.includes(name) || name.includes(t)) return coords;
    }
    return null;
}

// ── ค้นหาพิกัดแบบ Smart: ลองอำเภอก่อน → fallback จังหวัด ──
function getLocationCoords(province, district) {
    const byDistrict = getDistrictCoords(province, district);
    if (byDistrict) return byDistrict;
    return getProvinceCoords(province);
}

// ── Haversine Distance (คำนวณระยะทางระหว่าง 2 พิกัด หน่วย km) ──
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Helper: เช็คว่า subscription ยังไม่หมดอายุ ──
function isSubActive(employer) {
    if (!employer.subscription_plan) return false;
    if (!employer.subscription_expires_at) return false;
    return new Date(employer.subscription_expires_at) > new Date();
}

function calcMatchScore(resume, job) {
    let score   = 0;
    let reasons = [];

    const safeParseJSON = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        try { return JSON.parse(val); } catch (e) { return []; }
    };

    // ── Synonym Map ทักษะไทย-อังกฤษ ──
    const SKILL_SYNONYMS = {
        'graphic design':   ['การออกแบบกราฟิก','ออกแบบกราฟิก','กราฟิก','กราฟิกดีไซน์'],
        'excel':            ['microsoft excel','ms excel','โปรแกรม excel','สเปรดชีต'],
        'word':             ['microsoft word','ms word','โปรแกรม word'],
        'powerpoint':       ['microsoft powerpoint','ms powerpoint','นำเสนองาน'],
        'accounting':       ['บัญชี','การบัญชี','งานบัญชี'],
        'programming':      ['เขียนโปรแกรม','โปรแกรมเมอร์','coding','พัฒนาโปรแกรม'],
        'javascript':       ['js','nodejs','node.js','react','vue'],
        'data entry':       ['กรอกข้อมูล','บันทึกข้อมูล','ป้อนข้อมูล'],
        'customer service': ['บริการลูกค้า','ดูแลลูกค้า','ต้อนรับ'],
        'photoshop':        ['adobe photoshop','ps','ตกแต่งภาพ'],
        'illustrator':      ['adobe illustrator','ai','งานเวกเตอร์'],
        'sewing':           ['เย็บผ้า','ตัดเย็บ','งานฝีมือ'],
        'driving':          ['ขับรถ','ใบขับขี่','driver'],
    };

    function skillMatch(mySkillsText, reqSkill) {
        if (mySkillsText.includes(reqSkill)) return true;
        for (const [eng, thaiList] of Object.entries(SKILL_SYNONYMS)) {
            const group = [eng, ...thaiList];
            if (group.some(s => reqSkill.includes(s) || s.includes(reqSkill))) {
                if (group.some(s => mySkillsText.includes(s))) return true;
            }
        }
        return false;
    }

    // ── ตารางลำดับวุฒิการศึกษา ──
    const EDU_RANK = {
        'ต่ำกว่ามัธยม': 1, 'ประถม': 1,
        'มัธยม': 2, 'ม.6': 2, 'ปวช': 2, 'ปวช.': 2,
        'ปวส': 3, 'ปวส.': 3, 'อนุปริญญา': 3,
        'ปริญญาตรี': 4, 'ป.ตรี': 4,
        'ปริญญาโท': 5, 'ป.โท': 5,
        'ปริญญาเอก': 6, 'ป.เอก': 6,
    };

    function getEduRank(text) {
        if (!text) return 0;
        const t = text.toLowerCase();
        for (const [key, rank] of Object.entries(EDU_RANK)) {
            if (t.includes(key.toLowerCase())) return rank;
        }
        return 0;
    }

    // ── แปลงข้อความปีประสบการณ์เป็นตัวเลข ──
    function parseExpYears(text) {
        if (!text) return 0;
        const m = text.match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
    }

    // ── นับปีประสบการณ์รวมจาก work_experience ──
    function countTotalExpYears(workExpArr) {
        let total = 0;
        workExpArr.forEach(exp => {
            const dur = exp.duration || exp.period || '';
            const yrs = parseExpYears(dur);
            total += yrs;
        });
        return total > 0 ? total : workExpArr.length; // fallback: นับเป็นจำนวนงาน
    }

    // ══════════════════════════════════════════
    // ── 1. Disability Fit — 20 คะแนน ──
    // ══════════════════════════════════════════
    const reqDisType = job.disability_type || '';
    const myDisType  = resume.disability_type || '';
    if (!reqDisType || reqDisType.includes('รับทุกประเภท')) {
        score += 20;
        reasons.push('✔️ ตำแหน่งนี้เปิดรับผู้พิการทุกประเภท (+20)');
    } else if (myDisType && reqDisType.includes(myDisType)) {
        score += 20;
        reasons.push('✔️ สภาพแวดล้อมรองรับความพิการของคุณ (+20)');
    } else {
        reasons.push('⚠️ สภาพแวดล้อมอาจยังไม่รองรับโดยตรง (0)');
    }

    // ══════════════════════════════════════════
    // ── 2. Skills Match — 20 คะแนน ──
    //    [แก้ไข] เพิ่ม Synonym Map ไทย-อังกฤษ
    // ══════════════════════════════════════════
    const mySkills     = (resume.skills || '').toLowerCase();
    const reqSkillsArr = (job.req_skills || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (reqSkillsArr.length > 0 && mySkills) {
        let matchCount = 0;
        reqSkillsArr.forEach(req => { if (skillMatch(mySkills, req)) matchCount++; });
        const skillScore = Math.floor((matchCount / reqSkillsArr.length) * 20);
        score += skillScore;
        if (skillScore > 0) reasons.push(`💡 มีทักษะตรงตามที่ตำแหน่งงานต้องการ ${matchCount} ทักษะ (+${skillScore})`);
        else reasons.push('💡 ทักษะยังไม่ตรงกับที่ตำแหน่งงานต้องการ (0)');

        // Bonus: มีทักษะครบ + มีทักษะเพิ่มเติมนอกเหนือจากที่กำหนด
        const mySkillsArr = mySkills.split(',').map(s => s.trim()).filter(Boolean);
        if (matchCount === reqSkillsArr.length && mySkillsArr.length > reqSkillsArr.length) {
            score += 2;
            reasons.push(`💡 มีทักษะเพิ่มเติมนอกเหนือจากที่กำหนด (+2)`);
        }
    } else if (reqSkillsArr.length === 0) {
        score += 20;
        reasons.push('💡 ตำแหน่งงานไม่ได้กำหนดทักษะเฉพาะ (+20)');
    }

    // ══════════════════════════════════════════
    // ── 3. Experience & Activities — 20 คะแนน ──
    //    [แก้ไข] ใช้ req_experience เปรียบเทียบปีจริง
    // ══════════════════════════════════════════
    let expScore = 0;
    let hasExp   = false;
    const workExp   = safeParseJSON(resume.work_experience);
    const internExp = safeParseJSON(resume.intern_experience);
    const actExp    = safeParseJSON(resume.activities);

    const jobTitle  = (job.job_title    || '').toLowerCase();
    const jobCat    = (job.job_category || '').toLowerCase();
    const reqExpTxt = (job.req_experience || '').toLowerCase();
    const reqExpYrs = parseExpYears(reqExpTxt);

    // ตรวจว่าประสบการณ์ตรงกับตำแหน่งไหม
    let isRelevant = false;
    const checkRelevance = (arr) => {
        arr.forEach(exp => {
            const title = (exp.title || exp.name || '').toLowerCase();
            if (title && (jobTitle.includes(title) || title.includes(jobTitle) ||
                jobCat.includes(title.split(' ')[0]))) isRelevant = true;
        });
    };
    checkRelevance(workExp);
    checkRelevance(internExp);

    if (workExp.length > 0) {
        hasExp = true;
        const totalYrs = countTotalExpYears(workExp);
        if (reqExpYrs > 0) {
            // นายจ้างกำหนดปี → เปรียบเทียบ
            if (totalYrs >= reqExpYrs) {
                expScore += 10;
                reasons.push(`💼 มีประสบการณ์ ${totalYrs} ปี ตรงตามที่กำหนด (${reqExpYrs} ปี) (+10)`);
            } else {
                expScore += 5;
                reasons.push(`💼 มีประสบการณ์ ${totalYrs} ปี (ต้องการ ${reqExpYrs} ปี) (+5)`);
            }
        } else {
            expScore += 10;
            reasons.push(`💼 มีประสบการณ์การทำงาน (+10)`);
        }
    } else if (internExp.length > 0) {
        hasExp = true;
        expScore += 7;
        reasons.push('💼 มีประสบการณ์ฝึกงาน (+7)');
    } else if (actExp.length > 0) {
        expScore += 3;
        reasons.push('💼 มีกิจกรรม/อาสาสมัคร (+3)');
    }

    if (isRelevant && hasExp) {
        expScore = Math.min(expScore + 10, 20);
        reasons.push(`💼 ประสบการณ์เกี่ยวข้องกับตำแหน่งนี้โดยตรง (+รวม ${expScore})`);
    }
    score += expScore;

    // ══════════════════════════════════════════
    // ── 4. Education Match — 15 คะแนน ──
    //    [แก้ไข] ใช้ req_education + หาวุฒิสูงสุด
    // ══════════════════════════════════════════
    let eduScore = 0;
    const eduHist    = safeParseJSON(resume.education_history);
    const reqEduTxt  = (job.req_education || '').toLowerCase();
    const reqEduRank = getEduRank(reqEduTxt);

    if (eduHist.length > 0) {
        // หาวุฒิสูงสุดจากทุกรายการ (ไม่ใช่แค่ชิ้นแรก)
        let highestRank = 0;
        let highestMajor = '';
        eduHist.forEach(edu => {
            const lvl   = edu.level || edu.degree || '';
            const major = edu.major || edu.field  || '';
            const rank  = getEduRank(lvl) || getEduRank(major);
            if (rank > highestRank) { highestRank = rank; highestMajor = major.toLowerCase(); }
        });

        // เปรียบเทียบวุฒิกับที่งานต้องการ
        if (reqEduRank === 0 || highestRank >= reqEduRank) {
            eduScore += 8; // ผ่านเกณฑ์วุฒิ
        } else {
            eduScore += 0; // วุฒิต่ำกว่าที่กำหนด → 0 คะแนน
            reasons.push(`🎓 วุฒิการศึกษาต่ำกว่าที่ตำแหน่งนี้กำหนด (0)`);
        }

        // เช็คสาขาตรง
        if (highestMajor && eduScore >= 8 &&
            (jobCat.includes(highestMajor) || highestMajor.includes(jobCat.split('/')[0]))) {
            eduScore += 7;
            reasons.push(`🎓 สาขาวิชาตรงกับหมวดหมู่งาน (+${eduScore})`);
        } else if (eduScore >= 8) {
            reasons.push(`🎓 มีวุฒิการศึกษาตามเกณฑ์ที่กำหนด (+${eduScore})`);
        }
    }
    score += eduScore;

    // ══════════════════════════════════════════
    // ── 5. Work Mode Match — 10 คะแนน ──
    // ══════════════════════════════════════════
    let workModeScore = 0;
    const seekerMode = (resume.preferred_work_mode || '').trim();
    const jobMode    = (job.work_mode || '').trim();

    if (seekerMode && jobMode) {
        if (jobMode === 'ตามตกลง') {
            workModeScore = 10;
            reasons.push('🏢 รูปแบบการทำงานยืดหยุ่น ตามตกลงได้ (+10)');
        } else if (seekerMode === jobMode) {
            workModeScore = 10;
            reasons.push(`🏢 รูปแบบการทำงานตรงกัน: ${jobMode} (+10)`);
        } else if (seekerMode === 'ตามตกลง') {
            workModeScore = 8;
            reasons.push('🏢 ผู้หางานยืดหยุ่นด้านรูปแบบการทำงาน (+8)');
        } else if (
            (seekerMode === 'ทำงานที่ออฟฟิศ'           && jobMode === 'ทำที่ออฟฟิศสลับทำที่บ้าน') ||
            (seekerMode === 'ทำงานที่บ้าน'              && jobMode === 'ทำที่ออฟฟิศสลับทำที่บ้าน') ||
            (seekerMode === 'ทำที่ออฟฟิศสลับทำที่บ้าน' && jobMode === 'ทำงานที่ออฟฟิศ') ||
            (seekerMode === 'ทำที่ออฟฟิศสลับทำที่บ้าน' && jobMode === 'ทำงานที่บ้าน')
        ) {
            workModeScore = 5;
            reasons.push('🏢 รูปแบบการทำงานใกล้เคียงกัน (+5)');
        } else {
            workModeScore = 0;
            reasons.push('🏢 รูปแบบการทำงานไม่ตรงกัน (0)');
        }
    }
    score += workModeScore;

    // ══════════════════════════════════════════
    // ── 6. Location Distance — 15 คะแนน ──
    //    [แก้ไข] งาน Remote → ได้เต็มโดยไม่คิดระยะทาง
    // ══════════════════════════════════════════
    let locationScore = 0;
    const currentJobMode = (job.work_mode || '').trim();

    if (currentJobMode === 'ทำงานที่บ้าน') {
        // Remote ไม่มีข้อจำกัดระยะทาง
        locationScore = 15;
        reasons.push('📍 งาน Remote ทำจากที่ไหนก็ได้ (+15)');
    } else {
        // ลองหาพิกัดระดับอำเภอก่อน → fallback จังหวัด
        const seekerCoords = getLocationCoords(resume.province, resume.district);
        const jobCoords    = getProvinceCoords(job.job_location);

        if (seekerCoords && jobCoords) {
            const dist = haversineDistance(
                seekerCoords.lat, seekerCoords.lng,
                jobCoords.lat,    jobCoords.lng
            );
            if      (dist <= 10)  { locationScore = 15; reasons.push(`📍 ระยะทาง ${dist.toFixed(0)} km — ใกล้มาก (+15)`); }
            else if (dist <= 20)  { locationScore = 12; reasons.push(`📍 ระยะทาง ${dist.toFixed(0)} km — ใกล้ (+12)`); }
            else if (dist <= 30)  { locationScore =  9; reasons.push(`📍 ระยะทาง ${dist.toFixed(0)} km — พอเดินทางได้ (+9)`); }
            else if (dist <= 40)  { locationScore =  6; reasons.push(`📍 ระยะทาง ${dist.toFixed(0)} km — ค่อนข้างไกล (+6)`); }
            else if (dist <= 50)  { locationScore =  3; reasons.push(`📍 ระยะทาง ${dist.toFixed(0)} km — ไกลพอสมควร (+3)`); }
            else                  { locationScore =  0; reasons.push(`📍 ระยะทาง ${dist.toFixed(0)} km — ไกลเกินไป (0)`); }
        } else {
            reasons.push('📍 ยังไม่มีข้อมูลจังหวัด (ไม่นับคะแนนส่วนนี้)');
        }
    }
    score += locationScore;

    return { score: Math.min(score, 100), reasons };
}

// ==========================================
// 2. API สมัครสมาชิก (ผู้หางาน)
// ==========================================
app.post('/api/register/seeker', (req, res) => {
    const { first_name, last_name, phone, email, password } = req.body;
    const sql = "INSERT INTO job_seekers (first_name, last_name, phone, email, password) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [safeStr(first_name), safeStr(last_name), safeStr(phone), safeStr(email), safeStr(password)], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "อีเมลนี้มีผู้ใช้งานแล้ว" });
            return res.status(500).json({ error: err.message });
        }
        // ✅ ส่ง user data กลับเพื่อให้ frontend auto-login ได้ทันที
        res.json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ!',
            user: { id: result.insertId, name: safeStr(first_name) }
        });
    });
});

// ==========================================
// 3. API สมัครสมาชิก (นายจ้าง)
// ==========================================
app.post('/api/register/employer', (req, res) => {
    const { company_name, phone, address, tax_id, email, password } = req.body;
    const sql = "INSERT INTO employers (company_name, phone, address, tax_id, email, password, verification_status) VALUES (?, ?, ?, ?, ?, ?, 'pending')";

    db.query(sql, [safeStr(company_name), safeStr(phone), safeStr(address), safeStr(tax_id), safeStr(email), safeStr(password)], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "อีเมลนี้มีผู้ใช้งานแล้ว" });
            return res.status(500).json({ error: err.message });
        }
        // ✅ ส่ง user data กลับเพื่อให้ frontend auto-login ได้ทันที
        res.json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ!',
            user: { id: result.insertId, name: safeStr(company_name) }
        });
    });
});

// ==========================================
// 4. API เข้าสู่ระบบ (รองรับทั้ง 2 ฝั่ง)
// ==========================================
app.post('/api/login', (req, res) => {
    const { email, password, type } = req.body;
    const table = type === 'seeker' ? 'job_seekers' : 'employers';
    const sql = `SELECT id, email, ${type === 'seeker' ? 'first_name' : 'company_name'} as name FROM ${table} WHERE email = ? AND password = ?`;
    
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) res.json({ success: true, type: type, user: results[0] });
        else res.status(401).json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    });
});

// ==========================================
// 5. API บันทึกข้อมูลเรซูเม่ (อัปเดตรับค่า job_position)
// ==========================================
app.post('/api/save-resume', (req, res) => {
    const {
        seeker_id, first_name, last_name, phone, email,
        dob, address, province, district, sub_district, zipcode,
        disability_type, disability_level_visual, disability_level_hearing, disability_level_physical, summary, skills,
        education_history, work_experience, intern_experience, activities, portfolio_url,
        selected_template,
        job_position,
        job_type,
        expected_salary,
        preferred_work_mode,
        profile_pic
    } = req.body;

    const safeDob = dob ? dob : '1970-01-01';

    const updateSeekerSql = `UPDATE job_seekers SET first_name=?, last_name=?, phone=?, email=? WHERE id=?`;
    db.query(updateSeekerSql, [safeStr(first_name), safeStr(last_name), safeStr(phone), safeStr(email), seeker_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query(`SELECT id FROM resumes WHERE seeker_id = ?`, [seeker_id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            const eduStr = safeJson(JSON.stringify(education_history));
            const workStr = safeJson(JSON.stringify(work_experience));
            const internStr = safeJson(JSON.stringify(intern_experience));
            const actStr = safeJson(JSON.stringify(activities));
            
            const highestEdu = (education_history && education_history.length > 0) ? education_history[0].level : '';
            const expStr = "ทำงาน: " + workStr + " ฝึกงาน: " + internStr;

            if (results.length > 0) {
                const updateResume = `UPDATE resumes SET
                    dob=?, disability_type=?, disability_level_visual=?, disability_level_hearing=?, disability_level_physical=?, address=?, sub_district=?, district=?, province=?, zipcode=?,
                    summary=?, skills=?, education_history=?, work_experience=?, intern_experience=?, activities=?, portfolio_url=?,
                    education_level=?, experience=?, portfolio=?, selected_template=?, job_position=?, job_type=?, expected_salary=?, preferred_work_mode=?,
                    lat=COALESCE(NULLIF(?, ''), lat), lng=COALESCE(NULLIF(?, ''), lng),
                    profile_pic=COALESCE(NULLIF(?, ''), profile_pic)
                    WHERE seeker_id=?`;

                const { lat: seekerLat, lng: seekerLng } = req.body;
                db.query(updateResume, [
                    safeDob, safeStr(disability_type), safeStr(disability_level_visual), safeStr(disability_level_hearing), safeStr(disability_level_physical), safeStr(address), safeStr(sub_district), safeStr(district), safeStr(province), safeStr(zipcode),
                    safeStr(summary), safeStr(skills), eduStr, workStr, internStr, actStr, safeStr(portfolio_url),
                    safeStr(highestEdu), expStr, '', safeStr(selected_template), safeStr(job_position), safeStr(job_type), safeStr(expected_salary), safeStr(preferred_work_mode),
                    seekerLat || '', seekerLng || '',
                    safeStr(profile_pic),
                    seeker_id
                ], (err) => {
                     if (err) return res.status(500).json({ error: err.message });
                     res.json({ success: true, message: "อัปเดตข้อมูลเรซูเม่และเทมเพลตสำเร็จ!" });
                });
            } else {
                const insertResume = `INSERT INTO resumes (
                    seeker_id, dob, disability_type, disability_level_visual, disability_level_hearing, disability_level_physical, address, sub_district, district, province, zipcode,
                    summary, skills, education_history, work_experience, intern_experience, activities, portfolio_url,
                    education_level, experience, portfolio, selected_template, job_position, job_type, expected_salary, preferred_work_mode, lat, lng, profile_pic
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                db.query(insertResume, [
                    seeker_id, safeDob, safeStr(disability_type), safeStr(disability_level_visual), safeStr(disability_level_hearing), safeStr(disability_level_physical), safeStr(address), safeStr(sub_district), safeStr(district), safeStr(province), safeStr(zipcode),
                    safeStr(summary), safeStr(skills), eduStr, workStr, internStr, actStr, safeStr(portfolio_url),
                    safeStr(highestEdu), expStr, '', safeStr(selected_template), safeStr(job_position), safeStr(job_type), safeStr(expected_salary), safeStr(preferred_work_mode),
                    seekerLat || null, seekerLng || null, safeStr(profile_pic)
                ], (err) => {
                     if (err) return res.status(500).json({ error: err.message });
                     res.json({ success: true, message: "บันทึกข้อมูลเรซูเม่และเทมเพลตสำเร็จ!" });
                });
            }
        });
    });
});

// ==========================================
// 6. API บันทึก Theme เรซูเม่ (ใช้แยกต่างหากได้เผื่อผู้ใช้อยากแก้แค่ธีม)
// ==========================================
app.post('/api/update-template', (req, res) => {
    const { seeker_id, selected_template } = req.body;
    const sql = `UPDATE resumes SET selected_template=? WHERE seeker_id=?`;
    db.query(sql, [safeStr(selected_template), seeker_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "อัปเดตเทมเพลตสำเร็จ" });
    });
});

// ==========================================
// 7. API โหลดข้อมูลเรซูเม่ / โหลดข้อมูลนายจ้าง
// ==========================================
app.get('/api/get-resume/:userId', (req, res) => {
    const sql = `SELECT s.first_name, s.last_name, s.phone, s.email, r.* FROM job_seekers s LEFT JOIN resumes r ON s.id = r.seeker_id WHERE s.id = ?`;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results.length > 0 ? results[0] : {});
    });
});

app.get('/api/get-employer/:userId', (req, res) => {
    const sql = `SELECT company_name, email, phone, address, tax_id FROM employers WHERE id = ?`;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results.length > 0 ? results[0] : {});
    });
});

// ==========================================
// 8. API โหลดประกาศงานทั้งหมด
// ==========================================
app.get('/api/jobs', (req, res) => {
    const sql = `SELECT j.*, e.company_name FROM jobs_post j JOIN employers e ON j.employer_id = e.id WHERE (j.status = 'open' OR j.status IS NULL) AND (j.expires_at > NOW() OR j.expires_at IS NULL)`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// 8b. API ค้นหางาน (พร้อม relevance score)
// GET /api/jobs/search?q=keyword&category=it&type=fulltime&disability_type=...&disability_level=...
// ==========================================
app.get('/api/jobs/search', (req, res) => {
    const { q, category, type, disability_type, disability_level } = req.query;
    const hasQ = q && q.trim() !== '';
    const exact = hasQ ? q.trim() : '';
    const like  = `%${exact}%`;

    const whereClauses = [`(j.status = 'open' OR j.status IS NULL)`, `(j.expires_at > NOW() OR j.expires_at IS NULL)`];
    const whereParams  = [];

    if (hasQ) {
        whereClauses.push(
            `(j.job_title LIKE ? OR j.job_desc LIKE ? OR j.req_skills LIKE ? OR e.company_name LIKE ?)`
        );
        whereParams.push(like, like, like, like);
    }
    if (category && category !== '') { whereClauses.push('j.job_category = ?'); whereParams.push(category); }
    if (type     && type     !== '') { whereClauses.push('j.job_type = ?');     whereParams.push(type); }
    if (disability_type && disability_type !== '') {
        whereClauses.push(`(j.disability_type LIKE ? OR j.disability_type LIKE '%รับทุกประเภท%')`);
        whereParams.push(`%${disability_type}%`);
    }
    if (disability_level && disability_level !== '') {
        whereClauses.push(`j.disability_level LIKE ?`);
        whereParams.push(`%${disability_level}%`);
    }

    let sql, allParams;
    if (hasQ) {
        // คำนวณ relevance: title exact > title like > desc > skills > company
        allParams = [exact, like, like, like, like, ...whereParams];
        sql = `
            SELECT j.*, e.company_name,
                (CASE WHEN j.job_title = ?       THEN 100 ELSE 0 END +
                 CASE WHEN j.job_title LIKE ?    THEN  50 ELSE 0 END +
                 CASE WHEN j.job_desc  LIKE ?    THEN  20 ELSE 0 END +
                 CASE WHEN j.req_skills LIKE ?   THEN  10 ELSE 0 END +
                 CASE WHEN e.company_name LIKE ? THEN   5 ELSE 0 END) AS relevance
            FROM jobs_post j
            JOIN employers e ON j.employer_id = e.id
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY relevance DESC, j.id DESC`;
    } else {
        allParams = whereParams;
        sql = `
            SELECT j.*, e.company_name, 0 AS relevance
            FROM jobs_post j
            JOIN employers e ON j.employer_id = e.id
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY j.id DESC`;
    }

    db.query(sql, allParams, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        // ── clean salary ก่อนส่ง (ลบ comma เพื่อป้องกัน NaN บน frontend) ──
        const cleaned = results.map(job => ({ ...job, salary: cleanSalary(job.salary) }));
        res.json(cleaned);
    });
});

// ==========================================
// 9. API โพสต์ประกาศงาน (นายจ้าง)
// ==========================================
app.post('/api/save-job', (req, res) => {
    const {
        employer_id, job_title, job_category, job_type, job_location, job_salary,
        facility_desc, job_description, job_qualifications, disability_type,
        req_skills, req_experience, req_portfolio, status,
        work_mode, req_education, age_min, age_max
    } = req.body;

    const combined_job_desc = `รายละเอียดงาน:\n${job_description}\n\nคุณสมบัติผู้สมัคร:\n${job_qualifications}`;

    // ── Step 0: ตรวจสอบ KYC ก่อนทุกอย่าง ──
    db.query('SELECT verification_status FROM employers WHERE id = ?', [employer_id], (kycErr, kycRows) => {
        if (kycErr || kycRows.length === 0) return res.status(500).json({ success: false, error: 'ไม่พบข้อมูลนายจ้าง' });
        if (kycRows[0].verification_status !== 'approved') {
            return res.status(403).json({ success: false, error: 'KYC_PENDING', message: 'บัญชีของคุณยังไม่ผ่านการยืนยันตัวตน (KYC) กรุณารอแอดมินอนุมัติก่อนโพสต์งาน' });
        }
        continuePostJob();
    });

    function continuePostJob() {

    // ── Step 1: ดึงข้อมูล employer เพื่อตรวจสิทธิ์การโพสต์ ──
    db.query(
        'SELECT subscription_plan, subscription_expires_at, created_at FROM employers WHERE id = ?',
        [employer_id],
        (empErr, empRows) => {
            if (empErr || empRows.length === 0) {
                return res.status(500).json({ success: false, error: 'ไม่พบข้อมูลนายจ้าง' });
            }

            const emp        = empRows[0];
            const now        = new Date();
            const subExpiry  = emp.subscription_expires_at ? new Date(emp.subscription_expires_at) : null;
            const isSubActive = subExpiry && subExpiry > now;

            // ── กรณี 1: มี subscription ที่ยังไม่หมดอายุ → โพสต์ได้ทันที ──
            if (emp.subscription_plan && isSubActive) {
                doInsert(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
                return;
            }

            // ── กรณี 2: Free Trial (subscription_plan = NULL + account อายุ ≤ 30 วัน) ──
            const accountCreated = emp.created_at ? new Date(emp.created_at) : now;
            const accountAgeDays = Math.floor((now - accountCreated) / (1000 * 60 * 60 * 24));

            if (!emp.subscription_plan && accountAgeDays <= 30) {
                db.query('SELECT COUNT(*) AS cnt FROM jobs_post WHERE employer_id = ?', [employer_id], (cntErr, cntRows) => {
                    if (cntErr) return res.status(500).json({ success: false, error: cntErr.message });
                    const postCount = cntRows[0].cnt;
                    if (postCount < 3) {
                        doInsert(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)); // Free Trial: 15 วัน
                    } else {
                        res.json({ success: false, error: 'ครบโควต้า Free Trial แล้ว (3/3 โพสต์) กรุณาซื้อแพ็คเกจเพื่อโพสต์งานต่อ' });
                    }
                });
                return;
            }

            // ── กรณี 3: ไม่มีสิทธิ์โพสต์ (ไม่มี subscription หรือหมดอายุแล้ว) ──
            res.json({ success: false, error: 'กรุณาซื้อแพ็คเกจก่อนโพสต์งาน' });
        }
    );

    function doInsert(expires_at) {
        const { lat: jobLat, lng: jobLng } = req.body;
        const sql = `
            INSERT INTO jobs_post
            (employer_id, job_title, job_category, job_type, disability_type, disability_level,
             salary, job_location, accommodation, job_desc, req_skills, req_experience,
             req_portfolio, status, expires_at, work_mode, req_education, age_min, age_max, lat, lng)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(sql, [
            employer_id,
            safeStr(job_title),
            safeStr(job_category),
            safeStr(job_type),
            safeStr(disability_type),
            'ไม่ระบุระดับ',
            cleanSalary(job_salary) || safeStr(job_salary),
            safeStr(job_location),
            safeStr(facility_desc),
            safeStr(combined_job_desc),
            safeStr(req_skills),
            safeStr(req_experience),
            safeStr(req_portfolio || ''),
            safeStr(status || 'open'),
            expires_at,
            safeStr(work_mode || 'onsite'),
            safeStr(req_education || 'any'),
            age_min ? parseInt(age_min) : null,
            age_max ? parseInt(age_max) : null,
            jobLat || null,
            jobLng || null
        ], (err, results) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: "โพสต์ประกาศงานสำเร็จ", job_id: results.insertId });
        });
    }
    } // end continuePostJob
});

// ==========================================
// 10. API บันทึกการสมัครงาน (คำนวณ match_score ฝั่ง server)
// ==========================================
app.post('/api/apply-job', (req, res) => {
    const { seeker_id, job_id } = req.body;
    if (!seeker_id || !job_id) {
        return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน (seeker_id, job_id)' });
    }

    // ── Step 1: ตรวจสอบว่ายังไม่เคยสมัครงานนี้แล้ว ──
    db.query(
        'SELECT id FROM applications WHERE seeker_id = ? AND job_id = ?',
        [seeker_id, job_id],
        (dupErr, dupRows) => {
            if (dupErr) return res.status(500).json({ success: false, error: dupErr.message });
            if (dupRows.length > 0) {
                return res.json({ success: false, error: 'คุณได้ส่งใบสมัครงานนี้ไปแล้ว' });
            }

            // ── Step 2: ดึงข้อมูลเรซูเม่ ──
            db.query('SELECT * FROM resumes WHERE seeker_id = ?', [seeker_id], (rErr, rRows) => {
                if (rErr) return res.status(500).json({ success: false, error: rErr.message });

                // ── Step 3: ดึงข้อมูลประกาศงาน ──
                db.query('SELECT * FROM jobs_post WHERE id = ?', [job_id], (jErr, jRows) => {
                    if (jErr) return res.status(500).json({ success: false, error: jErr.message });
                    if (jRows.length === 0) {
                        return res.json({ success: false, error: 'ไม่พบประกาศงานนี้ในระบบ' });
                    }

                    // ── Step 4: คำนวณ Score ──
                    let matchScore   = 0;
                    let matchReasons = [];

                    if (rRows.length > 0) {
                        const result  = calcMatchScore(rRows[0], jRows[0]);
                        matchScore    = result.score;
                        matchReasons  = result.reasons;
                    }

                    const detailsJson = JSON.stringify(matchReasons);

                    // ── Step 5: บันทึก application ──
                    const sql = `INSERT INTO applications (seeker_id, job_id, match_score, match_details, status) VALUES (?, ?, ?, ?, 'pending')`;
                    db.query(sql, [seeker_id, job_id, matchScore, detailsJson], (insErr) => {
                        if (insErr) return res.status(500).json({ success: false, error: insErr.message });
                        console.log(`✅ Application saved: seeker=${seeker_id}, job=${job_id}, score=${matchScore}`);
                        res.json({ success: true, message: 'ส่งใบสมัครเรียบร้อยแล้ว', match_score: matchScore });
                    });
                });
            });
        }
    );
});

// ==========================================
// 11. API เชื่อมต่อ Python (AI)
// ==========================================
app.post('/api/get-ai-feedback', async (req, res) => {
    try {
        const response = await axios.post('http://127.0.0.1:8000/api/ai/coach', req.body);
        res.json(response.data);
    } catch (error) { res.json({ suggestion: req.body.content }); }
});

// ==========================================
// ==========================================
// 📊 API วิเคราะห์ความเหมาะสม + บันทึก DB
// GET /api/match-analysis/:seekerId/:jobId
// ==========================================
app.get('/api/match-analysis/:seekerId/:jobId', async (req, res) => {
    const { seekerId, jobId } = req.params;

    // ── ดึงจาก cache ใน DB ก่อน ──
    db.query(
        'SELECT match_score, reasons, ai_narrative FROM match_analysis WHERE seeker_id = ? AND job_id = ?',
        [seekerId, jobId],
        async (cErr, cRows) => {
            if (!cErr && cRows.length > 0 && cRows[0].ai_narrative) {
                const cached = cRows[0];
                const reasons = typeof cached.reasons === 'string'
                    ? JSON.parse(cached.reasons) : (cached.reasons || []);
                return res.json({ score: cached.match_score, reasons, ai_narrative: cached.ai_narrative, cached: true });
            }

            // ── ไม่มี cache → คำนวณใหม่ ──
            db.query('SELECT * FROM resumes WHERE seeker_id = ?', [seekerId], async (rErr, rRows) => {
                if (rErr) return res.status(500).json({ error: rErr.message });
                if (!rRows.length) return res.json({ error: 'no_resume' });

                db.query(
                    'SELECT j.*, e.company_name FROM jobs_post j JOIN employers e ON j.employer_id = e.id WHERE j.id = ?',
                    [jobId],
                    async (jErr, jRows) => {
                        if (jErr) return res.status(500).json({ error: jErr.message });
                        if (!jRows.length) return res.json({ error: 'no_job' });

                        const job = jRows[0];
                        const { score, reasons } = calcMatchScore(rRows[0], job);

                        // ── สร้าง narrative จาก template (ใช้เสมอเป็น fallback) ──
                        function buildNarrative(score, reasons, jobTitle, companyName) {
                            const strengths = reasons.filter(r => r.includes('(+') && !r.includes('(+0)') && !r.includes('(0)'));
                            const weaknesses = reasons.filter(r => r.includes('(0)') || r.includes('อาจยังไม่') || r.includes('ไม่ตรง') || r.includes('ต่ำกว่า'));

                            const level = score >= 75 ? 'สูงมาก' : score >= 50 ? 'ดี' : score >= 25 ? 'ปานกลาง' : 'น้อย';

                            const strengthTexts = {
                                '✔️': 'สภาพแวดล้อมการทำงานรองรับคุณได้เป็นอย่างดี',
                                '💡': 'ทักษะของคุณตรงกับความต้องการของตำแหน่งนี้',
                                '💼': 'ประสบการณ์ที่มีสอดคล้องกับงานนี้',
                                '🎓': 'วุฒิการศึกษาของคุณเป็นที่ยอมรับสำหรับตำแหน่งนี้',
                                '🏢': 'รูปแบบการทำงานตรงกับที่คุณต้องการ',
                                '📍': 'ที่ตั้งงานสะดวกสำหรับคุณ',
                            };

                            let strengthSentence = '';
                            const matchedStrengths = [];
                            for (const [emoji, text] of Object.entries(strengthTexts)) {
                                if (strengths.some(r => r.startsWith(emoji))) matchedStrengths.push(text);
                            }
                            if (matchedStrengths.length > 0) {
                                strengthSentence = matchedStrengths.slice(0, 2).join(' และ');
                            }

                            let intro = '';
                            if (score >= 75) intro = `คุณมีความเหมาะสมกับตำแหน่ง ${jobTitle} ที่ ${companyName} ในระดับสูงมาก`;
                            else if (score >= 50) intro = `คุณมีคุณสมบัติที่เหมาะสมกับตำแหน่ง ${jobTitle} ที่ ${companyName}`;
                            else intro = `คุณมีศักยภาพสำหรับตำแหน่ง ${jobTitle} ที่ ${companyName} แต่ยังมีบางด้านที่ควรพัฒนาเพิ่มเติม`;

                            let body = strengthSentence ? ` โดยเฉพาะด้าน${strengthSentence}` : '';

                            let suggest = '';
                            if (weaknesses.length > 0 && score < 75) {
                                suggest = ' อย่างไรก็ตาม ควรพิจารณาเพิ่มเติมในบางด้านเพื่อเพิ่มโอกาสในการได้รับการคัดเลือก';
                            } else if (score >= 75) {
                                suggest = ' ขอให้โชคดีกับการสมัครงานครั้งนี้';
                            }

                            return intro + body + suggest + '.';
                        }

                        // ── เรียก AI สร้าง narrative (ถ้า AI ไม่ได้ ใช้ template แทน) ──
                        let ai_narrative = '';
                        try {
                            const aiRes = await axios.post('http://127.0.0.1:8000/api/ai/analyze-match', {
                                job_title: job.job_title || '',
                                company_name: job.company_name || '',
                                match_score: score,
                                reasons: reasons
                            }, { timeout: 10000 });
                            ai_narrative = aiRes.data?.narrative || '';
                        } catch (aiErr) {
                            console.warn('AI analyze-match skipped, using template:', aiErr.message.split('\n')[0]);
                        }

                        // ถ้า AI ไม่ตอบหรือตอบว่าง → ใช้ template
                        if (!ai_narrative) {
                            ai_narrative = buildNarrative(score, reasons, job.job_title || '', job.company_name || '');
                        }

                        // ── บันทึก cache ลง DB (เฉพาะเมื่อมี narrative) ──
                        if (ai_narrative) {
                            db.query(
                                `INSERT INTO match_analysis (seeker_id, job_id, match_score, reasons, ai_narrative)
                                 VALUES (?, ?, ?, ?, ?)
                                 ON DUPLICATE KEY UPDATE match_score=VALUES(match_score), reasons=VALUES(reasons), ai_narrative=VALUES(ai_narrative), updated_at=NOW()`,
                                [seekerId, jobId, score, JSON.stringify(reasons), ai_narrative],
                                (insErr) => { if (insErr) console.error('match_analysis insert error:', insErr.message); }
                            );
                        }

                        res.json({ score, reasons, ai_narrative, cached: false });
                    }
                );
            });
        }
    );
});

// ==========================================
// 🏆 API จัดอันดับงานทั้งหมดด้วย calcMatchScore (server-side)
// GET /api/rank-jobs/:seekerId
// ==========================================
app.get('/api/rank-jobs/:seekerId', (req, res) => {
    const { seekerId } = req.params;
    db.query('SELECT * FROM resumes WHERE seeker_id = ?', [seekerId], (err, rRows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rRows.length) return res.json({ error: 'no_resume' });
        const resume = rRows[0];

        const sql = `SELECT j.*, e.company_name FROM jobs_post j JOIN employers e ON j.employer_id = e.id WHERE (j.status = 'open' OR j.status IS NULL) AND (j.expires_at > NOW() OR j.expires_at IS NULL)`;
        db.query(sql, (err2, jobs) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const ranked = jobs.map(job => {
                const { score, reasons } = calcMatchScore(resume, job);
                return {
                    id: job.id,
                    job_title: job.job_title,
                    company_name: job.company_name,
                    job_type: job.job_type,
                    job_location: job.job_location,
                    salary: cleanSalary(job.salary),
                    disability_type: job.disability_type,
                    work_mode: job.work_mode,
                    matchScore: score,
                    matchDetails: reasons
                };
            });

            ranked.sort((a, b) => b.matchScore - a.matchScore);
            res.json(ranked.slice(0, 10));
        });
    });
});

// 12. API โหลดข้อมูลประกาศงานแบบเจาะจง (1 งาน)
// ==========================================
// ==========================================
// 🧮 API คำนวณ Match Score แบบ Preview (ไม่บันทึก DB)
// GET /api/preview-match/:seekerId/:jobId
// ==========================================
app.get('/api/preview-match/:seekerId/:jobId', (req, res) => {
    const { seekerId, jobId } = req.params;
    db.query('SELECT * FROM resumes WHERE seeker_id = ?', [seekerId], (err, rRows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rRows.length) return res.json({ error: 'no_resume' });
        const resume = rRows[0];

        db.query('SELECT j.*, e.company_name FROM jobs_post j JOIN employers e ON j.employer_id = e.id WHERE j.id = ?', [jobId], (err2, jRows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (!jRows.length) return res.json({ error: 'no_job' });
            const job = jRows[0];

            const { score, reasons } = calcMatchScore(resume, job);

            // สร้างคำแนะนำถ้าคะแนน < 50
            const EDU_LABEL_MAP = { any:'ไม่จำกัด', highschool:'ม.6', vocational:'ปวช.', diploma:'ปวส. (ประกาศนียบัตรวิชาชีพชั้นสูง)', bachelor:'ปริญญาตรี', master:'ปริญญาโทขึ้นไป' };
            const suggestions = [];
            if (score < 50) {
                // 1. ประเภทความพิการ
                if (job.disability_type && !job.disability_type.includes('รับทุกประเภท') &&
                    resume.disability_type && !job.disability_type.includes(resume.disability_type)) {
                    suggestions.push(`♿ ตำแหน่งนี้รับเฉพาะผู้พิการประเภท "${job.disability_type}" — ตรวจสอบข้อมูลความพิการในเรซูเม่ของคุณ`);
                }
                // 2. ระดับความพิการ
                if (job.disability_level) {
                    const myDisType = (resume.disability_type || '').toLowerCase();
                    const myLevel = myDisType.includes('visual') ? resume.disability_level_visual
                                  : myDisType.includes('hearing') ? resume.disability_level_hearing
                                  : resume.disability_level_physical || '';
                    if (myLevel && job.disability_level !== myLevel) {
                        suggestions.push(`📋 ตำแหน่งนี้ระบุระดับความพิการ "${job.disability_level}" — คุณระบุ "${myLevel}"`);
                    }
                }
                // 3. การศึกษา
                if (job.req_education && job.req_education !== 'any') {
                    const eduLabel = EDU_LABEL_MAP[job.req_education] || job.req_education;
                    suggestions.push(`🎓 ต้องการวุฒิการศึกษาระดับ "${eduLabel}" ขึ้นไป — เพิ่มประวัติการศึกษาในเรซูเม่ให้ครบถ้วน`);
                }
                // 4. ประสบการณ์
                if (job.req_experience) {
                    suggestions.push(`💼 ต้องการประสบการณ์ทำงาน/ฝึกงาน "${job.req_experience}" — เพิ่มประวัติการทำงานหรือฝึกงานในเรซูเม่`);
                }
                // 5. ทักษะที่ขาด
                if (job.req_skills) {
                    const mySkillsLow = (resume.skills || '').toLowerCase();
                    const reqArr = job.req_skills.split(',').map(s => s.trim()).filter(Boolean);
                    const missing = reqArr.filter(s => !mySkillsLow.includes(s.toLowerCase()));
                    if (missing.length > 0) {
                        suggestions.push(`💡 ทักษะที่ควรเพิ่มในเรซูเม่: ${missing.join(', ')}`);
                    }
                }
                // 6. รูปแบบการทำงาน
                if (job.work_mode && resume.preferred_work_mode &&
                    job.work_mode !== 'ตามตกลง' && resume.preferred_work_mode !== 'ตามตกลง' &&
                    job.work_mode !== resume.preferred_work_mode) {
                    suggestions.push(`🏢 งานนี้เป็นรูปแบบ "${job.work_mode}" แต่คุณเลือก "${resume.preferred_work_mode}" — ลองค้นหางานที่ตรงกับรูปแบบที่คุณต้องการ`);
                }
            }

            // หางานที่เหมาะสมกว่า (score >= 50) ถ้าคะแนน < 50
            if (score < 50) {
                db.query(
                    `SELECT j.*, e.company_name
                     FROM jobs_post j JOIN employers e ON j.employer_id = e.id
                     WHERE j.status = 'open' AND j.id != ? LIMIT 30`,
                    [jobId],
                    (err3, allJobs) => {
                        if (err3 || !allJobs.length) {
                            return res.json({ score, reasons, suggestions, recommended_jobs: [] });
                        }
                        const scored = allJobs.map(j => ({
                            id: j.id,
                            job_title: j.job_title,
                            company_name: j.company_name,
                            job_location: j.job_location,
                            matchScore: calcMatchScore(resume, j).score
                        }))
                        .filter(j => j.matchScore >= 50)
                        .sort((a, b) => b.matchScore - a.matchScore)
                        .slice(0, 5);

                        res.json({ score, reasons, suggestions, recommended_jobs: scored });
                    }
                );
            } else {
                res.json({ score, reasons, suggestions, recommended_jobs: [] });
            }
        });
    });
});

app.get('/api/get-job/:jobId', (req, res) => {
    const sql = `SELECT j.*, e.company_name FROM jobs_post j JOIN employers e ON j.employer_id = e.id WHERE j.id = ?`;
    db.query(sql, [req.params.jobId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.json({});
        // ── clean salary ก่อนส่ง (ลบ comma เพื่อป้องกัน NaN บน frontend) ──
        const job = { ...results[0], salary: cleanSalary(results[0].salary) };
        res.json(job);
    });
});

// GET /api/jobs/:id — ดึงข้อมูลโพสต์งาน (alias ของ /api/get-job/:jobId)
app.get('/api/jobs/:id', (req, res) => {
    const sql = `SELECT j.*, e.company_name FROM jobs_post j JOIN employers e ON j.employer_id = e.id WHERE j.id = ?`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.json({});
        const job = { ...results[0], salary: cleanSalary(results[0].salary) };
        res.json(job);
    });
});

// PATCH /api/jobs/:id — แก้ไขข้อมูลโพสต์งาน
app.patch('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    const {
        employer_id, job_title, job_category, job_type, job_location, job_salary,
        facility_desc, job_description, job_qualifications, disability_type,
        req_skills, req_experience, req_portfolio,
        work_mode, req_education, age_min, age_max
    } = req.body;
    if (!employer_id) return res.status(400).json({ success: false, error: 'ต้องระบุ employer_id' });

    const combined_job_desc = `รายละเอียดงาน:\n${job_description || ''}\n\nคุณสมบัติผู้สมัคร:\n${job_qualifications || ''}`;

    const sql = `
        UPDATE jobs_post SET
            job_title=?, job_category=?, job_type=?,
            salary=?, job_location=?, accommodation=?,
            job_desc=?, disability_type=?,
            req_skills=?, req_experience=?, req_portfolio=?,
            work_mode=?, req_education=?, age_min=?, age_max=?
        WHERE id = ? AND employer_id = ?`;
    db.query(sql, [
        safeStr(job_title), safeStr(job_category), safeStr(job_type),
        cleanSalary(job_salary) || safeStr(job_salary), safeStr(job_location), safeStr(facility_desc),
        combined_job_desc, safeStr(disability_type),
        safeStr(req_skills), safeStr(req_experience), safeStr(req_portfolio || ''),
        safeStr(work_mode || 'onsite'), safeStr(req_education || 'any'),
        age_min ? parseInt(age_min) : null,
        age_max ? parseInt(age_max) : null,
        id, employer_id
    ], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (result.affectedRows === 0) return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์แก้ไขโพสต์นี้' });
        res.json({ success: true, job_id: id });
    });
});

app.post('/api/get-ai-match', async (req, res) => {
    try {
        const response = await axios.post('http://127.0.0.1:8000/api/ai/match', req.body);
        res.json(response.data);
    } catch (error) { res.json({ total_ai_score: 35, match_reasons: ["🤖 เกิดข้อผิดพลาดในการเชื่อมต่อ AI ประเมินจากข้อมูลพื้นฐาน"] }); }
});

// ==========================================
// 🌟 13. API โหลดประวัติโพสต์ประกาศงานของนายจ้าง (ดึงเฉพาะ Account นี้)
// ==========================================
app.get('/api/get-employer-jobs/:employerId', (req, res) => {
    const sql = `SELECT * FROM jobs_post WHERE employer_id = ? ORDER BY id DESC`;
    db.query(sql, [req.params.employerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
// ==========================================
// 🌟 13b. API จัดการโพสต์งาน (แก้ไขสถานะ / ลบ / ต่ออายุ)
// ==========================================

// PATCH /api/jobs/:id/status — อัปเดต status โพสต์
app.patch('/api/jobs/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['open', 'closed', 'expired'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'invalid status' });
    db.query('UPDATE jobs_post SET status = ? WHERE id = ?', [status, id], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// DELETE /api/jobs/:id — ลบโพสต์ (ตรวจสอบว่า employer_id ตรงกัน)
app.delete('/api/jobs/:id', (req, res) => {
    const { id } = req.params;
    const { employer_id } = req.body;
    if (!employer_id) return res.status(400).json({ success: false, error: 'ต้องระบุ employer_id' });
    db.query('DELETE FROM jobs_post WHERE id = ? AND employer_id = ?', [id, employer_id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (result.affectedRows === 0) return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์ลบโพสต์นี้' });
        res.json({ success: true });
    });
});

// PATCH /api/jobs/:id/renew — ต่ออายุโพสต์ 30 วัน (เฉพาะ monthly/yearly)
app.patch('/api/jobs/:id/renew', (req, res) => {
    const { id } = req.params;
    const { employer_id } = req.body;
    if (!employer_id) return res.status(400).json({ success: false, error: 'ต้องระบุ employer_id' });
    db.query(
        'SELECT e.subscription_plan FROM employers e JOIN jobs_post j ON e.id = j.employer_id WHERE j.id = ? AND j.employer_id = ?',
        [id, employer_id],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (rows.length === 0) return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์ต่ออายุโพสต์นี้' });
            const plan = rows[0].subscription_plan;
            if (plan !== 'monthly' && plan !== 'yearly') {
                return res.status(403).json({ success: false, error: 'ต้องมีแพ็คเกจรายเดือนหรือรายปีจึงจะต่ออายุได้' });
            }
            const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            db.query(
                'UPDATE jobs_post SET expires_at = ?, status = "open" WHERE id = ?',
                [newExpiry, id],
                (err2) => {
                    if (err2) return res.status(500).json({ success: false, error: err2.message });
                    res.json({ success: true, expires_at: newExpiry });
                }
            );
        }
    );
});

// ==========================================
// 14. API ลบข้อมูลเรซูเม่
// ==========================================
app.delete('/api/delete-resume/:seekerId', (req, res) => {
    const seekerId = req.params.seekerId;
    const sql = `DELETE FROM resumes WHERE seeker_id = ?`;
    
    db.query(sql, [seekerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows > 0) {
            res.json({ success: true, message: "ลบเรซูเม่เรียบร้อยแล้ว" });
        } else {
            res.json({ success: false, message: "ไม่พบเรซูเม่ในระบบ" });
        }
    });
});

// ==========================================
// 15. API ดึงประวัติการสมัครงานของผู้หางาน
// ==========================================
app.get('/api/my-applications/:seekerId', (req, res) => {
    const sql = `
        SELECT a.id, a.job_id, a.status, a.created_at,
               COALESCE(j.job_title, '(ไม่พบชื่อตำแหน่ง)')   AS job_title,
               COALESCE(j.job_location, '')                   AS job_location,
               COALESCE(j.job_type, '')                       AS job_type,
               COALESCE(e.company_name, '(ไม่พบชื่อบริษัท)') AS company_name
        FROM applications a
        LEFT JOIN jobs_post j ON a.job_id = j.id
        LEFT JOIN employers e ON j.employer_id = e.id
        WHERE a.seeker_id = ?
        ORDER BY a.created_at DESC
    `;
    db.query(sql, [req.params.seekerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// 🌟 16. API โหลดรายชื่อผู้สมัครสำหรับนายจ้าง (เรียงตาม match_score + ส่ง subscription_plan)
// ==========================================
app.get('/api/employer-applications/:employerId', (req, res) => {
    const empId = req.params.employerId;

    // ดึง subscription_plan + expiry ของนายจ้างก่อน
    db.query(
        'SELECT subscription_plan, subscription_expires_at FROM employers WHERE id = ?',
        [empId],
        (empErr, empRows) => {
            if (empErr) return res.status(500).json({ error: empErr.message });
            const emp = empRows.length > 0 ? empRows[0] : {};
            // ถ้า subscription หมดอายุ → treat as free tier (null)
            const subscription_plan = isSubActive(emp) ? emp.subscription_plan : null;

            const sql = `
                SELECT a.id AS application_id, a.job_id, a.seeker_id,
                       a.match_score, a.match_details, a.status, a.created_at,
                       a.is_starred,
                       s.first_name, s.last_name,
                       j.job_title
                FROM applications a
                JOIN jobs_post j ON a.job_id = j.id
                JOIN job_seekers s ON a.seeker_id = s.id
                WHERE j.employer_id = ?
                ORDER BY a.match_score DESC, a.created_at DESC
            `;
            db.query(sql, [empId], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ subscription_plan, apps: results });
            });
        }
    );
});

// ==========================================
// 🌟 16b. API โหลดรายชื่อผู้สมัครตาม Job ID (สำหรับกรองรายตำแหน่ง)
// ==========================================
app.get('/api/employer-applicants/:jobId', (req, res) => {
    const jobId = req.params.jobId;

    // ดึง subscription_plan ของนายจ้างผ่าน job_id
    db.query(
        'SELECT e.subscription_plan FROM employers e JOIN jobs_post j ON e.id = j.employer_id WHERE j.id = ?',
        [jobId],
        (empErr, empRows) => {
            const subscription_plan = empRows && empRows.length > 0 ? empRows[0].subscription_plan : null;

            const sql = `
                SELECT a.id AS application_id, a.job_id, a.seeker_id,
                       a.match_score, a.match_details, a.status, a.created_at,
                       s.first_name, s.last_name,
                       j.job_title
                FROM applications a
                JOIN jobs_post j ON a.job_id = j.id
                JOIN job_seekers s ON a.seeker_id = s.id
                WHERE a.job_id = ?
                ORDER BY a.match_score DESC, a.created_at DESC
            `;
            db.query(sql, [jobId], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ subscription_plan, apps: results });
            });
        }
    );
});


// ==========================================
// 🌟 17. API นับจำนวนเรซูเม่ที่รอการตรวจสอบ (Unread/Pending) สำหรับนายจ้าง
// ==========================================
app.get('/api/employer-unread-count/:employerId', (req, res) => {
    const sql = `
        SELECT COUNT(a.id) as unread_count 
        FROM applications a
        JOIN jobs_post j ON a.job_id = j.id
        WHERE j.employer_id = ? AND a.status = 'pending'
    `;
    db.query(sql, [req.params.employerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const count = results.length > 0 ? results[0].unread_count : 0;
        res.json({ unread_count: count });
    });
});

// ==========================================
// 🌟 18. API อัปเดตสถานะใบสมัครเป็น "เปิดอ่านแล้ว" (viewed)
// ==========================================
// ── Toggle Star (HR mark ผู้สมัครไว้ดูทีหลัง) ──
app.post('/api/toggle-star/:appId', (req, res) => {
    const { appId } = req.params;
    db.query('SELECT is_starred FROM applications WHERE id = ?', [appId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows.length) return res.status(404).json({ error: 'not found' });
        const newVal = rows[0].is_starred ? 0 : 1;
        db.query('UPDATE applications SET is_starred = ? WHERE id = ?', [newVal, appId], (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true, is_starred: newVal });
        });
    });
});

app.post('/api/mark-application-viewed', (req, res) => {
    const { application_id } = req.body;
    // อัปเดตเป็น viewed เฉพาะอันที่ยังเป็น pending อยู่
    const sql = `UPDATE applications SET status = 'viewed' WHERE id = ? AND status = 'pending'`;
    db.query(sql, [application_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// ==========================================
// 🌟 18b. API ดึงสถานะใบสมัครรายเดียว (สำหรับ profile-em3.html)
// ==========================================
app.get('/api/application/:appId', (req, res) => {
    const sql = `
        SELECT a.id, a.status, a.seeker_id, a.job_id,
               s.first_name, s.last_name, s.email, s.phone,
               j.job_title
        FROM applications a
        JOIN job_seekers s ON a.seeker_id = s.id
        JOIN jobs_post j ON a.job_id = j.id
        WHERE a.id = ?
    `;
    db.query(sql, [req.params.appId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'ไม่พบใบสมัคร' });
        res.json(results[0]);
    });
});

// ==========================================
// 🌟 18c. API อัปเดตผลการเรียกสัมภาษณ์ (approved / rejected)
// ==========================================
// ==========================================
//  18c. API อัปเดตผลการเรียกสัมภาษณ์ (approved / rejected)
// ==========================================
app.patch('/api/applications/:appId/result', (req, res) => {
    const { result } = req.body;
    if (!['approved', 'rejected'].includes(result)) {
        return res.status(400).json({ error: 'result ต้องเป็น approved หรือ rejected เท่านั้น' });
    }
    db.query(`UPDATE applications SET status = ? WHERE id = ?`, [result, req.params.appId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // ดึงข้อมูล seeker + job เพื่อบันทึก notification
        const infoSql = `
            SELECT s.id AS seeker_id, s.first_name, s.last_name, s.email, s.phone,
                   j.job_title, e.company_name
            FROM applications a
            JOIN job_seekers s ON a.seeker_id = s.id
            JOIN jobs_post j ON a.job_id = j.id
            JOIN employers e ON j.employer_id = e.id
            WHERE a.id = ?
        `;
        db.query(infoSql, [req.params.appId], (err2, rows) => {
            const info = (rows && rows.length > 0) ? rows[0] : null;
            if (info) {
                // บันทึก notification ให้ seeker
                db.query(
                    `INSERT INTO seeker_notifications (seeker_id, application_id, job_title, company_name, result)
                     VALUES (?, ?, ?, ?, ?)`,
                    [info.seeker_id, req.params.appId, info.job_title, info.company_name, result],
                    (nErr) => { if (nErr) console.error('seeker_notifications insert error:', nErr.message); }
                );
            }
            const contact = info ? { first_name: info.first_name, last_name: info.last_name, email: info.email, phone: info.phone } : null;
            res.json({ success: true, status: result, contact });
        });
    });
});

// ── GET /api/seeker-notifications/:seekerId — ดึง notification ของผู้หางาน ──
app.get('/api/seeker-notifications/:seekerId', (req, res) => {
    db.query(
        `SELECT * FROM seeker_notifications WHERE seeker_id = ? ORDER BY created_at DESC LIMIT 30`,
        [req.params.seekerId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ── POST /api/seeker-notifications/mark-read — mark อ่านแล้ว ──
app.post('/api/seeker-notifications/mark-read', (req, res) => {
    const { seeker_id } = req.body;
    db.query(
        `UPDATE seeker_notifications SET is_read = 1 WHERE seeker_id = ?`,
        [seeker_id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// ==========================================
// 🌟 18d. Saved Jobs API (บันทึกงานที่สนใจ)
// ==========================================
app.get('/api/saved-jobs/:seekerId', (req, res) => {
    const sql = `
        SELECT j.id, j.job_title, e.company_name, j.job_type, j.job_location,
               j.salary, j.disability_type, sj.saved_at
        FROM saved_jobs sj
        JOIN jobs_post j  ON sj.job_id     = j.id
        JOIN employers e  ON j.employer_id = e.id
        WHERE sj.seeker_id = ?
        ORDER BY sj.saved_at DESC
    `;
    db.query(sql, [req.params.seekerId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/saved-jobs', (req, res) => {
    const { seeker_id, job_id } = req.body;
    if (!seeker_id || !job_id) return res.status(400).json({ error: 'seeker_id และ job_id จำเป็น' });
    db.query('INSERT IGNORE INTO saved_jobs (seeker_id, job_id) VALUES (?, ?)', [seeker_id, job_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/saved-jobs/:seekerId/:jobId', (req, res) => {
    db.query('DELETE FROM saved_jobs WHERE seeker_id = ? AND job_id = ?',
        [req.params.seekerId, req.params.jobId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================
// 🌟 19. Omise Payment — ชำระเงิน + อัปเดต subscription
// ==========================================
const OMISE_SECRET_KEY = 'skey_test_67kn2l2dltoqvdunyg5';
const OMISE_DEMO_MODE  = (OMISE_SECRET_KEY === 'YOUR_OMISE_SECRET_KEY');

app.post('/api/payment/omise', async (req, res) => {
    const { token, plan, employer_id } = req.body;
    if (!plan || !employer_id) return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });

    // ── KYC guard ──
    const [kycRows] = await new Promise((resolve, reject) =>
        db.query('SELECT verification_status FROM employers WHERE id = ?', [employer_id], (e, r) => e ? reject(e) : resolve([r]))
    ).catch(() => [[]]);
    if (!kycRows || kycRows.length === 0) return res.status(404).json({ error: 'ไม่พบข้อมูลนายจ้าง' });
    if (kycRows[0].verification_status !== 'approved') {
        return res.status(403).json({ success: false, error: 'KYC_PENDING', message: 'บัญชีของคุณยังไม่ผ่านการยืนยันตัวตน (KYC) กรุณารอแอดมินอนุมัติก่อนซื้อแพ็คเกจ' });
    }

    const planConfig = {
        pay_per_post_30: { satang: 29900,  subscriptionPlan: 'pay_per_post', days: 30  },
        monthly:         { satang: 59900,  subscriptionPlan: 'monthly',      days: 30  },
        yearly:          { satang: 499000, subscriptionPlan: 'yearly',       days: 365 }
    };
    const cfg = planConfig[plan];
    if (!cfg) return res.status(400).json({ error: 'แพ็คเกจไม่ถูกต้อง' });

    const expires_at = new Date(Date.now() + cfg.days * 24 * 60 * 60 * 1000);

    const updateSubscription = () => {
        db.query(
            'UPDATE employers SET subscription_plan = ?, subscription_expires_at = ? WHERE id = ?',
            [cfg.subscriptionPlan, expires_at, employer_id],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                console.log(`✅ Subscription updated: employer ${employer_id}, plan=${plan}, expires=${expires_at}`);
                res.json({ success: true, plan, expires_at });
            }
        );
    };

    if (OMISE_DEMO_MODE || !token) {
        // ── Demo mode: ข้าม Omise API — อัปเดต subscription โดยตรง ──
        console.log('🧪 Demo mode: skipping Omise charge, updating subscription directly');
        return updateSubscription();
    }

    // ── Production: เรียก Omise Charges API ──
    try {
        const chargeRes = await axios.post('https://api.omise.co/charges', {
            amount:   cfg.satang,
            currency: 'THB',
            card:     token
        }, {
            auth: { username: OMISE_SECRET_KEY, password: '' }
        });

        if (chargeRes.data.status !== 'successful') {
            return res.status(400).json({ error: 'การชำระเงินถูกปฏิเสธ: ' + (chargeRes.data.failure_message || 'กรุณาลองใหม่') });
        }
        updateSubscription();
    } catch (err) {
        const omiseMsg = err.response?.data?.message || err.message;
        console.error('Omise charge error:', omiseMsg);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการชำระเงิน: ' + omiseMsg });
    }
});

// ==========================================
// 🌟 20. ตรวจสอบและอัปเดตโพสต์ที่หมดอายุ
// ==========================================
app.post('/api/jobs/expire-check', (req, res) => {
    const sql = `
        UPDATE jobs_post
        SET status = 'expired'
        WHERE expires_at IS NOT NULL
          AND expires_at < NOW()
          AND status NOT IN ('expired', 'closed')
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows > 0) {
            console.log(`⚠️ expire-check: อัปเดต ${results.affectedRows} โพสต์เป็น expired`);
        }
        res.json({ success: true, expired_count: results.affectedRows });
    });
});

// ==========================================
// 🌟 21. API ดึงข้อมูล Subscription ของนายจ้าง
// ==========================================
app.get('/api/employer-subscription/:employerId', (req, res) => {
    const empId = req.params.employerId;
    db.query(
        'SELECT subscription_plan, subscription_expires_at, created_at FROM employers WHERE id = ?',
        [empId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบข้อมูลนายจ้าง' });

            const emp  = rows[0];
            const now  = new Date();

            // นับจำนวนโพสต์งานทั้งหมดของนายจ้างนี้
            db.query(
                'SELECT COUNT(*) AS post_count FROM jobs_post WHERE employer_id = ?',
                [empId],
                (cntErr, cntRows) => {
                    const postCount  = cntErr ? 0 : cntRows[0].post_count;
                    const accountCreated = emp.created_at ? new Date(emp.created_at) : now;
                    const accountAgeDays = Math.floor((now - accountCreated) / (1000 * 60 * 60 * 24));
                    const subExpiry  = emp.subscription_expires_at ? new Date(emp.subscription_expires_at) : null;
                    const isActive   = !!(subExpiry && subExpiry > now);
                    const isFreeTrial = !emp.subscription_plan && accountAgeDays <= 30;

                    res.json({
                        subscription_plan:       emp.subscription_plan,
                        subscription_expires_at: emp.subscription_expires_at,
                        post_count:              postCount,
                        account_age_days:        accountAgeDays,
                        is_free_trial:           isFreeTrial,
                        is_active:               isActive
                    });
                }
            );
        }
    );
});

// ==========================================
// 🌟 22. ดึงรายชื่อเรซูเม่ผู้หางานทั้งหมด (สำหรับ monthly/yearly)
// ==========================================
app.get('/api/all-resumes', (req, res) => {
    const employerId = req.query.employerId;
    if (!employerId) return res.status(403).json({ error: 'forbidden' });

    // เช็ค subscription ของนายจ้างก่อน
    db.query('SELECT subscription_plan, subscription_expires_at FROM employers WHERE id = ?', [employerId], (err, empRows) => {
        if (err) return res.status(500).json({ error: err.message });
        const emp = empRows.length > 0 ? empRows[0] : {};
        if (!isSubActive(emp) || (emp.subscription_plan !== 'monthly' && emp.subscription_plan !== 'yearly')) {
            return res.status(403).json({ error: 'subscription_required' });
        }

        const sql = `
            SELECT r.seeker_id, js.first_name, js.last_name, r.selected_template,
                   r.job_position, r.job_type, r.disability_type
            FROM resumes r
            JOIN job_seekers js ON r.seeker_id = js.id
            ORDER BY js.first_name, js.last_name
        `;
        db.query(sql, (err2, results) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(results);
        });
    });
});

// ==========================================
// 🌟 22b. ระบบแจ้งเตือนเรซูเม่ที่ตรงกับงานของนายจ้าง
// ==========================================
app.get('/api/employer-match-notifications/:employerId', (req, res) => {
    const employerId = req.params.employerId;

    // ตรวจสอบ subscription ต้องเป็น monthly หรือ yearly และยังไม่หมดอายุ
    db.query('SELECT subscription_plan, subscription_expires_at FROM employers WHERE id = ?', [employerId], (err, empRows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!empRows.length) return res.json({ allowed: false, count: 0, seekers: [] });

        const emp = empRows[0];
        const plan = emp.subscription_plan;
        // หมดอายุหรือไม่ใช่ monthly/yearly → ไม่อนุญาต
        if (!isSubActive(emp) || (plan !== 'monthly' && plan !== 'yearly')) {
            return res.json({ allowed: false, count: 0, seekers: [] });
        }

        // ดึง job_title และ disability_type จากงานที่นายจ้างโพสต์ไว้
        db.query(
            'SELECT DISTINCT job_title, disability_type FROM jobs_post WHERE employer_id = ?',
            [employerId],
            (err, jobRows) => {
                if (err) return res.status(500).json({ error: err.message });

                const jobTitles       = jobRows.map(r => r.job_title).filter(Boolean);
                const disabilityTypes = [...new Set(jobRows.map(r => r.disability_type).filter(Boolean))];

                let sql, params = [];

                if (jobTitles.length > 0 || disabilityTypes.length > 0) {
                    // มีประกาศงาน → หาเรซูเม่ที่ job_position ตรงกับ job_title หรือ disability_type ตรงกัน
                    const conditions = [];

                    // match ด้วย job_position LIKE %job_title% (ตำแหน่งที่ต้องการตรงกับประกาศงาน)
                    if (jobTitles.length > 0) {
                        const titleConds = jobTitles.map(() => `r.job_position LIKE ?`).join(' OR ');
                        conditions.push(`(${titleConds})`);
                        jobTitles.forEach(t => params.push(`%${t}%`));
                    }

                    // match ด้วย disability_type (ประเภทความพิการตรงกับที่ประกาศรับ)
                    if (disabilityTypes.length > 0) {
                        conditions.push(`r.disability_type IN (${disabilityTypes.map(() => '?').join(',')})`);
                        params.push(...disabilityTypes);
                    }

                    sql = `
                        SELECT DISTINCT r.seeker_id, js.first_name, js.last_name,
                               r.job_position, r.job_type, r.disability_type
                        FROM resumes r
                        JOIN job_seekers js ON r.seeker_id = js.id
                        WHERE ${conditions.join(' OR ')}
                        ORDER BY js.first_name, js.last_name
                        LIMIT 10
                    `;
                } else {
                    // ยังไม่มีประกาศงาน → ส่งเรซูเม่ล่าสุด 10 อัน
                    sql = `
                        SELECT r.seeker_id, js.first_name, js.last_name,
                               r.job_position, r.job_type, r.disability_type
                        FROM resumes r
                        JOIN job_seekers js ON r.seeker_id = js.id
                        ORDER BY r.seeker_id DESC
                        LIMIT 10
                    `;
                }

                db.query(sql, params, (err, seekers) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ allowed: true, count: seekers.length, seekers });
                });
            }
        );
    });
});

// ==========================================
// 🌟 22. API สำหรับ Admin Dashboard (ระบบหลังบ้าน)
// ==========================================

// 22.1 ดึงสถิติภาพรวม (Dashboard Stats)
// ── Auto-create user_sessions table ──
db.query(`CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_type ENUM('seeker','employer') NOT NULL,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user (user_id, user_type)
)`, err => { if (err) console.error('user_sessions error:', err.message); else console.log('✅ user_sessions table พร้อม'); });

// ── Track activity ──
app.post('/api/track-activity', (req, res) => {
    const { user_id, user_type } = req.body;
    if (!user_id || !user_type) return res.json({ ok: false });
    db.query(`INSERT INTO user_sessions (user_id, user_type, last_seen) VALUES (?,?,NOW())
              ON DUPLICATE KEY UPDATE last_seen=NOW()`, [user_id, user_type], err => {
        if (err) return res.json({ ok: false });
        res.json({ ok: true });
    });
});

// ── Active users (last 5 min) ──
app.get('/api/admin/active-users', (req, res) => {
    db.query(`SELECT COUNT(*) AS count FROM user_sessions WHERE last_seen >= NOW() - INTERVAL 5 MINUTE`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ active: rows[0].count || 0 });
    });
});

// ── User growth (daily/monthly/yearly) ──
app.get('/api/admin/user-growth', (req, res) => {
    const type = req.query.type || 'monthly'; // daily | monthly | yearly
    let fmt, interval;
    if (type === 'daily')   { fmt = '%Y-%m-%d'; interval = 'INTERVAL 30 DAY'; }
    else if (type === 'yearly') { fmt = '%Y'; interval = 'INTERVAL 5 YEAR'; }
    else                    { fmt = '%Y-%m'; interval = 'INTERVAL 12 MONTH'; }

    const sql = `
        SELECT DATE_FORMAT(created_at, '${fmt}') AS period, COUNT(*) AS count
        FROM (
            SELECT created_at FROM job_seekers WHERE created_at >= NOW() - ${interval}
            UNION ALL
            SELECT created_at FROM employers WHERE created_at >= NOW() - ${interval}
        ) combined
        GROUP BY period ORDER BY period ASC`;
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ── Revenue from subscriptions ──
app.get('/api/admin/revenue', (req, res) => {
    const prices = { pay_per_post: 299, monthly: 599, yearly: 4990 };
    db.query(`SELECT subscription_plan, COUNT(*) AS count FROM employers
              WHERE subscription_plan IS NOT NULL AND subscription_plan != ''
              GROUP BY subscription_plan`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        let total = 0;
        const breakdown = {};
        rows.forEach(r => {
            const price = prices[r.subscription_plan] || 0;
            const subtotal = price * r.count;
            breakdown[r.subscription_plan] = { count: r.count, price, subtotal };
            total += subtotal;
        });
        res.json({ total, breakdown });
    });
});

app.get('/api/admin/stats', (req, res) => {
    const queries = {
        total_seekers:          'SELECT COUNT(*) AS count FROM job_seekers',
        total_employers:        'SELECT COUNT(*) AS count FROM employers',
        total_jobs:             'SELECT COUNT(*) AS count FROM jobs_post',
        total_applications:     'SELECT COUNT(*) AS count FROM applications',
        total_pending_apps:     "SELECT COUNT(*) AS count FROM applications WHERE status = 'pending'",
        total_hired:            "SELECT COUNT(DISTINCT seeker_id) AS count FROM applications WHERE status = 'approved'",
        // trend: current period (last 0-24h)
        seekers_today:          'SELECT COUNT(*) AS count FROM job_seekers WHERE created_at >= NOW() - INTERVAL 24 HOUR',
        employers_today:        'SELECT COUNT(*) AS count FROM employers WHERE created_at >= NOW() - INTERVAL 24 HOUR',
        jobs_today:             'SELECT COUNT(*) AS count FROM jobs_post WHERE created_at >= NOW() - INTERVAL 24 HOUR',
        applications_today:     'SELECT COUNT(*) AS count FROM applications WHERE created_at >= NOW() - INTERVAL 24 HOUR',
        // trend: previous period (last 24-48h)
        seekers_yesterday:      'SELECT COUNT(*) AS count FROM job_seekers WHERE created_at BETWEEN NOW() - INTERVAL 48 HOUR AND NOW() - INTERVAL 24 HOUR',
        employers_yesterday:    'SELECT COUNT(*) AS count FROM employers WHERE created_at BETWEEN NOW() - INTERVAL 48 HOUR AND NOW() - INTERVAL 24 HOUR',
        jobs_yesterday:         'SELECT COUNT(*) AS count FROM jobs_post WHERE created_at BETWEEN NOW() - INTERVAL 48 HOUR AND NOW() - INTERVAL 24 HOUR',
        applications_yesterday: 'SELECT COUNT(*) AS count FROM applications WHERE created_at BETWEEN NOW() - INTERVAL 48 HOUR AND NOW() - INTERVAL 24 HOUR'
    };

    let stats = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach(key => {
        db.query(queries[key], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            stats[key] = results[0].count;
            completed++;
            if (completed === keys.length) {
                // Build trend objects
                function calcTrend(current, previous) {
                    const diff = current - previous;
                    const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
                    const pct = previous > 0 ? Math.round(Math.abs(diff) / previous * 100) : (current > 0 ? 100 : 0);
                    return { current, previous, direction, pct };
                }
                res.json({
                    total_seekers:      stats.total_seekers,
                    total_employers:    stats.total_employers,
                    total_jobs:         stats.total_jobs,
                    total_applications: stats.total_applications,
                    total_hired:        stats.total_hired,
                    total_pending_apps: stats.total_pending_apps,
                    trends: {
                        seekers:      calcTrend(stats.seekers_today,      stats.seekers_yesterday),
                        employers:    calcTrend(stats.employers_today,     stats.employers_yesterday),
                        jobs:         calcTrend(stats.jobs_today,          stats.jobs_yesterday),
                        applications: calcTrend(stats.applications_today,  stats.applications_yesterday)
                    }
                });
            }
        });
    });
});

// 22.2 ดึงรายชื่อผู้ใช้งานทั้งหมด (ผู้หางาน และ นายจ้าง)
app.get('/api/admin/users', (req, res) => {
    db.query('SELECT id, first_name AS name, email, phone, "Seeker" AS role FROM job_seekers', (err, seekers) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query('SELECT id, company_name AS name, email, phone, "Employer" AS role FROM employers', (err, employers) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json([...seekers, ...employers]); // เอา 2 ตารางมารวมกัน
        });
    });
});

// 22.3 ลบประกาศงานที่ไม่เหมาะสม (สำหรับ Admin)
app.delete('/api/admin/delete-job/:jobId', (req, res) => {
    db.query('DELETE FROM jobs_post WHERE id = ?', [req.params.jobId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "ลบประกาศงานสำเร็จ" });
    });
});

// ==========================================
// 🌟 22.4 API สำหรับตรวจสอบ Login ของ Admin
// ==========================================
// ==========================================
//  22.4 API สำหรับตรวจสอบ Login ของ Admin
// ==========================================
require('dotenv').config(); // เรียกใช้ไฟล์ .env

app.post('/api/admin/login', (req, res) => {
    const { username, password, secret_key } = req.body;

    // ดึงค่าจากไฟล์ .env มาเปรียบเทียบ
    const envUser = process.env.ADMIN_USER;
    const envPass = process.env.ADMIN_PASS;
    const envKey  = process.env.ADMIN_KEY;

    if (username === envUser && password === envPass && secret_key === envKey) {
        // Generate server-side token and store in Map
        const token = require('crypto').randomBytes(32).toString('hex');
        adminSessions.set(token, { created: Date.now() });
        res.json({ success: true, message: "เข้าสู่ระบบแอดมินสำเร็จ", token });
    } else {
        res.status(401).json({ success: false, message: "ข้อมูลไม่ถูกต้อง" });
    }
});

// ── Verify admin session ──
app.get('/api/admin/verify-session', (req, res) => {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const session = adminSessions.get(token);
    if (!session) return res.status(401).json({ valid: false, message: 'Invalid or missing token' });
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    if (Date.now() - session.created > EIGHT_HOURS) {
        adminSessions.delete(token);
        return res.status(401).json({ valid: false, message: 'Session expired' });
    }
    res.json({ valid: true });
});

// ── Admin logout ──
app.post('/api/admin/logout', (req, res) => {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    adminSessions.delete(token);
    res.json({ success: true });
});

// ==========================================
// 🌟 22.4 API ดึง KYC status สำหรับ employer (frontend check)
// ==========================================
app.get('/api/employer/kyc-status', (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'missing id' });
    db.query('SELECT verification_status FROM employers WHERE id = ?', [id], (err, rows) => {
        if (err || rows.length === 0) return res.status(404).json({ error: 'not found' });
        res.json({ verification_status: rows[0].verification_status });
    });
});

// ==========================================
// 🌟 22.5 API สำหรับดึงรายชื่อบริษัทที่รออนุมัติ (Pending KYC)
// ==========================================
app.get('/api/admin/pending-employers', (req, res) => {
    db.query('SELECT id, company_name, email, phone, tax_id, verification_status FROM employers WHERE verification_status = "pending"', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// 🌟 22.6 API สำหรับอนุมัติ/ปฏิเสธ บริษัท (Approve/Reject)
// ==========================================
app.put('/api/admin/verify-employer/:id', (req, res) => {
    const { status } = req.body; // รับค่า 'approved' หรือ 'rejected'
    
    db.query('UPDATE employers SET verification_status = ? WHERE id = ?', [status, req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `อัปเดตสถานะเป็น ${status} สำเร็จ!` });
    });
});

// ==========================================
// 🌟 22.7 API ลบแอคเค้าน์นายจ้าง (เมื่อ Tax ID ไม่ถูกต้อง)
// ==========================================
app.delete('/api/admin/delete-employer/:id', (req, res) => {
    const { id } = req.params;
    // ลบ jobs ของนายจ้างคนนี้ก่อน แล้วค่อยลบ account (เพื่อ data integrity)
    db.query('DELETE FROM jobs_post WHERE employer_id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.query('DELETE FROM employers WHERE id = ?', [id], (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true, message: 'ลบแอคเค้าน์นายจ้างและประกาศงานทั้งหมดเรียบร้อยแล้ว' });
        });
    });
});

// ==========================================
// 🌟 GOOGLE OAUTH 2.0 APIs
// ==========================================

// POST /api/auth/google/seeker — Google Sign Up / Sign In สำหรับผู้หางาน
app.post('/api/auth/google/seeker', async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token is required' });

    try {
        // ตรวจสอบ access_token โดยเรียก Google userinfo API
        const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const { email, given_name, family_name, name } = userInfoRes.data;

        // ตรวจว่ามีอีเมลนี้ในระบบหรือยัง
        db.query('SELECT id, first_name, last_name, email FROM job_seekers WHERE email = ?', [email], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            if (rows.length > 0) {
                // ✅ Login: อีเมลมีอยู่แล้ว
                const user = rows[0];
                return res.json({
                    success: true,
                    isNewUser: false,
                    user: { id: user.id, name: user.first_name || name }
                });
            }

            // ✅ Register: INSERT user ใหม่ (ไม่มี password เพราะใช้ Google)
            const firstName = given_name || (name ? name.split(' ')[0] : 'ผู้ใช้');
            const lastName  = family_name || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : '');
            const sql = 'INSERT INTO job_seekers (first_name, last_name, email, phone, password) VALUES (?, ?, ?, ?, ?)';
            db.query(sql, [safeStr(firstName), safeStr(lastName), safeStr(email), '', 'GOOGLE_AUTH'], (err2, result) => {
                if (err2) {
                    if (err2.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว' });
                    return res.status(500).json({ error: err2.message });
                }
                return res.json({
                    success: true,
                    isNewUser: true,
                    user: { id: result.insertId, name: firstName }
                });
            });
        });
    } catch (err) {
        console.error('Google verify error (seeker):', err.message);
        return res.status(401).json({ error: 'Google token ไม่ถูกต้องหรือหมดอายุ' });
    }
});

// POST /api/auth/google/employer — Google Sign Up / Sign In สำหรับนายจ้าง
app.post('/api/auth/google/employer', async (req, res) => {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token is required' });

    try {
        // ตรวจสอบ access_token โดยเรียก Google userinfo API
        const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const { email, name } = userInfoRes.data;

        // ตรวจว่ามีอีเมลนี้ในระบบหรือยัง
        db.query('SELECT id, company_name, email FROM employers WHERE email = ?', [email], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            if (rows.length > 0) {
                // ✅ Login: อีเมลมีอยู่แล้ว
                const emp = rows[0];
                return res.json({
                    success: true,
                    isNewUser: false,
                    needsProfileCompletion: false,
                    user: { id: emp.id, name: emp.company_name || name }
                });
            }

            // ✅ Register: INSERT เฉพาะ email + company_name ชั่วคราว (ยังไม่ครบ)
            const companyName = name || email.split('@')[0];
            const sql = "INSERT INTO employers (company_name, email, password, phone, address, tax_id, verification_status) VALUES (?, ?, ?, ?, ?, ?, 'pending')";
            db.query(sql, [safeStr(companyName), safeStr(email), 'GOOGLE_AUTH', '', '', ''], (err2, result) => {
                if (err2) {
                    if (err2.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว' });
                    return res.status(500).json({ error: err2.message });
                }
                return res.json({
                    success: true,
                    isNewUser: true,
                    needsProfileCompletion: true,
                    user: { id: result.insertId, name: companyName, email: email }
                });
            });
        });
    } catch (err) {
        console.error('Google verify error (employer):', err.message);
        return res.status(401).json({ error: 'Google token ไม่ถูกต้องหรือหมดอายุ' });
    }
});

// POST /api/employer/complete-profile — บันทึกข้อมูลบริษัทที่เหลือหลัง Google Sign-Up
app.post('/api/employer/complete-profile', (req, res) => {
    const { employer_id, company_name, phone, address, tax_id } = req.body;
    if (!employer_id) return res.status(400).json({ error: 'employer_id is required' });

    const sql = 'UPDATE employers SET company_name = ?, phone = ?, address = ?, tax_id = ? WHERE id = ?';
    db.query(sql, [safeStr(company_name), safeStr(phone), safeStr(address), safeStr(tax_id), employer_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'ไม่พบบัญชีนายจ้าง' });
        res.json({ success: true, message: 'บันทึกข้อมูลบริษัทสำเร็จ!' });
    });
});

// ==========================================
// GET /api/employer-analytics/:employerId — สถิติผู้สมัครสำหรับนายจ้าง
// ==========================================
app.get('/api/employer-analytics/:employerId', (req, res) => {
    const { employerId } = req.params;

    const queries = {
        total_jobs:    `SELECT COUNT(*) AS cnt FROM jobs_post WHERE employer_id = ?`,
        total_apps:    `SELECT COUNT(*) AS cnt FROM applications a JOIN jobs_post j ON a.job_id = j.id WHERE j.employer_id = ?`,
        approved:      `SELECT COUNT(*) AS cnt FROM applications a JOIN jobs_post j ON a.job_id = j.id WHERE j.employer_id = ? AND a.status = 'approved'`,
        rejected:      `SELECT COUNT(*) AS cnt FROM applications a JOIN jobs_post j ON a.job_id = j.id WHERE j.employer_id = ? AND a.status = 'rejected'`,
        pending:       `SELECT COUNT(*) AS cnt FROM applications a JOIN jobs_post j ON a.job_id = j.id WHERE j.employer_id = ? AND a.status = 'pending'`,
        avg_score:     `SELECT ROUND(AVG(a.match_score),1) AS cnt FROM applications a JOIN jobs_post j ON a.job_id = j.id WHERE j.employer_id = ? AND a.match_score > 0`,
        top_jobs:      `SELECT j.job_title, COUNT(a.id) AS app_count FROM applications a JOIN jobs_post j ON a.job_id = j.id WHERE j.employer_id = ? GROUP BY j.id ORDER BY app_count DESC LIMIT 5`,
        recent_7days:  `SELECT DATE(a.created_at) AS day, COUNT(*) AS cnt FROM applications a JOIN jobs_post j ON a.job_id = j.id WHERE j.employer_id = ? AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(a.created_at) ORDER BY day`
    };

    const result = {};
    const keys = Object.keys(queries);
    let done = 0;

    keys.forEach(key => {
        db.query(queries[key], [employerId], (err, rows) => {
            if (!err) {
                if (key === 'top_jobs' || key === 'recent_7days') result[key] = rows;
                else result[key] = rows[0]?.cnt ?? 0;
            } else result[key] = key === 'top_jobs' || key === 'recent_7days' ? [] : 0;
            if (++done === keys.length) res.json(result);
        });
    });
});

// ==========================================
// POST /api/bulk-update-applications — อัปเดตหลายใบสมัครพร้อมกัน
// ==========================================
app.post('/api/bulk-update-applications', (req, res) => {
    const { app_ids, result } = req.body;
    if (!Array.isArray(app_ids) || app_ids.length === 0)
        return res.status(400).json({ error: 'กรุณาระบุ app_ids' });
    if (!['approved', 'rejected'].includes(result))
        return res.status(400).json({ error: 'result ต้องเป็น approved หรือ rejected' });

    const placeholders = app_ids.map(() => '?').join(',');
    db.query(
        `UPDATE applications SET status = ? WHERE id IN (${placeholders})`,
        [result, ...app_ids],
        (err, r) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, affected: r.affectedRows });
        }
    );
});

// ==========================================
// POST /api/change-password — เปลี่ยนรหัสผ่าน
// ==========================================
app.post('/api/change-password', (req, res) => {
    const { user_id, user_type, current_password, new_password } = req.body;
    if (!user_id || !user_type || !current_password || !new_password)
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    if (new_password.length < 6)
        return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });

    const table = user_type === 'employer' ? 'employers' : 'job_seekers';
    db.query(`SELECT password FROM ${table} WHERE id = ?`, [user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows.length) return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้' });
        if (rows[0].password !== current_password)
            return res.status(401).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });

        db.query(`UPDATE ${table} SET password = ? WHERE id = ?`, [new_password, user_id], (uErr) => {
            if (uErr) return res.status(500).json({ error: uErr.message });
            res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
        });
    });
});

// ==========================================
// POST /api/feedback — บันทึก feedback จาก footer
// ==========================================
app.post('/api/feedback', (req, res) => {
    const { message, page_url, user_id, user_type } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'กรุณากรอกข้อความ' });

    db.query(`CREATE TABLE IF NOT EXISTS feedbacks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message TEXT NOT NULL,
        page_url VARCHAR(255),
        user_id INT DEFAULT NULL,
        user_type ENUM('seeker','employer','guest') DEFAULT 'guest',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, () => {
        db.query(
            'INSERT INTO feedbacks (message, page_url, user_id, user_type) VALUES (?, ?, ?, ?)',
            [message.trim(), page_url || '', user_id || null, user_type || 'guest'],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            }
        );
    });
});

// ==========================================
// POST /api/forgot-password — รีเซ็ตรหัสผ่านและส่ง Email จริง
// ==========================================
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'กรุณาระบุอีเมล' });

    // สุ่มรหัสผ่านใหม่ (ตัวอักษร + ตัวเลข 10 ตัว)
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const newPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    // helper: ส่ง email รหัสผ่านใหม่
    async function sendResetEmail(toEmail, name) {
        const mailOptions = {
            from: `"JobNble" <${process.env.MAIL_USER}>`,
            to: toEmail,
            subject: '🔑 รหัสผ่านใหม่ของคุณ — JobNble',
            html: `
                <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                    <div style="background:#013c58;padding:28px 32px;text-align:center;">
                        <h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:-0.5px;">JobNble</h1>
                        <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:6px 0 0;">แพลตฟอร์มหางานสำหรับผู้พิการ</p>
                    </div>
                    <div style="padding:32px;">
                        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px;">สวัสดี ${name || 'คุณ'} 👋</h2>
                        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
                            เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี <strong>${toEmail}</strong><br>
                            รหัสผ่านใหม่ของคุณคือ:
                        </p>
                        <div style="background:#f1f5f9;border:1.5px dashed #cbd5e1;border-radius:10px;padding:16px;text-align:center;margin-bottom:24px;">
                            <span style="font-size:24px;font-weight:800;color:#013c58;letter-spacing:3px;">${newPassword}</span>
                        </div>
                        <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 20px;">
                            ⚠️ กรุณาเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก<br>
                            หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้
                        </p>
                        <a href="http://localhost:3000/thesis/login-jobseeker.html"
                           style="display:block;background:#013c58;color:#fff;text-align:center;padding:13px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
                            เข้าสู่ระบบ →
                        </a>
                    </div>
                    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
                        <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 JobNble — Digital Platform for Inclusive Employment</p>
                    </div>
                </div>
            `
        };
        await mailTransporter.sendMail(mailOptions);
    }

    // ค้นหาใน job_seekers ก่อน
    db.query('SELECT id, first_name FROM job_seekers WHERE email = ?', [email], async (err, seekerRows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (seekerRows.length > 0) {
            db.query('UPDATE job_seekers SET password = ? WHERE email = ?', [newPassword, email], async (uErr) => {
                if (uErr) return res.status(500).json({ error: uErr.message });
                try {
                    await sendResetEmail(email, seekerRows[0].first_name);
                    console.log(`✅ Reset + Email sent to seeker: ${email}`);
                    return res.json({ success: true });
                } catch (mailErr) {
                    console.error('Email send error:', mailErr.message);
                    return res.status(500).json({ error: 'รีเซ็ตรหัสผ่านสำเร็จ แต่ส่งอีเมลไม่ได้ กรุณาติดต่อผู้ดูแลระบบ' });
                }
            });
            return;
        }

        // ค้นหาใน employers
        db.query('SELECT id, company_name FROM employers WHERE email = ?', [email], async (err2, empRows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (empRows.length === 0) return res.status(404).json({ error: 'ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีเมลอีกครั้ง' });

            db.query('UPDATE employers SET password = ? WHERE email = ?', [newPassword, email], async (uErr2) => {
                if (uErr2) return res.status(500).json({ error: uErr2.message });
                try {
                    await sendResetEmail(email, empRows[0].company_name);
                    console.log(`✅ Reset + Email sent to employer: ${email}`);
                    return res.json({ success: true });
                } catch (mailErr) {
                    console.error('Email send error:', mailErr.message);
                    return res.status(500).json({ error: 'รีเซ็ตรหัสผ่านสำเร็จ แต่ส่งอีเมลไม่ได้ กรุณาติดต่อผู้ดูแลระบบ' });
                }
            });
        });
    });
});

// ==========================================
// 404 Handler — ต้องอยู่ท้ายสุดเสมอ
// ==========================================
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.status(404).sendFile(__dirname + '/404.html');
});

app.listen(port, () => console.log(`Server running on port ${port}`));