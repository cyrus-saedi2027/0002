/* ==========================================================================
   زمان به وقت تهران (مستقل از منطقه‌ی زمانی خود سرور) و نوشتن تاریخ شمسی برای پیامک.
   تاریخ‌ها همه‌جا به شکل میلادی YYYY-MM-DD ذخیره می‌شوند و فقط هنگام نمایش شمسی می‌شوند.
   ========================================================================== */
'use strict';

const TZ = 'Asia/Tehran';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const hmFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
/* روز نوبت به‌صورت تاریخ تقویمی است؛ برای نوشتنش منطقه‌ی UTC لازم است تا یک روز جابه‌جا نشود */
const faDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

const today = (now = new Date()) => dayFmt.format(now);
const minutes = (now = new Date()) => { const [h, m] = hmFmt.format(now).split(':').map(Number); return h * 60 + m; };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/* ۰ = یکشنبه … ۶ = شنبه */
const weekday = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();
const faDigits = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
/* مثلاً «شنبه ۱۲ مهر» (حداکثر ۲۵ نویسه برای متغیر قالب پیامک) */
const dateLabel = (iso) => faDay.format(new Date(iso + 'T12:00:00Z'));
const timeLabel = (min) => faDigits(String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'));

module.exports = { TZ, today, minutes, addDays, weekday, dateLabel, timeLabel, faDigits };
