#!/usr/bin/env node
/* ==========================================================================
   کارکنان پنل پذیرش از خط فرمان (برای اولین حساب، یا وقتی رمز فراموش شده)
     npm run user            ساخت حساب
     npm run user -- list    فهرست کارکنان
     npm run user -- reset   رمز تازه برای یک کاربر (و فعال کردنش)
     node tools/users.js create <نام‌کاربری> <موبایل> [نام]   بدون پرسش؛ رمز موقت تصادفی می‌سازد و چاپ می‌کند (install.sh)
     node tools/users.js temp <نام‌کاربری>                  رمز موقت تصادفی تازه برای یک کاربر، بدون پرسش
   بقیه‌ی کارها (ساخت حساب همکار، غیرفعال کردن، رمز موقت) از خود پنل، بخش «کارکنان»، انجام می‌شود.
   رمزها فقط به‌صورت هش در server/data/users.json ذخیره می‌شوند.
   ========================================================================== */
'use strict';
const path = require('path');
const crypto = require('crypto');
const { UserStore, validateUser, passProblem } = require('../lib/users');
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
  console.log(bold(first ? '\nساخت اولین حساب پنل پذیرش' : '\nساخت حساب تازه برای پنل پذیرش'));
  for (;;) {
    const username = await ask('نام کاربری (حروف انگلیسی کوچک، مثلاً reception1):');
    const name = await ask('نام و نام خانوادگی (همان که در پنل و گزارش کارها دیده می‌شود):');
    const mobile = await ask('موبایل (کد ورود به این شماره پیامک می‌شود):');
    const { v, error } = validateUser({ username, name, mobile });
    if (error) { console.log(red('  ' + error)); continue; }
    if (users.byUsername(v.username)) { console.log(red('  این نام کاربری هست.')); continue; }
    const pw = await askPassword(v.username);
    const r = await users.create(v, pw, { mustChange: false });
    if (r.error) { console.log(red('  ' + r.error)); continue; }
    console.log(green(`\nحساب ${v.username} ساخته شد.`));
    console.log(`ورود: ${bold('/panel/')} روی همان نشانی سایت، مثلاً http://127.0.0.1:8080/panel/`);
    return;
  }
}

function list() {
  const all = users.all();
  if (!all.length) { console.log(dim('هنوز حسابی ساخته نشده. npm run user')); return; }
  for (const u of all) console.log(`${u.active === false ? red('غیرفعال') : green('فعال   ')}  ${bold(u.username.padEnd(16))} ${u.name}  ${dim(u.mobile.slice(0, 4) + '***' + u.mobile.slice(-4))}`);
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

/* رمز موقت تصادفی (حرف کوچک و بزرگ و عدد، بدون نویسه‌های شبیه هم)؛ در اولین ورود باید عوض شود */
function tempPass(username) {
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    const p = Array.from(crypto.randomBytes(12), (x) => a[x % a.length]).join('');
    if (/\d.*\d/.test(p) && /[a-z]/.test(p) && /[A-Z]/.test(p) && !passProblem(p, username)) return p;
  }
}
async function createAuto([username, mobile, ...name]) {
  const { v, error } = validateUser({ username, mobile, name: name.join(' ') || 'پذیرش ساسان کلینیک' });
  if (error) { console.log(red(error)); process.exitCode = 1; return; }
  if (users.byUsername(v.username)) { console.log(dim(`حساب ${v.username} از قبل هست؛ دست نخورد (رمز تازه: node tools/users.js temp ${v.username}).`)); process.exitCode = 3; return; }
  const pw = tempPass(v.username);
  const r = await users.create(v, pw, { mustChange: true });
  if (r.error) { console.log(red(r.error)); process.exitCode = 1; return; }
  console.log(green(`حساب ${v.username} ساخته شد.`));
  console.log(`رمز موقت: ${bold(pw)}   (در اولین ورود، پنل رمز تازه‌ی خودتان را می‌خواهد)`);
}
async function tempAuto([username]) {
  const u = users.byUsername(username);
  if (!u) { console.log(red('چنین کاربری نیست.')); process.exitCode = 1; return; }
  const pw = tempPass(u.username);
  const r = await users.setPassword(u.id, pw, { mustChange: true });
  if (r.error) { console.log(red(r.error)); process.exitCode = 1; return; }
  await users.update(u.id, { active: true });
  console.log(green(`رمز موقت تازه‌ی ${u.username}: `) + bold(pw) + dim('   (در اولین ورود باید عوض شود)'));
}

const cmd = process.argv[2] || 'add';
if (cmd === 'create' || cmd === 'temp') (cmd === 'create' ? createAuto(process.argv.slice(3)) : tempAuto(process.argv.slice(3)))
  .catch((e) => { console.error(red(e && e.message ? e.message : String(e))); process.exitCode = 1; });
else if (!process.stdin.isTTY && cmd !== 'list') { console.log(red('این دستور پرسش‌وپاسخ است؛ آن را در ترمینال اجرا کنید.')); process.exitCode = 1; }
else (cmd === 'list' ? Promise.resolve(list()) : cmd === 'reset' ? reset() : add())
  .catch((e) => { console.error(red(e && e.message ? e.message : String(e))); process.exitCode = 1; });
