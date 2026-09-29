#!/usr/bin/env node
/* ==========================================================================
   ابزار راه‌اندازی پیامک (بدون وابستگی)
     npm run setup   پرسش‌وپاسخ: حالت، کلید، قالب؛ ساخت server/.env با رمزهای تصادفی
     npm run check   بررسی کلید، اعتبار پنل و وضعیت قالب (در حال بررسی / تأیید / رد)
   کلیدها فقط در server/.env (دسترسی 600) نوشته می‌شوند و هیچ‌جا چاپ نمی‌شوند.
   ========================================================================== */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const smsir = require('../lib/smsir');
const { ask, green, red, dim, bold } = require('./cli');

const ENV = process.env.SASAN_ENV_FILE || path.join(__dirname, '..', '.env');
const BASE = 'https://api.sms.ir/v1';
const TEMPLATE_TITLE = 'کد تأیید ساسان کلینیک';
const TEMPLATE_TEXT = 'ساسان کلینیک\nکد تأیید شما: #CODE#\nاین کد را به کسی ندهید.';
/* قالب‌های پنل پذیرش (نوع ۲، اطلاع‌رسانی و یادآوری)؛ هر متغیر حداکثر ۲۵ نویسه */
const PARAMS = [
  { name: 'NAME', description: 'نام بیمار' }, { name: 'DEPT', description: 'بخش (مثلاً دندانپزشکی)' },
  { name: 'DATE', description: 'روز نوبت، مثلاً شنبه ۱۲ مهر' }, { name: 'TIME', description: 'ساعت نوبت، مثلاً ۱۰:۳۰' }
];
const PANEL_TEMPLATES = [
  { env: 'SMSIR_APPT_TEMPLATE_ID', label: 'تأیید نوبت', title: 'تأیید نوبت ساسان کلینیک', text: '#NAME# عزیز، نوبت #DEPT# شما در ساسان کلینیک برای #DATE# ساعت #TIME# ثبت شد.\nبرای تغییر یا لغو: ۰۱۱۵۴۶۱۱۵۶۰' },
  { env: 'SMSIR_REMIND_TEMPLATE_ID', label: 'یادآوری یک روز قبل', title: 'یادآوری نوبت ساسان کلینیک', text: 'یادآوری: #NAME# عزیز، فردا #DATE# ساعت #TIME# نوبت #DEPT# در ساسان کلینیک دارید.\nبرای تغییر یا لغو: ۰۱۱۵۴۶۱۱۵۶۰' }
];

/* ---------- server/.env ---------- */
function readEnv() {
  const out = {};
  let text = '';
  try { text = fs.readFileSync(ENV, 'utf8'); } catch (e) { return out; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}
function writeEnv(v) {
  const order = ['SMSIR_MODE', 'SMSIR_SANDBOX_KEY', 'SMSIR_API_KEY', 'SMSIR_TEMPLATE_ID', 'SMSIR_TEMPLATE_PARAM', 'SMSIR_CONFIRM_TEMPLATE_ID', 'SMSIR_RECEPTION_TEMPLATE_ID', 'RECEPTION_MOBILE', 'SMSIR_APPT_TEMPLATE_ID', 'SMSIR_REMIND_TEMPLATE_ID', 'SMSIR_REMIND_HOUR', 'OTP_SECRET', 'ADMIN_TOKEN', 'PANEL_2FA', 'PORT', 'HOST', 'TRUST_PROXY', 'HSTS', 'ALLOWED_ORIGIN'];
  const keys = [...order.filter((k) => k in v), ...Object.keys(v).filter((k) => !order.includes(k))];
  const body = '# ساخته‌شده با npm run setup — این فایل را به کسی ندهید و وارد git نکنید\n' + keys.map((k) => `${k}=${v[k]}`).join('\n') + '\n';
  const tmp = ENV + '.tmp';
  fs.writeFileSync(tmp, body, { mode: 0o600 });
  fs.renameSync(tmp, ENV);
  try { fs.chmodSync(ENV, 0o600); } catch (e) { /* ویندوز */ }
}

const client = (key) => smsir.create({ apiKey: key, baseUrl: BASE });
const lanIps = () => Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);

