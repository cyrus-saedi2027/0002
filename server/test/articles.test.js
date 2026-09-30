/* آزمون‌های مقاله‌های پنل (بدون شبکه).  اجرا: cd server && npm test */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');
const { webpSize } = require('../lib/cms');

const SITE = path.resolve(__dirname, '..', '..', 'site');
const sms = { verify: async () => ({ ok: true, status: 1, data: { messageId: 1 } }), credit: async () => ({ ok: true, status: 1, data: 1 }), report: async () => ({ ok: true, status: 1, data: {} }) };

async function setup(dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sasan-art-'))) {
  const cfg = {
    siteDir: SITE, panelDir: path.resolve(__dirname, '..', 'panel'), dataDir,
    trustProxy: false, allowedOrigin: '', hsts: false, adminToken: '', otpSecret: 'z'.repeat(40), panel2fa: false,
    sms: { mode: 'sandbox', templateId: 1, param: 'CODE', confirmTemplateId: 0, receptionTemplateId: 0, receptionMobile: '', apptTemplateId: 0, remindTemplateId: 0, remindHour: 17 }
  };
  const app = createApp(cfg, { sms, log: () => {} });
  const srv = http.createServer(app);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  let cookie = '';
  const req = async (method, p, body) => {
    const h = Object.assign({}, body ? { 'content-type': 'application/json' } : {}, method !== 'GET' ? { 'x-sasan-panel': '1' } : {}, cookie ? { cookie } : {});
    const r = await fetch(base + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, type: ct, body: ct.includes('json') ? await r.json() : await r.text() };
  };
  if (!app.panel.users.byUsername('sara')) await app.panel.users.create({ username: 'sara', name: 'سارا محمدی', mobile: '09120000002' }, 'Desk-pass-12', { mustChange: false });
  const login = () => req('POST', '/api/panel/login', { username: 'sara', password: 'Desk-pass-12' });
  return { app, dataDir, req, login, done: () => { app.close(); srv.closeAllConnections(); srv.close(); } };
}

/* یک WebP کوچک (سربرگ VP8X) با پهنا و بلندی دلخواه؛ برای آزمون بررسی سرور کافی است */
function fakeWebp(w, h) {
  const b = Buffer.alloc(40);
  b.write('RIFF', 0, 'ascii'); b.writeUInt32LE(32, 4); b.write('WEBP', 8, 'ascii'); b.write('VP8X', 12, 'ascii'); b.writeUInt32LE(10, 16);
  b.writeUIntLE(w - 1, 24, 3); b.writeUIntLE(h - 1, 27, 3);
  return b;
}
const files = () => Object.fromEntries([720, 1280, 1920].map((w) => [w, fakeWebp(w, Math.round((w * 9) / 16)).toString('base64')]));

const BODY = `<h2 onclick="x()">چرا جرم‌گیری لازم است؟</h2><p>جرم دندان لایه‌ی سفتی است که با مسواک پاک نمی‌شود و اگر بماند لثه را ملتهب می‌کند. در سلمان‌شهر و متل‌قو خیلی‌ها فقط وقتی درد دارند سراغ دندانپزشک می‌روند، اما جرم‌گیری منظم جلوی بیماری لثه و بوی بد دهان را می‌گیرد.</p><script>alert(1)</script>
<h2>هر چند وقت یک بار؟</h2><p>برای بیشتر آدم‌ها سالی یک یا دو بار کافی است. اگر سیگار می‌کشید یا ارتودنسی دارید، ممکن است دندانپزشک زودتر شما را ببیند. <a href="article-tooth-sensitivity.html">حساسیت دندان</a> بعد از جرم‌گیری معمولاً چند روزه برطرف می‌شود.</p>
<img src="x" onerror="alert(2)"><aside class="ar-box ar-box--tip"><b>نکته</b><p>بعد از جرم‌گیری تا یک ساعت چیزی نخورید.</p></aside>`;
const input = (over = {}) => Object.assign({ slug: 'scaling-guide', k: 'dental', title: 'جرم‌گیری دندان؛ هر چند وقت یک بار و چه حسی دارد؟',
  lead: 'جرم‌گیری یکی از ساده‌ترین کارهای دندانپزشکی است که <b>جلوی بیماری لثه</b> را می‌گیرد. در این راهنما همه‌چیز را ساده گفته‌ایم.',
  body: BODY, cover: '', coverAlt: 'دندانپزشک در حال جرم‌گیری', seo: 'جرم‌گیری دندان در سلمان‌شهر | ساسان کلینیک', desc: 'جرم‌گیری دندان چیست، هر چند وقت لازم است و چه حسی دارد؛ راهنمای ساده از دندانپزشکی ساسان کلینیک سلمان‌شهر (متل‌قو).',
  points: ['سالی یک یا دو بار', 'درد ندارد <script>x</script>'], faq: [{ q: 'درد دارد؟', a: 'معمولاً نه؛ فقط کمی حساسیت.' }, { q: '', a: 'بی‌سؤال' }], tags: ['جرم‌گیری', 'جرم‌گیری', 'دندانپزشکی سلمان‌شهر'] }, over);

