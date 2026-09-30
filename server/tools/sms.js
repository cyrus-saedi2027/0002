#!/usr/bin/env node
/* ==========================================================================
   ابزار راه‌اندازی پیامک (بدون وابستگی)
     npm run setup   پرسش‌وپاسخ: حالت، کلید، قالب؛ ساخت server/.env با رمزهای تصادفی
     npm run check   بررسی کلید، اعتبار پنل و وضعیت قالب (در حال بررسی / تأیید / رد)
     node tools/sms.js templates   ثبت قالب‌های نام‌دار ساسان کلینیک در sms.ir (بعد از بالا آمدن سایت روی دامنه)؛
                                   سرور بعد از تأیید، خودش روشنشان می‌کند (lib/templates.js). روی سرور با runuser -u www-data
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
const TEMPLATE_TEXT = 'ساسان کلینیک\nکد تأیید شما: #CODE#\nاین کد را به کسی ندهید.\nsasan-clinic.ir';
/* قالب‌های نام‌دار دیگر (ثبت درخواست، خبر به پذیرش، تأیید نوبت، یادآوری): lib/templates.js */
const { KINDS } = require('../lib/templates');
const PANEL_TEMPLATES = ['received', 'reception', 'appt', 'remind'].map((k) => ({ env: { received: 'SMSIR_CONFIRM_TEMPLATE_ID', reception: 'SMSIR_RECEPTION_TEMPLATE_ID', appt: 'SMSIR_APPT_TEMPLATE_ID', remind: 'SMSIR_REMIND_TEMPLATE_ID' }[k], label: KINDS[k].label }));

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
  if (live && t.status !== 2 && v.SMSIR_TEMPLATE_FALLBACK_ID) console.log(bold(`  تا تأیید این قالب، کد تأیید با قالب ${v.SMSIR_TEMPLATE_FALLBACK_ID} فرستاده می‌شود؛ بعد از تأیید، سرور خودش جابه‌جا می‌کند.`));
  else if (live && t.status !== 2) { console.log(bold('  تا قالب تأیید نشود پیامک فرستاده نمی‌شود. چند ساعت بعد دوباره npm run check را بزنید.')); process.exitCode = 1; return; }
  if (live) {
    for (const pt of PANEL_TEMPLATES) {
      if (!v[pt.env]) continue;
      console.log(dim(`  پنل پذیرش · ${pt.label}:`));
      await showTemplate(c, v[pt.env]);
    }
  }
  if (!v.OTP_SECRET || v.OTP_SECRET.length < 32) console.log(red('  OTP_SECRET کوتاه است؛ npm run setup را دوباره اجرا کنید.'));
  if (live) {
    const { load } = require('../lib/config');
    const { SmsTemplates } = require('../lib/templates');
    try {
      const T = new SmsTemplates({ cfg: load(), sms: c, dataDir: path.resolve(v.DATA_DIR || path.join(__dirname, '..', 'data')) });
      console.log(dim('  قالب‌های نام‌دار ساسان کلینیک:'));
      printTemplates(T.view());
      T.close();
    } catch (e) { /* تنظیمات ناقص؛ بالاتر گفته شد */ }
  }
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
    console.log(dim('  قالب‌های دیگر (ثبت درخواست، خبر به پذیرش، تأیید نوبت و یادآوری) بعد از بالا آمدن سایت روی دامنه ثبت می‌شوند:'));
    console.log(dim('  node tools/sms.js templates  (یا از پنل پذیرش ← بیشتر ← پیامک ← «ثبت قالب‌ها با نام کلینیک»)'));
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

/* ---------- node tools/sms.js templates ---------- */
async function templates() {
  const { load } = require('../lib/config');
  const { SmsTemplates } = require('../lib/templates');
  const cfg = load();
  if (cfg.sms.mode !== 'live') { console.log(dim('سرور در حالت آزمایشی است؛ قالب‌ها فقط در حالت اصلی (SMSIR_MODE=live) ثبت می‌شوند.')); return; }
  const T = new SmsTemplates({ cfg, sms: smsir.create(cfg.sms), dataDir: cfg.dataDir });
  try {
    const r = await T.submit();
    if (!r.ok) { console.log(dim(r.error === 'off' ? '  فقط پیامک کد تأیید روشن است (SMSIR_ONLY_OTP=1)؛ قالب دیگری ثبت نمی‌شود.' : '  ثبت نشد.')); await T.check(); printTemplates(T.view()); return; }
    const SKIP = { pending: 'در انتظار تأیید (قبلاً ثبت شده)', on: 'روشن است', env: 'قالب server/.env نام کلینیک را دارد' };
    for (const x of r.results) {
      const label = T.view().list.find((y) => y.kind === x.kind).label;
      console.log(`  ${label}: ` + (x.error ? red('ثبت نشد: ' + x.error) : x.skip ? dim(SKIP[x.skip]) : green(`ثبت شد (شناسه ${x.id})`)));
    }
    await T.check();
    printTemplates(T.view());
  } finally { T.close(); }
}
function printTemplates(v) {
  if (v.onlyOtp) {
    const o = v.otp;
    console.log(`  فقط پیامک کد تأیید روشن است · قالب ${o.id}: ` + (o.status === 2 ? green('تأیید شده، در حال استفاده') : o.status === 3 ? red('رد شد: ' + o.reason) : bold('در انتظار تأیید sms.ir')) + (o.usingFallback && o.fallback ? dim(` · فعلاً با قالب ${o.fallback}`) : ''));
    return;
  }
  for (const x of v.list) {
    const st = x.failed ? red('خاموش شد: ' + x.failed) : x.on && x.branded ? green('روشن با نام کلینیک') : x.on ? green('روشن') + (x.test ? dim(' (متن آزمایشی sms.ir)') : '')
      : x.pending ? bold('در انتظار تأیید sms.ir') : x.rejected ? red('رد شد: ' + (x.rejected.reason || '')) : dim('خاموش');
    console.log(`  ${x.label}: ${st}${x.pending && x.on ? bold(' · قالب تازه در انتظار تأیید') : ''}`);
  }
  console.log(dim('  سرور هر ۲۰ دقیقه وضعیت قالب‌های در انتظار را می‌پرسد و هر کدام تأیید شد، خودش روشن می‌کند (پنل ← بیشتر ← پیامک).'));
}

const cmd = process.argv[2];
(cmd === 'setup' ? setup() : cmd === 'check' ? check() : cmd === 'templates' ? templates() : Promise.resolve(console.log('npm run setup  |  npm run check  |  node tools/sms.js templates')))
  .catch((e) => { console.error(red(e && e.message ? e.message : String(e))); process.exitCode = 1; });
