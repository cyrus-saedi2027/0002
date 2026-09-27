/* ==========================================================================
   pages.js: صفحه‌های داخلی (پزشکان، درباره‌ی ما)
   هر بخش فقط وقتی ساخته می‌شود که در همان صفحه باشد.
   حرکت‌ها با انیمیشن بومی مرورگر (transform و opacity روی کامپوزیتور) یا ScrollTrigger اند و هیچ‌کدام بی‌پایان نیستند.
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, toFa, Motion, Clinic } = S;
  const root = document.documentElement;
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';
  const canAnim = typeof Element.prototype.animate === 'function';
  const anim = () => Motion.on && canAnim && !root.classList.contains('rm');
  const up = (y = 26) => [{ opacity: 0, transform: `translate3d(0, ${y}px, 0)` }, { opacity: 1, transform: 'none' }];
  const refresh = () => { if (Motion.on && window.ScrollTrigger) ScrollTrigger.refresh(); };

  /* ---------- زبانه‌های کپسولی: نشانگر تیره با فنر زیر زبانه‌ی انتخاب‌شده می‌لغزد ---------- */
  function Pill(box) {
    const btns = box ? $$(':scope > button', box) : [];
    if (!btns.length) return () => {};
    const ind = document.createElement('i'); ind.className = 'pill'; ind.setAttribute('aria-hidden', 'true');
    box.prepend(ind); box.classList.add('has-pill');
    const put = (instant) => {
      const b = btns.find((x) => x.getAttribute('aria-pressed') === 'true'); if (!b || !b.offsetWidth) return;
      if (instant) ind.style.transition = 'none';
      ind.style.setProperty('--x', b.offsetLeft + 'px'); ind.style.setProperty('--y', b.offsetTop + 'px');
      ind.style.setProperty('--w', b.offsetWidth + 'px'); ind.style.setProperty('--h', b.offsetHeight + 'px');
      if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
      /* اگر زبانه‌ها روی موبایل افقی اسکرول می‌شوند، زبانه‌ی انتخاب‌شده به وسط می‌آید */
      if (box.scrollWidth > box.clientWidth + 2) {
        box.scrollTo({ left: b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2, behavior: instant || !anim() ? 'auto' : 'smooth' });
      }
    };
    btns.forEach((b) => b.addEventListener('click', () => requestAnimationFrame(() => put(false))));
    if ('ResizeObserver' in window) new ResizeObserver(() => put(true)).observe(box);
    else requestAnimationFrame(() => put(true));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(() => put(true)));
    return put;
  }

  /* ==========================================================================
     سربرگ: شمارش اعداد (یک بار)
     ========================================================================== */
  const Count = {
    done: false,
    build() {
      if (this.done) return;
      this.done = true;
      const els = $$('.pg-stats [data-count]');
      if (!els.length || !anim()) return;
      const t0 = performance.now() + 450, dur = 1500;
      const out = (e) => els.forEach((el) => { el.textContent = toFa(Math.round(+el.dataset.count * e)); });
      out(0);
      const tick = (now) => {
        const p = Math.min(1, Math.max(0, (now - t0) / dur));
        out(1 - Math.pow(1 - p, 4));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    kill() { $$('.pg-stats [data-count]').forEach((el) => { el.textContent = toFa(el.dataset.count); }); this.done = true; }
  };

  /* ==========================================================================
     پزشکان: پروفایل‌ها (ورود هر کارت، حرکت آرام عکس در قاب)
     ========================================================================== */
  const Cards = {
    io: null, anims: [], tws: [],
    build() {
      const cards = $$('.dr-card');
      if (!cards.length) return;
      if (window.gsap && window.ScrollTrigger && !root.classList.contains('rm')) {
        cards.forEach((c) => {
          const inn = $('.dr-card__in', c);
          this.tws.push(gsap.fromTo(inn, { yPercent: -4.5 }, { yPercent: 4.5, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } }));
        });
      }
      if (!anim() || !('IntersectionObserver' in window)) return;
      const vh = window.innerHeight;
      const pend = cards.filter((c) => c.getClientRects().length && c.getBoundingClientRect().top > vh * 0.82);
      pend.forEach((c) => c.classList.add('is-pre'));
      this.io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) this.show(en.target); }), { rootMargin: '0px 0px -12% 0px' });
      pend.forEach((c) => this.io.observe(c));
    },
    show(c) {
      if (this.io) this.io.unobserve(c);
      if (!c.classList.contains('is-pre')) return;
      c.classList.remove('is-pre');
      if (!anim()) return;
      const o = { easing: EASE, fill: 'backwards' }, A = this.anims;
      const fr = $('.dr-card__frame', c), img = $('.dr-card__in img', c), no = $('.dr-card__no', c);
      A.push(fr.animate([{ opacity: 0, transform: 'translate3d(0, 44px, 0) scale(.94)' }, { opacity: 1, transform: 'none' }], { ...o, duration: 1100 }));
      A.push(img.animate([{ transform: 'scale(1.16)' }, { transform: 'none' }], { ...o, duration: 1700 }));
      if (no) A.push(no.animate(up(30), { ...o, duration: 900, delay: 380 }));
      $$('.dr-card__body > *', c).forEach((k, i) => A.push(k.animate(up(), { ...o, duration: 900, delay: 110 + i * 60 })));
      $$('.dr-week li.is-on', c).forEach((li, i) => A.push(li.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 620 + i * 55, easing: SPRING, fill: 'backwards' })));
      if (A.length > 120) this.anims = A.filter((a) => a.playState !== 'finished');
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      this.anims.forEach((a) => a.cancel()); this.anims = [];
      this.tws.forEach((t) => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); }); this.tws = [];
      if (window.gsap) gsap.set($$('.dr-card__in'), { clearProps: 'transform' });
      $$('.dr-card.is-pre').forEach((c) => c.classList.remove('is-pre'));
    }
  };

  /* ---------- فیلتر بخش‌ها ---------- */
  let setFilter = () => {};
  function Filter() {
    const box = $('.dr-tabs'), list = $('.dr-cards');
    if (!box || !list) return;
    const cards = $$('.dr-card'), count = $('.dr-count b'), bar = $('.dr-bar'), sec = $('#profiles');
    const btns = $$(':scope > button', box);
    let cur = 'all', fade = null;
    const paint = () => {
      let n = 0;
      cards.forEach((c) => {
        const on = cur === 'all' || c.dataset.k === cur;
        c.hidden = !on;
        if (on) { c.classList.toggle('is-first', n === 0); c.classList.toggle('is-alt', n % 2 === 1); n++; }
      });
      if (count) count.textContent = toFa(n);
      /* مرورگر با «لنگر اسکرول» جای دید را ثابت نگه می‌دارد و scrollY عوض می‌شود؛ اسکرول نرم باید همان را بداند */
      const L = Motion.lenis;
      if (L) { if (L.resize) L.resize(); L.scrollTo(window.scrollY, { immediate: true, force: true }); }
    };
    paint();
    const put = Pill(box);
    /* اگر نوار چسبیده و فهرست کوتاه‌تر شد، بی‌صدا به ابتدای فهرست برمی‌گردیم تا بیننده وسط برنامه‌ی هفتگی نیفتد */
    const toTop = () => {
      const y = Math.round(sec.getBoundingClientRect().top + window.scrollY + (parseFloat(getComputedStyle(sec).paddingTop) || 0) - (parseFloat(getComputedStyle(bar).top) || 0)) + 2;
      if (window.scrollY <= y + 1) return;
      window.scrollTo(0, y);
      if (Motion.lenis) Motion.lenis.scrollTo(y, { immediate: true, force: true });
    };
    const enter = () => {
      const vh = window.innerHeight;
      cards.filter((c) => !c.hidden).forEach((c, i) => {
        const r = c.getBoundingClientRect();
        if (r.top > vh || r.bottom < 0) return;
        if (c.classList.contains('is-pre')) Cards.show(c);
        else Cards.anims.push(c.animate(up(34), { duration: 800, delay: i * 70, easing: EASE, fill: 'backwards' }));
      });
    };
    setFilter = (f, instant) => {
      if (f === cur) return;
      cur = f;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
      if (fade) { fade.cancel(); fade = null; }
      if (instant || !anim()) { paint(); put(true); refresh(); return; }
      fade = list.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, easing: 'ease-out', fill: 'forwards' });
      fade.onfinish = () => {
        paint(); toTop(); refresh();
        fade.cancel(); fade = null;
        enter();
      };
    };
    btns.forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.f)));
    /* چسبیدن نوار: فقط کلاس خود نوار عوض می‌شود (نه html) تا صفحه دوباره استایل نخورد */
    const mark = $('.dr-list__top');
    if (mark && 'IntersectionObserver' in window) {
      let io = null;
      const watch = () => {
        if (io) io.disconnect();
        const top = Math.round(parseFloat(getComputedStyle(bar).top) || 0);
        io = new IntersectionObserver(([en]) => {
          const stuck = !en.isIntersecting && en.boundingClientRect.top < top;
          bar.classList.toggle('is-stuck', stuck);
        }, { rootMargin: `-${top - 22}px 0px 0px 0px` });
        io.observe(mark);
      };
      watch();
      let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(watch, 200); });
    }
  }

  /* لینک به پروفایلی که فیلتر پنهانش کرده: اول همه نمایش داده می‌شوند، بعد هسته‌ی سایت نرم تا آنجا می‌رود */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#dr-"]');
    if (!a) return;
    const an = document.getElementById(a.getAttribute('href').slice(1));
    const card = an && an.closest('.dr-card');
    if (card && card.hidden) setFilter('all', true);
  }, true);

  /* ==========================================================================
     پزشکان: برنامه‌ی هفتگی (امروز، انتخاب روز روی موبایل، ورود خانه‌ها)
     ========================================================================== */
  function Week() {
    const sec = $('.dr-sch');
    if (!sec) return;
    const today = Clinic.today();
    $$(`.dr-sch__t [data-d="${today}"]`).forEach((el) => el.classList.add('is-today'));
    const box = $('.dr-sch__days'), btns = box ? $$(':scope > button', box) : [];
    const sel = (i, animate) => {
      sec.dataset.sel = String(i);
      btns.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.d === i)));
      if (animate && anim()) {
        $$(`.dr-sch__t td[data-d="${i}"]`).forEach((td, k) => td.animate([{ opacity: 0, transform: 'translate3d(-16px, 0, 0)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: k * 45, easing: EASE, fill: 'backwards' }));
      }
    };
    btns.forEach((b) => {
      if (+b.dataset.d === today) b.classList.add('is-today');
      b.addEventListener('click', () => sel(+b.dataset.d, true));
    });
    sel(today, false);
    Pill(box);
  }
  const WeekFx = {
    io: null, anims: [],
    build() {
      const t = $('.dr-sch__t');
      if (!t || !anim() || !('IntersectionObserver' in window)) return;
      if (t.getBoundingClientRect().top < window.innerHeight * 0.85) return;
      t.classList.add('is-pre');
      this.io = new IntersectionObserver((ents) => {
        if (!ents.some((en) => en.isIntersecting)) return;
        this.io.disconnect(); this.io = null;
        t.classList.remove('is-pre');
        if (!anim()) return;
        $$('tbody tr', t).forEach((tr, r) => {
          const av = $('.dr-sch__av', tr);
          if (av) this.anims.push(av.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: r * 70, easing: SPRING, fill: 'backwards' }));
          $$('td > *', tr).forEach((p) => {
            const d = +p.parentElement.dataset.d;
            this.anims.push(p.animate([{ opacity: 0, transform: 'scaleX(.2)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 120 + r * 70 + d * 45, easing: EASE, fill: 'backwards' }));
          });
        });
      }, { rootMargin: '0px 0px -15% 0px' });
      this.io.observe(t);
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      this.anims.forEach((a) => a.cancel()); this.anims = [];
      const t = $('.dr-sch__t'); if (t) t.classList.remove('is-pre');
    }
  };

  /* ==========================================================================
     درباره‌ی ما: عکس بزرگ سربرگ با اسکرول کامل می‌شود
     ========================================================================== */
  const Shot = {
    tws: [],
    build() {
      const shot = $('.ab-shot');
      if (!shot || !window.gsap || !window.ScrollTrigger || root.classList.contains('rm')) return;
      const inn = $('.ab-shot__in', shot);
      this.tws.push(gsap.fromTo(shot, { scale: 0.9 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: shot, start: 'top bottom', end: 'center 45%', scrub: true } }));
      this.tws.push(gsap.fromTo(inn, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: shot, start: 'top bottom', end: 'bottom top', scrub: true } }));
    },
    kill() {
      this.tws.forEach((t) => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); }); this.tws = [];
      if (window.gsap) gsap.set(['.ab-shot', '.ab-shot__in'], { clearProps: 'transform' });
    }
  };

  /* ---------- عددها وقتی دیده شدند می‌شمارند (یک بار) ---------- */
  const CountIn = {
    done: false, io: null,
    build() {
      const box = $('.ab-facts');
      if (this.done || !box || !anim() || !('IntersectionObserver' in window)) return;
      const els = $$('[data-count]', box);
      this.io = new IntersectionObserver((ents) => {
        if (!ents.some((en) => en.isIntersecting)) return;
        this.io.disconnect(); this.io = null; this.done = true;
        const t0 = performance.now() + 150, dur = 1500;
        const out = (e) => els.forEach((el) => { el.textContent = toFa(Math.round(+el.dataset.count * e)); });
        out(0);
        const tick = (now) => { const p = Math.min(1, Math.max(0, (now - t0) / dur)); out(1 - Math.pow(1 - p, 4)); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }, { rootMargin: '0px 0px -15% 0px' });
      this.io.observe(box);
    },
    kill() { if (this.io) { this.io.disconnect(); this.io = null; } $$('.ab-facts [data-count]').forEach((el) => { el.textContent = toFa(el.dataset.count); }); }
  };

  /* ---------- چهار قول: قدمی که از خط وسط صفحه رد می‌شود فعال می‌شود و عکس کنار با محو نرم عوض می‌شود ---------- */
  function Story() {
    const steps = $$('.ab-step'), imgs = $$('.ab-story__img'), num = $('.ab-story__count b');
    if (!steps.length || !('IntersectionObserver' in window)) return;
    let cur = 0;
    const set = (i) => {
      if (i === cur) return;
      const prev = imgs[cur], next = imgs[i];
      cur = i;
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      if (num) num.textContent = toFa(String(i + 1).padStart(2, '0'));
      if (!next || !prev) return;
      imgs.forEach((im) => im.getAnimations && im.getAnimations().forEach((a) => a.cancel()));
      prev.classList.remove('is-on'); next.classList.add('is-on');
      if (!anim()) return;
      prev.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
      next.animate([{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'none' }], { duration: 1000, easing: EASE });
    };
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) set(steps.indexOf(en.target)); }), { rootMargin: '-50% 0px -50% 0px' });
    steps.forEach((s) => io.observe(s));
  }

  /* ---------- نقشه: وقتی دیده شد، آرام روی کلینیک زوم می‌شود و نشانه فرود می‌آید ---------- */
  function MapIn() {
    const map = $('.ab-map');
    if (!map) return;
    if (!anim() || !('IntersectionObserver' in window)) { map.classList.add('is-in'); return; }
    map.classList.add('is-pre');
    const io = new IntersectionObserver((ents) => {
      if (!ents.some((en) => en.isIntersecting)) return;
      io.disconnect();
      map.classList.remove('is-pre'); map.classList.add('is-in');
      if (!anim()) return;
      const w = $('.ab-map__world', map), pin = $('.ab-map__pin', map);
      w.animate([{ transform: 'scale(.72)' }, { transform: 'none' }], { duration: 1800, easing: EASE });
      pin.animate([{ opacity: 0, transform: 'translate3d(0, -26px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 700, easing: SPRING, fill: 'backwards' });
    }, { rootMargin: '0px 0px -20% 0px' });
    io.observe(map);
  }

  /* ==========================================================================
     راه‌اندازی
     ========================================================================== */
  if ($('.pg-stats')) Motion.add(Count);
  if ($('.dr-card')) { Filter(); Motion.add(Cards); }
  if ($('.dr-sch')) { Week(); Motion.add(WeekFx); }
  if ($('.ab-shot')) Motion.add(Shot);
  if ($('.ab-facts')) Motion.add(CountIn);
  if ($('.ab-step')) Story();
  /* نقشه به روشن شدن حرکت بستگی دارد؛ بعد از راه‌اندازی هسته ساخته می‌شود */
  if ($('.ab-map')) document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(MapIn));
})();
