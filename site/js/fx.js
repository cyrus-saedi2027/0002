/* ==========================================================================
   fx.js: ریزتعامل‌های سراسری سایت
   نوار پیشرفت اسکرول، ورود کلمه‌به‌کلمه‌ی تیترها، نور دنبال‌کننده‌ی نشانگر روی کارت‌ها،
   کج شدن سه‌بعدی کارت‌های بخش‌ها و آسمان روشن «مسیر درمان»
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, Motion, finePointer } = S;
  const root = document.documentElement;
  const fine = () => (typeof finePointer === 'function' ? finePointer() : window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  /* ---------- نوار پیشرفت اسکرول زیر کپسول هدر ---------- */
  const bar = $('.bar');
  if (bar) {
    const prog = document.createElement('i');
    prog.className = 'bar__prog'; prog.setAttribute('aria-hidden', 'true');
    bar.appendChild(prog);
    let ticking = false;
    const paint = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0})`;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  /* ---------- نور دنبال‌کننده‌ی نشانگر و لبه‌ی روشن روی کارت‌ها ---------- */
  const SPOT = '.rv-card, .faq-item, .vcard, .callback, .svc__item, .qbook';
  const spot = (el) => {
    if (el.dataset.spot) return;
    el.dataset.spot = '1';
    el.classList.add('spot');
    let raf = 0, ev = null;
    el.addEventListener('pointermove', (e) => {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--sx', `${(ev.clientX - r.left).toFixed(0)}px`);
        el.style.setProperty('--sy', `${(ev.clientY - r.top).toFixed(0)}px`);
      });
    });
  };
  if (fine()) {
    $$(SPOT).forEach(spot);
    /* کارت‌های صفحه‌ی هر بخش بعداً ساخته می‌شوند */
    const list = $('#svcList');
    if (list && 'MutationObserver' in window) new MutationObserver(() => $$('.svc__item', list).forEach(spot)).observe(list, { childList: true });
  }

  /* ---------- کج شدن سه‌بعدی کارت‌های بخش‌ها با نور براق ---------- */
  const deck = $('#deck');
  if (deck && window.gsap) {
    $$('.pcard', deck).forEach((card) => {
      let on = false, rx = null, ry = null;
      const ready = () => fine() && Motion.on && deck.classList.contains('is-flipped') && !window.matchMedia('(max-width: 699.98px)').matches && !gsap.isTweening(card);
      card.addEventListener('pointerenter', () => {
        if (!ready()) return;
        on = true;
        rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
        ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
        if (!on) return;
        /* پشت کارت رو به ماست (۱۸۰ درجه)، پس جهت افقی برعکس حساب می‌شود */
        rx((0.5 - py) * 9);
        ry(180 - (px - 0.5) * 11);
      });
      card.addEventListener('pointerleave', () => {
        if (!on) return;
        on = false;
        gsap.to(card, { rotationX: 0, rotationY: deck.classList.contains('is-flipped') ? 180 : 0, duration: 0.9, ease: 'elastic.out(1, 0.6)' });
      });
    });
  }

  /* ---------- ورود کلمه‌به‌کلمه‌ی تیترها و کشیده شدن خط کوچک کنار برچسب ---------- */
  const split = (el) => {
    if (el.dataset.splitDone) return $$('.wi', el);
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach((p) => {
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
    return $$('.wi', el);
  };

  const Titles = {
    build() {
      if (!window.gsap || !('IntersectionObserver' in window)) return;
      const els = $$('.sec-title, .foot__title, .ar-title');
      const vh = window.innerHeight;
      this.items = els.filter((el) => el.getClientRects().length && el.getBoundingClientRect().top > vh * 0.85);
      this.items.forEach((el) => {
        const words = split(el);
        gsap.set(words, { yPercent: 115 });
        const k = el.parentElement && $('.kicker', el.parentElement);
        if (k) gsap.set(k, { '--kx': 0 });
      });
      this.io = new IntersectionObserver((es) => es.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        this.io.unobserve(el);
        gsap.to($$('.wi', el), { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.04 });
        const k = el.parentElement && $('.kicker', el.parentElement);
        if (k) gsap.to(k, { '--kx': 1, duration: 0.9, ease: 'expo.out' });
      }), { rootMargin: '0px 0px -12% 0px' });
      this.items.forEach((el) => this.io.observe(el));
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      (this.items || []).forEach((el) => {
        gsap.killTweensOf($$('.wi', el));
        gsap.set($$('.wi', el), { clearProps: 'transform' });
        const k = el.parentElement && $('.kicker', el.parentElement);
        if (k) gsap.set(k, { '--kx': 1 });
      });
      this.items = [];
    }
  };

  /* ---------- آسمان روشن «مسیر درمان»: با هر مرحله رنگ ملایمش عوض می‌شود ---------- */
  const JSky = {
    build() {
      const sec = $('#journey'), sky = sec && $('.jsky', sec);
      if (!sky || !window.ScrollTrigger) return;
      const layers = $$('.jsky__l', sky), steps = $$('.jr-step', sec);
      this.ctx = gsap.context(() => {
        gsap.set(layers, { opacity: (i) => (i === 0 ? 1 : 0) });
        steps.forEach((st, i) => ScrollTrigger.create({
          trigger: st, start: 'top 60%', end: 'bottom 40%',
          onToggle: (self) => { if (self.isActive) layers.forEach((l, k) => gsap.to(l, { opacity: k === i ? 1 : 0, duration: 1.1, ease: 'power2.inOut', overwrite: 'auto' })); }
        }));
      });
    },
    kill() {
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      $$('.jsky__l').forEach((l, i) => { l.style.opacity = i === 0 ? '' : ''; });
    }
  };

  /* ---------- مجله‌ی سلامت: عکس هر مقاله با تأخیر نرم دنبال نشانگر می‌آید و با سرعت حرکت کج می‌شود ---------- */
  const mag = $('#articles');
  if (mag && window.gsap) {
    const list = $('.mag__list', mag), pv = $('.mag__pv', mag), imgs = $$('.mag__pv img', mag);
    let active = false, tx = 0, ty = 0, x = 0, y = 0, z = 1, cur = -1, loop = null, lastX = 0;
    const desk = () => fine() && Motion.on && window.matchMedia('(min-width: 1061px)').matches;
    const tick = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      const vx = x - lastX; lastX = x;
      gsap.set(pv, { x, y, rotation: Math.max(-9, Math.min(9, vx * 0.35)) });
    };
    const show = (i) => {
      if (i === cur) return;
      cur = i;
      const im = imgs[i]; if (!im) return;
      im.style.zIndex = String(++z);
      im.classList.remove('is-on'); void im.offsetWidth; im.classList.add('is-on');
      setTimeout(() => imgs.forEach((o) => { if (o !== im && +o.style.zIndex < z) o.classList.remove('is-on'); }), 750);
    };
    /* عکس روی ستون چپ (زمان مطالعه و فلش) می‌نشیند تا روی تیترها را نگیرد؛ عمودی دنبال نشانگر است و افقی کمی با آن جابه‌جا می‌شود */
    const place = (e) => {
      const r = mag.getBoundingClientRect(), lr = list.getBoundingClientRect(), w = pv.offsetWidth, h = pv.offsetHeight;
      const f = Math.min(1, Math.max(0, (e.clientX - lr.left) / lr.width));
      tx = lr.left - r.left + 10 + f * 110;
      ty = Math.min(Math.max(e.clientY - r.top - h * 0.5, lr.top - r.top - h * 0.35), lr.bottom - r.top - h * 0.65);
    };
    list.addEventListener('pointerenter', (e) => {
      if (!desk()) return;
      active = true; place(e); x = tx; y = ty + 30; lastX = x;
      list.classList.add('is-pv');
      if (!loop) { loop = tick; gsap.ticker.add(loop); }
      gsap.to(pv, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
    });
    list.addEventListener('pointermove', (e) => { if (active) place(e); });
    list.addEventListener('pointerleave', () => {
      if (!active) return;
      active = false; cur = -1;
      list.classList.remove('is-pv');
      gsap.to(pv, { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: 'power2.in', overwrite: 'auto', onComplete: () => { if (!active && loop) { gsap.ticker.remove(loop); loop = null; } } });
    });
    $$('.mag__row', mag).forEach((row) => row.addEventListener('pointerenter', () => { if (active) show(+row.dataset.i); }));
    gsap.set(pv, { scale: 0.85, transformOrigin: '50% 60%' });
  }

  Motion.add(Titles);
  Motion.add(JSky);
})();
