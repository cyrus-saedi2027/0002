#!/usr/bin/env node
/* ==========================================================================
   عکس‌های راهنمای پنل پذیرش (server/panel/guide/*.webp) از نسخه‌ی نمایشی پنل
   نیاز: Playwright با Chromium، و Python 3 با Pillow برای تبدیل به WebP
     node tools/panel-guide-shots.js [خروجی PNG]   سپس   python3 tools/panel-guide-webp.py
   داده‌ها همان داده‌های ساختگی demo.js اند؛ نوار «نسخه‌ی نمایشی» پیش از عکس برداشته می‌شود.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'sasan-guide-png'));
const EXE = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const TYPES = { '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
fs.mkdirSync(OUT, { recursive: true });

async function context(browser, mobile) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce', locale: 'fa-IR' }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.25, reducedMotion: 'reduce', locale: 'fa-IR' });
  await ctx.route('http://panel.test/**', (r) => {
    const u = new URL(r.request().url());
    const rel = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname;
    const f = rel.startsWith('/panel/') ? path.join(ROOT, 'server/panel', rel.slice(7)) : path.join(ROOT, 'site', rel);
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'text/html; charset=utf-8', body: fs.readFileSync(f) });
  });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  return { ctx, p };
}

const wait = (p, ms) => p.waitForTimeout(ms);
async function shot(p, name, opt = {}) {
  const file = path.join(OUT, name + '.png');
  /* پیام‌های کوتاه و حلقه‌ی تمرکز در عکس نیایند */
  await p.evaluate(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; if (document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('#modal, #drawer, #cdBoxes, form')) document.activeElement.blur(); });
  if (opt.el) {
    const el = typeof opt.el === 'string' ? await p.$(opt.el) : opt.el;
    if (!el) { console.log('  × پیدا نشد:', name, opt.el); return; }
    /* بالای بخش زیر نوار چسبان بالای پنل بیاید */
    if (!opt.noScroll) await el.evaluate((e, top) => { const r = e.getBoundingClientRect(); window.scrollBy(0, r.top - top); }, opt.top || 88);
    await wait(p, 250);
    /* نما ممکن است همین حالا دوباره ساخته شده باشد */
    const el2 = typeof opt.el === 'string' ? await p.$(opt.el) : el;
    const b = el2 && (await el2.boundingBox());
    if (!b) { console.log('  × دیده نمی‌شود:', name); return; }
    const pad = opt.pad == null ? 16 : opt.pad;
    const vw = p.viewportSize();
    const clip = { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: 0, height: 0 };
    clip.width = Math.min(vw.width - clip.x, b.width + pad * 2);
    clip.height = Math.min(opt.maxH || Infinity, vw.height - clip.y, b.height + pad * 2);
    await p.screenshot({ path: file, clip });
  } else await p.screenshot({ path: file, fullPage: !!opt.full });
  console.log('  ✓', name);
}
async function login(p) {
  await p.goto('http://panel.test/panel/');
  await wait(p, 900);
  await p.click('#loginForm button[type=submit]');
  await p.waitForSelector('#app:not([hidden])', { timeout: 15000 });
  await wait(p, 1200);
  await p.evaluate(() => { const r = document.getElementById('ribbon'); if (r) r.hidden = true; });
}
const go = async (p, hash, ms = 1300) => { await p.evaluate((h) => { location.hash = h; }, hash); await wait(p, ms); await p.evaluate(() => { scrollTo(0, 0); const r = document.getElementById('ribbon'); if (r) r.hidden = true; }); await wait(p, 200); };
const esc = (p) => p.keyboard.press('Escape');

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });

  /* ---------------- کامپیوتر ---------------- */
  console.log('کامپیوتر');
  let { ctx, p } = await context(browser, false);
  await p.goto('http://panel.test/panel/');
  await wait(p, 1400);
  await p.fill('#lgUser', 'paziresh');
  await shot(p, 'login');
  await p.click('#loginForm button[type=submit]');
  await p.waitForSelector('#codeForm:not([hidden])');
  await wait(p, 400);
  await shot(p, 'login-code', { el: '.login__card', pad: 0 });
  await p.waitForSelector('#app:not([hidden])', { timeout: 15000 });
  await wait(p, 1500);
  await p.evaluate(() => { document.getElementById('ribbon').hidden = true; });
  /* پیشخوان */
  await shot(p, 'today');
  await shot(p, 'bar', { el: '#bar', pad: 0 });
  await shot(p, 'today-tasks', { el: '.tasks-card', pad: 12, maxH: 760 });
  await shot(p, 'today-day', { el: '.day', pad: 20, maxH: 700 });
  /* منوی بیشتر و حساب */
  await p.click('#tabs [data-act="more"]'); await wait(p, 350);
  await shot(p, 'menu-more', { el: '#menu', pad: 14, noScroll: true });
  await esc(p); await wait(p, 200);
  await p.click('#meBtn'); await wait(p, 350);
  await shot(p, 'menu-me', { el: '#menu', pad: 14, noScroll: true });
  await esc(p); await wait(p, 200);
  await p.click('#meBtn'); await wait(p, 250); await p.click('#menu [data-act="pass"]'); await wait(p, 600);
  await shot(p, 'password', { el: '#modal .modal__box', pad: 0, noScroll: true });
  await esc(p); await wait(p, 500);
  /* درخواست‌ها و کشوی هر درخواست */
  await go(p, '#/requests');
  await shot(p, 'requests');
  const newRef = await p.$eval('.row[data-ref]', (e) => e.dataset.ref).catch(() => null);
  const firstNew = await p.evaluate(() => { const el = [...document.querySelectorAll('.row[data-ref]')].find((r) => /منتظر تماس/.test(r.innerText)); return el ? el.dataset.ref : null; });
  await p.click(`.row[data-ref="${firstNew || newRef}"]`); await wait(p, 900);
  await shot(p, 'drawer-new', { el: '#drawer', pad: 0, noScroll: true });
  await p.click('#drawer [data-act="close"]'); await wait(p, 500);
  /* «تماس گرفته شد»: انتخاب روز و ساعت همان‌جا باز است */
  const called = await p.evaluate(() => { const el = [...document.querySelectorAll('.row[data-ref]')].find((r) => /تماس گرفته شد/.test(r.innerText)); return el ? el.dataset.ref : null; });
  if (called) {
    await p.click(`.row[data-ref="${called}"]`); await wait(p, 900);
    /* فردا تا ساعت‌های همه‌ی روز دیده شوند */
    const days = await p.$$('#pick .strip button:not(.is-closed):not(:disabled)');
    if (days[1]) { await days[1].click(); await wait(p, 500); }
    const tm = await p.$$('#pick .time:not(.is-busy)');
    const pickT = tm[Math.min(12, tm.length - 1)];
    if (pickT) { await pickT.click(); await wait(p, 500); }
    await shot(p, 'drawer-pick', { el: '#pick', pad: 10 });
    await p.click('#drawer [data-act="close"]'); await wait(p, 500);
  }
  /* نوبت‌دار: بلیت نوبت */
  await p.click('.seg [data-act="fst"][data-v="booked"]').catch(() => {}); await wait(p, 1200);
  const sch = await p.$eval('.row[data-ref]', (e) => e.dataset.ref).catch(() => null);
  if (sch) {
    await p.click(`.row[data-ref="${sch}"]`); await wait(p, 900);
    await shot(p, 'drawer-sched', { el: '#drawer', pad: 0, noScroll: true });
    for (const s of await p.$$('#drawer details:not([open]) > summary')) { await s.click(); await wait(p, 250); }
    await p.evaluate(() => { const b = document.querySelector('#drawer .drawer__b'); if (b) b.scrollTop = b.scrollHeight; }); await wait(p, 400);
    await shot(p, 'drawer-history', { el: '#drawer', pad: 0, noScroll: true });
    await p.click('#drawer [data-act="close"]'); await wait(p, 500);
  }
  await p.click('.seg [data-act="fst"][data-v="open"]').catch(() => {}); await wait(p, 600);
  /* نوبت تازه: سه قدم */
  await p.click('#newBtn'); await wait(p, 700);
  await p.fill('#newForm input[name="name"]', 'مریم کاظمی');
  await p.fill('#newForm input[name="mobile"]', '09001234571'); await wait(p, 300);
  await p.fill('#newForm textarea[name="note"]', 'درد دندان عقل از دیروز');
  await shot(p, 'new-1', { el: '#modal .modal__box', pad: 0, noScroll: true });
  await p.click('#newForm button[type="submit"]'); await wait(p, 600);
  await p.click('#newForm .dcard.dental'); await p.click('#newForm .opt:first-child'); await wait(p, 300);
  await shot(p, 'new-2', { el: '#modal .modal__box', pad: 0, noScroll: true });
  await p.click('#newForm button[type="submit"]'); await wait(p, 700);
  const d2 = await p.$('#newForm .strip button:not(.is-closed):not(:disabled)');
  if (d2) { await d2.click(); await wait(p, 400); }
  const t2 = await p.$$('#newForm .time:not(.is-busy)');
  if (t2[2]) { await t2[2].click(); await wait(p, 300); }
  await shot(p, 'new-3', { el: '#modal .modal__box', pad: 0, noScroll: true });
  await esc(p); await wait(p, 500);
  /* تقویم */
  await go(p, '#/calendar', 1500);
  await shot(p, 'calendar');
  /* تماس‌ها */
  await go(p, '#/callbacks');
  await shot(p, 'callbacks');
  await p.click('.task[data-act="cb"]'); await wait(p, 600);
  await shot(p, 'callback-modal', { el: '#modal .modal__box', pad: 0, noScroll: true });
  await esc(p); await wait(p, 400);
  /* مخاطبان */
  await go(p, '#/contacts', 1600);
  await shot(p, 'contacts');
  const cm = await p.$('#ctl .ctr [data-act="ctmenu"]');
  await cm.click(); await wait(p, 350);
  const row = await p.$('#ctl .ctr');
  const rb = await row.boundingBox(), mb = await (await p.$('#menu')).boundingBox();
  const top = Math.min(rb.y, mb.y) - 12, bottom = Math.max(rb.y + rb.height, mb.y + mb.height) + 12;
  await p.screenshot({ path: path.join(OUT, 'contacts-menu.png'), clip: { x: rb.x - 12, y: top, width: rb.width + 24, height: bottom - top } });
  console.log('  ✓ contacts-menu');
  await p.click('#menu [data-act="ctedit"]'); await wait(p, 600);
  await shot(p, 'contacts-edit', { el: '#modal .modal__box', pad: 0, noScroll: true });
  await esc(p); await wait(p, 400);
  await p.click('.seg [data-act="ctf"][data-v="half"]'); await wait(p, 1400);
  await shot(p, 'contacts-half', { el: '.ct-list', pad: 12, maxH: 520 });
  await p.click('.seg [data-act="ctf"][data-v="all"]'); await wait(p, 700);
  /* مقاله‌ها */
  await go(p, '#/articles', 2200);
  await shot(p, 'articles');
  await p.click('.acard'); await wait(p, 2200);
  await shot(p, 'editor');
  await shot(p, 'editor-toolbar', { el: '.ed__tools', pad: 10 });
  const serp = await p.$('.serp');
  if (serp) await shot(p, 'editor-serp', { el: (await serp.evaluateHandle((e) => e.closest('.card') || e)).asElement(), pad: 10, top: 150 });
  const sc = await p.$('#edScore');
  if (sc) await shot(p, 'editor-score', { el: (await sc.evaluateHandle((e) => e.closest('.card') || e)).asElement(), pad: 10, top: 150 });
  await go(p, '#/articles', 1500);
  /* پیامک */
  await go(p, '#/sms', 1600);
  await shot(p, 'sms');
  await shot(p, 'sms-templates', { el: '.tpls', pad: 16 });
  /* کارکنان */
  await go(p, '#/users', 1300);
  await shot(p, 'users');
  await p.click('[data-act="unew"]'); await wait(p, 600);
  await p.fill('#userForm input[name="name"]', 'نیلوفر رحیمی');
  await p.fill('#userForm input[name="username"]', 'niloofar');
  await p.fill('#userForm input[name="mobile"]', '09001112233');
  await p.click('[data-act="genpass"]'); await wait(p, 400);
  await shot(p, 'user-new', { el: '#modal .modal__box', pad: 0, noScroll: true });
  await esc(p); await wait(p, 400);
  /* آمار و گزارش کارها */
  await go(p, '#/stats', 1800);
  await shot(p, 'stats');
  await go(p, '#/audit', 1400);
  await shot(p, 'audit');
  console.log('خطاها:', p.errs.length ? p.errs : 'هیچ');
  await ctx.close();

  /* ---------------- گوشی ---------------- */
  console.log('گوشی');
  ({ ctx, p } = await context(browser, true));
  await p.goto('http://panel.test/panel/');
  await wait(p, 1400);
  await p.fill('#lgUser', 'paziresh');
  await shot(p, 'm-login');
  await p.click('#loginForm button[type=submit]');
  await p.waitForSelector('#app:not([hidden])', { timeout: 15000 });
  await wait(p, 1500);
  await p.evaluate(() => { document.getElementById('ribbon').hidden = true; });
  await shot(p, 'm-today');
  await p.click('#tabbar [data-act="more"]'); await wait(p, 400);
  await shot(p, 'm-more');
  await esc(p); await wait(p, 300);
  await go(p, '#/requests');
  await p.click('.row[data-ref]'); await wait(p, 1000);
  await shot(p, 'm-drawer');
  await p.click('#drawer [data-act="close"]'); await wait(p, 600);
  await go(p, '#/calendar', 1500);
  await shot(p, 'm-calendar');
  await go(p, '#/contacts', 1500);
  await shot(p, 'm-contacts');
  console.log('خطاها:', p.errs.length ? p.errs : 'هیچ');
  await ctx.close();
  await browser.close();
  console.log('PNG ها در', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
