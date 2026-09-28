/* ==========================================================================
   cases.js: صفحه‌ی نمونه‌کارها
   ۱. معرفی چسبان (پرده، سه عکس، دو نیم شدن) با ScrollTrigger؛ قاب با position: sticky ثابت می‌ماند (روی کامپوزیتور).
   ۲. مقایسه‌ی قبل و بعد: کشیدن با موس، انگشت یا کیبورد؛ وقتی کسی با آن کار ندارد، خط وسط آرام تکان می‌خورد.
      هر فریم فقط transform سه لایه عوض می‌شود و فقط قاب‌هایی که روی صفحه‌اند حساب می‌شوند.
   ۳. دیوار عکس: هر ردیف با رسیدن به بالای صفحه بزرگ‌تر می‌شود (scale، بدون تغییر چیدمان صفحه).
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, clamp, toFa, Motion, touchUI } = S;
  const Pg = S.Pages || {};
  const root = document.documentElement;
  const rm = () => root.classList.contains('rm');
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const canAnim = typeof Element.prototype.animate === 'function';
  const refresh = () => { if (Motion.on && window.ScrollTrigger) ScrollTrigger.refresh(); };

  /* ==========================================================================
     ۱. معرفی چسبان
     ========================================================================== */
  const Intro = {
    st: null, tl: null, clone: null,
    build() {
      const sec = $('.cx-intro');
      if (!sec || !window.gsap || !window.ScrollTrigger || rm()) return;
      const stage = $('.cx-intro__stage', sec);
      const small = touchUI || window.innerWidth < 900;
      /* چند صفحه اسکرول تا آخر معرفی؛ صفحه‌ی آخر همان است که بخش بعد از زیر بالا می‌آید */
      const D = small ? 3.6 : 4.4, k = (D - 1) / 3.4;
      sec.style.setProperty('--len', String(D + 1));
      sec.classList.add('is-pin');

      const out = $('.cx-out', sec);
      this.clone = $('.cx-out__h', out).cloneNode(true);
      out.appendChild(this.clone);
      out.classList.add('is-split');
      const halves = $$('.cx-out__h', out);
      const bg = $('.cx-bg', sec), bgImg = $('img', bg), hero = $('.cx-hero', sec), heroIn = $('.cx-hero__in', sec), cue = $('.cx-cue', sec);
      const rev = $('.cx-rev', sec), revP = $('.cx-rev__p', sec), lines = $$('.cx-rev__l', sec);
      const casc = $('.cx-casc', sec), cas = $$('.cx-casc__i', sec);
      const half = () => stage.clientWidth / 2;

      const tl = this.tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      tl.fromTo(bgImg, { scale: 1.22 }, { scale: 1, duration: 2.2 * k }, 0)
        .fromTo(heroIn, { y: 0, autoAlpha: 1 }, { y: -70, autoAlpha: 0, duration: 0.85 * k, ease: 'power1.in' }, 0.25 * k)
        .fromTo(cue, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.25 * k }, 0)
        /* دو خط روشن از وسط قد می‌کشند، بعد مثل لبه‌ی پرده به دو طرف می‌روند و پرده پشتشان باز می‌شود */
        .fromTo(lines, { scaleY: 0 }, { scaleY: 1, duration: 0.75 * k, ease: 'power2.inOut' }, 0.2 * k)
        .fromTo(revP, { scaleX: 0 }, { scaleX: 1, duration: 1 * k, ease: 'power2.inOut' }, 0.95 * k)
        .fromTo(lines[0], { x: 0 }, { x: () => -half(), duration: 1 * k, ease: 'power2.inOut' }, 0.95 * k)
        .fromTo(lines[1], { x: 0 }, { x: () => half(), duration: 1 * k, ease: 'power2.inOut' }, 0.95 * k)
        .fromTo(lines, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.2 * k }, 1.8 * k);
      cas.forEach((c, i) => {
        const at = (1.7 + i * 0.32) * k;
        tl.fromTo(c, { scale: 0 }, { scale: 1, duration: 0.62 * k, ease: 'power2.out' }, at)
          .fromTo($('img', c), { scale: 1.45 }, { scale: 1, duration: 0.8 * k, ease: 'power2.out' }, at);
      });
      const oAt = (1.8 + cas.length * 0.32) * k;
      tl.fromTo(out, { scale: 0 }, { scale: 1, duration: 0.55 * k, ease: 'power2.out' }, oAt)
        .fromTo($$('.cx-out__b, .cx-out__m', out), { xPercent: 85 }, { xPercent: 15, duration: 1.1 * k, ease: 'power1.inOut' }, oAt + 0.15 * k);
      /* صفحه‌ی آخر از وسط دو نیم می‌شود؛ هم‌زمان بخش قبل و بعد از زیرش بالا می‌آید */
      const sAt = D - 1;
      tl.set([bg, hero, rev, casc], { autoAlpha: 0 }, sAt)
        .set(stage, { backgroundColor: 'transparent' }, sAt)
        .fromTo(halves[0], { xPercent: 0 }, { xPercent: -101, duration: 1, ease: 'power2.inOut' }, sAt)
        .fromTo(halves[1], { xPercent: 0 }, { xPercent: 101, duration: 1, ease: 'power2.inOut' }, sAt);

      this.st = ScrollTrigger.create({
        trigger: sec, start: 'top top', end: 'bottom bottom', animation: tl, scrub: true, invalidateOnRefresh: true,
        onToggle: (self) => sec.classList.toggle('is-done', !self.isActive && self.progress > 0.99)
      });
    },
    kill() {
      if (this.st) { this.st.kill(); this.st = null; }
      if (this.tl) { this.tl.progress(0).kill(); this.tl = null; }
      const sec = $('.cx-intro');
      if (!sec) return;
      if (this.clone) { this.clone.remove(); this.clone = null; }
      const out = $('.cx-out', sec);
      if (out) out.classList.remove('is-split');
      sec.classList.remove('is-pin', 'is-done');
      sec.style.removeProperty('--len');
      if (window.gsap) gsap.set($$('.cx-intro__stage, .cx-bg, .cx-bg img, .cx-hero, .cx-hero__in, .cx-cue, .cx-rev, .cx-rev__p, .cx-rev__l, .cx-casc, .cx-casc__i, .cx-casc__i img, .cx-out, .cx-out__h, .cx-out__b, .cx-out__m', sec), { clearProps: 'all' });
    }
  };

  /* ==========================================================================
     ۲. مقایسه‌ی قبل و بعد
     p جای خط از چپ است (۰ تا ۱)؛ سمت راست خط «قبل» و سمت چپ «بعد» است (خواندن از راست به چپ).
     ========================================================================== */
  const active = new Set();
  let raf = 0, lastT = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;
    active.forEach((s) => s.step(now, dt));
    raf = active.size ? requestAnimationFrame(loop) : 0;
  };
  const wake = (s) => { active.add(s); if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } };

  const valText = (v) => (v <= 0 ? 'فقط عکس بعد از درمان' : v >= 100 ? 'فقط عکس قبل از درمان' : `${toFa(v)} درصد قبل، ${toFa(100 - v)} درصد بعد`);

  /* تکان خودکار با انیمیشن بومی روی کامپوزیتور: وقتی کسی با قاب کار ندارد هیچ کاری روی رشته‌ی اصلی انجام نمی‌شود */
  const SWAY = 0.06, SWAY_T = 2900, SINE = 'cubic-bezier(.37, 0, .63, 1)';

  function Compare(fig) {
    const b = $('.ba__b', fig), bi = $('img', b), hw = $('.ba__hw', fig), knob = $('.ba__k', fig);
    const seg = fig.parentElement && $('.cx__seg', fig.parentElement);
    const segBtns = seg ? $$('button', seg) : [];
    const s = { p: 0.5, v: 0, target: 0.5, mode: 'auto', vis: false, seen: false, drag: false, painted: -1, nb: null, na: null, anims: null, idleT: 0, idleMs: 4200 };
    const tx = (p) => (p * 100).toFixed(3);
    const labels = (p) => {
      const nb = p > 0.86, na = p < 0.14;
      if (nb !== s.nb) { s.nb = nb; fig.classList.toggle('no-b', nb); }
      if (na !== s.na) { s.na = na; fig.classList.toggle('no-a', na); }
    };
    const paint = () => {
      if (Math.abs(s.p - s.painted) < 0.00015) return;
      s.painted = s.p;
      const x = tx(s.p);
      b.style.transform = `translate3d(${x}%, 0, 0)`;
      bi.style.transform = `translate3d(-${x}%, 0, 0)`;
      hw.style.transform = `translate3d(${x}%, 0, 0)`;
      labels(s.p);
    };
    const aria = () => {
      const v = Math.round((1 - s.target) * 100);
      knob.setAttribute('aria-valuenow', String(v));
      knob.setAttribute('aria-valuetext', valText(v));
    };

    /* ---------- تکان خودکار ---------- */
    const play = (from, to, opts) => [
      [b, ''], [bi, '-'], [hw, '']
    ].map(([el, sg]) => el.animate([{ transform: `translate3d(${sg}${tx(from)}%, 0, 0)` }, { transform: `translate3d(${sg}${tx(to)}%, 0, 0)` }], opts));
    /* جای واقعی خط وسط همین لحظه (وسط انیمیشن هم درست است) */
    const livePos = () => {
      if (!s.anims) return s.p;
      const m = getComputedStyle(hw).transform;
      if (!m || m === 'none' || typeof DOMMatrixReadOnly !== 'function') return s.p;
      return clamp(new DOMMatrixReadOnly(m).m41 / (hw.offsetWidth || 1), 0, 1);
    };
    const stopSway = () => {
      clearTimeout(s.idleT);
      if (!s.anims) return;
      s.p = livePos(); s.v = 0; s.painted = -1; paint();
      s.anims.forEach((a) => a.cancel()); s.anims = null;
    };
    /* از هر جا که هست، آرام به یک سوی وسط می‌رود و از آن‌جا بی‌پایان رفت‌وبرگشت می‌کند (فقط وقتی روی صفحه است) */
    const sway = (delay = 0) => {
      if (rm() || !canAnim || s.anims) return;
      const from = s.p, c = 0.5, up = from >= c;
      const a = up ? c + SWAY : c - SWAY, z = up ? c - SWAY : c + SWAY;
      const glide = play(from, a, { duration: 700 + 2600 * Math.abs(from - a), delay, easing: 'cubic-bezier(.45, 0, .25, 1)', fill: 'both' });
      s.anims = glide;
      labels(a);
      glide[0].onfinish = () => {
        if (s.anims !== glide) return;
        const loopA = play(a, z, { duration: SWAY_T, easing: SINE, iterations: Infinity, direction: 'alternate' });
        glide.forEach((x) => x.cancel());
        s.anims = loopA; s.p = a;
        if (!s.vis) loopA.forEach((x) => x.pause());
      };
      if (!s.vis) glide.forEach((x) => x.pause());
    };
    const idle = () => {
      clearTimeout(s.idleT);
      s.idleT = setTimeout(() => {
        if (s.mode !== 'user' || s.drag) return;
        s.mode = 'auto'; segPut(false);
        if (s.vis) sway();
      }, s.idleMs);
    };

    /* دکمه‌های «قبل، مقایسه، بعد»: نشانگر تیره زیر دکمه‌ی فعال می‌لغزد */
    let ind = null;
    const segPut = (instant) => {
      if (!seg) return;
      const on = s.mode === 'fixed' ? (s.target <= 0.001 ? '0' : '100') : '50';
      segBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === on)));
      const btn = segBtns.find((x) => x.dataset.v === on);
      if (!ind || !btn || !btn.offsetWidth) return;
      if (instant) ind.style.transition = 'none';
      ind.style.setProperty('--x', btn.offsetLeft + 'px');
      ind.style.setProperty('--w', btn.offsetWidth + 'px');
      if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
    };
    if (seg) {
      ind = document.createElement('i'); ind.className = 'cx__seg-ind'; ind.setAttribute('aria-hidden', 'true');
      seg.prepend(ind); seg.classList.add('has-ind');
      requestAnimationFrame(() => segPut(true));
      if ('ResizeObserver' in window) new ResizeObserver(() => segPut(true)).observe(seg);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => segPut(true));
      segBtns.forEach((x) => x.addEventListener('click', () => {
        const v = +x.dataset.v / 100;
        stopSway(); active.delete(s);
        if (v === 0.5) { s.mode = 'auto'; s.target = 0.5; if (rm()) { s.p = 0.5; paint(); } else sway(); }
        else { s.mode = 'fixed'; s.target = v; wake(s); }
        aria(); segPut(false);
      }));
    }

    /* ---------- فنر برای کشیدن، کیبورد و دکمه‌ها (فقط همان لحظه‌ها) ---------- */
    s.step = (now, dt) => {
      const w = s.drag ? 26 : 10;
      if (rm()) { s.p = s.target; s.v = 0; }
      else {
        /* میرایی بحرانی: بدون لرزش و برگشت، فقط آرام می‌نشیند */
        const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
        for (let i = 0; i < n; i++) { const a = w * w * (s.target - s.p) - 2 * w * s.v; s.v += a * h; s.p += s.v * h; }
      }
      s.p = clamp(s.p, 0, 1);
      paint();
      if (!s.drag && Math.abs(s.target - s.p) < 0.0005 && Math.abs(s.v) < 0.001) {
        s.p = s.target; s.v = 0; paint(); active.delete(s);
        if (s.mode === 'user') idle();
      }
    };

    /* ---------- کشیدن ---------- */
    let rect = null, pid = null, sx = 0, sy = 0, armed = false;
    const posOf = (e) => clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const grab = (e) => {
      stopSway();
      s.drag = true; s.mode = 'user'; fig.classList.add('is-drag');
      s.target = posOf(e); s.idleMs = 4200;
      segPut(false); wake(s);
    };
    fig.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      rect = fig.getBoundingClientRect(); pid = e.pointerId; sx = e.clientX; sy = e.clientY;
      try { fig.setPointerCapture(pid); } catch (err) { /* بعضی مرورگرها */ }
      /* لمس: اول معلوم شود کشیدن افقی است یا اسکرول صفحه (حتی روی دستگیره)؛ با موس و قلم بلافاصله */
      if (e.pointerType !== 'touch') { armed = false; grab(e); if (e.pointerType === 'mouse') e.preventDefault(); }
      else armed = true;
    });
    fig.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      if (armed) {
        const dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy);
        if (dx > 6 && dx > dy) { armed = false; grab(e); }
        return;
      }
      if (s.drag) s.target = posOf(e);
    });
    const end = (e, tap) => {
      if (e.pointerId !== pid) return;
      if (armed && tap) { stopSway(); s.mode = 'user'; s.idleMs = 4200; s.target = posOf(e); segPut(false); }
      const was = s.drag || (armed && tap);
      armed = false; pid = null;
      if (!was) return;
      s.drag = false; fig.classList.remove('is-drag');
      aria(); wake(s);
    };
    fig.addEventListener('pointerup', (e) => end(e, true));
    fig.addEventListener('pointercancel', (e) => end(e, false));
    fig.addEventListener('lostpointercapture', (e) => { if (s.drag && e.pointerId === pid) end(e, false); });
    fig.addEventListener('dragstart', (e) => e.preventDefault());

    /* ---------- کیبورد (مقدار = درصد «قبل»؛ چپ و بالا بیشتر، راست و پایین کمتر) ---------- */
    knob.addEventListener('keydown', (e) => {
      const big = 0.2, sm = e.shiftKey ? 0.1 : 0.04;
      let t = s.mode === 'auto' ? livePos() : s.target;
      switch (e.key) {
        case 'ArrowLeft': case 'ArrowUp': t -= sm; break;
        case 'ArrowRight': case 'ArrowDown': t += sm; break;
        case 'PageUp': t -= big; break;
        case 'PageDown': t += big; break;
        case 'Home': t = 1; break;
        case 'End': t = 0; break;
        default: return;
      }
      e.preventDefault();
      stopSway();
      s.mode = 'user'; s.target = clamp(t, 0, 1); s.idleMs = 6000;
      aria(); segPut(false); wake(s);
    });
    knob.addEventListener('blur', () => { if (s.mode === 'user' && !s.drag && !active.has(s)) { s.idleMs = 2500; idle(); } });

    s.show = (vis) => {
      s.vis = vis;
      if (!vis) { if (s.anims) s.anims.forEach((a) => a.pause()); return; }
      /* بار اول که دیده شد: خط از کنار راست به وسط می‌آید و بعد آرام تکان می‌خورد */
      if (!s.seen) { s.seen = true; if (s.mode === 'auto') sway(250); return; }
      if (s.anims) s.anims.forEach((a) => a.play());
      else if (s.mode === 'auto') sway();
    };
    s.el = fig;
    if (!rm() && canAnim) s.p = 0.9;
    paint();
    return s;
  }

  const figs = $$('[data-ba]');
  const comps = figs.map(Compare);
  if (comps.length) {
    if ('IntersectionObserver' in window) {
      const byEl = new Map(comps.map((c) => [c.el, c]));
      const io = new IntersectionObserver((ents) => ents.forEach((en) => {
        const c = byEl.get(en.target);
        if (c) c.show(en.isIntersecting && en.intersectionRatio > 0.25);
      }), { threshold: [0, 0.3] });
      figs.forEach((f) => io.observe(f));
    } else comps.forEach((c) => c.show(true));
  }

  /* ==========================================================================
     ورود هر نمونه با اسکرول
     ========================================================================== */
  const Rows = {
    io: null, anims: [],
    build() {
      if (rm() || !canAnim || !('IntersectionObserver' in window)) return;
      const vh = window.innerHeight;
      const rows = $$('.cx').filter((r) => !r.hidden && r.getBoundingClientRect().top > vh * 0.92);
      rows.forEach((r) => r.classList.add('is-pre'));
      this.io = new IntersectionObserver((ents) => ents.forEach((en) => {
        if (!en.isIntersecting) return;
        this.io.unobserve(en.target);
        this.play(en.target);
      }), { rootMargin: '0px 0px -12% 0px' });
      rows.forEach((r) => this.io.observe(r));
    },
    play(r, d = 0) {
      if (this.io) this.io.unobserve(r);
      r.classList.remove('is-pre');
      const m = $('.cx__media', r);
      this.anims.push(m.animate([{ opacity: 0, transform: 'translate3d(0, 56px, 0) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 1150, delay: d, easing: EASE, fill: 'backwards' }));
      $$('.cx__info > *', r).forEach((k, i) => this.anims.push(k.animate([{ opacity: 0, transform: 'translate3d(0, 26px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 950, delay: d + 140 + i * 70, easing: EASE, fill: 'backwards' })));
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      this.anims.forEach((a) => a.cancel()); this.anims = [];
      $$('.cx.is-pre').forEach((r) => r.classList.remove('is-pre'));
    }
  };

  /* ---------- فیلتر نوع درمان ---------- */
  function Filter() {
    const box = $('.cx-tabs'), list = $('.cx-list'), bar = $('.cx-bar'), mark = $('.cx-bar__mark');
    if (!box || !list) return;
    const rows = $$('.cx', list), count = $('.cx-count b');
    const btns = $$(':scope > button', box);
    let cur = 'all', fade = null;
    if (Pg.Pill) Pg.Pill(box);
    const paint = () => {
      let n = 0;
      rows.forEach((r) => {
        const on = cur === 'all' || r.dataset.t === cur;
        r.hidden = !on;
        if (on) { r.classList.toggle('cx--alt', n % 2 === 1); n++; }
      });
      if (count) count.textContent = toFa(n);
      if (Pg.syncLenis) Pg.syncLenis();
    };
    /* اگر نوار چسبیده بود، بی‌صدا به ابتدای فهرست برمی‌گردیم */
    const toTop = () => {
      if (!mark || !bar) return;
      const y = Math.round(mark.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(bar).top) || 0));
      if (window.scrollY <= y + 1) return;
      window.scrollTo(0, y);
      if (Motion.lenis) Motion.lenis.scrollTo(y, { immediate: true, force: true });
    };
    const enter = () => {
      const vh = window.innerHeight;
      let i = 0;
      rows.filter((r) => !r.hidden).forEach((r) => {
        const rc = r.getBoundingClientRect();
        if (rc.top > vh || rc.bottom < 0) return;
        Rows.play(r, i++ * 90);
      });
    };
    const set = (f) => {
      if (f === cur) return;
      cur = f;
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.f === f)));
      if (fade) { fade.cancel(); fade = null; }
      if (!canAnim || rm() || !Motion.on) { paint(); toTop(); refresh(); return; }
      fade = list.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, easing: 'ease-out', fill: 'forwards' });
      fade.onfinish = () => {
        paint(); toTop(); refresh();
        fade.cancel(); fade = null;
        enter();
      };
    };
    btns.forEach((x) => x.addEventListener('click', () => set(x.dataset.f)));
    /* نوار زبانه‌ها وقتی زیر هدر چسبید، پس‌زمینه‌ی سفید می‌گیرد */
    if (bar && mark && 'IntersectionObserver' in window) {
      let io = null;
      const watch = () => {
        if (io) io.disconnect();
        const top = Math.round(parseFloat(getComputedStyle(bar).top) || 0);
        io = new IntersectionObserver(([en]) => bar.classList.toggle('is-stuck', !en.isIntersecting && en.boundingClientRect.top < top), { rootMargin: `-${top}px 0px 0px 0px` });
        io.observe(mark);
      };
      watch();
      let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(watch, 200); });
    }
    /* لینک به یک نمونه‌ی پنهان (مثلاً #case-crown): اول همه نمایش داده می‌شوند */
    const reveal = () => {
      const t = location.hash && document.getElementById(location.hash.slice(1));
      const r = t && t.closest('.cx');
      if (r && r.hidden) { cur = '__'; set('all'); }
    };
    reveal();
    window.addEventListener('hashchange', reveal);
  }
  Filter();

  /* ==========================================================================
     ۳. دیوار عکس: ردیف‌ها با رسیدن به بالای صفحه از نصف تا اندازه‌ی کامل بزرگ می‌شوند.
     هر ردیف به اندازه‌ی کوچک شدن ردیف‌های بالایی بالا می‌آید تا فاصله‌ها یکدست بماند.
     ========================================================================== */
  const Wall = {
    st: null, frame: null,
    build() {
      const sec = $('.cx-wall');
      if (!sec || rm() || !window.gsap || !window.ScrollTrigger) return;
      const rows = $$('.cx-wall__row', sec);
      if (!rows.length) return;
      sec.classList.add('is-live');
      let H = 0, T = [], vh = 0, s0 = 0.5;
      const last = rows.map(() => '');
      const measure = () => {
        vh = window.innerHeight;
        s0 = window.innerWidth < 900 ? 0.42 : 0.5;
        H = rows[0].offsetHeight;
        const top = sec.getBoundingClientRect().top + window.scrollY;
        T = rows.map((r) => top + r.offsetTop);
      };
      measure();
      const frame = this.frame = () => {
        const y = window.scrollY;
        let acc = 0;
        for (let i = 0; i < rows.length; i++) {
          const p = clamp((y + vh - T[i]) / (vh + H), 0, 1);
          const sc = s0 + (1 - s0) * (1 - Math.pow(1 - p, 1.6));
          const tr = `translate3d(-50%, ${acc.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
          if (tr !== last[i]) { last[i] = tr; rows[i].style.transform = tr; }
          acc += (sc - 1) * H;
        }
      };
      frame();
      let on = false;
      const toggle = (v) => { if (v === on) return; on = v; if (v) gsap.ticker.add(frame); else gsap.ticker.remove(frame); };
      this.st = ScrollTrigger.create({
        trigger: sec, start: 'top bottom', end: 'bottom top',
        onToggle: (self) => { toggle(self.isActive); frame(); },
        onRefresh: () => { measure(); frame(); }
      });
      this.off = () => toggle(false);
    },
    kill() {
      if (this.off) { this.off(); this.off = null; }
      if (this.st) { this.st.kill(); this.st = null; }
      const sec = $('.cx-wall');
      if (!sec) return;
      sec.classList.remove('is-live');
      $$('.cx-wall__row', sec).forEach((r) => { r.style.transform = ''; });
    }
  };

  if ($('.cx-intro')) Motion.add(Intro);
  if ($('.cx')) Motion.add(Rows);
  if ($('.cx-wall')) Motion.add(Wall);
})();
