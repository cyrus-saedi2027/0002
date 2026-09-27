/* ==========================================================================
   نوبت‌ها: قوانین زمان (همان قوانین کپسول نوبت در js/book.js)، اعتبارسنجی و ذخیره در فایل JSON.
   نوشتن فایل اتمی است (فایل موقت و rename) و نوشتن‌ها پشت سر هم انجام می‌شوند.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DENTAL_DAYS = [0, 1, 2, 5];           /* شنبه = ۰ */
const ALL = [0, 1, 2, 3, 4, 5, 6];
const DEPT = {
  dental: { t: 'دندانپزشکی', days: DENTAL_DAYS, hours: [[10, 20]] },
  beauty: { t: 'زیبایی و لیزر', days: ALL, hours: [[10, 20]] },
  medicine: { t: 'پزشک عمومی', days: ALL, hours: [[8, 24]] }
};
const DOCTORS = {
  'doc-1': { k: 'dental', name: 'دکتر نیک‌پور', days: [0, 2, 5] },
  'doc-2': { k: 'dental', name: 'دکتر رحمانی', days: [0, 1, 2] },
  'doc-5': { k: 'beauty', name: 'دکتر کیانی' },
  'doc-3': { k: 'medicine', name: 'دکتر صالحی', from: 8, to: 20 },
  'doc-4': { k: 'medicine', name: 'دکتر شریفی', from: 20, to: 24 }
};
const TYPES = ['ویزیت اول', 'ادامه‌ی درمان', 'مشاوره'];
const DAYS_FA = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

/* تاریخ و دقیقه‌ی فعلی به وقت تهران */
function tehranNow(now = new Date()) {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(now).forEach((x) => { p[x.type] = x.value; });
  const iso = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { iso, min: (+p.hour % 24) * 60 + (+p.minute) };
}
const dayIndex = (iso) => (new Date(iso + 'T12:00:00Z').getUTCDay() + 1) % 7;
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const normMobile = (v) => String(v || '')
  .replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c))
  .replace(/[\s\-().]/g, '').replace(/^(\+98|0098)/, '0');
const validMobile = (m) => /^09\d{9}$/.test(m);

/* آیا این ساعت برای این بخش و پزشک در آن روز مجاز است؟ */
function slotOk(dept, doctor, date, time, now = tehranNow()) {
  const d = DEPT[dept];
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(time) || time % 30) return false;
  const off = dayDiff(now.iso, date);
  if (!(off >= 0 && off < 14)) return false;
  const di = dayIndex(date);
  if (!d.days.includes(di)) return false;
  const doc = doctor ? DOCTORS[doctor] : null;
  if (doctor && (!doc || doc.k !== dept)) return false;
  if (doc && doc.days && !doc.days.includes(di)) return false;
  let [from, to] = d.hours[0];
  if (doc && doc.from != null) { from = Math.max(from, doc.from); to = Math.min(to, doc.to); }
  if (time < from * 60 || time >= to * 60) return false;
  if (off === 0 && time < now.min + 20) return false;
  return true;
}
/* چند نوبت هم‌زمان در این بخش ممکن است (تعداد پزشکانی که آن ساعت کار می‌کنند) */
function capacity(dept, date, time) {
  const di = dayIndex(date);
  const n = Object.values(DOCTORS).filter((doc) => doc.k === dept && (!doc.days || doc.days.includes(di)) && (doc.from == null || (time >= doc.from * 60 && time < doc.to * 60))).length;
  return Math.max(1, n);
}

function validate(b, now = tehranNow()) {
  const out = {
    dept: String(b.dept || ''),
    doctor: String(b.doctor || ''),
    type: String(b.type || ''),
    date: String(b.date || ''),
    time: Number(b.time),
    name: clean(b.name, 60),
    note: clean(b.note, 300),
    mobile: normMobile(b.mobile)
  };
  if (!DEPT[out.dept] || !TYPES.includes(out.type) || out.name.length < 2 || !validMobile(out.mobile)) return null;
  if (!slotOk(out.dept, out.doctor, out.date, out.time, now)) return null;
  return out;
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
  active(b) { return b.status !== 'cancelled'; }
  /* 'slot' اگر پر است، 'many' اگر این شماره نوبت باز زیادی دارد */
  conflict(v, now = tehranNow()) {
    const same = this.list.filter((b) => this.active(b) && b.dept === v.dept && b.date === v.date && b.time === v.time);
    if (v.doctor && same.some((b) => b.doctor === v.doctor)) return 'slot';
    if (same.length >= capacity(v.dept, v.date, v.time)) return 'slot';
    const open = this.list.filter((b) => this.active(b) && b.mobile === v.mobile && dayDiff(now.iso, b.date) >= 0);
    if (open.length >= 3) return 'many';
    return null;
  }
  /* ساعت‌هایی از این روز که برای این بخش (و پزشک) دیگر جا ندارند */
  fullTimes(dept, date, doctor) {
    const by = new Map();
    this.list.filter((b) => this.active(b) && b.dept === dept && b.date === date).forEach((b) => { if (!by.has(b.time)) by.set(b.time, []); by.get(b.time).push(b); });
    const out = [];
    for (const [time, arr] of by) if ((doctor && arr.some((b) => b.doctor === doctor)) || arr.length >= capacity(dept, date, time)) out.push(time);
    return out.sort((a, b) => a - b);
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
  async setStatus(ref, status) {
    const b = this.list.find((x) => x.ref === ref);
    if (!b) return null;
    b.status = status; b.updatedAt = new Date().toISOString();
    await this.save(this.file, this.list);
    return b;
  }
  async addCallback(c) {
    const r = Object.assign({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'new' }, c);
    this.callbacks.push(r);
    await this.save(this.cbFile, this.callbacks);
    return r;
  }
}

/* برای پیامک تأیید: «دوشنبه ۷ مهر» و «۱۰:۳۰» */
function labels(b) {
  let day = DAYS_FA[dayIndex(b.date)];
  try { day += ' ' + new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(b.date + 'T12:00:00Z')); } catch (e) { /* بدون ICU کامل */ }
  const hh = `${Math.floor(b.time / 60)}:${String(b.time % 60).padStart(2, '0')}`;
  return { dept: DEPT[b.dept].t, day, time: hh, doctor: b.doctor ? DOCTORS[b.doctor].name : '' };
}

module.exports = { BookingStore, validate, slotOk, capacity, normMobile, validMobile, tehranNow, labels, clean, DEPT, DOCTORS, TYPES };
