/* =========================================
   === JAVASCRIPT: รวมฟังก์ชันทั้งหมด (Full Expanded Version) ===
========================================= */

/* =============================================
   FONT SIZE CONTROL — Early Apply (ก่อน DOMContentLoaded)
   เพื่อป้องกัน Flash of Wrong Font Size
============================================= */
(function () {
    const saved = localStorage.getItem('jobnble-font-size') || 'md';
    document.documentElement.classList.add('font-' + saved);
})();

/* ── Defensive salary patch (job-detail.html): render ค่า NaN → ตามตกลง ── */
(function () {
    function patchSalaryNaN() {
        var el = document.getElementById('render-job-salary');
        if (!el) return;
        if (el.textContent.indexOf('NaN') !== -1) {
            el.innerHTML = '<span aria-hidden="true">💰</span> ตามตกลง';
        }
        document.querySelectorAll('.search-job-tag.tag-salary').forEach(function (tag) {
            if (tag.textContent.indexOf('NaN') !== -1) tag.style.display = 'none';
        });
    }
    window.addEventListener('load', function () { setTimeout(patchSalaryNaN, 800); });
})();

/* ── Global function: sync disability card button state (resume.html / post-employer.html) ── */
function toggleDisabilityLevel(type) {
    // button = <button role="checkbox"> ที่เป็น header ของการ์ด
    const btn = document.querySelector(`.disability-card-header[data-type="${type}"]`);
    const cb  = document.getElementById('dis-' + type);
    const level = document.getElementById('level-' + type);

    // ใช้สถานะของ checkbox เป็น source of truth
    const isChecked = cb ? cb.checked : false;

    // อัปเดต button ARIA state (ทุกประเภท รวมถึง LD ที่ไม่มี level dropdown)
    if (btn) {
        btn.setAttribute('aria-checked', isChecked ? 'true' : 'false');
        btn.setAttribute('aria-expanded', isChecked ? 'true' : 'false');
    }

    // แสดง/ซ่อน level section (ถ้ามี)
    if (level) {
        level.style.display = isChecked ? 'block' : 'none';
        if (!isChecked) {
            const sel = document.getElementById('level-select-' + type);
            if (sel) sel.value = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // ── ตรวจ URL mode=register / mode=login → ซ่อนฟอร์มที่ไม่ต้องการ ──
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (urlMode === 'register' || urlMode === 'login') {
        document.body.classList.add(`mode-${urlMode}`);
        // อัปเดต page title ให้ชัดเจน
        if (urlMode === 'register') document.title = 'JobNble — สมัครสมาชิก';
        if (urlMode === 'login') document.title = 'JobNble — เข้าสู่ระบบ';
    }

    /* ========= 🔵 0.0 GLOBAL SCREEN READER SUPPORT ========= */
    const srLiveRegion = document.createElement('div');
    srLiveRegion.setAttribute('aria-live', 'polite');
    srLiveRegion.setAttribute('aria-atomic', 'true');
    srLiveRegion.style.position = 'absolute';
    srLiveRegion.style.width = '1px';
    srLiveRegion.style.height = '1px';
    srLiveRegion.style.overflow = 'hidden';
    srLiveRegion.style.clip = 'rect(1px, 1px, 1px, 1px)';
    document.body.appendChild(srLiveRegion);

    function announce(message) {
        srLiveRegion.textContent = '';
        setTimeout(() => { srLiveRegion.textContent = message; }, 50);
    }

    /* =============================================
       🔵 0.0 FONT SIZE CONTROL — Dropdown
       ปรับขนาดตัวอักษร เล็ก / กลาง / ใหญ่
       - บันทึกลง localStorage
       - รองรับ screen reader ด้วย aria-expanded + announce
    ============================================= */

    const _fszLabels = { sm: 'เล็ก', md: 'กลาง', lg: 'ใหญ่' };

    function applyFontSize(size) {
        // ลบ class เก่า → ใส่ class ใหม่บน <html>
        document.documentElement.classList.remove('font-sm', 'font-md', 'font-lg');
        document.documentElement.classList.add('font-' + size);

        // อัปเดต toggle label + active state ใน dropdown ทุก navbar
        document.querySelectorAll('.font-size-ctrl').forEach(ctrl => {
            const toggle = ctrl.querySelector('.fsz-toggle');
            const iconEl = ctrl.querySelector('.fsz-toggle__icon');
            if (toggle) toggle.setAttribute('aria-label', 'ปรับขนาดตัวอักษร: ' + _fszLabels[size]);
            if (iconEl) iconEl.textContent = 'A';

            ctrl.querySelectorAll('.fsz-option').forEach(opt => {
                opt.classList.toggle('fsz-active', opt.dataset.size === size);
                opt.setAttribute('aria-checked', opt.dataset.size === size ? 'true' : 'false');
            });
        });

        // บันทึก preference
        localStorage.setItem('jobnble-font-size', size);

        // ประกาศให้ screen reader ทราบ
        announce('ปรับขนาดตัวอักษรเป็น ' + _fszLabels[size]);
    }

    function _closeFszDropdown(ctrl) {
        const toggle = ctrl.querySelector('.fsz-toggle');
        const dropdown = ctrl.querySelector('.fsz-dropdown');
        if (!dropdown) return;
        dropdown.classList.remove('fsz-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    function _closeAllFszDropdowns(except) {
        document.querySelectorAll('.font-size-ctrl').forEach(ctrl => {
            if (ctrl !== except) _closeFszDropdown(ctrl);
        });
    }

    // Sync active state จาก localStorage ที่ IIFE ตั้งไว้แล้ว
    const _initSize = localStorage.getItem('jobnble-font-size') || 'md';
    applyFontSize(_initSize);

    // คลิก toggle — เปิด/ปิด dropdown
    document.addEventListener('click', function (e) {
        const toggle = e.target.closest('.fsz-toggle');
        if (toggle) {
            const ctrl = toggle.closest('.font-size-ctrl');
            const dropdown = ctrl.querySelector('.fsz-dropdown');
            const isOpen = dropdown.classList.contains('fsz-open');
            _closeAllFszDropdowns(isOpen ? null : ctrl);
            dropdown.classList.toggle('fsz-open', !isOpen);
            toggle.setAttribute('aria-expanded', (!isOpen).toString());
            return;
        }

        // คลิก option — เลือกขนาด
        const option = e.target.closest('.fsz-option');
        if (option) {
            const size = option.dataset.size;
            const ctrl = option.closest('.font-size-ctrl');
            applyFontSize(size);
            _closeFszDropdown(ctrl);
            // คืน focus ไปที่ toggle
            const toggle = ctrl.querySelector('.fsz-toggle');
            if (toggle) toggle.focus();
            return;
        }

        // คลิกนอก — ปิดทุก dropdown
        if (!e.target.closest('.font-size-ctrl')) {
            _closeAllFszDropdowns(null);
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
        const ctrl = e.target.closest('.font-size-ctrl');
        if (!ctrl) return;

        const dropdown = ctrl.querySelector('.fsz-dropdown');
        const isOpen = dropdown.classList.contains('fsz-open');
        const toggle = ctrl.querySelector('.fsz-toggle');

        if (e.key === 'Escape') {
            _closeFszDropdown(ctrl);
            if (toggle) toggle.focus();
            return;
        }

        // Space/Enter บน toggle
        if ((e.key === ' ' || e.key === 'Enter') && e.target === toggle) {
            e.preventDefault();
            dropdown.classList.toggle('fsz-open');
            const nowOpen = dropdown.classList.contains('fsz-open');
            toggle.setAttribute('aria-expanded', nowOpen.toString());
            if (nowOpen) {
                const first = dropdown.querySelector('.fsz-option');
                if (first) first.focus();
            }
            return;
        }

        // Arrow keys ใน dropdown
        if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            const opts = [...dropdown.querySelectorAll('.fsz-option')];
            const idx = opts.indexOf(document.activeElement);
            const next = e.key === 'ArrowDown'
                ? opts[(idx + 1) % opts.length]
                : opts[(idx - 1 + opts.length) % opts.length];
            if (next) next.focus();
        }
    });

    /* ========= 🔵 0.1 TOAST NOTIFICATION ========= */
    function showToast(message, type = 'success') {
        // ── อัปเดต sr live region เพื่อให้ screen reader อ่านออกเสียง ──
        announce(message);

        // ── สร้าง toast element (visual only — sr อ่านจาก live region แล้ว) ──
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.setAttribute('aria-hidden', 'true'); // ป้องกัน sr อ่านซ้ำ (อ่านจาก announce แล้ว)
        toast.textContent = message;
        document.body.appendChild(toast);

        // ── slide in ──
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('toast-show'));
        });

        // ── หายไปเองใน 3 วินาที ──
        setTimeout(() => {
            toast.classList.add('toast-hide');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, 3000);
    }

    // ==========================================
    // 🌟 0.1 ระบบป้องกันการเข้าถึงหน้าเว็บ (Auth Guard)
    // ==========================================
    const currentPageUrl = window.location.pathname.split("/").pop() || 'index.html';
    const loggedInUser = sessionStorage.getItem('userName');
    const loggedInType = sessionStorage.getItem('userType');
    const loggedInId = (sessionStorage.getItem('userId') || '').split(':')[0].trim();

    // ── Track activity เพื่อนับ Active Users ──
    if (loggedInId && loggedInType) {
        const _pingPayload = {
            user_id: loggedInId,
            user_type: loggedInType === 'employer' ? 'employer' : 'seeker'
        };
        const _pingServer = () => fetch('/api/track-activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(_pingPayload)
        }).catch(() => {});
        _pingServer();
    }

    // ลิสต์หน้าเว็บของแต่ละฝั่ง
    const seekerPages = ['home-jobseeker.html', 'resume.html', 'resume2.html', 'resume3.html', 'resume4.html', 'resume5.html', 'job-search.html', 'profile-job.html', 'profile-job2.html', 'job-detail.html'];
    const employerPages = ['home-employer.html', 'post-job.html', 'profile-em.html', 'profile-em2.html', 'profile-em3.html', 'profile-em4.html', 'post-employer.html', 'post-employer2.html', 'resume-database.html'];

    // 🌟 เช็คว่าคนนี้คือ Admin ไหม? (จาก Session หรือ ?admin=true ใน URL)
    const urlAdminBypass = new URLSearchParams(window.location.search).get('admin') === 'true';
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true' || urlAdminBypass;

    if (!loggedInUser && !isAdmin) {
        if (seekerPages.includes(currentPageUrl)) {
            alert('⚠️ กรุณาเข้าสู่ระบบสำหรับผู้หางาน');
            window.location.href = 'login-jobseeker.html?mode=login';
            return;
        } else if (employerPages.includes(currentPageUrl)) {
            alert('⚠️ กรุณาเข้าสู่ระบบสำหรับนายจ้าง');
            window.location.href = 'login-employer.html?mode=login';
            return;
        }
    } else {
        if (loggedInType === 'employer' && seekerPages.includes(currentPageUrl)) {
            alert('⚠️ ไม่สามารถเข้าหน้าผู้หางานได้');
            window.location.href = 'home-employer.html';
            return;
        } else if (loggedInType === 'seeker' && employerPages.includes(currentPageUrl)) {
            alert('⚠️ ไม่สามารถเข้าหน้านายจ้างได้');
            window.location.href = 'home-jobseeker.html';
            return;
        }

        if (currentPageUrl === 'login-jobseeker.html' || currentPageUrl === 'login-employer.html') {
            if (loggedInType === 'employer') {
                window.location.href = 'home-employer.html';
            } else {
                window.location.href = 'home-jobseeker.html';
            }
            return;
        }
    }

    // ── KYC Status Check (employer pages) ──
    const kycBlockPages = ['post-job.html', 'post-employer.html', 'post-employer2.html'];
    const kycWarnPages  = ['home-employer.html', 'profile-em.html', 'profile-em2.html', 'profile-em3.html', 'profile-em4.html', 'resume-database.html'];
    if (loggedInType === 'employer' && loggedInUser) {
        const empId = sessionStorage.getItem('userId');
        if (empId) {
            fetch(`/api/employer/kyc-status?id=${empId}`)
                .then(r => r.json())
                .then(d => {
                    if (d.verification_status && d.verification_status !== 'approved') {
                        sessionStorage.setItem('kyc_status', d.verification_status);
                        showKycBanner(d.verification_status);
                        if (kycBlockPages.includes(currentPageUrl)) {
                            blockPageForKyc();
                        }
                    } else {
                        sessionStorage.removeItem('kyc_status');
                    }
                }).catch(() => {});
        }
    }

    function showKycBanner(status) {
        if (document.getElementById('kyc-pending-banner')) return;
        const isRejected = status === 'rejected';
        const banner = document.createElement('div');
        banner.id = 'kyc-pending-banner';
        banner.className = 'kyc-pending-banner';
        banner.style.cssText = 'position:sticky;top:0;z-index:999;margin:0;border-radius:0;border-left-width:4px;';
        banner.innerHTML = `
            <span class="kyc-icon">${isRejected ? '❌' : '⏳'}</span>
            <div class="kyc-text">
                <strong>${isRejected ? 'บัญชีถูกปฏิเสธการยืนยันตัวตน' : 'บัญชีของคุณอยู่ระหว่างรอการยืนยันตัวตน (KYC)'}</strong>
                <span>${isRejected
                    ? 'เลขประจำตัวผู้เสียภาษีของคุณไม่ผ่านการตรวจสอบ กรุณาติดต่อทีมงาน'
                    : 'แอดมินกำลังตรวจสอบข้อมูลบริษัทของคุณ คุณจะสามารถโพสต์งานและซื้อ Subscription ได้หลังจากได้รับการอนุมัติ'
                }</span>
            </div>`;
        if (isRejected) banner.style.borderLeftColor = '#dc2626';
        document.body.prepend(banner);
    }

    function blockPageForKyc() {
        const main = document.querySelector('main') || document.querySelector('.main-content') || document.querySelector('.page-content');
        if (!main) return;
        main.classList.add('kyc-blocked-overlay');
        const blocker = document.createElement('div');
        blocker.style.cssText = 'position:fixed;inset:0;z-index:998;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.6);backdrop-filter:blur(3px);';
        blocker.innerHTML = `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:36px 40px;max-width:420px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.12);">
                <div style="font-size:48px;margin-bottom:12px;">🔒</div>
                <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">รอการยืนยันตัวตน</h3>
                <p style="font-size:14px;color:#64748b;line-height:1.6;">บัญชีของคุณยังอยู่ระหว่างรอแอดมินตรวจสอบ KYC<br>หลังจากได้รับการอนุมัติแล้ว คุณจะสามารถโพสต์งานได้ทันที</p>
                <a href="home-employer.html" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#2563eb;color:#fff;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">กลับหน้าหลัก</a>
            </div>`;
        document.body.appendChild(blocker);
    }

    // ==========================================
    // 🌟 0.2 ระบบ Navbar แบบ Dynamic
    // ==========================================
    const authNavItem = document.querySelector('.main-nav > li:last-child');
    if (authNavItem) {
        if (loggedInUser) {
            // ── ซ่อนปุ่ม "สมัครสมาชิก" (btn-outline-register) ถ้ามีในหน้านี้ ──
            const registerNavItem = document.querySelector('.nav-link-btn.btn-outline-register');
            if (registerNavItem) registerNavItem.closest('li').style.display = 'none';

            authNavItem.classList.add('user-profile-item');

            let profileMenuHtml = '';
            if (loggedInType === 'employer') {
                profileMenuHtml = `<li><a href="profile-em.html">โปรไฟล์</a></li>`;
            } else {
                profileMenuHtml = `<li><a href="profile-job.html">โปรไฟล์</a></li>`;
            }

            authNavItem.innerHTML = `
                <button class="nav-link-btn user-profile-btn" aria-haspopup="true" aria-expanded="false" style="display:flex; align-items:center; max-width:250px;">
                    <div class="user-avatar" style="flex-shrink:0; display:flex; align-items:center; justify-content:center;">${loggedInUser.charAt(0)}</div>
                    <span class="user-name" style="max-width:120px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0 8px;">${loggedInUser}</span>
                    <svg class="dropdown-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <ul class="dropdown-menu user-dropdown" hidden>
                    ${profileMenuHtml}
                    <li><a href="#" id="dynamic-logout-btn">ออกจากระบบ</a></li>
                </ul>
            `;

            document.getElementById('dynamic-logout-btn').addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.clear();
                localStorage.removeItem('user');
                sessionStorage.removeItem('tempResumeData');
                sessionStorage.removeItem('existingProfilePic');
                announce('ออกจากระบบแล้ว');
                window.location.href = 'Index.html';
            });

            // ── Index.html: แสดง/ซ่อนเมนูตาม userType ──
            const isIndexPage = ['index.html', 'Index.html', ''].includes(currentPageUrl);
            if (isIndexPage) {
                // ซ่อนเมนู guest (สมัครสมาชิก)
                const registerNav = document.getElementById('index-register-nav');
                if (registerNav) registerNav.style.display = 'none';

                // แสดงเมนูตาม role
                if (loggedInType === 'seeker') {
                    const seekerNav = document.getElementById('index-seeker-nav');
                    if (seekerNav) seekerNav.style.display = '';
                } else if (loggedInType === 'employer') {
                    const employerNav = document.getElementById('index-employer-nav');
                    if (employerNav) employerNav.style.display = '';
                }

                // แสดงเมนูเกี่ยวกับเรา
                const aboutNav = document.getElementById('index-about-nav');
                if (aboutNav) aboutNav.style.display = '';
            } else {
                // หน้าอื่น: ซ่อนเมนูตาม role เดิม
                document.querySelectorAll('.main-nav > li.nav-item').forEach(item => {
                    const btn = item.querySelector('.nav-link-btn');
                    if (btn) {
                        const menuText = btn.textContent.trim();
                        if (loggedInType === 'employer' && menuText.includes('ผู้หางาน')) item.style.display = 'none';
                        if (loggedInType === 'seeker' && menuText.includes('นายจ้าง')) item.style.display = 'none';
                    }
                });
            }
        } else {
            // ── ไม่ได้ login: ถ้าหน้านี้มีปุ่ม btn-outline-register (Index.html) ไม่ต้องเขียนทับ ──
            const hasNewNav = !!document.querySelector('.nav-link-btn.btn-outline-register');
            if (!hasNewNav) {
                // หน้าอื่นๆ ที่ยังใช้ navbar แบบเก่า
                authNavItem.classList.remove('user-profile-item');
                authNavItem.innerHTML = `
                    <button class="nav-link-btn btn-outline-auth" aria-haspopup="true" aria-expanded="false" aria-controls="login-menu-dyn" aria-label="เมนูเข้าสู่ระบบ">
                        เข้าสู่ระบบ
                        <svg class="dropdown-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <ul class="dropdown-menu login-register-dropdown" id="login-menu-dyn" role="menu">
                        <li role="none"><a role="menuitem" href="login-jobseeker.html?mode=login">สำหรับผู้หางาน</a></li>
                        <li role="none"><a role="menuitem" href="login-employer.html?mode=login">สำหรับนายจ้าง</a></li>
                        <li role="none"><a role="menuitem" href="admin.html">สำหรับแอดมิน</a></li>
                    </ul>
                `;
            }
            // ถ้ามี btn-outline-register (Index.html) → ปล่อย HTML เดิมไว้ ไม่ต้องเขียนทับ
        }
    }

    // ── แสดง "ดูเรซูเม่ผู้หางานทั้งหมด" ในเมนูนายจ้าง เฉพาะ monthly/yearly ──
    if (loggedInType === 'employer' && loggedInId) {
        const resumeDbNavItem = document.getElementById('nav-resume-db-item');
        if (resumeDbNavItem) {
            fetch(`/api/employer-subscription/${loggedInId}`)
                .then(r => r.json())
                .then(sub => {
                    const plan = sub.subscription_plan;
                    if (plan === 'monthly' || plan === 'yearly') {
                        resumeDbNavItem.style.display = '';
                    }
                })
                .catch(() => { });
        }
    }

    // ==========================================
    // 🌟 0.2 ระบบแจ้งเตือนกระดิ่ง — สำหรับนายจ้าง (monthly/yearly เท่านั้น)
    // ==========================================
    if (loggedInType === 'employer' && loggedInId) {

        const _DIS_LBL_N = { visual: 'ทางการมองเห็น', hearing: 'ทางการได้ยิน', physical: 'ทางกายฯ' };

        // ── สร้าง Bell + Panel แล้ว inject เข้า navbar ──
        function _injectBell(count, seekers) {
            const mainNav     = document.querySelector('.main-nav');
            const profileItem = mainNav?.querySelector('.user-profile-item');
            if (!mainNav || !profileItem || document.getElementById('notif-bell-item')) return;

            const badgeHtml = count > 0
                ? `<span class="notif-bell-badge" aria-hidden="true">${count > 9 ? '9+' : count}</span>`
                : '';

            const itemsHtml = seekers.length === 0
                ? `<div class="notif-panel-empty">ยังไม่มีเรซูเม่ที่ตรงกัน</div>`
                : seekers.map(s => {
                    const name     = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'ไม่ระบุชื่อ';
                    const disLabel = _DIS_LBL_N[(s.disability_type || '').toLowerCase()] || s.disability_type || '';
                    const disBadge = disLabel ? `<span class="notif-dis-badge">${disLabel}</span>` : '';
                    return `
                        <a class="notif-panel-item" href="resume-database.html?seeker=${s.seeker_id}">
                            <div class="notif-item-avatar" aria-hidden="true">
                                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="20" cy="20" r="20" fill="#e2e8f0"/>
                                    <circle cx="20" cy="16" r="7" fill="#94a3b8"/>
                                    <ellipse cx="20" cy="32" rx="11" ry="7" fill="#94a3b8"/>
                                </svg>
                            </div>
                            <div class="notif-item-info">
                                <div class="notif-item-name">${name}</div>
                                <div class="notif-item-pos">${s.job_position || 'ไม่ระบุตำแหน่ง'} ${disBadge}</div>
                            </div>
                        </a>`;
                }).join('');

            const li = document.createElement('li');
            li.className = 'nav-item notif-bell-item';
            li.id        = 'notif-bell-item';
            li.setAttribute('role', 'none');
            li.innerHTML = `
                <button class="notif-bell-btn" id="notif-bell-btn"
                    aria-label="การแจ้งเตือน${count > 0 ? ` ${count} รายการ` : ''}"
                    aria-haspopup="true" aria-expanded="false">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    ${badgeHtml}
                </button>
                <div class="notif-panel" id="notif-panel" role="dialog"
                    aria-label="เรซูเม่ที่น่าสนใจ" style="display:none;">
                    <div class="notif-panel-header">
                        <span class="notif-panel-title">เรซูเม่ที่น่าสนใจสำหรับคุณ</span>
                        <span class="notif-panel-count">${count} เรซูเม่</span>
                    </div>
                    <div class="notif-panel-list" role="list">${itemsHtml}</div>
                    <a href="resume-database.html" class="notif-panel-footer">ดูเรซูเม่ทั้งหมด →</a>
                </div>
            `;

            mainNav.insertBefore(li, profileItem);

            // ── Toggle Panel ──
            const bellBtn = document.getElementById('notif-bell-btn');
            const panel   = document.getElementById('notif-panel');

            bellBtn.addEventListener('click', e => {
                e.stopPropagation();
                const isOpen = panel.style.display !== 'none';
                panel.style.display = isOpen ? 'none' : 'block';
                bellBtn.setAttribute('aria-expanded', String(!isOpen));
            });
            document.addEventListener('click', e => {
                if (!li.contains(e.target)) {
                    panel.style.display = 'none';
                    bellBtn.setAttribute('aria-expanded', 'false');
                }
            });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && panel.style.display !== 'none') {
                    panel.style.display = 'none';
                    bellBtn.setAttribute('aria-expanded', 'false');
                    bellBtn.focus();
                }
            });
        }

        // ── Toast popup เมื่อเข้าหน้า (แสดงครั้งเดียวต่อ session) ──
        function _showNotifToast(count) {
            if (count === 0) return;
            if (sessionStorage.getItem('_notif_toast_shown')) return;
            sessionStorage.setItem('_notif_toast_shown', '1');

            const toast = document.createElement('div');
            toast.id = 'notif-toast';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'polite');
            toast.innerHTML = `
                <div class="notif-toast-icon">🔔</div>
                <div class="notif-toast-text">
                    <strong>มีเรซูเม่ที่น่าสนใจ ${count} เรซูเม่</strong>
                    <span>ตรงกับตำแหน่งงานที่คุณกำลังหาอยู่</span>
                </div>
                <a href="resume-database.html" class="notif-toast-btn">ดูเลย →</a>
                <button class="notif-toast-close" aria-label="ปิด">×</button>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('notif-toast--visible'), 60);

            let autoTimer = setTimeout(() => _dismissToast(toast), 6000);
            toast.querySelector('.notif-toast-close').addEventListener('click', () => {
                clearTimeout(autoTimer);
                _dismissToast(toast);
            });
        }

        function _dismissToast(toast) {
            toast.classList.remove('notif-toast--visible');
            setTimeout(() => toast?.remove(), 400);
        }

        // ── Fetch & init ──
        fetch(`/api/employer-match-notifications/${loggedInId}`)
            .then(r => r.json())
            .then(data => {
                if (!data.allowed) return;
                _injectBell(data.count, data.seekers);
                _showNotifToast(data.count);
            })
            .catch(() => { });
    }

    // ==========================================
    // --- 1. ACCESSIBLE NAVBAR (Keyboard & Click) ---
    // ==========================================
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const button = item.querySelector('.nav-link-btn');
        const dropdownMenu = item.querySelector('.dropdown-menu');

        if (button && dropdownMenu) {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                navItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.nav-link-btn')?.setAttribute('aria-expanded', 'false');
                        otherItem.querySelector('.dropdown-menu')?.setAttribute('hidden', '');
                    }
                });

                item.classList.toggle('active');
                if (item.classList.contains('active')) {
                    button.setAttribute('aria-expanded', 'true');
                    dropdownMenu.removeAttribute('hidden');
                    announce('เปิดเมนู ' + button.textContent.trim());
                    setTimeout(() => dropdownMenu.querySelector('a')?.focus(), 100);
                } else {
                    button.setAttribute('aria-expanded', 'false');
                    dropdownMenu.setAttribute('hidden', '');
                    announce('ปิดเมนูแล้ว');
                }
            });

            item.addEventListener('keydown', (e) => {
                if (!item.classList.contains('active')) return;
                const menuItems = Array.from(dropdownMenu.querySelectorAll('a'));
                if (menuItems.length === 0) return;

                let currentFocus = document.activeElement;
                switch (e.key) {
                    case 'ArrowDown': case 'ArrowRight':
                        e.preventDefault();
                        if (currentFocus === button) menuItems[0].focus();
                        else menuItems[(menuItems.indexOf(currentFocus) + 1) % menuItems.length].focus();
                        break;
                    case 'ArrowUp': case 'ArrowLeft':
                        e.preventDefault();
                        if (currentFocus === button) menuItems[menuItems.length - 1].focus();
                        else menuItems[(menuItems.indexOf(currentFocus) - 1 + menuItems.length) % menuItems.length].focus();
                        break;
                    case 'Escape': case 'Tab':
                        item.classList.remove('active');
                        button.setAttribute('aria-expanded', 'false');
                        dropdownMenu.setAttribute('hidden', '');
                        if (e.key === 'Escape') button.focus();
                        break;
                }
            });
        }
    });

    document.body.addEventListener('click', () => {
        navItems.forEach(item => {
            if (item.classList.contains('active')) {
                item.classList.remove('active');
                item.querySelector('.nav-link-btn')?.setAttribute('aria-expanded', 'false');
                item.querySelector('.dropdown-menu')?.setAttribute('hidden', '');
            }
        });
    });

    // ==========================================
    // --- 1.3 DISABILITY CARD CHECKBOXES (resume.html) ---
    // ==========================================
    document.querySelectorAll('.disability-card-header[role="checkbox"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const cb = document.getElementById('dis-' + btn.dataset.type);
            if (cb) cb.checked = !cb.checked; // toggle hidden checkbox ก่อน
            toggleDisabilityLevel(btn.dataset.type); // จากนั้น sync UI + aria-checked
            // แจ้ง screen reader
            const checked = btn.getAttribute('aria-checked') === 'true';
            announce(btn.getAttribute('aria-label') + (checked ? ' เลือกแล้ว' : ' ยกเลิกการเลือกแล้ว'));
        });
    });

    // ── announce เมื่อเลือกระดับความพิการ ──
    document.querySelectorAll('.disability-level-select').forEach(sel => {
        sel.addEventListener('change', function () {
            if (this.value && this.options[this.selectedIndex]) {
                announce('เลือก: ' + this.options[this.selectedIndex].text);
            }
        });
    });

    // ==========================================
    // --- 1.5 HAMBURGER MENU (Mobile Navigation) ---
    // ==========================================
    (function buildMobileNav() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        // ── สร้างปุ่ม Hamburger ──
        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.className = 'navbar-hamburger';
        hamburgerBtn.setAttribute('aria-label', 'เปิดเมนูนำทาง');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.setAttribute('aria-controls', 'mobile-nav-panel');
        hamburgerBtn.innerHTML = `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
        navbar.appendChild(hamburgerBtn);

        // ── สร้าง Overlay ──
        const overlay = document.createElement('div');
        overlay.className = 'mobile-nav-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);

        // ── สร้าง Mobile Nav Panel ──
        const panel = document.createElement('div');
        panel.className = 'mobile-nav-panel';
        panel.id = 'mobile-nav-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'เมนูนำทาง');

        // ── Header ของ Panel ──
        const panelHeader = document.createElement('div');
        panelHeader.className = 'mobile-nav-header';
        panelHeader.innerHTML = `
            <span class="mobile-nav-logo">JobNble</span>
            <button class="mobile-nav-close" aria-label="ปิดเมนู">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        panel.appendChild(panelHeader);

        // ── สร้างรายการเมนู ──
        const navList = document.createElement('nav');
        navList.setAttribute('aria-label', 'เมนูนำทางมือถือ');
        const ul = document.createElement('ul');
        ul.className = 'mobile-nav-list';

        // SVG chevron icon (ใช้ class mobile-nav-chevron ตาม CSS)
        const chevronSVG = `<svg class="mobile-nav-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

        // helper: สร้าง li พร้อม submenu (ใช้ .open class + .sub-open ตาม CSS)
        function createMobileMenuItem(labelText, submenuItems) {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = `${labelText} ${chevronSVG}`;

            const subUl = document.createElement('ul');
            subUl.className = 'mobile-nav-submenu';
            submenuItems.forEach(({ text, href }) => {
                const subLi = document.createElement('li');
                const a = document.createElement('a');
                a.href = href;
                a.textContent = text;
                subLi.appendChild(a);
                subUl.appendChild(subLi);
            });

            btn.addEventListener('click', () => {
                const isOpen = li.classList.contains('sub-open');
                // ปิด submenu อื่นก่อน
                ul.querySelectorAll('li.sub-open').forEach(openLi => {
                    if (openLi !== li) {
                        openLi.classList.remove('sub-open');
                        openLi.querySelector('button')?.setAttribute('aria-expanded', 'false');
                        openLi.querySelector('.mobile-nav-submenu')?.classList.remove('open');
                    }
                });
                if (isOpen) {
                    li.classList.remove('sub-open');
                    btn.setAttribute('aria-expanded', 'false');
                    subUl.classList.remove('open');
                } else {
                    li.classList.add('sub-open');
                    btn.setAttribute('aria-expanded', 'true');
                    subUl.classList.add('open');
                    announce('เปิดเมนู ' + labelText);
                }
            });

            li.appendChild(btn);
            li.appendChild(subUl);
            return li;
        }

        if (loggedInUser) {
            // ── 1) User Card (ขึ้นก่อน) ──
            const userSection = document.createElement('div');
            userSection.className = 'mobile-nav-user';
            const profileHref = loggedInType === 'employer' ? 'profile-em.html' : 'profile-job.html';
            const roleLabel = loggedInType === 'employer' ? 'นายจ้าง' : 'ผู้หางาน';
            userSection.innerHTML = `
                <div class="mobile-nav-user-info">
                    <div class="mobile-nav-user-avatar" aria-hidden="true">${loggedInUser.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="mobile-nav-user-name">${loggedInUser}</div>
                        <div class="mobile-nav-user-role">${roleLabel}</div>
                    </div>
                </div>
                <a href="${profileHref}" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:11px;margin-bottom:8px;background:#eff6ff;color:#2563eb;border:1.5px solid #bfdbfe;border-radius:10px;font-size:14px;font-weight:600;text-align:center;text-decoration:none;font-family:'Noto Sans Thai','Inter',sans-serif;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    โปรไฟล์ของฉัน
                </a>
                <button class="mobile-nav-logout" id="mobile-logout-btn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    ออกจากระบบ
                </button>
            `;
            panel.appendChild(userSection);
            userSection.querySelector('#mobile-logout-btn').addEventListener('click', () => {
                sessionStorage.clear();
                localStorage.removeItem('user');
                sessionStorage.removeItem('tempResumeData');
                sessionStorage.removeItem('existingProfilePic');
                announce('ออกจากระบบแล้ว');
                window.location.href = '/';
            });

            // ── 2) Font size (อยู่หลัง user card) — will be appended after fszSection created below ──
            panel._appendFszHere = true;

            // ── 3) เมนู dropdown ──
            if (loggedInType === 'employer') {
                ul.appendChild(createMobileMenuItem('นายจ้าง', [
                    { text: 'หน้าหลักนายจ้าง', href: 'home-employer.html' },
                    { text: 'โพสต์ประกาศงาน', href: 'post-employer.html' }
                ]));
            } else {
                ul.appendChild(createMobileMenuItem('ผู้หางาน', [
                    { text: 'หน้าหลักผู้หางาน', href: 'home-jobseeker.html' },
                    { text: 'สร้างเรซูเม่', href: 'resume.html' }
                ]));
            }
            ul.appendChild(createMobileMenuItem('เกี่ยวกับเรา', [
                { text: 'เกี่ยวกับเรา', href: 'aboutus.html' }
            ]));
            navList.appendChild(ul);
            panel.appendChild(navList);
        } else {
            // ── เมนูเมื่อยังไม่ login ──
            ul.appendChild(createMobileMenuItem('นายจ้าง', [
                { text: 'หน้าหลักนายจ้าง', href: 'home-employer.html' },
                { text: 'โพสต์ประกาศงาน', href: 'post-employer.html' }
            ]));
            ul.appendChild(createMobileMenuItem('ผู้หางาน', [
                { text: 'หน้าหลักผู้หางาน', href: 'home-jobseeker.html' },
                { text: 'สร้างเรซูเม่', href: 'resume.html' }
            ]));
            ul.appendChild(createMobileMenuItem('เกี่ยวกับเรา', [
                { text: 'เกี่ยวกับเรา', href: 'aboutus.html' }
            ]));
            ul.appendChild(createMobileMenuItem('สมัครสมาชิก', [
                { text: 'สำหรับผู้หางาน', href: 'login-jobseeker.html?mode=register' },
                { text: 'สำหรับนายจ้าง', href: 'login-employer.html?mode=register' }
            ]));
            ul.appendChild(createMobileMenuItem('เข้าสู่ระบบ', [
                { text: 'สำหรับผู้หางาน', href: 'login-jobseeker.html?mode=login' },
                { text: 'สำหรับนายจ้าง', href: 'login-employer.html?mode=login' }
            ]));
            navList.appendChild(ul);
            panel.appendChild(navList);
        }

        // ── Font Size Control inside panel ──
        const fszSection = document.createElement('div');
        fszSection.className = 'mobile-nav-fsz';
        fszSection.innerHTML = `
            <div class="mobile-nav-fsz-label">ขนาดตัวอักษร</div>
            <div class="mobile-nav-fsz-btns">
                <button class="mobile-fsz-btn" data-size="sm" aria-label="ตัวอักษรขนาดเล็ก">A<span>เล็ก</span></button>
                <button class="mobile-fsz-btn mobile-fsz-active" data-size="md" aria-label="ตัวอักษรขนาดปกติ">A<span>กลาง</span></button>
                <button class="mobile-fsz-btn" data-size="lg" aria-label="ตัวอักษรขนาดใหญ่">A<span>ใหญ่</span></button>
            </div>`;
        // sync active state with saved size
        const _savedFsz = localStorage.getItem('jobnble-font-size') || 'md';
        fszSection.querySelectorAll('.mobile-fsz-btn').forEach(btn => {
            btn.classList.toggle('mobile-fsz-active', btn.dataset.size === _savedFsz);
            btn.addEventListener('click', () => {
                const size = btn.dataset.size;
                document.documentElement.className = document.documentElement.className
                    .replace(/\bfont-(sm|md|lg)\b/g, '').trim();
                if (size !== 'md') document.documentElement.classList.add('font-' + size);
                localStorage.setItem('jobnble-font-size', size);
                fszSection.querySelectorAll('.mobile-fsz-btn').forEach(b =>
                    b.classList.toggle('mobile-fsz-active', b.dataset.size === size));
                // sync desktop control too
                document.querySelectorAll('.fsz-option').forEach(o => {
                    o.classList.toggle('fsz-active', o.dataset.size === size);
                    o.setAttribute('aria-checked', o.dataset.size === size ? 'true' : 'false');
                });
            });
        });
        // ใส่ fszSection หลัง userSection (ถ้า login) หรือหลัง navList (ถ้ายังไม่ login)
        if (panel._appendFszHere) {
            // logged in: insert after userSection (index 1), before navList (index 2)
            const navListEl = panel.querySelector('nav');
            panel.insertBefore(fszSection, navListEl);
        } else {
            panel.appendChild(fszSection);
        }

        document.body.appendChild(panel);

        // ── Open / Close helpers ──
        function openMobileNav() {
            panel.classList.add('open');
            overlay.classList.add('open');
            overlay.setAttribute('aria-hidden', 'false');
            hamburgerBtn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            announce('เปิดเมนูนำทางแล้ว');
            setTimeout(() => panel.querySelector('.mobile-nav-close')?.focus(), 100);
        }

        function closeMobileNav() {
            panel.classList.remove('open');
            overlay.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            announce('ปิดเมนูนำทางแล้ว');
            hamburgerBtn.focus();
        }

        hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); openMobileNav(); });
        overlay.addEventListener('click', closeMobileNav);
        panelHeader.querySelector('.mobile-nav-close').addEventListener('click', closeMobileNav);

        // ปิดด้วย Escape + Focus trap
        panel.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { closeMobileNav(); return; }
            if (e.key !== 'Tab') return;
            const focusable = Array.from(panel.querySelectorAll(
                'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            )).filter(el => !el.closest('[hidden]') && el.offsetParent !== null);
            if (focusable.length < 2) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    })();

    // ==========================================
    // --- 2. ควบคุม Sliders (ข่าวสาร / งาน / บริษัท) ---
    // ==========================================
    const track = document.querySelector('.carousel-track');
    if (track) {
        const slides = Array.from(track.children);
        const nextButton = document.querySelector('.right-btn');
        const prevButton = document.querySelector('.left-btn');
        const dotsNav = document.querySelector('.carousel-nav');
        const dots = dotsNav ? Array.from(dotsNav.children) : [];
        let carouselIndex = 0;

        if (slides.length > 0) {
            slides.forEach((slide, i) => slide.setAttribute('aria-label', `ข่าวที่ ${i + 1} จาก ${slides.length}`));

            // คำนวณ + วาง left ใหม่ทุกครั้ง (รองรับ resize)
            const initSlides = () => {
                const w = track.parentElement.getBoundingClientRect().width || track.getBoundingClientRect().width;
                slides.forEach((slide, index) => { slide.style.left = w * index + 'px'; });
            };
            initSlides();
            window.addEventListener('resize', initSlides);

            const moveToIndex = (idx) => {
                const w = track.parentElement.getBoundingClientRect().width || track.getBoundingClientRect().width;
                track.style.transform = `translateX(-${w * idx}px)`;
                slides.forEach(s => s.classList.remove('current-slide'));
                slides[idx].classList.add('current-slide');
                dots.forEach(d => d.classList.remove('current-indicator'));
                if (dots[idx]) dots[idx].classList.add('current-indicator');
                announce(`กำลังแสดง ${slides[idx].getAttribute('aria-label')}`);
            };

            nextButton?.addEventListener('click', () => {
                carouselIndex = (carouselIndex + 1) % slides.length;
                moveToIndex(carouselIndex);
            });
            prevButton?.addEventListener('click', () => {
                carouselIndex = (carouselIndex - 1 + slides.length) % slides.length;
                moveToIndex(carouselIndex);
            });
            dotsNav?.addEventListener('click', e => {
                const targetDot = e.target.closest('button');
                if (!targetDot) return;
                carouselIndex = dots.findIndex(d => d === targetDot);
                moveToIndex(carouselIndex);
            });
        }
    }

    const jobTrack = document.querySelector('.job-track');
    if (jobTrack) {
        const jobCards = jobTrack.querySelectorAll('.job-card');
        let jobIndex = 0;
        const getCardWidth = () => {
            const card = jobCards[0];
            if (!card) return 0;
            const style = getComputedStyle(jobTrack);
            const gap = parseFloat(style.gap) || 12;
            return card.offsetWidth + gap;
        };
        const updateJobSlider = () => {
            const maxIndex = Math.max(0, jobCards.length - 1);
            jobIndex = Math.max(0, Math.min(jobIndex, maxIndex));
            jobTrack.style.transform = `translateX(-${jobIndex * getCardWidth()}px)`;
        };
        document.querySelector('.job-next-btn')?.addEventListener('click', () => {
            jobIndex = (jobIndex + 1 >= jobCards.length) ? 0 : jobIndex + 1;
            updateJobSlider();
        });
        document.querySelector('.job-prev-btn')?.addEventListener('click', () => {
            jobIndex = (jobIndex - 1 < 0) ? jobCards.length - 1 : jobIndex - 1;
            updateJobSlider();
        });
    }

    // ==========================================
    // --- 4b. ระบบค้นหางาน (Navbar Search Bar) แบบจำสถานะเมื่อกดย้อนกลับ ---
    // ==========================================
    const navSearchInput = document.getElementById('navbar-search-input');
    const navSearchSubmit = document.getElementById('navbar-search-submit');
    const navFilterBtn = document.getElementById('navbar-filter-btn');
    const navFilterPanel = document.getElementById('navbar-filter-panel');
    const filterApplyBtn = document.getElementById('filter-apply-btn');
    const filterResetBtn = document.getElementById('filter-reset-btn');
    const searchResultsSec = document.getElementById('search-results-section');
    const searchResultsGrid = document.getElementById('search-results-grid');
    const searchResultsTitle = document.getElementById('search-results-title');
    const searchResultsCount = document.getElementById('search-results-count');
    const searchResultsClose = document.getElementById('search-results-close');

    if (navSearchInput) {

        // ── ป้าย map ──
        const CAT_LABELS = { admin: 'งานธุรการ', it: 'งานไอที', service: 'งานบริการ', production: 'งานผลิต', finance: 'งานบัญชี/การเงิน' };
        const TYPE_LABELS = { fulltime: 'ประจำ', parttime: 'พาร์ทไทม์', freelance: 'ฟรีแลนซ์', contract: 'สัญญาจ้าง' };
        const DIS_LABELS = { visual: 'ทางการมองเห็น', hearing: 'ทางการได้ยิน', physical: 'ทางกายหรือการเคลื่อนไหว', ทางการเคลื่อนไหว: 'ทางกายหรือการเคลื่อนไหว' };

        // ── แผนที่ระดับความพิการแต่ละประเภท ──
        const DISABILITY_LEVEL_MAP = {
            'ทางการมองเห็น': [
                'ระดับ 1 สายตาเลือนราง',
                'ระดับ 2 สายตาพิการ',
                'ระดับ 3 ตาบอดข้างหนึ่ง',
                'ระดับ 4 ตาบอดสองข้าง',
                'ระดับ 5 ตาบอดสามข้าง'
            ],
            'ทางการได้ยินหรือสื่อความหมาย': [
                'ระดับ 1 หูตึงน้อย',
                'ระดับ 2 หูตึงปานกลาง',
                'ระดับ 3 หูตึงมาก',
                'ระดับ 4 หูตึงรุนแรง',
                'ระดับ 5 หูหนวก',
                'ระดับ 3 (สื่อ) สื่อสารได้เฉพาะกิจวัตรหลัก รู้เรื่องบ้าง',
                'ระดับ 4 (สื่อ) สื่อสารได้เฉพาะกิจวัตรหลัก',
                'ระดับ 5 (สื่อ) สื่อสารไม่ได้เลย'
            ],
            'ทางกายหรือการเคลื่อนไหว': [
                'ระดับ 1 เคลื่อนไหวได้โดยมีอุปกรณ์ช่วย',
                'ระดับ 2 เคลื่อนไหวได้บางส่วน',
                'ระดับ 3 เคลื่อนไหวได้จำกัด',
                'ระดับ 4 เคลื่อนไหวได้น้อยมาก',
                'ระดับ 5 เคลื่อนไหวไม่ได้เลย'
            ]
        };

        // ── ฟังก์ชัน rebuild ตัวเลือกระดับความพิการ ──
        function rebuildLevelOptions(disType, selectedLevel) {
            const fl = document.getElementById('filter-disability-level');
            if (!fl) return;
            const levels = DISABILITY_LEVEL_MAP[disType] || [];
            if (levels.length === 0) {
                fl.innerHTML = '<option value="">กรุณาเลือกประเภทก่อน</option>';
                fl.disabled = true;
            } else {
                fl.innerHTML = '<option value="">ทุกระดับ</option>' +
                    levels.map(l => `<option value="${l}"${selectedLevel === l ? ' selected' : ''}>${l}</option>`).join('');
                fl.disabled = false;
            }
        }

        // ── ตรวจสอบ URL Parameters ตอนโหลดหน้า ──
        const urlParams = new URLSearchParams(window.location.search);
        const savedQuery = urlParams.get('q');
        const savedCategory = urlParams.get('category');
        const savedType = urlParams.get('type');
        const savedDisType = urlParams.get('disability_type');
        const savedDisLevel = urlParams.get('disability_level');

        // หากมี History Parameters ค้างอยู่ ให้แสดงค่ากลับคืนฟอร์มแล้วค้นหาอัตโนมัติ
        if (savedQuery || savedCategory || savedType || savedDisType || savedDisLevel) {
            navSearchInput.value = savedQuery || '';
            const fc = document.getElementById('filter-category');
            const ft = document.getElementById('filter-type');
            const fdt = document.getElementById('filter-disability-type');
            if (fc && savedCategory) fc.value = savedCategory;
            if (ft && savedType) ft.value = savedType;
            if (fdt && savedDisType) {
                fdt.value = savedDisType;
                rebuildLevelOptions(savedDisType, savedDisLevel);
            }

            // หน่วงเวลาเล็กน้อยเพื่อให้ระบบโหลดเสร็จก่อนค่อยเริ่มค้นหา
            setTimeout(() => {
                executeSearchQuery(savedQuery, savedCategory, savedType, savedDisType, savedDisLevel);
            }, 100);
        }

        // ── Event: เปลี่ยนประเภทความพิการ → rebuild ระดับ ──
        document.getElementById('filter-disability-type')?.addEventListener('change', function () {
            rebuildLevelOptions(this.value, '');
        });

        // ── Toggle filter panel ──
        navFilterBtn?.addEventListener('click', () => {
            const isOpen = !navFilterPanel.hidden;
            navFilterPanel.hidden = isOpen;
            navFilterBtn.setAttribute('aria-expanded', String(!isOpen));
            navFilterBtn.classList.toggle('active', !isOpen);
        });

        // ── ปิด filter panel เมื่อคลิกนอก ──
        document.addEventListener('click', (e) => {
            if (navFilterPanel && !navFilterPanel.hidden) {
                if (!navFilterPanel.contains(e.target) && e.target !== navFilterBtn && !navFilterBtn?.contains(e.target)) {
                    navFilterPanel.hidden = true;
                    navFilterBtn?.setAttribute('aria-expanded', 'false');
                    navFilterBtn?.classList.remove('active');
                }
            }
        });

        // ── helper: scroll ไปยัง search results section (หักลบความสูง sticky header) ──
        function scrollToResults() {
            if (!searchResultsSec) return;
            const headerH = document.querySelector('.site-header')?.offsetHeight || 0;
            const top = searchResultsSec.getBoundingClientRect().top + window.pageYOffset - headerH - 12;
            window.scrollTo({ top, behavior: 'smooth' });
        }

        // ── ฟังก์ชัน render ผลลัพธ์ ──
        async function renderSearchResults(jobs, q) {
            if (!searchResultsSec) return;
            searchResultsSec.style.display = 'block';

            const kw = (q || '').trim();
            if (searchResultsTitle) searchResultsTitle.textContent = kw ? `ผลการค้นหา "${kw}"` : 'ผลการค้นหาทั้งหมด';
            if (searchResultsCount) searchResultsCount.textContent = `พบ ${jobs.length} ตำแหน่งงาน`;

            if (jobs.length === 0) {
                searchResultsGrid.innerHTML = `
                    <div class="search-no-result">
                        <h3>ไม่พบงานที่ตรงกับการค้นหา</h3>
                        <p>ลองใช้คำค้นหาอื่น หรือปรับตัวกรองใหม่</p>
                    </div>`;
                scrollToResults();
                return;
            }

            // โหลดงานที่บันทึกไว้แล้ว (ถ้า login อยู่)
            const seekerIdForSearch = (sessionStorage.getItem('userId') || '').split(':')[0].trim();
            let savedJobIdsSearch = new Set();
            if (seekerIdForSearch) {
                try {
                    const svRes = await fetch(`/api/saved-jobs/${seekerIdForSearch}`);
                    const svData = await svRes.json();
                    if (Array.isArray(svData)) svData.forEach(j => savedJobIdsSearch.add(String(j.id)));
                } catch(_) {}
            }

            searchResultsGrid.innerHTML = jobs.map(job => {
                const catLabel = CAT_LABELS[job.job_category] || job.job_category || '';
                const typeLabel = TYPE_LABELS[job.job_type] || job.job_type || '';
                const salary = job.salary ? `฿${Number(job.salary).toLocaleString()}` : '';
                const disArr = (job.disability_type || '').split(',').map(d => {
                    const k = d.trim();
                    return DIS_LABELS[k] || k;
                }).filter(Boolean);
                const disText = disArr.join(', ');
                const isSaved = savedJobIdsSearch.has(String(job.id));
                const bookmarkSvgFilled = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
                const bookmarkSvgEmpty = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
                const safeTitle = (job.job_title||'').replace(/'/g,"\\'");
                const safeCo = (job.company_name||'').replace(/'/g,"\\'");

                return `
                <a href="job-detail.html?id=${job.id}" class="search-job-card" role="listitem"
                   aria-label="ดูรายละเอียดงาน ${job.job_title || ''} บริษัท ${job.company_name || ''}">
                    <h3 class="search-job-title">${job.job_title || 'ไม่ระบุตำแหน่ง'}</h3>
                    <p class="search-job-company">${job.company_name || ''}</p>
                    <div class="search-job-tags">
                        ${catLabel ? `<span class="search-job-tag">${catLabel}</span>` : ''}
                        ${typeLabel ? `<span class="search-job-tag tag-type">${typeLabel}</span>` : ''}
                        ${salary ? `<span class="search-job-tag tag-salary">${salary}</span>` : ''}
                    </div>
                    ${job.job_location ? `<div class="search-job-meta">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${job.job_location}</div>` : ''}
                    ${disText ? `<div class="search-job-meta">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        รับ: ${disText}</div>` : ''}
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                        <div class="search-job-cta">ดูรายละเอียด
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                        <button class="search-save-btn" data-job-id="${job.id}" data-saved="${isSaved}"
                            onclick="event.stopPropagation(); event.preventDefault(); toggleSaveJob(this, '${job.id}', '${safeTitle}', '${safeCo}');"
                            aria-label="${isSaved ? 'ยกเลิกบันทึกงานนี้' : 'บันทึกงานนี้'}"
                            title="${isSaved ? 'ยกเลิกบันทึก' : 'บันทึกงาน'}"
                            style="width:32px;height:32px;border-radius:50%;border:1.5px solid ${isSaved ? '#bfdbfe' : '#e2e8f0'};background:${isSaved ? '#eff6ff' : '#fff'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .2s;">
                            ${isSaved ? bookmarkSvgFilled : bookmarkSvgEmpty}
                        </button>
                    </div>
                </a>`;
            }).join('');

            scrollToResults();
        }

        // ── ฟังก์ชันเตรียมเงื่อนไขก่อนส่งขึ้น URL ──
        function initiateSearch() {
            const q = (navSearchInput.value || '').trim();
            const category = document.getElementById('filter-category')?.value || '';
            const type = document.getElementById('filter-type')?.value || '';
            const disType = document.getElementById('filter-disability-type')?.value || '';
            const disLevel = document.getElementById('filter-disability-level')?.value || '';

            if (!q && !category && !type && !disType && !disLevel) {
                // ไม่มีเงื่อนไขเลย → เคลียร์ URL Parameters กลับเป็นหน้าปกติ และซ่อน results
                window.history.replaceState({}, '', window.location.pathname);
                if (searchResultsSec) searchResultsSec.style.display = 'none';
                return;
            }

            // แปะค่าลง URL Parameters เพื่อให้เบราว์เซอร์ช่วยจำสถานะ
            const searchParams = new URLSearchParams();
            if (q) searchParams.set('q', q);
            if (category) searchParams.set('category', category);
            if (type) searchParams.set('type', type);
            if (disType) searchParams.set('disability_type', disType);
            if (disLevel) searchParams.set('disability_level', disLevel);

            const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
            window.history.replaceState({}, '', newUrl);

            // ดึงผลลัพธ์จาก API ต่อ
            executeSearchQuery(q, category, type, disType, disLevel);
        }

        // ── ฟังก์ชันตัวดึงข้อมูลจาก API ──
        async function executeSearchQuery(q, category, type, disType, disLevel) {
            if (searchResultsSec) {
                searchResultsSec.style.display = 'block';
                if (searchResultsTitle) searchResultsTitle.textContent = 'กำลังค้นหา...';
                if (searchResultsCount) searchResultsCount.textContent = '';
                if (searchResultsGrid) searchResultsGrid.innerHTML = `<div class="search-no-result" style="padding:30px 0;"><p style="color:#94A3B8;">⏳ กำลังโหลดผลลัพธ์...</p></div>`;
                scrollToResults();
            }

            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (category) params.set('category', category);
            if (type) params.set('type', type);
            if (disType) params.set('disability_type', disType);
            if (disLevel) params.set('disability_level', disLevel);

            try {
                const res = await fetch(`/api/jobs/search?${params}`);
                const jobs = await res.json();
                renderSearchResults(jobs, q);
            } catch (err) {
                console.error('Search error:', err);
                if (searchResultsSec) {
                    searchResultsSec.style.display = 'block';
                    if (searchResultsTitle) searchResultsTitle.textContent = 'ผลการค้นหา';
                    if (searchResultsCount) searchResultsCount.textContent = '';
                    if (searchResultsGrid) searchResultsGrid.innerHTML = `<div class="search-no-result"><h3>เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</h3><p>กรุณาตรวจสอบว่า server กำลังรันอยู่</p></div>`;
                    scrollToResults();
                }
            }

            if (navFilterPanel) navFilterPanel.hidden = true;
            navFilterBtn?.setAttribute('aria-expanded', 'false');
            navFilterBtn?.classList.remove('active');
        }

        // ── Event: กด Enter ──
        navSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') initiateSearch(); });

        // ── Event: กดปุ่ม search ──
        navSearchSubmit?.addEventListener('click', initiateSearch);

        // ── Event: ปุ่มค้นหาใน filter panel ──
        filterApplyBtn?.addEventListener('click', initiateSearch);

        // ── Event: ล้างค่า ──
        filterResetBtn?.addEventListener('click', () => {
            navSearchInput.value = '';
            const fc = document.getElementById('filter-category');
            const ft = document.getElementById('filter-type');
            const fdt = document.getElementById('filter-disability-type');
            const fdl = document.getElementById('filter-disability-level');
            if (fc) fc.value = '';
            if (ft) ft.value = '';
            if (fdt) { fdt.value = ''; }
            if (fdl) { fdl.innerHTML = '<option value="">กรุณาเลือกประเภทก่อน</option>'; fdl.disabled = true; }

            // เคลียร์ URL History
            window.history.replaceState({}, '', window.location.pathname);
            if (searchResultsSec) searchResultsSec.style.display = 'none';
        });

        // ── Event: ปุ่มปิดผลลัพธ์ ──
        searchResultsClose?.addEventListener('click', () => {
            if (searchResultsSec) searchResultsSec.style.display = 'none';
            window.history.replaceState({}, '', window.location.pathname); // เคลียร์ URL History เพื่อไม่ให้โหลดอัตโนมัติรอบหน้า
        });
    }

    const empTrack = document.querySelector('.employer-track');
    if (empTrack) {
        const empCards = empTrack.querySelectorAll('.employer-card');
        let empIndex = 0;
        const getEmpCardWidth = () => {
            const card = empCards[0];
            if (!card) return 0;
            const gap = parseFloat(getComputedStyle(empTrack).gap) || 32;
            return card.offsetWidth + gap;
        };
        const updateEmpSlider = () => {
            const maxIndex = Math.max(0, empCards.length - 1);
            empIndex = Math.max(0, Math.min(empIndex, maxIndex));
            empTrack.style.transform = `translateX(-${empIndex * getEmpCardWidth()}px)`;
        };
        document.querySelector('.next-employer-btn')?.addEventListener('click', () => {
            empIndex = (empIndex + 1 >= empCards.length) ? 0 : empIndex + 1;
            updateEmpSlider();
        });
        document.querySelector('.prev-employer-btn')?.addEventListener('click', () => {
            empIndex = (empIndex - 1 < 0) ? empCards.length - 1 : empIndex - 1;
            updateEmpSlider();
        });
    }

    // ==========================================
    // --- 5. ควบคุมปุ่มดูรหัสผ่าน (Toggle Password) ---
    // ==========================================
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function () {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.querySelector('svg').innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
                input.type = 'password';
                this.querySelector('svg').innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
        });
    });

    // ==========================================
    // --- 6. ควบคุมฟอร์ม สมัครสมาชิก/เข้าสู่ระบบ ---
    // ==========================================
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                first_name: document.getElementById('reg-firstname')?.value || '',
                last_name: document.getElementById('reg-lastname')?.value || '',
                phone: document.getElementById('reg-phone')?.value || '',
                email: document.getElementById('reg-email')?.value || '',
                password: document.getElementById('reg-password')?.value || ''
            };
            try {
                const res = await fetch('/api/register/seeker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await res.json();
                if (result.success) {
                    // ✅ Auto-login: บันทึก session แล้วไปหน้า home โดยตรง ไม่ต้อง login ซ้ำ
                    sessionStorage.setItem('userName', result.user.name);
                    sessionStorage.setItem('userId', result.user.id);
                    sessionStorage.setItem('userType', 'seeker');
                    announce('สมัครสมาชิกสำเร็จ กำลังพาไปหน้าหลัก');
                    const modal = document.getElementById('success-modal');
                    if (modal) {
                        modal.style.display = 'flex';
                        modal.focus && modal.focus();
                        const h3 = modal.querySelector('h3');
                        if (h3) h3.textContent = 'สมัครสมาชิกสำเร็จ! กำลังพาไปหน้าหลัก...';
                    }
                    setTimeout(() => { window.location.href = 'home-jobseeker.html'; }, 1500);
                } else {
                    announce('เกิดข้อผิดพลาด ' + (result.error || result.message));
                    alert("❌ " + (result.error || result.message));
                }
            } catch (err) { announce('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); alert("⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
        });
        document.getElementById('success-modal')?.addEventListener('click', (e) => { if (e.target.id === 'success-modal') e.target.style.display = 'none'; });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: document.getElementById('login-email').value,
                        password: document.getElementById('login-password').value,
                        type: 'seeker'
                    })
                });
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem('userName', data.user.name);
                    sessionStorage.setItem('userId', data.user.id);
                    sessionStorage.setItem('userType', 'seeker');
                    announce('เข้าสู่ระบบสำเร็จ กำลังพาไปหน้าหลัก');
                    window.location.href = 'home-jobseeker.html';
                } else {
                    announce('เข้าสู่ระบบไม่สำเร็จ ' + (data.message || data.error));
                    alert("❌ " + (data.message || data.error));
                }
            } catch (error) { announce('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); alert("⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
        });
    }

    // ── Tax ID Validation Helper ──
    function validateTaxId(value) {
        return /^\d{13}$/.test(value.trim());
    }
    function setTaxFieldState(input, errorEl, isValid) {
        if (isValid) {
            input.classList.remove('input-error');
            input.classList.add('input-success');
            if (errorEl) errorEl.style.display = 'none';
        } else {
            input.classList.remove('input-success');
            input.classList.add('input-error');
            if (errorEl) errorEl.style.display = 'block';
        }
    }

    // Real-time validation on tax input (register form)
    const taxInput = document.getElementById('emp-reg-tax');
    const taxError = document.getElementById('tax-error');
    if (taxInput) {
        taxInput.addEventListener('input', () => {
            // allow digits only while typing
            taxInput.value = taxInput.value.replace(/\D/g, '');
            if (taxInput.value.length === 0) {
                taxInput.classList.remove('input-error', 'input-success');
                if (taxError) taxError.style.display = 'none';
            } else {
                setTaxFieldState(taxInput, taxError, validateTaxId(taxInput.value));
            }
        });
        taxInput.addEventListener('blur', () => {
            if (taxInput.value.length > 0) {
                setTaxFieldState(taxInput, taxError, validateTaxId(taxInput.value));
            }
        });
    }

    const empRegisterForm = document.getElementById('employer-register-form');
    if (empRegisterForm) {
        empRegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Validate tax ID before submit
            const taxVal = document.getElementById('emp-reg-tax')?.value || '';
            if (!validateTaxId(taxVal)) {
                setTaxFieldState(
                    document.getElementById('emp-reg-tax'),
                    document.getElementById('tax-error'),
                    false
                );
                document.getElementById('emp-reg-tax')?.focus();
                return;
            }
            const data = {
                company_name: document.getElementById('emp-reg-company').value,
                phone: document.getElementById('emp-reg-phone').value,
                email: document.getElementById('emp-reg-email').value,
                address: document.getElementById('emp-reg-address').value,
                tax_id: document.getElementById('emp-reg-tax').value,
                password: document.getElementById('emp-reg-password').value
            };
            try {
                const res = await fetch('/api/register/employer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const result = await res.json();
                if (result.success) {
                    // ✅ Auto-login: บันทึก session แล้วไปหน้า home โดยตรง ไม่ต้อง login ซ้ำ
                    sessionStorage.setItem('userName', result.user.name);
                    sessionStorage.setItem('userId', result.user.id);
                    sessionStorage.setItem('userType', 'employer');
                    announce('สมัครสมาชิกสำเร็จ กำลังพาไปหน้าหลัก');
                    const modal = document.getElementById('employer-success-modal');
                    if (modal) {
                        modal.style.display = 'flex';
                        modal.focus && modal.focus();
                        const h3 = modal.querySelector('h3');
                        if (h3) h3.textContent = 'สมัครสมาชิกสำเร็จ! กำลังพาไปหน้าหลัก...';
                    }
                    setTimeout(() => { window.location.href = 'home-employer.html'; }, 1500);
                } else {
                    announce('เกิดข้อผิดพลาด ' + (result.error || result.message));
                    alert("❌ " + (result.error || result.message));
                }
            } catch (err) { announce('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); alert("⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
        });
        document.getElementById('employer-success-modal')?.addEventListener('click', (e) => { if (e.target.id === 'employer-success-modal') e.target.style.display = 'none'; });
    }

    const empLoginForm = document.getElementById('employer-login-form');
    if (empLoginForm) {
        empLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: document.getElementById('emp-login-email').value,
                        password: document.getElementById('emp-login-password').value,
                        type: 'employer'
                    })
                });
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem('userName', data.user.name);
                    sessionStorage.setItem('userId', data.user.id);
                    sessionStorage.setItem('userType', 'employer');
                    announce('เข้าสู่ระบบสำเร็จ กำลังพาไปหน้าหลัก');
                    window.location.href = 'home-employer.html';
                } else {
                    announce('เข้าสู่ระบบไม่สำเร็จ ' + data.message);
                    alert("❌ " + data.message);
                }
            } catch (error) { announce('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); alert("⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
        });
    }

    // ==========================================
    // 🌟 6.5 GOOGLE SIGN UP / SIGN IN
    // ==========================================
    (function initGoogleAuth() {
        // โหลด Google Identity Services เฉพาะหน้าที่มีปุ่ม Google
        const hasGoogleBtn = document.getElementById('btn-google-signup-seeker')
            || document.getElementById('btn-google-login-seeker')
            || document.getElementById('btn-google-signup-employer')
            || document.getElementById('btn-google-login-employer');
        if (!hasGoogleBtn) return;

        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        gsiScript.defer = true;
        gsiScript.onload = setupGoogleButtons;
        document.head.appendChild(gsiScript);

        function setupGoogleButtons() {
            const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || '';
            if (!GOOGLE_CLIENT_ID) {
                console.warn('GOOGLE_CLIENT_ID ไม่ได้ตั้งค่า — ตรวจสอบ window.GOOGLE_CLIENT_ID ใน HTML');
                return;
            }

            // ── helper: loading state ──
            function setLoading(btn, loading) {
                if (!btn) return;
                btn.disabled = loading;
                btn.setAttribute('aria-busy', loading ? 'true' : 'false');
                if (loading) {
                    btn.innerText = 'กำลังดำเนินการ...';
                } else {
                    btn.innerHTML = btn.dataset.origHtml || btn.innerText;
                }
            }

            // ── Direct OAuth2 Popup (ไม่ใช้ GIS library — เสถียรที่สุด) ──
            // หน้า google-callback.html รับ access_token แล้วส่งกลับผ่าน postMessage
            function triggerGoogle(btn, handler) {
                setLoading(btn, true);

                // คำนวณ callback URL จาก path ปัจจุบัน (ใช้งานได้ทุก environment)
                const basePath = window.location.origin
                    + window.location.pathname.replace(/[^\/]*$/, '');
                const callbackUrl = basePath + 'google-callback.html';

                const params = new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    redirect_uri: callbackUrl,
                    response_type: 'token',
                    scope: 'email profile',
                    prompt: 'select_account',
                });

                const popup = window.open(
                    'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString(),
                    'google-login',
                    'width=520,height=640,top=100,left=200,scrollbars=yes'
                );

                if (!popup || popup.closed) {
                    setLoading(btn, false);
                    alert('กรุณาอนุญาต popup ในเบราว์เซอร์แล้วลองใหม่');
                    return;
                }

                // ล้าง result เก่าก่อนเปิด popup
                localStorage.removeItem('_google_oauth_result');

                // Poll localStorage ทุก 500ms — ไม่ต้องพึ่ง window.opener
                const pollTimer = setInterval(() => {
                    const raw = localStorage.getItem('_google_oauth_result');
                    if (raw) {
                        clearInterval(pollTimer);
                        localStorage.removeItem('_google_oauth_result');
                        try {
                            const result = JSON.parse(raw);
                            if (result.access_token) {
                                handler(result.access_token, btn);
                            } else {
                                setLoading(btn, false);
                                if (result.error && result.error !== 'access_denied') {
                                    announce('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
                                }
                            }
                        } catch (e) {
                            setLoading(btn, false);
                        }
                        return;
                    }
                    // ถ้า popup ปิดแล้วแต่ยังไม่มีผลลัพธ์ → ผู้ใช้ปิดเอง
                    try {
                        if (popup.closed) {
                            clearInterval(pollTimer);
                            setLoading(btn, false);
                        }
                    } catch (e) {
                        clearInterval(pollTimer);
                        setLoading(btn, false);
                    }
                }, 500);
            }

            // ── SEEKER: ปุ่มสมัคร ──
            const btnSignupSeeker = document.getElementById('btn-google-signup-seeker');
            if (btnSignupSeeker) {
                btnSignupSeeker.dataset.origHtml = btnSignupSeeker.innerHTML;
                btnSignupSeeker.addEventListener('click', () => triggerGoogle(btnSignupSeeker, handleGoogleSeeker));
            }

            // ── SEEKER: ปุ่มเข้าสู่ระบบ ──
            const btnLoginSeeker = document.getElementById('btn-google-login-seeker');
            if (btnLoginSeeker) {
                btnLoginSeeker.dataset.origHtml = btnLoginSeeker.innerHTML;
                btnLoginSeeker.addEventListener('click', () => triggerGoogle(btnLoginSeeker, handleGoogleSeeker));
            }

            // ── EMPLOYER: ปุ่มสมัคร ──
            const btnSignupEmployer = document.getElementById('btn-google-signup-employer');
            if (btnSignupEmployer) {
                btnSignupEmployer.dataset.origHtml = btnSignupEmployer.innerHTML;
                btnSignupEmployer.addEventListener('click', () => triggerGoogle(btnSignupEmployer, handleGoogleEmployer));
            }

            // ── EMPLOYER: ปุ่มเข้าสู่ระบบ ──
            const btnLoginEmployer = document.getElementById('btn-google-login-employer');
            if (btnLoginEmployer) {
                btnLoginEmployer.dataset.origHtml = btnLoginEmployer.innerHTML;
                btnLoginEmployer.addEventListener('click', () => triggerGoogle(btnLoginEmployer, handleGoogleEmployer));
            }
        }

        // ── ผู้หางาน: ส่ง access_token ไปยังเซิร์ฟเวอร์ ──
        async function handleGoogleSeeker(access_token, btn) {
            try {
                const res = await fetch('/api/auth/google/seeker', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token })
                });
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem('userName', data.user.name);
                    sessionStorage.setItem('userId', data.user.id);
                    sessionStorage.setItem('userType', 'seeker');
                    const msg = data.isNewUser ? 'สมัครสมาชิกด้วย Google สำเร็จ!' : 'เข้าสู่ระบบด้วย Google สำเร็จ!';
                    announce(msg + ' กำลังพาไปหน้าหลัก');
                    window.location.href = 'home-jobseeker.html';
                } else {
                    announce('เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้'));
                    alert('❌ ' + (data.error || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้'));
                    if (btn) { btn.disabled = false; btn.setAttribute('aria-busy', 'false'); btn.innerHTML = btn.dataset.origHtml; }
                }
            } catch (err) {
                announce('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
                alert('⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
                if (btn) { btn.disabled = false; btn.setAttribute('aria-busy', 'false'); btn.innerHTML = btn.dataset.origHtml; }
            }
        }

        // ── นายจ้าง: ส่ง access_token ไปยังเซิร์ฟเวอร์ ──
        async function handleGoogleEmployer(access_token, btn) {
            try {
                const res = await fetch('/api/auth/google/employer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token })
                });
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem('userName', data.user.name);
                    sessionStorage.setItem('userId', data.user.id);
                    sessionStorage.setItem('userType', 'employer');

                    if (data.needsProfileCompletion) {
                        sessionStorage.setItem('pendingEmployerData', JSON.stringify({
                            id: data.user.id,
                            name: data.user.name,
                            email: data.user.email || ''
                        }));
                        announce('สมัครสมาชิกด้วย Google สำเร็จ กรุณากรอกข้อมูลบริษัทเพิ่มเติม');
                        window.location.href = 'complete-employer-profile.html';
                    } else {
                        announce('เข้าสู่ระบบด้วย Google สำเร็จ! กำลังพาไปหน้าหลัก');
                        window.location.href = 'home-employer.html';
                    }
                } else {
                    announce('เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้'));
                    alert('❌ ' + (data.error || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้'));
                    if (btn) { btn.disabled = false; btn.setAttribute('aria-busy', 'false'); btn.innerHTML = btn.dataset.origHtml; }
                }
            } catch (err) {
                announce('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
                alert('⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
                if (btn) { btn.disabled = false; btn.setAttribute('aria-busy', 'false'); btn.innerHTML = btn.dataset.origHtml; }
            }
        }
    })();

    // ── complete-employer-profile.html: Pre-fill + Submit ──
    const completeProfileForm = document.getElementById('complete-employer-profile-form');
    if (completeProfileForm) {
        const pending = JSON.parse(sessionStorage.getItem('pendingEmployerData') || 'null');
        if (!pending) {
            // ไม่มีข้อมูล pending → redirect กลับ
            window.location.href = 'login-employer.html';
        } else {
            // Pre-fill read-only fields
            const nameEl  = document.getElementById('complete-emp-name');
            const emailEl = document.getElementById('complete-emp-email');
            if (nameEl)  nameEl.value  = pending.name  || '';
            if (emailEl) emailEl.value = pending.email || '';
        }

        // Real-time validation on complete-profile tax input
        const cTaxInputEl = document.getElementById('complete-emp-tax');
        const cTaxErrorEl = document.getElementById('complete-tax-error');
        if (cTaxInputEl) {
            cTaxInputEl.addEventListener('input', () => {
                cTaxInputEl.value = cTaxInputEl.value.replace(/\D/g, '');
                if (cTaxInputEl.value.length === 0) {
                    cTaxInputEl.classList.remove('input-error', 'input-success');
                    if (cTaxErrorEl) cTaxErrorEl.style.display = 'none';
                } else {
                    setTaxFieldState(cTaxInputEl, cTaxErrorEl, validateTaxId(cTaxInputEl.value));
                }
            });
            cTaxInputEl.addEventListener('blur', () => {
                if (cTaxInputEl.value.length > 0)
                    setTaxFieldState(cTaxInputEl, cTaxErrorEl, validateTaxId(cTaxInputEl.value));
            });
        }

        completeProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorEl = document.getElementById('complete-profile-error');
            const submitBtn = document.getElementById('btn-complete-profile');

            const company = document.getElementById('complete-emp-company')?.value.trim();
            const phone   = document.getElementById('complete-emp-phone')?.value.trim();
            const address = document.getElementById('complete-emp-address')?.value.trim();
            const tax_id  = document.getElementById('complete-emp-tax')?.value.trim();

            if (!company || !phone || !address || !tax_id) {
                if (errorEl) { errorEl.textContent = 'กรุณากรอกข้อมูลให้ครบทุกช่อง'; errorEl.style.display = 'block'; }
                announce('กรุณากรอกข้อมูลให้ครบทุกช่อง');
                return;
            }
            if (!validateTaxId(tax_id)) {
                const cTaxInput = document.getElementById('complete-emp-tax');
                const cTaxError = document.getElementById('complete-tax-error');
                if (cTaxInput) setTaxFieldState(cTaxInput, cTaxError, false);
                if (errorEl) { errorEl.textContent = 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก'; errorEl.style.display = 'block'; }
                cTaxInput?.focus();
                return;
            }

            if (submitBtn) submitBtn.disabled = true;
            try {
                const pData = JSON.parse(sessionStorage.getItem('pendingEmployerData') || '{}');
                const res = await fetch('/api/employer/complete-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employer_id: pData.id,
                        company_name: company,
                        phone, address, tax_id
                    })
                });
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem('userName', company);
                    sessionStorage.removeItem('pendingEmployerData');
                    announce('บันทึกข้อมูลบริษัทสำเร็จ กำลังพาไปหน้าหลัก');
                    window.location.href = 'home-employer.html';
                } else {
                    if (errorEl) { errorEl.textContent = data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่'; errorEl.style.display = 'block'; }
                    announce('เกิดข้อผิดพลาด: ' + (data.error || ''));
                    if (submitBtn) submitBtn.disabled = false;
                }
            } catch (err) {
                if (errorEl) { errorEl.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่'; errorEl.style.display = 'block'; }
                announce('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // 🌟 7. ระบบโปรไฟล์ผู้ใช้งาน (อัปเดตระบบลบและโหลด PDF)
    // ==========================================
    const profileArea = document.getElementById('profile-content-area');
    if (profileArea && loggedInId) {
        if (loggedInType === 'seeker') {
            fetch(`/api/get-resume/${loggedInId}`).then(res => res.json()).then(data => {
                if (data && data.first_name) {
                    const setEl = (id, text) => { if (document.getElementById(id)) document.getElementById(id).textContent = text; };

                    setEl('prof-name', data.first_name + ' ' + data.last_name);
                    setEl('prof-email', data.email);
                    setEl('prof-phone', data.phone);

                    const profAddress = document.getElementById('prof-address');
                    if (profAddress) {
                        if (data.address && data.address.trim() !== '') {
                            profAddress.textContent = `${data.address || ''} ${data.sub_district || ''} ${data.district || ''} ${data.province || ''} ${data.zipcode || ''}`.trim();
                            profAddress.style.color = '#4B5563';
                            profAddress.style.fontStyle = 'normal';
                        } else {
                            profAddress.textContent = 'ยังไม่ได้ระบุที่อยู่ (กรุณาสร้างเรซูเม่เพื่ออัปเดตข้อมูล)';
                            profAddress.style.color = '#94A3B8';
                            profAddress.style.fontStyle = 'italic';
                        }
                    }

                    const seekerResumeSection = document.getElementById('seeker-resume-section');
                    if (seekerResumeSection) {
                        if (data.selected_template || (data.address && data.address.trim() !== '')) {
                            seekerResumeSection.style.display = 'block';

                            const fileNameEl = document.getElementById('resume-file-name');
                            if (fileNameEl) {
                                fileNameEl.textContent = data.first_name + ' ' + data.last_name;
                            }

                            let dateText = '-';
                            if (data.updated_at || data.created_at) {
                                const d = new Date(data.updated_at || data.created_at);
                                dateText = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear() + 543}`;
                            } else {
                                const d = new Date();
                                dateText = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear() + 543}`;
                            }
                            setEl('resume-file-date', `${dateText}`);

                            const fileMenuBtn = document.querySelector('.file-menu-btn');
                            const actionDropdown = document.querySelector('.action-dropdown');
                            const btnDownload = document.getElementById('btn-download-pdf');
                            const btnDelete = document.getElementById('btn-delete-resume');

                            if (fileMenuBtn && actionDropdown) {
                                fileMenuBtn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const isExpanded = fileMenuBtn.getAttribute('aria-expanded') === 'true';
                                    fileMenuBtn.setAttribute('aria-expanded', !isExpanded);
                                    actionDropdown.classList.toggle('show');
                                });
                                document.addEventListener('click', () => {
                                    fileMenuBtn.setAttribute('aria-expanded', 'false');
                                    actionDropdown.classList.remove('show');
                                });
                            }

                            if (btnDownload) {
                                btnDownload.addEventListener('click', () => {
                                    const resumePrintArea = document.getElementById('resume-print-area');
                                    if (!resumePrintArea) return;

                                    const theme = data.selected_template || 'minimal';
                                    const templateSource = document.getElementById(`tpl-${theme}`);
                                    if (!templateSource) {
                                        alert('⚠️ ไม่พบ template เรซูเม่');
                                        return;
                                    }

                                    // Clone + render ข้อมูลจริงลง template (CSS โหลดอยู่แล้วในหน้า)
                                    const clone = templateSource.cloneNode(true);
                                    clone.classList.add('active');

                                    // ตรวจสอบว่า clone มี template class หรือไม่ — ถ้าไม่มีให้ copy จาก source
                                    const tplClasses = ['tpl-minimal', 'tpl-modern', 'tpl-vintage', 'tpl-bright'];
                                    const hasTPLClass = tplClasses.some(c => clone.classList.contains(c));
                                    if (!hasTPLClass) {
                                        tplClasses.forEach(c => {
                                            if (templateSource.classList.contains(c)) clone.classList.add(c);
                                        });
                                    }

                                    renderRealDataToTemplate(clone, data);

                                    // ใส่ลงใน #resume-print-area แล้วแสดง
                                    resumePrintArea.innerHTML = '';
                                    resumePrintArea.appendChild(clone);
                                    resumePrintArea.style.display = 'block';

                                    // บังคับ min-height เป็น A4 ก่อน print เพื่อให้เต็มหน้าพอดี
                                    const printArea = document.getElementById('resume-print-area');
                                    printArea.style.minHeight = '297mm';

                                    // เพิ่ม .printing class ที่ body เพื่อให้ @media print แสดงแค่ #resume-print-area
                                    document.body.classList.add('printing');

                                    // delay 100ms ให้ browser repaint ก่อนเปิด print dialog
                                    setTimeout(() => window.print(), 100);

                                    // หลัง print dialog ปิด → ล้าง state กลับสู่สภาพเดิม
                                    window.onafterprint = () => {
                                        document.body.classList.remove('printing');
                                        resumePrintArea.style.display = 'none';
                                        resumePrintArea.innerHTML = '';
                                        window.onafterprint = null;
                                    };
                                });
                            }

                            if (btnDelete) {
                                const deleteModal = document.getElementById('delete-confirm-modal');
                                const btnConfirmDel = document.getElementById('btn-confirm-delete');
                                const btnCancelDel = document.getElementById('btn-cancel-delete');

                                // เปิด modal เมื่อกดปุ่มลบ
                                btnDelete.addEventListener('click', () => {
                                    if (deleteModal) deleteModal.style.display = 'flex';
                                });

                                // ปิด modal เมื่อกด "ไม่ใช่"
                                if (btnCancelDel) {
                                    btnCancelDel.addEventListener('click', () => {
                                        if (deleteModal) deleteModal.style.display = 'none';
                                    });
                                }

                                // ปิด modal เมื่อกดนอก modal box
                                if (deleteModal) {
                                    deleteModal.addEventListener('click', (e) => {
                                        if (e.target === deleteModal) deleteModal.style.display = 'none';
                                    });
                                }

                                // ยืนยันลบ — ทำการลบจริง
                                if (btnConfirmDel) {
                                    btnConfirmDel.addEventListener('click', async () => {
                                        if (deleteModal) deleteModal.style.display = 'none';
                                        try {
                                            const res = await fetch(`/api/delete-resume/${loggedInId}`, { method: 'DELETE' });
                                            const result = await res.json();
                                            if (result.success) {
                                                sessionStorage.removeItem('tempResumeData');
                                                window.location.reload();
                                            } else {
                                                alert('❌ ' + result.message);
                                            }
                                        } catch (error) {
                                            alert('⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
                                        }
                                    });
                                }
                            }

                        } else {
                            seekerResumeSection.style.display = 'none';
                        }
                    }
                }
            }).catch(err => console.error("Error loading profile:", err));

        } else if (loggedInType === 'employer') {
            fetch(`/api/get-employer/${loggedInId}`).then(res => res.json()).then(data => {
                if (data && data.company_name) {
                    const setEl = (id, text) => { if (document.getElementById(id)) document.getElementById(id).textContent = text; };
                    setEl('prof-name', data.company_name);
                    setEl('prof-email', data.email);
                    setEl('prof-phone', data.phone);
                    setEl('prof-address', data.address || 'ยังไม่ได้ระบุที่อยู่');
                }
            }).catch(err => console.error("Error loading employer profile:", err));

            // ── โหลด Subscription + Jobs พร้อมกัน (เพื่อให้รู้ subscription_plan ก่อน render dropdown) ──
            (async function loadEmployerDashboard() {
                const subDisplay = document.getElementById('sub-plan-display');
                const empJobsSection = document.getElementById('employer-jobs-section');
                const empJobsList = document.getElementById('employer-jobs-list');

                let subPlan = null; // จะเก็บค่า subscription_plan เพื่อใช้แสดงปุ่มต่ออายุ

                // ── โหลดข้อมูล Subscription ──
                if (subDisplay) {
                    try {
                        const res = await fetch(`/api/employer-subscription/${loggedInId}`);
                        const data = await res.json();
                        subPlan = data.subscription_plan;

                        const now = new Date();
                        const expiry = data.subscription_expires_at ? new Date(data.subscription_expires_at) : null;
                        const isExpired = expiry && expiry <= now;
                        const fmtDate = (d) => d ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

                        let html = '';
                        if (data.is_free_trial) {
                            const remaining = Math.max(0, 30 - (data.account_age_days || 0));
                            html = `Free Trial — ใช้ไปแล้ว <strong>${data.post_count}/3</strong> โพสต์ &nbsp;·&nbsp; เหลืออีก <strong>${remaining} วัน</strong>`;
                        } else if (data.subscription_plan === 'pay_per_post') {
                            html = isExpired
                                ? `Pay Per Post — <span style="color:#ef4444; font-weight:600;">หมดอายุแล้ว (${fmtDate(expiry)})</span>`
                                : `Pay Per Post — หมดอายุ ${fmtDate(expiry)}`;
                        } else if (data.subscription_plan === 'monthly') {
                            html = isExpired
                                ? `รายเดือน — <span style="color:#ef4444; font-weight:600;">หมดอายุแล้ว (${fmtDate(expiry)})</span>`
                                : `รายเดือน — หมดอายุ ${fmtDate(expiry)} <span class="sub-badge sub-badge--inclusive">Inclusive Employer</span>`;
                        } else if (data.subscription_plan === 'yearly') {
                            html = isExpired
                                ? `รายปี — <span style="color:#ef4444; font-weight:600;">หมดอายุแล้ว (${fmtDate(expiry)})</span>`
                                : `รายปี — หมดอายุ ${fmtDate(expiry)} <span class="sub-badge sub-badge--verified">Verified Inclusive Employer</span>`;
                        } else {
                            html = '<span style="color:#94a3b8;">ไม่มีแพ็คเกจที่ใช้งานอยู่</span>';
                        }
                        if (isExpired || (!data.is_free_trial && !data.subscription_plan)) {
                            html += ` &nbsp;<a href="payment.html" class="renewal-link">ต่ออายุแพ็คเกจ →</a>`;
                        }
                        subDisplay.innerHTML = html;
                    } catch (err) {
                        console.error('Error loading subscription info:', err);
                        subDisplay.textContent = 'ไม่สามารถโหลดข้อมูลแพ็คเกจได้';
                    }
                }

                // ── โหลดรายการโพสต์งาน ──
                if (empJobsSection && empJobsList) {
                    fetch('/api/jobs/expire-check', { method: 'POST' }).catch(() => { });

                    // ── helper: custom confirm dialog (ใช้ modal ใน profile-em.html) ──
                    const showConfirm = (message) => new Promise(resolve => {
                        const modal = document.getElementById('confirm-modal');
                        const textEl = document.getElementById('confirm-modal-text');
                        const btnYes = document.getElementById('confirm-btn-yes');
                        const btnNo = document.getElementById('confirm-btn-no');
                        if (!modal) { resolve(window.confirm(message)); return; }
                        textEl.textContent = message;
                        modal.style.display = 'flex';
                        const done = (val) => {
                            modal.style.display = 'none';
                            btnYes.removeEventListener('click', onYes);
                            btnNo.removeEventListener('click', onNo);
                            resolve(val);
                        };
                        const onYes = () => done(true);
                        const onNo = () => done(false);
                        btnYes.addEventListener('click', onYes);
                        btnNo.addEventListener('click', onNo);
                    });

                    try {
                        const res = await fetch(`/api/get-employer-jobs/${loggedInId}`);
                        const jobs = await res.json();

                        if (jobs.length > 0) {
                            empJobsSection.style.display = 'block';

                            // ── ฟังก์ชัน helper สร้าง card HTML ──
                            const buildJobCard = (job) => {
                                let statusText = 'เปิดรับสมัคร';
                                let statusColor = '#059669';
                                let expiredBadgeHtml = '';
                                let closedBadgeHtml = '';

                                if (job.status === 'expired') {
                                    statusText = 'หมดอายุแล้ว';
                                    statusColor = '#ef4444';
                                    expiredBadgeHtml = '<span class="expired-badge" aria-label="โพสต์หมดอายุ">หมดอายุแล้ว</span>';
                                } else if (job.status === 'closed') {
                                    statusText = 'ปิดรับสมัคร';
                                    statusColor = '#6B7280';
                                    closedBadgeHtml = '<span class="closed-badge" aria-label="ปิดรับแล้ว">ปิดรับแล้ว</span>';
                                } else if (job.status !== 'open') {
                                    statusText = 'ปิดรับสมัคร';
                                    statusColor = '#6B7280';
                                }

                                let expiryHtml = '';
                                let nearingBadge = '';
                                if (job.expires_at) {
                                    const expDate = new Date(job.expires_at);
                                    const nowD = new Date();
                                    const diffDays = Math.ceil((expDate - nowD) / (1000 * 60 * 60 * 24));
                                    const expStr = expDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });

                                    if (diffDays <= 3) {
                                        // แสดงข้อความต่ออายุสำหรับโพสต์ที่ใกล้หมดหรือหมดอายุแล้ว
                                        const dayLabel = diffDays > 0
                                            ? `หมดอายุ ${expStr} — เหลืออีก ${diffDays} วัน`
                                            : `หมดอายุ ${expStr}`;
                                        if (diffDays > 0) {
                                            nearingBadge = `<span class="nearing-badge" aria-label="โพสต์ใกล้หมดอายุ">ใกล้หมดอายุ</span>`;
                                        }
                                        expiryHtml = `
                                        <div class="file-expiry" data-expiry style="color:${diffDays > 0 ? '#f59e0b' : '#ef4444'};">
                                            ${dayLabel}
                                            <span class="renew-prompt" data-renew-id="${job.id}">
                                                ต้องการต่ออายุโพสต์หรือไม่?
                                                <button type="button" class="renew-inline-yes" data-job-id="${job.id}" aria-label="ต่ออายุโพสต์">ใช่</button>
                                                <button type="button" class="renew-inline-no" data-renew-id="${job.id}" aria-label="ไม่ต่ออายุ">ไม่ใช่</button>
                                            </span>
                                        </div>`;
                                    } else {
                                        expiryHtml = `<div class="file-expiry" data-expiry style="color:#64748b;">หมดอายุ ${expStr}</div>`;
                                    }
                                }

                                const isClosedAlready = job.status === 'closed' || job.status === 'expired';
                                return `
                                <div class="file-item employer-item${job.status === 'expired' ? ' job-expired' : ''}" data-job-id="${job.id}">
                                    <div style="flex:1; min-width:0;">
                                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                            <a href="post-employer2.html?jobId=${job.id}" class="file-name">${job.job_title}</a>
                                            ${expiredBadgeHtml}${closedBadgeHtml}${nearingBadge}
                                        </div>
                                        <div class="file-date" data-status style="color:${statusColor}; margin-top:2px;">สถานะ: ${statusText}</div>
                                        ${expiryHtml}
                                    </div>
                                    <div class="action-menu-container">
                                        <button class="file-menu-btn" aria-label="ตัวเลือกจัดการโพสต์" aria-haspopup="true" aria-expanded="false">
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                <circle cx="12" cy="12" r="1.5"></circle>
                                                <circle cx="19" cy="12" r="1.5"></circle>
                                                <circle cx="5" cy="12" r="1.5"></circle>
                                            </svg>
                                        </button>
                                        <ul class="action-dropdown" role="menu">
                                            <li role="none"><a role="menuitem" href="post-employer.html?edit=true&id=${job.id}" class="edit-action">แก้ไขโพสต์</a></li>
                                            ${!isClosedAlready ? `<li role="none"><button role="menuitem" class="btn-close-job" data-job-id="${job.id}" style="width:100%;text-align:left;padding:10px;background:none;border:none;cursor:pointer;color:#334155;">ปิดรับการสมัคร</button></li>` : ''}
                                            <li role="none"><button role="menuitem" class="btn-delete-job delete-action" data-job-id="${job.id}" style="width:100%;text-align:left;padding:10px;background:none;border:none;cursor:pointer;color:#ef4444;">ลบโพสต์</button></li>
                                        </ul>
                                    </div>
                                </div>`;
                            };

                            empJobsList.innerHTML = jobs.map(buildJobCard).join('');

                            // ── Event delegation สำหรับ dropdown + ปุ่มทั้งหมด ──
                            empJobsList.addEventListener('click', async (e) => {

                                // Toggle three-dot dropdown
                                const menuBtn = e.target.closest('.file-menu-btn');
                                if (menuBtn) {
                                    e.stopPropagation();
                                    const dropdown = menuBtn.closest('.action-menu-container').querySelector('.action-dropdown');
                                    const isOpen = dropdown.classList.contains('show');
                                    empJobsList.querySelectorAll('.action-dropdown.show').forEach(d => d.classList.remove('show'));
                                    empJobsList.querySelectorAll('.file-menu-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
                                    if (!isOpen) { dropdown.classList.add('show'); menuBtn.setAttribute('aria-expanded', 'true'); }
                                    return;
                                }

                                // ── ปิดรับการสมัคร (มี confirm dialog) ──
                                const closeBtn = e.target.closest('.btn-close-job');
                                if (closeBtn) {
                                    const jobId = closeBtn.dataset.jobId;
                                    const card = empJobsList.querySelector(`.file-item[data-job-id="${jobId}"]`);
                                    closeBtn.closest('.action-dropdown').classList.remove('show');
                                    const confirmed = await showConfirm('ต้องการปิดรับการสมัครโพสต์นี้ใช่หรือไม่?');
                                    if (!confirmed) return;
                                    try {
                                        const r = await fetch(`/api/jobs/${jobId}/status`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ status: 'closed' })
                                        });
                                        const result = await r.json();
                                        if (result.success) {
                                            const statusEl = card.querySelector('[data-status]');
                                            if (statusEl) { statusEl.style.color = '#6B7280'; statusEl.textContent = 'สถานะ: ปิดรับสมัคร'; }
                                            const titleRow = card.querySelector('[style*="display:flex"]');
                                            if (titleRow && !titleRow.querySelector('.closed-badge')) {
                                                const badge = document.createElement('span');
                                                badge.className = 'closed-badge';
                                                badge.setAttribute('aria-label', 'ปิดรับแล้ว');
                                                badge.textContent = 'ปิดรับแล้ว';
                                                titleRow.appendChild(badge);
                                            }
                                            closeBtn.closest('li')?.remove();
                                        } else { alert('❌ ' + result.error); }
                                    } catch { alert('⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
                                    return;
                                }

                                // ── ลบโพสต์ (มี confirm dialog) ──
                                const deleteBtn = e.target.closest('.btn-delete-job');
                                if (deleteBtn) {
                                    const jobId = deleteBtn.dataset.jobId;
                                    deleteBtn.closest('.action-dropdown').classList.remove('show');
                                    const confirmed = await showConfirm('ต้องการลบโพสต์นี้ใช่หรือไม่?\nการลบไม่สามารถย้อนกลับได้');
                                    if (!confirmed) return;
                                    try {
                                        const r = await fetch(`/api/jobs/${jobId}`, {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ employer_id: loggedInId })
                                        });
                                        const result = await r.json();
                                        if (result.success) {
                                            empJobsList.querySelector(`.file-item[data-job-id="${jobId}"]`)?.remove();
                                            if (!empJobsList.querySelector('.file-item')) empJobsSection.style.display = 'none';
                                        } else { alert('❌ ' + result.error); }
                                    } catch { alert('⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
                                    return;
                                }

                                // ── ต่ออายุโพสต์ (กด "ใช่" ใน inline prompt) ──
                                const renewYes = e.target.closest('.renew-inline-yes');
                                if (renewYes) {
                                    const jobId = renewYes.dataset.jobId;
                                    const card = empJobsList.querySelector(`.file-item[data-job-id="${jobId}"]`);
                                    try {
                                        const r = await fetch(`/api/jobs/${jobId}/renew`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ employer_id: loggedInId })
                                        });
                                        const result = await r.json();
                                        if (result.success) {
                                            const newExp = new Date(result.expires_at);
                                            const expStr = newExp.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                            const expiryEl = card.querySelector('[data-expiry]');
                                            if (expiryEl) { expiryEl.style.color = '#64748b'; expiryEl.textContent = `หมดอายุ ${expStr}`; }
                                            card.querySelector('.expired-badge')?.remove();
                                            card.querySelector('.nearing-badge')?.remove();
                                            card.classList.remove('job-expired');
                                            const statusEl = card.querySelector('[data-status]');
                                            if (statusEl) { statusEl.style.color = '#059669'; statusEl.textContent = 'สถานะ: เปิดรับสมัคร'; }
                                        } else { alert('❌ ' + result.error); }
                                    } catch { alert('⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
                                    return;
                                }

                                // ── ซ่อน inline prompt เมื่อกด "ไม่ใช่" ──
                                const renewNo = e.target.closest('.renew-inline-no');
                                if (renewNo) {
                                    const prompt = renewNo.closest('.renew-prompt');
                                    if (prompt) prompt.style.display = 'none';
                                    return;
                                }
                            });

                            // ── ปิด dropdown เมื่อคลิกนอก ──
                            document.addEventListener('click', () => {
                                empJobsList.querySelectorAll('.action-dropdown.show').forEach(d => d.classList.remove('show'));
                                empJobsList.querySelectorAll('.file-menu-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
                            });

                        } else {
                            empJobsSection.style.display = 'none';
                        }
                    } catch (err) {
                        console.error("Error loading employer jobs:", err);
                    }
                }

                // ── อัปเดตตัวเลขแจ้งเตือน (Badge) ──
                const inboxBadge = document.getElementById('employer-inbox-badge');
                if (inboxBadge) {
                    fetch(`/api/employer-unread-count/${loggedInId}`)
                        .then(r => r.json())
                        .then(data => {
                            if (data.unread_count > 0) { inboxBadge.textContent = data.unread_count; inboxBadge.style.display = 'flex'; }
                            else { inboxBadge.style.display = 'none'; }
                        })
                        .catch(err => console.error("Error loading unread count:", err));
                }
            })();
        }
    }

    // ==========================================
    // 🌟 7.5 สถานะการสมัครงาน (profile-job.html) — ทำงานอิสระ ไม่ขึ้นกับ profileArea
    // ==========================================
    (async function loadApplicationStatus() {
        const statusSection = document.getElementById('application-status-section');
        const statusList = document.getElementById('application-status-list');
        if (!statusSection || !statusList) return;
        if (sessionStorage.getItem('userType') !== 'seeker') return;

        // ดึง seekerId ใหม่จาก sessionStorage โดยตรงตอน fetch เพื่อให้ได้ค่าล่าสุดเสมอ
        const seekerId = (sessionStorage.getItem('userId') || '').split(':')[0].trim();
        console.log('loggedInId =', seekerId);
        if (!seekerId) return;

        try {
            const res = await fetch(`/api/my-applications/${seekerId}`);
            const apps = await res.json();

            if (!Array.isArray(apps) || apps.length === 0) {
                statusSection.style.display = 'none';
                return;
            }

            statusSection.style.display = 'block';
            statusList.innerHTML = '';

            const STEPS = [
                { label: 'ส่งแล้ว' },
                { label: 'รอพิจารณา' },
                { label: 'ถูกเปิดดูแล้ว' },
                { label: 'ผล' },
            ];

            function activeStepFor(status) {
                if (status === 'viewed') return 3;
                if (status === 'approved' || status === 'rejected') return 4;
                return 2; // pending / default
            }

            apps.forEach(app => {
                const active = activeStepFor(app.status);
                const isApproved = app.status === 'approved';
                const isRejected = app.status === 'rejected';

                let dateStr = '';
                if (app.created_at) {
                    const d = new Date(app.created_at);
                    dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear() + 543}`;
                }

                let stepperHtml = `<div class="stepper-track" role="list">`;
                STEPS.forEach((step, i) => {
                    const num = i + 1;
                    const completed = num < active;
                    const isActive = num === active;
                    const isResult = num === 4 && isActive;

                    let nodeClass = 'stepper-node ';
                    let itemClass = 'stepper-step-item ';
                    let nodeText = num;
                    let labelExtra = '';

                    if (completed) {
                        nodeClass += 'step-completed'; itemClass += 'step-completed'; nodeText = '✓';
                    } else if (isResult && isApproved) {
                        nodeClass += 'step-approved'; itemClass += 'step-active-approved'; nodeText = '✓'; labelExtra = ' — ผ่าน';
                    } else if (isResult && isRejected) {
                        nodeClass += 'step-rejected'; itemClass += 'step-active-rejected'; nodeText = '✕'; labelExtra = ' — ไม่ผ่าน';
                    } else if (isActive) {
                        nodeClass += 'step-active'; itemClass += 'step-active';
                    } else {
                        nodeClass += 'step-inactive'; itemClass += 'step-inactive';
                    }

                    const ariaLabel = `${step.label}${completed ? ' (เสร็จแล้ว)' : isActive ? ' (ขั้นตอนปัจจุบัน)' : ' (ยังไม่ถึง)'}`;
                    stepperHtml += `
                        <div class="${itemClass}" role="listitem" aria-label="${ariaLabel}">
                            <div class="${nodeClass}">${nodeText}</div>
                            <div class="stepper-label">${step.label}${labelExtra}</div>
                        </div>`;
                    if (i < STEPS.length - 1) {
                        stepperHtml += `<div class="stepper-line ${num < active ? 'line-active' : 'line-inactive'}" aria-hidden="true"></div>`;
                    }
                });
                stepperHtml += `</div>`;

                const card = document.createElement('div');
                card.className = 'app-status-card';
                card.innerHTML = `
                    <div class="app-status-job-info">
                        <div class="app-status-job-title">${app.job_title || '-'}</div>
                        <div class="app-status-company">${app.company_name || '-'}</div>
                        ${dateStr ? `<div class="app-status-date">สมัครเมื่อ ${dateStr}</div>` : ''}
                    </div>
                    ${stepperHtml}
                `;
                statusList.appendChild(card);
            });

        } catch (err) {
            console.error('Error loading application status:', err);
            statusSection.style.display = 'none';
        }
    })();

    // ==========================================
    // 🌟 7.6 งานที่บันทึกไว้ (profile-job.html)
    // ==========================================
    (async function loadSavedJobs() {
        const savedSection = document.getElementById('saved-jobs-section');
        const savedList    = document.getElementById('saved-jobs-list');
        if (!savedSection || !savedList) return;

        // ── ตรวจสอบ session ──
        const userType = sessionStorage.getItem('userType') || '';
        const rawId    = sessionStorage.getItem('userId') || '';
        const seekerId = rawId.split(':')[0].trim();

        console.log('[SavedJobs] userType:', userType, '| seekerId:', seekerId);

        if (userType !== 'seeker') {
            console.warn('[SavedJobs] ข้ามเพราะ userType ไม่ใช่ seeker:', userType);
            return;
        }
        if (!seekerId) {
            console.warn('[SavedJobs] ข้ามเพราะ seekerId ว่าง');
            return;
        }

        try {
            const res = await fetch(`/api/saved-jobs/${seekerId}`);
            console.log('[SavedJobs] API status:', res.status);

            if (!res.ok) {
                const errText = await res.text().catch(() => '');
                console.error('[SavedJobs] API error', res.status, errText);
                // แสดง section พร้อม error message แทนการซ่อน
                savedSection.style.display = 'block';
                savedList.innerHTML = `<p style="color:#94a3b8;font-size:13px;text-align:center;padding:16px 0;">ไม่สามารถโหลดงานที่บันทึกได้ (${res.status})</p>`;
                return;
            }

            const jobs = await res.json();
            console.log('[SavedJobs] jobs received:', jobs?.length, jobs);

            if (!Array.isArray(jobs) || jobs.length === 0) {
                savedSection.style.display = 'none';
                return;
            }

            savedSection.style.display = 'block';
            savedList.innerHTML = '';
            jobs.forEach(job => {
                const card = document.createElement('div');
                card.className = 'saved-job-card';
                card.innerHTML = `
                    <div class="saved-job-info">
                        <div class="saved-job-title">${job.job_title || '-'}</div>
                        <div class="saved-job-company">${job.company_name || '-'}</div>
                        <div class="saved-job-meta">${job.job_type || ''} ${job.job_location ? '· ' + job.job_location : ''}</div>
                    </div>
                    <div class="saved-job-actions">
                        <a href="resume5.html?id=${job.id}" class="btn-view-saved">ดูรายละเอียด</a>
                        <button class="btn-unsave" data-job-id="${job.id}" aria-label="ยกเลิกบันทึกงานนี้">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                `;
                card.querySelector('.btn-unsave').addEventListener('click', async () => {
                    const delRes = await fetch(`/api/saved-jobs/${seekerId}/${job.id}`, { method: 'DELETE' });
                    if (delRes.ok) {
                        card.remove();
                        if (savedList.children.length === 0) savedSection.style.display = 'none';
                    }
                });
                savedList.appendChild(card);
            });
        } catch(err) {
            console.error('[SavedJobs] fetch error:', err);
        }
    })();

    // ==========================================
    // 🌟 8. ระบบ AI Auto-Replace
    // ==========================================
    const summaryInput = document.getElementById('inspiration-text');
    const skillsInput = document.getElementById('other-skills');

    async function processAIAutoReplace(targetElement, sectionName) {
        if (!targetElement.value || targetElement.value.length < 5) return;

        targetElement.style.transition = 'background-color 0.3s ease';
        targetElement.style.backgroundColor = '#f0f9ff';

        try {
            const res = await fetch('/api/get-ai-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: targetElement.value, section: sectionName })
            });
            const data = await res.json();

            if (data.suggestion && data.suggestion !== targetElement.value) {
                targetElement.value = data.suggestion;
                targetElement.style.backgroundColor = '#dcfce7';
                setTimeout(() => {
                    targetElement.style.backgroundColor = '';
                }, 1000);
            }
        } catch (e) {
            console.error("AI Error:", e);
            targetElement.style.backgroundColor = '';
        }
    }

    if (summaryInput) {
        summaryInput.addEventListener('blur', () => processAIAutoReplace(summaryInput, 'แรงบันดาลใจและสิ่งที่อยากบอกองค์กร'));
    }
    if (skillsInput) {
        skillsInput.addEventListener('blur', () => processAIAutoReplace(skillsInput, 'ทักษะและความสามารถพิเศษ'));
    }

    // ==========================================
    // --- 9. หน้าฟอร์มกรอกเรซูเม่ (อัปเดตดึงรูปลงเครื่อง) ---
    // ==========================================
    const getVal = (id, selector) => {
        const el = document.getElementById(id) || document.querySelector(selector);
        return el ? el.value : '';
    };

    const isOnResumePage = document.getElementById('resume-builder-form');
    if (isOnResumePage && loggedInId) {
        fetch(`/api/get-resume/${loggedInId}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.first_name) {
                    // 🌟 ถ้าระบบเจอรูปเก่าที่เคยอัปไว้ ให้จำไว้ใน Session เผื่อว่ารอบนี้ยูสเซอร์ไม่ได้อัปใหม่
                    if (data.profile_pic) {
                        sessionStorage.setItem('existingProfilePic', data.profile_pic);
                        const displaySpan = document.querySelector('.file-name-text');
                        if (displaySpan) {
                            displaySpan.textContent = 'มีรูปถ่ายเดิมในระบบแล้ว (แนบใหม่เพื่อเปลี่ยน)';
                            displaySpan.style.color = '#17A05D';
                            displaySpan.style.fontWeight = '600';
                        }
                    }

                    const sv = (id, selector, value) => {
                        const el = document.getElementById(id) || document.querySelector(selector);
                        if (el) el.value = value || '';
                    };

                    sv('first-name', '', data.first_name);
                    sv('last-name', '', data.last_name);
                    sv('phone-number', '', data.phone);
                    sv('email-address', '', data.email);
                    sv('address-street', '', (data.address || '').split(' ')[0]);
                    // prefill disability checkboxes (แยก 3 column)
                    if (data.disability_type) {
                        const types = data.disability_type.split(',').map(t => t.trim());
                        const levelMap = {
                            visual: data.disability_level_visual || '',
                            hearing: data.disability_level_hearing || '',
                            physical: data.disability_level_physical || ''
                        };
                        types.forEach(t => {
                            const cb = document.getElementById('dis-' + t);
                            if (cb) {
                                cb.checked = true;
                                // sync button aria-checked + แสดง level section ผ่าน toggleDisabilityLevel
                                if (typeof toggleDisabilityLevel === 'function') toggleDisabilityLevel(t);
                                const sel = document.getElementById('level-select-' + t);
                                if (sel && levelMap[t]) sel.value = levelMap[t];
                            }
                        });
                    }
                    sv('job-position', '', data.job_position);
                    sv('job-type', '', data.job_type);
                    sv('expected-salary', '', data.expected_salary);
                    const seekerModeRadio = document.querySelector(`input[name="seeker-work-mode"][value="${data.preferred_work_mode || 'ทำงานที่ออฟฟิศ'}"]`);
                    if (seekerModeRadio) seekerModeRadio.checked = true;
                    sv('inspiration-text', '.resume-textarea', data.summary);

                    // Prefill skills checkboxes
                    if (data.skills) {
                        const skillValues = data.skills.split(',').map(s => s.trim());
                        const predefined = [];
                        document.querySelectorAll('.skill-checkbox').forEach(cb => {
                            predefined.push(cb.value);
                            if (skillValues.includes(cb.value)) cb.checked = true;
                        });
                        const otherVal = skillValues.filter(s => !predefined.includes(s)).join(', ');
                        sv('other-skills', '', otherVal);
                    }

                    // Prefill dynamic blocks (education, work, intern, activity)
                    function prefillDynamic(containerId, items, type) {
                        const container = document.getElementById(containerId);
                        if (!container || !items || items.length === 0) return;
                        container.innerHTML = '';
                        items.forEach(item => {
                            let html = '';
                            if (type === 'edu') {
                                html = `<div class="form-row"><div class="form-col"><label class="form-label">ระดับการศึกษา</label><select class="form-input custom-select edu-level"><option value="" disabled selected>— เลือกระดับการศึกษา —</option><option>มัธยมศึกษาตอนปลาย / ปวช.</option><option>ปวส.</option><option>ปริญญาตรี</option><option>ปริญญาโท</option></select></div><div class="form-col"><label class="form-label">ชื่อสถาบันการศึกษา</label><input type="text" class="form-input edu-inst" placeholder="เช่น มหาวิทยาลัย..."></div></div><div class="form-row"><div class="form-col"><label class="form-label">คณะ / สาขาวิชา</label><input type="text" class="form-input edu-major" placeholder="เช่น บริหารธุรกิจ"></div><div class="form-col"><label class="form-label">เกรดเฉลี่ย (GPA)</label><input type="text" class="form-input edu-gpa" placeholder="เช่น 3.50"></div></div>`;
                            } else if (type === 'work') {
                                html = `<div class="form-row"><div class="form-col"><label class="form-label">ตำแหน่ง</label><input type="text" class="form-input work-title" placeholder="เช่น พนักงานบัญชี"></div><div class="form-col"><label class="form-label">ชื่อบริษัท / องค์กร</label><input type="text" class="form-input work-company"></div></div><div class="form-row"><div class="form-col full-width"><label class="form-label">ระยะเวลาที่ทำงาน</label><input type="text" class="form-input work-duration" placeholder="เช่น 2 ปี 3 เดือน / ม.ค. 66 - มี.ค. 67 / 6 เดือน"></div></div>`;
                            } else if (type === 'intern') {
                                html = `<div class="form-row"><div class="form-col"><label class="form-label">ตำแหน่งฝึกงาน</label><input type="text" class="form-input intern-title"></div><div class="form-col"><label class="form-label">ชื่อบริษัท / องค์กร</label><input type="text" class="form-input intern-company"></div></div><div class="form-row"><div class="form-col full-width"><label class="form-label">ระยะเวลาฝึกงาน</label><input type="text" class="form-input intern-duration" placeholder="เช่น มิ.ย. 66 - ส.ค. 66"></div></div>`;
                            } else if (type === 'activity') {
                                html = `<div class="form-row"><div class="form-col full-width"><label class="form-label">ชื่อกิจกรรม / โครงการประกวด</label><input type="text" class="form-input act-name"></div></div><div class="form-row"><div class="form-col full-width"><label class="form-label">บทบาท หรือ รางวัลที่ได้รับ</label><input type="text" class="form-input act-role" placeholder="เช่น รางวัลชนะเลิศ, หัวหน้าทีม"></div></div>`;
                            }
                            const div = document.createElement('div');
                            div.className = 'dynamic-item';
                            div.innerHTML = html + '<button type="button" class="btn-remove-item">ลบทิ้ง</button>';
                            container.appendChild(div);
                            div.querySelector('.btn-remove-item').addEventListener('click', () => div.remove());
                            // Fill values
                            if (type === 'edu') {
                                const sel = div.querySelector('.edu-level'); if (sel && item.level) sel.value = item.level;
                                const inst = div.querySelector('.edu-inst'); if (inst) inst.value = item.institution || '';
                                const major = div.querySelector('.edu-major'); if (major) major.value = item.major || '';
                                const gpa = div.querySelector('.edu-gpa'); if (gpa) gpa.value = item.gpa || '';
                            } else if (type === 'work') {
                                const t = div.querySelector('.work-title'); if (t) t.value = item.title || '';
                                const c = div.querySelector('.work-company'); if (c) c.value = item.company || '';
                                const d = div.querySelector('.work-duration'); if (d) d.value = item.duration || '';
                            } else if (type === 'intern') {
                                const t = div.querySelector('.intern-title'); if (t) t.value = item.title || '';
                                const c = div.querySelector('.intern-company'); if (c) c.value = item.company || '';
                                const d = div.querySelector('.intern-duration'); if (d) d.value = item.duration || '';
                            } else if (type === 'activity') {
                                const n = div.querySelector('.act-name'); if (n) n.value = item.name || '';
                                const r = div.querySelector('.act-role'); if (r) r.value = item.role || '';
                            }
                        });
                    }

                    const tryParseArr = (str) => { try { const a = typeof str === 'string' ? JSON.parse(str) : str; return Array.isArray(a) ? a : []; } catch (e) { return []; } };
                    prefillDynamic('education-container', tryParseArr(data.education_history), 'edu');
                    prefillDynamic('work-container', tryParseArr(data.work_experience), 'work');
                    prefillDynamic('intern-container', tryParseArr(data.intern_experience), 'intern');
                    prefillDynamic('activity-container', tryParseArr(data.activities), 'activity');

                    if (data.dob && data.dob !== '1970-01-01T00:00:00.000Z') {
                        const dDate = new Date(data.dob);
                        sv('dob-day', '', String(dDate.getDate()).padStart(2, '0'));
                        sv('dob-month', '', String(dDate.getMonth() + 1).padStart(2, '0'));
                        sv('dob-year', '', dDate.getFullYear() + 543);
                    }

                    setTimeout(() => {
                        const provInputEl = document.getElementById('addr-province');
                        if (provInputEl && data.province) {
                            provInputEl.value = data.province;
                            provInputEl.dispatchEvent(new Event('input'));

                            setTimeout(() => {
                                const distInputEl = document.getElementById('addr-district');
                                if (distInputEl && data.district) {
                                    distInputEl.value = data.district;
                                    distInputEl.dispatchEvent(new Event('input'));

                                    setTimeout(() => {
                                        sv('addr-subdistrict', '', data.sub_district);
                                        sv('addr-zipcode', '', data.zipcode);
                                    }, 100);
                                }
                            }, 100);
                        }
                    }, 500);
                }
            });
    }

    function createDynamicBlock(containerId, htmlContent) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const div = document.createElement('div');
        div.className = 'dynamic-item';
        div.innerHTML = htmlContent + '<button type="button" class="btn-remove-item">ลบทิ้ง</button>';
        container.appendChild(div);

        div.querySelector('.btn-remove-item').addEventListener('click', function () {
            div.remove();
            announce('ลบข้อมูลแล้ว');
        });
    }

    const addEduBtn = document.getElementById('add-edu-btn');
    if (addEduBtn) {
        addEduBtn.addEventListener('click', () => {
            const uid = Date.now();
            const eduHtml = `
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label" for="edu-level-${uid}">ระดับการศึกษา</label>
                        <select id="edu-level-${uid}" class="form-input custom-select edu-level">
                            <option value="" disabled selected>— เลือกระดับการศึกษา —</option>
                            <option>มัธยมศึกษาตอนปลาย / ปวช.</option>
                            <option>ปวส.</option>
                            <option>ปริญญาตรี</option>
                            <option>ปริญญาโท</option>
                        </select>
                    </div>
                    <div class="form-col">
                        <label class="form-label" for="edu-inst-${uid}">ชื่อสถาบันการศึกษา</label>
                        <input type="text" id="edu-inst-${uid}" class="form-input edu-inst" placeholder="เช่น มหาวิทยาลัย...">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label" for="edu-major-${uid}">คณะ / สาขาวิชา</label>
                        <input type="text" id="edu-major-${uid}" class="form-input edu-major" placeholder="เช่น บริหารธุรกิจ">
                    </div>
                    <div class="form-col">
                        <label class="form-label" for="edu-gpa-${uid}">เกรดเฉลี่ย (GPA)</label>
                        <input type="text" id="edu-gpa-${uid}" class="form-input edu-gpa" placeholder="เช่น 3.50">
                    </div>
                </div>
            `;
            createDynamicBlock('education-container', eduHtml);
        });
    }

    const addWorkBtn = document.getElementById('add-work-btn');
    if (addWorkBtn) {
        addWorkBtn.addEventListener('click', () => {
            const uid = Date.now();
            const workHtml = `
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label" for="work-pos-${uid}">ตำแหน่ง</label>
                        <input type="text" id="work-pos-${uid}" class="form-input work-title" placeholder="เช่น พนักงานบัญชี">
                    </div>
                    <div class="form-col">
                        <label class="form-label" for="work-comp-${uid}">ชื่อบริษัท / องค์กร</label>
                        <input type="text" id="work-comp-${uid}" class="form-input work-company">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col full-width">
                        <label class="form-label" for="work-time-${uid}">ระยะเวลาที่ทำงาน</label>
                        <input type="text" id="work-time-${uid}" class="form-input work-duration" placeholder="เช่น 2 ปี 3 เดือน / ม.ค. 66 - มี.ค. 67 / 6 เดือน">
                    </div>
                </div>
            `;
            createDynamicBlock('work-container', workHtml);
        });
    }

    const addInternBtn = document.getElementById('add-intern-btn');
    if (addInternBtn) {
        addInternBtn.addEventListener('click', () => {
            const uid = Date.now();
            const internHtml = `
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label" for="intern-pos-${uid}">ตำแหน่งฝึกงาน</label>
                        <input type="text" id="intern-pos-${uid}" class="form-input intern-title">
                    </div>
                    <div class="form-col">
                        <label class="form-label" for="intern-comp-${uid}">ชื่อบริษัท / องค์กร</label>
                        <input type="text" id="intern-comp-${uid}" class="form-input intern-company">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col full-width">
                        <label class="form-label" for="intern-time-${uid}">ระยะเวลาฝึกงาน</label>
                        <input type="text" id="intern-time-${uid}" class="form-input intern-duration" placeholder="เช่น มิ.ย. 66 - ส.ค. 66">
                    </div>
                </div>
            `;
            createDynamicBlock('intern-container', internHtml);
        });
    }

    const addActivityBtn = document.getElementById('add-activity-btn');
    if (addActivityBtn) {
        addActivityBtn.addEventListener('click', () => {
            const uid = Date.now();
            const actHtml = `
                <div class="form-row">
                    <div class="form-col full-width">
                        <label class="form-label" for="act-name-${uid}">ชื่อกิจกรรม / โครงการประกวด</label>
                        <input type="text" id="act-name-${uid}" class="form-input act-name">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col full-width">
                        <label class="form-label" for="act-role-${uid}">บทบาท หรือ รางวัลที่ได้รับ</label>
                        <input type="text" id="act-role-${uid}" class="form-input act-role" placeholder="เช่น รางวัลชนะเลิศ, หัวหน้าทีม">
                    </div>
                </div>
            `;
            createDynamicBlock('activity-container', actHtml);
        });
    }

    document.addEventListener('change', function (e) {
        if (e.target && e.target.classList.contains('file-input-hidden')) {
            const displaySpan = e.target.nextElementSibling.querySelector('.file-name-text');
            if (displaySpan) {
                displaySpan.textContent = e.target.files[0] ? e.target.files[0].name : 'แนบไฟล์...';
                displaySpan.style.color = e.target.files[0] ? '#013c58' : '#666';
                displaySpan.style.fontWeight = e.target.files[0] ? '600' : 'normal';
            }
        }
    });

    // ==========================================
    // ── 9.4 ADDRESS COMBOBOX (ARIA-compliant) ──
    // ==========================================
    const provInput = document.getElementById('addr-province');
    const distInput = document.getElementById('addr-district');
    const subInput  = document.getElementById('addr-subdistrict');
    const zipInput  = document.getElementById('addr-zipcode');

    if (provInput && distInput && subInput && zipInput) {
        const thaiProvinces = [
            "กรุงเทพมหานคร","กระบี่","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท",
            "ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก","นครปฐม","นครพนม",
            "นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์",
            "ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์",
            "แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง",
            "ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ",
            "สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย",
            "หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"
        ];

        const bkkDistricts = [
            "เขตพระนคร","เขตดุสิต","เขตหนองจอก","เขตบางรัก","เขตบางเขน","เขตบางกะปิ","เขตปทุมวัน","เขตป้อมปราบศัตรูพ่าย","เขตพระโขนง","เขตมีนบุรี",
            "เขตลาดกระบัง","เขตยานนาวา","เขตสัมพันธวงศ์","เขตพญาไท","เขตธนบุรี","เขตบางกอกใหญ่","เขตห้วยขวาง","เขตคลองสาน","เขตตลิ่งชัน","เขตบางกอกน้อย",
            "เขตบางขุนเทียน","เขตภาษีเจริญ","เขตหนองแขม","เขตราษฎร์บูรณะ","เขตบางพลัด","เขตดินแดง","เขตบึงกุ่ม","เขตสาทร","เขตบางซื่อ","เขตจตุจักร",
            "เขตบางคอแหลม","เขตประเวศ","เขตคลองเตย","เขตสวนหลวง","เขตจอมทอง","เขตดอนเมือง","เขตราชเทวี","เขตลาดพร้าว","เขตวัฒนา","เขตบางแค",
            "เขตหลักสี่","เขตสายไหม","เขตคันนายาว","เขตสะพานสูง","เขตวังทองหลาง","เขตคลองสามวา","เขตบางนา","เขตทวีวัฒนา","เขตทุ่งครุ","เขตบางบอน"
        ];
        const mockDistricts = {
            "เชียงใหม่": ["อำเภอเมืองเชียงใหม่","อำเภอหางดง","อำเภอแม่ริม","อำเภอดอยสะเก็ด"],
            "ชลบุรี":    ["อำเภอเมืองชลบุรี","อำเภอบางละมุง","อำเภอศรีราชา","อำเภอสัตหีบ"]
        };

        // ── setupCombobox: ฟังก์ชัน ARIA combobox ที่ใช้ซ้ำได้ ──
        function setupCombobox(inputEl, listboxEl, getOptions, onSelect) {
            let activeOpt = null;

            function getOpts() { return Array.from(listboxEl.querySelectorAll('[role="option"]')); }

            function openList(query) {
                const opts = getOptions(query || '');
                if (!opts.length) { closeList(); return; }
                listboxEl.innerHTML = '';
                opts.forEach((text, i) => {
                    const li = document.createElement('li');
                    li.setAttribute('role', 'option');
                    li.setAttribute('id', `${listboxEl.id}-opt-${i}`);
                    li.setAttribute('aria-selected', 'false');
                    li.className = 'combobox-option';
                    li.textContent = text;
                    li.addEventListener('mousedown', (e) => { e.preventDefault(); confirmSelect(text); });
                    listboxEl.appendChild(li);
                });
                listboxEl.removeAttribute('hidden');
                inputEl.setAttribute('aria-expanded', 'true');
                activeOpt = null;
                inputEl.removeAttribute('aria-activedescendant');
                announce(`พบ ${opts.length} ตัวเลือก กดลูกศรลงเพื่อเลือก`);
            }

            function closeList() {
                listboxEl.setAttribute('hidden', '');
                listboxEl.innerHTML = '';
                inputEl.setAttribute('aria-expanded', 'false');
                inputEl.removeAttribute('aria-activedescendant');
                activeOpt = null;
            }

            function setActive(li) {
                getOpts().forEach(o => { o.setAttribute('aria-selected', 'false'); o.classList.remove('combobox-option-active'); });
                activeOpt = li;
                if (li) {
                    li.setAttribute('aria-selected', 'true');
                    li.classList.add('combobox-option-active');
                    inputEl.setAttribute('aria-activedescendant', li.id);
                    li.scrollIntoView({ block: 'nearest' });
                }
            }

            function confirmSelect(value) {
                inputEl.value = value;
                closeList();
                onSelect(value);
                announce(`เลือก${value}แล้ว`);
            }

            inputEl.addEventListener('input', function () {
                openList(this.value.trim());
            });

            inputEl.addEventListener('keydown', function (e) {
                const opts = getOpts();
                const isOpen = inputEl.getAttribute('aria-expanded') === 'true';
                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        if (!isOpen) { openList(this.value.trim()); return; }
                        if (!opts.length) return;
                        setActive(activeOpt ? (opts[opts.indexOf(activeOpt) + 1] || opts[0]) : opts[0]);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        if (!isOpen || !opts.length) return;
                        setActive(activeOpt ? (opts[opts.indexOf(activeOpt) - 1] || opts[opts.length - 1]) : opts[opts.length - 1]);
                        break;
                    case 'Enter':
                        if (isOpen && activeOpt) { e.preventDefault(); confirmSelect(activeOpt.textContent); }
                        else if (isOpen) { e.preventDefault(); closeList(); }
                        break;
                    case 'Escape':
                        if (isOpen) { e.preventDefault(); closeList(); }
                        break;
                    case 'Tab':
                        if (isOpen && activeOpt) confirmSelect(activeOpt.textContent);
                        else closeList();
                        break;
                }
            });

            inputEl.addEventListener('blur', function () {
                setTimeout(() => { if (!listboxEl.contains(document.activeElement)) closeList(); }, 150);
            });
        }

        // ── ตั้งค่า Province combobox ──
        setupCombobox(
            provInput,
            document.getElementById('province-listbox'),
            (q) => q ? thaiProvinces.filter(p => p.includes(q)) : thaiProvinces,
            (province) => {
                // cascade: reset ค่า district + subdistrict เมื่อเปลี่ยนจังหวัด
                distInput.value = ''; subInput.value = ''; zipInput.value = '';
                document.getElementById('district-listbox').innerHTML = '';
                document.getElementById('subdistrict-listbox').innerHTML = '';
                // ไม่ disable — ให้พิมพ์ได้เสมอ
                distInput.disabled = false;
                subInput.disabled = false;
                announce(`เลือกจังหวัด${province}แล้ว กรุณากรอกเขตหรืออำเภอ`);
                distInput.focus();
            }
        );

        // ── ตั้งค่า District combobox ──
        setupCombobox(
            distInput,
            document.getElementById('district-listbox'),
            (q) => {
                const prov = provInput.value;
                // ถ้าไม่มีจังหวัด ไม่แสดง dropdown
                if (!prov) return [];
                let all = prov === 'กรุงเทพมหานคร' ? bkkDistricts
                    : (mockDistricts[prov] || []);
                // ถ้าไม่มีข้อมูลใน mockDistricts ให้พิมพ์อิสระ (ไม่ต้องแสดง dropdown)
                return q ? all.filter(d => d.includes(q)) : all;
            },
            (district) => {
                subInput.value = ''; zipInput.value = '';
                document.getElementById('subdistrict-listbox').innerHTML = '';
                subInput.disabled = false;
                if (district) {
                    announce(`เลือก${district}แล้ว กรุณากรอกแขวงหรือตำบล`);
                    subInput.focus();
                }
            }
        );

        // ── ตั้งค่า Subdistrict combobox ──
        setupCombobox(
            subInput,
            document.getElementById('subdistrict-listbox'),
            (q) => {
                const dist = distInput.value;
                if (!dist) return [];
                const prefix = provInput.value === 'กรุงเทพมหานคร' ? 'แขวง' : 'ตำบล';
                let subs = [];
                if (dist === 'เขตจอมทอง') {
                    subs = ['แขวงบางขุนเทียน', 'แขวงบางค้อ', 'แขวงบางมด', 'แขวงจอมทอง'];
                } else if (dist === 'เขตบางรัก') {
                    subs = ['แขวงบางรัก', 'แขวงสีลม', 'แขวงสุริยวงศ์', 'แขวงมหาพฤฒาราม', 'แขวงบางรัก'];
                } else if (dist === 'เขตคลองเตย') {
                    subs = ['แขวงคลองเตย', 'แขวงคลองตัน', 'แขวงพระโขนง'];
                } else if (dist === 'เขตวัฒนา') {
                    subs = ['แขวงคลองเตยเหนือ', 'แขวงคลองตันเหนือ', 'แขวงพระโขนงเหนือ'];
                } else if (dist === 'เขตจตุจักร') {
                    subs = ['แขวงลาดยาว', 'แขวงเสนานิคม', 'แขวงจันทรเกษม', 'แขวงจอมพล', 'แขวงจตุจักร'];
                } else {
                    // สำหรับเขต/อำเภออื่น: สร้าง placeholder แต่ให้พิมพ์อิสระได้
                    const base = dist.replace('เขต','').replace('อำเภอ','').replace('เมือง','');
                    subs = base ? [`${prefix}${base}`] : [];
                }
                return q ? subs.filter(s => s.includes(q)) : subs;
            },
            (sub) => {
                // auto-fill zipcode จาก Bangkok districts ที่รู้จัก
                const dist = distInput.value;
                const zipMap = {
                    'เขตพระนคร':'10200','เขตดุสิต':'10300','เขตบางรัก':'10500',
                    'เขตปทุมวัน':'10330','เขตป้อมปราบศัตรูพ่าย':'10100','เขตพระโขนง':'10260',
                    'เขตยานนาวา':'10120','เขตสาทร':'10120','เขตบางคอแหลม':'10120',
                    'เขตคลองเตย':'10110','เขตวัฒนา':'10110','เขตสวนหลวง':'10250',
                    'เขตประเวศ':'10250','เขตจตุจักร':'10900','เขตลาดพร้าว':'10230',
                    'เขตบางเขน':'10220','เขตดอนเมือง':'10210','เขตสายไหม':'10220',
                    'เขตหลักสี่':'10210','เขตบึงกุ่ม':'10240','เขตบางกะปิ':'10240',
                    'เขตห้วยขวาง':'10310','เขตดินแดง':'10400','เขตราชเทวี':'10400',
                    'เขตพญาไท':'10400','เขตบางซื่อ':'10800','เขตจอมทอง':'10150',
                    'เขตบางขุนเทียน':'10150','เขตราษฎร์บูรณะ':'10140','เขตทุ่งครุ':'10140',
                    'เขตบางบอน':'10150','เขตภาษีเจริญ':'10160','เขตหนองแขม':'10160',
                    'เขตตลิ่งชัน':'10170','เขตทวีวัฒนา':'10170','เขตบางกอกน้อย':'10700',
                    'เขตบางพลัด':'10700','เขตคลองสาน':'10600','เขตธนบุรี':'10600',
                    'เขตบางกอกใหญ่':'10600','เขตลาดกระบัง':'10520','เขตมีนบุรี':'10510',
                    'เขตหนองจอก':'10530','เขตคลองสามวา':'10510','เขตคันนายาว':'10230',
                    'เขตสะพานสูง':'10240','เขตวังทองหลาง':'10310','เขตบางนา':'10260',
                    'เขตสัมพันธวงศ์':'10100',
                    // ต่างจังหวัด (ตัวอย่าง)
                    'อำเภอเมืองเชียงใหม่':'50000','อำเภอหางดง':'50230',
                    'อำเภอเมืองชลบุรี':'20000','อำเภอบางละมุง':'20150',
                };
                if (dist && zipMap[dist]) {
                    zipInput.value = zipMap[dist];
                }
                // ถ้าไม่มีใน map ปล่อย zipcode ว่างให้พิมพ์เอง
                if (zipInput.value) announce(`รหัสไปรษณีย์ ${zipInput.value}`);
            }
        );

        // ── สำคัญ: enable ทั้ง 2 fields เสมอ (ลบ disabled ที่ตั้งไว้ใน HTML) ──
        // เพื่อให้พิมพ์อิสระได้ทันที ไม่ต้องรอ cascade จาก province
        distInput.disabled = false;
        subInput.disabled = false;

        // ── กรณี pre-fill ข้อมูลเก่า: ถ้า province/district มีค่าอยู่แล้ว ให้ enable ทันที ──
        if (provInput.value) {
            distInput.disabled = false;
            subInput.disabled = false;
        }
    }

    const getDynamicData = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return Array.from(container.querySelectorAll('.dynamic-item')).map(item => {
            const inputs = item.querySelectorAll('.form-input');
            if (containerId === 'education-container') {
                return { level: inputs[0]?.value, institution: inputs[1]?.value, major: inputs[2]?.value, gpa: inputs[3]?.value };
            } else if (containerId === 'work-container' || containerId === 'intern-container') {
                return { title: inputs[0]?.value, company: inputs[1]?.value, duration: inputs[2]?.value };
            } else if (containerId === 'activity-container') {
                return { name: inputs[0]?.value, role: inputs[1]?.value };
            }
            return {};
        });
    };

    // 🟢 9.6 ดักจับการกด Save หน้าแรก -> ให้เก็บใน Session (อัปเดตรองรับรูปถ่าย)
    if (isOnResumePage) {
        isOnResumePage.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!loggedInId) {
                alert('กรุณาเข้าสู่ระบบก่อนบันทึกเรซูเม่');
                window.location.href = 'login-jobseeker.html?mode=login';
                return;
            }

            // 🌟 1. ดึงไฟล์รูปถ่ายและแปลงเป็น Base64
            const fileInput = document.getElementById('profile-pic');
            let profilePicBase64 = sessionStorage.getItem('existingProfilePic') || ''; // ดึงรูปเก่ามาเผื่อไว้ก่อน

            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                // ป้องกันอัปไฟล์ใหญ่เกิน 2MB ไม่งั้นเดี๋ยว Session/Database จะ Error
                if (file.size > 2 * 1024 * 1024) {
                    alert('ขนาดรูปถ่ายใหญ่เกินไปครับ (ต้องไม่เกิน 2MB)');
                    return;
                }

                profilePicBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }

            // 🌟 2. ดึงข้อมูลฟอร์มอื่นๆ ตามปกติ
            const d = document.getElementById('dob-day')?.value;
            const m = document.getElementById('dob-month')?.value;
            const y = document.getElementById('dob-year')?.value;

            let formattedYear = y;
            if (y && parseInt(y) > 2400) {
                formattedYear = parseInt(y) - 543;
            }
            const dob = (d && m && y) ? `${formattedYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : null;

            const selectedSkills = Array.from(document.querySelectorAll('.skill-checkbox:checked')).map(cb => cb.nextElementSibling.textContent.trim());
            const otherSkills = document.getElementById('other-skills')?.value;
            if (otherSkills) {
                selectedSkills.push(otherSkills);
            }

            const resumeData = {
                seeker_id: loggedInId,
                first_name: getVal('first-name', ''),
                last_name: getVal('last-name', ''),
                dob: dob,
                phone: getVal('phone-number', ''),
                email: getVal('email-address', ''),
                address: getVal('address-street', ''),
                province: document.getElementById('addr-province')?.value || '',
                district: document.getElementById('addr-district')?.value || '',
                sub_district: document.getElementById('addr-subdistrict')?.value || '',
                zipcode: document.getElementById('addr-zipcode')?.value || '',
                disability_type: (() => {
                    const types = ['visual', 'hearing', 'physical'].filter(t => {
                        const cb = document.getElementById('dis-' + t);
                        return cb && cb.checked;
                    });
                    return types.join(',');
                })(),
                disability_level_visual: (() => {
                    const cb = document.getElementById('dis-visual');
                    if (!cb || !cb.checked) return '';
                    const sel = document.getElementById('level-select-visual');
                    return sel ? sel.value : '';
                })(),
                disability_level_hearing: (() => {
                    const cb = document.getElementById('dis-hearing');
                    if (!cb || !cb.checked) return '';
                    const sel = document.getElementById('level-select-hearing');
                    return sel ? sel.value : '';
                })(),
                disability_level_physical: (() => {
                    const cb = document.getElementById('dis-physical');
                    if (!cb || !cb.checked) return '';
                    const sel = document.getElementById('level-select-physical');
                    return sel ? sel.value : '';
                })(),
                summary: document.getElementById('inspiration-text')?.value || '',
                skills: selectedSkills.join(', '),
                portfolio_url: document.getElementById('portfolio-url')?.value || '',
                job_position: document.getElementById('job-position')?.value || '',
                job_type: document.getElementById('job-type')?.value || '',
                expected_salary: document.getElementById('expected-salary')?.value || '',
                preferred_work_mode: document.querySelector('input[name="seeker-work-mode"]:checked')?.value || 'ทำงานที่ออฟฟิศ',
                education_history: getDynamicData('education-container'),
                work_experience: getDynamicData('work-container'),
                intern_experience: getDynamicData('intern-container'),
                activities: getDynamicData('activity-container'),
                profile_pic: profilePicBase64 // 🌟 ส่งรูปภาพที่แปลงแล้วเข้าไปด้วย
            };

            sessionStorage.setItem('tempResumeData', JSON.stringify(resumeData));

            const modal = document.getElementById('resume-success-modal');
            if (modal) {
                modal.style.display = 'flex';
                const h3 = modal.querySelector('h3');
                if (h3) h3.textContent = 'บันทึกข้อมูลเบื้องต้นสำเร็จ! กรุณาเลือกเทมเพลต';
                setTimeout(() => {
                    window.location.href = 'resume2.html';
                }, 1500);
            } else {
                window.location.href = 'resume2.html';
            }
        });
    }

    // ==========================================
    // 🌟 10. หน้าเลือกเทมเพลตเรซูเม่ (resume2.html)
    // ==========================================
    const templateThumbs = document.querySelectorAll('.template-thumb, .tpl-card');
    const templateContents = document.querySelectorAll('.template-preview-area .resume-theme-content');
    const btnProceedToFinal = document.getElementById('btn-proceed-to-final');

    if (templateThumbs.length > 0 && templateContents.length > 0) {
        templateThumbs.forEach(thumb => {
            thumb.addEventListener('click', function () {
                // ลบ active + aria-pressed จากทุก thumb
                templateThumbs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-pressed', 'false');
                });
                // เพิ่ม active + aria-pressed ให้ thumb ที่กด
                this.classList.add('active');
                this.setAttribute('aria-pressed', 'true');

                const selectedTheme = this.getAttribute('data-template');

                templateContents.forEach(content => {
                    content.classList.remove('active');
                });

                const targetContent = document.querySelector(`.template-preview-area #tpl-${selectedTheme}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

                announce('เลือกเทมเพลต ' + this.querySelector('.thumb-label')?.textContent);
            });
        });
    }

    if (btnProceedToFinal) {
        btnProceedToFinal.addEventListener('click', async function () {
            const activeThumb = document.querySelector('.template-thumb.active');
            const selectedTheme = activeThumb ? activeThumb.getAttribute('data-template') : 'minimal';

            localStorage.setItem('selectedResumeTheme', selectedTheme);

            const tempResumeDataStr = sessionStorage.getItem('tempResumeData');

            // 🌟 ประกาศตัวแปรดึง Pop-up มารอไว้ 🌟
            const successModal = document.getElementById('resume-success-modal');

            if (loggedInId && tempResumeDataStr) {
                try {
                    const resumeData = JSON.parse(tempResumeDataStr);
                    resumeData.selected_template = selectedTheme;

                    const response = await fetch('/api/save-resume', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(resumeData)
                    });

                    const result = await response.json();
                    if (result.success) {
                        sessionStorage.removeItem('tempResumeData');

                        // 🌟 โชว์ Pop-up แล้วหน่วงเวลา 2 วินาที ค่อยไปหน้าต่อไป 🌟
                        if (successModal) {
                            successModal.style.display = 'flex';
                            announce('บันทึกเรซูเม่สำเร็จ ระบบกำลังพาไปยังหน้าถัดไป');
                            setTimeout(() => {
                                window.location.href = 'resume3.html';
                            }, 2000);
                        } else {
                            window.location.href = 'resume3.html';
                        }

                    } else {
                        alert('เกิดข้อผิดพลาดในการบันทึก: ' + result.error);
                    }
                } catch (err) {
                    alert("เชื่อมต่อฐานข้อมูลล้มเหลว");
                }
            } else if (loggedInId && !tempResumeDataStr) {
                try {
                    await fetch('/api/update-template', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ seeker_id: loggedInId, selected_template: selectedTheme })
                    });

                    // 🌟 โชว์ Pop-up (กรณีคนเข้ามาเปลี่ยนแค่ธีม) 🌟
                    if (successModal) {
                        successModal.style.display = 'flex';
                        announce('อัปเดตเทมเพลตสำเร็จ ระบบกำลังพาไปยังหน้าถัดไป');
                        setTimeout(() => {
                            window.location.href = 'resume3.html';
                        }, 2000);
                    } else {
                        window.location.href = 'resume3.html';
                    }

                } catch (err) {
                    alert("เชื่อมต่อฐานข้อมูลล้มเหลว");
                }
            } else {
                window.location.href = 'resume3.html';
            }
        });

        // 🌟 ดักจับการคลิกที่พื้นที่ว่างนอก Pop-up เพื่อปิดและไปหน้าต่อไปทันที 🌟
        const successModal = document.getElementById('resume-success-modal');
        if (successModal) {
            successModal.addEventListener('click', (e) => {
                if (e.target === successModal) {
                    successModal.style.display = 'none';
                    window.location.href = 'resume3.html';
                }
            });
        }
    }

    // ==========================================
    // --- 11. หน้าพรีวิวเรซูเม่ครั้งสุดท้าย (อัปเดตการแสดงรูปภาพ) ---
    // ==========================================
    const resume3Paper = document.getElementById('resume3-paper');

    if (resume3Paper && loggedInId) {
        fetch(`/api/get-resume/${loggedInId}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.first_name) {
                    const savedTheme = data.selected_template || localStorage.getItem('selectedResumeTheme') || 'minimal';
                    const allTemplates = resume3Paper.querySelectorAll('.resume-theme-content');

                    allTemplates.forEach(tpl => {
                        tpl.classList.remove('active');
                    });

                    const targetTpl = resume3Paper.querySelector(`#tpl-${savedTheme}`);
                    if (targetTpl) {
                        targetTpl.classList.add('active');
                        renderRealDataToTemplate(targetTpl, data);
                    }
                }
            });

        const btnEdit = document.getElementById('btn-edit-resume');
        const btnSave = document.getElementById('btn-save-profile');

        if (btnEdit) {
            btnEdit.addEventListener('click', () => {
                window.location.href = 'resume.html';
            });
        }

        if (btnSave) {
            btnSave.removeAttribute('onclick');
            btnSave.addEventListener('click', () => {
                sessionStorage.removeItem('aiMatchedJobs');
                window.location.href = 'resume4.html';
            });
        }
    }

    function renderRealDataToTemplate(tpl, data) {
        if (!tpl) return;
        const themeId = tpl.id;

        // แสดงรูปโปรไฟล์
        // ต้องใช้ setProperty(..., 'important') เพราะ CSS กำหนด background-image !important ไว้
        if (data.profile_pic) {
            const photoEls = tpl.querySelectorAll('.tpl1-photo, .tpl2-arch-photo, .tpl3-photo, .tpl4-photo-circle');
            photoEls.forEach(el => {
                el.style.setProperty('background-image', `url(${data.profile_pic})`, 'important');
                el.style.setProperty('background-size', 'cover', 'important');
                el.style.setProperty('background-position', 'top center', 'important');
                el.style.setProperty('background-repeat', 'no-repeat', 'important');
            });
        }

        const setText = (selector, text) => {
            tpl.querySelectorAll(selector).forEach(el => { el.textContent = text || ''; });
        };

        setText('.render-name', `${data.first_name || ''} ${data.last_name || ''}`.trim());

        // tpl-vintage: ชื่ออยู่บรรทัดบน นามสกุลอยู่บรรทัดล่าง
        if (themeId === 'tpl-vintage') {
            const vintageName = tpl.querySelector('.v-header-name');
            if (vintageName) {
                const fn = (data.first_name || '').trim();
                const ln = (data.last_name || '').trim();
                vintageName.innerHTML = (fn && ln) ? `${fn}<br>${ln}` : (fn || ln);
            }
        }

        // tpl-bright: ชื่ออยู่บรรทัดบน นามสกุลอยู่บรรทัดล่าง + auto-fit ฟ้อนต์
        if (themeId === 'tpl-bright') {
            const brightName = tpl.querySelector('.tpl4-name');
            if (brightName) {
                const fn = (data.first_name || '').trim();
                const ln = (data.last_name || '').trim();
                brightName.innerHTML = (fn && ln) ? `${fn}<br>${ln}` : (fn || ln);

                // รอ reflow แล้วค่อย fit — เริ่มจาก 40px ลดจนทั้งสองบรรทัดพอดี
                setTimeout(() => {
                    let size = 40, min = 16;
                    brightName.style.setProperty('font-size', size + 'px', 'important');
                    brightName.getBoundingClientRect(); // force reflow
                    while (brightName.scrollWidth > brightName.offsetWidth && size > min) {
                        size--;
                        brightName.style.setProperty('font-size', size + 'px', 'important');
                    }
                }, 0);
            }
        }

        setText('.render-email', data.email);
        setText('.render-phone', data.phone);
        const fullAddress = `${data.address || ''} ${data.sub_district || ''} ${data.district || ''} ${data.province || ''} ${data.zipcode || ''}`.trim();
        setText('.render-address', fullAddress);
        setText('.render-summary', data.summary);

        // ซ่อน summary section ถ้าว่าง
        if (!data.summary || !data.summary.trim()) {
            const sumSec = tpl.querySelector('[data-section="summary"]');
            if (sumSec) sumSec.style.display = 'none';
        }

        // แสดงข้อมูลความพิการพร้อมประเภทและระดับ
        const disTypeLabel = { visual: 'ทางการมองเห็น', hearing: 'ทางการได้ยินหรือสื่อความหมาย', physical: 'ทางกายหรือการเคลื่อนไหว' };
        const disLevelLabel = {
            visual_1: 'ระดับ 1', visual_2: 'ระดับ 2', visual_3: 'ระดับ 3', visual_4: 'ระดับ 4', visual_5: 'ระดับ 5',
            hearing_1: 'ระดับ 1', hearing_2: 'ระดับ 2', hearing_3: 'ระดับ 3', hearing_4: 'ระดับ 4', hearing_5: 'ระดับ 5',
            hearing_comm_1: 'ระดับ 3 (สื่อความหมาย)', hearing_comm_2: 'ระดับ 4 (สื่อความหมาย)', hearing_comm_3: 'ระดับ 5 (สื่อความหมาย)',
            physical_1: 'ระดับ 1', physical_2: 'ระดับ 2', physical_3: 'ระดับ 3', physical_4: 'ระดับ 4', physical_5: 'ระดับ 5'
        };
        if (data.disability_type) {
            const levelMap = { visual: data.disability_level_visual, hearing: data.disability_level_hearing, physical: data.disability_level_physical };
            const disText = data.disability_type.split(',').map(t => t.trim()).filter(t => t).map(t => {
                const lbl = disTypeLabel[t] || t;
                const lvKey = levelMap[t];
                const lvLbl = lvKey ? (disLevelLabel[lvKey] || lvKey) : '';
                return lvLbl ? `${lbl} (${lvLbl})` : lbl;
            }).join(' / ');
            setText('.render-disability', disText);
        } else {
            setText('.render-disability', '');
            tpl.querySelectorAll('[data-section="disability"]').forEach(s => { s.style.display = 'none'; });
        }

        // รูปแบบการทำงานที่ต้องการ (preferred_work_mode)
        const prefWorkModeEls = tpl.querySelectorAll('.render-preferred-work-mode');
        if (prefWorkModeEls.length > 0 && data.preferred_work_mode) {
            const _svgBuildingR = `<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
            const _svgRefreshR = `<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
            const _svgHomeR = `<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
            const _svgGlobeR = `<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
            const PREF_WORK_MODE_MAP = {
                onsite: { icon: _svgBuildingR, srLabel: 'ทำงานที่ออฟฟิศ', text: 'ทำงานที่ออฟฟิศ' },
                hybrid: { icon: _svgRefreshR, srLabel: 'ทำที่ออฟฟิศสลับทำที่บ้าน', text: 'ทำที่ออฟฟิศสลับทำที่บ้าน' },
                remote: { icon: _svgHomeR, srLabel: 'ทำงานที่บ้าน', text: 'ทำงานที่บ้าน' },
                any: { icon: _svgGlobeR, srLabel: 'ตามตกลง', text: 'ตามตกลง' },
                'ทำงานที่ออฟฟิศ': { icon: _svgBuildingR, srLabel: 'ทำงานที่ออฟฟิศ', text: 'ทำงานที่ออฟฟิศ' },
                'ทำที่ออฟฟิศสลับทำที่บ้าน': { icon: _svgRefreshR, srLabel: 'ทำที่ออฟฟิศสลับทำที่บ้าน', text: 'ทำที่ออฟฟิศสลับทำที่บ้าน' },
                'ออฟฟิศสลับทำที่บ้าน': { icon: _svgRefreshR, srLabel: 'ออฟฟิศสลับทำที่บ้าน', text: 'ออฟฟิศสลับทำที่บ้าน' },
                'ทำงานที่บ้าน': { icon: _svgHomeR, srLabel: 'ทำงานที่บ้าน', text: 'ทำงานที่บ้าน' },
                'ทำงานที่บ้าน (WFH)': { icon: _svgHomeR, srLabel: 'ทำงานที่บ้าน', text: 'ทำงานที่บ้าน (WFH)' },
                'ตามตกลง': { icon: _svgGlobeR, srLabel: 'ตามตกลง', text: 'ตามตกลง' },
                'ยืดหยุ่น / ตามตกลง': { icon: _svgGlobeR, srLabel: 'ตามตกลง', text: 'ยืดหยุ่น / ตามตกลง' }
            };
            const modeInfo = PREF_WORK_MODE_MAP[data.preferred_work_mode];
            if (modeInfo) {
                prefWorkModeEls.forEach(el => {
                    el.innerHTML = `${modeInfo.icon}<span class="sr-only">รูปแบบที่ต้องการ: ${modeInfo.srLabel}</span> ${modeInfo.text}`;
                    el.style.display = '';
                });
            }
        }

        // ทักษะ
        const skillsContainers = tpl.querySelectorAll('.render-skills');
        const hasSkills = data.skills && data.skills.trim() !== '';
        skillsContainers.forEach(skillsContainer => {
            if (hasSkills) {
                skillsContainer.innerHTML = '';
                const skillsArr = data.skills.split(',').map(s => s.trim()).filter(s => s !== '');
                if (themeId === 'tpl-modern') {
                    skillsContainer.innerHTML = skillsArr.map(s => `<span role="listitem">${s}</span>`).join('');
                } else if (themeId === 'tpl-bright') {
                    skillsContainer.innerHTML = skillsArr.join(' / ');
                } else if (themeId === 'tpl-minimal') {
                    skillsContainer.innerHTML = skillsArr.map(s => `<p class="tpl1-text" role="listitem">${s}</p>`).join('');
                } else if (themeId === 'tpl-vintage') {
                    skillsContainer.innerHTML = skillsArr
                        .map(s => `<span class="v-skill-item">${s}</span>`)
                        .join(', ');
                } else {
                    skillsContainer.textContent = data.skills;
                }
            }
        });
        // ซ่อน [data-section="skills"] ถ้าไม่มีข้อมูล
        if (!hasSkills) {
            const skillsSec = tpl.querySelector('[data-section="skills"]');
            if (skillsSec) skillsSec.style.display = 'none';
        }

        // renderList — ถ้าว่างให้ซ่อน [data-section] wrapper แทนการแสดงข้อความ
        const renderList = (selector, dataString, templateHTMLFunc) => {
            const container = tpl.querySelector(selector);
            if (!container) return;
            container.innerHTML = '';

            let isEmpty = !dataString || dataString === '[]';
            if (!isEmpty) {
                try {
                    const arr = typeof dataString === 'string' ? JSON.parse(dataString) : dataString;
                    if (arr.length === 0) {
                        isEmpty = true;
                    } else {
                        container.innerHTML = arr.map(templateHTMLFunc).join('');
                    }
                } catch (e) {
                    isEmpty = true;
                }
            }

            if (isEmpty) {
                const sectionEl = container.closest('[data-section]');
                if (sectionEl) sectionEl.style.display = 'none';
            }
        };

        renderList('.render-edu-list', data.education_history, (item) => {
            if (themeId === 'tpl-bright') return `<div class="tpl4-detail" style="margin-bottom: 10px;"><p class="tpl4-text-dark"><strong>${item.institution || ''}</strong></p><p class="tpl4-meta">${item.level || ''} ${item.major || ''}</p><p>GPA: ${item.gpa || '-'}</p></div>`;
            else if (themeId === 'tpl-modern') return `<p class="tpl2-text-white" style="margin-bottom: 10px;"><strong>${item.institution || ''}</strong><br>${item.level || ''} ${item.major || ''}<br>GPA: ${item.gpa || '-'}</p>`;
            else if (themeId === 'tpl-vintage') return `<div class="tpl3-edu-item"><div class="tpl3-edu-institution">${item.institution || ''}</div><div class="tpl3-edu-detail">${item.level || ''} ${item.major || ''}<br>GPA ${item.gpa || '-'}</div></div>`;
            else return `<div class="tpl1-exp" style="margin-bottom: 15px;"><div class="tpl1-exp-header"><h4>${item.level || ''} ${item.major || ''}</h4></div><p class="tpl1-company">${item.institution || ''}</p><p class="tpl1-desc">GPA: ${item.gpa || '-'}</p></div>`;
        });

        renderList('.render-work-list', data.work_experience, (item) => {
            if (themeId === 'tpl-bright') return `<div class="tpl4-time-item"><div class="tpl4-year-badge">${item.duration || 'ไม่ระบุเวลา'}</div><h4>${item.title || ''}</h4><p class="tpl4-meta">${item.company || ''}</p></div>`;
            else if (themeId === 'tpl-vintage') return `<div class="tpl3-exp-grid"><div class="tpl3-exp-left"><strong>${item.company || ''}</strong><br>${item.duration || ''}</div><div class="tpl3-exp-right"><strong>${item.title || ''}</strong></div></div>`;
            else return `<div class="tpl1-exp" style="margin-bottom: 15px;"><div class="tpl1-exp-header"><h4>${item.title || ''}</h4><span>${item.duration || ''}</span></div><p class="tpl1-company">${item.company || ''}</p></div>`;
        });

        renderList('.render-intern-list', data.intern_experience, (item) => {
            if (themeId === 'tpl-bright') return `<div class="tpl4-time-item"><div class="tpl4-year-badge">${item.duration || 'ไม่ระบุเวลา'}</div><h4>${item.title || ''}</h4><p class="tpl4-meta">${item.company || ''}</p></div>`;
            else return `<div style="margin-bottom:15px; padding-bottom:10px; border-bottom:1px dashed #ddd;"><div style="font-weight:bold; font-size:1.1em; color:inherit;">${item.title || ''}</div><div style="color:inherit;">${item.company || ''} | ${item.duration || ''}</div></div>`;
        });

        renderList('.render-activity-list', data.activities, (item) => {
            if (themeId === 'tpl-bright') return `<div class="tpl4-time-item"><div class="tpl4-dot"></div><h4>${item.name || ''}</h4><p class="tpl4-meta">${item.role || ''}</p></div>`;
            else return `<div style="margin-bottom:15px;"><div style="font-weight:bold; font-size:1.1em; color:inherit;">${item.name || ''}</div><div style="color:inherit;">${item.role || ''}</div></div>`;
        });
    }

    // ==========================================
    // 🌟 12. ระบบคำนวณ Ranking ขั้นเทพ (Rule-based + AI Matching)
    // ==========================================
    const rankListContainer = document.querySelector('.ranking-list'); 
    
    if (rankListContainer) {
        const cachedJobs = sessionStorage.getItem('aiMatchedJobs');
        if (cachedJobs) {
            renderRankedJobs(JSON.parse(cachedJobs));
        } else {
            loadAndRankJobsWithAI();
        }
    }

    function renderRankedJobs(rankedJobs) {
        rankListContainer.innerHTML = '';

        // ปุ่ม Rematch
        rankListContainer.innerHTML += `
            <div style="width: 100%; display: flex; justify-content: flex-end; margin-bottom: 20px;">
                <button id="btn-rematch" style="padding: 10px 20px; background-color: #f8fafc; color: #334155; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                    คำนวณคะแนนใหม่ (Rematch)
                </button>
            </div>
        `;

        const bgColors = ['#000000', '#17A05D', '#00A5E0', '#EE3124', '#E2231A', '#005A9C', '#FF6600', '#0F146D', '#00A651'];

        rankedJobs.forEach((job, index) => {
            let logoText = job.company_name ? job.company_name.substring(0, 3).toUpperCase() : 'JOB';
            let bgColor = bgColors[(job.id || 0) % bgColors.length];

            rankListContainer.innerHTML += `
                <div class="rank-card" role="listitem" tabindex="0" onclick="window.location.href='resume5.html?id=${job.id}'" style="cursor: pointer; position: relative; margin-bottom: 12px;" aria-label="ลำดับที่ ${index + 1} บริษัท ${job.company_name} ตำแหน่งที่รับ ${job.job_title} ประเภทงาน ${job.job_type || 'ไม่ระบุ'} คะแนนความเข้ากัน ${job.matchScore} จาก 100 คะแนน กด Enter เพื่อดูรายละเอียด">
                    <div class="rank-number" aria-hidden="true">${index + 1}</div>
                    <div class="rank-logo-placeholder" style="background-color: ${bgColor}; color: white;" aria-hidden="true">${logoText}</div>
                    <div class="rank-company" aria-hidden="true">${job.company_name}</div>
                    <div class="rank-position" aria-hidden="true">
                        <span class="rank-label">ตำแหน่งที่รับ :</span>
                        <span class="rank-value">${job.job_title}</span>
                    </div>
                    <div class="rank-type" aria-hidden="true">
                        <span class="rank-label">ประเภทงาน :</span>
                        <span class="rank-value">${job.job_type || 'ไม่ระบุ'}</span>
                    </div>
                    <div aria-hidden="true" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 65px; height: 65px; border: 3px solid ${bgColor}; border-radius: 50%; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <span style="color: ${bgColor}; font-size: 20px; font-weight: 800; line-height: 1;">${job.matchScore}</span>
                        <span style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px;">/ 100</span>
                    </div>
                </div>
            `;
        });

        const btnRematch = document.getElementById('btn-rematch');
        if (btnRematch) {
            btnRematch.addEventListener('click', () => {
                sessionStorage.removeItem('aiMatchedJobs');
                loadAndRankJobsWithAI();
            });
        }

        document.querySelectorAll('.rank-card').forEach(card => {
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { 
                    e.preventDefault(); 
                    window.location.href = 'job-detail.html?id=' + card.getAttribute('onclick').match(/'([^']+)'/)[1].split('=')[1]; 
                }
            });
        });
    }

    // ── Toggle Save Job ──
    async function toggleSaveJob(btn, jobId, jobTitle, companyName) {
        const sId = (sessionStorage.getItem('userId') || '').split(':')[0].trim();
        if (!sId) {
            alert('กรุณาเข้าสู่ระบบก่อนบันทึกงาน');
            return;
        }
        const isSaved = btn.dataset.saved === 'true';
        const svgSize = btn.querySelector('svg')?.getAttribute('width') || '18';
        try {
            if (isSaved) {
                const res = await fetch(`/api/saved-jobs/${sId}/${jobId}`, { method: 'DELETE' });
                if (!res.ok) { console.error('unsave failed:', res.status); return; }
                btn.dataset.saved = 'false';
                btn.style.background = '#fff';
                btn.style.borderColor = '#e2e8f0';
                btn.innerHTML = `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
                btn.setAttribute('aria-label', 'บันทึกงานนี้');
                btn.title = 'บันทึกงาน';
            } else {
                const res = await fetch('/api/saved-jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ seeker_id: sId, job_id: jobId })
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    console.error('save failed:', res.status, errData);
                    showToast('เกิดข้อผิดพลาดในการบันทึกงาน กรุณาลองใหม่', 'error');
                    return;
                }
                btn.dataset.saved = 'true';
                btn.style.background = '#eff6ff';
                btn.style.borderColor = '#bfdbfe';
                btn.innerHTML = `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
                btn.setAttribute('aria-label', 'ยกเลิกบันทึกงานนี้');
                btn.title = 'ยกเลิกบันทึก';
                // ── แจ้งเตือนพร้อม link ไปโปรไฟล์ ──
                const note = document.createElement('div');
                note.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e3a5f;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:500;z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.25);white-space:nowrap;';
                note.innerHTML = `🔖 บันทึกงานแล้ว! &nbsp;<a href="profile-job.html" style="color:#93c5fd;font-weight:700;text-decoration:underline;">ดูงานที่บันทึก →</a>`;
                document.body.appendChild(note);
                setTimeout(() => { note.style.opacity='0'; note.style.transition='opacity .4s'; setTimeout(() => note.remove(), 400); }, 3000);
            }
        } catch(e) { console.error('toggleSaveJob error:', e); showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ', 'error'); }
    }
    // เปิดให้เรียกได้จาก inline onclick ใน HTML ที่สร้างด้วย innerHTML
    window.toggleSaveJob = toggleSaveJob;

    async function loadAndRankJobsWithAI() {
        try {
            rankListContainer.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; width: 100%;">
                    <svg class="loading-spinner" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1.5s linear infinite; margin: 0 auto;">
                        <circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path>
                    </svg>
                    <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
                    <h3 style="color:#ea580c; margin-top:20px; font-size: 20px;">⚙️ ระบบกำลังวิเคราะห์และจัดอันดับงานที่เหมาะสมที่สุด...</h3>
                    <p style="color:#666; margin-top:10px; font-size: 15px;">กำลังคำนวณความสอดคล้องของทักษะ...</p>
                </div>
            `;

            const userId = (sessionStorage.getItem('userId') || '').split(':')[0].trim() || loggedInId;
            if (!userId) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');

            const res = await fetch(`/api/rank-jobs/${userId}`);
            const ranked = await res.json();

            if (ranked.error) throw new Error(ranked.error);
            if (!Array.isArray(ranked)) throw new Error('ข้อมูลไม่ถูกต้อง กรุณาลองใหม่');

            sessionStorage.setItem('aiMatchedJobs', JSON.stringify(ranked));
            renderRankedJobs(ranked);

        } catch (error) {
            console.error('🔥 Error Detail:', error);
            rankListContainer.innerHTML = `
                <div style="text-align:center; padding: 40px; width: 100%; border: 2px dashed #ef4444; border-radius: 12px; background: #fef2f2;">
                    <h3 style="color:#ef4444; margin-bottom: 10px;">❌ โหลดข้อมูลไม่สำเร็จ</h3>
                    <p style="color:#7f1d1d; font-weight: 600; font-size: 16px;">สาเหตุ: ${error.message}</p>
                </div>
            `;
        }
    }


    // ==========================================
    // --- 13. หน้าส่งเรซูเม่ (resume5.html) ---
    // ==========================================
    if (window.location.pathname.includes('resume5.html')) {

        const r5Params = new URLSearchParams(window.location.search);
        const r5JobId = r5Params.get('id'); // ใช้ ?id= (URL ใหม่จาก home-jobseeker)

        // ── โหลดข้อมูลงาน + AI match เมื่อหน้าโหลด ──
        if (r5JobId) {
            (async function loadResume5JobData() {
                try {
                    // 1. ดึงข้อมูลงาน
                    const jobRes = await fetch(`/api/get-job/${r5JobId}`);
                    const job = await jobRes.json();
                    if (!job || !job.job_title) return;

                    const setEl = (id, text) => {
                        const el = document.getElementById(id);
                        if (el) el.textContent = text || '-';
                    };

                    setEl('render-job-title', job.job_title);
                    setEl('render-company-name', job.company_name);
                    setEl('render-job-desc', job.job_desc);
                    setEl('render-req-skills', job.req_skills);

                    // โลโก้บริษัท (ตัวอักษรย่อ)
                    const logoEl = document.getElementById('render-job-logo');
                    if (logoEl) {
                        const initials = (job.company_name || 'JOB').substring(0, 3).toUpperCase();
                        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
                        logoEl.textContent = initials;
                        logoEl.style.backgroundColor = colors[(job.id || 0) % colors.length];
                        logoEl.style.color = '#fff';
                        logoEl.style.display = 'flex';
                        logoEl.style.alignItems = 'center';
                        logoEl.style.justifyContent = 'center';
                        logoEl.setAttribute('aria-label', `โลโก้บริษัท ${job.company_name || ''}`);
                    }

                    const locEl = document.getElementById('render-job-location');
                    if (locEl) locEl.innerHTML = `<span aria-hidden="true">📍</span> ${job.job_location || '-'}`;

                    const typeEl = document.getElementById('render-job-type');
                    if (typeEl) typeEl.innerHTML = `<span aria-hidden="true">💼</span> ${job.job_type || '-'}`;

                    const salaryEl = document.getElementById('render-job-salary');
                    if (salaryEl) salaryEl.innerHTML = `<span aria-hidden="true">💰</span> ${job.salary || 'ตามตกลง'}`;

                    const disSupportEl = document.getElementById('render-disability-support');
                    if (disSupportEl) {
                        const accom = job.accommodation || 'ไม่ได้ระบุ';
                        disSupportEl.innerHTML =
                            `บริษัทยินดีต้อนรับผู้สมัครที่เป็นผู้พิการ <strong>${job.disability_type || 'รับทุกประเภท'}</strong> ` +
                            `โดยมีสิ่งอำนวยความสะดวก: <strong>${accom}</strong>`;
                    }

                    // 2. วิเคราะห์ความเหมาะสมจาก calcMatchScore (บันทึก DB)
                    const aiReasonSection = document.getElementById('ai-match-reason-section');
                    const aiReasonsList = document.getElementById('render-ai-reasons');
                    const aiLoadingState = document.getElementById('ai-loading-state');

                    const hideLoading = () => { if (aiLoadingState) aiLoadingState.style.display = 'none'; };
                    const showList    = () => { if (aiReasonsList) aiReasonsList.style.display = 'block'; };

                    let resumeData = null;

                    if (loggedInId) {
                        try {
                            if (aiReasonSection) aiReasonSection.style.display = 'block';

                            // ── เรียก API วิเคราะห์ (ใช้ calcMatchScore + cache DB) ──
                            const analysisRes = await fetch(`/api/match-analysis/${loggedInId}/${r5JobId}`);
                            const analysisData = await analysisRes.json();

                            // โหลด resumeData สำหรับใช้ใน popup ด้านล่าง
                            try {
                                const rRes = await fetch(`/api/get-resume/${loggedInId}`);
                                resumeData = await rRes.json();
                            } catch(_) {}

                            hideLoading();
                            showList();

                            if (analysisData.error === 'no_resume') {
                                if (aiReasonsList) {
                                    aiReasonsList.style.listStyle = 'none';
                                    aiReasonsList.style.paddingLeft = '0';
                                    aiReasonsList.innerHTML = '<li>กรุณาสร้างเรซูเม่ก่อนเพื่อดูการวิเคราะห์</li>';
                                }
                            } else if (analysisData.ai_narrative) {
                                // ── แสดง AI narrative เป็นย่อหน้า ──
                                if (aiReasonsList) {
                                    aiReasonsList.style.listStyle = 'none';
                                    aiReasonsList.style.paddingLeft = '0';
                                    aiReasonsList.innerHTML = `
                                        <li style="margin-bottom:16px;line-height:1.9;font-size:15px;color:#374151;">
                                            ${analysisData.ai_narrative}
                                        </li>
                                        <li>
                                            <details style="margin-top:8px;">
                                                <summary style="cursor:pointer;font-size:13px;color:#ea580c;font-weight:600;">
                                                    ดูรายละเอียดคะแนนแต่ละเกณฑ์
                                                </summary>
                                                <ul style="margin-top:10px;padding-left:18px;font-size:13px;color:#6b7280;line-height:1.8;">
                                                    ${(analysisData.reasons || []).map(r => `<li>${r}</li>`).join('')}
                                                </ul>
                                            </details>
                                        </li>`;
                                }
                            } else if (analysisData.reasons && analysisData.reasons.length > 0) {
                                // fallback: แสดง reasons list ถ้า AI ไม่ตอบ
                                if (aiReasonsList) aiReasonsList.innerHTML =
                                    analysisData.reasons.map(r => `<li style="margin-bottom:8px;">${r}</li>`).join('');
                            } else {
                                if (aiReasonsList) aiReasonsList.innerHTML = '<li>ไม่พบข้อมูลการวิเคราะห์</li>';
                            }

                        } catch (analysisErr) {
                            console.warn('match-analysis error:', analysisErr.message);
                            hideLoading();
                            showList();
                            if (aiReasonsList) aiReasonsList.innerHTML = '<li>ไม่สามารถวิเคราะห์ได้ในขณะนี้</li>';
                        }
                    }

                                                        // ── แสดง popup modal ถ้าคะแนน ranking ต่ำกว่า 50 ──
                                    try {
                                        const cachedRanked = sessionStorage.getItem('aiMatchedJobs');
                                        if (cachedRanked && r5JobId) {
                                            const ranked = JSON.parse(cachedRanked);
                                            const thisJob = ranked.find(j => String(j.id) === String(r5JobId));
                                            if (thisJob && thisJob.matchScore < 50) {
                                                // (ยังคงส่งได้แม้คะแนนต่ำ — จะไปอยู่ในช่องไม่ผ่านเกณฑ์ของนายจ้าง)

                                                // ── คำนวณ suggestions โดยตรงจากข้อมูล job + resume ──
                                                const _EDU_MAP = { any:'ไม่จำกัด', highschool:'ม.6', vocational:'ปวช.', diploma:'ปวส.', bachelor:'ปริญญาตรี', master:'ปริญญาโทขึ้นไป' };
                                                const _sugg = [];

                                                // 1. ประเภทความพิการ
                                                if (job.disability_type && !job.disability_type.includes('รับทุกประเภท')) {
                                                    const myDis = resumeData.disability_type || '';
                                                    if (!myDis || !job.disability_type.includes(myDis)) {
                                                        _sugg.push(`♿ ตำแหน่งนี้รับผู้พิการประเภท <strong>"${job.disability_type}"</strong> — กรุณาตรวจสอบข้อมูลความพิการในเรซูเม่ของคุณ`);
                                                    }
                                                }

                                                // 2. ระดับความพิการ
                                                if (job.disability_level) {
                                                    _sugg.push(`📋 ตำแหน่งนี้ระบุระดับความพิการ <strong>"${job.disability_level}"</strong> — ตรวจสอบว่าระดับของคุณตรงกัน`);
                                                }

                                                // 3. การศึกษา
                                                if (job.req_education && job.req_education !== 'any') {
                                                    const eduLabel = _EDU_MAP[job.req_education] || job.req_education;
                                                    _sugg.push(`🎓 ต้องการวุฒิการศึกษา <strong>"${eduLabel}"</strong> ขึ้นไป — เพิ่มประวัติการศึกษาให้ครบถ้วนในเรซูเม่`);
                                                }

                                                // 4. ประสบการณ์
                                                if (job.req_experience && job.req_experience !== 'ไม่จำเป็น') {
                                                    _sugg.push(`💼 ต้องการประสบการณ์ <strong>"${job.req_experience}"</strong> — เพิ่มประวัติการทำงานหรือฝึกงานในเรซูเม่`);
                                                }

                                                // 5. ทักษะที่ขาด
                                                if (job.req_skills) {
                                                    const mySkillsLow = (resumeData.skills || '').toLowerCase();
                                                    const reqSkills = job.req_skills.split(',').map(s => s.trim()).filter(Boolean);
                                                    const missing = reqSkills.filter(s => !mySkillsLow.includes(s.toLowerCase()));
                                                    if (missing.length > 0) {
                                                        _sugg.push(`💡 ทักษะที่ควรเพิ่มในเรซูเม่: <strong>${missing.join(', ')}</strong>`);
                                                    }
                                                }

                                                // 6. รูปแบบการทำงาน
                                                if (job.work_mode && resumeData.preferred_work_mode &&
                                                    job.work_mode !== 'ยืดหยุ่น / ตามตกลง' &&
                                                    resumeData.preferred_work_mode !== 'ยืดหยุ่น / ตามตกลง' &&
                                                    job.work_mode !== resumeData.preferred_work_mode) {
                                                    _sugg.push(`🏢 งานนี้เป็นรูปแบบ <strong>"${job.work_mode}"</strong> แต่คุณเลือก <strong>"${resumeData.preferred_work_mode}"</strong>`);
                                                }

                                                // 7. สถานที่
                                                if (job.job_location && resumeData.province &&
                                                    !job.job_location.includes(resumeData.province)) {
                                                    _sugg.push(`📍 งานนี้อยู่ที่ <strong>${job.job_location}</strong> แต่ที่อยู่ของคุณคือ <strong>${resumeData.province}</strong> — พิจารณางานใกล้บ้านหรือ WFH`);
                                                }

                                                // ถ้าไม่มี suggestions เลย ให้แนะนำทั่วไป
                                                if (_sugg.length === 0) {
                                                    _sugg.push('📝 เพิ่มทักษะและประสบการณ์ทำงาน/ฝึกงานให้มากขึ้นในเรซูเม่เพื่อเพิ่มคะแนนความเข้ากัน');
                                                    _sugg.push('🎓 ระบุประวัติการศึกษาให้ครบถ้วน พร้อมระดับวุฒิที่ชัดเจน');
                                                }

                                                const _suggestHtml = `
                                                    <div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:12px;padding:16px;margin-bottom:16px;">
                                                        <p style="font-size:14px;font-weight:700;color:#C2410C;margin:0 0 10px;">💡 สิ่งที่ควรเพิ่มเติมเพื่อเพิ่มคะแนน</p>
                                                        <ul style="margin:0;padding-left:18px;font-size:13px;color:#7C2D12;line-height:1.9;">
                                                            ${_sugg.map(s => `<li style="margin-bottom:6px;">${s}</li>`).join('')}
                                                        </ul>
                                                    </div>`;

                                                // ── ดึงงานแนะนำจาก server ──
                                                let _recHtml = '';
                                                try {
                                                    const pmRes = await fetch(`/api/preview-match/${loggedInId}/${r5JobId}`);
                                                    const pmData = await pmRes.json();
                                                    const pmRec = pmData.recommended_jobs || [];
                                                    if (pmRec.length > 0) {
                                                        const bgCols = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];
                                                        _recHtml = `<div>
                                                            <p style="font-size:14px;font-weight:700;color:#1e40af;margin:0 0 10px;">🌟 งานที่เหมาะสมกับคุณมากกว่า</p>
                                                            <div style="display:flex;flex-direction:column;gap:8px;">
                                                                ${pmRec.map(j => {
                                                                    const col = bgCols[(j.id||0) % bgCols.length];
                                                                    return `<a href="resume5.html?id=${j.id}" style="display:flex;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;text-decoration:none;color:#0f172a;">
                                                                        <div style="width:36px;height:36px;border-radius:8px;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${(j.company_name||'JOB').substring(0,3).toUpperCase()}</div>
                                                                        <div><div style="font-weight:600;font-size:13px;">${j.job_title}</div><div style="font-size:12px;color:#64748b;">${j.company_name} · ${j.matchScore}% เข้ากัน</div></div>
                                                                    </a>`;
                                                                }).join('')}
                                                            </div>
                                                        </div>`;
                                                    }
                                                } catch(_recErr) {}

                                                // ── สร้าง popup modal ──
                                                const _m = document.createElement('div');
                                                _m.id = 'r5-low-score-modal';
                                                _m.setAttribute('role', 'dialog');
                                                _m.setAttribute('aria-modal', 'true');
                                                _m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;';
                                                _m.innerHTML = `
                                                    <div style="background:#fff;border-radius:20px;padding:28px 24px;width:100%;max-width:520px;margin:40px auto;box-shadow:0 24px 60px rgba(0,0,0,0.25);position:relative;">
                                                        <button id="r5-modal-close" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;" aria-label="ปิด">✕</button>
                                                        <div style="text-align:center;margin-bottom:20px;">
                                                            <div style="width:90px;height:90px;border-radius:50%;border:7px solid #ef4444;color:#ef4444;background:#fff7ed;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:26px;font-weight:800;">${thisJob.matchScore}%</div>
                                                            <h2 style="font-size:17px;font-weight:700;color:#0f172a;margin:0 0 4px;">คะแนนความเข้ากัน</h2>
                                                            <p style="font-size:13px;color:#ea580c;font-weight:600;margin:0;">💡 คะแนนต่ำกว่า 50% — เรซูเม่จะอยู่ในกลุ่มไม่ผ่านเกณฑ์คัดเลือกของนายจ้าง</p>
                                                        </div>
                                                        ${_suggestHtml}
                                                        ${_recHtml}
                                                    </div>
                                                `;
                                                document.body.appendChild(_m);
                                                document.body.style.overflow = 'hidden';

                                                const _closeModal = () => { _m.remove(); document.body.style.overflow = ''; };
                                                _m.querySelector('#r5-modal-close').addEventListener('click', _closeModal);
                                                _m.addEventListener('click', e => { if (e.target === _m) _closeModal(); });
                                                document.addEventListener('keydown', function _r5Esc(e) {
                                                    if (e.key === 'Escape') { _closeModal(); document.removeEventListener('keydown', _r5Esc); }
                                                });
                                            }
                                        }
                                    } catch(_) {}
                } catch (err) {
                    console.error('Error loading resume5 job data:', err);
                }
            })();
        }

        // ── ปุ่มส่งเรซูเม่ ──
        const btnSendResume = document.getElementById('btn-send-resume');
        const sendSuccessModal = document.getElementById('send-success-modal');

        if (sendSuccessModal) sendSuccessModal.setAttribute('role', 'alertdialog');

        if (btnSendResume) {
            btnSendResume.addEventListener('click', async () => {
                const jobId = new URLSearchParams(window.location.search).get('id'); // ใช้ ?id= แทน ?jobId=

                if (!loggedInId) {
                    alert('กรุณาเข้าสู่ระบบก่อนสมัครงาน');
                    return;
                }

                // (ส่งได้เสมอ ไม่ว่าคะแนนจะเท่าไหร่)

                // ตรวจสอบว่ามีเรซูเม่หรือยัง
                try {
                    const resResume = await fetch(`/api/get-resume/${loggedInId}`);
                    const resumeCheck = await resResume.json();
                    if (!resumeCheck || !resumeCheck.seeker_id) {
                        // ยังไม่มีเรซูเม่ → แสดง modal แนะนำไปสร้าง
                        const m = document.createElement('div');
                        m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
                        m.innerHTML = `
                            <div style="background:#fff;border-radius:20px;padding:36px 28px 28px;width:100%;max-width:420px;box-shadow:0 24px 60px rgba(0,0,0,0.2);text-align:center;">
                                <div style="font-size:48px;margin-bottom:16px;">📄</div>
                                <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 10px;">ยังไม่มีเรซูเม่</h3>
                                <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px;">คุณต้องสร้างและบันทึกเรซูเม่ก่อน<br>จึงจะสามารถส่งใบสมัครได้ ใช้เวลาแค่ไม่กี่นาที!</p>
                                <div style="display:flex;gap:10px;justify-content:center;">
                                    <button id="_sr5_go_resume" style="flex:1;max-width:180px;padding:12px 16px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;">
                                        🚀 ไปสร้างเรซูเม่เลย
                                    </button>
                                    <button id="_sr5_cancel_resume" style="padding:12px 18px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;font-weight:600;font-size:14px;cursor:pointer;">
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                        `;
                        m.querySelector('#_sr5_go_resume').addEventListener('click', () => { window.location.href = 'resume.html'; });
                        m.querySelector('#_sr5_cancel_resume').addEventListener('click', () => m.remove());
                        m.addEventListener('click', e => { if (e.target === m) m.remove(); });
                        document.body.appendChild(m);
                        return;
                    }
                } catch(_) {
                    // ถ้าตรวจสอบไม่ได้ ให้ผ่านต่อ (fail open)
                }

                try {
                    const res = await fetch('/api/apply-job', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            seeker_id: loggedInId,
                            job_id: jobId || 0,
                            match_score: 0,
                            match_details: []
                        })
                    });

                    const data = await res.json();

                    if (data.success) {
                        announce('ส่งเรซูเม่สำเร็จ');
                        if (sendSuccessModal) sendSuccessModal.style.display = 'flex';

                        btnSendResume.textContent = 'ส่งเรซูเม่แล้ว';
                        btnSendResume.style.backgroundColor = '#D9D9D9';
                        btnSendResume.style.color = '#666';
                        btnSendResume.style.boxShadow = 'none';
                        btnSendResume.style.cursor = 'default';
                        btnSendResume.disabled = true;
                        btnSendResume.setAttribute('aria-label', 'ส่งเรซูเม่สำหรับงานนี้แล้ว ไม่สามารถกดซ้ำได้');

                        setTimeout(() => {
                            if (sendSuccessModal) sendSuccessModal.style.display = 'none';
                        }, 3000);
                    } else {
                        alert('❌ เกิดข้อผิดพลาดในการส่งใบสมัคร: ' + data.error);
                    }
                } catch (err) {
                    alert('⚠️ เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
                }
            });

            if (sendSuccessModal) {
                sendSuccessModal.addEventListener('click', (e) => {
                    if (e.target === sendSuccessModal) sendSuccessModal.style.display = 'none';
                });
            }
        }

        // ── ปุ่มบันทึกงาน (บน card รายละเอียด) ──
        const btnSaveR5 = document.getElementById('btn-save-job-r5');
        if (btnSaveR5 && r5JobId && loggedInId) {
            // ตรวจสอบสถานะที่บันทึกไว้แล้ว
            (async function initR5SaveBtn() {
                try {
                    const svRes = await fetch(`/api/saved-jobs/${loggedInId}`);
                    const svData = await svRes.json();
                    const alreadySaved = Array.isArray(svData) && svData.some(j => String(j.id) === String(r5JobId));
                    if (alreadySaved) {
                        btnSaveR5.dataset.saved = 'true';
                        btnSaveR5.style.background = '#eff6ff';
                        btnSaveR5.style.borderColor = '#bfdbfe';
                        btnSaveR5.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
                        btnSaveR5.setAttribute('aria-label', 'ยกเลิกบันทึกงานนี้');
                        btnSaveR5.title = 'ยกเลิกบันทึก';
                    } else {
                        btnSaveR5.dataset.saved = 'false';
                    }
                } catch(_) {}
            })();

            btnSaveR5.addEventListener('click', () => {
                // ดึงชื่องานและบริษัทจาก DOM ที่โหลดแล้ว
                const jTitle = document.getElementById('render-job-title')?.textContent || '';
                const jCo    = document.getElementById('render-company-name')?.textContent || '';
                toggleSaveJob(btnSaveR5, r5JobId, jTitle, jCo);
            });
        }

    } // end resume5.html

    // ==========================================
    // --- 14. หน้าโพสต์งานของนายจ้าง (post-employer.html) ---
    // ==========================================

    // ── แสดง toast เมื่อชำระเงินสำเร็จ (redirect จาก payment.html) ──
    if (window.location.pathname.includes('post-employer.html')) {
        const payResult = new URLSearchParams(window.location.search).get('payment');
        const payPlan = new URLSearchParams(window.location.search).get('plan');
        if (payResult === 'success') {
            const planLabel = payPlan === 'yearly' ? 'รายปี (365 วัน)' : 'รายเดือน (30 วัน)';
            const toast = document.createElement('div');
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            toast.style.cssText = [
                'position:fixed', 'top:88px', 'left:50%', 'transform:translateX(-50%)',
                'background:#013c58', 'color:#fff', 'padding:14px 28px',
                'border-radius:12px', 'font-size:0.92rem', 'font-weight:600',
                'box-shadow:0 4px 24px rgba(0,0,0,.18)', 'z-index:9999',
                'display:flex', 'align-items:center', 'gap:10px'
            ].join(';');
            toast.innerHTML = `✅ ชำระเงินแพ็คเกจ <strong style="margin:0 4px;">${planLabel}</strong> สำเร็จ! โพสต์งานของคุณได้รับการอัปเดตแล้ว`;
            document.body.appendChild(toast);
            // ลบ query string ออกจาก URL โดยไม่ reload
            history.replaceState({}, '', 'post-employer.html');
            setTimeout(() => toast.remove(), 5000);
        }
    }

    const postJobForm = document.getElementById('post-job-form');
    const postSuccessModal = document.getElementById('post-success-modal');

    // ── ตรวจสอบ Edit Mode ──
    const _editJobId = new URLSearchParams(window.location.search).get('id');
    const _isEditMode = new URLSearchParams(window.location.search).get('edit') === 'true' && !!_editJobId;

    if (_isEditMode && postJobForm) {
        // เปลี่ยน UI เป็น "แก้ไขโพสต์"
        const titleEl = document.getElementById('post-job-title');
        const submitBtn = postJobForm.querySelector('.btn-submit-resume');
        if (titleEl) titleEl.textContent = 'แก้ไขประกาศงาน';
        if (submitBtn) { submitBtn.textContent = 'บันทึกการแก้ไข'; submitBtn.setAttribute('aria-label', 'บันทึกการแก้ไขประกาศงาน'); }

        // Pre-fill ข้อมูลเดิม
        fetch(`/api/get-job/${_editJobId}`)
            .then(r => r.json())
            .then(job => {
                if (!job || !job.job_title) return;

                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                setVal('job-title', job.job_title);
                setVal('job-category', job.job_category);
                setVal('job-type', job.job_type);
                setVal('job-location', job.job_location);
                setVal('job-salary', job.salary);
                setVal('facility-desc', job.accommodation);
                setVal('req-experience', job.req_experience);
                setVal('req-education', job.req_education || 'any');
                setVal('age-min', job.age_min || '');
                setVal('age-max', job.age_max || '');

                // Pre-fill work mode radio
                const workModeVal = job.work_mode || 'onsite';
                const workModeRadio = document.querySelector(`input[name="work-mode"][value="${workModeVal}"]`);
                if (workModeRadio) workModeRadio.checked = true;

                // แยก job_desc กลับเป็น description + qualifications
                let desc = '', qual = '';
                if (job.job_desc) {
                    const parts = job.job_desc.split('\n\nคุณสมบัติผู้สมัคร:\n');
                    desc = (parts[0] || '').replace(/^รายละเอียดงาน:\n/, '');
                    qual = parts[1] || '';
                }
                setVal('job-description', desc);
                setVal('job-qualifications', qual);

                // Pre-fill disability checkboxes
                const disMap = [
                    { id: 'visual', name: 'ทางการมองเห็น' },
                    { id: 'hearing', name: 'ทางการได้ยินหรือสื่อความหมาย' },
                    { id: 'physical', name: 'ทางกายหรือการเคลื่อนไหว' },
                ];
                if (job.disability_type && job.disability_type !== 'รับทุกประเภท') {
                    disMap.forEach(({ id, name }) => {
                        if (!job.disability_type.includes(name)) return;
                        const cb = document.getElementById('dis-' + id);
                        if (cb) {
                            cb.checked = true;
                            if (typeof toggleDisabilityLevel === 'function') toggleDisabilityLevel(id);
                            // หา level text ระหว่าง "name (" ... ")" แบบ nested-safe
                            const idx = job.disability_type.indexOf(name + ' (');
                            if (idx !== -1) {
                                const after = job.disability_type.slice(idx + name.length + 2);
                                let depth = 1, i = 0;
                                while (i < after.length && depth > 0) {
                                    if (after[i] === '(') depth++;
                                    else if (after[i] === ')') depth--;
                                    i++;
                                }
                                const levelText = after.slice(0, i - 1);
                                const levelSel = document.getElementById('level-select-' + id);
                                if (levelSel) {
                                    for (const opt of levelSel.options) {
                                        if (opt.text === levelText) { levelSel.value = opt.value; break; }
                                    }
                                }
                            }
                        }
                    });
                }

                // Pre-fill skill checkboxes
                if (job.req_skills) {
                    const skillSet = new Set(job.req_skills.split(',').map(s => s.trim()));
                    document.querySelectorAll('#post-job-form .skill-checkbox').forEach(cb => {
                        if (skillSet.has(cb.value)) cb.checked = true;
                    });
                }
            })
            .catch(err => console.error('Error pre-filling job:', err));
    }

    if (postJobForm && postSuccessModal) {
        postJobForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const employerId = sessionStorage.getItem('userId');
            if (!employerId) {
                alert('⚠️ เซสชันหมดอายุ กรุณาเข้าสู่ระบบนายจ้างอีกครั้ง');
                window.location.href = 'login-employer.html?mode=login';
                return;
            }

            const job_title = document.getElementById('job-title')?.value || '';
            const job_category = document.getElementById('job-category')?.value || '';
            const job_type = document.getElementById('job-type')?.value || '';
            const job_location = document.getElementById('job-location')?.value || '';
            const job_salary = document.getElementById('job-salary')?.value || '';
            const facility_desc = document.getElementById('facility-desc')?.value || '';

            const desc = document.getElementById('job-description')?.value || '';
            const qual = document.getElementById('job-qualifications')?.value || '';

            // Collect disability types
            const disEntries = [
                { id: 'visual', name: 'ทางการมองเห็น' },
                { id: 'hearing', name: 'ทางการได้ยินหรือสื่อความหมาย' },
                { id: 'physical', name: 'ทางกายหรือการเคลื่อนไหว' },
            ];
            const selectedDis = disEntries
                .filter(d => document.getElementById('dis-' + d.id)?.checked)
                .map(d => {
                    const levelEl = document.getElementById('level-select-' + d.id);
                    if (levelEl?.value) {
                        const levelText = levelEl.options[levelEl.selectedIndex]?.text || '';
                        return `${d.name} (${levelText})`;
                    }
                    return d.name;
                });
            const disability_type = selectedDis.join(', ') || 'รับทุกประเภท';

            // Collect skills
            const allSkillChecks = document.querySelectorAll('#post-job-form .skills-group .skill-checkbox:checked');
            const req_skills = Array.from(allSkillChecks)
                .map(cb => cb.value || cb.nextElementSibling?.textContent.trim())
                .filter(Boolean)
                .join(', ');

            const req_experience = document.getElementById('req-experience')?.value || '';
            const req_education = document.getElementById('req-education')?.value || 'any';
            const age_min = document.getElementById('age-min')?.value ? parseInt(document.getElementById('age-min').value) : null;
            const age_max = document.getElementById('age-max')?.value ? parseInt(document.getElementById('age-max').value) : null;
            const work_mode = document.querySelector('input[name="work-mode"]:checked')?.value || 'onsite';

            const payload = {
                employer_id: employerId,
                job_title, job_category, job_type, job_location,
                job_salary, facility_desc,
                job_description: desc,
                job_qualifications: qual,
                disability_type: disability_type || 'รับทุกประเภท',
                req_skills, req_experience,
                work_mode, req_education, age_min, age_max,
                status: 'open'
            };

            try {
                let response;
                if (_isEditMode) {
                    // ── Edit mode: PATCH ──
                    response = await fetch(`/api/jobs/${_editJobId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    // ── Create mode: POST ──
                    response = await fetch('/api/save-job', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                const result = await response.json();

                if (result.success) {
                    const modalTitle = postSuccessModal.querySelector('.modal-text');
                    const modalDesc = postSuccessModal.querySelector('#post-success-desc');
                    if (_isEditMode) {
                        if (modalTitle) modalTitle.textContent = 'แก้ไขโพสต์งานสำเร็จ!';
                        if (modalDesc) modalDesc.textContent = 'ข้อมูลประกาศงานถูกอัปเดตเรียบร้อยแล้ว';
                    }
                    announce(_isEditMode ? 'แก้ไขโพสต์งานสำเร็จ' : 'โพสต์งานสำเร็จ ระบบกำลังพาท่านไปหน้าถัดไป');
                    postSuccessModal.style.display = 'flex';
                    postSuccessModal.setAttribute('data-job-id', result.job_id);

                    setTimeout(() => {
                        postSuccessModal.style.display = 'none';
                        if (_isEditMode) {
                            window.location.href = 'profile-em.html';
                        } else {
                            window.location.href = 'post-employer2.html?jobId=' + result.job_id;
                        }
                    }, 2000);
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + (result.error || result.message));
                }
            } catch (error) {
                alert('⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่ารัน node server.js หรือยัง');
            }
        });

        postSuccessModal.addEventListener('click', (e) => {
            if (e.target === postSuccessModal) {
                postSuccessModal.style.display = 'none';
                if (_isEditMode) {
                    window.location.href = 'profile-em.html';
                } else {
                    const savedJobId = postSuccessModal.getAttribute('data-job-id');
                    window.location.href = 'post-employer2.html' + (savedJobId ? '?jobId=' + savedJobId : '');
                }
            }
        });
    }

    // ==========================================
    // --- 15. ปุ่ม "ย้อนกลับ" ---
    // ==========================================
    const backButtons = document.querySelectorAll('.btn-back');
    backButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentPage = window.location.pathname.split("/").pop();

            if (currentPage === 'resume2.html') {
                window.location.href = 'resume.html';
            } else if (currentPage === 'resume3.html') {
                window.location.href = 'resume2.html';
            } else if (currentPage === 'resume4.html') {
                window.location.href = 'resume3.html';
            } else if (currentPage === 'resume5.html') {
                window.location.href = 'resume4.html';
            } else {
                window.history.back();
            }
        });
    });

    // ==========================================
    // 🌟 16. ระบบดึงข้อมูลงานมาแสดงในหน้า post-employer2.html และ resume5.html
    // ==========================================
    const isJobDetailPage = window.location.pathname.includes('post-employer2.html') || window.location.pathname.includes('resume5.html');

    if (isJobDetailPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const jobId = urlParams.get('jobId');

        if (jobId) {
            fetch(`/api/get-job/${jobId}`)
                .then(res => res.json())
                .then(job => {
                    if (job && job.job_title) {
                        const setEl = (id, text) => { if (document.getElementById(id)) document.getElementById(id).textContent = text; };

                        setEl('render-job-title', job.job_title);
                        setEl('render-company-name', job.company_name);

                        const logoEl = document.getElementById('render-job-logo');
                        if (logoEl) {
                            let logoText = job.company_name ? job.company_name.substring(0, 3).toUpperCase() : 'JOB';
                            logoEl.textContent = logoText;

                            let badgeColor = '#ea580c';
                            const cachedJobsStr = sessionStorage.getItem('aiMatchedJobs');
                            let matchedJob = null;
                            if (cachedJobsStr) {
                                const cachedJobs = JSON.parse(cachedJobsStr);
                                matchedJob = cachedJobs.find(j => String(j.id) === String(jobId));
                                if (matchedJob) {
                                    const bgColors = ['#000000', '#17A05D', '#00A5E0', '#EE3124', '#E2231A', '#005A9C', '#FF6600', '#0F146D', '#00A651'];
                                    badgeColor = bgColors[(matchedJob.id || 0) % bgColors.length];
                                }
                            }

                            logoEl.style.backgroundColor = badgeColor;
                            logoEl.style.color = '#ffffff';
                            logoEl.style.display = 'flex';
                            logoEl.style.alignItems = 'center';
                            logoEl.style.justifyContent = 'center';

                            const aiReasonSection = document.getElementById('ai-match-reason-section');
                            const aiReasonsList = document.getElementById('render-ai-reasons');
                            if (aiReasonSection && aiReasonsList && matchedJob && matchedJob.matchDetails && matchedJob.matchDetails.length > 0) {
                                aiReasonSection.style.display = 'block';
                                aiReasonsList.innerHTML = matchedJob.matchDetails.map(reason => `<li style="margin-bottom: 8px;">${reason}</li>`).join('');
                            }
                        }

                        const _svgPin16 = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span class="sr-only">สถานที่ทำงาน:</span>`;
                        const _svgWork16 = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg><span class="sr-only">ประเภทงาน:</span>`;
                        const _svgMoney16 = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span class="sr-only">เงินเดือน:</span>`;

                        const locEl = document.getElementById('render-job-location');
                        if (locEl) locEl.innerHTML = `${_svgPin16} ${job.job_location || '-'}`;

                        const typeEl = document.getElementById('render-job-type');
                        if (typeEl) typeEl.innerHTML = `${_svgWork16} ${job.job_type || '-'}`;

                        const salaryEl = document.getElementById('render-job-salary');
                        if (salaryEl) salaryEl.innerHTML = `${_svgMoney16} ${job.salary || 'ตามตกลง'}`;

                        setEl('render-job-desc', job.job_desc || '-');
                        setEl('render-req-skills', job.req_skills || '-');

                        // ── Work Mode tag ──
                        const _svgBuilding16 = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6M3 15h6M13 7h5M13 11h5M13 15h5"/></svg>`;
                        const _svgRefresh16 = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>`;
                        const _svgHome16 = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

                        // 🌟 เปลี่ยนชุดคำศัพท์ตรงนี้ 🌟
                        const WORK_MODE_LBL = {
                            onsite: `${_svgBuilding16}<span class="sr-only">รูปแบบการทำงาน:</span> ทำงานที่ออฟฟิศ`,
                            hybrid: `${_svgRefresh16}<span class="sr-only">รูปแบบการทำงาน:</span> ออฟฟิศสลับทำที่บ้าน`,
                            remote: `${_svgHome16}<span class="sr-only">รูปแบบการทำงาน:</span> ทำงานที่บ้าน`,

                            // เพิ่มคำภาษาไทยที่ตรงกับ Database
                            'ทำงานที่ออฟฟิศ': `${_svgBuilding16}<span class="sr-only">รูปแบบการทำงาน:</span> ทำงานที่ออฟฟิศ`,
                            'ทำที่ออฟฟิศสลับทำที่บ้าน': `${_svgRefresh16}<span class="sr-only">รูปแบบการทำงาน:</span> ออฟฟิศสลับทำที่บ้าน`,
                            'ออฟฟิศสลับทำที่บ้าน': `${_svgRefresh16}<span class="sr-only">รูปแบบการทำงาน:</span> ออฟฟิศสลับทำที่บ้าน`,
                            'ทำงานที่บ้าน': `${_svgHome16}<span class="sr-only">รูปแบบการทำงาน:</span> ทำงานที่บ้าน`,
                            'ยืดหยุ่น / ตามตกลง': `${_svgBuilding16}<span class="sr-only">รูปแบบการทำงาน:</span> ยืดหยุ่น / ตามตกลง`,
                            'ยืดหยุ่น': `${_svgBuilding16}<span class="sr-only">รูปแบบการทำงาน:</span> ยืดหยุ่น / ตามตกลง`
                        };
                        const workModeEl16 = document.getElementById('render-work-mode');
                        if (workModeEl16 && job.work_mode && WORK_MODE_LBL[job.work_mode]) {
                            workModeEl16.innerHTML = WORK_MODE_LBL[job.work_mode];
                            workModeEl16.style.display = '';
                        }

                        // ── คุณสมบัติที่ต้องการ ──
                        const EDU_LBL = { any: 'ไม่จำกัด', highschool: 'ม.6', vocational: 'ปวช.', diploma: 'ปวส.', bachelor: 'ปริญญาตรี', master: 'ปริญญาโทขึ้นไป' };
                        const eduEl16 = document.getElementById('render-req-education');
                        if (eduEl16) eduEl16.textContent = EDU_LBL[job.req_education] || job.req_education || 'ไม่จำกัด';
                        const ageEl16 = document.getElementById('render-age-range');
                        if (ageEl16) ageEl16.textContent = (job.age_min && job.age_max) ? `${job.age_min}–${job.age_max} ปี` : 'ไม่จำกัด';
                        const expEl16 = document.getElementById('render-req-experience');
                        if (expEl16) expEl16.textContent = job.req_experience || 'ไม่จำเป็น';

                        const disSupportEl = document.getElementById('render-disability-support');
                        if (disSupportEl) {
                            const accom = job.accommodation ? job.accommodation : 'ไม่ได้ระบุ';
                            disSupportEl.innerHTML = `บริษัทยินดีต้อนรับผู้สมัครที่เป็นผู้พิการ <strong>${job.disability_type || 'รับทุกประเภท'}</strong> โดยมีสิ่งอำนวยความสะดวก: <strong>${accom}</strong>`;
                        }
                    }
                })
                .catch(err => console.error("Error fetching job details:", err));
        }
    }

    // ==========================================
    // 🌟 17. ระบบดาวน์โหลดเรซูเม่เป็น PDF (หน้า profile-job2.html)
    // ==========================================
    if (window.location.pathname.includes('profile-job2.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('export') === 'pdf') {
            setTimeout(() => {
                const buttons = document.querySelectorAll('.btn-submit-resume, .site-header');
                buttons.forEach(btn => btn.style.display = 'none');

                window.print();

                buttons.forEach(btn => btn.style.display = '');
            }, 1500);
        }
    }


    // ==========================================
    // 🌟 18. หน้าดึงข้อมูลงานแบบเจาะจง (job-detail.html) และ ส่งใบสมัคร
    // ==========================================
    if (window.location.pathname.includes('job-detail.html')) {
        const CAT_LABELS_JD = { admin: 'งานธุรการ / สำนักงาน', it: 'งานไอที / ซอฟต์แวร์', service: 'งานบริการ / ลูกค้าสัมพันธ์', production: 'งานผลิต / บรรจุภัณฑ์', finance: 'งานบัญชี / การเงิน' };
        const TYPE_LABELS_JD = { fulltime: 'พนักงานประจำ (Full-Time)', parttime: 'พาร์ทไทม์ (Part-Time)', freelance: 'ฟรีแลนซ์ (Freelance)', contract: 'สัญญาจ้าง (Contract)' };
        const DIS_LABELS_JD = { visual: 'ทางการมองเห็น', hearing: 'ทางการได้ยิน', physical: 'ทางกายหรือการเคลื่อนไหว' };

        const jdAvatar = document.getElementById('jd-user-avatar');
        const jdProfileBtn = document.getElementById('jd-user-profile-btn');
        if (jdAvatar && loggedInUser) {
            jdAvatar.textContent = loggedInUser.charAt(0).toUpperCase();
            if (jdProfileBtn) jdProfileBtn.setAttribute('aria-label', `เมนูโปรไฟล์ของ ${loggedInUser}`);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const jobId = urlParams.get('id');

        const loadingEl = document.getElementById('jd-loading');
        const errorEl = document.getElementById('jd-error');
        const cardEl = document.getElementById('jd-card');

        function showState(state) {
            if (loadingEl) loadingEl.style.display = state === 'loading' ? 'block' : 'none';
            if (errorEl) errorEl.style.display = state === 'error' ? 'block' : 'none';
            if (cardEl) cardEl.style.display = state === 'ready' ? 'block' : 'none';
        }

        let currentJobData = null;

        if (!jobId) {
            showState('error');
        } else {
            showState('loading');
            fetch(`/api/get-job/${jobId}`)
                .then(res => res.json())
                .then(job => {
                    if (!job || !job.job_title) { showState('error'); return; }

                    currentJobData = job;

                    const titleEl = document.getElementById('render-job-title');
                    const compEl = document.getElementById('render-company-name');
                    if (titleEl) { titleEl.textContent = job.job_title; document.title = `JobNble - ${job.job_title}`; }
                    if (compEl) compEl.textContent = job.company_name || '-';

                    const logoEl = document.getElementById('render-job-logo');
                    if (logoEl) {
                        const initials = (job.company_name || 'JOB').substring(0, 3).toUpperCase();
                        logoEl.textContent = initials;
                        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
                        logoEl.style.backgroundColor = colors[(job.id || 0) % colors.length];
                        logoEl.style.color = '#fff';
                        logoEl.setAttribute('aria-label', `โลโก้บริษัท ${job.company_name || ''}`);
                    }

                    const catEl = document.getElementById('render-job-category');
                    if (catEl) {
                        const catLabel = CAT_LABELS_JD[job.job_category] || job.job_category || '';
                        if (catLabel) { catEl.textContent = catLabel; }
                        else { catEl.style.display = 'none'; }
                    }

                    const _svgPinJD = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span class="sr-only">สถานที่ทำงาน:</span>`;
                    const _svgWorkJD = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg><span class="sr-only">ประเภทงาน:</span>`;
                    const _svgMoneyJD = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span class="sr-only">เงินเดือน:</span>`;

                    const locEl = document.getElementById('render-job-location');
                    if (locEl) {
                        if (job.job_location) locEl.innerHTML = `${_svgPinJD} ${job.job_location}`;
                        else locEl.style.display = 'none';
                    }

                    const typeEl = document.getElementById('render-job-type');
                    if (typeEl) {
                        const typeLabel = TYPE_LABELS_JD[job.job_type] || job.job_type || '';
                        if (typeLabel) typeEl.innerHTML = `${_svgWorkJD} ${typeLabel}`;
                        else typeEl.style.display = 'none';
                    }

                    const salaryEl = document.getElementById('render-job-salary');
                    if (salaryEl) {
                        if (job.salary) salaryEl.innerHTML = `${_svgMoneyJD} ฿${Number(job.salary).toLocaleString()}`;
                        else salaryEl.innerHTML = `${_svgMoneyJD} ตามตกลง`;
                    }

                    const descEl = document.getElementById('render-job-desc');
                    if (descEl) descEl.textContent = job.job_desc || '-';

                    const skillsEl = document.getElementById('render-req-skills');
                    const skillsSection = document.getElementById('jd-skills-section');
                    if (skillsEl) {
                        if (job.req_skills) {
                            const skillsArr = job.req_skills.split(',').map(s => s.trim()).filter(Boolean);
                            if (skillsArr.length > 0) {
                                skillsEl.innerHTML = skillsArr.map(s =>
                                    `<span style="display:inline-block; background:#EFF6FF; color:#1E40AF; border-radius:20px; padding:4px 14px; margin:4px 4px 4px 0; font-size:14px; font-weight:600;">${s}</span>`
                                ).join('');
                            } else {
                                if (skillsSection) skillsSection.style.display = 'none';
                            }
                        } else {
                            if (skillsSection) skillsSection.style.display = 'none';
                        }
                    }

                    // ── Work Mode tag ──
                    const _svgBuildingJD = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6M3 15h6M13 7h5M13 11h5M13 15h5"/></svg>`;
                    const _svgRefreshJD = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>`;
                    const _svgHomeJD = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
                    const WORK_MODE_LABELS_JD = {
                        onsite: `${_svgBuildingJD}<span class="sr-only">รูปแบบการทำงาน:</span> ทำงานที่ออฟฟิศ`,
                        hybrid: `${_svgRefreshJD}<span class="sr-only">รูปแบบการทำงาน:</span> ออฟฟิศสลับทำที่บ้าน`,
                        remote: `${_svgHomeJD}<span class="sr-only">รูปแบบการทำงาน:</span> ทำงานที่บ้าน (WFH)`,

                        // เพิ่มคำภาษาไทยที่ตรงกับ Database
                        'ทำงานที่ออฟฟิศ': `${_svgBuildingJD}<span class="sr-only">รูปแบบการทำงาน:</span> ทำงานที่ออฟฟิศ`,
                        'ทำที่ออฟฟิศสลับทำที่บ้าน': `${_svgRefreshJD}<span class="sr-only">รูปแบบการทำงาน:</span> ออฟฟิศสลับทำที่บ้าน`,
                        'ออฟฟิศสลับทำที่บ้าน': `${_svgRefreshJD}<span class="sr-only">รูปแบบการทำงาน:</span> ออฟฟิศสลับทำที่บ้าน`,
                        'ทำงานที่บ้าน (WFH)': `${_svgHomeJD}<span class="sr-only">รูปแบบการทำงาน:</span> ทำงานที่บ้าน (WFH)`,
                        'ยืดหยุ่น / ตามตกลง': `${_svgBuildingJD}<span class="sr-only">รูปแบบการทำงาน:</span> ยืดหยุ่น / ตามตกลง`,
                        'ยืดหยุ่น': `${_svgBuildingJD}<span class="sr-only">รูปแบบการทำงาน:</span> ยืดหยุ่น / ตามตกลง`
                    };
                    const workModeElJD = document.getElementById('render-work-mode');
                    if (workModeElJD && job.work_mode && WORK_MODE_LABELS_JD[job.work_mode]) {
                        workModeElJD.innerHTML = WORK_MODE_LABELS_JD[job.work_mode];
                        workModeElJD.style.display = '';
                    }

                    // ── คุณสมบัติที่ต้องการ ──
                    const EDU_LABELS_JD = { any: 'ไม่จำกัด', highschool: 'ม.6 (มัธยมศึกษาตอนปลาย)', vocational: 'ปวช.', diploma: 'ปวส.', bachelor: 'ปริญญาตรี', master: 'ปริญญาโทขึ้นไป' };
                    const eduElJD = document.getElementById('render-req-education');
                    if (eduElJD) eduElJD.textContent = EDU_LABELS_JD[job.req_education] || job.req_education || 'ไม่จำกัด';
                    const ageElJD = document.getElementById('render-age-range');
                    if (ageElJD) ageElJD.textContent = (job.age_min && job.age_max) ? `${job.age_min}–${job.age_max} ปี` : 'ไม่จำกัด';
                    const expElJD = document.getElementById('render-req-experience');
                    if (expElJD) expElJD.textContent = job.req_experience || 'ไม่จำเป็น';

                    const disSupportEl = document.getElementById('render-disability-support');
                    if (disSupportEl) {
                        const disArr = (job.disability_type || '').split(',').map(d => {
                            const k = d.trim();
                            return DIS_LABELS_JD[k] || k;
                        }).filter(Boolean);
                        const disText = disArr.length > 0 ? `<strong>${disArr.join(', ')}</strong>` : 'รับทุกประเภท';
                        const accomText = job.accommodation ? `<strong>${job.accommodation}</strong>` : 'ไม่ได้ระบุ';
                        disSupportEl.innerHTML = `บริษัทยินดีต้อนรับผู้สมัครที่มีความพิการ ${disText} โดยมีสิ่งอำนวยความสะดวก: ${accomText}`;
                    }

                    showState('ready');
                })
                .catch(err => {
                    console.error('Error fetching job detail:', err);
                    showState('error');
                });
        }

        // 🌟 ดักจับปุ่ม "สมัครงานตำแหน่งนี้" (เพิ่มการยิง AI ก่อนส่งใบสมัคร) 🌟
        const applyBtn = document.getElementById('btn-apply-job');
        if (applyBtn) {
            applyBtn.addEventListener('click', async () => {
                if (!loggedInId) {
                    showToast('กรุณาเข้าสู่ระบบก่อนสมัครงาน', 'error');
                    setTimeout(() => { window.location.href = 'login-jobseeker.html?mode=login'; }, 1500);
                    return;
                }

                const originalText = applyBtn.innerHTML;
                try {
                    applyBtn.innerHTML = '⏳ กำลังส่งใบสมัคร...';
                    applyBtn.disabled = true;

                    // 1. ตรวจสอบเรซูเม่ผู้ใช้งาน
                    const resResume = await fetch(`/api/get-resume/${loggedInId}`);
                    const resumeData = await resResume.json();

                    if (!resumeData || !resumeData.seeker_id) {
                        applyBtn.innerHTML = originalText;
                        applyBtn.disabled = false;
                        // ── Styled modal แทน confirm() ──
                        const m = document.createElement('div');
                        m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
                        m.innerHTML = `
                            <div style="background:#fff;border-radius:20px;padding:36px 28px 28px;width:100%;max-width:420px;box-shadow:0 24px 60px rgba(0,0,0,0.2);text-align:center;">
                                <div style="font-size:48px;margin-bottom:16px;">📄</div>
                                <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 10px;">ยังไม่มีเรซูเม่</h3>
                                <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px;">คุณต้องสร้างและบันทึกเรซูเม่ก่อน<br>จึงจะสามารถสมัครงานได้ ใช้เวลาแค่ไม่กี่นาที!</p>
                                <div style="display:flex;gap:10px;justify-content:center;">
                                    <button id="_modal_go_resume" style="flex:1;max-width:180px;padding:12px 16px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;">
                                        🚀 ไปสร้างเรซูเม่เลย
                                    </button>
                                    <button id="_modal_cancel_resume" style="padding:12px 18px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;font-weight:600;font-size:14px;cursor:pointer;">
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                        `;
                        m.querySelector('#_modal_go_resume').addEventListener('click', () => { window.location.href = 'resume.html'; });
                        m.querySelector('#_modal_cancel_resume').addEventListener('click', () => m.remove());
                        m.addEventListener('click', e => { if (e.target === m) m.remove(); });
                        document.body.appendChild(m);
                        return;
                    }

                    // 2. ดึงข้อมูลประกาศงาน
                    const resJob = await fetch(`/api/get-job/${jobId}`);
                    const currentJobData = await resJob.json();

                    // 3. เรียก AI match พร้อม fallback (timeout 5 วินาที)
                    //    ถ้า AI สำเร็จ → ใช้ score จาก AI
                    //    ถ้า error / timeout → ใช้ match_score = 0, match_details = []
                    let finalScore = 0;
                    let finalDetails = [];

                    try {
                        const aiBody = JSON.stringify({
                            job_title: currentJobData.job_title || '',
                            job_desc: currentJobData.job_desc || '',
                            req_skills: currentJobData.req_skills || '',
                            education_history: JSON.stringify(resumeData.education_history || []),
                            experience_and_activities: 'ทำงาน: ' + JSON.stringify(resumeData.work_experience || []) +
                                ' ฝึกงาน: ' + JSON.stringify(resumeData.intern_experience || []),
                            skills_and_custom_skills: resumeData.skills || '',
                            inspiration_message: resumeData.summary || ''
                        });

                        const aiPromise = fetch('/api/get-ai-match', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: aiBody
                        });
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('AI timeout')), 5000)
                        );

                        const aiRes = await Promise.race([aiPromise, timeoutPromise]);
                        const aiData = await aiRes.json();

                        if (aiData && typeof aiData.total_ai_score === 'number') {
                            finalScore = aiData.total_ai_score;
                            finalDetails = Array.isArray(aiData.match_reasons) ? aiData.match_reasons : [];
                        }
                        // ถ้า response ไม่มี total_ai_score → คงค่า fallback 0 / []
                    } catch (aiErr) {
                        // AI error หรือ timeout → ใช้ fallback score=0, details=[] แล้วไปต่อ
                        console.warn('AI match skipped (error or timeout):', aiErr.message);
                        finalScore = 0;
                        finalDetails = [];
                    }

                    // 4. บันทึกใบสมัครลงฐานข้อมูล (ทำงานได้เสมอ ไม่ขึ้นกับ AI)
                    const resApply = await fetch('/api/apply-job', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            seeker_id: loggedInId,
                            job_id: jobId,
                            match_score: finalScore,
                            match_details: finalDetails
                        })
                    });

                    const result = await resApply.json();

                    if (result.success) {
                        applyBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><polyline points="20 6 9 17 4 12"></polyline></svg> ส่งเรซูเม่สำเร็จแล้ว';
                        applyBtn.setAttribute('aria-label', 'ส่งเรซูเม่สำเร็จแล้ว');
                        applyBtn.style.backgroundColor = '#10B981';
                        applyBtn.style.color = '#FFFFFF';
                        applyBtn.style.boxShadow = 'none';
                        applyBtn.style.cursor = 'default';
                        showToast('ส่งเรซูเม่จากโปรไฟล์สำเร็จ นายจ้างจะได้รับข้อมูลของคุณทันที', 'success');
                    } else {
                        applyBtn.innerHTML = originalText;
                        applyBtn.disabled = false;
                        showToast('เกิดข้อผิดพลาดในการส่งใบสมัคร: ' + result.error, 'error');
                    }
                } catch (err) {
                    console.error('Error applying job:', err);
                    applyBtn.innerHTML = originalText;
                    applyBtn.disabled = false;
                    showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', 'error');
                }
            });
        }

        // ── ปุ่ม "คำนวณคะแนน" (btn-calc-match) ──
        const calcBtn = document.getElementById('btn-calc-match');
        const matchModal = document.getElementById('match-score-modal');
        if (calcBtn && matchModal) {
            calcBtn.addEventListener('click', async () => {
                if (!loggedInId) {
                    showToast('กรุณาเข้าสู่ระบบก่อนคำนวณคะแนน', 'error');
                    return;
                }
                if (!jobId) return;

                const origCalcHtml = calcBtn.innerHTML;
                calcBtn.innerHTML = '⏳ กำลังคำนวณ...';
                calcBtn.disabled = true;

                try {
                    const res = await fetch(`/api/preview-match/${loggedInId}/${jobId}`);
                    const data = await res.json();

                    if (data.error === 'no_resume') {
                        showToast('กรุณาสร้างเรซูเม่ก่อนคำนวณคะแนน', 'error');
                        calcBtn.innerHTML = origCalcHtml;
                        calcBtn.disabled = false;
                        return;
                    }

                    const score = data.score || 0;
                    const reasons = data.reasons || [];
                    const suggestions = data.suggestions || [];
                    const recommendedJobs = data.recommended_jobs || [];
                    const isGood = score >= 50;

                    // score ring
                    const ringEl = document.getElementById('modal-score-ring');
                    const ringColor = score >= 75 ? '#16a34a' : score >= 50 ? '#3b82f6' : score >= 25 ? '#ea580c' : '#ef4444';
                    if (ringEl) {
                        ringEl.textContent = `${score}%`;
                        ringEl.style.borderColor = ringColor;
                        ringEl.style.color = ringColor;
                        ringEl.style.background = isGood ? '#f0fdf4' : '#fff7ed';
                    }

                    const labelEl = document.getElementById('modal-score-label');
                    if (labelEl) {
                        labelEl.textContent = score >= 75 ? '🌟 เหมาะสมมาก' : score >= 50 ? '✅ ผ่านเกณฑ์ สามารถสมัครได้' : score >= 25 ? '⚠️ คะแนนยังไม่เพียงพอ' : '❌ ไม่เหมาะสมกับตำแหน่งนี้';
                    }

                    // reasons
                    const reasonsEl = document.getElementById('modal-reasons');
                    if (reasonsEl) {
                        reasonsEl.innerHTML = reasons.length > 0
                            ? `<ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;line-height:1.9;">${reasons.map(r => `<li>${r}</li>`).join('')}</ul>`
                            : '';
                    }

                    // suggestions (< 50%)
                    const suggestWrap = document.getElementById('modal-suggestions-wrap');
                    const suggestList = document.getElementById('modal-suggestions-list');
                    if (suggestWrap && suggestList) {
                        if (!isGood && suggestions.length > 0) {
                            suggestList.innerHTML = suggestions.map(s => `<li style="margin-bottom:6px;">${s}</li>`).join('');
                            suggestWrap.style.display = 'block';
                        } else {
                            suggestWrap.style.display = 'none';
                        }
                    }

                    // recommended jobs (< 50%)
                    const recWrap = document.getElementById('modal-recommended-wrap');
                    const recList = document.getElementById('modal-recommended-list');
                    if (recWrap && recList) {
                        if (!isGood && recommendedJobs.length > 0) {
                            const bgCols = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];
                            recList.innerHTML = recommendedJobs.map(j => {
                                const col = bgCols[(j.id || 0) % bgCols.length];
                                return `<a href="job-detail.html?id=${j.id}" style="display:flex;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;text-decoration:none;color:#0f172a;">
                                    <div style="width:36px;height:36px;border-radius:8px;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${(j.company_name||'JOB').substring(0,3).toUpperCase()}</div>
                                    <div>
                                        <div style="font-weight:600;font-size:13px;">${j.job_title}</div>
                                        <div style="font-size:12px;color:#64748b;">${j.company_name} · ${j.matchScore}% เข้ากัน</div>
                                    </div>
                                </a>`;
                            }).join('');
                            recWrap.style.display = 'block';
                        } else {
                            recWrap.style.display = 'none';
                        }
                    }

                    // แสดง notice แต่ไม่ block ปุ่ม — ผู้หางานยังสมัครได้ แต่จะอยู่ในกลุ่มไม่ผ่านเกณฑ์ของนายจ้าง
                    const blockNoticeEl = document.getElementById('modal-block-notice');
                    if (blockNoticeEl) blockNoticeEl.style.display = 'none';

                    // show modal
                    matchModal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                    document.getElementById('modal-close-btn')?.focus();

                } catch (err) {
                    console.error('Error calculating match score:', err);
                    showToast('ไม่สามารถคำนวณคะแนนได้ กรุณาลองใหม่', 'error');
                } finally {
                    calcBtn.innerHTML = origCalcHtml;
                    calcBtn.disabled = false;
                }
            });

            // ปิด modal
            const modalCloseBtn = document.getElementById('modal-close-btn');
            if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => {
                matchModal.style.display = 'none';
                document.body.style.overflow = '';
            });
            matchModal.addEventListener('click', e => {
                if (e.target === matchModal) {
                    matchModal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && matchModal.style.display !== 'none') {
                    matchModal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
        }
    } // 🟢 ปิดบล็อก if ของ job-detail.html อย่างถูกต้องตรงนี้! 🟢



    // ==========================================
    // 🌟 19. ระบบดึงรายชื่อผู้สมัครสำหรับนายจ้าง (หน้า profile-em2.html)
    //        เรียงตาม match_score + แสดง score ตาม subscription_plan
    // ==========================================
    if (window.location.pathname.includes('profile-em2.html')) {
        const applicantsList = document.getElementById('employer-applicants-list');

        // ── กำหนดสีของ score badge ตามระดับคะแนน ──
        function getScoreBadgeStyle(score) {
            if (score >= 75) return { color: '#16a34a', bg: '#f0fdf4', border: '#86efac' };
            if (score >= 50) return { color: '#013c58', bg: '#eff6ff', border: '#bfdbfe' };
            if (score >= 25) return { color: '#ea580c', bg: '#fff7ed', border: '#fdba74' };
            return { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' };
        }

        // ── Map เก็บข้อมูล score ต่อ appId (หลีกเลี่ยง inline onclick ที่มี JSON ซ้อนอยู่) ──
        const _scoreDataMap = new Map();

        // ── สร้าง HTML ของ score badge ตาม subscription_plan ──
        function buildScoreBadge(app, subscriptionPlan) {
            const score  = app.match_score || 0;
            const appKey = String(app.application_id);

            // Free Trial (null) — ซ่อน score ไม่คลิกได้
            if (!subscriptionPlan) {
                return `
                    <div style="text-align:center;">
                        <span style="display:inline-block; background:#f1f5f9; color:#94a3b8; padding:6px 14px;
                                     border-radius:20px; font-size:13px; font-weight:600; border:1px solid #e2e8f0;">
                            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            อัปเกรดเพื่อดู Score
                        </span>
                        <div style="margin-top:6px;">
                            <a href="payment.html" style="font-size:12px; color:#013c58; font-weight:600; text-decoration:underline;">
                                เลือกแพ็คเกจ →
                            </a>
                        </div>
                    </div>`;
            }

            // เก็บข้อมูลไว้ใน Map (ไม่ embed JSON ลง HTML attribute)
            const hasDetails = subscriptionPlan === 'monthly' || subscriptionPlan === 'yearly';
            let details = [];
            if (hasDetails) {
                try { details = JSON.parse(app.match_details || '[]'); } catch (e) { details = []; }
                details = details.filter(d =>
                    !d.includes('ระบบ AI') &&
                    !d.includes('เกิดข้อผิดพลาด') &&
                    !d.includes('ไม่สามารถวิเคราะห์')
                );
            }
            _scoreDataMap.set(appKey, {
                score,
                name: `${app.first_name || ''} ${app.last_name || ''}`.trim(),
                details,
                plan: subscriptionPlan,
                seeker_id: app.seeker_id,
                job_id: app.job_id
            });

            // Pay Per Post / Monthly / Yearly — แสดงตัวเลข % + data-app-id
            const s = getScoreBadgeStyle(score);
            return `
                <div style="text-align:center;">
                    <span class="score-clickable-badge"
                          role="button" tabindex="0"
                          data-app-id="${appKey}"
                          aria-label="ดูรายละเอียดคะแนน ${score}%"
                          style="display:inline-block; background:${s.bg}; color:${s.color};
                                 padding:6px 18px; border-radius:20px; font-weight:700; font-size:16px;
                                 border:1.5px solid ${s.border};">
                        ${score}%
                    </span>
                    <div style="margin-top:5px;font-size:11px;color:#94a3b8;">คลิกเพื่อดูรายละเอียด</div>
                </div>`;
        }

        // ── เปิด Score Detail Modal ──
        async function openScoreModal(appKey) {
            const d = _scoreDataMap.get(appKey);
            if (!d) return;

            const modal   = document.getElementById('score-detail-modal');
            const ring    = document.getElementById('score-modal-ring');
            const pctEl   = document.getElementById('score-modal-pct');
            const subEl   = document.getElementById('score-modal-sub');
            const listEl  = document.getElementById('score-modal-detail-list');
            const noDetEl = document.getElementById('score-modal-no-details');
            if (!modal) return;

            const s = getScoreBadgeStyle(d.score);
            ring.style.borderColor = s.border;
            ring.style.color       = s.color;
            ring.style.background  = s.bg;
            pctEl.textContent = d.score + '%';
            subEl.textContent = d.name;

            // แสดง modal ก่อน แล้วค่อยโหลด reasons
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            document.getElementById('score-modal-close').focus();

            if (d.plan === 'monthly' || d.plan === 'yearly') {
                // ── ดึง reasons ใหม่จาก calcMatchScore เสมอ ──
                listEl.innerHTML = '<li style="color:#94a3b8;">กำลังโหลดรายละเอียด...</li>';
                listEl.style.display = '';
                noDetEl.style.display = 'none';

                try {
                    const res = await fetch(`/api/preview-match/${d.seeker_id}/${d.job_id}`);
                    const data = await res.json();
                    const freshReasons = (data.reasons || []).filter(r => r && r.trim());

                    if (freshReasons.length > 0) {
                        listEl.innerHTML = freshReasons.map(item => `<li style="margin-bottom:6px;">${item}</li>`).join('');
                        listEl.style.display = '';
                        noDetEl.style.display = 'none';
                    } else {
                        listEl.style.display = 'none';
                        noDetEl.textContent = 'ไม่มีข้อมูลรายละเอียดเพิ่มเติม';
                        noDetEl.style.display = '';
                    }
                } catch (err) {
                    listEl.style.display = 'none';
                    noDetEl.textContent = 'ไม่สามารถโหลดรายละเอียดได้';
                    noDetEl.style.display = '';
                }
            } else {
                listEl.innerHTML = '';
                listEl.style.display = 'none';
                noDetEl.textContent = 'อัปเกรดเป็น Monthly หรือ Yearly เพื่อดูรายละเอียดการจับคู่';
                noDetEl.style.display = '';
            }
        }

        // ── ปิด Score Detail Modal ──
        function closeScoreModal() {
            const modal = document.getElementById('score-detail-modal');
            if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
        }
        const _smClose = document.getElementById('score-modal-close');
        if (_smClose) _smClose.addEventListener('click', closeScoreModal);
        const _smOverlay = document.getElementById('score-detail-modal');
        if (_smOverlay) _smOverlay.addEventListener('click', e => { if (e.target === _smOverlay) closeScoreModal(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { const m = document.getElementById('score-detail-modal'); if (m && m.style.display !== 'none') closeScoreModal(); }
        });

        // ── markAsViewed: อัปเดตสถานะแล้วนำทาง ──
        window.markAsViewed = async function (appId, url) {
            try {
                await fetch('/api/mark-application-viewed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ application_id: appId })
                });
            } catch (e) { console.error('Error marking as viewed:', e); }
            window.location.href = url;
        };

        if (applicantsList && loggedInId && loggedInType === 'employer') {
            fetch(`/api/employer-applications/${loggedInId}`)
                .then(r => r.json())
                .then(data => {
                    // Server returns { subscription_plan, apps }
                    const subscriptionPlan = data.subscription_plan || null;
                    const isPaidPlan = subscriptionPlan === 'monthly' || subscriptionPlan === 'yearly' || subscriptionPlan === 'pay_per_post';
                    const apps = Array.isArray(data.apps) ? data.apps : (Array.isArray(data) ? data : []);

                    // เรียง: paid → คะแนน, free → วันที่ล่าสุด
                    apps.sort((a, b) => {
                        if (isPaidPlan) {
                            const diff = (b.match_score || 0) - (a.match_score || 0);
                            return diff !== 0 ? diff : new Date(b.created_at) - new Date(a.created_at);
                        }
                        return new Date(b.created_at) - new Date(a.created_at);
                    });

                    // ── ฟังก์ชันสร้าง card ผู้สมัคร ──
                    function buildApplicantCard(app) {
                        const d = new Date(app.created_at);
                        const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                        const dateStr = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()+543}`;
                        const isUnread = app.status === 'pending';
                        const isStarred = app.is_starred == 1;
                        const starColor = isStarred ? '#f59e0b' : '#cbd5e1';
                        const starFill  = isStarred ? '#f59e0b' : 'none';
                        const unreadDot = isUnread ? '<span style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block;margin-right:6px;flex-shrink:0;"></span>' : '';

                        return `
                            <div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;transition:box-shadow 0.15s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='none'">
                                <!-- avatar -->
                                <div style="width:38px;height:38px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;font-size:15px;color:#4338ca;">
                                    ${(app.first_name||'?').charAt(0).toUpperCase()}
                                </div>
                                <!-- ชื่อ + ตำแหน่ง -->
                                <a href="profile-em3.html?appId=${app.application_id}&seekerId=${app.seeker_id}"
                                   onclick="event.preventDefault(); window.markAsViewed(${app.application_id}, this.href);"
                                   style="flex:1;min-width:0;text-decoration:none;display:flex;flex-direction:column;gap:2px;">
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        ${unreadDot}
                                        <span style="font-weight:${isUnread?'700':'600'};font-size:14px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                            ${app.first_name} ${app.last_name}
                                        </span>
                                    </div>
                                    <span style="font-size:12px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                        ${app.job_title}
                                    </span>
                                </a>
                                <!-- คะแนน -->
                                <div style="flex-shrink:0;">
                                    ${buildScoreBadge(app, subscriptionPlan)}
                                </div>
                                <!-- ปุ่ม star -->
                                <button class="star-btn" data-app-id="${app.application_id}" data-starred="${isStarred?'1':'0'}"
                                    title="${isStarred?'ยกเลิก mark':'สนใจ / Mark ไว้ดูทีหลัง'}"
                                    style="background:none;border:none;cursor:pointer;padding:4px;flex-shrink:0;display:flex;align-items:center;opacity:${isStarred?'1':'0.4'};transition:opacity 0.2s;"
                                    onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${isStarred?'1':'0.4'}'"
                                    aria-label="${isStarred?'ยกเลิก mark':'สนใจ / Mark ไว้ดูทีหลัง'}">
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="${starFill}" stroke="${starColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                </button>
                                <!-- วันที่ -->
                                <div style="flex-shrink:0;text-align:right;min-width:76px;border-left:1px solid #f3f4f6;padding-left:12px;">
                                    <div style="font-size:12px;color:#374151;font-weight:500;">${dateStr}</div>
                                    <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${timeStr}</div>
                                </div>
                            </div>`;
                    }

                    if (apps.length > 0) {

                        // ════════════════════════════════════════
                        // FREE TIER — แสดงแค่รายชื่อ + วันที่ + Mark
                        // ════════════════════════════════════════
                        if (!isPaidPlan) {
                            const freeCards = apps.map(app => {
                                const d = new Date(app.created_at);
                                const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                                const dateStr = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()+543}`;
                                const isUnread = app.status === 'pending';
                                const isStarred = app.is_starred == 1;
                                const starColor = isStarred ? '#f59e0b' : '#cbd5e1';
                                const starFill  = isStarred ? '#f59e0b' : 'none';
                                const unreadDot = isUnread ? '<span style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block;margin-right:6px;flex-shrink:0;"></span>' : '';
                                return `
                                    <div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;transition:box-shadow 0.15s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='none'">
                                        <div style="width:38px;height:38px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;font-size:15px;color:#4338ca;">
                                            ${(app.first_name||'?').charAt(0).toUpperCase()}
                                        </div>
                                        <a href="profile-em3.html?appId=${app.application_id}&seekerId=${app.seeker_id}"
                                           onclick="event.preventDefault(); window.markAsViewed(${app.application_id}, this.href);"
                                           style="flex:1;min-width:0;text-decoration:none;display:flex;flex-direction:column;gap:2px;">
                                            <div style="display:flex;align-items:center;gap:6px;">
                                                ${unreadDot}
                                                <span style="font-weight:${isUnread?'700':'600'};font-size:14px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${app.first_name} ${app.last_name}</span>
                                            </div>
                                            <span style="font-size:12px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${app.job_title}</span>
                                        </a>
                                        <button class="star-btn" data-app-id="${app.application_id}" data-starred="${isStarred?'1':'0'}"
                                            title="${isStarred?'ยกเลิก mark':'สนใจ / Mark ไว้ดูทีหลัง'}"
                                            style="background:none;border:none;cursor:pointer;padding:4px;flex-shrink:0;display:flex;align-items:center;opacity:${isStarred?'1':'0.4'};transition:opacity 0.2s;"
                                            onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${isStarred?'1':'0.4'}'"
                                            aria-label="${isStarred?'ยกเลิก mark':'สนใจ / Mark ไว้ดูทีหลัง'}">
                                            <svg width="17" height="17" viewBox="0 0 24 24" fill="${starFill}" stroke="${starColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                            </svg>
                                        </button>
                                        <div style="flex-shrink:0;text-align:right;min-width:76px;border-left:1px solid #f3f4f6;padding-left:12px;">
                                            <div style="font-size:12px;color:#374151;font-weight:500;">${dateStr}</div>
                                            <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${timeStr}</div>
                                        </div>
                                    </div>`;
                            }).join('');

                            // banner แจ้งอัปเกรด
                            const upgradeBanner = `
                                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                    <div style="flex:1;">
                                        <div style="font-size:13px;font-weight:600;color:#1e40af;">อัปเกรดเพื่อดูคะแนนความเข้ากันและการจัดกลุ่มผู้สมัคร</div>
                                        <div style="font-size:12px;color:#3b82f6;margin-top:2px;">แพ็คเกจ Monthly / Yearly จะแบ่งกลุ่มผ่าน/ไม่ผ่านเกณฑ์ให้อัตโนมัติ</div>
                                    </div>
                                    <a href="payment.html" style="background:#1d4ed8;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap;">ดูแพ็คเกจ</a>
                                </div>`;

                            applicantsList.innerHTML = upgradeBanner + freeCards;

                            // ผูก star listener
                            applicantsList.querySelectorAll('.star-btn').forEach(btn => {
                                btn.addEventListener('click', async (e) => {
                                    e.preventDefault();
                                    const appId = btn.dataset.appId;
                                    try {
                                        const res = await fetch(`/api/toggle-star/${appId}`, { method: 'POST' });
                                        const d2 = await res.json();
                                        if (d2.success) {
                                            const svg = btn.querySelector('svg');
                                            const isNowStarred = d2.is_starred === 1;
                                            svg.setAttribute('fill', isNowStarred ? '#f59e0b' : 'none');
                                            svg.setAttribute('stroke', isNowStarred ? '#f59e0b' : '#cbd5e1');
                                            btn.dataset.starred = isNowStarred ? '1' : '0';
                                            btn.style.opacity = isNowStarred ? '1' : '0.4';
                                            showToast(isNowStarred ? '⭐ Mark ผู้สมัครไว้แล้ว' : 'ยกเลิก mark แล้ว', 'success');
                                        }
                                    } catch(err) { console.error('star error:', err); }
                                });
                            });
                            return; // หยุดที่นี่ ไม่ render paid section
                        }

                        // ════════════════════════════════════════
                        // PAID TIER — full features
                        // ════════════════════════════════════════
                        // แบ่ง 2 กลุ่ม
                        const highScore = apps.filter(a => (a.match_score || 0) >= 50);
                        const lowScore  = apps.filter(a => (a.match_score || 0) < 50);

                        const starredCount = apps.filter(a => a.is_starred == 1).length;

                        // ── Summary stats ──
                        const summaryBar = `
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
                                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                                    <div style="width:44px;height:44px;border-radius:10px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    </div>
                                    <div>
                                        <div style="font-size:26px;font-weight:700;color:#111827;line-height:1;">${highScore.length}</div>
                                        <div style="font-size:12px;color:#6b7280;margin-top:3px;font-weight:500;">ผ่านเกณฑ์คัดเลือก</div>
                                    </div>
                                </div>
                                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                                    <div style="width:44px;height:44px;border-radius:10px;background:#fffbeb;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                    </div>
                                    <div>
                                        <div style="font-size:26px;font-weight:700;color:#111827;line-height:1;">${starredCount}</div>
                                        <div style="font-size:12px;color:#6b7280;margin-top:3px;font-weight:500;">สนใจ / Mark แล้ว</div>
                                    </div>
                                </div>
                                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                                    <div style="width:44px;height:44px;border-radius:10px;background:#fef2f2;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </div>
                                    <div>
                                        <div style="font-size:26px;font-weight:700;color:#111827;line-height:1;">${lowScore.length}</div>
                                        <div style="font-size:12px;color:#6b7280;margin-top:3px;font-weight:500;">ไม่ผ่านเกณฑ์คัดเลือก</div>
                                    </div>
                                </div>
                            </div>`;

                        // ── Tabs ──
                        const splitSection = `
                            <div>
                                <div style="display:flex;border-bottom:2px solid #e5e7eb;margin-bottom:20px;gap:0;">
                                    <button id="tab-high" onclick="switchTab('high')"
                                        style="padding:12px 24px;border:none;background:transparent;font-size:14px;font-weight:600;cursor:pointer;color:#1e40af;border-bottom:2px solid #1e40af;margin-bottom:-2px;transition:all 0.2s;">
                                        ผ่านเกณฑ์คัดเลือก
                                        <span style="background:#1e40af;color:#fff;border-radius:20px;padding:1px 9px;font-size:11px;font-weight:700;margin-left:6px;">${highScore.length}</span>
                                    </button>
                                    <button id="tab-low" onclick="switchTab('low')"
                                        style="padding:12px 24px;border:none;background:transparent;font-size:14px;font-weight:600;cursor:pointer;color:#9ca3af;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.2s;">
                                        ไม่ผ่านเกณฑ์คัดเลือก
                                        <span style="background:#d1d5db;color:#fff;border-radius:20px;padding:1px 9px;font-size:11px;font-weight:700;margin-left:6px;">${lowScore.length}</span>
                                    </button>
                                </div>
                                <div id="panel-high">
                                    ${highScore.length > 0
                                        ? highScore.map(buildApplicantCard).join('')
                                        : '<div style="text-align:center;padding:40px 0;color:#9ca3af;font-size:14px;">ยังไม่มีผู้สมัครที่ผ่านเกณฑ์</div>'}
                                </div>
                                <div id="panel-low" style="display:none;">
                                    ${lowScore.length > 0
                                        ? lowScore.map(buildApplicantCard).join('')
                                        : '<div style="text-align:center;padding:40px 0;color:#9ca3af;font-size:14px;">ยังไม่มีผู้สมัครในกลุ่มนี้</div>'}
                                </div>
                            </div>`;

                        applicantsList.innerHTML = summaryBar + splitSection;

                        // ── ผูก click listener badge ──
                        applicantsList.querySelectorAll('.score-clickable-badge').forEach(el => {
                            el.addEventListener('click', () => openScoreModal(el.dataset.appId));
                            el.addEventListener('keydown', e => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openScoreModal(el.dataset.appId); }
                            });
                        });

                        // ── ผูก click listener star ──
                        applicantsList.querySelectorAll('.star-btn').forEach(btn => {
                            btn.addEventListener('click', async (e) => {
                                e.preventDefault();
                                const appId = btn.dataset.appId;
                                try {
                                    const res = await fetch(`/api/toggle-star/${appId}`, { method: 'POST' });
                                    const data = await res.json();
                                    if (data.success) {
                                        const svg = btn.querySelector('svg');
                                        const isNowStarred = data.is_starred === 1;
                                        svg.setAttribute('fill', isNowStarred ? '#f59e0b' : 'none');
                                        svg.setAttribute('stroke', isNowStarred ? '#f59e0b' : '#cbd5e1');
                                        btn.dataset.starred = isNowStarred ? '1' : '0';
                                        btn.title = isNowStarred ? 'ยกเลิก mark' : 'Mark ไว้ดูทีหลัง';
                                        showToast(isNowStarred ? '⭐ Mark ผู้สมัครไว้แล้ว' : 'ยกเลิก mark แล้ว', 'success');
                                    }
                                } catch(err) { console.error('star toggle error:', err); }
                            });
                        });
                        // ── switchTab function ──
                        window.switchTab = function(tab) {
                            const high = document.getElementById('panel-high');
                            const low  = document.getElementById('panel-low');
                            const btnH = document.getElementById('tab-high');
                            const btnL = document.getElementById('tab-low');
                            if (!high || !low || !btnH || !btnL) return;

                            if (tab === 'high') {
                                high.style.display = 'block';
                                low.style.display  = 'none';
                                btnH.style.color       = '#1e40af';
                                btnH.style.borderBottomColor = '#1e40af';
                                btnH.querySelector('span').style.background = '#1e40af';
                                btnL.style.color       = '#9ca3af';
                                btnL.style.borderBottomColor = 'transparent';
                                btnL.querySelector('span').style.background = '#d1d5db';
                            } else {
                                high.style.display = 'none';
                                low.style.display  = 'block';
                                btnL.style.color       = '#1e40af';
                                btnL.style.borderBottomColor = '#1e40af';
                                btnL.querySelector('span').style.background = '#1e40af';
                                btnH.style.color       = '#9ca3af';
                                btnH.style.borderBottomColor = 'transparent';
                                btnH.querySelector('span').style.background = '#d1d5db';
                            }
                        };
                    } else {
                        applicantsList.innerHTML = '<div style="text-align:center; padding:40px; color:#64748B;">ยังไม่มีเรซูเม่ส่งเข้ามาในขณะนี้</div>';
                    }
                })
                .catch(err => {
                    console.error('Error fetching applications:', err);
                    applicantsList.innerHTML = '<div style="text-align:center; padding:40px; color:#EF4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
                });
        }
    }

    // ==========================================
    // 🌟 21. ฐานข้อมูลเรซูเม่ผู้หางานทั้งหมด (resume-database.html)
    // ==========================================
    if (window.location.pathname.includes('resume-database.html')) {

        const rdbGrid    = document.getElementById('resume-db-grid');
        const rdbModal   = document.getElementById('resume-db-modal');
        const rdbPaper   = document.getElementById('resume-db-paper');
        const rdbClose   = document.getElementById('resume-db-modal-close');
        const rdbSearch  = document.getElementById('rdb-search');
        const rdbType    = document.getElementById('rdb-filter-type');
        const rdbDis     = document.getElementById('rdb-filter-disability');
        const rdbClear   = document.getElementById('rdb-clear');
        const rdbCount   = document.getElementById('resume-db-count');

        const JOB_TYPE_LBL = {
            fulltime: 'พนักงานประจำ', parttime: 'พาร์ทไทม์',
            freelance: 'ฟรีแลนซ์', contract: 'สัญญาจ้าง'
        };
        const DIS_LBL = {
            visual: 'ทางการมองเห็น', hearing: 'ทางการได้ยิน',
            physical: 'ทางกายหรือการเคลื่อนไหว'
        };
        const DIS_COLOR = {
            visual:   { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
            hearing:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
            physical: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' }
        };

        let _allResumes = [];

        // ── User Icon SVG (เหมือนกันทุก card) ──
        const USER_ICON_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="32" cy="32" r="32" fill="#e2e8f0"/>
            <circle cx="32" cy="26" r="11" fill="#94a3b8"/>
            <ellipse cx="32" cy="52" rx="18" ry="11" fill="#94a3b8"/>
        </svg>`;

        // ── ตรวจสิทธิ์ subscription ──
        if (loggedInId) {
            fetch(`/api/employer-subscription/${loggedInId}`)
                .then(r => r.json())
                .then(sub => {
                    const plan = sub.subscription_plan;
                    if (plan !== 'monthly' && plan !== 'yearly') {
                        if (rdbGrid) rdbGrid.innerHTML = `
                            <div class="resume-db-empty">
                                <div style="font-size:40px;margin-bottom:12px;">🔒</div>
                                <p style="font-weight:600;color:#0f172a;margin-bottom:6px;">ต้องการแพ็คเกจรายเดือนหรือรายปี</p>
                                <p style="color:#64748b;font-size:13px;">เพื่อเข้าถึงฐานข้อมูลเรซูเม่ผู้หางานทั้งหมด</p>
                                <a href="payment.html" style="margin-top:16px;display:inline-block;padding:10px 24px;background:#3b82f6;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;">เลือกแพ็คเกจ →</a>
                            </div>`;
                        return;
                    }
                    loadAllResumes();
                })
                .catch(() => {
                    if (rdbGrid) rdbGrid.innerHTML = '<div class="resume-db-empty">เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์</div>';
                });
        }

        function renderCards(list) {
            if (!rdbGrid) return;
            if (list.length === 0) {
                rdbGrid.innerHTML = '<div class="resume-db-empty">ไม่พบเรซูเม่ที่ตรงกับเงื่อนไข</div>';
                if (rdbCount) rdbCount.textContent = '';
                return;
            }
            if (rdbCount) rdbCount.textContent = `พบ ${list.length} เรซูเม่`;
            rdbGrid.innerHTML = '';
            list.forEach(item => {
                const name     = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'ไม่ระบุชื่อ';
                const position = item.job_position || 'ไม่ระบุตำแหน่ง';
                const jobType  = JOB_TYPE_LBL[item.job_type] || item.job_type || '';
                const disKey   = (item.disability_type || '').toLowerCase();
                const disLabel = DIS_LBL[disKey] || item.disability_type || '';
                const disColor = DIS_COLOR[disKey] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

                const jobTypeBadge = jobType
                    ? `<span class="rdb-badge" style="background:#eff6ff;color:#2563eb;border-color:#bfdbfe;">${jobType}</span>`
                    : '';
                const disBadge = disLabel
                    ? `<span class="rdb-badge" style="background:${disColor.bg};color:${disColor.color};border-color:${disColor.border};">${disLabel}</span>`
                    : '';

                const card = document.createElement('div');
                card.className = 'rdb-card';
                card.setAttribute('role', 'listitem');
                card.dataset.seekerId   = item.seeker_id;
                card.dataset.name       = name.toLowerCase();
                card.dataset.position   = position.toLowerCase();
                card.dataset.jobType    = item.job_type || '';
                card.dataset.disability = disKey;

                card.innerHTML = `
                    <div class="rdb-card-avatar">${USER_ICON_SVG}</div>
                    <div class="rdb-card-info">
                        <div class="rdb-card-name">${name}</div>
                        <div class="rdb-card-position">${position}</div>
                        <div class="rdb-card-badges">${jobTypeBadge}${disBadge}</div>
                    </div>
                    <button class="rdb-card-btn" type="button" aria-label="ดูเรซูเม่ของ ${name}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        ดูเรซูเม่
                    </button>
                `;
                card.querySelector('.rdb-card-btn').addEventListener('click', () => openResumeModal(item.seeker_id));
                rdbGrid.appendChild(card);
            });
        }

        function applyFilters() {
            const q   = (rdbSearch?.value || '').toLowerCase().trim();
            const typ = rdbType?.value || '';
            const dis = rdbDis?.value || '';
            const filtered = _allResumes.filter(item => {
                const name     = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
                const position = (item.job_position || '').toLowerCase();
                const matchQ   = !q || name.includes(q) || position.includes(q);
                const matchTyp = !typ || item.job_type === typ;
                const matchDis = !dis || (item.disability_type || '').toLowerCase() === dis;
                return matchQ && matchTyp && matchDis;
            });
            renderCards(filtered);
        }

        function loadAllResumes() {
            fetch(`/api/all-resumes?employerId=${loggedInId}`)
                .then(r => r.json())
                .then(list => {
                    if (!rdbGrid) return;
                    if (list && list.error === 'subscription_required') {
                        rdbGrid.innerHTML = `
                            <div style="text-align:center;padding:60px 20px;">
                                <div style="font-size:48px;margin-bottom:16px;">🔒</div>
                                <h3 style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 8px;">ต้องการ Subscription</h3>
                                <p style="font-size:14px;color:#64748b;margin:0 0 20px;">การดูฐานข้อมูลเรซูเม่ทั้งหมดต้องการแพ็คเกจ Monthly หรือ Yearly</p>
                                <a href="payment.html" style="background:#1d4ed8;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">ดูแพ็คเกจ →</a>
                            </div>`;
                        return;
                    }
                    if (!list || list.length === 0) {
                        rdbGrid.innerHTML = '<div class="resume-db-empty">ยังไม่มีเรซูเม่ผู้หางานในระบบ</div>';
                        return;
                    }
                    _allResumes = list;
                    renderCards(list);

                    // ── Auto-open ถ้ามาจากกระดิ่ง ?seeker=X ──
                    const _autoSeekerId = new URLSearchParams(window.location.search).get('seeker');
                    if (_autoSeekerId) {
                        setTimeout(() => openResumeModal(parseInt(_autoSeekerId)), 300);
                    }

                    // ── ผูก filter events ──
                    if (rdbSearch) rdbSearch.addEventListener('input', applyFilters);
                    if (rdbType)   rdbType.addEventListener('change', applyFilters);
                    if (rdbDis)    rdbDis.addEventListener('change', applyFilters);
                    if (rdbClear)  rdbClear.addEventListener('click', () => {
                        if (rdbSearch) rdbSearch.value = '';
                        if (rdbType)   rdbType.value = '';
                        if (rdbDis)    rdbDis.value = '';
                        renderCards(_allResumes);
                    });
                })
                .catch(() => {
                    if (rdbGrid) rdbGrid.innerHTML = '<div class="resume-db-empty">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
                });
        }

        function openResumeModal(seekerId) {
            if (!rdbModal || !rdbPaper) return;
            rdbPaper.querySelectorAll('.resume-theme-content').forEach(t => t.classList.remove('active'));
            rdbModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            fetch(`/api/get-resume/${seekerId}`)
                .then(r => r.json())
                .then(data => {
                    if (!data || !data.first_name) {
                        rdbPaper.innerHTML = '<p style="text-align:center;padding:40px;color:#64748B;">ไม่พบข้อมูลเรซูเม่</p>';
                        return;
                    }
                    const savedTheme = data.selected_template || 'minimal';
                    const targetTpl  = rdbPaper.querySelector(`#tpl-${savedTheme}`);
                    if (targetTpl) {
                        targetTpl.classList.add('active');
                        renderRealDataToTemplate(targetTpl, data);
                    }
                })
                .catch(() => {
                    if (rdbPaper) rdbPaper.innerHTML = '<p style="text-align:center;padding:40px;color:#EF4444;">เกิดข้อผิดพลาดในการโหลดเรซูเม่</p>';
                });
        }

        function closeResumeModal() {
            if (rdbModal) { rdbModal.style.display = 'none'; document.body.style.overflow = ''; }
        }

        if (rdbClose) rdbClose.addEventListener('click', closeResumeModal);
        if (rdbModal) rdbModal.addEventListener('click', e => { if (e.target === rdbModal) closeResumeModal(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && rdbModal && rdbModal.style.display !== 'none') closeResumeModal(); });
    }

    // ==========================================
    // 🌟 20. แสดงเรซูเม่ผู้สมัครสำหรับนายจ้าง (หน้า profile-em3.html)
    // ==========================================
    if (window.location.pathname.includes('profile-em3.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const appId     = urlParams.get('appId');
        const seekerId  = urlParams.get('seekerId');

        const em3Paper   = document.getElementById('resume3-paper');
        const btnPass    = document.getElementById('btn-interview-pass');
        const btnFail    = document.getElementById('btn-interview-fail');
        const nameEl     = document.getElementById('em3-seeker-name');
        const jobTitleEl = document.getElementById('em3-job-title');

        // ── โหลดเรซูเม่ ──
        if (em3Paper && seekerId) {
            fetch(`/api/get-resume/${seekerId}`)
                .then(res => res.json())
                .then(data => {
                    if (!data || !data.first_name) {
                        em3Paper.innerHTML = '<p style="text-align:center;padding:40px;color:#64748B;">ไม่พบข้อมูลเรซูเม่ของผู้สมัครรายนี้</p>';
                        return;
                    }

                    // แสดง template ตามที่ผู้หางานเลือกไว้
                    const savedTheme = data.selected_template || 'minimal';
                    const allTemplates = em3Paper.querySelectorAll('.resume-theme-content');
                    allTemplates.forEach(tpl => tpl.classList.remove('active'));

                    const targetTpl = em3Paper.querySelector(`#tpl-${savedTheme}`);
                    if (targetTpl) {
                        targetTpl.classList.add('active');
                        renderRealDataToTemplate(targetTpl, data);
                    }
                })
                .catch(err => {
                    console.error('Error loading applicant resume (em3):', err);
                    if (em3Paper) em3Paper.innerHTML = '<p style="text-align:center;padding:40px;color:#EF4444;">เกิดข้อผิดพลาดในการโหลดเรซูเม่</p>';
                });
        }

        // ── โหลดสถานะและข้อมูลใบสมัคร ──
        function applyInterviewStatus(status) {
            if (!btnPass || !btnFail) return;
            btnPass.classList.toggle('active', status === 'approved');
            btnFail.classList.toggle('active', status === 'rejected');
        }

        if (appId) {
            fetch(`/api/application/${appId}`)
                .then(r => r.json())
                .then(appData => {
                    if (nameEl) nameEl.textContent = `${appData.first_name || ''} ${appData.last_name || ''}`.trim();
                    if (jobTitleEl) jobTitleEl.textContent = appData.job_title ? `ตำแหน่ง: ${appData.job_title}` : '';
                    applyInterviewStatus(appData.status);
                })
                .catch(() => {});
        }

        // ── ปุ่ม ผ่าน / ไม่ผ่าน ──
        async function setInterviewResult(result) {
            if (!appId) return;
            if (btnPass) btnPass.disabled = true;
            if (btnFail) btnFail.disabled = true;
            try {
                const res = await fetch(`/api/applications/${appId}/result`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ result })
                });
                const json = await res.json();
                if (json.success) {
                    applyInterviewStatus(result);
                    if (result === 'approved' && json.contact) {
                        showContactPopup(json.contact);
                    }
                } else {
                    alert('เกิดข้อผิดพลาด: ' + (json.error || 'ไม่สามารถบันทึกได้'));
                }
            } catch (e) {
                console.error('Interview result error:', e);
                alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            } finally {
                if (btnPass) btnPass.disabled = false;
                if (btnFail) btnFail.disabled = false;
            }
        }

        function showContactPopup(contact) {
            const name  = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || '-';
            const email = contact.email || '-';
            const phone = contact.phone || '-';
            const subjectTh = encodeURIComponent('นัดสัมภาษณ์งาน — JobNble');
            const bodyTh = encodeURIComponent(`เรียน คุณ${name}\n\nทางบริษัทขอแจ้งว่าคุณผ่านการคัดเลือกเบื้องต้นแล้ว\nขอนัดสัมภาษณ์ในวันที่ ...\n\nขอบคุณครับ/ค่ะ`);

            document.getElementById('em3-contact-popup')?.remove();
            const overlay = document.createElement('div');
            overlay.id = 'em3-contact-popup';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
            overlay.innerHTML = `
                <div style="background:#fff;border-radius:20px;padding:36px 32px 28px;width:100%;max-width:440px;box-shadow:0 24px 60px rgba(0,0,0,0.2);animation:fadeInUp .25s ease;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                        <div style="width:44px;height:44px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;">✅</div>
                        <div>
                            <h3 style="font-size:17px;font-weight:700;color:#0f172a;margin:0;">ผ่านการคัดเลือก!</h3>
                            <p style="font-size:13px;color:#64748b;margin:2px 0 0;">ช่องทางติดต่อผู้สมัคร</p>
                        </div>
                    </div>
                    <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;margin-bottom:20px;display:flex;flex-direction:column;gap:12px;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="width:32px;height:32px;background:#eff6ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;">👤</span>
                            <div><div style="font-size:11px;color:#94a3b8;font-weight:500;margin-bottom:1px;">ชื่อ-นามสกุล</div><div style="font-size:15px;font-weight:600;color:#0f172a;">${name}</div></div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="width:32px;height:32px;background:#eff6ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;">✉️</span>
                            <div><div style="font-size:11px;color:#94a3b8;font-weight:500;margin-bottom:1px;">อีเมล</div><div style="font-size:15px;font-weight:600;color:#1d4ed8;word-break:break-all;">${email}</div></div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="width:32px;height:32px;background:#eff6ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;">📞</span>
                            <div><div style="font-size:11px;color:#94a3b8;font-weight:500;margin-bottom:1px;">เบอร์โทรศัพท์</div><div style="font-size:15px;font-weight:600;color:#0f172a;">${phone}</div></div>
                        </div>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <a href="mailto:${email}?subject=${subjectTh}&body=${bodyTh}"
                           style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#3b82f6;color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:600;font-size:14px;transition:background .2s;"
                           onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                           ✉️ ส่งอีเมลนัดสัมภาษณ์
                        </a>
                        <button onclick="document.getElementById('em3-contact-popup').remove()"
                                style="padding:11px 18px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;font-weight:600;font-size:14px;cursor:pointer;">
                            ปิด
                        </button>
                    </div>
                </div>
            `;
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);
        }

        if (btnPass) btnPass.addEventListener('click', () => setInterviewResult('approved'));
        if (btnFail) btnFail.addEventListener('click', () => setInterviewResult('rejected'));
    }


