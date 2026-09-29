/* ==========================================================================
   کارکنان پنل پذیرش
   - رمز فقط به‌صورت هش scrypt با نمک تصادفی ذخیره می‌شود؛ مقایسه زمان‌ثابت است
   - پنل یک نقش دارد: پذیرش (همه‌ی کارها، از جمله کارکنان، مقاله‌ها و آمار)؛ حساب‌های قدیمی با نقش مدیر یا پزشک هم پذیرش حساب می‌شوند
   - موبایل هر کاربر برای کد ورود پیامکی است
   - رمزی که همکار برای حساب دیگری می‌سازد یا عوض می‌کند موقت است و کاربر در اولین ورود باید رمز خودش را بگذارد
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normMobile, validMobile, clean } = require('./bookings');

const ROLES = { reception: 'پذیرش' };
const KEYLEN = 64, OPTS = { N: 16384, r: 8, p: 1 };

const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(String(pw).normalize('NFC'), salt, KEYLEN, OPTS, (e, k) => (e ? rej(e) : res(k))));
async function hashPass(pw) {
  const salt = crypto.randomBytes(16);
  return 's1$' + salt.toString('base64') + '$' + (await scrypt(pw, salt)).toString('base64');
}
async function checkPass(pw, stored) {
  const m = /^s1\$([^$]+)\$([^$]+)$/.exec(String(stored || ''));
  if (!m) return false;
  const want = Buffer.from(m[2], 'base64');
  const got = await scrypt(pw, Buffer.from(m[1], 'base64'));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}
/* برای نام کاربری ناموجود هم همان مقدار کار انجام می‌شود تا از زمان پاسخ نشود فهمید کاربر هست یا نه */
const DUMMY = 's1$' + Buffer.alloc(16).toString('base64') + '$' + Buffer.alloc(KEYLEN).toString('base64');

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;
/* پیام خطا یا null */
function passProblem(pw, username) {
  pw = String(pw || '');
  if (pw.length < 8) return 'رمز باید دست‌کم ۸ نویسه باشد';
  if (pw.length > 128) return 'رمز خیلی بلند است';
  if (username && pw.toLowerCase().includes(String(username).toLowerCase())) return 'رمز نباید نام کاربری را داشته باشد';
  if (/^(\d)\1+$/.test(pw) || /^(0?123456789?0?|12345678|password|qwerty\w*)$/i.test(pw)) return 'این رمز خیلی ساده است';
  return null;
}

/* ورودی فرم همکاران برای ساخت یا ویرایش کاربر؛ { v } یا { error } */
function validateUser(b, { partial = false, current = null } = {}) {
  const v = {};
  if (!partial || b.username !== undefined) {
    const u = String(b.username || '').trim().toLowerCase();
    if (!USERNAME.test(u)) return { error: 'نام کاربری: ۳ تا ۳۲ حرف انگلیسی کوچک، عدد، نقطه یا خط تیره' };
    v.username = u;
  }
  if (!partial || b.name !== undefined) {
    v.name = clean(b.name, 60);
    if (v.name.length < 2) return { error: 'نام را بنویسید' };
  }
  /* نقش همیشه پذیرش است؛ نقش فرستاده‌شده نادیده گرفته می‌شود */
  if (!partial) v.role = 'reception';
  if (!partial || b.mobile !== undefined) {
    v.mobile = normMobile(b.mobile);
    if (!validMobile(v.mobile)) return { error: 'موبایل باید ۱۱ رقم و با ۰۹ شروع شود (برای کد ورود)' };
  }
  if (b.active !== undefined) v.active = !!b.active;
  return { v };
}

const pub = (u) => ({ id: u.id, username: u.username, name: u.name, role: 'reception', mobile: u.mobile, active: u.active !== false, mustChange: !!u.mustChange, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt || null });

class UserStore {
  constructor(dir) {
    this.file = path.join(dir, 'users.json');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.list = []; this.mtime = -1;
    this.fresh();
    this.chain = Promise.resolve();
  }
  /* اگر فایل بیرون از سرور عوض شده (ابزار npm run user)، دوباره خوانده می‌شود */
  fresh() {
    let m;
    try { m = fs.statSync(this.file).mtimeMs; } catch (e) { m = 0; }
    if (m === this.mtime) return;
    try { const j = JSON.parse(fs.readFileSync(this.file, 'utf8')); this.list = Array.isArray(j) ? j : []; } catch (e) { if (!m) this.list = []; }
    /* نقش‌های قدیمی (مدیر، پزشک) همه پذیرش می‌شوند؛ با اولین ذخیره در فایل هم می‌نشیند */
    this.list.forEach((u) => { if (u.role !== 'reception' || 'doctor' in u) { u.role = 'reception'; delete u.doctor; } });
    this.mtime = m;
  }
  save() {
    const data = JSON.stringify(this.list, null, 1);
    this.chain = this.chain.then(() => new Promise((res, rej) => {
      const tmp = this.file + '.' + process.pid + '.tmp';
      fs.writeFile(tmp, data, { mode: 0o600 }, (err) => (err ? rej(err) : fs.rename(tmp, this.file, (e2) => {
        if (e2) return rej(e2);
        try { this.mtime = fs.statSync(this.file).mtimeMs; } catch (e) { /* */ }
        res();
      })));
    }));
    return this.chain;
  }
  all() { this.fresh(); return this.list; }
  byId(id) { this.fresh(); return this.list.find((u) => u.id === id) || null; }
  byUsername(n) { this.fresh(); const k = String(n || '').trim().toLowerCase(); return this.list.find((u) => u.username === k) || null; }
  activeCount() { this.fresh(); return this.list.filter((u) => u.active !== false).length; }
  /* رمز نادرست، کاربر غیرفعال یا ناموجود: null */
  async login(username, password) {
    const u = this.byUsername(username);
    const ok = await checkPass(password, u ? u.pass : DUMMY);
    return ok && u && u.active !== false ? u : null;
  }
  async create(v, password, { mustChange = true } = {}) {
    if (this.byUsername(v.username)) return { error: 'این نام کاربری هست' };
    const p = passProblem(password, v.username);
    if (p) return { error: p };
    const u = Object.assign({ id: 'u' + crypto.randomBytes(6).toString('hex'), active: true, createdAt: new Date().toISOString() }, v, { role: 'reception', pass: await hashPass(password), passAt: new Date().toISOString(), mustChange });
    delete u.doctor;
    this.list.push(u);
    await this.save();
    return { user: u };
  }
  async update(id, v) {
    const u = this.byId(id);
    if (!u) return null;
    if (v.username && v.username !== u.username && this.byUsername(v.username)) return { error: 'این نام کاربری هست' };
    Object.assign(u, v, { updatedAt: new Date().toISOString() });
    await this.save();
    return { user: u };
  }
  async setPassword(id, password, { mustChange = false } = {}) {
    const u = this.byId(id);
    if (!u) return null;
    const p = passProblem(password, u.username);
    if (p) return { error: p };
    u.pass = await hashPass(password);
    u.passAt = new Date().toISOString();
    u.mustChange = mustChange;
    await this.save();
    return { user: u };
  }
  async touchLogin(id) { const u = this.byId(id); if (u) { u.lastLoginAt = new Date().toISOString(); await this.save(); } }
}

module.exports = { UserStore, ROLES, validateUser, passProblem, pub, hashPass, checkPass };
