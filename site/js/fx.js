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
    let ticking = false, max = 0;
    /* ارتفاع صفحه فقط بعد از تغییر اندازه یا اندازه‌گیری دوباره خوانده می‌شود، نه در هر فریم اسکرول */
    const measure = () => { max = document.documentElement.scrollHeight - window.innerHeight; };
    const paint = () => {
      ticking = false;
      prog.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0})`;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    window.addEventListener('resize', measure);
    if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', () => { measure(); paint(); });
    measure(); paint();
  }

  /* ---------- نور دنبال‌کننده‌ی نشانگر و لبه‌ی روشن روی کارت‌ها ---------- */
  const SPOT = '.rv-card, .faq-item, .vcard, .callback, .svc__item, .qbook';
  const spot = (el) => {
    if (el.dataset.spot) return;
    el.dataset.spot = '1';
    el.classList.add('spot');
    let raf = 0, ev = null, lx = -1, ly = -1;
    el.addEventListener('pointermove', (e) => {
      /* هنگام اسکرول، مرورگر حرکت ساختگی نشانگر با همان مختصات می‌فرستد؛ نادیده‌اش می‌گیریم تا هر فریم استایل کارت
         (و در سؤال‌ها، چیدمان متن بسته‌ی details) دوباره حساب نشود */
      if (e.clientX === lx && e.clientY === ly) return;
      lx = e.clientX; ly = e.clientY;
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

  /* ورودها با انیمیشن بومی مرورگر (WAAPI) اجرا می‌شوند: روی کامپوزیتور می‌چرخند، پس هر فریم نه جاوااسکریپت دارند
     و نه رسم دوباره‌ی صفحه؛ منحنی همان expo.out است */
  const EXPO = 'cubic-bezier(.16, 1, .3, 1)';
  const waapi = typeof Element.prototype.animate === 'function';
  const Titles = {
    build() {
      if (!window.gsap || !('IntersectionObserver' in window)) return;
      const els = $$('.sec-title, .foot__title, .ar-title');
      const vh = window.innerHeight;
      this.anims = [];
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
        const words = $$('.wi', el), k = el.parentElement && $('.kicker', el.parentElement);
        if (waapi) {
          words.forEach((w, i) => this.anims.push(w.animate([{ transform: 'translate3d(0, 115%, 0)' }, { transform: 'translate3d(0, 0, 0)' }], { duration: 1050, delay: 40 * i, easing: EXPO, fill: 'backwards' })));
          gsap.set(words, { clearProps: 'transform' });
          /* خط کوچک کنار برچسب با ترنزیشن CSS روی transform باز می‌شود (kx-t در base.css) */
          if (k) { k.classList.add('kx-t'); k.style.setProperty('--kx', '1'); }
        } else {
          gsap.to(words, { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.04 });
          if (k) gsap.to(k, { '--kx': 1, duration: 0.9, ease: 'expo.out' });
        }
      }), { rootMargin: '0px 0px -12% 0px' });
      this.items.forEach((el) => this.io.observe(el));
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      (this.anims || []).forEach((a) => a.cancel()); this.anims = [];
      (this.tws || []).forEach((t) => t.kill()); this.tws = [];
      (this.items || []).forEach((el) => {
        gsap.killTweensOf($$('.wi', el));
        gsap.set($$('.wi', el), { clearProps: 'transform' });
        const k = el.parentElement && $('.kicker', el.parentElement);
        if (k) { k.classList.remove('kx-t'); gsap.set(k, { '--kx': 1 }); }
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
    let active = false, tx = 0, ty = 0, x = 0, y = 0, z = 1, cur = -1, loop = null, lastX = 0, lx = -1, ly = -1;
    const desk = () => fine() && Motion.on && window.matchMedia('(min-width: 1061px)').matches;
    /* عکس‌های پیش‌نمایش پیش از اولین هاور بارگیری و رمزگشایی می‌شوند؛ وگرنه قاب اول خالی می‌آمد و عکس بعد می‌پرید */
    let warmed = false;
    const warm = () => {
      if (warmed || !desk()) return; warmed = true;
      imgs.forEach((im) => { im.loading = 'eager'; if (im.decode) im.decode().catch(() => {}); });
    };
    if ('IntersectionObserver' in window) {
      const wio = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { warm(); if (warmed) wio.disconnect(); } }, { rootMargin: '900px 0px' });
      wio.observe(mag);
    }
    const tick = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      const vx = x - lastX; lastX = x;
      gsap.set(pv, { x, y, rotation: Math.max(-9, Math.min(9, vx * 0.35)) });
    };
    const show = (i) => {
      if (i === cur) return;
      cur = i;
      const im = imgs[i]; if (!im) return;
      const go = () => {
        if (cur !== i) return;
        im.style.zIndex = String(++z);
        im.classList.remove('is-on'); void im.offsetWidth; im.classList.add('is-on');
        setTimeout(() => imgs.forEach((o) => { if (o !== im && +o.style.zIndex < z) o.classList.remove('is-on'); }), 750);
      };
      /* تا عکس آماده نشده، عکس قبلی می‌ماند */
      if (im.complete && im.naturalWidth) go();
      else { im.loading = 'eager'; (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(go); }
    };
    /* عکس روی ستون چپ (زمان مطالعه و فلش) می‌نشیند تا روی تیترها را نگیرد؛ عمودی دنبال نشانگر است و افقی کمی با آن جابه‌جا می‌شود */
    const place = (e) => {
      const r = mag.getBoundingClientRect(), lr = list.getBoundingClientRect(), w = pv.offsetWidth, h = pv.offsetHeight;
      const f = Math.min(1, Math.max(0, (e.clientX - lr.left) / lr.width));
      /* فقط در فضای بین لبه‌ی فهرست و ستون تیترها جابه‌جا می‌شود تا انتهای تیترهای بلند زیرش نرود */
      const tt = $('.mag__title', list), room = tt ? tt.getBoundingClientRect().left - lr.left - 24 : w + 110;
      tx = lr.left - r.left + 6 + f * Math.max(0, room - w - 6);
      ty = Math.min(Math.max(e.clientY - r.top - h * 0.5, lr.top - r.top - h * 0.35), lr.bottom - r.top - h * 0.65);
    };
    list.addEventListener('pointerenter', (e) => {
      if (!desk()) return;
      warm();
      lx = e.clientX; ly = e.clientY;
      active = true; place(e); x = tx; y = ty + 30; lastX = x;
      list.classList.add('is-pv');
      if (!loop) { loop = tick; gsap.ticker.add(loop); }
      gsap.to(pv, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
    });
    list.addEventListener('pointermove', (e) => { lx = e.clientX; ly = e.clientY; if (active) place(e); });
    /* هنگام اسکرول با نشانگر ثابت، پیش‌نمایش کنار نشانگر می‌ماند (قبلاً با صفحه بالا و پایین می‌رفت) */
    window.addEventListener('scroll', () => { if (active && lx >= 0) place({ clientX: lx, clientY: ly }); }, { passive: true });
    list.addEventListener('pointerleave', () => {
      if (!active) return;
      active = false; cur = -1;
      list.classList.remove('is-pv');
      gsap.to(pv, { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: 'power2.in', overwrite: 'auto', onComplete: () => { if (!active && loop) { gsap.ticker.remove(loop); loop = null; } } });
    });
    $$('.mag__row', mag).forEach((row) => row.addEventListener('pointerenter', () => { if (active) show(+row.dataset.i); }));
    gsap.set(pv, { scale: 0.85, transformOrigin: '50% 60%' });
  }

  /* ---------- نمونه‌ی درمان‌ها (مدل ۵۳): هر عکس در شبکه‌ی ۳×۳ کاشی‌به‌کاشی، از گوشه‌ی بالا-راست باز می‌شود ----------
     همه‌ی کاشی‌ها روی یک بوم رسم می‌شوند (نه ۹ لایه‌ی جدا)، و پخش فقط وقتی شروع می‌شود که عکس کامل رسیده و رمزگشایی شده باشد */
  const easeOut3 = (x) => 1 - Math.pow(1 - x, 3);
  const TILES = [];
  for (let r = 0; r < 3; r++) for (let c = 2; c >= 0; c--) TILES.push({ r, c, d: (2 - c) + r });
  TILES.forEach((t) => { t.k = TILES.filter((u) => u.d === t.d).indexOf(t); });
  const TILE_DUR = 0.6;
  const ready = (img) => {
    if (img.loading === 'lazy') img.loading = 'eager';
    const loaded = img.complete && img.naturalWidth ? Promise.resolve() : new Promise((res) => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });
    return loaded.then(() => (img.decode ? img.decode().catch(() => {}) : null));
  };
  const Cases = {
    build() {
      const sec = $('#cases');
      if (!sec || !window.ScrollTrigger) return;
      const toFa = S.toFa;
      const imgs = $$('.cs__img img', sec);
      this.tws = [];
      /* عکس‌ها کمی زودتر از رسیدن به بخش بارگیری و رمزگشایی می‌شوند */
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { imgs.forEach(ready); this.io.disconnect(); } }, { rootMargin: '150% 0px' });
        this.io.observe(sec);
      } else imgs.forEach(ready);
      this.ctx = gsap.context(() => {
        $$('.cs', sec).forEach((cs) => {
          const media = $('.cs__media', cs);
          /* نمونه‌ای که یک بار باز شده، بعد از ساخت دوباره (مثلاً تغییر اندازه‌ی پنجره) دیگر پنهان نمی‌شود */
          const shown = cs.dataset.shown === '1';
          const figs = shown ? [] : $$('.cs__img', cs).map((fig, fi) => {
            const img = $('img', fig);
            const cv = document.createElement('canvas');
            cv.className = 'cs__cv'; cv.setAttribute('aria-hidden', 'true');
            fig.appendChild(cv);
            gsap.set(img, { opacity: 0 });
            return { fig, img, cv, ctx: cv.getContext('2d'), fi, w: 0, h: 0 };
          });
          const size = (F) => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            F.w = F.fig.clientWidth; F.h = F.fig.clientHeight;
            F.cv.width = Math.round(F.w * dpr); F.cv.height = Math.round(F.h * dpr);
            F.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            F.ctx.imageSmoothingQuality = 'high';
          };
          /* هر کاشی مربعی است که از مرکز خانه‌اش بزرگ می‌شود و همان تکه‌ی عکس (با برش cover) را نشان می‌دهد */
          const draw = (F, t) => {
            const { ctx, img, w, h } = F, iw = img.naturalWidth, ih = img.naturalHeight;
            if (!iw || !w) return;
            ctx.clearRect(0, 0, w, h);
            const sc = Math.max(w / iw, h / ih), ox = (w - iw * sc) / 2, oy = (h - ih * sc) / 2;
            TILES.forEach((T) => {
              const p = easeOut3(Math.min(1, Math.max(0, (t - (F.fi * 0.22 + T.d * 0.11 + T.k * 0.07)) / TILE_DUR)));
              if (p <= 0) return;
              const hw = (w / 6) * p * 1.08, hh = (h / 6) * p * 1.08;
              const cx = (T.c + 0.5) * w / 3, cy = (T.r + 0.5) * h / 3;
              const x0 = Math.max(0, cx - hw), y0 = Math.max(0, cy - hh), x1 = Math.min(w, cx + hw), y1 = Math.min(h, cy + hh);
              ctx.drawImage(img, (x0 - ox) / sc, (y0 - oy) / sc, (x1 - x0) / sc, (y1 - y0) / sc, x0, y0, x1 - x0, y1 - y0);
            });
          };
          const total = (figs.length - 1) * 0.22 + 4 * 0.11 + 2 * 0.07 + TILE_DUR;
          const clock = { t: 0 };
          let played = false;
          const play = () => {
            if (played) return; played = true;
            /* تا عکس‌ها آماده نشده‌اند شروع نمی‌کنیم (حداکثر ۱٫۵ ثانیه صبر) */
            const wait = Promise.race([Promise.all(figs.map((F) => ready(F.img))), new Promise((r) => setTimeout(r, 1500))]);
            wait.then(() => {
              if (!this.ctx) return;
              figs.forEach(size);
              this.tws.push(gsap.to(clock, {
                t: total, duration: total, ease: 'none',
                onUpdate: () => figs.forEach((F) => draw(F, clock.t)),
                onComplete: () => { cs.dataset.shown = '1'; figs.forEach((F) => { gsap.set(F.img, { opacity: 1 }); F.cv.remove(); }); }
              }));
            });
          };
          if (!shown) {
            ScrollTrigger.create({
              trigger: media, start: 'top 78%', once: true, onEnter: play,
              /* اگر صفحه از قبل از این نقطه گذشته باشد (بازسازی وسط صفحه)، همان لحظه پخش می‌شود */
              onRefresh: (self) => { if (self.scroll() > self.start) play(); }
            });
          }
          /* عکس کوچک کمی کندتر از صفحه حرکت می‌کند */
          const b = $('.cs__img--b', cs);
          if (b) gsap.fromTo(b, { yPercent: 14 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: cs, start: 'top bottom', end: 'bottom top', scrub: true } });
          /* عددهای نتیجه شمرده می‌شوند */
          const nums = $$('.cs__stats b[data-count]', cs);
          ScrollTrigger.create({
            trigger: $('.cs__stats', cs), start: 'top 88%', once: true,
            onEnter: () => nums.forEach((n) => {
              const to = parseFloat(n.dataset.count), dec = n.dataset.dec ? 1 : 0, o = { v: 0 };
              gsap.to(o, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => { n.textContent = toFa(o.v.toFixed(dec)).replace('.', '٫'); } });
            })
          });
        });
      });
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      (this.tws || []).forEach((t) => t.kill()); this.tws = [];
      const had = !!this.ctx;
      if (this.ctx) { this.ctx.revert(); this.ctx = null; }
      if (!had) return;
      $$('#cases .cs__cv').forEach((c) => c.remove());
      $$('#cases .cs__img img, #cases .cs__img--b').forEach((el) => gsap.set(el, { clearProps: 'opacity,transform' }));
      $$('#cases .cs__stats b[data-count]').forEach((n) => { n.textContent = S.toFa(n.dataset.count).replace('.', '٫'); });
    }
  };

  Motion.add(Titles);
  Motion.add(Cases);
  Motion.add(JSky);
})();
