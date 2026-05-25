require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(__dirname)); 

// ==========================================
// 1. การเชื่อมต่อ MySQL
// ==========================================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'jobnble_db'
});

db.connect(err => {
    if (err) throw err;
    console.log('เชื่อมต่อ MySQL สำเร็จ!');

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
                                ensureColumn('jobs_post', 'work_mode', "VARCHAR(50) DEFAULT NULL", function () {
                                    ensureColumn('jobs_post', 'req_education', "VARCHAR(100) DEFAULT NULL", function () {
                                        ensureColumn('jobs_post', 'age_min', "INT DEFAULT NULL", function () {
                                            ensureColumn('jobs_post', 'age_max', "INT DEFAULT NULL", function () {
                                                ensureColumn('resumes', 'preferred_work_mode', "VARCHAR(50) DEFAULT NULL", function () {
                                                    ensureColumn('employers', 'verification_status', "VARCHAR(20) DEFAULT 'pending'");
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
// 🧮 Rule-Based Match Score (5 หมวด รวม 100 คะแนน)
// ==========================================
function calcMatchScore(resume, job) {
    let score   = 0;
    let reasons = [];

    const safeParseJSON = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        try { return JSON.parse(val); } catch (e) { return []; }
    };

    // ── 1. Disability Fit — 20 คะแนน ──
    const reqDisType = job.disability_type || '';
    const myDisType  = resume.disability_type || '';
    if (reqDisType.includes('รับทุกประเภท') || (myDisType && reqDisType.includes(myDisType))) {
        score += 20;
        reasons.push('✔️ สภาพแวดล้อมรองรับความพิการของคุณ (+20)');
    } else {
        reasons.push('⚠️ สภาพแวดล้อมอาจยังไม่รองรับโดยตรง (0)');
    }

    // ── 2. Skills Match — 25 คะแนน ──
    const mySkills     = (resume.skills || '').toLowerCase();
    const reqSkillsArr = (job.req_skills || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (reqSkillsArr.length > 0 && mySkills) {
        let matchCount = 0;
        reqSkillsArr.forEach(req => { if (mySkills.includes(req)) matchCount++; });
        const skillScore = Math.floor((matchCount / reqSkillsArr.length) * 25);
        score += skillScore;
        if (skillScore > 0) reasons.push(`💡 มีทักษะตรงตามที่ตำแหน่งงานต้องการ ${matchCount} ทักษะ (+${skillScore})`);
    } else if (reqSkillsArr.length === 0) {
        score += 25;
    }

    // ── 3. Experience & Activities — 30 คะแนน ──
    let expScore = 0;
    let hasExp   = false;
    const workExp   = safeParseJSON(resume.work_experience);
    const internExp = safeParseJSON(resume.intern_experience);
    const actExp    = safeParseJSON(resume.activities);

    if (workExp.length > 0)        { expScore += 15; hasExp = true; }
    else if (internExp.length > 0) { expScore += 10; hasExp = true; }
    else if (actExp.length > 0)    { expScore +=  5; }

    const jobTitle   = (job.job_title    || '').toLowerCase();
    const jobCat     = (job.job_category || '').toLowerCase();
    let isRelevant   = false;

    const checkRelevance = (arr) => {
        arr.forEach(exp => {
            const title = (exp.title || exp.name || '').toLowerCase();
            if (title && (jobTitle.includes(title) || title.includes(jobTitle) || jobCat.includes(title.split(' ')[0]))) {
                isRelevant = true;
            }
        });
    };
    checkRelevance(workExp);
    checkRelevance(internExp);

    if (isRelevant) {
        expScore += 15;
        reasons.push(`💼 มีประวัติการทำงาน/ฝึกงาน ที่เกี่ยวข้องกับตำแหน่งนี้โดยตรง (+${expScore})`);
    } else if (hasExp) {
        expScore += 5;
        reasons.push(`💼 มีประสบการณ์การทำงานขั้นพื้นฐาน (+${expScore})`);
    }
    score += expScore;

    // ── 4. Education Match — 15 คะแนน ──
    let eduScore = 0;
    const eduHist = safeParseJSON(resume.education_history);
    if (eduHist.length > 0) {
        eduScore += 8;
        const major = (eduHist[0].major || '').toLowerCase();
        if (major && (jobCat.includes(major) || major.includes(jobCat.split('/')[0]))) {
            eduScore += 7;
            reasons.push(`🎓 สาขาวิชาที่จบการศึกษาตรงกับหมวดหมู่งาน (+${eduScore})`);
        } else {
            reasons.push(`🎓 มีวุฒิการศึกษาขั้นพื้นฐานตามเกณฑ์ (+${eduScore})`);
        }
    }
    score += eduScore;

    // ── 5. Attitude / Summary — 10 คะแนน ──
    let attScore = 0;
    const summary = resume.summary || '';
    if (summary.length > 30) attScore += 5;
    const positiveWords = ['ตั้งใจ', 'พัฒนา', 'เรียนรู้', 'พยายาม', 'รับผิดชอบ', 'พร้อม', 'อดทน', 'สามารถ', 'มุ่งมั่น'];
    if (positiveWords.some(w => summary.includes(w))) attScore += 5;
    score += attScore;
    if (attScore > 0) reasons.push(`✨ มีทัศนคติเชิงบวกและแสดงความตั้งใจในเรซูเม่ (+${attScore})`);

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
                    profile_pic=COALESCE(NULLIF(?, ''), profile_pic)
                    WHERE seeker_id=?`;

                db.query(updateResume, [
                    safeDob, safeStr(disability_type), safeStr(disability_level_visual), safeStr(disability_level_hearing), safeStr(disability_level_physical), safeStr(address), safeStr(sub_district), safeStr(district), safeStr(province), safeStr(zipcode),
                    safeStr(summary), safeStr(skills), eduStr, workStr, internStr, actStr, safeStr(portfolio_url),
                    safeStr(highestEdu), expStr, '', safeStr(selected_template), safeStr(job_position), safeStr(job_type), safeStr(expected_salary), safeStr(preferred_work_mode),
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
                    education_level, experience, portfolio, selected_template, job_position, job_type, expected_salary, preferred_work_mode, profile_pic
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                db.query(insertResume, [
                    seeker_id, safeDob, safeStr(disability_type), safeStr(disability_level_visual), safeStr(disability_level_hearing), safeStr(disability_level_physical), safeStr(address), safeStr(sub_district), safeStr(district), safeStr(province), safeStr(zipcode),
                    safeStr(summary), safeStr(skills), eduStr, workStr, internStr, actStr, safeStr(portfolio_url),
                    safeStr(highestEdu), expStr, '', safeStr(selected_template), safeStr(job_position), safeStr(job_type), safeStr(expected_salary), safeStr(preferred_work_mode), safeStr(profile_pic)
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
                        doInsert(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
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
        const sql = `
            INSERT INTO jobs_post
            (employer_id, job_title, job_category, job_type, disability_type, disability_level,
             salary, job_location, accommodation, job_desc, req_skills, req_experience,
             req_portfolio, status, expires_at, work_mode, req_education, age_min, age_max)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            age_max ? parseInt(age_max) : null
        ], (err, results) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: "โพสต์ประกาศงานสำเร็จ", job_id: results.insertId });
        });
    }
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
// 12. API โหลดข้อมูลประกาศงานแบบเจาะจง (1 งาน)
// ==========================================
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

    // ดึง subscription_plan ของนายจ้างก่อน
    db.query(
        'SELECT subscription_plan FROM employers WHERE id = ?',
        [empId],
        (empErr, empRows) => {
            if (empErr) return res.status(500).json({ error: empErr.message });
            const subscription_plan = empRows.length > 0 ? empRows[0].subscription_plan : null;

            const sql = `
                SELECT a.id AS application_id, a.job_id, a.seeker_id,
                       a.match_score, a.match_details, a.status, a.created_at,
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
               s.first_name, s.last_name,
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
app.patch('/api/applications/:appId/result', (req, res) => {
    const { result } = req.body; // 'approved' หรือ 'rejected'
    if (!['approved', 'rejected'].includes(result)) {
        return res.status(400).json({ error: 'result ต้องเป็น approved หรือ rejected เท่านั้น' });
    }
    const sql = `UPDATE applications SET status = ? WHERE id = ?`;
    db.query(sql, [result, req.params.appId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, status: result });
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

    const planConfig = {
        pay_per_post_15: { satang: 19900,  subscriptionPlan: 'pay_per_post', days: 15  },
        pay_per_post_30: { satang: 34900,  subscriptionPlan: 'pay_per_post', days: 30  },
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
    const sql = `
        SELECT r.seeker_id, js.first_name, js.last_name, r.selected_template
        FROM resumes r
        JOIN job_seekers js ON r.seeker_id = js.id
        ORDER BY js.first_name, js.last_name
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// 🌟 22. API สำหรับ Admin Dashboard (ระบบหลังบ้าน)
// ==========================================

// 22.1 ดึงสถิติภาพรวม (Dashboard Stats)
app.get('/api/admin/stats', (req, res) => {
    const stats = {};
    db.query('SELECT COUNT(*) AS count FROM job_seekers', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.total_seekers = rows[0].count;
        
        db.query('SELECT COUNT(*) AS count FROM employers', (err, rows) => {
            stats.total_employers = rows[0].count;
            
            db.query('SELECT COUNT(*) AS count FROM jobs_post', (err, rows) => {
                stats.total_jobs = rows[0].count;
                
                db.query('SELECT COUNT(*) AS count FROM applications', (err, rows) => {
                    stats.total_applications = rows[0].count;
                    res.json(stats); // ส่งสถิติทั้ง 4 ตัวกลับไป
                });
            });
        });
    });
});

// ==========================================
// 🌟 22. API สำหรับ Admin Dashboard (ระบบหลังบ้าน)
// ==========================================

// 22.1 ดึงสถิติภาพรวม (Dashboard Stats)
app.get('/api/admin/stats', (req, res) => {
    const stats = {};
    db.query('SELECT COUNT(*) AS count FROM job_seekers', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.total_seekers = rows[0].count;
        
        db.query('SELECT COUNT(*) AS count FROM employers', (err, rows) => {
            stats.total_employers = rows[0].count;
            
            db.query('SELECT COUNT(*) AS count FROM jobs_post', (err, rows) => {
                stats.total_jobs = rows[0].count;
                
                db.query('SELECT COUNT(*) AS count FROM applications', (err, rows) => {
                    stats.total_applications = rows[0].count;
                    res.json(stats); // ส่งสถิติทั้ง 4 ตัวกลับไป
                });
            });
        });
    });
});

// ==========================================
// 🌟 22. API สำหรับ Admin Dashboard (ระบบหลังบ้าน)
// ==========================================

// 22.1 ดึงสถิติภาพรวม (Dashboard Stats)
app.get('/api/admin/stats', (req, res) => {
    const stats = {};
    db.query('SELECT COUNT(*) AS count FROM job_seekers', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.total_seekers = rows[0].count;
        
        db.query('SELECT COUNT(*) AS count FROM employers', (err, rows) => {
            stats.total_employers = rows[0].count;
            
            db.query('SELECT COUNT(*) AS count FROM jobs_post', (err, rows) => {
                stats.total_jobs = rows[0].count;
                
                db.query('SELECT COUNT(*) AS count FROM applications', (err, rows) => {
                    stats.total_applications = rows[0].count;
                    res.json(stats); // ส่งสถิติทั้ง 4 ตัวกลับไป
                });
            });
        });
    });
});

// ==========================================
// 🌟 22. API สำหรับ Admin Dashboard (ระบบหลังบ้าน)
// ==========================================

// 22.1 ดึงสถิติภาพรวม (Dashboard Stats)
app.get('/api/admin/stats', (req, res) => {
    const stats = {};
    db.query('SELECT COUNT(*) AS count FROM job_seekers', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.total_seekers = rows[0].count;
        
        db.query('SELECT COUNT(*) AS count FROM employers', (err, rows) => {
            stats.total_employers = rows[0].count;
            
            db.query('SELECT COUNT(*) AS count FROM jobs_post', (err, rows) => {
                stats.total_jobs = rows[0].count;
                
                db.query('SELECT COUNT(*) AS count FROM applications', (err, rows) => {
                    stats.total_applications = rows[0].count;
                    res.json(stats); // ส่งสถิติทั้ง 4 ตัวกลับไป
                });
            });
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
require('dotenv').config(); // เรียกใช้ไฟล์ .env

app.post('/api/admin/login', (req, res) => {
    const { username, password, secret_key } = req.body;

    // ดึงค่าจากไฟล์ .env มาเปรียบเทียบ
    const envUser = process.env.ADMIN_USER;
    const envPass = process.env.ADMIN_PASS;
    const envKey  = process.env.ADMIN_KEY;

    if (username === envUser && password === envPass && secret_key === envKey) {
        // ถ้ารหัสตรงกัน ให้ส่ง success กลับไป
        res.json({ success: true, message: "เข้าสู่ระบบแอดมินสำเร็จ" });
    } else {
        // ถ้ารหัสผิด
        res.status(401).json({ success: false, message: "ข้อมูลไม่ถูกต้อง" });
    }
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

app.listen(port, () => console.log(`Server running on port ${port}`));