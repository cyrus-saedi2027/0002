/* ==========================================================================
   آمار بازدید سایت، بی‌نام و روی سرور خود کلینیک (بدون کوکی، بدون ابزار بیرونی)
   - هر صفحه یک بار «بازدید» می‌فرستد: نشانی صفحه، دامنه‌ی سایتی که از آن آمده و پهنای صفحه (برای نوع دستگاه)
   - IP و مرورگر فقط برای شمردن «بازدیدکننده‌ی یکتای امروز» به‌صورت درهم‌سازی‌شده با نمکی که هر روز عوض
     می‌شود در حافظه می‌ماند و هیچ‌جا ذخیره نمی‌شود؛ در فایل فقط شمارنده‌های روزانه است (data/stats.json)
   - ربات‌ها شمرده نمی‌شوند؛ ۴۰۰ روز آخر نگه داشته می‌شود
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const T = require('./tehran');

const KEEP = 400;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|axios|node-fetch|monitor/i;
/* منبع ورود: دامنه‌ی سایت قبلی به یک نام خوانا */
const SOURCES = [
  [/(^|\.)google\./, 'گوگل'], [/(^|\.)bing\.com$/, 'بینگ'], [/(^|\.)yandex\./, 'یاندکس'], [/(^|\.)duckduckgo\.com$/, 'داک‌داک‌گو'],
  [/(^|\.)(instagram\.com|l\.instagram\.com)$/, 'اینستاگرام'], [/(^|\.)(t\.me|telegram\.org|web\.telegram\.org)$/, 'تلگرام'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'واتس‌اپ'], [/(^|\.)balad\.ir$/, 'بلد'], [/(^|\.)(neshan\.org|nshn\.ir)$/, 'نشان'],
  [/(^|\.)behtarino\.com$/, 'بهترینو'], [/(^|\.)(eitaa\.com|rubika\.ir|bale\.ai)$/, 'پیام‌رسان‌های داخلی']
];
const source = (host) => {
  if (!host) return 'مستقیم';
  const h = String(host).toLowerCase().replace(/^www\./, '');
  const s = SOURCES.find(([re]) => re.test(h));
  return s ? s[1] : h.slice(0, 60);
};
const device = (w) => (w < 700 ? 'm' : w < 1100 ? 't' : 'd');
const cleanPath = (p) => {
  p = String(p || '/').split(/[?#]/)[0].slice(0, 80);
  if (p === '' || p === '/index.html') p = '/';
  return /^\/([a-z0-9-]+\.html)?$/.test(p) ? p : null;
};
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

class Stats {
  constructor(dir) {
    this.file = path.join(dir, 'stats.json');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    try { this.days = JSON.parse(fs.readFileSync(this.file, 'utf8')).days || {}; } catch (e) { this.days = {}; }
    this.day = ''; this.salt = null; this.seen = new Set();
    this.dirty = false; this.timer = null;
  }
  roll(d) {
    if (d === this.day) return;
    this.day = d; this.salt = crypto.randomBytes(16); this.seen = new Set();
  }
  /* یک بازدید؛ برمی‌گرداند که شمرده شد یا نه */
  hit({ path: p, ref, w, ua, ip }, now = new Date()) {
    if (!ua || BOT.test(ua)) return false;
    const page = cleanPath(p);
    if (!page) return false;
    const d = T.today(now);
    this.roll(d);
    const day = this.days[d] || (this.days[d] = { views: 0, uniq: 0, pages: {}, src: {}, dev: {} });
    day.views++;
    inc(day.pages, page);
    const who = crypto.createHmac('sha256', this.salt).update(String(ip) + '|' + String(ua)).digest('base64').slice(0, 16);
    if (!this.seen.has(who)) {
      this.seen.add(who);
      day.uniq++;
      /* منبع و دستگاه برای هر بازدیدکننده یک بار در روز */
      inc(day.src, source(ref));
      inc(day.dev, device(Number(w) || 0));
    }
    this.touch();
    return true;
  }
  touch() {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.save(); }, 30e3);
    if (this.timer.unref) this.timer.unref();
  }
  save() {
    if (!this.dirty) return;
    this.dirty = false;
    const keys = Object.keys(this.days).sort();
    keys.slice(0, Math.max(0, keys.length - KEEP)).forEach((k) => delete this.days[k]);
    const tmp = this.file + '.tmp';
    try { fs.writeFileSync(tmp, JSON.stringify({ days: this.days }), { mode: 0o600 }); fs.renameSync(tmp, this.file); } catch (e) { this.dirty = true; }
  }
  /* خلاصه برای پنل: n روز آخر (تا امروز) */
  summary(n = 30, now = new Date()) {
    n = Math.max(1, Math.min(KEEP, Math.round(n) || 30));
    const end = T.today(now);
    const list = [];
    for (let i = n - 1; i >= 0; i--) { const d = T.addDays(end, -i); const x = this.days[d]; list.push({ d, views: x ? x.views : 0, uniq: x ? x.uniq : 0 }); }
    const pages = {}, src = {}, dev = {};
    list.forEach(({ d }) => { const x = this.days[d]; if (!x) return; for (const k in x.pages) inc(pages, k, x.pages[k]); for (const k in x.src) inc(src, k, x.src[k]); for (const k in x.dev) inc(dev, k, x.dev[k]); });
    const top = (o, m) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, m).map(([k, v]) => ({ k, v }));
    const sum = (arr, f) => arr.reduce((a, x) => a + x[f], 0);
    const half = Math.floor(n / 2);
    return {
      days: list,
      totals: { views: sum(list, 'views'), uniq: sum(list, 'uniq'), today: list[list.length - 1], yesterday: list[list.length - 2] || null,
        /* رشد: نیمه‌ی دوم بازه در برابر نیمه‌ی اول */
        prev: sum(list.slice(0, half), 'uniq'), cur: sum(list.slice(n - half), 'uniq') },
      pages: top(pages, 15), sources: top(src, 10), devices: { m: dev.m || 0, t: dev.t || 0, d: dev.d || 0 }
    };
  }
  close() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } this.save(); }
}

module.exports = { Stats, source, cleanPath, BOT };
