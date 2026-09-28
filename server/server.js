/* ==========================================================================
   سرور نوبت کلینیک ساسان
   - فایل‌های سایت (پوشه‌ی site/) را می‌فرستد و متای sasan-api را به صفحه اضافه می‌کند
     تا کپسول نوبت بداند سرور هست و کد واقعی پیامک شود
   - POST /api/otp/send      ارسال کد ۵ رقمی با متد Verify سامانه‌ی sms.ir
   - POST /api/booking       بررسی کد و ثبت درخواست نوبت (بخش، نوع مراجعه، نام، موبایل)؛
                             روز، ساعت و پزشک را پذیرش تلفنی هماهنگ می‌کند
                             (در صورت تنظیم: پیامک ثبت درخواست به بیمار و خبر به پذیرش)
   - POST /api/callback      درخواست تماس پذیرش
   - GET  /api/health        وضعیت
   - GET  /api/bookings      فهرست درخواست‌ها برای پنل مدیریت (فقط با ADMIN_TOKEN)
   - PATCH /api/bookings/:ref پذیرش: وضعیت (called, scheduled, done, cancelled, no-show)
                             و بعد از تماس، روز و ساعت و پزشک
   - /panel/ و /api/panel/*  پنل پذیرش (ویزیتور) با ورود کارکنان — lib/panel.js
   اجرا: node server/server.js   (تنظیمات: server/.env.example)
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { load } = require('./lib/config');
const smsir = require('./lib/smsir');
const { Limiter } = require('./lib/limit');
const { OtpStore, TTL, RESEND } = require('./lib/otp');
const B = require('./lib/bookings');
const { createPanel } = require('./lib/panel');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.xml': 'application/xml; charset=utf-8'
};
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  'frame-src https://www.google.com',
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'"
].join('; ');
/* پنل پذیرش سخت‌گیرتر است: هیچ اسکریپت یا استایل درون‌خطی، هیچ قاب و هیچ منبع بیرونی */
const PANEL_CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "font-src 'self'", "img-src 'self' data:",
  "connect-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"
].join('; ');
const mask = (m) => m.slice(0, 4) + '***' + m.slice(-4);