/* =========================================
   === SECTION 22: ABOUT US PAGE (aboutus.html) ===
   - Scroll-reveal for [data-au-reveal] elements
   - Animated number counters for .au-stat-num
========================================= */
(function () {
    if (!document.querySelector('.au-hero')) return; // only run on aboutus.html

    /* ── 1. Scroll Reveal ── */
    const revealEls = document.querySelectorAll('[data-au-reveal]');
    if (revealEls.length) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry, idx) => {
                if (entry.isIntersecting) {
                    // stagger siblings in the same parent
                    const siblings = [...entry.target.parentElement.querySelectorAll('[data-au-reveal]')];
                    const i = siblings.indexOf(entry.target);
                    setTimeout(() => {
                        entry.target.classList.add('au-visible');
                    }, i * 120);
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealEls.forEach(el => revealObserver.observe(el));
    }

    /* ── 2. Number Counter Animation ── */
    function animateCount(el, target, duration) {
        let start = 0;
        const step = target / (duration / 16);
        const tick = () => {
            start = Math.min(start + step, target);
            el.textContent = Math.floor(start).toLocaleString('th-TH');
            if (start < target) requestAnimationFrame(tick);
            else el.textContent = target.toLocaleString('th-TH');
        };
        requestAnimationFrame(tick);
    }

    const statNums = document.querySelectorAll('.au-stat-num[data-count]');
    if (statNums.length) {
        const countObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.count, 10);
                    animateCount(el, target, 1800);
                    countObserver.unobserve(el);
                }
            });
        }, { threshold: 0.4 });

        statNums.forEach(el => countObserver.observe(el));
    }

    /* ── 3. Active nav link ── */
    const aboutLinks = document.querySelectorAll('a[href="aboutus.html"]');
    aboutLinks.forEach(a => a.style.color = '#013c58');
})();

