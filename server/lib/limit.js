/* ==========================================================================
   محدودیت تعداد درخواست (پنجره‌ی لغزان، در حافظه)
   ========================================================================== */
'use strict';

class Limiter {
  constructor() { this.hits = new Map(); }
  /* اگر مجاز باشد ثبت می‌کند و null برمی‌گرداند؛ وگرنه چند ثانیه تا آزاد شدن */
  take(key, max, windowMs, now = Date.now()) {
    const arr = (this.hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) { this.hits.set(key, arr); return Math.ceil((arr[0] + windowMs - now) / 1000); }
    arr.push(now);
    this.hits.set(key, arr);
    return null;
  }
  /* بدون ثبت، فقط بررسی */
  peek(key, max, windowMs, now = Date.now()) {
    const arr = (this.hits.get(key) || []).filter((t) => now - t < windowMs);
    return arr.length >= max ? Math.ceil((arr[0] + windowMs - now) / 1000) : null;
  }
  sweep(maxAgeMs = 24 * 3600e3, now = Date.now()) {
    for (const [k, arr] of this.hits) {
      const keep = arr.filter((t) => now - t < maxAgeMs);
      if (keep.length) this.hits.set(k, keep); else this.hits.delete(k);
    }
  }
}

module.exports = { Limiter };
