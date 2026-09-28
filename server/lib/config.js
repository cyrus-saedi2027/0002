/* ==========================================================================
   تنظیمات سرور؛ همه از متغیرهای محیطی (یا فایل server/.env که وارد مخزن نمی‌شود).
   هیچ کلیدی در کد نوشته نمی‌شود و هیچ‌جا چاپ نمی‌شود.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* خواندن ساده‌ی server/.env (KEY=VALUE)؛ متغیرهایی که از قبل در محیط هستند اولویت دارند */
function loadEnvFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

function load(env = process.env) {
  if (env === process.env && !env.SASAN_NO_ENV_FILE) loadEnvFile(path.join(__dirname, '..', '.env'));
  const mode = (env.SMSIR_MODE || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
  const warn = [];
  let otpSecret = env.OTP_SECRET || '';
  if (otpSecret.length < 32) {
    if (mode === 'live') throw new Error('OTP_SECRET باید دست‌کم ۳۲ نویسه باشد (حالت live).');
    otpSecret = crypto.randomBytes(32).toString('hex');
    warn.push('OTP_SECRET تنظیم نشده؛ یک کلید موقت ساخته شد (با هر بار اجرا عوض می‌شود).');
  }
  const apiKey = mode === 'live' ? env.SMSIR_API_KEY : env.SMSIR_SANDBOX_KEY;
  if (!apiKey) warn.push(`کلید ${mode === 'live' ? 'SMSIR_API_KEY' : 'SMSIR_SANDBOX_KEY'} تنظیم نشده؛ ارسال پیامک کار نمی‌کند.`);
  const templateId = Number(mode === 'live' ? env.SMSIR_TEMPLATE_ID : (env.SMSIR_SANDBOX_TEMPLATE_ID || 123456));
  if (mode === 'live' && !templateId) throw new Error('SMSIR_TEMPLATE_ID برای حالت live لازم است.');
  const remindHour = Number(env.SMSIR_REMIND_HOUR || 17);
  if (!(Number.isInteger(remindHour) && remindHour >= 8 && remindHour <= 21)) throw new Error('SMSIR_REMIND_HOUR باید عددی بین ۸ تا ۲۱ باشد.');
  const adminToken = env.ADMIN_TOKEN || '';
  if (adminToken && adminToken.length < 24) throw new Error('ADMIN_TOKEN باید دست‌کم ۲۴ نویسه باشد.');
  return {
    port: Number(env.PORT || 8080),
    host: env.HOST || '127.0.0.1',
    siteDir: path.resolve(env.SITE_DIR || path.join(__dirname, '..', '..', 'site')),
    panelDir: path.resolve(env.PANEL_DIR || path.join(__dirname, '..', 'panel')),
    /* کد پیامکی ورود پنل (پیش‌فرض روشن؛ فقط برای آزمایش روی کامپیوتر خودتان PANEL_2FA=0) */
    panel2fa: env.PANEL_2FA !== '0',
    dataDir: path.resolve(env.DATA_DIR || path.join(__dirname, '..', 'data')),
    trustProxy: env.TRUST_PROXY === '1',
    allowedOrigin: env.ALLOWED_ORIGIN || '',
    hsts: env.HSTS === '1',
    adminToken,
    otpSecret,
    sms: {
      mode,
      apiKey: apiKey || '',
      baseUrl: (env.SMSIR_BASE_URL || 'https://api.sms.ir/v1').replace(/\/$/, ''),
      templateId,
      /* متغیر قالب؛ قالب پیش‌فرض Sandbox (123456) و قالبی که npm run setup می‌سازد هر دو CODE دارند */
      param: env.SMSIR_TEMPLATE_PARAM || 'CODE',
      confirmTemplateId: Number(env.SMSIR_CONFIRM_TEMPLATE_ID || 0),
      receptionTemplateId: Number(env.SMSIR_RECEPTION_TEMPLATE_ID || 0),
      receptionMobile: env.RECEPTION_MOBILE || '',
      /* پنل پذیرش (قالب نوع ۲، اطلاع‌رسانی)؛ پارامترها: NAME, DEPT, DATE, TIME */
      apptTemplateId: Number(env.SMSIR_APPT_TEMPLATE_ID || 0),
      remindTemplateId: Number(env.SMSIR_REMIND_TEMPLATE_ID || 0),
      remindHour
    },
    warn
  };
}

module.exports = { load };
