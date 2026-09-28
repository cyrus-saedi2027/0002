/* ==========================================================================
   پنل پذیرش کلینیک ساسان (بدون کتابخانه)
   - اگر صفحه از سرور کلینیک باز شده باشد (متای sasan-api) به API واقعی وصل است؛
     وگرنه نسخه‌ی نمایشی با داده‌ی ساختگی اجرا می‌شود (demo.js)
   - زمان‌ها به وقت تهران و تاریخ‌ها شمسی نمایش داده می‌شوند؛ ذخیره: میلادی YYYY-MM-DD و دقیقه از نیمه‌شب
   - هر متنی که بیمار یا کارمند نوشته هنگام نمایش escape می‌شود
   - CSP پنل استایل درون‌خطی را نمی‌پذیرد؛ متغیرهای CSS فقط با style.setProperty گذاشته می‌شوند
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
  const normMobile = (v) => en(v).replace(/[\s\-().]/g, '').replace(/^(\+98|0098)/, '0');
  const fmtNum = (n) => Number(n).toLocaleString('fa-IR');

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
    stamp: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: TZ, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  };
  const utc = (iso) => new Date(iso + 'T12:00:00Z');
  const today = () => F.day.format(new Date());
  const nowMin = () => { const [h, m] = F.hm.format(new Date()).split(':').map(Number); return h * 60 + m; };
  const addDays = (iso, n) => { const d = utc(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const wdOf = (iso) => utc(iso).getUTCDay();
  /* شنبه‌ی همان هفته */
  const satOf = (iso) => addDays(iso, -((wdOf(iso) + 1) % 7));
  const jDay = (iso) => { const p = F.jp.formatToParts(utc(iso)).find((x) => x.type === 'day'); return p ? Number(p.value) : 0; };
  const dLong = (iso) => F.long.format(utc(iso));
  /* ترتیب «دوشنبه ۶ مهر ۱۴۰۵» دستی ساخته می‌شود؛ ترتیب خود مرورگرها با هم فرق دارد */
  const dFull = (iso) => F.long.format(utc(iso)) + ' ' + F.y.format(utc(iso));
  const myLabel = (iso) => F.mo.format(utc(iso)) + ' ' + F.y.format(utc(iso));
  const dm = (iso) => F.dm.format(utc(iso));
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
  const WD_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

  /* ---------- برچسب‌ها ---------- */
  const STATUS = { new: 'تازه', called: 'تماس گرفته شد', scheduled: 'نوبت داده شد', done: 'انجام شد', cancelled: 'لغو شد', 'no-show': 'نیامد' };
  const CB_STATUS = { new: 'تازه', called: 'تماس گرفته شد', done: 'انجام شد' };
  const SMS_KIND = { received: 'ثبت درخواست', appt: 'تأیید نوبت', remind: 'یادآوری' };
  const DLV = { 1: 'رسید', 2: 'به گوشی نرسید', 3: 'رسیده به مخابرات', 4: 'به مخابرات نرسید', 5: 'رسیده به اپراتور', 6: 'ناموفق', 7: 'لیست سیاه', 8: 'نامشخص' };
  const DLV_CLS = { 1: 'scheduled', 2: 'no-show', 4: 'no-show', 6: 'no-show', 7: 'no-show' };
  const DEPT_IC = { dental: 'i-tooth', beauty: 'i-sparkles', medicine: 'i-steth' };
  const AUDIT = {
    login: 'ورود به پنل', 'login.fail': 'ورود ناموفق', logout: 'خروج', 'password.change': 'تغییر رمز',
    'booking.create': 'ثبت نوبت تلفنی', 'booking.update': 'تغییر درخواست', 'callback.update': 'درخواست تماس',
    'sms.appt': 'پیامک تأیید نوبت', 'user.create': 'ساخت کاربر', 'user.update': 'تغییر کاربر'
  };
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
    f: { st: 'open', dept: '', q: '' }, cal: { week: '', dept: '', doc: '', day: '' }, cbF: 'open',
    sel: null, sched: null, stale: false, known: null, poll: 0, dirty: false
  };
  const can = (p) => !!(S.cfg && S.cfg.can.includes(p));
  const isDoctor = () => S.user && S.user.role === 'doctor';
  const byRef = (ref) => S.bookings.find((b) => b.ref === ref);
  const docName = (id) => (S.cfg.doctors[id] ? S.cfg.doctors[id].name : '');
  const deptT = (k) => (S.cfg.depts[k] ? S.cfg.depts[k].t : k);

  async function call(method, p, body) {
    const r = await api[method](p, body);
    if (r.status === 401 && r.error === 'auth' && S.user) { sessionEnded(); }
    else if (r.status === 403 && r.error === 'must-change') forcePassword();
    return r;
  }
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

  /* ---------- پیام کوتاه ---------- */
  function toast(text, bad = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (bad ? ' toast--bad' : '');
    t.innerHTML = ic(bad ? 'i-alert' : 'i-check-circle') + '<span>' + esc(text) + '</span>';
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 320); }, bad ? 5200 : 3400);
  }
  const busy = (btn, on) => { if (!btn) return; btn.classList.toggle('is-busy', on); btn.disabled = on; };

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
    $('#cdBoxes').classList.add('is-bad');
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
  function sessionEnded() {
    stopPolling();
    closeDrawer(true); closeModal(true);
    S.user = null; S.cfg = null; S.bookings = []; S.callbacks = []; S.known = null;
    showLogin('نشست شما تمام شد؛ دوباره وارد شوید.');
  }
  async function logout() {
    await api.post('/logout');
    stopPolling();
    closeDrawer(true); closeModal(true);
    S.user = null; S.cfg = null; S.bookings = []; S.callbacks = []; S.known = null;
    location.hash = '';
    showLogin();
    toast('از پنل خارج شدید');
  }

  /* ---------- قاب پنل ---------- */
  const ROUTES = {
    today: { t: 'امروز', ic: 'i-home' },
    requests: { t: 'درخواست‌ها', ic: 'i-inbox', ok: () => !isDoctor() },
    calendar: { t: 'تقویم', ic: 'i-calendar' },
    callbacks: { t: 'درخواست تماس', ic: 'i-phone', ok: () => can('callbacks') },
    sms: { t: 'پیامک', ic: 'i-msg', ok: () => can('sms'), sep: true },
    users: { t: 'کارکنان', ic: 'i-users', ok: () => can('users') },
    audit: { t: 'گزارش کارها', ic: 'i-history', ok: () => can('audit') }
  };
  const allowed = (r) => ROUTES[r] && (!ROUTES[r].ok || ROUTES[r].ok());
  function renderShell() {
    const names = Object.keys(ROUTES).filter(allowed);
    $('#nav').innerHTML = names.map((r) => (ROUTES[r].sep ? '<span class="nav__sep"></span>' : '') +
      `<a href="#/${r}" data-r="${r}" title="${ROUTES[r].t}">${ic(ROUTES[r].ic)}<span>${ROUTES[r].t}</span><b class="badge" data-badge="${r}" hidden></b></a>`).join('');
    const tabs = names.filter((r) => ['today', 'requests', 'calendar', 'callbacks'].includes(r));
    $('#tabbar').innerHTML = tabs.map((r) => `<a href="#/${r}" data-r="${r}">${ic(ROUTES[r].ic)}<span>${ROUTES[r].t.replace('درخواست تماس', 'تماس‌ها')}</span><b class="badge" data-badge="${r}" hidden></b></a>`).join('') +
      `<button type="button" data-act="more">${ic('i-more')}<span>بیشتر</span></button>`;
    $('#tabbar').style.setProperty('grid-template-columns', `repeat(${tabs.length + 1}, 1fr)`);
    const u = S.user;
    $('#me').innerHTML = `<span class="av" data-act="me" title="${esc(u.name)}">${initial(u.name)}</span><div><b>${esc(u.name)}</b><small>${esc(S.cfg.roles[u.role])}</small></div>` +
      `<button class="iconbtn" type="button" data-act="me" aria-label="حساب من">${ic('i-more')}</button>`;
    $('#newBtn').hidden = !can('write');
    $('#ribbon').hidden = !DEMO;
    $('.search').hidden = isDoctor();
    tickClock();
  }
  function tickClock() { if (S.user) $('#clock').textContent = dFull(today()) + ' · ' + tLabel(nowMin()); }
  setInterval(tickClock, 30e3);
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
    document.title = (n && !isDoctor() ? `(${fa(n)}) ` : '') + 'پنل پذیرش · کلینیک ساسان';
  }

  /* ---------- مسیرها ---------- */
  function route() {
    if (!S.user || S.user.mustChange) return;
    let r = (location.hash.match(/^#\/([a-z]+)/) || [])[1] || 'today';
    if (!allowed(r)) r = 'today';
    const changed = r !== S.route;
    S.route = r;
    $$('#nav a, #tabbar a').forEach((a) => { if (a.dataset.r === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#title').textContent = ROUTES[r].t;
    render(changed);
    if (changed) { window.scrollTo(0, 0); closeMenu(); }
  }
  window.addEventListener('hashchange', route);
  const VIEWS = { today: vToday, requests: vRequests, calendar: vCalendar, callbacks: vCallbacks, sms: vSms, users: vUsers, audit: vAudit };
  function render(animate = true) {
    const host = $('#content');
    const v = document.createElement('div');
    v.className = animate ? 'view' : '';
    v.innerHTML = VIEWS[S.route]();
    host.replaceChildren(v);
    stagger(v, animate);
    countUp(v, animate);
    S.dirty = false;
    if (VIEWS[S.route].after) VIEWS[S.route].after(v);
  }
  function stagger(root, animate) {
    const els = $$('.rise', root);
    els.forEach((el, i) => { if (animate) el.style.setProperty('--i', Math.min(i, 14)); else el.classList.remove('rise'); });
  }
  function countUp(root, animate) {
    $$('[data-count]', root).forEach((el) => {
      const n = Number(el.dataset.count);
      if (!animate || reduce.matches || n < 2) { el.textContent = fa(n); return; }
      const t0 = performance.now(), dur = 650;
      const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = fa(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }
  /* بعد از گرفتن داده‌ی تازه: اگر کاربر مشغول نوشتن نیست، نما بی‌حرکت دوباره ساخته می‌شود */
  function refreshView() {
    if (!S.user || !VIEWS[S.route]) return;
    const a = document.activeElement;
    if (a && $('#content').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { S.dirty = true; return; }
    if (!$('#modal').hidden) { S.dirty = true; return; }
    const y = window.scrollY;
    render(false);
    window.scrollTo(0, y);
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
  }
  function stopPolling() { clearInterval(S.poll); S.poll = 0; }
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

  async function enter(me) {
    S.user = me.user; S.cfg = me.cfg;
    $('#login').hidden = true;
    $('#app').hidden = false;
    renderShell();
    if (S.user.mustChange) { forcePassword(); return; }
    $('#content').innerHTML = '<div class="list">' + '<div class="skel"></div>'.repeat(4) + '</div>';
    await loadAll();
    S.route = '';
    route();
    startPolling();
  }

  /* ---------- اجزای مشترک ---------- */
  const sortBy = {
    created: (a, b) => (a.createdAt < b.createdAt ? -1 : 1),
    createdDesc: (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
    when: (a, b) => (a.date === b.date ? a.time - b.time : a.date < b.date ? -1 : 1),
    updated: (a, b) => ((a.updatedAt || a.createdAt) < (b.updatedAt || b.createdAt) ? 1 : -1)
  };
  function slaCls(b) { const m = ageMin(b.createdAt); return m < 30 ? 'sla--ok' : m < 240 ? 'sla--warn' : 'sla--bad'; }
  function itemHtml(b) {
    const sched = b.date && ['scheduled', 'done', 'no-show'].includes(b.status);
    const phone = can('phone') && b.mobile;
    return `<div class="item ${esc(b.dept)} rise${S.sel === b.ref ? ' is-sel' : ''}" role="button" tabindex="0" data-act="open" data-ref="${esc(b.ref)}">
      <span class="av">${initial(b.name)}</span>
      <div class="item__main">
        <div class="item__name">${esc(b.name)} <small class="num">${esc(fa(b.ref))}</small> ${pill(b.status)}</div>
        <div class="item__meta"><span><span class="dot"></span> ${esc(deptT(b.dept))}</span><span>${esc(b.type)}</span>${b.doctor ? `<span>${esc(docName(b.doctor))}</span>` : ''}${b.attempts ? `<span class="sla--warn">${fa(b.attempts)} بار جواب نداد</span>` : ''}${b.source === 'phone' ? '<span class="muted">تلفنی</span>' : ''}</div>
        ${b.note ? `<div class="item__note">${esc(b.note)}</div>` : ''}
      </div>
      <div class="item__side">
        ${sched ? `<span class="item__when">${ic('i-calendar', 'ic--s')}${esc(relDay(b.date))} · ${tLabel(b.time)}</span>` : `<span class="sla ${slaCls(b)}">${ago(b.createdAt)}</span>`}
        ${phone ? `<a class="iconbtn" href="tel:${esc(b.mobile)}" aria-label="تماس با ${esc(b.name)}" data-stop>${ic('i-phone')}</a>` : ''}
      </div>
    </div>`;
  }
  const empty = (icon, title, text = '') => `<div class="empty">${ic(icon)}<b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ''}</div>`;
  function apptHtml(b, { showDate = false } = {}) {
    const now = b.date === today() && Math.abs(nowMin() - b.time) <= 30 && b.status === 'scheduled';
    return `<button class="appt ${esc(b.dept)}${b.status !== 'scheduled' ? ' is-done' : ''}${now ? ' is-now' : ''}" type="button" data-act="open" data-ref="${esc(b.ref)}">
      <span class="appt__t"><b>${esc(b.name)}</b><small>${esc(b.type)}${b.doctor ? ' · ' + esc(docName(b.doctor)) : ' · ' + esc(deptT(b.dept))}${showDate ? ' · ' + esc(relDay(b.date)) : ''}</small></span>
      ${b.status !== 'scheduled' ? pill(b.status) : ''}
    </button>`;
  }

  /* ---------- نما: امروز ---------- */
  function vToday() {
    const t = today(), B = S.bookings;
    const seen = (b) => ['scheduled', 'done', 'no-show'].includes(b.status);
    const todays = B.filter((b) => b.date === t && seen(b)).sort(sortBy.when);
    const tomorrow = B.filter((b) => b.date === addDays(t, 1) && b.status === 'scheduled');
    const first = String(S.user.name).split(' ')[0];
    const hour = nowMin() / 60;
    const hello = hour < 4 ? 'شب بخیر' : hour < 11 ? 'صبح بخیر' : hour < 17 ? 'روز بخیر' : hour < 20 ? 'عصر بخیر' : 'شب بخیر';
    let kpis;
    if (isDoctor()) {
      const week = B.filter((b) => b.date >= satOf(t) && b.date <= addDays(satOf(t), 6) && seen(b));
      kpis = [
        { n: todays.filter((b) => b.status === 'scheduled').length, t: 'نوبت باقی‌مانده‌ی امروز', ic: 'i-calendar', c: 'var(--blue)' },
        { n: todays.filter((b) => b.status === 'done').length, t: 'انجام‌شده‌ی امروز', ic: 'i-check-circle', c: 'var(--ok)' },
        { n: tomorrow.length, t: 'نوبت‌های فردا', ic: 'i-cal-check', c: 'var(--beauty)' },
        { n: week.length, t: 'نوبت‌های این هفته', ic: 'i-cal', c: 'var(--dental)', href: '#/calendar' }
      ];
    } else {
      const open = B.filter((b) => b.status === 'new' || b.status === 'called');
      const fresh = B.filter((b) => b.status === 'new');
      const late = open.filter((b) => ageMin(b.createdAt) > 240);
      const oldest = fresh.slice().sort(sortBy.created)[0];
      kpis = [
        { n: fresh.length, t: 'درخواست تازه', s: oldest ? 'قدیمی‌ترین: ' + ago(oldest.createdAt) : 'همه پیگیری شده‌اند', ic: 'i-inbox', c: 'var(--blue)', href: '#/requests' },
        { n: late.length, t: 'بیش از ۴ ساعت منتظر تماس', s: late.length ? 'اول با این‌ها تماس بگیرید' : 'هیچ درخواستی دیر نشده', ic: 'i-alert', c: 'var(--bad)', alert: late.length > 0, href: '#/requests' },
        { n: todays.length, t: 'نوبت‌های امروز', s: fa(todays.filter((b) => b.status === 'done').length) + ' انجام شد · ' + fa(tomorrow.length) + ' نوبت فردا', ic: 'i-calendar', c: 'var(--ok)', href: '#/calendar' },
        can('callbacks')
          ? { n: S.callbacks.filter((c) => c.status === 'new').length, t: 'درخواست تماس', s: 'از فرم «با من تماس بگیرید»', ic: 'i-phone', c: 'var(--beauty)', href: '#/callbacks' }
          : { n: tomorrow.length, t: 'نوبت‌های فردا', ic: 'i-cal-check', c: 'var(--beauty)' }
      ];
    }
    const kpiHtml = kpis.map((k) => `<${k.href ? `a href="${k.href}"` : 'div'} class="kpi rise${k.alert ? ' is-alert' : ''}" data-c="${k.c}">
      <span class="kpi__ic">${ic(k.ic)}</span><b class="num" data-count="${k.n}">${fa(k.n)}</b><span>${k.t}</span>${k.s ? `<small>${esc(k.s)}</small>` : ''}</${k.href ? 'a' : 'div'}>`).join('');

    const agenda = todays.length ? `<div class="agenda">${todays.map((b) => `<div class="slot rise"><span class="slot__t num">${tLabel(b.time)}</span>${apptHtml(b)}</div>`).join('')}</div>`
      : empty('i-calendar', 'امروز نوبتی ثبت نشده', isDoctor() ? '' : 'نوبت‌هایی که پذیرش ثبت کند این‌جا نشان داده می‌شوند.');
    const agendaCard = `<section class="card rise"><div class="card__h">${ic('i-calendar')}<h2>برنامه‌ی امروز</h2><span class="sp"></span><button class="iconbtn no-print" type="button" data-act="print" aria-label="چاپ برنامه‌ی امروز">${ic('i-print')}</button></div><div class="card__b">${agenda}</div></section>`;

    let left = '';
    if (!isDoctor()) {
      const queue = B.filter((b) => b.status === 'new' || b.status === 'called').sort(sortBy.created);
      left = `<section class="card rise"><div class="card__h">${ic('i-phone')}<h2>صف تماس</h2><span class="badge">${fa(queue.length)}</span><span class="sp"></span><a class="btn btn--ghost btn--s" href="#/requests">همه ${ic('i-chev-l', 'ic--s')}</a></div>
        <div class="card__b"><div class="list">${queue.slice(0, 7).map(itemHtml).join('') || empty('i-check-circle', 'صف تماس خالی است', 'با همه‌ی درخواست‌ها تماس گرفته شده.')}</div></div></section>`;
    }
    return `<div class="hello rise"><h2>${hello}، ${esc(first)}</h2><p>${esc(dFull(t))}</p></div>
      <div class="kpis">${kpiHtml}</div>
      ${isDoctor() ? agendaCard : `<div class="grid2">${left}${agendaCard}</div>`}`;
  }
  vToday.after = (root) => { $$('.kpi', root).forEach((k) => k.style.setProperty('--c', k.dataset.c)); };

  /* ---------- نما: درخواست‌ها ---------- */
  const FILTERS = [
    ['open', 'باز', (b) => b.status === 'new' || b.status === 'called'],
    ['new', 'تازه', (b) => b.status === 'new'],
    ['called', 'تماس گرفته شد', (b) => b.status === 'called'],
    ['scheduled', 'نوبت داده شد', (b) => b.status === 'scheduled'],
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
  function reqList() {
    const f = FILTERS.find((x) => x[0] === S.f.st) || FILTERS[0];
    const list = S.bookings.filter((b) => f[2](b) && (!S.f.dept || b.dept === S.f.dept) && matchQ(b, S.f.q));
    list.sort(S.f.st === 'scheduled' ? sortBy.when : ['open', 'new', 'called'].includes(S.f.st) ? sortBy.created : sortBy.updated);
    if (!list.length) return S.f.q ? empty('i-search', 'چیزی پیدا نشد', 'نام، موبایل یا کد پیگیری را دوباره بررسی کنید.') : empty('i-check-circle', 'موردی در این فهرست نیست');
    return list.slice(0, 200).map(itemHtml).join('');
  }
  function vRequests() {
    const seg = FILTERS.map(([k, t, fn]) => `<button type="button" data-act="fst" data-v="${k}" aria-pressed="${S.f.st === k}">${t} <em class="num">${fa(S.bookings.filter(fn).length)}</em></button>`).join('');
    const chips = [['', 'همه‌ی بخش‌ها']].concat(Object.keys(S.cfg.depts).map((k) => [k, S.cfg.depts[k].t]))
      .map(([k, t]) => `<button class="chip ${k}" type="button" data-act="fdept" data-v="${k}" aria-pressed="${S.f.dept === k}">${k ? '<span class="dot"></span>' : ''}${esc(t)}</button>`).join('');
    return `<label class="msearch"><span class="sr">جست‌وجو</span><input class="input" id="q2" type="search" placeholder="جست‌وجو: نام، موبایل یا کد پیگیری" value="${esc(S.f.q)}" autocomplete="off"></label>
      <div class="toolbar"><div class="seg" role="group" aria-label="وضعیت">${seg}</div><span class="sp"></span><div class="chips" role="group" aria-label="بخش">${chips}</div></div>
      <div class="list" id="reqList">${reqList()}</div>`;
  }
  let qTimer = 0;
  function onSearch(v, from) {
    S.f.q = v;
    if (from !== 'q') $('#q').value = v;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      if (S.route !== 'requests') { if (!v) return; S.f.st = 'all'; location.hash = '#/requests'; return; }
      const l = $('#reqList');
      if (l) { l.innerHTML = reqList(); stagger(l, false); }
    }, 120);
  }
  $('#q').addEventListener('input', (e) => onSearch(e.target.value, 'q'));
  document.addEventListener('input', (e) => { if (e.target.id === 'q2') onSearch(e.target.value, 'q2'); });

  /* ---------- کشوی جزئیات درخواست ---------- */
  let lastFocus = null;
  function openDrawer(ref) {
    const b = byRef(ref);
    if (!b) return;
    const was = S.sel;
    S.sel = ref; S.stale = false;
    if (was !== ref) S.sched = null;
    const d = $('#drawer');
    d.innerHTML = drawerHtml(b);
    d.style.setProperty('--c', `var(--${b.dept})`);
    afterDrawer(d);
    $$('.item.is-sel').forEach((x) => x.classList.remove('is-sel'));
    $$(`.item[data-ref="${CSS.escape(ref)}"]`).forEach((x) => x.classList.add('is-sel'));
    if (!d.classList.contains('is-on')) {
      lastFocus = document.activeElement;
      d.hidden = false; $('#scrim').hidden = false;
      d.classList.remove('is-closing');
      requestAnimationFrame(() => requestAnimationFrame(() => { d.classList.add('is-on'); $('#scrim').classList.add('is-on'); }));
      document.body.style.setProperty('overflow', 'hidden');
      setTimeout(() => { const c = $('[data-act="close"]', d); if (c) c.focus({ preventScroll: true }); }, 60);
    }
  }
  function closeDrawer(instant) {
    const d = $('#drawer');
    if (d.hidden) return;
    S.sel = null; S.sched = null;
    $$('.item.is-sel').forEach((x) => x.classList.remove('is-sel'));
    d.classList.add('is-closing');
    d.classList.remove('is-on'); $('#scrim').classList.remove('is-on');
    document.body.style.removeProperty('overflow');
    const done = () => { if (!d.classList.contains('is-on')) { d.hidden = true; $('#scrim').hidden = true; d.innerHTML = ''; } };
    if (instant || reduce.matches) done(); else setTimeout(done, 320);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  function redrawDrawer() {
    const b = S.sel && byRef(S.sel);
    if (!b) return;
    const d = $('#drawer'), y = $('.drawer__b', d) ? $('.drawer__b', d).scrollTop : 0;
    d.innerHTML = drawerHtml(b);
    afterDrawer(d);
    const body = $('.drawer__b', d);
    if (body) body.scrollTop = y;
  }
  /* داده‌ی تازه از سرور: اگر کارمند وسط انتخاب زمان یا نوشتن یادداشت است، فقط خبر می‌دهیم */
  function refreshDrawer() {
    if (!S.sel) return;
    const d = $('#drawer'), b = byRef(S.sel);
    if (!b) { closeDrawer(); return; }
    const shown = Number(d.dataset.v || 0);
    if ((b.v || 0) === shown && d.dataset.sms === String((b.sms || []).length)) return;
    const note = $('#dwNote', d);
    if (S.sched || (note && note.value !== (b.staffNote || ''))) { S.stale = true; const w = $('#dwStale', d); if (w) w.hidden = false; return; }
    redrawDrawer();
  }
  function afterDrawer(d) {
    const b = byRef(S.sel);
    d.dataset.v = String(b.v || 0);
    d.dataset.sms = String((b.sms || []).length);
    $$('[data-c]', d).forEach((el) => el.style.setProperty('--c', el.dataset.c));
  }
  function histHtml(b) {
    const items = [];
    if (!(b.log || []).some((e) => e.ev === 'create')) items.push({ at: b.createdAt, by: '', ev: 'site' });
    (b.log || []).forEach((e) => items.push(e));
    const row = (e) => {
      let icn = 'i-info', t = '';
      if (e.ev === 'site') { icn = 'i-send'; t = 'درخواست از سایت ثبت شد (شماره با کد پیامکی تأیید شد)'; }
      else if (e.ev === 'create') { icn = 'i-phone'; t = 'نوبت تلفنی ثبت شد'; }
      else if (e.ev === 'status') { icn = 'i-check'; t = 'وضعیت: ' + (STATUS[e.v] || CB_STATUS[e.v] || e.v); }
      else if (e.ev === 'when') { icn = 'i-calendar'; t = 'زمان نوبت: ' + dLong(e.v.date) + ' ساعت ' + tLabel(e.v.time); }
      else if (e.ev === 'doctor') { icn = 'i-user-round'; t = e.v ? 'پزشک: ' + docName(e.v) : 'پزشک برداشته شد'; }
      else if (e.ev === 'note') { icn = 'i-note'; t = 'یادداشت پذیرش به‌روز شد'; }
      else if (e.ev === 'noanswer') { icn = 'i-phone-missed'; t = 'تماس بی‌پاسخ (بار ' + fa(e.v) + ')'; }
      else if (e.ev === 'sms') { icn = 'i-msg'; t = 'پیامک ' + (SMS_KIND[e.v.kind] || '') + (e.v.ok ? ' فرستاده شد' : ' فرستاده نشد'); }
      return `<li><span class="tl__ic">${ic(icn)}</span><div><b>${esc(t)}</b><small>${esc(stamp(e.at))}${e.by ? ' · ' + esc(e.by) : ''}</small></div></li>`;
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
    return `یادآوری پیامکی: ${b.date === addDays(t, 1) ? 'امروز' : relDay(addDays(b.date, -1))} از ساعت ${tLabel(S.cfg.sms.remindHour * 60)}`;
  }
  function drawerHtml(b) {
    const w = can('write');
    const sch = b.date && ['scheduled', 'done', 'no-show'].includes(b.status);
    let actions = '';
    if (w) {
      if (b.status === 'new' || b.status === 'called') {
        actions = `${b.status === 'new' ? `<button class="btn btn--sec" type="button" data-act="st" data-v="called">${ic('i-check')}<span class="btn__t">تماس گرفتم</span></button>` : ''}
          <button class="btn btn--sec" type="button" data-act="noanswer">${ic('i-phone-missed')}<span class="btn__t">جواب نداد</span></button>
          <button class="btn btn--pri" type="button" data-act="sched">${ic('i-cal-check')}<span class="btn__t">نوبت بده</span></button>
          <button class="btn btn--bad" type="button" data-act="st" data-v="cancelled" data-confirm="درخواست لغو شود؟">${ic('i-ban')}<span class="btn__t">لغو درخواست</span></button>`;
      } else if (b.status === 'scheduled') {
        actions = `<button class="btn btn--ok" type="button" data-act="st" data-v="done">${ic('i-check')}<span class="btn__t">انجام شد</span></button>
          <button class="btn btn--sec" type="button" data-act="st" data-v="no-show">${ic('i-user-x')}<span class="btn__t">نیامد</span></button>
          <button class="btn btn--sec" type="button" data-act="sched">${ic('i-calendar')}<span class="btn__t">تغییر زمان</span></button>
          ${S.cfg.sms.appt ? `<button class="btn btn--sec" type="button" data-act="resms">${ic('i-send')}<span class="btn__t">پیامک تأیید دوباره</span></button>` : ''}
          <button class="btn btn--bad" type="button" data-act="st" data-v="cancelled" data-confirm="نوبت لغو شود؟ اگر پیامک یادآوری هنوز نرفته، دیگر فرستاده نمی‌شود.">${ic('i-ban')}<span class="btn__t">لغو نوبت</span></button>`;
      } else {
        actions = `<button class="btn btn--sec" type="button" data-act="st" data-v="called">${ic('i-undo')}<span class="btn__t">بازگشت به صف</span></button>`;
      }
    }
    const rl = remindLine(b);
    return `<div class="drawer__h">
        <span class="av" data-c="var(--${esc(b.dept)})">${initial(b.name)}</span>
        <div class="drawer__t"><h2 id="dwTitle">${esc(b.name)}</h2><small class="num">${esc(fa(b.ref))} · ${esc(deptT(b.dept))}${b.source === 'phone' ? ' · تلفنی' : ' · از سایت'}</small><div>${pill(b.status)}</div></div>
        <button class="iconbtn" type="button" data-act="close" aria-label="بستن">${ic('i-x')}</button>
      </div>
      <div class="drawer__b">
        <div class="warnbox" id="dwStale" ${S.stale ? '' : 'hidden'}>${ic('i-refresh')}<span>همکارتان همین حالا این درخواست را تغییر داد. <button class="linkbtn" type="button" data-act="reload">نمایش نسخه‌ی تازه</button></span></div>
        ${sch ? `<div class="appt-card" data-c="var(--${esc(b.dept)})"><b>${esc(dLong(b.date))} · ساعت ${tLabel(b.time)}</b><small>${b.doctor ? esc(docName(b.doctor)) + ' · ' : ''}${esc(deptT(b.dept))}${rl ? ' · ' + esc(rl) : ''}</small></div>` : ''}
        <dl class="facts">
          ${can('phone') ? `<div class="wide"><dt>موبایل</dt><dd><span class="tel"><a class="ltr num" href="tel:${esc(b.mobile)}">${esc(fa(b.mobile))}</a><button class="iconbtn" type="button" data-act="copy" data-v="${esc(b.mobile)}" aria-label="کپی شماره">${ic('i-copy', 'ic--s')}</button></span></dd></div>` : ''}
          <div><dt>بخش</dt><dd>${esc(deptT(b.dept))}</dd></div>
          <div><dt>نوع مراجعه</dt><dd>${esc(b.type)}</dd></div>
          <div><dt>زمان ثبت</dt><dd>${esc(ago(b.createdAt))}<br><small class="muted">${esc(stamp(b.createdAt))}</small></dd></div>
          <div><dt>${b.source === 'phone' ? 'ثبت‌کننده' : 'تماس‌های بی‌پاسخ'}</dt><dd>${b.source === 'phone' ? esc(b.createdBy || '') : fa(b.attempts || 0)}</dd></div>
        </dl>
        ${b.note ? `<div class="sec"><div class="sec__h">${ic('i-chat', 'ic--s')}توضیح بیمار</div><p class="note">${esc(b.note)}</p></div>` : ''}
        ${actions ? `<div class="sec"><div class="sec__h">${ic('i-check-circle', 'ic--s')}نتیجه‌ی پیگیری</div><div class="actions">${actions}</div></div>` : ''}
        ${S.sched && S.sched.ref === b.ref ? schedHtml(S.sched, b) : ''}
        <div class="sec"><div class="sec__h">${ic('i-note', 'ic--s')}یادداشت پذیرش<span class="sp"></span></div>
          ${w ? `<textarea class="textarea" id="dwNote" maxlength="300" placeholder="مثلاً: عصرها تماس بگیرید؛ بیمه دارد">${esc(b.staffNote || '')}</textarea><div><button class="btn btn--sec btn--s" type="button" data-act="note"><span class="spin"></span><span class="btn__t">ذخیره‌ی یادداشت</span></button></div>`
            : `<p class="note">${esc(b.staffNote || '—')}</p>`}
        </div>
        ${can('sms') ? `<div class="sec"><div class="sec__h">${ic('i-msg', 'ic--s')}پیامک‌ها<span class="sp"></span>${(b.sms || []).some((e) => e.ok && e.id) ? `<button class="btn btn--ghost btn--s" type="button" data-act="dlv">${ic('i-refresh', 'ic--s')}وضعیت رسیدن</button>` : ''}</div>${smsHtml(b)}</div>` : ''}
        <div class="sec"><div class="sec__h">${ic('i-history', 'ic--s')}تاریخچه</div><ul class="tl">${histHtml(b)}</ul></div>
      </div>`;
  }

  /* ---------- انتخاب روز و ساعت ---------- */
  function clashes(dept, doctor, date, time, except) {
    return S.bookings.filter((x) => x.ref !== except && x.status === 'scheduled' && x.date === date && Math.abs(x.time - time) < 30 &&
      (doctor ? x.doctor === doctor : x.dept === dept && !x.doctor));
  }
  function slotsFor(dept) {
    const d = S.cfg.depts[dept], step = dept === 'medicine' ? 30 : 15, out = [];
    for (let m = d.from; m < d.to; m += step) out.push(m);
    return out;
  }
  function schedHtml(st, b) {
    const dept = st.dept || b.dept, D = S.cfg.depts[dept];
    const t = today(), start = satOf(t);
    const end = addDays(start, 34);
    const monthT = myLabel(start) === myLabel(end) ? myLabel(start) : F.mo.format(utc(start)) + ' و ' + myLabel(end);
    let days = WD_SHORT.slice(6).concat(WD_SHORT.slice(0, 6)).map((w) => `<span class="cal__w">${w}</span>`).join('');
    for (let i = 0; i < 35; i++) {
      const iso = addDays(start, i);
      const past = iso < t, closed = !D.days.includes(wdOf(iso));
      const has = S.bookings.some((x) => x.status === 'scheduled' && x.date === iso && x.dept === dept);
      days += `<button class="day${closed ? ' is-closed' : ''}${iso === t ? ' is-today' : ''}" type="button" data-act="pday" data-v="${iso}" aria-pressed="${st.date === iso}" ${past ? 'disabled' : ''} aria-label="${esc(dLong(iso))}${closed ? '، بخش تعطیل' : ''}">${fa(jDay(iso))}${has ? '<i></i>' : ''}</button>`;
    }
    const docs = Object.entries(S.cfg.doctors).filter(([, v]) => v.k === dept);
    let times = '';
    if (st.date) {
      const nm = st.date === t ? nowMin() : -1;
      times = slotsFor(dept).filter((m) => m > nm).map((m) => {
        const busy = clashes(dept, st.doctor, st.date, m, b.ref).length > 0;
        return `<button class="time num${busy ? ' is-busy' : ''}" type="button" data-act="ptime" data-v="${m}" aria-pressed="${st.time === m}"${busy ? ' title="در این ساعت نوبت دیگری هست"' : ''}>${tLabel(m)}</button>`;
      }).join('') || '<p class="hint">امروز دیگر ساعت خالی‌ای در ساعت کاری این بخش نمانده.</p>';
    }
    const warns = [];
    if (st.date && !D.days.includes(wdOf(st.date))) warns.push(`${D.t} در ${F.wd.format(utc(st.date))} تعطیل است (${D.hours}). اگر شیفت استثنا دارید، ادامه دهید.`);
    if (st.date && st.time != null) {
      const c = clashes(dept, st.doctor, st.date, st.time, b.ref);
      if (c.length) warns.push(`${st.doctor ? docName(st.doctor) : 'این بخش'} در همین ساعت نوبت دیگری هم دارد (${c.map((x) => x.name).join('، ')}).`);
    }
    const smsOk = S.cfg.sms.appt;
    return `<div class="sched" id="sched">
      <div class="sec__h">${ic('i-cal-check', 'ic--s')}${st.ref ? 'روز و ساعت نوبت' : 'روز و ساعت نوبت (اختیاری)'}<span class="sp"></span><span class="muted">${esc(D.hours)}</span></div>
      ${docs.length ? `<label class="field"><span>پزشک</span><select class="select" data-act="pdoc"><option value="">هنوز مشخص نیست</option>${docs.map(([k, v]) => `<option value="${k}"${st.doctor === k ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>` : ''}
      <div class="cal"><div class="cal__h"><span>${esc(monthT)}</span><span class="muted">۵ هفته‌ی پیش رو</span></div><div class="cal__g">${days}</div></div>
      ${st.date ? `<div class="field"><span class="flabel">ساعت · ${esc(dLong(st.date))}</span><div class="times">${times}</div></div>` : '<p class="hint">اول روز را انتخاب کنید.</p>'}
      ${warns.map((x) => `<div class="warnbox">${ic('i-alert', 'ic--s')}<span>${esc(x)}</span></div>`).join('')}
      <label class="check${smsOk ? '' : ' is-off'}"><input type="checkbox" data-act="psms" ${smsOk && st.sms ? 'checked' : ''} ${smsOk ? '' : 'disabled'}><span>پیامک تأیید نوبت برای بیمار فرستاده شود<small>${smsOk ? (st.date && st.time != null ? esc(`«نوبت ${D.t} شما ${dLong(st.date)} ساعت ${tLabel(st.time)} ثبت شد»`) : 'بعد از انتخاب روز و ساعت') : 'قالب پیامک تأیید نوبت هنوز روی سرور تنظیم نشده (npm run setup)'}</small></span></label>
      ${st.ref ? `<div class="actions"><button class="btn btn--pri" type="button" data-act="psave" ${st.date && st.time != null ? '' : 'disabled'}><span class="spin"></span><span class="btn__t">ثبت نوبت</span></button><button class="btn btn--ghost" type="button" data-act="pcancel">انصراف</button></div>` : ''}
    </div>`;
  }
  function redrawSched() {
    const host = $('#sched');
    if (!host) return;
    const b = S.sched.ref ? byRef(S.sched.ref) : { ref: '', dept: S.sched.dept };
    const tmp = document.createElement('div');
    tmp.innerHTML = schedHtml(S.sched, b);
    const times = $('.times', host), y = times ? times.scrollTop : 0;
    const el = tmp.firstElementChild;
    el.classList.add('no-anim');
    host.replaceWith(el);
    const nt = $('.times', el);
    if (nt) { nt.scrollTop = y; if (!y) scrollTimes(el); }
  }
  /* فهرست ساعت‌ها (مثلاً ۲۴ ساعته‌ی پزشک عمومی) از ساعت انتخاب‌شده یا ساعت ۸ صبح شروع به نمایش می‌کند */
  function scrollTimes(root) {
    const list = $('.times', root);
    if (!list) return;
    const target = S.sched && S.sched.time != null ? S.sched.time : 480;
    const el = $$('.time', list).find((x) => Number(x.dataset.v) >= target);
    if (el) list.scrollTop += el.getBoundingClientRect().top - list.getBoundingClientRect().top - 4;
  }

  /* ---------- تغییر درخواست ---------- */
  async function patch(ref, body, okMsg, btn) {
    const b = byRef(ref);
    busy(btn, true);
    const r = await call('patch', '/bookings/' + encodeURIComponent(ref), Object.assign({ v: b.v || 0 }, body));
    busy(btn, false);
    if (r.status === 409 && r.booking) { putBooking(r.booking); S.stale = false; redrawDrawer(); refreshView(); toast(errText(r), true); return null; }
    if (!r.ok) { toast(errText(r), true); return null; }
    putBooking(r.booking);
    if (okMsg) toast(okMsg);
    if (r.sms) toast(r.sms.ok ? 'پیامک تأیید نوبت فرستاده شد' : 'نوبت ثبت شد ولی ' + errText(r.sms), !r.sms.ok);
    refreshView();
    const el = $(`.item[data-ref="${CSS.escape(ref)}"]`);
    if (el) el.classList.add('is-flash');
    return r.booking;
  }

  /* ---------- نما: تقویم ---------- */
  function vCalendar() {
    const t = today();
    if (!S.cal.week) S.cal.week = satOf(t);
    const sat = S.cal.week, fri = addDays(sat, 6);
    if (!S.cal.day || S.cal.day < sat || S.cal.day > fri) S.cal.day = t >= sat && t <= fri ? t : sat;
    const list = S.bookings.filter((b) => b.date >= sat && b.date <= fri && ['scheduled', 'done', 'no-show'].includes(b.status) &&
      (!S.cal.dept || b.dept === S.cal.dept) && (!S.cal.doc || b.doctor === S.cal.doc)).sort(sortBy.when);
    const D = S.cal.dept && S.cfg.depts[S.cal.dept];
    const label = `${dm(sat)} تا ${dm(fri)}`;
    const chips = isDoctor() ? '' : [['', 'همه']].concat(Object.keys(S.cfg.depts).map((k) => [k, S.cfg.depts[k].t]))
      .map(([k, tt]) => `<button class="chip ${k}" type="button" data-act="cdept" data-v="${k}" aria-pressed="${S.cal.dept === k}">${k ? '<span class="dot"></span>' : ''}${esc(tt)}</button>`).join('');
    const docs = Object.entries(S.cfg.doctors).filter(([, v]) => !S.cal.dept || v.k === S.cal.dept);
    const docSel = isDoctor() ? '' : `<select class="select" data-act="cdoc" aria-label="پزشک"><option value="">همه‌ی پزشکان</option>${docs.map(([k, v]) => `<option value="${k}"${S.cal.doc === k ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>`;
    let cols = '', strip = '';
    for (let i = 0; i < 7; i++) {
      const iso = addDays(sat, i), day = list.filter((b) => b.date === iso);
      const closed = D && !D.days.includes(wdOf(iso));
      cols += `<section class="wday rise${iso === t ? ' is-today' : ''}${closed ? ' is-closed' : ''}"><div class="wday__h"><b>${esc(F.wd.format(utc(iso)))}</b><small><span>${esc(dm(iso))}</span><span class="num">${day.length ? fa(day.length) + ' نوبت' : closed ? 'تعطیل' : ''}</span></small></div>
        <div class="wday__b">${day.map((b) => `<button class="appt ${esc(b.dept)}${b.status !== 'scheduled' ? ' is-done' : ''}" type="button" data-act="open" data-ref="${esc(b.ref)}"><span class="appt__time num">${tLabel(b.time)}</span><b>${esc(b.name)}</b><small class="muted">${esc(b.doctor ? docName(b.doctor) : deptT(b.dept))}</small></button>`).join('') || '<p class="wday__none">—</p>'}</div></section>`;
      strip += `<button type="button" data-act="cday" data-v="${iso}" aria-pressed="${S.cal.day === iso}" class="${iso === t ? 'is-today' : ''}">${esc(F.wd.format(utc(iso)))}<b class="num">${fa(jDay(iso))}</b><i class="${day.length ? '' : 'is-empty'}"></i></button>`;
    }
    const dayList = list.filter((b) => b.date === S.cal.day);
    const mobileList = `<div class="days">${strip}</div><div class="agenda">${dayList.map((b) => `<div class="slot rise"><span class="slot__t num">${tLabel(b.time)}</span>${apptHtml(b)}</div>`).join('') || empty('i-calendar', 'نوبتی در ' + dLong(S.cal.day) + ' نیست')}</div>`;
    return `<div class="toolbar">
        <button class="iconbtn iconbtn--line" type="button" data-act="wk" data-v="-7" aria-label="هفته‌ی قبل">${ic('i-chev-r')}</button>
        <b class="num">${esc(label)}</b>
        <button class="iconbtn iconbtn--line" type="button" data-act="wk" data-v="7" aria-label="هفته‌ی بعد">${ic('i-chev-l')}</button>
        <button class="btn btn--sec btn--s" type="button" data-act="wk" data-v="0">این هفته</button>
        <span class="sp"></span><div class="chips">${chips}</div>${docSel}
        <button class="iconbtn iconbtn--line no-print" type="button" data-act="print" aria-label="چاپ">${ic('i-print')}</button>
      </div>
      ${mobile.matches ? mobileList : `<div class="week">${cols}</div>`}
      <p class="hint">${fa(list.length)} نوبت در این هفته${D ? ' · ساعت کاری ' + esc(D.t) + ': ' + esc(D.hours) : ''}</p>`;
  }
  mobile.addEventListener('change', () => { if (S.route === 'calendar') render(false); });

  /* ---------- نما: درخواست تماس ---------- */
  function vCallbacks() {
    const F2 = [['open', 'باز', (c) => c.status !== 'done'], ['done', 'انجام شد', (c) => c.status === 'done'], ['all', 'همه', () => true]];
    const f = F2.find((x) => x[0] === S.cbF) || F2[0];
    const list = S.callbacks.filter(f[2]).sort(S.cbF === 'open' ? sortBy.created : sortBy.createdDesc);
    const seg = F2.map(([k, t, fn]) => `<button type="button" data-act="cbf" data-v="${k}" aria-pressed="${S.cbF === k}">${t} <em class="num">${fa(S.callbacks.filter(fn).length)}</em></button>`).join('');
    const rows = list.map((c) => `<div class="item rise" role="button" tabindex="0" data-act="cb" data-id="${esc(c.id)}">
        <span class="av">${initial(c.name)}</span>
        <div class="item__main"><div class="item__name">${esc(c.name)} ${pill(c.status, CB_STATUS)}</div>
          <div class="item__meta"><span class="ltr num">${esc(fa(c.mobile))}</span>${c.topic ? `<span>${esc(c.topic)}</span>` : ''}</div>
          ${c.staffNote ? `<div class="item__note">${esc(c.staffNote)}</div>` : ''}</div>
        <div class="item__side"><span class="sla ${c.status === 'new' ? slaCls(c) : ''}">${ago(c.createdAt)}</span><a class="iconbtn" href="tel:${esc(c.mobile)}" aria-label="تماس با ${esc(c.name)}" data-stop>${ic('i-phone')}</a></div>
      </div>`).join('');
    return `<div class="toolbar"><div class="seg" role="group" aria-label="وضعیت">${seg}</div><span class="sp"></span><p class="hint">درخواست‌هایی که از فرم «با من تماس بگیرید» سایت می‌رسند.</p></div>
      <div class="list">${rows || empty('i-phone', 'درخواست تماسی نیست')}</div>`;
  }
  function openCallback(id) {
    const c = S.callbacks.find((x) => x.id === id);
    if (!c) return;
    openModal(`<div class="modal__h"><h2 id="mdTitle">${esc(c.name)}</h2>${pill(c.status, CB_STATUS)}<button class="iconbtn" type="button" data-act="mclose" aria-label="بستن">${ic('i-x')}</button></div>
      <div class="modal__b form">
        <dl class="facts"><div class="wide"><dt>موبایل</dt><dd><a class="ltr num" href="tel:${esc(c.mobile)}">${esc(fa(c.mobile))}</a></dd></div><div><dt>موضوع</dt><dd>${esc(c.topic || '—')}</dd></div><div><dt>زمان</dt><dd>${esc(ago(c.createdAt))}</dd></div></dl>
        <label class="field"><span>یادداشت</span><textarea class="textarea" name="note" maxlength="300">${esc(c.staffNote || '')}</textarea></label>
        <p class="err" id="mdErr" role="alert"></p>
      </div>
      <div class="modal__f">
        ${c.status === 'new' ? `<button class="btn btn--sec" type="button" data-act="cbs" data-v="called">تماس گرفتم</button>` : ''}
        ${c.status !== 'done' ? `<button class="btn btn--ok" type="button" data-act="cbs" data-v="done">انجام شد</button>` : `<button class="btn btn--sec" type="button" data-act="cbs" data-v="called">بازگشت به باز</button>`}
        <button class="btn btn--pri" type="button" data-act="cbs" data-v=""><span class="spin"></span><span class="btn__t">ذخیره</span></button>
      </div>`, { id });
  }
  async function saveCallback(id, status, btn) {
    const c = S.callbacks.find((x) => x.id === id);
    const note = $('#modal textarea[name="note"]').value;
    const body = { v: c.v || 0, staffNote: note };
    if (status) body.status = status;
    busy(btn, true);
    const r = await call('patch', '/callbacks/' + encodeURIComponent(id), body);
    busy(btn, false);
    if (r.status === 409 && r.callback) { Object.assign(c, r.callback); toast(errText(r), true); closeModal(); refreshView(); return; }
    if (!r.ok) { $('#mdErr').textContent = errText(r); return; }
    Object.assign(c, r.callback);
    updateBadges();
    closeModal();
    refreshView();
    toast(status === 'done' ? 'درخواست تماس انجام شد' : 'ذخیره شد');
  }

  /* ---------- نما: پیامک ---------- */
  let smsData = null;
  function vSms() {
    if (!smsData) { loadSms(); return '<div class="tiles">' + '<div class="skel"></div>'.repeat(3) + '</div><div class="skel"></div>'; }
    const d = smsData, T = d.templates;
    const tpl = [
      ['otp', 'کد تأیید (سایت و ورود پنل)'], ['received', 'پیامک «درخواست ثبت شد» به بیمار'], ['reception', 'خبر درخواست تازه به موبایل پذیرش'],
      ['appt', 'تأیید نوبت از پنل'], ['remind', `یادآوری یک روز قبل (ساعت ${tLabel(d.remindHour * 60)})`]
    ].map(([k, t]) => `<li>${ic(T[k] ? 'i-check-circle' : 'i-ban', T[k] ? 'is-ok' : 'is-no')}<span>${esc(t)}</span>${T[k] ? '' : '<span class="muted">· خاموش</span>'}</li>`).join('');
    const rows = d.log.map((e) => `<tr><td data-l="زمان" class="num">${esc(stamp(e.at))}</td><td data-l="بیمار"><a href="#" data-act="open" data-ref="${esc(e.ref)}">${esc(e.name)}</a> <small class="muted num">${esc(fa(e.ref))}</small></td>
      <td data-l="نوع">${esc(SMS_KIND[e.kind] || e.kind)}</td><td data-l="نتیجه">${e.ok ? '<span class="pill pill--scheduled">فرستاده شد</span>' : `<span class="pill pill--no-show">ناموفق</span> <small class="muted">${esc(e.err || '')}</small>`}</td>
      <td data-l="رسیدن">${e.ok ? (e.dlv ? `<span class="pill pill--${DLV_CLS[e.dlv] || 'called'}">${esc(DLV[e.dlv] || '')}</span>` : '<span class="muted">هنوز گزارشی نیامده</span>') : '—'}</td></tr>`).join('');
    return `<div class="tiles">
        <div class="kpi rise" data-c="var(--ok)"><span class="kpi__ic">${ic('i-wallet')}</span><b class="num">${d.credit != null ? esc(fmtNum(d.credit)) : '—'}</b><span>اعتبار پنل پیامک</span><small>${d.credit != null ? 'از sms.ir' : esc(d.creditError || 'در دسترس نیست')}</small></div>
        <div class="kpi rise" data-c="${d.mode === 'live' ? 'var(--blue)' : 'var(--warn)'}"><span class="kpi__ic">${ic('i-send')}</span><b>${d.mode === 'live' ? 'اصلی' : 'آزمایشی'}</b><span>حالت ارسال</span><small>${d.mode === 'live' ? 'پیامک‌ها واقعاً فرستاده می‌شوند' : 'Sandbox: پیامک واقعی فرستاده نمی‌شود'}</small></div>
        <div class="kpi rise" data-c="var(--beauty)"><span class="kpi__ic">${ic('i-clock')}</span><b>${T.remind ? 'روشن' : 'خاموش'}</b><span>یادآوری خودکار</span><small>${T.remind ? `هر روز از ساعت ${tLabel(d.remindHour * 60)} برای نوبت‌های فردا` : 'قالب یادآوری تنظیم نشده'}</small></div>
      </div>
      <div class="grid2">
        <section class="card rise"><div class="card__h">${ic('i-msg')}<h2>پیامک‌های فرستاده‌شده</h2><span class="sp"></span><button class="btn btn--ghost btn--s" type="button" data-act="smsref"><span class="spin"></span>${ic('i-refresh', 'ic--s')}<span class="btn__t">وضعیت رسیدن</span></button></div>
          ${rows ? `<div class="scrollx"><table class="table stack"><thead><tr><th>زمان</th><th>بیمار</th><th>نوع</th><th>نتیجه</th><th>رسیدن</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="card__b">${empty('i-msg', 'هنوز پیامکی به بیماران فرستاده نشده')}</div>`}
        </section>
        <section class="card rise"><div class="card__h">${ic('i-shield')}<h2>قالب‌های پیامک</h2></div><div class="card__b"><ul class="checks">${tpl}</ul>
          <p class="hint">قالب‌های خاموش را روی سرور با <code>npm run setup</code> بسازید؛ بعد از تأیید کارشناسان sms.ir شناسه‌شان در <code>server/.env</code> قرار می‌گیرد و همین‌جا روشن می‌شوند. کد تأیید هیچ‌وقت در این فهرست نمی‌آید.</p></div></section>
      </div>`;
  }
  vSms.after = (root) => { $$('[data-c]', root).forEach((k) => k.style.setProperty('--c', k.dataset.c)); };
  async function loadSms() {
    const r = await call('get', '/sms');
    if (!r.ok) { toast(errText(r), true); return; }
    smsData = r;
    if (S.route === 'sms') render(false);
  }

  /* ---------- نما: کارکنان ---------- */
  let usersData = null;
  function vUsers() {
    if (!usersData) { loadUsers(); return '<div class="skel"></div>'.repeat(3); }
    const rows = usersData.map((u) => `<tr><td><div class="who"><span class="av">${initial(u.name)}</span><div><b>${esc(u.name)}</b><small class="ltr">${esc(u.username)}</small></div></div></td>
      <td data-l="نقش">${esc(S.cfg.roles[u.role])}${u.doctor ? ` <small class="muted">· ${esc(docName(u.doctor))}</small>` : ''}</td>
      <td data-l="موبایل" class="num"><span class="ltr">${esc(fa(u.mobile))}</span></td>
      <td data-l="وضعیت">${u.active ? '<span class="pill pill--scheduled">فعال</span>' : '<span class="pill pill--cancelled">غیرفعال</span>'}${u.mustChange ? ' <span class="pill pill--called pill--plain">رمز موقت</span>' : ''}</td>
      <td data-l="آخرین ورود">${u.lastLoginAt ? esc(ago(u.lastLoginAt)) : '<span class="muted">هنوز وارد نشده</span>'}</td>
      <td><button class="btn btn--ghost btn--s" type="button" data-act="uedit" data-id="${esc(u.id)}">${ic('i-pencil', 'ic--s')}ویرایش</button></td></tr>`).join('');
    return `<div class="toolbar"><p class="hint">هر کس با حساب خودش وارد می‌شود و هر کارش در «گزارش کارها» با نامش ثبت می‌شود. حساب مشترک نسازید.</p><span class="sp"></span>
        <button class="btn btn--pri" type="button" data-act="unew">${ic('i-user-plus')}<span class="btn__t">کاربر تازه</span></button></div>
      <section class="card rise"><div class="scrollx"><table class="table stack"><thead><tr><th>نام</th><th>نقش</th><th>موبایل (کد ورود)</th><th>وضعیت</th><th>آخرین ورود</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }
  async function loadUsers() {
    const r = await call('get', '/users');
    if (!r.ok) { toast(errText(r), true); return; }
    usersData = r.users;
    if (S.route === 'users') render(false);
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
      usersData = null;
      closeModal();
      render(false);
      toast(u ? 'تغییرات ذخیره شد' : `حساب ${body.username} ساخته شد`);
    });
  }

  /* ---------- نما: گزارش کارها ---------- */
  let auditData = null, auditQ = '';
  function auditRows() {
    const q = auditQ.trim();
    return auditData.filter((e) => !q || [(e.by && e.by.name) || '', AUDIT[e.action] || e.action, e.target, e.detail].join(' ').includes(q))
      .slice(0, 400).map((e) => `<tr><td data-l="زمان" class="num">${esc(stamp(e.at))}</td><td data-l="چه کسی">${esc(e.by ? e.by.name : '—')}</td>
        <td data-l="کار">${e.action === 'login.fail' ? '<span class="pill pill--no-show pill--plain">ورود ناموفق</span>' : esc(AUDIT[e.action] || e.action)}</td>
        <td data-l="روی" class="num">${esc(fa(e.target || ''))}</td><td data-l="جزئیات">${esc(e.detail || '')}</td></tr>`).join('');
  }
  function vAudit() {
    if (!auditData) { loadAudit(); return '<div class="skel"></div>'.repeat(3); }
    const rows = auditRows();
    return `<div class="toolbar"><label class="search"><span class="sr">جست‌وجو در گزارش</span>${ic('i-search')}<input class="input" id="aq" type="search" placeholder="نام کارمند، کار یا کد پیگیری" value="${esc(auditQ)}"></label><span class="sp"></span>
        <button class="btn btn--ghost btn--s" type="button" data-act="aref">${ic('i-refresh', 'ic--s')}تازه کردن</button></div>
      <section class="card rise"><div class="scrollx"><table class="table stack"><thead><tr><th>زمان</th><th>چه کسی</th><th>کار</th><th>روی</th><th>جزئیات</th></tr></thead><tbody id="auditBody">${rows}</tbody></table></div>
      ${rows ? '' : `<div class="card__b">${empty('i-history', 'چیزی ثبت نشده')}</div>`}</section>
      <p class="hint">رمزها، کدهای تأیید و متن پیامک‌ها هیچ‌وقت در این گزارش نوشته نمی‌شوند.</p>`;
  }
  async function loadAudit() {
    const r = await call('get', '/audit');
    if (!r.ok) { toast(errText(r), true); return; }
    auditData = r.audit;
    if (S.route === 'audit') render(false);
  }
  document.addEventListener('input', (e) => { if (e.target.id === 'aq') { auditQ = e.target.value; const tb = $('#auditBody'); if (tb) tb.innerHTML = auditRows(); } });

  /* ---------- پنجره (modal) ---------- */
  let modalCtx = null;
  function openModal(html, ctx = {}) {
    const m = $('#modal');
    modalCtx = ctx;
    m.innerHTML = `<div class="modal__box">${html}</div>`;
    if (m.hidden) { lastFocusModal = document.activeElement; m.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('is-on'))); }
    setTimeout(() => { const f = $('input:not([disabled]):not([type="checkbox"]):not([type="radio"]), textarea, select', m) || $('button', m); if (f) f.focus(); }, 80);
  }
  let lastFocusModal = null;
  function closeModal(instant) {
    const m = $('#modal');
    if (m.hidden || (modalCtx && modalCtx.locked && !instant)) return;
    m.classList.remove('is-on');
    const done = () => { m.hidden = true; m.innerHTML = ''; modalCtx = null; if (S.dirty) refreshView(); };
    if (instant || reduce.matches) done(); else setTimeout(done, 260);
    if (lastFocusModal && document.contains(lastFocusModal)) lastFocusModal.focus({ preventScroll: true });
  }
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });

  function confirmBox(text, okText = 'بله') {
    return new Promise((resolve) => {
      openModal(`<div class="modal__h"><h2 id="mdTitle">${esc(text)}</h2></div><div class="modal__f"><button class="btn btn--ghost" type="button" data-act="cno">نه</button><button class="btn btn--bad" type="button" data-act="cyes">${esc(okText)}</button></div>`, { confirm: resolve });
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

  /* ---------- نوبت تلفنی ---------- */
  let NB = null;
  function openNew() {
    NB = { dept: '', type: '', on: false, sched: null };
    const depts = Object.entries(S.cfg.depts).map(([k, v]) => `<label class="opt ${k}"><input type="radio" name="dept" value="${k}"><span><i></i>${esc(v.t)}</span></label>`).join('');
    const types = S.cfg.types.map((t) => `<label class="opt"><input type="radio" name="type" value="${esc(t)}"><span>${esc(t)}</span></label>`).join('');
    openModal(`<div class="modal__h"><h2 id="mdTitle">نوبت تلفنی</h2><button class="iconbtn" type="button" data-act="mclose" aria-label="بستن">${ic('i-x')}</button></div>
      <form class="modal__b form" id="newForm" novalidate>
        <p class="hint">برای بیماری که تلفنی یا حضوری نوبت می‌خواهد. شماره‌اش پیامکی تأیید نمی‌شود؛ درست بنویسید.</p>
        <div class="row2"><label class="field"><span>نام بیمار</span><input class="input" name="name" maxlength="60" required></label>
          <label class="field"><span>موبایل</span><input class="input input--ltr" name="mobile" inputmode="tel" placeholder="09xxxxxxxxx" required></label></div>
        <div class="field"><span class="flabel">بخش</span><div class="opts">${depts}</div></div>
        <div class="field"><span class="flabel">نوع مراجعه</span><div class="opts">${types}</div></div>
        <label class="field"><span>توضیح (اختیاری)</span><textarea class="textarea" name="note" maxlength="300"></textarea></label>
        <label class="check"><input type="checkbox" name="now"><span>همین حالا روز و ساعت نوبت را هم ثبت کنم<small>وگرنه در صف «تماس گرفته شد» می‌ماند.</small></span></label>
        <div id="nbSched"></div>
        <p class="err" id="mdErr" role="alert"></p>
        <div class="modal__f"><button class="btn btn--ghost" type="button" data-act="mclose">انصراف</button><button class="btn btn--pri" type="submit"><span class="spin"></span><span class="btn__t">ثبت</span></button></div>
      </form>`);
    $$('#newForm .opt').forEach((o) => { if (S.cfg.depts[o.classList[1]]) o.style.setProperty('--c', `var(--${o.classList[1]})`); });
    const form = $('#newForm');
    const drawSched = () => {
      const host = $('#nbSched');
      if (!form.now.checked || !form.dept.value) { host.innerHTML = form.now.checked ? '<p class="hint">اول بخش را انتخاب کنید.</p>' : ''; S.sched = null; return; }
      if (!S.sched || S.sched.dept !== form.dept.value || S.sched.ref) S.sched = { ref: '', dept: form.dept.value, date: '', time: null, doctor: '', sms: S.cfg.sms.appt };
      host.innerHTML = schedHtml(S.sched, { ref: '', dept: form.dept.value });
    };
    form.addEventListener('change', (e) => { if (e.target.name === 'now' || e.target.name === 'dept') drawSched(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { name: form.name.value.trim(), mobile: normMobile(form.mobile.value), dept: form.dept.value, type: form.type.value, note: form.note.value.trim() };
      const err = (t) => { $('#mdErr').textContent = t; };
      if (body.name.length < 2) return err('نام بیمار را بنویسید.');
      if (!/^09\d{9}$/.test(body.mobile)) return err('موبایل باید ۱۱ رقم و با ۰۹ شروع شود.');
      if (!body.dept) return err('بخش را انتخاب کنید.');
      if (!body.type) return err('نوع مراجعه را انتخاب کنید.');
      if (form.now.checked) {
        if (!S.sched || !S.sched.date || S.sched.time == null) return err('روز و ساعت نوبت را انتخاب کنید (یا تیک «همین حالا» را بردارید).');
        Object.assign(body, { date: S.sched.date, time: S.sched.time, doctor: S.sched.doctor, sms: !!S.sched.sms });
      }
      const btn = $('button[type="submit"]', form);
      busy(btn, true);
      const r = await call('post', '/bookings', body);
      busy(btn, false);
      if (!r.ok) return err(errText(r));
      putBooking(r.booking);
      S.sched = null;
      closeModal(true);
      refreshView();
      toast(r.booking.status === 'scheduled' ? `نوبت ${r.booking.name} ثبت شد` : `درخواست ${r.booking.name} ثبت شد`);
      if (r.sms) toast(r.sms.ok ? 'پیامک تأیید نوبت فرستاده شد' : errText(r.sms), !r.sms.ok);
      openDrawer(r.booking.ref);
    });
  }
  $('#newBtn').addEventListener('click', openNew);

  /* ---------- منوی حساب و «بیشتر» ---------- */
  function openMenu(anchor, items) {
    closeMenu();
    const m = document.createElement('div');
    m.className = 'menu';
    m.id = 'menu';
    m.setAttribute('role', 'menu');
    m.innerHTML = items.map((x) => x.href ? `<a role="menuitem" href="${x.href}">${ic(x.ic)}${esc(x.t)}</a>` : `<button role="menuitem" type="button" data-act="${x.act}">${ic(x.ic)}${esc(x.t)}</button>`).join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    const left = Math.min(Math.max(8, r.right - mw), innerWidth - mw - 8);
    const top = r.top - mh - 8 > 8 ? r.top - mh - 8 : r.bottom + 8;
    m.style.setProperty('left', left + 'px');
    m.style.setProperty('top', top + 'px');
    const f = $('a, button', m);
    if (f) f.focus();
  }
  function closeMenu() { const m = $('#menu'); if (m) m.remove(); }
  const acctItems = () => [{ act: 'pass', ic: 'i-key', t: 'تغییر رمز' }, { act: 'logout', ic: 'i-logout', t: 'خروج از پنل' }];

  /* ---------- رویدادها ---------- */
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
      case 'close': closeDrawer(); break;
      case 'reload': S.stale = false; redrawDrawer(); break;
      case 'fst': S.f.st = v; render(false); break;
      case 'fdept': S.f.dept = v; render(false); break;
      case 'cbf': S.cbF = v; render(false); break;
      case 'cb': openCallback(el.dataset.id); break;
      case 'cbs': saveCallback(modalCtx.id, v, el); break;
      case 'st': {
        if (el.dataset.confirm && !(await confirmBox(el.dataset.confirm, 'بله، لغو شود'))) return;
        const msg = { called: 'ثبت شد: تماس گرفته شد', done: 'نوبت انجام شد', 'no-show': 'ثبت شد: بیمار نیامد', cancelled: 'لغو شد' }[v];
        if (await patch(ref, { status: v }, msg, el)) redrawDrawer();
        break;
      }
      case 'noanswer': {
        const b = await patch(ref, { noAnswer: true }, '', el);
        if (b) { toast(`ثبت شد: جواب نداد (بار ${fa(b.attempts)})`); redrawDrawer(); }
        break;
      }
      case 'sched': {
        const b = byRef(ref);
        S.sched = { ref, dept: b.dept, date: b.status === 'scheduled' ? b.date : '', time: b.status === 'scheduled' ? b.time : null, doctor: b.doctor || '', sms: S.cfg.sms.appt };
        redrawDrawer();
        const s = $('#sched');
        if (s) s.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
        break;
      }
      case 'pday': S.sched.date = v; S.sched.time = null; redrawSched(); break;
      case 'ptime': S.sched.time = Number(v); redrawSched(); break;
      case 'pcancel': S.sched = null; redrawDrawer(); break;
      case 'psave': {
        const st = S.sched;
        const b = await patch(ref, { status: 'scheduled', date: st.date, time: st.time, doctor: st.doctor, sms: !!st.sms }, 'نوبت ثبت شد', el);
        if (b) { S.sched = null; redrawDrawer(); }
        break;
      }
      case 'note': {
        const b = await patch(ref, { staffNote: $('#dwNote').value }, 'یادداشت ذخیره شد', el);
        if (b) redrawDrawer();
        break;
      }
      case 'resms': {
        busy(el, true);
        const r = await call('post', '/bookings/' + encodeURIComponent(ref) + '/sms');
        busy(el, false);
        if (r.booking) putBooking(r.booking);
        toast(r.ok ? 'پیامک تأیید نوبت دوباره فرستاده شد' : errText(r), !r.ok);
        redrawDrawer();
        break;
      }
      case 'dlv': {
        busy(el, true);
        const r = await call('post', '/bookings/' + encodeURIComponent(ref) + '/sms/refresh');
        busy(el, false);
        if (r.ok) { putBooking(r.booking); redrawDrawer(); toast('وضعیت رسیدن پیامک‌ها به‌روز شد'); } else toast(errText(r), true);
        break;
      }
      case 'copy':
        try { await navigator.clipboard.writeText(v); toast('شماره کپی شد'); } catch (err) { toast('کپی ممکن نشد؛ شماره را دستی بردارید', true); }
        break;
      case 'wk': S.cal.week = v === '0' ? satOf(today()) : addDays(S.cal.week, Number(v)); S.cal.day = ''; render(false); break;
      case 'cdept': S.cal.dept = v; if (S.cal.doc && S.cfg.doctors[S.cal.doc].k !== v && v) S.cal.doc = ''; render(false); break;
      case 'cday': S.cal.day = v; render(false); break;
      case 'print': window.print(); break;
      case 'smsref': {
        busy(el, true);
        const r = await call('post', '/sms/refresh');
        busy(el, false);
        if (!r.ok) { toast(errText(r), true); break; }
        await loadAll();
        smsData = null; render(false);
        toast('وضعیت رسیدن به‌روز شد');
        break;
      }
      case 'unew': openUser(null); break;
      case 'uedit': openUser(el.dataset.id); break;
      case 'genpass': { const p = $('#userForm input[name="password"]'); p.value = randPass(); p.select(); toast('رمز موقت ساخته شد؛ پیش از ذخیره یادداشتش کنید'); break; }
      case 'aref': auditData = null; render(false); break;
      case 'mclose': closeModal(); break;
      case 'cyes': case 'cno': { const res = modalCtx && modalCtx.confirm; closeModal(true); if (res) res(a === 'cyes'); break; }
      case 'me': { const t = el.closest('.side__me') ? el.closest('.side__me') : el; openMenu(t, acctItems()); break; }
      case 'more': {
        const extra = Object.keys(ROUTES).filter((r) => allowed(r) && !['today', 'requests', 'calendar', 'callbacks'].includes(r)).map((r) => ({ href: '#/' + r, ic: ROUTES[r].ic, t: ROUTES[r].t }));
        openMenu(el, extra.concat(acctItems()));
        break;
      }
      case 'pass': closeMenu(); passwordModal(false); break;
      case 'logout': closeMenu(); closeModal(true); logout(); break;
      default: break;
    }
  });
  document.addEventListener('change', (e) => {
    const a = e.target.dataset.act;
    if (a === 'pdoc') { S.sched.doctor = e.target.value; redrawSched(); }
    else if (a === 'psms') S.sched.sms = e.target.checked;
    else if (a === 'cdoc') { S.cal.doc = e.target.value; render(false); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('#menu')) { closeMenu(); return; }
      if (!$('#modal').hidden) { if (modalCtx && modalCtx.confirm) { const res = modalCtx.confirm; closeModal(true); res(false); } else closeModal(); return; }
      if (!$('#drawer').hidden) { closeDrawer(); return; }
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
    if (e.key === '/' && S.user && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !isDoctor()) { e.preventDefault(); if (mobile.matches) { location.hash = '#/requests'; setTimeout(() => { const q = $('#q2'); if (q) q.focus(); }, 60); } else $('#q').focus(); }
    /* نگه داشتن فوکوس داخل کشو یا پنجره */
    if (e.key === 'Tab') {
      const box = !$('#modal').hidden ? $('#modal') : !$('#drawer').hidden ? $('#drawer') : null;
      if (!box) return;
      const f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea', box).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  $('#scrim').addEventListener('click', () => closeDrawer());
  /* کشیدن کشو به پایین روی گوشی برای بستن */
  (() => {
    let y0 = null, dy = 0;
    const d = $('#drawer');
    d.addEventListener('touchstart', (e) => { if (!mobile.matches || !e.target.closest('.drawer__h')) return; y0 = e.touches[0].clientY; dy = 0; d.style.setProperty('transition', 'none'); }, { passive: true });
    d.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); d.style.setProperty('transform', `translateY(${dy}px)`); }, { passive: true });
    d.addEventListener('touchend', () => { if (y0 == null) return; y0 = null; d.style.removeProperty('transition'); d.style.removeProperty('transform'); if (dy > 110) closeDrawer(); });
  })();
  window.addEventListener('scroll', () => { $('#top').classList.toggle('is-stuck', window.scrollY > 4); }, { passive: true });

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
