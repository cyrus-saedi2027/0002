/* ==========================================================================
   نشست‌های پنل پذیرش
   - شناسه‌ی نشست ۳۲ بایت تصادفی است و فقط در کوکی HttpOnly مرورگر کارمند می‌ماند؛
     سرور فقط هش SHA-256 آن را نگه می‌دارد (در فایل هم، تا با ری‌استارت سرور کسی بیرون نیفتد)
   - ۴ ساعت بی‌کاری یا ۱۲ ساعت از ورود: نشست تمام می‌شود
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IDLE = 4 * 3600e3, MAX = 12 * 3600e3;
const h = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

class Sessions {
  constructor(dir, { idle = IDLE, max = MAX } = {}) {
    this.file = dir ? path.join(dir, 'sessions.json') : null;
    this.idle = idle; this.max = max;
    this.map = new Map();
    if (this.file) {
      try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(this.file, 'utf8')))) this.map.set(k, v); } catch (e) { /* فایل نیست */ }
    }
    this.dirty = false;
  }
  persist() {
    if (!this.file) return;
    const tmp = this.file + '.' + process.pid + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.map)), { mode: 0o600 });
      fs.renameSync(tmp, this.file);
      this.dirty = false;
    } catch (e) { /* ذخیره نشد؛ نشست‌ها در حافظه می‌مانند */ }
  }
  create(uid, now = Date.now()) {
    const token = crypto.randomBytes(32).toString('base64url');
    this.map.set(h(token), { uid, at: now, seen: now });
    this.persist();
    return token;
  }
  /* { key, uid, at } یا null */
  get(token, now = Date.now()) {
    if (!token) return null;
    const key = h(token);
    const s = this.map.get(key);
    if (!s) return null;
    if (now - s.seen > this.idle || now - s.at > this.max) { this.map.delete(key); this.persist(); return null; }
    /* زمان آخرین فعالیت هر دقیقه یک بار روی فایل می‌رود */
    if (now - s.seen > 60e3) { s.seen = now; this.dirty = true; }
    return { key, uid: s.uid, at: s.at };
  }
  drop(token) { if (this.map.delete(h(token))) this.persist(); }
  /* همه‌ی نشست‌های یک کاربر (مثلاً بعد از عوض شدن رمز یا غیرفعال شدن)؛ keepKey نشست فعلی را نگه می‌دارد */
  dropUser(uid, keepKey = null) {
    let n = 0;
    for (const [k, s] of this.map) if (s.uid === uid && k !== keepKey) { this.map.delete(k); n++; }
    if (n) this.persist();
    return n;
  }
  sweep(now = Date.now()) {
    let n = 0;
    for (const [k, s] of this.map) if (now - s.seen > this.idle || now - s.at > this.max) { this.map.delete(k); n++; }
    if (n || this.dirty) this.persist();
  }
}

module.exports = { Sessions, IDLE, MAX };
