/* ==========================================================================
   درخواست‌های نوبت: بیمار فقط بخش، نوع مراجعه، نام، موبایل و توضیح کوتاه می‌فرستد.
   روز، ساعت و پزشک را پذیرش تلفنی با بیمار هماهنگ می‌کند و از پنل پذیرش (PATCH) ثبت می‌کند.
   ذخیره در فایل JSON؛ نوشتن اتمی است (فایل موقت و rename) و نوشتن‌ها پشت سر هم انجام می‌شوند.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* days: روزهای کاری (۰ = یکشنبه … ۶ = شنبه)، from/to: دقیقه از نیمه‌شب به وقت تهران.
   پنل پذیرش از این‌ها فقط برای پیشنهاد و هشدار استفاده می‌کند؛ نوبت بیرون از ساعت رد نمی‌شود (شیفت‌های استثنا). */
const DEPT = {
  dental: { t: 'دندانپزشکی', days: [6, 0, 1, 4], from: 600, to: 1200, hours: 'شنبه، یکشنبه، دوشنبه و پنجشنبه · ۱۰ تا ۲۰' },
  beauty: { t: 'زیبایی و لیزر', days: [0, 1, 2, 3, 4, 5, 6], from: 540, to: 1260, hours: 'همه‌روزه با هماهنگی قبلی' },
  medicine: { t: 'پزشک عمومی', days: [0, 1, 2, 3, 4, 5, 6], from: 0, to: 1440, hours: 'شبانه‌روزی' }
};
/* فقط برای ثبت پذیرش (کدام پزشک)؛ بیمار پزشک انتخاب نمی‌کند */
const DOCTORS = {
  'doc-1': { k: 'dental', name: 'دکتر نیک‌پور' },
  'doc-2': { k: 'dental', name: 'دکتر رحمانی' },
  'doc-5': { k: 'beauty', name: 'دکتر کیانی' },
  'doc-3': { k: 'medicine', name: 'دکتر صالحی' },
  'doc-4': { k: 'medicine', name: 'دکتر شریفی' }
};
const TYPES = ['ویزیت اول', 'ادامه‌ی درمان', 'مشاوره'];
/* وضعیت‌ها: تازه ← تماس گرفته شد ← نوبت داده شد ← در کلینیک (آمد) ← انجام شد / لغو / نیامد */
const STATUSES = ['new', 'called', 'scheduled', 'arrived', 'done', 'cancelled', 'no-show'];
const OPEN = ['new', 'called'];

const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const normMobile = (v) => String(v || '')
  .replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c))
  .replace(/[\s\-().]/g, '').replace(/^(\+98|0098)/, '0');
const validMobile = (m) => /^09\d{9}$/.test(m);

/* درخواست بیمار؛ هر فیلد دیگری (روز، ساعت، پزشک) نادیده گرفته می‌شود */
function validate(b) {
  const out = {
    dept: String(b.dept || ''),
    type: String(b.type || ''),
    name: clean(b.name, 60),
    note: clean(b.note, 300),
    mobile: normMobile(b.mobile)
  };
  if (!DEPT[out.dept] || !TYPES.includes(out.type) || out.name.length < 2 || !validMobile(out.mobile)) return null;
  return out;
}

const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().startsWith(d);

/* تغییرات پذیرش: وضعیت، و بعد از هماهنگی تلفنی روز و ساعت و پزشک */
function validatePatch(b, booking) {
  const out = {};
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return null; out.status = b.status; }
  if (b.date !== undefined) { if (b.date !== '' && !validDate(String(b.date))) return null; out.date = String(b.date); }
  if (b.time !== undefined) { const t = Number(b.time); if (b.time !== '' && !(Number.isInteger(t) && t >= 0 && t < 1440)) return null; out.time = b.time === '' ? '' : t; }
  if (b.doctor !== undefined) { if (b.doctor !== '' && (!DOCTORS[b.doctor] || DOCTORS[b.doctor].k !== booking.dept)) return null; out.doctor = String(b.doctor); }
  if (b.staffNote !== undefined) out.staffNote = clean(b.staffNote, 300);
  return Object.keys(out).length ? out : null;
}

class BookingStore {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'bookings.json');
    this.cbFile = path.join(dir, 'callbacks.json');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.list = this.read(this.file);
    this.callbacks = this.read(this.cbFile);
    this.chain = Promise.resolve();
  }
  read(f) { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return Array.isArray(j) ? j : []; } catch (e) { return []; } }
  save(f, data) {
    this.chain = this.chain.then(() => new Promise((res, rej) => {
      const tmp = f + '.' + process.pid + '.tmp';
      fs.writeFile(tmp, JSON.stringify(data, null, 1), { mode: 0o600 }, (err) => {
        if (err) return rej(err);
        fs.rename(tmp, f, (e2) => (e2 ? rej(e2) : res()));
      });
    }));
    return this.chain;
  }
  /* 'many' اگر این شماره هنوز درخواست پیگیری‌نشده دارد (جلوی ثبت‌های تکراری را می‌گیرد) */
  conflict(v) {
    const open = this.list.filter((b) => b.mobile === v.mobile && OPEN.includes(b.status));
    return open.length >= 2 ? 'many' : null;
  }
  newRef() {
    let ref;
    do { ref = 'SS-' + String(crypto.randomInt(10000, 100000)); } while (this.list.some((b) => b.ref === ref));
    return ref;
  }
  async add(v) {
    const b = Object.assign({ ref: this.newRef(), status: 'new', createdAt: new Date().toISOString() }, v);
    this.list.push(b);
    await this.save(this.file, this.list);
    return b;
  }
  async update(ref, patch) {
    const b = this.list.find((x) => x.ref === ref);
    if (!b) return null;
    Object.assign(b, patch, { updatedAt: new Date().toISOString() });
    await this.save(this.file, this.list);
    return b;
  }
  /* تغییر دلخواه روی یک درخواست (پنل پذیرش) و ذخیره.
     v شماره‌ی نسخه است تا کار یک همکار روی کار همکار دیگر رونویسی نشود؛ ثبت پیامک و یادآوری (bump: false) نسخه را عوض نمی‌کند */
  async mutate(ref, fn, { bump = true } = {}) {
    const b = this.list.find((x) => x.ref === ref);
    if (!b) return null;
    fn(b);
    if (bump) { b.v = (b.v || 0) + 1; b.updatedAt = new Date().toISOString(); }
    await this.save(this.file, this.list);
    return b;
  }
  async mutateCallback(id, fn) {
    const c = this.callbacks.find((x) => x.id === id);
    if (!c) return null;
    fn(c);
    c.v = (c.v || 0) + 1;
    c.updatedAt = new Date().toISOString();
    await this.save(this.cbFile, this.callbacks);
    return c;
  }
  async addCallback(c) {
    const r = Object.assign({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'new' }, c);
    this.callbacks.push(r);
    await this.save(this.cbFile, this.callbacks);
    return r;
  }
}

/* رویدادهای هر درخواست برای تاریخچه در پنل (۶۰ تای آخر) */
function addLog(x, by, ev, v) {
  x.log = (x.log || []).concat([{ at: new Date().toISOString(), by, ev, v }]).slice(-60);
}

module.exports = { BookingStore, validate, validatePatch, validDate, addLog, normMobile, validMobile, clean, DEPT, DOCTORS, TYPES, STATUSES, OPEN };
