/* ==========================================================================
   dept.js: صفحه‌ی هر بخش (dental.html و …)
   - نوار چسبان خدمات: خدمت جاری را نشان می‌دهد و با کلیک، نرم تا همان خدمت می‌رود
   - چهار قدم کار: خط بین قدم‌ها با رسیدن به بخش کشیده می‌شود و شماره‌ها پله‌ای می‌آیند
   - نمودار تعاملی (js/mg.js)
   حرکت‌ها transform و opacity اند و با «کاهش حرکت» خاموش می‌شوند.
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, Motion } = S;
  const dp = $('main.dp');
  if (!dp) return;
  const root = document.documentElement;
  const canAnim = typeof Element.prototype.animate === 'function';
  const anim = () => canAnim && !root.classList.contains('rm');
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const hdr = () => parseFloat(getComputedStyle(root).getPropertyValue('--hdr-h')) || 76;

  /* ---------- نوار خدمات ---------- */
  const nav = $('.dp-nav__in', dp);
  if (nav) {
    const links = $$('a[href^="#"]', nav);
    const secs = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    let cur = null, lock = 0;
    const mark = (id, force) => {
      /* بعد از کلیک، تا رسیدن به مقصد همان زبانه می‌ماند (دو کارت کنار هم هم‌ارتفاع‌اند) */
      if (!force && Date.now() < lock) return;
      if (id === cur) return;
      cur = id;
      links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id)));
      const a = links.find((x) => x.getAttribute('href') === '#' + id);
      /* زبانه‌ی جاری داخل نوار دیده شود (فقط اسکرول افقی خود نوار) */
      if (a && nav.scrollWidth > nav.clientWidth + 2) {
        const want = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
        nav.scrollTo({ left: want, behavior: anim() ? 'smooth' : 'auto' });
      }
    };
    if ('IntersectionObserver' in window && secs.length) {
      const vis = new Map();
      const io = new IntersectionObserver((es) => {
        es.forEach((en) => vis.set(en.target.id, en.isIntersecting ? en.boundingClientRect.top : null));
        const on = secs.filter((s) => vis.get(s.id) != null);
        if (on.length) mark(on.reduce((a, b) => (Math.abs(vis.get(a.id)) <= Math.abs(vis.get(b.id)) ? a : b)).id);
        else if (window.scrollY < secs[0].getBoundingClientRect().top + window.scrollY - window.innerHeight) mark(null);
      }, { rootMargin: `-${Math.round(hdr() + 70)}px 0px -45% 0px` });
      secs.forEach((s) => io.observe(s));
    }
    links.forEach((a) => a.addEventListener('click', (e) => {
      const t = document.getElementById(a.getAttribute('href').slice(1));
      if (!t) return;
      e.preventDefault();
      if (S.MG) S.MG.prepare(t);
      /* عدد دقیق می‌دهیم؛ اگر عنصر داده شود، Lenis خودش scroll-margin را هم اضافه می‌کند */
      const y = Math.max(0, Math.round(t.getBoundingClientRect().top + window.scrollY - (hdr() + 68)));
      if (Motion && Motion.lenis) Motion.lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: anim() ? 'smooth' : 'auto' });
      history.replaceState(null, '', '#' + t.id);
      mark(t.id, true);
      lock = Date.now() + 1400;
    }));
  }

  /* ---------- چهار قدم ---------- */
  const steps = $('.dp-steps', dp);
  if (steps && anim() && 'IntersectionObserver' in window && steps.getBoundingClientRect().top > window.innerHeight * 0.85) {
    const line = $('.dp-steps__line i', steps), nos = $$('.dp-step__no', steps);
    if (line) line.style.setProperty('--p', '0');
    const io = new IntersectionObserver((es) => {
      if (!es.some((en) => en.isIntersecting)) return;
      io.disconnect();
      if (line) {
        line.style.setProperty('--p', '1');
        line.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1600, easing: 'cubic-bezier(.65, 0, .35, 1)', delay: 150 });
      }
      nos.forEach((n, i) => n.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 200 + i * 380, easing: 'cubic-bezier(.34, 1.56, .64, 1)', fill: 'backwards' }));
    }, { rootMargin: '0px 0px -20% 0px' });
    io.observe(steps);
  }

  /* ---------- نمودار تعاملی ---------- */
  if (S.MG) S.MG.auto(dp);
})();
