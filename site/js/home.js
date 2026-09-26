/* ==========================================================================
   home.js: ورود هیرو، تبدیل هیرو به «درباره‌ی ما» (مدل ۲۱)،
   سه بخش اصلی (مدل ۴۰)، نوبت آنلاین، نمای هر بخش
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, toFa, Motion, Clinic } = S;
  const root = document.documentElement;
  const isMob = () => window.matchMedia('(max-width: 699.98px)').matches;
  if (window.gsap && window.Flip) gsap.registerPlugin(Flip);

  /* ==========================================================================
     داده‌ی بخش‌ها
     ========================================================================== */
  const SVC = {
    dental: {
      title: 'دندانپزشکی', icon: 'tooth', doctor: 'دکتر سارا امینی',
      lead: 'از جرم‌گیری و ترمیم ساده تا ایمپلنت و لمینت. قبل از هر درمان عکس دیجیتال می‌گیریم، طرح درمان را روی مانیتور نشانتان می‌دهیم و هزینه‌ی هر مرحله را مکتوب می‌کنیم.',
      items: [
        ['معاینه و جرم‌گیری', 'معاینه‌ی کامل، عکس دیجیتال و جرم‌گیری با دستگاه اولتراسونیک.', '۴۵ دقیقه'],
        ['ترمیم و درمان ریشه', 'پر کردن هم‌رنگ دندان و عصب‌کشی با روتاری، بیشتر وقت‌ها در یک جلسه.', '۱ تا ۲ جلسه'],
        ['ایمپلنت دیجیتال', 'کاشت پایه با راهنمای جراحی دیجیتال و روکش پس از جوش خوردن استخوان.', '۳ تا ۴ ماه'],
        ['لمینت و کامپوزیت', 'طراحی لبخند روی مانیتور، پیش از آن‌که حتی یک میلی‌متر از دندان تراشیده شود.', '۲ تا ۳ جلسه'],
        ['ارتودنسی و الاینر', 'براکت ثابت یا الاینر شفاف، با برنامه‌ی ماه‌به‌ماه و عکس از روند پیشرفت.', '۱۲ تا ۲۴ ماه'],
        ['دندانپزشکی کودکان', 'اتاقی آرام برای بچه‌ها، فیشورسیل و وارنیش فلوراید.', '۳۰ دقیقه']
      ]
    },
    beauty: {
      title: 'زیبایی و پوست', icon: 'sparkles', doctor: 'دکتر نگار رحیمی',
      lead: 'پوست، مو و جوان‌سازی زیر نظر متخصص پوست. پیش از هر تزریق یا لیزر، پوستتان معاینه می‌شود و اگر روش ساده‌تری جواب بدهد، همان را پیشنهاد می‌کنیم.',
      items: [
        ['بوتاکس', 'برای خطوط پیشانی و دور چشم، با دوز حساب‌شده تا حالت طبیعی صورت بماند.', '۲۰ دقیقه'],
        ['فیلر', 'حجم‌دهی لب، گونه و خط فک با فیلرهایی که اصالت کالا دارند.', '۳۰ دقیقه'],
        ['لیزر موهای زائد', 'دستگاه دایود با خنک‌کننده‌ی تماسی، مناسب بیشتر رنگ‌های پوست.', '۶ تا ۸ جلسه'],
        ['جوان‌سازی و مزوتراپی', 'ویتامین و پی‌آرپی برای پوست خسته، چروک‌های ریز و ریزش مو.', '۳ تا ۴ جلسه'],
        ['پاکسازی و هیدرافیشیال', 'پاکسازی عمقی، لایه‌برداری ملایم و آب‌رسانی در یک جلسه.', '۶۰ دقیقه'],
        ['درمان آکنه و لک', 'ویزیت متخصص پوست، پیلینگ شیمیایی و برنامه‌ی مراقبت در خانه.', 'بسته به نوع پوست']
      ]
    },
    medicine: {
      title: 'پزشکی', icon: 'steth', doctor: 'دکتر حمید کاظمی',
      lead: 'پزشک عمومی، متخصص داخلی و مشاور تغذیه برای چکاپ، بیماری‌های مزمن و سؤال‌های روزمره‌ی سلامت. آزمایشگاه هم در همین ساختمان است و جواب‌ها مستقیم به پرونده‌تان می‌رسد.',
      items: [
        ['چکاپ کامل', 'آزمایش خون، نوار قلب و ویزیت پزشک در یک صبح؛ جواب‌ها همان هفته آماده است.', 'نیم روز'],
        ['داخلی و دیابت', 'دیابت، فشار خون، تیروئید و مشکلات گوارشی، با پیگیری منظم.', '۳۰ دقیقه'],
        ['پزشک عمومی', 'از سرماخوردگی تا گواهی سلامت. بیشتر روزها نوبت همان روز پیدا می‌شود.', '۲۰ دقیقه'],
        ['تغذیه و رژیم', 'برنامه‌ی غذایی بر اساس آزمایش و سبک زندگی خودتان، با پیگیری دوهفته‌ای.', '۴۵ دقیقه'],
        ['آزمایشگاه در محل', 'نمونه‌گیری در همین ساختمان، بدون نیاز به رفتن به جای دیگر.', '۱۰ دقیقه'],
        ['سرم و تزریقات', 'سرم‌تراپی و تزریقات با نسخه‌ی پزشک، زیر نظر پرستار.', '۳۰ تا ۶۰ دقیقه']
      ]
    }
  };
  const KEYS = ['dental', 'beauty', 'medicine'];

  /* ==========================================================================
     نوبت‌های خالی
     ========================================================================== */
  let SLOTS = {};
  function fillSlots() {
    KEYS.forEach((k) => { SLOTS[k] = Clinic.nextSlot(k); });
    KEYS.forEach((k) => {
      const cs = $(`.pcard__slot[data-slot="${k}"]`);
      if (cs && SLOTS[k]) cs.textContent = 'نوبت خالی: ' + SLOTS[k].short;
    });
    let best = null;
    KEYS.forEach((k) => { const s = SLOTS[k]; if (s && (!best || s.off * 1440 + s.t < best.s.off * 1440 + best.s.t)) best = { k, s }; });
    const live = $('#qbookLive');
    if (live && best) live.textContent = `نزدیک‌ترین نوبت خالی: ${best.s.label}، ${SVC[best.k].title}`;
  }
  fillSlots();

  /* ---------- فرم نوبت آنلاین ---------- */
  const qb = $('#qbook');
  if (qb) {
    qb.addEventListener('submit', (e) => {
      e.preventDefault();
      const k = $('#qbDept').value, when = $('#qbWhen').value;
      let s = Clinic.nextSlot(k, when);
      const out = $('#qbResult');
      out.hidden = false;
      if (!s) { out.textContent = 'در این بازه نوبت خالی پیدا نشد. با شماره‌ی ۰۲۱ ۲۲۳۴ ۵۶۷۸ تماس بگیرید.'; return; }
      out.innerHTML = `<span>نزدیک‌ترین نوبت ${SVC[k].title}:</span> <b>${s.label}</b> <span>با ${SVC[k].doctor}</span> <a class="link-arrow" href="#endcap">رزرو همین نوبت<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></a>`;
      if (Motion.on) gsap.fromTo(out, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' });
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

      const frameClip = () => {
        const p = pin.getBoundingClientRect(), r = frame.getBoundingClientRect();
        const t = r.top - p.top, rt = p.right - r.right, b = p.bottom - r.bottom, l = r.left - p.left;
        return `inset(${t.toFixed(1)}px ${rt.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round 8px)`;
      };

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
        if (window.innerWidth >= 1061) {
          /* دسکتاپ: دندان وسط قاب و کمی بزرگ‌تر */
          const fit = Math.min(1.16, 0.8 * fh / (SUBJECT.h * rh), 0.8 * fw / (SUBJECT.w * rw));
          const cover = Math.max((fw / 2) / (px - ox), (fw / 2) / (ox + rw - px), (fh / 2) / (py - oy), (fh / 2) / (oy + rh - py)) * 1.02;
          return { ox: px - ox, oy: py - oy, dx: fx - px, dy: fy - py, s: Math.max(cover, fit) };
        }
        /* تبلت و موبایل: عکس کوچک‌تر می‌شود تا بیشتر صحنه دیده شود؛
           دندان حدود ۴۰٪ ارتفاع قاب را می‌گیرد و قاب همیشه پر می‌ماند */
        const sMin = Math.max(fw / rw, fh / rh) * 1.03;
        const sc = Math.max(sMin, Math.min(1, 0.4 * fh / (SUBJECT.h * rh)));
        const fL = fx - fw / 2, fR = fx + fw / 2, fT = fy - fh / 2, fB = fy + fh / 2;
        const lx = px - ox, ly = py - oy;
        const tx = clamp(fx, fR - (rw - lx) * sc, fL + lx * sc);
        const ty = clamp(fy, fB - (rh - ly) * sc, fT + ly * sc);
        return { ox: lx, oy: ly, dx: tx - px, dy: ty - py, s: sc };
      };
      let P = push();

      this.ctx = gsap.context(() => {
        gsap.set(bits, { autoAlpha: 0, y: 36 });
        gsap.set(img, { transformOrigin: () => `${P.ox}px ${P.oy}px` });
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: stage, start: 'top top', end: () => '+=' + window.innerHeight * (mob ? 1.5 : 1.8),
            pin: pin, scrub: 0.7, invalidateOnRefresh: true,
            onRefreshInit: () => { P = push(); gsap.set(img, { transformOrigin: `${P.ox}px ${P.oy}px` }); },
            onUpdate: (self) => {
              about.classList.toggle('is-on', self.progress > 0.55);
              pin.classList.toggle('is-about', self.progress > 0.3);
              if (!counted && self.progress > 0.6) { counted = true; counters(figs, true); }
            }
          }
        });
        tl.fromTo(copy, { y: 0, autoAlpha: 1 }, { y: -70, autoAlpha: 0, duration: 0.24, ease: 'power1.in' }, 0)
          .fromTo(qbw, { y: 0, autoAlpha: 1 }, { y: 50, autoAlpha: 0, duration: 0.2, ease: 'power1.in' }, 0)
          .fromTo(media, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: frameClip, duration: 0.48, ease: 'power2.inOut' }, 0.06)
          .fromTo(img, { scale: 1, x: 0, y: 0 }, { scale: () => P.s, x: () => P.dx, y: () => P.dy, duration: 0.48, ease: 'power2.inOut' }, 0.06)
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
      if (!window.Flip) return;
      const wrap = $('#reel'), row = $('.reel__row', wrap);
      const items = $$('.reel__item', row), cap = $('.reel__cap', row);
      const center = $('.reel__item--center', row);
      const inner = $('.reel__inner', center), shade = $('.reel__shade', center), intro = $('.reel__intro', wrap);
      const kids = Array.from(cap.children);
      const mob = isMob();
      this.ctx = gsap.context(() => {
        row.classList.add('is-open');
        const state = Flip.getState([items, cap], { props: 'opacity,borderRadius' });
        row.classList.remove('is-open');
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: wrap, start: 'top top', end: () => '+=' + window.innerHeight * (mob ? 1.6 : 2.1), pin: wrap, scrub: 0.6, invalidateOnRefresh: true }
        });
        tl.add(Flip.to(state, { ease: 'none', absoluteOnLeave: true, scale: false, simple: true, duration: 1 }), 0)
          .fromTo(inner, { scale: 1.28 }, { scale: 1, duration: 1 }, 0)
          .fromTo(intro, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -24, duration: 0.25 }, 0)
          .fromTo(shade, { opacity: 0 }, { opacity: mob ? 0.15 : 1, duration: 0.45 }, 0.5)
          .from(kids, { y: 40, opacity: 0, duration: 0.22, stagger: 0.05, ease: 'power2.out' }, 0.66);
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      const row = $('.reel__row');
      row.classList.remove('is-open');
      gsap.set([...$$('.reel__item', row), $('.reel__cap', row), $('.reel__inner', row), $('.reel__shade', row), $('.reel__intro'), ...$('.reel__cap', row).children], { clearProps: 'all' });
    }
  };

  /* ==========================================================================
     نظر بیماران: فیلتر بخش، کشیدن با ماوس، دکمه‌ها و نوار پیشرفت
     ========================================================================== */
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

    /* فیلتر بخش */
    $$('.rv-tabs [role="tab"]').forEach((tab) => tab.addEventListener('click', () => {
      const f = tab.dataset.f;
      $$('.rv-tabs [role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
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
      const tints = ['#F3F6FA', '#EAF2FB', '#EDF5F3', '#FBF1F4'];
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
            tl.fromTo(el, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'power1.inOut' }, i)
              .fromTo($('img', el), { yPercent: 0 }, { yPercent: -7, duration: 1 }, i)
              .fromTo(nextImg, { yPercent: 7, scale: 1.08 }, { yPercent: 0, scale: 1, duration: 1 }, i)
              .fromTo(sec, { backgroundColor: tints[i] }, { backgroundColor: tints[i + 1], duration: 1, ease: 'power1.inOut' }, i);
          });
          steps.forEach((st) => ScrollTrigger.create({ trigger: st, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => st.classList.toggle('is-active', self.isActive) }));
          gsap.from($('.jr-side', sec), { y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: jr, start: 'top 80%' } });
        } else {
          steps.forEach((st, i) => {
            const fig = $('.jr-step__img', st), im = $('img', fig);
            gsap.fromTo(im, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
            gsap.from(fig, { clipPath: 'inset(10% 6% 10% 6% round 12px)', duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 85%' } });
            gsap.from(st.querySelectorAll('.jr-step__txt > *'), { y: 22, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: st, start: 'top 70%' } });
            ScrollTrigger.create({ trigger: st, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => { if (self.isActive) gsap.to(sec, { backgroundColor: tints[i], duration: 0.6, overwrite: 'auto' }); } });
          });
        }
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      const sec = $('#journey'); if (!sec) return;
      gsap.set([sec, ...$$('.jr-frame__img, .jr-frame__img img, .jr-step__img, .jr-step__img img, .jr-side', sec)], { clearProps: 'all' });
      $$('.jr-step', sec).forEach((st) => st.classList.remove('is-active'));
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
        gsap.from('.rv-tabs button', { y: 14, autoAlpha: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.rv', start: 'top 82%' } });
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
      const R = 6;
      const joined = mob ? [[R, R, 0, 0], [0, 0, 0, 0], [0, 0, R, R]] : [[0, R, R, 0], [0, 0, 0, 0], [R, 0, 0, R]];
      const corners = (c) => ({ borderTopLeftRadius: c[0], borderTopRightRadius: c[1], borderBottomRightRadius: c[2], borderBottomLeftRadius: c[3] });
      let gapOn = false, flipOn = false;

      this.ctx = gsap.context(() => {
        const setGap = (on) => {
          if (on === gapOn) return; gapOn = on;
          gsap.to(deck, { gap: on ? (mob ? 12 : 20) : 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
          cards.forEach((c, i) => gsap.to(c, { ...corners(on ? [R, R, R, R] : joined[i]), duration: 0.7, ease: 'power3.out', overwrite: 'auto' }));
        };
        const setFlip = (on) => {
          if (on === flipOn) return; flipOn = on; this.flipped = on;
          deck.classList.toggle('is-flipped', on);
          if (mob) {
            gsap.to(cards, { rotationX: on ? -180 : 0, duration: 0.95, ease: 'power3.inOut', stagger: on ? 0.09 : -0.09, overwrite: 'auto' });
            gsap.to([cards[0], cards[2]], { rotationZ: (i) => (on ? [-2, 2][i] : 0), x: (i) => (on ? [5, -5][i] : 0), duration: 0.95, ease: 'power3.inOut' });
          } else {
            gsap.to(cards, { rotationY: on ? 180 : 0, duration: 0.95, ease: 'power3.inOut', stagger: on ? 0.09 : -0.09, overwrite: 'auto' });
            gsap.to([cards[0], cards[2]], { y: on ? 24 : 0, x: (i) => (on ? [26, -26][i] : 0), rotationZ: (i) => (on ? [8, -8][i] : 0), duration: 0.95, ease: 'power3.inOut' });
          }
        };
        this.setGap = setGap; this.setFlip = setFlip;

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: sec, start: 'top top', end: () => '+=' + window.innerHeight * (mob ? 1.9 : 2.2),
            pin: stage, scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: (self) => { setGap(self.progress >= 0.28); setFlip(self.progress >= 0.48); }
          }
        });
        tl.fromTo(deck, { scale: mob ? 1.05 : 1.14, y: mob ? 14 : 50 }, { scale: 1, y: 0, duration: 0.26 }, 0)
          .to({}, { duration: 0.74 }, 0.26);

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
      gsap.killTweensOf([deck, ...cards]);
      gsap.set([deck, ...cards, ...$$('.depts__head .kicker, .depts__title, .depts__sub, .depts__head .link-arrow')], { clearProps: 'all' });
      deck.classList.remove('is-flipped');
      this.flipped = false; this.setGap = this.setFlip = null;
    },
    reveal() { if (this.setGap) { this.setGap(true); this.setFlip(true); } }
  };
  $$('.pcard').forEach((c) => c.addEventListener('focus', () => { if (!Depts.flipped) Depts.reveal(); }));

  /* ==========================================================================
     نمای بخش: از خود کارت باز می‌شود و به همان کارت برمی‌گردد
     ========================================================================== */
  const view = $('#svc');
  const vscroll = $('.svc__scroll', view);
  let current = null, opener = null;

  function fill(key) {
    const d = SVC[key];
    view.dataset.k = key;
    $('#svcTitle').textContent = d.title;
    $('#svcCrumb').textContent = 'خدمات / ' + d.title;
    $('#svcLead').textContent = d.lead;
    $('#svcIc use').setAttribute('href', '#i-' + d.icon);
    const s = SLOTS[key];
    $('#svcSlot').textContent = s ? `نزدیک‌ترین نوبت: ${s.label}` : '';
    $('#svcList').innerHTML = d.items.map((it) => `
      <article class="svc__item">
        <b>${it[0]}</b>
        <p>${it[1]}</p>
        <span class="svc__dur"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg>${it[2]}</span>
      </article>`).join('');
  }
  const rectClip = (r, rad) => `inset(${Math.max(0, r.top)}px ${Math.max(0, window.innerWidth - r.right)}px ${Math.max(0, window.innerHeight - r.bottom)}px ${Math.max(0, r.left)}px round ${rad}px)`;

  function openSvc(key, from, push = true) {
    if (!SVC[key]) return;
    current = key; opener = from || null;
    fill(key);
    view.hidden = false;
    vscroll.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    Motion.pause();
    const parts = [$('.svc__top', view), ...$('.svc__hero', view).children, $('.svc__main', view)];
    if (Motion.on && from) {
      const r = from.getBoundingClientRect();
      gsap.killTweensOf([view, ...parts]);
      gsap.fromTo(view, { clipPath: rectClip(r, 6) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.8, ease: 'expo.inOut' });
      gsap.fromTo(parts, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05, delay: 0.4, clearProps: 'transform,opacity' });
    } else if (Motion.on) {
      gsap.fromTo(view, { opacity: 0 }, { opacity: 1, duration: 0.35, clearProps: 'opacity' });
    }
    if (push) { try { history.pushState({ svc: key }, '', '#' + key); } catch (e) { /* محیط محدود */ } }
    setTimeout(() => $('#svcBack').focus({ preventScroll: true }), 50);
  }

  function closeSvc() {
    if (!current) return;
    const key = current; current = null;
    const card = $(`.pcard[data-svc="${key}"]`);
    const done = () => {
      view.hidden = true;
      if (Motion.on) gsap.set(view, { clearProps: 'clipPath,opacity' });
      document.body.style.overflow = '';
      Motion.resume();
      const back = opener && document.contains(opener) && opener.offsetParent !== null ? opener : card;
      if (back) back.focus({ preventScroll: true });
    };
    if (Motion.on) {
      const r = card ? card.getBoundingClientRect() : null;
      const visible = r && r.bottom > 0 && r.top < window.innerHeight;
      if (visible) gsap.to(view, { clipPath: rectClip(r, 6), duration: 0.7, ease: 'expo.inOut', onComplete: done });
      else gsap.to(view, { opacity: 0, duration: 0.3, onComplete: done });
    } else done();
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

  /* ---------- ثبت ماژول‌ها ---------- */
  Motion.add(Stage);
  Motion.add(Reel);
  Motion.add(Depts);
  Motion.add(Journey);
  Motion.add(Reviews);

  let lastW = window.innerWidth, rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (Math.abs(window.innerWidth - lastW) < 40) return;
      lastW = window.innerWidth;
      Motion.rebuild();
    }, 220);
  });

  document.addEventListener('DOMContentLoaded', () => {
    intro();
    if (!Motion.on) counters(document, false);
    const k = location.hash.slice(1);
    if (SVC[k]) openSvc(k, null, false);
    setInterval(fillSlots, 5 * 60 * 1000);
  });
})();
