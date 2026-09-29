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

  /* ---------- نوار چسبان زیر هدر (پزشکان و سؤال‌ها) ----------
     نشانه‌ی ۱ پیکسلی بالای بخش (.pg-bar__top) دیده‌بان است؛ فقط کلاس خود نوار عوض می‌شود (نه html) تا صفحه دوباره استایل نخورد */
  function stickBar(bar, sec) {
    const mark = sec && $('.pg-bar__top', sec);
    if (!bar || !mark || !('IntersectionObserver' in window)) return;
    let io = null;
    const watch = () => {
      if (io) io.disconnect();
      const top = Math.round(parseFloat(getComputedStyle(bar).top) || 0), pad = Math.round(parseFloat(getComputedStyle(sec).paddingTop) || 0);
      io = new IntersectionObserver(([en]) => {
        bar.classList.toggle('is-stuck', !en.isIntersecting && en.boundingClientRect.top < top);
      }, { rootMargin: `-${Math.max(0, top - pad)}px 0px 0px 0px` });
      io.observe(mark);
    };
    watch();
    let rt = 0; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(watch, 200); });
  }
  /* اگر نوار چسبیده و فهرست کوتاه‌تر شد، بی‌صدا به ابتدای فهرست برمی‌گردیم تا بیننده وسط بخش بعدی نیفتد */
  function backTo(sec, bar) {
    const y = Math.round(sec.getBoundingClientRect().top + window.scrollY + (parseFloat(getComputedStyle(sec).paddingTop) || 0) - (parseFloat(getComputedStyle(bar).top) || 0)) + 2;
    if (window.scrollY <= y + 1) return;
    window.scrollTo(0, y);
    if (Motion.lenis) Motion.lenis.scrollTo(y, { immediate: true, force: true });
  }
  /* مرورگر با «لنگر اسکرول» جای دید را ثابت نگه می‌دارد و scrollY عوض می‌شود؛ اسکرول نرم باید همان را بداند */
  function syncLenis() {
    const L = Motion.lenis;
    if (L) { if (L.resize) L.resize(); L.scrollTo(window.scrollY, { immediate: true, force: true }); }
  }

  /* ---------- فیلتر بخش‌ها ---------- */
  let setFilter = () => {};
  function Filter() {
    const box = $('.dr-tabs'), list = $('.dr-cards');
    if (!box || !list) return;
    const cards = $$('.dr-card'), count = $('.pg-count b'), bar = $('.pg-bar'), sec = $('#profiles');
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
      syncLenis();
    };
    paint();
    const put = Pill(box);
    const toTop = () => backTo(sec, bar);
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
    stickBar(bar, sec);
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
     ساعت کاری بخش‌ها (پزشکان و تماس): وضعیت همین حالا، عقربه‌ی ساعت تهران، امروزِ هفته
     ========================================================================== */
  const nowText = (k) => {
    if (k === 'medicine') return { cls: 'is-open', text: 'همین حالا پزشک در کلینیک است' };
    if (k === 'beauty') return { cls: '', text: 'روز و ساعت را پذیرش هماهنگ می‌کند' };
    const d = Clinic.dental();
    return d.open ? { cls: 'is-open', text: 'همین حالا ' + d.text } : { cls: 'is-closed', text: 'بسته است · ' + d.when };
  };
  function paintHours() {
    $$('[data-now]').forEach((el) => {
      const n = nowText(el.dataset.now), sp = $('span', el);
      el.classList.remove('is-open', 'is-closed'); if (n.cls) el.classList.add(n.cls);
      if (sp && sp.textContent !== n.text) sp.textContent = n.text;
    });
    const t = Clinic.now();
    $$('.hrs__hand').forEach((h) => h.style.setProperty('--a', (t.min / 1440 * 360).toFixed(2) + 'deg'));
    $$('.hrs__week li').forEach((li) => li.classList.toggle('is-today', +li.dataset.d === t.d));
  }
  if ($('[data-now]')) {
    paintHours();
    setInterval(() => { if (!document.hidden) paintHours(); }, 60e3);
  }
  /* ورود: کمان ساعت‌های باز کشیده می‌شود، عقربه از ۰ تا ساعت همین حالا می‌چرخد و روزها پله‌ای روشن می‌شوند */
  const HoursFx = {
    io: null, anims: [],
    build() {
      const sec = $('.hrs');
      if (!sec || !anim() || !('IntersectionObserver' in window)) return;
      if (sec.getBoundingClientRect().top < window.innerHeight * 0.8) return;
      sec.classList.add('is-pre');
      this.io = new IntersectionObserver((ents) => {
        if (!ents.some((en) => en.isIntersecting)) return;
        this.io.disconnect(); this.io = null;
        sec.classList.remove('is-pre');
        if (!anim()) return;
        const A = this.anims;
        $$('.hrs__card', sec).forEach((card, c) => {
          const base = c * 140;
          const arc = $('.hrs__arc', card), hand = $('.hrs__hand', card);
          if (arc && !arc.classList.contains('hrs__arc--appt')) {
            const full = getComputedStyle(arc).strokeDasharray;
            A.push(arc.animate([{ strokeDasharray: '0 24' }, { strokeDasharray: full }], { duration: 1400, delay: base + 200, easing: EASE, fill: 'backwards' }));
          } else if (arc) A.push(arc.animate([{ opacity: 0, transform: 'rotate(-40deg)' }, { opacity: .8, transform: 'none' }], { duration: 1400, delay: base + 200, easing: EASE, fill: 'backwards' }));
          if (hand) {
            const a = getComputedStyle(hand).getPropertyValue('--a').trim() || '0deg';
            A.push(hand.animate([{ transform: 'rotate(0deg)', opacity: 0 }, { transform: `rotate(${a})`, opacity: 1 }], { duration: 1600, delay: base + 380, easing: SPRING, fill: 'backwards' }));
          }
          $$('.hrs__week li', card).forEach((li, i) => A.push(li.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: base + 500 + i * 45, easing: SPRING, fill: 'backwards' })));
          A.push(card.animate(up(30), { duration: 900, delay: base, easing: EASE, fill: 'backwards' }));
        });
      }, { rootMargin: '0px 0px -15% 0px' });
      this.io.observe(sec);
    },
    kill() {
      if (this.io) { this.io.disconnect(); this.io = null; }
      this.anims.forEach((a) => a.cancel()); this.anims = [];
      const s = $('.hrs'); if (s) s.classList.remove('is-pre');
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
     تماس: وضعیت همین حالا، نور کارت‌ها با نشانگر
     ========================================================================== */
  const live = $('[data-live]');
  if (live) {
    const put = () => { const s = Clinic.status().text; if (live.textContent !== s) live.textContent = s; };
    put(); setInterval(() => { if (!document.hidden) put(); }, 60e3);
  }
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.ct-way').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true }));
  }

  /* ==========================================================================
     سؤال‌ها (صفحه‌ی سؤال‌ها و بخش سؤال‌های تماس): باز و بسته شدن نرم
     فهرست صفحه‌ی اصلی (#faqList) را home.js می‌گرداند
     ========================================================================== */
  const QA = {
    set(d, open) {
      const a = $('.faq-item__a', d);
      if (d._anim) { d._anim.cancel(); d._anim = null; }
      d.classList.toggle('is-closing', !open);
      if (!anim()) { d.open = open; d.classList.remove('is-closing'); return; }
      if (open) {
        d.open = true;
        d._anim = a.animate([{ height: '0px', opacity: 0 }, { height: a.scrollHeight + 'px', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.22, 1, .36, 1)' });
        d._anim.onfinish = () => { d._anim = null; };
      } else {
        d._anim = a.animate([{ height: a.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' });
        d._anim.onfinish = () => { d.open = false; d.classList.remove('is-closing'); if (d._anim) d._anim.cancel(); d._anim = null; };
      }
    },
    bind(root) {
      $$('.faq-item', root).forEach((d) => {
        if (d.closest('#faqList') || d._qa) return;
        d._qa = true;
        $('summary', d).addEventListener('click', (e) => { e.preventDefault(); QA.set(d, !d.open || d.classList.contains('is-closing')); });
      });
    }
  };
  QA.bind(document);

  /* ---------- صفحه‌ی سؤال‌ها: جست‌وجوی زنده با برجسته شدن کلمه‌ها، دسته‌ها، باز شدن سؤال از نشانی ---------- */
  function FaqPage() {
    const sec = $('.fq'), input = $('#fqSearch');
    if (!sec || !input) return;
    const clear = $('.fq-search__clear'), tabsBox = $('.fq-tabs'), btns = $$(':scope > button', tabsBox), bar = $('.pg-bar', sec);
    const groups = $$('.fq-grp', sec), items = $$('.faq-item', sec), empty = $('.fq-empty', sec), count = $('.fq-count');
    /* ی و ک عربی، نیم‌فاصله و اعراب یکی می‌شوند تا «نیمه شب» و «نیمه‌شب» هر دو پیدا شوند */
    const norm = (s) => s.toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[أإآ]/g, 'ا').replace(/[\u064B-\u065F\u0670]/g, '').replace(/[\u200c\u200f\u200e]/g, ' ').replace(/\s+/g, ' ').trim();
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const rx = (w) => w.split('').map((c) => (c === ' ' ? '[\\s\\u200c]+' : c === 'ی' ? '[یيى]' : c === 'ک' ? '[کك]' : c === 'ا' ? '[اأإآ]' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('\\u200c?');
    items.forEach((d) => { const q = $('.faq-item__q', d); d._q = q.textContent; d._n = norm(q.textContent + ' ' + $('.faq-item__a', d).textContent); });
    let cat = 'all', words = [], fade = null, ref = 0, jumped = false;
    const hilite = (d) => {
      const q = $('.faq-item__q', d);
      if (!words.length) { if (q.innerHTML !== esc(d._q)) q.innerHTML = esc(d._q); return; }
      try { q.innerHTML = esc(d._q).replace(new RegExp('(' + words.map(rx).join('|') + ')', 'g'), '<mark>$1</mark>'); } catch (e) { q.textContent = d._q; }
    };
    const paint = () => {
      let n = 0;
      items.forEach((d) => {
        const on = (cat === 'all' || d.dataset.k === cat) && words.every((w) => d._n.includes(w));
        d.hidden = !on; hilite(d);
        if (on) n++;
      });
      groups.forEach((g) => { g.hidden = !$$('.faq-item', g).some((d) => !d.hidden); });
      empty.hidden = n > 0;
      $('b', count).textContent = toFa(n);
      count.lastChild.textContent = words.length ? ` پاسخ برای «${input.value.trim()}»` : ' سؤال';
      syncLenis();
      clearTimeout(ref); ref = setTimeout(refresh, 350);
    };
    const enter = () => {
      if (!anim()) return;
      const vh = window.innerHeight; let k = 0;
      [...groups, empty].forEach((el) => {
        if (el.hidden) return;
        const r = el.getBoundingClientRect(); if (r.top > vh || r.bottom < 0) return;
        el.classList.remove('is-pre');
        el.animate(up(22), { duration: 620, delay: k++ * 60, easing: EASE, fill: 'backwards' });
      });
    };
    /* تغییر نرم: فهرست کوتاه محو می‌شود، عوض می‌شود و دوباره بالا می‌آید */
    const update = (toList) => {
      if (fade) { fade.cancel(); fade = null; }
      if (!anim()) { paint(); if (toList) backTo(sec, bar); return; }
      const list = $('#fqList');
      fade = list.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' });
      fade.onfinish = () => { paint(); if (toList) backTo(sec, bar); fade.cancel(); fade = null; enter(); };
    };
    const setCat = (f) => {
      cat = f;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
      update(true);
    };
    btns.forEach((b) => b.addEventListener('click', () => setCat(b.dataset.f)));
    const putPill = Pill(tabsBox);
    let st = 0;
    const onQuery = () => {
      const w = norm(input.value).split(' ').filter((x) => x.length > 1);
      clear.hidden = !input.value;
      if (w.join(' ') === words.join(' ')) return;
      words = w;
      clearTimeout(st);
      st = setTimeout(() => {
        update(false);
        /* بار اول که چیزی نوشته می‌شود، اگر فهرست پایین صفحه است آرام بالا می‌آید تا نتیجه دیده شود */
        if (!jumped && words.length && sec.getBoundingClientRect().top > window.innerHeight * 0.55) {
          jumped = true;
          Motion.scrollTo(sec, -(parseFloat(getComputedStyle(bar).top) || 0) + 20);
        }
      }, 140);
    };
    input.addEventListener('input', onQuery);
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; onQuery(); } });
    clear.addEventListener('click', () => { input.value = ''; onQuery(); input.focus(); });
    $$('.fq-pop__b').forEach((b) => b.addEventListener('click', () => { input.value = b.textContent; jumped = false; onQuery(); }));
    $('.fq-empty__reset', sec).addEventListener('click', () => { input.value = ''; cat = 'all'; btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === 'all'))); words = ['~']; onQuery(); requestAnimationFrame(() => putPill(false)); });
    /* کلید «/» جست‌وجو را فعال می‌کند */
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const a = document.activeElement; if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
      if (document.querySelector('#bk:not([hidden]), #svc:not([hidden])')) return;
      e.preventDefault(); input.focus({ preventScroll: true });
    });
    stickBar(bar, sec);
    /* نشانی faq.html#q-… همان سؤال را باز می‌کند (اسکرول را هسته‌ی سایت انجام می‌دهد) */
    const openHash = () => {
      const h = decodeURIComponent(location.hash.slice(1)); if (!/^q-/.test(h)) return;
      const an = document.getElementById(h), d = an && an.closest('.faq-item');
      if (d && !d.open) QA.set(d, true);
    };
    openHash();
    window.addEventListener('hashchange', openHash);
  }
  FaqPage();

  /* ---------- نمونه‌کارها: فیلتر بخش‌ها (عکس‌ها و عددها را fx.js می‌گرداند) ---------- */
  function CasesPage() {
    const sec = $('.cs-page'), box = $('.cs-tabs');
    if (!sec || !box) return;
    const list = $('.cs-list', sec), cards = $$('.cs', sec), count = $('.cs-count b'), bar = $('.pg-bar', sec);
    const btns = $$(':scope > button', box);
    let cur = 'all', fade = null;
    const paint = () => {
      let n = 0;
      cards.forEach((c) => { const on = cur === 'all' || c.dataset.k === cur; c.hidden = !on; if (on) n++; });
      if (count) count.textContent = toFa(n);
      syncLenis();
    };
    const set = (f) => {
      if (f === cur) return;
      cur = f;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
      if (fade) { fade.cancel(); fade = null; }
      if (!anim()) { paint(); backTo(sec, bar); refresh(); return; }
      fade = list.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, easing: 'ease-out', fill: 'forwards' });
      fade.onfinish = () => {
        paint(); backTo(sec, bar); refresh();
        fade.cancel(); fade = null;
        const vh = window.innerHeight;
        cards.filter((c) => !c.hidden).forEach((c, i) => { const r = c.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) c.animate(up(34), { duration: 800, delay: i * 80, easing: EASE, fill: 'backwards' }); });
      };
    };
    btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.f)));
    Pill(box);
    stickBar(bar, sec);
  }
  CasesPage();

  /* روند کار: خط پیشرفت همراه اسکرول پر می‌شود (فقط transform) و قدم‌ها یکی‌یکی روشن می‌شوند */
  const ProcFx = {
    st: null,
    build() {
      const track = $('.cs-proc__track');
      if (!track || !window.ScrollTrigger || root.classList.contains('rm')) return;
      const line = $('.cs-proc__line i', track), steps = $$('.cs-proc__s', track), n = steps.length;
      const paint = (p) => {
        line.style.setProperty('--p', p.toFixed(3));
        steps.forEach((s, i) => { const on = p >= (n > 1 ? i / (n - 1) : 0) - 0.001; if (on !== s.classList.contains('is-on')) s.classList.toggle('is-on', on); });
      };
      paint(0);
      this.st = ScrollTrigger.create({ trigger: track, start: 'top 75%', end: 'bottom 55%', scrub: 0.6, onUpdate: (self) => paint(self.progress) });
    },
    kill() {
      if (this.st) { this.st.kill(); this.st = null; }
      const l = $('.cs-proc__line i'); if (l) l.style.removeProperty('--p');
      $$('.cs-proc__s').forEach((s) => s.classList.remove('is-on'));
    }
  };

  /* ---------- حریم خصوصی: فهرست کناری با بخش فعلی و نوار پیشرفت خواندن ---------- */
  function LegalToc() {
    const nav = $('.lg-toc__nav'), doc = $('.lg__doc');
    if (!nav || !doc || !('IntersectionObserver' in window)) return;
    const links = $$('a', nav), secs = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
    let cur = null;
    const setOn = (id) => {
      if (id === cur) return; cur = id;
      links.forEach((a) => a.classList.toggle('is-on', a.hash === '#' + id));
    };
    /* بخشی که از خط ۳۰٪ بالای صفحه رد شده، بخش فعلی است */
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) setOn(en.target.id); });
    }, { rootMargin: '-30% 0px -65% 0px' });
    secs.forEach((s) => io.observe(s));
    const bar = $('.lg-toc__prog i');
    if (bar) {
      let q = false;
      const paint = () => {
        q = false;
        const r = doc.getBoundingClientRect(), vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.3 - r.top) / Math.max(1, r.height - vh * 0.4)));
        bar.style.setProperty('--p', p.toFixed(3));
      };
      window.addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(paint); } }, { passive: true });
      paint();
    }
  }
  LegalToc();

  /* ---------- ۴۰۴: لایه‌های «۴ لوگو ۴» با نشانگر کمی جابه‌جا می‌شوند (فقط translate، یک بار در هر فریم) ---------- */
  const nfArt = $('.nf__art');
  if (nfArt && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const layers = $$('[data-depth]', nfArt);
    let q = false, mx = 0, my = 0;
    const paint = () => {
      q = false;
      if (root.classList.contains('rm')) return;
      layers.forEach((l) => { const d = +l.dataset.depth; l.style.setProperty('--tx', (mx * d).toFixed(1) + 'px'); l.style.setProperty('--ty', (my * d).toFixed(1) + 'px'); });
    };
    window.addEventListener('pointermove', (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2; my = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!q) { q = true; requestAnimationFrame(paint); }
    }, { passive: true });
  }

  /* گفت‌وگوی نمونه‌ی کنار سؤال‌ها: پیام‌ها یکی‌یکی می‌آیند (یک بار) */
  const ChatFx = {
    io: null,
    build() {
      const box = $('.fq-ask');
      if (!box || !anim() || !('IntersectionObserver' in window)) return;
      box.classList.add('is-pre');
      this.io = new IntersectionObserver((ents) => {
        if (!ents.some((en) => en.isIntersecting)) return;
        this.io.disconnect(); this.io = null;
        box.classList.remove('is-pre');
        if (!anim()) return;
        $$('.fq-chat__m', box).forEach((m, i) => m.animate([{ opacity: 0, transform: 'translate3d(0, 14px, 0) scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 250 + i * 700, easing: SPRING, fill: 'backwards' }));
      }, { rootMargin: '0px 0px -10% 0px' });
      this.io.observe(box);
    },
    kill() { if (this.io) { this.io.disconnect(); this.io = null; } const b = $('.fq-ask'); if (b) b.classList.remove('is-pre'); }
  };

  /* ابزارهای مشترک برای اسکریپت صفحه‌ها (مثل cases.js) */
  S.Pages = { Pill, syncLenis, stickBar, backTo };

  /* ==========================================================================
     راه‌اندازی
     ========================================================================== */
  if ($('.pg-stats')) Motion.add(Count);
  if ($('.dr-card')) { Filter(); Motion.add(Cards); }
  if ($('.hrs')) Motion.add(HoursFx);
  if ($('.fq-ask')) Motion.add(ChatFx);
  if ($('.cs-proc__track')) Motion.add(ProcFx);
  if ($('.ab-shot')) Motion.add(Shot);
  if ($('.ab-facts')) Motion.add(CountIn);
  if ($('.ab-step')) Story();
  /* نقشه به روشن شدن حرکت بستگی دارد؛ بعد از راه‌اندازی هسته ساخته می‌شود */
  if ($('.ab-map')) document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(MapIn));
})();
