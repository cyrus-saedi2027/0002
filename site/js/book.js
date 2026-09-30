/* ==========================================================================
   book.js: کپسول درخواست نوبت
   با هر دکمه‌ی «نوبت بگیرید» یک کپسول کوچک وسط صفحه (روی موبایل پایین صفحه) ظاهر می‌شود،
   اول پهن و بعد بلند می‌شود و به برگه‌ی درخواست تبدیل می‌شود: بخش ← مشخصات ← کد تأیید ← ثبت.
   بیمار روز، ساعت و پزشک را انتخاب نمی‌کند؛ پذیرش بین ۳۰ دقیقه تا ۴ ساعت بعد تماس می‌گیرد و هماهنگ می‌کند.
   ارسال کد و ثبت درخواست با سرور کلینیک (پوشه‌ی server/) انجام می‌شود. اگر سرور در دسترس نباشد
   (مثل پیش‌نمایش ایستا)، همان مسیر بدون ارسال پیامک اجرا می‌شود و یک خط توضیح روشن زیر کد می‌آید
   (هیچ پیامک ساختگی روی صفحه نشان داده نمی‌شود).
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
  const view = $('.bk__view', bk), steps = $$('.bk__step', bk), prog = $('.bk__prog', bk), progLis = $$('.bk__prog li', bk);
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

  /* ---------- بخش‌ها ---------- */
  const DEPT = {
    dental: { t: 'دندانپزشکی', ic: 'i-tooth' },
    beauty: { t: 'زیبایی و لیزر', ic: 'i-sparkles' },
    medicine: { t: 'پزشک عمومی', ic: 'i-steth' }
  };
  /* پذیرش در این بازه تماس می‌گیرد و روز، ساعت و پزشک را با بیمار هماهنگ می‌کند */
  const CALL = 'بین ۳۰ دقیقه تا ۴ ساعت بعد';

  /* ---------- وضعیت ---------- */
  const fresh = () => ({ step: 0, k: null, type: 'ویزیت اول', name: '', tel: '', note: '', sentAt: 0, ttl: 120, resend: 120, demo: false, ref: null, smsOk: false, busy: false });
  const st = fresh();
  const reset = () => { const keep = { name: st.name, tel: st.tel }; Object.assign(st, fresh(), keep); };
  const TITLES = ['بخش را انتخاب کنید', 'نام و شماره‌ی موبایل', 'کد تأیید را وارد کنید', 'درخواست شما ثبت شد'];
  const NEXT = ['ادامه', 'دریافت کد تأیید', 'تأیید و ثبت درخواست'];
  const LAST = 3;

  /* ---------- مرحله‌ی ۱: بخش ---------- */
  const deptLabels = $$('.bk-dept', bk);
  const availText = (k) => {
    if (k === 'medicine') return 'شبانه‌روزی؛ همین حالا هم پذیرش دارد';
    if (k === 'beauty') return 'همه‌روزه با هماهنگی قبلی';
    const d = Clinic.dental();
    return d.open ? `امروز باز است · ${d.text}` : `نزدیک‌ترین زمان: ${d.when}`;
  };
  const tone = () => { if (st.k) bk.dataset.k = st.k; else bk.removeAttribute('data-k'); };
  const paintDepts = () => {
    deptLabels.forEach((l) => {
      const k = l.dataset.k, on = k === st.k;
      l.classList.toggle('is-on', on);
      $('input', l).checked = on;
      $('small', l).textContent = availText(k);
    });
    tone();
  };
  const pop = (el) => { if (el && can()) gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: 0.6, ease: 'back.out(3)', clearProps: 'transform' }); };
  bk.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'bkDept') {
      st.k = t.value;
      paintDepts(); paintSum(); say('');
      pop(t.closest('.bk-dept'));
    } else if (t.name === 'bkType') {
      st.type = t.value;
      $$('.bk-seg label', bk).forEach((l) => l.classList.toggle('is-on', $('input', l).checked));
      paintSum();
    }
  });
  /* با دوبار زدن روی یک بخش (یا Enter) مستقیم به مرحله‌ی بعد */
  deptLabels.forEach((l) => l.addEventListener('dblclick', () => { if (st.step === 0 && st.k) next(); }));

  /* ---------- مرحله‌ی ۲: نوع مراجعه و مشخصات ---------- */
  const fName = $('#bkName'), fTel = $('#bkTel'), fNote = $('#bkNoteIn');
  const mark = (f, bad) => { f.closest('.field').classList.toggle('is-bad', bad); f.setAttribute('aria-invalid', String(bad)); };
  [fName, fTel].forEach((f) => f.addEventListener('input', () => { mark(f, false); say(''); }));
  const faTel = (t) => toFa(`${t.slice(0, 4)} ${t.slice(4, 7)} ${t.slice(7)}`);
  const paintStep1 = () => {
    $('#bkCtx').innerHTML = st.k ? `<svg class="ic" aria-hidden="true"><use href="#${DEPT[st.k].ic}"/></svg><b>${DEPT[st.k].t}</b><span>روز و ساعت را پذیرش هماهنگ می‌کند</span><button type="button" class="bk-link" data-bk-go="0">تغییر</button>` : '';
    $$('.bk-seg label', bk).forEach((l) => { const i = $('input', l); i.checked = i.value === st.type; l.classList.toggle('is-on', i.checked); });
    fName.value = st.name;
    if (st.tel) fTel.value = faTel(st.tel);
    fNote.value = st.note;
  };

  /* ---------- مرحله‌ی ۳: کد تأیید ---------- */
  const codeIn = $('#bkCode'), codeBox = $('.bk-code', bk), cells = $$('.bk-code__cells i', bk), timerRow = $('#bkTimerRow'), timerTxt = $('#bkTimerTxt'), resendBtn = $('#bkResend'), tbar = $('.bk-timer__bar i', bk), demoNote = $('#bkDemo');
  let tmr = 0;
  /* کد ۵ رقمی از هر چیزی که در کادر آمد: تایپ، پرکردن خودکار گوشی یا چسباندن کل متن پیامک */
  const pickCode = (s) => {
    const d = digits(s), all = d.replace(/\D/g, '');
    if (all.length <= 5) return all;
    const runs = d.match(/\d+/g).filter((x) => x.length === 5);
    return runs.length ? runs[runs.length - 1] : all.slice(0, 5);
  };
  const paintCode = () => {
    const v = pickCode(codeIn.value);
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
  /* یک شمارش معکوس: کد ۲ دقیقه معتبر است و ارسال دوباره هم درست وقتی باز می‌شود که همین زمان تمام شود */
  const tick = () => {
    const el = (Date.now() - st.sentAt) / 1000;
    const left = Math.max(0, Math.ceil(st.ttl - el)), rl = Math.max(0, Math.ceil(st.resend - el));
    const txt = left > 0 ? `اعتبار کد: <b>${toFa(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`)}</b>` : 'زمان این کد تمام شد؛ کد تازه بگیرید.';
    if (timerTxt.innerHTML !== txt) timerTxt.innerHTML = txt;
    tbar.style.setProperty('--t', (left / st.ttl).toFixed(3));
    timerRow.classList.toggle('is-exp', left === 0);
    resendBtn.disabled = rl > 0 || st.busy;
    if (left === 0 && rl === 0) clearInterval(tmr);
  };
  const startTimer = () => { clearInterval(tmr); tick(); tmr = setInterval(tick, 1000); };
  const ERR = {
    network: `اتصال به سرور برقرار نشد. اینترنت را بررسی کنید یا با پذیرش تماس بگیرید: ${TEL}`,
    server: `سامانه‌ی نوبت الان جواب نمی‌دهد. لطفاً با پذیرش تماس بگیرید: ${TEL}`,
    sms: `ارسال پیامک ممکن نشد. چند دقیقه‌ی دیگر دوباره امتحان کنید یا با پذیرش تماس بگیرید: ${TEL}`,
    mobile: 'شماره‌ی موبایل را کامل و با ۰۹ بنویسید؛ مثلاً ۰۹۱۲ ۱۲۳ ۴۵۶۷.',
    code: 'کد درست نیست؛ دوباره نگاه کنید.',
    expired: 'اعتبار این کد تمام شده؛ «ارسال دوباره» را بزنید.',
    attempts: 'چند بار کد اشتباه وارد شد؛ یک کد تازه بگیرید.',
    input: 'بعضی اطلاعات درخواست کامل نیست؛ یک بار دیگر مرحله‌ها را نگاه کنید.',
    many: `برای این شماره درخواستی ثبت شده که هنوز پیگیری نشده؛ پذیرش به‌زودی تماس می‌گیرد. اگر عجله دارید: ${TEL}`
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
      st.ttl = r.ttl || 120; st.resend = r.resend || st.ttl; st.demo = false;
    } else {
      /* بدون سرور: پیامکی فرستاده نمی‌شود و هر کد ۵ رقمی مسیر را ادامه می‌دهد (خط توضیح زیر کد) */
      st.demo = true; st.ttl = 120; st.resend = 120;
    }
    demoNote.hidden = !st.demo;
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
      r = await post('/booking', { mobile: st.tel, code, name: st.name, note: st.note, dept: st.k, type: st.type });
    } else {
      await new Promise((res) => setTimeout(res, 650));
      r = { ok: true, ref: 'SS-' + String(Date.now()).slice(-5) };
    }
    st.busy = false; nextBtn.classList.remove('is-busy');
    if (!r.ok) { codeBox.classList.add('is-bad'); shake(codeBox); say(errText(r)); codeIn.select(); return; }
    codeBox.classList.add('is-ok');
    st.ref = r.ref; st.smsOk = !!r.sms; st.again = !!r.again; clearInterval(tmr);
    setTimeout(() => go(LAST, 1), can() ? 380 : 0);
  }

  /* ---------- مرحله‌ی آخر: ثبت شد ---------- */
  const paintDone = () => {
    $('#bkDoneP').textContent = `${st.again ? 'درخواست قبلی‌تان برای همین بخش هنوز باز بود؛ همان با اطلاعات تازه به‌روز شد. ' : ''}پذیرش ${CALL} با شماره‌ی ${prettyTel(st.tel)} تماس می‌گیرد و روز، ساعت و پزشک را با خودتان هماهنگ می‌کند.${st.smsOk ? ' پیامک ثبت درخواست هم برایتان فرستاده شد.' : ''} اگر عجله دارید، با پذیرش تماس بگیرید: ${TEL}`;
    const rows = [['بخش', DEPT[st.k].t], ['نوع مراجعه', st.type], ['به نام', st.name], ['شماره', ltr(faTel(st.tel))]];
    $('#bkTicket').innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join('') + `<div class="is-wide is-ref"><dt>کد پیگیری</dt><dd>${esc(st.ref)}</dd></div>`;
  };
  const playDone = () => {
    if (!can()) return;
    const markEl = $('.bk-done__mark', bk), c = $('circle', markEl), p = $('path', markEl), rings = $$('.bk-done__mark > i', bk);
    const len = p.getTotalLength ? p.getTotalLength() : 40;
    gsap.fromTo(c, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.7, ease: 'back.out(2.2)' });
    gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out', delay: 0.3 });
    rings.forEach((r, i) => gsap.fromTo(r, { scale: 0.7, opacity: 0.55 }, { scale: 1.9, opacity: 0, duration: 1.3, ease: 'expo.out', delay: 0.35 + i * 0.18 }));
    gsap.fromTo($$('.bk-done__t, .bk-done__p, .bk-call, .bk-ticket > div, .bk-done__acts', bk), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, delay: 0.35, ease: 'expo.out', clearProps: 'transform,opacity' });
    /* گوشی پذیرش چند بار زنگ می‌خورد (تعداد محدود؛ حلقه‌ی بی‌پایان نداریم) */
    const call = $('.bk-call', bk);
    call.classList.remove('is-ring'); void call.offsetWidth; call.classList.add('is-ring');
  };

  /* ---------- پیام خطا، لرزش، خلاصه ---------- */
  const say = (t) => { if (msg.textContent !== t) msg.textContent = t; };
  const shake = (el) => { if (el && can()) gsap.fromTo(el, { x: 0 }, { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: 0.45, ease: 'power1.out', clearProps: 'transform' }); };
  const paintSum = () => {
    const parts = [];
    if (st.k) parts.push(DEPT[st.k].t);
    if (st.step >= 1) parts.push(st.type);
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
    backBtn.hidden = n === 0 || n === LAST;
    /* مرحله‌ی آخر (ثبت شد) خودش هم «انجام‌شده» است */
    const prev = progLis.filter((li) => li.classList.contains('is-on') || li.classList.contains('is-done')).length;
    prog.classList.toggle('is-seq', n + 1 - prev > 1);
    progLis.forEach((li, i) => { li.classList.toggle('is-on', i === n && n !== LAST); li.classList.toggle('is-done', i < n || n === LAST); });
    foot.hidden = n === LAST;
    $('span', nextBtn).textContent = NEXT[n] || '';
  }
  function enter(n) {
    if (n === 0) paintDepts();
    if (n === 1) paintStep1();
    if (n === 2) { $('#bkTelShow').textContent = faTel(st.tel); $('.bk-otp__t', bk).firstChild.textContent = st.demo ? 'کد ۵ رقمی برای ' : 'کد ۵ رقمی به '; $('.bk-otp__t', bk).lastChild.textContent = st.demo ? ' (پیش‌نمایش؛ پیامک فرستاده نمی‌شود)' : ' پیامک شد.'; codeIn.value = ''; codeBox.classList.remove('is-bad', 'is-ok'); paintCode(); startTimer(); }
    if (n === LAST) paintDone();
  }
  function focusStep(n) {
    const s = steps[n];
    const f = n === 2 ? codeIn : n === 1 ? (st.name ? fTel : fName) : n === LAST ? $('.bk-done__t', s) : ($('input:checked:not(:disabled)', s) || $('input:not(:disabled)', s));
    if (f) f.focus({ preventScroll: true });
  }
  function go(n, dir = 1) {
    if (n === st.step && !steps[n].hidden) return;
    const from = steps[st.step], to = steps[n];
    say('');
    if (st.step === 2 && n !== LAST) clearInterval(tmr);
    st.step = n;
    enter(n); paintChrome(n); paintSum();
    const swap = () => { steps.forEach((s) => { s.hidden = s !== to; }); view.scrollTop = 0; };
    if (!can() || from === to) { swap(); focusStep(n); if (n === LAST) playDone(); return; }
    /* راست‌به‌چپ: مرحله‌ی بعد از چپ می‌آید و مرحله‌ی فعلی به راست می‌رود */
    gsap.killTweensOf([from, to, ...partsOf(to)]);
    gsap.to(from, { x: 36 * dir, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: () => {
      gsap.set(from, { clearProps: 'transform,opacity' });
      swap();
      if (n === LAST) { playDone(); focusStep(n); return; }
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
      if (reuse) { go(2, 1); return; }
      st.busy = true; nextBtn.classList.add('is-busy');
      const ok = await sendCode();
      st.busy = false; nextBtn.classList.remove('is-busy');
      if (ok) go(2, 1);
    } else if (st.step === 2) confirmCode();
  }
  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', () => { if (st.step > 0 && st.step < LAST) go(st.step - 1, -1); });
  bk.addEventListener('click', (e) => {
    const g = e.target.closest('[data-bk-go]');
    if (g) { go(+g.dataset.bkGo, -1); return; }
    if (e.target.closest('[data-bk-edit]')) { go(1, -1); setTimeout(() => fTel.select(), 50); return; }
    if (e.target.closest('[data-bk-close]')) close();
  });
  /* Enter روی بخش یا در فیلدها یعنی «ادامه» */
  bk.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('#bkName, #bkTel, [name="bkDept"]')) { e.preventDefault(); next(); }
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
  /* فقط عنصرهای HTML قابل فوکوس (نه <use href> آیکون‌های SVG)؛ از هر گروه رادیو فقط یکی در ترتیب Tab است */
  const focusables = () => $$('button:not([disabled]):not([hidden]), input:not([disabled]), textarea, a[href], [tabindex]:not([tabindex="-1"])', panel)
    .filter((el) => el.offsetParent !== null && !el.closest('[hidden]') && !(el.type === 'radio' && !el.checked && $(`input[name="${el.name}"]:checked`, panel)));
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

  /* پیش‌پر کردن از دکمه‌ای که کپسول را باز کرد (بخش و نوع مراجعه؛ روز، ساعت و پزشک را پذیرش هماهنگ می‌کند) */
  function apply(o) {
    if (st.step === LAST) reset();
    if (o.k && DEPT[o.k]) {
      st.k = o.k;
      if (o.type) st.type = o.type;
      if (st.step === 0) st.step = 1;
    }
    if (st.step === 2) st.step = 1;
    /* شماره‌ای که در فرم سریع هیرو نوشته شده */
    if (o.tel && /^09\d{9}$/.test(o.tel)) st.tel = o.tel;
    steps.forEach((s, i) => { s.hidden = i !== st.step; });
    enter(st.step); paintChrome(st.step); paintSum();
  }

  function open(o = {}) {
    if (isOpen) { apply(o); focusStep(st.step); return; }
    isOpen = true;
    opener = o.from || document.activeElement;
    probe();
    /* نوار مرحله‌ها از صفر شروع می‌شود و بعد از باز شدن کپسول، تکه‌به‌تکه پر می‌شود */
    progLis.forEach((li) => li.classList.remove('is-on', 'is-done'));
    prog.classList.add('is-enter'); clearTimeout(prog._t); prog._t = setTimeout(() => prog.classList.remove('is-enter'), 1600);
    apply(o);
    bk.hidden = false;
    root.classList.add('bk-open');
    lockScroll(true); Motion.pause();
    try { history.pushState({ bk: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    Aurora.hold(36e5);
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
    clearInterval(tmr);
    if (pushed && !fromPop) { pushed = false; try { history.back(); } catch (e) { /* محیط محدود */ } }
    pushed = false;
    const done = () => {
      bk.hidden = true;
      root.classList.remove('bk-open');
      gsap && gsap.set([panel, skin, pill, scrim], { clearProps: 'all' });
      lockScroll(false); Motion.resume(); Aurora.release();
      if (st.step === LAST) reset();
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
    const o = { k, type: t.dataset.type, from: box ? null : t };
    if (box) setTimeout(() => open(o), box.id === 'svc' ? 320 : 180);
    else open(o);
  }, true);

  S.Book = { open, close, isOpen: () => isOpen, timeline: () => tl };
})();
