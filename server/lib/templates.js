/* ==========================================================================
   قالب‌های پیامک با نام ساسان کلینیک: ثبت در sms.ir، پیگیری تأیید و روشن شدن خودکار
   - sms.ir قالب‌ها را فقط وقتی تأیید می‌کند که سایت روی دامنه باز باشد. پس سایت با قالب‌های server/.env بالا می‌آید
     و قالب‌های نام‌دار بعد از آن ثبت می‌شوند: از پنل (پیامک ← «ثبت قالب‌ها») یا با node tools/sms.js templates.
   - هر ۲۰ دقیقه وضعیت قالب‌های در انتظار پرسیده می‌شود؛ هر کدام تأیید شد، بدون راه‌اندازی دوباره‌ی سرور روشن می‌شود.
   - اگر قالبی که این‌جا روشن شده بعداً در sms.ir پاک یا غیرفعال شود، خاموش می‌شود و کد تأیید به قالب .env برمی‌گردد.
   - موبایل پذیرش (خبر درخواست تازه) را هم می‌شود از پنل گذاشت.
   - فقط در حالت live؛ داده: data/sms-templates.json
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { validMobile, normMobile } = require('./bookings');

const P = (name, description) => ({ name, description });
const TEL = '۰۱۱۵۴۶۱۱۵۶۰';
const APPT = [P('NAME', 'نام بیمار'), P('DEPT', 'بخش (مثلاً دندانپزشکی)'), P('DATE', 'روز نوبت، مثلاً شنبه ۱۲ مهر'), P('TIME', 'ساعت نوبت، مثلاً ۱۰:۳۰')];
/* field: نام همان تنظیم در cfg.sms؛ type ۱ = کد یکبار مصرف، ۲ = اطلاع‌رسانی */
const KINDS = {
  otp: {
    field: 'templateId', param: 'CODE', type: 1, label: 'کد تأیید (سایت و ورود پنل)', title: 'کد تأیید ساسان کلینیک',
    text: 'ساسان کلینیک\nکد تأیید شما: #CODE#\nاین کد را به کسی ندهید.\nsasan-clinic.ir', params: [P('CODE', 'کد تأیید ۵ رقمی')]
  },
  received: {
    field: 'confirmTemplateId', type: 2, label: 'پیامک «درخواست ثبت شد» به بیمار', title: 'ثبت درخواست نوبت ساسان کلینیک',
    text: `درخواست نوبت #DEPT# شما در ساسان کلینیک ثبت شد.\nکد پیگیری: #REF#\nپذیرش به‌زودی برای هماهنگی روز و ساعت با شما تماس می‌گیرد.\n${TEL}`,
    params: [P('DEPT', 'بخش (مثلاً دندانپزشکی)'), P('REF', 'کد پیگیری، مثلاً SS-12345')]
  },
  reception: {
    field: 'receptionTemplateId', type: 2, label: 'خبر درخواست تازه به موبایل پذیرش', title: 'درخواست تازه برای پذیرش ساسان کلینیک',
    /* sms.ir متغیر MOBILE را نپذیرفت (کد ۱۶)؛ TEL */
    text: 'درخواست نوبت تازه در سایت ساسان کلینیک:\n#NAME# · #DEPT#\nشماره: #TEL#\nاز پنل پذیرش پیگیری کنید.',
    params: [P('NAME', 'نام بیمار'), P('DEPT', 'بخش'), P('TEL', 'شماره‌ی بیمار')]
  },
  appt: {
    field: 'apptTemplateId', type: 2, label: 'تأیید نوبت از پنل', title: 'تأیید نوبت ساسان کلینیک',
    text: `#NAME# عزیز، نوبت #DEPT# شما در ساسان کلینیک برای #DATE# ساعت #TIME# ثبت شد.\nبرای تغییر یا لغو: ${TEL}`, params: APPT
  },
  remind: {
    field: 'remindTemplateId', type: 2, label: 'یادآوری یک روز قبل', title: 'یادآوری نوبت ساسان کلینیک',
    text: `یادآوری: #NAME# عزیز، فردا #DATE# ساعت #TIME# نوبت #DEPT# در ساسان کلینیک دارید.\nبرای تغییر یا لغو: ${TEL}`, params: APPT
  }
};
/* خطاهای sms.ir که یعنی خود قالب دیگر قابل استفاده نیست (نه قطعی شبکه یا شماره‌ی بد) */
const DEAD = [113, 116, 117, 124];
const EVERY = 20 * 60e3;

