/* آزمون‌های پنل پذیرش (بدون شبکه؛ sms.ir ساختگی).  اجرا: cd server && npm test */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');
const T = require('../lib/tehran');

async function setup({ twofa = true } = {}) {
  const sent = [], reports = {};
  const sms = {
    verify: async (mobile, templateId, params) => { sent.push({ mobile, templateId, params }); return sms.fail ? { ok: false, status: 102, message: 'اعتبار کافی نیست' } : { ok: true, status: 1, data: { messageId: 1000 + sent.length, cost: 1 } }; },
    credit: async () => ({ ok: true, status: 1, data: 1510 }),
    report: async (id) => ({ ok: true, status: 1, data: { messageId: id, deliveryState: reports[id] || 3, deliveryDateTime: 1790000000 } })
  };
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sasan-panel-'));
  const cfg = {
    siteDir: path.resolve(__dirname, '..', '..', 'site'), panelDir: path.resolve(__dirname, '..', 'panel'), dataDir,
    trustProxy: false, allowedOrigin: '', hsts: false, adminToken: '', otpSecret: 'y'.repeat(40), panel2fa: twofa,
    sms: { mode: 'sandbox', templateId: 123456, param: 'CODE', confirmTemplateId: 0, receptionTemplateId: 0, receptionMobile: '', apptTemplateId: 777, remindTemplateId: 888, remindHour: 17 }
  };
  const app = createApp(cfg, { sms, log: () => {} });
  const srv = http.createServer(app);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  /* هر «مرورگر» کوکی خودش را دارد */
  const browser = () => {
    let cookie = '';
    const req = async (method, p, body, headers = {}) => {
      const h = Object.assign({}, body ? { 'content-type': 'application/json' } : {}, method !== 'GET' ? { 'x-sasan-panel': '1' } : {}, cookie ? { cookie } : {}, headers);
      const r = await fetch(base + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
      const sc = r.headers.get('set-cookie');
      if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
      const ct = r.headers.get('content-type') || '';
      return { status: r.status, headers: r.headers, setCookie: sc, body: ct.includes('json') ? await r.json() : await r.text() };
    };
    return { req, get cookie() { return cookie; } };
  };
  /* ورود کامل با کد پیامکی */
  const login = async (b, username, password) => {
    const r = await b.req('POST', '/api/panel/login', { username, password });
    if (!twofa || r.status !== 200) return r;
    const code = sent.filter((x) => x.templateId === 123456).pop().params.CODE;
    return b.req('POST', '/api/panel/login/code', { ticket: r.body.ticket, code });
  };
  const users = app.panel.users;
  const made = await users.create({ username: 'admin', name: 'مدیر کلینیک', role: 'admin', mobile: '09120000001', doctor: '' }, 'Clinic-pass-1', { mustChange: false });
  assert.ok(made.user, made.error);
  return { app, srv, base, sent, sms, reports, cfg, users, browser, login, done: () => { app.close(); srv.closeAllConnections(); srv.close(); } };
}

test('ورود پنل: رمز، کد پیامکی، کوکی امن، خروج', async () => {
  const s = await setup();
  const b = s.browser();
  assert.strictEqual((await b.req('GET', '/api/panel/me')).status, 401);
  assert.strictEqual((await b.req('POST', '/api/panel/login', { username: 'admin', password: 'wrong-pass' })).status, 401);
  assert.strictEqual((await b.req('POST', '/api/panel/login', { username: 'nobody', password: 'wrong-pass' })).status, 401);
  const r = await b.req('POST', '/api/panel/login', { username: 'Admin', password: 'Clinic-pass-1' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.step, 'code');
  assert.strictEqual(r.body.mobile, '0912***0001');
  assert.ok(!r.setCookie, 'no session before the code');
  const sms = s.sent.pop();
  assert.strictEqual(sms.mobile, '09120000001');
  assert.ok(!JSON.stringify(r.body).includes(sms.params.CODE), 'code never in the response');
  const wrong = sms.params.CODE === '11111' ? '22222' : '11111';
  const bad = await b.req('POST', '/api/panel/login/code', { ticket: r.body.ticket, code: wrong });
  assert.strictEqual(bad.status, 401); assert.strictEqual(bad.body.left, 4);
  const ok = await b.req('POST', '/api/panel/login/code', { ticket: r.body.ticket, code: sms.params.CODE.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]) });
  assert.strictEqual(ok.status, 200);
  assert.match(ok.setCookie, /^sasan_panel=[\w-]{40,}; Path=\/api\/panel; HttpOnly; SameSite=Strict; Max-Age=43200$/);
  assert.strictEqual(ok.body.user.role, 'admin');
  assert.ok(!('pass' in ok.body.user), 'password hash never leaves the server');
  const me = await b.req('GET', '/api/panel/me');
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.cfg.sms.appt, true);
  assert.strictEqual(me.body.cfg.depts.dental.to, 1200);
  /* بلیت مصرف شده دوباره کار نمی‌کند */
  assert.strictEqual((await b.req('POST', '/api/panel/login/code', { ticket: r.body.ticket, code: sms.params.CODE })).status, 410);
  const saved = JSON.parse(fs.readFileSync(path.join(s.cfg.dataDir, 'users.json'), 'utf8'));
  assert.match(saved[0].pass, /^s1\$/); assert.ok(!JSON.stringify(saved).includes('Clinic-pass-1'));
  const sess = fs.readFileSync(path.join(s.cfg.dataDir, 'sessions.json'), 'utf8');
  assert.ok(!sess.includes(b.cookie.split('=')[1]), 'only session hashes are stored');
  assert.strictEqual((await b.req('POST', '/api/panel/logout')).status, 200);
  assert.strictEqual((await b.req('GET', '/api/panel/me')).status, 401);
  s.done();
});