async function showTemplate(c, id, wantParam) {
  const t = await c.template(id);
  if (!t.ok) { console.log(red(`  قالب ${id}: ${t.message}`)); return null; }
  const d = t.data || {};
  const st = smsir.TEMPLATE_STATUS[d.status] || `وضعیت ${d.status}`;
  const params = (d.parameters || []).map((p) => p.name);
  console.log(`  قالب ${id}: ${d.status === 2 ? green(st) : d.status === 3 ? red(st) : bold(st)}${d.type === 1 ? ' · کد یکبار مصرف' : ''}`);
  if (d.templateText) console.log(dim('  متن: ' + String(d.templateText).replace(/\n/g, ' ⏎ ')));
  if (d.status === 3 && d.rejectionReason) console.log(red('  دلیل رد: ' + d.rejectionReason));
  const bad = !!(wantParam && params.length && !params.includes(wantParam));
  if (bad) console.log(red(`  متغیر قالب ${params.join('، ')} است ولی SMSIR_TEMPLATE_PARAM=${wantParam}؛ در server/.env یکی‌شان کنید.`));
  return { status: d.status, params, bad };
}

/* ---------- npm run check ---------- */
async function check() {
  const v = readEnv();
  if (!Object.keys(v).length) { console.log(red('server/.env پیدا نشد. اول npm run setup را اجرا کنید.')); process.exitCode = 1; return; }
  const live = (v.SMSIR_MODE || 'sandbox') === 'live';
  const key = live ? v.SMSIR_API_KEY : v.SMSIR_SANDBOX_KEY;
  console.log(bold(`حالت: ${live ? 'اصلی (پیامک واقعی)' : 'آزمایشی (Sandbox؛ پیامک واقعی فرستاده نمی‌شود)'}`));
  if (!key) { console.log(red(`  کلید ${live ? 'SMSIR_API_KEY' : 'SMSIR_SANDBOX_KEY'} خالی است.`)); process.exitCode = 1; return; }
  const c = client(key);
  const cr = await c.credit();
  if (!cr.ok) { console.log(red(`  کلید: ${cr.message}`)); process.exitCode = 1; return; }
  console.log(green('  کلید درست است') + (live ? ` · اعتبار پنل: ${cr.data}` : ''));
  const id = live ? v.SMSIR_TEMPLATE_ID : (v.SMSIR_SANDBOX_TEMPLATE_ID || '123456');
  if (!id) { console.log(red('  SMSIR_TEMPLATE_ID خالی است. npm run setup را دوباره اجرا کنید تا قالب ساخته شود.')); process.exitCode = 1; return; }
  const t = await showTemplate(c, id, v.SMSIR_TEMPLATE_PARAM || 'CODE');
  if (!t || t.bad) { process.exitCode = 1; return; }
  if (live && t.status !== 2) { console.log(bold('  تا قالب تأیید نشود پیامک فرستاده نمی‌شود. چند ساعت بعد دوباره npm run check را بزنید.')); process.exitCode = 1; return; }
  if (live) {
    for (const pt of PANEL_TEMPLATES) {
      if (!v[pt.env]) { console.log(dim(`  پنل پذیرش · ${pt.label}: تنظیم نشده (اختیاری؛ npm run setup می‌سازدش)`)); continue; }
      console.log(dim(`  پنل پذیرش · ${pt.label}:`));
      await showTemplate(c, v[pt.env]);
    }
  }
  if (!v.OTP_SECRET || v.OTP_SECRET.length < 32) console.log(red('  OTP_SECRET کوتاه است؛ npm run setup را دوباره اجرا کنید.'));
  console.log(green('همه‌چیز آماده است. npm start را بزنید و سایت را باز کنید.'));
}