class SmsTemplates {
  constructor({ cfg, sms, dataDir, log = () => {} }) {
    this.cfg = cfg; this.sms = sms; this.log = log;
    this.file = path.join(dataDir, 'sms-templates.json');
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    /* مقدارهای server/.env؛ هر قالبی که این‌جا روشن نیست به همین‌ها برمی‌گردد */
    this.env = { param: cfg.sms.param, receptionMobile: cfg.sms.receptionMobile || '' };
    for (const [k, d] of Object.entries(KINDS)) this.env[k] = Number(cfg.sms[d.field]) || 0;
    /* آیا قالب .env خودش نام کلینیک را دارد (یک بار از sms.ir پرسیده می‌شود) */
    this.envInfo = {};
    /* SMSIR_ONLY_OTP: فقط پیامک کد تأیید؛ هیچ قالب دیگری ثبت یا روشن نمی‌شود.
       SMSIR_TEMPLATE_FALLBACK_ID: تا وقتی قالب کد تأیید .env تأیید نشده، کد با این قالب می‌رود و بعد از تأیید، خودکار جایش را می‌گیرد */
    this.onlyOtp = !!cfg.sms.onlyOtp;
    this.fallback = Number(cfg.sms.fallbackTemplateId) || 0;
    this.fallbackParam = cfg.sms.fallbackParam || cfg.sms.param;
    this.state = {};
    this.onChange = null;
    this.timer = null; this.busy = null;
    this.load();
    this.apply();
  }
  get live() { return this.cfg.sms.mode === 'live'; }

