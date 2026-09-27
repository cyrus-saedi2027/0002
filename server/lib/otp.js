/* ==========================================================================
   کد یک‌بارمصرف: ۵ رقم تصادفی امن، فقط هش HMAC آن در حافظه نگه داشته می‌شود،
   ۲ دقیقه اعتبار، ارسال دوباره فقط بعد از تمام شدن همین ۲ دقیقه، حداکثر ۵ بار امتحان
   ========================================================================== */
'use strict';
const crypto = require('crypto');

/* زمان ارسال دوباره همان زمان اعتبار کد است (خواست کارفرما): یک شمارش معکوس برای هر دو */
const TTL = 120e3, RESEND = TTL, MAX_TRIES = 5;

class OtpStore {
  constructor(secret) { this.secret = secret; this.map = new Map(); }
  hash(mobile, code) { return crypto.createHmac('sha256', this.secret).update(`${mobile}:${code}`).digest(); }
  /* اگر هنوز زود است، ثانیه‌های باقی‌مانده تا ارسال دوباره */
  wait(mobile, now = Date.now()) {
    const e = this.map.get(mobile);
    return e && now - e.at < RESEND ? Math.ceil((e.at + RESEND - now) / 1000) : 0;
  }
  issue(mobile, now = Date.now()) {
    const code = String(crypto.randomInt(10000, 100000));
    this.map.set(mobile, { h: this.hash(mobile, code), at: now, tries: 0 });
    return code;
  }
  /* ارسال ناموفق بود: کد صادرشده باطل می‌شود تا کاربر بتواند دوباره بخواهد */
  drop(mobile) { this.map.delete(mobile); }
  /* 'ok' | 'none' | 'expired' | 'attempts' | 'code' (+ left) */
  check(mobile, code, now = Date.now()) {
    const e = this.map.get(mobile);
    if (!e) return { r: 'none' };
    if (now - e.at > TTL) { this.map.delete(mobile); return { r: 'expired' }; }
    if (e.tries >= MAX_TRIES) { this.map.delete(mobile); return { r: 'attempts' }; }
    e.tries++;
    const ok = /^\d{5}$/.test(code) && crypto.timingSafeEqual(e.h, this.hash(mobile, code));
    if (ok) { this.map.delete(mobile); return { r: 'ok' }; }
    const left = MAX_TRIES - e.tries;
    if (!left) { this.map.delete(mobile); return { r: 'attempts' }; }
    return { r: 'code', left };
  }
  sweep(now = Date.now()) { for (const [k, e] of this.map) if (now - e.at > TTL) this.map.delete(k); }
}

module.exports = { OtpStore, TTL, RESEND, MAX_TRIES };
