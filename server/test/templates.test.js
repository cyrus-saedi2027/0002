/* آزمون قالب‌های نام‌دار پیامک: ثبت، روشن شدن خودکار بعد از تأیید، برگشت به قالب .env اگر قالب از کار بیفتد. اجرا: cd server && npm test */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');

function fakeSmsir() {
  const tpl = { 284896: { status: 2, templateText: 'این قالب برای تست هست کد: #OTP#', parameters: [{ name: 'OTP' }] } };
  const sent = [], made = [];
  const dead = new Set();
  let next = 500000;
  return {
    tpl, sent, made, dead,
    verify: async (mobile, templateId, params) => {
      sent.push({ mobile, templateId, params });
      if (dead.has(templateId)) return { ok: false, status: 113, message: 'قالب پیدا نشد' };
      return { ok: true, status: 1, data: { messageId: 1 } };
    },
    credit: async () => ({ ok: true, status: 1, data: 1510 }),
    report: async () => ({ ok: true, status: 1, data: {} }),
    template: async (id) => (tpl[id] ? { ok: true, status: 1, data: Object.assign({ id }, tpl[id]) } : { ok: false, status: 113, message: 'قالب پیدا نشد' }),
    addTemplate: async (title, text, type, params) => {
      const id = ++next;
      tpl[id] = { status: 1, templateText: text, type, parameters: params };
      made.push({ id, title, type, params: params.map((x) => x.name) });
      return { ok: true, status: 1, data: id };
    }
  };
}