/* ---------- npm run setup ---------- */
async function setup() {
  if (!process.stdin.isTTY) { console.log(red('این دستور پرسش‌وپاسخ است؛ آن را در ترمینال اجرا کنید.')); process.exitCode = 1; return; }
  const v = readEnv();
  console.log(bold('\nراه‌اندازی پیامک ساسان کلینیک'));
  console.log(dim('کلیدها فقط در server/.env روی همین کامپیوتر ذخیره می‌شوند.\n'));
  const m = await ask('حالت؟ ۱ = آزمایشی (Sandbox، پیامک واقعی نمی‌آید)   ۲ = اصلی (پیامک واقعی به گوشی)', { def: v.SMSIR_MODE === 'live' ? '2' : '1' });
  const live = /^[2۲]$/.test(m);
  v.SMSIR_MODE = live ? 'live' : 'sandbox';
  const kName = live ? 'SMSIR_API_KEY' : 'SMSIR_SANDBOX_KEY';
  for (;;) {
    const k = await ask(`کلید ${live ? 'اصلی' : 'Sandbox'} پنل sms.ir${v[kName] ? ' (Enter = همان قبلی)' : ''}:`, { hidden: true });
    if (k) v[kName] = k;
    if (!v[kName]) continue;
    const cr = await client(v[kName]).credit();
    if (cr.ok) { console.log(green('  کلید درست است') + (live ? ` · اعتبار پنل: ${cr.data}` : '')); break; }
    console.log(red(`  ${cr.message}`));
    if (cr.status < 0) break;
    delete v[kName];
  }

  if (live) {
    const c = client(v.SMSIR_API_KEY);
    const id = await ask('شناسه‌ی قالب کد تأیید (اگر ندارید Enter بزنید تا همین حالا ساخته شود):', { def: v.SMSIR_TEMPLATE_ID || '' });
    if (id) {
      v.SMSIR_TEMPLATE_ID = id;
      const t = await showTemplate(c, id);
      if (t && t.params.length) v.SMSIR_TEMPLATE_PARAM = t.params[0];
    } else {
      console.log(dim('  متن قالب:\n  ' + TEMPLATE_TEXT.replace(/\n/g, '\n  ')));
      const r = await c.addTemplate(TEMPLATE_TITLE, TEMPLATE_TEXT, 1, [{ name: 'CODE', description: 'کد تأیید ۵ رقمی نوبت' }]);
      if (r.ok) {
        v.SMSIR_TEMPLATE_ID = String(r.data); v.SMSIR_TEMPLATE_PARAM = 'CODE';
        console.log(green(`  قالب ثبت شد (شناسه ${r.data}) و در انتظار تأیید کارشناسان sms.ir است.`));
        console.log(dim('  وضعیتش را با npm run check ببینید؛ بعد از تأیید، پیامک واقعی فرستاده می‌شود.'));
      } else {
        console.log(red(`  ساخت قالب ممکن نشد: ${r.message}`));
        console.log(dim('  می‌توانید قالب را در پنل (برنامه‌نویسان ← لیست قالب‌ها) با همین متن بسازید و دوباره npm run setup بزنید.'));
      }
    }
    const c2 = client(v.SMSIR_API_KEY);
    const missing = PANEL_TEMPLATES.filter((pt) => !v[pt.env]);
    if (missing.length) {
      const yes = await ask('قالب‌های پیامک پنل پذیرش (تأیید نوبت و یادآوری یک روز قبل) هم در پنل ساخته شوند؟ (بله/نه)', { def: 'بله' });
      if (/^(y|yes|بله|آره|۱|1)$/i.test(yes)) {
        for (const pt of missing) {
          console.log(dim('  متن: ' + pt.text.replace(/\n/g, ' ⏎ ')));
          const r = await c2.addTemplate(pt.title, pt.text, 2, PARAMS);
          if (r.ok) { v[pt.env] = String(r.data); console.log(green(`  قالب ${pt.label} ثبت شد (شناسه ${r.data}) و در انتظار تأیید است.`)); }
          else console.log(red(`  قالب ${pt.label} ساخته نشد: ${r.message}`));
        }
      }
    }
  } else {
    delete v.SMSIR_TEMPLATE_PARAM;
  }

  if (!v.OTP_SECRET || v.OTP_SECRET.length < 32) v.OTP_SECRET = crypto.randomBytes(32).toString('hex');
  if (!v.ADMIN_TOKEN || v.ADMIN_TOKEN.length < 24) v.ADMIN_TOKEN = crypto.randomBytes(24).toString('base64url');
  const rm = await ask('موبایل پذیرش برای خبر درخواست تازه (اختیاری):', { def: v.RECEPTION_MOBILE || '' });
  if (rm) v.RECEPTION_MOBILE = rm;
  const phone = await ask('می‌خواهید سایت را از گوشیِ همین شبکه‌ی وای‌فای هم باز کنید؟ (بله/نه)', { def: v.HOST === '0.0.0.0' ? 'بله' : 'نه' });
  v.HOST = /^(y|yes|بله|آره|۱|1)$/i.test(phone) ? '0.0.0.0' : '127.0.0.1';
  v.PORT = v.PORT || '8080';
  writeEnv(v);

  console.log(green('\nserver/.env ذخیره شد.'));
  console.log(`اجرا:  ${bold('npm start')}`);
  console.log(`سایت:  http://127.0.0.1:${v.PORT}`);
  console.log(`پنل پذیرش:  http://127.0.0.1:${v.PORT}/panel/  ${dim('(اولین بار: npm run user برای ساخت اولین حساب پذیرش)')}`);
  if (v.HOST === '0.0.0.0') lanIps().forEach((ip) => console.log(`از گوشی: http://${ip}:${v.PORT}`));
  if (!live) console.log(dim('در حالت آزمایشی پیامک واقعی نمی‌آید؛ کد در همین ترمینال چاپ می‌شود.'));
}

const cmd = process.argv[2];
(cmd === 'setup' ? setup() : cmd === 'check' ? check() : Promise.resolve(console.log('npm run setup  |  npm run check')))
  .catch((e) => { console.error(red(e && e.message ? e.message : String(e))); process.exitCode = 1; });
