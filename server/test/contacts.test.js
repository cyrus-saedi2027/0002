/* آزمون‌های مخاطبان (شماره‌هایی که به سایت یا پذیرش داده شده). اجرا: cd server && npm test */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');

async function setup(dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sasan-ct-'))) {
  const sent = [];
  const sms = {
    verify: async (mobile, templateId, params) => { sent.push({ mobile, templateId, params }); return { ok: true, status: 1, data: { messageId: 1 } }; },
    credit: async () => ({ ok: true, status: 1, data: 1 }), report: async () => ({ ok: true, status: 1, data: {} })
  };
  const cfg = {
    siteDir: path.resolve(__dirname, '..', '..', 'site'), panelDir: path.resolve(__dirname, '..', 'panel'), dataDir,
    trustProxy: false, allowedOrigin: '', hsts: false, adminToken: '', otpSecret: 'c'.repeat(40), panel2fa: true,
    sms: { mode: 'sandbox', templateId: 123456, param: 'CODE', confirmTemplateId: 0, receptionTemplateId: 0, receptionMobile: '', apptTemplateId: 0, remindTemplateId: 0, remindHour: 17 }
  };
  const app = createApp(cfg, { sms, log: () => {} });
  const srv = http.createServer(app);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  let cookie = '';
  const req = async (method, p, body, panel = false) => {
    const h = Object.assign({}, body ? { 'content-type': 'application/json' } : {}, panel && method !== 'GET' ? { 'x-sasan-panel': '1' } : {}, panel && cookie ? { cookie } : {});
    const r = await fetch(base + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie');
    if (sc && panel) cookie = sc.split(';')[0];
    return { status: r.status, body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text() };
  };
  if (!app.panel.users.byUsername('sara')) await app.panel.users.create({ username: 'sara', name: 'سارا محمدی', mobile: '09120000002' }, 'Desk-pass-12', { mustChange: false });
  const login = async () => {
    const r = await req('POST', '/api/panel/login', { username: 'sara', password: 'Desk-pass-12' }, true);
    const code = sent.filter((x) => x.mobile === '09120000002').pop().params.CODE;
    return req('POST', '/api/panel/login/code', { ticket: r.body.ticket, code }, true);
  };
  return { app, dataDir, sent, req, login, done: () => { app.close(); srv.closeAllConnections(); srv.close(); } };
}

test('هر شماره‌ای که کد گرفت، نوبت یا درخواست تماس داد یا تلفنی نوبت گرفت، در مخاطبان است؛ کد ورود کارکنان نه', async () => {
  const s = await setup();
  /* فقط کد تأیید (بدون ثبت نوبت) */
  assert.strictEqual((await s.req('POST', '/api/otp/send', { mobile: '09121110001' })).status, 200);
  /* کد و ثبت نوبت */
  await s.req('POST', '/api/otp/send', { mobile: '۰۹۱۲۱۱۱۰۰۰۲' });
  const code = s.sent.filter((x) => x.mobile === '09121110002').pop().params.CODE;
  const b = await s.req('POST', '/api/booking', { mobile: '09121110002', code, name: 'مریم احمدی', dept: 'beauty', type: 'مشاوره' });
  assert.strictEqual(b.status, 200, JSON.stringify(b.body));
  /* درخواست تماس */
  assert.strictEqual((await s.req('POST', '/api/callback', { mobile: '09121110003', name: 'رضا کریمی', topic: 'بیمه' })).status, 200);
  /* پنل: ورود کارمند (کد ورود او نباید مخاطب شود) و نوبت تلفنی */
  assert.strictEqual((await s.login()).status, 200);
  const pb = await s.req('POST', '/api/panel/bookings', { name: 'علی رضایی', mobile: '09121110004', dept: 'dental', type: 'ویزیت اول' }, true);
  assert.strictEqual(pb.status, 200);
  const list = (await s.req('GET', '/api/panel/contacts', null, true)).body.contacts;
  const by = Object.fromEntries(list.map((c) => [c.mobile, c]));
  assert.deepStrictEqual(Object.keys(by).sort(), ['09121110001', '09121110002', '09121110003', '09121110004']);
  assert.ok(!by['09120000002'], 'staff login code is not a contact');
  assert.deepStrictEqual(by['09121110001'].src, { otp: 1 });
  assert.strictEqual(by['09121110001'].verified, false);
  assert.strictEqual(by['09121110002'].name, 'مریم احمدی');
  assert.deepStrictEqual(by['09121110002'].depts, ['beauty']);
  assert.strictEqual(by['09121110002'].verified, true);
  assert.deepStrictEqual(by['09121110002'].src, { otp: 1, booking: 1 });
  assert.strictEqual(by['09121110003'].name, 'رضا کریمی');
  assert.deepStrictEqual(by['09121110003'].src, { callback: 1 });
  assert.deepStrictEqual(by['09121110004'].src, { phone: 1 });
  assert.deepStrictEqual(by['09121110004'].depts, ['dental']);
  /* لغو اطلاع‌رسانی، یادداشت، حذف، ثبت خروجی در گزارش کارها */
  const op = await s.req('PATCH', '/api/panel/contacts/09121110003', { optout: true, note: 'نمی‌خواهد پیامک بگیرد' }, true);
  assert.strictEqual(op.body.contact.optout, true);
  assert.strictEqual((await s.req('PATCH', '/api/panel/contacts/09129999999', { optout: true }, true)).status, 404);
  assert.strictEqual((await s.req('DELETE', '/api/panel/contacts/09121110001', null, true)).status, 200);
  assert.strictEqual((await s.req('POST', '/api/panel/contacts/exported', { count: 3, kind: 'csv' }, true)).status, 200);
  const after = (await s.req('GET', '/api/panel/contacts', null, true)).body.contacts;
  assert.strictEqual(after.length, 3);
  const actions = (await s.req('GET', '/api/panel/audit', null, true)).body.audit.map((e) => e.action);
  for (const a of ['contact.update', 'contact.delete', 'contacts.export']) assert.ok(actions.includes(a), a);
  /* بدون ورود: هیچ */
  assert.strictEqual((await s.req('GET', '/api/panel/contacts')).status, 401);
  s.done();
  /* بعد از روشن شدن دوباره می‌ماند */
  await new Promise((r) => setTimeout(r, 50));
  const s2 = await setup(s.dataDir);
  await s2.login();
  const again = (await s2.req('GET', '/api/panel/contacts', null, true)).body.contacts;
  assert.strictEqual(again.length, 3);
  assert.strictEqual(again.find((c) => c.mobile === '09121110003').optout, true);
  s2.done();
});

test('بار اول، از درخواست‌ها و درخواست‌های تماس قبلی پر می‌شود', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sasan-ct-'));
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(dataDir, 'bookings.json'), JSON.stringify([
    { ref: 'SS-10001', status: 'new', dept: 'dental', type: 'ویزیت اول', name: 'نسرین', mobile: '09125550001', source: 'site', createdAt: now, log: [], sms: [] },
    { ref: 'SS-10002', status: 'done', dept: 'medicine', type: 'ویزیت اول', name: 'کاوه', mobile: '09125550002', source: 'phone', createdAt: now, log: [], sms: [] }
  ]));
  fs.writeFileSync(path.join(dataDir, 'callbacks.json'), JSON.stringify([{ id: 'c1', name: 'لیلا', mobile: '09125550003', topic: '', status: 'new', createdAt: now }]));
  const s = await setup(dataDir);
  await s.login();
  const list = (await s.req('GET', '/api/panel/contacts', null, true)).body.contacts;
  assert.deepStrictEqual(list.map((c) => c.mobile).sort(), ['09125550001', '09125550002', '09125550003']);
  assert.strictEqual(list.find((c) => c.mobile === '09125550002').src.phone, 1);
  s.done();
});