async function setup(dataDir, fake, mode = 'live') {
  const cfg = {
    siteDir: path.resolve(__dirname, '..', '..', 'site'), panelDir: path.resolve(__dirname, '..', 'panel'), dataDir,
    trustProxy: false, allowedOrigin: '', hsts: false, adminToken: '', otpSecret: 't'.repeat(40), panel2fa: false,
    sms: { mode, templateId: 284896, param: 'OTP', confirmTemplateId: 0, receptionTemplateId: 0, receptionMobile: '', apptTemplateId: 0, remindTemplateId: 0, remindHour: 17 }
  };
  const app = createApp(cfg, { sms: fake, log: () => {} });
  const srv = http.createServer(app);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  let cookie = '';
  const req = async (method, p, body) => {
    const panel = p.startsWith('/api/panel');
    const h = Object.assign({}, body ? { 'content-type': 'application/json' } : {}, panel && method !== 'GET' ? { 'x-sasan-panel': '1' } : {}, cookie ? { cookie } : {});
    const r = await fetch(base + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    return { status: r.status, body: await r.json() };
  };
  if (!app.panel.users.byUsername('sara')) await app.panel.users.create({ username: 'sara', name: 'سارا محمدی', mobile: '09120000002' }, 'Desk-pass-12', { mustChange: false });
  assert.strictEqual((await req('POST', '/api/panel/login', { username: 'sara', password: 'Desk-pass-12' })).status, 200);
  return { app, cfg, req, done: () => { app.close(); srv.closeAllConnections(); srv.close(); } };
}

test('قالب‌های نام‌دار: ثبت، روشن شدن بعد از تأیید، رد، و برگشت کد تأیید به قالب .env', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sasan-tpl-'));
  const f = fakeSmsir();
  const s = await setup(dataDir, f);
  /* پیش از هر چیز: کد تأیید با قالب .env */
  let t = (await s.req('GET', '/api/panel/sms')).body.tpl;
  assert.strictEqual(t.live, true);
  assert.deepStrictEqual(t.list.map((x) => [x.kind, x.on]), [['otp', true], ['received', false], ['reception', false], ['appt', false], ['remind', false]]);
  /* ثبت: هر پنج قالب (قالب .env نام کلینیک را ندارد) */
  const sub = (await s.req('POST', '/api/panel/sms/templates/submit')).body;
  assert.strictEqual(f.made.length, 5);
  assert.deepStrictEqual(f.made.map((x) => x.type), [1, 2, 2, 2, 2]);
  assert.deepStrictEqual(f.made[0].params, ['CODE']);
  assert.ok(sub.tpl.list.every((x) => x.pending), 'all pending');
  assert.ok(f.tpl[f.made[0].id].templateText.includes('ساسان کلینیک'));
  /* دوباره زدن: چیزی تکراری ساخته نمی‌شود */
  await s.req('POST', '/api/panel/sms/templates/submit');
  assert.strictEqual(f.made.length, 5);
  /* sms.ir: کد تأیید و تأیید نوبت تأیید شدند، ثبت درخواست رد شد */
  const [otpId, recId, , apptId] = f.made.map((x) => x.id);
  f.tpl[otpId].status = 2; f.tpl[apptId].status = 2;
  f.tpl[recId].status = 3; f.tpl[recId].rejectionReason = 'متن باید کوتاه‌تر باشد';
  const ch = (await s.req('POST', '/api/panel/sms/templates/check')).body;
  assert.strictEqual(ch.changed.length, 3);
  assert.strictEqual(s.cfg.sms.templateId, otpId);
  assert.strictEqual(s.cfg.sms.param, 'CODE');
  assert.strictEqual(s.cfg.sms.apptTemplateId, apptId);
  assert.strictEqual(s.cfg.sms.confirmTemplateId, 0);
  const byKind = Object.fromEntries(ch.tpl.list.map((x) => [x.kind, x]));
  assert.strictEqual(byKind.otp.branded, true);
  assert.strictEqual(byKind.received.rejected.reason, 'متن باید کوتاه‌تر باشد');
  assert.ok(byKind.remind.pending);
  /* کد تأیید سایت حالا با قالب نام‌دار و متغیر CODE می‌رود */
  assert.strictEqual((await s.req('POST', '/api/otp/send', { mobile: '09121112233' })).status, 200);
  let last = f.sent[f.sent.length - 1];
  assert.strictEqual(last.templateId, otpId);
  assert.ok(/^\d{5}$/.test(last.params.CODE));
  /* قالب در sms.ir پاک شد: همان ارسال با قالب .env انجام می‌شود و قالب خاموش می‌شود */
  f.dead.add(otpId);
  assert.strictEqual((await s.req('POST', '/api/otp/send', { mobile: '09121112244' })).status, 200);
  last = f.sent[f.sent.length - 1];
  assert.strictEqual(last.templateId, 284896);
  assert.ok(/^\d{5}$/.test(last.params.OTP));
  assert.strictEqual(s.cfg.sms.templateId, 284896);
  assert.strictEqual(s.cfg.sms.param, 'OTP');
  t = (await s.req('GET', '/api/panel/sms')).body.tpl;
  assert.ok(t.list[0].failed);
  /* ثبت دوباره: فقط کد تأیید (خاموش‌شده) و ثبت درخواست (ردشده) */
  await s.req('POST', '/api/panel/sms/templates/submit');
  assert.strictEqual(f.made.length, 7);
  /* موبایل پذیرش از پنل */
  assert.strictEqual((await s.req('PUT', '/api/panel/sms/reception', { mobile: '۰۹۱۲ ۳۴۵ ۶۷۸۹' })).status, 200);
  assert.strictEqual(s.cfg.sms.receptionMobile, '09123456789');
  assert.strictEqual((await s.req('PUT', '/api/panel/sms/reception', { mobile: '12345' })).status, 400);
  /* گزارش کارها */
  await new Promise((r) => setTimeout(r, 30));
  const acts = (await s.req('GET', '/api/panel/audit')).body.audit.map((e) => e.action + ':' + e.detail);
  assert.ok(acts.some((a) => a.startsWith('sms.template:تأیید شد')));
  assert.ok(acts.some((a) => a.startsWith('sms.template:رد شد')));
  assert.ok(acts.some((a) => a.startsWith('sms.template:خاموش شد')));
  assert.ok(acts.some((a) => a.startsWith('sms.templates:')));
  s.done();
  /* بعد از راه‌اندازی دوباره: تأیید نوبت روشن می‌ماند و موبایل پذیرش هم */
  const s2 = await setup(dataDir, f);
  assert.strictEqual(s2.cfg.sms.apptTemplateId, apptId);
  assert.strictEqual(s2.cfg.sms.templateId, 284896);
  assert.strictEqual(s2.cfg.sms.receptionMobile, '09123456789');
  s2.done();
  /* حالت آزمایشی: قالب ثبت نمی‌شود */
  const s3 = await setup(fs.mkdtempSync(path.join(os.tmpdir(), 'sasan-tpl-')), fakeSmsir(), 'sandbox');
  assert.strictEqual((await s3.req('POST', '/api/panel/sms/templates/submit')).status, 400);
  s3.done();
});

