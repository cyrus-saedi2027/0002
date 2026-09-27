/* ==========================================================================
   home.js: ورود هیرو، تبدیل هیرو به «درباره‌ی ما» (مدل ۲۱)،
   سه بخش اصلی (مدل ۴۰)، نوبت آنلاین، نمای هر بخش
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, toFa, Motion, Clinic, Aurora } = S;
  const root = document.documentElement;
  /* ۰ تا ۱ با شروع و پایان نرم */
  const ease01 = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const isMob = () => window.matchMedia('(max-width: 699.98px)').matches;
  if (window.gsap && window.Flip) gsap.registerPlugin(Flip);

  /* ==========================================================================
     داده‌ی بخش‌ها
     ========================================================================== */
  const SVC = {
    dental: {
      title: 'دندانپزشکی', icon: 'tooth',
      lead: 'ایمپلنت، لمینت و کامپوزیت، عصب‌کشی و ترمیم، روکش، جراحی لثه، کشیدن دندان، جرم‌گیری و بلیچینگ. شنبه، یکشنبه، دوشنبه و پنجشنبه از ۱۰ صبح تا ۸ شب پذیرش داریم و پیش از هر درمان، مراحل و هزینه را روشن می‌گوییم.',
      items: [
        ['ایمپلنت (کاشت دندان)', 'جایگزین ثابت برای دندان ازدست‌رفته: کاشت پایه، و گذاشتن روکش بعد از جوش خوردن استخوان.', 'چند ماه، در چند جلسه'],
        ['لمینت و کامپوزیت', 'اصلاح رنگ، فرم و فاصله‌ی دندان‌های جلو برای لبخندی یکدست و طبیعی.', '۱ تا ۳ جلسه'],
        ['عصب‌کشی', 'درمان ریشه‌ی دندانی که عصبش آسیب دیده، تا درد برطرف شود و خود دندان حفظ شود.', '۱ تا ۲ جلسه'],
        ['ترمیم', 'پر کردن پوسیدگی با مواد هم‌رنگ دندان.', 'یک جلسه'],
        ['روکش', 'پوشش کامل دندانی که ضعیف یا عصب‌کشی شده، برای استحکام و ظاهر بهتر.', '۲ جلسه'],
        ['جراحی لثه', 'درمان و فرم‌دهی لثه، هم برای سلامت و هم برای زیبایی لبخند.', 'بسته به نوع درمان'],
        ['کشیدن دندان', 'کشیدن دندانی که دیگر قابل نگه‌داشتن نیست، با بی‌حسی کامل.', 'حدود ۳۰ دقیقه'],
        ['جرم‌گیری', 'پاک کردن جرم و رنگ‌دانه‌ها برای لثه‌ی سالم و دندان‌های تمیزتر.', 'حدود ۳۰ دقیقه'],
        ['بلیچینگ (سفید کردن دندان)', 'روشن‌تر کردن رنگ دندان‌ها زیر نظر دندانپزشک.', 'یک جلسه']
      ]
    },
    beauty: {
      title: 'زیبایی و لیزر', icon: 'sparkles',
      lead: 'بوتاکس، تزریق فیلر، جوان‌سازی با مزوژل و مزوتراپی، لیزر، میکرونیدلینگ و لایه‌برداری. همه‌روزه با هماهنگی قبلی؛ پیش از هر تزریق یا لیزر، پوست و خواسته‌تان بررسی می‌شود.',
      items: [
        ['بوتاکس', 'کم کردن خطوط پیشانی، میان ابرو و دور چشم با دوز حساب‌شده، تا حالت طبیعی صورت بماند.', 'حدود ۲۰ دقیقه'],
        ['تزریق فیلر', 'حجم‌دهی و فرم‌دهی لب، گونه، زاویه‌ی فک، چانه و شقیقه.', '۳۰ تا ۴۵ دقیقه'],
        ['جوان‌سازی (مزوژل و مزوتراپی)', 'آب‌رسانی، شادابی پوست و کمک به چروک‌های ریز.', 'چند جلسه با فاصله'],
        ['لیزر', 'جلسه‌های لیزر با برنامه‌ی مشخص؛ تعداد جلسه‌ها بعد از معاینه گفته می‌شود.', 'چند جلسه'],
        ['میکرونیدلینگ و لایه‌برداری', 'برای بافت ناصاف پوست، جای جوش و کدری.', 'چند جلسه با فاصله']
      ]
    },
    medicine: {
      title: 'پزشکی شبانه‌روزی', icon: 'steth',
      lead: 'پزشک عمومی شبانه‌روز در کلینیک است. برای ویزیت، تزریقات و سرم‌تراپی، شست‌وشوی گوش، بخیه و نوار قلب، هر ساعتی از شبانه‌روز می‌توانید بیایید.',
      items: [
        ['ویزیت پزشک عمومی', 'شبانه‌روزی و همه‌ی روزهای هفته.', 'حدود ۱۵ دقیقه'],
        ['تزریقات', 'تزریق عضلانی و وریدی دارو با نسخه‌ی پزشک.', 'چند دقیقه'],
        ['سرم‌تراپی', 'سرم با نسخه‌ی پزشک و زیر نظر کادر درمان.', '۳۰ تا ۶۰ دقیقه'],
        ['شست‌وشوی گوش', 'خارج کردن جرم گوش بعد از معاینه‌ی پزشک.', 'حدود ۱۵ دقیقه'],
        ['بخیه', 'بخیه و پانسمان زخم و بریدگی، شب یا روز.', 'بسته به زخم'],
        ['نوار قلب', 'گرفتن نوار قلب (ECG) در کلینیک و بررسی آن توسط پزشک.', 'حدود ۱۰ دقیقه']
      ]
    }
  };
  const KEYS = ['dental', 'beauty', 'medicine'];
  const TEL = '۰۱۱ ۵۴۶۱ ۱۵۶۰';

  /* ==========================================================================
     ساعت کاری روی کارت‌ها، فرم نوبت و نوار پایین صفحه
     ========================================================================== */
  const cardAvail = (k) => (k === 'medicine' ? 'همین حالا · شبانه‌روزی' : k === 'beauty' ? 'همه‌روزه با هماهنگی' : Clinic.dental().when);
  function fillSlots() {
    KEYS.forEach((k) => { const cs = $(`.pcard__slot[data-slot="${k}"]`); if (cs) cs.textContent = cardAvail(k); });
    const live = $('#qbookLive'); if (live) live.textContent = Clinic.status().text;
    const fs = $('#footSlot'); if (fs) fs.textContent = 'دندانپزشکی: ' + Clinic.dental().when;
  }
  fillSlots();

  /* ==========================================================================
     فهرست انتخاب: select واقعی سر جایش می‌ماند (مقدار فرم، بدون جاوااسکریپت هم کار می‌کند)
     و رویش یک دکمه و فهرست متحرک ساخته می‌شود؛ الگوی combobox فقط‌انتخابی (ARIA APG).
     فهرست داخل body و با position: fixed است تا قاب‌های overflow هیرو برشش ندهند
     ========================================================================== */
  const anim = () => Motion.on && !!window.gsap;
  let pickN = 0, pickOpen = null;
  function Pick(sel) {
    const field = sel.closest('.field'), lab = field && $('.field__label', field);
    if (!field || sel.dataset.pick) return null;
    sel.dataset.pick = '1';
    const id = 'pk' + (++pickN), opts = [...sel.options];
    if (lab && !lab.id) lab.id = id + 'l';
    const ic = (o) => o.dataset.ic || 'i-check';
    const tone = (o) => (o.dataset.tone ? ` data-tone="${o.dataset.tone}"` : '');

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'pick'; btn.id = id + 'b';
    btn.setAttribute('role', 'combobox'); btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id + 'p');
    btn.innerHTML = `<span class="pick__val"><span class="pick__txt" id="${id}v"></span></span><svg class="ic pick__chev" aria-hidden="true"><use href="#i-chev-d"/></svg>`;
    if (lab) btn.setAttribute('aria-labelledby', `${lab.id} ${id}v`);
    sel.classList.add('is-picked'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    sel.insertAdjacentElement('beforebegin', btn);

    const pop = document.createElement('div');
    pop.className = 'pick-pop'; pop.id = id + 'p'; pop.hidden = true;
    pop.setAttribute('role', 'listbox'); pop.setAttribute('data-lenis-prevent', '');
    if (lab) pop.setAttribute('aria-labelledby', lab.id);
    pop.innerHTML = '<i class="pick-pop__hl" aria-hidden="true"></i>' + opts.map((o, i) => `<div class="pick-opt" role="option" id="${id}o${i}" aria-selected="false"${tone(o)}><span class="pick-opt__ic" aria-hidden="true"><svg class="ic"><use href="#${ic(o)}"/></svg></span><span class="pick-opt__txt"><b>${o.textContent}</b>${o.dataset.hint ? `<small>${o.dataset.hint}</small>` : ''}</span><svg class="ic pick-opt__ok" aria-hidden="true"><use href="#i-check"/></svg></div>`).join('');
    document.body.appendChild(pop);
    const rows = $$('.pick-opt', pop), hl = $('.pick-pop__hl', pop), val = $('.pick__val', btn);
    let txt = $('.pick__txt', btn), active = -1, open = false, raf = 0;

    const face = (o) => `<svg class="ic" aria-hidden="true"><use href="#${ic(o)}"/></svg><span>${o.textContent}</span>`;
    const paint = (roll) => {
      const o = opts[sel.selectedIndex] || opts[0];
      rows.forEach((r, i) => r.setAttribute('aria-selected', String(i === sel.selectedIndex)));
      btn.dataset.tone = o.dataset.tone || '';
      if (!roll || !anim()) { txt.innerHTML = face(o); return; }
      /* مقدار قبلی بالا می‌رود و مقدار تازه از پایین می‌آید */
      const old = txt; txt = old.cloneNode(false); txt.innerHTML = face(o); val.appendChild(txt);
      old.removeAttribute('id'); txt.id = id + 'v';
      gsap.to(old, { yPercent: -110, opacity: 0, duration: 0.32, ease: 'power2.in', onComplete: () => old.remove() });
      gsap.fromTo(txt, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'expo.out', delay: 0.06 });
    };
    const light = (i, instant) => {
      active = i;
      rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
      if (i < 0) { pop.classList.remove('has-hl'); btn.removeAttribute('aria-activedescendant'); return; }
      const r = rows[i];
      btn.setAttribute('aria-activedescendant', r.id);
      if (instant) hl.style.transition = 'none';
      hl.style.setProperty('--y', r.offsetTop + 'px'); hl.style.height = r.offsetHeight + 'px';
      pop.classList.add('has-hl');
      if (instant) { void hl.offsetWidth; hl.style.transition = ''; }
    };
    const place = () => {
      const r = btn.getBoundingClientRect(), vh = window.innerHeight, vw = document.documentElement.clientWidth;
      if (r.bottom < 0 || r.top > vh) { close(false); return; }
      const w = Math.max(r.width, Math.min(280, vw - 24)), h = pop.offsetHeight;
      const up = r.bottom + 8 + h > vh - 8 && r.top - 8 - h > 8;
      pop.dataset.side = up ? 'top' : 'bottom';
      let x = r.right - w; x = Math.max(12, Math.min(x, vw - w - 12));
      pop.style.width = w + 'px'; pop.style.left = x + 'px';
      pop.style.top = (up ? r.top - 8 - h : r.bottom + 8) + 'px';
    };
    const follow = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };

    function show() {
      if (open) return;
      if (pickOpen && pickOpen !== api) pickOpen.close(false);
      open = true; pickOpen = api;
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); field.classList.add('is-open');
      place(); light(Math.max(0, sel.selectedIndex), true);
      window.addEventListener('scroll', follow, { passive: true }); window.addEventListener('resize', follow);
      if (anim()) {
        gsap.killTweensOf([pop, ...rows]);
        const up = pop.dataset.side === 'top';
        gsap.fromTo(pop, { opacity: 0, y: up ? 10 : -10, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'expo.out' });
        gsap.fromTo(rows, { opacity: 0, y: up ? 8 : -8 }, { opacity: 1, y: 0, duration: 0.42, ease: 'expo.out', stagger: up ? -0.04 : 0.04, delay: 0.05, clearProps: 'transform,opacity' });
      }
    }
    function close(focus = true) {
      if (!open) return;
      open = false; if (pickOpen === api) pickOpen = null;
      btn.setAttribute('aria-expanded', 'false'); field.classList.remove('is-open'); light(-1);
      window.removeEventListener('scroll', follow); window.removeEventListener('resize', follow); cancelAnimationFrame(raf);
      if (focus) btn.focus({ preventScroll: true });
      if (anim()) {
        gsap.killTweensOf(rows); gsap.set(rows, { clearProps: 'transform,opacity' });
        gsap.to(pop, { opacity: 0, y: pop.dataset.side === 'top' ? 6 : -6, scale: 0.97, duration: 0.2, ease: 'power2.in', overwrite: true, onComplete: () => { if (!open) pop.hidden = true; } });
      } else pop.hidden = true;
    }
    function choose(i) {
      const changed = i !== sel.selectedIndex;
      sel.selectedIndex = i;
      if (changed) { paint(true); sel.dispatchEvent(new Event('change', { bubbles: true })); }
      close();
      if (changed && anim()) gsap.fromTo(btn, { scale: 0.985 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, .5)', clearProps: 'transform' });
    }

    btn.addEventListener('click', (e) => { e.preventDefault(); if (open) close(); else show(); });
    btn.addEventListener('keydown', (e) => {
      const n = rows.length, k = e.key;
      if (!open) {
        if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); show(); if (k === 'ArrowUp') light(n - 1); }
        return;
      }
      if (k === 'ArrowDown') { e.preventDefault(); light(Math.min(n - 1, active + 1)); }
      else if (k === 'ArrowUp') { e.preventDefault(); light(Math.max(0, active - 1)); }
      else if (k === 'Home') { e.preventDefault(); light(0); }
      else if (k === 'End') { e.preventDefault(); light(n - 1); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (active >= 0) choose(active); }
      else if (k === 'Escape') { e.preventDefault(); close(); }
      else if (k === 'Tab') close(false);
      else if (k.length === 1) {
        const j = opts.findIndex((o, idx) => idx > active && o.textContent.trim().startsWith(k));
        const f = j >= 0 ? j : opts.findIndex((o) => o.textContent.trim().startsWith(k));
        if (f >= 0) light(f);
      }
    });
    rows.forEach((r, i) => {
      r.addEventListener('pointermove', () => { if (active !== i) light(i); });
      r.addEventListener('click', () => choose(i));
    });
    pop.addEventListener('pointerdown', (e) => e.preventDefault());
    document.addEventListener('pointerdown', (e) => { if (open && !btn.contains(e.target) && !pop.contains(e.target)) close(false); });
    if (sel.form) sel.form.addEventListener('reset', () => setTimeout(() => paint(false)));

    const api = { close, sync: () => paint(false) };
    paint(false);
    return api;
  }
  $$('.field select').forEach((sel) => Pick(sel));

  /* ---------- زبانه‌ها: نشانگر تیره با فنر زیر زبانه‌ی انتخاب‌شده می‌لغزد ---------- */
  function Pill(box, attr) {
    const btns = box ? $$(':scope > button', box) : [];
    if (!btns.length) return;
    const ind = document.createElement('i'); ind.className = 'pill'; ind.setAttribute('aria-hidden', 'true');
    box.prepend(ind); box.classList.add('has-pill');
    const put = (instant) => {
      const b = btns.find((x) => x.getAttribute(attr) === 'true'); if (!b) return;
      if (instant) ind.style.transition = 'none';
      ind.style.setProperty('--x', b.offsetLeft + 'px'); ind.style.setProperty('--y', b.offsetTop + 'px');
      ind.style.setProperty('--w', b.offsetWidth + 'px'); ind.style.setProperty('--h', b.offsetHeight + 'px');
      if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      requestAnimationFrame(() => put(false));
      /* اگر زبانه‌ها روی موبایل افقی اسکرول می‌شوند، زبانه‌ی انتخاب‌شده به وسط می‌آید */
      if (box.scrollWidth > box.clientWidth + 2) {
        const to = b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2;
        box.scrollTo({ left: to, behavior: anim() ? 'smooth' : 'auto' });
      }
    }));
    /* اندازه‌گیری داخل ResizeObserver بعد از چیدمان خود مرورگر انجام می‌شود و چیدمان اضافه‌ای نمی‌سازد */
    if ('ResizeObserver' in window) new ResizeObserver(() => put(true)).observe(box);
    else requestAnimationFrame(() => put(true));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(() => put(true)));
  }
  Pill($('.rv-tabs'), 'aria-selected');
  Pill($('.faq-tabs'), 'aria-pressed');

  /* ---------- فرم‌ها: دکمه‌ی در حال بررسی، باز شدن نرم پاسخ، لرزش فیلد اشتباه ---------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function busy(btn, ms) {
    if (!anim()) return;
    if (!$('.spin', btn)) btn.insertAdjacentHTML('afterbegin', '<span class="spin" aria-hidden="true"></span>');
    btn.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true');
    await wait(ms);
    btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy');
  }
  function swap(out, html) {
    const was = !out.hidden;
    if (!anim()) { out.innerHTML = html; out.hidden = false; return; }
    const h0 = was ? out.offsetHeight : 0;
    out.innerHTML = html; out.hidden = false;
    const mt = parseFloat(getComputedStyle(out).marginTop) || 0;
    gsap.killTweensOf(out);
    gsap.fromTo(out, { height: h0, marginTop: was ? mt : 0, opacity: was ? 1 : 0 }, { height: 'auto', marginTop: mt, opacity: 1, duration: 0.65, ease: 'expo.out', clearProps: 'height,marginTop,opacity' });
    gsap.fromTo([...out.children], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'expo.out', stagger: 0.07, delay: 0.1, clearProps: 'transform,opacity' });
  }
  const shake = (el) => { if (anim()) gsap.fromTo(el, { x: 0 }, { keyframes: { x: [0, -7, 6, -4, 3, 0] }, duration: 0.45, ease: 'power1.out', clearProps: 'transform' }); };


  /* ---------- فرم نوبت: زمان مراجعه را بر اساس ساعت واقعی هر بخش می‌گوید ---------- */
  const WHEN = { am: [10, 14, 'صبح'], pm: [14, 20, 'عصر'], night: [20, 24, 'شب'] };
  function dentalFor(pref) {
    const n = Clinic.now(), D = Clinic.DENTAL;
    if (pref === 'night') return null;
    for (let off = 0; off < 8; off++) {
      const di = (n.d + off) % 7, h = D[di]; if (!h) continue;
      let from = h[0], to = h[1];
      if (WHEN[pref]) { from = Math.max(from, WHEN[pref][0]); to = Math.min(to, WHEN[pref][1]); }
      if (off === 0) { if (n.min >= to * 60) continue; from = Math.max(from, Math.ceil(n.min / 60)); }
      if (from >= to) continue;
      const day = off === 0 ? 'امروز' : off === 1 ? 'فردا' : Clinic.DAYS[di];
      return `${day}، ${Clinic.hourFa(from)} تا ${Clinic.hourFa(to)}`;
    }
    return null;
  }
  const qb = $('#qbook');
  if (qb) {
    qb.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('.qbook__submit', qb);
      if (btn.classList.contains('is-busy')) return;
      const k = $('#qbDept').value, pref = $('#qbWhen').value;
      const out = $('#qbResult');
      let html;
      if (k === 'medicine') html = '<b>پزشک عمومی شبانه‌روزی است</b> <span>همین حالا هم می‌توانید بیایید؛ برای تزریقات، سرم‌تراپی، بخیه و نوار قلب هم همین‌طور.</span>';
      else if (k === 'beauty') html = `<b>زیبایی و لیزر: همه‌روزه با هماهنگی قبلی</b> <span>${WHEN[pref] ? 'برای ' + WHEN[pref][2] + '، ' : ''}زمان را تلفنی با پذیرش هماهنگ کنید.</span>`;
      else {
        const w = dentalFor(pref);
        html = w ? `<span>نزدیک‌ترین زمان پذیرش دندانپزشکی:</span> <b>${w}</b>` : '<b>دندانپزشکی شب پذیرش ندارد.</b> <span>شنبه، یکشنبه، دوشنبه و پنجشنبه از ۱۰ صبح تا ۸ شب.</span>';
      }
      await busy(btn, 420);
      const type = $('#qbType').value;
      swap(out, `${html} <span class="qbook__acts"><button type="button" class="btn btn--primary qbook__go" data-book="${k}" data-type="${type === 'مشاوره پیش از درمان' ? 'مشاوره' : type}"><svg class="ic" aria-hidden="true"><use href="#i-cal"/></svg>درخواست نوبت</button><a class="link-arrow" href="tel:+981154611560">تماس با پذیرش: <span dir="ltr">${TEL}</span><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></a></span>`);
    });
  }

  /* ==========================================================================
     تقسیم تیتر به کلمه‌ها (حروف فارسی به هم چسبیده‌اند؛ فقط کلمه‌به‌کلمه)
     ========================================================================== */
  function splitWords(el) {
    if (el.dataset.splitDone) return $$('.wi', el);
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/([ \t\n\r]+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^[ \t\n\r]+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    return $$('.wi', el);
  }

  /* ---------- شمارنده‌ها ---------- */
  function counters(scope, animate) {
    $$('[data-count]', scope).forEach((el) => {
      const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
      const sep = !!el.dataset.sep;
      const out = (v) => { let t = v.toFixed(dec); if (sep) t = t.replace(/\B(?=(\d{3})+(?!\d))/g, '٬'); el.textContent = toFa(t); };
      if (!animate) { out(to); return; }
      const o = { v: 0 }; out(0);
      gsap.to(o, { v: to, duration: 1.6, ease: 'expo.out', onUpdate: () => out(o.v) });
    });
  }

  /* ==========================================================================
     ورود هیرو
     ========================================================================== */
  function intro() {
    window.__sasanIntro = true;
    if (!Motion.on) { root.classList.remove('intro'); return; }
    const title = $('.hero__title');
    const words = splitWords(title);
    const kicker = $('.hero .kicker'), lead = $('.hero__lead'), ctas = $('.hero__ctas'), qbw = $('.qbook');
    const zoom = $('.stage__zoom'), shade = $('.stage__shade');

    gsap.set(words, { yPercent: 110 });
    gsap.set([lead, ctas], { opacity: 0, y: 22 });
    gsap.set(kicker, { opacity: 0 });
    gsap.set(qbw, { opacity: 0, y: 40 });
    gsap.set(zoom, { scale: 1.14 });
    gsap.set(shade, { opacity: 0.4 });
    root.classList.remove('intro');

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(zoom, { scale: 1, duration: 2.4, ease: 'expo.out' }, 0)
      .to(shade, { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0)
      .to(kicker, { opacity: 1, duration: 0.8 }, 0.3)
      .fromTo(kicker, { '--kx': 0 }, { '--kx': 1, duration: 0.9 }, 0.3)
      .to(words, { yPercent: 0, duration: 1.1, stagger: 0.045 }, 0.35)
      .to(lead, { opacity: 1, y: 0, duration: 1 }, 0.7)
      .to(ctas, { opacity: 1, y: 0, duration: 1 }, 0.8)
      .to(qbw, { opacity: 1, y: 0, duration: 1.1 }, 0.95)
      .add(() => gsap.set([lead, ctas, qbw, kicker], { clearProps: 'transform,opacity' }));
  }

  /* ==========================================================================
     معرفی لوگو: مدار و خط دور دندان می‌چرخد، آبی پر می‌شود، ستاره‌ها می‌درخشند،
     «Sasan Clinic» نوشته می‌شود؛ بعد پرده بالا می‌رود و لوگو در هدر می‌نشیند
     ========================================================================== */
  function brandIntro(done) {
    const ov = $('#brandIntro');
    if (!root.classList.contains('bi') || !ov || !window.gsap || !Motion.on) {
      root.classList.remove('bi'); if (ov) ov.remove(); done(); return;
    }
    window.__sasanBI = true;
    try { sessionStorage.setItem('sasan:bi', '1'); } catch (e) { /* حالت خصوصی */ }
    const bg = $('.bi-ov__bg', ov), mark = $('.bi-mark', ov), word = $('.bi-word', ov);
    const sweep = $('.bi-sweep', ov), blue = $('.bi-blue', ov), fill = $('.bi-fill', ov), stars = [$('.bi-star--l', ov), $('.bi-star--s', ov)];
    const target = $('.hdr .brand__mark');
    root.style.overflow = 'hidden';
    Motion.pause();
    let started = false;
    const start = () => { if (started) return; started = true; root.style.overflow = ''; Motion.resume(); done(); };
    const finish = () => { start(); root.classList.remove('bi'); ov.remove(); };

    const tl = gsap.timeline({ onComplete: finish });
    gsap.set(stars, { scale: 0, rotation: -140, transformOrigin: '50% 50%', opacity: 1 });
    tl.to(fill, { opacity: 1, duration: 0.6, ease: 'power1.out' }, 0.1)
      .to(sweep, { attr: { 'stroke-dashoffset': 0 }, duration: 1.15, ease: 'power2.inOut' }, 0.12)
      .to(blue, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0.55)
      .to(stars, { scale: 1, rotation: 0, duration: 0.85, ease: 'back.out(2.4)', stagger: 0.12 }, 0.95)
      .to(word, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.95, ease: 'power2.inOut' }, 1.05)
      .to(stars, { scale: 1.28, duration: 0.2, yoyo: true, repeat: 1, ease: 'sine.inOut', stagger: 0.09 }, 1.85)
      .addLabel('exit', 2.25)
      .to(word, { opacity: 0, y: -14, duration: 0.4, ease: 'power2.in' }, 'exit')
      .add(start, 'exit+=0.2')
      .to(bg, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' }, 'exit+=0.08')
      .add(() => {
        if (!target) { gsap.to(mark, { opacity: 0, duration: 0.5 }); return; }
        const r0 = mark.getBoundingClientRect(), r1 = target.getBoundingClientRect();
        gsap.to(mark, {
          x: r1.left + r1.width / 2 - (r0.left + r0.width / 2), y: r1.top + r1.height / 2 - (r0.top + r0.height / 2),
          scale: r1.width / r0.width, duration: 1.1, ease: 'expo.inOut'
        });
      }, 'exit+=0.08')
      .to({}, { duration: 1.1 }, 'exit+=0.08');
    /* هر کلیک یا کلید، معرفی را سریع جلو می‌برد */
    const skip = () => { tl.timeScale(3.5); };
    ov.addEventListener('pointerdown', skip, { once: true });
    document.addEventListener('keydown', skip, { once: true });
  }

  /* ==========================================================================
     صحنه‌ی اول (مدل ۲۱): عکس تمام‌صفحه‌ی هیرو با اسکرول در قاب «درباره‌ی ما» جمع می‌شود
     ========================================================================== */
  const Stage = {
    ctx: null,
    build() {
      const stage = $('.stage'), pin = $('.stage__pin', stage), media = $('.stage__media', stage);
      const img = $('.stage__img', stage), shade = $('.stage__shade', stage);
      const hero = $('.hero', stage), copy = $('.hero__copy', stage), qbw = $('.qbook-wrap', stage);
      const about = $('.about', stage), frame = $('.about__frame', stage);
      const bits = [$('.kicker', about), $('.about__title', about), $('.about__p', about), $('.figures', about), $('.link-arrow', about)].filter(Boolean);
      const figs = $('.figures', about);
      const mob = isMob();
      let counted = false;

      /* عکس را خودمان به اندازه‌ی cover می‌چینیم تا هنگام بزرگ‌نمایی و جابه‌جایی لبه‌اش پیدا نشود.
         جای دندان (نسبت به ابعاد اصلی تصویر) و اندازه‌اش را داریم تا در مرکز قاب بنشیند و در قاب جا شود. */
      const SUBJECT = { x: 0.265, y: 0.62, w: 0.19, h: 0.37 };
      const push = () => {
        const W = pin.clientWidth, H = pin.clientHeight;
        const nw = img.naturalWidth || 1672, nh = img.naturalHeight || 940;
        const c = Math.max(W / nw, H / nh), rw = nw * c, rh = nh * c;
        const posX = mob ? 0.22 : 0.3;
        const ox = (W - rw) * posX, oy = (H - rh) * 0.5;
        img.style.cssText += `;position:absolute;max-width:none;object-fit:fill;width:${rw}px;height:${rh}px;left:${ox}px;top:${oy}px`;
        const px = ox + SUBJECT.x * rw, py = oy + SUBJECT.y * rh;
        const p = pin.getBoundingClientRect(), r = frame.getBoundingClientRect();
        const fw = r.width, fh = r.height, fx = r.left - p.left + fw / 2, fy = r.top - p.top + fh / 2;
        const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
        const base = { L: ox, T: oy, W, H, F: { x: r.left - p.left, y: r.top - p.top, w: fw, h: fh } };
        if (window.innerWidth >= 1061) {
          /* دسکتاپ: دندان وسط قاب و کمی بزرگ‌تر */
          const fit = Math.min(1.16, 0.8 * fh / (SUBJECT.h * rh), 0.8 * fw / (SUBJECT.w * rw));
          const cover = Math.max((fw / 2) / (px - ox), (fw / 2) / (ox + rw - px), (fh / 2) / (py - oy), (fh / 2) / (oy + rh - py)) * 1.02;
          return { ...base, ox: px - ox, oy: py - oy, dx: fx - px, dy: fy - py, s: Math.max(cover, fit) };
        }
        /* تبلت و موبایل: عکس کوچک‌تر می‌شود تا بیشتر صحنه دیده شود؛
           دندان حدود ۴۰٪ ارتفاع قاب را می‌گیرد و قاب همیشه پر می‌ماند */
        const sMin = Math.max(fw / rw, fh / rh) * 1.03;
        const sc = Math.max(sMin, Math.min(1, 0.4 * fh / (SUBJECT.h * rh)));
        const fL = fx - fw / 2, fR = fx + fw / 2, fT = fy - fh / 2, fB = fy + fh / 2;
        const lx = px - ox, ly = py - oy;
        const tx = clamp(fx, fR - (rw - lx) * sc, fL + lx * sc);
        const ty = clamp(fy, fB - (rh - ly) * sc, fT + ly * sc);
        return { ...base, ox: lx, oy: ly, dx: tx - px, dy: ty - py, s: sc };
      };
      let P = push();
      /* قاب بدون clip-path: خود قاب با transform کوچک می‌شود و عکس و سایه با transform معکوس سر جایشان می‌مانند؛
         در طول اسکرول هیچ لایه‌ای دوباره رسم نمی‌شود و فقط کارت گرافیک جابه‌جا می‌کند */
      const V = { q: 0 };
      const paint = () => {
        const q = V.q, F = P.F;
        const tx = F.x * q, ty = F.y * q, sx = (P.W + (F.w - P.W) * q) / P.W, sy = (P.H + (F.h - P.H) * q) / P.H;
        /* گوشه‌ی گرد فقط در انتهای حرکت (وقتی قاب تقریباً ایستاده) اضافه می‌شود؛ بقیه‌ی مسیر قاب ساده و ارزان است */
        const s = 1 + (P.s - 1) * q, x = P.dx * q, y = P.dy * q, r = 8 * ease01((q - 0.8) / 0.2);
        media.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${sx}, ${sy})`;
        media.style.borderRadius = r > 0.05 ? `${r / sx}px / ${r / sy}px` : '0px';
        img.style.transform = `translate3d(${(P.L + x + P.ox * (1 - s) - tx) / sx - P.L}px, ${(P.T + y + P.oy * (1 - s) - ty) / sy - P.T}px, 0) scale(${s / sx}, ${s / sy})`;
        shade.style.transform = `translate3d(${-tx / sx}px, ${-ty / sy}px, 0) scale(${1 / sx}, ${1 / sy})`;
      };
      paint();

      this.ctx = gsap.context(() => {
        gsap.set(bits, { autoAlpha: 0, y: 36 });
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: stage, start: 'top top', end: () => '+=' + window.innerHeight * (mob ? 1.5 : 1.8),
            pin: pin, scrub: 0.7, invalidateOnRefresh: true,
            onRefreshInit: () => { P = push(); },
            onRefresh: paint,
            onUpdate: (self) => {
              about.classList.toggle('is-on', self.progress > 0.55);
              pin.classList.toggle('is-about', self.progress > 0.3);
              if (!counted && self.progress > 0.6) { counted = true; counters(figs, true); }
            }
          }
        });
        tl.fromTo(copy, { y: 0, autoAlpha: 1 }, { y: -70, autoAlpha: 0, duration: 0.24, ease: 'power1.in' }, 0)
          .fromTo(qbw, { y: 0, autoAlpha: 1 }, { y: 50, autoAlpha: 0, duration: 0.2, ease: 'power1.in' }, 0)
          .fromTo(V, { q: 0 }, { q: 1, duration: 0.48, ease: 'power2.inOut', onUpdate: paint }, 0.06)
          .fromTo(shade, { opacity: 1 }, { opacity: 0, duration: 0.3 }, 0.12)
          .to(bits, { autoAlpha: 1, y: 0, duration: 0.2, stagger: 0.04, ease: 'power2.out' }, 0.52)
          .to({}, { duration: 0.12 }, 0.88);
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      const about = $('.about');
      about.classList.remove('is-on');
      $('.stage__pin').classList.remove('is-about');
      gsap.set([$('.stage__media'), $('.stage__img'), $('.stage__shade'), $('.hero__copy'), $('.qbook-wrap'), ...$$('.about .kicker, .about__title, .about__p, .figures, .about .link-arrow')], { clearProps: 'all' });
      counters($('.figures'), false);
    }
  };

  /* ==========================================================================
     کلینیک در یک نگاه (مدل ۲۱): ردیف کاشی‌ها؛ عکس تیم وسط ردیف با اسکرول تمام‌صفحه می‌شود
     ========================================================================== */
  const Reel = {
    ctx: null,
    build() {
      const wrap = $('#reel'), row = $('.reel__row', wrap);
      const center = $('.reel__item--center', row);
      const tiles = $$('.reel__item', row).filter((el) => el !== center);
      const inner = $('.reel__inner', center), img = $('img', inner), shade = $('.reel__shade', center);
      const cap = $('.reel__cap', row), intro = $('.reel__intro', wrap);
      const kids = Array.from(cap.children);
      const mob = isMob();
      /* چیدمان بسته و باز را یک بار اندازه می‌گیریم و بعد فقط clip و transform را حرکت می‌دهیم؛
         هیچ اندازه‌ای در طول اسکرول عوض نمی‌شود، پس عکس بزرگ هر فریم دوباره رسم نمی‌شود */
      let M = null;
      const measure = () => {
        row.classList.remove('is-fx');
        const base = row.getBoundingClientRect();
        const rel = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; };
        const closed = tiles.map(rel), cc = rel(center);
        row.classList.add('is-open');
        const open = tiles.map(rel), co = rel(center);
        row.classList.remove('is-open');
        row.classList.add('is-fx');
        row.style.setProperty('--ox', co.x + 'px'); row.style.setProperty('--oy', co.y + 'px');
        row.style.setProperty('--ow', co.w + 'px'); row.style.setProperty('--oh', co.h + 'px');
        const O = { x: cc.x + cc.w / 2 - co.x, y: cc.y + cc.h / 2 - co.y };
        /* در حالت بسته، عکس مثل یک کاشی معمولی قاب کوچک را cover می‌کند (مرکزش مرکز کاشی است) */
        const s0 = Math.max(cc.w / co.w, cc.h / co.h) * 1.01;
        M = { closed, open, O, s0, cc, co, capY: wrap.clientHeight * 0.6 };
      };
      measure();
      /* قاب عکس وسط با transform از اندازه‌ی کاشی تا تمام‌صفحه باز می‌شود و عکس و سایه با transform معکوس
         درست سر جایشان می‌مانند؛ بدون clip-path، پس هیچ فریمی دوباره رسم نمی‌شود */
      const V = { q: 0 };
      const paint = () => {
        const q = V.q, cc = M.cc, co = M.co;
        const tx = (cc.x - co.x) * (1 - q), ty = (cc.y - co.y) * (1 - q);
        const sx = (cc.w + (co.w - cc.w) * q) / co.w, sy = (cc.h + (co.h - cc.h) * q) / co.h;
        const s = M.s0 + (1 - M.s0) * q, r = 8 * (1 - ease01(q / 0.2));
        inner.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${sx}, ${sy})`;
        inner.style.borderRadius = r > 0.05 ? `${r / sx}px / ${r / sy}px` : '0px';
        const ix = (1 - q) * (M.O.x - M.s0 * co.w / 2), iy = (1 - q) * (M.O.y - M.s0 * co.h / 2);
        img.style.transform = `translate3d(${(ix - tx) / sx}px, ${(iy - ty) / sy}px, 0) scale(${s / sx}, ${s / sy})`;
        shade.style.transform = `translate3d(${-tx / sx}px, ${-ty / sy}px, 0) scale(${1 / sx}, ${1 / sy})`;
      };
      paint();
      this.ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: wrap, start: 'top top', end: () => '+=' + window.innerHeight * (mob ? 1.6 : 2.1), pin: wrap, scrub: 0.6, invalidateOnRefresh: true,
            onRefreshInit: () => { gsap.set(tiles, { clearProps: 'transform' }); measure(); },
            onRefresh: paint
          }
        });
        tl.fromTo(V, { q: 0 }, { q: 1, duration: 1, ease: 'power1.inOut', onUpdate: paint }, 0)
          .fromTo(intro, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -24, duration: 0.25 }, 0)
          .fromTo(shade, { opacity: 0 }, { opacity: mob ? 0.15 : 1, duration: 0.45 }, 0.5)
          .fromTo(cap, { y: () => M.capY, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.34, ease: 'power2.out' }, 0.62)
          .from(kids, { y: 40, opacity: 0, duration: 0.22, stagger: 0.05, ease: 'power2.out' }, 0.66);
        tiles.forEach((t, i) => {
          tl.fromTo(t, { x: 0, y: 0, scale: 1 }, {
            x: () => M.open[i].x - M.closed[i].x, y: () => M.open[i].y - M.closed[i].y,
            scale: () => M.open[i].w / M.closed[i].w, transformOrigin: '0 0', duration: 1, ease: 'power1.inOut'
          }, 0);
        });
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      const row = $('.reel__row');
      row.classList.remove('is-open', 'is-fx');
      ['--ox', '--oy', '--ow', '--oh'].forEach((v) => row.style.removeProperty(v));
      gsap.set([...$$('.reel__item', row), $('.reel__cap', row), $('.reel__inner', row), $('.reel__inner img', row), $('.reel__shade', row), $('.reel__intro'), ...$('.reel__cap', row).children], { clearProps: 'all' });
    }
  };

  /* ==========================================================================
     نظر بیماران: فیلتر بخش، کشیدن با ماوس، دکمه‌ها و نوار پیشرفت
     ========================================================================== */
  /* ==========================================================================
     ردیف افقی عمومی (مجله روی تبلت و موبایل): لمس، کشیدن با ماوس، فلش‌ها، کلیدهای جهت و نوار پیشرفت
     ========================================================================== */
  function hScroller(track, ctl) {
    if (!track || !ctl) return;
    const bar = $('.hctl__bar i', ctl), prev = $('[data-dir="prev"]', ctl), next = $('[data-dir="next"]', ctl);
    const rtl = getComputedStyle(track).direction === 'rtl' ? -1 : 1;
    const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const pos = () => Math.abs(track.scrollLeft);
    const item = () => { const c = track.firstElementChild; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 14) : 300; };
    const sync = () => {
      const m = max(), vis = track.clientWidth / Math.max(1, track.scrollWidth);
      bar.style.setProperty('--p', m ? (vis + (pos() / m) * (1 - vis)).toFixed(3) : 1);
      prev.disabled = pos() < 4; next.disabled = pos() > m - 4;
    };
    const go = (d) => track.scrollBy({ left: rtl * d * item(), behavior: root.classList.contains('rm') ? 'auto' : 'smooth' });
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(rtl === -1 ? 1 : -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(rtl === -1 ? -1 : 1); }
    });
    /* کشیدن با ماوس؛ لمس خودش بومی اسکرول می‌شود */
    let drag = null;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || track.scrollWidth <= track.clientWidth) return;
      drag = { x: e.clientX, left: track.scrollLeft, moved: false, v: 0, t: performance.now(), lx: e.clientX };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; track.classList.add('is-drag'); }
      if (!drag.moved) return;
      const now = performance.now(); drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.t); drag.lx = e.clientX; drag.t = now;
      track.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) return;
      track.classList.remove('is-drag');
      /* با کمی شتاب به نزدیک‌ترین کارت می‌نشیند */
      const st = item(), fling = -d.v * 220 * rtl;
      const target = Math.min(max(), Math.max(0, Math.round((pos() + fling) / st) * st));
      track.scrollTo({ left: rtl * target, behavior: 'smooth' });
      track.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
    });
    sync();
  }
  hScroller($('.mag__list'), $('.mag__ctl'));

  const rvTrack = $('#rvTrack');
  if (rvTrack) {
    const cardsAll = $$('.rv-card', rvTrack);
    const prog = $('.rv-progress i');
    const btnPrev = $('.rv-btn[data-dir="prev"]'), btnNext = $('.rv-btn[data-dir="next"]');
    const maxScroll = () => Math.max(0, rvTrack.scrollWidth - rvTrack.clientWidth);
    const pos = () => Math.abs(rvTrack.scrollLeft);
    const sync = () => {
      const m = maxScroll(), p = m ? pos() / m : 0;
      const vis = rvTrack.clientWidth / Math.max(1, rvTrack.scrollWidth);
      prog.style.setProperty('--p', m ? (vis + p * (1 - vis)).toFixed(3) : 1);
      if (btnPrev) btnPrev.disabled = pos() < 4;
      if (btnNext) btnNext.disabled = pos() > m - 4;
    };
    const step = () => { const c = cardsAll.find((x) => !x.hidden); return c ? c.getBoundingClientRect().width + 16 : 300; };
    /* در راست‌به‌چپ، جلو رفتن یعنی scrollLeft منفی‌تر */
    const dirSign = getComputedStyle(rvTrack).direction === 'rtl' ? -1 : 1;
    const go = (d) => rvTrack.scrollBy({ left: dirSign * d * step(), behavior: root.classList.contains('rm') ? 'auto' : 'smooth' });
    btnNext && btnNext.addEventListener('click', () => go(1));
    btnPrev && btnPrev.addEventListener('click', () => go(-1));
    rvTrack.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    rvTrack.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(dirSign === -1 ? 1 : -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(dirSign === -1 ? -1 : 1); }
    });

    /* کشیدن با ماوس (لمس خودش اسکرول می‌کند) */
    let drag = null;
    rvTrack.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: rvTrack.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; rvTrack.classList.add('is-drag'); }
      if (drag.moved) rvTrack.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return;
      const moved = drag.moved; drag = null;
      if (!moved) return;
      rvTrack.classList.remove('is-drag');
      const st = step(), target = Math.round(pos() / st) * st;
      rvTrack.scrollTo({ left: dirSign * target, behavior: 'smooth' });
      rvTrack.addEventListener('click', (ev) => ev.preventDefault(), { capture: true, once: true });
    });

    /* خلاصه‌ی امتیاز همیشه از روی همین کارت‌ها حساب می‌شود و با هر فیلتر به عددهای همان بخش می‌رود */
    const sum = $('.rv-sum');
    const sumEls = sum && { score: $('.rv-score b', sum), count: $('.rv-count b', sum), stars: $('.rv-stars--lg', sum), scope: $('.rv-scope b', sum), bars: $$('.rv-bars li', sum) };
    const stats = (f) => {
      const rs = cardsAll.filter((c) => f === 'all' || c.dataset.k === f).map((c) => +c.dataset.r || 5);
      const n = rs.length, avg = n ? rs.reduce((a, b) => a + b, 0) / n : 0;
      return { n, avg, dist: [5, 4, 3, 2, 1].map((k) => (n ? rs.filter((r) => r === k).length / n : 0)) };
    };
    const cur = { avg: 0, n: 0, d0: 0, d1: 0, d2: 0, d3: 0, d4: 0 };
    const distOf = (t) => Object.fromEntries(t.dist.map((v, i) => ['d' + i, v]));
    const paintSum = () => {
      sumEls.score.textContent = toFa(cur.avg.toFixed(1));
      sumEls.count.textContent = toFa(String(Math.round(cur.n)));
      sumEls.stars.style.setProperty('--r', (cur.avg / 5).toFixed(3));
      sumEls.bars.forEach((li, i) => { const v = cur['d' + i]; $('i', li).style.setProperty('--v', v.toFixed(3)); $('b', li).textContent = toFa(String(Math.round(v * 100))) + '٪'; });
    };
    const setSum = (f, label, animate) => {
      if (!sumEls) return;
      const t = stats(f);
      sumEls.score.dataset.count = t.avg.toFixed(1); sumEls.count.dataset.count = String(t.n);
      sumEls.stars.setAttribute('aria-label', `میانگین ${toFa(t.avg.toFixed(1))} از ۵`);
      if (label) sumEls.scope.textContent = label;
      if (!animate) { Object.assign(cur, { avg: t.avg, n: t.n }, distOf(t)); paintSum(); return; }
      gsap.to(cur, { avg: t.avg, n: t.n, ...distOf(t), duration: 0.9, ease: 'expo.out', overwrite: true, onUpdate: paintSum });
      if (label) gsap.fromTo(sumEls.scope, { yPercent: 70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: 'expo.out' });
      gsap.fromTo(sumEls.score, { scale: 0.9 }, { scale: 1, duration: 0.7, ease: 'back.out(2.2)', clearProps: 'transform' });
    };
    setSum('all', '', false);

    /* فیلتر بخش */
    $$('.rv-tabs [role="tab"]').forEach((tab) => tab.addEventListener('click', () => {
      const f = tab.dataset.f;
      if (tab.getAttribute('aria-selected') === 'true') return;
      $$('.rv-tabs [role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      setSum(f, f === 'all' ? 'همه‌ی بخش‌ها' : tab.textContent.trim(), Motion.on);
      const apply = () => {
        cardsAll.forEach((c) => { c.hidden = !(f === 'all' || c.dataset.k === f); });
        rvTrack.scrollLeft = 0; sync();
      };
      if (!Motion.on) { apply(); return; }
      const visible = cardsAll.filter((c) => !c.hidden);
      gsap.to(visible, { opacity: 0, y: 12, duration: 0.18, stagger: 0.02, ease: 'power2.in', onComplete: () => {
        apply();
        const shown = cardsAll.filter((c) => !c.hidden);
        gsap.fromTo(shown, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'expo.out', clearProps: 'transform,opacity' });
      } });
    }));
    sync();
  }

  /* ==========================================================================
     مسیر درمان (مدل ۲۹): روی دسکتاپ قاب عکس ثابت می‌ماند و با رسیدن هر مرحله
     عکس فعلی رو به بالا کنار می‌رود و عکس بعدی نمایان می‌شود
     ========================================================================== */
  const Journey = {
    ctx: null,
    build() {
      const sec = $('#journey'); if (!sec) return;
      const jr = $('.jr', sec), frames = $$('.jr-frame__img', sec), steps = $$('.jr-step', sec), dots = $$('.jr-dots li', sec);
      const desk = window.matchMedia('(min-width: 900px)').matches;
      const n = frames.length;
      this.ctx = gsap.context(() => {
        gsap.from(sec.querySelectorAll('.sec-head > *'), { y: 26, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: sec, start: 'top 78%' } });
        if (desk) {
          frames.forEach((el, i) => gsap.set(el, { zIndex: n - i }));
          const setDots = (p) => {
            const v = p * (n - 1);
            dots.forEach((d, k) => {
              d.style.setProperty('--f', k === 0 ? 1 : Math.min(1, Math.max(0, v - (k - 1))).toFixed(3));
              d.classList.toggle('is-on', Math.round(v) === k);
            });
          };
          setDots(0);
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { trigger: jr, start: 'top top', end: 'bottom bottom', scrub: 0.6, onUpdate: (self) => setDots(self.progress) }
          });
          frames.forEach((el, i) => {
            if (i === n - 1) return;
            const nextImg = $('img', frames[i + 1]);
            /* پرده‌ی بالا رونده بدون clip-path: قاب بالا می‌رود (قاب مادر برشش می‌دهد) و عکس به همان اندازه پایین می‌آید تا سر جایش بماند */
            tl.fromTo(el, { yPercent: 0 }, { yPercent: -100, duration: 1, ease: 'power1.inOut' }, i)
              .fromTo($('img', el), { yPercent: 0, y: 0 }, { yPercent: -7, y: () => el.offsetHeight, duration: 1, ease: 'power1.inOut' }, i)
              .fromTo(nextImg, { yPercent: 7, scale: 1.08 }, { yPercent: 0, scale: 1, duration: 1 }, i);
          });
          steps.forEach((st) => ScrollTrigger.create({ trigger: st, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => st.classList.toggle('is-active', self.isActive) }));
          gsap.from($('.jr-side', sec), { y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: jr, start: 'top 80%' } });
        } else {
          /* موبایل: قاب زیر سربرگ می‌چسبد؛ هر مرحله که به خط خواندن (کمی پایین‌تر از قاب) برسد
             همان پرده‌ی بالا رونده‌ی دسکتاپ عکسش را نمایان می‌کند و نوار استوری بالای قاب پر می‌شود */
          const side = $('.jr-side', sec);
          frames.forEach((el, i) => gsap.set(el, { zIndex: n - i }));
          /* ناحیه‌ی خواندن = زیر قاب تا پایین صفحه؛ مرحله‌ای فعال است که از وسط این ناحیه رد می‌شود */
          const zone = () => { const b = (parseFloat(getComputedStyle(side).top) || 0) + side.offsetHeight; return [b, window.innerHeight - b]; };
          const line = (k = 0) => { const [b, h] = zone(); return Math.round(b + h * (0.5 + k)); };
          dots.forEach((d, k) => d.style.setProperty('--f', k === 0 ? 1 : 0));
          frames.forEach((el, i) => {
            if (i === n - 1) return;
            const d = dots[i + 1];
            gsap.timeline({
              defaults: { duration: 1, ease: 'power1.inOut' },
              scrollTrigger: { trigger: steps[i + 1], start: () => `top ${line(0.32)}px`, end: () => `top ${line(-0.08)}px`, scrub: 0.5, onUpdate: (self) => d && d.style.setProperty('--f', self.progress.toFixed(3)) }
            })
              .fromTo(el, { yPercent: 0 }, { yPercent: -100 }, 0)
              .fromTo($('img', el), { yPercent: 0, y: 0 }, { yPercent: -7, y: () => el.offsetHeight }, 0)
              .fromTo($('img', frames[i + 1]), { yPercent: 7, scale: 1.08 }, { yPercent: 0, scale: 1, ease: 'none' }, 0);
          });
          steps.forEach((st, i) => ScrollTrigger.create({
            trigger: st, start: () => `top ${line()}px`, end: () => `bottom ${line()}px`,
            onToggle: (self) => { st.classList.toggle('is-active', self.isActive); if (self.isActive) dots.forEach((d, k) => d.classList.toggle('is-on', k === i)); }
          }));
          gsap.from(side, { y: 34, scale: 0.94, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: jr, start: 'top 88%' } });
          steps.forEach((st) => gsap.from(st.querySelectorAll('.jr-step__txt > *'), { y: 22, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: st, start: 'top 88%' } }));
        }
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      const sec = $('#journey'); if (!sec) return;
      gsap.set([sec, ...$$('.jr-frame__img, .jr-frame__img img, .jr-step__img, .jr-step__img img, .jr-side', sec)], { clearProps: 'all' });
      $$('.jr-step', sec).forEach((st) => st.classList.remove('is-active'));
      $$('.jr-dots li', sec).forEach((d) => { d.style.removeProperty('--f'); d.classList.remove('is-on'); });
    }
  };

  /* ==========================================================================
     پزشکان: انتخاب با اشاره، کلیک، فوکوس یا کلیدهای بالا و پایین؛
     عکس بزرگ و کارت پزشک با یک پرده‌ی بالا رونده عوض می‌شوند و نشانگر با فنر زیر پزشک انتخاب‌شده می‌لغزد
     ========================================================================== */
  const docsSec = $('#doctors');
  const Docs = { ctx: null, build() {}, kill() {} };
  if (docsSec) {
    const docs = $$('.doc', docsSec), heads = docs.map((d) => $('.doc__head', d)), bodies = docs.map((d) => $('.doc__body', d));
    const frames = $$('.docs__img', docsSec), inn = $('.docs__in', docsSec), ind = $('.docs__ind', docsSec), num = $('.docs__num b', docsSec);
    const deskMq = window.matchMedia('(min-width: 1000px)');
    let cur = 0, ht = 0;
    const placeInd = () => {
      if (!deskMq.matches) return;
      const h = heads[cur];
      ind.style.width = h.offsetWidth + 'px'; ind.style.height = h.offsetHeight + 'px';
      ind.style.transform = `translate3d(${h.offsetLeft}px, ${h.offsetTop}px, 0)`;
    };
    /* همه‌ی کارت‌ها هم‌قد بلندترینشان می‌شوند تا عوض شدن کارت هیچ لبه‌ای را جابه‌جا نکند */
    const sizeCards = () => {
      inn.style.removeProperty('--card-h');
      if (!deskMq.matches) return;
      inn.style.setProperty('--card-h', Math.max(...bodies.map((b) => b.offsetHeight)) + 'px');
    };
    const mode = () => {
      const d = deskMq.matches;
      heads.forEach((h, k) => { h.setAttribute('aria-expanded', String(!d || k === cur)); h.tabIndex = d ? 0 : -1; });
      sizeCards(); placeInd();
    };
    const resetFrame = (f) => { gsap.killTweensOf([f, $('img', f)]); gsap.set([f, $('img', f)], { clearProps: 'transform' }); };
    const resetBody = (b) => { gsap.killTweensOf([b, ...b.children]); gsap.set([b, ...b.children], { clearProps: 'clipPath,transform,opacity,visibility' }); };
    function set(i) {
      if (i === cur || i < 0 || i >= docs.length) return;
      const prev = cur, dir = i > prev ? 1 : -1;
      cur = i;
      docs.forEach((d, k) => d.classList.toggle('is-on', k === i));
      heads.forEach((h, k) => h.setAttribute('aria-expanded', String(!deskMq.matches || k === i)));
      docsSec.dataset.k = docs[i].dataset.k;
      num.textContent = toFa(String(i + 1).padStart(2, '0'));
      placeInd();
      const fIn = frames[i], fOut = frames[prev], bIn = bodies[i], bOut = bodies[prev];
      if (!anim() || !deskMq.matches) {
        frames.forEach((f, k) => { f.classList.toggle('is-on', k === i); f.classList.remove('is-under'); });
        docs.forEach((d) => d.classList.remove('is-under'));
        return;
      }
      /* نیمه‌کاره‌ها همان لحظه تمام می‌شوند؛ تصویر و کارت قبلی زیر تصویر و کارت تازه می‌مانند تا پرده رویشان کشیده شود */
      frames.forEach((f) => { resetFrame(f); f.classList.remove('is-under'); if (f !== fIn) f.classList.remove('is-on'); });
      fOut.classList.add('is-under'); fIn.classList.add('is-on');
      docs.forEach((d) => d.classList.remove('is-under'));
      bodies.forEach(resetBody);
      docs[prev].classList.add('is-under');
      const imIn = $('img', fIn), imOut = $('img', fOut);
      const done = () => { fOut.classList.remove('is-under'); resetFrame(fOut); };
      gsap.fromTo(fIn, { yPercent: 100 * dir }, { yPercent: 0, duration: 1, ease: 'expo.out', onComplete: done });
      gsap.fromTo(imIn, { yPercent: -100 * dir, scale: 1.12 }, { yPercent: 0, scale: 1, duration: 1, ease: 'expo.out' });
      gsap.to(imOut, { yPercent: -14 * dir, duration: 1, ease: 'expo.out' });
      gsap.fromTo(bIn, { clipPath: dir > 0 ? 'inset(100% 0% 0% 0% round 12px)' : 'inset(0% 0% 100% 0% round 12px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 12px)', duration: 0.85, ease: 'expo.out', delay: 0.06, clearProps: 'clipPath', onComplete: () => docs[prev].classList.remove('is-under') });
      gsap.fromTo([...bIn.children].filter((c) => c.offsetParent), { y: 16 * dir, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.04, delay: 0.14, clearProps: 'transform,opacity,visibility' });
      gsap.fromTo(num, { yPercent: 100 * dir }, { yPercent: 0, duration: 0.7, ease: 'expo.out', clearProps: 'transform' });
    }
    heads.forEach((h, i) => {
      h.addEventListener('click', () => { if (deskMq.matches) set(i); });
      h.addEventListener('focus', () => { if (deskMq.matches) set(i); });
      h.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || !deskMq.matches) return;
        clearTimeout(ht); ht = setTimeout(() => set(i), 110);
      });
      h.addEventListener('pointerleave', () => clearTimeout(ht));
      h.addEventListener('keydown', (e) => {
        const d = { ArrowDown: 1, ArrowUp: -1, Home: -99, End: 99 }[e.key];
        if (!d || !deskMq.matches) return;
        e.preventDefault();
        heads[Math.max(0, Math.min(docs.length - 1, i + d))].focus();
      });
    });
    mode();
    (deskMq.addEventListener ? deskMq.addEventListener('change', mode) : deskMq.addListener(mode));
    if ('ResizeObserver' in window) { let rq = 0; new ResizeObserver(() => { cancelAnimationFrame(rq); rq = requestAnimationFrame(() => { sizeCards(); placeInd(); }); }).observe(inn); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { sizeCards(); placeInd(); });
    hScroller($('.docs__list', docsSec), $('.docs__ctl', docsSec));
    /* عکس‌های بزرگ پیش از رسیدن به بخش رمزگشایی می‌شوند تا پرده هیچ‌وقت روی قاب خالی کشیده نشود */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ents) => {
        if (!ents.some((en) => en.isIntersecting)) return;
        io.disconnect();
        $$('.docs__img img, .doc__av img', docsSec).forEach((im) => { im.loading = 'eager'; if (im.decode) im.decode().catch(() => {}); });
      }, { rootMargin: '600px 0px' });
      io.observe(docsSec);
    }
    Docs.build = function () {
      const desk = deskMq.matches;
      this.ctx = gsap.context(() => {
        gsap.from(docsSec.querySelectorAll('.sec-head .sec-sub'), { y: 22, autoAlpha: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: docsSec, start: 'top 72%' } });
        if (desk) {
          const frame = $('.docs__frame', docsSec);
          gsap.timeline({ scrollTrigger: { trigger: inn, start: 'top 76%' } })
            .from(heads, { y: 26, autoAlpha: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }, 0)
            .from(ind, { autoAlpha: 0, duration: 0.8, ease: 'power2.out', clearProps: 'opacity,visibility' }, 0.3)
            .fromTo(frame, { clipPath: 'inset(100% 0% 0% 0% round 12px)' }, { clipPath: 'inset(0% 0% 0% 0% round 12px)', duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath' }, 0)
            .from($('img', frames[cur]), { scale: 1.3, yPercent: 6, duration: 1.8, ease: 'expo.out', clearProps: 'transform' }, 0.15)
            .from(bodies[cur], { y: 48, autoAlpha: 0, duration: 1.1, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }, 0.55)
            .from($('.docs__count', docsSec), { y: -12, autoAlpha: 0, duration: 0.8, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }, 0.8);
        } else {
          gsap.from(docs, { y: 34, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: inn, start: 'top 86%' } });
        }
      });
    };
    Docs.kill = function () {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      frames.forEach(resetFrame); bodies.forEach(resetBody);
      frames.forEach((f, k) => { f.classList.toggle('is-on', k === cur); f.classList.remove('is-under'); });
      docs.forEach((d) => d.classList.remove('is-under'));
    };
  }

  /* ==========================================================================
     ایمنی و استریل: چرخه‌ی چهارمرحله‌ای. با دیده شدن بخش یک بار پخش می‌شود (و با برگشتن دوباره):
     نقطه‌ی نورانی روی حلقه از هر ایستگاه به ایستگاه بعد می‌رود، ایستگاه‌ها روشن می‌شوند و متن وسط عوض می‌شود.
     حلقه روی بوم کشیده می‌شود تا حرکتش کل صفحه را دوباره رسم نکند؛ مرحله‌ها قابل کلیک‌اند
     ========================================================================== */
  const SAFE_T = [['شست‌وشو', 'بعد از هر بیمار'], ['بسته‌بندی', 'پاکت استریل با تاریخ'], ['اتوکلاو', 'بخار داغ و فشار'], ['جلوی شما', 'بسته همان‌جا باز می‌شود']];
  const Safe = {
    always: true,
    build() {
      const sec = $('#safety'); if (!sec) return;
      const fx = $('.sfx', sec), cv = $('.sfx__cv', sec), ctx = cv && cv.getContext ? cv.getContext('2d') : null;
      const nodes = $$('.sfx__node', sec), items = $$('.sf', sec), bars = $$('.sf__bar i', sec);
      const mid = { no: $('.sfx__no', sec), t: $('.sfx__t', sec), s: $('.sfx__s', sec) };
      const anim = Motion.on && !root.classList.contains('rm') && !!window.gsap;
      const st = { p: anim ? 0 : 4 };
      let W = 0, dpr = 1, cur = -2;
      const draw = () => {
        if (!ctx || !W) return;
        const c = W / 2, R = W * 0.375, lw = Math.max(7, W * 0.024), TAU = Math.PI * 2;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, W);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.strokeStyle = '#E3EAF2'; ctx.lineWidth = lw; ctx.stroke();
        /* خط‌های ریز دور حلقه، مثل صفحه‌ی ساعت دستگاه */
        ctx.strokeStyle = '#D5DEEA'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 48; k++) { if (k % 12 === 0) continue; const a = k / 48 * TAU, r1 = R + lw * 1.3, r2 = r1 + (k % 4 ? 4 : 8); ctx.beginPath(); ctx.moveTo(c + r1 * Math.cos(a), c + r1 * Math.sin(a)); ctx.lineTo(c + r2 * Math.cos(a), c + r2 * Math.sin(a)); ctx.stroke(); }
        const f = Math.max(0, Math.min(1, st.p / 4)), a0 = -Math.PI / 2, a1 = a0 + f * TAU;
        if (f <= 0) return;
        let g = '#0FA58F';
        if (ctx.createConicGradient) { g = ctx.createConicGradient(a0, c, c); g.addColorStop(0, '#1E5EEB'); g.addColorStop(0.5, '#2AA7D6'); g.addColorStop(1, '#0FA58F'); }
        ctx.beginPath(); ctx.arc(c, c, R, a0, a1); ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.stroke();
        if (f < 1) {
          const hx = c + R * Math.cos(a1), hy = c + R * Math.sin(a1);
          ctx.save(); ctx.shadowColor = 'rgba(30, 94, 235, .55)'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(hx, hy, lw * 0.95, 0, TAU); ctx.fill(); ctx.restore();
          ctx.beginPath(); ctx.arc(hx, hy, lw * 0.42, 0, TAU); ctx.fillStyle = '#1E5EEB'; ctx.fill();
        }
      };
      const size = () => {
        W = cv.clientWidth; dpr = Math.min(2, window.devicePixelRatio || 1);
        if (!W || !ctx) return;
        cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr);
        draw();
      };
      const swapMid = (i) => {
        const txt = i >= 4 ? ['۴ مرحله', 'برای هر ست ابزار', 'بعد از هر بیمار'] : [toFa(String(i + 1).padStart(2, '0')), SAFE_T[i][0], SAFE_T[i][1]];
        const put = () => { mid.no.textContent = txt[0]; mid.t.textContent = txt[1]; mid.s.textContent = txt[2]; };
        if (!anim || typeof mid.no.animate !== 'function') { put(); return; }
        const els = [mid.no, mid.t, mid.s];
        els.forEach((el, k) => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0, -8px, 0)' }], { duration: 160, delay: k * 25, easing: 'ease-in', fill: 'forwards' }));
        setTimeout(() => {
          put();
          els.forEach((el, k) => { el.getAnimations().forEach((a) => a.cancel()); el.animate([{ opacity: 0, transform: 'translate3d(0, 12px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: k * 50, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' }); });
        }, 220);
      };
      /* مرحله‌ی i فعال است وقتی p بین i و i+1 است؛ p = ۴ یعنی چرخه کامل شد */
      const stage = () => {
        const i = st.p >= 4 ? 4 : Math.floor(st.p + 1e-6);
        if (i === cur) return;
        cur = i;
        nodes.forEach((n, k) => { n.classList.toggle('is-on', k === i); n.classList.toggle('is-done', k < i); });
        items.forEach((it, k) => {
          it.classList.toggle('is-on', k === i || (i === 4 && !anim));
          it.classList.toggle('is-done', k < i);
          const b = $('.sf__btn', it);
          if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        });
        swapMid(i);
      };
      this.draw = draw;
      size();
      this.ro = 'ResizeObserver' in window ? new ResizeObserver(size) : null;
      if (this.ro) this.ro.observe(fx);
      if (!anim) { st.p = 4; cur = -2; stage(); draw(); items.forEach((it) => it.classList.remove('is-on')); return; }
      stage();

      /* ایستادن کوتاه روی هر ایستگاه، بعد رفتن به ایستگاه بعد؛ نوار زیر مرحله هم‌زمان پر می‌شود */
      const HOLD = 1, MOVE = 1.15;
      let lastP = -1;
      const tl = gsap.timeline({ paused: true, onUpdate: () => { if (st.p !== lastP) { lastP = st.p; draw(); } stage(); } });
      for (let i = 0; i < 4; i++) {
        tl.addLabel('s' + i)
          .set(bars, { scaleX: (k) => (k < i ? 1 : 0), opacity: 1 }, 's' + i)
          .to(bars[i], { scaleX: 1, duration: HOLD + MOVE, ease: 'none' }, 's' + i)
          .to(st, { p: i + 1, duration: MOVE, ease: 'power2.inOut' }, `s${i}+=${HOLD}`);
      }
      /* چرخه کامل شد: نوارها آرام محو می‌شوند */
      tl.to(bars, { opacity: 0, duration: 0.6, ease: 'power1.out' }, '+=0.3').set(bars, { scaleX: 0, opacity: 1 });
      this.tl = tl;
      items.forEach((it, i) => $('.sf__btn', it).addEventListener('click', () => {
        tl.pause(); st.p = i; draw(); stage();
        tl.seek('s' + i, false); tl.play();
      }));
      let visible = false;
      this.io = new IntersectionObserver((es) => {
        const on = es.some((e) => e.isIntersecting);
        if (on === visible) return;
        visible = on;
        if (!on) { tl.pause(); return; }
        if (tl.progress() === 0 || tl.progress() === 1) { st.p = 0; tl.restart(); } else tl.resume();
      }, { threshold: 0.35 });
      this.io.observe(fx);
      gsap.set(bars, { scaleX: 0 });
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      if (this.ro) { this.ro.disconnect(); this.ro = null; }
      if (this.tl) { this.tl.kill(); this.tl = null; }
      const sec = $('#safety'); if (!sec) return;
      if (window.gsap) gsap.set($$('.sf__bar i', sec), { clearProps: 'transform' });
      $$('.sfx__node, .sf', sec).forEach((el) => el.classList.remove('is-on', 'is-done'));
      $$('.sfx__mid > *', sec).forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    }
  };

  const Reviews = {
    ctx: null,
    build() {
      const sec = $('#reviews'); if (!sec) return;
      this.ctx = gsap.context(() => {
        gsap.from(sec.querySelectorAll('.sec-head .kicker, .sec-title, .rv-nav'), { y: 26, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: sec, start: 'top 78%' } });
        gsap.from('.rv-sum', { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.rv', start: 'top 82%' } });
        gsap.fromTo('.rv-bars i', { '--grow': 0 }, { '--grow': 1, duration: 1.3, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.rv-bars', start: 'top 88%' } });
        gsap.from('.rv-tabs', { y: 14, autoAlpha: 0, duration: 0.7, ease: 'expo.out', scrollTrigger: { trigger: '.rv', start: 'top 82%' } });
        gsap.from('.rv-card', { x: -40, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.rv-track', start: 'top 85%' } });
        ScrollTrigger.create({ trigger: '.rv-sum', start: 'top 85%', once: true, onEnter: () => counters($('.rv-sum'), true) });
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      counters($('.rv-sum'), false);
    }
  };

  /* ==========================================================================
     سه بخش (مدل ۴۰): یک تصویر در سه کارت؛ فاصله باز می‌شود و کارت‌ها می‌چرخند
     ========================================================================== */
  const Depts = {
    ctx: null,
    flipped: false,
    setGap: null,
    setFlip: null,
    build() {
      const sec = $('#services'), stage = $('.depts__stage', sec), deck = $('#deck', sec);
      const cards = $$('.pcard', deck), head = $('.depts__head', sec);
      const mob = isMob();
      const axis = mob ? 'rotationX' : 'rotationY';
      let gapOn = false, flipOn = false;
      /* پشت و روی کارت را خودمان نشان می‌دهیم یا پنهان می‌کنیم؛ روی بعضی کارت‌های گرافیک backface-visibility
         برای لایه‌های متحرک داخل کارت کار نمی‌کند و پشت کارت از روی عکس پیدا می‌شد */
      const cull = (c) => { c.classList.toggle('is-back', Math.abs(gsap.getProperty(c, axis)) > 90); };
      cards.forEach(cull);

      this.ctx = gsap.context(() => {
        /* فاصله و بادبزن هر کارت در یک transform جمع می‌شوند؛ عکس یکپارچه همان لحظه‌ی باز شدن کنار می‌رود
           و موقع بسته شدن، بعد از جفت شدن دوباره‌ی کارت‌ها برمی‌گردد (CSS) */
        const st = this.st = cards.map(() => ({ gx: 0, gy: 0, fx: 0, fy: 0, rz: 0 }));
        const put = (i) => { const o = st[i]; gsap.set(cards[i], { x: o.gx + o.fx, y: o.gy + o.fy, rotationZ: o.rz }); };
        const GAP = mob ? [[0, -12], [0, 0], [0, 12]] : [[22, 0], [0, 0], [-22, 0]];
        const setGap = (on) => {
          if (on === gapOn) return; gapOn = on;
          deck.classList.toggle('is-open', on);
          cards.forEach((c, i) => gsap.to(st[i], { gx: on ? GAP[i][0] : 0, gy: on ? GAP[i][1] : 0, duration: 0.9, ease: 'expo.out', overwrite: 'auto', onUpdate: () => put(i) }));
        };
        const setFlip = (on) => {
          if (on === flipOn) return; flipOn = on; this.flipped = on;
          deck.classList.toggle('is-flipped', on);
          /* مثل نمونه: کارت‌ها یکی‌یکی و آرام برمی‌گردند */
          const order = on ? cards : cards.slice().reverse();
          order.forEach((c, k) => {
            const i = cards.indexOf(c), side = i === 0 ? 0 : i === 2 ? 1 : -1;
            const fan = !on || side < 0 ? { fx: 0, fy: 0, rz: 0 } : mob ? { fx: [5, -5][side], fy: 0, rz: [-2, 2][side] } : { fx: [26, -26][side], fy: 24, rz: [8, -8][side] };
            gsap.to(c, { [axis]: on ? (mob ? -180 : 180) : 0, ...(mob ? {} : { rotationX: 0 }), duration: 1.05, ease: 'power3.inOut', delay: k * 0.17, overwrite: 'auto', onUpdate: () => cull(c), onComplete: () => cull(c) });
            gsap.to(st[i], { ...fan, duration: 1.05, ease: 'power3.inOut', delay: k * 0.17, overwrite: 'auto', onUpdate: () => put(i) });
          });
        };
        this.setGap = setGap; this.setFlip = setFlip;

        const SKY = Aurora.SKY;
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: sec, start: 'top top', end: () => '+=' + window.innerHeight * (mob ? 2.4 : 3.2),
            pin: stage, scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: (self) => { setGap(self.progress >= 0.34); setFlip(self.progress >= 0.64); }
          }
        });
        /* اول یک عکس یکپارچه که آرام کوچک می‌شود تا در قاب بنشیند (مثل نمونه) */
        tl.fromTo(deck, { scale: mob ? 1.06 : 1.16, y: mob ? 14 : 50 }, { scale: 1, y: 0, duration: 0.3 }, 0)
          .to({}, { duration: 0.7 }, 0.3);
        /* آسمان بخش: آبی و بنفش ← بنفش و صورتی ← فیروزه‌ای و سبزآبی */
        tl.fromTo(SKY, { a: 1, b: 0 }, { a: 0.2, b: 1, duration: 0.26 }, 0.3)
          .fromTo(SKY, { c: 0 }, { c: 1, b: 0.3, duration: 0.26, immediateRender: false }, 0.62);

        /* تیتر بخش هنگام نزدیک شدن ظاهر می‌شود */
        gsap.fromTo(head.querySelectorAll('.kicker, .depts__title, .depts__sub, .link-arrow'), { autoAlpha: 0, y: 30 }, {
          autoAlpha: 1, y: 0, ease: 'power2.out', stagger: 0.1,
          scrollTrigger: { trigger: sec, start: 'top 80%', end: 'top 20%', scrub: 0.6 }
        });
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      const deck = $('#deck'), cards = $$('.pcard', deck);
      gsap.killTweensOf([deck, ...cards, ...(this.st || [])]);
      this.st = null;
      gsap.set([deck, ...cards, ...$$('.depts__head .kicker, .depts__title, .depts__sub, .depts__head .link-arrow')], { clearProps: 'all' });
      deck.classList.remove('is-flipped', 'is-open');
      cards.forEach((c) => c.classList.remove('is-back'));
      Object.assign(Aurora.SKY, { a: 1, b: 0, c: 0, hover: 0 });
      this.flipped = false; this.setGap = this.setFlip = null;
    },
    reveal() { if (this.setGap) { this.setGap(true); this.setFlip(true); } }
  };
  $$('.pcard').forEach((c) => c.addEventListener('focus', () => { if (!Depts.flipped) Depts.reveal(); }));
  /* رنگ کارتی که زیر نشانگر است آرام در آسمان پشت کارت‌ها پخش می‌شود */
  const deptsSec = $('#services');
  $$('.pcard').forEach((c) => {
    const on = () => {
      if (!Depts.flipped) return;
      const r = c.getBoundingClientRect(), sr = deptsSec.getBoundingClientRect();
      Aurora.SKY.hx = (r.left + r.width / 2 - sr.left) / sr.width;
      Aurora.SKY.hc = getComputedStyle(c).getPropertyValue('--a1').trim().split(/\s+/).map(Number);
      gsap.to(Aurora.SKY, { hover: 1, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    };
    const off = () => gsap.to(Aurora.SKY, { hover: 0, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
    c.addEventListener('pointerenter', on);
    c.addEventListener('focus', on);
    c.addEventListener('pointerleave', off);
    c.addEventListener('blur', off);
  });


  /* ==========================================================================
     نمای بخش: از خود کارت باز می‌شود و به همان کارت برمی‌گردد
     ========================================================================== */
  const view = $('#svc');
  const vscroll = $('.svc__scroll', view);
  vscroll.addEventListener('scroll', () => Aurora.hold(220), { passive: true });
  let current = null, opener = null;

  function fill(key) {
    const d = SVC[key];
    view.dataset.k = key;
    $('#svcTitle').textContent = d.title;
    $('#svcCrumb').textContent = 'خدمات / ' + d.title;
    $('#svcLead').textContent = d.lead;
    $('#svcIc use').setAttribute('href', '#i-' + d.icon);
    $('#svcSlot').textContent = Clinic.avail(key);
    $('#svcList').innerHTML = d.items.map((it) => `
      <article class="svc__item">
        <b>${it[0]}</b>
        <p>${it[1]}</p>
        <span class="svc__dur"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg>${it[2]}</span>
      </article>`).join('');
  }
  /* لایه‌ی انتقال: از قاب کارت تا تمام صفحه بزرگ می‌شود و برعکس. گرادیانش همان گرادیان پشت کارت و زمینه‌ی صفحه است،
     و چرخش و جابه‌جایی کارت را هم کپی می‌کند؛ پس خود کارت تکان نمی‌خورد و رنگ هیچ‌جا نمی‌پرد */
  const morph = document.createElement('div');
  morph.className = 'svc-morph'; morph.hidden = true; morph.setAttribute('aria-hidden', 'true');
  document.body.appendChild(morph);
  const svcBg = $('.svc__bg', view);
  Aurora.mount(morph); Aurora.mount(svcBg);
  Aurora.add(morph, { top: true }); Aurora.add(svcBg, { top: true });
  /* گرادیان پشت هر کارت فقط وقتی کارت برگشته است زنده می‌ماند */
  $$('.pcard').forEach((c) => {
    const back = $('.pcard__back', c);
    Aurora.mount(back);
    Aurora.add(back, { probe: c, gate: () => c.classList.contains('is-back') || !root.classList.contains('motion') });
  });
  const dsky = $('.dsky'), fsky = $('.fsky');
  if (dsky) Aurora.add(dsky, { canvas: $('.dsky__cv', dsky), paint: Aurora.paintSky, probe: $('#services') });
  if (fsky) Aurora.add(fsky, { canvas: $('.fsky__cv', fsky), paint: Aurora.paintFoot, probe: $('.foot') });
  /* حرکت ستاره‌ها و مدارها فقط وقتی بخش دیده می‌شود */
  Aurora.watch($('#services')); Aurora.watch($('.foot'));
  const viewParts = () => [$('.svc__top', view), ...$('.svc__hero', view).children, $('.svc__main', view)];
  const isCard = (el) => !!(el && el.classList && el.classList.contains('pcard'));
  /* هندسه‌ی دیداری کارت: مرکز، اندازه و چرخش (چرخش و جابه‌جایی GSAP به‌اضافه‌ی translate خود کارت) */
  const cardGeo = (card) => {
    const x = gsap.getProperty(card, 'x'), y = gsap.getProperty(card, 'y'), rot = gsap.getProperty(card, 'rotationZ');
    gsap.set(card, { x: 0, y: 0, rotationZ: 0 });
    const r = card.getBoundingClientRect();
    gsap.set(card, { x, y, rotationZ: rot });
    const cs = getComputedStyle(card), o = cs.transformOrigin.split(' ').map(parseFloat);
    const w = r.width, h = r.height, dx = w / 2 - o[0], dy = h / 2 - o[1], t = rot * Math.PI / 180;
    return {
      cx: r.left + o[0] + x + dx * Math.cos(t) - dy * Math.sin(t),
      cy: r.top + o[1] + y + dx * Math.sin(t) + dy * Math.cos(t),
      w, h, rot, radius: parseFloat(cs.borderTopLeftRadius) || 6
    };
  };
  const rectGeo = (el) => { const r = el.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height, rot: 0, radius: 6 }; };
  const onScreen = (g) => g && g.cy + g.h / 2 > 0 && g.cy - g.h / 2 < window.innerHeight && g.w > 0;
  /* لایه‌ی تمام‌صفحه را روی قاب کارت می‌نشاند؛ گوشه‌ها با مقیاس جبران می‌شوند تا گرد بمانند */
  const M = { p: 0, from: null };
  const morphAt = (p) => {
    const g = M.from, W = morph.offsetWidth || window.innerWidth, H = morph.offsetHeight || window.innerHeight;
    const sx = gsap.utils.interpolate(g.w / W, 1, p), sy = gsap.utils.interpolate(g.h / H, 1, p);
    const x = gsap.utils.interpolate(g.cx - W / 2, 0, p), y = gsap.utils.interpolate(g.cy - H / 2, 0, p);
    const rad = g.radius * (1 - ease01(p / 0.3));
    gsap.set(morph, { x, y, scaleX: sx, scaleY: sy, rotation: g.rot * (1 - p), borderRadius: rad > 0.05 ? `${rad / sx}px / ${rad / sy}px` : 0 });
  };
  const morphShow = (key, g, p) => {
    morph.dataset.k = key; morph.hidden = false;
    Aurora.refresh(morph); Aurora.now(morph);
    M.from = g; M.p = p; morphAt(p);
  };
  /* قفل اسکرول صفحه‌ی زیرین؛ اگر نوار اسکرول واقعی هست، جایش نگه داشته می‌شود تا صفحه تکان نخورد */
  const lockScroll = S.lockScroll;
  const showView = () => {
    view.hidden = false;
    Aurora.refresh(svcBg); Aurora.now(svcBg);
  };
  /* وقتی صفحه‌ی بخش کل صفحه را پوشانده، صفحه‌ی زیرین نه رسم می‌شود نه ترکیب؛ پیمایش صفحه‌ی بخش سبک می‌ماند */
  const cover = (on) => root.classList.toggle('svc-open', on);

  function openSvc(key, from, push = true) {
    if (!SVC[key]) return;
    current = key; opener = from || null;
    fill(key);
    vscroll.scrollTop = 0;
    const card = isCard(from) ? from : null;
    const g = Motion.on && from ? (card ? cardGeo(card) : rectGeo(from)) : null;
    lockScroll(true);
    Motion.pause();
    if (push) { try { history.pushState({ svc: key }, '', '#' + key); } catch (e) { /* محیط محدود */ } }
    const parts = viewParts();
    gsap.killTweensOf([morph, M, view, ...parts]);

    if (!g) {
      showView(); morph.hidden = true; cover(true);
      if (Motion.on) gsap.fromTo(view, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out', clearProps: 'opacity' });
      setTimeout(() => $('#svcBack').focus({ preventScroll: true }), 50);
      return;
    }

    Aurora.hold(1400);
    morphShow(key, g, 0);
    gsap.set(morph, { opacity: 0 });
    const art = $$('.aur__art, .aur__sp svg', morph);
    gsap.timeline()
      /* متن پشت کارت آرام زیر گرادیان محو می‌شود، بعد قاب با شتاب نرم تا لبه‌های صفحه باز می‌شود */
      .to(morph, { opacity: 1, duration: card ? 0.26 : 0.18, ease: 'power1.out' }, 0)
      .to(M, { p: 1, duration: 1, ease: 'expo.inOut', onUpdate: () => morphAt(M.p) }, card ? 0.08 : 0)
      .fromTo(art, { opacity: 1 }, { opacity: 0.4, duration: 1, ease: 'power1.inOut' }, card ? 0.08 : 0)
      .add(() => {
        showView();
        gsap.set(parts, { opacity: 0, y: 24 });
        gsap.to(parts, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06, clearProps: 'transform,opacity' });
        /* لایه یک فریم بعد کنار می‌رود تا زمینه‌ی صفحه حتماً رسم شده باشد */
        requestAnimationFrame(() => { if (current === key) { morph.hidden = true; gsap.set(art, { clearProps: 'opacity' }); cover(true); } });
        $('#svcBack').focus({ preventScroll: true });
      });
  }

  function closeSvc() {
    if (!current) return;
    const key = current; current = null;
    const card = $(`.pcard[data-svc="${key}"]`);
    cover(false);
    const finish = () => {
      view.hidden = true; morph.hidden = true;
      gsap.set([view, ...viewParts()], { clearProps: 'opacity,transform' });
      gsap.set($$('.aur__art, .aur__sp svg', morph), { clearProps: 'opacity' });
      lockScroll(false);
      Motion.resume();
      const back = opener && document.contains(opener) && opener.offsetParent !== null ? opener : card;
      if (back) back.focus({ preventScroll: true });
    };
    const parts = viewParts();
    gsap.killTweensOf([morph, M, view, ...parts]);
    if (!Motion.on) { finish(); return; }

    const g = card ? cardGeo(card) : null;
    const target = onScreen(g) ? g : null;
    gsap.timeline()
      .to(parts, { opacity: 0, y: 12, duration: 0.24, ease: 'power2.in', stagger: 0.015 })
      .add(() => {
        if (!target) { gsap.to(view, { opacity: 0, duration: 0.4, ease: 'power1.inOut', onComplete: finish }); return; }
        /* لایه دقیقاً جای زمینه‌ی صفحه را می‌گیرد (همان گرادیان در همان اندازه) و به قاب کارت برمی‌گردد */
        const art = $$('.aur__art, .aur__sp svg', morph);
        Aurora.hold(1300);
        morphShow(key, target, 1);
        gsap.set(morph, { opacity: 1 });
        gsap.set(art, { opacity: 0.4 });
        requestAnimationFrame(() => {
          if (current) return;
          view.hidden = true;
          gsap.timeline({ onComplete: finish })
            .to(art, { opacity: 1, duration: 1, ease: 'power1.inOut' }, 0)
            .to(M, { p: 0, duration: 1, ease: 'expo.inOut', onUpdate: () => morphAt(M.p) }, 0)
            .to(morph, { opacity: 0, duration: 0.32, ease: 'power1.inOut' }, 0.8);
        });
      });
  }

  const clearHash = () => { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* محیط محدود */ } };
  const goBack = () => {
    if (history.state && history.state.svc) history.back();
    else { closeSvc(); clearHash(); }
  };
  $('#svcBack').addEventListener('click', goBack);
  $$('[data-close-svc]', view).forEach((a) => a.addEventListener('click', () => { closeSvc(); clearHash(); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) goBack(); });
  window.addEventListener('popstate', (e) => {
    const k = e.state && e.state.svc;
    if (k && SVC[k]) { if (current !== k) openSvc(k, $(`.pcard[data-svc="${k}"]`), false); }
    else if (current) closeSvc();
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-svc]');
    if (!a) return;
    e.preventDefault();
    openSvc(a.dataset.svc, a);
  });

  /* ==========================================================================
     مجله: خواندن مقاله. برگه از پایین بالا می‌آید و عکس کارت (یا پیش‌نمایش شناور) تا جای خودش در مقاله پرواز می‌کند؛
     آدرس هر مقاله #mag-… است و دکمه‌ی برگشت مرورگر برگه را می‌بندد
     ========================================================================== */
  const ARTS = window.SasanArticles || [];
  const arEl = $('#ar');
  if (arEl && ARTS.length) {
    const sheet = $('.ar__sheet', arEl), scrim = $('.ar__scrim', arEl), scroller = $('#arScroll'), page = $('#arPage');
    const prog = $('.ar__prog i', arEl), crumb = $('#arCrumb'), allBtn = $('#arAll'), copyBtn = $('#arCopy');
    const EXPO = 'cubic-bezier(.16, 1, .3, 1)';
    const byId = (id) => ARTS.find((a) => a.id === id);
    const can = () => Motion.on && typeof arEl.animate === 'function';
    /* pushed: این برگه خودش یک قدم به تاریخچه اضافه کرده؟ (اگر مستقیم از نشانی آمده، «برگشت» نباید از سایت بیرون برود) */
    let isOpen = false, cur = null, opener = null, pushed = false;
    const CTA = {
      dental: ['سؤالی درباره‌ی دندان‌هایتان دارید؟', 'دندانپزشکی شنبه، یکشنبه، دوشنبه و پنجشنبه از ۱۰ صبح تا ۸ شب پذیرش دارد. برای نوبت یا سؤال با پذیرش تماس بگیرید.'],
      beauty: ['برای مشاوره‌ی زیبایی وقت بگیرید', 'بخش زیبایی و لیزر همه‌روزه با هماهنگی قبلی پذیرش دارد. برای وقت مشاوره با پذیرش تماس بگیرید.'],
      medicine: ['پزشک عمومی همین حالا در کلینیک است', 'پزشک عمومی شبانه‌روز در کلینیک حضور دارد؛ برای ویزیت، تزریقات یا نوار قلب می‌توانید مستقیم مراجعه کنید.']
    };
    const artHTML = (a) => {
      const next = ARTS[(ARTS.indexOf(a) + 1) % ARTS.length], [ct, cp] = CTA[a.k];
      return `<article class="ar-art">
  <header class="ar-head">
    <span class="ar-cat">${a.cat}</span>
    <h2 class="ar-title" id="arTitle">${a.title}</h2>
    <p class="ar-lead">${a.lead}</p>
    <p class="ar-meta"><span><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg>${a.mins} دقیقه مطالعه</span><span>${a.by}</span></p>
  </header>
  <figure class="ar-cover"><img src="${a.img}" alt="${a.alt}" width="1120" height="700" decoding="async"></figure>
  <div class="ar-body">${a.body}</div>
  <section class="ar-cta" aria-label="تماس با کلینیک">
    <b>${ct}</b><p>${cp}</p>
    <div class="ar-cta__acts">
      <a class="btn btn--light" href="tel:+981154611560"><svg class="ic" aria-hidden="true"><use href="#i-phone"/></svg><span dir="ltr">${TEL}</span></a>
      <a class="btn btn--outline-light" href="#book" data-ar-book><svg class="ic" aria-hidden="true"><use href="#i-cal"/></svg>درخواست نوبت</a>
    </div>
  </section>
  <p class="ar-note">این مطلب را پزشکان کلینیک ساسان برای آگاهی عمومی نوشته‌اند و جای معاینه را نمی‌گیرد.</p>
  <a class="ar-next" href="#mag-${next.id}" data-ar-go="${next.id}">
    <span class="ar-next__img"><img src="${next.img}" alt="" width="1120" height="700" loading="lazy" decoding="async"></span>
    <span class="ar-next__txt"><small>مقاله‌ی بعدی · ${next.cat}</small><b>${next.title}</b></span>
    <span class="ar-next__go" aria-hidden="true"><svg class="ic"><use href="#i-arrow"/></svg></span>
  </a>
</article>`;
    };
    const card = (a) => `<a class="ar-card" href="#mag-${a.id}" data-ar-go="${a.id}" data-k="${a.k}">
  <span class="ar-card__img"><img src="${a.img}" alt="" width="1120" height="700" loading="lazy" decoding="async"></span>
  <span class="ar-cat">${a.cat}</span><b>${a.title}</b><small>${a.mins} دقیقه مطالعه · ${a.by}</small>
</a>`;
    const indexHTML = () => `<div class="ar-index">
  <header class="ar-head">
    <span class="ar-kick">مجله‌ی سلامت ساسان</span>
    <h2 class="ar-title" id="arTitle">همه‌ی مقاله‌ها</h2>
    <p class="ar-lead">راهنماهای کوتاه برای پیش و پس از درمان، از سه بخش کلینیک.</p>
  </header>
  <div class="ar-tabs" role="toolbar" aria-label="دسته‌ی مقاله‌ها">
    <button type="button" aria-pressed="true" data-f="all">همه</button>
    <button type="button" aria-pressed="false" data-f="dental">دندانپزشکی</button>
    <button type="button" aria-pressed="false" data-f="beauty">زیبایی و لیزر</button>
    <button type="button" aria-pressed="false" data-f="medicine">پزشکی</button>
  </div>
  <div class="ar-grid">${ARTS.map(card).join('')}</div>
</div>`;

    /* نوار پیشرفت خواندن */
    let praf = 0;
    const setProg = () => {
      praf = 0;
      const m = scroller.scrollHeight - scroller.clientHeight;
      prog.style.transform = `scaleX(${m > 0 ? Math.min(1, scroller.scrollTop / m).toFixed(4) : 0})`;
    };
    scroller.addEventListener('scroll', () => { if (!praf) praf = requestAnimationFrame(setProg); }, { passive: true });

    const wireIndex = () => {
      const tabs = $('.ar-tabs', page), cards = $$('.ar-card', page);
      Pill(tabs, 'aria-pressed');
      $$('button', tabs).forEach((b) => b.addEventListener('click', () => {
        const f = b.dataset.f;
        $$('button', tabs).forEach((t) => t.setAttribute('aria-pressed', String(t === b)));
        const show = cards.filter((c) => f === 'all' || c.dataset.k === f);
        cards.forEach((c) => { c.hidden = !show.includes(c); });
        if (can()) show.forEach((c, i) => c.animate([{ opacity: 0, transform: 'translate3d(0, 14px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: i * 50, easing: EXPO, fill: 'backwards' }));
      }));
    };
    const render = (id) => {
      cur = id;
      const a = id === 'all' ? null : byId(id);
      arEl.dataset.k = a ? a.k : '';
      page.innerHTML = a ? artHTML(a) : indexHTML();
      crumb.textContent = a ? `مجله‌ی سلامت ساسان · ${a.cat}` : 'مجله‌ی سلامت ساسان';
      allBtn.hidden = !a;
      scroller.scrollTop = 0; setProg();
      if (!a) wireIndex();
    };
    const parts = (skipCover) => [...$$('.ar-head > *', page), skipCover ? null : $('.ar-cover', page), $('.ar-tabs', page), $('.ar-body', page), $('.ar-grid', page)].filter(Boolean);
    const stagger = (list, base = 0) => list.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translate3d(0, 18px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: base + i * 60, easing: EXPO, fill: 'backwards' }));

    /* عکسی که از آن پرواز می‌کنیم: پیش‌نمایش شناور روی دسکتاپ، عکس کارت روی موبایل */
    const srcImg = (from) => {
      if (!from) return null;
      if (from.classList.contains('mag__row')) {
        const list = from.closest('.mag__list');
        if (list && list.classList.contains('is-pv')) {
          const on = $$('.mag__pv img.is-on').sort((x, y) => (+y.style.zIndex || 0) - (+x.style.zIndex || 0))[0];
          if (on) return on;
        }
        const m = $('.mag__media img', from);
        return m && m.getClientRects().length ? m : null;
      }
      return $('img', from);
    };
    const fly = (img, d) => {
      const r = img.getBoundingClientRect();
      if (!r.width || !d.width) return null;
      const box = img.closest('.mag__pv, .mag__media, .ar-card__img, .ar-next__img') || img;
      const rad = parseFloat(getComputedStyle(box).borderTopLeftRadius) || 8;
      const c = document.createElement('div');
      c.className = 'ar-fly'; c.setAttribute('aria-hidden', 'true');
      c.innerHTML = `<img src="${img.currentSrc || img.src}" alt="">`;
      document.body.appendChild(c);
      const a = c.animate([
        { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: rad + 'px' },
        { left: d.left + 'px', top: d.top + 'px', width: d.width + 'px', height: d.height + 'px', borderRadius: '12px' }
      ], { duration: 820, easing: 'cubic-bezier(.76, 0, .24, 1)', fill: 'forwards' });
      return { c, a };
    };
    const focusIn = () => setTimeout(() => $('#arBack').focus({ preventScroll: true }), 60);

    function openAr(id, from, push = true) {
      if (id !== 'all' && !byId(id)) return;
      if (isOpen) { swap(id, push); return; }
      isOpen = true; opener = from || null;
      render(id);
      if (push) { try { history.pushState({ ar: id }, '', '#mag-' + id); pushed = true; } catch (e) { /* محیط محدود */ } }
      lockScroll(true); Motion.pause();
      root.classList.add('ar-open');
      arEl.hidden = false;
      if (!can()) { focusIn(); return; }
      const src = srcImg(from), fig = $('.ar-cover', page);
      const dest = src && fig ? fig.getBoundingClientRect() : null;
      const flying = dest && dest.top < window.innerHeight && dest.bottom > 0;
      scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      sheet.animate([{ transform: 'translate3d(0, 56px, 0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 720, easing: EXPO });
      stagger(parts(flying), 140);
      if (flying) {
        fig.style.visibility = 'hidden';
        const f = fly(src, dest);
        if (!f) fig.style.visibility = '';
        else f.a.onfinish = () => {
          fig.style.visibility = '';
          const o = f.c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' });
          o.onfinish = () => f.c.remove();
        };
      }
      focusIn();
    }
    /* جابه‌جایی بین مقاله‌ها داخل همین برگه */
    function swap(id, push) {
      if (id === cur) return;
      if (push) { try { history.replaceState({ ar: id }, '', '#mag-' + id); } catch (e) { /* محیط محدود */ } }
      if (!can()) { render(id); scroller.focus({ preventScroll: true }); return; }
      const out = page.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0, -10px, 0)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = () => { render(id); out.cancel(); stagger(parts()); scroller.focus({ preventScroll: true }); };
    }
    function closeAr() {
      if (!isOpen) return;
      isOpen = false; pushed = false;
      root.classList.remove('ar-open');
      const done = () => {
        arEl.hidden = true; page.innerHTML = ''; cur = null;
        [sheet, scrim].forEach((el) => el.getAnimations().forEach((x) => x.cancel()));
        lockScroll(false); Motion.resume();
        if (opener && document.contains(opener) && opener.getClientRects().length) opener.focus({ preventScroll: true });
      };
      if (!can()) { done(); return; }
      scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 340, easing: 'ease-in', fill: 'forwards' });
      sheet.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate3d(0, 44px, 0)', opacity: 0 }], { duration: 340, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' }).onfinish = done;
    }
    const goBackAr = () => {
      if (pushed && history.state && history.state.ar) history.back();
      else { closeAr(); clearHash(); }
    };

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-article], [data-ar-go]');
      if (!a) return;
      e.preventDefault();
      const id = a.dataset.article || a.dataset.arGo;
      openAr(id, a.closest('.mag__row, .ar-card, .ar-next') || a);
    });
    $('#arBack').addEventListener('click', goBackAr);
    scrim.addEventListener('click', goBackAr);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) goBackAr(); });
    /* «درخواست نوبت»: برگه بسته می‌شود و کپسول نوبت با همان بخش باز می‌شود */
    page.addEventListener('click', (e) => {
      if (!e.target.closest('[data-ar-book]')) return;
      e.preventDefault();
      const k = arEl.dataset.k;
      goBackAr();
      /* کپسول نوبت بعد از بسته شدن برگه (و برگشت تاریخچه) با همان بخش باز می‌شود */
      if (S.Book) { setTimeout(() => S.Book.open({ k }), can() ? 420 : 60); return; }
      setTimeout(() => {
        let t = document.getElementById('book');
        if (t && !t.getClientRects().length && t.dataset.fallback) t = document.getElementById(t.dataset.fallback) || t;
        if (t) Motion.scrollTo(t, -20);
      }, can() ? 420 : 30);
    });
    copyBtn.addEventListener('click', () => {
      const url = location.href.split('#')[0] + '#mag-' + cur;
      const ok = () => {
        copyBtn.classList.add('is-done'); $('use', copyBtn).setAttribute('href', '#i-check');
        clearTimeout(copyBtn._t);
        copyBtn._t = setTimeout(() => { copyBtn.classList.remove('is-done'); $('use', copyBtn).setAttribute('href', '#i-copy'); }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, ok); else ok();
    });
    window.addEventListener('popstate', (e) => {
      const id = e.state && e.state.ar;
      if (id) { if (!isOpen) openAr(id, null, false); else swap(id, false); }
      else if (isOpen) closeAr();
    });
    /* باز شدن مستقیم از نشانی (#mag-…) */
    const fromHash = () => {
      const m = /^#mag-([a-z-]+)$/.exec(location.hash);
      if (!m || (m[1] !== 'all' && !byId(m[1]))) return;
      try { history.replaceState({ ar: m[1] }, '', location.hash); } catch (e) { /* محیط محدود */ }
      openAr(m[1], null, false);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(fromHash, 0));
    else setTimeout(fromHash, 0);
  }

  /* ==========================================================================
     سؤال‌های پرتکرار: فیلتر دسته‌ها و باز و بسته شدن نرم
     ========================================================================== */
  const faqList = $('#faqList');
  if (faqList) {
    const items = $$('.faq-item', faqList);
    const canAnim = () => Motion.on && typeof Element.prototype.animate === 'function';
    const setOpen = (d, open) => {
      const a = $('.faq-item__a', d);
      if (d._anim) { d._anim.cancel(); d._anim = null; }
      d.classList.toggle('is-closing', !open);
      if (!canAnim()) { d.open = open; d.classList.remove('is-closing'); return; }
      if (open) {
        d.open = true;
        d._anim = a.animate([{ height: '0px', opacity: 0 }, { height: a.scrollHeight + 'px', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.22, 1, .36, 1)' });
        d._anim.onfinish = () => { d._anim = null; };
      } else {
        d._anim = a.animate([{ height: a.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' });
        d._anim.onfinish = () => { d.open = false; d.classList.remove('is-closing'); if (d._anim) d._anim.cancel(); d._anim = null; };
      }
    };
    items.forEach((d) => {
      $('summary', d).addEventListener('click', (e) => {
        e.preventDefault();
        setOpen(d, !d.open || d.classList.contains('is-closing'));
      });
    });
    const tabs = $$('.faq-tabs button');
    tabs.forEach((b) => b.addEventListener('click', () => {
      const f = b.dataset.f;
      tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === b)));
      faqList.dataset.f = f;
      const show = items.filter((d) => f === 'all' || d.dataset.k === f);
      items.forEach((d) => { d.hidden = !show.includes(d); });
      show.forEach((d) => { d.classList.remove('is-pre'); Reveal.stop(d); if (Reveal.io) Reveal.io.unobserve(d); });
      if (Motion.on && window.gsap) gsap.fromTo(show, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.045, overwrite: true, clearProps: 'opacity,transform' });
    }));
  }

  /* ==========================================================================
     مسیر و تماس: وضعیت باز/بسته، روز جاری، کپی نشانی، فرم تماس
     ========================================================================== */
  const vs = $('#visitStatus');
  const paintHours = () => {
    if (vs) $('.visit__status-text', vs).textContent = Clinic.status().text;
    const dOpen = Clinic.dental().open;
    $$('#hours li').forEach((li) => li.classList.toggle('is-now', li.dataset.k === 'medicine' || (li.dataset.k === 'dental' && dOpen)));
    const d = Clinic.today();
    $$('#dentalDays li').forEach((li) => li.classList.toggle('is-today', +li.dataset.d === d));
  };
  paintHours();
  setInterval(paintHours, 60 * 1000);

  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    const lab = $('span', b), use = $('use', b);
    b._old = b._old || lab.textContent;
    let ok = false;
    try { await navigator.clipboard.writeText(b.dataset.copy); ok = true; } catch (e) { /* دسترسی به کلیپ‌بورد نیست */ }
    if (!ok) {
      try {
        const t = document.createElement('textarea');
        t.value = b.dataset.copy; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(t); t.select(); ok = document.execCommand('copy'); t.remove();
      } catch (e) { /* مرورگر اجازه نداد */ }
    }
    lab.textContent = ok ? 'کپی شد' : 'کپی نشد؛ نشانی را دستی بردارید';
    b.classList.toggle('is-done', ok);
    use.setAttribute('href', ok ? '#i-check' : '#i-copy');
    clearTimeout(b._t);
    b._t = setTimeout(() => { lab.textContent = b._old; b.classList.remove('is-done'); use.setAttribute('href', '#i-copy'); }, 2400);
  }));

  const cb = $('#callback');
  if (cb) {
    const fName = $('[name="name"]', cb), fTel = $('[name="tel"]', cb), msg = $('#callbackMsg');
    const digits = (v) => v.replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
    const normTel = (v) => digits(v).replace(/[\s\-().]/g, '').replace(/^(\+98|0098)/, '0');
    const mark = (f, bad) => { f.closest('.field').classList.toggle('is-bad', bad); f.setAttribute('aria-invalid', String(bad)); };
    [fName, fTel].forEach((f) => f.addEventListener('input', () => mark(f, false)));
    const cbBtn = $('.callback__submit', cb);
    cb.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (cbBtn.classList.contains('is-busy')) return;
      const n = fName.value.trim(), t = normTel(fTel.value);
      const badName = n.length < 2, badTel = !/^09\d{9}$/.test(t);
      mark(fName, badName); mark(fTel, badTel);
      msg.classList.toggle('is-bad', badName || badTel);
      if (badName || badTel) {
        swap(msg, `<b>${badName ? 'نامتان را بنویسید تا پذیرش بداند با چه کسی صحبت می‌کند.' : 'شماره‌ی موبایل را کامل و با ۰۹ بنویسید؛ مثلاً ۰۹۱۲ ۱۲۳ ۴۵۶۷.'}</b>`);
        if (badName) shake(fName.closest('.field'));
        if (badTel) shake(fTel.closest('.field'));
        (badName ? fName : fTel).focus();
        return;
      }
      /* اگر سرور کلینیک هست (متای sasan-api)، درخواست واقعاً برای پذیرش ثبت می‌شود */
      const api = $('meta[name="sasan-api"]');
      const sent = api ? fetch(api.content.replace(/\/$/, '') + '/callback', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name: n, mobile: t, topic: ($('[name="topic"]', cb) || {}).value || '' }) }).then((r) => r.json()).catch(() => ({ ok: false })) : Promise.resolve({ ok: true });
      const [res] = await Promise.all([sent, busy(cbBtn, 700)]);
      if (!res.ok) {
        msg.classList.add('is-bad');
        swap(msg, `<b>${res.error === 'rate' ? 'برای این شماره تازه درخواست ثبت شده است.' : 'ثبت درخواست الان ممکن نشد.'}</b><span>لطفاً مستقیم با <a href="tel:+981154611560" dir="ltr">${TEL}</a> تماس بگیرید.</span>`);
        return;
      }
      const pretty = toFa(`${t.slice(0, 4)} ${t.slice(4, 7)} ${t.slice(7)}`);
      swap(msg, `<b>ممنون ${n}؛ درخواستتان ثبت شد.</b><span>پذیرش بین ۳۰ دقیقه تا ۴ ساعت بعد با شماره‌ی <bdi dir="ltr">${pretty}</bdi> تماس می‌گیرد و زمان مراجعه را هماهنگ می‌کند. اگر عجله دارید، همین حالا با <a href="tel:+981154611560" dir="ltr">${TEL}</a> تماس بگیرید.</span>`);
      if (anim()) {
        const old = cbBtn.innerHTML;
        cbBtn.classList.add('is-ok');
        cbBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>درخواست ثبت شد';
        gsap.fromTo($('.ic', cbBtn), { scale: 0, rotation: -60 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(3)' });
        setTimeout(() => { cbBtn.classList.remove('is-ok'); cbBtn.innerHTML = old; }, 2800);
      }
      cb.reset();
    });
  }

  /* ==========================================================================
     نقشه‌ی مسیر: نقشه‌ی واقعی سلمان‌شهر و سه راه رسیدن به کلینیک
     دوربین با transform جابه‌جا می‌شود، مسیرها یک بار کشیده می‌شوند و نقطه‌های متحرک فقط transform دارند
     ========================================================================== */
  const WORLD = { x: -1200, y: -700, w: 3300, h: 2000 };
  const MapFx = {
    always: true,
    build() {
      const map = $('#vmap');
      if (!map || !window.gsap) return;
      const view = $('.vmap__view', map), world = $('#vworld'), pin = $('.vpin', map);
      const R = {};
      ['a', 'b', 'c'].forEach((k) => {
        const g = $(`.rt--${k}`, map);
        R[k] = { k, g, line: $('.rt__line', g), glow: $('.rt__glow', g), head: $(`.vhead--${k}`, map), org: $(`.vorg--${k}`, map), tag: $(`.vtag--${k}`, map), btn: $(`.vroute[data-r="${k}"]`, map) };
        R[k].len = R[k].line.getTotalLength();
      });
      const cam = { s: 1, tx: 0, ty: 0, k: 1 };
      /* ناحیه‌ای که باید دیده شود؛ روی صفحه‌ی باریک جنوب شهر کمتر و مسیر جاده از لبه وارد می‌شود */
      const region = () => {
        const r = view.clientWidth / Math.max(1, view.clientHeight);
        if (r > 1.9) return { x0: -640, x1: 1880, y0: -420, y1: 610 };
        if (r > 1.25) return { x0: -600, x1: 1300, y0: -470, y1: 640 };
        return { x0: -560, x1: 940, y0: -470, y1: 620 };
      };
      const toPx = (x, y) => [(x - WORLD.x) * cam.s, (y - WORLD.y) * cam.s];
      const apply = () => {
        const [cx, cy] = toPx(0, 0);
        world.style.transformOrigin = `${cx}px ${cy}px`;
        world.style.transform = `translate3d(${cam.tx}px, ${cam.ty}px, 0) scale(${cam.k})`;
      };
      const layout = () => {
        const bw = view.clientWidth, bh = view.clientHeight, g = region();
        const rw = g.x1 - g.x0, rh = g.y1 - g.y0;
        cam.s = Math.min(bw / rw, bh / rh);
        const W = WORLD.w * cam.s, H = WORLD.h * cam.s;
        world.style.width = W + 'px'; world.style.height = H + 'px';
        const cx = ((g.x0 + g.x1) / 2 - WORLD.x) * cam.s, cy = ((g.y0 + g.y1) / 2 - WORLD.y) * cam.s;
        cam.tx = Math.min(0, Math.max(bw - W, bw / 2 - cx));
        cam.ty = Math.min(0, Math.max(bh - H, bh / 2 - cy));
        apply();
        /* نشانگر شروع مسیر جاده جایی است که مسیر وارد قاب می‌شود */
        const c = R.c, pad = 34;
        for (let d = 0; d < c.len; d += 12) {
          const p = c.line.getPointAtLength(d), [x, y] = toPx(p.x, p.y);
          if (x + cam.tx < bw - pad && y + cam.ty > pad) {
            c.org.style.setProperty('--x', ((p.x - WORLD.x) / WORLD.w * 100) + '%');
            c.org.style.setProperty('--y', ((p.y - WORLD.y) / WORLD.h * 100) + '%');
            c.start = d / c.len; break;
          }
        }
        /* برچسب زمان هر مسیر وسط بخش دیده‌شده‌ی همان مسیر، کمی کنار خط */
        Object.values(R).forEach((r) => {
          const st = r.start || 0, f = st + (1 - st) * (r.k === 'c' ? 0.42 : 0.5), L = r.len * f;
          const p = r.line.getPointAtLength(L), q = r.line.getPointAtLength(Math.min(r.len, L + 8));
          let nx = -(q.y - p.y), ny = q.x - p.x; const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
          if (ny > 0) { nx = -nx; ny = -ny; }
          const off = 26 / cam.s;
          r.tag.style.setProperty('--x', ((p.x + nx * off - WORLD.x) / WORLD.w * 100) + '%');
          r.tag.style.setProperty('--y', ((p.y + ny * off - WORLD.y) / WORLD.h * 100) + '%');
        });
      };
      /* مسیرها روی بوم: تغییر stroke-dashoffset روی SVG هر فریم کل صفحه را دوباره رسم و لایه‌بندی می‌کرد
         (کندی نقشه)؛ بوم فقط لایه‌ی خودش را عوض می‌کند. بوم به اندازه‌ی قاب دیده‌شده است، نه کل نقشه */
      const cv = $('.vmap__cv', map), ctx = cv && cv.getContext ? cv.getContext('2d') : null;
      const cs = getComputedStyle(map), COL = { a: cs.getPropertyValue('--ca').trim() || '#1E5EEB', b: cs.getPropertyValue('--cb').trim() || '#0B9F87', c: cs.getPropertyValue('--cc').trim() || '#7B55F5' };
      const DOT = 0.034;
      let dpr = 1, queued = false;
      if (ctx) {
        map.classList.add('vmap--cv');
        Object.values(R).forEach((r) => {
          r.q = 0; r.alpha = 1;
          r.p2d = new Path2D(r.line.getAttribute('d'));
          r.dots = r.k === 'b' ? Array.from({ length: Math.floor(1 / DOT) + 1 }, (_, i) => { const d = Math.min(r.len, i * DOT * r.len); const pt = r.line.getPointAtLength(d); return [pt.x, pt.y, d / r.len]; }) : null;
        });
      }
      const render = () => {
        queued = false;
        if (!ctx) return;
        const s = cam.s;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cam.tx - WORLD.x * s), dpr * (cam.ty - WORLD.y * s));
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        Object.values(R).forEach((r) => {
          if (r.q <= 0 || r.alpha <= 0) return;
          const L = r.len, part = r.q >= 1 ? [] : [r.q * L, L * 2];
          ctx.strokeStyle = COL[r.k]; ctx.fillStyle = COL[r.k];
          ctx.globalAlpha = r.alpha * 0.16; ctx.lineWidth = 15 / s; ctx.setLineDash(part); ctx.stroke(r.p2d);
          ctx.globalAlpha = r.alpha;
          if (r.dots) {
            const rad = 3 / s;
            ctx.beginPath();
            r.dots.forEach(([x, y, f]) => { if (f <= r.q + 1e-6) { ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, Math.PI * 2); } });
            ctx.fill();
          } else { ctx.lineWidth = 5 / s; ctx.setLineDash(part); ctx.stroke(r.p2d); }
        });
        ctx.globalAlpha = 1;
      };
      /* چند تغییر در یک فریم فقط یک بار کشیده می‌شوند، ولی در همان فریم (هم‌زمان با نقطه‌ی نورانی) */
      const paint = () => { if (!ctx || queued) return; queued = true; queueMicrotask(render); };
      const sizeCv = () => {
        if (!ctx) return;
        const bw = view.clientWidth, bh = view.clientHeight;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.max(1, Math.round(bw * dpr)); cv.height = Math.max(1, Math.round(bh * dpr));
        cv.style.width = bw + 'px'; cv.style.height = bh + 'px';
        cv.style.transform = `translate3d(${-cam.tx}px, ${-cam.ty}px, 0)`;
        render();
      };
      layout();
      sizeCv();
      this.layout = layout;
      const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { layout(); sizeCv(); }) : null;
      if (ro) ro.observe(view);
      this.ro = ro;

      /* کشیدن مسیر تا p (۰ تا ۱)؛ مسیر ساحل نقطه‌چین (قدم‌ها) است */
      const draw = (r, p) => {
        const q = Math.max(0, Math.min(1, p));
        if (ctx) { r.q = q; paint(); return; }
        r.glow.style.strokeDashoffset = 1 - q;
        if (r.k === 'b') {
          if (q >= 1) { r.line.style.strokeDasharray = `0 ${DOT}`; r.line.style.strokeDashoffset = 0; }
          else { r.line.style.strokeDasharray = q <= 0 ? '0 2' : ('0 ' + DOT + ' ').repeat(Math.floor(q / DOT) + 1) + '0 2'; r.line.style.strokeDashoffset = 0; }
        } else r.line.style.strokeDashoffset = 1 - q;
      };
      const headAt = (r, p, o) => {
        const pt = r.line.getPointAtLength(r.len * Math.max(0, Math.min(1, p)));
        const [x, y] = toPx(pt.x, pt.y);
        r.head.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        if (o !== undefined) r.head.style.opacity = o;
      };
      this.R = R; this.draw = draw; this.ctx = ctx; this.cv = cv;

      const still = !Motion.on || root.classList.contains('rm');
      if (still) {
        Object.values(R).forEach((r) => draw(r, 1));
        pin.classList.add('is-live');
        return;
      }

      /* حالت اولیه */
      Object.values(R).forEach((r) => { draw(r, 0); gsap.set(r.org, { autoAlpha: 0, scale: 0.6 }); gsap.set(r.tag, { xPercent: -50, yPercent: -50, x: 0, y: 0, autoAlpha: 0, scale: 0.6 }); });
      gsap.set($('.vpin__badge', pin), { y: -46, autoAlpha: 0 });
      gsap.set($('.vpin__cap', pin), { autoAlpha: 0, x: 12 });
      gsap.set($('.vmap__base', map), { opacity: 0 });
      cam.k = 1.14; apply();

      const route = (r, dur) => {
        const st = { p: r.start || 0 };
        const tl = gsap.timeline();
        tl.to(r.org, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2.2)' }, 0)
          .fromTo(st, { p: r.start || 0 }, {
            p: 1, duration: dur, ease: 'power2.inOut', immediateRender: false,
            onStart: () => { r.head.style.opacity = 1; },
            onUpdate: () => { draw(r, st.p); headAt(r, st.p); },
            onComplete: () => { gsap.to(r.head, { opacity: 0, duration: 0.35 }); }
          }, 0.2)
          .to(r.tag, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2)' }, dur * 0.72);
        return tl;
      };
      this.route = route;
      const intro = gsap.timeline({ paused: true });
      const camT = { k: 1.14 };
      intro.to($('.vmap__base', map), { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0)
        .to(camT, { k: 1, duration: 2.2, ease: 'expo.out', onUpdate: () => { cam.k = camT.k; apply(); } }, 0)
        .to($('.vpin__badge', pin), { y: 0, autoAlpha: 1, duration: 0.9, ease: 'bounce.out' }, 0.35)
        .add(() => pin.classList.add('is-live'), 0.95)
        .to($('.vpin__cap', pin), { autoAlpha: 1, x: 0, duration: 0.6, ease: 'expo.out' }, 1)
        .add(route(R.a, 2.1), 1.1)
        .add(route(R.b, 2.2), 2.2)
        .add(route(R.c, 2.6), 3.3)
        .add(() => { if (this.loop && this.visible && map.dataset.view === 'route') this.loop.play(); }, '+=0.6');
      this.intro = intro;

      /* پس از معرفی: هر چند ثانیه یک نقطه‌ی نورانی روی هر مسیر به سمت کلینیک می‌رود */
      const comet = (r, dur) => {
        const st = { p: r.start || 0 };
        return gsap.timeline()
          .fromTo(st, { p: r.start || 0 }, { p: 1, duration: dur, ease: 'power1.inOut', immediateRender: false, onUpdate: () => headAt(r, st.p) }, 0)
          .fromTo(r.head, { opacity: 0 }, { opacity: 1, duration: 0.35, immediateRender: false }, 0)
          .to(r.head, { opacity: 0, duration: 0.4 }, dur - 0.4);
      };
      /* سه دور با هر بار دیده شدن نقشه و بعد آرام می‌گیرد (حلقه‌ی بی‌پایان هر فریم کل صفحه را دوباره می‌ساخت) */
      this.loop = gsap.timeline({ paused: true, repeat: 2, repeatDelay: 1.6 })
        .add(comet(R.a, 2.4), 0).add(comet(R.b, 2.8), 1.2).add(comet(R.c, 3.2), 2.2);

      /* فقط وقتی دیده می‌شود کار می‌کند */
      let seen = false;
      this.visible = false;
      this.io = new IntersectionObserver((es) => {
        const on = es.some((e) => e.isIntersecting);
        this.visible = on;
        /* حلقه‌ی تپنده‌ی سنجاق بیرون از دید متوقف می‌شود (هر انیمیشن فعال، هر فریم کل صفحه را دوباره می‌سازد) */
        map.classList.toggle('is-away', !on);
        if (on && !seen) { seen = true; intro.play(); }
        else if (seen && intro.progress() === 1 && map.dataset.view === 'route') {
          if (!on) this.loop.pause();
          else if (this.loop.progress() === 1) this.loop.restart();
          else this.loop.resume();
        }
      }, { threshold: 0.3 });
      this.io.observe(view);

      /* راه‌ها: با نشانگر یا فوکوس برجسته، با کلیک دوباره کشیده می‌شود */
      const hot = (k) => {
        map.classList.toggle('is-focus', !!k);
        Object.values(R).forEach((r) => {
          const on = r.k === k;
          r.g.classList.toggle('is-hot', on); r.btn.classList.toggle('is-hot', on);
          gsap.to([r.org, r.tag], { autoAlpha: !k || on ? 1 : 0.25, duration: 0.35, overwrite: 'auto' });
          if (ctx) gsap.to(r, { alpha: !k || on ? 1 : 0.2, duration: 0.45, ease: 'power2.out', overwrite: 'auto', onUpdate: paint });
        });
      };
      Object.values(R).forEach((r) => {
        r.btn.addEventListener('pointerenter', () => { if (intro.progress() === 1) hot(r.k); });
        r.btn.addEventListener('pointerleave', () => hot(null));
        r.btn.addEventListener('focus', () => { if (intro.progress() === 1) hot(r.k); });
        r.btn.addEventListener('blur', () => hot(null));
        r.btn.addEventListener('click', () => {
          if (intro.progress() < 1) intro.progress(1);
          this.loop.pause();
          const st = { p: r.start || 0 };
          gsap.fromTo(st, { p: r.start || 0 }, {
            p: 1, duration: 1.6, ease: 'power2.inOut', overwrite: 'auto',
            onStart: () => { r.head.style.opacity = 1; },
            onUpdate: () => { draw(r, st.p); headAt(r, st.p); },
            onComplete: () => { gsap.to(r.head, { opacity: 0, duration: 0.35 }); if (this.visible && map.dataset.view === 'route') this.loop.restart(); }
          });
        });
      });
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      if (this.ro) { this.ro.disconnect(); this.ro = null; }
      if (this.intro) { this.intro.kill(); this.intro = null; }
      if (this.loop) { this.loop.kill(); this.loop = null; }
      const map = $('#vmap'); if (!map) return;
      gsap.killTweensOf($$('.vorg, .vtag, .vhead, .vpin__badge, .vpin__cap, .vmap__base', map));
      /* فقط ویژگی‌های حرکت پاک می‌شود؛ جای برچسب‌ها (--x و --y) در style خودشان است و باید بماند */
      gsap.set($$('.vorg, .vtag, .vhead, .vpin__badge, .vpin__cap, .vmap__base', map), { clearProps: 'transform,opacity,visibility' });
      $$('.rt path', map).forEach((p) => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
      if (this.R) { gsap.killTweensOf(Object.values(this.R)); Object.values(this.R).forEach((r) => { r.q = 0; r.alpha = 1; }); }
      if (this.ctx && this.cv) { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); }
      map.classList.remove('is-focus');
      $('.vpin', map).classList.remove('is-live');
      if (this.R) Object.values(this.R).forEach((r) => { r.g.classList.remove('is-hot'); r.btn.classList.remove('is-hot'); });
      this.R = null;
    }
  };

  /* ==========================================================================
     دکمه‌های مسیریاب (بلد، نشان، گوگل‌مپ): آیکون‌ها مثل سنجاق روی نقشه فرود می‌آیند،
     با نشانگر می‌پرند و هر چند ثانیه یکی‌شان آرام «پینگ» می‌زند
     ========================================================================== */
  const AppsFx = {
    build() {
      const wrap = $('#vapps');
      if (!wrap || !window.gsap) return;
      const apps = $$('.vapp', wrap);
      const ping = (a) => { a.classList.remove('is-ping'); void a.offsetWidth; a.classList.add('is-ping'); };
      this.ctx = gsap.context(() => {
        apps.forEach((a) => {
          const ic = $('.vapp__ic img', a), sh = $('.vapp__shadow', a);
          gsap.set(a, { autoAlpha: 0, y: 26 });
          gsap.set(ic, { y: -34, autoAlpha: 0, transformOrigin: '50% 100%' });
          gsap.set(sh, { scale: 0.3, autoAlpha: 0 });
        });
        this.enter = gsap.timeline({ paused: true });
        apps.forEach((a, i) => {
          const ic = $('.vapp__ic img', a), sh = $('.vapp__shadow', a), t = i * 0.14;
          this.enter.to(a, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out' }, t)
            .to(ic, { y: 0, autoAlpha: 1, duration: 0.42, ease: 'power2.in' }, t + 0.18)
            .to(sh, { scale: 1.15, autoAlpha: 1, duration: 0.42, ease: 'power2.in' }, t + 0.18)
            .to(ic, { scaleY: 0.8, scaleX: 1.14, duration: 0.1, ease: 'power1.out' }, t + 0.6)
            .add(() => ping(a), t + 0.6)
            .to(ic, { scaleY: 1, scaleX: 1, duration: 0.8, ease: 'elastic.out(1, 0.38)' }, t + 0.7)
            .to(sh, { scale: 1, duration: 0.6, ease: 'power2.out' }, t + 0.7);
        });
      });
      let k = 0, idle = null;
      const loop = () => { if (!document.hidden) ping(apps[k++ % apps.length]); };
      this.io = new IntersectionObserver((es) => {
        const on = es.some((e) => e.isIntersecting);
        if (on && this.enter && this.enter.progress() === 0) this.enter.play();
        clearInterval(idle); idle = null;
        if (on && !root.classList.contains('rm')) idle = setInterval(loop, 4200);
      }, { threshold: 0.4 });
      this.io.observe(wrap);
      this.stopIdle = () => { clearInterval(idle); idle = null; };
      /* با نشانگر: آیکون می‌پرد و روی نقشه فرود می‌آید */
      this.hops = apps.map((a) => {
        const ic = $('.vapp__ic img', a), sh = $('.vapp__shadow', a);
        const hop = () => {
          if (this.enter && this.enter.isActive()) return;
          gsap.timeline({ overwrite: 'auto' })
            .to(ic, { y: -9, scaleY: 1.06, scaleX: 0.96, duration: 0.22, ease: 'power2.out' }, 0)
            .to(sh, { scale: 0.6, autoAlpha: 0.5, duration: 0.22, ease: 'power2.out' }, 0)
            .to(ic, { y: 0, scaleY: 1, scaleX: 1, duration: 0.55, ease: 'bounce.out' }, 0.22)
            .to(sh, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'bounce.out' }, 0.22)
            .add(() => ping(a), 0.5);
        };
        a.addEventListener('pointerenter', hop);
        a.addEventListener('focus', hop);
        return [a, hop];
      });
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      if (this.stopIdle) this.stopIdle();
      if (this.hops) this.hops.forEach(([a, h]) => { a.removeEventListener('pointerenter', h); a.removeEventListener('focus', h); });
      this.hops = null;
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      this.enter = null;
      $$('.vapp').forEach((a) => a.classList.remove('is-ping'));
    }
  };

  /* ---------- نقشه‌ی واقعی گوگل: با دکمه، از جای کلینیک روی نقشه باز می‌شود ---------- */
  const vmap = $('#vmap');
  if (vmap) {
    const tabs = $$('.vtabs__btn', vmap), ind = $('.vtabs__ind', vmap), gl = $('#vgmap'), view = $('.vmap__view', vmap);
    let frame = null, loaded = false, busy = false, viewAnim = null;
    const EXPO_IO = 'cubic-bezier(.87, 0, .13, 1)';
    const setInd = () => {
      const on = tabs.find((t) => t.classList.contains('is-on'));
      if (!on || !ind) return;
      ind.style.setProperty('--w', on.offsetWidth + 'px');
      ind.style.setProperty('--tx', (on.offsetLeft - 4) + 'px');
    };
    requestAnimationFrame(setInd);
    window.addEventListener('resize', setInd);
    const ensure = () => new Promise((res) => {
      if (loaded) { res(); return; }
      if (!frame) {
        frame = document.createElement('iframe');
        frame.title = 'نقشه‌ی گوگل: درمانگاه شبانه‌روزی ساسان، سلمان‌شهر';
        frame.setAttribute('allowfullscreen', '');
        frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        frame.src = gl.dataset.src;
        gl.appendChild(frame);
      }
      const done = () => { loaded = true; res(); };
      frame.addEventListener('load', done, { once: true });
      setTimeout(done, 3500);
    });
    const pinXY = () => {
      const p = $('.vpin', vmap).getBoundingClientRect(), f = view.getBoundingClientRect();
      return [p.left - f.left, p.top - f.top - 30];
    };
    const setView = async (v) => {
      if (busy || vmap.dataset.view === v) return;
      busy = true;
      tabs.forEach((t) => { const on = t.dataset.view === v; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
      setInd();
      const anim = Motion.on && !root.classList.contains('rm');
      const [x, y] = pinXY(), rmax = Math.hypot(Math.max(x, view.clientWidth - x), Math.max(y, view.clientHeight - y)) + 20;
      if (v === 'google') {
        if (MapFx.loop) MapFx.loop.pause();
        const btn = tabs.find((t) => t.dataset.view === 'google');
        gl.hidden = false;
        gl.style.clipPath = anim ? `circle(0px at ${x}px ${y}px)` : '';
        btn.classList.add('is-busy');
        vmap.dataset.view = 'google';
        await ensure();
        btn.classList.remove('is-busy');
        if (anim && typeof gl.animate === 'function') {
          /* انیمیشن بومی (نه تغییر clip-path از جاوااسکریپت در هر فریم): مرورگر می‌تواند آن را روی کامپوزیتور ببرد،
             هم‌زمان با بالا آمدن خود نقشه‌ی گوگل */
          const opt = { duration: 1050, easing: EXPO_IO, fill: 'forwards' };
          gl.style.clipPath = '';
          const a = gl.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${rmax}px at ${x}px ${y}px)` }], opt);
          view.style.transformOrigin = `${x}px ${y + 30}px`;
          viewAnim = view.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.08)', opacity: 0.55 }], opt);
          a.onfinish = () => { a.cancel(); busy = false; };
        } else { gl.style.clipPath = ''; busy = false; }
      } else {
        vmap.dataset.view = 'route';
        const back = () => { gl.hidden = true; gl.style.clipPath = ''; if (viewAnim) { viewAnim.cancel(); viewAnim = null; } view.style.transformOrigin = ''; busy = false; if (MapFx.loop && MapFx.visible && MapFx.intro && MapFx.intro.progress() === 1) MapFx.loop.resume(); };
        if (anim && typeof gl.animate === 'function') {
          const opt = { duration: 900, easing: EXPO_IO, fill: 'forwards' };
          gl.animate([{ clipPath: `circle(${rmax}px at ${x}px ${y}px)` }, { clipPath: `circle(0px at ${x}px ${y}px)` }], opt).onfinish = back;
          if (viewAnim) { viewAnim.cancel(); viewAnim = null; }
          view.animate([{ transform: 'scale(1.08)', opacity: 0.55 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: EXPO_IO });
        } else back();
      }
    };
    tabs.forEach((t) => {
      t.addEventListener('click', () => setView(t.dataset.view));
      /* با اولین نشانه‌ی قصد (نشانگر یا فوکوس) نقشه‌ی گوگل از قبل بارگیری می‌شود */
      if (t.dataset.view === 'google') { const pre = () => ensure(); t.addEventListener('pointerenter', pre, { once: true }); t.addEventListener('focus', pre, { once: true }); }
    });
    $('.vtabs', vmap).addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const i = tabs.findIndex((t) => t.classList.contains('is-on')), n = tabs[(i + 1) % tabs.length];
      n.focus(); setView(n.dataset.view);
    });
  }

  /* فوتر: محتوا از زیر صفحه بالا می‌آید و «Sasan Clinic» با اسکرول، اول خط‌به‌خط کشیده و بعد با گرادیان آئورا پر می‌شود */
  const FootFx = {
    build() {
      const foot = $('.foot'), main = $('main'), line = $('.fword__line'), wipe = $('.fword__wipe'), src = $('#lgp-word');
      if (!foot || !main || !line || !wipe || !src || !window.ScrollTrigger) return;
      const len = src.getTotalLength();
      this.ctx = gsap.context(() => {
        gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
        gsap.set(wipe, { attr: { width: 0 } });
        const inner = $('.foot__in', foot), sky = $('.fsky', foot);
        /* وقتی فوتر از صفحه بلندتر است (موبایل)، بالا آمدن محتوا تیتر نوبت را زیر لبه‌ی فوتر پنهان نگه می‌داشت
           و هیچ‌وقت دیده نمی‌شد؛ آن‌جا فقط آسمان پشت حرکت می‌کند */
        const tall = foot.offsetHeight > window.innerHeight * 1.05;
        const rise = gsap.timeline({ scrollTrigger: { trigger: main, start: 'bottom bottom', end: () => '+=' + foot.offsetHeight, scrub: true, invalidateOnRefresh: true } });
        if (!tall) rise.fromTo(inner, { yPercent: -28 }, { yPercent: 0, ease: 'none', duration: 1 }, 0);
        rise.fromTo(sky, { yPercent: -12, opacity: 0.4 }, { yPercent: 0, opacity: 1, ease: 'none', duration: 1 }, 0);
        gsap.timeline({ scrollTrigger: { trigger: main, start: 'bottom bottom', end: () => '+=' + foot.offsetHeight, scrub: 0.8, invalidateOnRefresh: true } })
          .to(line, { strokeDashoffset: 0, duration: 0.62, ease: 'none' }, 0)
          .to(wipe, { attr: { width: 1427 }, duration: 0.5, ease: 'power1.inOut' }, 0.42);
      });
    },
    kill() { if (this.ctx) { this.ctx.revert(); this.ctx = null; } }
  };

  /* ورود نرم کارت‌های پایین صفحه، فقط برای چیزهایی که هنوز دیده نشده‌اند */
  const Reveal = {
    anims: new Map(),
    groups: new Map(),
    stop(el) { const a = this.anims.get(el); if (a) { a.cancel(); this.anims.delete(el); } },
    play(el, delay) {
      if (typeof el.animate === 'function') {
        /* انیمیشن بومی روی کامپوزیتور: هر فریم نه جاوااسکریپت دارد و نه رسم دوباره‌ی صفحه */
        el.classList.remove('is-pre');
        const a = el.animate([{ opacity: 0, transform: 'translate3d(0, 30px, 0)' }, { opacity: 1, transform: 'translate3d(0, 0, 0)' }], { duration: 900, delay: delay * 1000, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' });
        this.anims.set(el, a);
        a.onfinish = () => this.anims.delete(el);
      } else gsap.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', delay, clearProps: 'opacity,transform', onStart: () => el.classList.remove('is-pre') });
    },
    build() {
      if (!window.gsap || !('IntersectionObserver' in window)) return;
      const els = $$('[data-rv]');
      const vh = window.innerHeight;
      let pending = els.filter((el) => el.getClientRects().length && el.getBoundingClientRect().top > vh * 0.9);
      pending.forEach((el) => el.classList.add('is-pre'));
      /* کارت‌های داخل ردیف افقی (مجله روی موبایل) جداگانه دیده نمی‌شوند؛ کارت‌های بیرون از قاب تا کشیده شدن خالی می‌ماندند.
         پس کل ردیف با هم وارد می‌شود: کارت‌های داخل قاب پله‌ای، بقیه بی‌صدا */
      const hs = (p) => p && p.scrollWidth > p.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(p).overflowX);
      this.groups = new Map();
      pending = pending.filter((el) => {
        const p = el.parentElement;
        if (!hs(p)) return true;
        if (!this.groups.has(p)) this.groups.set(p, []);
        this.groups.get(p).push(el);
        return false;
      });
      this.io = new IntersectionObserver((ents) => {
        let k = 0;
        ents.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          this.io.unobserve(el);
          const g = this.groups.get(el);
          if (!g) { this.play(el, 0.07 * k++); return; }
          const pr = el.getBoundingClientRect();
          g.forEach((c) => {
            const r = c.getBoundingClientRect();
            if (r.right > pr.left && r.left < pr.right) this.play(c, 0.07 * k++);
            else c.classList.remove('is-pre');
          });
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      pending.forEach((el) => this.io.observe(el));
      this.groups.forEach((g, p) => this.io.observe(p));
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      this.anims.forEach((a) => a.cancel()); this.anims.clear();
      this.groups = new Map();
      const els = $$('[data-rv]');
      if (window.gsap) { gsap.killTweensOf(els); gsap.set(els, { clearProps: 'opacity,transform' }); }
      els.forEach((el) => el.classList.remove('is-pre'));
    }
  };

  /* ---------- ثبت ماژول‌ها ---------- */
  Motion.add(Stage);
  Motion.add(Reel);
  Motion.add(Depts);
  Motion.add(Journey);
  Motion.add(Docs);
  Motion.add(Safe);
  Motion.add(Reviews);
  Motion.add(MapFx);
  Motion.add(AppsFx);
  Motion.add(Reveal);
  Motion.add(FootFx);

  let lastW = window.innerWidth, rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (Math.abs(window.innerWidth - lastW) < 40) return;
      lastW = window.innerWidth;
      Motion.rebuild();
    }, 220);
  });

  /* عکس‌های بخش‌های پایین‌تر در زمان بیکاری از قبل رمزگشایی می‌شوند تا اولین نمایششان وسط اسکرول فریمی را نگیرد */
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 120));
  const warm = () => {
    const list = [...$$('#glance img, .jr-step__img img, .jr-frame__img img')];
    ['img/team.webp'].forEach((src) => { const im = new Image(); im.src = src; list.unshift(im); });
    let i = 0;
    const next = () => {
      const im = list[i++]; if (!im) return;
      if (im.loading === 'lazy' && !im.complete) { idle(next); return; }
      (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => idle(next));
    };
    idle(next);
  };
  if (document.readyState === 'complete') warm(); else window.addEventListener('load', warm, { once: true });

  document.addEventListener('DOMContentLoaded', () => {
    brandIntro(intro);
    if (!Motion.on) counters(document, false);
    const k = location.hash.slice(1);
    if (SVC[k]) openSvc(k, null, false);
    setInterval(fillSlots, 5 * 60 * 1000);
  });
})();