// ==========================================
    // --- ระบบส่ง Feedback จาก Footer ---
    // ==========================================
    const feedbackInput = document.getElementById('feedback-input');
    const feedbackBtn   = document.querySelector('.feedback-btn');

    if (feedbackInput && feedbackBtn) {
        feedbackBtn.addEventListener('click', async () => {
            const msg = feedbackInput.value.trim();
            if (!msg) return;

            const origText = feedbackBtn.textContent;
            feedbackBtn.textContent = 'กำลังส่ง...';
            feedbackBtn.disabled = true;

            const userId = sessionStorage.getItem('userId') ? sessionStorage.getItem('userId').split(':')[0] : null;
            const userType = sessionStorage.getItem('userType') || 'guest';

            try {
                const res  = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message:   msg,
                        page_url:  window.location.pathname,
                        user_id:   userId,
                        user_type: userType
                    })
                });
                const data = await res.json();

                if (data.success) {
                    feedbackInput.value       = '';
                    feedbackBtn.textContent   = 'ส่งแล้ว!';
                    feedbackBtn.style.background = '#16a34a';
                    setTimeout(() => {
                        feedbackBtn.textContent      = origText;
                        feedbackBtn.style.background = '';
                        feedbackBtn.disabled         = false;
                    }, 2500);
                } else {
                    throw new Error(data.error);
                }
            } catch {
                feedbackBtn.textContent = 'ลองใหม่';
                feedbackBtn.style.background = '#ef4444';
                setTimeout(() => {
                    feedbackBtn.textContent      = origText;
                    feedbackBtn.style.background = '';
                    feedbackBtn.disabled         = false;
                }, 2000);
            }
        });

        // กด Enter ใน input ส่งได้เลย
        feedbackInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') feedbackBtn.click();
        });
    }



});