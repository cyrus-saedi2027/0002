/* ==========================================================================
   article.js: مجله‌ی سلامت
   صفحه‌ی مقاله: نوار پیشرفت خواندن، فهرست مطالب که بخش جاری را نشان می‌دهد، سؤال‌های باز و بسته‌شونده،
                 کپی لینک و ساختن نمودارهای متحرک (js/mg.js) وقتی به آن‌ها می‌رسیم.
   فهرست مقاله‌ها: مقاله‌های برگزیده (پرده‌ی کشویی)، فیلتر بخش‌ها با شمارنده و ورود کارت‌ها.
   همه‌ی حرکت‌ها transform و opacity اند و با «کاهش حرکت» خاموش می‌شوند.
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, clamp, toFa, Motion } = S;
  const Pg = S.Pages || {};
  const root = document.documentElement;
  const rm = () => root.classList.contains('rm');
  const canAnim = typeof Element.prototype.animate === 'function';
  const anim = () => canAnim && !rm();
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const hdr = () => (parseFloat(getComputedStyle(root).getPropertyValue('--hdr-h')) || 76);

  /* ==========================================================================
     صفحه‌ی مقاله
     ========================================================================== */
  const ap = $('main.ap');
  if (ap) {
    const body = $('.ap-body', ap), end = $('.ap-end', ap) || body;
    const bar = $('.ap-prog i', ap);
    const heads = $$('.ap-body h2[id], .ap-faq h2[id]', ap);
    const links = $$('.ap-toc a[data-toc]', ap);
    let top0 = 0, top1 = 1, marks = [], cur = '', raf = 0, lastP = -1;

    const measure = () => {
      const y = window.scrollY;
      top0 = body.getBoundingClientRect().top + y;
      top1 = end.getBoundingClientRect().bottom + y;
      marks = heads.map((h) => ({ id: h.id, y: h.getBoundingClientRect().top + y }));
    };
    const setCur = (id) => {
      if (id === cur) return;
      cur = id;
      links.forEach((a) => { if (a.dataset.toc === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    };
    const paint = () => {
      raf = 0;
      const y = window.scrollY, vh = window.innerHeight;
      const p = clamp((y + vh * 0.4 - top0) / Math.max(1, top1 - top0 - vh * 0.2), 0, 1);
      if (Math.abs(p - lastP) > 0.0005) { lastP = p; bar.style.transform = `scaleX(${p.toFixed(4)})`; }
      const line = y + hdr() + vh * 0.18;
      let id = '';
      for (let i = 0; i < marks.length; i++) { if (marks[i].y <= line) id = marks[i].id; else break; }
      setCur(id);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
    measure(); paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    let rt = 0;
    const remeasure = () => { clearTimeout(rt); rt = setTimeout(() => { measure(); paint(); }, 120); };
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(body);

    /* رفتن به یک بخش از فهرست مطالب */
    const tocm = $('.ap-tocm', ap);
    ap.addEventListener('click', (e) => {
      const a = e.target.closest('.ap-toc a[data-toc]');
      if (!a) return;
      const t = document.getElementById(a.dataset.toc);
      if (!t) return;
      e.preventDefault();
      if (tocm && tocm.contains(a)) tocm.open = false;
      /* نمودارهای بین راه اول ساخته می‌شوند (ارتفاعشان عوض می‌شود)؛ بعد جای دقیق حساب می‌شود.
         عدد داده می‌شود نه خود عنصر، چون Lenis برای عنصر scroll-margin را هم اضافه می‌کند */
      if (S.MG) S.MG.prepare(t);
      const y = Math.max(0, Math.round(t.getBoundingClientRect().top + window.scrollY - (hdr() + 22)));
      if (Motion.lenis) Motion.scrollTo(y);
      else window.scrollTo({ top: y, behavior: rm() ? 'auto' : 'smooth' });
      try { history.replaceState(null, '', '#' + t.id); } catch (err) { /* محیط محدود */ }
      t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
    });

    /* سؤال‌ها: باز و بسته شدن نرم */
    $$('.ap-q', ap).forEach((d) => {
      const a = $('.ap-q__a', d);
      $('summary', d).addEventListener('click', (e) => {
        if (!anim()) return;
        e.preventDefault();
        if (d._a) { d._a.cancel(); d._a = null; }
        const open = !d.open || d.classList.contains('is-closing');
        if (open) {
          d.classList.remove('is-closing'); d.open = true;
          d._a = a.animate([{ height: '0px', opacity: 0 }, { height: a.scrollHeight + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)' });
          d._a.onfinish = () => { d._a = null; remeasure(); };
        } else {
          d.classList.add('is-closing');
          d._a = a.animate([{ height: a.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 360, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' });
          d._a.onfinish = () => { d.open = false; d.classList.remove('is-closing'); if (d._a) d._a.cancel(); d._a = null; remeasure(); };
        }
      });
      d.addEventListener('toggle', remeasure);
    });

    /* کپی لینک */
    $$('.ap-copy', ap).forEach((b) => b.addEventListener('click', () => {
      const url = b.dataset.url || location.href.split('#')[0];
      const t = $('span', b), was = t.textContent;
      const ok = () => { b.classList.add('is-done'); t.textContent = 'کپی شد'; clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove('is-done'); t.textContent = was; }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, ok); else ok();
    }));

    /* نمودارهای متحرک (js/mg.js) */
    if (S.MG) S.MG.auto(ap, remeasure);
  }

  /* ==========================================================================
     فهرست همه‌ی مقاله‌ها
     ========================================================================== */
  const ax = $('main.ax');
  if (ax) {
    /* ---------- مقاله‌های برگزیده ---------- */
    const feat = $('.axf', ax);
    if (feat) {
      const stage = $('.axf__stage', feat), slides = $$('.axf__slide', feat), txts = $$('.axf__t', feat), btns = $$('.axf__idx button', feat);
      let fi = 0, auto = null, steps = 0, visible = false, hover = false, busy = 0;
      const AUTO = 6500, MAX = slides.length * 2;
      const stopAuto = () => { if (auto) { auto.cancel(); auto = null; } };
      const runAuto = () => {
        stopAuto();
        if (!anim() || !visible || hover || document.hidden || steps >= MAX || slides.length < 2) return;
        const b = $('.axf__bar i', btns[fi]);
        auto = b.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: AUTO, easing: 'linear' });
        auto.onfinish = () => { auto = null; steps++; go(fi + 1, 1); };
      };
      const swapTxt = (to) => {
        const out = txts[fi], inn = txts[to];
        if (!anim()) { out.hidden = true; out.classList.remove('is-on'); inn.hidden = false; inn.classList.add('is-on'); return; }
        const o = out.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0, -10px, 0)' }], { duration: 220, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' });
        o.onfinish = () => {
          out.hidden = true; out.classList.remove('is-on'); o.cancel();
          inn.hidden = false; inn.classList.add('is-on');
          [...inn.children].forEach((k, i) => k.animate([{ opacity: 0, transform: 'translate3d(0, 16px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 760, delay: i * 70, easing: EASE, fill: 'backwards' }));
        };
      };
      function go(n, d) {
        const to = (n + slides.length) % slides.length;
        if (to === fi) return;
        if (!d) d = to > fi ? 1 : -1;
        const from = slides[fi], inS = slides[to];
        swapTxt(to);
        fi = to;
        btns.forEach((b, k) => { if (k === to) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
        slides.forEach((s, k) => { s.tabIndex = k === to ? 0 : -1; });
        if (!anim()) { from.classList.remove('is-on'); inS.classList.add('is-on'); runAuto(); return; }
        slides.forEach((s) => { s.getAnimations({ subtree: true }).forEach((x) => x.finish()); s.classList.remove('is-under'); });
        from.classList.add('is-under'); from.classList.remove('is-on'); inS.classList.add('is-on');
        /* راست‌به‌چپ: «بعدی» از چپ وارد می‌شود؛ قاب و عکس خلاف هم حرکت می‌کنند تا پرده روی عکس باز شود */
        const x = d > 0 ? -100 : 100, D = 1100, E = 'cubic-bezier(.77, 0, .18, 1)';
        inS.animate([{ transform: `translate3d(${x}%, 0, 0)` }, { transform: 'none' }], { duration: D, easing: E });
        $('.axf__in', inS).animate([{ transform: `translate3d(${-x}%, 0, 0) scale(1.18)` }, { transform: 'none' }], { duration: D, easing: E });
        const oa = $('.axf__in', from).animate([{ transform: 'none' }, { transform: `translate3d(${-x * 0.28}%, 0, 0) scale(1.06)` }], { duration: D, easing: E, fill: 'forwards' });
        oa.onfinish = () => { from.classList.remove('is-under'); oa.cancel(); };
        clearTimeout(busy); busy = setTimeout(runAuto, 200);
      }
      feat.addEventListener('click', (e) => {
        const b = e.target.closest('.axf__idx button, .axf__arrow');
        if (!b) return;
        steps = MAX;
        if (b.dataset.i != null) go(+b.dataset.i); else go(fi + +b.dataset.d, +b.dataset.d);
      });
      stage.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault(); steps = MAX;
        const d = e.key === 'ArrowLeft' ? 1 : -1;
        go(fi + d, d); slides[fi].focus({ preventScroll: true });
      });
      /* کشیدن افقی با انگشت یا موس؛ کلیک بعد از کشیدن مقاله را باز نمی‌کند */
      let sx = null, sy = 0, moved = false;
      stage.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; sx = e.clientX; sy = e.clientY; moved = false; });
      stage.addEventListener('pointermove', (e) => { if (sx == null || moved) return; const dx = e.clientX - sx; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - sy) * 1.3) { moved = true; steps = MAX; const d = dx > 0 ? 1 : -1; go(fi + d, d); } });
      const up = () => { sx = null; };
      stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
      stage.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
      feat.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; stopAuto(); } });
      feat.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; runAuto(); } });
      document.addEventListener('visibilitychange', () => { if (document.hidden) stopAuto(); else runAuto(); });
      if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) runAuto(); else stopAuto(); }, { threshold: 0.4 }).observe(stage);
    }

    /* ---------- فیلتر بخش‌ها ---------- */
    const sec = $('.ax-list', ax), box = $('.ax-tabs', ax), grid = $('.ax-grid', ax), bar = $('.ax-bar', ax);
    if (sec && box && grid) {
      const cards = $$('.ac', grid), btns = $$(':scope > button', box), count = $('.ax-count b', ax);
      let cur = 'all', fade = null;
      const put = Pg.Pill ? Pg.Pill(box) : () => {};
      if (Pg.stickBar) Pg.stickBar(bar, sec);
      const paint = () => {
        let n = 0;
        cards.forEach((c) => { const on = cur === 'all' || c.dataset.k === cur; c.hidden = !on; if (on) { n++; const no = $('.ac__no', c); if (no) no.textContent = toFa(String(n).padStart(2, '0')); } });
        if (count) count.textContent = toFa(n);
        if (Pg.syncLenis) Pg.syncLenis();
      };
      const set = (f, quiet) => {
        if (!btns.some((b) => b.dataset.f === f)) f = 'all';
        if (f === cur) return;
        cur = f;
        btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
        requestAnimationFrame(() => put(!!quiet));
        try { history.replaceState(null, '', f === 'all' ? location.pathname + location.search : '#cat-' + f); } catch (e) { /* محیط محدود */ }
        if (fade) { fade.cancel(); fade = null; }
        if (quiet || !anim()) { paint(); if (!quiet && Pg.backTo) Pg.backTo(sec, bar); if (Motion.on && window.ScrollTrigger) ScrollTrigger.refresh(); return; }
        fade = grid.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, easing: 'ease-out', fill: 'forwards' });
        fade.onfinish = () => {
          paint(); if (Pg.backTo) Pg.backTo(sec, bar); if (Motion.on && window.ScrollTrigger) ScrollTrigger.refresh();
          fade.cancel(); fade = null;
          const vh = window.innerHeight;
          cards.filter((c) => !c.hidden).forEach((c, i) => { const r = c.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) c.animate([{ opacity: 0, transform: 'translate3d(0, 30px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: i * 70, easing: EASE, fill: 'backwards' }); });
        };
      };
      btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.f)));
      const fromHash = () => { const m = /^#cat-([a-z]+)$/.exec(location.hash); if (m) set(m[1], true); };
      fromHash();
      window.addEventListener('hashchange', fromHash);

      /* ورود کارت‌ها با اسکرول */
      if (anim() && 'IntersectionObserver' in window) {
        const vh = window.innerHeight;
        const pend = cards.filter((c) => c.getBoundingClientRect().top > vh * 0.9);
        pend.forEach((c) => c.classList.add('is-pre'));
        let q = [], qt = 0;
        const flush = () => { q.forEach((c, i) => { c.classList.remove('is-pre'); c.animate([{ opacity: 0, transform: 'translate3d(0, 40px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 950, delay: i * 80, easing: EASE, fill: 'backwards' }); }); q = []; };
        const io = new IntersectionObserver((es) => es.forEach((en) => { if (!en.isIntersecting) return; io.unobserve(en.target); q.push(en.target); clearTimeout(qt); qt = setTimeout(flush, 30); }), { rootMargin: '0px 0px -10% 0px' });
        pend.forEach((c) => io.observe(c));
      }
    }
  }
})();
