/* ==========================================================================
   API پنل پذیرش (ویزیتور) — همه زیر /api/panel/
   ورود:
   - POST login {username, password} → اگر کد پیامکی روشن است: { step: 'code', ticket }
   - POST login/code {ticket, code} و POST login/resend {ticket}
   - نشست با کوکی HttpOnly و SameSite=Strict؛ هر درخواست غیر GET سربرگ x-sasan-panel: 1 و مبدأ همین سایت را لازم دارد
   نقش: فقط «پذیرش»، با همه‌ی کارها (درخواست‌ها، تقویم، تماس‌ها، پیامک، کارکنان، گزارش کارها، مقاله‌ها و آمار بازدید)
   مخاطبان: GET contacts، PATCH/DELETE contacts/:mobile، POST contacts/exported (ثبت خروجی در گزارش کارها)
   مقاله‌ها: GET/POST articles، GET/PUT/DELETE articles/:slug، POST articles/:slug/hide، POST articles/upload (lib/cms.js)
   پیامک: تأیید نوبت از پنل و یادآوری خودکار یک روز قبل (قالب نوع ۲، پارامترها NAME, DEPT, DATE, TIME)،
   گزارش رسیدن هر پیامک و اعتبار پنل sms.ir
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const B = require('./bookings');
const T = require('./tehran');
const { UserStore, ROLES, validateUser, pub, checkPass } = require('./users');
const { Sessions } = require('./sessions');
const { Audit } = require('./audit');
const { OtpStore, TTL, RESEND } = require('./otp');
const { DELIVERY_FINAL } = require('./smsir');
const A = require('./articles');

const COOKIE = 'sasan_panel';
const PERMS = ['write', 'phone', 'callbacks', 'sms', 'users', 'audit', 'stats', 'articles', 'contacts'];
const can = (u, perm) => !!u && PERMS.includes(perm);
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const mask = (m) => m.slice(0, 4) + '***' + m.slice(-4);
const digits = (s) => String(s || '').replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
const CB_STATUSES = ['new', 'called', 'done'];
/* وضعیت‌هایی که روز و ساعت لازم دارند */
const TIMED = ['scheduled', 'arrived'];

