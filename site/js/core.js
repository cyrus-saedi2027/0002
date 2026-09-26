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
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  const Motion = {
    on: false,
    lenis: null,
    mods: [],
    _raf: null,
    add(mod) { this.mods.push(mod); if (this.on) mod.build(); },
    start() {
      if (!hasGsap) return;
      this.on = true;
      root.classList.add('motion');
      if (window.Lenis) {
        this.lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
        this.lenis.on('scroll', ScrollTrigger.update);
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
      this.on = false;
      root.classList.remove('motion');
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
      if (this.lenis) this.lenis.scrollTo(target, { offset, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else {
        const el = typeof target === 'string' ? $(target) : target;
        const y = (typeof target === 'number') ? target : el.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top: y, behavior: root.classList.contains('rm') ? 'auto' : 'smooth' });
      }
    },
    pause() { if (this.lenis) this.lenis.stop(); },
    resume() { if (this.lenis) this.lenis.start(); }
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
    if (!a || a.hasAttribute('data-svc') || e.defaultPrevented) return;
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
     ساعت کاری و نوبت‌های خالی (بر اساس ساعت تهران)
     ========================================================================== */
  const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const HOURS = [[9, 21], [9, 21], [9, 21], [9, 21], [9, 21], [9, 14], null];
  const EN = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
  function tehranNow() {
    try {
      const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
      const p = {}; f.formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
      return { d: EN[p.weekday] ?? 0, min: (+p.hour % 24) * 60 + (+p.minute) };
    } catch (e) {
      const n = new Date(); return { d: (n.getDay() + 1) % 7, min: n.getHours() * 60 + n.getMinutes() };
    }
  }
  const fmtTime = (m) => toFa(Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'));
  const dayLabel = (off, di) => (off === 0 ? 'امروز' : off === 1 ? 'فردا' : DAYS[di]);
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

  const Clinic = {
    DAYS, HOURS,
    today() { return tehranNow().d; },
    status() {
      const n = tehranNow(), hrs = HOURS[n.d];
      if (hrs && n.min >= hrs[0] * 60 && n.min < hrs[1] * 60) return { open: true, text: `الان باز هستیم · تا ساعت ${toFa(hrs[1])}` };
      if (hrs && n.min < hrs[0] * 60) return { open: false, text: `الان بسته‌ایم · امروز از ساعت ${toFa(hrs[0])}` };
      for (let off = 1; off < 8; off++) {
        const di = (n.d + off) % 7;
        if (HOURS[di]) return { open: false, text: `الان بسته‌ایم · ${off === 1 ? 'فردا' : DAYS[di]} از ساعت ${toFa(HOURS[di][0])}` };
      }
      return { open: false, text: '' };
    },
    nextSlot(key, when = 'any') {
      const n = tehranNow();
      const dayNo = Math.floor(Date.now() / 864e5);
      const okTime = (t) => when === 'am' ? t < 13 * 60 : when === 'pm' ? t >= 16 * 60 : true;
      let start = Math.ceil((n.min + 90) / 30) * 30;
      for (let off = 0; off < 10; off++) {
        const di = (n.d + off) % 7, hrs = HOURS[di];
        if (hrs) {
          for (let t = Math.max(start, hrs[0] * 60 + 30); t <= hrs[1] * 60 - 30; t += 30) {
            if (okTime(t) && hash(key + ':' + (dayNo + off) + ':' + t) < 0.22) return { off, di, t, label: `${dayLabel(off, di)}، ساعت ${fmtTime(t)}`, short: `${dayLabel(off, di)} ${fmtTime(t)}` };
          }
        }
        start = 0;
      }
      return null;
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
  const AUR = '<span class="aur" aria-hidden="true">'
    + '<i class="aur__b aur__b--1"></i><i class="aur__b aur__b--2"></i><i class="aur__b aur__b--3"></i><i class="aur__b aur__b--4"></i>'
    + '<svg class="aur__art" viewBox="0 0 100 100" preserveAspectRatio="none">'
    + '<g transform="rotate(-10 60 8)"><ellipse class="o" cx="60" cy="8" rx="64" ry="5"/><ellipse class="c" cx="60" cy="8" rx="64" ry="5" pathLength="100"/></g>'
    + '<g transform="rotate(-6 44 13)"><ellipse class="o o2" cx="44" cy="13" rx="88" ry="6.5"/><ellipse class="c c2" cx="44" cy="13" rx="88" ry="6.5" pathLength="100"/></g>'
    + '<ellipse class="o o2" cx="84" cy="4" rx="28" ry="3" transform="rotate(-18 84 4)"/>'
    + '</svg>'
    + `<i class="aur__sp aur__sp--1">${STAR}</i><i class="aur__sp aur__sp--2">${STAR}</i><i class="aur__sp aur__sp--3">${STAR}</i>`
    + '<i class="aur__grain"></i></span>';
  const isAur = (a) => /^(aur|dsky)/.test(a.animationName || '');
  const Aurora = {
    mount(el) { if (el && !el.querySelector(':scope > .aur')) el.insertAdjacentHTML('afterbegin', AUR); return el; },
    /* لایه‌ی مقصد را دقیقاً هم‌فاز لایه‌ی مبدأ می‌کند (کارت ← لایه‌ی انتقال ← صفحه‌ی بخش) */
    sync(target, source) {
      if (!target || !source || typeof target.getAnimations !== 'function') return;
      const a = target.getAnimations({ subtree: true }).filter(isAur), b = source.getAnimations({ subtree: true }).filter(isAur);
      a.forEach((x, i) => { const y = b[i]; if (y && y.animationName === x.animationName) { try { x.currentTime = y.currentTime; } catch (e) { /* قدیمی */ } } });
    },
    /* حرکت آئورا فقط وقتی بخش در صفحه دیده می‌شود */
    watch(host, probe = host) {
      if (!host || !probe) return;
      host.classList.add('aur-host');
      if (!('IntersectionObserver' in window)) { host.classList.add('is-live'); return; }
      new IntersectionObserver((es) => es.forEach((e) => host.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '120px 0px' }).observe(probe);
    }
  };

  /* ---------- راه‌اندازی ---------- */
  window.Sasan = { $, $$, clamp, lerp, toFa, Spring, Motion, Prefs, Clinic, store, finePointer, Aurora };
  document.addEventListener('DOMContentLoaded', () => {
    if (!root.classList.contains('rm')) Motion.start();
    onScroll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (Motion.on) ScrollTrigger.refresh(); });
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
})();