  load() {
    try {
      const j = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (j && typeof j === 'object' && !Array.isArray(j)) this.state = j;
    } catch (e) { /* هنوز چیزی ثبت نشده */ }
  }
  save() {
    try {
      const tmp = this.file + '.' + process.pid + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.state, null, 1), { mode: 0o600 });
      fs.renameSync(tmp, this.file);
    } catch (e) { this.log('sms templates save failed', e && e.code); }
  }
  on(k) { const s = this.state[k]; return !!(this.live && s && s.status === 2 && !s.failed && s.id); }
  /* تنظیم‌های زنده‌ی cfg.sms از روی وضعیت قالب‌ها (همه‌ی ارسال‌ها همین‌ها را هنگام ارسال می‌خوانند) */
  usingFallback() { const ei = this.envInfo.otp; return !!(this.fallback && this.live && (!ei || ei.status !== 2)); }
  apply() {
    if (this.onlyOtp) {
      for (const [k, d] of Object.entries(KINDS)) if (k !== 'otp') this.cfg.sms[d.field] = 0;
      const fb = this.usingFallback();
      this.cfg.sms.templateId = fb ? this.fallback : this.env.otp;
      this.cfg.sms.param = fb ? this.fallbackParam : this.env.param;
      this.cfg.sms.receptionMobile = '';
      return;
    }
    for (const [k, d] of Object.entries(KINDS)) {
      const on = this.on(k);
      this.cfg.sms[d.field] = on ? this.state[k].id : this.env[k];
      if (d.param) this.cfg.sms.param = on ? this.state[k].param || d.param : this.env.param;
    }
    const rm = this.state._settings && this.state._settings.receptionMobile;
    this.cfg.sms.receptionMobile = rm !== undefined ? rm : this.env.receptionMobile;
  }

  /* ثبت قالب‌های نام‌دار: هر کدام که هنوز ثبت نشده، رد شده یا خاموش شده؛ قالب .envی که خودش نام کلینیک را دارد کافی است */
  async submit() {
    if (!this.live) return { ok: false, error: 'mode' };
    if (this.onlyOtp) return { ok: false, error: 'off' };
    this.load();
    const results = [];
    for (const [k, d] of Object.entries(KINDS)) {
      const s = this.state[k];
      if (s && s.status === 1) { results.push({ kind: k, skip: 'pending', id: s.id }); continue; }
      if (s && s.status === 2 && !s.failed) { results.push({ kind: k, skip: 'on', id: s.id }); continue; }
      if (this.env[k] && (await this.envBranded(k))) { results.push({ kind: k, skip: 'env', id: this.env[k] }); continue; }
      /* قالب .env نام‌دار که هنوز در بررسی است (مثلاً ساخته‌شده با npm run setup): همان پیگیری می‌شود، تکراری ساخته نمی‌شود */
      const ei = this.envInfo[k];
      if (this.env[k] && ei && ei.branded && ei.status === 1) {
        this.state[k] = { id: this.env[k], status: 1, reason: '', at: new Date().toISOString(), checkedAt: '', prev: 0, param: d.param ? this.env.param : undefined };
        this.save();
        results.push({ kind: k, skip: 'pending', id: this.env[k] });
        continue;
      }
      const r = await this.sms.addTemplate(d.title, d.text, d.type, d.params);
      if (r.ok && Number(r.data) > 0) {
        this.state[k] = { id: Number(r.data), status: 1, reason: '', at: new Date().toISOString(), checkedAt: '', prev: s ? s.id : 0 };
        results.push({ kind: k, id: Number(r.data) });
      } else results.push({ kind: k, error: r.message || 'ثبت نشد' });
      this.save();
    }
    this.apply();
    this.start();
    return { ok: true, results };
  }
  async envBranded(k) {
    if (!this.env[k]) return false;
    if (!(k in this.envInfo)) {
      const t = await this.sms.template(this.env[k]);
      if (!t.ok) return false;
      this.envInfo[k] = { status: t.data && t.data.status, branded: /ساسان/.test(String((t.data && t.data.templateText) || '')), reason: String((t.data && t.data.rejectionReason) || '').slice(0, 200) };
    }
    return this.envInfo[k].status === 2 && this.envInfo[k].branded;
  }

  /* پرسیدن وضعیت قالب‌های در انتظار؛ تأییدشده‌ها همان لحظه روشن می‌شوند */
  check() {
    if (!this.live) return Promise.resolve({ ok: false, error: 'mode' });
    if (this.busy) return this.busy;
    this.busy = (async () => {
      this.load();
      const changed = [];
      if (this.onlyOtp) {
        /* فقط وضعیت قالب کد تأیید .env؛ تا تأیید نشده هر بار دوباره پرسیده می‌شود */
        const before = this.envInfo.otp ? this.envInfo.otp.status : 0;
        if (this.env.otp && before !== 2) { delete this.envInfo.otp; await this.envBranded('otp'); }
        const now = this.envInfo.otp ? this.envInfo.otp.status : 0;
        this.apply();
        if (now !== before && (now === 2 || now === 3)) {
          const c = { kind: 'otp', status: now, reason: now === 3 ? this.envInfo.otp.reason : '' };
          changed.push(c);
          this.log('sms template', 'otp', now === 2 ? 'approved' : 'rejected');
          if (this.onChange) this.onChange(c);
        }
        return { ok: true, changed };
      }
      for (const k of Object.keys(KINDS)) {
        const s = this.state[k];
        if (!s || s.status !== 1 || !s.id) continue;
        const t = await this.sms.template(s.id);
        s.checkedAt = new Date().toISOString();
        if (!t.ok) { s.error = t.message || ''; continue; }
        s.error = '';
        const st = Number(t.data && t.data.status);
        if (st === 2 || st === 3) {
          s.status = st;
          s.reason = st === 3 ? String((t.data && t.data.rejectionReason) || '').slice(0, 200) : '';
          if (st === 2) s.onAt = s.checkedAt;
          changed.push({ kind: k, status: st, reason: s.reason });
        }
      }
      /* قالب‌های .env هم یک بار (برای نمایش «متن آزمایشی» یا «با نام کلینیک») */
      for (const k of Object.keys(KINDS)) if (this.env[k] && !(k in this.envInfo)) await this.envBranded(k);
      this.save();
      this.apply();
      changed.forEach((c) => { this.log('sms template', c.kind, c.status === 2 ? 'approved' : 'rejected'); if (this.onChange) this.onChange(c); });
      return { ok: true, changed };
    })().finally(() => { this.busy = null; });
    return this.busy;
  }
  start() {
    if (this.timer || !this.live) return;
    /* بار اول کمی بعد از روشن شدن سرور، بعد هر ۲۰ دقیقه (بدون قالب در انتظار، هیچ درخواستی به sms.ir نمی‌رود) */
    const first = setTimeout(() => this.check().catch(() => {}), 15e3);
    if (first.unref) first.unref();
    this.timer = setInterval(() => this.check().catch(() => {}), EVERY);
    if (this.timer.unref) this.timer.unref();
    this.first = first;
  }
  close() { clearInterval(this.timer); clearTimeout(this.first); this.timer = null; }

  setReceptionMobile(v) {
    const m = v ? normMobile(v) : '';
    if (m && !validMobile(m)) return false;
    this.load();
    this.state._settings = Object.assign({}, this.state._settings, { receptionMobile: m });
    this.save();
    this.apply();
    return true;
  }

  /* کلاینت پیامکی که اگر قالب روشن‌شده‌ی این‌جا در sms.ir از کار افتاده باشد، خاموشش می‌کند و کد تأیید را با قالب .env می‌فرستد */
  wrap(sms) {
    const self = this;
    return Object.assign({}, sms, {
      async verify(mobile, templateId, params) {
        const r = await sms.verify(mobile, templateId, params);
        /* قالب کد تأیید .env هنوز تأیید نشده یا از کار افتاده: همان کد با قالب جایگزین */
        if (!r.ok && self.fallback && templateId === self.env.otp && templateId !== self.fallback && r.status > 0 && ![20, 102, 104, 115].includes(r.status)) {
          self.envInfo.otp = { status: 0, branded: false, reason: r.message || '' };
          self.apply();
          self.log('otp template not usable, fallback', r.status);
          return sms.verify(mobile, self.fallback, { [self.fallbackParam]: Object.values(params)[0] });
        }
        if (r.ok || !DEAD.includes(r.status)) return r;
        const k = Object.keys(KINDS).find((x) => self.on(x) && self.state[x].id === templateId);
        if (!k) return r;
        self.state[k].failed = r.message || String(r.status);
        self.save();
        self.apply();
        self.log('sms template disabled', k, r.status);
        if (self.onChange) self.onChange({ kind: k, failed: true, reason: self.state[k].failed });
        if (k === 'otp' && self.env.otp) return sms.verify(mobile, self.env.otp, { [self.env.param]: Object.values(params)[0] });
        return r;
      }
    });
  }

  /* برای پنل: هر قالب روشن است یا نه، با نام کلینیک یا متن آزمایشی، در انتظار، رد یا خاموش‌شده */
  view() {
    this.load();
    this.apply();
    const ei = this.envInfo.otp;
    return {
      live: this.live,
      onlyOtp: this.onlyOtp,
      otp: { id: this.env.otp, status: ei ? ei.status : null, reason: ei ? ei.reason || '' : '', fallback: this.fallback, usingFallback: this.usingFallback() },
      receptionMobile: this.cfg.sms.receptionMobile || '',
      list: Object.entries(KINDS).map(([k, d]) => {
        const s = this.state[k] || null;
        const id = Number(this.cfg.sms[d.field]) || 0;
        const env = this.envInfo[k];
        return {
          kind: k, label: d.label, text: d.text, on: !!id, id,
          branded: this.on(k) || !!(id && env && env.branded && env.status === 2),
          /* قالب .env با متن آزمایشی sms.ir (بدون نام کلینیک) */
          test: !!(id && !this.on(k) && env && env.status === 2 && !env.branded),
          pending: s && s.status === 1 ? { id: s.id, at: s.at, checkedAt: s.checkedAt || '', error: s.error || '' } : null,
          rejected: s && s.status === 3 ? { id: s.id, reason: s.reason || '' } : null,
          failed: s && s.status === 2 && s.failed ? s.failed : '',
          needsMobile: k === 'reception' && !validMobile(this.cfg.sms.receptionMobile || '')
        };
      })
    };
  }
}

module.exports = { SmsTemplates, KINDS };
