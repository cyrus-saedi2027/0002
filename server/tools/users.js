#!/usr/bin/env node
/* ==========================================================================
   کارکنان پنل پذیرش از خط فرمان (برای اولین مدیر، یا وقتی رمز مدیر فراموش شده)
     npm run user            ساخت کاربر (اولین کاربر همیشه مدیر است)
     npm run user -- list    فهرست کارکنان
     npm run user -- reset   رمز تازه برای یک کاربر (و فعال کردنش)
   بقیه‌ی کارها (ساخت کاربر پذیرش و پزشک، غیرفعال کردن، رمز موقت) از خود پنل انجام می‌شود.
   رمزها فقط به‌صورت هش در server/data/users.json ذخیره می‌شوند.
   ========================================================================== */
'use strict';
const path = require('path');
const { UserStore, ROLES, validateUser, passProblem } = require('../lib/users');
const { DOCTORS } = require('../lib/bookings');
const { ask, green, red, dim, bold } = require('./cli');

const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const users = new UserStore(DATA);

async function askPassword(username) {
  for (;;) {
    const a = await ask('رمز (دست‌کم ۸ نویسه):', { hidden: true });
    const p = passProblem(a, username);
    if (p) { console.log(red('  ' + p)); continue; }
    const b = await ask('تکرار رمز:', { hidden: true });
    if (a === b) return a;
    console.log(red('  دو رمز یکی نیستند.'));
  }
}

async function add() {
  const first = !users.all().length;
  console.log(bold(first ? '\nساخت اولین حساب (مدیر) پنل پذیرش' : '\nساخت حساب تازه برای پنل پذیرش'));
  let role = 'admin';
  if (!first) {
    const r = await ask('نقش؟ ۱ = مدیر   ۲ = پذیرش   ۳ = پزشک', { def: '2' });
    role = { 1: 'admin', '۱': 'admin', 2: 'reception', '۲': 'reception', 3: 'doctor', '۳': 'doctor' }[r] || 'reception';
  }
  let doctor = '';
  if (role === 'doctor') {
    const ids = Object.keys(DOCTORS);
    ids.forEach((id, i) => console.log(dim(`  ${i + 1} = ${DOCTORS[id].name}`)));
    doctor = ids[Number(String(await ask('کدام پزشک؟', { def: '1' })).replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c))) - 1] || '';
  }
  for (;;) {
    const username = await ask('نام کاربری (حروف انگلیسی کوچک، مثلاً reception1):');
    const name = await ask('نام و نام خانوادگی (همان که در پنل و گزارش کارها دیده می‌شود):');
    const mobile = await ask('موبایل (کد ورود به این شماره پیامک می‌شود):');
    const { v, error } = validateUser({ username, name, role, mobile, doctor });
    if (error) { console.log(red('  ' + error)); continue; }
    if (users.byUsername(v.username)) { console.log(red('  این نام کاربری هست.')); continue; }
    const pw = await askPassword(v.username);
    const r = await users.create(v, pw, { mustChange: false });
    if (r.error) { console.log(red('  ' + r.error)); continue; }
    console.log(green(`\nحساب ${v.username} (${ROLES[role]}) ساخته شد.`));
    console.log(`ورود: ${bold('/panel/')} روی همان نشانی سایت، مثلاً http://127.0.0.1:8080/panel/`);
    return;
  }
}

function list() {
  const all = users.all();
  if (!all.length) { console.log(dim('هنوز حسابی ساخته نشده. npm run user')); return; }
  for (const u of all) console.log(`${u.active === false ? red('غیرفعال') : green('فعال   ')}  ${bold(u.username.padEnd(16))} ${ROLES[u.role].padEnd(6)} ${u.name}  ${dim(u.mobile.slice(0, 4) + '***' + u.mobile.slice(-4))}`);
}

async function reset() {
  const username = await ask('نام کاربری:');
  const u = users.byUsername(username);
  if (!u) { console.log(red('چنین کاربری نیست.')); process.exitCode = 1; return; }
  const pw = await askPassword(u.username);
  const r = await users.setPassword(u.id, pw, { mustChange: false });
  if (r.error) { console.log(red(r.error)); process.exitCode = 1; return; }
  await users.update(u.id, { active: true });
  console.log(green(`رمز ${u.username} عوض شد و حساب فعال است. نشست‌های قبلی این کاربر دیگر کار نمی‌کنند.`));
}

const cmd = process.argv[2] || 'add';
if (!process.stdin.isTTY && cmd !== 'list') { console.log(red('این دستور پرسش‌وپاسخ است؛ آن را در ترمینال اجرا کنید.')); process.exitCode = 1; }
else (cmd === 'list' ? Promise.resolve(list()) : cmd === 'reset' ? reset() : add())
  .catch((e) => { console.error(red(e && e.message ? e.message : String(e))); process.exitCode = 1; });
