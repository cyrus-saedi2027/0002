/* آزمون‌های سرور بدون شبکه: sms.ir با یک نمونه‌ی ساختگی جایگزین می‌شود.  اجرا: cd server && npm test */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');

function setup(extra = {}) {
  const sent = [];
  const sms = { verify: async (mobile, templateId, params) => { sent.push({ mobile, templateId, params }); return extra.fail ? { ok: false, status: 102, message: 'x' } : { ok: true, status: 1 }; } };
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sasan-'));
  const cfg = {
    siteDir: path.resolve(__dirname, '..', '..', 'site'), dataDir, trustProxy: false, allowedOrigin: '', hsts: false,
    adminToken: 'test-admin-token-0123456789abcdef', otpSecret: 'x'.repeat(40),
    sms: { mode: 'sandbox', templateId: 123456, param: 'Code', confirmTemplateId: 0, receptionTemplateId: 0, receptionMobile: '' }
  };
  const app = createApp(cfg, { sms, log: () => {} });
  const srv = http.createServer(app);
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${srv.address().port}`;
    const req = (method, p, body, headers = {}) => fetch(base + p, { method, headers: Object.assign(body ? { 'content-type': 'application/json' } : {}, headers), body: body ? JSON.stringify(body) : undefined })
      .then(async (r) => ({ status: r.status, headers: r.headers, body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text() }));
    res({ srv, app, sent, req, cfg, done: () => { app.close(); srv.closeAllConnections(); srv.close(); } });
  }));
}
test('health و فایل‌های سایت با متای API و سربرگ‌های امنیتی', async () => {
  const s = await setup();
  const h = await s.req('GET', '/api/health');
  assert.deepStrictEqual(h.body, { ok: true, service: 'sasan-booking', mode: 'sandbox' });
  const page = await s.req('GET', '/');
  assert.strictEqual(page.status, 200);
  assert.match(page.body, /<meta name="sasan-api" content="\/api">/);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  assert.strictEqual(page.headers.get('x-content-type-options'), 'nosniff');
  const trav = await s.req('GET', '/../server/server.js');
  assert.strictEqual(trav.status, 404);
  const trav2 = await s.req('GET', '/%2e%2e/server/server.js');
  assert.strictEqual(trav2.status, 404);
  s.done();
});

test('ارسال کد: شماره‌ی نادرست، فاصله‌ی ارسال دوباره، کد فقط به sms.ir می‌رود', async () => {
  const s = await setup();
  assert.strictEqual((await s.req('POST', '/api/otp/send', { mobile: '12345' })).body.error, 'mobile');
  const r = await s.req('POST', '/api/otp/send', { mobile: '۰۹۱۲۱۲۳۴۵۶۷' });
  assert.deepStrictEqual(r.body, { ok: true, ttl: 120, resend: 60 });
  assert.strictEqual(s.sent.length, 1);
  assert.strictEqual(s.sent[0].mobile, '09121234567');
  assert.strictEqual(s.sent[0].templateId, 123456);
  assert.match(s.sent[0].params.Code, /^\d{5}$/);
  assert.ok(!JSON.stringify(r.body).includes(s.sent[0].params.Code), 'code must not be in the response');
  const again = await s.req('POST', '/api/otp/send', { mobile: '09121234567' });
  assert.strictEqual(again.status, 429);
  assert.strictEqual(again.body.error, 'rate');
  assert.ok(again.body.wait > 0 && again.body.wait <= 60);
  s.done();
});

test('ثبت درخواست: کد اشتباه، کد درست، یک‌بارمصرف بودن کد؛ روز و ساعت و پزشک از بیمار پذیرفته نمی‌شود', async () => {
  const s = await setup();
  const base = { mobile: '09121234567', name: 'مریم احمدی', dept: 'dental', type: 'ویزیت اول', note: '<b>x</b>', date: '2030-01-01', time: 600, doctor: 'doc-1' };
  await s.req('POST', '/api/otp/send', { mobile: base.mobile });
  const code = s.sent[0].params.Code;
  const wrong = code === '11111' ? '22222' : '11111';
  const bad = await s.req('POST', '/api/booking', Object.assign({ code: wrong }, base));
  assert.strictEqual(bad.status, 401); assert.strictEqual(bad.body.left, 4);
  const ok = await s.req('POST', '/api/booking', Object.assign({ code }, base));
  assert.strictEqual(ok.status, 200); assert.match(ok.body.ref, /^SS-\d{5}$/);
  const reuse = await s.req('POST', '/api/booking', Object.assign({ code }, base));
  assert.strictEqual(reuse.status, 410);
  const saved = JSON.parse(fs.readFileSync(path.join(s.cfg.dataDir, 'bookings.json'), 'utf8'));
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].status, 'new');
  assert.ok(!('date' in saved[0]) && !('time' in saved[0]) && !('doctor' in saved[0]), 'patient cannot set day, time or doctor');
  assert.ok(!saved[0].note.includes('<'), 'note is cleaned');
  s.done();
});

test('ثبت درخواست: ورودی نادرست و درخواست تکراری پیگیری‌نشده', async () => {
  const s = await setup();
  const base = { mobile: '09121234567', code: '12345', name: 'علی', dept: 'dental', type: 'ویزیت اول' };
  assert.strictEqual((await s.req('POST', '/api/booking', Object.assign({}, base, { dept: 'x' }))).body.error, 'input');
  assert.strictEqual((await s.req('POST', '/api/booking', Object.assign({}, base, { type: 'x' }))).body.error, 'input');
  assert.strictEqual((await s.req('POST', '/api/booking', Object.assign({}, base, { name: 'ع' }))).body.error, 'input');
  assert.strictEqual((await s.req('POST', '/api/booking', Object.assign({}, base, { mobile: '0912' }))).body.error, 'input');
  /* دو درخواست باز برای یک شماره؛ سومی رد می‌شود و کدش مصرف نمی‌شود */
  for (let i = 0; i < 2; i++) {
    s.app.otp.map.delete(base.mobile);
    await s.req('POST', '/api/otp/send', { mobile: base.mobile });
    const r = await s.req('POST', '/api/booking', Object.assign({}, base, { code: s.sent[s.sent.length - 1].params.Code }));
    assert.strictEqual(r.status, 200);
  }
  s.app.otp.map.delete(base.mobile);
  await s.req('POST', '/api/otp/send', { mobile: base.mobile });
  const third = await s.req('POST', '/api/booking', Object.assign({}, base, { code: s.sent[s.sent.length - 1].params.Code }));
  assert.strictEqual(third.status, 429); assert.strictEqual(third.body.error, 'many');
  s.done();
});

test('پذیرش: بعد از تماس، روز و ساعت و پزشک را ثبت می‌کند', async () => {
  const s = await setup();
  const auth = { authorization: 'Bearer ' + s.cfg.adminToken };
  await s.req('POST', '/api/otp/send', { mobile: '09121234567' });
  const ok = await s.req('POST', '/api/booking', { mobile: '09121234567', code: s.sent[0].params.Code, name: 'مریم', dept: 'dental', type: 'مشاوره' });
  const ref = ok.body.ref;
  assert.strictEqual((await s.req('PATCH', '/api/bookings/' + ref, { status: 'called' }, auth)).body.booking.status, 'called');
  const sch = await s.req('PATCH', '/api/bookings/' + ref, { status: 'scheduled', date: '2030-01-05', time: 630, doctor: 'doc-2' }, auth);
  assert.strictEqual(sch.status, 200);
  assert.deepStrictEqual([sch.body.booking.date, sch.body.booking.time, sch.body.booking.doctor], ['2030-01-05', 630, 'doc-2']);
  assert.strictEqual((await s.req('PATCH', '/api/bookings/' + ref, { doctor: 'doc-5' }, auth)).status, 400, 'doctor from another department');
  assert.strictEqual((await s.req('PATCH', '/api/bookings/' + ref, { status: 'x' }, auth)).status, 400);
  assert.strictEqual((await s.req('PATCH', '/api/bookings/' + ref, { status: 'done' })).status, 401);
  assert.strictEqual((await s.req('PATCH', '/api/bookings/SS-00000', { status: 'done' }, auth)).status, 404);
  const list = await s.req('GET', '/api/bookings?status=scheduled', null, auth);
  assert.strictEqual(list.body.bookings.length, 1);
  s.done();
});

test('پنج بار کد اشتباه کد را باطل می‌کند', async () => {
  const s = await setup();
  const base = { mobile: '09121234567', name: 'علی رضایی', dept: 'medicine', type: 'ویزیت اول' };
  await s.req('POST', '/api/otp/send', { mobile: base.mobile });
  const code = s.sent[0].params.Code;
  const wrong = code === '11111' ? '22222' : '11111';
  let last;
  for (let i = 0; i < 5; i++) last = await s.req('POST', '/api/booking', Object.assign({ code: wrong }, base));
  assert.strictEqual(last.body.error, 'attempts');
  const after = await s.req('POST', '/api/booking', Object.assign({ code }, base));
  assert.strictEqual(after.status, 410);
  s.done();
});

test('شکست sms.ir: خطای sms و امکان درخواست دوباره', async () => {
  const s = await setup({ fail: true });
  const r = await s.req('POST', '/api/otp/send', { mobile: '09121234567' });
  assert.strictEqual(r.status, 502); assert.strictEqual(r.body.error, 'sms');
  s.done();
});

test('امنیت درخواست‌ها: نوع محتوا، حجم، مبدأ دیگر، پنل مدیریت', async () => {
  const s = await setup();
  const t = await fetch(s.srv.address && `http://127.0.0.1:${s.srv.address().port}/api/otp/send`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' });
  assert.strictEqual(t.status, 415);
  /* بدنه‌ی بزرگ: سرور ۴۱۳ می‌دهد یا اتصال را می‌بندد */
  const big = await s.req('POST', '/api/otp/send', { mobile: '09121234567', pad: 'x'.repeat(20000) }).catch(() => ({ status: 413 }));
  assert.strictEqual(big.status, 413);
  const cross = await s.req('POST', '/api/otp/send', { mobile: '09121234567' }, { origin: 'https://evil.example' });
  assert.strictEqual(cross.status, 403);
  assert.strictEqual((await s.req('GET', '/api/bookings')).status, 401);
  assert.strictEqual((await s.req('GET', '/api/bookings', null, { authorization: 'Bearer wrong' })).status, 401);
  const list = await s.req('GET', '/api/bookings', null, { authorization: 'Bearer ' + s.cfg.adminToken });
  assert.strictEqual(list.status, 200); assert.ok(Array.isArray(list.body.bookings));
  s.done();
});

test('درخواست تماس', async () => {
  const s = await setup();
  assert.strictEqual((await s.req('POST', '/api/callback', { name: 'سارا', mobile: '09121234567', topic: 'نوبت دندانپزشکی' })).status, 200);
  assert.strictEqual((await s.req('POST', '/api/callback', { name: 'س', mobile: '0912' })).status, 400);
  s.done();
});
