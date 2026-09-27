/* ==========================================================================
   book.js: کپسول نوبت آنلاین
   با هر دکمه‌ی «نوبت بگیرید» یک کپسول کوچک وسط صفحه (روی موبایل پایین صفحه) ظاهر می‌شود،
   اول پهن و بعد بلند می‌شود و به برگه‌ی نوبت تبدیل می‌شود: بخش ← زمان ← مشخصات ← کد تأیید ← ثبت.
   ارسال کد و ثبت نوبت با سرور کلینیک (پوشه‌ی server/) انجام می‌شود. اگر سرور در دسترس نباشد
   (مثل پیش‌نمایش ایستا)، همان مسیر به‌شکل نمایشی و بدون ارسال پیامک اجرا می‌شود.
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, toFa, Motion, Clinic, lockScroll, Aurora } = S;
  const root = document.documentElement;
  const bk = $('#bk');
  if (!bk) return;

  const panel = $('.bk__panel', bk), scrim = $('.bk__scrim', bk), skin = $('.bk__skin', bk), pill = $('.bk__pill', bk), inn = $('.bk__in', bk);
  const view = $('.bk__view', bk), steps = $$('.bk__step', bk), progLis = $$('.bk__prog li', bk), bar = $('.bk__bar i', bk);
  const nextBtn = $('#bkNext'), backBtn = $('.bk__back', bk), msg = $('#bkMsg'), sumEl = $('#bkSum'), foot = $('.bk__foot', bk);
  const titleEl = $('#bkTitle'), subEl = $('#bkSub');
  /* شماره‌ها در متن راست‌به‌چپ جدا (isolate) و بدون شکستن خط می‌مانند */
  const ltr = (t) => '\u2066' + t.replace(/ /g, '\u00a0') + '\u2069';
  const TEL = ltr('۰۱۱ ۵۴۶۱ ۱۵۶۰');
  const can = () => root.classList.contains('motion') && !root.classList.contains('rm') && !!window.gsap;
  const digits = (v) => String(v || '').replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const normTel = (v) => digits(v).replace(/[\s\-().]/g, '').replace(/^(\+98|0098|98(?=9\d{9}$))/, '0').replace(/^9(?=\d{9}$)/, '09');
  const prettyTel = (t) => ltr(toFa(`${t.slice(0, 4)} ${t.slice(4, 7)} ${t.slice(7)}`));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- سرور: اگر /api/health جواب درست بدهد، کد واقعی پیامک می‌شود ---------- */
  /* سرور کلینیک هنگام فرستادن صفحه این متا را اضافه می‌کند؛ بدون آن (میزبانی ایستا) درخواستی فرستاده نمی‌شود */
  const apiMeta = $('meta[name="sasan-api"]');
  const API = ((apiMeta && apiMeta.content) || '/api').replace(/\/$/, '');
  let live = null;
  const probe = () => {
    if (live !== null) return Promise.resolve(live);
    if (!apiMeta || !/^https?:$/.test(location.protocol) || !window.fetch) return Promise.resolve((live = false));
    const ac = window.AbortController ? new AbortController() : null;
    const t = setTimeout(() => ac && ac.abort(), 2500);
    return fetch(API + '/health', { signal: ac ? ac.signal : undefined, headers: { accept: 'application/json' }, credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (live = !!(j && j.ok && j.service === 'sasan-booking')))
      .catch(() => (live = false))
      .finally(() => clearTimeout(t));
  };
  const post = (path, body) => fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) })
    .then((r) => r.json().catch(() => ({ ok: false, error: 'server' })))
    .catch(() => ({ ok: false, error: 'network' }));

  /* ---------- بخش‌ها و پزشکان ---------- */
  const ALL = [0, 1, 2, 3, 4, 5, 6];
  const DEPT = {
    dental: { t: 'دندانپزشکی', ic: 'i-tooth', days: ALL.filter((d) => Clinic.DENTAL[d]), hours: [[10, 14, 'صبح'], [14, 20, 'بعدازظهر و عصر']] },
    beauty: { t: 'زیبایی و لیزر', ic: 'i-sparkles', days: ALL, hours: [[10, 14, 'صبح'], [14, 20, 'بعدازظهر و عصر']], note: 'بخش زیبایی و لیزر همه‌روزه با هماهنگی قبلی کار می‌کند؛ پذیرش پیش از مراجعه زمان را با شما قطعی می‌کند.' },
    medicine: { t: 'پزشک عمومی', ic: 'i-steth', days: ALL, hours: [[8, 14, 'صبح'], [14, 20, 'بعدازظهر و عصر'], [20, 24, 'شب']], note: 'پزشک عمومی شبانه‌روزی است؛ بعد از نیمه‌شب هم بدون نوبت پذیرش داریم.' }
  };
  /* روزهای کاری هر پزشک (شنبه = ۰) و ساعت شیفت */
  const SCHED = { 'doc-1': { days: [0, 2, 5] }, 'doc-2': { days: [0, 1, 2] }, 'doc-5': {}, 'doc-3': { from: 8, to: 20 }, 'doc-4': { from: 20, to: 24 } };
  const DOCS = $$('.doc__book[data-doc]').map((b) => {
    const li = b.closest('.doc'), id = b.dataset.doc;
    return Object.assign({ id, k: b.dataset.book, name: li ? $('.doc__name', li).textContent.trim() : '', role: li ? $('.doc__role', li).textContent.split('·').pop().trim() : '', img: `img/${id}.webp` }, SCHED[id] || {});
  });
  const docOf = (id) => DOCS.find((d) => d.id === id) || null;

  /* ---------- تاریخ به وقت تهران و تقویم شمسی ---------- */
  let fDay = null, fMon = null;
  try {
    fDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric' });
    fMon = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', month: 'long' });
  } catch (e) { /* مرورگر قدیمی: فقط نام روز هفته */ }
  const tehranYMD = () => {
    try {
      const p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
      return [+p.year, +p.month, +p.day];
    } catch (e) { const n = new Date(); return [n.getFullYear(), n.getMonth() + 1, n.getDate()]; }
  };
  const dayList = () => {
    const [y, m, d] = tehranYMD();
    return Array.from({ length: 14 }, (_, off) => {
      const dt = new Date(Date.UTC(y, m - 1, d + off, 12));
      return { off, di: (dt.getUTCDay() + 1) % 7, iso: dt.toISOString().slice(0, 10), dt };
    });
  };
  const dayNum = (x) => (fDay ? fDay.format(x.dt) : toFa(x.dt.getUTCDate()));
  const monName = (x) => (fMon ? fMon.format(x.dt) : '');
  const dayName = (x) => (x.off === 0 ? 'امروز' : x.off === 1 ? 'فردا' : Clinic.DAYS[x.di]);
  const hhmm = (t) => toFa(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);

  /* ساعت‌های آزاد یک روز؛ امروز فقط از نیم ساعت بعد */
  const slotsFor = (k, doc, x) => {
    if (!DEPT[k] || !DEPT[k].days.includes(x.di)) return [];
    if (doc && doc.days && !doc.days.includes(x.di)) return [];
    const lead = x.off === 0 ? Clinic.now().min + 30 : -1;
    return DEPT[k].hours.map(([a, b, label]) => {
      let from = a, to = b;
      if (doc && doc.from != null) { from = Math.max(from, doc.from); to = Math.min(to, doc.to); }
      const list = [];
      for (let t = from * 60; t < to * 60; t += 30) if (t >= lead) list.push(t);
      return { label, from, to, list };
    }).filter((g) => g.list.length);
  };

  /* ---------- وضعیت ---------- */
  const st = { step: 0, k: null, doc: '', type: 'ویزیت اول', day: null, time: null, name: '', tel: '', note: '', pref: null, sentAt: 0, ttl: 120, resend: 60, demo: null, ref: null, busy: false };
  const TITLES = ['بخش و پزشک را انتخاب کنید', 'نوع مراجعه، روز و ساعت', 'نام و شماره‌ی موبایل', 'کد تأیید پیامک‌شده را وارد کنید', 'نوبت شما ثبت شد'];
  const NEXT = ['ادامه', 'ادامه', 'دریافت کد تأیید', 'تأیید و ثبت نوبت'];

  /* ---------- مرحله‌ی ۱: بخش و پزشک ---------- */
  const deptLabels = $$('.bk-dept', bk), docsGrp = $('.bk-docs', bk), docsRow = $('#bkDocs');
  const availText = (k) => {
    if (k === 'medicine') return 'شبانه‌روزی؛ همین حالا هم پذیرش دارد';
    if (k === 'beauty') return 'همه‌روزه با هماهنگی قبلی';
    const d = Clinic.dental();
    return d.open ? `امروز باز است · ${d.text}` : `نزدیک‌ترین زمان: ${d.when}`;
  };
  const paintDepts = () => {
    deptLabels.forEach((l) => {
      const k = l.dataset.k, on = k === st.k;
      l.classList.toggle('is-on', on);
      $('input', l).checked = on;
      $('small', l).textContent = availText(k);
    });
    tone();
  };
  const tone = () => { if (st.k) bk.dataset.k = st.k; else bk.removeAttribute('data-k'); };
  const paintDocs = (animate) => {
    const list = DOCS.filter((d) => d.k === st.k);
    docsGrp.hidden = !st.k || !list.length;
    if (docsGrp.hidden) return;
    docsRow.innerHTML = [`<label class="bk-doc${st.doc ? '' : ' is-on'}"><input type="radio" name="bkDoc" value=""${st.doc ? '' : ' checked'}><span class="bk-doc__av"><svg class="ic" aria-hidden="true"><use href="#i-users"/></svg></span><span class="bk-doc__t"><b>فرقی نمی‌کند</b><small>اولین پزشک آزاد</small></span></label>`]
      .concat(list.map((d) => `<label class="bk-doc${st.doc === d.id ? ' is-on' : ''}"><input type="radio" name="bkDoc" value="${d.id}"${st.doc === d.id ? ' checked' : ''}><span class="bk-doc__av"><img src="${d.img}" alt="" width="72" height="90" loading="lazy" decoding="async"></span><span class="bk-doc__t"><b>${esc(d.name)}</b><small>${esc(d.role)}</small></span></label>`)).join('');
    if (animate && can()) gsap.fromTo(docsGrp.querySelectorAll('.bk-lbl, .bk-doc'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.04, ease: 'expo.out', clearProps: 'transform,opacity' });
  };
  bk.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'bkDept') {
      const changed = st.k !== t.value;
      st.k = t.value;
      if (changed) { st.doc = ''; st.day = null; st.time = null; }
      paintDepts(); paintDocs(changed); paintSum(); say('');
      pop(t.closest('.bk-dept'));
    } else if (t.name === 'bkDoc') {
      if (st.doc !== t.value) { st.doc = t.value; st.day = null; st.time = null; }
      $$('.bk-doc', docsRow).forEach((l) => l.classList.toggle('is-on', $('input', l).checked));
      paintSum();
    } else if (t.name === 'bkType') {
      st.type = t.value;
      $$('.bk-seg label', bk).forEach((l) => l.classList.toggle('is-on', $('input', l).checked));
      paintSum();
    } else if (t.name === 'bkDay') {
      st.day = t.value; st.time = null;
      $$('.bk-day', bk).forEach((l) => l.classList.toggle('is-on', $('input', l).checked));
      paintSlots(true); paintSum(); say('');
    } else if (t.name === 'bkTime') {
      st.time = +t.value;
      $$('.bk-slot', bk).forEach((l) => l.classList.toggle('is-on', $('input', l).checked));
      pop(t.closest('.bk-slot'));
      paintSum(); say('');
    }
  });
  const pop = (el) => { if (el && can()) gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: 0.6, ease: 'back.out(3)', clearProps: 'transform' }); };

  /* ---------- مرحله‌ی ۲: نوع مراجعه، روز، ساعت ---------- */
  const daysRow = $('#bkDays'), slotsBox = $('#bkSlots'), noteEl = $('#bkNote'), monthEl = $('#bkMonth');
  let days = [];
  const ctxHTML = () => {
    if (!st.k) return '';
    const d = docOf(st.doc);
    return `<svg class="ic" aria-hidden="true"><use href="#${DEPT[st.k].ic}"/></svg><b>${DEPT[st.k].t}</b><span>${d ? esc(d.name) : 'اولین پزشک آزاد'}</span><button type="button" class="bk-link" data-bk-go="0">تغییر</button>`;
  };
  const paintDays = () => {
    days = dayList();
    const doc = docOf(st.doc);
    const open = days.map((x) => slotsFor(st.k, doc, x).length > 0);
    if (!st.day || !open[days.findIndex((x) => x.iso === st.day)]) {
      /* روز پیشنهادی: اولین روزی که در بازه‌ی دلخواه (صبح/عصر/شب) ساعت آزاد دارد */
      const want = st.pref && { am: [0, 14], pm: [14, 20], night: [20, 24] }[st.pref];
      const fits = (x) => slotsFor(st.k, doc, x).some((g) => g.list.some((t) => !want || (t >= want[0] * 60 && t < want[1] * 60)));
      const first = days.find((x, i) => open[i] && fits(x)) || days.find((x, i) => open[i]);
      st.day = first ? first.iso : null; st.time = null;
    }
    let lastMon = '';
    daysRow.innerHTML = days.map((x, i) => {
      const mon = monName(x), on = st.day === x.iso;
      const lab = open[i] ? '' : (x.off === 0 && DEPT[st.k].days.includes(x.di) ? ' · تمام شده' : ' · تعطیل');
      const html = `<label class="bk-day${on ? ' is-on' : ''}${open[i] ? '' : ' is-off'}"${mon !== lastMon && i ? ` data-mon="${mon}"` : ''}><input type="radio" name="bkDay" value="${x.iso}"${on ? ' checked' : ''}${open[i] ? '' : ' disabled'} aria-label="${dayName(x)} ${dayNum(x)} ${mon}${lab}"><small>${dayName(x)}</small><b>${dayNum(x)}</b><small>${open[i] ? mon : 'تعطیل'}</small></label>`;
      lastMon = mon;
      return html;
    }).join('');
    const sel = days.find((x) => x.iso === st.day);
    monthEl.textContent = sel ? `${dayNum(sel)} ${monName(sel)}` : '';
    requestAnimationFrame(centerDay);
  };
  /* روز انتخاب‌شده وسط ردیف می‌نشیند (در راست‌به‌چپ هم درست، چون از خود مستطیل‌ها حساب می‌شود) */
  const centerDay = () => {
    const onEl = $('.bk-day.is-on', daysRow);
    if (!onEl) return;
    const a = onEl.getBoundingClientRect(), b = daysRow.getBoundingClientRect();
    daysRow.scrollLeft += (a.left + a.width / 2) - (b.left + b.width / 2);
  };
  const paintSlots = (animate) => {
    const x = days.find((d) => d.iso === st.day);
    const doc = docOf(st.doc);
    if (x) monthEl.textContent = `${dayNum(x)} ${monName(x)}`;
    const gs = x ? slotsFor(st.k, doc, x) : [];
    slotsBox.innerHTML = gs.length ? gs.map((g) => `<div class="bk-slots__g" role="radiogroup" aria-label="${g.label}"><span>${g.label} · ${hhmm(g.from * 60)} تا ${hhmm(g.to * 60)}</span><div class="bk-slots__row">${g.list.map((t) => `<label class="bk-slot${st.time === t ? ' is-on' : ''}"><input type="radio" name="bkTime" value="${t}"${st.time === t ? ' checked' : ''} aria-label="ساعت ${hhmm(t)}">${hhmm(t)}</label>`).join('')}</div></div>`).join('')
      : '<p class="bk-empty">برای این روز زمان آزادی نمانده؛ روز دیگری را انتخاب کنید.</p>';
    const d = DEPT[st.k];
    noteEl.textContent = (doc && doc.id === 'doc-4') ? 'شیفت شب تا ۸ صبح ادامه دارد؛ بعد از نیمه‌شب بدون نوبت هم می‌توانید بیایید.' : (d && d.note) || '';
    probe().then((l) => { if (l) markFull(); });
    if (animate && can()) gsap.fromTo(slotsBox.querySelectorAll('.bk-slots__g > span, .bk-slot'), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: { each: 0.012, from: 'start' }, ease: 'expo.out', clearProps: 'transform,opacity' });
    /* بازه‌ی دلخواه فرم «زمان مراجعه» به چشم بیاید */
    if (st.pref && !st.time) {
      const want = { am: 0, pm: 1, night: 2 }[st.pref];
      const g = $$('.bk-slots__g', slotsBox)[want];
      if (g) requestAnimationFrame(() => { view.scrollTop = Math.max(0, g.offsetTop - 12); });
    }
  };
  /* با سرور: ساعت‌هایی که دیگر جا ندارند غیرفعال می‌شوند (فقط ساعت؛ هیچ اطلاعاتی از بیماران نمی‌آید) */
  const fullCache = new Map();
  const markFull = () => {
    if (!live || !st.k || !st.day) return;
    const key = `${st.k}|${st.doc}|${st.day}`, c = fullCache.get(key);
    const apply = (full) => {
      if (`${st.k}|${st.doc}|${st.day}` !== key) return;
      $$('.bk-slot', slotsBox).forEach((l) => {
        const i = $('input', l), f = full.includes(+i.value);
        l.classList.toggle('is-full', f); i.disabled = f;
        i.setAttribute('aria-label', `ساعت ${hhmm(+i.value)}${f ? ' · پر شده' : ''}`);
        if (f && i.checked) { i.checked = false; l.classList.remove('is-on'); st.time = null; paintSum(); }
      });
    };
    if (c && Date.now() - c.at < 30e3) { apply(c.full); return; }
    fetch(`${API}/slots?dept=${st.k}&date=${st.day}${st.doc ? '&doctor=' + st.doc : ''}`, { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then((r) => r.json()).then((j) => { if (j && j.ok && Array.isArray(j.full)) { fullCache.set(key, { at: Date.now(), full: j.full }); apply(j.full); } })
      .catch(() => {});
  };
  const paintStep1 = () => {
    $('#bkCtx').innerHTML = ctxHTML();
    $$('.bk-seg label', bk).forEach((l) => { const i = $('input', l); i.checked = i.value === st.type; l.classList.toggle('is-on', i.checked); });
    paintDays(); paintSlots(false);
  };

  /* ---------- مرحله‌ی ۳: مشخصات ---------- */
  const fName = $('#bkName'), fTel = $('#bkTel'), fNote = $('#bkNoteIn');
  const mark = (f, bad) => { f.closest('.field').classList.toggle('is-bad', bad); f.setAttribute('aria-invalid', String(bad)); };
  [fName, fTel].forEach((f) => f.addEventListener('input', () => { mark(f, false); say(''); }));
  const paintStep2 = () => {
    const x = days.find((d) => d.iso === st.day);
    $('#bkCtx2').innerHTML = x ? `<svg class="ic" aria-hidden="true"><use href="#i-calendar"/></svg><b>${dayName(x)} ${dayNum(x)} ${monName(x)} · ساعت ${hhmm(st.time)}</b><span>${DEPT[st.k].t}</span><button type="button" class="bk-link" data-bk-go="1">تغییر</button>` : '';
  };

  /* ---------- مرحله‌ی ۴: کد تأیید ---------- */
  const codeIn = $('#bkCode'), codeBox = $('.bk-code', bk), cells = $$('.bk-code__cells i', bk), timerEl = $('#bkTimer'), timerRow = $('#bkTimerRow'), resendBtn = $('#bkResend'), tbar = $('.bk-timer__bar i', bk);
  const sms = $('#bkSms');
  let tmr = 0, smsT = 0;
  const paintCode = () => {
    const v = digits(codeIn.value).replace(/\D/g, '').slice(0, 5);
    if (codeIn.value !== v) codeIn.value = v;
    cells.forEach((c, i) => {
      const had = c.textContent;
      c.textContent = v[i] ? toFa(v[i]) : '';
      c.classList.toggle('is-fill', !!v[i]);
      c.classList.toggle('is-cur', i === Math.min(v.length, 4));
      if (v[i] && !had && can()) gsap.fromTo(c, { scale: 0.86 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform' });
    });
    return v;
  };
  codeIn.addEventListener('input', () => {
    codeBox.classList.remove('is-bad'); say('');
    const v = paintCode();
    if (v.length === 5) confirmCode();
  });
  codeIn.addEventListener('focus', () => { codeBox.classList.add('is-focus'); paintCode(); });
  codeIn.addEventListener('blur', () => codeBox.classList.remove('is-focus'));
  const tick = () => {
    const el = (Date.now() - st.sentAt) / 1000;
    const left = Math.max(0, Math.ceil(st.ttl - el)), rl = Math.max(0, Math.ceil(st.resend - el));
    timerEl.textContent = toFa(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
    tbar.style.setProperty('--t', (left / st.ttl).toFixed(3));
    timerRow.classList.toggle('is-exp', left === 0);
    resendBtn.disabled = rl > 0 || st.busy;
    resendBtn.textContent = rl > 0 ? `ارسال دوباره (${toFa(rl)} ثانیه)` : 'ارسال دوباره';
    if (left === 0 && rl === 0) clearInterval(tmr);
  };
  const startTimer = () => { clearInterval(tmr); tick(); tmr = setInterval(tick, 1000); };
  const showSms = (code) => {
    $('#bkSmsText').textContent = `کد تأیید نوبت شما: ${toFa(code)}`;
    sms.hidden = false;
    if (can()) gsap.fromTo(sms, { yPercent: -140, opacity: 0, scale: 0.9 }, { yPercent: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.6)' });
    clearTimeout(smsT); smsT = setTimeout(hideSms, 9000);
  };
  const hideSms = () => {
    clearTimeout(smsT);
    if (sms.hidden) return;
    if (!can()) { sms.hidden = true; return; }
    gsap.to(sms, { yPercent: -140, opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => { sms.hidden = true; gsap.set(sms, { clearProps: 'all' }); } });
  };
  sms.addEventListener('click', () => {
    if (!st.demo) return;
    codeIn.value = st.demo; hideSms(); codeIn.focus({ preventScroll: true });
    codeIn.dispatchEvent(new Event('input'));
  });
  const ERR = {
    network: `اتصال به سرور برقرار نشد. اینترنت را بررسی کنید یا با پذیرش تماس بگیرید: ${TEL}`,
    server: `سامانه‌ی نوبت الان جواب نمی‌دهد. لطفاً با پذیرش تماس بگیرید: ${TEL}`,
    sms: `ارسال پیامک ممکن نشد. چند دقیقه‌ی دیگر دوباره امتحان کنید یا با پذیرش تماس بگیرید: ${TEL}`,
    mobile: 'شماره‌ی موبایل را کامل و با ۰۹ بنویسید؛ مثلاً ۰۹۱۲ ۱۲۳ ۴۵۶۷.',
    code: 'کد درست نیست؛ دوباره نگاه کنید.',
    expired: 'اعتبار این کد تمام شده؛ «ارسال دوباره» را بزنید.',
    attempts: 'چند بار کد اشتباه وارد شد؛ یک کد تازه بگیرید.',
    slot: 'این زمان همین حالا پر شد؛ لطفاً ساعت دیگری انتخاب کنید.',
    input: 'بعضی اطلاعات نوبت کامل نیست؛ یک بار دیگر مرحله‌ها را نگاه کنید.',
    many: `برای این شماره چند نوبت باز ثبت شده؛ برای نوبت بیشتر با پذیرش تماس بگیرید: ${TEL}`
  };
  const errText = (r) => {
    if (r.error === 'rate') return `برای این شماره تازه کد فرستاده شده؛ ${r.wait ? toFa(r.wait) + ' ثانیه‌ی دیگر' : 'کمی بعد'} دوباره امتحان کنید.`;
    if (r.error === 'code' && r.left) return `کد درست نیست؛ ${toFa(r.left)} بار دیگر می‌توانید امتحان کنید.`;
    return ERR[r.error] || ERR.server;
  };
  async function sendCode() {
    if (await probe()) {
      const r = await post('/otp/send', { mobile: st.tel });
      if (!r.ok) { say(errText(r)); return false; }
      st.ttl = r.ttl || 120; st.resend = r.resend || 60; st.demo = null;
    } else {
      st.demo = String(Math.floor(10000 + Math.random() * 90000));
      st.ttl = 120; st.resend = 60;
      /* ارسال دوباره (مرحله‌ی کد)؛ بار اول ورود به مرحله‌ی کد خودش پیامک را نشان می‌دهد */
      if (st.step === 3) setTimeout(() => { if (isOpen && st.step === 3 && st.demo) showSms(st.demo); }, 1300);
    }
    st.sentAt = Date.now();
    return true;
  }
  resendBtn.addEventListener('click', async () => {
    if (resendBtn.disabled) return;
    st.busy = true; resendBtn.disabled = true; say('');
    const ok = await sendCode();
    st.busy = false;
    if (ok) { codeIn.value = ''; paintCode(); startTimer(); codeIn.focus({ preventScroll: true }); }
    else tick();
  });
  async function confirmCode() {
    if (st.busy) return;
    const code = paintCode();
    if (code.length !== 5) { say('کد ۵ رقمی را کامل وارد کنید.'); shake(codeBox); codeIn.focus({ preventScroll: true }); return; }
    if (Date.now() - st.sentAt > st.ttl * 1000) { say(ERR.expired); shake(codeBox); return; }
    st.busy = true; nextBtn.classList.add('is-busy');
    let r;
    if (live) {
      r = await post('/booking', { mobile: st.tel, code, name: st.name, note: st.note, dept: st.k, doctor: st.doc, type: st.type, date: st.day, time: st.time });
    } else {
      await new Promise((res) => setTimeout(res, 650));
      r = code === st.demo ? { ok: true, ref: 'SS-' + String(Date.now()).slice(-5) } : { ok: false, error: 'code' };
    }
    st.busy = false; nextBtn.classList.remove('is-busy');
    if (!r.ok) {
      codeBox.classList.add('is-bad'); shake(codeBox); say(errText(r));
      if (r.error === 'slot') { fullCache.clear(); st.time = null; setTimeout(() => { go(1, -1); say(ERR.slot); }, 900); return; }
      codeIn.select();
      return;
    }
    codeBox.classList.add('is-ok');
    st.ref = r.ref; st.smsOk = !!r.sms; st.demo = null; clearInterval(tmr); hideSms();
    setTimeout(() => go(4, 1), can() ? 380 : 0);
  }

  /* ---------- مرحله‌ی ۵: ثبت شد ---------- */
  const paintDone = () => {
    const x = days.find((d) => d.iso === st.day), d = docOf(st.doc);
    const when = x ? `${dayName(x)} ${dayNum(x)} ${monName(x)}` : '';
    $('#bkDoneP').textContent = st.smsOk
      ? `پیامک تأیید برای ${prettyTel(st.tel)} فرستاده می‌شود. اگر برنامه‌تان عوض شد، با پذیرش تماس بگیرید: ${TEL}`
      : `پذیرش برای قطعی کردن زمان با ${prettyTel(st.tel)} تماس می‌گیرد. اگر برنامه‌تان عوض شد، با پذیرش تماس بگیرید: ${TEL}`;
    const rows = [['بخش', DEPT[st.k].t], ['پزشک', d ? d.name : 'اولین پزشک آزاد'], ['روز', when], ['ساعت', hhmm(st.time)], ['نوع مراجعه', st.type], ['به نام', st.name]];
    $('#bkTicket').innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join('') + `<div class="is-wide is-ref"><dt>کد پیگیری</dt><dd>${esc(st.ref)}</dd></div>`;
  };
  const playDone = () => {
    if (!can()) return;
    const mark = $('.bk-done__mark', bk), c = $('circle', mark), p = $('path', mark), rings = $$('.bk-done__mark > i', bk);
    const len = p.getTotalLength ? p.getTotalLength() : 40;
    gsap.fromTo(c, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.7, ease: 'back.out(2.2)' });
    gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out', delay: 0.3 });
    rings.forEach((r, i) => gsap.fromTo(r, { scale: 0.7, opacity: 0.55 }, { scale: 1.9, opacity: 0, duration: 1.3, ease: 'expo.out', delay: 0.35 + i * 0.18 }));
    gsap.fromTo($$('.bk-done__t, .bk-done__p, .bk-ticket > div, .bk-done__acts', bk), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, delay: 0.35, ease: 'expo.out', clearProps: 'transform,opacity' });
  };
  $('.bk-ics', bk).addEventListener('click', () => {
    if (!st.day || st.time == null) return;
    const [y, mo, d] = st.day.split('-').map(Number);
    const start = new Date(Date.UTC(y, mo - 1, d, 0, st.time) - 210 * 60000); /* تهران: ساعت جهانی + ۳:۳۰ */
    const end = new Date(start.getTime() + 30 * 60000);
    const f = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const doc = docOf(st.doc);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sasan Clinic//Booking//FA', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${st.ref}@sasan-clinic`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
      `SUMMARY:نوبت ${DEPT[st.k].t}${doc ? ' · ' + doc.name : ''} · کلینیک ساسان`,
      'LOCATION:سلمان‌شهر\\, روبه‌روی شهرداری\\, بالای داروخانه‌ی شبانه‌روزی\\, طبقه‌ی اول',
      `DESCRIPTION:کد پیگیری ${st.ref} · تلفن پذیرش 011-5461-1560`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:نوبت کلینیک ساسان', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'sasan-nobat.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  /* ---------- پیام خطا، لرزش، خلاصه ---------- */
  const say = (t) => { if (msg.textContent !== t) msg.textContent = t; };
  const shake = (el) => { if (el && can()) gsap.fromTo(el, { x: 0 }, { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: 0.45, ease: 'power1.out', clearProps: 'transform' }); };
  const paintSum = () => {
    const parts = [];
    if (st.k) parts.push(DEPT[st.k].t);
    const d = docOf(st.doc); if (d) parts.push(d.name.replace(/^دکتر\s+/, 'دکتر '));
    const x = days.find((y) => y.iso === st.day);
    if (st.step >= 1 && x) parts.push(`${dayName(x)} ${dayNum(x)}`);
    if (st.step >= 1 && st.time != null) parts.push(hhmm(st.time));
    const html = parts.map((p) => `<span>${esc(p)}</span>`).join('');
    if (sumEl.innerHTML !== html) {
      sumEl.innerHTML = html;
      const last = sumEl.lastElementChild;
      if (last && can()) gsap.fromTo(last, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'expo.out', clearProps: 'transform,opacity' });
    }
  };

  /* ---------- رفتن بین مرحله‌ها ---------- */
  const partsOf = (s) => [...s.children].filter((c) => !c.hidden);
  function paintChrome(n) {
    tone();
    subEl.textContent = TITLES[n];
    backBtn.hidden = n === 0 || n === 4;
    progLis.forEach((li, i) => { li.classList.toggle('is-on', i === Math.min(n, 3)); li.classList.toggle('is-done', i < n); });
    bar.style.setProperty('--p', Math.min(1, (n + 1) / 4).toFixed(3));
    foot.hidden = n === 4;
    $('span', nextBtn).textContent = NEXT[n] || '';
  }
  function enter(n) {
    if (n === 0) { paintDepts(); paintDocs(false); }
    if (n === 1) paintStep1();
    if (n === 2) { paintStep2(); fName.value = st.name; fTel.value = st.tel ? toFa(`${st.tel.slice(0, 4)} ${st.tel.slice(4, 7)} ${st.tel.slice(7)}`) : fTel.value; fNote.value = st.note; }
    if (n === 3) { $('#bkTelShow').textContent = toFa(`${st.tel.slice(0, 4)} ${st.tel.slice(4, 7)} ${st.tel.slice(7)}`); codeIn.value = ''; codeBox.classList.remove('is-bad', 'is-ok'); paintCode(); startTimer(); if (st.demo && sms.hidden) setTimeout(() => { if (isOpen && st.step === 3 && st.demo) showSms(st.demo); }, 700); }
    if (n === 4) paintDone();
  }
  function focusStep(n) {
    const s = steps[n];
    const f = n === 3 ? codeIn : n === 2 ? (st.name ? fTel : fName) : n === 4 ? $('.bk-done__t', s) : ($('input:checked:not(:disabled)', s) || $('input:not(:disabled)', s));
    if (f) f.focus({ preventScroll: true });
  }
  function go(n, dir = 1) {
    if (n === st.step && !steps[n].hidden) return;
    const from = steps[st.step], to = steps[n];
    say('');
    if (st.step === 3 && n !== 4) { clearInterval(tmr); hideSms(); }
    st.step = n;
    enter(n); paintChrome(n); paintSum();
    const swap = () => { steps.forEach((s) => { s.hidden = s !== to; }); view.scrollTop = 0; if (n === 1) centerDay(); };
    if (!can() || from === to) { swap(); focusStep(n); if (n === 4) playDone(); return; }
    /* راست‌به‌چپ: مرحله‌ی بعد از چپ می‌آید و مرحله‌ی فعلی به راست می‌رود */
    gsap.killTweensOf([from, to, ...partsOf(to)]);
    gsap.to(from, { x: 36 * dir, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: () => {
      gsap.set(from, { clearProps: 'transform,opacity' });
      swap();
      if (n === 4) { playDone(); focusStep(n); return; }
      gsap.fromTo(partsOf(to), { x: -40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65, stagger: 0.05, ease: 'expo.out', clearProps: 'transform,opacity' });
      focusStep(n);
    } });
  }
  async function next() {
    if (st.busy) return;
    if (st.step === 0) {
      if (!st.k) { say('یکی از سه بخش را انتخاب کنید.'); shake($('.bk-depts', bk)); return; }
      go(1, 1);
    } else if (st.step === 1) {
      if (!st.day) { say('یک روز کاری را انتخاب کنید.'); shake(daysRow); return; }
      if (st.time == null) { say('ساعت مراجعه را انتخاب کنید.'); shake(slotsBox); const f = $('.bk-slot input', slotsBox); if (f) f.focus({ preventScroll: false }); return; }
      go(2, 1);
    } else if (st.step === 2) {
      const n = fName.value.trim().replace(/\s+/g, ' '), t = normTel(fTel.value);
      const badName = n.length < 2, badTel = !/^09\d{9}$/.test(t);
      mark(fName, badName); mark(fTel, badTel);
      if (badName || badTel) {
        say(badName ? 'نام و نام خانوادگی را بنویسید.' : ERR.mobile);
        shake((badName ? fName : fTel).closest('.field')); (badName ? fName : fTel).focus();
        return;
      }
      /* همان شماره و کدی که هنوز اعتبار دارد: دوباره پیامک نمی‌شود */
      const reuse = t === st.tel && st.sentAt && Date.now() - st.sentAt < (st.ttl - 15) * 1000;
      st.name = n; st.tel = t; st.note = fNote.value.trim().slice(0, 300);
      if (reuse) { go(3, 1); return; }
      st.busy = true; nextBtn.classList.add('is-busy');
      const ok = await sendCode();
      st.busy = false; nextBtn.classList.remove('is-busy');
      if (ok) go(3, 1);
    } else if (st.step === 3) confirmCode();
  }
  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', () => { if (st.step > 0 && st.step < 4) go(st.step - 1, -1); });
  bk.addEventListener('click', (e) => {
    const g = e.target.closest('[data-bk-go]');
    if (g) { go(+g.dataset.bkGo, -1); return; }
    if (e.target.closest('[data-bk-edit]')) { go(2, -1); setTimeout(() => fTel.select(), 50); return; }
    if (e.target.closest('[data-bk-close]')) close();
  });
  /* Enter در فیلدها یعنی «ادامه» */
  bk.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('#bkName, #bkTel')) { e.preventDefault(); next(); }
  });

  /* ---------- باز و بسته شدن کپسول ---------- */
  let isOpen = false, opener = null, tl = null, pushed = false;
  const R = () => parseFloat(getComputedStyle(panel).getPropertyValue('--R')) || 22;
  /* شکل کپسول روی برگه: وسط (دسکتاپ) یا پایین (موبایل) */
  const geo = () => {
    const W = panel.offsetWidth, H = panel.offsetHeight, mob = window.matchMedia('(max-width: 640px)').matches;
    const pw = Math.min(pill.offsetWidth + 8, W - 24), ph = 56;
    const top = mob ? H - ph - 10 : (H - ph) / 2, bottom = H - top - ph, side = (W - pw) / 2;
    return { pill: { t: top, r: side, b: bottom, l: side, rad: ph / 2 }, wide: { t: top, r: 0, b: bottom, l: 0, rad: ph / 2 }, full: { t: 0, r: 0, b: 0, l: 0, rad: R() }, cy: top + ph / 2, mob };
  };
  /* مرورگر رشته‌ی clip-path را کوتاه می‌کند و GSAP دیگر نمی‌تواند بینشان میان‌یابی کند؛ پس خود عددها حرکت می‌کنند */
  const cp = { t: 0, r: 0, b: 0, l: 0, rad: 22 };
  const drawClip = () => { panel.style.clipPath = `inset(${cp.t.toFixed(1)}px ${cp.r.toFixed(1)}px ${cp.b.toFixed(1)}px ${cp.l.toFixed(1)}px round ${cp.rad.toFixed(1)}px)`; };
  const clip = (to, o) => Object.assign({}, to, o, { onUpdate: drawClip });
  const focusables = () => $$('button:not([disabled]):not([hidden]), input:not([disabled]), textarea, [href], [tabindex]:not([tabindex="-1"])', panel).filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  });

  /* پیش‌پر کردن از دکمه‌ای که کپسول را باز کرد */
  function apply(o) {
    if (st.step === 4) Object.assign(st, { step: 0, k: null, doc: '', day: null, time: null, ref: null, pref: null });
    if (o.k && DEPT[o.k]) {
      if (st.k !== o.k || (o.doc && o.doc !== st.doc)) { st.day = null; st.time = null; }
      st.k = o.k;
      st.doc = o.doc && docOf(o.doc) ? o.doc : (o.doc === undefined ? st.doc : '');
      if (st.doc && docOf(st.doc).k !== st.k) st.doc = '';
      if (o.type) st.type = o.type;
      st.pref = o.pref || null;
      st.step = 1;
    } else if (st.step === 3) st.step = 2;
    steps.forEach((s, i) => { s.hidden = i !== st.step; });
    enter(st.step); paintChrome(st.step); paintSum();
  }

  function open(o = {}) {
    if (isOpen) { apply(o); focusStep(st.step); return; }
    isOpen = true;
    opener = o.from || document.activeElement;
    probe();
    apply(o);
    bk.hidden = false;
    root.classList.add('bk-open');
    lockScroll(true); Motion.pause();
    try { history.pushState({ bk: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    Aurora.hold(36e5);
    if (st.step === 1) requestAnimationFrame(centerDay);
    if (tl) tl.kill();
    if (!can()) {
      if (typeof panel.animate === 'function' && !root.classList.contains('rm')) panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      focusStep(st.step);
      return;
    }
    const g = geo();
    const parts = [$('.bk__top', bk), $('.bk__prog', bk), ...partsOf(steps[st.step]), foot].filter((x) => x && !x.hidden);
    Object.assign(cp, g.pill); drawClip();
    gsap.set(panel, { transformOrigin: `50% ${g.cy}px` });
    gsap.set(skin, { opacity: 1 }); gsap.set(pill, { opacity: 1, scale: 1 });
    gsap.set(parts, { opacity: 0 });
    tl = gsap.timeline({ onComplete: () => { gsap.set(panel, { clearProps: 'clipPath,transform,opacity,transformOrigin' }); tl = null; } })
      .fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0)
      .fromTo(panel, { scale: 0.55 }, { scale: 1, duration: 0.6, ease: 'back.out(2.2)' }, 0)
      .fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0)
      .fromTo($('.bk__pill-ic', bk), { rotation: -90, scale: 0.4 }, { rotation: 0, scale: 1, duration: 0.6, ease: 'back.out(2.5)' }, 0.05)
      .to(cp, clip(g.wide, { duration: 0.46, ease: 'expo.inOut' }), 0.24)
      .to(pill, { opacity: 0, scale: 0.92, duration: 0.2, ease: 'power1.in' }, 0.56)
      .to(cp, clip(g.full, { duration: 0.64, ease: 'expo.inOut' }), 0.56)
      .to(skin, { opacity: 0, duration: 0.4, ease: 'power1.inOut' }, 0.78)
      .fromTo(parts, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'expo.out', clearProps: 'transform,opacity' }, 0.86);
    setTimeout(() => { if (isOpen) focusStep(st.step); }, 900);
  }

  function close(fromPop) {
    if (!isOpen) return;
    isOpen = false;
    clearInterval(tmr); hideSms();
    if (pushed && !fromPop) { pushed = false; try { history.back(); } catch (e) { /* محیط محدود */ } }
    pushed = false;
    const done = () => {
      bk.hidden = true;
      root.classList.remove('bk-open');
      gsap && gsap.set([panel, skin, pill, scrim], { clearProps: 'all' });
      lockScroll(false); Motion.resume(); Aurora.release();
      if (st.step === 4) Object.assign(st, { step: 0, k: null, doc: '', day: null, time: null, ref: null, pref: null });
      if (opener && document.contains(opener) && opener.getClientRects().length) opener.focus({ preventScroll: true });
      tl = null;
    };
    if (tl) tl.kill();
    if (!can()) { done(); return; }
    const g = geo();
    const parts = [$('.bk__top', bk), $('.bk__prog', bk), ...partsOf(steps[st.step]), foot].filter((x) => x && !x.hidden);
    gsap.set(panel, { transformOrigin: `50% ${g.cy}px` });
    Object.assign(cp, g.full); drawClip();
    tl = gsap.timeline({ onComplete: () => { gsap.set(parts, { clearProps: 'transform,opacity' }); done(); } })
      .to(parts, { opacity: 0, y: 8, duration: 0.16, ease: 'power1.in' }, 0)
      .to(cp, clip(g.wide, { duration: 0.42, ease: 'expo.inOut' }), 0.06)
      .to(skin, { opacity: 1, duration: 0.25, ease: 'power1.out' }, 0.08)
      .fromTo(pill, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.2 }, 0.34)
      .to(cp, clip(g.pill, { duration: 0.3, ease: 'expo.inOut' }), 0.4)
      .to(panel, { scale: 0.6, opacity: 0, duration: 0.26, ease: 'power2.in' }, 0.62)
      .to(scrim, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0.5);
  }
  window.addEventListener('popstate', () => { if (isOpen) { pushed = false; close(true); } });

  /* ---------- همه‌ی دکمه‌های نوبت ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('a[href="#book"], [data-book]');
    if (!t || e.defaultPrevented || t.closest('#bk') || t.hasAttribute('data-ar-book')) return;
    e.preventDefault();
    const box = t.closest('#svc, #sheet');
    const k = t.dataset.book || (box && box.id === 'svc' ? box.dataset.k : null) || null;
    const o = { k, doc: t.hasAttribute('data-doc') ? t.dataset.doc : undefined, type: t.dataset.type, pref: t.dataset.pref, from: box ? null : t };
    if (box) setTimeout(() => open(o), box.id === 'svc' ? 320 : 180);
    else open(o);
  }, true);

  S.Book = { open, close, isOpen: () => isOpen, timeline: () => tl };
})();
