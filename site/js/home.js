/* ==========================================================================
   home.js: ورود هیرو، ریل تصاویر (مدل ۲۱)، کارت سه بخش (مدل ۴۰)، نمای بخش
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, toFa, Motion, Clinic } = S;
  const root = document.documentElement;
  const isMob = () => window.matchMedia('(max-width: 699.98px)').matches;

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
        ['ایمپلنت', 'کاشت پایه با راهنمای جراحی دیجیتال و روکش پس از جوش خوردن استخوان.', '۳ تا ۴ ماه'],
        ['لمینت و کامپوزیت', 'طراحی لبخند روی مانیتور، پیش از آن‌که حتی یک میلی‌متر از دندان تراشیده شود.', '۲ تا ۳ جلسه'],
        ['ارتودنسی', 'براکت ثابت یا الاینر شفاف، با برنامه‌ی ماه‌به‌ماه و عکس از روند پیشرفت.', '۱۲ تا ۲۴ ماه'],
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
        ['داخلی', 'دیابت، فشار خون، تیروئید و مشکلات گوارشی، با پیگیری منظم.', '۳۰ دقیقه'],
        ['پزشک عمومی', 'از سرماخوردگی تا گواهی سلامت. بیشتر روزها نوبت همان روز پیدا می‌شود.', '۲۰ دقیقه'],
        ['تغذیه و رژیم', 'برنامه‌ی غذایی بر اساس آزمایش و سبک زندگی خودتان، با پیگیری دوهفته‌ای.', '۴۵ دقیقه'],
        ['آزمایشگاه در محل', 'نمونه‌گیری در همین ساختمان، بدون نیاز به رفتن به جای دیگر.', '۱۰ دقیقه'],
        ['سرم و تزریقات', 'سرم‌تراپی و تزریقات با نسخه‌ی پزشک، زیر نظر پرستار.', '۳۰ تا ۶۰ دقیقه']
      ]
    }
  };

  /* ==========================================================================
     نوبت‌های خالی (کارت هیرو و کارت‌های بخش)
     ========================================================================== */
  function fillSlots() {
    const keys = ['dental', 'beauty', 'medicine'];
    const slots = {};
    keys.forEach((k) => { slots[k] = Clinic.nextSlot(k); });
    keys.forEach((k) => {
      const s = slots[k];
      const li = $(`#slotList li[data-k="${k}"] b`);
      if (li && s) li.textContent = s.short;
      const cs = $(`.pcard__slot[data-slot="${k}"]`);
      if (cs && s) cs.textContent = 'نوبت خالی: ' + s.short;
    });
    let best = null;
    keys.forEach((k) => { const s = slots[k]; if (s && (!best || s.off * 1440 + s.t < best.s.off * 1440 + best.s.t)) best = { k, s }; });
    if (best) {
      $('#slotWhen').textContent = best.s.label;
      $('#slotWho').textContent = `${SVC[best.k].title} · ${SVC[best.k].doctor}`;
    }
    return slots;
  }
  let SLOTS = fillSlots();

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
  function counters(animate) {
    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
      const out = (v) => { el.textContent = toFa(v.toFixed(dec)); };
      if (!animate) { out(to); return; }
      const o = { v: 0 }; out(0);
      gsap.to(o, { v: to, duration: 1.8, ease: 'expo.out', onUpdate: () => out(o.v) });
    });
  }

  /* ==========================================================================
     ورود هیرو
     ========================================================================== */
  function intro() {
    window.__sasanIntro = true;
    const title = $('.hero__title');
    if (!Motion.on) { root.classList.remove('intro'); counters(false); return; }
    const words = splitWords(title);
    const bits = $$('.hero [data-intro]');
    const items = $$('.reel__item');
    const imgs = items.map((it) => $('img', it));
    const hl = $('.hl', title);

    gsap.set(words, { yPercent: 115 });
    gsap.set(bits, { opacity: 0, y: 26 });
    gsap.set(items, { clipPath: 'inset(100% 0% 0% 0% round 18px)' });
    gsap.set(imgs, { scale: 1.3 });
    if (hl) hl.style.setProperty('--hl', '0');
    root.classList.remove('intro');

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to($('.hero__eyebrow'), { opacity: 1, y: 0, duration: 0.9 }, 0.05)
      .to(words, { yPercent: 0, duration: 1.15, stagger: 0.05 }, 0.12)
      .to(hl, { '--hl': 1, duration: 1, ease: 'expo.inOut' }, 0.75)
      .to($('.hero__lead'), { opacity: 1, y: 0, duration: 1 }, 0.42)
      .to($('.hero__ctas'), { opacity: 1, y: 0, duration: 1 }, 0.52)
      .to($('.trust'), { opacity: 1, y: 0, duration: 1, onStart: () => counters(true) }, 0.62)
      .to($('.slot'), { opacity: 1, y: 0, duration: 1.1 }, 0.5)
      .to(items, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.3, ease: 'expo.inOut', stagger: { each: 0.07, from: 'center' } }, 0.45)
      .to(imgs, { scale: 1, duration: 1.6, stagger: { each: 0.07, from: 'center' } }, 0.6)
      .add(() => {
        gsap.set(bits, { clearProps: 'transform,opacity' });
        gsap.set(items, { clearProps: 'clipPath' });
        gsap.set(imgs, { clearProps: 'transform' });
      });
  }

  /* ==========================================================================
     ریل تصاویر: ردیف عکس‌ها با اسکرول به یک تصویر تمام‌صفحه تبدیل می‌شود
     ========================================================================== */
  const Reel = {
    ctx: null,
    build() {
      if (!window.Flip) return;
      this.ctx = gsap.context(() => {
        const wrap = $('#reel'), row = $('.reel__row', wrap);
        const items = $$('.reel__item', row), cap = $('.reel__cap', row);
        const center = $('.reel__item--center', row);
        const inner = $('.reel__inner', center), shade = $('.reel__shade', center);
        const kids = Array.from(cap.children);

        row.classList.add('is-open');
        const state = Flip.getState([items, cap], { props: 'filter,opacity,borderRadius' });
        row.classList.remove('is-open');

        const dist = () => window.innerHeight * (isMob() ? 1.7 : 2.3);
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: row, start: 'center center', end: () => '+=' + dist(), pin: wrap, scrub: true, invalidateOnRefresh: true }
        });
        tl.add(Flip.to(state, { ease: 'none', absoluteOnLeave: true, scale: false, simple: true, duration: 1 }), 0)
          .fromTo(inner, { scale: 1.4 }, { scale: 1, duration: 1 }, 0)
          .fromTo(center, { '--fade': '100%' }, { '--fade': '84%', duration: 0.5 }, 0.5)
          .fromTo(shade, { opacity: 0 }, { opacity: 1, duration: 0.45 }, 0.5)
          .from(kids, { y: 46, opacity: 0, duration: 0.24, stagger: 0.05, ease: 'power2.out' }, 0.66);
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      /* Flip استایل‌های حالت باز را روی عنصرها جا می‌گذارد؛ پاکشان می‌کنیم */
      const row = $('.reel__row');
      row.classList.remove('is-open');
      gsap.set([...$$('.reel__item', row), $('.reel__cap', row), $('.reel__inner', row), $('.reel__shade', row), ...$('.reel__cap', row).children], { clearProps: 'all' });
    }
  };

  /* ==========================================================================
     سه بخش: یک تصویر در سه کارت؛ فاصله باز می‌شود و کارت‌ها می‌چرخند
     ========================================================================== */
  const Pillars = {
    ctx: null,
    flipped: false,
    setGap: null,
    setFlip: null,
    build() {
      const sec = $('#services'), stage = $('.pillars__stage', sec), deck = $('#deck', sec);
      const cards = $$('.pcard', deck), head = $('.pillars__head', sec), hint = $('.pillars__hint', sec);
      const mob = isMob();
      const R = 24;
      const joined = mob
        ? [[R, R, 0, 0], [0, 0, 0, 0], [0, 0, R, R]]
        : [[0, R, R, 0], [0, 0, 0, 0], [R, 0, 0, R]];
      const corners = (c) => ({ borderTopLeftRadius: c[0], borderTopRightRadius: c[1], borderBottomRightRadius: c[2], borderBottomLeftRadius: c[3] });
      let gapOn = false, flipOn = false;

      this.ctx = gsap.context(() => {
        gsap.set(hint, { autoAlpha: 0, y: 12 });

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
            gsap.to([cards[0], cards[2]], { rotationZ: (i) => (on ? [-2.5, 2.5][i] : 0), x: (i) => (on ? [6, -6][i] : 0), duration: 0.95, ease: 'power3.inOut' });
          } else {
            gsap.to(cards, { rotationY: on ? 180 : 0, duration: 0.95, ease: 'power3.inOut', stagger: on ? 0.09 : -0.09, overwrite: 'auto' });
            gsap.to([cards[0], cards[2]], { y: on ? 26 : 0, x: (i) => (on ? [28, -28][i] : 0), rotationZ: (i) => (on ? [9, -9][i] : 0), duration: 0.95, ease: 'power3.inOut' });
          }
          gsap.to(hint, { autoAlpha: on ? 1 : 0, y: on ? 0 : 12, duration: 0.6, ease: 'power3.out', delay: on ? 0.5 : 0 });
        };
        this.setGap = setGap; this.setFlip = setFlip;

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: sec, start: 'top top', end: () => '+=' + window.innerHeight * (mob ? 2 : 2.4),
            pin: stage, scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: (self) => {
              const p = self.progress;
              setGap(p >= 0.3);
              setFlip(p >= 0.5);
            }
          }
        });
        tl.fromTo(deck, { scale: mob ? 1.06 : 1.18, y: mob ? 16 : 64 }, { scale: 1, y: 0, duration: 0.26 }, 0)
          .to({}, { duration: 0.74 }, 0.26);

        /* تیتر پیش از پین شدن، هنگام نزدیک شدن بخش ظاهر می‌شود */
        gsap.fromTo(head.children, { autoAlpha: 0, y: 34 }, {
          autoAlpha: 1, y: 0, ease: 'power2.out', stagger: 0.12,
          scrollTrigger: { trigger: sec, start: 'top 82%', end: 'top 18%', scrub: 0.6 }
        });
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      /* چرخش و فاصله در کال‌بک‌های اسکرول ساخته می‌شوند و جزو context نیستند */
      const deck = $('#deck'), cards = $$('.pcard', deck), hint = $('.pillars__hint'), head = $('.pillars__head');
      gsap.killTweensOf([deck, ...cards, hint]);
      gsap.set([deck, ...cards, hint, ...head.children], { clearProps: 'all' });
      deck.classList.remove('is-flipped');
      this.flipped = false; this.setGap = this.setFlip = null;
    },
    reveal() { if (this.setGap) { this.setGap(true); this.setFlip(true); } }
  };

  /* با تب رسیدن به کارت‌ها، کارت‌ها برمی‌گردند تا متن دیده شود */
  $$('.pcard').forEach((c) => c.addEventListener('focus', () => { if (!Pillars.flipped) Pillars.reveal(); }));

  /* ==========================================================================
     نمای بخش: از خود کارت باز می‌شود و به همان کارت برمی‌گردد
     ========================================================================== */
  const view = $('#svc');
  const vbg = $('.svc__bg', view);
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
    if (Motion.on && from) {
      const r = from.getBoundingClientRect();
      gsap.killTweensOf([vbg, ...vscroll.children]);
      gsap.fromTo(vbg, { clipPath: rectClip(r, 24) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.8, ease: 'expo.inOut' });
      gsap.fromTo(vscroll.children, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.38, clearProps: 'transform,opacity' });
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
      gsap.set && Motion.on && gsap.set(vbg, { clearProps: 'clipPath' });
      document.body.style.overflow = '';
      Motion.resume();
      const back = opener && document.contains(opener) && opener.offsetParent !== null ? opener : card;
      if (back) back.focus({ preventScroll: true });
    };
    if (Motion.on) {
      const r = card ? card.getBoundingClientRect() : null;
      const visible = r && r.bottom > 0 && r.top < window.innerHeight;
      gsap.to(vscroll.children, { opacity: 0, y: 20, duration: 0.25, ease: 'power2.in' });
      if (visible) gsap.to(vbg, { clipPath: rectClip(r, 24), duration: 0.7, ease: 'expo.inOut', delay: 0.1, onComplete: done });
      else gsap.to(view, { opacity: 0, duration: 0.35, onComplete: () => { gsap.set(view, { clearProps: 'opacity' }); done(); } });
    } else done();
  }

  const goBack = () => {
    if (history.state && history.state.svc) history.back();
    else { closeSvc(); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* محیط محدود */ } }
  };
  $('#svcBack').addEventListener('click', goBack);
  $$('[data-close-svc]', view).forEach((a) => a.addEventListener('click', () => { closeSvc(); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* محیط محدود */ } }));
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

  /* ---------- عکاس‌ها ---------- */
  const CREDITS = [
    ['Brett Snodgrass', 'https://www.flickr.com/photos/124912440@N03/14804959651'],
    ['Roderick Eime', 'https://www.flickr.com/photos/rodeime/9147444309/'],
    ['mich225', 'https://www.flickr.com/photos/24627533@N04/8388522258'],
    ['Si jediné čo máš.', 'https://www.flickr.com/photos/sijedinecomas/5579309075'],
    ['TownePost Network', 'https://www.flickr.com/photos/atgeist/11322575523'],
    ['Luke Lehrfeld', 'https://www.flickr.com/photos/dermatologycom/7281530984'],
    ['Azim Ghazali', 'https://www.flickr.com/photos/dnashots/9679143591'],
    ['Apotek Hjartat', 'https://www.flickr.com/photos/apotekhjartat/15163270976']
  ];
  const cl = $('#creditList');
  if (cl) cl.innerHTML = CREDITS.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener" dir="ltr">${n}</a>`).join('، ');

  /* ---------- ثبت ماژول‌ها ---------- */
  Motion.add(Reel);
  Motion.add(Pillars);

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
    const k = location.hash.slice(1);
    if (SVC[k]) openSvc(k, null, false);
    setInterval(() => { SLOTS = fillSlots(); }, 5 * 60 * 1000);
  });
})();
