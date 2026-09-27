/* ==========================================================================
   core.js: ابزارها، تنظیمات دسترس‌پذیری، اسکرول نرم، صحنه‌ی گرادیانی، هدر
   ========================================================================== */
(function () {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const toFa = (s) => String(s).replace(/[0-9]/g, (d) => FA[d]).replace(/\./g, '٫');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ذخیره‌سازی در دسترس نیست */ } }
  };
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- فنر ساده برای حرکت‌های دنبال‌کننده (نشانگر منو، کشیدن شیت) ---------- */
  class Spring {
    constructor(value, opts = {}) {
      this.v = value; this.t = value; this.vel = 0;
      this.k = opts.stiffness || 320; this.c = opts.damping || 30; this.onUpdate = opts.onUpdate || null; this.onRest = null;
      this._raf = 0; this._last = 0;
      this._tick = this._tick.bind(this);
    }
    to(t, onRest) { this.t = t; this.onRest = onRest || null; if (!this._raf) { this._last = performance.now(); this._raf = requestAnimationFrame(this._tick); } }
    snap(v) { this.v = this.t = v; this.vel = 0; if (this.onUpdate) this.onUpdate(v); }
    _tick(now) {
      const dt = Math.min(0.032, (now - this._last) / 1000); this._last = now;
      const f = -this.k * (this.v - this.t) - this.c * this.vel;
      this.vel += f * dt; this.v += this.vel * dt;
      if (Math.abs(this.vel) < 4 && Math.abs(this.v - this.t) < 0.4) {
        this.v = this.t; this.vel = 0; this._raf = 0;
        if (this.onUpdate) this.onUpdate(this.v);
        if (this.onRest) { const cb = this.onRest; this.onRest = null; cb(); }
        return;
      }
      if (this.onUpdate) this.onUpdate(this.v);
      this._raf = requestAnimationFrame(this._tick);
    }
  }

  /* ==========================================================================
     مدیر حرکت: GSAP، Lenis و ماژول‌های صفحه را روشن/خاموش می‌کند
     ========================================================================== */
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    /* بعد از load و رسیدن فونت‌ها خودمان تصمیم می‌گیریم؛ اندازه‌گیری دوباره‌ی کل صفحه وسط اسکرول همان «ایست و پرش» است */
    ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,resize' });
  }

  /* اسکرول نرم با فنر بحرانی: حرکت آرام شروع می‌شود، وسط روان است و آرام می‌نشیند (منحنی S)؛
     سرعت و مقدار اسکرول همان مقدار عادی است و هیچ برگشت و لرزشی ندارد */
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function springify(lenis) {
    const A = lenis && lenis.animate;
    if (!A || typeof A.advance !== 'function') return;
    const base = A.advance.bind(A);
    const W = 9.5, K = W * W, C = 2 * W;
    let v = 0;
    A.advance = function (dt) {
      if (!this.isRunning) { v = 0; return; }
      if (this.duration || !this.lerp) { v = 0; base(dt); return; }
      dt = Math.min(dt, 0.064);
      const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
      for (let i = 0; i < n; i++) { v += (K * (this.to - this.value) - C * v) * h; this.value += v * h; }
      let done = false;
      if (Math.abs(this.to - this.value) < 0.4 && Math.abs(v) < 6) { this.value = this.to; v = 0; done = true; this.stop(); }
      if (this.onUpdate) this.onUpdate(this.value, done);
    };
  }

  const Motion = {
    on: false,
    lenis: null,
    mods: [],
    _raf: null,
    /* ماژول always بدون حرکت هم ساخته می‌شود (نسخه‌ی ایستا)، مثل نقشه */
    add(mod) { this.mods.push(mod); if (this.on || (mod.always && this.ready)) mod.build(); },
    statics(on) { this.mods.forEach((m) => { if (m.always) { m.kill(); if (on) m.build(); } }); },
    start() {
      if (!hasGsap) return;
      this.statics(false);
      this.on = true;
      root.classList.add('motion');
      if (window.Lenis) {
        this.lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
        springify(this.lenis);
        this.lenis.on('scroll', ScrollTrigger.update);
        this.lenis.on('scroll', () => Aurora.hold(220));
        /* هنگام اسکرول، کارت‌ها زیر نشانگرِ ثابت رد می‌شوند و هاورشان هر فریم صفحه را دوباره رسم می‌کند؛
           تا اسکرول آرام نگرفته، یک لایه‌ی شفاف زیر هدر نشانگر را می‌گیرد (هدر همچنان فعال است).
           قبلاً کلاس is-scrolling روی html عوض می‌شد و با هر شروع و پایان اسکرول کل صفحه دوباره استایل می‌خورد (ایست محسوس)؛
           حالا فقط همین یک لایه نمایش داده یا پنهان می‌شود */
        if (finePointer && document.body) {
          const shield = this.shield || (this.shield = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'scroll-shield' })));
          shield.setAttribute('aria-hidden', 'true');
          let t = 0, on = false;
          const off = () => { on = false; shield.style.display = ''; };
          this.lenis.on('scroll', () => {
            /* نشانگر روی فهرست مجله است: پیش‌نمایش عکس باید هنگام اسکرول هم با نشانگر بماند */
            if (!on && !document.querySelector('.mag__list.is-pv')) { on = true; shield.style.display = 'block'; }
            clearTimeout(t); t = setTimeout(off, 160);
          });
          this._shieldOff = () => { clearTimeout(t); off(); };
        }
        if (this.paused) this.lenis.stop();
        this._raf = (t) => this.lenis && this.lenis.raf(t * 1000);
        gsap.ticker.add(this._raf);
        gsap.ticker.lagSmoothing(0);
      }
      this.mods.forEach((m) => m.build());
      ScrollTrigger.refresh();
    },
    stop() {
      this.mods.slice().reverse().forEach((m) => m.kill());
      if (this.lenis) { gsap.ticker.remove(this._raf); this.lenis.destroy(); this.lenis = null; }
      if (this._shieldOff) { this._shieldOff(); this._shieldOff = null; }
      this.on = false;
      root.classList.remove('motion', 'is-scrolling');
      this.statics(true);
      if (hasGsap) ScrollTrigger.refresh();
    },
    rebuild() {
      if (!this.on) return;
      const y = window.scrollY;
      this.mods.slice().reverse().forEach((m) => m.kill());
      this.mods.forEach((m) => m.build());
      ScrollTrigger.refresh();
      window.scrollTo(0, y);
      if (this.lenis) this.lenis.scrollTo(y, { immediate: true, force: true });
    },
    scrollTo(target, offset = 0) {
      if (this.lenis) this.lenis.scrollTo(target, { offset, duration: 1.5, easing: easeInOut });
      else {
        const el = typeof target === 'string' ? $(target) : target;
        const y = (typeof target === 'number') ? target : el.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top: y, behavior: root.classList.contains('rm') ? 'auto' : 'smooth' });
      }
    },
    /* شمارنده‌دار: چند لایه‌ی روی هم (منو، مقاله، کپسول نوبت) اسکرول نرم را با هم نگه می‌دارند و آخری آزادش می‌کند */
    paused: 0,
    pause() { this.paused++; if (this.lenis) this.lenis.stop(); },
    resume() { this.paused = Math.max(0, this.paused - 1); if (this.lenis && !this.paused) this.lenis.start(); }
  };

  /* قفل اسکرول صفحه‌ی زیرین (شمارنده‌دار)؛ اگر نوار اسکرول واقعی هست، جایش نگه داشته می‌شود تا صفحه تکان نخورد */
  let locks = 0;
  const lockScroll = (on) => {
    const was = locks;
    locks = Math.max(0, locks + (on ? 1 : -1));
    if (!was && locks) { if (window.innerWidth - root.clientWidth > 0) root.style.scrollbarGutter = 'stable'; document.body.style.overflow = 'hidden'; }
    else if (was && !locks) { document.body.style.overflow = ''; root.style.scrollbarGutter = ''; }
  };

  /* ==========================================================================
     تنظیمات دسترس‌پذیری: اندازه‌ی متن، کنتراست بالا، حرکت کمتر
     ========================================================================== */
  const Prefs = {
    fs: root.classList.contains('fs-2') ? 2 : root.classList.contains('fs-1') ? 1 : 0,
    hc: root.classList.contains('hc'),
    rm: root.classList.contains('rm'),
    sync() {
      $$('.seg__btn[data-fs]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.fs === this.fs)));
      $$('.tgl[data-pref]').forEach((b) => b.setAttribute('aria-pressed', String(!!this[b.dataset.pref])));
    },
    setFs(n) {
      this.fs = n; root.classList.remove('fs-1', 'fs-2'); if (n) root.classList.add('fs-' + n);
      store.set('sasan:fs', String(n)); this.sync();
      requestAnimationFrame(() => Motion.rebuild());
    },
    toggle(k) {
      this[k] = !this[k]; store.set('sasan:' + k, this[k] ? '1' : '0');
      root.classList.toggle(k, this[k]);
      if (k === 'rm') { if (this.rm) Motion.stop(); else Motion.start(); }
      this.sync();
    }
  };
  $$('.seg__btn[data-fs]').forEach((b) => b.addEventListener('click', () => Prefs.setFs(+b.dataset.fs)));
  $$('.tgl[data-pref]').forEach((b) => b.addEventListener('click', () => Prefs.toggle(b.dataset.pref)));
  Prefs.sync();

  /* ---------- نقطه‌ی «باز است»: هر ۵ ثانیه یک پینگ، فقط وقتی روی صفحه است ---------- */
  const dots = $$('.dot');
  if (dots.length && 'IntersectionObserver' in window) {
    const seen = new Set();
    const ping = (d) => { if (!root.classList.contains('rm')) d.classList.add('is-ping'); };
    dots.forEach((d) => d.addEventListener('animationend', () => d.classList.remove('is-ping')));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { seen.add(e.target); ping(e.target); } else { seen.delete(e.target); e.target.classList.remove('is-ping'); }
    }));
    dots.forEach((d) => io.observe(d));
    setInterval(() => { if (!document.hidden) seen.forEach(ping); }, 5000);
  }

  /* ==========================================================================
     هدر: جمع شدن نوار بالا، نشانگر فنری منو، مگامنو
     ========================================================================== */
  const hdr = $('#hdr');
  const onScroll = () => {
    hdr.classList.toggle('is-scrolled', window.scrollY > 30);
  };
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return; scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; onScroll(); });
  }, { passive: true });

  const nav = $('.nav');
  if (nav) {
    const ind = $('.nav__ind', nav);
    let shown = false;
    const sx = new Spring(0, { stiffness: 380, damping: 32, onUpdate: (v) => ind.style.setProperty('--ix', v + 'px') });
    const sw = new Spring(0, { stiffness: 380, damping: 32, onUpdate: (v) => { ind.style.width = v + 'px'; } });
    const moveTo = (link) => {
      const x = link.offsetLeft, w = link.offsetWidth;
      if (!shown || root.classList.contains('rm')) { sx.snap(x); sw.snap(w); } else { sx.to(x); sw.to(w); }
      shown = true; nav.classList.add('has-ind');
    };
    $$('.nav__link', nav).forEach((l) => {
      l.addEventListener('pointerenter', () => moveTo(l));
      l.addEventListener('focus', () => moveTo(l));
    });
    nav.addEventListener('pointerleave', () => { shown = false; nav.classList.remove('has-ind'); });
    nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget)) { shown = false; nav.classList.remove('has-ind'); } });
  }

  /* مگامنوی خدمات */
  const mega = $('#mega');
  const megaBtn = $('.nav__link--menu');
  let megaOpen = false, megaTimer = 0;
  const openMega = () => {
    clearTimeout(megaTimer);
    if (megaOpen) return; megaOpen = true;
    mega.hidden = false; megaBtn.setAttribute('aria-expanded', 'true');
    if (Motion.on) {
      gsap.killTweensOf([mega, ...mega.querySelectorAll('.mega__head, .mega__list li, .mega__aside')]);
      gsap.fromTo(mega, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% -40% 0%)', duration: 0.55, ease: 'expo.out' });
      gsap.fromTo(mega.querySelectorAll('.mega__head, .mega__list li, .mega__aside'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', stagger: 0.018, delay: 0.06 });
    }
  };
  const closeMega = (now) => {
    clearTimeout(megaTimer);
    const run = () => {
      if (!megaOpen) return; megaOpen = false;
      megaBtn.setAttribute('aria-expanded', 'false');
      if (Motion.on) {
        gsap.killTweensOf(mega);
        gsap.to(mega, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.28, ease: 'power3.in', onComplete: () => { if (!megaOpen) mega.hidden = true; } });
      } else mega.hidden = true;
    };
    if (now) run(); else megaTimer = setTimeout(run, 220);
  };
  if (mega && megaBtn) {
    megaBtn.addEventListener('click', () => (megaOpen ? closeMega(true) : openMega()));
    if (finePointer) {
      megaBtn.addEventListener('pointerenter', () => { megaTimer = setTimeout(openMega, 90); });
      megaBtn.addEventListener('pointerleave', () => { clearTimeout(megaTimer); if (megaOpen) closeMega(); });
      mega.addEventListener('pointerenter', () => clearTimeout(megaTimer));
      mega.addEventListener('pointerleave', () => closeMega());
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && megaOpen) { closeMega(true); megaBtn.focus(); } });
    document.addEventListener('click', (e) => { if (megaOpen && !mega.contains(e.target) && !megaBtn.contains(e.target)) closeMega(true); });
    mega.addEventListener('click', (e) => { if (e.target.closest('a')) closeMega(true); });
  }

  /* ==========================================================================
     شیت موبایل: باز شدن فنری و بستن با کشیدن به پایین
     ========================================================================== */
  const sheet = $('#sheet');
  const burger = $('.burger');
  if (sheet && burger) {
    const panel = $('.sheet__panel', sheet), scrim = $('.sheet__scrim', sheet), body = $('.sheet__body', sheet);
    let h = 0, isOpen = false;
    const apply = (y) => {
      panel.style.transform = `translate3d(0, ${y}px, 0)`;
      scrim.style.opacity = String(clamp(1 - y / Math.max(1, h), 0, 1));
    };
    const spring = new Spring(0, { stiffness: 420, damping: 38, onUpdate: apply });
    const open = () => {
      if (isOpen) return; isOpen = true;
      sheet.hidden = false; burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'بستن منو');
      h = panel.getBoundingClientRect().height;
      spring.snap(h);
      Motion.pause();
      if (root.classList.contains('rm')) spring.snap(0); else {
        spring.to(0);
        /* آیتم‌های منو پله‌پله با فنر بالا می‌آیند */
        if (window.gsap) gsap.fromTo(body.querySelectorAll('.sheet__label, .sheet__svc, .sheet__nav a, .sheet__a11y > *, .sheet__foot > *'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.03, delay: 0.08, clearProps: 'opacity,transform' });
      }
      setTimeout(() => { const f = $('a, button', body); if (f) f.focus({ preventScroll: true }); }, 60);
    };
    const close = (returnFocus = true) => {
      if (!isOpen) return; isOpen = false;
      burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'باز کردن منو');
      const done = () => { sheet.hidden = true; Motion.resume(); if (returnFocus) burger.focus({ preventScroll: true }); };
      if (root.classList.contains('rm')) { spring.snap(h); done(); } else spring.to(h, done);
    };
    burger.addEventListener('click', () => (isOpen ? close() : open()));
    scrim.addEventListener('click', () => close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); });
    sheet.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a) close(false); });

    /* کشیدن */
    let startY = 0, lastY = 0, lastT = 0, vel = 0, dragging = false;
    panel.addEventListener('pointerdown', (e) => {
      const onGrab = !!e.target.closest('.sheet__grab');
      if (!onGrab && body.scrollTop > 0) return;
      dragging = true; startY = lastY = e.clientY; lastT = performance.now(); vel = 0;
      panel.setPointerCapture(e.pointerId);
    });
    panel.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = Math.max(0, e.clientY - startY);
      const now = performance.now(); vel = (e.clientY - lastY) / Math.max(1, now - lastT); lastY = e.clientY; lastT = now;
      if (dy > 4) { spring.snap(dy * (dy > h ? 0.5 : 1)); }
    });
    const end = (e) => {
      if (!dragging) return; dragging = false;
      const dy = Math.max(0, e.clientY - startY);
      if (dy > h * 0.28 || vel > 0.7) close(); else spring.to(0);
    };
    panel.addEventListener('pointerup', end);
    panel.addEventListener('pointercancel', end);
    window.matchMedia('(min-width: 1061px)').addEventListener('change', (m) => { if (m.matches) close(false); });
  }

  /* ==========================================================================
     دکمه‌های مغناطیسی (فقط ماوس)
     ========================================================================== */
  if (finePointer) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (!Motion.on) return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.setProperty('--mx', (dx * 3).toFixed(1) + 'px');
        el.style.setProperty('--my', (dy * 2.5).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
    });
  }

  /* ==========================================================================
     لینک‌های داخل صفحه
     ========================================================================== */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-svc') || a.hasAttribute('data-article') || e.defaultPrevented) return;
    const id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    let target = document.getElementById(id.slice(1));
    if (!target) return;
    /* اگر مقصد در این اندازه‌ی صفحه دیده نمی‌شود (مثل فرم نوبت روی موبایل)، جایگزینش */
    if (!target.getClientRects().length && target.dataset.fallback) target = document.getElementById(target.dataset.fallback) || target;
    e.preventDefault();
    if (id === '#top') Motion.scrollTo(0);
    else Motion.scrollTo(target, -20);
    if (id === '#main') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  });

  /* ==========================================================================
     ساعت کاری واقعی کلینیک (به وقت تهران)
     پزشک عمومی شبانه‌روزی؛ دندانپزشکی شنبه، یکشنبه، دوشنبه و پنجشنبه ۱۰ تا ۲۰؛ زیبایی و لیزر همه‌روزه با هماهنگی
     ========================================================================== */
  const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const DENTAL = [[10, 20], [10, 20], [10, 20], null, null, [10, 20], null];
  const EN = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
  /* ساختن DateTimeFormat با منطقه‌ی زمانی گران است؛ یک بار ساخته می‌شود */
  let tzFmt = null;
  function tehranNow() {
    try {
      const f = tzFmt || (tzFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }));
      const p = {}; f.formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
      return { d: EN[p.weekday] ?? 0, min: (+p.hour % 24) * 60 + (+p.minute) };
    } catch (e) {
      const n = new Date(); return { d: (n.getDay() + 1) % 7, min: n.getHours() * 60 + n.getMinutes() };
    }
  }
  /* ۱۰ → «۱۰ صبح»، ۲۰ → «۸ شب» */
  const hourFa = (h) => (h < 12 ? `${toFa(h)} صبح` : h === 12 ? '۱۲ ظهر' : h < 17 ? `${toFa(h - 12)} بعدازظهر` : `${toFa(h - 12)} شب`);
  const dayLabel = (off, di) => (off === 0 ? 'امروز' : off === 1 ? 'فردا' : DAYS[di]);
  const Clinic = {
    DAYS, DENTAL, hourFa,
    now: tehranNow,
    today() { return tehranNow().d; },
    /* وضعیت دندانپزشکی: باز است یا کی باز می‌شود */
    dental() {
      const n = tehranNow(), h = DENTAL[n.d];
      if (h && n.min >= h[0] * 60 && n.min < h[1] * 60) return { open: true, text: `باز است تا ${hourFa(h[1])}`, when: `امروز تا ${hourFa(h[1])}` };
      for (let off = 0; off < 8; off++) {
        const di = (n.d + off) % 7, hh = DENTAL[di];
        if (!hh || (off === 0 && n.min >= hh[0] * 60)) continue;
        const t = `${dayLabel(off, di)} از ${hourFa(hh[0])}`;
        return { open: false, text: t, when: t };
      }
      return { open: false, text: '', when: '' };
    },
    /* یک خط کوتاه برای هر بخش (کارت‌ها، صفحه‌ی بخش، فرم نوبت) */
    avail(key) {
      if (key === 'medicine') return 'پزشک عمومی همین حالا در کلینیک است';
      if (key === 'beauty') return 'همه‌روزه، با هماهنگی قبلی';
      return `دندانپزشکی: ${this.dental().when}`;
    },
    status() {
      const d = this.dental();
      return { open: true, text: `پزشک عمومی: شبانه‌روزی · دندانپزشکی: ${d.open ? d.text : d.when}` };
    }
  };



  /* ==========================================================================
     تنظیمات نمایش: پنجره‌ی کوچک زیر دکمه‌ی هدر
     ========================================================================== */
  const pBtn = $('.prefs__btn'), pPop = $('#prefsPop');
  if (pBtn && pPop) {
    let pAnim = null;
    const setPrefs = (open, focusBack = true) => {
      if (open === !pPop.hidden) return;
      pBtn.setAttribute('aria-expanded', String(open));
      if (pAnim) pAnim.cancel();
      const calm = !root.classList.contains('motion') || typeof pPop.animate !== 'function';
      if (open) {
        pPop.hidden = false;
        if (!calm) pAnim = pPop.animate([{ opacity: 0, transform: 'translateY(-8px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22, 1.2, .36, 1)' });
        const first = $('[aria-checked="true"], .seg__btn', pPop);
        if (first) first.focus({ preventScroll: true });
      } else {
        const done = () => { pPop.hidden = true; pAnim = null; };
        if (calm) done();
        else { pAnim = pPop.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px) scale(.97)' }], { duration: 200, easing: 'ease-in' }); pAnim.onfinish = done; }
        if (focusBack) pBtn.focus({ preventScroll: true });
      }
    };
    pBtn.addEventListener('click', () => setPrefs(pPop.hidden));
    document.addEventListener('pointerdown', (e) => { if (!pPop.hidden && !e.target.closest('.prefs')) setPrefs(false, false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pPop.hidden) setPrefs(false); });
  }

  /* ==========================================================================
     آئورا: دانه‌ی فیلم، ساختن لایه‌ها و هم‌زمان کردن حرکتشان
     ========================================================================== */
  try {
    const c = document.createElement('canvas'); c.width = c.height = 180;
    const x = c.getContext('2d'), d = x.createImageData(180, 180);
    for (let i = 0; i < d.data.length; i += 4) { const v = (Math.random() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    root.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
  } catch (e) { /* بدون دانه هم درست دیده می‌شود */ }

  const STAR = '<svg viewBox="1322 -1 290 334"><use href="#lgp-star-l"/></svg>';
  const AUR = '<span class="aur" aria-hidden="true"><canvas class="aur__cv"></canvas>'
    + '<svg class="aur__art" viewBox="0 0 100 100" preserveAspectRatio="none">'
    + '<ellipse class="o" cx="60" cy="8" rx="64" ry="5" transform="rotate(-10 60 8)"/>'
    + '<ellipse class="o o2" cx="44" cy="13" rx="88" ry="6.5" transform="rotate(-6 44 13)"/>'
    + '<ellipse class="o o2" cx="84" cy="4" rx="28" ry="3" transform="rotate(-18 84 4)"/>'
    + '</svg>'
    + `<i class="aur__sp aur__sp--1">${STAR}</i><i class="aur__sp aur__sp--2">${STAR}</i><i class="aur__sp aur__sp--3">${STAR}</i>`
    + '</span>';

  /* ---------- رسم آئورا روی بوم کوچک (یک‌ششم اندازه) که کارت گرافیک بزرگش می‌کند ---------- */
  const TAU = Math.PI * 2;
  const wave = (t, p, ph = 0) => (1 - Math.cos(TAU * t / p + ph)) / 2;
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a})`;
  const blob = (x, cx, cy, rx, ry, c, a, rot = 0) => {
    if (a <= 0.004) return;
    x.save(); x.translate(cx, cy); if (rot) x.rotate(rot); x.scale(1, ry / rx);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(c, a)); g.addColorStop(0.52, rgba(c, a * 0.38)); g.addColorStop(1, rgba(c, 0));
    x.fillStyle = g; x.fillRect(-rx, -rx, rx * 2, rx * 2); x.restore();
  };
  const readPal = (el) => {
    const cs = getComputedStyle(el);
    return ['--a0', '--a0h', '--a1', '--a2', '--a3', '--a4'].map((k) => (cs.getPropertyValue(k).trim() || '0 0 0').split(/\s+/).map(Number));
  };
  /* کارت‌ها و صفحه‌ی هر بخش: زمینه‌ی مورب و چهار لکه‌ی رنگی که آرام جابه‌جا می‌شوند */
  const paintCard = (x, W, H, P, t) => {
    const [a0, a0h, a1, a2, a3, a4] = P, M = Math.max(W, H);
    const lg = x.createLinearGradient(W * 0.25, 0, W * 0.75, H);
    lg.addColorStop(0, rgba(a0h, 1)); lg.addColorStop(0.72, rgba(a0, 1)); lg.addColorStop(1, rgba(a0, 1));
    x.globalCompositeOperation = 'source-over'; x.fillStyle = lg; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'screen';
    const u1 = wave(t, 38), u2 = wave(t, 46, 1.3), u3 = wave(t, 32, 2.1), u4 = wave(t, 26, 0.7);
    blob(x, W * (0.86 - 0.16 * u1), H * (0.03 + 0.12 * u1), M * 0.6 * (1 + 0.16 * u1), M * 0.6 * (1 + 0.16 * u1), a1, 0.95);
    blob(x, W * (0.1 + 0.18 * u2), H * (0.97 - 0.14 * u2), M * 0.56 * (1.06 - 0.14 * u2), M * 0.56 * (1.06 - 0.14 * u2), a3, 0.9);
    blob(x, W * 0.5, H * (0.46 - 0.12 * u3), M * 0.82, M * 0.24, a2, 0.72, (-24 + 15 * u3) * Math.PI / 180);
    blob(x, W * (0.3 + 0.32 * u4), H * (0.04 + 0.24 * u4), M * 0.32, M * 0.32, a4, 0.4 + 0.22 * u4);
    x.globalCompositeOperation = 'source-over';
    /* سایه‌ی پایین برای خوانایی متن روی کارت */
    const sg = x.createLinearGradient(0, H, 0, 0);
    sg.addColorStop(0, rgba(a0, 0.8)); sg.addColorStop(0.4, rgba(a0, 0.34)); sg.addColorStop(0.66, rgba(a0, 0));
    x.fillStyle = sg; x.fillRect(0, 0, W, H);
  };
  /* آسمان بخش خدمات: سه صحنه‌ی رنگی که با اسکرول جای هم را می‌گیرند، به‌اضافه‌ی رنگ کارت زیر نشانگر */
  const SKY = { a: 1, b: 0, c: 0, hover: 0, hx: 0.5, hc: [30, 68, 242] };
  const SKY_SCENES = [
    [[30, 68, 242, 0.6, 0.8, 0.2], [110, 18, 210, 0.5, 0.18, 0.82]],
    [[123, 97, 255, 0.55, 0.74, 0.24], [232, 67, 111, 0.46, 0.22, 0.78], [203, 141, 255, 0.2, 0.5, 0.56]],
    [[45, 212, 240, 0.42, 0.84, 0.18], [18, 170, 140, 0.5, 0.14, 0.84], [30, 68, 242, 0.22, 0.46, 0.5]]
  ];
  const paintScenes = (x, W, H, t, scenes, weights, base) => {
    x.globalCompositeOperation = 'source-over'; x.fillStyle = base; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'screen';
    scenes.forEach((sc, i) => {
      const w = weights[i]; if (w <= 0.004) return;
      sc.forEach((b, k) => {
        const u = wave(t, 30 + k * 7 + i * 5, k + i);
        blob(x, W * (b[4] + (k % 2 ? 0.04 : -0.04) * u), H * (b[5] + (k % 2 ? -0.03 : 0.03) * u), W * 0.52 * (1 + 0.08 * u), H * 0.6 * (1 + 0.08 * u), b, b[3] * w);
      });
    });
    x.globalCompositeOperation = 'source-over';
  };
  const paintSky = (x, W, H, P, t) => {
    paintScenes(x, W, H, t, SKY_SCENES, [SKY.a, SKY.b, SKY.c], '#070A1E');
    if (SKY.hover > 0.004) { x.globalCompositeOperation = 'screen'; blob(x, W * SKY.hx, H * 0.62, W * 0.3, H * 0.4, SKY.hc, 0.5 * SKY.hover); x.globalCompositeOperation = 'source-over'; }
  };
  const FOOT_SCENE = [[[30, 68, 242, 0.5, 0.82, 0.16], [45, 212, 240, 0.18, 0.12, 0.3], [110, 18, 210, 0.5, 0.2, 0.9], [232, 67, 111, 0.26, 0.72, 0.94]]];
  const paintFoot = (x, W, H, P, t) => paintScenes(x, W, H, t, FOOT_SCENE, [1], '#070A1E');

  const hosts = new Set();
  const RES = 1 / 6;
  /* اندازه‌ی بوم را از ResizeObserver می‌گیریم تا خواندنش وسط فریم چیدمان را مجبور به محاسبه نکند */
  const size = (h) => { h.cw = h.cv.clientWidth; h.ch = h.cv.clientHeight; };
  const ro = 'ResizeObserver' in window ? new ResizeObserver((es) => es.forEach((e) => {
    hosts.forEach((h) => { if (h.cv === e.target) { h.cw = e.contentRect.width; h.ch = e.contentRect.height; h.drawn = false; } });
  })) : null;
  let last = 0, holdUntil = 0;
  const frame = () => {
    const now = performance.now();
    if (now - last < 32) return;
    last = now;
    /* هنگام اسکرول یا انتقال، رانش آهسته‌ی آئورا دیده نمی‌شود؛ پس فقط تغییرهای وابسته به اسکرول رسم می‌شوند */
    const held = now < holdUntil;
    const t = now / 1000, still = root.classList.contains('rm');
    const skyKey = SKY.a + SKY.b * 7 + SKY.c * 49 + SKY.hover * 343 + SKY.hx;
    const covered = root.classList.contains('svc-open');
    hosts.forEach((h) => {
      if (covered && !h.top) return;
      /* هر بوم دست‌کم یک بار رسم می‌شود؛ بعد فقط وقتی دیده می‌شود و شرطش برقرار است */
      if (!h.live || (h.drawn && ((h.gate && !h.gate()) || still))) return;
      /* حرکت خود آئورا خیلی آهسته است؛ ۱۵ فریم در ثانیه کافی است، مگر رنگ‌ها با اسکرول در حال تغییر باشند */
      const k = h.paint === paintSky ? skyKey : 0;
      if (h.drawn && k === h.key && (held || (h.n = (h.n + 1) % 2))) return;
      h.key = k;
      if (!h.cw) size(h);
      const w = Math.max(8, Math.round(h.cw * RES)), hh = Math.max(8, Math.round(h.ch * RES));
      if (h.cv.width !== w || h.cv.height !== hh) { h.cv.width = w; h.cv.height = hh; }
      h.paint(h.ctx, w, hh, h.pal, still ? 0 : t);
      h.drawn = true;
    });
  };
  let ticking = false;
  const startTick = () => {
    if (ticking) return; ticking = true;
    if (window.gsap) gsap.ticker.add(frame);
    else { const loop = () => { frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  };
  const Aurora = {
    SKY,
    mount(el) { if (el && !el.querySelector(':scope > .aur')) el.insertAdjacentHTML('afterbegin', AUR); return el; },
    /* یک بوم را ثبت می‌کند؛ فقط وقتی در صفحه است رسم می‌شود */
    add(host, { canvas, paint = paintCard, gate = null, probe = host, top = false } = {}) {
      const cv = canvas || host.querySelector('.aur__cv');
      if (!cv || !cv.getContext) return null;
      const h = { host, cv, ctx: cv.getContext('2d'), paint, gate, pal: readPal(host), live: false, drawn: false, cw: 0, ch: 0, n: 0, key: 0, top };
      hosts.add(h);
      if (ro) ro.observe(cv);
      if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((e) => { h.live = e.isIntersecting; }), { rootMargin: '160px 0px' }).observe(probe);
      else h.live = true;
      startTick();
      return h;
    },
    refresh(host) { hosts.forEach((h) => { if (h.host === host) { h.pal = readPal(host); h.drawn = false; } }); },
    /* فوراً یک فریم تازه رسم می‌کند (برای لحظه‌ی باز شدن یک لایه) */
    now(host) { last = 0; hosts.forEach((h) => { if (h.host === host) { h.live = true; h.drawn = false; } }); frame(); },
    hold(ms) { holdUntil = Math.max(holdUntil, performance.now() + ms); },
    release() { holdUntil = 0; },
    paintSky, paintFoot,
    /* حرکت ستاره‌ها و مدارها فقط وقتی بخش دیده می‌شود */
    watch(host, probe = host) {
      if (!host || !probe) return;
      host.classList.add('aur-host');
      if (!('IntersectionObserver' in window)) { host.classList.add('is-live'); return; }
      new IntersectionObserver((es) => es.forEach((e) => host.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '120px 0px' }).observe(probe);
    }
  };

  /* ---------- راه‌اندازی ---------- */
  window.Sasan = { $, $$, clamp, lerp, toFa, Spring, Motion, Prefs, Clinic, store, finePointer, Aurora, lockScroll };
  document.addEventListener('DOMContentLoaded', () => {
    Motion.ready = true;
    if (!root.classList.contains('rm')) Motion.start(); else Motion.statics(true);
    onScroll();
    /* اگر فونت یا عکسی دیر رسید و چیدمان واقعاً عوض شد، فقط وقتی اسکرول آرام گرفته دوباره اندازه می‌گیریم */
    const sig = () => [document.body.scrollHeight, ...$$('main > section, footer').map((el) => el.offsetHeight)].join(',');
    let base = sig(), wait = null;
    const settle = () => {
      if (!Motion.on) return;
      const l = Motion.lenis;
      if (l && (l.isScrolling || Math.abs(l.targetScroll - l.animatedScroll) > 1)) { clearTimeout(wait); wait = setTimeout(settle, 250); return; }
      const now = sig();
      if (now !== base) { ScrollTrigger.refresh(); base = sig(); }
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
    window.addEventListener('load', settle);
    if (hasGsap) ScrollTrigger.addEventListener('refresh', () => { base = sig(); });
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
})();
