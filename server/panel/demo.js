/* ==========================================================================
   نسخه‌ی نمایشی پنل پذیرش
   وقتی صفحه بدون سرور کلینیک باز شود (مثلاً پیش‌نمایش)، panel.js به‌جای API واقعی از این‌جا داده می‌گیرد.
   همه‌چیز در حافظه‌ی همین صفحه است و با بستنش پاک می‌شود؛ هیچ پیامکی فرستاده نمی‌شود.
   نام‌ها و شماره‌ها ساختگی‌اند (شماره‌ها با ۰۹۰۰ که پیش‌شماره‌ی هیچ اپراتوری نیست).
   ========================================================================== */
(() => {
  'use strict';
  const DEPTS = {
    dental: { t: 'دندانپزشکی', days: [6, 0, 1, 4], from: 600, to: 1200, hours: 'شنبه، یکشنبه، دوشنبه و پنجشنبه · ۱۰ تا ۲۰' },
    beauty: { t: 'زیبایی و لیزر', days: [0, 1, 2, 3, 4, 5, 6], from: 540, to: 1260, hours: 'همه‌روزه با هماهنگی قبلی' },
    medicine: { t: 'پزشک عمومی', days: [0, 1, 2, 3, 4, 5, 6], from: 0, to: 1440, hours: 'شبانه‌روزی' }
  };
  const DOCTORS = {
    'doc-1': { k: 'dental', name: 'دکتر نیک‌پور' }, 'doc-2': { k: 'dental', name: 'دکتر رحمانی' },
    'doc-5': { k: 'beauty', name: 'دکتر کیانی' }, 'doc-3': { k: 'medicine', name: 'دکتر صالحی' }, 'doc-4': { k: 'medicine', name: 'دکتر شریفی' }
  };
  const TYPES = ['ویزیت اول', 'ادامه‌ی درمان', 'مشاوره'];
  const STATUSES = ['new', 'called', 'scheduled', 'arrived', 'done', 'cancelled', 'no-show'];
  /* پنل فقط یک نقش دارد: پذیرش، با همه‌ی دسترسی‌ها */
  const ROLES = { reception: 'پذیرش' };
  const CAN = ['write', 'phone', 'callbacks', 'sms', 'users', 'audit', 'stats', 'articles', 'contacts'];

  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' });
  const hmFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const nowMin = () => { const [h, m] = hmFmt.format(new Date()).split(':').map(Number); return h * 60 + m; };
  const today = () => dayFmt.format(new Date());
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const wd = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();
  const MIN = 60e3, HOUR = 3600e3, DAY = 864e5;
  const at = (ms) => new Date(Date.now() - ms).toISOString();
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const msgId = () => 80000000 + Math.floor(Math.random() * 9999999);
  const RECEPTION = 'سارا محمدی';

  /* همان منطق lib/contacts.js سرور */
  function addContact(map, mobile, o) {
    const when = o.at || new Date().toISOString();
    let c = map.get(mobile);
    if (!c) { c = { mobile, name: '', first: when, last: when, count: 0, src: {}, depts: [], verified: false, optout: false, note: '' }; map.set(mobile, c); }
    if (when < c.first) c.first = when;
    if (when >= c.last) { c.last = when; if (o.name) c.name = o.name; }
    if (!c.name && o.name) c.name = o.name;
    c.count++; c.src[o.source] = (c.src[o.source] || 0) + 1;
    if (o.dept && !c.depts.includes(o.dept)) c.depts.push(o.dept);
    if (o.verified) c.verified = true;
  }

  function seed() {
    const t = today();
    /* دندانپزشکی فقط شنبه، یکشنبه، دوشنبه و پنجشنبه است؛ روزهای دیگر نمونه به بخش زیبایی می‌رود */
    const fit = (iso, dept, doc) => (DEPTS[dept].days.includes(wd(iso)) ? [dept, doc] : ['beauty', 'doc-5']);
    const B = [];
    let n = 0;
    const add = (o) => {
      const b = Object.assign({ ref: 'SS-' + (10000 + ((38213 + n * 3677) % 90000)), v: 1, source: 'site', sms: [], log: [] }, o);
      n++;
      B.push(b);
      return b;
    };
    const sched = (b, date, time, doctor, byAgo) => {
      Object.assign(b, { status: 'scheduled', date, time, doctor });
      b.log.push({ at: at(byAgo), by: RECEPTION, ev: 'status', v: 'called' }, { at: at(byAgo - MIN), by: RECEPTION, ev: 'status', v: 'scheduled' }, { at: at(byAgo - MIN), by: RECEPTION, ev: 'when', v: { date, time } }, { at: at(byAgo - MIN), by: RECEPTION, ev: 'doctor', v: doctor });
      b.sms.push({ at: at(byAgo - 2 * MIN), kind: 'appt', ok: true, id: msgId(), err: '', dlv: 1 });
      b.log.push({ at: at(byAgo - 2 * MIN), by: RECEPTION, ev: 'sms', v: { kind: 'appt', ok: true } });
      return b;
    };
    const received = (b, ms) => { b.sms.push({ at: at(ms), kind: 'received', ok: true, id: msgId(), err: '', dlv: 1 }); b.log.push({ at: at(ms), by: 'سیستم', ev: 'sms', v: { kind: 'received', ok: true } }); };

    let b = add({ status: 'new', dept: 'dental', type: 'ویزیت اول', name: 'مریم کاظمی', mobile: '09001234571', note: 'دندان عقل پایین سمت چپ از دیروز درد می‌کند.', createdAt: at(18 * MIN) });
    received(b, 18 * MIN);
    b = add({ status: 'new', dept: 'beauty', type: 'مشاوره', name: 'نگار صالحی', mobile: '09001234572', note: 'برای بوتاکس پیشانی سؤال دارم؛ عصرها در دسترسم.', createdAt: at(2 * HOUR + 10 * MIN) });
    received(b, 2 * HOUR + 10 * MIN);
    b = add({ status: 'new', dept: 'dental', type: 'ادامه‌ی درمان', name: 'حسین مرادی', mobile: '09001234573', note: 'ادامه‌ی عصب‌کشی دندان بالا', createdAt: at(5 * HOUR + 20 * MIN), attempts: 1 });
    received(b, 5 * HOUR + 20 * MIN);
    b.log.push({ at: at(3 * HOUR), by: RECEPTION, ev: 'noanswer', v: 1 });
    b = add({ status: 'called', dept: 'medicine', type: 'مشاوره', name: 'زهرا رحیمی', mobile: '09001234574', note: 'درباره‌ی نتیجه‌ی آزمایش خون', createdAt: at(3 * HOUR), staffNote: 'بعد از ساعت ۶ عصر دوباره تماس بگیرید.' });
    received(b, 3 * HOUR);
    b.log.push({ at: at(2 * HOUR + 40 * MIN), by: RECEPTION, ev: 'status', v: 'called' }, { at: at(2 * HOUR + 39 * MIN), by: RECEPTION, ev: 'note', v: '' });

    /* امروز: ساعت‌ها نسبت به همین حالا چیده می‌شوند تا برنامه‌ی روز همیشه زنده باشد (یکی انجام شده، یکی در کلینیک، بقیه در راه) */
    const nm = Math.max(120, Math.min(1320, nowMin()));
    const slot = (d) => Math.max(0, Math.min(1425, Math.round((nm + d) / 15) * 15));
    b = sched(add({ dept: 'medicine', type: 'ویزیت اول', name: 'علی رضایی', mobile: '09001234575', createdAt: at(2 * DAY) }), t, slot(-100), 'doc-3', 2 * DAY - HOUR);
    b.status = 'done'; b.log.push({ at: at(HOUR), by: RECEPTION, ev: 'status', v: 'arrived' }, { at: at(40 * MIN), by: RECEPTION, ev: 'status', v: 'done' });
    b = sched(add({ dept: 'medicine', type: 'ادامه‌ی درمان', name: 'فاطمه حسینی', mobile: '09001234576', createdAt: at(DAY + 4 * HOUR), source: 'phone', createdBy: RECEPTION }), t, slot(-15), 'doc-4', DAY + 4 * HOUR);
    b.status = 'arrived'; b.log.push({ at: at(12 * MIN), by: RECEPTION, ev: 'status', v: 'arrived' });
    sched(add({ dept: 'beauty', type: 'مشاوره', name: 'سمیرا نوری', mobile: '09001234577', note: 'مشاوره‌ی تزریق فیلر لب', createdAt: at(DAY + 6 * HOUR) }), t, slot(45), 'doc-5', DAY + 5 * HOUR);
    let [dp, dc] = fit(t, 'dental', 'doc-1');
    sched(add({ dept: dp, type: 'مشاوره', name: 'امیر جعفری', mobile: '09001234578', note: 'لمینت دندان‌های جلو', createdAt: at(DAY) }), t, slot(120), dc, DAY - HOUR);
    sched(add({ dept: 'medicine', type: 'ویزیت اول', name: 'محمدرضا فتحی', mobile: '09001234579', createdAt: at(5 * HOUR), source: 'phone', createdBy: RECEPTION }), t, slot(200), 'doc-4', 5 * HOUR);

    /* روزهای بعد */
    const t1 = addDays(t, 1);
    sched(add({ dept: 'beauty', type: 'ادامه‌ی درمان', name: 'الهام موسوی', mobile: '09001234581', note: 'جلسه‌ی سوم لیزر', createdAt: at(DAY + 2 * HOUR) }), t1, 660, 'doc-5', DAY + HOUR);
    sched(add({ dept: 'medicine', type: 'ادامه‌ی درمان', name: 'محمد قاسمی', mobile: '09001234582', note: 'سرم‌تراپی', createdAt: at(20 * HOUR), source: 'phone', createdBy: RECEPTION }), t1, 570, 'doc-3', 20 * HOUR);
    [dp, dc] = fit(addDays(t, 2), 'dental', 'doc-2');
    sched(add({ dept: dp, type: 'ویزیت اول', name: 'کاوه احمدی', mobile: '09001234583', note: 'جرم‌گیری و بررسی', createdAt: at(DAY + 8 * HOUR) }), addDays(t, 2), 645, dc, DAY + 7 * HOUR);
    [dp, dc] = fit(addDays(t, 3), 'dental', 'doc-1');
    sched(add({ dept: dp, type: 'ادامه‌ی درمان', name: 'پریسا عباسی', mobile: '09001234584', note: 'روکش دندان', createdAt: at(2 * DAY + 3 * HOUR) }), addDays(t, 3), 1020, dc, 2 * DAY);
    sched(add({ dept: 'beauty', type: 'مشاوره', name: 'نازنین رستمی', mobile: '09001234585', createdAt: at(3 * DAY) }), addDays(t, 5), 810, 'doc-5', 3 * DAY - HOUR);

    /* گذشته */
    b = sched(add({ dept: 'medicine', type: 'ویزیت اول', name: 'یوسف کریمی', mobile: '09001234586', createdAt: at(2 * DAY) }), addDays(t, -1), 1320, 'doc-3', 2 * DAY - HOUR);
    b.status = 'done'; b.log.push({ at: at(DAY - 2 * HOUR), by: RECEPTION, ev: 'status', v: 'done' });
    [dp, dc] = fit(addDays(t, -2), 'dental', 'doc-1');
    b = sched(add({ dept: dp, type: 'ادامه‌ی درمان', name: 'رضا شریفی‌نیا', mobile: '09001234587', createdAt: at(4 * DAY) }), addDays(t, -2), 690, dc, 4 * DAY - HOUR);
    b.status = 'no-show'; b.log.push({ at: at(2 * DAY - 3 * HOUR), by: RECEPTION, ev: 'status', v: 'no-show' });
    b = add({ status: 'cancelled', dept: 'beauty', type: 'مشاوره', name: 'مینا یزدانی', mobile: '09001234588', note: 'منصرف شد', createdAt: at(3 * DAY) });
    b.log.push({ at: at(3 * DAY - 2 * HOUR), by: RECEPTION, ev: 'status', v: 'cancelled' });

    const callbacks = [
      { id: 'c1', name: 'سارا امینی', mobile: '09001234590', topic: 'نوبت دندانپزشکی', status: 'new', createdAt: at(12 * MIN), v: 0 },
      { id: 'c2', name: 'بهرام نیک‌نام', mobile: '09001234591', topic: 'شرایط بیمه', status: 'called', createdAt: at(HOUR + 5 * MIN), staffNote: 'فردا صبح دوباره زنگ بزنیم.', v: 1 },
      { id: 'c3', name: 'لیلا صادقی', mobile: '09001234592', topic: 'لیزر موهای زائد', status: 'done', createdAt: at(DAY + HOUR), v: 2 }
    ];
    const users = [
      { id: 'u1', username: 'paziresh', name: RECEPTION, role: 'reception', mobile: '09000000001', active: true, mustChange: false, createdAt: at(30 * DAY), lastLoginAt: at(2 * MIN) },
      { id: 'u2', username: 'paziresh.asr', name: 'نیلوفر رحیمی', role: 'reception', mobile: '09000000002', active: true, mustChange: false, createdAt: at(20 * DAY), lastLoginAt: at(35 * MIN) },
      { id: 'u3', username: 'paziresh.shab', name: 'رضا کریمی', role: 'reception', mobile: '09000000003', active: false, mustChange: false, createdAt: at(25 * DAY), lastLoginAt: at(9 * DAY) }
    ];
    const NIL = { id: 'u2', name: 'نیلوفر رحیمی' };
    const audit = [
      { at: at(2 * MIN), by: { id: 'u1', name: RECEPTION }, action: 'login', target: 'paziresh', detail: '' },
      { at: at(35 * MIN), by: NIL, action: 'login', target: 'paziresh.asr', detail: '' },
      { at: at(HOUR), by: NIL, action: 'callback.update', target: '0900***4591', detail: 'called' },
      { at: at(2 * HOUR + 39 * MIN), by: { id: 'u1', name: RECEPTION }, action: 'booking.update', target: B[3].ref, detail: 'وضعیت called، یادداشت' },
      { at: at(3 * HOUR), by: { id: 'u1', name: RECEPTION }, action: 'booking.update', target: B[2].ref, detail: 'جواب نداد' },
      { at: at(3 * HOUR + 5 * MIN), by: null, action: 'login.fail', target: 'paziresh', detail: '' },
      { at: at(5 * HOUR), by: { id: 'u1', name: RECEPTION }, action: 'booking.create', target: B[8].ref, detail: 'پزشک عمومی · نوبت ' + t },
      { at: at(9 * DAY), by: { id: 'u1', name: RECEPTION }, action: 'user.update', target: 'paziresh.shab', detail: 'غیرفعال' }
    ];
    /* مخاطبان: از همین درخواست‌ها و تماس‌ها، به‌علاوه‌ی چند نفری که کد گرفته‌اند ولی نوبت را تمام نکرده‌اند */
    const contacts = new Map();
    const note = (mobile, o) => addContact(contacts, mobile, o);
    B.forEach((x) => {
      if (x.source === 'phone') note(x.mobile, { source: 'phone', name: x.name, dept: x.dept, at: x.createdAt });
      else { note(x.mobile, { source: 'otp', at: at(Date.now() - Date.parse(x.createdAt) + 2 * MIN) }); note(x.mobile, { source: 'booking', name: x.name, dept: x.dept, verified: true, at: x.createdAt }); }
    });
    callbacks.forEach((x) => note(x.mobile, { source: 'callback', name: x.name, at: x.createdAt }));
    [['09001234601', 40 * MIN], ['09001234602', 7 * HOUR], ['09001234603', 3 * DAY], ['09001234604', 12 * DAY]].forEach(([mb, ms]) => note(mb, { source: 'otp', at: at(ms) }));
    /* یک بیمار قدیمی که دوباره آمده و یکی که پیامک اطلاع‌رسانی نمی‌خواهد */
    note('09001234586', { source: 'otp', at: at(40 * DAY) }); note('09001234586', { source: 'booking', name: 'یوسف کریمی', dept: 'dental', verified: true, at: at(40 * DAY - MIN) });
    contacts.get('09001234588').optout = true;
    contacts.get('09001234588').note = 'خواست پیامک تبلیغاتی نگیرد.';
    return { B, callbacks, users, audit, contacts };
  }

  function create() {
    const db = seed();
    let authed = false, arriveAt = 0, arrived = false;
    const me = () => db.users[0];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const ok = (o = {}) => Object.assign({ ok: true, status: 200 }, clone(o));
    const fail = (status, error, extra = {}) => Object.assign({ ok: false, status, error }, clone(extra));
    const cfg = () => ({ depts: DEPTS, doctors: DOCTORS, types: TYPES, statuses: STATUSES, roles: ROLES, sms: { mode: 'live', appt: true, remind: true, received: true, remindHour: 17 }, twofa: true, today: today(), now: Date.now(), can: CAN });
    const log = (action, target, detail = '') => { const u = me(); db.audit.unshift({ at: new Date().toISOString(), by: { id: u.id, name: u.name }, action, target, detail }); };
    const noteContact = (mobile, o) => addContact(db.contacts, mobile, o);
    /* قالب‌های پیامک نمایشی: همه روشن با نام کلینیک، جز خبر درخواست تازه به پذیرش که هنوز ثبت نشده */
    const TPL = [
      ['otp', 'کد تأیید (سایت و ورود پنل)', 'ساسان کلینیک\nکد تأیید شما: #CODE#\nاین کد را به کسی ندهید.\nsasan-clinic.ir'],
      ['received', 'پیامک «درخواست ثبت شد» به بیمار', 'درخواست نوبت #DEPT# شما در ساسان کلینیک ثبت شد.\nکد پیگیری: #REF#\nپذیرش به‌زودی برای هماهنگی روز و ساعت با شما تماس می‌گیرد.\n۰۱۱۵۴۶۱۱۵۶۰'],
      ['reception', 'خبر درخواست تازه به موبایل پذیرش', 'درخواست نوبت تازه در سایت ساسان کلینیک:\n#NAME# · #DEPT#\nشماره: #TEL#\nاز پنل پذیرش پیگیری کنید.'],
      ['appt', 'تأیید نوبت از پنل', '#NAME# عزیز، نوبت #DEPT# شما در ساسان کلینیک برای #DATE# ساعت #TIME# ثبت شد.\nبرای تغییر یا لغو: ۰۱۱۵۴۶۱۱۵۶۰'],
      ['remind', 'یادآوری یک روز قبل', 'یادآوری: #NAME# عزیز، فردا #DATE# ساعت #TIME# نوبت #DEPT# در ساسان کلینیک دارید.\nبرای تغییر یا لغو: ۰۱۱۵۴۶۱۱۵۶۰']
    ].map(([kind, label, text]) => ({ kind, label, text, on: kind !== 'reception', branded: kind !== 'reception', pending: null }));
    let receptionMobile = '';
    const tplView = () => ({ live: true, receptionMobile, list: TPL.map((x) => Object.assign({}, x, { id: x.on ? 400000 : 0, test: false, rejected: null, failed: '', needsMobile: x.kind === 'reception' && !receptionMobile })) });
    const pushSms = (b, kind) => { b.sms.push({ at: new Date().toISOString(), kind, ok: true, id: msgId(), err: '', dlv: null }); b.log.push({ at: new Date().toISOString(), by: me().name, ev: 'sms', v: { kind, ok: true } }); };

    async function handle(m, p, body = {}) {
      await wait(110 + Math.random() * 170);
      if (p === '/login' && m === 'POST') return body.username && body.password ? ok({ step: 'code', ticket: 'demo', mobile: '0900***0001', ttl: 120, wait: 120 }) : fail(401, 'auth');
      if (p === '/login/code' && m === 'POST') {
        if (!/^\d{5}$/.test(String(body.code))) return fail(401, 'code', { left: 4 });
        authed = true; arriveAt = Date.now() + 45e3;
        me().lastLoginAt = new Date().toISOString();
        log('login', me().username);
        return ok({ user: me() });
      }
      if (p === '/login/resend' && m === 'POST') return ok({ wait: 120, ttl: 120 });
      if (!authed) return fail(401, 'auth');
      const u = me(), can = (x) => CAN.includes(x);
      if (p === '/logout') { log('logout', u.username); authed = false; return ok(); }
      if (p === '/me') return ok({ user: u, cfg: cfg() });
      if (p === '/password') {
        if (!body.current) return fail(401, 'current');
        if (String(body.next || '').length < 8) return fail(400, 'weak', { message: 'رمز باید دست‌کم ۸ نویسه باشد' });
        log('password.change', u.username);
        return ok({ user: u });
      }
      if (p === '/bookings' && m === 'GET') {
        /* چند ثانیه بعد از ورود، یک درخواست تازه از سایت می‌رسد تا اعلان و شمارنده دیده شود */
        if (!arrived && Date.now() > arriveAt) {
          arrived = true;
          const b = { ref: 'SS-70425', v: 0, status: 'new', dept: 'dental', type: 'ویزیت اول', name: 'آرش فرهادی', mobile: '09001234593', note: 'دندان شکسته؛ هر چه زودتر', source: 'site', createdAt: new Date().toISOString(), sms: [], log: [] };
          b.sms.push({ at: b.createdAt, kind: 'received', ok: true, id: msgId(), err: '', dlv: null });
          db.B.push(b);
          noteContact(b.mobile, { source: 'otp' });
          noteContact(b.mobile, { source: 'booking', name: b.name, dept: b.dept, verified: true });
        }
        return ok({ bookings: db.B, today: today() });
      }
      const write = /^\/bookings/.test(p) && m !== 'GET';
      if (write && !can('write')) return fail(403, 'forbidden');
      if (p === '/bookings' && m === 'POST') {
        const b = { ref: 'SS-' + (10000 + Math.floor(Math.random() * 89999)), v: 1, status: 'new', dept: body.dept, type: body.type, name: body.name, mobile: body.mobile, note: body.note || '', source: 'phone', createdBy: u.name, createdAt: new Date().toISOString(), sms: [], log: [{ at: new Date().toISOString(), by: u.name, ev: 'create', v: 'phone' }] };
        if (body.date) { Object.assign(b, { status: 'scheduled', date: body.date, time: body.time, doctor: body.doctor || '' }); b.log.push({ at: new Date().toISOString(), by: u.name, ev: 'when', v: { date: b.date, time: b.time } }); }
        db.B.push(b);
        log('booking.create', b.ref, DEPTS[b.dept].t);
        noteContact(b.mobile, { source: 'phone', name: b.name, dept: b.dept });
        let sms = null;
        if (body.date && body.sms) { pushSms(b, 'appt'); sms = { ok: true }; }
        return ok({ booking: b, sms });
      }
      let mm = /^\/bookings\/([^/]+)(\/sms(?:\/refresh)?)?$/.exec(p);
      if (mm) {
        const b = db.B.find((x) => x.ref === decodeURIComponent(mm[1]));
        if (!b) return fail(404, 'not-found');
        if (m === 'PATCH') {
          const by = u.name, now = new Date().toISOString();
          if (body.noAnswer) { b.attempts = (b.attempts || 0) + 1; b.log.push({ at: now, by, ev: 'noanswer', v: b.attempts }); }
          else {
            const next = Object.assign({}, b, body);
            if (['scheduled', 'arrived'].includes(next.status) && (!next.date || next.time == null || next.time === '')) return fail(400, 'when');
            if (next.status === 'scheduled' && body.date && body.date !== b.date && body.date < today()) return fail(400, 'past');
            if (body.status && body.status !== b.status) { b.status = body.status; b.log.push({ at: now, by, ev: 'status', v: body.status }); }
            if ((body.date && body.date !== b.date) || (body.time != null && body.time !== b.time)) { b.date = body.date || b.date; b.time = body.time != null ? body.time : b.time; b.log.push({ at: now, by, ev: 'when', v: { date: b.date, time: b.time } }); delete b.remindedAt; }
            if (body.doctor !== undefined && body.doctor !== (b.doctor || '')) { b.doctor = body.doctor; b.log.push({ at: now, by, ev: 'doctor', v: body.doctor }); }
            if (body.staffNote !== undefined && body.staffNote !== (b.staffNote || '')) { b.staffNote = body.staffNote; b.log.push({ at: now, by, ev: 'note', v: '' }); }
          }
          b.v = (b.v || 0) + 1; b.updatedAt = now;
          log('booking.update', b.ref, body.noAnswer ? 'جواب نداد' : body.status || 'تغییر');
          let sms = null;
          if (body.sms && b.status === 'scheduled') { pushSms(b, 'appt'); sms = { ok: true }; }
          return ok({ booking: b, sms });
        }
        if (mm[2] === '/sms') { pushSms(b, 'appt'); log('sms.appt', b.ref, 'فرستاده شد'); return ok({ booking: b }); }
        if (mm[2] === '/sms/refresh') { b.sms.forEach((e) => { if (e.ok && !e.dlv) e.dlv = 1; }); return ok({ booking: b }); }
      }
      if (p === '/callbacks' && m === 'GET') return can('callbacks') ? ok({ callbacks: db.callbacks }) : fail(403, 'forbidden');
      mm = /^\/callbacks\/([^/]+)$/.exec(p);
      if (mm && m === 'PATCH') {
        const c = db.callbacks.find((x) => x.id === mm[1]);
        if (!c) return fail(404, 'not-found');
        if (body.status) c.status = body.status;
        if (body.staffNote !== undefined) c.staffNote = body.staffNote;
        c.v = (c.v || 0) + 1;
        log('callback.update', c.mobile.slice(0, 4) + '***' + c.mobile.slice(-4), body.status || 'یادداشت');
        return ok({ callback: c });
      }
      if (p === '/sms' && m === 'GET') {
        const list = [];
        db.B.forEach((b) => (b.sms || []).forEach((e) => list.push(Object.assign({ ref: b.ref, name: b.name, dept: b.dept }, e))));
        list.sort((a, b) => (a.at < b.at ? 1 : -1));
        return ok({ mode: 'live', credit: 1510, creditError: '', remindHour: 17, templates: { otp: true, received: true, reception: !!tplView().list[2].on, appt: true, remind: true }, tpl: tplView(), log: list });
      }
      /* قالب‌های نام‌دار (نمایشی): «ثبت» خبر پذیرش را در انتظار می‌گذارد و «پرسیدن وضعیت» تأییدش می‌کند */
      if (p === '/sms/templates/submit' && m === 'POST') {
        const made = [];
        TPL.forEach((x) => { if (!x.on && !x.pending) { x.pending = { id: 600000 + made.length, at: new Date().toISOString() }; made.push({ kind: x.kind, id: x.pending.id }); } });
        log('sms.templates', '', `${made.length} قالب ثبت شد`);
        return ok({ results: made, tpl: tplView() });
      }
      if (p === '/sms/templates/check' && m === 'POST') {
        const changed = [];
        TPL.forEach((x) => { if (x.pending) { x.on = true; x.branded = true; x.pending = null; changed.push({ kind: x.kind, status: 2 }); db.audit.unshift({ at: new Date().toISOString(), by: { id: 'system', name: 'سیستم' }, action: 'sms.template', target: x.label, detail: 'تأیید شد و روشن شد' }); } });
        return ok({ changed, tpl: tplView() });
      }
      if (p === '/sms/reception' && m === 'PUT') {
        if (body.mobile && !/^09\d{9}$/.test(body.mobile)) return fail(400, 'input', { message: 'موبایل باید ۱۱ رقم و با ۰۹ شروع شود.' });
        receptionMobile = body.mobile || '';
        log('sms.reception', body.mobile ? body.mobile.slice(0, 4) + '***' + body.mobile.slice(-4) : '', body.mobile ? 'موبایل پذیرش' : 'خاموش');
        return ok({ tpl: tplView() });
      }
      if (p === '/sms/refresh') { db.B.forEach((b) => (b.sms || []).forEach((e) => { if (e.ok && !e.dlv) e.dlv = Math.random() < .85 ? 1 : 3; })); return ok({ checked: 3 }); }
      if (p === '/users') {
        if (!can('users')) return fail(403, 'forbidden');
        if (m === 'GET') return ok({ users: db.users });
        if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(body.username || '')) return fail(400, 'input', { message: 'نام کاربری: ۳ تا ۳۲ حرف انگلیسی کوچک، عدد، نقطه یا خط تیره' });
        if (db.users.some((x) => x.username === body.username)) return fail(400, 'input', { message: 'این نام کاربری هست' });
        if (!/^09\d{9}$/.test(body.mobile || '')) return fail(400, 'input', { message: 'موبایل باید ۱۱ رقم و با ۰۹ شروع شود (برای کد ورود)' });
        if (String(body.password || '').length < 8) return fail(400, 'input', { message: 'رمز باید دست‌کم ۸ نویسه باشد' });
        const nu = { id: 'u' + (db.users.length + 1), username: body.username, name: body.name, role: 'reception', mobile: body.mobile, active: true, mustChange: true, createdAt: new Date().toISOString(), lastLoginAt: null };
        db.users.push(nu);
        log('user.create', nu.username, nu.name);
        return ok({ user: nu });
      }
      mm = /^\/users\/([^/]+)$/.exec(p);
      if (mm && m === 'PATCH') {
        if (!can('users')) return fail(403, 'forbidden');
        const t = db.users.find((x) => x.id === mm[1]);
        if (!t) return fail(404, 'not-found');
        if (t.id === u.id && body.active === false) return fail(400, 'input', { message: 'حساب خودتان را نمی‌توانید غیرفعال کنید' });
        ['name', 'mobile', 'active'].forEach((k) => { if (body[k] !== undefined) t[k] = body[k]; });
        if (body.password) t.mustChange = true;
        log('user.update', t.username, body.password ? 'رمز تازه' : 'مشخصات');
        return ok({ user: t });
      }
      if (p === '/audit') return can('audit') ? ok({ audit: db.audit }) : fail(403, 'forbidden');
      if (p.startsWith('/contacts')) {
        if (!can('contacts')) return fail(403, 'forbidden');
        const C = db.contacts;
        if (p === '/contacts' && m === 'GET') return ok({ contacts: [...C.values()].sort((a, b) => (a.last < b.last ? 1 : -1)) });
        if (p === '/contacts/exported' && m === 'POST') { log('contacts.export', '', `${Number(body.count) || 0} شماره · ${body.kind === 'txt' ? 'فقط شماره‌ها' : body.kind === 'copy' ? 'کپی' : 'اکسل'}`); return ok(); }
        const cm = /^\/contacts\/(\d{11})$/.exec(p);
        const c = cm && C.get(cm[1]);
        if (!c) return fail(404, 'not-found');
        const mask = c.mobile.slice(0, 4) + '***' + c.mobile.slice(-4);
        if (m === 'PATCH') {
          const was = c.optout;
          if (body.optout !== undefined) c.optout = !!body.optout;
          if (body.name !== undefined) c.name = String(body.name).trim().slice(0, 60);
          if (body.note !== undefined) c.note = String(body.note).trim().slice(0, 300);
          log('contact.update', mask, c.optout !== was ? (c.optout ? 'لغو اطلاع‌رسانی' : 'برگشت به اطلاع‌رسانی') : 'نام و یادداشت');
          return ok({ contact: c });
        }
        if (m === 'DELETE') { C.delete(c.mobile); log('contact.delete', mask); return ok(); }
        return fail(405, 'method');
      }
      if (p.startsWith('/stats')) return can('stats') ? ok(demoStats(Number((/days=(\d+)/.exec(p) || [])[1]) || 30)) : fail(403, 'forbidden');
      if (p.startsWith('/articles')) return can('articles') ? arts.handle(m, p, body, u, log) : fail(403, 'forbidden');
      return fail(404, 'not-found');
    }
    const arts = demoArticles(ok, fail, clone);
    return {
      get: (p) => handle('GET', p), post: (p, b = {}) => handle('POST', p, b), patch: (p, b) => handle('PATCH', p, b),
      put: (p, b) => handle('PUT', p, b), del: (p) => handle('DELETE', p)
    };
  }

  /* آمار بازدید نمایشی: الگوی هفتگی و کمی رشد (در سایت واقعی از سرور کلینیک می‌آید) */
  function demoStats(n) {
    const days = [];
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      const wd = new Date(d + 'T12:00:00Z').getUTCDay();
      const base = 38 + (n - i) * 0.35 + (wd === 5 ? -10 : wd === 6 ? 8 : 0);
      const uniq = Math.max(4, Math.round(base * (0.8 + rnd() * 0.4)));
      days.push({ d, uniq, views: Math.round(uniq * (2.1 + rnd() * 0.9)) });
    }
    const sum = (a, f) => a.reduce((x, y) => x + y[f], 0), half = Math.floor(n / 2);
    const U = sum(days, 'uniq'), V = sum(days, 'views');
    const pg = [['/', 'صفحه‌ی اصلی', 0.3], ['/dental.html', 'دندانپزشکی در سلمان‌شهر (متل‌قو)', 0.17], ['/contact.html', 'آدرس و تلفن ساسان کلینیک سلمان‌شهر', 0.11], ['/article-implant-or-bridge.html', 'ایمپلنت یا بریج؛ برای جای خالی یک دندان کدام بهتر است؟', 0.08], ['/beauty.html', 'زیبایی و لیزر در سلمان‌شهر', 0.07], ['/doctors.html', 'دندانپزشک و پزشکان سلمان‌شهر', 0.06], ['/article-after-tooth-extraction.html', 'بعد از کشیدن دندان؛ از ۲۴ ساعت اول تا یک هفته بعد', 0.05], ['/medicine.html', 'پزشک عمومی شبانه‌روزی سلمان‌شهر', 0.05]];
    const src = [['گوگل', 0.46], ['مستقیم', 0.24], ['اینستاگرام', 0.14], ['بلد', 0.07], ['نشان', 0.04], ['تلگرام', 0.03]];
    return {
      days, totals: { views: V, uniq: U, today: days[days.length - 1], yesterday: days[days.length - 2] || null, prev: sum(days.slice(0, half), 'uniq'), cur: sum(days.slice(n - half), 'uniq') },
      pages: pg.map(([k, t, f]) => ({ k, t, v: Math.round(V * f) })), sources: src.map(([k, f]) => ({ k, v: Math.round(U * f) })),
      devices: { m: Math.round(U * 0.74), d: Math.round(U * 0.2), t: Math.round(U * 0.06) }
    };
  }

  /* ---------- مقاله‌های نمایشی: از خود صفحه‌های سایت خوانده می‌شوند و تغییرها فقط در همین صفحه می‌مانند ---------- */
  function demoArticles(ok, fail, clone) {
    const SITE = location.pathname.includes('/panel/') ? '../' : './';
    const CATN = { dental: 'دندانپزشکی', beauty: 'زیبایی و لیزر', medicine: 'پزشکی عمومی' };
    const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const doc = (h) => new DOMParser().parseFromString(h, 'text/html');
    const text = (h) => doc('<body>' + (h || '') + '</body>').body.textContent.replace(/\s+/g, ' ').trim();
    const en = (s) => String(s || '').replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
    const base = (src) => ((/(img\/art\/[a-z0-9-]+\/[a-z0-9-]+?)(?:-p)?-\d+\.webp$/.exec(src || '') || [])[1] || '');
    const AR = new Map(), orig = new Map(), imgs = {};
    let loaded = null, n = 0;
    const words = (a) => text(a.lead + ' ' + a.body + ' ' + a.faq.map((f) => f.q + ' ' + f.a).join(' ')).split(' ').length;
    function load() {
      if (loaded) return loaded;
      loaded = (async () => {
        try {
          const d = doc(await (await fetch(SITE + 'articles.html', { cache: 'no-store' })).text());
          const dates = {};
          d.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { const j = JSON.parse(s.textContent); (j.blogPost || []).forEach((b) => { dates[b.url.split('/').pop()] = b; }); } catch (e) { /* */ } });
          d.querySelectorAll('.ax-grid a.ac').forEach((a) => {
            const url = a.getAttribute('href'), slug = url.replace(/^article-|\.html$/g, '');
            const mins = Number(en((a.querySelector('.ac__meta small') || {}).textContent).replace(/\D/g, '')) || 4;
            const dt = dates[url] || {};
            AR.set(slug, { slug, url, k: a.dataset.k, title: a.querySelector('b').textContent.trim(), cover: base(a.querySelector('img').getAttribute('src')), mins, words: mins * 190,
              date: dt.datePublished || '', updated: dt.dateModified || '', src: 'site', hidden: false, full: false });
          });
        } catch (e) { /* پیش‌نمایش بدون صفحه‌های سایت */ }
      })();
      return loaded;
    }
    /* متن کامل یک مقاله از صفحه‌ی خودش */
    async function full(a) {
      if (a.full) return a;
      try {
        const d = doc(await (await fetch(SITE + a.url, { cache: 'no-store' })).text());
        const body = d.querySelector('.ap-body').cloneNode(true);
        const sum = body.querySelector('.ap-sum');
        if (sum) sum.remove();
        body.querySelectorAll('h2[id]').forEach((h) => h.removeAttribute('id'));
        body.querySelectorAll('img').forEach((im) => {
          const b = base(im.getAttribute('src')), alt = im.getAttribute('alt') || '';
          if (!b) { im.remove(); return; }
          const tall = Number(im.getAttribute('height')) > Number(im.getAttribute('width'));
          [...im.attributes].map((x) => x.name).forEach((x) => im.removeAttribute(x));
          im.setAttribute('data-art', b); im.setAttribute('data-ar', tall ? '4/5' : '3/2'); im.setAttribute('alt', alt);
        });
        let tags = [];
        d.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { const j = JSON.parse(s.textContent); if (j['@type'] === 'BlogPosting' && j.keywords) tags = j.keywords.split('، ').filter(Boolean); } catch (e) { /* */ } });
        const cov = d.querySelector('.ap-cover img');
        Object.assign(a, {
          title: d.querySelector('#ap-title').textContent.trim(), lead: d.querySelector('.ap-lead').innerHTML.trim(), body: body.innerHTML.trim(),
          points: [...d.querySelectorAll('.ap-sum li')].map((li) => li.innerHTML.trim()),
          faq: [...d.querySelectorAll('details.ap-q')].map((x) => ({ q: x.querySelector('summary span').innerHTML.trim(), a: x.querySelector('.ap-q__a p').innerHTML.trim() })),
          seo: d.title, desc: (d.querySelector('meta[name="description"]') || {}).content || '', tags,
          cover: base(cov && cov.getAttribute('src')) || a.cover, coverAlt: (cov && cov.getAttribute('alt')) || '', full: true
        });
        a.words = words(a);
        if (!orig.has(a.slug)) orig.set(a.slug, clone(a));
      } catch (e) { Object.assign(a, { lead: '', body: '', points: [], faq: [], tags: [], seo: '', desc: '', coverAlt: '', full: true }); }
      return a;
    }
    const today = () => new Date().toISOString().slice(0, 10);
    const summary = (a) => ({ slug: a.slug, url: a.url, k: a.k, cat: CATN[a.k], title: a.title, cover: imgs[a.cover] || a.cover + '-720.webp', date: a.date, updated: a.updated,
      words: a.words, mins: Math.max(2, Math.round(a.words / 190)), hidden: a.hidden, src: a.src, savedBy: a.savedBy || '', savedAt: a.savedAt || '' });
    const detail = (a) => Object.assign(clone(a), { coverUrl: imgs[a.cover] || a.cover + '-1280.webp', mins: Math.max(2, Math.round(a.words / 190)) });
    function check(b) {
      if (!CATN[b.k]) return 'بخش مقاله را انتخاب کنید';
      if (text(b.title).length < 10) return 'عنوان دست‌کم ۱۰ نویسه باشد';
      if (text(b.lead).length < 40) return 'مقدمه دست‌کم ۴۰ نویسه باشد';
      if (text(b.body).length < 200) return 'متن مقاله خیلی کوتاه است';
      if (!b.cover) return 'عکس اصلی مقاله را بگذارید';
      return '';
    }
    async function handle(m, p, body, u, log) {
      await load();
      if (p === '/articles' && m === 'GET') {
        const list = [...AR.values()].sort((x, y) => String(y.date).localeCompare(String(x.date)));
        return ok({ articles: list.map(summary), cats: CATN, site: 'https://sasan-clinic.ir' });
      }
      if (p === '/articles/upload' && m === 'POST') {
        const b = 'img/art/p/pdemo' + String(++n).padStart(6, '0');
        imgs[b] = 'data:image/webp;base64,' + body.files[1280];
        return ok({ base: b, url: imgs[b] });
      }
      const mm = /^\/articles\/([a-z0-9-]+)(\/hide)?$/.exec(p);
      if (p === '/articles' && m === 'POST' || (mm && m === 'PUT')) {
        const slug = String(m === 'POST' ? body.slug : mm[1]).trim();
        if (m === 'POST' && (!SLUG.test(slug) || slug.length < 3)) return fail(400, 'input', { message: 'نشانی صفحه: حروف کوچک انگلیسی، عدد و خط تیره' });
        if (m === 'POST' && AR.has(slug)) return fail(409, 'exists', { message: 'مقاله‌ای با همین نشانی هست؛ نشانی دیگری بنویسید' });
        const prev = AR.get(slug);
        if (m === 'PUT' && !prev) return fail(404, 'not-found');
        const e = check(body);
        if (e) return fail(400, 'input', { message: e });
        const now = new Date().toISOString();
        const a = Object.assign(prev || { slug, url: 'article-' + slug + '.html', date: today(), src: 'panel' }, {
          k: body.k, title: text(body.title), lead: body.lead, body: body.body, cover: body.cover, coverAlt: body.coverAlt || '', seo: body.seo || '', desc: body.desc || '',
          points: body.points || [], faq: body.faq || [], tags: body.tags || [], hidden: !!body.hidden, updated: today(), savedBy: u.name, savedAt: now, full: true
        });
        if (prev && prev.src === 'site') a.src = 'edited';
        a.words = words(a);
        AR.set(slug, a);
        log(m === 'POST' ? 'article.create' : 'article.update', slug, a.title + (a.hidden ? ' · پیش‌نویس' : ''));
        return ok({ article: detail(a) });
      }
      if (!mm) return fail(404, 'not-found');
      const a = AR.get(mm[1]);
      if (!a) return fail(404, 'not-found');
      if (mm[2]) { a.hidden = !!body.hidden; log(a.hidden ? 'article.hide' : 'article.show', a.slug, a.title); return ok({ article: detail(await full(a)) }); }
      if (m === 'GET') return ok({ article: detail(await full(a)) });
      if (m === 'DELETE') {
        if (a.src === 'site') return fail(400, 'input', { message: 'این مقاله همان نسخه‌ی اصلی سایت است' });
        if (a.src === 'panel') { AR.delete(a.slug); log('article.delete', a.slug, a.title); return ok({ removed: true, reverted: false }); }
        const o = clone(orig.get(a.slug));
        AR.set(a.slug, o);
        log('article.revert', a.slug, o.title);
        return ok({ removed: false, reverted: true, article: detail(o) });
      }
      return fail(405, 'method');
    }
    return { handle };
  }

  window.SasanDemo = { create };
})();