test('قالب نام‌دار .env که هنوز در بررسی است دوباره ساخته نمی‌شود؛ همان پیگیری و روشن می‌شود', async () => {
  const f = fakeSmsir();
  f.tpl[284896] = { status: 1, templateText: 'ساسان کلینیک\nکد تأیید شما: #OTP#', parameters: [{ name: 'OTP' }] };
  const s = await setup(fs.mkdtempSync(path.join(os.tmpdir(), 'sasan-tpl-')), f);
  await s.req('POST', '/api/panel/sms/templates/submit');
  assert.strictEqual(f.made.filter((x) => x.type === 1).length, 0, 'no duplicate OTP template');
  assert.strictEqual(f.made.length, 4);
  f.tpl[284896].status = 2;
  await s.req('POST', '/api/panel/sms/templates/check');
  const otp = (await s.req('GET', '/api/panel/sms')).body.tpl.list[0];
  assert.strictEqual(otp.on && otp.branded, true);
  /* همان قالب .env با متغیر CODE تنظیم نمی‌شود؛ متغیر خودش (OTP) می‌ماند */
  assert.strictEqual(s.cfg.sms.templateId, 284896);
  assert.strictEqual(s.cfg.sms.param, 'OTP');
  s.done();
});

test('فقط کد تأیید: تا تأیید قالب .env، کد با قالب جایگزین می‌رود؛ بعد از تأیید خودکار جابه‌جا می‌شود؛ پیامک دیگری نیست', async () => {
  const f = fakeSmsir();
  f.tpl[381780] = { status: 1, templateText: 'ساسان کلینیک ... #OTP#', parameters: [{ name: 'OTP' }] };
  /* sms.ir قالب تأییدنشده را نمی‌فرستد */
  const realVerify = f.verify;
  f.verify = async (m, id, p) => (f.tpl[id] && f.tpl[id].status !== 2 ? (f.sent.push({ mobile: m, templateId: id, params: p }), { ok: false, status: 117, message: 'متن تأیید نشده' }) : realVerify(m, id, p));
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sasan-tpl-'));
  const cfg = {
    siteDir: path.resolve(__dirname, '..', '..', 'site'), panelDir: path.resolve(__dirname, '..', 'panel'), dataDir,
    trustProxy: false, allowedOrigin: '', hsts: false, adminToken: '', otpSecret: 't'.repeat(40), panel2fa: false,
    sms: { mode: 'live', templateId: 381780, param: 'OTP', onlyOtp: true, fallbackTemplateId: 284896, fallbackParam: '', confirmTemplateId: 555, receptionTemplateId: 556, receptionMobile: '09120000009', apptTemplateId: 557, remindTemplateId: 558, remindHour: 17 }
  };
  const app = createApp(cfg, { sms: f, log: () => {} });
  /* بقیه‌ی پیامک‌ها خاموش، حتی اگر در .env بودند */
  assert.deepStrictEqual([cfg.sms.confirmTemplateId, cfg.sms.receptionTemplateId, cfg.sms.apptTemplateId, cfg.sms.remindTemplateId, cfg.sms.receptionMobile], [0, 0, 0, 0, '']);
  assert.strictEqual(cfg.sms.templateId, 284896);
  const srv = http.createServer(app); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const send = (m) => fetch(base + '/api/otp/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobile: m }) }).then((r) => r.status);
  assert.strictEqual(await send('09121113301'), 200);
  assert.strictEqual(f.sent[f.sent.length - 1].templateId, 284896);
  assert.ok(/^\d{5}$/.test(f.sent[f.sent.length - 1].params.OTP));
  /* sms.ir تأیید کرد */
  f.tpl[381780].status = 2;
  const ch = await app.templates.check();
  assert.strictEqual(ch.changed[0].status, 2);
  assert.strictEqual(cfg.sms.templateId, 381780);
  assert.strictEqual(await send('09121113302'), 200);
  assert.strictEqual(f.sent[f.sent.length - 1].templateId, 381780);
  /* ثبت قالب‌های دیگر خاموش است */
  assert.strictEqual((await app.templates.submit()).error, 'off');
  assert.strictEqual(f.made.length, 0);
  /* اگر بعداً از کار بیفتد، همان کد با قالب جایگزین */
  f.tpl[381780].status = 3;
  assert.strictEqual(await send('09121113303'), 200);
  const last2 = f.sent.slice(-2).map((x) => x.templateId);
  assert.deepStrictEqual(last2, [381780, 284896]);
  app.close(); srv.closeAllConnections(); srv.close();
});