test('امنیت پنل: سربرگ ضد CSRF، مبدأ دیگر، قفل بعد از ۵ رمز اشتباه', async () => {
  const s = await setup();
  const b = s.browser();
  assert.strictEqual((await b.req('POST', '/api/panel/login', { username: 'admin', password: 'Clinic-pass-1' }, { 'x-sasan-panel': '' })).status, 403);
  assert.strictEqual((await b.req('POST', '/api/panel/login', { username: 'admin', password: 'Clinic-pass-1' }, { origin: 'https://evil.example' })).status, 403);
  for (let i = 0; i < 5; i++) await b.req('POST', '/api/panel/login', { username: 'admin', password: 'nope-nope-' + i });
  const locked = await b.req('POST', '/api/panel/login', { username: 'admin', password: 'Clinic-pass-1' });
  assert.strictEqual(locked.status, 429); assert.strictEqual(locked.body.error, 'locked');
  s.done();
});

test('درخواست‌ها: نوبت تلفنی با پیامک تأیید، تعارض نسخه، جواب نداد، زمان لازم و گذشته', async () => {
  const s = await setup();
  const b = s.browser();
  assert.strictEqual((await s.login(b, 'admin', 'Clinic-pass-1')).status, 200);
  const day = T.addDays(T.today(), 1);
  const c = await b.req('POST', '/api/panel/bookings', { name: 'مریم احمدی', mobile: '09121112233', dept: 'dental', type: 'ویزیت اول', date: day, time: 630, doctor: 'doc-1', sms: true });
  assert.strictEqual(c.status, 200);
  const bk = c.body.booking;
  assert.strictEqual(bk.status, 'scheduled'); assert.strictEqual(bk.source, 'phone');
  assert.strictEqual(c.body.sms.ok, true);
  const appt = s.sent.pop();
  assert.strictEqual(appt.templateId, 777);
  assert.deepStrictEqual(Object.keys(appt.params), ['NAME', 'DEPT', 'DATE', 'TIME']);
  assert.strictEqual(appt.params.TIME, '۱۰:۳۰');
  assert.strictEqual(appt.params.DATE, T.dateLabel(day));
  assert.ok(Object.values(appt.params).every((v) => v.length <= 25));
  assert.strictEqual(bk.sms[0].kind, 'appt'); assert.strictEqual(bk.sms[0].id, 1000 + s.sent.length + 1);
  /* نسخه‌ی قدیمی رد می‌شود */
  const stale = await b.req('PATCH', '/api/panel/bookings/' + bk.ref, { v: 0, staffNote: 'x' });
  assert.strictEqual(stale.status, 409); assert.strictEqual(stale.body.error, 'conflict');
  const na = await b.req('PATCH', '/api/panel/bookings/' + bk.ref, { v: bk.v, noAnswer: true });
  assert.strictEqual(na.body.booking.attempts, 1);
  /* بدون روز و ساعت نمی‌شود «نوبت داده شد» */
  const plain = await b.req('POST', '/api/panel/bookings', { name: 'علی رضایی', mobile: '09125556677', dept: 'medicine', type: 'مشاوره' });
  assert.strictEqual(plain.body.booking.status, 'new');
  const when = await b.req('PATCH', '/api/panel/bookings/' + plain.body.booking.ref, { status: 'scheduled' });
  assert.strictEqual(when.body.error, 'when');
  const past = await b.req('PATCH', '/api/panel/bookings/' + plain.body.booking.ref, { status: 'scheduled', date: T.addDays(T.today(), -2), time: 600 });
  assert.strictEqual(past.body.error, 'past');
  const bad = await b.req('PATCH', '/api/panel/bookings/' + plain.body.booking.ref, { status: 'scheduled', date: '2026-02-30', time: 600 });
  assert.strictEqual(bad.status, 400);
  const sch = await b.req('PATCH', '/api/panel/bookings/' + plain.body.booking.ref, { status: 'scheduled', date: day, time: 1260, doctor: 'doc-3' });
  assert.strictEqual(sch.status, 200);
  assert.deepStrictEqual(sch.body.booking.log.map((e) => e.ev), ['create', 'status', 'when', 'doctor']);
  const list = await b.req('GET', '/api/panel/bookings');
  assert.strictEqual(list.body.bookings.length, 2);
  s.done();
});

