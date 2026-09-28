/* ==========================================================================
   پنل پذیرش ساسان کلینیک (بدون کتابخانه)
   - اگر صفحه از سرور کلینیک باز شده باشد (متای sasan-api) به API واقعی وصل است؛
     وگرنه نسخه‌ی نمایشی با داده‌ی ساختگی اجرا می‌شود (demo.js)
   - زمان‌ها به وقت تهران و تاریخ‌ها شمسی نمایش داده می‌شوند؛ ذخیره: میلادی YYYY-MM-DD و دقیقه از نیمه‌شب
   - هر متنی که بیمار یا کارمند نوشته هنگام نمایش escape می‌شود
   - CSP پنل استایل درون‌خطی را نمی‌پذیرد؛ متغیرهای CSS فقط با style.setProperty گذاشته می‌شوند
   - حرکت‌ها: ورود نماها با CSS، جابه‌جایی کارت‌ها با FLIP (فقط transform و opacity روی کامپوزیتور)
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- ابزار ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const en = (s) => String(s || '').replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const ic = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  /* نوار بالا بدون کادر جست‌وجو (تبلت و موبایل): جست‌وجو در خود صفحه‌ی درخواست‌هاست */
  const compact = matchMedia('(max-width: 1040px)');
  const normMobile = (v) => en(v).replace(/[\s\-().]/g, '').replace(/^(\+98|0098)/, '0');
  const fmtNum = (n) => Number(n).toLocaleString('fa-IR');
  const telFa = (m) => { const s = String(m || ''); return fa(s.length === 11 ? `${s.slice(0, 4)} ${s.slice(4, 7)} ${s.slice(7)}` : s); };
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const EASE_IO = 'cubic-bezier(.65, 0, .35, 1)';
  const motion = () => !reduce.matches && typeof Element.prototype.animate === 'function';

  /* ---------- زمان (تهران) و تاریخ شمسی ---------- */
  const TZ = 'Asia/Tehran';
  const F = {
    day: new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }),
    hm: new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    long: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }),
    y: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', year: 'numeric' }),
    mo: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', month: 'long' }),
    dm: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric', month: 'long' }),
    wd: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long' }),
    jp: new Intl.DateTimeFormat('en-US-u-ca-persian', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' }),
    stamp: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: TZ, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    dayOf: new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }),
    hmOf: new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  };
  const utc = (iso) => new Date(iso + 'T12:00:00Z');
  const today = () => F.day.format(new Date());
  const nowMin = () => { const [h, m] = F.hm.format(new Date()).split(':').map(Number); return h * 60 + m; };
  const addDays = (iso, n) => { const d = utc(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const wdOf = (iso) => utc(iso).getUTCDay();
  /* شنبه‌ی همان هفته */
  const satOf = (iso) => addDays(iso, -((wdOf(iso) + 1) % 7));
  const jPart = (iso, type) => { const p = F.jp.formatToParts(utc(iso)).find((x) => x.type === type); return p ? Number(p.value) : 0; };
  const jDay = (iso) => jPart(iso, 'day');
  const dLong = (iso) => F.long.format(utc(iso));
  /* ترتیب «دوشنبه ۶ مهر ۱۴۰۵» دستی ساخته می‌شود؛ ترتیب خود مرورگرها با هم فرق دارد */
  const dFull = (iso) => F.long.format(utc(iso)) + ' ' + F.y.format(utc(iso));
  const dm = (iso) => F.dm.format(utc(iso));
  const moName = (iso) => F.mo.format(utc(iso));
  const wdName = (iso) => F.wd.format(utc(iso));
  const tLabel = (min) => fa(String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'));
  const stamp = (ts) => F.stamp.format(new Date(ts));
  const relDay = (iso) => { const t = today(); return iso === t ? 'امروز' : iso === addDays(t, 1) ? 'فردا' : iso === addDays(t, -1) ? 'دیروز' : dLong(iso); };
  const ageMin = (ts) => (Date.now() - Date.parse(ts)) / 60000;
  function ago(ts) {
    const m = Math.max(0, Math.round(ageMin(ts)));
    if (m < 1) return 'همین حالا';
    if (m < 60) return fa(m) + ' دقیقه پیش';
    const h = Math.floor(m / 60), r = m % 60;
    if (h < 24) return fa(h) + ' ساعت' + (h < 6 && r >= 5 ? ' و ' + fa(r) + ' دقیقه' : '') + ' پیش';
    const d = Math.floor(h / 24);
    return d === 1 ? 'دیروز' : fa(d) + ' روز پیش';
  }
  function waitShort(ts) {
    const m = Math.max(0, Math.round(ageMin(ts)));
    if (m < 60) return fa(m) + ' دقیقه';
    const h = Math.floor(m / 60);
    return h < 24 ? fa(h) + ' ساعت' : fa(Math.floor(h / 24)) + ' روز';
  }
  const WD_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

  /* ---------- برچسب‌ها ---------- */
  const STATUS = { new: 'منتظر تماس', called: 'تماس گرفته شد', scheduled: 'نوبت دارد', arrived: 'در کلینیک', done: 'انجام شد', cancelled: 'لغو شد', 'no-show': 'نیامد' };
  const CB_STATUS = { new: 'منتظر تماس', called: 'تماس گرفته شد', done: 'انجام شد' };
  const SMS_KIND = { received: 'ثبت درخواست', appt: 'تأیید نوبت', remind: 'یادآوری' };
  const DLV = { 1: 'رسید', 2: 'به گوشی نرسید', 3: 'رسیده به مخابرات', 4: 'به مخابرات نرسید', 5: 'رسیده به اپراتور', 6: 'ناموفق', 7: 'لیست سیاه', 8: 'نامشخص' };
  const DLV_CLS = { 1: 'done', 2: 'no-show', 4: 'no-show', 6: 'no-show', 7: 'no-show' };
  const DEPT_IC = { dental: 'i-tooth', beauty: 'i-sparkles', medicine: 'i-steth' };
  const AUDIT = {
    login: ['ورود به پنل', 'i-lock'], 'login.fail': ['ورود ناموفق', 'i-alert'], logout: ['خروج', 'i-logout'], 'password.change': ['تغییر رمز', 'i-key'],
    'booking.create': ['ثبت نوبت تلفنی', 'i-cal-plus'], 'booking.update': ['تغییر درخواست', 'i-pencil'], 'callback.update': ['درخواست تماس', 'i-phone'],
    'sms.appt': ['پیامک تأیید نوبت', 'i-msg'], 'user.create': ['ساخت کاربر', 'i-user-plus'], 'user.update': ['تغییر کاربر', 'i-users']
  };
  const TIMED = ['scheduled', 'arrived', 'done', 'no-show'];
  const BUSY = ['scheduled', 'arrived'];
  const pill = (st, map = STATUS) => `<span class="pill pill--${esc(st)}">${esc(map[st] || st)}</span>`;
  const initial = (name) => esc(String(name || '؟').trim().charAt(0) || '؟');

  /* ---------- اتصال: سرور واقعی یا نسخه‌ی نمایشی ---------- */
  const meta = document.querySelector('meta[name="sasan-api"]');
  const DEMO = !meta;
  const api = DEMO ? window.SasanDemo.create() : (() => {
    const base = meta.content.replace(/\/$/, '') + '/panel';
    const call = async (method, p, body) => {
      try {
        const r = await fetch(base + p, {
          method, credentials: 'same-origin', cache: 'no-store',
          headers: Object.assign({ accept: 'application/json' }, body !== undefined ? { 'content-type': 'application/json' } : {}, method !== 'GET' ? { 'x-sasan-panel': '1' } : {}),
          body: body !== undefined ? JSON.stringify(body) : undefined
        });
        let j = {};
        try { j = await r.json(); } catch (e) { /* پاسخ خالی */ }
        return Object.assign({ ok: r.ok }, j, { status: r.status });
      } catch (e) { return { ok: false, status: 0, error: 'network' }; }
    };
    return { get: (p) => call('GET', p), post: (p, b = {}) => call('POST', p, b), patch: (p, b) => call('PATCH', p, b) };
  })();

  /* ---------- وضعیت ---------- */
  const S = {
    user: null, cfg: null, bookings: [], callbacks: [], loaded: false, route: '',
    f: { st: 'open', dept: '', q: '' }, cal: { week: '', dept: '', doc: '', day: '', dir: '' }, cbF: 'open',
    sel: null, pick: null, stale: false, known: null, poll: 0, dirty: false, seg: {}, morphId: 0
  };
  const can = (p) => !!(S.cfg && S.cfg.can.includes(p));
  const isDoctor = () => S.user && S.user.role === 'doctor';
  const byRef = (ref) => S.bookings.find((b) => b.ref === ref);
  const docName = (id) => (S.cfg.doctors[id] ? S.cfg.doctors[id].name : '');
  const deptT = (k) => (S.cfg.depts[k] ? S.cfg.depts[k].t : k);
  const dchip = (k) => `<span class="dchip ${esc(k)}">${ic(DEPT_IC[k] || 'i-info')}${esc(deptT(k))}</span>`;
  const avatar = (name, dept, cls = '') => `<span class="av ${esc(dept || '')} ${cls}">${initial(name)}</span>`;

  async function call(method, p, body) {
    const r = await api[method](p, body);
    net(r.status !== 0);
    if (r.status === 401 && r.error === 'auth' && S.user) { sessionEnded(); }
    else if (r.status === 403 && r.error === 'must-change') forcePassword();
    return r;
  }
  function net(ok) { const n = $('#net'); if (n && n.hidden !== ok) n.hidden = ok; }
  function errText(r) {
    const e = r.error;
    if (e === 'network') return 'ارتباط با سرور برقرار نشد. اینترنت یا روشن بودن سرور را بررسی کنید.';
    if (e === 'conflict') return 'همکارتان همین حالا این مورد را تغییر داد؛ نسخه‌ی تازه نمایش داده شد.';
    if (e === 'when') return 'روز و ساعت نوبت را انتخاب کنید.';
    if (e === 'past') return 'روز گذشته را نمی‌شود برای نوبت انتخاب کرد.';
    if (e === 'template') return 'قالب پیامک تأیید نوبت هنوز در سرور تنظیم نشده است.';
    if (e === 'sms') return 'پیامک فرستاده نشد' + (r.message ? ': ' + r.message : '.');
    if (e === 'rate') return 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.';
    if (e === 'forbidden') return 'این کار با دسترسی شما ممکن نیست.';
    if (e === 'input') return r.message || 'اطلاعات واردشده درست نیست.';
    return r.message || 'کار انجام نشد. دوباره امتحان کنید.';
  }

  /* ---------- پیام کوتاه (با دکمه‌ی «برگرداندن» برای کارهای برگشت‌پذیر) ---------- */
  function toast(text, bad = false, undo = null) {
    const t = document.createElement('div');
    t.className = 'toast' + (bad ? ' toast--bad' : '');
    t.setAttribute('role', bad ? 'alert' : 'status');
    t.innerHTML = ic(bad ? 'i-alert' : 'i-check-circle') + '<span>' + esc(text) + '</span>' + (undo ? `<button type="button">${ic('i-undo', 'ic--s')} ${esc(undo.t || 'برگرداندن')}</button>` : '');
    const host = $('#toasts');
    while (host.children.length > 2) host.firstElementChild.remove();
    host.appendChild(t);
    let gone = false;
    const out = () => { if (gone) return; gone = true; t.classList.add('is-out'); setTimeout(() => t.remove(), 320); };
    if (undo) $('button', t).addEventListener('click', () => { out(); undo.fn(); });
    setTimeout(out, undo ? 6500 : bad ? 5200 : 3200);
  }
  const busy = (btn, on) => { if (!btn || !btn.classList) return; btn.classList.toggle('is-busy', on); btn.disabled = on; };

  /* ---------- ورود ---------- */
  let ticket = null, codeTimer = 0;
  const lgErr = (t) => { $('#lgErr').textContent = t || ''; };
  const cdErr = (t) => { $('#cdErr').textContent = t || ''; };
  function loginMsg(r) {
    if (r.error === 'auth') return 'نام کاربری یا رمز درست نیست.';
    if (r.error === 'locked') return `به‌خاطر چند تلاش نادرست، ورود با این حساب ${fa(Math.ceil((r.wait || 60) / 60))} دقیقه بسته است.`;
    if (r.error === 'sms') return 'فرستادن کد پیامکی ممکن نشد. چند دقیقه‌ی دیگر امتحان کنید یا به مدیر خبر دهید.';
    if (r.error === 'expired') return 'زمان کد تمام شد؛ دوباره وارد شوید.';
    if (r.error === 'attempts') return 'کد چند بار اشتباه وارد شد؛ دوباره وارد شوید.';
    if (r.error === 'code') return `کد درست نیست؛ ${fa(r.left)} فرصت دیگر دارید.`;
    return errText(r);
  }
  function showLogin(msg) {
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#loginForm').hidden = false;
    $('#codeForm').hidden = true;
    lgErr(msg || '');
    $('#lgPass').value = '';
    document.title = 'ورود · پنل پذیرش ساسان کلینیک';
    setTimeout(() => ($('#lgUser').value ? $('#lgPass') : $('#lgUser')).focus(), 60);
  }
  $('#lgEye').addEventListener('click', (e) => {
    const b = e.currentTarget, p = $('#lgPass'), on = p.type === 'password';
    p.type = on ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'پنهان کردن رمز' : 'نمایش رمز');
    b.innerHTML = ic(on ? 'i-eye-off' : 'i-eye');
  });
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginForm .btn--pri');
    const u = $('#lgUser').value.trim(), p = $('#lgPass').value;
    if (!u || !p) { lgErr('نام کاربری و رمز را بنویسید.'); return; }
    lgErr('');
    busy(btn, true);
    const r = await api.post('/login', { username: u, password: p });
    busy(btn, false);
    if (r.ok && r.step === 'code') { ticket = r.ticket; showCode(r); return; }
    if (r.ok) return afterLogin();
    lgErr(loginMsg(r));
  });
  const boxes = () => $$('#cdBoxes input');
  function showCode(r) {
    $('#loginForm').hidden = true;
    $('#codeForm').hidden = false;
    $('#cdSub').innerHTML = `کد ۵ رقمی به موبایل <b class="ltr">${esc(fa(r.mobile || ''))}</b> پیامک شد.` + (DEMO ? ' <span class="muted">(نمایشی: هر ۵ رقمی)</span>' : '');
    boxes().forEach((b) => { b.value = ''; b.classList.remove('is-on'); });
    cdErr('');
    runTimer(r.wait || 120);
    setTimeout(() => boxes()[0].focus(), 60);
  }
  function runTimer(sec) {
    clearInterval(codeTimer);
    const end = Date.now() + sec * 1000, btn = $('#cdResend'), out = $('#cdTimer');
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      out.textContent = left ? `ارسال دوباره تا ${fa(Math.floor(left / 60))}:${fa(String(left % 60).padStart(2, '0'))}` : 'کد نرسید؟';
      btn.disabled = left > 0;
      if (!left) clearInterval(codeTimer);
    };
    tick();
    codeTimer = setInterval(tick, 1000);
  }
  $('#cdBoxes').addEventListener('input', (e) => {
    const all = boxes(), i = all.indexOf(e.target);
    const v = en(e.target.value).replace(/\D/g, '');
    if (v.length > 1) { v.slice(0, 5).split('').forEach((d, k) => { if (all[k]) all[k].value = d; }); all[Math.min(4, v.length - 1)].focus(); }
    else { e.target.value = v; if (v && all[i + 1]) all[i + 1].focus(); }
    all.forEach((b) => b.classList.toggle('is-on', !!b.value));
    $('#cdBoxes').classList.remove('is-bad');
    if (all.every((b) => b.value)) $('#codeForm').requestSubmit();
  });
  $('#cdBoxes').addEventListener('keydown', (e) => {
    const all = boxes(), i = all.indexOf(e.target);
    if (e.key === 'Backspace' && !e.target.value && all[i - 1]) { all[i - 1].focus(); all[i - 1].value = ''; }
    if (e.key === 'ArrowRight' && all[i - 1]) all[i - 1].focus();
    if (e.key === 'ArrowLeft' && all[i + 1]) all[i + 1].focus();
  });
  $('#cdBoxes').addEventListener('paste', (e) => {
    const t = en((e.clipboardData || window.clipboardData).getData('text')).replace(/\D/g, '').slice(0, 5);
    if (!t) return;
    e.preventDefault();
    boxes().forEach((b, k) => { b.value = t[k] || ''; });
    $('#cdBoxes').dispatchEvent(new Event('input', { bubbles: true }));
  });
  $('#codeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = boxes().map((b) => b.value).join('');
    if (code.length < 5) { cdErr('هر ۵ رقم کد را وارد کنید.'); return; }
    const btn = $('#codeForm .btn--pri');
    busy(btn, true);
    const r = await api.post('/login/code', { ticket, code });
    busy(btn, false);
    if (r.ok) { clearInterval(codeTimer); return afterLogin(); }
    if (r.error === 'expired' || r.error === 'attempts') { showLogin(loginMsg(r)); return; }
    cdErr(loginMsg(r));
    const bx = $('#cdBoxes');
    bx.classList.remove('is-bad'); void bx.offsetWidth; bx.classList.add('is-bad');
    boxes().forEach((b) => { b.value = ''; b.classList.remove('is-on'); });
    boxes()[0].focus();
  });
  $('#cdResend').addEventListener('click', async () => {
    const r = await api.post('/login/resend', { ticket });
    if (r.ok) { runTimer(r.wait || 120); cdErr(''); toast('کد تازه فرستاده شد'); }
    else if (r.error === 'expired') showLogin(loginMsg(r));
    else { cdErr(loginMsg(r)); if (r.wait) runTimer(r.wait); }
  });
  $('#cdBack').addEventListener('click', () => { clearInterval(codeTimer); showLogin(); });

  async function afterLogin() {
    const me = await api.get('/me');
    if (!me.ok) { showLogin(errText(me)); return; }
    $('#lgPass').value = '';
    enter(me);
  }
  function resetState() {
    stopPolling();
    closeDrawer(true); closeModal(true); closeMenu();
    S.user = null; S.cfg = null; S.bookings = []; S.callbacks = []; S.known = null; S.loaded = false;
    smsData = null; usersData = null; auditData = null;
  }
  function sessionEnded() { resetState(); showLogin('نشست شما تمام شد؛ دوباره وارد شوید.'); }
  async function logout() {
    await api.post('/logout');
    resetState();
    history.replaceState(null, '', location.pathname + location.search);
    showLogin();
    toast('از پنل خارج شدید');
  }

  /* ==========================================================================
     قاب پنل: زبانه‌ها با نشانگر لغزان، نشان‌های شمارنده
     ========================================================================== */
  const ROUTES = {
    today: { t: 'پیشخوان', ic: 'i-home' },
    requests: { t: 'درخواست‌ها', ic: 'i-inbox', ok: () => !isDoctor() },
    calendar: { t: 'تقویم', ic: 'i-calendar' },
    callbacks: { t: 'تماس‌ها', ic: 'i-phone', ok: () => can('callbacks') },
    sms: { t: 'پیامک', ic: 'i-msg', ok: () => can('sms'), more: true },
    users: { t: 'کارکنان', ic: 'i-users', ok: () => can('users'), more: true },
    audit: { t: 'گزارش کارها', ic: 'i-history', ok: () => can('audit'), more: true }
  };
  const allowed = (r) => ROUTES[r] && (!ROUTES[r].ok || ROUTES[r].ok());
  const mainRoutes = () => Object.keys(ROUTES).filter((r) => allowed(r) && !ROUTES[r].more);
  const moreRoutes = () => Object.keys(ROUTES).filter((r) => allowed(r) && ROUTES[r].more);
  function renderShell() {
    const main = mainRoutes(), more = moreRoutes();
    const link = (r) => `<a href="#/${r}" data-r="${r}" aria-label="${ROUTES[r].t}" title="${ROUTES[r].t}">${ic(ROUTES[r].ic)}<span>${ROUTES[r].t}</span><b class="badge" data-badge="${r}" hidden></b></a>`;
    $('#tabs').innerHTML = '<i class="tabs__ind" aria-hidden="true"></i>' + main.map(link).join('') +
      (more.length ? `<button type="button" data-act="more" data-r="more" aria-haspopup="menu">${ic('i-more')}<span>بیشتر</span></button>` : '');
    $('#tabbar').innerHTML = main.map(link).join('') + `<button type="button" data-act="more" aria-haspopup="menu">${ic('i-more')}<span>بیشتر</span></button>`;
    $('#tabbar').style.setProperty('--n', String(main.length + 1));
    const u = S.user;
    $('#meBtn').innerHTML = `<span class="av">${initial(u.name)}</span><span><b>${esc(u.name)}</b><small>${esc(S.cfg.roles[u.role])}</small></span>`;
    $('#newBtn').hidden = !can('write');
    $('#fab').hidden = !can('write');
    $('#ribbon').hidden = !DEMO;
    $('#searchBox').hidden = isDoctor();
    $('.searchbtn').hidden = isDoctor();
  }
  function moveTabInd(instant) {
    const ind = $('.tabs__ind');
    const a = $(`#tabs [data-r="${S.route}"]`) || (ROUTES[S.route] && ROUTES[S.route].more ? $('#tabs [data-r="more"]') : null);
    if (!ind) return;
    if (!a || !a.offsetWidth) { ind.style.setProperty('opacity', '0'); return; }
    if (instant || !ind.dataset.on) ind.style.setProperty('transition', 'none');
    ind.style.setProperty('--x', a.offsetLeft + 'px');
    ind.style.setProperty('--w', a.offsetWidth + 'px');
    ind.style.setProperty('opacity', '1');
    if (instant || !ind.dataset.on) { void ind.offsetWidth; ind.style.removeProperty('transition'); ind.dataset.on = '1'; }
  }
  addEventListener('resize', () => moveTabInd(true));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveTabInd(true));

  function updateBadges() {
    const n = S.bookings.filter((b) => b.status === 'new').length;
    const c = S.callbacks.filter((x) => x.status === 'new').length;
    $$('[data-badge]').forEach((el) => {
      const v = el.dataset.badge === 'requests' ? n : el.dataset.badge === 'callbacks' ? c : 0;
      const prev = el.textContent;
      el.hidden = !v;
      el.textContent = fa(v);
      if (v && prev && prev !== el.textContent) { el.classList.remove('is-pop'); void el.offsetWidth; el.classList.add('is-pop'); }
    });
    document.title = (n && !isDoctor() ? `(${fa(n + c)}) ` : '') + 'پنل پذیرش · ساسان کلینیک';
  }

  /* ---------- مسیرها ---------- */
  function route() {
    if (!S.user || S.user.mustChange) return;
    let r = (location.hash.match(/^#\/([a-z]+)/) || [])[1] || 'today';
    if (!allowed(r)) r = 'today';
    const changed = r !== S.route;
    S.route = r;
    $$('#tabs a, #tabbar a').forEach((a) => { if (a.dataset.r === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    moveTabInd(false);
    closeMenu();
    render(changed ? 'enter' : 'none');
    if (changed) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  const VIEWS = { today: vToday, requests: vRequests, calendar: vCalendar, callbacks: vCallbacks, sms: vSms, users: vUsers, audit: vAudit };

  /* متغیرهای CSS از data-* (CSP: فقط CSSOM) */
  function applyVars(root) {
    $$('[data-p]', root).forEach((el) => el.style.setProperty('--p', el.dataset.p));
    $$('[data-i]', root).forEach((el) => el.style.setProperty('--i', el.dataset.i));
  }
  function render(mode = 'enter', html) {
    const host = $('#content');
    const v = document.createElement('div');
    v.className = 'view' + (mode === 'enter' ? '' : ' no-anim');
    v.innerHTML = html != null ? html : VIEWS[S.route]();
    if (mode === 'enter') [...v.children].forEach((el, i) => el.style.setProperty('--i', String(Math.min(i, 10))));
    host.replaceChildren(v);
    applyVars(v);
    segs(v, mode === 'enter');
    counts(v, mode === 'enter' ? null : undefined);
    if (VIEWS[S.route].after) VIEWS[S.route].after(v, mode);
    S.dirty = false;
  }
  /* نمای تازه با حرکت: کارت‌هایی که می‌روند محو می‌شوند، بقیه با FLIP سر جای تازه می‌لغزند و تازه‌ها بالا می‌آیند */
  async function morph() {
    if (!S.user || !VIEWS[S.route]) return;
    const id = ++S.morphId;
    const host = $('#content');
    const html = VIEWS[S.route]();
    if (!motion() || !host.firstElementChild) { const y = scrollY; render('none', html); scrollTo(0, y); return; }
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const keys = new Set($$('[data-key]', tmp).map((e) => e.dataset.key));
    const gone = $$('[data-key]', host).filter((e) => !keys.has(e.dataset.key));
    if (gone.length) {
      await Promise.all(gone.map((el) => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(-36px, 0, 0) scale(.97)' }], { duration: 260, easing: EASE_IO, fill: 'forwards' }).finished.catch(() => {})));
      if (id !== S.morphId) return;
    }
    const old = new Map($$('[data-key]', host).map((el) => [el.dataset.key, el.getBoundingClientRect()]));
    const oldN = new Map($$('[data-count][data-key]', host).map((el) => [el.dataset.key, Number(el.dataset.count)]));
    const y = scrollY;
    render('none', id === S.morphId ? html : VIEWS[S.route]());
    scrollTo(0, y);
    counts(host, oldN);
    $$('[data-key]', host).forEach((el) => {
      const r0 = old.get(el.dataset.key);
      if (!r0) { el.animate([{ opacity: 0, transform: 'translate3d(0, 14px, 0) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 40, easing: EASE, fill: 'backwards' }); return; }
      const r1 = el.getBoundingClientRect();
      const dx = r0.left - r1.left, dy = r0.top - r1.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) el.animate([{ transform: `translate3d(${dx}px, ${dy}px, 0)` }, { transform: 'none' }], { duration: 520, easing: EASE });
    });
  }
  /* شمارنده‌ها: ورود نما از صفر، به‌روزرسانی از عدد قبلی */
  function counts(root, prev) {
    $$('[data-count]', root).forEach((el) => {
      const n = Number(el.dataset.count);
      const from = prev === null ? 0 : prev && prev.has(el.dataset.key) ? prev.get(el.dataset.key) : n;
      if (!motion() || from === n || n < 1 && from < 1) { el.textContent = fa(n); return; }
      const t0 = performance.now(), dur = prev === null ? 700 : 450;
      const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = fa(Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
      el.textContent = fa(from);
      requestAnimationFrame(step);
    });
  }
  /* زبانه‌های کشویی: نشانگر از جای قبلی به گزینه‌ی تازه می‌لغزد */
  function segs(root, fresh) {
    $$('.seg[data-k]', root).forEach((seg) => {
      const btn = $('button[aria-pressed="true"]', seg);
      if (!btn) return;
      const ind = document.createElement('i'); ind.className = 'seg__ind'; ind.setAttribute('aria-hidden', 'true');
      seg.prepend(ind); seg.classList.add('has-ind');
      const k = seg.dataset.k, prev = S.seg[k];
      const put = (x, w) => { ind.style.setProperty('--x', x + 'px'); ind.style.setProperty('--w', w + 'px'); };
      ind.style.setProperty('transition', 'none');
      if (prev && !fresh) put(prev.x, prev.w); else put(btn.offsetLeft, btn.offsetWidth);
      void ind.offsetWidth;
      ind.style.removeProperty('transition');
      put(btn.offsetLeft, btn.offsetWidth);
      S.seg[k] = { x: btn.offsetLeft, w: btn.offsetWidth };
      if (fresh && seg.scrollWidth > seg.clientWidth) seg.scrollLeft = btn.offsetLeft - (seg.clientWidth - btn.offsetWidth) / 2;
    });
  }
  /* بعد از گرفتن داده‌ی تازه: اگر کاربر مشغول نوشتن یا پنجره‌ای باز است، صبر می‌کنیم */
  function refreshView() {
    if (!S.user || !VIEWS[S.route]) return;
    const a = document.activeElement;
    if (a && $('#content').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { S.dirty = true; return; }
    if (!$('#modal').hidden) { S.dirty = true; return; }
    morph();
  }

  /* ---------- داده ---------- */
  async function loadAll() {
    const [b, c] = await Promise.all([call('get', '/bookings'), can('callbacks') ? call('get', '/callbacks') : Promise.resolve(null)]);
    let changed = false;
    if (b.ok) {
      const sig = (l) => l.map((x) => x.ref + ':' + (x.v || 0) + ':' + x.status + ':' + (x.sms ? x.sms.length : 0)).join('|');
      changed = sig(b.bookings) !== sig(S.bookings);
      announce(b.bookings);
      S.bookings = b.bookings;
    }
    if (c && c.ok) {
      const sig = (l) => l.map((x) => x.id + ':' + (x.v || 0) + ':' + x.status).join('|');
      changed = changed || sig(c.callbacks) !== sig(S.callbacks);
      S.callbacks = c.callbacks;
    }
    S.loaded = true;
    updateBadges();
    return changed;
  }
  /* درخواست تازه‌ای که از سایت رسیده */
  function announce(list) {
    const refs = new Set(list.map((b) => b.ref));
    if (S.known && !isDoctor()) {
      const fresh = list.filter((b) => !S.known.has(b.ref) && b.status === 'new' && b.source !== 'phone');
      fresh.slice(0, 2).forEach((b) => toast(`درخواست تازه: ${b.name} · ${deptT(b.dept)}`));
      if (fresh.length) { S.fresh = new Set(fresh.map((b) => b.ref)); setTimeout(() => { S.fresh = null; }, 4000); }
    }
    S.known = refs;
  }
  function startPolling() {
    stopPolling();
    S.poll = setInterval(async () => {
      if (document.hidden || !S.user || S.user.mustChange) return;
      const changed = await loadAll();
      if (changed) { refreshView(); refreshDrawer(); }
    }, 30e3);
    /* هر دقیقه: زمان انتظار، خط «الان» و ساعت */
    S.tick = setInterval(() => {
      if (document.hidden || !S.user) return;
      tickClock();
      if (S.route === 'today' || S.route === 'requests') refreshView();
    }, 60e3);
  }
  function stopPolling() { clearInterval(S.poll); clearInterval(S.tick); S.poll = 0; S.tick = 0; }
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !S.user || S.user.mustChange || !S.loaded) return;
    if (await loadAll()) { refreshView(); refreshDrawer(); }
  });
  function putBooking(b) {
    const i = S.bookings.findIndex((x) => x.ref === b.ref);
    if (i >= 0) S.bookings[i] = b; else S.bookings.push(b);
    if (S.known) S.known.add(b.ref);
    updateBadges();
  }
  function tickClock() { const c = $('#heroClock'); if (c) c.textContent = dFull(today()) + '، ساعت ' + tLabel(nowMin()); }

  async function enter(me) {
    S.user = me.user; S.cfg = me.cfg;
    $('#login').hidden = true;
    $('#app').hidden = false;
    renderShell();
    if (S.user.mustChange) { forcePassword(); return; }
    $('#content').innerHTML = '<div class="stack"><div class="skel skel--tile"></div><div class="kpis">' + '<div class="skel skel--tile"></div>'.repeat(4) + '</div><div class="list">' + '<div class="skel"></div>'.repeat(3) + '</div></div>';
    await loadAll();
    S.route = '';
    route();
    startPolling();
  }

  /* ==========================================================================
     اجزای مشترک
     ========================================================================== */
  const sortBy = {
    created: (a, b) => (a.createdAt < b.createdAt ? -1 : 1),
    createdDesc: (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
    when: (a, b) => (a.date === b.date ? a.time - b.time : a.date < b.date ? -1 : 1),
    updated: (a, b) => ((a.updatedAt || a.createdAt) < (b.updatedAt || b.createdAt) ? 1 : -1)
  };
  const empty = (icon, title, text = '', ok = false) => `<div class="empty${ok ? ' empty--ok' : ''}"><span class="empty__art">${ic(icon)}</span><b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ''}</div>`;
  /* حلقه‌ی زمان انتظار: ۴ ساعت = حلقه‌ی پر */
  function waitRing(ts) {
    const m = ageMin(ts), p = Math.min(100, Math.max(4, (m / 240) * 100));
    return `<span class="wait${m >= 240 ? ' is-bad' : m >= 30 ? ' is-warn' : ''}" data-p="${p.toFixed(0)}" title="در انتظار از ${esc(ago(ts))}"><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="w__t" cx="20" cy="20" r="16" pathLength="100"/><circle class="w__v" cx="20" cy="20" r="16" pathLength="100"/></svg>${esc(waitShort(ts))}</span>`;
  }
  /* مسیر هر درخواست در پنج قدم */
  const STEP_OF = { new: 1, called: 2, scheduled: 3, arrived: 4, done: 5, 'no-show': 3, cancelled: 0 };
  function pathHtml(b) {
    const n = b.status === 'cancelled' ? (b.date ? 3 : 1) : STEP_OF[b.status] || 1;
    const bad = b.status === 'cancelled' || b.status === 'no-show';
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<i class="${i <= n ? 'is-on' : ''}${bad && i === n + 1 ? ' is-x' : ''}"></i>`;
    return `<span class="path${b.status === 'done' ? ' is-end' : ''}${bad ? ' is-bad' : ''}" aria-hidden="true">${s}</span>`;
  }
  const telLink = (m, name) => `<a class="tel" href="tel:${esc(m)}" data-stop aria-label="تماس با ${esc(name)}">${ic('i-phone')}<span class="ltr num">${esc(telFa(m))}</span></a>`;
  function lateMin(b) { return b.date === today() && b.status === 'scheduled' ? nowMin() - b.time : b.date < today() && b.status === 'scheduled' ? 9999 : -1; }
  function arrivedAt(b) { const e = (b.log || []).slice().reverse().find((x) => x.ev === 'status' && x.v === 'arrived'); return e ? e.at : null; }

  /* کارت «کار الان»: درخواست نوبت یا درخواست تماس */
  function taskHtml(t) {
    const w = can('write');
    if (t.kind === 'cb') {
      const c = t.x;
      return `<article class="task" data-key="c:${esc(c.id)}" data-act="cb" data-id="${esc(c.id)}" tabindex="0" role="button" aria-label="درخواست تماس ${esc(c.name)}">
        ${avatar(c.name, '')}
        <div class="task__main"><div class="task__name">${esc(c.name)} <span class="kind">${ic('i-phone-call')}درخواست تماس</span> ${c.status === 'called' ? pill('called', CB_STATUS) : ''}</div>
          <div class="task__meta">${c.topic ? `<span>${esc(c.topic)}</span>` : ''}<span>${esc(ago(c.createdAt))}</span></div>
          ${c.staffNote ? `<p class="task__note">${esc(c.staffNote)}</p>` : ''}</div>
        ${waitRing(c.createdAt)}
        <div class="task__acts">${telLink(c.mobile, c.name)}<span class="sp"></span>
          ${w && c.status === 'new' ? `<button class="btn btn--sec btn--s" type="button" data-act="cbq" data-v="called" data-id="${esc(c.id)}">${ic('i-check', 'ic--s')}تماس گرفتم</button>` : ''}
          ${w ? `<button class="btn btn--ok btn--s" type="button" data-act="cbq" data-v="done" data-id="${esc(c.id)}">${ic('i-check-circle', 'ic--s')}انجام شد</button>` : ''}</div>
      </article>`;
    }
    const b = t.x;
    return `<article class="task ${esc(b.dept)}${S.fresh && S.fresh.has(b.ref) ? ' is-fresh' : ''}" data-key="b:${esc(b.ref)}" data-act="open" data-ref="${esc(b.ref)}" tabindex="0" role="button" aria-label="درخواست ${esc(b.name)}">
      ${avatar(b.name, b.dept)}
      <div class="task__main">
        <div class="task__name">${esc(b.name)} ${dchip(b.dept)} ${b.status === 'called' ? pill('called') : ''}</div>
        <div class="task__meta"><span>${esc(b.type)}</span>${b.attempts ? `<span class="muted">${fa(b.attempts)} بار جواب نداد</span>` : ''}${b.source === 'phone' ? '<span>تلفنی</span>' : '<span>از سایت</span>'}</div>
        ${b.note ? `<p class="task__note">${esc(b.note)}</p>` : ''}
      </div>
      ${waitRing(b.createdAt)}
      <div class="task__acts">${can('phone') ? telLink(b.mobile, b.name) : ''}<span class="sp"></span>
        ${w ? `${b.status === 'new' ? `<button class="btn btn--ghost btn--s" type="button" data-act="q" data-v="noanswer" data-ref="${esc(b.ref)}">${ic('i-phone-missed', 'ic--s')}جواب نداد</button>
          <button class="btn btn--sec btn--s" type="button" data-act="q" data-v="called" data-ref="${esc(b.ref)}">${ic('i-check', 'ic--s')}تماس گرفتم</button>` : ''}
          <button class="btn btn--pri btn--s" type="button" data-act="book" data-ref="${esc(b.ref)}">${ic('i-cal-check', 'ic--s')}نوبت بده</button>` : ''}
      </div>
    </article>`;
  }
  /* یک نوبت در برنامه‌ی روز */
  function apptHtml(b, { quick = true, showDate = false } = {}) {
    const w = can('write') && quick;
    const late = lateMin(b);
    const arr = b.status === 'arrived' ? arrivedAt(b) : null;
    let acts = '';
    if (w && b.status === 'scheduled') acts = (late > 20 ? `<button class="btn btn--ghost btn--s" type="button" data-act="q" data-v="no-show" data-ref="${esc(b.ref)}">نیامد</button>` : '') + `<button class="btn btn--teal btn--s" type="button" data-act="q" data-v="arrived" data-ref="${esc(b.ref)}">${ic('i-user-check', 'ic--s')}آمد</button>`;
    else if (w && b.status === 'arrived') acts = `<button class="btn btn--ok btn--s" type="button" data-act="q" data-v="done" data-ref="${esc(b.ref)}">${ic('i-check', 'ic--s')}انجام شد</button>`;
    else if (!['scheduled', 'arrived'].includes(b.status)) acts = pill(b.status);
    const sub = [b.type, b.doctor ? docName(b.doctor) : deptT(b.dept)];
    if (showDate) sub.push(relDay(b.date));
    if (arr) sub.push('آمده از ' + ago(arr).replace(' پیش', '') + ' پیش');
    else if (late > 20 && late < 9999 && b.status === 'scheduled') sub.push('منتظر ثبت نتیجه');
    return `<div class="appt ${esc(b.dept)}${['done', 'no-show', 'cancelled'].includes(b.status) ? ' is-done' : ''}${b.status === 'arrived' ? ' is-arrived' : ''}${late > 20 && b.status === 'scheduled' ? ' is-late' : ''}" data-act="open" data-ref="${esc(b.ref)}" role="button" tabindex="0">
      <span class="appt__t"><b>${esc(b.name)}</b><small>${esc(sub.join(' · '))}</small></span>
      <span class="appt__acts">${acts}</span>
    </div>`;
  }

  /* ==========================================================================
     نما: پیشخوان
     ========================================================================== */
  function vToday() {
    const t = today(), B = S.bookings;
    const todays = B.filter((b) => b.date === t && TIMED.includes(b.status)).sort(sortBy.when);
    const tomorrow = B.filter((b) => b.date === addDays(t, 1) && b.status === 'scheduled').sort(sortBy.when);
    const first = /^دکتر/.test(S.user.name) ? S.user.name : String(S.user.name).split(' ')[0];
    const nm = nowMin(), hour = nm / 60;
    const hello = hour < 4 ? 'شب بخیر' : hour < 11 ? 'صبح بخیر' : hour < 17 ? 'روز بخیر' : hour < 20 ? 'عصر بخیر' : 'شب بخیر';
    const doneN = todays.filter((b) => b.status === 'done').length;
    const inClinic = todays.filter((b) => b.status === 'arrived');
    const leftN = todays.filter((b) => b.status === 'scheduled').length;
    const queue = isDoctor() ? [] : B.filter((b) => b.status === 'new' || b.status === 'called').map((x) => ({ kind: 'b', x, at: x.createdAt }))
      .concat(can('callbacks') ? S.callbacks.filter((c) => c.status !== 'done').map((x) => ({ kind: 'cb', x, at: x.createdAt })) : [])
      .sort((a, b) => (a.at < b.at ? -1 : 1));
    const waiting = queue.length;
    let summary;
    if (isDoctor()) summary = todays.length ? `امروز <b>${fa(todays.length)}</b> نوبت دارید${inClinic.length ? `؛ <b>${fa(inClinic.length)}</b> نفر در کلینیک منتظرند` : ''}.` : 'امروز نوبتی برایتان ثبت نشده.';
    else summary = (waiting ? `<b>${fa(waiting)}</b> نفر منتظر تماس‌اند` : 'همه‌ی درخواست‌ها پیگیری شده‌اند') + ` و امروز <b>${fa(todays.length)}</b> نوبت داریم` + (inClinic.length ? `؛ <b>${fa(inClinic.length)}</b> نفر همین حالا در کلینیک‌اند.` : '.');
    const pct = todays.length ? Math.round((doneN / todays.length) * 100) : 0;
    const hero = `<section class="hero">
      <div><span class="hero__k">${ic(hour >= 6 && hour < 18 ? 'i-sun' : 'i-moon', 'ic--s')}${esc(hello)}، ${esc(first)}</span>
        <h1>${isDoctor() ? 'برنامه‌ی امروز شما' : waiting ? 'اول با این‌ها تماس بگیرید' : 'کارهای تماس انجام شده'}</h1>
        <p>${summary}</p><span class="hero__clock num" id="heroClock"></span></div>
      <div class="ring" data-p="${pct}" aria-label="${fa(doneN)} از ${fa(todays.length)} نوبت امروز انجام شد"><svg viewBox="0 0 108 108" aria-hidden="true"><circle class="ring__t" cx="54" cy="54" r="46" pathLength="100"/><circle class="ring__v" cx="54" cy="54" r="46" pathLength="100"/></svg><b class="num">${fa(doneN)} از ${fa(todays.length)}<small>انجام شده</small></b></div>
    </section>`;
    const kp = (k) => `<${k.href ? `a href="${k.href}"` : 'div'} class="kpi ${k.c}${k.alert ? ' is-alert' : ''}"><span class="kpi__ic">${ic(k.ic)}</span><b class="num" data-count="${k.n}" data-key="k:${k.id}">${fa(k.n)}</b><span>${esc(k.t)}</span>${k.s ? `<small>${esc(k.s)}</small>` : ''}</${k.href ? 'a' : 'div'}>`;
    let kpis;
    if (isDoctor()) {
      kpis = [
        { id: 'left', n: leftN, t: 'نوبت باقی‌مانده', ic: 'i-calendar', c: 'k-violet' },
        { id: 'in', n: inClinic.length, t: 'در کلینیک', s: 'پذیرش شده و منتظر', ic: 'i-user-check', c: 'k-teal' },
        { id: 'done', n: doneN, t: 'انجام‌شده‌ی امروز', ic: 'i-check-circle', c: 'k-ok' },
        { id: 'tmr', n: tomorrow.length, t: 'نوبت‌های فردا', ic: 'i-cal', c: 'k-blue', href: '#/calendar' }
      ];
    } else {
      const fresh = B.filter((b) => b.status === 'new');
      const late = queue.filter((q) => ageMin(q.at) > 240).length;
      const oldest = fresh.slice().sort(sortBy.created)[0];
      kpis = [
        { id: 'wait', n: waiting, t: 'منتظر تماس', s: late ? `${fa(late)} مورد بیش از ۴ ساعت` : oldest ? 'قدیمی‌ترین: ' + ago(oldest.createdAt) : 'صف خالی است', ic: 'i-phone-call', c: late ? 'k-bad' : 'k-blue', alert: late > 0, href: '#/requests' },
        { id: 'today', n: todays.length, t: 'نوبت‌های امروز', s: `${fa(leftN)} مانده، ${fa(doneN)} انجام شد`, ic: 'i-calendar', c: 'k-violet', href: '#/calendar' },
        { id: 'in', n: inClinic.length, t: 'در کلینیک', s: 'پذیرش شده، منتظر پزشک', ic: 'i-user-check', c: 'k-teal' },
        { id: 'tmr', n: tomorrow.length, t: 'نوبت‌های فردا', s: S.cfg.sms.remind ? 'یادآوری پیامکی خودکار' : '', ic: 'i-cal', c: 'k-beauty', href: '#/calendar' }
      ];
    }
    /* خط زمان امروز با نشانگر «الان» */
    let day = '', nowPut = false;
    todays.forEach((b) => {
      if (!nowPut && b.time > nm) { day += `<div class="now" data-key="now"><span class="num">الان ${tLabel(nm)}</span></div>`; nowPut = true; }
      day += `<div class="slot" data-key="a:${esc(b.ref)}"><span class="slot__t num">${tLabel(b.time)}</span>${apptHtml(b)}</div>`;
    });
    if (todays.length && !nowPut) day += `<div class="now" data-key="now"><span class="num">الان ${tLabel(nm)}</span></div>`;
    const tmr = tomorrow.length ? `<div class="sec"><div class="sec__h">${ic('i-cal', 'ic--s')}فردا · ${esc(dLong(addDays(t, 1)))}</div><div class="tmr">${tomorrow.slice(0, 8).map((b) => `<button class="chip ${esc(b.dept)}" type="button" data-act="open" data-ref="${esc(b.ref)}" data-key="t:${esc(b.ref)}"><span class="dot"></span><span class="num">${tLabel(b.time)}</span> ${esc(b.name)}</button>`).join('')}${tomorrow.length > 8 ? `<a class="chip" href="#/calendar">+${fa(tomorrow.length - 8)}</a>` : ''}</div></div>` : '';
    const dayCard = `<section class="card"><div class="card__h">${ic('i-calendar')}<h2>برنامه‌ی امروز</h2><span class="sp"></span><button class="iconbtn no-print" type="button" data-act="print" aria-label="چاپ برنامه‌ی امروز" title="چاپ">${ic('i-print')}</button></div>
      <div class="card__b stack">${todays.length ? `<div class="day">${day}</div>` : empty('i-calendar', 'امروز نوبتی ثبت نشده', isDoctor() ? '' : 'نوبت‌هایی که بدهید این‌جا به ترتیب ساعت می‌آیند.')}${tmr}</div></section>`;
    if (isDoctor()) return hero + `<div class="kpis">${kpis.map(kp).join('')}</div>` + dayCard;
    const qCard = `<section class="card card--flat tasks-card"><div class="card__h">${ic('i-list-checks')}<h2>کارهای الان</h2>${waiting ? `<span class="badge">${fa(waiting)}</span>` : ''}<span class="sp"></span><a class="btn btn--ghost btn--s" href="#/requests">همه‌ی درخواست‌ها ${ic('i-chev-l', 'ic--s')}</a></div>
      <div class="card__b"><div class="tasks">${queue.slice(0, 12).map(taskHtml).join('') || `<div data-key="q:empty">${empty('i-check-circle', 'صف تماس خالی است', 'با همه‌ی درخواست‌ها تماس گرفته شده. آفرین!', true)}</div>`}</div>
      ${queue.length > 12 ? `<p class="hint">و ${fa(queue.length - 12)} مورد دیگر در «درخواست‌ها».</p>` : ''}</div></section>`;
    return hero + `<div class="kpis">${kpis.map(kp).join('')}</div><div class="grid2">${qCard}${dayCard}</div>`;
  }
  vToday.after = (root, mode) => {
    tickClock();
    const r = $('.ring', root);
    if (!r) return;
    if (mode === 'enter') requestAnimationFrame(() => requestAnimationFrame(() => r.classList.add('is-on'))); else r.classList.add('is-on');
  };

  /* ==========================================================================
     نما: درخواست‌ها
     ========================================================================== */
  const FILTERS = [
    ['open', 'منتظر پیگیری', (b) => b.status === 'new' || b.status === 'called'],
    ['booked', 'نوبت دارند', (b) => b.status === 'scheduled' || b.status === 'arrived'],
    ['done', 'انجام شد', (b) => b.status === 'done'],
    ['closed', 'لغو و نیامد', (b) => b.status === 'cancelled' || b.status === 'no-show'],
    ['all', 'همه', () => true]
  ];
  function matchQ(b, q) {
    if (!q) return true;
    const qq = en(q).toLowerCase().trim();
    const digits = qq.replace(/\D/g, '');
    return String(b.name).toLowerCase().includes(qq) || String(b.ref).toLowerCase().includes(qq) ||
      (digits.length >= 3 && (String(b.mobile).includes(digits) || String(b.ref).includes(digits)));
  }
  function rowHtml(b) {
    const sched = b.date && TIMED.includes(b.status);
    return `<div class="row ${esc(b.dept)}${S.sel === b.ref ? ' is-sel' : ''}" data-key="r:${esc(b.ref)}" role="button" tabindex="0" data-act="open" data-ref="${esc(b.ref)}">
      ${avatar(b.name, b.dept)}
      <div class="row__main">
        <div class="row__name">${esc(b.name)} <small class="num">${esc(fa(b.ref))}</small> ${pill(b.status)}</div>
        <div class="row__meta">${dchip(b.dept)}<span>${esc(b.type)}</span>${b.doctor ? `<span>${esc(docName(b.doctor))}</span>` : ''}${b.attempts && ['new', 'called'].includes(b.status) ? `<span>${fa(b.attempts)} بار جواب نداد</span>` : ''}${b.source === 'phone' ? '<span>تلفنی</span>' : ''}</div>
      </div>
      <div class="row__side">${pathHtml(b)}
        <span class="row__when">${sched ? `<span>${esc(relDay(b.date))}</span><small class="num">ساعت ${tLabel(b.time)}</small>` : `<span>${esc(ago(b.createdAt))}</span><small>ثبت درخواست</small>`}</span>
        ${can('phone') && b.mobile && ['new', 'called', 'scheduled'].includes(b.status) ? `<a class="iconbtn iconbtn--line" href="tel:${esc(b.mobile)}" aria-label="تماس با ${esc(b.name)}" data-stop>${ic('i-phone')}</a>` : ''}
      </div>
    </div>`;
  }
  function reqRows() {
    /* جست‌وجو همیشه در همه‌ی وضعیت‌هاست */
    const f = S.f.q ? FILTERS[FILTERS.length - 1] : FILTERS.find((x) => x[0] === S.f.st) || FILTERS[0];
    const list = S.bookings.filter((b) => f[2](b) && (!S.f.dept || b.dept === S.f.dept) && matchQ(b, S.f.q));
    list.sort(S.f.q ? sortBy.updated : S.f.st === 'booked' ? sortBy.when : S.f.st === 'open' ? sortBy.created : sortBy.updated);
    if (!list.length) return `<div data-key="r:empty">${S.f.q ? empty('i-search', 'چیزی پیدا نشد', 'نام، موبایل یا کد پیگیری را دوباره بررسی کنید.') : S.f.st === 'open' ? empty('i-check-circle', 'همه‌ی درخواست‌ها پیگیری شده‌اند', 'درخواست تازه‌ی سایت خودکار این‌جا می‌آید.', true) : empty('i-inbox', 'موردی در این فهرست نیست')}</div>`;
    return list.slice(0, 200).map(rowHtml).join('');
  }
  function vRequests() {
    const seg = FILTERS.map(([k, t, fn]) => `<button type="button" data-act="fst" data-v="${k}" aria-pressed="${S.f.st === k}">${t} <em class="num">${fa(S.bookings.filter(fn).length)}</em></button>`).join('');
    const chips = [['', 'همه‌ی بخش‌ها']].concat(Object.keys(S.cfg.depts).map((k) => [k, S.cfg.depts[k].t]))
      .map(([k, t]) => `<button class="chip ${k}" type="button" data-act="fdept" data-v="${k}" aria-pressed="${S.f.dept === k}">${k ? '<span class="dot"></span>' : ''}${esc(t)}</button>`).join('');
    return `<header class="ph"><div><h1>درخواست‌ها</h1><p>درخواست‌های سایت و نوبت‌های تلفنی؛ روی هر کدام بزنید تا قدم بعد را ببینید.</p></div></header>
      ${compact.matches ? `<label class="field"><span class="sr">جست‌وجو</span><input class="input" id="q2" type="search" placeholder="جست‌وجو: نام، موبایل یا کد پیگیری" value="${esc(S.f.q)}" autocomplete="off"></label>` : ''}
      <div class="toolbar"><div class="seg" data-k="fst" role="group" aria-label="وضعیت">${seg}</div><span class="sp"></span><div class="chips" role="group" aria-label="بخش">${chips}</div></div>
      ${S.f.q ? `<p class="hint">نتیجه‌ی جست‌وجوی «${esc(S.f.q)}» در همه‌ی درخواست‌ها · <button class="linkbtn" type="button" data-act="clearq">پاک کردن</button></p>` : ''}
      <div class="list">${reqRows()}</div>`;
  }
  let qTimer = 0;
  function onSearch(v, from) {
    S.f.q = v;
    if (from !== 'q') $('#q').value = v;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      if (S.route !== 'requests') { if (!v) return; S.f.st = 'all'; location.hash = '#/requests'; return; }
      if (from === 'q2') { const l = $('.list', $('#content')); if (l) { l.innerHTML = reqRows(); applyVars(l); } return; }
      morph();
    }, 140);
  }
  $('#q').addEventListener('input', (e) => onSearch(e.target.value, 'q'));
  $('#q').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; onSearch('', 'q'); e.target.blur(); } });
  document.addEventListener('input', (e) => { if (e.target.id === 'q2') onSearch(e.target.value, 'q2'); });

  /* ==========================================================================
     کشوی جزئیات درخواست
     ========================================================================== */
  let lastFocus = null;
  function newPick(b, preset = {}) {
    return Object.assign({ ref: b.ref, dept: b.dept, date: TIMED.includes(b.status) && b.date >= today() ? b.date : '', time: TIMED.includes(b.status) && b.date >= today() ? b.time : null, doctor: b.doctor || '', sms: S.cfg.sms.appt, open: true }, preset);
  }
  function openDrawer(ref, opts = {}) {
    const b = byRef(ref);
    if (!b) return;
    const was = S.sel;
    S.sel = ref; S.stale = false;
    if (was !== ref || opts.pick) S.pick = (opts.pick || (b.status === 'called' && can('write'))) ? newPick(b) : null;
    const d = $('#drawer');
    const opening = !d.classList.contains('is-on');
    drawDrawer(!opening && was === ref ? 'none' : 'enter');
    $$('.row.is-sel').forEach((x) => x.classList.remove('is-sel'));
    $$(`.row[data-ref="${CSS.escape(ref)}"]`).forEach((x) => x.classList.add('is-sel'));
    if (opening) {
      lastFocus = document.activeElement;
      d.hidden = false; $('#scrim').hidden = false;
      d.classList.remove('is-closing');
      requestAnimationFrame(() => requestAnimationFrame(() => { d.classList.add('is-on'); $('#scrim').classList.add('is-on'); }));
      document.documentElement.style.setProperty('overflow', 'hidden');
      setTimeout(() => { const c = $('[data-act="close"]', d); if (c) c.focus({ preventScroll: true }); }, 60);
    }
    if (opts.pick) setTimeout(() => { const p = $('#pick', d); if (p) p.scrollIntoView({ behavior: motion() ? 'smooth' : 'auto', block: 'start' }); }, opening ? 420 : 60);
  }
  function closeDrawer(instant) {
    const d = $('#drawer');
    if (d.hidden) return;
    const note = $('#dwNote', d);
    if (note && S.sel) saveNote(note, S.sel);
    S.sel = null; S.pick = null;
    $$('.row.is-sel').forEach((x) => x.classList.remove('is-sel'));
    d.classList.add('is-closing');
    d.classList.remove('is-on'); $('#scrim').classList.remove('is-on');
    document.documentElement.style.removeProperty('overflow');
    const done = () => { if (!d.classList.contains('is-on')) { d.hidden = true; $('#scrim').hidden = true; d.innerHTML = ''; } };
    if (instant || reduce.matches) done(); else setTimeout(done, 320);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    if (S.dirty) refreshView();
  }
  /* mode: enter (ورود همه‌ی بخش‌ها) یا none (بی‌حرکت، با حفظ جای اسکرول) */
  function drawDrawer(mode = 'none') {
    const b = S.sel && byRef(S.sel);
    if (!b) return;
    const d = $('#drawer'), body = $('.drawer__b', d), y = body ? body.scrollTop : 0;
    const prevStatus = d.dataset.status;
    d.innerHTML = drawerHtml(b);
    d.classList.toggle('no-anim', mode !== 'enter');
    d.dataset.v = String(b.v || 0);
    d.dataset.sms = String((b.sms || []).length);
    d.dataset.status = b.status;
    $$('.drawer__b > *', d).forEach((el, i) => el.style.setProperty('--i', String(Math.min(i, 8))));
    applyVars(d);
    const st = $('.steps', d);
    if (st) { if (mode === 'enter' || prevStatus !== b.status) requestAnimationFrame(() => requestAnimationFrame(() => st.classList.add('is-on'))); else st.classList.add('is-on'); }
    const nb = $('.drawer__b', d);
    if (nb && mode !== 'enter') nb.scrollTop = y;
    const strip = $('.strip', d);
    if (strip) centerStrip(strip, true);
  }
  /* داده‌ی تازه از سرور: اگر کارمند وسط انتخاب زمان یا نوشتن یادداشت است، فقط خبر می‌دهیم */
  function refreshDrawer() {
    if (!S.sel) return;
    const d = $('#drawer'), b = byRef(S.sel);
    if (!b) { closeDrawer(); return; }
    if ((b.v || 0) === Number(d.dataset.v || 0) && d.dataset.sms === String((b.sms || []).length)) return;
    const note = $('#dwNote', d);
    if ((S.pick && S.pick.date) || (note && note.value !== (b.staffNote || ''))) { S.stale = true; const w = $('#dwStale', d); if (w) w.hidden = false; return; }
    drawDrawer('none');
  }
  function stepsHtml(b) {
    const L = [['ثبت', 'i-send'], ['تماس', 'i-phone'], ['نوبت', 'i-cal-check'], ['آمد', 'i-user-check'], ['انجام', 'i-check']];
    const cur = { new: 1, called: 2, scheduled: 3, arrived: 4, done: 4, 'no-show': 3, cancelled: b.date ? 3 : 1 }[b.status];
    const stop = b.status === 'cancelled' || b.status === 'no-show';
    return `<ol class="steps${stop ? ' is-stop' : ''}${b.status === 'done' ? ' is-fin' : ''}" aria-label="مرحله: ${esc(STATUS[b.status])}">${L.map(([t, icn], i) => {
      const done = i < cur || (b.status === 'done' && i === 4);
      const isCur = i === cur;
      const label = isCur && stop ? (b.status === 'no-show' ? 'نیامد' : 'لغو شد') : t;
      return `<li class="${done && !isCur ? 'is-done' : ''}${isCur ? ' is-cur' : ''}" data-i="${i}"><span>${ic(isCur && stop ? 'i-x' : done && !isCur ? 'i-check' : icn)}</span>${esc(label)}</li>`;
    }).join('')}</ol>`;
  }
  function histHtml(b) {
    const items = [];
    if (!(b.log || []).some((e) => e.ev === 'create')) items.push({ at: b.createdAt, by: '', ev: 'site' });
    (b.log || []).forEach((e) => items.push(e));
    const row = (e) => {
      let icn = 'i-info', t = '';
      if (e.ev === 'site') { icn = 'i-send'; t = 'درخواست از سایت ثبت شد (شماره با کد پیامکی تأیید شد)'; }
      else if (e.ev === 'create') { icn = 'i-phone'; t = 'نوبت تلفنی ثبت شد'; }
      else if (e.ev === 'status') { icn = e.v === 'arrived' ? 'i-user-check' : e.v === 'cancelled' ? 'i-ban' : 'i-check'; t = 'وضعیت: ' + (STATUS[e.v] || CB_STATUS[e.v] || e.v); }
      else if (e.ev === 'when') { icn = 'i-calendar'; t = 'زمان نوبت: ' + dLong(e.v.date) + ' ساعت ' + tLabel(e.v.time); }
      else if (e.ev === 'doctor') { icn = 'i-user-round'; t = e.v ? 'پزشک: ' + docName(e.v) : 'پزشک برداشته شد'; }
      else if (e.ev === 'note') { icn = 'i-note'; t = 'یادداشت پذیرش به‌روز شد'; }
      else if (e.ev === 'noanswer') { icn = 'i-phone-missed'; t = 'تماس بی‌پاسخ (بار ' + fa(e.v) + ')'; }
      else if (e.ev === 'sms') { icn = 'i-msg'; t = 'پیامک ' + (SMS_KIND[e.v.kind] || '') + (e.v.ok ? ' فرستاده شد' : ' فرستاده نشد'); }
      return `<li><span class="hist__ic">${ic(icn)}</span><div><b>${esc(t)}</b><small>${esc(stamp(e.at))}${e.by ? ' · ' + esc(e.by) : ''}</small></div></li>`;
    };
    return items.reverse().map(row).join('');
  }
  function smsHtml(b) {
    const list = (b.sms || []).slice().reverse();
    if (!list.length) return '<p class="hint">هنوز پیامکی برای این بیمار فرستاده نشده.</p>';
    return list.map((e) => `<div class="smsrow">${ic('i-msg')}<div><b>${esc(SMS_KIND[e.kind] || e.kind)}</b><small>${esc(stamp(e.at))}${e.err ? ' · ' + esc(e.err) : ''}</small></div>
      ${e.ok ? (e.dlv ? `<span class="pill pill--${DLV_CLS[e.dlv] || 'called'}">${esc(DLV[e.dlv] || '')}</span>` : '<span class="pill pill--new">فرستاده شد</span>') : '<span class="pill pill--no-show">ناموفق</span>'}</div>`).join('');
  }
  function remindLine(b) {
    if (b.status !== 'scheduled' || !S.cfg.sms.remind) return '';
    if (b.remindedAt) return 'یادآوری پیامکی فرستاده شد';
    const t = today();
    if (b.date <= t) return '';
    return `یادآوری پیامکی ${b.date === addDays(t, 1) ? 'امروز' : relDay(addDays(b.date, -1))} از ساعت ${tLabel(S.cfg.sms.remindHour * 60)}`;
  }
  function ticketHtml(b) {
    const rl = remindLine(b);
    return `<div class="ticket ${esc(b.dept)}"><span class="ticket__d"><small>${esc(moName(b.date))}</small><b class="num">${fa(jDay(b.date))}</b></span>
      <span class="ticket__t"><b>${esc(relDay(b.date) === dLong(b.date) ? dLong(b.date) : relDay(b.date) + '، ' + dLong(b.date))}، ساعت <span class="num">${tLabel(b.time)}</span></b>
      <small>${b.doctor ? esc(docName(b.doctor)) + ' · ' : ''}${esc(deptT(b.dept))}${rl ? ' · ' + esc(rl) : ''}</small></span></div>`;
  }
  function nextHtml(b) {
    const w = can('write');
    const phone = can('phone') && b.mobile;
    const big = phone ? `<a class="bigtel" href="tel:${esc(b.mobile)}"><span>${ic('i-phone-call')}</span><div><small>تماس با ${esc(b.name)}</small><b class="ltr num">${esc(telFa(b.mobile))}</b></div></a>` : '';
    const head = (n, cls, title, sub) => `<div class="next__h"><span class="next__n ${cls}">${ic(n)}</span><div><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>`;
    if (!w) {
      if (TIMED.includes(b.status) && b.date) return `<section class="next">${ticketHtml(b)}</section>`;
      return '';
    }
    const pick = S.pick && S.pick.ref === b.ref ? pickHtml(S.pick, b) : '';
    switch (b.status) {
      case 'new':
        return `<section class="next">${head('i-phone-call', '', 'قدم بعد: با بیمار تماس بگیرید', b.attempts ? `تا حالا ${fa(b.attempts)} بار جواب نداده` : 'زمان مناسب را بپرسید و نوبت بدهید')}${big}
          <div class="next__acts"><button class="btn btn--sec" type="button" data-act="st" data-v="called">${ic('i-check')}تماس گرفتم</button><button class="btn btn--ghost" type="button" data-act="noanswer">${ic('i-phone-missed')}جواب نداد</button></div>
          ${pick || `<div class="next__acts"><button class="btn btn--pri" type="button" data-act="sched">${ic('i-cal-check')}همین حالا نوبت بده</button></div>`}
          <div class="next__more"><button class="btn btn--ghost btn--s" type="button" data-act="st" data-v="cancelled" data-confirm="این درخواست لغو شود؟">${ic('i-ban', 'ic--s')}لغو درخواست</button></div></section>`;
      case 'called':
        return `<section class="next">${head('i-cal-check', '', 'قدم بعد: روز و ساعت نوبت', 'با بیمار هماهنگ کنید و این‌جا ثبت کنید')}${pick || `<div class="next__acts"><button class="btn btn--pri" type="button" data-act="sched">${ic('i-cal-check')}انتخاب روز و ساعت</button></div>`}
          <div class="next__more">${phone ? `<a class="btn btn--ghost btn--s" href="tel:${esc(b.mobile)}">${ic('i-phone', 'ic--s')}تماس دوباره</a>` : ''}<button class="btn btn--ghost btn--s" type="button" data-act="st" data-v="new">${ic('i-undo', 'ic--s')}برگشت به منتظر تماس</button><span class="sp"></span><button class="btn btn--ghost btn--s" type="button" data-act="st" data-v="cancelled" data-confirm="این درخواست لغو شود؟">${ic('i-ban', 'ic--s')}لغو</button></div></section>`;
      case 'scheduled': {
        const late = lateMin(b);
        return `<section class="next">${head('i-user-check', 'is-teal', late > 20 ? 'زمان نوبت گذشته؛ نتیجه را ثبت کنید' : 'قدم بعد: وقتی بیمار آمد، «آمد» را بزنید', late > 20 ? '' : 'نوبت ثبت شده است')}${ticketHtml(b)}
          ${pick || `<div class="next__acts"><button class="btn btn--teal" type="button" data-act="st" data-v="arrived">${ic('i-user-check')}آمد</button>${late > 20 ? `<button class="btn btn--sec" type="button" data-act="st" data-v="no-show">${ic('i-user-x')}نیامد</button>` : ''}<button class="btn btn--sec" type="button" data-act="sched">${ic('i-calendar')}تغییر زمان</button></div>`}
          <div class="next__more">${S.cfg.sms.appt ? `<button class="btn btn--ghost btn--s" type="button" data-act="resms"><span class="spin"></span>${ic('i-send', 'ic--s')}<span class="btn__t">پیامک تأیید دوباره</span></button>` : ''}${late <= 20 ? `<button class="btn btn--ghost btn--s" type="button" data-act="st" data-v="no-show">${ic('i-user-x', 'ic--s')}نیامد</button>` : ''}<span class="sp"></span><button class="btn btn--ghost btn--s" type="button" data-act="st" data-v="cancelled" data-confirm="نوبت لغو شود؟ اگر پیامک یادآوری هنوز نرفته، دیگر فرستاده نمی‌شود.">${ic('i-ban', 'ic--s')}لغو نوبت</button></div></section>`;
      }
      case 'arrived': {
        const at = arrivedAt(b);
        return `<section class="next">${head('i-check', 'is-ok', 'بیمار در کلینیک است', at ? 'پذیرش شد ' + ago(at) : '')}${ticketHtml(b)}
          <div class="next__acts"><button class="btn btn--ok" type="button" data-act="st" data-v="done">${ic('i-check')}درمان انجام شد</button></div>
          <div class="next__more"><button class="btn btn--ghost btn--s" type="button" data-act="st" data-v="scheduled">${ic('i-undo', 'ic--s')}هنوز نیامده</button></div></section>`;
      }
      default: {
        const t = { done: ['i-check-circle', 'is-ok', 'این مراجعه انجام شد'], cancelled: ['i-ban', 'is-bad', 'این درخواست لغو شد'], 'no-show': ['i-user-x', 'is-bad', 'بیمار نیامد'] }[b.status];
        return `<section class="next">${head(t[0], t[1], t[2], '')}${b.date ? ticketHtml(b) : ''}${pick}
          <div class="next__acts">${!pick ? `<button class="btn btn--sec" type="button" data-act="sched">${ic('i-cal-plus')}نوبت تازه برای همین بیمار</button>` : ''}${b.status !== 'done' ? `<button class="btn btn--ghost" type="button" data-act="st" data-v="called">${ic('i-undo')}بازگشت به صف</button>` : ''}</div></section>`;
      }
    }
  }
  function drawerHtml(b) {
    const w = can('write');
    const visits = can('phone') && b.mobile ? S.bookings.filter((x) => x.mobile === b.mobile && x.ref !== b.ref).sort(sortBy.createdDesc) : [];
    return `<i class="drawer__grip" aria-hidden="true"></i><div class="drawer__h">
        ${avatar(b.name, b.dept, 'av--l')}
        <div><h2 id="dwTitle">${esc(b.name)}</h2><small class="num"><span class="ltr">${esc(fa(b.ref))}</span> · ${esc(deptT(b.dept))} · ${esc(b.type)} · ${b.source === 'phone' ? 'تلفنی' : 'از سایت'}</small></div>
        <button class="iconbtn" type="button" data-act="close" aria-label="بستن">${ic('i-x')}</button>
      </div>
      <div class="drawer__b">
        <div class="warnbox" id="dwStale" ${S.stale ? '' : 'hidden'}>${ic('i-refresh')}<span>همکارتان همین حالا این درخواست را تغییر داد. <button class="linkbtn" type="button" data-act="reload">نمایش نسخه‌ی تازه</button></span></div>
        ${stepsHtml(b)}
        ${nextHtml(b)}
        ${b.note ? `<div class="sec"><div class="sec__h">${ic('i-chat', 'ic--s')}توضیح بیمار</div><p class="note note--pt">${esc(b.note)}</p></div>` : ''}
        <dl class="facts">
          ${can('phone') && b.mobile ? `<div class="wide"><dt>موبایل</dt><dd class="telrow"><a class="ltr num" href="tel:${esc(b.mobile)}">${esc(telFa(b.mobile))}</a><button class="iconbtn" type="button" data-act="copy" data-v="${esc(b.mobile)}" aria-label="کپی شماره" title="کپی شماره">${ic('i-copy', 'ic--s')}</button></dd></div>` : ''}
          <div><dt>بخش</dt><dd>${esc(deptT(b.dept))}</dd></div>
          <div><dt>نوع مراجعه</dt><dd>${esc(b.type)}</dd></div>
          <div><dt>زمان ثبت</dt><dd>${esc(ago(b.createdAt))}<br><small class="muted">${esc(stamp(b.createdAt))}</small></dd></div>
          <div><dt>${b.source === 'phone' ? 'ثبت‌کننده' : 'تماس‌های بی‌پاسخ'}</dt><dd>${b.source === 'phone' ? esc(b.createdBy || '—') : fa(b.attempts || 0)}</dd></div>
        </dl>
        <div class="sec"><div class="sec__h">${ic('i-note', 'ic--s')}یادداشت پذیرش<span class="sp"></span><span class="saved" id="dwSaved">${ic('i-check', 'ic--s')}ذخیره شد</span></div>
          ${w ? `<textarea class="textarea" id="dwNote" maxlength="300" placeholder="مثلاً: عصرها تماس بگیرید؛ بیمه دارد (خودکار ذخیره می‌شود)">${esc(b.staffNote || '')}</textarea>` : `<p class="note">${esc(b.staffNote || '—')}</p>`}
        </div>
        ${visits.length ? `<div class="sec"><div class="sec__h">${ic('i-history', 'ic--s')}مراجعه‌های دیگر همین شماره · ${fa(visits.length)}</div><div class="visits">${visits.slice(0, 5).map((x) => `<button class="visit ${esc(x.dept)}" type="button" data-act="open" data-ref="${esc(x.ref)}">${dchip(x.dept)}<b>${esc(x.date && TIMED.includes(x.status) ? relDay(x.date) : ago(x.createdAt))}</b><span class="muted">${esc(x.type)}</span><span class="sp"></span>${pill(x.status)}</button>`).join('')}</div></div>` : ''}
        ${can('sms') ? `<details class="fold"${(b.sms || []).some((e) => !e.ok) ? ' open' : ''}><summary>${ic('i-msg', 'ic--s')}پیامک‌ها · ${fa((b.sms || []).length)}${ic('i-chev-d', 'ic--s')}</summary><div class="sec">${smsHtml(b)}${(b.sms || []).some((e) => e.ok && e.id) ? `<div><button class="btn btn--ghost btn--s" type="button" data-act="dlv"><span class="spin"></span>${ic('i-refresh', 'ic--s')}<span class="btn__t">به‌روزرسانی وضعیت رسیدن</span></button></div>` : ''}</div></details>` : ''}
        <details class="fold"><summary>${ic('i-history', 'ic--s')}تاریخچه‌ی کارها${ic('i-chev-d', 'ic--s')}</summary><div><ul class="hist">${histHtml(b)}</ul></div></details>
      </div>`;
  }

  /* ==========================================================================
     انتخاب روز و ساعت (در کشو و در نوبت تازه)
     ========================================================================== */
  function clashes(dept, doctor, date, time, except) {
    return S.bookings.filter((x) => x.ref !== except && BUSY.includes(x.status) && x.date === date && Math.abs(x.time - time) < 30 &&
      (doctor ? x.doctor === doctor : x.dept === dept && !x.doctor));
  }
  function slotsFor(dept) {
    const d = S.cfg.depts[dept], step = dept === 'medicine' ? 30 : 15, out = [];
    for (let m = d.from; m < d.to; m += step) out.push(m);
    return out;
  }
  const GROUPS = [[0, 360, 'بامداد', 'i-moon'], [360, 720, 'صبح', 'i-sun'], [720, 1020, 'بعدازظهر', 'i-sun'], [1020, 1440, 'عصر و شب', 'i-moon']];
  function pickHtml(st, b) {
    const dept = st.dept || b.dept, D = S.cfg.depts[dept];
    const t = today();
    const docs = Object.entries(S.cfg.doctors).filter(([, v]) => v.k === dept);
    let strip = '';
    for (let i = 0; i < 28; i++) {
      const iso = addDays(t, i);
      const closed = !D.days.includes(wdOf(iso));
      /* امروز وقتی ساعت کاری بخش تمام شده، «تمام شد» نشان داده می‌شود */
      const over = i === 0 && !slotsFor(dept).some((m) => m > nowMin());
      const n = S.bookings.filter((x) => BUSY.includes(x.status) && x.date === iso && x.dept === dept).length;
      const label = i === 0 ? 'امروز' : i === 1 ? 'فردا' : WD_SHORT[wdOf(iso)];
      strip += `<button type="button" data-act="pday" data-v="${iso}" aria-pressed="${st.date === iso}" class="${i === 0 ? 'is-today' : ''}${closed || over ? ' is-closed' : ''}" aria-label="${esc(dLong(iso))}${closed ? '، بخش تعطیل' : over ? '، ساعت کاری امروز تمام شده' : ''}${n ? '، ' + fa(n) + ' نوبت' : ''}">${esc(label)}<b class="num">${fa(jDay(iso))}</b><small>${closed ? 'تعطیل' : over ? 'تمام شد' : jDay(iso) === 1 || i === 0 ? esc(moName(iso)) : '&nbsp;'}</small><i class="${n ? '' : 'is-empty'}"></i></button>`;
    }
    let times = '';
    if (st.date) {
      const nm = st.date === t ? nowMin() : -1;
      const all = slotsFor(dept).filter((m) => m > nm);
      times = GROUPS.map(([a, z, name, icn]) => {
        const g = all.filter((m) => m >= a && m < z);
        if (!g.length) return '';
        return `<div class="tgrp"><small>${ic(icn)}${name}</small><div class="tgrid">${g.map((m) => {
          const c = clashes(dept, st.doctor, st.date, m, b.ref);
          return `<button class="time num${c.length ? ' is-busy' : ''}" type="button" data-act="ptime" data-v="${m}" aria-pressed="${st.time === m}"${c.length ? ` title="نوبت ${esc(c.map((x) => x.name).join('، '))}"` : ''}>${tLabel(m)}</button>`;
        }).join('')}</div></div>`;
      }).join('') || '<p class="hint">امروز دیگر ساعت خالی‌ای در ساعت کاری این بخش نمانده؛ روز دیگری انتخاب کنید.</p>';
    }
    const warns = [];
    if (st.date && !D.days.includes(wdOf(st.date))) warns.push(`${D.t} ${wdName(st.date)}ها تعطیل است (${D.hours}). اگر شیفت استثنا دارید، ادامه دهید.`);
    if (st.date && st.time != null) {
      const c = clashes(dept, st.doctor, st.date, st.time, b.ref);
      if (c.length) warns.push(`${st.doctor ? docName(st.doctor) : 'این بخش'} در همین ساعت نوبت دیگری هم دارد (${c.map((x) => x.name).join('، ')}).`);
    }
    const smsOk = S.cfg.sms.appt;
    const ready = st.date && st.time != null;
    return `<div class="pick" id="pick">
      ${docs.length ? `<div class="pick__sec"><span class="pick__h">${ic('i-user-round', 'ic--s')}پزشک</span><div class="chips">${[['', 'هر پزشکی']].concat(docs.map(([k, v]) => [k, v.name])).map(([k, n]) => `<button class="chip" type="button" data-act="pdoc" data-v="${k}" aria-pressed="${st.doctor === k}">${esc(n)}</button>`).join('')}</div></div>` : ''}
      <div class="pick__sec"><span class="pick__h">${ic('i-calendar', 'ic--s')}روز<span class="sp"></span><span class="muted">${esc(D.hours)}</span></span><div class="strip">${strip}</div></div>
      ${st.date ? `<div class="pick__sec"><span class="pick__h">${ic('i-clock', 'ic--s')}ساعت · ${esc(dLong(st.date))}</span><div class="times${st.anim ? ' is-in' : ''}">${times}</div></div>` : '<p class="hint">روز نوبت را از نوار بالا انتخاب کنید.</p>'}
      ${warns.map((x) => `<div class="warnbox">${ic('i-alert', 'ic--s')}<span>${esc(x)}</span></div>`).join('')}
      ${ready ? `<div class="pick__sum">${ic('i-cal-check')}<div><b>${esc(relDay(st.date) === dLong(st.date) ? dLong(st.date) : relDay(st.date) + '، ' + dLong(st.date))}، ساعت <span class="num">${tLabel(st.time)}</span></b><small>${esc(st.doctor ? docName(st.doctor) : deptT(dept))}</small></div></div>` : ''}
      <label class="check${smsOk ? '' : ' is-off'}"><input type="checkbox" data-act="psms" ${smsOk && st.sms ? 'checked' : ''} ${smsOk ? '' : 'disabled'}><span>پیامک تأیید نوبت برای بیمار فرستاده شود<small>${smsOk ? 'متن پیامک: روز، ساعت و بخش نوبت' : 'قالب پیامک تأیید نوبت هنوز روی سرور تنظیم نشده (npm run setup)'}</small></span></label>
      ${st.ref ? `<div class="next__acts"><button class="btn btn--pri btn--lg" type="button" data-act="psave" ${ready ? '' : 'disabled'}><span class="spin"></span>${ic('i-check')}<span class="btn__t">ثبت نوبت</span></button><button class="btn btn--ghost" type="button" data-act="pcancel">انصراف</button></div>` : ''}
    </div>`;
  }
  function centerStrip(strip, instant) {
    const on = $('button[aria-pressed="true"]', strip);
    if (!on) return;
    const x = on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2;
    if (instant || !motion()) strip.scrollLeft = x; else strip.scrollTo({ left: x, behavior: 'smooth' });
  }
  /* فقط همان بخش انتخاب زمان دوباره ساخته می‌شود؛ جای اسکرول نوار روزها حفظ می‌شود */
  function redrawPick(anim) {
    const host = $('#pick');
    if (!host || !S.pick) return;
    const b = S.pick.ref ? byRef(S.pick.ref) : { ref: '', dept: S.pick.dept };
    const sx = $('.strip', host) ? $('.strip', host).scrollLeft : 0;
    S.pick.anim = anim;
    const tmp = document.createElement('div');
    tmp.innerHTML = pickHtml(S.pick, b);
    S.pick.anim = false;
    const el = tmp.firstElementChild;
    if (!anim) el.classList.add('no-anim');
    host.replaceWith(el);
    const strip = $('.strip', el);
    if (strip) { strip.scrollLeft = sx; if (anim) centerStrip(strip, false); }
    if (anim) { const g = $('.times', el); if (g) { const first = $('.time[aria-pressed="true"]', g) || $('.time:not(.is-busy)', g); if (first && mobile.matches) first.scrollIntoView({ block: 'nearest', behavior: motion() ? 'smooth' : 'auto' }); } }
  }

  /* ---------- تغییر درخواست ---------- */
  async function patch(ref, body, okMsg, btn, { undo = null } = {}) {
    const b = byRef(ref);
    if (!b) return null;
    busy(btn, true);
    const r = await call('patch', '/bookings/' + encodeURIComponent(ref), Object.assign({ v: b.v || 0 }, body));
    busy(btn, false);
    if (r.status === 409 && r.booking) { putBooking(r.booking); S.stale = false; drawDrawer('none'); refreshView(); toast(errText(r), true); return null; }
    if (!r.ok) { toast(errText(r), true); return null; }
    putBooking(r.booking);
    if (okMsg) toast(okMsg, false, undo);
    if (r.sms) toast(r.sms.ok ? 'پیامک تأیید نوبت فرستاده شد' : 'نوبت ثبت شد ولی ' + errText(r.sms), !r.sms.ok);
    return r.booking;
  }
  const ST_MSG = { new: 'برگشت به منتظر تماس', called: 'ثبت شد: تماس گرفته شد', scheduled: 'نوبت ثبت شد', arrived: 'پذیرش شد: بیمار در کلینیک است', done: 'انجام شد', 'no-show': 'ثبت شد: بیمار نیامد', cancelled: 'لغو شد' };
  /* تغییر وضعیت با امکان برگرداندن */
  async function setStatus(ref, v, btn) {
    const b = byRef(ref);
    if (!b) return null;
    const prev = b.status;
    const undo = prev !== v ? { t: 'برگرداندن', fn: async () => { if (await patch(ref, { status: prev }, 'برگردانده شد')) { refreshView(); if (S.sel === ref) drawDrawer('none'); } } } : null;
    const nb = await patch(ref, { status: v }, ST_MSG[v] || 'ثبت شد', btn, { undo });
    if (nb) { refreshView(); if (S.sel === ref) { if (v !== 'called') S.pick = null; else S.pick = newPick(nb); drawDrawer('none'); } }
    return nb;
  }

  /* ==========================================================================
     نما: تقویم هفتگی (موبایل: یک روز با نوار روزها)
     ========================================================================== */
  function vCalendar() {
    const t = today();
    if (!S.cal.week) S.cal.week = satOf(t);
    const sat = S.cal.week, fri = addDays(sat, 6);
    if (!S.cal.day || S.cal.day < sat || S.cal.day > fri) S.cal.day = t >= sat && t <= fri ? t : sat;
    const list = S.bookings.filter((b) => b.date >= sat && b.date <= fri && TIMED.includes(b.status) &&
      (!S.cal.dept || b.dept === S.cal.dept) && (!S.cal.doc || b.doctor === S.cal.doc)).sort(sortBy.when);
    const D = S.cal.dept && S.cfg.depts[S.cal.dept];
    const label = `${dm(sat)} تا ${dm(fri)}`;
    const chips = isDoctor() ? '' : [['', 'همه']].concat(Object.keys(S.cfg.depts).map((k) => [k, S.cfg.depts[k].t]))
      .map(([k, tt]) => `<button class="chip ${k}" type="button" data-act="cdept" data-v="${k}" aria-pressed="${S.cal.dept === k}">${k ? '<span class="dot"></span>' : ''}${esc(tt)}</button>`).join('');
    const docs = Object.entries(S.cfg.doctors).filter(([, v]) => !S.cal.dept || v.k === S.cal.dept);
    const docSel = isDoctor() ? '' : `<select class="select" data-act="cdoc" aria-label="پزشک"><option value="">همه‌ی پزشکان</option>${docs.map(([k, v]) => `<option value="${k}"${S.cal.doc === k ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>`;
    const w = can('write');
    let cols = '', strip = '';
    for (let i = 0; i < 7; i++) {
      const iso = addDays(sat, i), day = list.filter((b) => b.date === iso);
      const closed = D && !D.days.includes(wdOf(iso));
      cols += `<section class="wday${iso === t ? ' is-today' : ''}${closed ? ' is-closed' : ''}" data-i="${i}"><div class="wday__h"><b>${esc(wdName(iso))}</b><small><span>${esc(dm(iso))}</span><span class="num">${day.length ? fa(day.length) + ' نوبت' : closed ? 'تعطیل' : ''}</span></small></div>
        <div class="wday__b">${day.map((b) => `<button class="appt ${esc(b.dept)}${['done', 'no-show'].includes(b.status) ? ' is-done' : ''}${b.status === 'arrived' ? ' is-arrived' : ''}" type="button" data-act="open" data-ref="${esc(b.ref)}"><span class="appt__time num">${tLabel(b.time)}${b.status !== 'scheduled' ? ' · ' + esc(STATUS[b.status]) : ''}</span><b>${esc(b.name)}</b><small>${esc(b.doctor ? docName(b.doctor) : deptT(b.dept))}</small></button>`).join('')}
        ${w && iso >= t ? `<button class="wday__add" type="button" data-act="newon" data-v="${iso}" aria-label="نوبت تازه برای ${esc(dLong(iso))}">${ic('i-plus', 'ic--s')}</button>` : ''}</div></section>`;
      strip += `<button type="button" data-act="cday" data-v="${iso}" aria-pressed="${S.cal.day === iso}" class="${iso === t ? 'is-today' : ''}${closed ? ' is-closed' : ''}">${esc(WD_SHORT[wdOf(iso)])}<b class="num">${fa(jDay(iso))}</b><small>${day.length ? fa(day.length) + ' نوبت' : '&nbsp;'}</small><i class="${day.length ? '' : 'is-empty'}"></i></button>`;
    }
    const dayList = list.filter((b) => b.date === S.cal.day);
    const mobileList = `<div class="strip">${strip}</div><div class="day">${dayList.map((b) => `<div class="slot" data-key="m:${esc(b.ref)}"><span class="slot__t num">${tLabel(b.time)}</span>${apptHtml(b, { quick: S.cal.day === t })}</div>`).join('') || `<div data-key="m:empty">${empty('i-calendar', 'نوبتی در ' + dLong(S.cal.day) + ' نیست')}</div>`}</div>
      ${w && S.cal.day >= t ? `<button class="btn btn--sec btn--block" type="button" data-act="newon" data-v="${S.cal.day}">${ic('i-cal-plus')}نوبت تازه برای ${esc(dLong(S.cal.day))}</button>` : ''}`;
    const dir = S.cal.dir; S.cal.dir = '';
    return `<header class="ph"><div><h1>تقویم نوبت‌ها</h1><p>${fa(list.length)} نوبت در این هفته${D ? '؛ ساعت کاری ' + esc(D.t) + ': ' + esc(D.hours) : ''}</p></div></header>
      <div class="toolbar">
        <div class="wk"><button class="iconbtn iconbtn--line" type="button" data-act="wk" data-v="-7" aria-label="هفته‌ی قبل">${ic('i-chev-r')}</button>
        <b class="num">${esc(label)}</b>
        <button class="iconbtn iconbtn--line" type="button" data-act="wk" data-v="7" aria-label="هفته‌ی بعد">${ic('i-chev-l')}</button></div>
        <button class="btn btn--sec btn--s" type="button" data-act="wk" data-v="0">این هفته</button>
        <span class="sp"></span><div class="chips">${chips}</div>${docSel}
        <button class="iconbtn iconbtn--line no-print" type="button" data-act="print" aria-label="چاپ" title="چاپ">${ic('i-print')}</button>
      </div>
      ${mobile.matches ? mobileList : `<div class="week${dir ? ' is-' + dir : ''}">${cols}</div>`}`;
  }
  vCalendar.after = (root) => { const s = $('.strip', root); if (s) centerStrip(s, true); };
  mobile.addEventListener('change', () => { if (S.user && ['calendar', 'requests'].includes(S.route)) render('none'); });
  compact.addEventListener('change', () => { if (S.user && S.route === 'requests') render('none'); });

  /* ==========================================================================
     نما: درخواست‌های تماس
     ========================================================================== */
  function vCallbacks() {
    const F2 = [['open', 'باز', (c) => c.status !== 'done'], ['done', 'انجام شد', (c) => c.status === 'done'], ['all', 'همه', () => true]];
    const f = F2.find((x) => x[0] === S.cbF) || F2[0];
    const list = S.callbacks.filter(f[2]).sort(S.cbF === 'open' ? sortBy.created : sortBy.createdDesc);
    const seg = F2.map(([k, t, fn]) => `<button type="button" data-act="cbf" data-v="${k}" aria-pressed="${S.cbF === k}">${t} <em class="num">${fa(S.callbacks.filter(fn).length)}</em></button>`).join('');
    const w = can('write');
    const rows = list.map((c) => `<article class="task" data-key="c:${esc(c.id)}" data-act="cb" data-id="${esc(c.id)}" tabindex="0" role="button">
        ${avatar(c.name, '')}
        <div class="task__main"><div class="task__name">${esc(c.name)} ${pill(c.status, CB_STATUS)}</div>
          <div class="task__meta">${c.topic ? `<span>${esc(c.topic)}</span>` : ''}<span>${esc(ago(c.createdAt))}</span></div>
          ${c.staffNote ? `<p class="task__note">${esc(c.staffNote)}</p>` : ''}</div>
        ${c.status !== 'done' ? waitRing(c.createdAt) : '<span></span>'}
        <div class="task__acts">${telLink(c.mobile, c.name)}<span class="sp"></span>
          ${w && c.status === 'new' ? `<button class="btn btn--sec btn--s" type="button" data-act="cbq" data-v="called" data-id="${esc(c.id)}">${ic('i-check', 'ic--s')}تماس گرفتم</button>` : ''}
          ${w && c.status !== 'done' ? `<button class="btn btn--ok btn--s" type="button" data-act="cbq" data-v="done" data-id="${esc(c.id)}">${ic('i-check-circle', 'ic--s')}انجام شد</button>` : ''}
          ${w && c.status !== 'done' ? `<button class="btn btn--ghost btn--s" type="button" data-act="cbnew" data-id="${esc(c.id)}">${ic('i-cal-plus', 'ic--s')}ثبت نوبت</button>` : ''}</div>
      </article>`).join('');
    return `<header class="ph"><div><h1>درخواست‌های تماس</h1><p>از فرم «با من تماس بگیرید» سایت؛ تماس بگیرید و نتیجه را ثبت کنید.</p></div></header>
      <div class="toolbar"><div class="seg" data-k="cbf" role="group" aria-label="وضعیت">${seg}</div></div>
      <div class="tasks">${rows || `<div data-key="c:empty">${empty('i-phone', S.cbF === 'open' ? 'درخواست تماس بازی نیست' : 'موردی نیست', '', S.cbF === 'open')}</div>`}</div>`;
  }
  function openCallback(id) {
    const c = S.callbacks.find((x) => x.id === id);
    if (!c) return;
    const w = can('write');
    openModal(`<div class="modal__h"><h2 id="mdTitle">${esc(c.name)}</h2>${pill(c.status, CB_STATUS)}<button class="iconbtn" type="button" data-act="mclose" aria-label="بستن">${ic('i-x')}</button></div>
      <div class="modal__b form">
        <a class="bigtel" href="tel:${esc(c.mobile)}"><span>${ic('i-phone-call')}</span><div><small>تماس با ${esc(c.name)}</small><b class="ltr num">${esc(telFa(c.mobile))}</b></div></a>
        <dl class="facts"><div><dt>موضوع</dt><dd>${esc(c.topic || '—')}</dd></div><div><dt>زمان</dt><dd>${esc(ago(c.createdAt))}</dd></div></dl>
        <label class="field"><span>یادداشت</span><textarea class="textarea" name="note" maxlength="300" placeholder="نتیجه‌ی تماس" ${w ? '' : 'disabled'}>${esc(c.staffNote || '')}</textarea></label>
        <p class="err" id="mdErr" role="alert"></p>
        ${w ? `<div class="modal__f">
          ${c.status === 'new' ? `<button class="btn btn--sec" type="button" data-act="cbs" data-v="called">تماس گرفتم</button>` : ''}
          ${c.status !== 'done' ? `<button class="btn btn--ok" type="button" data-act="cbs" data-v="done">انجام شد</button>` : `<button class="btn btn--sec" type="button" data-act="cbs" data-v="called">بازگشت به باز</button>`}
          <button class="btn btn--pri" type="button" data-act="cbs" data-v=""><span class="spin"></span><span class="btn__t">ذخیره‌ی یادداشت</span></button>
        </div>` : ''}
      </div>`, { id });
  }
  async function saveCallback(id, status, btn, note) {
    const c = S.callbacks.find((x) => x.id === id);
    if (!c) return false;
    const prev = c.status;
    const body = { v: c.v || 0 };
    if (note !== undefined) body.staffNote = note;
    if (status) body.status = status;
    busy(btn, true);
    const r = await call('patch', '/callbacks/' + encodeURIComponent(id), body);
    busy(btn, false);
    if (r.status === 409 && r.callback) { Object.assign(c, r.callback); toast(errText(r), true); closeModal(); refreshView(); return false; }
    if (!r.ok) { if ($('#mdErr')) $('#mdErr').textContent = errText(r); else toast(errText(r), true); return false; }
    Object.assign(c, r.callback);
    updateBadges();
    const undo = status && status !== prev ? { t: 'برگرداندن', fn: () => saveCallback(id, prev, null).then(refreshView) } : null;
    toast(status === 'done' ? 'درخواست تماس انجام شد' : status === 'called' ? 'ثبت شد: تماس گرفته شد' : 'ذخیره شد', false, undo);
    return true;
  }

  /* ==========================================================================
     نما: پیامک
     ========================================================================== */
  let smsData = null;
  function vSms() {
    if (!smsData) { loadSms(); return '<header class="ph"><div><h1>پیامک</h1></div></header><div class="tiles">' + '<div class="skel skel--tile"></div>'.repeat(3) + '</div><div class="list">' + '<div class="skel"></div>'.repeat(3) + '</div>'; }
    const d = smsData, T = d.templates;
    const tpl = [
      ['otp', 'کد تأیید (سایت و ورود پنل)'], ['received', 'پیامک «درخواست ثبت شد» به بیمار'], ['reception', 'خبر درخواست تازه به موبایل پذیرش'],
      ['appt', 'تأیید نوبت از پنل'], ['remind', `یادآوری یک روز قبل (از ساعت ${tLabel(d.remindHour * 60)})`]
    ].map(([k, t]) => `<li>${ic(T[k] ? 'i-check-circle' : 'i-ban', T[k] ? 'is-ok' : 'is-no')}<span>${esc(t)}</span>${T[k] ? '' : '<span class="muted">· خاموش</span>'}</li>`).join('');
    const okN = d.log.filter((e) => e.ok).length, dlvN = d.log.filter((e) => e.dlv === 1).length;
    const rows = d.log.slice(0, 200).map((e) => `<tr><td data-l="زمان" class="num">${esc(stamp(e.at))}</td><td data-l="بیمار"><a href="#" data-act="open" data-ref="${esc(e.ref)}">${esc(e.name)}</a> <small class="muted num">${esc(fa(e.ref))}</small></td>
      <td data-l="نوع">${esc(SMS_KIND[e.kind] || e.kind)}</td><td data-l="نتیجه">${e.ok ? '<span class="pill pill--done">فرستاده شد</span>' : `<span class="pill pill--no-show">ناموفق</span> <small class="muted">${esc(e.err || '')}</small>`}</td>
      <td data-l="رسیدن">${e.ok ? (e.dlv ? `<span class="pill pill--${DLV_CLS[e.dlv] || 'called'}">${esc(DLV[e.dlv] || '')}</span>` : '<span class="muted">هنوز گزارشی نیامده</span>') : '—'}</td></tr>`).join('');
    return `<header class="ph"><div><h1>پیامک</h1><p>اعتبار پنل، قالب‌ها و پیامک‌هایی که برای بیماران فرستاده شده.</p></div><span class="sp"></span><button class="btn btn--sec btn--s" type="button" data-act="smsref"><span class="spin"></span>${ic('i-refresh', 'ic--s')}<span class="btn__t">به‌روزرسانی وضعیت رسیدن</span></button></header>
      <div class="tiles">
        <div class="kpi k-ok"><span class="kpi__ic">${ic('i-wallet')}</span><b class="num">${d.credit != null ? esc(fmtNum(d.credit)) : '—'}</b><span>اعتبار پنل پیامک</span><small>${d.credit != null ? 'از sms.ir' : esc(d.creditError || 'در دسترس نیست')}</small></div>
        <div class="kpi ${d.mode === 'live' ? 'k-blue' : 'k-warn'}"><span class="kpi__ic">${ic('i-send')}</span><b>${d.mode === 'live' ? 'اصلی' : 'آزمایشی'}</b><span>حالت ارسال</span><small>${d.mode === 'live' ? 'پیامک‌ها واقعاً فرستاده می‌شوند' : 'Sandbox: پیامک واقعی فرستاده نمی‌شود'}</small></div>
        <div class="kpi k-violet"><span class="kpi__ic">${ic('i-msg')}</span><b class="num" data-count="${okN}" data-key="k:sms">${fa(okN)}</b><span>پیامک فرستاده‌شده</span><small>${fa(dlvN)} مورد رسیدنش تأیید شده</small></div>
      </div>
      <div class="grid2">
        <section class="card"><div class="card__h">${ic('i-msg')}<h2>پیامک‌های فرستاده‌شده</h2></div>
          ${rows ? `<div class="scrollx"><table class="table stack"><thead><tr><th>زمان</th><th>بیمار</th><th>نوع</th><th>نتیجه</th><th>رسیدن</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="card__b">${empty('i-msg', 'هنوز پیامکی به بیماران فرستاده نشده')}</div>`}
        </section>
        <section class="card"><div class="card__h">${ic('i-shield')}<h2>قالب‌های پیامک</h2></div><div class="card__b stack"><ul class="checks">${tpl}</ul>
          <p class="hint">قالب‌های خاموش را روی سرور با <code>npm run setup</code> بسازید؛ بعد از تأیید کارشناسان sms.ir شناسه‌شان در <code>server/.env</code> قرار می‌گیرد و همین‌جا روشن می‌شوند. کد تأیید هیچ‌وقت در فهرست پیامک‌ها نمی‌آید.</p>
          <p class="hint">یادآوری خودکار: ${T.remind ? `هر روز از ساعت ${tLabel(d.remindHour * 60)} برای نوبت‌های فردا` : 'خاموش (قالب یادآوری تنظیم نشده)'}</p></div></section>
      </div>`;
  }
  async function loadSms() {
    const r = await call('get', '/sms');
    if (!r.ok) { toast(errText(r), true); return; }
    smsData = r;
    if (S.route === 'sms') render('none');
  }

  /* ==========================================================================
     نما: کارکنان
     ========================================================================== */
  let usersData = null;
  function vUsers() {
    if (!usersData) { loadUsers(); return '<header class="ph"><div><h1>کارکنان</h1></div></header><div class="users">' + '<div class="skel skel--tile"></div>'.repeat(4) + '</div>'; }
    const cards = usersData.map((u) => `<article class="ucard${u.active ? '' : ' is-off'}" data-key="u:${esc(u.id)}">
      <div class="ucard__h">${avatar(u.name, u.role === 'doctor' && S.cfg.doctors[u.doctor] ? S.cfg.doctors[u.doctor].k : '', 'av--s')}<div><b>${esc(u.name)}</b><small class="ltr">${esc(u.username)}</small></div><span class="role role--${esc(u.role)}">${esc(S.cfg.roles[u.role])}</span></div>
      <dl>${u.doctor ? `<div><dt>پزشک</dt><dd>${esc(docName(u.doctor))}</dd></div>` : ''}<div><dt>موبایل (کد ورود)</dt><dd class="ltr num">${esc(telFa(u.mobile))}</dd></div>
        <div><dt>آخرین ورود</dt><dd>${u.lastLoginAt ? esc(ago(u.lastLoginAt)) : '<span class="muted">هنوز وارد نشده</span>'}</dd></div>
        <div><dt>وضعیت</dt><dd>${u.active ? '<span class="pill pill--done">فعال</span>' : '<span class="pill pill--cancelled">غیرفعال</span>'}${u.mustChange ? ' <span class="pill pill--called pill--plain">رمز موقت</span>' : ''}</dd></div></dl>
      <button class="btn btn--sec btn--s" type="button" data-act="uedit" data-id="${esc(u.id)}">${ic('i-pencil', 'ic--s')}ویرایش</button>
    </article>`).join('');
    return `<header class="ph"><div><h1>کارکنان</h1><p>هر کس با حساب خودش وارد می‌شود و هر کارش در «گزارش کارها» با نامش ثبت می‌شود. حساب مشترک نسازید.</p></div><span class="sp"></span>
        <button class="btn btn--pri" type="button" data-act="unew">${ic('i-user-plus')}<span class="btn__t">کاربر تازه</span></button></header>
      <div class="users">${cards}</div>`;
  }
  async function loadUsers() {
    const r = await call('get', '/users');
    if (!r.ok) { toast(errText(r), true); return; }
    usersData = r.users;
    if (S.route === 'users') render('none');
  }
  const randPass = () => {
    const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const v = new Uint32Array(12); crypto.getRandomValues(v);
    return Array.from(v, (x) => a[x % a.length]).join('');
  };
  function openUser(id) {
    const u = id ? usersData.find((x) => x.id === id) : null;
    const roles = Object.entries(S.cfg.roles).map(([k, t]) => `<label class="opt"><input type="radio" name="role" value="${k}" ${(u ? u.role : 'reception') === k ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('');
    const docs = Object.entries(S.cfg.doctors).map(([k, v]) => `<option value="${k}"${u && u.doctor === k ? ' selected' : ''}>${esc(v.name)} · ${esc(deptT(v.k))}</option>`).join('');
    const self = u && u.id === S.user.id;
    openModal(`<div class="modal__h"><h2 id="mdTitle">${u ? 'ویرایش ' + esc(u.name) : 'کاربر تازه'}</h2><button class="iconbtn" type="button" data-act="mclose" aria-label="بستن">${ic('i-x')}</button></div>
      <form class="modal__b form" id="userForm" novalidate>
        <div class="row2"><label class="field"><span>نام و نام خانوادگی</span><input class="input" name="name" value="${esc(u ? u.name : '')}" required></label>
          <label class="field"><span>نام کاربری</span><input class="input input--ltr" name="username" value="${esc(u ? u.username : '')}" autocapitalize="none" spellcheck="false" ${u ? 'disabled' : 'required'}></label></div>
        <div class="field"><span class="flabel">نقش</span><div class="opts">${roles}</div><small>پذیرش: درخواست‌ها، تقویم و پیامک · پزشک: فقط نوبت‌های خودش، بدون شماره‌ی بیمار · مدیر: همه‌چیز</small></div>
        <label class="field" id="docField"><span>کدام پزشک؟</span><select class="select" name="doctor"><option value="">انتخاب کنید</option>${docs}</select></label>
        <label class="field"><span>موبایل</span><input class="input input--ltr" name="mobile" inputmode="tel" value="${esc(u ? u.mobile : '')}" placeholder="09xxxxxxxxx"><small>کد ورود پنل به این شماره پیامک می‌شود.</small></label>
        ${self ? '<p class="hint">رمز خودتان را از منوی حساب ← «تغییر رمز» عوض کنید.</p>' : `<label class="field"><span>${u ? 'رمز موقت تازه (اختیاری)' : 'رمز موقت'}</span><span class="pass"><input class="input input--ltr" name="password" autocomplete="new-password" ${u ? '' : 'required'}><button class="iconbtn" type="button" data-act="genpass" aria-label="ساخت رمز تصادفی" title="ساخت رمز تصادفی">${ic('i-key')}</button></span><small>کاربر در اولین ورود باید رمز خودش را بگذارد. رمز موقت را حضوری یا تلفنی بدهید، نه با پیامک عمومی.</small></label>`}
        ${u && !self ? `<label class="check"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}><span>حساب فعال است<small>با غیرفعال کردن، کاربر فوراً از پنل بیرون می‌رود.</small></span></label>` : ''}
        <p class="err" id="mdErr" role="alert"></p>
        <div class="modal__f"><button class="btn btn--ghost" type="button" data-act="mclose">انصراف</button><button class="btn btn--pri" type="submit"><span class="spin"></span><span class="btn__t">${u ? 'ذخیره' : 'ساخت حساب'}</span></button></div>
      </form>`, { id });
    const form = $('#userForm');
    const syncDoc = () => { $('#docField').hidden = form.role.value !== 'doctor'; };
    syncDoc();
    form.addEventListener('change', syncDoc);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { name: form.name.value, role: form.role.value, mobile: normMobile(form.mobile.value), doctor: form.doctor.value };
      if (!u) body.username = form.username.value.trim().toLowerCase();
      if (form.password && form.password.value) body.password = form.password.value;
      if (form.active) body.active = form.active.checked;
      if (!u && !body.password) { $('#mdErr').textContent = 'یک رمز موقت بنویسید یا بسازید.'; return; }
      const btn = $('button[type="submit"]', form);
      busy(btn, true);
      const r = u ? await call('patch', '/users/' + encodeURIComponent(u.id), body) : await call('post', '/users', body);
      busy(btn, false);
      if (!r.ok) { $('#mdErr').textContent = errText(r); return; }
      const all = await call('get', '/users');
      if (all.ok) usersData = all.users;
      closeModal();
      morph();
      toast(u ? 'تغییرات ذخیره شد' : `حساب ${body.username} ساخته شد`);
    });
  }

  /* ==========================================================================
     نما: گزارش کارها (گروه‌بندی بر اساس روز)
     ========================================================================== */
  let auditData = null, auditQ = '';
  /* جزئیات گزارش ممکن است کد وضعیت داشته باشد (called، arrived…)؛ فارسی نمایش داده می‌شود */
  const auditDetail = (s) => String(s).replace(/\b(new|called|scheduled|arrived|done|cancelled|no-show)\b/g, (k) => STATUS[k] || k);
  function auditList() {
    const q = auditQ.trim();
    const rows = auditData.filter((e) => !q || [(e.by && e.by.name) || '', (AUDIT[e.action] || [e.action])[0], e.target, e.detail].join(' ').includes(q)).slice(0, 400);
    if (!rows.length) return empty('i-history', q ? 'چیزی پیدا نشد' : 'چیزی ثبت نشده');
    const days = new Map();
    rows.forEach((e) => { const k = F.dayOf.format(new Date(e.at)); if (!days.has(k)) days.set(k, []); days.get(k).push(e); });
    return [...days].map(([k, list]) => `<section class="alog__day"><b>${esc(relDay(k) === dLong(k) ? dFull(k) : relDay(k) + ' · ' + dLong(k))}</b><ul>${list.map((e) => {
      const [t, icn] = AUDIT[e.action] || [e.action, 'i-info'];
      return `<li><span class="alog__ic${e.action === 'login.fail' ? ' is-bad' : ''}">${ic(icn)}</span><div><b>${esc(e.by ? e.by.name : 'ناشناس')}</b> · ${esc(t)}${e.target ? ` <span class="muted num">${esc(fa(e.target))}</span>` : ''}${e.detail ? `<small>${esc(auditDetail(e.detail))}</small>` : ''}</div><time class="num">${esc(F.hmOf.format(new Date(e.at)))}</time></li>`;
    }).join('')}</ul></section>`).join('');
  }
  function vAudit() {
    if (!auditData) { loadAudit(); return '<header class="ph"><div><h1>گزارش کارها</h1></div></header><div class="list">' + '<div class="skel"></div>'.repeat(5) + '</div>'; }
    return `<header class="ph"><div><h1>گزارش کارها</h1><p>چه کسی، کی، چه کاری کرد. رمزها، کدهای تأیید و متن پیامک‌ها هیچ‌وقت این‌جا نوشته نمی‌شوند.</p></div></header>
      <div class="toolbar"><label class="field"><span class="sr">جست‌وجو در گزارش</span><input class="input" id="aq" type="search" placeholder="جست‌وجو: نام کارمند، کار یا کد پیگیری" value="${esc(auditQ)}"></label><span class="sp"></span>
        <button class="btn btn--sec btn--s" type="button" data-act="aref"><span class="spin"></span>${ic('i-refresh', 'ic--s')}<span class="btn__t">تازه کردن</span></button></div>
      <div class="alog" id="alog">${auditList()}</div>`;
  }
  async function loadAudit() {
    const r = await call('get', '/audit');
    if (!r.ok) { toast(errText(r), true); return; }
    auditData = r.audit;
    if (S.route === 'audit') render('none');
  }
  document.addEventListener('input', (e) => { if (e.target.id === 'aq') { auditQ = e.target.value; const l = $('#alog'); if (l) l.innerHTML = auditList(); } });

  /* ==========================================================================
     پنجره (modal)
     ========================================================================== */
  let modalCtx = null, lastFocusModal = null;
  function openModal(html, ctx = {}) {
    const m = $('#modal');
    modalCtx = ctx;
    m.innerHTML = `<div class="modal__box${ctx.small ? ' modal__box--s' : ''}">${html}</div>`;
    if (m.hidden) { lastFocusModal = document.activeElement; m.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('is-on'))); }
    setTimeout(() => { const f = ctx.focus ? $(ctx.focus, m) : $('input:not([disabled]):not([type="checkbox"]):not([type="radio"]), textarea:not([disabled]), select', m) || $('button', m); if (f) f.focus(); }, 80);
  }
  function closeModal(instant) {
    const m = $('#modal');
    if (m.hidden || (modalCtx && modalCtx.locked && !instant)) return;
    m.classList.remove('is-on');
    const done = () => { m.hidden = true; m.innerHTML = ''; modalCtx = null; NB = null; if (S.dirty) refreshView(); };
    if (instant || reduce.matches) done(); else setTimeout(done, 260);
    if (lastFocusModal && document.contains(lastFocusModal)) lastFocusModal.focus({ preventScroll: true });
  }
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
  function confirmBox(text, okText = 'بله') {
    return new Promise((resolve) => {
      openModal(`<div class="confirm"><span class="confirm__ic">${ic('i-alert')}</span><h2 id="mdTitle">${esc(text)}</h2><div class="modal__f"><button class="btn btn--ghost" type="button" data-act="cno">نه، بماند</button><button class="btn btn--badfill" type="button" data-act="cyes">${esc(okText)}</button></div></div>`, { confirm: resolve, small: true, focus: '[data-act="cno"]' });
    });
  }

  /* ---------- رمز ---------- */
  function passwordModal(forced) {
    openModal(`<div class="modal__h"><h2 id="mdTitle">${forced ? 'رمز خودتان را بگذارید' : 'تغییر رمز'}</h2>${forced ? '' : `<button class="iconbtn" type="button" data-act="mclose" aria-label="بستن">${ic('i-x')}</button>`}</div>
      <form class="modal__b form" id="passForm" novalidate>
        ${forced ? '<p class="hint">رمزی که مدیر داده موقت است. پیش از کار با پنل، رمز تازه‌ای بگذارید که فقط خودتان بدانید.</p>' : ''}
        <label class="field"><span>${forced ? 'رمز موقت' : 'رمز فعلی'}</span><input class="input input--ltr" type="password" name="current" autocomplete="current-password" required></label>
        <label class="field"><span>رمز تازه</span><input class="input input--ltr" type="password" name="next" autocomplete="new-password" required><small>دست‌کم ۸ نویسه؛ ترکیب حرف و عدد، و نه نام کاربری.</small></label>
        <label class="field"><span>تکرار رمز تازه</span><input class="input input--ltr" type="password" name="again" autocomplete="new-password" required></label>
        <p class="err" id="mdErr" role="alert"></p>
        <div class="modal__f">${forced ? `<button class="btn btn--ghost" type="button" data-act="logout">خروج</button>` : '<button class="btn btn--ghost" type="button" data-act="mclose">انصراف</button>'}<button class="btn btn--pri" type="submit"><span class="spin"></span><span class="btn__t">ذخیره‌ی رمز</span></button></div>
      </form>`, { locked: forced });
    const form = $('#passForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cur = form.current.value, next = form.next.value;
      if (next.length < 8) { $('#mdErr').textContent = 'رمز تازه دست‌کم ۸ نویسه باشد.'; return; }
      if (next !== form.again.value) { $('#mdErr').textContent = 'تکرار رمز با رمز تازه یکی نیست.'; return; }
      const btn = $('button[type="submit"]', form);
      busy(btn, true);
      const r = await api.post('/password', { current: cur, next });
      busy(btn, false);
      if (!r.ok) { $('#mdErr').textContent = r.error === 'current' ? (forced ? 'رمز موقت درست نیست.' : 'رمز فعلی درست نیست.') : r.error === 'weak' ? r.message : errText(r); return; }
      S.user = r.user;
      closeModal(true);
      toast('رمز تازه ذخیره شد');
      if (forced) { renderShell(); await loadAll(); S.route = ''; route(); startPolling(); }
    });
  }
  function forcePassword() {
    if (!$('#passForm')) { $('#content').innerHTML = ''; passwordModal(true); }
  }

  /* ==========================================================================
     نوبت تازه: سه قدم (بیمار ← بخش ← زمان)
     ========================================================================== */
  let NB = null;
  const WHEN = [['set', 'روز و ساعت نوبت را همین حالا انتخاب می‌کنم', 'i-cal-check', 'نوبت ثبت می‌شود'], ['now', 'همین حالا در کلینیک است (بدون نوبت قبلی)', 'i-user-check', 'پذیرش فوری'], ['later', 'بعداً هماهنگ می‌کنم', 'i-clock', 'در صف پیگیری می‌ماند']];
  function openNew(preset = {}) {
    if (!can('write')) return;
    NB = { step: 1, name: preset.name || '', mobile: preset.mobile || '', note: preset.note || '', dept: preset.dept || '', type: '', when: 'set', date: preset.date || '', from: preset.from || null, dir: 'in' };
    S.pick = null;
    openModal(`<div class="modal__h"><h2 id="mdTitle">نوبت تازه</h2><button class="iconbtn" type="button" data-act="mclose" aria-label="بستن">${ic('i-x')}</button></div>
      <form class="modal__b" id="newForm" novalidate><div class="wiz"><ol class="wiz__bar">${['بیمار', 'بخش و نوع', 'زمان'].map((t, i) => `<li data-s="${i + 1}"><i></i>${fa(i + 1)}. ${t}</li>`).join('')}</ol><div id="wizStep"></div></div></form>`, { focus: 'input[name="name"]' });
    drawStep();
  }
  function prevVisits(m) {
    const v = normMobile(m);
    if (!/^09\d{9}$/.test(v)) return '';
    const list = S.bookings.filter((b) => b.mobile === v).sort(sortBy.createdDesc);
    if (!list.length) return '';
    const last = list[0];
    return `<p class="prev">${ic('i-history', 'ic--s')}این شماره ${fa(list.length)} پرونده دارد. آخرین: ${esc(last.name)} · ${esc(deptT(last.dept))} · ${esc(STATUS[last.status])}</p>`;
  }
  function drawStep() {
    const host = $('#wizStep');
    if (!host || !NB) return;
    $$('.wiz__bar li').forEach((li) => li.classList.toggle('is-on', Number(li.dataset.s) <= NB.step));
    let html = '';
    if (NB.step === 1) {
      html = `<div class="row2"><label class="field"><span>نام بیمار</span><input class="input" name="name" maxlength="60" value="${esc(NB.name)}" autocomplete="off" required></label>
          <label class="field"><span>موبایل</span><input class="input input--ltr" name="mobile" inputmode="tel" placeholder="09xxxxxxxxx" value="${esc(NB.mobile)}" autocomplete="off" required></label></div>
        <div id="nbPrev">${prevVisits(NB.mobile)}</div>
        <label class="field"><span>توضیح (اختیاری)</span><textarea class="textarea" name="note" maxlength="300" placeholder="مثلاً: درد دندان از دیروز">${esc(NB.note)}</textarea></label>
        <p class="hint">شماره‌ی نوبت تلفنی پیامکی تأیید نمی‌شود؛ درست بنویسید.</p>`;
    } else if (NB.step === 2) {
      html = `<div class="field"><span class="flabel">بخش</span><div class="depts">${Object.entries(S.cfg.depts).map(([k, v]) => `<label class="dcard ${k}"><input type="radio" name="dept" value="${k}" ${NB.dept === k ? 'checked' : ''}><span><i>${ic(DEPT_IC[k])}</i>${esc(v.t)}</span></label>`).join('')}</div></div>
        <div class="field"><span class="flabel">نوع مراجعه</span><div class="opts">${S.cfg.types.map((t) => `<label class="opt"><input type="radio" name="type" value="${esc(t)}" ${NB.type === t ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div></div>`;
    } else {
      if (NB.when === 'set' && (!S.pick || S.pick.dept !== NB.dept)) S.pick = { ref: '', dept: NB.dept, date: NB.date && NB.date >= today() ? NB.date : '', time: null, doctor: '', sms: S.cfg.sms.appt };
      html = `<div class="when">${WHEN.map(([k, t, icn, s]) => `<label class="opt"><input type="radio" name="when" value="${k}" ${NB.when === k ? 'checked' : ''}><span>${ic(icn)}${esc(t)}<small>${esc(s)}</small></span></label>`).join('')}</div>
        ${NB.when === 'set' ? pickHtml(S.pick, { ref: '', dept: NB.dept }) : NB.when === 'now' ? `<p class="hint">نوبت با ساعت همین حالا (${tLabel(nowMin())}) ثبت می‌شود و بیمار «در کلینیک» نشان داده می‌شود.</p>` : '<p class="hint">درخواست با وضعیت «تماس گرفته شد» در صف پیگیری می‌ماند تا بعداً روز و ساعت را ثبت کنید.</p>'}`;
    }
    const last = NB.step === 3;
    host.innerHTML = `<div class="wiz__step is-${NB.dir}">${html}<p class="err" id="mdErr" role="alert"></p>
      <div class="wiz__f">${NB.step > 1 ? `<button class="btn btn--ghost" type="button" data-act="nbback">${ic('i-chev-r')}قبلی</button>` : ''}<span class="sp"></span>
        <button class="btn btn--pri" type="submit"><span class="spin"></span><span class="btn__t">${last ? 'ثبت' : 'بعدی'}</span>${last ? ic('i-check') : ic('i-chev-l', 'ic--go')}</button></div></div>`;
    const strip = $('.strip', host);
    if (strip) centerStrip(strip, true);
    if (NB.step !== 3) setTimeout(() => { const f = $('input:not([type="radio"])', host) || $('input', host); if (f && !host.contains(document.activeElement)) f.focus({ preventScroll: true }); }, 60);
  }
  function readStep() {
    const form = $('#newForm');
    if (!form || !NB) return;
    if (NB.step === 1) { NB.name = form.name.value.trim(); NB.mobile = form.mobile.value; NB.note = form.note.value.trim(); }
    if (NB.step === 2) { const d = form.querySelector('input[name="dept"]:checked'), t = form.querySelector('input[name="type"]:checked'); if (d) NB.dept = d.value; if (t) NB.type = t.value; }
  }
  async function submitNew(btn) {
    readStep();
    const err = (t) => { const e = $('#mdErr'); if (e) e.textContent = t; };
    if (NB.step === 1) {
      if (NB.name.length < 2) return err('نام بیمار را بنویسید.');
      if (!/^09\d{9}$/.test(normMobile(NB.mobile))) return err('موبایل باید ۱۱ رقم و با ۰۹ شروع شود.');
      NB.step = 2; NB.dir = 'in'; drawStep(); return;
    }
    if (NB.step === 2) {
      if (!NB.dept) return err('بخش را انتخاب کنید.');
      if (!NB.type) return err('نوع مراجعه را انتخاب کنید.');
      NB.step = 3; NB.dir = 'in'; drawStep(); return;
    }
    const body = { name: NB.name, mobile: normMobile(NB.mobile), dept: NB.dept, type: NB.type, note: NB.note };
    if (NB.when === 'set') {
      if (!S.pick || !S.pick.date || S.pick.time == null) return err('روز و ساعت نوبت را انتخاب کنید (یا «بعداً هماهنگ می‌کنم» را بزنید).');
      Object.assign(body, { date: S.pick.date, time: S.pick.time, doctor: S.pick.doctor, sms: !!S.pick.sms });
    } else if (NB.when === 'now') Object.assign(body, { date: today(), time: Math.floor(nowMin() / 5) * 5, doctor: '' });
    busy(btn, true);
    const r = await call('post', '/bookings', body);
    if (!r.ok) { busy(btn, false); return err(errText(r)); }
    let bk = r.booking;
    putBooking(bk);
    if (NB.when !== 'set') {
      const r2 = await call('patch', '/bookings/' + encodeURIComponent(bk.ref), { v: bk.v || 0, status: NB.when === 'now' ? 'arrived' : 'called' });
      if (r2.ok) { bk = r2.booking; putBooking(bk); }
    }
    busy(btn, false);
    const from = NB.from;
    S.pick = null;
    closeModal(true);
    refreshView();
    toast(bk.status === 'scheduled' ? `نوبت ${bk.name} ثبت شد` : bk.status === 'arrived' ? `${bk.name} پذیرش شد` : `درخواست ${bk.name} ثبت شد`);
    if (r.sms) toast(r.sms.ok ? 'پیامک تأیید نوبت فرستاده شد' : errText(r.sms), !r.sms.ok);
    if (from) { const c = S.callbacks.find((x) => x.id === from); if (c && c.status !== 'done') { await saveCallback(from, 'done', null); refreshView(); } }
    openDrawer(bk.ref);
  }
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'newForm') return;
    e.preventDefault();
    submitNew($('#newForm button[type="submit"]'));
  });
  document.addEventListener('input', (e) => {
    if (NB && e.target.name === 'mobile' && e.target.closest('#newForm')) { const p = $('#nbPrev'); if (p) p.innerHTML = prevVisits(e.target.value); }
  });
  $('#newBtn').addEventListener('click', () => openNew());
  $('#fab').addEventListener('click', () => openNew());

  /* ---------- منو ---------- */
  function openMenu(anchor, html) {
    closeMenu();
    const m = document.createElement('div');
    m.className = 'menu';
    m.id = 'menu';
    m.setAttribute('role', 'menu');
    m.innerHTML = html;
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - mw / 2), innerWidth - mw - 8);
    const top = r.bottom + 8 + mh < innerHeight ? r.bottom + 8 : Math.max(8, r.top - mh - 8);
    m.style.setProperty('left', left + 'px');
    m.style.setProperty('top', top + 'px');
    const f = $('a, button', m);
    if (f) f.focus();
  }
  function closeMenu() { const m = $('#menu'); if (m) m.remove(); }
  const menuItem = (x) => x.href ? `<a role="menuitem" href="${x.href}">${ic(x.ic)}${esc(x.t)}</a>` : `<button role="menuitem" type="button" data-act="${x.act}" class="${x.cls || ''}">${ic(x.ic)}${esc(x.t)}</button>`;
  const acctHtml = () => `<div class="menu__who"><b>${esc(S.user.name)}</b><small>${esc(S.cfg.roles[S.user.role])} · <span class="ltr">${esc(S.user.username || '')}</span></small></div><hr>` +
    [{ act: 'pass', ic: 'i-key', t: 'تغییر رمز' }, { act: 'logout', ic: 'i-logout', t: 'خروج از پنل', cls: 'is-bad' }].map(menuItem).join('');

  /* ==========================================================================
     رویدادها
     ========================================================================== */
  document.addEventListener('click', async (e) => {
    const stop = e.target.closest('[data-stop]');
    if (!e.target.closest('#menu') && !e.target.closest('[data-act="me"], [data-act="more"]')) closeMenu();
    if (stop) return;
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act, v = el.dataset.v;
    const ref = S.sel;
    switch (a) {
      case 'open': e.preventDefault(); closeMenu(); openDrawer(el.dataset.ref); break;
      case 'book': openDrawer(el.dataset.ref, { pick: true }); break;
      case 'close': closeDrawer(); break;
      case 'reload': S.stale = false; S.pick = null; drawDrawer('none'); break;
      case 'fst': S.f.st = v; morph(); break;
      case 'fdept': S.f.dept = v; morph(); break;
      case 'clearq': $('#q').value = ''; onSearch('', 'q'); break;
      case 'cbf': S.cbF = v; morph(); break;
      case 'cb': openCallback(el.dataset.id); break;
      case 'cbs': {
        const note = $('#modal textarea[name="note"]');
        if (await saveCallback(modalCtx.id, v, el, note ? note.value : undefined)) { closeModal(); refreshView(); }
        break;
      }
      case 'cbq': { if (await saveCallback(el.dataset.id, v, el)) refreshView(); break; }
      case 'cbnew': { const c = S.callbacks.find((x) => x.id === el.dataset.id); if (c) openNew({ name: c.name, mobile: c.mobile, note: c.topic || '', from: c.id }); break; }
      case 'q': {
        const r = el.dataset.ref;
        if (v === 'noanswer') { const b = await patch(r, { noAnswer: true }, '', el); if (b) { toast(`ثبت شد: جواب نداد (بار ${fa(b.attempts)})`); refreshView(); if (S.sel === r) drawDrawer('none'); } }
        else await setStatus(r, v, el);
        break;
      }
      case 'st': {
        if (el.dataset.confirm && !(await confirmBox(el.dataset.confirm, 'بله، لغو شود'))) return;
        await setStatus(ref, v, el);
        break;
      }
      case 'noanswer': {
        const b = await patch(ref, { noAnswer: true }, '', el);
        if (b) { toast(`ثبت شد: جواب نداد (بار ${fa(b.attempts)})`); drawDrawer('none'); refreshView(); }
        break;
      }
      case 'sched': {
        const b = byRef(ref);
        S.pick = newPick(b);
        drawDrawer('none');
        const p = $('#pick');
        if (p) p.scrollIntoView({ behavior: motion() ? 'smooth' : 'auto', block: 'start' });
        break;
      }
      case 'pday': S.pick.date = v; S.pick.time = null; redrawPick(true); break;
      case 'ptime': S.pick.time = Number(v); redrawPick(false); { const s = $('#pick .pick__sum'); if (s && mobile.matches) s.scrollIntoView({ block: 'nearest', behavior: motion() ? 'smooth' : 'auto' }); } break;
      case 'pdoc': S.pick.doctor = v; redrawPick(false); break;
      case 'pcancel': S.pick = null; drawDrawer('none'); break;
      case 'psave': {
        const st = S.pick, b = byRef(ref);
        const prev = b.status === 'scheduled' ? { date: b.date, time: b.time } : null;
        const nb = await patch(ref, { status: 'scheduled', date: st.date, time: st.time, doctor: st.doctor, sms: !!st.sms }, prev ? 'زمان نوبت عوض شد' : 'نوبت ثبت شد', el);
        if (nb) { S.pick = null; drawDrawer('none'); refreshView(); }
        break;
      }
      case 'resms': {
        busy(el, true);
        const r = await call('post', '/bookings/' + encodeURIComponent(ref) + '/sms');
        busy(el, false);
        if (r.booking) putBooking(r.booking);
        toast(r.ok ? 'پیامک تأیید نوبت دوباره فرستاده شد' : errText(r), !r.ok);
        drawDrawer('none');
        break;
      }
      case 'dlv': {
        busy(el, true);
        const r = await call('post', '/bookings/' + encodeURIComponent(ref) + '/sms/refresh');
        busy(el, false);
        if (r.ok) { putBooking(r.booking); drawDrawer('none'); toast('وضعیت رسیدن پیامک‌ها به‌روز شد'); } else toast(errText(r), true);
        break;
      }
      case 'copy':
        try { await navigator.clipboard.writeText(v); toast('شماره کپی شد'); } catch (err) { toast('کپی ممکن نشد؛ شماره را دستی بردارید', true); }
        break;
      case 'wk': {
        const n = Number(v);
        S.cal.dir = n > 0 ? 'next' : n < 0 ? 'prev' : '';
        S.cal.week = v === '0' ? satOf(today()) : addDays(S.cal.week, n); S.cal.day = '';
        render('none');
        break;
      }
      case 'cdept': S.cal.dept = v; if (S.cal.doc && v && S.cfg.doctors[S.cal.doc].k !== v) S.cal.doc = ''; morph(); break;
      case 'cday': S.cal.day = v; morph(); break;
      case 'newon': openNew({ date: v, dept: S.cal.dept || '' }); break;
      case 'print': window.print(); break;
      case 'search': focusSearch(); break;
      case 'smsref': {
        busy(el, true);
        const r = await call('post', '/sms/refresh');
        if (!r.ok) { busy(el, false); toast(errText(r), true); break; }
        await loadAll();
        const s = await call('get', '/sms');
        busy(el, false);
        if (s.ok) { smsData = s; render('none'); }
        toast('وضعیت رسیدن به‌روز شد');
        break;
      }
      case 'unew': openUser(null); break;
      case 'uedit': openUser(el.dataset.id); break;
      case 'genpass': { const p = $('#userForm input[name="password"]'); p.value = randPass(); p.select(); toast('رمز موقت ساخته شد؛ پیش از ذخیره یادداشتش کنید'); break; }
      case 'aref': { busy(el, true); const r = await call('get', '/audit'); busy(el, false); if (r.ok) { auditData = r.audit; const l = $('#alog'); if (l) l.innerHTML = auditList(); toast('گزارش تازه شد'); } break; }
      case 'mclose': closeModal(); break;
      case 'cyes': case 'cno': { const res = modalCtx && modalCtx.confirm; closeModal(true); if (res) res(a === 'cyes'); break; }
      case 'me': { if ($('#menu')) { closeMenu(); break; } openMenu($('#meBtn'), acctHtml()); break; }
      case 'more': {
        if ($('#menu')) { closeMenu(); break; }
        const items = moreRoutes().map((r) => ({ href: '#/' + r, ic: ROUTES[r].ic, t: ROUTES[r].t }));
        openMenu(el, items.map(menuItem).join('') + (mobile.matches ? '<hr>' + acctHtml() : ''));
        break;
      }
      case 'pass': closeMenu(); passwordModal(false); break;
      case 'logout': closeMenu(); closeModal(true); logout(); break;
      case 'nbback': readStep(); NB.step = Math.max(1, NB.step - 1); NB.dir = 'back'; drawStep(); break;
      default: break;
    }
  });
  document.addEventListener('change', (e) => {
    const a = e.target.dataset.act;
    if (a === 'psms' && S.pick) S.pick.sms = e.target.checked;
    else if (a === 'cdoc') { S.cal.doc = e.target.value; morph(); }
    else if (NB && e.target.name === 'when' && e.target.closest('#newForm')) { NB.when = e.target.value; NB.dir = ''; drawStep(); }
    else if (NB && (e.target.name === 'dept' || e.target.name === 'type') && e.target.closest('#newForm')) { readStep(); if (e.target.name === 'dept') S.pick = null; }
  });
  /* یادداشت پذیرش: با خروج از کادر یا Ctrl+Enter خودکار ذخیره می‌شود */
  async function saveNote(el, ref = S.sel) {
    const b = ref && byRef(ref);
    if (!b || el.value === (b.staffNote || '')) return;
    const nb = await patch(b.ref, { staffNote: el.value }, '', null);
    if (nb) {
      const s = $('#dwSaved');
      if (s) { s.classList.add('is-on'); setTimeout(() => s.classList.remove('is-on'), 1800); }
      if (S.sel === b.ref) $('#drawer').dataset.v = String(nb.v || 0);
      refreshView();
    }
  }
  document.addEventListener('focusout', (e) => { if (e.target.id === 'dwNote') saveNote(e.target); if (e.target.closest && e.target.closest('#content') && S.dirty) setTimeout(() => { if (S.dirty && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) refreshView(); }, 50); });
  function focusSearch() {
    if (!compact.matches) { $('#q').focus(); return; }
    if (S.route !== 'requests') location.hash = '#/requests';
    setTimeout(() => { const q = $('#q2'); if (q) q.focus(); }, 90);
  }
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'dwNote') { e.preventDefault(); saveNote(e.target); return; }
    if (e.key === 'Escape') {
      if ($('#menu')) { closeMenu(); return; }
      if (!$('#modal').hidden) { if (modalCtx && modalCtx.confirm) { const res = modalCtx.confirm; closeModal(true); res(false); } else closeModal(); return; }
      if (!$('#drawer').hidden) { closeDrawer(); return; }
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); return; }
    if (!S.user || typing || e.ctrlKey || e.metaKey || e.altKey || !$('#modal').hidden) return;
    if (e.key === '/' && !isDoctor()) { e.preventDefault(); focusSearch(); }
    else if (e.code === 'KeyN' && can('write') && $('#drawer').hidden) { e.preventDefault(); openNew(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const box = !$('#modal').hidden ? $('#modal') : !$('#drawer').hidden ? $('#drawer') : null;
    if (!box) return;
    const f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary', box).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  $('#scrim').addEventListener('click', () => closeDrawer());
  /* کشیدن کشو به پایین روی گوشی برای بستن (از سربرگ) */
  (() => {
    let y0 = null, dy = 0;
    const d = $('#drawer');
    d.addEventListener('touchstart', (e) => { if (!mobile.matches || !e.target.closest('.drawer__h')) return; y0 = e.touches[0].clientY; dy = 0; d.style.setProperty('transition', 'none'); }, { passive: true });
    d.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); d.style.setProperty('transform', `translate3d(0, ${dy}px, 0)`); }, { passive: true });
    d.addEventListener('touchend', () => { if (y0 == null) return; y0 = null; d.style.removeProperty('transition'); d.style.removeProperty('transform'); if (dy > 110) closeDrawer(); });
  })();

  /* ---------- نسخه‌ی نمایشی: انتخاب نقش ---------- */
  if (DEMO) {
    $('#lgDemo').hidden = false;
    $('#lgRole').innerHTML = [['admin', 'مدیر'], ['reception', 'پذیرش'], ['doctor', 'پزشک']].map(([k, t], i) => `<label class="opt"><input type="radio" name="demoRole" value="${k}" ${i === 0 ? 'checked' : ''}><span>ورود به‌عنوان ${t}</span></label>`).join('');
    $('#lgRole').addEventListener('change', (e) => api.setRole(e.target.value));
    $('#lgUser').value = 'demo';
  }

  /* ---------- شروع ---------- */
  (async () => {
    const r = await api.get('/me');
    const boot = $('#boot');
    boot.classList.add('is-out');
    setTimeout(() => boot.remove(), 450);
    if (r.ok) enter(r); else showLogin(r.error === 'network' ? errText(r) : '');
  })();
})();
