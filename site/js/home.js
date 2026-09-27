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
    qb.addEventListener('submit', (e) => {
      e.preventDefault();
      const k = $('#qbDept').value, pref = $('#qbWhen').value;
      const out = $('#qbResult');
      out.hidden = false;
      let html;
      if (k === 'medicine') html = '<b>پزشک عمومی شبانه‌روزی است</b> <span>همین حالا هم می‌توانید بیایید؛ برای تزریقات، سرم‌تراپی، بخیه و نوار قلب هم همین‌طور.</span>';
      else if (k === 'beauty') html = `<b>زیبایی و لیزر: همه‌روزه با هماهنگی قبلی</b> <span>${WHEN[pref] ? 'برای ' + WHEN[pref][2] + '، ' : ''}زمان را تلفنی با پذیرش هماهنگ کنید.</span>`;
      else {
        const w = dentalFor(pref);
        html = w ? `<span>نزدیک‌ترین زمان پذیرش دندانپزشکی:</span> <b>${w}</b>` : '<b>دندانپزشکی شب پذیرش ندارد.</b> <span>شنبه، یکشنبه، دوشنبه و پنجشنبه از ۱۰ صبح تا ۸ شب.</span>';
      }
      out.innerHTML = `${html} <a class="link-arrow" href="tel:+981154611560">تماس با پذیرش: <span dir="ltr">${TEL}</span><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></a>`;
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
          steps.forEach((st, i) => {
            const fig = $('.jr-step__img', st), im = $('img', fig);
            gsap.fromTo(im, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
            gsap.from(fig, { clipPath: 'inset(10% 6% 10% 6% round 12px)', duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 85%' } });
            gsap.from(st.querySelectorAll('.jr-step__txt > *'), { y: 22, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: st, start: 'top 70%' } });
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
  const lockScroll = (on) => {
    const root = document.documentElement;
    if (on) { if (window.innerWidth - root.clientWidth > 0) root.style.scrollbarGutter = 'stable'; document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; root.style.scrollbarGutter = ''; }
  };
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
      show.forEach((d) => { d.classList.remove('is-pre'); if (Reveal.io) Reveal.io.unobserve(d); });
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
    cb.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = fName.value.trim(), t = normTel(fTel.value);
      const badName = n.length < 2, badTel = !/^09\d{9}$/.test(t);
      mark(fName, badName); mark(fTel, badTel);
      msg.hidden = false;
      msg.classList.toggle('is-bad', badName || badTel);
      if (badName || badTel) {
        msg.textContent = badName ? 'نامتان را بنویسید تا پذیرش بداند با چه کسی صحبت می‌کند.' : 'شماره‌ی موبایل را کامل و با ۰۹ بنویسید؛ مثلاً ۰۹۱۲ ۱۲۳ ۴۵۶۷.';
        (badName ? fName : fTel).focus();
        return;
      }
      const pretty = toFa(`${t.slice(0, 4)} ${t.slice(4, 7)} ${t.slice(7)}`);
      msg.textContent = `ممنون ${n}؛ درخواستتان ثبت شد. پذیرش برای هماهنگی با شماره‌ی ${pretty} تماس می‌گیرد. اگر عجله دارید، همین حالا با ${TEL} تماس بگیرید.`;
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
      layout();
      this.layout = layout;
      const ro = 'ResizeObserver' in window ? new ResizeObserver(() => layout()) : null;
      if (ro) ro.observe(view);
      this.ro = ro;

      /* کشیدن مسیر تا p (۰ تا ۱)؛ مسیر ساحل نقطه‌چین (قدم‌ها) است */
      const DOT = 0.034;
      const draw = (r, p) => {
        const q = Math.max(0, Math.min(1, p));
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
      this.R = R; this.draw = draw;

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
      this.loop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.6 })
        .add(comet(R.a, 2.4), 0).add(comet(R.b, 2.8), 1.2).add(comet(R.c, 3.2), 2.2);

      /* فقط وقتی دیده می‌شود کار می‌کند */
      let seen = false;
      this.visible = false;
      this.io = new IntersectionObserver((es) => {
        const on = es.some((e) => e.isIntersecting);
        this.visible = on;
        if (on && !seen) { seen = true; intro.play(); }
        else if (seen && intro.progress() === 1 && map.dataset.view === 'route') { if (on) this.loop.resume(); else this.loop.pause(); }
      }, { threshold: 0.3 });
      this.io.observe(view);

      /* راه‌ها: با نشانگر یا فوکوس برجسته، با کلیک دوباره کشیده می‌شود */
      const hot = (k) => {
        map.classList.toggle('is-focus', !!k);
        Object.values(R).forEach((r) => {
          const on = r.k === k;
          r.g.classList.toggle('is-hot', on); r.btn.classList.toggle('is-hot', on);
          gsap.to([r.org, r.tag], { autoAlpha: !k || on ? 1 : 0.25, duration: 0.35, overwrite: 'auto' });
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
    let frame = null, loaded = false, busy = false;
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
        if (anim) {
          const o = { r: 0 };
          gsap.timeline({ onComplete: () => { gl.style.clipPath = ''; busy = false; } })
            .to(o, { r: rmax, duration: 1.05, ease: 'expo.inOut', onUpdate: () => { gl.style.clipPath = `circle(${o.r}px at ${x}px ${y}px)`; } }, 0)
            .to(view, { scale: 1.08, opacity: 0.55, duration: 1.05, ease: 'expo.inOut', transformOrigin: `${x}px ${y + 30}px` }, 0);
        } else busy = false;
      } else {
        vmap.dataset.view = 'route';
        if (anim) {
          const o = { r: rmax };
          gsap.timeline({ onComplete: () => { gl.hidden = true; gl.style.clipPath = ''; busy = false; if (MapFx.loop && MapFx.visible && MapFx.intro && MapFx.intro.progress() === 1) MapFx.loop.resume(); } })
            .to(o, { r: 0, duration: 0.9, ease: 'expo.inOut', onUpdate: () => { gl.style.clipPath = `circle(${o.r}px at ${x}px ${y}px)`; } }, 0)
            .to(view, { scale: 1, opacity: 1, duration: 0.9, ease: 'expo.inOut', clearProps: 'transform,opacity' }, 0);
        } else { gl.hidden = true; busy = false; }
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
        gsap.timeline({ scrollTrigger: { trigger: main, start: 'bottom bottom', end: () => '+=' + foot.offsetHeight, scrub: true, invalidateOnRefresh: true } })
          .fromTo(inner, { yPercent: -28 }, { yPercent: 0, ease: 'none', duration: 1 }, 0)
          .fromTo(sky, { yPercent: -12, opacity: 0.4 }, { yPercent: 0, opacity: 1, ease: 'none', duration: 1 }, 0);
        gsap.timeline({ scrollTrigger: { trigger: main, start: 'bottom bottom', end: () => '+=' + foot.offsetHeight, scrub: 0.8, invalidateOnRefresh: true } })
          .to(line, { strokeDashoffset: 0, duration: 0.62, ease: 'none' }, 0)
          .to(wipe, { attr: { width: 1427 }, duration: 0.5, ease: 'power1.inOut' }, 0.42);
      });
    },
    kill() { if (this.ctx) { this.ctx.revert(); this.ctx = null; } }
  };

  /* ورود نرم کارت‌های پایین صفحه، فقط برای چیزهایی که هنوز دیده نشده‌اند */
  const Reveal = {
    build() {
      if (!window.gsap || !('IntersectionObserver' in window)) return;
      const els = $$('[data-rv]');
      const vh = window.innerHeight;
      const pending = els.filter((el) => el.getClientRects().length && el.getBoundingClientRect().top > vh * 0.9);
      pending.forEach((el) => el.classList.add('is-pre'));
      this.io = new IntersectionObserver((ents) => {
        let k = 0;
        ents.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          this.io.unobserve(el);
          gsap.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: 0.07 * k++, clearProps: 'opacity,transform', onStart: () => el.classList.remove('is-pre') });
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      pending.forEach((el) => this.io.observe(el));
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
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