test('نقش‌ها: پزشک فقط نوبت‌های خودش را بدون شماره می‌بیند؛ پذیرش به کارکنان دسترسی ندارد؛ رمز موقت', async () => {
  const s = await setup();
  const admin = s.browser();
  await s.login(admin, 'admin', 'Clinic-pass-1');
  const day = T.addDays(T.today(), 1);
  await admin.req('POST', '/api/panel/bookings', { name: 'بیمار یک', mobile: '09121111111', dept: 'dental', type: 'ویزیت اول', date: day, time: 600, doctor: 'doc-1' });
  await admin.req('POST', '/api/panel/bookings', { name: 'بیمار دو', mobile: '09122222222', dept: 'dental', type: 'ویزیت اول', date: day, time: 660, doctor: 'doc-2' });
  await admin.req('POST', '/api/panel/bookings', { name: 'بیمار سه', mobile: '09123333333', dept: 'dental', type: 'مشاوره' });
  const bad = await admin.req('POST', '/api/panel/users', { username: 'dr', name: 'دکتر', role: 'doctor', mobile: '09120000003', password: 'Temp-pass-99' });
  assert.strictEqual(bad.status, 400, 'doctor role needs a doctor');
  const weak = await admin.req('POST', '/api/panel/users', { username: 'nik', name: 'دکتر نیک‌پور', role: 'doctor', doctor: 'doc-1', mobile: '09120000003', password: '12345678' });
  assert.strictEqual(weak.status, 400);
  assert.strictEqual((await admin.req('POST', '/api/panel/users', { username: 'nik', name: 'دکتر نیک‌پور', role: 'doctor', doctor: 'doc-1', mobile: '09120000003', password: 'Temp-pass-99' })).status, 200);
  const rc = await admin.req('POST', '/api/panel/users', { username: 'sara', name: 'سارا پذیرش', role: 'reception', mobile: '09120000002', password: 'Temp-pass-77' });
  assert.strictEqual(rc.body.user.mustChange, true);

  const doc = s.browser();
  await s.login(doc, 'nik', 'Temp-pass-99');
  assert.strictEqual((await doc.req('GET', '/api/panel/bookings')).body.error, 'must-change');
  assert.strictEqual((await doc.req('POST', '/api/panel/password', { current: 'wrong', next: 'Doctor-own-1' })).status, 401);
  assert.strictEqual((await doc.req('POST', '/api/panel/password', { current: 'Temp-pass-99', next: 'Doctor-own-1' })).status, 200);
  const dl = await doc.req('GET', '/api/panel/bookings');
  assert.strictEqual(dl.body.bookings.length, 1);
  assert.strictEqual(dl.body.bookings[0].doctor, 'doc-1');
  assert.strictEqual(dl.body.bookings[0].mobile, '');
  assert.ok(!('sms' in dl.body.bookings[0]));
  assert.strictEqual((await doc.req('PATCH', '/api/panel/bookings/' + dl.body.bookings[0].ref, { status: 'done' })).status, 403);
  assert.strictEqual((await doc.req('GET', '/api/panel/callbacks')).status, 403);

  const rec = s.browser();
  await s.login(rec, 'sara', 'Temp-pass-77');
  await rec.req('POST', '/api/panel/password', { current: 'Temp-pass-77', next: 'Desk-own-pass-2' });
  assert.strictEqual((await rec.req('GET', '/api/panel/bookings')).body.bookings.length, 3);
  assert.strictEqual((await rec.req('GET', '/api/panel/users')).status, 403);
  assert.strictEqual((await rec.req('GET', '/api/panel/audit')).status, 403);
  /* مدیر رمز پذیرش را عوض می‌کند: نشست قبلی پذیرش باطل می‌شود */
  const id = rc.body.user.id;
  assert.strictEqual((await admin.req('PATCH', '/api/panel/users/' + id, { password: 'Reset-pass-55' })).status, 200);
  assert.strictEqual((await rec.req('GET', '/api/panel/me')).status, 401);
  /* آخرین مدیر را نمی‌شود غیرفعال کرد */
  const self = (await admin.req('GET', '/api/panel/me')).body.user.id;
  assert.strictEqual((await admin.req('PATCH', '/api/panel/users/' + self, { active: false })).status, 400);
  const audit = await admin.req('GET', '/api/panel/audit');
  const actions = audit.body.audit.map((e) => e.action);
  for (const a of ['login', 'booking.create', 'user.create', 'password.change', 'user.update']) assert.ok(actions.includes(a), a);
  assert.ok(!JSON.stringify(audit.body).includes('Temp-pass'), 'no passwords in the audit log');
  s.done();
});