test('webpSize سربرگ‌های VP8X را می‌خواند و فایل غیر WebP را رد می‌کند', () => {
  assert.deepStrictEqual(webpSize(fakeWebp(1280, 720)), { w: 1280, h: 720 });
  assert.strictEqual(webpSize(Buffer.from('not an image at all, just some text here')), null);
});

test('مقاله‌ی پنل: عکس، ساختن، صفحه‌های وابسته، پاک‌سازی، تکرار و اعتبارسنجی', async () => {
  const s = await setup();
  const staticArticles = fs.readFileSync(path.join(SITE, 'articles.html'), 'utf8');
  /* پیش از هر تغییر، همان فایل‌های سایت فرستاده می‌شوند */
  /* نشانی js و css با ?v= نسخه‌دار می‌شود؛ بقیه‌ی صفحه همان فایل است */
  assert.ok((await s.req('GET', '/articles.html')).body.replace(/\?v=[0-9a-z]+/g, '').includes(staticArticles.slice(-500)));
  assert.strictEqual((await s.req('GET', '/api/panel/articles')).status, 401);
  assert.strictEqual((await s.login()).status, 200);
  const list0 = await s.req('GET', '/api/panel/articles');
  assert.ok(list0.body.articles.length >= 5);
  assert.ok(list0.body.articles.every((a) => a.src === 'site' && !a.hidden));

  /* عکس */
  assert.strictEqual((await s.req('POST', '/api/panel/articles/upload', { files: { 720: Buffer.from('x'.repeat(50)).toString('base64') } })).status, 400);
  const bad = Object.assign(files(), { 1280: fakeWebp(900, 500).toString('base64') });
  assert.strictEqual((await s.req('POST', '/api/panel/articles/upload', { files: bad })).status, 400, 'width must match');
  const up = await s.req('POST', '/api/panel/articles/upload', { files: files() });
  assert.strictEqual(up.status, 200, JSON.stringify(up.body));
  assert.match(up.body.base, /^img\/art\/p\/p[a-f0-9]{10}$/);
  const img = await s.req('GET', '/' + up.body.base + '-720.webp');
  assert.strictEqual(img.status, 200);
  assert.strictEqual(img.type, 'image/webp');
  assert.strictEqual((await s.req('GET', '/img/art/p/../../../../server/.env')).status, 404);

  /* اعتبارسنجی */
  const short = await s.req('POST', '/api/panel/articles', input({ cover: up.body.base, title: 'کوتاه' }));
  assert.strictEqual(short.status, 400);
  assert.match(short.body.message, /عنوان/);
  assert.strictEqual((await s.req('POST', '/api/panel/articles', input({ cover: 'img/art/p/pffffffffff' }))).status, 400, 'cover must exist');
  assert.strictEqual((await s.req('POST', '/api/panel/articles', input({ cover: up.body.base, slug: 'Bad Slug' }))).status, 400);
  assert.strictEqual((await s.req('POST', '/api/panel/articles', input({ cover: up.body.base, slug: 'implant-or-bridge' }))).status, 409, 'slug of a site article');

  /* ساختن */
  const c = await s.req('POST', '/api/panel/articles', input({ cover: up.body.base }));
  assert.strictEqual(c.status, 200, JSON.stringify(c.body));
  const a = c.body.article;
  assert.strictEqual(a.src, 'panel');
  assert.ok(!a.body.includes('<script') && !a.body.includes('onclick') && !a.body.includes('onerror'));
  assert.deepStrictEqual(a.tags, ['جرم‌گیری', 'دندانپزشکی سلمان‌شهر']);
  assert.strictEqual(a.faq.length, 1);
  assert.ok(!a.points[1].includes('script'));
  assert.strictEqual((await s.req('POST', '/api/panel/articles', input({ cover: up.body.base }))).status, 409);

  const page = await s.req('GET', '/article-scaling-guide.html');
  assert.strictEqual(page.status, 200);
  assert.ok(page.body.includes('جرم‌گیری دندان؛ هر چند وقت یک بار'));
  assert.ok(page.body.includes('<meta name="sasan-api" content="/api">'));
  assert.ok(page.body.includes('"@type":"BlogPosting"'));
  assert.ok(page.body.includes(up.body.base + '-1280.webp'));
  assert.ok(!/alert\(/.test(page.body));
  const idx = await s.req('GET', '/articles.html');
  assert.ok(idx.body.includes('article-scaling-guide.html'));
  const n = list0.body.articles.length + 1;
  assert.ok(idx.body.includes(`data-count="${n}"`), 'article count updates');
  assert.ok((await s.req('GET', '/dental.html')).body.includes('article-scaling-guide.html'), 'department page lists it');
  assert.ok((await s.req('GET', '/')).body.includes('article-scaling-guide.html'), 'home magazine lists the newest');
  assert.ok(!(await s.req('GET', '/beauty.html')).body.includes('article-scaling-guide.html'));
  const sm = await s.req('GET', '/sitemap.xml');
  assert.ok(sm.body.includes('/article-scaling-guide.html</loc>'));
  assert.strictEqual((sm.body.match(/<loc>/g) || []).length, (fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8').match(/<loc>/g) || []).length + 1);
  s.done();
});

test('ویرایش، برداشتن، پیش‌نویس، برگرداندن و حذف؛ ماندن بعد از روشن شدن دوباره‌ی سرور', async () => {
  const s = await setup();
  await s.login();
  const orig = await s.req('GET', '/api/panel/articles/implant-or-bridge');
  assert.strictEqual(orig.status, 200);
  assert.strictEqual(orig.body.article.src, 'site');
  assert.ok(orig.body.article.body.includes('data-art="img/art/'), 'raw source for editing');
  const title0 = orig.body.article.title;

  /* ویرایش مقاله‌ی سایت */
  const ed = await s.req('PUT', '/api/panel/articles/implant-or-bridge', Object.assign({}, orig.body.article, { title: 'ایمپلنت یا بریج؛ راهنمای تازه‌ی انتخاب برای جای خالی دندان' }));
  assert.strictEqual(ed.status, 200, JSON.stringify(ed.body));
  assert.strictEqual(ed.body.article.src, 'edited');
  assert.ok((await s.req('GET', '/article-implant-or-bridge.html')).body.includes('راهنمای تازه‌ی انتخاب'));
  assert.ok((await s.req('GET', '/article-implant-or-bridge.html')).body.includes('data-mg='), 'interactive diagram kept');

  /* برداشتن از سایت و برگرداندن */
  assert.strictEqual((await s.req('POST', '/api/panel/articles/implant-or-bridge/hide', { hidden: true })).status, 200);
  assert.strictEqual((await s.req('GET', '/article-implant-or-bridge.html')).status, 404);
  assert.ok(!(await s.req('GET', '/articles.html')).body.includes('article-implant-or-bridge.html'));
  assert.ok(!(await s.req('GET', '/sitemap.xml')).body.includes('article-implant-or-bridge.html'));
  assert.strictEqual((await s.req('POST', '/api/panel/articles/implant-or-bridge/hide', { hidden: false })).status, 200);
  assert.strictEqual((await s.req('GET', '/article-implant-or-bridge.html')).status, 200);
  const rv = await s.req('DELETE', '/api/panel/articles/implant-or-bridge');
  assert.strictEqual(rv.body.reverted, true);
  assert.strictEqual(rv.body.article.title, title0);
  assert.ok((await s.req('GET', '/article-implant-or-bridge.html')).body.includes(title0));
  assert.strictEqual((await s.req('DELETE', '/api/panel/articles/implant-or-bridge')).status, 400, 'nothing left to revert');

  /* پیش‌نویس */
  const up = await s.req('POST', '/api/panel/articles/upload', { files: files() });
  const d = await s.req('POST', '/api/panel/articles', input({ cover: up.body.base, slug: 'draft-one', hidden: true }));
  assert.strictEqual(d.status, 200);
  assert.strictEqual(d.body.article.hidden, true);
  assert.strictEqual((await s.req('GET', '/article-draft-one.html')).status, 404);
  assert.ok((await s.req('GET', '/api/panel/articles')).body.articles.some((x) => x.slug === 'draft-one' && x.hidden));
  const pub = await s.req('PUT', '/api/panel/articles/draft-one', Object.assign(input({ cover: up.body.base }), { hidden: false }));
  assert.strictEqual(pub.status, 200);
  assert.strictEqual((await s.req('GET', '/article-draft-one.html')).status, 200);

  /* بعد از روشن شدن دوباره‌ی سرور هم می‌ماند */
  s.done();
  const s2 = await setup(s.dataDir);
  assert.strictEqual((await s2.req('GET', '/article-draft-one.html')).status, 200);
  await s2.login();
  const del = await s2.req('DELETE', '/api/panel/articles/draft-one');
  assert.strictEqual(del.body.removed, true);
  assert.strictEqual((await s2.req('GET', '/article-draft-one.html')).status, 404);
  const audit = (await s2.req('GET', '/api/panel/audit')).body.audit.map((e) => e.action);
  for (const x of ['article.update', 'article.hide', 'article.show', 'article.revert', 'article.create', 'article.delete']) assert.ok(audit.includes(x), x);
  s2.done();
});