function createPanel(ctx) {
  const { cfg, store, sms, log, lim, json, readBody, ipOf, originOk } = ctx;
  const users = ctx.users || new UserStore(cfg.dataDir);
  const sessions = ctx.sessions || new Sessions(cfg.dataDir);
  const audit = new Audit(cfg.dataDir);
  const otp = new OtpStore(cfg.otpSecret);
  const tickets = new Map();
  const twofa = cfg.panel2fa !== false;
  let credit = null;
  let reminding = false;

  /* ---------- کوکی و نشست ---------- */
  const cookieOf = (req) => {
    const c = String(req.headers.cookie || '').split(/;\s*/).find((x) => x.startsWith(COOKIE + '='));
    return c ? c.slice(COOKIE.length + 1) : '';
  };
  const secure = (req) => cfg.hsts || !!req.socket.encrypted || (cfg.trustProxy && req.headers['x-forwarded-proto'] === 'https');
  const setCookie = (req, res, token, maxAge) => res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; Path=/api/panel; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure(req) ? '; Secure' : ''}`);
  function auth(req) {
    const s = sessions.get(cookieOf(req));
    if (!s) return null;
    const u = users.byId(s.uid);
    /* کاربر غیرفعال، حذف‌شده، یا رمزش بعد از این ورود عوض شده */
    if (!u || u.active === false || (u.passAt && s.at < Date.parse(u.passAt))) { sessions.dropUser(s.uid); return null; }
    return { u, s };
  }
  async function startSession(req, res, u) {
    const token = sessions.create(u.id);
    setCookie(req, res, token, Math.floor(sessions.max / 1000));
    await users.touchLogin(u.id);
    audit.add(u, 'login', u.username);
    return json(res, 200, { ok: true, user: pub(u) });
  }

  /* ---------- ورود ---------- */
  async function sendLoginCode(u) {
    const key = 'panel:' + u.id;
    const w = otp.wait(key);
    if (w) return { wait: w };
    const lw = lim.take('plogin:sms:' + u.id, 8, 3600e3);
    if (lw) return { error: 'rate', wait: lw };
    const code = otp.issue(key);
    const r = await sms.verify(u.mobile, cfg.sms.templateId, { [cfg.sms.param]: code });
    if (!r.ok) { otp.drop(key); log('panel login sms failed', r.status, r.message); return { error: 'sms' }; }
    if (cfg.sms.mode === 'sandbox') log(`[sandbox] کد ورود پنل ${u.username}: ${code}`);
    return { wait: RESEND / 1000 };
  }
  async function login(req, res) {
    const ip = ipOf(req);
    const w = lim.take('plogin:ip:' + ip, 20, 600e3);
    if (w) return json(res, 429, { ok: false, error: 'rate', wait: w });
    const body = await readBody(req, 1024);
    const name = String(body.username || '').trim().toLowerCase().slice(0, 40);
    const lock = lim.peek('plogin:fail:' + name, 5, 900e3);
    if (lock) return json(res, 429, { ok: false, error: 'locked', wait: lock });
    const u = await users.login(name, String(body.password || '').slice(0, 200));
    if (!u) {
      lim.take('plogin:fail:' + name, 5, 900e3);
      audit.add(null, 'login.fail', name);
      return json(res, 401, { ok: false, error: 'auth' });
    }
    if (!twofa) return startSession(req, res, u);
    const r = await sendLoginCode(u);
    if (r.error) return json(res, r.error === 'rate' ? 429 : 502, { ok: false, error: r.error, wait: r.wait });
    const ticket = crypto.randomBytes(24).toString('base64url');
    tickets.set(sha(ticket), { uid: u.id, at: Date.now() });
    return json(res, 200, { ok: true, step: 'code', ticket, mobile: mask(u.mobile), ttl: TTL / 1000, wait: r.wait });
  }
  const ticketOf = (t) => {
    const e = tickets.get(sha(t));
    if (!e || Date.now() - e.at > 10 * 60e3) return null;
    return e;
  };
  async function loginCode(req, res) {
    const w = lim.take('pcode:ip:' + ipOf(req), 30, 600e3);
    if (w) return json(res, 429, { ok: false, error: 'rate', wait: w });
    const body = await readBody(req, 1024);
    const t = ticketOf(body.ticket);
    const u = t && users.byId(t.uid);
    if (!u || u.active === false) return json(res, 410, { ok: false, error: 'expired' });
    const c = otp.check('panel:' + u.id, digits(body.code));
    if (c.r === 'ok') { tickets.delete(sha(body.ticket)); return startSession(req, res, u); }
    if (c.r === 'code') return json(res, 401, { ok: false, error: 'code', left: c.left });
    if (c.r === 'attempts') { tickets.delete(sha(body.ticket)); return json(res, 429, { ok: false, error: 'attempts' }); }
    return json(res, 410, { ok: false, error: 'expired' });
  }
  async function loginResend(req, res) {
    const body = await readBody(req, 1024);
    const t = ticketOf(body.ticket);
    const u = t && users.byId(t.uid);
    if (!u || u.active === false) return json(res, 410, { ok: false, error: 'expired' });
    const r = await sendLoginCode(u);
    if (r.error) return json(res, r.error === 'rate' ? 429 : 502, { ok: false, error: r.error, wait: r.wait });
    return json(res, 200, { ok: true, wait: r.wait, ttl: TTL / 1000 });
  }

  /* ---------- پیامک بیمار ---------- */
  function pushSms(x, kind, r, by) {
    x.sms = (x.sms || []).concat([{
      at: new Date().toISOString(), kind, ok: !!r.ok,
      id: r.ok && r.data && r.data.messageId ? r.data.messageId : null,
      err: r.ok ? '' : String(r.message || '').slice(0, 120), dlv: null
    }]).slice(-20);
    B.addLog(x, by || 'سیستم', 'sms', { kind, ok: !!r.ok });
  }
  /* ثبت پیامک «درخواست ثبت شد» که سایت هنگام ثبت درخواست می‌فرستد */
  const recordSms = (ref, kind, r) => store.mutate(ref, (x) => pushSms(x, kind, r, 'سیستم'), { bump: false });
  async function sendApptSms(b, kind, by) {
    const tid = kind === 'remind' ? cfg.sms.remindTemplateId : cfg.sms.apptTemplateId;
    if (!tid) return { ok: false, error: 'template' };
    if (!b.date || b.time === '' || b.time == null) return { ok: false, error: 'when' };
    const r = await sms.verify(b.mobile, tid, { NAME: b.name, DEPT: B.DEPT[b.dept].t, DATE: T.dateLabel(b.date), TIME: T.timeLabel(b.time) });
    await store.mutate(b.ref, (x) => pushSms(x, kind, r, by && by.name), { bump: false });
    if (!r.ok) log(kind + ' sms failed', r.status, r.message);
    return { ok: r.ok, error: r.ok ? '' : 'sms', message: r.ok ? '' : r.message };
  }
  async function refreshDelivery(list) {
    const jobs = [];
    for (const b of list) for (const e of b.sms || []) if (e.ok && e.id && !DELIVERY_FINAL.includes(e.dlv)) jobs.push([b.ref, e.id]);
    const picked = jobs.slice(-20);
    const res = await Promise.all(picked.map(([ref, id]) => sms.report(id).then((r) => [ref, id, r])));
    for (const [ref, id, r] of res) {
      if (!r.ok || !r.data) continue;
      await store.mutate(ref, (x) => {
        const e = (x.sms || []).find((s) => s.id === id);
        if (!e) return;
        e.dlv = r.data.deliveryState == null ? null : Number(r.data.deliveryState);
        e.dlvAt = r.data.deliveryDateTime ? new Date(r.data.deliveryDateTime * 1000).toISOString() : null;
      }, { bump: false });
    }
    return picked.length;
  }
  /* یادآوری یک روز قبل، از ساعت SMSIR_REMIND_HOUR تا ۲۱:۳۰ به وقت تهران؛ هر نوبت حداکثر ۳ بار تلاش */
  async function remindTick(now = new Date()) {
    if (!cfg.sms.remindTemplateId || reminding) return 0;
    const m = T.minutes(now);
    if (m < cfg.sms.remindHour * 60 || m > 21 * 60 + 30) return 0;
    const tomorrow = T.addDays(T.today(now), 1);
    const due = store.list.filter((b) => b.status === 'scheduled' && b.date === tomorrow && !b.remindedAt && (b.remindTries || 0) < 3);
    reminding = true;
    try {
      for (const b of due) {
        await store.mutate(b.ref, (x) => { x.remindedAt = now.toISOString(); x.remindTries = (x.remindTries || 0) + 1; }, { bump: false });
        const r = await sendApptSms(b, 'remind', null);
        if (!r.ok) await store.mutate(b.ref, (x) => { delete x.remindedAt; }, { bump: false });
      }
    } finally { reminding = false; }
    return due.length;
  }
  const timer = setInterval(() => {
    for (const [k, e] of tickets) if (Date.now() - e.at > 10 * 60e3) tickets.delete(k);
    otp.sweep(); sessions.sweep();
    remindTick().catch((e) => log('remind error', e && e.message));
  }, 5 * 60e3);
  timer.unref();

  /* ---------- داده‌ها (پنل یک نقش دارد: پذیرش، با دسترسی کامل) ---------- */
  const visible = () => store.list;
  const view = (u, b) => b;
  const config = (u) => ({
    depts: B.DEPT, doctors: B.DOCTORS, types: B.TYPES, statuses: B.STATUSES, roles: ROLES,
    sms: { mode: cfg.sms.mode, appt: !!cfg.sms.apptTemplateId, remind: !!cfg.sms.remindTemplateId, received: !!cfg.sms.confirmTemplateId, remindHour: cfg.sms.remindHour },
    twofa, today: T.today(), now: Date.now(), can: PERMS
  });

  /* ---------- درخواست‌ها ---------- */
  function scheduleFrom(body, b) {
    const p = B.validatePatch({ date: body.date, time: body.time, doctor: body.doctor || '' }, b);
    if (!p || !p.date || p.time === '') return null;
    return p;
  }
  async function createBooking(req, res, u) {
    const body = await readBody(req, 4096);
    const v = B.validate(body);
    if (!v) return json(res, 400, { ok: false, error: 'input' });
    let sched = null;
    if (body.date) {
      sched = scheduleFrom(body, v);
      if (!sched) return json(res, 400, { ok: false, error: 'when' });
      if (sched.date < T.today()) return json(res, 400, { ok: false, error: 'past' });
    }
    const b0 = await store.add(Object.assign(v, { source: 'phone', createdBy: u.name }));
    const b = await store.mutate(b0.ref, (x) => {
      B.addLog(x, u.name, 'create', 'phone');
      if (sched) { Object.assign(x, sched, { status: 'scheduled' }); B.addLog(x, u.name, 'when', { date: x.date, time: x.time }); }
    });
    audit.add(u, 'booking.create', b.ref, B.DEPT[b.dept].t + (sched ? ' · نوبت ' + sched.date : ''));
    if (ctx.contacts) ctx.contacts.note(b.mobile, { source: 'phone', name: b.name, dept: b.dept });
    const s = sched && body.sms ? await sendApptSms(b, 'appt', u) : null;
    return json(res, 200, { ok: true, booking: store.list.find((x) => x.ref === b.ref), sms: s });
  }
  async function patchBooking(req, res, u, ref) {
    const cur = store.list.find((x) => x.ref === ref);
    if (!cur) return json(res, 404, { ok: false, error: 'not-found' });
    const body = await readBody(req, 4096);
    if (body.v !== undefined && Number(body.v) !== (cur.v || 0)) return json(res, 409, { ok: false, error: 'conflict', booking: cur });
    const patch = body.noAnswer ? {} : B.validatePatch(body, cur);
    if (!patch) return json(res, 400, { ok: false, error: 'input' });
    const next = Object.assign({}, cur, patch);
    if (TIMED.includes(next.status)) {
      if (!next.date || next.time === '' || next.time == null) return json(res, 400, { ok: false, error: 'when' });
      if (next.status === 'scheduled' && patch.date && patch.date !== cur.date && patch.date < T.today()) return json(res, 400, { ok: false, error: 'past' });
    }
    const changes = [];
    const b = await store.mutate(ref, (x) => {
      const before = { status: x.status, date: x.date, time: x.time, doctor: x.doctor || '', staffNote: x.staffNote || '' };
      Object.assign(x, patch);
      if (body.noAnswer) { x.attempts = (x.attempts || 0) + 1; B.addLog(x, u.name, 'noanswer', x.attempts); changes.push('جواب نداد'); }
      if (patch.status && patch.status !== before.status) { B.addLog(x, u.name, 'status', patch.status); changes.push('وضعیت ' + patch.status); }
      const when = (patch.date !== undefined && patch.date !== before.date) || (patch.time !== undefined && patch.time !== before.time);
      if (when && x.date) { B.addLog(x, u.name, 'when', { date: x.date, time: x.time }); changes.push('زمان ' + x.date); }
      if (patch.doctor !== undefined && patch.doctor !== before.doctor) { B.addLog(x, u.name, 'doctor', patch.doctor); changes.push('پزشک'); }
      if (patch.staffNote !== undefined && patch.staffNote !== before.staffNote) { B.addLog(x, u.name, 'note', ''); changes.push('یادداشت'); }
      /* زمان تازه = یادآوری تازه */
      if (when || (patch.status === 'scheduled' && before.status !== 'scheduled')) { delete x.remindedAt; x.remindTries = 0; }
    });
    if (changes.length) audit.add(u, 'booking.update', ref, changes.join('، '));
    const s = body.sms && b.status === 'scheduled' ? await sendApptSms(b, 'appt', u) : null;
    return json(res, 200, { ok: true, booking: store.list.find((x) => x.ref === ref), sms: s });
  }

  /* عنوان صفحه‌های سایت برای آمار بازدید (از <title> خود فایل؛ بخش «| ساسان کلینیک» حذف می‌شود) */
  const titles = new Map();
  function pageTitle(p) {
    if (titles.has(p)) return titles.get(p);
    let t = '';
    try {
      const name = p === '/' ? 'index.html' : p.slice(1);
      const ov = ctx.cms && ctx.cms.page(name);
      const m = /<title>([^<]*)<\/title>/.exec(typeof ov === 'string' ? ov : fs.readFileSync(path.join(cfg.siteDir, name), 'utf8'));
      t = m ? m[1].replace(/&amp;/g, '&').split('|')[0].trim() : '';
    } catch (e) { /* صفحه‌ای که دیگر نیست */ }
    if (p === '/') t = 'صفحه‌ی اصلی';
    titles.set(p, t);
    return t;
  }

  /* ---------- مقاله‌ها ---------- */
  async function articles(req, res, u, p, m) {
    const cms = ctx.cms;
    const fail = (r) => json(res, r.code || 400, { ok: false, error: r.code === 404 ? 'not-found' : r.code === 409 ? 'exists' : 'input', message: r.error });
    const done = (r, action, detail) => { titles.clear(); if (action) audit.add(u, action, r.slug, detail); };
    if (p === '/api/panel/articles') {
      if (m === 'GET') return json(res, 200, { ok: true, articles: cms.list(), cats: Object.fromEntries(A.ORDER.map((k) => [k, A.CATS[k].name])), site: A.SITE_URL });
      if (m === 'POST') {
        const body = await readBody(req, 400e3);
        const r = await cms.save(body.slug, body, u, { create: true });
        if (r.error) return fail(r);
        done(r.article, 'article.create', r.article.title + (r.article.hidden ? ' · پیش‌نویس' : ''));
        return json(res, 200, { ok: true, article: r.article });
      }
      return json(res, 405, { ok: false, error: 'method' });
    }
    if (p === '/api/panel/articles/upload' && m === 'POST') {
      const lw = lim.take('pup:' + u.id, 80, 3600e3);
      if (lw) return json(res, 429, { ok: false, error: 'rate', wait: lw });
      const body = await readBody(req, 12e6);
      const r = await cms.saveUpload(body.files);
      if (r.error) return fail(r);
      return json(res, 200, { ok: true, base: r.base, url: r.url });
    }
    const mm = /^\/api\/panel\/articles\/([a-z0-9-]{1,60})(\/hide)?$/.exec(p);
    if (!mm) return json(res, 404, { ok: false, error: 'not-found' });
    const slug = mm[1];
    if (mm[2]) {
      if (m !== 'POST') return json(res, 405, { ok: false, error: 'method' });
      const body = await readBody(req, 512);
      const r = await cms.setHidden(slug, !!body.hidden);
      if (r.error) return fail(r);
      done(r.article, body.hidden ? 'article.hide' : 'article.show', r.article.title);
      return json(res, 200, { ok: true, article: r.article });
    }
    if (m === 'GET') { const a = cms.get(slug); return a ? json(res, 200, { ok: true, article: a }) : json(res, 404, { ok: false, error: 'not-found' }); }
    if (m === 'PUT') {
      const body = await readBody(req, 400e3);
      const r = await cms.save(slug, body, u);
      if (r.error) return fail(r);
      done(r.article, 'article.update', r.article.title + (r.article.hidden ? ' · پیش‌نویس' : ''));
      return json(res, 200, { ok: true, article: r.article });
    }
    if (m === 'DELETE') {
      const before = cms.get(slug);
      const r = await cms.remove(slug);
      if (r.error) return fail(r);
      done({ slug }, r.reverted ? 'article.revert' : 'article.delete', before ? before.title : '');
      return json(res, 200, { ok: true, removed: r.removed, reverted: r.reverted, article: r.article });
    }
    return json(res, 405, { ok: false, error: 'method' });
  }

  /* ---------- مسیرها ---------- */
  async function handle(req, res, url) {
    const p = url.pathname, m = req.method;
    if (m !== 'GET' && (!originOk(req) || req.headers['x-sasan-panel'] !== '1')) return json(res, 403, { ok: false, error: 'origin' });
    if (m === 'POST' && p === '/api/panel/login') return login(req, res);
    if (m === 'POST' && p === '/api/panel/login/code') return loginCode(req, res);
    if (m === 'POST' && p === '/api/panel/login/resend') return loginResend(req, res);

    const a = auth(req);
    if (!a) return json(res, 401, { ok: false, error: 'auth' });
    const { u } = a;
    if (m === 'POST' && p === '/api/panel/logout') {
      sessions.drop(cookieOf(req));
      setCookie(req, res, '', 0);
      audit.add(u, 'logout', u.username);
      return json(res, 200, { ok: true });
    }
    if (m === 'GET' && p === '/api/panel/me') return json(res, 200, { ok: true, user: pub(u), cfg: config(u) });
    if (m === 'POST' && p === '/api/panel/password') {
      const body = await readBody(req, 1024);
      const lw = lim.peek('ppass:' + u.id, 5, 900e3);
      if (lw) return json(res, 429, { ok: false, error: 'rate', wait: lw });
      if (!(await checkPass(String(body.current || '').slice(0, 200), u.pass))) { lim.take('ppass:' + u.id, 5, 900e3); return json(res, 401, { ok: false, error: 'current' }); }
      const r = await users.setPassword(u.id, String(body.next || '').slice(0, 200), { mustChange: false });
      if (r.error) return json(res, 400, { ok: false, error: 'weak', message: r.error });
      /* همه‌ی نشست‌های قبلی باطل؛ همین مرورگر نشست تازه می‌گیرد */
      sessions.dropUser(u.id);
      setCookie(req, res, sessions.create(u.id), Math.floor(sessions.max / 1000));
      audit.add(u, 'password.change', u.username);
      return json(res, 200, { ok: true, user: pub(r.user) });
    }
    if (u.mustChange) return json(res, 403, { ok: false, error: 'must-change' });
    const deny = () => json(res, 403, { ok: false, error: 'forbidden' });

    if (p === '/api/panel/bookings') {
      if (m === 'GET') return json(res, 200, { ok: true, bookings: visible(u).map((b) => view(u, b)), today: T.today() });
      if (m === 'POST') return can(u, 'write') ? createBooking(req, res, u) : deny();
    }
    let mm = /^\/api\/panel\/bookings\/([^/]+)(\/sms(?:\/refresh)?)?$/.exec(p);
    if (mm) {
      if (!can(u, 'write')) return deny();
      const ref = decodeURIComponent(mm[1]);
      if (m === 'PATCH' && !mm[2]) return patchBooking(req, res, u, ref);
      const b = store.list.find((x) => x.ref === ref);
      if (!b) return json(res, 404, { ok: false, error: 'not-found' });
      if (m === 'POST' && mm[2] === '/sms') {
        const w = lim.take('psms:' + u.id, 60, 3600e3);
        if (w) return json(res, 429, { ok: false, error: 'rate', wait: w });
        if (b.status !== 'scheduled') return json(res, 400, { ok: false, error: 'when' });
        const r = await sendApptSms(b, 'appt', u);
        audit.add(u, 'sms.appt', ref, r.ok ? 'فرستاده شد' : 'ناموفق');
        return json(res, r.error === 'template' || r.error === 'when' ? 400 : 200, { ok: r.ok, error: r.error, message: r.message, booking: store.list.find((x) => x.ref === ref) });
      }
      if (m === 'POST' && mm[2] === '/sms/refresh') {
        await refreshDelivery([b]);
        return json(res, 200, { ok: true, booking: store.list.find((x) => x.ref === ref) });
      }
    }

    if (p === '/api/panel/callbacks' && m === 'GET') return can(u, 'callbacks') ? json(res, 200, { ok: true, callbacks: store.callbacks }) : deny();
    mm = /^\/api\/panel\/callbacks\/([^/]+)$/.exec(p);
    if (mm && m === 'PATCH') {
      if (!can(u, 'callbacks')) return deny();
      const id = decodeURIComponent(mm[1]);
      const cur = store.callbacks.find((x) => x.id === id);
      if (!cur) return json(res, 404, { ok: false, error: 'not-found' });
      const body = await readBody(req, 2048);
      if (body.v !== undefined && Number(body.v) !== (cur.v || 0)) return json(res, 409, { ok: false, error: 'conflict', callback: cur });
      if (body.status !== undefined && !CB_STATUSES.includes(body.status)) return json(res, 400, { ok: false, error: 'input' });
      const c = await store.mutateCallback(id, (x) => {
        if (body.status !== undefined && body.status !== x.status) { x.status = body.status; B.addLog(x, u.name, 'status', body.status); }
        if (body.staffNote !== undefined) { x.staffNote = B.clean(body.staffNote, 300); B.addLog(x, u.name, 'note', ''); }
      });
      audit.add(u, 'callback.update', mask(c.mobile), body.status || 'یادداشت');
      return json(res, 200, { ok: true, callback: c });
    }

    if (p === '/api/panel/sms' && m === 'GET') {
      if (!can(u, 'sms')) return deny();
      if (!credit || Date.now() - credit.at > 60e3) {
        const r = await sms.credit();
        credit = { at: Date.now(), ok: r.ok, value: r.ok ? r.data : null, message: r.ok ? '' : r.message };
      }
      const logList = [];
      for (const b of store.list) for (const e of b.sms || []) logList.push(Object.assign({ ref: b.ref, name: b.name, dept: b.dept }, e));
      logList.sort((a, b) => (a.at < b.at ? 1 : -1));
      return json(res, 200, {
        ok: true, mode: cfg.sms.mode, credit: credit.value, creditError: credit.message, remindHour: cfg.sms.remindHour,
        templates: { otp: !!cfg.sms.templateId, received: !!cfg.sms.confirmTemplateId, reception: !!cfg.sms.receptionTemplateId, appt: !!cfg.sms.apptTemplateId, remind: !!cfg.sms.remindTemplateId },
        log: logList.slice(0, 300)
      });
    }
    if (p === '/api/panel/sms/refresh' && m === 'POST') {
      if (!can(u, 'sms')) return deny();
      const w = lim.take('psmsr:' + u.id, 30, 600e3);
      if (w) return json(res, 429, { ok: false, error: 'rate', wait: w });
      return json(res, 200, { ok: true, checked: await refreshDelivery(store.list) });
    }

    if (p === '/api/panel/users') {
      if (!can(u, 'users')) return deny();
      if (m === 'GET') return json(res, 200, { ok: true, users: users.all().map(pub) });
      if (m === 'POST') {
        const body = await readBody(req, 2048);
        const { v, error } = validateUser(body);
        if (error) return json(res, 400, { ok: false, error: 'input', message: error });
        const r = await users.create(v, String(body.password || ''), { mustChange: true });
        if (r.error) return json(res, 400, { ok: false, error: 'input', message: r.error });
        audit.add(u, 'user.create', v.username, v.name);
        return json(res, 200, { ok: true, user: pub(r.user) });
      }
    }
    mm = /^\/api\/panel\/users\/([^/]+)$/.exec(p);
    if (mm && m === 'PATCH') {
      if (!can(u, 'users')) return deny();
      const t = users.byId(decodeURIComponent(mm[1]));
      if (!t) return json(res, 404, { ok: false, error: 'not-found' });
      const body = await readBody(req, 2048);
      const { v, error } = validateUser(body, { partial: true, current: t });
      if (error) return json(res, 400, { ok: false, error: 'input', message: error });
      const deactivates = t.active !== false && v.active === false;
      if (t.id === u.id && deactivates) return json(res, 400, { ok: false, error: 'input', message: 'حساب خودتان را نمی‌توانید غیرفعال کنید' });
      if (deactivates && users.activeCount() <= 1) return json(res, 400, { ok: false, error: 'input', message: 'دست‌کم یک حساب فعال لازم است' });
      if (body.password && t.id === u.id) return json(res, 400, { ok: false, error: 'input', message: 'رمز خودتان را از «تغییر رمز» عوض کنید' });
      if (body.password) {
        const pr = await users.setPassword(t.id, String(body.password), { mustChange: true });
        if (pr.error) return json(res, 400, { ok: false, error: 'input', message: pr.error });
      }
      const r = await users.update(t.id, v);
      if (r.error) return json(res, 400, { ok: false, error: 'input', message: r.error });
      if (v.active === false || body.password) sessions.dropUser(t.id);
      audit.add(u, 'user.update', t.username, [v.active === false && 'غیرفعال', v.active === true && 'فعال', body.password && 'رمز تازه'].filter(Boolean).join('، ') || 'مشخصات');
      return json(res, 200, { ok: true, user: pub(r.user) });
    }
    if (p === '/api/panel/contacts' || p.startsWith('/api/panel/contacts/')) {
      const C = ctx.contacts;
      if (!can(u, 'contacts') || !C) return deny();
      if (p === '/api/panel/contacts' && m === 'GET') return json(res, 200, { ok: true, contacts: C.list() });
      if (p === '/api/panel/contacts/exported' && m === 'POST') {
        const body = await readBody(req, 512);
        audit.add(u, 'contacts.export', '', `${Math.max(0, Number(body.count) || 0)} شماره · ${body.kind === 'txt' ? 'فقط شماره‌ها' : body.kind === 'copy' ? 'کپی' : 'اکسل'}`);
        return json(res, 200, { ok: true });
      }
      const cm = /^\/api\/panel\/contacts\/(\d{11})$/.exec(p);
      if (!cm) return json(res, 404, { ok: false, error: 'not-found' });
      if (m === 'PATCH') {
        const body = await readBody(req, 1024);
        const c = C.update(cm[1], body);
        if (!c) return json(res, 404, { ok: false, error: 'not-found' });
        if (body.optout !== undefined) audit.add(u, 'contact.update', mask(c.mobile), c.optout ? 'لغو اطلاع‌رسانی' : 'اطلاع‌رسانی دوباره');
        return json(res, 200, { ok: true, contact: c });
      }
      if (m === 'DELETE') {
        if (!C.remove(cm[1])) return json(res, 404, { ok: false, error: 'not-found' });
        audit.add(u, 'contact.delete', mask(cm[1]), '');
        return json(res, 200, { ok: true });
      }
      return json(res, 405, { ok: false, error: 'method' });
    }
    if (p === '/api/panel/articles' || p.startsWith('/api/panel/articles/')) {
      if (!can(u, 'articles') || !ctx.cms) return deny();
      return articles(req, res, u, p, m);
    }
    if (p === '/api/panel/stats' && m === 'GET') {
      if (!can(u, 'stats') || !ctx.stats) return deny();
      const sum = ctx.stats.summary(Number(url.searchParams.get('days')) || 30);
      sum.pages.forEach((x) => { x.t = pageTitle(x.k); });
      return json(res, 200, Object.assign({ ok: true }, sum));
    }
    if (p === '/api/panel/audit' && m === 'GET') {
      if (!can(u, 'audit')) return deny();
      return json(res, 200, { ok: true, audit: await audit.recent(Math.min(1000, Number(url.searchParams.get('limit')) || 300)) });
    }
    return json(res, 404, { ok: false, error: 'not-found' });
  }

  return { handle, recordSms, remindTick, users, sessions, audit, close: () => clearInterval(timer) };
}

module.exports = { createPanel, COOKIE };