function createApp(cfg, deps = {}) {
  const sms = deps.sms || smsir.create(cfg.sms);
  const otp = new OtpStore(cfg.otpSecret);
  const lim = new Limiter();
  const store = deps.store || new B.BookingStore(cfg.dataDir);
  const log = deps.log || ((...a) => console.log(new Date().toISOString(), ...a));
  const sweep = setInterval(() => { lim.sweep(); otp.sweep(); }, 60e3);
  sweep.unref();

  const headers = (res, extra = {}) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    if (cfg.hsts) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  };
  const json = (res, code, obj) => {
    headers(res, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.writeHead(code);
    res.end(JSON.stringify(obj));
  };
  const ipOf = (req) => {
    if (cfg.trustProxy) { const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (f) return f; }
    return req.socket.remoteAddress || '?';
  };
  const readBody = (req, max = 8192) => new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return reject(Object.assign(new Error('type'), { code: 415 }));
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { reject(Object.assign(new Error('large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(Object.assign(new Error('json'), { code: 400 })); } });
    req.on('error', reject);
  });
  const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const isAdmin = (req) => cfg.adminToken && safeEq(String(req.headers.authorization || ''), 'Bearer ' + cfg.adminToken);
  /* درخواست‌های POST فقط از همین سایت (یا ALLOWED_ORIGIN) */
  const originOk = (req) => {
    const o = req.headers.origin;
    if (!o) return true;
    if (cfg.allowedOrigin && o === cfg.allowedOrigin) return true;
    try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
  };
  /* پنل فقط از همین سایت؛ ALLOWED_ORIGIN برای پنل پذیرفته نمی‌شود */
  const sameOrigin = (req) => {
    const o = req.headers.origin;
    if (!o) return true;
    try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
  };
  const panel = createPanel({ cfg, store, sms, log, lim, json, readBody, ipOf, originOk: sameOrigin, users: deps.users, sessions: deps.sessions });

  /* ---------- API ---------- */
  async function sendOtp(req, res) {
    const body = await readBody(req);
    const mobile = B.normMobile(body.mobile);
    if (!B.validMobile(mobile)) return json(res, 400, { ok: false, error: 'mobile' });
    const ip = ipOf(req);
    const w = otp.wait(mobile)
      || lim.peek('send:m1h:' + mobile, 5, 3600e3) || lim.peek('send:m24:' + mobile, 10, 864e5)
      || lim.peek('send:ip10:' + ip, 10, 600e3) || lim.peek('send:ip24:' + ip, 40, 864e5)
      || lim.peek('send:all', 300, 3600e3);
    if (w) return json(res, 429, { ok: false, error: 'rate', wait: w });
    ['send:m1h:' + mobile, 'send:m24:' + mobile, 'send:ip10:' + ip, 'send:ip24:' + ip, 'send:all'].forEach((k, i) => lim.take(k, [5, 10, 10, 40, 300][i], [3600e3, 864e5, 600e3, 864e5, 3600e3][i]));
    const code = otp.issue(mobile);
    const r = await sms.verify(mobile, cfg.sms.templateId, { [cfg.sms.param]: code });
    if (!r.ok) {
      otp.drop(mobile);
      log('sms.ir verify failed', r.status, r.message);
      return json(res, 502, { ok: false, error: 'sms' });
    }
    /* فقط در حالت آزمایشی (Sandbox) پیامکی واقعاً فرستاده نمی‌شود؛ کد برای آزمایش در لاگ سرور می‌آید */
    if (cfg.sms.mode === 'sandbox') log(`[sandbox] کد ${mask(mobile)}: ${code}`);
    else log('otp sent', mask(mobile));
    return json(res, 200, { ok: true, ttl: TTL / 1000, resend: RESEND / 1000 });
  }

  async function booking(req, res) {
    const ip = ipOf(req);
    const w = lim.take('verify:ip:' + ip, 30, 600e3);
    if (w) return json(res, 429, { ok: false, error: 'rate', wait: w });
    const body = await readBody(req);
    const v = B.validate(body);
    if (!v) return json(res, 400, { ok: false, error: 'input' });
    /* درخواست پیگیری‌نشده‌ی تکراری پیش از مصرف کد رد می‌شود؛ بین این بررسی و ثبت هیچ await نیست */
    if (store.conflict(v) === 'many') return json(res, 429, { ok: false, error: 'many' });
    const code = String(body.code || '').replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
    const c = otp.check(v.mobile, code);
    if (c.r === 'none' || c.r === 'expired') return json(res, 410, { ok: false, error: 'expired' });
    if (c.r === 'attempts') return json(res, 429, { ok: false, error: 'attempts' });
    if (c.r === 'code') return json(res, 401, { ok: false, error: 'code', left: c.left });
    const b = await store.add(v);
    log('request', b.ref, b.dept, mask(b.mobile));
    /* پیامک‌های بعد از ثبت (اختیاری)؛ شکستشان درخواست را باطل نمی‌کند */
    const dept = B.DEPT[b.dept].t;
    if (cfg.sms.confirmTemplateId) sms.verify(b.mobile, cfg.sms.confirmTemplateId, { DEPT: dept, REF: b.ref }).then((r) => { if (!r.ok) log('confirm sms failed', r.status); return panel.recordSms(b.ref, 'received', r); }).catch((e) => log('confirm sms error', e && e.message));
    if (cfg.sms.receptionTemplateId && B.validMobile(cfg.sms.receptionMobile)) sms.verify(cfg.sms.receptionMobile, cfg.sms.receptionTemplateId, { NAME: b.name, DEPT: dept, MOBILE: b.mobile }).then((r) => { if (!r.ok) log('reception sms failed', r.status); });
    return json(res, 200, { ok: true, ref: b.ref, sms: !!cfg.sms.confirmTemplateId });
  }

  async function callback(req, res) {
    const ip = ipOf(req);
    const w = lim.take('cb:ip:' + ip, 5, 3600e3);
    if (w) return json(res, 429, { ok: false, error: 'rate', wait: w });
    const body = await readBody(req, 2048);
    const mobile = B.normMobile(body.mobile), name = B.clean(body.name, 60), topic = B.clean(body.topic, 60);
    if (!B.validMobile(mobile) || name.length < 2) return json(res, 400, { ok: false, error: 'input' });
    if (lim.take('cb:m:' + mobile, 3, 864e5)) return json(res, 429, { ok: false, error: 'rate' });
    await store.addCallback({ name, mobile, topic });
    log('callback', mask(mobile));
    return json(res, 200, { ok: true });
  }

  async function api(req, res, url) {
    const p = url.pathname;
    if (p.startsWith('/api/panel/')) return panel.handle(req, res, url);
    if (req.method === 'OPTIONS' && cfg.allowedOrigin) {
      headers(res, { 'Access-Control-Allow-Origin': cfg.allowedOrigin, 'Access-Control-Allow-Methods': 'GET, POST, PATCH', 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Max-Age': '600', Vary: 'Origin' });
      res.writeHead(204); return res.end();
    }
    if (cfg.allowedOrigin && req.headers.origin === cfg.allowedOrigin) { res.setHeader('Access-Control-Allow-Origin', cfg.allowedOrigin); res.setHeader('Vary', 'Origin'); }
    if (p === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, service: 'sasan-booking', mode: cfg.sms.mode });
    if (req.method === 'POST') {
      if (!originOk(req)) return json(res, 403, { ok: false, error: 'origin' });
      if (p === '/api/otp/send') return sendOtp(req, res);
      if (p === '/api/booking') return booking(req, res);
      if (p === '/api/callback') return callback(req, res);
    }
    if (p === '/api/bookings' || p.startsWith('/api/bookings/') || p === '/api/callbacks') {
      if (!cfg.adminToken) return json(res, 404, { ok: false, error: 'not-found' });
      if (!isAdmin(req)) { lim.take('admin:bad:' + ipOf(req), 1000, 600e3); return json(res, 401, { ok: false, error: 'auth' }); }
      if (req.method === 'GET' && p === '/api/bookings') {
        const status = url.searchParams.get('status') || '';
        return json(res, 200, { ok: true, bookings: store.list.filter((b) => !status || b.status === status) });
      }
      if (req.method === 'GET' && p === '/api/callbacks') return json(res, 200, { ok: true, callbacks: store.callbacks });
      if (req.method === 'PATCH' && p.startsWith('/api/bookings/')) {
        const body = await readBody(req, 2048);
        const ref = decodeURIComponent(p.slice('/api/bookings/'.length));
        const cur = store.list.find((x) => x.ref === ref);
        if (!cur) return json(res, 404, { ok: false, error: 'not-found' });
        const patch = B.validatePatch(body, cur);
        if (!patch) return json(res, 400, { ok: false, error: 'input' });
        return json(res, 200, { ok: true, booking: await store.update(ref, patch) });
      }
    }
    return json(res, 404, { ok: false, error: 'not-found' });
  }

  /* ---------- فایل‌های سایت ---------- */
  const META = '<meta name="sasan-api" content="/api">';
  /* صفحه‌ی ۴۰۴ سایت (اگر هست) با وضعیت 404؛ <base href="/"> تا عکس‌ها و استایل‌ها از هر نشانی درست بارگیری شوند */
  function notFound(req, res) {
    fs.readFile(path.join(cfg.siteDir, '404.html'), 'utf8', (e, html) => {
      if (e) { headers(res, { 'Content-Type': 'text/plain; charset=utf-8' }); res.writeHead(404); return res.end('Not found'); }
      headers(res, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'Content-Security-Policy': CSP });
      res.writeHead(404);
      res.end(req.method === 'HEAD' ? undefined : html.replace(/<head>/i, '<head>\n<base href="/">\n' + META));
    });
  }

  function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { headers(res); res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch (e) { headers(res); res.writeHead(400); return res.end(); }
    /* پنل پذیرش: پوشه‌ی جدا، CSP سخت‌گیرتر، بدون کش و بدون نمایه در موتورهای جست‌وجو */
    if (rel === '/panel') { headers(res, { Location: '/panel/' }); res.writeHead(301); return res.end(); }
    const inPanel = rel.startsWith('/panel/');
    const root = inPanel ? cfg.panelDir || path.join(__dirname, 'panel') : cfg.siteDir;
    if (inPanel) rel = rel.slice('/panel'.length);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(root + path.sep) || /(^|[\\/])\./.test(path.relative(root, file))) { headers(res); res.writeHead(404); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return notFound(req, res);
      const ext = path.extname(file).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      if (ext === '.html') {
        fs.readFile(file, 'utf8', (e2, html) => {
          if (e2) { res.writeHead(500); return res.end(); }
          const out = html.replace(/<head>/i, '<head>\n' + META);
          headers(res, inPanel
            ? { 'Content-Type': type, 'Cache-Control': 'no-store', 'Content-Security-Policy': PANEL_CSP, 'X-Robots-Tag': 'noindex, nofollow', 'X-Frame-Options': 'DENY' }
            : { 'Content-Type': type, 'Cache-Control': 'no-cache', 'Content-Security-Policy': CSP });
          res.writeHead(200);
          res.end(req.method === 'HEAD' ? undefined : out);
        });
        return;
      }
      /* فایل‌های پنل با هر نسخه عوض می‌شوند؛ همیشه با مرورگر بررسی می‌شوند */
      headers(res, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': inPanel ? 'no-cache' : 'public, max-age=604800' });
      res.writeHead(200);
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }

  const handler = (req, res) => {
    let url;
    try { url = new URL(req.url, 'http://local'); } catch (e) { res.writeHead(400); return res.end(); }
    if (url.pathname.startsWith('/api/')) {
      api(req, res, url).catch((e) => {
        if (e && e.code && e.code >= 400 && e.code < 500) return json(res, e.code, { ok: false, error: 'input' });
        log('api error', e && e.message);
        if (!res.headersSent) json(res, 500, { ok: false, error: 'server' });
      });
      return;
    }
    serveStatic(req, res, url);
  };
  handler.store = store; handler.otp = otp; handler.panel = panel;
  handler.close = () => { clearInterval(sweep); panel.close(); };
  return handler;
}

if (require.main === module) {
  const cfg = load();
  cfg.warn.forEach((w) => console.warn('هشدار:', w));
  const app = createApp(cfg);
  http.createServer(app).listen(cfg.port, cfg.host, () => {
    const any = cfg.host === '0.0.0.0' || cfg.host === '::';
    console.log(`سرور کلینیک ساسان روشن شد (پیامک: ${cfg.sms.mode === 'live' ? 'اصلی' : 'آزمایشی / Sandbox؛ کد در همین‌جا چاپ می‌شود'})`);
    console.log(`  سایت: http://${any ? '127.0.0.1' : cfg.host}:${cfg.port}`);
    console.log(`  پنل پذیرش: http://${any ? '127.0.0.1' : cfg.host}:${cfg.port}/panel/` + (app.panel.users.all().length ? '' : '  (اول با npm run user یک مدیر بسازید)'));
    /* با HOST=0.0.0.0 از گوشیِ همان شبکه هم باز می‌شود */
    if (any) Object.values(require('os').networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).forEach((i) => console.log(`  از گوشی: http://${i.address}:${cfg.port}`));
  });
}

module.exports = { createApp };
