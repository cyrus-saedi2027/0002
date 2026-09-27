/* ==========================================================================
   کلاینت sms.ir (فقط متد Verify و اعتبار). کلید فقط در سربرگ x-api-key فرستاده می‌شود،
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
  102: 'اعتبار کافی نیست',
  104: 'شماره‌ی موبایل نادرست است',
  113: 'قالب پیدا نشد'
};

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
  return { verify, credit };
}

module.exports = { create, STATUS };
