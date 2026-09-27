/* ==========================================================================
   کلاینت sms.ir (متد Verify، اعتبار و قالب‌ها). کلید فقط در سربرگ x-api-key فرستاده می‌شود،
   نه در آدرس؛ و در هیچ پیام خطا یا لاگی تکرار نمی‌شود.
   ========================================================================== */
'use strict';

const STATUS = {
  0: 'درخواست با خطا مواجه شد',
  10: 'کلید وب‌سرویس نامعتبر است',
  11: 'کلید وب‌سرویس غیرفعال است',
  12: 'کلید وب‌سرویس به آی‌پی‌های تعریف‌شده محدود است',
  13: 'حساب کاربری غیرفعال است',
  14: 'حساب کاربری تعلیق شده است',
  15: 'پلن اجازه‌ی استفاده از وب‌سرویس را نمی‌دهد',
  16: 'مقدار پارامتر نادرست است',
  20: 'تعداد درخواست‌ها بیش از حد مجاز است',
  101: 'شماره‌ی خط نامعتبر است',
  102: 'اعتبار کافی نیست',
  103: 'درخواست متن خالی دارد',
  104: 'شماره‌ی موبایل نادرست است',
  113: 'قالب پیدا نشد',
  114: 'مقدار پارامتر بیشتر از ۲۵ نویسه است',
  115: 'شماره در لیست سیاه سامانه است',
  116: 'نام یک یا چند پارامتر قالب مقدار ندارد (SMSIR_TEMPLATE_PARAM را با متغیر قالب یکی کنید)',
  117: 'متن فرستاده‌شده تأیید نشده است',
  119: 'برای قالب شخصی‌سازی‌شده باید پلن پنل ارتقا یابد',
  121: 'برای افزودن قالب بیشتر باید پلن پنل ارتقا یابد',
  122: 'قالبی که در حال بررسی است ویرایش‌شدنی نیست',
  123: 'خط ارسال‌کننده باید فعال شود',
  124: 'فعلاً فقط پیامک کد یکبار مصرف (OTP) مجاز است و این قالب OTP شناخته نشده',
  125: 'متن قالب باید دست‌کم یک متغیر #PARAMETER# داشته باشد'
};
/* وضعیت بررسی قالب در پنل */
const TEMPLATE_STATUS = { 1: 'در حال بررسی', 2: 'تأیید شده', 3: 'رد شده' };

function create(cfg, { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  async function call(method, path, body) {
    if (!cfg.apiKey) return { ok: false, status: -1, message: 'کلید تنظیم نشده' };
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetchImpl(cfg.baseUrl + path, {
        method,
        headers: { 'content-type': 'application/json', accept: 'application/json', 'x-api-key': cfg.apiKey },
        body: body ? JSON.stringify(body) : undefined,
        signal: ac.signal
      });
      let json = null;
      try { json = await res.json(); } catch (e) { /* پاسخ غیر JSON */ }
      const status = json && typeof json.status === 'number' ? json.status : 0;
      return { ok: status === 1, status, http: res.status, message: STATUS[status] || (json && json.message) || `HTTP ${res.status}`, data: json && json.data };
    } catch (e) {
      return { ok: false, status: -2, message: e.name === 'AbortError' ? 'مهلت پاسخ sms.ir تمام شد' : 'اتصال به sms.ir برقرار نشد' };
    } finally { clearTimeout(t); }
  }
  /* parameters: { NAME: 'value' } → [{ name, value }] (هر مقدار حداکثر ۲۵ نویسه) */
  const verify = (mobile, templateId, parameters) => call('POST', '/send/verify', {
    mobile,
    templateId,
    parameters: Object.entries(parameters).map(([name, value]) => ({ name, value: String(value).slice(0, 25) }))
  });
  const credit = () => call('GET', '/credit');
  const template = (id) => call('GET', '/templates/' + encodeURIComponent(id));
  /* type: 1 = کد یکبار مصرف */
  const addTemplate = (title, text, type, params) => call('POST', '/templates', { title, templateText: text, type, parameters: params });
  return { verify, credit, template, addTemplate };
}

module.exports = { create, STATUS, TEMPLATE_STATUS };
