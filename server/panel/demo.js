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
  const ROLES = { admin: 'مدیر', reception: 'پذیرش', doctor: 'پزشک' };
  const CAN = { admin: ['write', 'phone', 'callbacks', 'sms', 'users', 'audit'], reception: ['write', 'phone', 'callbacks', 'sms'], doctor: [] };

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
      { id: 'u1', username: 'modir', name: 'مدیر کلینیک', role: 'admin', mobile: '09000000001', doctor: '', active: true, mustChange: false, createdAt: at(30 * DAY), lastLoginAt: at(2 * MIN) },
      { id: 'u2', username: 'paziresh', name: RECEPTION, role: 'reception', mobile: '09000000002', doctor: '', active: true, mustChange: false, createdAt: at(20 * DAY), lastLoginAt: at(35 * MIN) },
      { id: 'u3', username: 'dr.nikpour', name: 'دکتر نیک‌پور', role: 'doctor', mobile: '09000000003', doctor: 'doc-1', active: true, mustChange: false, createdAt: at(20 * DAY), lastLoginAt: at(DAY) },
      { id: 'u4', username: 'paziresh.shab', name: 'رضا کریمی', role: 'reception', mobile: '09000000004', doctor: '', active: false, mustChange: false, createdAt: at(25 * DAY), lastLoginAt: at(9 * DAY) }
    ];
    const audit = [
      { at: at(2 * MIN), by: { id: 'u1', name: 'مدیر کلینیک' }, action: 'login', target: 'modir', detail: '' },
      { at: at(35 * MIN), by: { id: 'u2', name: RECEPTION }, action: 'login', target: 'paziresh', detail: '' },
      { at: at(HOUR), by: { id: 'u2', name: RECEPTION }, action: 'callback.update', target: '0900***4591', detail: 'called' },
      { at: at(2 * HOUR + 39 * MIN), by: { id: 'u2', name: RECEPTION }, action: 'booking.update', target: B[3].ref, detail: 'وضعیت called، یادداشت' },
      { at: at(3 * HOUR), by: { id: 'u2', name: RECEPTION }, action: 'booking.update', target: B[2].ref, detail: 'جواب نداد' },
      { at: at(3 * HOUR + 5 * MIN), by: null, action: 'login.fail', target: 'paziresh', detail: '' },
      { at: at(5 * HOUR), by: { id: 'u2', name: RECEPTION }, action: 'booking.create', target: B[8].ref, detail: 'پزشک عمومی · نوبت ' + t },
      { at: at(9 * DAY), by: { id: 'u1', name: 'مدیر کلینیک' }, action: 'user.update', target: 'paziresh.shab', detail: 'غیرفعال' }
    ];
    return { B, callbacks, users, audit };
  }

  function create() {
    const db = seed();
    let role = 'admin', authed = false, arriveAt = 0, arrived = false;
    const me = () => db.users.find((u) => u.role === role && u.active);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const ok = (o = {}) => Object.assign({ ok: true, status: 200 }, clone(o));
    const fail = (status, error, extra = {}) => Object.assign({ ok: false, status, error }, clone(extra));
    const cfg = () => ({ depts: DEPTS, doctors: DOCTORS, types: TYPES, statuses: STATUSES, roles: ROLES, sms: { mode: 'sandbox', appt: true, remind: true, received: true, remindHour: 17 }, twofa: true, today: today(), now: Date.now(), can: CAN[role] });
    const log = (action, target, detail = '') => { const u = me(); db.audit.unshift({ at: new Date().toISOString(), by: { id: u.id, name: u.name }, action, target, detail }); };
    const pushSms = (b, kind) => { b.sms.push({ at: new Date().toISOString(), kind, ok: true, id: msgId(), err: '', dlv: null }); b.log.push({ at: new Date().toISOString(), by: me().name, ev: 'sms', v: { kind, ok: true } }); };

    async function handle(m, p, body = {}) {
      await wait(110 + Math.random() * 170);
      if (p === '/login' && m === 'POST') return body.username && body.password ? ok({ step: 'code', ticket: 'demo', mobile: '0900***000' + ({ admin: 1, reception: 2, doctor: 3 }[role]), ttl: 120, wait: 120 }) : fail(401, 'auth');
      if (p === '/login/code' && m === 'POST') {
        if (!/^\d{5}$/.test(String(body.code))) return fail(401, 'code', { left: 4 });
        authed = true; arriveAt = Date.now() + 45e3;
        me().lastLoginAt = new Date().toISOString();
        log('login', me().username);
        return ok({ user: me() });
      }
      if (p === '/login/resend' && m === 'POST') return ok({ wait: 120, ttl: 120 });
      if (!authed) return fail(401, 'auth');
      const u = me(), can = (x) => CAN[role].includes(x);
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
        }
        const list = role === 'doctor' ? db.B.filter((b) => b.doctor === u.doctor && ['scheduled', 'arrived', 'done', 'no-show'].includes(b.status)).map((b) => Object.assign(clone(b), { mobile: '', sms: undefined })) : db.B;
        return ok({ bookings: list, today: today() });
      }
      const write = /^\/bookings/.test(p) && m !== 'GET';
      if (write && !can('write')) return fail(403, 'forbidden');
      if (p === '/bookings' && m === 'POST') {
        const b = { ref: 'SS-' + (10000 + Math.floor(Math.random() * 89999)), v: 1, status: 'new', dept: body.dept, type: body.type, name: body.name, mobile: body.mobile, note: body.note || '', source: 'phone', createdBy: u.name, createdAt: new Date().toISOString(), sms: [], log: [{ at: new Date().toISOString(), by: u.name, ev: 'create', v: 'phone' }] };
        if (body.date) { Object.assign(b, { status: 'scheduled', date: body.date, time: body.time, doctor: body.doctor || '' }); b.log.push({ at: new Date().toISOString(), by: u.name, ev: 'when', v: { date: b.date, time: b.time } }); }
        db.B.push(b);
        log('booking.create', b.ref, DEPTS[b.dept].t);
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
        return ok({ mode: 'sandbox', credit: 1510, creditError: '', remindHour: 17, templates: { otp: true, received: true, reception: false, appt: true, remind: true }, log: list });
      }
      if (p === '/sms/refresh') { db.B.forEach((b) => (b.sms || []).forEach((e) => { if (e.ok && !e.dlv) e.dlv = Math.random() < .85 ? 1 : 3; })); return ok({ checked: 3 }); }
      if (p === '/users') {
        if (!can('users')) return fail(403, 'forbidden');
        if (m === 'GET') return ok({ users: db.users });
        if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(body.username || '')) return fail(400, 'input', { message: 'نام کاربری: ۳ تا ۳۲ حرف انگلیسی کوچک، عدد، نقطه یا خط تیره' });
        if (db.users.some((x) => x.username === body.username)) return fail(400, 'input', { message: 'این نام کاربری هست' });
        if (!/^09\d{9}$/.test(body.mobile || '')) return fail(400, 'input', { message: 'موبایل باید ۱۱ رقم و با ۰۹ شروع شود (برای کد ورود)' });
        if (String(body.password || '').length < 8) return fail(400, 'input', { message: 'رمز باید دست‌کم ۸ نویسه باشد' });
        const nu = { id: 'u' + (db.users.length + 1), username: body.username, name: body.name, role: body.role, mobile: body.mobile, doctor: body.role === 'doctor' ? body.doctor : '', active: true, mustChange: true, createdAt: new Date().toISOString(), lastLoginAt: null };
        db.users.push(nu);
        log('user.create', nu.username, ROLES[nu.role]);
        return ok({ user: nu });
      }
      mm = /^\/users\/([^/]+)$/.exec(p);
      if (mm && m === 'PATCH') {
        if (!can('users')) return fail(403, 'forbidden');
        const t = db.users.find((x) => x.id === mm[1]);
        if (!t) return fail(404, 'not-found');
        if (t.id === u.id && (body.active === false || (body.role && body.role !== 'admin'))) return fail(400, 'input', { message: 'نقش یا دسترسی خودتان را نمی‌توانید بگیرید' });
        ['name', 'role', 'mobile', 'doctor', 'active'].forEach((k) => { if (body[k] !== undefined) t[k] = body[k]; });
        if (body.password) t.mustChange = true;
        log('user.update', t.username, body.password ? 'رمز تازه' : 'مشخصات');
        return ok({ user: t });
      }
      if (p === '/audit') return can('audit') ? ok({ audit: db.audit }) : fail(403, 'forbidden');
      return fail(404, 'not-found');
    }
    return {
      get: (p) => handle('GET', p), post: (p, b = {}) => handle('POST', p, b), patch: (p, b) => handle('PATCH', p, b),
      setRole: (r) => { if (ROLES[r]) role = r; }
    };
  }

  window.SasanDemo = { create };
})();
