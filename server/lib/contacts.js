/* ==========================================================================
   مخاطبان: هر شماره‌ای که به سایت یا پذیرش داده شده، برای اطلاع‌رسانی‌های بعدی کلینیک
   - منبع‌ها: otp (کد تأیید برایش رفت)، booking (درخواست نوبت با کد تأییدشده)، callback (فرم «با من تماس بگیرید»)،
     phone (نوبت تلفنی که پذیرش ثبت کرد). کد ورود پنل به کارکنان این‌جا نمی‌آید.
   - برای هر شماره: نام (آخرین نامی که داده)، بخش‌هایی که درخواست داده، اولین و آخرین بار، دفعات، تأیید با کد،
     «لغو اطلاع‌رسانی» و یادداشت پذیرش. در data/contacts.json (فقط روی سرور کلینیک).
   - بار اول، از درخواست‌ها و درخواست‌های تماسی که از قبل هست پر می‌شود.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { normMobile, validMobile, clean } = require('./bookings');

const SOURCES = ['otp', 'booking', 'callback', 'phone'];
const DEPTS = ['dental', 'beauty', 'medicine'];

class Contacts {
  constructor(dir) {
    this.file = path.join(dir, 'contacts.json');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.fresh = !fs.existsSync(this.file);
    this.map = new Map();
    try {
      const j = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      (Array.isArray(j) ? j : []).forEach((c) => { if (c && validMobile(c.mobile)) this.map.set(c.mobile, c); });
    } catch (e) { /* فایل هنوز نیست */ }
    this.timer = null;
    this.chain = Promise.resolve();
  }

  /* یک بار دیده شدن شماره؛ at برای پر کردن از داده‌های قبلی */
  note(mobile, { source, name = '', dept = '', verified = false, at = null } = {}) {
    const m = normMobile(mobile);
    if (!validMobile(m) || !SOURCES.includes(source)) return null;
    const when = at || new Date().toISOString();
    let c = this.map.get(m);
    if (!c) {
      c = { mobile: m, name: '', first: when, last: when, count: 0, src: {}, depts: [], verified: false, optout: false, note: '' };
      this.map.set(m, c);
    }
    if (when < c.first) c.first = when;
    if (when > c.last) c.last = when;
    c.count++;
    c.src[source] = (c.src[source] || 0) + 1;
    const n = clean(name, 60);
    if (n.length >= 2 && (!c.name || when >= c.last)) c.name = n;
    if (DEPTS.includes(dept) && !c.depts.includes(dept)) c.depts.push(dept);
    if (verified) c.verified = true;
    this.touch();
    return c;
  }

  /* بار اول: شماره‌های درخواست‌ها و درخواست‌های تماسی که از قبل ثبت شده‌اند */
  backfill(bookings, callbacks) {
    if (!this.fresh) return 0;
    this.fresh = false;
    let n = 0;
    (bookings || []).forEach((b) => { if (this.note(b.mobile, { source: b.source === 'phone' ? 'phone' : 'booking', name: b.name, dept: b.dept, verified: b.source !== 'phone', at: b.createdAt })) n++; });
    (callbacks || []).forEach((c) => { if (this.note(c.mobile, { source: 'callback', name: c.name, at: c.createdAt })) n++; });
    this.touch();
    return n;
  }

  list() { return [...this.map.values()].sort((a, b) => (a.last < b.last ? 1 : -1)); }
  get(mobile) { return this.map.get(normMobile(mobile)) || null; }
  update(mobile, v) {
    const c = this.get(mobile);
    if (!c) return null;
    if (v.optout !== undefined) c.optout = !!v.optout;
    if (v.name !== undefined) c.name = clean(v.name, 60);
    if (v.note !== undefined) c.note = clean(v.note, 300);
    this.touch();
    return c;
  }
  remove(mobile) {
    const ok = this.map.delete(normMobile(mobile));
    if (ok) this.touch();
    return ok;
  }

  touch() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.save(); }, 2000);
    if (this.timer.unref) this.timer.unref();
  }
  save() {
    const data = JSON.stringify(this.list(), null, 0);
    this.chain = this.chain.then(() => new Promise((res) => {
      const tmp = this.file + '.' + process.pid + '.tmp';
      fs.writeFile(tmp, data, { mode: 0o600 }, (e) => (e ? res() : fs.rename(tmp, this.file, () => res())));
    }));
    return this.chain;
  }
  close() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    try {
      fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.list()), { mode: 0o600 });
      fs.renameSync(this.file + '.tmp', this.file);
    } catch (e) { /* پوشه‌ی داده در دسترس نیست */ }
  }
}

module.exports = { Contacts, SOURCES };