test('یادآوری یک روز قبل و گزارش رسیدن پیامک', async () => {
  const s = await setup();
  const b = s.browser();
  await s.login(b, 'admin', 'Clinic-pass-1');
  /* ۱۸:۰۰ به وقت تهران = ۱۴:۳۰ UTC */
  const now = new Date(Date.UTC(2030, 0, 10, 14, 30));
  const tomorrow = T.addDays(T.today(now), 1);
  s.app.store.list.push({ ref: 'SS-11111', status: 'scheduled', dept: 'beauty', type: 'مشاوره', name: 'نگار', mobile: '09124444444', date: tomorrow, time: 900, createdAt: now.toISOString() });
  s.app.store.list.push({ ref: 'SS-22222', status: 'cancelled', dept: 'beauty', type: 'مشاوره', name: 'لغو', mobile: '09125555555', date: tomorrow, time: 900, createdAt: now.toISOString() });
  const early = new Date(Date.UTC(2030, 0, 10, 9, 0));
  assert.strictEqual(await s.app.panel.remindTick(early), 0, 'not before the reminder hour');
  s.sms.fail = true;
  assert.strictEqual(await s.app.panel.remindTick(now), 1);
  assert.ok(!s.app.store.list[0].remindedAt, 'failed reminder is retried');
  s.sms.fail = false;
  assert.strictEqual(await s.app.panel.remindTick(now), 1);
  const rem = s.sent.pop();
  assert.strictEqual(rem.templateId, 888); assert.strictEqual(rem.mobile, '09124444444');
  assert.strictEqual(await s.app.panel.remindTick(now), 0, 'only once');
  const id = s.app.store.list[0].sms.find((e) => e.ok).id;
  s.reports[id] = 1;
  const r = await b.req('POST', '/api/panel/bookings/SS-11111/sms/refresh');
  assert.strictEqual(r.body.booking.sms.find((e) => e.id === id).dlv, 1);
  const page = await b.req('GET', '/api/panel/sms');
  assert.strictEqual(page.body.credit, 1510);
  assert.strictEqual(page.body.log.length, 2);
  assert.deepStrictEqual(page.body.templates, { otp: true, received: false, reception: false, appt: true, remind: true });
  s.done();
});

test('درخواست تماس و صفحه‌ی پنل با CSP سخت‌گیر', async () => {
  const s = await setup({ twofa: false });
  const b = s.browser();
  assert.strictEqual((await s.login(b, 'admin', 'Clinic-pass-1')).status, 200, 'PANEL_2FA=0 logs in with the password only');
  await fetch(s.base + '/api/callback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'سارا', mobile: '09121234567', topic: 'نوبت' }) });
  const cb = (await b.req('GET', '/api/panel/callbacks')).body.callbacks[0];
  const up = await b.req('PATCH', '/api/panel/callbacks/' + cb.id, { status: 'called', v: 0 });
  assert.strictEqual(up.body.callback.status, 'called');
  assert.strictEqual((await b.req('PATCH', '/api/panel/callbacks/' + cb.id, { status: 'x' })).status, 400);
  const red = await b.req('GET', '/panel');
  assert.strictEqual(red.status, 301); assert.strictEqual(red.headers.get('location'), '/panel/');
  const pg = await b.req('GET', '/panel/');
  assert.strictEqual(pg.status, 200);
  const csp = pg.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self';/); assert.ok(!csp.includes('unsafe-inline'));
  assert.match(csp, /frame-ancestors 'none'/);
  assert.strictEqual(pg.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.strictEqual(pg.headers.get('cache-control'), 'no-store');
  assert.match(pg.body, /<meta name="sasan-api" content="\/api">/);
  assert.strictEqual((await b.req('GET', '/panel/../server.js')).status, 404);
  s.done();
});
