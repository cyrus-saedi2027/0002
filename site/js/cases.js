/* ==========================================================================
   cases.js: صفحه‌ی نمونه‌کارها
   ۱. مقایسه‌ی قبل و بعد: کشیدن با موس، انگشت یا کیبورد؛ وقتی کسی با آن کار ندارد، خط وسط آرام تکان می‌خورد.
      هر فریم فقط transform سه لایه عوض می‌شود و فقط قاب‌هایی که روی صفحه‌اند حساب می‌شوند.
   ۲. مراحل کار: هر ردیف عکس از لحظه‌ای که از پایین صفحه وارد می‌شود تا وقتی از بالا بیرون می‌رود،
      از ۱۲۵٪ تا ۵۰۰٪ پهنای صفحه پهن می‌شود (زیر ۱۰۰۰ پیکسل ۲۵۰٪ تا ۷۵۰٪)؛ همان فرمول و اندازه‌های مرجع.
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, clamp, toFa, Motion } = S;
  const root = document.documentElement;
  const rm = () => root.classList.contains('rm');
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const canAnim = typeof Element.prototype.animate === 'function';

  /* ==========================================================================
     ۱. مقایسه‌ی قبل و بعد
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

  /* ==========================================================================
     ۲. مراحل کار (مرجع: انیمیشن ۳۶)
     پیشرفت هر ردیف = (اسکرول − (بالای ردیف − ارتفاع صفحه)) ÷ (پایین ردیف − (بالای ردیف − ارتفاع صفحه))
     و پهنا = شروع + (پایان − شروع) × پیشرفت. ارتفاع بخش به اندازه‌ی ده ردیف کاملاً باز است.
     جای ردیف‌ها از روی اندازه‌ها حساب می‌شود (نه با خواندن از صفحه در هر فریم)، پس هر فریم فقط یک بار چیدمان دارد.
     ========================================================================== */
  const Wall = {
    st: null, off: null, onInit: null, io: null,
    build() {
      const sec = $('.cx-wall'), box = sec && $('.cx-wall__rows', sec);
      if (!box || rm() || !window.gsap || !window.ScrollTrigger) return;
      const rows = $$('.cx-wall__row', box);
      if (!rows.length) return;
      sec.classList.add('is-live');
      const n = rows.length, last = rows.map(() => ''), capOff = rows.map(() => null);
      let need = rows.map(() => 0);
      let ws = 125, we = 500, S = 0, g = 16, G = 8, P = 8, A = 0, B = 0, T0 = 0, vh = 0;
      /* ارتفاع ردیف با پهنای w درصد: (پهنای ردیف − ۸ فاصله) ÷ ۹ × ۵/۷ */
      const rowH = (w) => ((w / 100) * S - 8 * g) / 9 * 5 / 7;
      const measure = () => {
        const small = window.innerWidth < 1000;
        ws = small ? 250 : 125; we = small ? 750 : 500;
        vh = window.innerHeight;
        S = box.clientWidth;
        const cs = getComputedStyle(box), rs = getComputedStyle(rows[0]);
        G = parseFloat(cs.rowGap) || 0; P = parseFloat(cs.paddingTop) || 0; g = parseFloat(rs.columnGap) || 0;
        A = rowH(ws); B = rowH(we) - A;
        box.style.height = `${(rowH(we) * n + G * (n - 1) + P * 2).toFixed(2)}px`;
        T0 = box.getBoundingClientRect().top + window.scrollY;
        /* کمترین پهنای کاشی که زیرنویس‌های هر ردیف در آن جا می‌شوند (متن + فاصله + برچسب) */
        need = rows.map((r) => Math.max(0, ...$$('figcaption', r).map((f) => { const [a, b] = f.children; return (a ? a.scrollWidth : 0) + (b ? b.scrollWidth : 0) + 10; })));
      };
      const frame = () => {
        const y = window.scrollY, K = A + vh;
        let top = T0 + P;
        for (let i = 0; i < n; i++) {
          /* p(A + Bp + vh) = y + vh − top  ⇒  همان پیشرفت مرجع وقتی ارتفاع خود ردیف هم با پیشرفت عوض می‌شود */
          const D = y + vh - top;
          let p = 0;
          if (D > 0) { p = (Math.sqrt(K * K + 4 * B * D) - K) / (2 * B); if (p > 1) p = 1; }
          const pw = ws + (we - ws) * p, w = `${pw.toFixed(3)}%`;
          if (w !== last[i]) { last[i] = w; rows[i].style.width = w; }
          const off = ((pw / 100) * S - 8 * g) / 9 < need[i];
          if (off !== capOff[i]) { capOff[i] = off; rows[i].classList.toggle('no-cap', off); }
          top += A + B * p + G;
        }
      };
      /* شانزده عکس کمی پیش از رسیدن به بخش بارگیری و رمزگشایی می‌شوند تا اولین باز شدن ردیف‌ها گیر نکند (بقیه‌ی کاشی‌ها همین عکس‌ها را تکرار می‌کنند) */
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver((es) => {
          if (!es.some((e) => e.isIntersecting)) return;
          this.io.disconnect(); this.io = null;
          const seen = new Set();
          $$('img', box).forEach((img) => {
            const k = img.getAttribute('src');
            if (seen.has(k)) return;
            seen.add(k);
            img.loading = 'eager';
            if (img.decode) img.decode().catch(() => {});
          });
        }, { rootMargin: '150% 0px' });
        this.io.observe(box);
      }
      measure();
      frame();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (this.st) { measure(); frame(); } });
      /* پیش از هر اندازه‌گیری ScrollTrigger (مثلاً تغییر اندازه‌ی پنجره) ارتفاع بخش درست می‌شود تا جای بخش‌های بعدی درست حساب شود */
      this.onInit = () => { measure(); };
      ScrollTrigger.addEventListener('refreshInit', this.onInit);
      let on = false;
      const toggle = (v) => { if (v === on) return; on = v; if (v) gsap.ticker.add(frame); else gsap.ticker.remove(frame); };
      this.st = ScrollTrigger.create({
        trigger: box, start: 'top bottom', end: 'bottom top',
        onToggle: (self) => { toggle(self.isActive); frame(); },
        onRefresh: (self) => { T0 = box.getBoundingClientRect().top + window.scrollY; vh = window.innerHeight; toggle(self.isActive); frame(); }
      });
      this.off = () => toggle(false);
    },
    kill() {
      if (this.off) { this.off(); this.off = null; }
      if (this.io) { this.io.disconnect(); this.io = null; }
      if (this.onInit) { ScrollTrigger.removeEventListener('refreshInit', this.onInit); this.onInit = null; }
      if (this.st) { this.st.kill(); this.st = null; }
      const sec = $('.cx-wall');
      if (!sec) return;
      sec.classList.remove('is-live');
      const box = $('.cx-wall__rows', sec);
      if (box) box.style.height = '';
      $$('.cx-wall__row', sec).forEach((r) => { r.style.width = ''; r.classList.remove('no-cap'); });
    }
  };

  if ($('.cx')) Motion.add(Rows);
  if ($('.cx-wall')) Motion.add(Wall);
})();
