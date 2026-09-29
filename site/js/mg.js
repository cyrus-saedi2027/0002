/* ==========================================================================
   mg.js: نمودارهای متحرک مقاله‌ها
   هر نمودار در متن مقاله یک <figure class="ap-mg" data-mg="نام"> است؛ article.js کمی پیش از رسیدن به آن
   S.MG.build(el) را صدا می‌زند و بعد با show(true/false) خبر می‌دهد که روی صفحه هست یا نه.
   حرکت‌ها فقط transform و opacity اند (ترنزیشن CSS یا WAAPI)؛ با «کاهش حرکت» همه‌چیز در حالت نهایی می‌ایستد.
   ========================================================================== */
(function () {
  'use strict';

  const S = window.Sasan;
  if (!S) return;
  const { $, $$, toFa } = S;
  const root = document.documentElement;
  const rm = () => root.classList.contains('rm');
  const canAnim = typeof Element.prototype.animate === 'function';
  const anim = () => canAnim && !rm();
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const fa = (n) => toFa(String(n));
  const put = (el, html) => { el.innerHTML = html; return el; };
  const play = (node, kf, o) => (anim() && node ? node.animate(kf, Object.assign({ easing: EASE, fill: 'both' }, o)) : null);

  /* دکمه‌های چندحالته (seg): با کلیک کاربر، چرخش خودکار متوقف می‌شود */
  function seg(host, items, onPick) {
    const box = document.createElement('div');
    box.className = 'mg-seg'; box.setAttribute('role', 'group');
    box.innerHTML = items.map(([v, t], i) => `<button type="button" data-v="${v}" aria-pressed="${i === 0}">${t}</button>`).join('');
    host.appendChild(box);
    const btns = $$('button', box);
    const set = (v) => btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    btns.forEach((b) => b.addEventListener('click', () => { set(b.dataset.v); onPick(b.dataset.v, true); }));
    return { set, box };
  }
  /* چرخش خودکار بین حالت‌ها فقط وقتی نمودار دیده می‌شود و کاربر خودش چیزی را انتخاب نکرده */
  function cycler(states, apply, ms) {
    let i = 0, t = 0, vis = false, user = false;
    const tick = () => { clearTimeout(t); if (!vis || user || rm() || document.hidden) return; t = setTimeout(() => { i = (i + 1) % states.length; apply(states[i], false); tick(); }, ms); };
    return {
      show(v) { vis = v; if (v) tick(); else clearTimeout(t); },
      pick(s) { user = true; clearTimeout(t); i = Math.max(0, states.indexOf(s)); },
      at(s) { i = Math.max(0, states.indexOf(s)); },
      stop() { vis = false; clearTimeout(t); }
    };
  }

  const B = {};

  /* ==========================================================================
     ایمپلنت: جای خالی، ایمپلنت و بریج زیر لثه
     ========================================================================== */
  B['implant-vs-bridge'] = (fig) => {
    const cv = $('.ap-mg__cv', fig);
    const tooth = (x, cls) => `<g class="ivb-t ${cls}" style="transform-origin:${x + 65}px 330px">
        <path class="ivb-root" d="M${x + 22} 176 C ${x + 18} 240, ${x + 26} 300, ${x + 40} 330 C ${x + 50} 312, ${x + 56} 270, ${x + 65} 238 C ${x + 74} 270, ${x + 80} 312, ${x + 90} 330 C ${x + 104} 300, ${x + 112} 240, ${x + 108} 176 Z"/>
        <path class="ivb-crown" d="M${x + 8} 118 C ${x + 6} 96, ${x + 24} 84, ${x + 40} 92 C ${x + 52} 82, ${x + 78} 82, ${x + 90} 92 C ${x + 106} 84, ${x + 124} 96, ${x + 122} 118 L ${x + 116} 172 C ${x + 100} 184, ${x + 30} 184, ${x + 14} 172 Z"/>
        <path class="ivb-prep" d="M${x + 22} 124 C ${x + 22} 108, ${x + 40} 104, ${x + 65} 104 C ${x + 90} 104, ${x + 108} 108, ${x + 108} 124 L ${x + 104} 172 C ${x + 90} 180, ${x + 40} 180, ${x + 26} 172 Z"/>
      </g>`;
    put(cv, `<svg class="mg-ivb" viewBox="0 0 720 380" data-s="gap" role="img" aria-label="مقایسه‌ی جای خالی دندان، ایمپلنت و بریج">
      <defs>
        <linearGradient id="ivbBone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1E3C8"/><stop offset="1" stop-color="#E4CFA6"/></linearGradient>
        <linearGradient id="ivbTooth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEF1F6"/></linearGradient>
        <linearGradient id="ivbTi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8C98AB"/><stop offset=".5" stop-color="#D9DFE8"/><stop offset="1" stop-color="#7D889B"/></linearGradient>
        <pattern id="ivbDots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="#D8C197"/></pattern>
      </defs>
      <g class="ivb-up">
        <path class="ivb-gum-up" d="M60 0 H660 V34 C 600 46, 520 40, 460 44 C 400 48, 320 48, 260 44 C 200 40, 120 46, 60 34 Z"/>
        <path class="ivb-upt ivb-upt--l" d="M150 30 C 150 58, 170 72, 215 72 C 262 72, 282 58, 282 30 Z"/>
        <path class="ivb-upt ivb-upt--m" d="M296 30 C 296 58, 316 72, 360 72 C 404 72, 424 58, 424 30 Z"/>
        <path class="ivb-upt ivb-upt--r" d="M438 30 C 438 58, 458 72, 503 72 C 550 72, 570 58, 570 30 Z"/>
      </g>
      <rect class="ivb-bone" x="40" y="196" width="640" height="184" rx="18" fill="url(#ivbBone)"/>
      <rect x="40" y="196" width="640" height="184" rx="18" fill="url(#ivbDots)" opacity=".55"/>
      <path class="ivb-loss" d="M296 194 C 320 250, 400 250, 424 194 Z"/>
      <path class="ivb-loss ivb-loss--b" d="M300 194 C 326 226, 394 226, 420 194 Z"/>
      <path class="ivb-gum" d="M40 196 C 90 176, 150 176, 215 186 C 262 194, 290 190, 360 188 C 430 190, 458 194, 505 186 C 570 176, 630 176, 680 196 L 680 214 L 40 214 Z"/>
      ${tooth(150, 'ivb-t--l')}
      ${tooth(440, 'ivb-t--r')}
      <g class="ivb-imp">
        <g class="ivb-screw">
          <path d="M338 204 H382 L 378 318 C 372 332, 348 332, 342 318 Z" fill="url(#ivbTi)"/>
          ${[214, 230, 246, 262, 278, 294, 310].map((y) => `<path d="M${338 + (y - 204) * 0.035} ${y} L ${382 - (y - 204) * 0.035} ${y + 6}" class="ivb-thread"/>`).join('')}
        </g>
        <rect class="ivb-abut" x="348" y="170" width="24" height="36" rx="4" fill="url(#ivbTi)"/>
        <path class="ivb-cap" d="M300 118 C 298 96, 316 84, 332 92 C 344 82, 376 82, 388 92 C 404 84, 422 96, 420 118 L 414 172 C 398 184, 322 184, 306 172 Z"/>
        <g class="ivb-force"><path d="M360 232 v26"/><path d="M340 240 l20 24 20-24"/></g>
      </g>
      <g class="ivb-br">
        <path class="ivb-bridge" d="M152 118 C 150 92, 172 82, 196 90 C 214 80, 236 82, 262 92 C 290 84, 320 84, 360 94 C 400 84, 430 84, 458 92 C 484 82, 506 80, 524 90 C 548 82, 570 92, 568 118 L 562 172 C 540 186, 476 184, 440 176 C 420 184, 400 190, 360 190 C 320 190, 300 184, 280 176 C 244 184, 180 186, 158 172 Z"/>
        <path class="ivb-joint" d="M284 110 V 170 M436 110 V 170"/>
      </g>
      <g class="ivb-lbl" font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" font-size="15" font-weight="700" text-anchor="middle">
        <g class="ivb-l ivb-l--gap"><text class="ivb-m" x="360" y="292">استخوان آب می‌رود</text><text x="120" y="112">کج می‌شود</text><text x="600" y="112">کج می‌شود</text><text x="360" y="104">دندان مقابل پایین می‌آید</text></g>
        <g class="ivb-l ivb-l--imp"><text class="ivb-m" x="360" y="362">ایمپلنت تیتانیومی در استخوان</text><text x="600" y="112">دست نخورده</text><text x="120" y="112">دست نخورده</text></g>
        <g class="ivb-l ivb-l--br"><text x="215" y="240">پایه (تراش خورده)</text><text x="505" y="240">پایه (تراش خورده)</text><text class="ivb-m" x="360" y="292">تحلیل آرام زیر پل</text></g>
      </g>
    </svg>`);
    const svg = $('svg', cv);
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    const TXT = {
      gap: '<b>جای خالی رهاشده:</b> دندان‌های کناری به سمت فضای خالی کج می‌شوند، دندان مقابل پایین می‌آید و استخوان همان ناحیه کم‌کم آب می‌رود.',
      implant: '<b>ایمپلنت:</b> پایه‌ی تیتانیومی جای ریشه را می‌گیرد و روکش روی آن بسته می‌شود. دندان‌های کناری دست نمی‌خورند و فشار جویدن استخوان را زنده نگه می‌دارد.',
      bridge: '<b>بریج:</b> دو دندان کناری تراش می‌خورند و پلی سه‌تکه رویشان چسبانده می‌شود. سریع و بدون جراحی است، اما زیر دندان وسطی استخوان آرام‌آرام تحلیل می‌رود.'
    };
    const c = cycler(['gap', 'implant', 'bridge'], (s, user) => apply(s, user), 4600);
    const sg = seg(fig.querySelector('.ap-mg__cv'), [['gap', 'جای خالی'], ['implant', 'ایمپلنت'], ['bridge', 'بریج']], (s) => { c.pick(s); apply(s, true); });
    cv.appendChild(out);
    function apply(s) {
      svg.dataset.s = s; sg.set(s); out.innerHTML = TXT[s];
      if (s === 'implant') {
        play($('.ivb-screw', svg), [{ transform: 'translate(0, 90px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900 });
        play($('.ivb-abut', svg), [{ transform: 'translate(0, 30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 500 });
        play($('.ivb-cap', svg), [{ transform: 'translate(0, -70px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, delay: 750 });
      } else if (s === 'bridge') {
        play($('.ivb-br', svg), [{ transform: 'translate(0, -80px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1000, delay: 350 });
      }
    }
    out.innerHTML = TXT.gap;
    let first = true;
    return {
      show(v) {
        if (v && first) { first = false; apply('gap'); }
        c.show(v);
      },
      destroy() { c.stop(); }
    };
  };

  /* ==========================================================================
     ایمپلنت: زمان‌بندی درمان (هفته‌ها؛ زمان از راست به چپ جلو می‌رود)
     ========================================================================== */
  B['implant-timeline'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    /* پهن: نام ردیف کنار نوار؛ باریک: نام بالای نوار و متن‌ها درشت‌تر */
    const P = narrow
      ? { W: 740, H: 460, R: 700, L: 40, rows: [160, 352], fs: 28, fn: 34, bar: 24, dot: 16, end: 22, tickY: 444, nameDy: -64, ticks: [0, 8, 16] }
      : { W: 740, H: 310, R: 620, L: 60, rows: [96, 206], fs: 13, fn: 16, bar: 14, dot: 9, end: 13, tickY: 296, nameDy: 6, ticks: [0, 4, 8, 12, 16, 20] };
    const WK = 20, R = P.R, L = P.L, h = P.bar / 2;
    const x = (w) => R - (w / WK) * (R - L);
    const row = (y, name, color, segs, dots, visits) => `<g class="itl-row" style="--c:${color}">
        ${narrow ? `<text class="itl-name" x="${R}" y="${y + P.nameDy}" text-anchor="start">${name}<tspan class="itl-vis" dx="10">· ${visits}</tspan></text>`
                 : `<text class="itl-name" x="${R + 18}" y="${y + 2}" text-anchor="end">${name}</text><text class="itl-vis" x="${R + 18}" y="${y + 22}" text-anchor="end">${visits}</text>`}
        <rect class="itl-track" x="${L}" y="${y - h}" width="${R - L}" height="${P.bar}" rx="${h}"/>
        ${segs.map(([a, b, t, o]) => `<g class="itl-seg"><rect class="itl-bar${o ? ' itl-bar--soft' : ''}" x="${x(b)}" y="${y - h}" width="${x(a) - x(b)}" height="${P.bar}" rx="${h}" style="transform-origin:${x(a)}px ${y}px"/>${t ? `<text class="itl-t" x="${(x(a) + x(b)) / 2}" y="${y - h - P.fs * 0.7}" text-anchor="middle" font-size="${P.fs}">${t}</text>` : ''}</g>`).join('')}
        ${dots.map(([w, t, end]) => `<g class="itl-dot${end ? ' itl-dot--end' : ''}" style="transform-origin:${x(w)}px ${y}px"><circle cx="${x(w)}" cy="${y}" r="${end ? P.end : P.dot}"/>${end ? `<path d="M${x(w) - P.end * 0.4} ${y} l${P.end * 0.27} ${P.end * 0.27} ${P.end * 0.5} -${P.end * 0.54}" class="itl-ck"/>` : ''}${t ? (end
          ? `<text x="${x(w) - P.end - 10}" y="${y + P.fs * 0.36}" text-anchor="start" font-size="${P.fs}" class="itl-end">${t}</text>`
          : `<text x="${x(w)}" y="${y + h + P.fs * 1.5}" text-anchor="middle" font-size="${P.fs}">${t}</text>`) : ''}</g>`).join('')}
      </g>`;
    const ticks = P.ticks.map((w) => `<g class="itl-tick"><line x1="${x(w)}" x2="${x(w)}" y1="${P.rows[0] - (narrow ? 96 : 56)}" y2="${P.tickY - P.fs - 6}"/><text x="${x(w)}" y="${P.tickY}" text-anchor="middle" font-size="${P.fs * 0.92}">${w ? fa(w) + ' هفته' : 'شروع'}</text></g>`).join('');
    put(cv, `<svg class="mg-itl" viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="مقایسه‌ی زمان درمان ایمپلنت و بریج">
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl" font-size="${P.fs}">
        ${ticks}
        ${row(P.rows[0], 'ایمپلنت', '#1673D6', [[0, 1, ''], [1, 16, narrow ? 'جوش خوردن: ۳ تا ۶ ماه' : 'جوش خوردن با استخوان (۳ تا ۶ ماه)', 1], [16, 18, '']], [[1, 'جراحی'], [16, 'روکش'], [18, narrow ? '' : 'دندان نهایی', 1]], '۴ تا ۵ جلسه')}
        ${row(P.rows[1], 'بریج', '#0E8F6B', [[0, 1, ''], [1, 3, '', 1]], [[1, 'تراش و موقت'], [3, 'دندان نهایی در ۲ تا ۳ هفته', 1]], '۳ جلسه')}
        <g class="itl-head"><line x1="${R}" x2="${R}" y1="${P.rows[0] - (narrow ? 96 : 60)}" y2="${P.tickY - P.fs - 2}"/><circle cx="${R}" cy="${P.rows[0] - (narrow ? 96 : 60)}" r="${narrow ? 8 : 5}"/></g>
      </g>
    </svg>`);
    const svg = $('svg', cv);
    let done = false;
    const D = 2600, span = (px) => ((R - px) / (R - L)) * WK / 18 * D * 0.9;
    const run = () => {
      if (done) return; done = true;
      if (!anim()) return;
      play($('.itl-head', svg), [{ transform: 'translate(0, 0)' }, { transform: `translate(${x(18) - R}px, 0)` }], { duration: D * 0.9, easing: 'cubic-bezier(.45, 0, .25, 1)' });
      $$('.itl-seg', svg).forEach((g) => {
        const bar = $('.itl-bar', g), a = +bar.getAttribute('x') + +bar.getAttribute('width');
        const t0 = span(a), dur = span(+bar.getAttribute('x')) - t0;
        play(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: Math.max(260, dur), delay: t0, easing: 'linear' });
        play($('text', g), [{ opacity: 0, transform: 'translate(0, 6px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: t0 + 160 });
      });
      $$('.itl-dot', svg).forEach((d) => {
        const t0 = span(+$('circle', d).getAttribute('cx'));
        play(d, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 700, delay: t0, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
      });
    };
    return { show(v) { if (v) run(); } };
  };

  /* ==========================================================================
     ضدآفتاب: شاخص UV در طول روز (زمان از راست به چپ)، با فصل و ساعت انتخابی
     ========================================================================== */
  const UV_CAT = [[2, 'کم', '#3BAA5C', 'عینک آفتابی کافی است؛ اگر پوست حساس دارید ضدآفتاب هم بزنید.'],
    [5, 'متوسط', '#E5B800', 'ضدآفتاب SPF ۳۰ و کلاه؛ نزدیک ظهر سایه را انتخاب کنید.'],
    [7, 'زیاد', '#F08A24', 'ضدآفتاب SPF ۵۰، کلاه لبه‌دار و عینک؛ هر دو ساعت تمدید کنید.'],
    [10, 'خیلی زیاد', '#E0453A', 'تا می‌شود زیر سایه بمانید؛ SPF ۵۰، لباس پوشیده و تمدید مرتب.'],
    [99, 'شدید', '#8A3FC7', 'از آفتاب مستقیم دوری کنید؛ پوست در چند دقیقه می‌سوزد.']];
  const uvCat = (v) => UV_CAT.find((c) => v <= c[0] + 0.49);
  const hm = (t) => { const h = Math.floor(t), m = Math.round((t - h) * 60); return fa(`${String(m === 60 ? h + 1 : h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`); };
  B['uv-day'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const SEAS = { summer: { rise: 5.0, set: 19.4, peak: 9 }, mid: { rise: 6.0, set: 18.1, peak: 6 }, winter: { rise: 7.0, set: 17.0, peak: 2.5 } };
    const P = narrow ? { W: 740, H: 470, L: 40, R: 700, T: 40, B: 380, fs: 26, step: 3 } : { W: 740, H: 320, L: 50, R: 700, T: 30, B: 262, fs: 13, step: 2 };
    const T0 = 5, T1 = 20, VMAX = 11;
    const X = (t) => P.R - ((t - T0) / (T1 - T0)) * (P.R - P.L);
    const Y = (v) => P.B - (v / VMAX) * (P.B - P.T);
    const uv = (se, t) => (t <= se.rise || t >= se.set ? 0 : se.peak * Math.pow(Math.sin(Math.PI * (t - se.rise) / (se.set - se.rise)), 2.4));
    const path = (se, close) => { let d = ''; for (let i = 0; i <= 90; i++) { const t = T0 + (i / 90) * (T1 - T0); d += (i ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(uv(se, t)).toFixed(1); } return close ? d + `L${P.L} ${P.B} L${P.R} ${P.B} Z` : d; };
    const bands = [[0, 2, '#3BAA5C'], [2, 5, '#E5B800'], [5, 7, '#F08A24'], [7, 10, '#E0453A'], [10, 11, '#8A3FC7']].map(([a, b, c]) => `<rect x="${P.L}" y="${Y(b)}" width="${P.R - P.L}" height="${Y(a) - Y(b)}" fill="${c}" opacity=".07"/><text x="${P.L + 6}" y="${Y(b) + P.fs + 2}" text-anchor="end" font-size="${P.fs * 0.85}" fill="${c}" class="uv-bl">${fa(b === 11 ? '۱۱+' : b)}</text>`).join('');
    const hours = []; for (let t = 6; t <= 20; t += P.step) hours.push(`<text x="${X(t)}" y="${P.B + P.fs + 12}" text-anchor="middle" font-size="${P.fs}" class="uv-h">${fa(t)}</text><line x1="${X(t)}" x2="${X(t)}" y1="${P.B}" y2="${P.B + 6}" class="uv-tk"/>`);
    put(cv, `<svg class="mg-uv" viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="شاخص UV در ساعت‌های مختلف روز">
      <defs><linearGradient id="uvFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E0453A" stop-opacity=".42"/><stop offset=".5" stop-color="#F08A24" stop-opacity=".22"/><stop offset="1" stop-color="#E5B800" stop-opacity=".05"/></linearGradient></defs>
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        ${bands}
        <line x1="${P.L}" x2="${P.R}" y1="${P.B}" y2="${P.B}" class="uv-ax"/>
        ${hours.join('')}
        <path class="uv-area" d="${path(SEAS.summer, true)}" fill="url(#uvFill)"/>
        <path class="uv-line" d="${path(SEAS.summer)}"/>
        <g class="uv-mk"><line class="uv-mk__l" x1="0" x2="0" y1="${P.T - 6}" y2="${P.B}"/><circle class="uv-mk__d" cx="0" cy="0" r="${narrow ? 13 : 8}"/><g class="uv-mk__tag"><rect x="-58" y="-38" width="116" height="30" rx="15" transform="scale(${narrow ? 1.6 : 1})"/><text y="${narrow ? -30 : -18}" text-anchor="middle" font-size="${narrow ? 26 : 14}" class="uv-mk__v"></text></g></g>
        <text x="${P.R}" y="${P.B + P.fs * 2.6 + 14}" text-anchor="start" font-size="${P.fs * 0.9}" class="uv-h">ساعت</text>
      </g>
    </svg>`);
    const svg = $('svg', cv), area = $('.uv-area', svg), line = $('.uv-line', svg), mk = $('.uv-mk', svg), dot = $('.uv-mk__d', mk), tag = $('.uv-mk__tag', mk), val = $('.uv-mk__v', mk);
    const ctl = document.createElement('div'); ctl.className = 'mg-range';
    ctl.innerHTML = `<div class="mg-range__row"><span>ساعت <b class="uv-t"></b></span><span>شاخص UV <b class="uv-v"></b></span></div><input type="range" min="${T0 + 0.5}" max="${T1 - 0.5}" step="0.25" value="12" aria-label="انتخاب ساعت روز">`;
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    let se = SEAS.summer, cur = se, t = 12, morph = 0;
    const sg = seg(cv, [['summer', 'تابستان'], ['mid', 'بهار و پاییز'], ['winter', 'زمستان']], (k) => setSeason(k));
    cv.appendChild(ctl); cv.appendChild(out);
    const range = $('input', ctl), tOut = $('.uv-t', ctl), vOut = $('.uv-v', ctl);
    const paint = () => {
      const v = uv(cur, t), c = uvCat(v), x = X(t), y = Y(v);
      mk.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
      dot.setAttribute('cy', y.toFixed(1)); dot.style.fill = c[2];
      tag.setAttribute('transform', `translate(0 ${(y - (narrow ? 10 : 4)).toFixed(1)})`);
      val.textContent = `${fa(Math.round(v))} · ${c[1]}`;
      tOut.textContent = hm(t); vOut.textContent = `${fa(Math.round(v))} (${c[1]})`; vOut.style.color = c[2];
      out.innerHTML = v < 0.5 ? '<b>آفتاب نیست یا خیلی ضعیف است.</b> محافظت خاصی لازم نیست.' : `<b>${c[1]}:</b> ${c[3]}`;
    };
    const setSeason = (k) => {
      const from = cur, to = SEAS[k]; se = to; sg.set(k);
      cancelAnimationFrame(morph);
      if (!anim()) { cur = to; area.setAttribute('d', path(cur, true)); line.setAttribute('d', path(cur)); paint(); return; }
      const t0 = performance.now(), D = 650;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3);
        cur = { rise: from.rise + (to.rise - from.rise) * e, set: from.set + (to.set - from.set) * e, peak: from.peak + (to.peak - from.peak) * e };
        area.setAttribute('d', path(cur, true)); line.setAttribute('d', path(cur)); paint();
        if (p < 1) morph = requestAnimationFrame(step); else cur = to;
      };
      morph = requestAnimationFrame(step);
    };
    range.addEventListener('input', () => { t = +range.value; paint(); });
    paint();
    let first = true;
    return {
      show(v) {
        if (!v || !first) return; first = false;
        if (!anim()) return;
        const len = line.getTotalLength ? line.getTotalLength() : 1200;
        line.style.strokeDasharray = `${len}`;
        play(line, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1600, easing: 'cubic-bezier(.45, 0, .25, 1)', fill: 'none' }).onfinish = () => { line.style.strokeDasharray = ''; };
        play(area, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 700 });
        const a = 7, b = 12.25, t0 = performance.now(), D = 1800;
        const sweep = (now) => { const p = Math.min(1, (now - t0) / D), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; t = a + (b - a) * e; range.value = String(t); paint(); if (p < 1) requestAnimationFrame(sweep); };
        requestAnimationFrame(sweep);
      },
      destroy() { cancelAnimationFrame(morph); }
    };
  };

  /* ==========================================================================
     ضدآفتاب: مقدار زدن و محافظت واقعی (مدل تقریبی: SPF واقعی ≈ SPF به توان نسبت مقدار)
     ========================================================================== */
  B['spf-dose'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const RAYS = 16;
    const P = narrow ? { W: 740, H: 700, sx: 40, sw: 660, top: 330, skin: 600, fx: 370, fy: 20, fs: 28 } : { W: 740, H: 330, sx: 30, sw: 380, top: 30, skin: 250, fx: 560, fy: 26, fs: 15 };
    const rayX = (i) => P.sx + 20 + (i + 0.5) * ((P.sw - 40) / RAYS);
    const rays = Array.from({ length: RAYS }, (_, i) => `<g class="sd-ray" style="animation-delay:${((i * 7) % RAYS) * -0.11}s" transform="translate(${rayX(i).toFixed(1)} 0)"><path d="M0 ${P.top + 10} v ${narrow ? 44 : 30} m -6 -9 l 6 9 6 -9"/></g>`).join('');
    const fingers = (x, y, sc) => `<g transform="translate(${x} ${y}) scale(${sc})">
        <rect class="sd-fg" x="-70" y="0" width="62" height="220" rx="31"/><rect class="sd-fg" x="4" y="-14" width="62" height="234" rx="31"/>
        <rect class="sd-nail" x="-58" y="10" width="38" height="30" rx="14"/><rect class="sd-nail" x="16" y="-4" width="38" height="30" rx="14"/>
        <g class="sd-cream" style="transform-origin:0px 215px"><rect x="-54" y="40" width="30" height="175" rx="15"/><rect x="20" y="26" width="30" height="189" rx="15"/></g>
      </g>`;
    put(cv, `<svg class="mg-sd" viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="اثر مقدار ضدآفتاب بر محافظت واقعی">
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        <g class="sd-sun"><circle cx="${P.sx + P.sw / 2}" cy="${P.top - (narrow ? 10 : 6)}" r="${narrow ? 22 : 14}"/></g>
        <g class="sd-rays">${rays}</g>
        <rect class="sd-layer" x="${P.sx}" y="${P.skin - 26}" width="${P.sw}" height="18" rx="9" style="transform-origin:${P.sx + P.sw / 2}px ${P.skin - 8}px"/>
        <rect class="sd-skin" x="${P.sx}" y="${P.skin - 8}" width="${P.sw}" height="${narrow ? 70 : 60}" rx="14"/>
        <text class="sd-lb" x="${P.sx + P.sw - 10}" y="${P.skin + (narrow ? 40 : 30)}" text-anchor="start" font-size="${P.fs}">پوست</text>
        <text class="sd-lb sd-lb--c" x="${P.sx + P.sw - 10}" y="${P.skin - 36}" text-anchor="start" font-size="${P.fs * 0.9}">لایه‌ی ضدآفتاب</text>
        ${fingers(narrow ? 150 : 675, narrow ? 40 : 40, narrow ? 1.05 : 0.9)}
        <g class="sd-read" transform="translate(${narrow ? 700 : 590} ${narrow ? 60 : 84})">
          <text class="sd-k" x="0" y="0" text-anchor="start" font-size="${P.fs}">محافظت واقعی</text>
          <text class="sd-big" x="0" y="${narrow ? 66 : 44}" text-anchor="start" font-size="${narrow ? 64 : 36}"></text>
          <text class="sd-pc" x="0" y="${narrow ? 110 : 72}" text-anchor="start" font-size="${P.fs}"></text>
          <g transform="translate(0 ${narrow ? 136 : 88})"><rect class="sd-bar" x="${narrow ? -300 : -150}" y="0" width="${narrow ? 300 : 150}" height="${narrow ? 18 : 10}" rx="${narrow ? 9 : 5}"/><rect class="sd-bar__f" x="${narrow ? -300 : -150}" y="0" width="${narrow ? 300 : 150}" height="${narrow ? 18 : 10}" rx="${narrow ? 9 : 5}" style="transform-origin:0px 0px"/></g>
        </g>
      </g>
    </svg>`);
    const svg = $('svg', cv);
    const ctl = document.createElement('div'); ctl.className = 'mg-range';
    ctl.innerHTML = `<div class="mg-range__row"><span>مقداری که می‌زنید</span><b class="sd-amt"></b></div><input type="range" min="0.25" max="1" step="0.05" value="0.5" aria-label="مقدار ضدآفتاب نسبت به مقدار لازم">`;
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    let spf = 50, amt = 0.5;
    const sg = seg(cv, [['50', 'SPF ۵۰'], ['30', 'SPF ۳۰']], (v) => { spf = +v; paint(); });
    cv.appendChild(ctl); cv.appendChild(out);
    const range = $('input', ctl), aOut = $('.sd-amt', ctl);
    const rayEls = $$('.sd-ray', svg);
    const AMT = (a) => (a >= 0.97 ? 'دو بند انگشت کامل' : a >= 0.7 ? 'حدود سه‌چهارم' : a >= 0.45 ? 'حدود نصف' : a >= 0.33 ? 'حدود یک‌سوم' : 'حدود یک‌چهارم');
    const paint = () => {
      const eff = Math.pow(spf, amt), block = 1 - 1 / eff;
      const pass = Math.round(RAYS / eff);
      const idx = new Set(); for (let k = 0; k < pass; k++) idx.add(Math.round((k + 0.5) * RAYS / Math.max(1, pass) - 0.5));
      rayEls.forEach((r, i) => r.classList.toggle('is-pass', idx.has(i)));
      $('.sd-cream', svg).style.transform = `scaleY(${amt.toFixed(3)})`;
      $('.sd-layer', svg).style.transform = `scaleY(${(0.25 + amt * 0.75).toFixed(3)})`;
      $('.sd-bar__f', svg).style.transform = `scaleX(${block.toFixed(3)})`;
      $('.sd-big', svg).textContent = `SPF ~${fa(Math.round(eff))}`;
      $('.sd-pc', svg).textContent = `${fa(Math.round(block * 100))}٪ پرتو UVB گرفته می‌شود`;
      aOut.textContent = AMT(amt);
      out.innerHTML = amt >= 0.97
        ? `<b>مقدار کافی:</b> ضدآفتاب SPF ${fa(spf)} همان محافظتی را می‌دهد که روی بسته نوشته شده؛ حدود ${fa(Math.round(block * 100))} درصد پرتو UVB.`
        : `<b>${AMT(amt)} مقدار لازم:</b> ضدآفتاب SPF ${fa(spf)} عملاً مثل SPF حدود ${fa(Math.max(1, Math.round(eff)))} کار می‌کند و به‌جای ${fa(Math.round((1 - 1 / spf) * 100))} درصد، حدود ${fa(Math.round(block * 100))} درصد پرتو را می‌گیرد.`;
    };
    range.addEventListener('input', () => { amt = +range.value; paint(); });
    paint();
    return { show(v) { svg.classList.toggle('is-on', !!v); } };
  };

  /* ==========================================================================
     فشار خون: عدد شما در کدام دسته است؟ (دسته‌بندی انجمن قلب آمریکا)
     ========================================================================== */
  const BP_CAT = {
    n: ['طبیعی', '#2E9E5B', 'عالی است. سالی یک بار، یا هر وقت پزشک گفت، فشارتان را چک کنید.'],
    e: ['بالاتر از طبیعی', '#D9A400', 'هنوز فشار خون بالا حساب نمی‌شود، اما وقت اصلاح سبک زندگی است: نمک کمتر، تحرک بیشتر و کم کردن وزن.'],
    s1: ['فشار خون بالا، مرحله‌ی ۱', '#F08A24', 'اگر در روزهای مختلف تکرار شد، با پزشک مشورت کنید. معمولاً اول سبک زندگی اصلاح می‌شود و گاهی دارو هم لازم است.'],
    s2: ['فشار خون بالا، مرحله‌ی ۲', '#E0453A', 'با پزشک مشورت کنید؛ در این مرحله معمولاً علاوه بر سبک زندگی، دارو هم لازم است.'],
    c: ['بحران فشار خون', '#8E1B2E', 'پنج دقیقه استراحت کنید و دوباره اندازه بگیرید. اگر هنوز بالاست یا درد قفسه‌ی سینه، سردرد شدید، تاری دید یا ضعف دارید، فوراً با ۱۱۵ تماس بگیرید.']
  };
  const bpCat = (sy, di) => (sy > 180 || di > 120 ? 'c' : sy >= 140 || di >= 90 ? 's2' : sy >= 130 || di >= 80 ? 's1' : sy >= 120 ? 'e' : 'n');
  B['bp-check'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const P = narrow ? { W: 740, H: 600, L: 96, R: 710, T: 20, B: 520, fs: 26 } : { W: 740, H: 360, L: 70, R: 440, T: 20, B: 320, fs: 13 };
    const D0 = 50, D1 = 130, S0 = 90, S1 = 200;
    const X = (d) => P.L + ((Math.min(D1, Math.max(D0, d)) - D0) / (D1 - D0)) * (P.R - P.L);
    const Y = (sy) => P.B - ((Math.min(S1, Math.max(S0, sy)) - S0) / (S1 - S0)) * (P.B - P.T);
    const TINT = { n: '#DDF2E4', e: '#FBF1C6', s1: '#FDE3CB', s2: '#F9D3CF', c: '#F1CBD3' };
    const zone = (sy, di, k) => `<rect class="bp-z" data-z="${k}" x="${P.L}" y="${Y(sy)}" width="${X(di) - P.L}" height="${P.B - Y(sy)}" style="--t:${TINT[k]};--c:${BP_CAT[k][1]}"/>`;
    const tx = [60, 80, 90, 100, 120].map((d) => `<text x="${X(d)}" y="${P.B + P.fs + 10}" text-anchor="middle" font-size="${P.fs}" class="bp-ax">${fa(d)}</text>`).join('');
    const ty = [100, 120, 130, 140, 160, 180].map((v) => `<text x="${P.L - 10}" y="${Y(v) + P.fs * 0.35}" text-anchor="end" font-size="${P.fs}" class="bp-ax">${fa(v)}</text>`).join('');
    put(cv, `<svg class="mg-bp" viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="دسته‌بندی عدد فشار خون">
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="ltr">
        ${zone(S1, D1, 'c')}${zone(180, 120, 's2')}${zone(140, 90, 's1')}${zone(130, 80, 'e')}${zone(120, 80, 'n')}
        <rect x="${P.L}" y="${P.T}" width="${P.R - P.L}" height="${P.B - P.T}" fill="none" class="bp-frame"/>
        ${tx}${ty}
        <text x="${(P.L + P.R) / 2}" y="${P.B + P.fs * 2.6 + 8}" text-anchor="middle" font-size="${P.fs}" class="bp-axt" direction="rtl">عدد پایینی (دیاستولیک)</text>
        <text transform="translate(${P.L - P.fs * 3.2} ${(P.T + P.B) / 2}) rotate(-90)" text-anchor="middle" font-size="${P.fs}" class="bp-axt" direction="rtl">عدد بالایی (سیستولیک)</text>
        <g class="bp-dot"><circle r="${narrow ? 26 : 16}" class="bp-dot__h"/><circle r="${narrow ? 13 : 8}" class="bp-dot__c"/></g>
        ${narrow ? '' : `<g class="bp-read" direction="rtl"><text x="${P.W - 20}" y="80" text-anchor="start" font-size="15" class="bp-rk">عدد شما</text><text x="${P.W - 20}" y="136" text-anchor="start" font-size="46" class="bp-rv"></text><text x="${P.W - 20}" y="176" text-anchor="start" font-size="17" class="bp-rc"></text></g>`}
      </g>
    </svg>`);
    const svg = $('svg', cv), dot = $('.bp-dot', svg);
    const ctl = document.createElement('div'); ctl.className = 'mg-range';
    ctl.innerHTML = `<div class="mg-range__row"><span>عدد بالایی</span><b class="bp-sv"></b></div><input type="range" class="bp-s" min="90" max="200" step="1" value="128" aria-label="عدد بالایی فشار خون">
      <div class="mg-range__row"><span>عدد پایینی</span><b class="bp-dv"></b></div><input type="range" class="bp-d" min="50" max="130" step="1" value="82" aria-label="عدد پایینی فشار خون">`;
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    const PRE = [['115-75', '۱۱۵ / ۷۵'], ['125-78', '۱۲۵ / ۷۸'], ['134-86', '۱۳۴ / ۸۶'], ['152-96', '۱۵۲ / ۹۶'], ['186-122', '۱۸۶ / ۱۲۲']];
    let sy = 128, di = 82;
    const c = cycler(PRE.map((x) => x[0]), (k) => pick(k), 2600);
    const sg = seg(cv, PRE, (k) => { c.pick(k); pick(k); });
    cv.appendChild(ctl); cv.appendChild(out);
    const rs = $('.bp-s', ctl), rd = $('.bp-d', ctl);
    const paint = () => {
      const k = bpCat(sy, di), C = BP_CAT[k];
      dot.setAttribute('transform', `translate(${X(di).toFixed(1)} ${Y(sy).toFixed(1)})`);
      $('.bp-dot__c', svg).style.fill = C[1];
      $$('.bp-z', svg).forEach((z) => z.classList.toggle('is-on', z.dataset.z === k));
      $('.bp-sv', ctl).textContent = fa(sy); $('.bp-dv', ctl).textContent = fa(di);
      if (!narrow) { $('.bp-rv', svg).textContent = `${fa(sy)}/${fa(di)}`; const rc = $('.bp-rc', svg); rc.textContent = C[0]; rc.style.fill = C[1]; }
      out.innerHTML = `<b style="color:${C[1]}">${fa(sy)} روی ${fa(di)} · ${C[0]}:</b> ${C[2]}`;
    };
    function pick(k) { const [a, b] = k.split('-').map(Number); sy = a; di = b; rs.value = String(sy); rd.value = String(di); sg.set(k); paint(); }
    const user = () => { c.pick(''); sg.set(''); };
    rs.addEventListener('input', () => { user(); sy = +rs.value; paint(); });
    rd.addEventListener('input', () => { user(); di = +rd.value; paint(); });
    pick('115-75');
    return { show(v) { c.show(v); }, destroy() { c.stop(); } };
  };

  /* ==========================================================================
     فشار خون: اشتباه‌های وضعیت بدن و اثرشان روی عدد (میانگین‌های گزارش‌شده؛ عدد بالایی)
     ========================================================================== */
  B['bp-posture'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const M = [['arm', 'دست آویزان', 10, '#E0453A'], ['legs', 'پا روی پا', 5, '#F08A24'], ['back', 'پشت بدون تکیه', 6, '#D9A400'], ['cloth', 'کاف روی آستین', 10, '#8A3FC7'], ['talk', 'حرف زدن', 12, '#1673D6'], ['bladder', 'مثانه‌ی پر', 12, '#0E8F6B']];
    const person = `<g class="bpp">
        <line x1="360" y1="330" x2="720" y2="330" class="bpp-floor"/>
        <rect x="378" y="196" width="176" height="12" rx="6" class="bpp-table"/><line x1="396" y1="208" x2="396" y2="330" class="bpp-tleg"/><line x1="536" y1="208" x2="536" y2="330" class="bpp-tleg"/>
        <rect x="650" y="112" width="16" height="140" rx="8" class="bpp-chair"/><rect x="548" y="244" width="118" height="14" rx="7" class="bpp-chair"/><line x1="560" y1="258" x2="560" y2="330" class="bpp-cleg"/><line x1="656" y1="258" x2="656" y2="330" class="bpp-cleg"/>
        <g class="bpp-leg2"><path d="M606 246 L 522 226 L 474 286" class="bpp-pant"/><path d="M474 286 l -26 4" class="bpp-shoe"/></g>
        <path d="M612 246 L 528 250 L 528 322" class="bpp-pant"/><path d="M528 322 h -30" class="bpp-shoe"/>
        <g class="bpp-up" style="transform-origin:612px 246px">
          <rect x="590" y="124" width="52" height="124" rx="24" class="bpp-shirt"/>
          <circle cx="616" cy="92" r="27" class="bpp-skin"/>
          <path d="M604 84 q 12 -14 26 0" class="bpp-hair"/>
          <g class="bpp-talk"><path d="M560 44 h 44 a 12 12 0 0 1 12 12 v 14 a 12 12 0 0 1 -12 12 h -30 l -10 10 v -10 h -4 a 12 12 0 0 1 -12 -12 v -14 a 12 12 0 0 1 12 -12 z" class="bpp-bub"/><circle cx="570" cy="63" r="3"/><circle cx="582" cy="63" r="3"/><circle cx="594" cy="63" r="3"/></g>
          <g class="bpp-bl"><path d="M600 214 c 0 -10 10 -20 10 -20 s 10 10 10 20 a 10 10 0 0 1 -20 0 z"/></g>
          <path d="M604 142 L 596 196" class="bpp-arm"/>
          <path d="M604 142 L 596 196" class="bpp-sleeve"/>
          <rect x="587" y="150" width="24" height="30" rx="6" class="bpp-cuff" transform="rotate(8 599 165)"/>
          <g class="bpp-fore" style="transform-origin:596px 198px"><path d="M596 198 L 516 196" class="bpp-arm"/><circle cx="508" cy="196" r="9" class="bpp-skin"/></g>
        </g>
      </g>`;
    const P = narrow ? { W: 740, H: 890, fy: 0, rx: 700, ry: 610, fs: 28, bw: 640 } : { W: 740, H: 350, fy: 0, rx: 340, ry: 80, fs: 15, bw: 300 };
    put(cv, `<svg class="mg-bpp" viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="اثر اشتباه‌های وضعیت بدن بر عدد فشار خون">
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        <g transform="${narrow ? 'translate(-650 -50) scale(1.9)' : ''}">${person}</g>
        <g class="bpp-read" transform="translate(${P.rx} ${P.ry})">
          <text x="0" y="0" text-anchor="start" font-size="${P.fs}" class="bpp-k">فشار واقعی شما ۱۲۰ است؛ دستگاه نشان می‌دهد:</text>
          <text x="0" y="${P.fs * 3.6}" text-anchor="start" font-size="${P.fs * 3.4}" class="bpp-big">۱۲۰</text>
          <text x="0" y="${P.fs * 5.4}" text-anchor="start" font-size="${P.fs * 1.1}" class="bpp-add"></text>
          <g transform="translate(0 ${P.fs * 6.6})"><rect x="${-P.bw}" y="0" width="${P.bw}" height="${P.fs * 1.1}" rx="${P.fs * 0.55}" class="bpp-track"/><g class="bpp-segs"></g></g>
        </g>
      </g>
    </svg>`);
    const svg = $('svg', cv);
    const box = document.createElement('div'); box.className = 'mg-chips';
    box.innerHTML = M.map(([k, t, v, col]) => `<button type="button" data-k="${k}" aria-pressed="false" style="--c:${col}"><i></i>${t}<small>+${fa(v)}</small></button>`).join('') + '<button type="button" class="mg-chips__reset" data-k="reset">همه را درست کن</button>';
    const out = document.createElement('p'); out.className = 'mg-out dc-out'; out.setAttribute('aria-live', 'polite');
    cv.appendChild(box); cv.appendChild(out);
    const on = new Set();
    const segsG = $('.bpp-segs', svg);
    const paint = () => {
      M.forEach(([k]) => svg.classList.toggle('m-' + k, on.has(k)));
      $$('button[data-k]', box).forEach((b) => { if (b.dataset.k !== 'reset') b.setAttribute('aria-pressed', String(on.has(b.dataset.k))); });
      const add = M.filter(([k]) => on.has(k)).reduce((s2, m) => s2 + m[2], 0);
      $('.bpp-big', svg).textContent = fa(120 + add);
      $('.bpp-big', svg).classList.toggle('is-up', add > 0);
      $('.bpp-add', svg).textContent = add ? `+${fa(add)} فقط به‌خاطر اشتباه‌ها` : 'همه‌چیز درست است';
      let x = 0; const unit = P.bw / 60;
      segsG.innerHTML = M.filter(([k]) => on.has(k)).map(([k, t, v, col]) => { const w = v * unit; const r = `<rect x="${-(x + w)}" y="0" width="${w - 2}" height="${P.fs * 1.1}" rx="${P.fs * 0.3}" fill="${col}"/>`; x += w; return r; }).join('');
      const cat = BP_CAT[bpCat(120 + add, 76)];
      out.innerHTML = add ? `<b>عدد دستگاه: ${fa(120 + add)} (${cat[0]})</b> در حالی که فشار واقعی‌تان طبیعی است. ${on.size > 2 ? 'چند اشتباه کوچک با هم، یک فشار طبیعی را «بالا» نشان می‌دهند.' : 'اشتباه‌ها را یکی‌یکی امتحان کنید.'}` : '<b>وضعیت درست:</b> پشت تکیه داده، پاها صاف روی زمین، دست روی میز هم‌سطح قلب، کاف روی بازوی برهنه، بدون حرف زدن و با مثانه‌ی خالی.';
    };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-k]'); if (!b) return;
      stopDemo();
      if (b.dataset.k === 'reset') on.clear(); else if (on.has(b.dataset.k)) on.delete(b.dataset.k); else on.add(b.dataset.k);
      paint();
    });
    paint();
    let demo = 0, played = false;
    const stopDemo = () => { clearTimeout(demo); demo = 0; };
    const runDemo = (i = 0) => { if (i >= M.length) return; demo = setTimeout(() => { on.add(M[i][0]); paint(); runDemo(i + 1); }, i ? 900 : 600); };
    return {
      show(v) { if (v && !played && anim()) { played = true; runDemo(); } if (!v) stopDemo(); },
      destroy() { stopDemo(); }
    };
  };

  /* ==========================================================================
     حساسیت دندان: برش دندان، لوله‌های عاج و اثر خمیردندان ضدحساسیت
     ========================================================================== */
  B['tooth-tubules'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const tub = [150, 158, 166, 174, 182, 190];
    const tooth = `
      <rect x="-150" y="214" width="300" height="130" rx="18" class="tt-bone"/>
      <path class="tt-dentin" d="M-100 60 C -100 0, -60 -10, 0 -10 C 60 -10, 100 0, 100 60 L 92 130 C 88 150, 84 160, 82 172 C 72 232, 44 300, 10 322 C 5 325, -5 325, -10 322 C -44 300, -72 232, -82 172 C -84 160, -88 150, -92 130 Z"/>
      <path class="tt-enamel" d="M-100 60 C -100 0, -60 -10, 0 -10 C 60 -10, 100 0, 100 60 L 92 130 C 91 136, 90 140, 88 142 C 80 128, 80 110, 78 64 C 78 22, 44 12, 0 12 C -44 12, -78 22, -78 64 C -80 110, -80 128, -88 142 C -90 140, -91 136, -92 130 Z"/>
      <path class="tt-pulp" d="M-24 72 C -24 40, 24 40, 24 72 L 18 150 C 13 220, 7 282, 2 302 L -2 302 C -7 282, -13 220, -18 150 Z"/>
      <g class="tt-flash"><circle cx="0" cy="170" r="30"/><path d="M4 146 L -8 172 L 2 172 L -4 196 L 12 166 L 2 166 Z"/></g>
      ${tub.map((y) => `<path class="tt-tub" d="M${86 - (y - 150) * 0.1} ${y} C 60 ${y - 2}, 40 ${y - 1}, 18 ${y + 4}"/>`).join('')}
      ${tub.map((y, i) => `<circle class="tt-fl" cx="${84 - (y - 150) * 0.1}" cy="${y}" r="2.6" style="animation-delay:${-i * 0.23}s"/>`).join('')}
      ${tub.map((y) => `<circle class="tt-plug" cx="${86 - (y - 150) * 0.1}" cy="${y}" r="4.2"/>`).join('')}
      <path class="tt-gum" d="M-150 150 C -124 130, -104 128, -92 140 L -82 214 L -150 214 Z"/>
      <path class="tt-gum" d="M150 214 L 80 214 L 78 198 C 92 192, 122 196, 150 206 Z"/>
      <g class="tt-ice"><rect x="112" y="136" width="44" height="44" rx="10"/><path d="M134 146 v 24 M123 152 l 22 12 M123 164 l 22 -12"/></g>
      <g class="tt-cold"><path d="M108 158 h -12 M108 170 h -14 M108 182 h -10"/></g>
      <g class="tt-lbl">
        <text x="-112" y="40" text-anchor="start">مینا</text><path d="M-106 36 L -92 40"/>
        <text x="-112" y="106" text-anchor="start">عاج</text><path d="M-106 102 L -64 110"/>
        <text x="-112" y="252" text-anchor="start">عصب</text><path d="M-106 248 L -8 236"/>
        <text x="152" y="232" text-anchor="end">لثه‌ی عقب‌رفته</text>
      </g>`;
    const P = narrow ? { W: 740, H: 860, tx: 400, ty: 60, sc: 1.55, mx: 700, my: 640, fs: 28, bw: 520 } : { W: 740, H: 380, tx: 540, ty: 36, sc: 1, mx: 360, my: 120, fs: 15, bw: 280 };
    put(cv, `<svg class="mg-tt" viewBox="0 0 ${P.W} ${P.H}" data-s="raw" role="img" aria-label="برش دندان و مسیر رسیدن سرما به عصب">
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        <g transform="translate(${P.tx} ${P.ty}) scale(${P.sc})" font-size="${narrow ? 19 : 14}">${tooth}</g>
        <g transform="translate(${P.mx} ${P.my})">
          <text x="0" y="0" text-anchor="start" font-size="${P.fs}" class="tt-k">شدت تیر کشیدن با آب سرد</text>
          <g transform="translate(0 ${P.fs * 1.2})"><rect x="${-P.bw}" y="0" width="${P.bw}" height="${P.fs * 1.1}" rx="${P.fs * 0.55}" class="tt-track"/><rect x="${-P.bw}" y="0" width="${P.bw}" height="${P.fs * 1.1}" rx="${P.fs * 0.55}" class="tt-pain" style="transform-origin:0px 0px"/></g>
          <text x="0" y="${P.fs * 4.2}" text-anchor="start" font-size="${P.fs * 1.9}" class="tt-big"></text>
        </g>
      </g>
    </svg>`);
    const svg = $('svg', cv);
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    const TXT = {
      raw: ['<b>بدون محافظت:</b> دهانه‌ی لوله‌های ریز عاج باز است؛ سرما مایع داخلشان را جابه‌جا می‌کند و عصب تحریک می‌شود.', 'تیز و شدید'],
      paste: ['<b>با خمیردندان ضدحساسیت (بعد از چند هفته):</b> دهانه‌ی لوله‌ها بسته شده و عصب آرام‌تر است؛ همان سرما حالا تیر نمی‌کشد.', 'خفیف']
    };
    const apply = (st) => { svg.dataset.s = st; sg.set(st); out.innerHTML = TXT[st][0]; $('.tt-big', svg).textContent = TXT[st][1]; };
    const c = cycler(['raw', 'paste'], (st) => apply(st), 4200);
    const sg = seg(cv, [['raw', 'بدون محافظت'], ['paste', 'با خمیردندان ضدحساسیت']], (st) => { c.pick(st); apply(st); });
    cv.appendChild(out);
    apply('raw');
    return { show(v) { svg.classList.toggle('is-on', !!v); c.show(v); }, destroy() { c.stop(); } };
  };

  /* ==========================================================================
     حساسیت دندان: اسیدی ماندن دهان بعد از نوشیدنی‌ها (منحنی تقریبی؛ زمان از راست به چپ)
     ========================================================================== */
  B['acid-clock'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const DR = {
      water: ['آب', [[0, 7], [60, 7]]],
      tea: ['چای بدون قند', [[0, 7], [2, 6.5], [8, 6.7], [15, 6.95], [60, 7]]],
      soda: ['نوشابه', [[0, 7], [2, 4.2], [8, 4.8], [15, 5.3], [22, 5.8], [35, 6.5], [50, 6.9], [60, 7]]],
      lemon: ['آب‌لیمو و ترشی', [[0, 7], [2, 3.6], [10, 4.4], [20, 5.1], [30, 5.6], [45, 6.4], [60, 6.9]]]
    };
    const P = narrow ? { W: 740, H: 480, L: 90, R: 710, T: 30, B: 390, fs: 26 } : { W: 740, H: 320, L: 60, R: 700, T: 24, B: 262, fs: 13 };
    const X = (m) => P.R - (m / 60) * (P.R - P.L), Y = (ph) => P.B - ((ph - 3) / 4.5) * (P.B - P.T);
    const at = (pts, m) => { for (let i = 1; i < pts.length; i++) { if (m <= pts[i][0]) { const [a, pa] = pts[i - 1], [b, pb] = pts[i]; const t = (m - a) / (b - a), e = t * t * (3 - 2 * t); return pa + (pb - pa) * e; } } return pts[pts.length - 1][1]; };
    const sample = (pts) => Array.from({ length: 121 }, (_, i) => at(pts, i / 2));
    const line = (v) => v.map((ph, i) => `${i ? 'L' : 'M'}${X(i / 2).toFixed(1)} ${Y(ph).toFixed(1)}`).join('');
    const low = (v) => { let d = ''; v.forEach((ph, i) => { d += `${i ? 'L' : 'M'}${X(i / 2).toFixed(1)} ${Y(Math.min(ph, 5.5)).toFixed(1)}`; }); return d + `L${P.L} ${Y(5.5)} L${P.R} ${Y(5.5)} Z`; };
    const under = (v) => v.filter((ph) => ph < 5.5).length / 2;
    const ticks = [0, 10, 20, 30, 40, 50, 60].filter((m, i) => !narrow || i % 2 === 0).map((m) => `<text x="${X(m)}" y="${P.B + P.fs + 10}" text-anchor="middle" font-size="${P.fs}" class="ac-ax">${m ? fa(m) + ' دقیقه' : 'همان لحظه'}</text>`).join('');
    const yt = [4, 5, 6, 7].map((ph) => `<text x="${P.L - 10}" y="${Y(ph) + P.fs * 0.35}" text-anchor="start" font-size="${P.fs}" class="ac-ax">${fa(ph)}</text><line x1="${P.L}" x2="${P.R}" y1="${Y(ph)}" y2="${Y(ph)}" class="ac-grid"/>`).join('');
    put(cv, `<svg class="mg-ac" viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="اسیدیته‌ی دهان پس از نوشیدنی‌های مختلف">
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        ${yt}
        <path class="ac-low"/>
        <line x1="${P.L}" x2="${P.R}" y1="${Y(5.5)}" y2="${Y(5.5)}" class="ac-crit"/>
        <text x="${P.L + 6}" y="${Y(5.5) - 8}" text-anchor="end" font-size="${P.fs}" class="ac-critl">مرز نرم شدن مینا</text>
        <path class="ac-line"/>
        <g class="ac-brush"><line y1="${P.T}" y2="${P.B}" class="ac-bl"/><text y="${P.T + P.fs}" text-anchor="end" font-size="${P.fs}" class="ac-bt">از این‌جا مسواک بزنید</text></g>
        ${ticks}
        <text x="${P.R + 6}" y="${P.T - 8 + (narrow ? 6 : 0)}" text-anchor="start" font-size="${P.fs * 0.9}" class="ac-ax">اسیدیته (pH)</text>
      </g>
    </svg>`);
    const svg = $('svg', cv), pl = $('.ac-line', svg), pw = $('.ac-low', svg), br = $('.ac-brush', svg);
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    let cur = sample(DR.water[1]), raf = 0;
    const draw = (v, k) => {
      pl.setAttribute('d', line(v)); pw.setAttribute('d', low(v));
      const u = under(v);
      const wait = u ? Math.min(60, Math.max(30, Math.ceil(u / 5) * 5 + 10)) : 0;
      br.style.opacity = u ? '1' : '0';
      br.setAttribute('transform', `translate(${X(wait || 30).toFixed(1)} 0)`);
      if (k) out.innerHTML = u ? `<b>${DR[k][0]}:</b> حدود ${fa(Math.round(u))} دقیقه دهان از مرز نرم شدن مینا اسیدی‌تر است. برای مسواک زدن دست‌کم ${fa(wait)} دقیقه صبر کنید و در این فاصله دهان را با آب بشویید.` : `<b>${DR[k][0]}:</b> اسیدیته‌ی دهان تقریباً تغییری نمی‌کند و به مینا آسیبی نمی‌رسد.`;
    };
    const go = (k) => {
      sg.set(k);
      const from = cur.slice(), to = sample(DR[k][1]);
      cancelAnimationFrame(raf);
      if (!anim()) { cur = to; draw(cur, k); return; }
      const t0 = performance.now(), D = 700;
      const step = (now) => { const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3); cur = from.map((a, i) => a + (to[i] - a) * e); draw(cur, k); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    const c = cycler(['soda', 'lemon', 'tea', 'water'], (k) => go(k), 3800);
    const sg = seg(cv, Object.entries(DR).map(([k, v]) => [k, v[0]]), (k) => { c.pick(k); go(k); });
    cv.appendChild(out);
    draw(cur, 'water');
    let first = true;
    return { show(v) { if (v && first) { first = false; c.at('soda'); go('soda'); } c.show(v); }, destroy() { c.stop(); cancelAnimationFrame(raf); } };
  };

  /* ==========================================================================
     نمودار منحنی عمومی با لغزنده (زمان از راست به چپ): برای مدت اثر و بهبود
     o: { x1, f(x)→۰..۱, ticks:[x], tick(x)→متن, phases:[[x0,x1,متن]], marks:[[x,متن]], band:[x0,x1,متن], unit, color, out(x,y)→html, x0 }
     ========================================================================== */
  function curve(fig, narrow, o) {
    const cv = $('.ap-mg__cv', fig);
    const P = narrow ? { W: 740, H: 470, L: 40, R: 700, T: 70, B: 380, fs: 26 } : { W: 740, H: 320, L: 30, R: 710, T: 52, B: 262, fs: 13 };
    const X = (x) => P.R - (x / o.x1) * (P.R - P.L), Y = (y) => P.B - y * (P.B - P.T);
    const N = 160, pts = Array.from({ length: N + 1 }, (_, i) => { const x = (i / N) * o.x1; return [X(x), Y(o.f(x))]; });
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    const area = line + `L${P.L} ${P.B} L${P.R} ${P.B} Z`;
    const ticks = o.ticks.filter((x, i) => !narrow || i % 2 === 0).map((x) => `<line x1="${X(x)}" x2="${X(x)}" y1="${P.B}" y2="${P.B + 6}" class="cu-tk"/><text x="${X(x)}" y="${P.B + P.fs + 12}" text-anchor="middle" font-size="${P.fs}" class="cu-ax">${o.tick(x)}</text>`).join('');
    const band = o.band ? `<rect x="${X(o.band[1])}" y="${P.T - 30}" width="${X(o.band[0]) - X(o.band[1])}" height="${P.B - P.T + 30}" class="cu-band"/><text x="${(X(o.band[0]) + X(o.band[1])) / 2}" y="${P.T - 38}" text-anchor="middle" font-size="${P.fs}" class="cu-bandt">${o.band[2]}</text>` : '';
    const marks = (o.marks || []).map(([x, t]) => `<g class="cu-mark"><line x1="${X(x)}" x2="${X(x)}" y1="${Y(o.f(x))}" y2="${P.B}" class="cu-ml"/><circle cx="${X(x)}" cy="${Y(o.f(x))}" r="${narrow ? 10 : 6}" class="cu-md"/><text x="${X(x)}" y="${Y(o.f(x)) - (narrow ? 22 : 14)}" text-anchor="middle" font-size="${P.fs}" class="cu-mt">${t}</text></g>`).join('');
    put(cv, `<svg class="mg-cu" viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="${o.label || ''}" style="--c:${o.color}">
      <defs><linearGradient id="cuG-${fig.dataset.mg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.color}" stop-opacity=".34"/><stop offset="1" stop-color="${o.color}" stop-opacity=".03"/></linearGradient></defs>
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        ${band}
        <line x1="${P.L}" x2="${P.R}" y1="${P.B}" y2="${P.B}" class="cu-base"/>
        ${ticks}
        <path d="${area}" fill="url(#cuG-${fig.dataset.mg})" class="cu-area"/>
        <path d="${line}" class="cu-line"/>
        ${marks}
        <g class="cu-mk"><line class="cu-mkl" x1="0" x2="0" y1="${P.T - 6}" y2="${P.B}"/><circle class="cu-mkd" r="${narrow ? 13 : 8}"/></g>
      </g>
    </svg>`);
    const svg = $('svg', cv), ln = $('.cu-line', svg), ar = $('.cu-area', svg), mk = $('.cu-mk', svg), md = $('.cu-mkd', mk);
    const ctl = document.createElement('div'); ctl.className = 'mg-range';
    ctl.innerHTML = `<div class="mg-range__row"><span>${o.slider}</span><b class="cu-v"></b></div><input type="range" min="0" max="${o.x1}" step="${o.step || 1}" value="${o.x0 || 0}" aria-label="${o.slider}">`;
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    cv.appendChild(ctl); cv.appendChild(out);
    const range = $('input', ctl), vb = $('.cu-v', ctl);
    let x = o.x0 || 0;
    const paint = () => {
      const y = o.f(x);
      mk.setAttribute('transform', `translate(${X(x).toFixed(1)} 0)`); md.setAttribute('cy', Y(y).toFixed(1));
      vb.textContent = o.val(x, y);
      const ph = (o.phases || []).find(([a, b]) => x >= a && x <= b);
      out.innerHTML = o.out(x, y, ph ? ph[2] : '');
    };
    range.addEventListener('input', () => { x = +range.value; paint(); });
    paint();
    let first = true;
    return {
      show(v) {
        if (!v || !first) return; first = false;
        if (!anim()) return;
        const len = ln.getTotalLength ? ln.getTotalLength() : 1400;
        ln.style.strokeDasharray = `${len}`;
        play(ln, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1700, easing: 'cubic-bezier(.45, 0, .25, 1)', fill: 'none' }).onfinish = () => { ln.style.strokeDasharray = ''; };
        play(ar, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 800 });
        $$('.cu-mark, .cu-band, .cu-bandt', svg).forEach((m, i) => play(m, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 1200 + i * 150 }));
        if (o.sweep) {
          const a = 0, b = o.sweep, t0 = performance.now(), D = 2000;
          const step = (now) => { const p = Math.min(1, (now - t0) / D), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; x = a + (b - a) * e; range.value = String(x); paint(); if (p < 1) requestAnimationFrame(step); };
          requestAnimationFrame(step);
        }
      }
    };
  }
  const sm = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

  /* ==========================================================================
     بوتاکس: سه ناحیه‌ی رایج؛ قبل (هنگام اخم و خنده) و دو هفته بعد
     ========================================================================== */
  B['botox-face'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const Z = {
      fh: ['پیشانی', 'خطوط افقی پیشانی که با بالا بردن ابرو عمیق می‌شوند. اثر معمولاً سه تا چهار ماه می‌ماند. مقدار باید دقیق باشد تا ابروها سنگین نشوند.'],
      gl: ['بین ابروها', 'خطوط عمودی اخم («یازده»)؛ رایج‌ترین ناحیه‌ی تزریق و معمولاً با بهترین و ماندگارترین نتیجه.'],
      cf: ['دور چشم', 'چین‌های کنار چشم که موقع خندیدن پیدا می‌شوند. اثر در این ناحیه گاهی کمی کوتاه‌تر است؛ لبخند طبیعی می‌ماند.']
    };
    const face = `
      <path class="bf-hair" d="M-126 -60 C -120 -150, 120 -150, 126 -60 C 110 -104, 60 -118, 0 -118 C -60 -118, -110 -104, -126 -60 Z"/>
      <path class="bf-face" d="M0 -120 C 84 -120, 124 -48, 120 30 C 116 112, 64 180, 0 184 C -64 180, -116 112, -120 30 C -124 -48, -84 -120, 0 -120 Z"/>
      <ellipse class="bf-z" data-z="fh" cx="0" cy="-58" rx="86" ry="34"/>
      <ellipse class="bf-z" data-z="gl" cx="0" cy="-14" rx="20" ry="24"/>
      <ellipse class="bf-z" data-z="cf" cx="-94" cy="18" rx="22" ry="24"/><ellipse class="bf-z" data-z="cf" cx="94" cy="18" rx="22" ry="24"/>
      <g class="bf-l" data-z="fh"><path d="M-62 -76 q 31 -8 62 0 t 62 0"/><path d="M-66 -60 q 33 -8 66 0 t 66 0"/><path d="M-58 -44 q 29 -7 58 0 t 58 0"/></g>
      <g class="bf-l" data-z="gl"><path d="M-7 -32 q -3 14 0 30"/><path d="M7 -32 q 3 14 0 30"/></g>
      <g class="bf-l" data-z="cf"><path d="M-80 10 l -22 -8"/><path d="M-80 18 l -24 2"/><path d="M-80 26 l -20 10"/><path d="M80 10 l 22 -8"/><path d="M80 18 l 24 2"/><path d="M80 26 l 20 10"/></g>
      <g class="bf-brow bf-brow--r"><path d="M-78 -20 q 26 -16 58 -6"/></g><g class="bf-brow bf-brow--l"><path d="M78 -20 q -26 -16 -58 -6"/></g>
      <g class="bf-eye bf-eye--r"><path d="M-74 16 q 22 -16 44 0 q -22 14 -44 0 z"/><circle cx="-52" cy="16" r="6"/></g>
      <g class="bf-eye bf-eye--l"><path d="M74 16 q -22 -16 -44 0 q 22 14 44 0 z"/><circle cx="52" cy="16" r="6"/></g>
      <path class="bf-nose" d="M-2 0 C -6 34, -16 56, -12 66 C -6 72, 6 72, 12 66"/>
      <path class="bf-lips" d="M-34 108 C -16 98, -6 102, 0 104 C 6 102, 16 98, 34 108 C 16 124, -16 124, -34 108 Z"/>`;
    const P = narrow ? { W: 740, H: 560, fx: 370, fy: 290, sc: 1.55 } : { W: 740, H: 400, fx: 370, fy: 216, sc: 1.08 };
    put(cv, `<svg class="mg-bf" viewBox="0 0 ${P.W} ${P.H}" data-z="fh" data-s="before" role="img" aria-label="ناحیه‌های تزریق بوتاکس روی صورت"><g transform="translate(${P.fx} ${P.fy}) scale(${P.sc})">${face}</g></svg>`);
    const svg = $('svg', cv);
    const row = document.createElement('div'); row.className = 'mg-row';
    cv.appendChild(row);
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    let z = 'fh', st = 'before';
    const paint = () => { svg.dataset.z = z; svg.dataset.s = st; sz.set(z); ss.set(st); out.innerHTML = `<b>${Z[z][0]}${st === 'after' ? '، دو هفته بعد از بوتاکس' : '، هنگام حرکت'}:</b> ${st === 'after' ? 'عضله آرام‌تر است و چین‌ها نرم شده‌اند؛ حالت صورت همچنان طبیعی است. ' : ''}${Z[z][1]}`; };
    const SEQ = ['fh-before', 'fh-after', 'gl-before', 'gl-after', 'cf-before', 'cf-after'];
    const c = cycler(SEQ, (k) => { [z, st] = k.split('-'); paint(); }, 3200);
    const sz = seg(row, [['fh', 'پیشانی'], ['gl', 'بین ابروها'], ['cf', 'دور چشم']], (v) => { c.pick(`${v}-${st}`); z = v; paint(); });
    const ss = seg(row, [['before', 'قبل'], ['after', 'دو هفته بعد']], (v) => { c.pick(`${z}-${v}`); st = v; paint(); });
    cv.appendChild(out);
    paint();
    return { show(v) { svg.classList.toggle('is-on', !!v); c.show(v); }, destroy() { c.stop(); } };
  };

  B['botox-timeline'] = (fig, narrow) => curve(fig, narrow, {
    label: 'منحنی اثر بوتاکس در طول زمان', color: '#C2386B', x1: 150, x0: 0, sweep: 14,
    f: (d) => sm((d - 1) / 13) * (1 - sm((d - 90) / 60)),
    ticks: [0, 14, 30, 60, 90, 120, 150], tick: (d) => (d ? (d < 30 ? `روز ${fa(d)}` : `ماه ${fa(Math.round(d / 30))}`) : 'تزریق'),
    marks: [[14, 'جلسه‌ی کنترل']], band: [100, 125, 'زمان معمول تزریق بعدی'],
    phases: [[0, 1.99, 'هنوز اثری دیده نمی‌شود؛ طبیعی است.'], [2, 4.99, 'اثر کم‌کم شروع شده؛ اخم کردن کمی سخت‌تر است.'], [5, 13.99, 'نتیجه در حال کامل شدن است؛ برای قضاوت نهایی صبر کنید.'], [14, 89.99, 'اوج اثر؛ چین‌ها نرم و صورت آرام است.'], [90, 150, 'حرکت عضله کم‌کم برمی‌گردد؛ زمان برنامه‌ریزی برای تزریق بعدی.']],
    slider: 'روز پس از تزریق', val: (d) => `روز ${fa(Math.round(d))}`,
    out: (d, y, ph) => `<b>روز ${fa(Math.round(d))}، اثر حدود ${fa(Math.round(y * 100))}٪:</b> ${ph}`
  });

  /* ==========================================================================
     زخم: مراحل ترمیم در برش پوست
     ========================================================================== */
  B['wound-phases'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const PH = [['clot', 'بند آمدن خون', 'دقیقه‌های اول', 'رگ‌ها جمع می‌شوند و لخته‌ی خون زخم را می‌بندد؛ بخیه لبه‌ها را کنار هم نگه می‌دارد.'],
      ['infl', 'التهاب', 'روز ۱ تا ۴', 'گلبول‌های سفید برای تمیز کردن زخم می‌آیند. کمی قرمزی، ورم و گرمی طبیعی است؛ اما نباید روزبه‌روز بیشتر شود.'],
      ['prol', 'ساخت بافت تازه', 'روز ۴ تا هفته‌ی ۳', 'بافت صورتی تازه جای خالی را پر می‌کند و پوست از لبه‌ها روی زخم کشیده می‌شود. خارش رایج است؛ بخیه در همین دوره کشیده می‌شود.'],
      ['remo', 'بازسازی', 'هفته‌ی ۳ تا یک سال', 'بافت زخم محکم‌تر و جای زخم کم‌کم کم‌رنگ‌تر می‌شود. ضدآفتاب در این دوره خیلی مهم است.']];
    const skin = `
      <rect x="-300" y="40" width="600" height="150" class="wp-fat"/>
      <rect x="-300" y="-40" width="600" height="84" class="wp-derm"/>
      <rect x="-300" y="-56" width="600" height="18" class="wp-epi"/>
      <path class="wp-vessel" d="M-280 10 C -200 -4, -140 24, -60 8 M60 8 C 140 24, 200 -4, 280 10"/>
      <path class="wp-gap" d="M-42 -58 L 42 -58 L 8 60 L -8 60 Z"/>
      <path class="wp-clot" d="M-40 -56 L 40 -56 L 7 58 L -7 58 Z"/>
      <g class="wp-cells">${Array.from({ length: 9 }, (_, i) => `<circle cx="${-26 + (i % 3) * 26}" cy="${-30 + Math.floor(i / 3) * 26}" r="6" style="animation-delay:${-i * 0.3}s"/>`).join('')}</g>
      <path class="wp-gran" d="M-40 -56 L 40 -56 L 7 58 L -7 58 Z"/>
      <path class="wp-newv" d="M-20 30 C -8 10, 8 0, 18 -20 M-4 50 C 2 30, -10 10, -2 -12"/>
      <path class="wp-scar" d="M-30 -56 L 30 -56 L 6 58 L -6 58 Z"/>
      <rect class="wp-scab" x="-48" y="-68" width="96" height="16" rx="8"/>
      <rect class="wp-newepi wp-newepi--r" x="-40" y="-56" width="40" height="18" style="transform-origin:-40px -47px"/>
      <rect class="wp-newepi wp-newepi--l" x="0" y="-56" width="40" height="18" style="transform-origin:40px -47px"/>
      <g class="wp-st">${[-70, 0, 70].map((y) => `<path d="M-58 ${-50 + y * 0.2} C -40 ${-90 + y * 0.2}, 40 ${-90 + y * 0.2}, 58 ${-50 + y * 0.2}"/>`).join('')}</g>
      <ellipse class="wp-red" cx="0" cy="-48" rx="130" ry="26"/>`;
    const P = narrow ? { W: 740, H: 560, sx: 370, sy: 200, sc: 1.15, by: 470, fs: 24 } : { W: 740, H: 360, sx: 370, sy: 120, sc: 1, by: 312, fs: 14 };
    const segW = (P.W - 80) / 4;
    const bar = PH.map(([k, t, d], i) => `<g class="wp-b" data-k="${k}"><rect x="${P.W - 40 - (i + 1) * segW + 4}" y="${P.by}" width="${segW - 8}" height="${narrow ? 16 : 10}" rx="${narrow ? 8 : 5}"/><text x="${P.W - 40 - i * segW - segW / 2}" y="${P.by - (narrow ? 14 : 10)}" text-anchor="middle" font-size="${P.fs}">${t}</text><text x="${P.W - 40 - i * segW - segW / 2}" y="${P.by + (narrow ? 50 : 30)}" text-anchor="middle" font-size="${P.fs * 0.85}" class="wp-bd">${d}</text></g>`).join('');
    put(cv, `<svg class="mg-wp" viewBox="0 0 ${P.W} ${P.H}" data-s="clot" role="img" aria-label="مراحل ترمیم زخم در برش پوست">
      <defs><clipPath id="wpClip"><rect x="-300" y="-80" width="600" height="270" rx="22"/></clipPath></defs>
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        <g transform="translate(${P.sx} ${P.sy}) scale(${P.sc})"><g clip-path="url(#wpClip)">${skin}</g></g>
        ${bar}
      </g>
    </svg>`);
    const svg = $('svg', cv);
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    const apply = (k) => { const ph = PH.find((x) => x[0] === k); svg.dataset.s = k; sg.set(k); out.innerHTML = `<b>${ph[1]} (${ph[2]}):</b> ${ph[3]}`; };
    const c = cycler(PH.map((x) => x[0]), (k) => apply(k), 3400);
    const sg = seg(cv, PH.map((x) => [x[0], x[1]]), (k) => { c.pick(k); apply(k); });
    cv.appendChild(out);
    apply('clot');
    return { show(v) { svg.classList.toggle('is-on', !!v); c.show(v); }, destroy() { c.stop(); } };
  };

  /* ==========================================================================
     زخم: زمان معمول کشیدن بخیه در هر ناحیه (بازه‌ی روز؛ از راست به چپ)
     ========================================================================== */
  B['stitch-days'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const R = [['صورت', 3, 5, 'خون‌رسانی صورت عالی است و جای بخیه اهمیت دارد؛ بخیه زود کشیده می‌شود و گاهی چسب مخصوص جایش گذاشته می‌شود.'],
      ['گردن', 5, 7, 'پوست نازک است و زود جوش می‌خورد.'],
      ['پوست سر', 7, 10, 'می‌توانید بعد از ۴۸ ساعت موها را با شامپوی ملایم و آب ولرم بشویید؛ زخم را نخارانید.'],
      ['دست و بازو', 7, 10, 'اگر زخم روی مفصل آرنج است، معمولاً کمی بیشتر می‌ماند.'],
      ['سینه، شکم و پشت', 10, 14, 'پوست ضخیم‌تر است و بیشتر کشیده می‌شود؛ از بلند کردن بار سنگین پرهیز کنید.'],
      ['پا و کف پا', 10, 14, 'خون‌رسانی کمتر است و ترمیم کندتر؛ پا را بالا نگه دارید و کفش گشاد بپوشید.'],
      ['روی مفصل‌ها', 12, 14, 'زانو، انگشت‌ها و مچ مدام خم و راست می‌شوند؛ ممکن است آتل هم لازم باشد.']];
    const P = narrow ? { W: 740, rowH: 92, top: 30, L: 40, R: 480, lx: 710, fs: 26, h: 22 } : { W: 740, rowH: 44, top: 20, L: 40, R: 560, lx: 720, fs: 14, h: 14 };
    const H = P.top + R.length * P.rowH + (narrow ? 80 : 50);
    const X = (d) => P.R - (d / 16) * (P.R - P.L);
    const rows = R.map(([t, a, b], i) => { const y = P.top + i * P.rowH + P.rowH / 2; return `<g class="sdy-r" data-i="${i}" tabindex="0" role="button" aria-label="${t}: ${fa(a)} تا ${fa(b)} روز">
        <rect x="0" y="${y - P.rowH / 2 + 2}" width="${P.W}" height="${P.rowH - 4}" rx="10" class="sdy-hit"/>
        <text x="${P.lx}" y="${y + P.fs * 0.35}" text-anchor="start" font-size="${P.fs}" class="sdy-t">${t}</text>
        <rect x="${P.L}" y="${y - P.h / 2}" width="${P.R - P.L}" height="${P.h}" rx="${P.h / 2}" class="sdy-track"/>
        <rect x="${X(b)}" y="${y - P.h / 2}" width="${X(a) - X(b)}" height="${P.h}" rx="${P.h / 2}" class="sdy-bar" style="transform-origin:${X(a)}px ${y}px"/>
        <text x="${X(b) - 10}" y="${y + P.fs * 0.35}" text-anchor="start" font-size="${P.fs}" class="sdy-v">${fa(a)} تا ${fa(b)} روز</text>
      </g>`; }).join('');
    const axis = [0, 4, 8, 12, 16].map((d) => `<text x="${X(d)}" y="${H - (narrow ? 20 : 12)}" text-anchor="middle" font-size="${P.fs * 0.9}" class="sdy-ax">${d ? fa(d) + ' روز' : 'روز بخیه'}</text><line x1="${X(d)}" x2="${X(d)}" y1="${P.top}" y2="${H - (narrow ? 50 : 30)}" class="sdy-grid"/>`).join('');
    put(cv, `<svg class="mg-sdy" viewBox="0 0 ${P.W} ${H}" role="img" aria-label="زمان معمول کشیدن بخیه در ناحیه‌های مختلف بدن"><g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">${axis}${rows}</g></svg>`);
    const svg = $('svg', cv);
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    cv.appendChild(out);
    const pick = (i) => { $$('.sdy-r', svg).forEach((r) => r.classList.toggle('is-on', +r.dataset.i === i)); const [t, a, b, note] = R[i]; out.innerHTML = `<b>${t}: معمولاً ${fa(a)} تا ${fa(b)} روز بعد.</b> ${note}`; };
    $$('.sdy-r', svg).forEach((r) => { const f = () => pick(+r.dataset.i); r.addEventListener('click', f); r.addEventListener('pointerenter', f); r.addEventListener('focus', f); r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }); });
    pick(0);
    let done = false;
    return { show(v) { if (!v || done) return; done = true; $$('.sdy-bar', svg).forEach((b, i) => play(b, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, delay: 100 + i * 110 })); $$('.sdy-v', svg).forEach((t, i) => play(t, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 600 + i * 110 })); } };
  };

  /* ==========================================================================
     کشیدن دندان: ترمیم حفره در برش لثه و استخوان (لخته، بافت ترمیمی، استخوان تازه) و حالت خشکی حفره
     ========================================================================== */
  B['socket-heal'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    /* [کلید، دکمه، عنوان، زمان، برچسب اشاره‌گر، نقطه‌ی اشاره، ترکیب حفره (لخته، بافت ترمیمی، استخوان تازه)، توضیح] */
    const ST = [
      ['d1', 'روز اول', 'روز اول', '۲۴ ساعت اول', 'لخته‌ی خون', [0, 80], [1, 0, 0], 'حفره با خون پر شده و لخته‌ی تیره مثل درپوش رویش نشسته است. همین لخته از استخوان و انتهای عصب‌ها محافظت می‌کند؛ مکیدن، تف کردن و آب کشیدن دهان ممکن است جابه‌جایش کند.'],
      ['d3', 'روز سوم', 'روز سوم', 'روز ۲ تا ۴', 'بافت ترمیمی', [0, 184], [0.7, 0.3, 0], 'از کف و دیواره‌های حفره، بافت ترمیمی صورتی کم‌کم جای لخته را می‌گیرد. درد و ورم معمولاً همین روزها به اوج می‌رسد و بعد رو به کاهش می‌رود.'],
      ['w1', 'هفته‌ی اول', 'پایان هفته‌ی اول', 'روز ۵ تا ۷', 'لثه‌ی تازه', [-38, 10], [0.25, 0.75, 0], 'بیشتر حفره با بافت ترمیمی پر شده و لثه از دو طرف به سمت هم پیش می‌آید. درد باید آشکارا کمتر شده باشد؛ بخیه‌های معمولی حدود همین روزها کشیده می‌شوند.'],
      ['w2', 'هفته‌ی دوم', 'هفته‌ی دوم و سوم', 'روز ۱۰ تا ۲۱', 'لثه بسته شد', [0, 12], [0, 0.65, 0.35], 'لثه روی حفره را پوشانده و زیرش، استخوان تازه از کف حفره شروع به ساخته شدن کرده است. غذا خوردن تقریباً عادی است؛ فقط هنوز خوراکی خیلی سفت را آن سمت نجوید.'],
      ['m2', 'ماه دوم', 'یکی دو ماه بعد', '۶ تا ۸ هفته', 'استخوان تازه', [0, 150], [0, 0.1, 0.9], 'استخوان تازه بیشتر حفره را پر کرده است. سفت و کامل شدن استخوان ۳ تا ۶ ماه طول می‌کشد؛ اگر قرار است ایمپلنت بگذارید، دندانپزشک زمان مناسبش را از روی عکس تعیین می‌کند.'],
      ['dry', 'خشکی حفره', 'خشکی حفره', 'معمولاً روز ۲ تا ۴', 'حفره‌ی خالی', [0, 120], [0, 0, 0], 'لخته زود بیرون آمده و استخوان و عصب بی‌محافظ مانده‌اند. درد شدید و ضربان‌داری که به گوش تیر می‌کشد و بوی بد دهان، نشانه‌هایش است؛ برگردید تا دندانپزشک حفره را تمیز و پانسمان کند.']
    ];
    const sock = 'M-56 20 C -56 90, -44 170, -14 212 Q 0 224, 14 212 C 44 170, 56 90, 56 20';
    const tooth = (cx) => `
      <path class="sh-root" d="M${cx - 50} -8 C ${cx - 52} 60, ${cx - 46} 140, ${cx - 30} 186 Q ${cx - 20} 196, ${cx - 12} 182 C ${cx - 8} 130, ${cx - 6} 80, ${cx} 52 C ${cx + 6} 80, ${cx + 8} 130, ${cx + 12} 182 Q ${cx + 20} 196, ${cx + 30} 186 C ${cx + 46} 140, ${cx + 52} 60, ${cx + 50} -8 Z"/>
      <path class="sh-crown" d="M${cx - 56} -2 C ${cx - 66} -50, ${cx - 66} -118, ${cx - 54} -142 C ${cx - 40} -160, ${cx - 22} -150, ${cx - 10} -156 C ${cx} -162, ${cx + 8} -162, ${cx + 14} -156 C ${cx + 26} -150, ${cx + 44} -162, ${cx + 56} -142 C ${cx + 66} -118, ${cx + 66} -50, ${cx + 56} -2 Z"/>`;
    const fill = (cls, inner) => `<g class="${cls}" style="transform-origin:0px 226px"><rect x="-60" y="-12" width="120" height="238"/>${inner || ''}</g>`;
    const P = narrow
      ? { W: 740, H: 906, sx: 370, sy: 232, sc: 1.12, fs: 29, px: 720, py: 636 }
      : { W: 740, H: 384, sx: 510, sy: 156, sc: 0.7, fs: 14, px: 262, py: 104 };
    const lf = P.fs / P.sc; /* اندازه‌ی متن داخل صحنه، به واحد صحنه */
    const scene = `
      <defs>
        <clipPath id="shClip"><rect x="-300" y="-200" width="600" height="500" rx="26"/></clipPath>
        <pattern id="shTrab" width="36" height="30" patternUnits="userSpaceOnUse"><ellipse cx="9" cy="8" rx="5" ry="3.4"/><ellipse cx="27" cy="21" rx="6" ry="3.8"/><circle cx="26" cy="5" r="2"/><circle cx="8" cy="23" r="2.4"/></pattern>
        <pattern id="shTrabN" width="22" height="20" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.4"/><circle cx="16" cy="14" r="2.8"/><circle cx="16" cy="3" r="1.4"/></pattern>
      </defs>
      <g clip-path="url(#shClip)">
        <rect class="sh-air" x="-300" y="-200" width="600" height="500"/>
        ${fill('sh-clot', [[-24, 30], [18, 62], [-10, 104], [22, 138], [-18, 170], [4, 200], [-30, 70], [30, 100], [-2, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join(''))}
        ${fill('sh-gran', '<path class="sh-cap" d="M-30 226 C -22 186, -38 150, -26 112 C -18 82, -32 50, -24 14 M4 226 C 12 190, -6 150, 6 110 C 14 80, 0 44, 8 8 M34 226 C 28 190, 42 150, 30 112 C 24 80, 38 48, 30 12"/>')}
        ${fill('sh-nb', '<rect class="sh-nb__t" x="-60" y="-12" width="120" height="238" fill="url(#shTrabN)"/>')}
        <path class="sh-bone" fill-rule="evenodd" d="M-300 20 H 300 V 300 H -300 Z ${sock} Z"/>
        <path class="sh-trab" fill-rule="evenodd" fill="url(#shTrab)" d="M-300 20 H 300 V 300 H -300 Z ${sock} Z"/>
        <path class="sh-wall" d="${sock}"/>
        <rect class="sh-canal" x="-310" y="236" width="620" height="22" rx="11"/>
        <path class="sh-nerve" d="M-310 247 H 310"/>
        <path class="sh-nerve sh-nerve--s" d="M0 238 C 0 232, 0 226, 0 221"/>
        ${tooth(-180)}${tooth(180)}
        <rect class="sh-tg" x="-58" y="-8" width="61" height="46" rx="14" style="transform-origin:-58px 15px"/>
        <rect class="sh-tg" x="-3" y="-8" width="61" height="46" rx="14" style="transform-origin:58px 15px"/>
        <path class="sh-gum" d="M-310 -8 L -86 -8 C -66 -8, -58 -2, -56 16 L -56 42 L -310 42 Z M310 -8 L 86 -8 C 66 -8, 58 -2, 56 16 L 56 42 L 310 42 Z"/>
        <path class="sh-dome" d="M-56 -2 C -50 -24, 50 -24, 56 -2 Z"/>
        <g class="sh-dry">
          <path class="sh-exp sh-exp--g" d="${sock}"/><path class="sh-exp" d="${sock}"/>
          <g class="sh-deb"><circle cx="-16" cy="72" r="5.5"/><circle cx="14" cy="120" r="6.5"/><circle cx="-6" cy="168" r="4.5"/><path d="M6 36 l12 5 l-5 9 z"/></g>
          <ellipse class="sh-inf" cx="-62" cy="8" rx="20" ry="24"/><ellipse class="sh-inf" cx="62" cy="8" rx="20" ry="24"/>
          <g class="sh-pain">${[0, 1, 2].map((i) => `<circle cx="0" cy="214" r="34" style="animation-delay:${-i * 0.6}s"/>`).join('')}</g>
        </g>
        <g class="sh-lb" font-size="${lf}">
          <text x="276" y="${17 + lf * 0.35}" text-anchor="middle" class="sh-lb--gum">لثه</text>
          <text x="180" y="${217 + lf * 0.35}" text-anchor="middle" class="sh-lb--bone">استخوان فک</text>
          <text x="180" y="${280 + lf * 0.35}" text-anchor="middle" class="sh-lb--nerve">عصب فک</text>
        </g>
        <g class="sh-ptr"><line class="sh-ln sh-ln--h" x1="0" y1="-104"/><line class="sh-ln" x1="0" y1="-104"/><circle class="sh-pd" r="7"/></g>
        <g transform="translate(0 -128)"><g class="sh-chip"><rect y="${-lf * 0.95}" height="${lf * 1.9}" rx="${lf * 0.95}"/><text y="${lf * 0.36}" text-anchor="middle" font-size="${lf}"></text></g></g>
      </g>`;
    const CL = [['لخته‌ی خون', 'sh-k--clot'], ['بافت ترمیمی', 'sh-k--gran'], ['استخوان تازه', 'sh-k--nb']];
    const bw = narrow ? 450 : 230, rowH = narrow ? 64 : 64;
    const panel = CL.map(([t, c], i) => {
      const y = P.py + (narrow ? 56 : 38) + i * rowH;
      const bx = narrow ? P.px - 200 - bw : P.px - bw, by = narrow ? y - P.fs * 0.55 : y + 12;
      return `<g class="sh-k ${c}">
        <text x="${P.px}" y="${y}" text-anchor="start" font-size="${P.fs}">${t}</text>
        <rect class="sh-k__tr" x="${bx}" y="${by}" width="${bw}" height="${P.fs * 0.8}" rx="${P.fs * 0.4}"/>
        <rect class="sh-k__f" x="${bx}" y="${by}" width="${bw}" height="${P.fs * 0.8}" rx="${P.fs * 0.4}" style="transform-origin:${bx + bw}px ${by}px"/>
      </g>`;
    }).join('');
    put(cv, `<svg class="mg-sh" viewBox="0 0 ${P.W} ${P.H}" data-s="d1" role="img" aria-label="ترمیم حفره‌ی دندان بعد از کشیدن، در برش لثه و استخوان فک">
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        <g transform="translate(${P.sx} ${P.sy}) scale(${P.sc})">${scene}</g>
        <text x="${P.px}" y="${P.py}" text-anchor="start" font-size="${P.fs * 1.08}" class="sh-kt">حفره با چه پر شده؟</text>
        ${panel}
        <text x="${P.px}" y="${P.py + (narrow ? 56 : 38) + 3 * rowH + (narrow ? 8 : 4)}" text-anchor="start" font-size="${P.fs}" class="sh-warn">لخته از دست رفته؛ استخوان بی‌محافظ است</text>
      </g>
    </svg>`);
    const svg = $('svg', cv);
    const chip = $('.sh-chip', svg), chipT = $('text', chip), chipR = $('rect', chip), ptr = $('.sh-ptr', svg);
    const bars = $$('.sh-k__f', svg);
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    const apply = (k, user) => {
      const s = ST.find((x) => x[0] === k);
      const [, , title, when, lbl, [tx, ty], comp, txt] = s;
      svg.dataset.s = k; sg.set(k);
      out.innerHTML = `<b>${title} (${when}):</b> ${txt}`;
      chipT.textContent = lbl;
      const w = (chipT.getComputedTextLength && chipT.getComputedTextLength()) || lbl.length * lf * 0.55;
      chipR.setAttribute('x', -(w / 2 + lf * 0.9)); chipR.setAttribute('width', w + lf * 1.8);
      $$('line', ptr).forEach((l) => { l.setAttribute('x2', tx); l.setAttribute('y2', ty); });
      const d = $('.sh-pd', ptr); d.setAttribute('cx', tx); d.setAttribute('cy', ty);
      comp.forEach((v, i) => { bars[i].style.transform = `scaleX(${v})`; });
      if (user !== undefined) { play(chip, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: 'none' }); play(ptr, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 120, fill: 'backwards' }); }
    };
    const c = cycler(ST.map((x) => x[0]), (k) => apply(k, false), 3800);
    const sg = seg(cv, ST.map((x) => [x[0], x[1]]), (k) => { c.pick(k); apply(k, true); });
    cv.appendChild(out);
    apply('d1');
    return { show(v) { svg.classList.toggle('is-on', !!v); c.show(v); }, destroy() { c.stop(); } };
  };

  /* ==========================================================================
     کشیدن دندان: راهنمای روزبه‌روز؛ منحنی تقریبی درد و ورم روی محور مرحله‌ها (از راست به چپ) و فهرست «بکنید / نکنید»
     ========================================================================== */
  B['extraction-days'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const D = [
      { n: 'ساعت اول', t: 'همان ساعت اول', s: 'گاز گرفتن و صبر', ico: 'gauze',
        yes: ['گاز را ۳۰ تا ۴۵ دقیقه محکم و بی‌وقفه گاز بگیرید.', 'اگر خون‌ریزی ادامه داشت، گاز تازه یا کیسه‌ی چای خیس بگذارید و ۳۰ دقیقه‌ی دیگر گاز بگیرید.', 'اولین دوز مسکن را پیش از رفتن بی‌حسی بخورید.'],
        no: ['گاز را مدام برندارید تا خون را نگاه کنید.', 'تا بی‌حسی نرفته چیزی نخورید و مراقب لب و زبانتان باشید.', 'تف نکنید؛ بزاق را قورت دهید.'],
        note: 'کمی خونابه‌ی صورتی در بزاق تا ۲۴ ساعت طبیعی است.' },
      { n: 'روز اول', t: '۲۴ ساعت اول', s: 'حساس‌ترین روز', ico: 'ice',
        yes: ['کمپرس سرد: ۱۵ تا ۲۰ دقیقه روی گونه، ۱۵ تا ۲۰ دقیقه استراحت.', 'غذای نرم و ولرم بخورید و با سمت مقابل دهان بجوید.', 'شب با یک بالش اضافه، سر بالاتر بخوابید.'],
        no: ['دهان را آب نکشید و تف نکنید.', 'با نی ننوشید؛ سیگار، قلیان و ویپ نکشید.', 'ورزش سنگین، سونا و حمام داغ را کنار بگذارید.'],
        note: 'اگر با وجود گاز گرفتن، خون‌ریزی زیاد بند نیامد، تماس بگیرید.', warn: true },
      { n: 'روز ۲ و ۳', t: 'روز دوم و سوم', s: 'اوج درد و ورم', ico: 'salt',
        yes: ['دهان‌شویه‌ی آب نمک ولرم، روزی چند بار و بعد از غذا.', 'بقیه‌ی دندان‌ها را آرام مسواک بزنید.', 'اگر ورم مانده، از حالا کمپرس گرم ملایم بهتر است.'],
        no: ['هنوز سیگار و قلیان نکشید.', 'آجیل، تخمه، چیپس و غذای تند و داغ نخورید.', 'ورزش سنگین و بلند کردن بار سنگین را عقب بیندازید.'],
        note: 'اگر درد به‌جای کم شدن بیشتر شد و به گوش تیر کشید، ممکن است خشکی حفره باشد؛ خبر دهید.', warn: true },
      { n: 'روز ۴ تا ۷', t: 'روز چهارم تا هفتم', s: 'رو به بهبود', ico: 'bowl',
        yes: ['کم‌کم به غذای معمولی برگردید؛ اول با سمت مقابل.', 'دهان‌شویه‌ی آب نمک را بعد از غذا ادامه دهید.', 'محل کشیدن را با مسواک نرم، آرام تمیز کنید.'],
        no: ['غذای سفت و ریز را هنوز آن سمت نجوید.', 'با زبان یا انگشت به حفره ور نروید.', 'اگر می‌توانید تا آخر هفته سیگار نکشید.'],
        note: 'درد باید هر روز کمتر شود. تب، چرک یا ورمی که بیشتر می‌شود، دلیل مراجعه است.', warn: true },
      { n: 'روز ۷ تا ۱۰', t: 'روز هفتم تا دهم', s: 'تقریباً عادی', ico: 'check',
        yes: ['اگر بخیه‌ی معمولی زده‌اند، برای کشیدنش بیایید.', 'به غذا و ورزش همیشگی برگردید.', 'برای پر کردن جای خالی (غیر از دندان عقل) مشورت کنید.'],
        no: ['اگر درد یا بوی بد مانده، منتظر نمانید.', 'جای خالی دندان را طولانی رها نکنید.'],
        note: 'بخیه‌ی قابل جذب خودش طی یکی دو هفته می‌افتد؛ لازم نیست کاری کنید.' }
    ];
    const ICO = {
      gauze: '<rect x="4" y="6" width="16" height="12" rx="3"/><path d="M4 10h16M4 14h16M9 6v12M15 6v12"/>',
      ice: '<g class="xd-spin"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4"/></g>',
      salt: '<path d="M6 4h12l-1.6 15a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-2-1.8z"/><path d="M6.7 9.5h10.6"/><g class="xd-bub"><circle cx="10.5" cy="16" r=".9"/><circle cx="13.6" cy="13.6" r=".9"/></g>',
      bowl: '<path d="M3 12h18a9 7 0 0 1-18 0z"/><path d="M8.5 20h7"/><g class="xd-steam"><path d="M8.5 8.6c0-1.6 1.2-1.6 1.2-3.2M12 8.6c0-1.6 1.2-1.6 1.2-3.2M15.5 8.6c0-1.6 1.2-1.6 1.2-3.2"/></g>',
      check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.4 2.7 2.7L16.2 9.6"/>'
    };
    const L = [0.2, 0.6, 0.95, 0.5, 0.14];
    const P = narrow
      ? { W: 740, H: 272, top: 60, base: 150, ny: 192, r: 13, fs: 28, ts: 25, x0: 668, x1: 72 }
      : { W: 740, H: 172, top: 34, base: 98, ny: 126, r: 9, fs: 14, ts: 13, x0: 672, x1: 68 };
    const X = (i) => P.x0 - (i * (P.x0 - P.x1)) / 4;
    const Y = (l) => P.base - l * (P.base - P.top);
    const pts = [[P.W - 10, Y(0.03)], ...L.map((l, i) => [X(i), Y(l)]), [10, Y(0.04)]];
    /* منحنی نرم (Catmull-Rom) از میان نقطه‌ها؛ نشانگر هم روی همین منحنی حرکت می‌کند */
    const at = (s, t) => {
      const p0 = pts[Math.max(0, s - 1)], p1 = pts[s], p2 = pts[s + 1], p3 = pts[Math.min(pts.length - 1, s + 2)];
      const t2 = t * t, t3 = t2 * t;
      const v = [0, 1].map((j) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3));
      return [v[0], Math.min(P.base, v[1])];
    };
    const line = [];
    for (let s = 0; s < pts.length - 1; s++) for (let k = 0; k < 16; k++) line.push(at(s, k / 16));
    line.push(pts[pts.length - 1]);
    const d = line.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const segW = (P.x0 - P.x1) / 4;
    const nodes = D.map((s, i) => `<g class="xd-n" data-i="${i}" tabindex="0" role="button" aria-label="${s.t}">
        <rect class="xd-n__hit" x="${X(i) - segW / 2}" y="${P.ny - P.r - 12}" width="${segW}" height="${P.H - P.ny + P.r + 12}" rx="12"/>
        <circle class="xd-n__d" cx="${X(i)}" cy="${P.ny}" r="${P.r}"/>
        <text class="xd-n__t" x="${X(i)}" y="${P.ny + P.r + P.fs * 1.55}" text-anchor="middle" font-size="${P.fs}">${s.n}</text>
      </g>`).join('');
    put(cv, `<svg class="mg-xd" viewBox="0 0 ${P.W} ${P.H}" role="group" aria-label="مرحله‌های بعد از کشیدن دندان و شدت معمول درد و ورم">
      <defs><linearGradient id="xdGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="xd-g0"/><stop offset="1" class="xd-g1"/></linearGradient></defs>
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        <text x="12" y="${P.ts + 2}" text-anchor="end" font-size="${P.ts}" class="xd-cap">شدت معمول درد و ورم</text>
        ${D.map((s, i) => `<line class="xd-grid" x1="${X(i)}" x2="${X(i)}" y1="${P.top - 10}" y2="${P.ny}"/>`).join('')}
        <line class="xd-base" x1="10" x2="${P.W - 10}" y1="${P.base}" y2="${P.base}"/>
        <g class="xd-cv" style="transform-origin:0px ${P.base}px"><path class="xd-area" d="${d} L 10 ${P.base} L ${P.W - 10} ${P.base} Z"/><path class="xd-line" d="${d}"/></g>
        <line class="xd-cur" x1="0" x2="0" y1="${P.top - 14}" y2="${P.ny}"/>
        <line class="xd-trk" x1="${P.x1}" x2="${P.x0}" y1="${P.ny}" y2="${P.ny}"/>
        <line class="xd-fil" x1="${P.x1}" x2="${P.x0}" y1="${P.ny}" y2="${P.ny}" style="transform-origin:${P.x0}px ${P.ny}px"/>
        ${nodes}
        <g class="xd-mk"><circle class="xd-mk__h" r="${P.r * 1.9}"/><circle class="xd-mk__d" r="${P.r * 0.85}"/></g>
      </g>
    </svg>
    <div class="xd-panes">${D.map((s, i) => `<div class="xd-pane" data-i="${i}">
      <div class="xd-ph"><span class="xd-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[s.ico]}</svg></span><div><b>${s.t}</b><span>${s.s}</span></div></div>
      <div class="xd-cols">
        <div class="xd-col xd-col--yes"><p class="xd-ch">انجام دهید</p><ul>${s.yes.map((x) => `<li>${x}</li>`).join('')}</ul></div>
        <div class="xd-col xd-col--no"><p class="xd-ch">انجام ندهید</p><ul>${s.no.map((x) => `<li>${x}</li>`).join('')}</ul></div>
      </div>
      <p class="xd-note${s.warn ? ' is-warn' : ''}">${s.note}</p>
    </div>`).join('')}</div>`);
    const svg = $('svg', cv), wrap = $('.xd-panes', cv);
    const panes = $$('.xd-pane', cv), ns = $$('.xd-n', svg);
    const mk = $('.xd-mk', svg), col = $('.xd-cur', svg), fil = $('.xd-fil', svg);
    let cur = -1, aM = null, aC = null;
    const place = (i) => {
      const [x, y] = pts[i + 1];
      mk.style.transform = `translate(${x}px, ${y}px)`; col.style.transform = `translate(${x}px, 0px)`;
      fil.style.transform = `scaleX(${(P.x0 - x) / (P.x0 - P.x1)})`;
      if (cur < 0 || cur === i || !anim()) return;
      const a = cur + 1, b = i + 1, dir = b > a ? 1 : -1, fr = [];
      for (let s = a; s !== b; s += dir) for (let k = 0; k < 12; k++) fr.push(dir > 0 ? at(s, k / 12) : at(s - 1, 1 - k / 12));
      fr.push(pts[b]);
      if (aM) aM.cancel(); if (aC) aC.cancel();
      const o = { duration: 650 + 170 * Math.abs(b - a), easing: EASE };
      aM = mk.animate(fr.map(([fx, fy]) => ({ transform: `translate(${fx}px, ${fy}px)` })), o);
      aC = col.animate(fr.map(([fx]) => ({ transform: `translate(${fx}px, 0px)` })), o);
    };
    const apply = (i) => {
      if (i === cur) return;
      const dx = cur < 0 ? 0 : i > cur ? -18 : 18; /* راست‌به‌چپ: مرحله‌ی بعد از سمت چپ وارد می‌شود */
      place(i);
      ns.forEach((n, j) => { n.classList.toggle('is-on', j === i); n.classList.toggle('is-past', j < i); n.setAttribute('aria-pressed', String(j === i)); });
      panes.forEach((p, j) => { p.classList.toggle('is-on', j === i); p.setAttribute('aria-hidden', String(j !== i)); });
      if (dx) {
        const p = panes[i];
        play(p, [{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 700, fill: 'none' });
        play($('.xd-ico', p), [{ transform: 'scale(.55) rotate(-14deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 60, fill: 'backwards', easing: 'cubic-bezier(.34, 1.4, .64, 1)' });
        $$('li', p).forEach((li, k) => play(li, [{ opacity: 0, transform: `translateX(${dx * 0.7}px)` }, { opacity: 1, transform: 'none' }], { duration: 560, delay: 110 + k * 60, fill: 'backwards' }));
      }
      cur = i;
    };
    /* متن زیاد است: یک دور خودکار می‌چرخد و به مرحله‌ی اول برمی‌گردد؛ با لمس یا نگه داشتن نشانگر روی متن، مکث می‌کند */
    let ticks = 0, vis = false;
    const c = cycler(['0', '1', '2', '3', '4'], (k) => { apply(+k); if (++ticks >= D.length) c.pick(k); }, 6500);
    const pick = (i) => { c.pick(String(i)); apply(i); };
    ns.forEach((n) => {
      const f = () => pick(+n.dataset.i);
      n.addEventListener('click', f);
      n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } });
    });
    wrap.addEventListener('pointerenter', () => c.show(false));
    wrap.addEventListener('pointerleave', () => c.show(vis));
    apply(0);
    let drawn = false;
    return {
      show(v) {
        vis = !!v; cv.classList.toggle('is-on', vis); c.show(vis);
        if (vis && !drawn) { drawn = true; play($('.xd-cv', svg), [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1100, fill: 'backwards' }); play(mk, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 700, fill: 'backwards' }); }
      },
      destroy() { c.stop(); }
    };
  };

  /* ==========================================================================
     لیزر: چرخه‌ی رشد مو در برش پوست؛ لیزر فقط به موهای در حال رشد می‌رسد
     ========================================================================== */
  B['hair-cycle'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const ST = [
      ['before', 'قبل از شلیک', 'در هر ناحیه، موها هم‌زمان در یک مرحله نیستند: بعضی در حال <b>رشد</b>اند و به ریشه وصل‌اند، بعضی در حال <b>برگشت</b>اند و بعضی در <b>استراحت</b>؛ موی قدیمی فقط منتظر افتادن است.'],
      ['shot', 'لحظه‌ی شلیک', 'رنگدانه‌ی مو نور لیزر را جذب می‌کند و به گرما تبدیل می‌کند. فقط موهای در حال رشد که به ریشه وصل‌اند، این گرما را به مرکز رشد مو می‌رسانند؛ بقیه تقریباً دست‌نخورده می‌مانند.'],
      ['shed', 'یکی دو هفته بعد', 'موهایی که ریشه‌شان گرما گرفته، از پوست بیرون رانده می‌شوند و می‌ریزند. شاید به نظر برسد مو دوباره رشد کرده، اما در واقع دارد می‌افتد؛ با موچین نکنیدش.'],
      ['next', 'جلسه‌ی بعد', 'حالا بعضی از ریشه‌هایی که در استراحت بودند، وارد مرحله‌ی رشد شده‌اند و جلسه‌ی بعد نوبت آن‌هاست. یکی از ریشه‌های قبلی هم موی نازک و کم‌رنگی داده؛ برای همین چند جلسه لازم است.']
    ];
    const PH = narrow ? ['A', 'T', 'A', 'C', 'A', 'T'] : ['A', 'T', 'A', 'C', 'A', 'T', 'A', 'C'];
    const x0 = narrow ? 80 : 62, dx = narrow ? 108 : 82.5;
    const xs = PH.map((p, i) => x0 + i * dx);
    const T = 3.2, HX0 = 700, HX1 = 0; /* رفت‌وبرگشت دستگاه از راست به چپ */
    const shaft = (x, y) => `M${x} ${y} L ${x} 0 C ${x} -8, ${x + 2} -16, ${x + 7} -24`;
    const fol = (x, p, i) => {
      const f = (HX0 - x) / (HX0 - HX1), dl = -(T - f * T);
      if (p === 'A') return `<g class="hc-f hc-f--a${i === 2 ? ' hc-f--re' : ''}">
        <path class="hc-sh" d="M${x - 9} 0 L ${x - 10} 184 C ${x - 18} 196, ${x - 14} 214, ${x} 214 C ${x + 14} 214, ${x + 18} 196, ${x + 10} 184 L ${x + 9} 0 Z"/>
        <ellipse class="hc-bulb" cx="${x}" cy="${197}" rx="14" ry="16"/><ellipse class="hc-pap" cx="${x}" cy="${203}" rx="5.5" ry="7"/>
        <ellipse class="hc-dmg" cx="${x}" cy="${197}" rx="14" ry="16"/>
        <g class="hc-glow" style="animation-delay:${dl.toFixed(2)}s"><circle cx="${x}" cy="197" r="30"/><path d="M${x} 186 L ${x} 2"/></g>
        <path class="hc-hair" d="${shaft(x, 190)}"/>
        ${i === 2 ? `<path class="hc-thin" d="${shaft(x, 190)}"/>` : ''}
      </g>`;
      if (p === 'C') return `<g class="hc-f hc-f--c">
        <path class="hc-sh" d="M${x - 9} 0 L ${x - 9} 124 C ${x - 12} 136, ${x + 12} 136, ${x + 9} 124 L ${x + 9} 0 Z"/>
        <path class="hc-str" d="M${x} 134 L ${x} 190"/><circle class="hc-germ" cx="${x}" cy="194" r="6"/>
        <ellipse class="hc-club" cx="${x}" cy="122" rx="7.5" ry="9"/>
        <path class="hc-hair" d="${shaft(x, 118)}"/>
      </g>`;
      return `<g class="hc-f hc-f--t">
        <path class="hc-sh" d="M${x - 8} 0 L ${x - 8} 74 C ${x - 10} 86, ${x + 10} 86, ${x + 8} 74 L ${x + 8} 0 Z"/>
        <circle class="hc-germ" cx="${x}" cy="92" r="6"/>
        <g class="hc-new" style="transform-origin:${x}px 200px">
          <path class="hc-sh" d="M${x - 9} 0 L ${x - 10} 184 C ${x - 18} 196, ${x - 14} 214, ${x} 214 C ${x + 14} 214, ${x + 18} 196, ${x + 10} 184 L ${x + 9} 0 Z"/>
          <ellipse class="hc-bulb" cx="${x}" cy="197" rx="14" ry="16"/><ellipse class="hc-pap" cx="${x}" cy="203" rx="5.5" ry="7"/>
          <path class="hc-hair hc-hair--new" d="M${x} 190 L ${x} -4"/>
        </g>
        <g class="hc-old"><circle class="hc-club hc-club--t" cx="${x}" cy="72" r="6.5"/><path class="hc-hair" d="${shaft(x, 70)}"/></g>
      </g>`;
    };
    const dot = (x, p) => `<g class="hc-dot"><circle cx="${x}" cy="262" r="8" class="hc-d hc-d--${p}"/>${p === 'T' ? `<circle cx="${x}" cy="262" r="8" class="hc-d hc-d--A hc-d--up"/>` : ''}</g>`;
    const H = 440;
    put(cv, `<svg class="mg-hc" viewBox="0 0 740 ${H}" data-s="before" role="img" aria-label="برش پوست و فولیکول‌های مو در مرحله‌های رشد، برگشت و استراحت؛ اثر لیزر بر موهای در حال رشد">
      <defs>
        <clipPath id="hcClip"><rect x="0" y="-140" width="700" height="430" rx="24"/></clipPath>
        <linearGradient id="hcBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF7A45" stop-opacity=".55"/><stop offset=".55" stop-color="#FF9A5C" stop-opacity=".22"/><stop offset="1" stop-color="#FF9A5C" stop-opacity="0"/></linearGradient>
        <radialGradient id="hcHeat"><stop offset="0" stop-color="#FFB347" stop-opacity=".95"/><stop offset=".55" stop-color="#FF6A2B" stop-opacity=".45"/><stop offset="1" stop-color="#FF6A2B" stop-opacity="0"/></radialGradient>
        <pattern id="hcFat" width="34" height="30" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="8"/><circle cx="26" cy="23" r="8"/></pattern>
      </defs>
      <g transform="translate(20 146)"><g clip-path="url(#hcClip)">
        <rect class="hc-air" x="0" y="-140" width="700" height="140"/>
        <rect class="hc-derm" x="0" y="0" width="700" height="240"/>
        <rect class="hc-fat" x="0" y="232" width="700" height="60"/><rect class="hc-fatp" x="0" y="232" width="700" height="60" fill="url(#hcFat)"/>
        <rect class="hc-epi" x="0" y="0" width="700" height="14"/>
        ${PH.map((p, i) => fol(xs[i], p, i)).join('')}
        ${PH.map((p, i) => dot(xs[i], p)).join('')}
        <g class="hc-hp" style="--hx0:${HX0}px; --hx1:${HX1}px; animation-duration:${T}s">
          <path class="hc-beam" d="M-22 -86 L 22 -86 L 62 240 L -62 240 Z"/>
          <rect class="hc-hpb" x="-40" y="-136" width="80" height="44" rx="14"/><rect class="hc-hpt" x="-24" y="-96" width="48" height="12" rx="4"/>
        </g>
      </g></g>
    </svg>`);
    const svg = $('svg', cv);
    const lg = document.createElement('div'); lg.className = 'mg-legend';
    lg.innerHTML = [['#0E8F6B', 'در حال رشد (آناژن)'], ['#E08A00', 'در حال برگشت (کاتاژن)'], ['#1673D6', 'در استراحت (تلوژن)']].map(([c, t]) => `<span style="--c:${c}"><i></i>${t}</span>`).join('');
    cv.appendChild(lg);
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    const apply = (k) => { const s = ST.find((x) => x[0] === k); svg.dataset.s = k; sg.set(k); out.innerHTML = `<b>${s[1]}:</b> ${s[2]}`; };
    const c = cycler(ST.map((x) => x[0]), (k) => apply(k), 4400);
    const sg = seg(cv, ST.map((x) => [x[0], x[1]]), (k) => { c.pick(k); apply(k); });
    cv.appendChild(out);
    apply('before');
    return { show(v) { svg.classList.toggle('is-on', !!v); c.show(v); }, destroy() { c.stop(); } };
  };

  /* ==========================================================================
     لیزر: کاهش تقریبی مو جلسه‌به‌جلسه روی یک تکه پوست (هر جلسه حدود یک‌پنجم موهای باقی‌مانده)
     ========================================================================== */
  B['laser-sessions'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const AREAS = [['face', 'صورت', 4, 6], ['arm', 'زیر بغل و دست', 4, 8], ['leg', 'پا و پشت', 6, 10]];
    const P = narrow
      ? { W: 740, H: 760, px: 20, py: 20, pw: 700, ph: 400, fs: 26, big: 46, n: 150, sw: 3.4 }
      : { W: 740, H: 320, px: 390, py: 14, pw: 330, ph: 292, fs: 14, big: 30, n: 110, sw: 2.6 };
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    /* چیدمان تقریباً یکنواخت: شبکه با جابه‌جایی تصادفی */
    const cols = Math.round(Math.sqrt(P.n * P.pw / P.ph)), rows = Math.ceil(P.n / cols);
    const hairs = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols && hairs.length < P.n; q++) {
      const x = P.px + 14 + ((q + 0.15 + rnd() * 0.7) / cols) * (P.pw - 28), y = P.py + 18 + ((r + 0.15 + rnd() * 0.7) / rows) * (P.ph - 30);
      const a = (-116 + (rnd() - 0.5) * 56) * Math.PI / 180, L = (narrow ? 19 : 14) + rnd() * (narrow ? 14 : 10), bend = (rnd() - 0.5) * 12;
      const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
      hairs.push({ d: `M${x.toFixed(1)} ${y.toFixed(1)} Q ${((x + ex) / 2 + bend).toFixed(1)} ${((y + ey) / 2 - bend / 2).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`, dl: Math.round(rnd() * 260) });
    }
    const rank = hairs.map((h, i) => i).sort(() => rnd() - 0.5);
    const S = narrow
      ? { lx: 720, vx: 20, y1: 486, y2: 580, y3: 712, bw: 400 }
      : { lx: 352, vx: 352, y1: 40, y2: 132, y3: 238, bw: 312 };
    const stat = (y, k, cls) => narrow
      ? `<text x="${S.lx}" y="${y}" text-anchor="start" font-size="${P.fs}" class="ls-k">${k}</text><text x="${S.vx}" y="${y + 6}" text-anchor="end" font-size="${P.big}" class="ls-v ${cls}"></text>`
      : `<text x="${S.lx}" y="${y}" text-anchor="start" font-size="${P.fs}" class="ls-k">${k}</text><text x="${S.vx}" y="${y + P.big + 8}" text-anchor="start" font-size="${P.big}" class="ls-v ${cls}"></text>`;
    const barY = narrow ? S.y2 + 38 : S.y2 + P.big + 24, barX = narrow ? 20 : S.lx - S.bw;
    put(cv, `<svg class="mg-ls" viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="کاهش تقریبی موها در طول جلسه‌های لیزر">
      <defs><clipPath id="lsClip"><rect x="${P.px}" y="${P.py}" width="${P.pw}" height="${P.ph}" rx="22"/></clipPath>
        <radialGradient id="lsSkin" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#F8DCCB"/><stop offset="1" stop-color="#EFC3A9"/></radialGradient></defs>
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        <g clip-path="url(#lsClip)"><rect x="${P.px}" y="${P.py}" width="${P.pw}" height="${P.ph}" fill="url(#lsSkin)"/>
          <g class="ls-hairs" stroke-width="${P.sw}">${hairs.map((h, i) => `<path d="${h.d}" data-r="${rank[i]}" style="transition-delay:${h.dl}ms"/>`).join('')}</g></g>
        <rect x="${P.px}" y="${P.py}" width="${P.pw}" height="${P.ph}" rx="22" class="ls-frame"/>
        ${stat(S.y1, 'تعداد جلسه‌ها', 'ls-n')}
        ${stat(S.y2, 'کاهش تقریبی مو', 'ls-p')}
        <rect x="${barX}" y="${barY}" width="${S.bw}" height="${narrow ? 16 : 10}" rx="${narrow ? 8 : 5}" class="ls-tr"/>
        <rect x="${barX}" y="${barY}" width="${S.bw}" height="${narrow ? 16 : 10}" rx="${narrow ? 8 : 5}" class="ls-f" style="transform-origin:${barX + S.bw}px ${barY}px"/>
        ${stat(S.y3, 'زمان تقریبی از جلسه‌ی اول', 'ls-t')}
      </g>
    </svg>`);
    const svg = $('svg', cv), paths = $$('.ls-hairs path', svg);
    const ctl = document.createElement('div'); ctl.className = 'mg-range';
    ctl.innerHTML = '<div class="mg-range__row"><span>جلسه‌ها را جلو ببرید</span><b class="ls-rv"></b></div><input type="range" min="0" max="8" step="1" value="0" aria-label="تعداد جلسه‌های لیزر">';
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    const range = $('input', ctl);
    let n = 0, area = AREAS[0];
    const r5 = (v) => Math.round(v / 5) * 5;
    const when = (k) => {
      if (k <= 1) return k ? 'همان روز' : '—';
      const w = (k - 1) * (area[2] + area[3]) / 2;
      return w < 9 ? `حدود ${fa(Math.round(w))} هفته` : `حدود ${fa(Math.round(w / 4.3))} ماه`;
    };
    const paint = () => {
      const keep = P.n * Math.pow(0.8, n), op = Math.max(0.5, 1 - 0.065 * n);
      paths.forEach((p) => { const on = +p.dataset.r < keep; p.style.opacity = on ? op : 0; });
      $('.ls-n', svg).textContent = n ? `جلسه‌ی ${fa(n)}` : 'قبل از شروع';
      $('.ls-p', svg).textContent = n ? `حدود ${fa(r5((1 - Math.pow(0.8, n)) * 100))}٪` : '—';
      $('.ls-f', svg).style.transform = `scaleX(${(1 - Math.pow(0.8, n)).toFixed(3)})`;
      $('.ls-t', svg).textContent = when(n);
      $('.ls-rv', ctl).textContent = n ? `${fa(n)} جلسه` : 'هنوز شروع نشده';
      const gap = `فاصله‌ی جلسه‌ها برای ${area[1]}: هر ${fa(area[2])} تا ${fa(area[3])} هفته.`;
      out.innerHTML = n === 0 ? `<b>قبل از شروع:</b> موها پرپشت‌اند و در مرحله‌های مختلف رشد. ${gap}`
        : n < 3 ? `<b>جلسه‌های اول:</b> بخشی از موها می‌ریزند و بعضی نازک‌تر برمی‌گردند؛ هنوز برای قضاوت زود است. ${gap}`
          : n < 6 ? `<b>وسط دوره:</b> تفاوت آشکار است؛ موهای باقی‌مانده نازک‌تر، کم‌رنگ‌تر و کندتر رشد می‌کنند. ${gap}`
            : `<b>پایان دوره‌ی اصلی:</b> بیشتر موها رفته‌اند و بقیه نازک و کم‌رنگ‌اند. ممکن است بعدها سالی یکی دو جلسه‌ی یادآور لازم شود.${area[0] === 'face' ? ' موهای هورمونی صورت گاهی جلسه‌های بیشتری می‌خواهند.' : ''}`;
    };
    let sweep = 0;
    const setN = (v) => { n = v; range.value = String(v); paint(); };
    range.addEventListener('input', () => { clearInterval(sweep); setN(+range.value); });
    const sg = seg(cv, AREAS.map((a) => [a[0], a[1]]), (k) => { area = AREAS.find((a) => a[0] === k); paint(); });
    cv.appendChild(ctl); cv.appendChild(out);
    setN(anim() ? 0 : 6);
    let first = true;
    return {
      show(v) {
        if (!v || !first) return; first = false;
        if (!anim()) return;
        let k = 0; sweep = setInterval(() => { k += 1; setN(k); if (k >= 6) clearInterval(sweep); }, 520);
      },
      destroy() { clearInterval(sweep); }
    };
  };

  /* ==========================================================================
     سرم‌تراپی: نشانه‌های کم‌آبی را انتخاب کنید؛ لیوان آب بدن و درجه‌ی کم‌آبی تغییر می‌کند (راهنما، نه تشخیص)
     ========================================================================== */
  B['dehydration-check'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const SY = [['thirst', 'تشنگی زیاد', 1], ['urine', 'ادرار کم یا پررنگ', 1], ['mouth', 'دهان و لب خشک', 1], ['tired', 'خستگی و سردرد', 1],
      ['dizzy', 'سرگیجه وقتی بلند می‌شوید', 2], ['pulse', 'ضربان تند یا تنفس سریع', 2], ['vomit', 'هیچ مایعی در معده نمی‌ماند', 3],
      ['nopee', '۸ ساعت یا بیشتر ادرار نکرده‌اید', 3], ['confused', 'گیجی یا خواب‌آلودگی شدید', 9], ['blood', 'استفراغ خونی یا مدفوع سیاه', 9]];
    const LV = [
      ['خوب', 'خوب', '#0E8F6B', 0.86, '<b>نشانه‌ای انتخاب نشده.</b> اگر حالتان خوب است و ادرارتان کم‌رنگ است، بدنتان احتمالاً آب کافی دارد. در روزهای گرم و وقت بیماری، مایعات را بیشتر کنید.'],
      ['کم‌آبی خفیف', 'خفیف', '#B98F00', 0.62, '<b>کم‌آبی خفیف:</b> معمولاً در خانه جبران می‌شود. ORS یا آب را جرعه‌جرعه و مرتب بنوشید و استراحت کنید. اگر تا چند ساعت بهتر نشدید یا نشانه‌ی تازه‌ای اضافه شد، سر بزنید.'],
      ['کم‌آبی متوسط', 'متوسط', '#E0701F', 0.38, '<b>کم‌آبی متوسط:</b> بهتر است معاینه شوید. اگر مایعات را نگه نمی‌دارید یا سرگیجه دارید، ممکن است پزشک سرم تجویز کند.'],
      ['نشانه‌ی خطر', 'شدید', '#D6453D', 0.16, '<b>نشانه‌ی خطر:</b> همین حالا مراجعه کنید. پزشک عمومی ساسان کلینیک شبانه‌روز در کلینیک است.']
    ];
    const P = narrow
      ? { W: 740, H: 430, gx: 150, gy: 24, gw: 200, gh: 270, tx: 720, t1: 70, t2: 140, fs: 26, big: 42, sx0: 20, sx1: 720, sy: 346, sh: 18, ly: 402, lf: 24, short: true }
      : { W: 740, H: 214, gx: 120, gy: 20, gw: 124, gh: 172, tx: 720, t1: 40, t2: 88, fs: 15, big: 28, sx0: 270, sx1: 720, sy: 128, sh: 12, ly: 164, lf: 13 };
    const gl = P.gx - P.gw / 2, gr = P.gx + P.gw / 2, gb = P.gy + P.gh, ins = P.gw * 0.1;
    const glass = `M${gl} ${P.gy} L ${gr} ${P.gy} L ${gr - ins} ${gb - 10} Q ${gr - ins} ${gb}, ${gr - ins - 10} ${gb} L ${gl + ins + 10} ${gb} Q ${gl + ins} ${gb}, ${gl + ins} ${gb - 10} Z`;
    const sw = (P.sx1 - P.sx0) / 4;
    const segs = LV.map((l, i) => { const x = P.sx1 - (i + 1) * sw; return `<rect x="${x + 4}" y="${P.sy}" width="${sw - 8}" height="${P.sh}" rx="${P.sh / 2}" class="dc-seg" data-i="${i}" style="--c:${l[2]}"/><text x="${x + sw / 2}" y="${P.ly}" text-anchor="middle" font-size="${P.lf}" class="dc-sl" data-i="${i}">${P.short ? l[1] : l[0]}</text>`; }).join('');
    const wv = P.gw * 2, amp = narrow ? 8 : 5;
    let wave = `M${gl - P.gw} 0`;
    for (let x = 0; x < wv * 1.5; x += P.gw / 2) wave += ` q ${P.gw / 4} ${-amp}, ${P.gw / 2} 0 t ${P.gw / 2} 0`;
    put(cv, `<svg class="mg-dc" viewBox="0 0 ${P.W} ${P.H}" role="img" aria-label="وضعیت آب بدن بر اساس نشانه‌های انتخاب‌شده">
      <defs><clipPath id="dcClip"><path d="${glass}"/></clipPath></defs>
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        <path d="${glass}" class="dc-glass-bg"/>
        <g clip-path="url(#dcClip)"><g class="dc-water"><g class="dc-wave"><path d="${wave} L ${gl + wv * 1.5} ${P.gh + 40} L ${gl - P.gw} ${P.gh + 40} Z"/></g></g></g>
        <path d="${glass}" class="dc-glass"/>
        <path d="M${gl + ins * 0.9} ${P.gy + 14} L ${gl + ins * 1.5} ${gb - 22}" class="dc-shine"/>
        <text x="${P.tx}" y="${P.t1}" text-anchor="start" font-size="${P.fs}" class="dc-k">وضعیت آب بدن</text>
        <text x="${P.tx}" y="${P.t2}" text-anchor="start" font-size="${P.big}" class="dc-lv"></text>
        ${segs}
        <path class="dc-ptr" d="M${-(narrow ? 13 : 8)} ${P.sy - (narrow ? 22 : 14)} L ${narrow ? 13 : 8} ${P.sy - (narrow ? 22 : 14)} L 0 ${P.sy - 4} Z"/>
      </g>
    </svg>`);
    const svg = $('svg', cv), water = $('.dc-water', svg), ptr = $('.dc-ptr', svg), lvT = $('.dc-lv', svg);
    const box = document.createElement('div'); box.className = 'mg-chips dc-chips';
    box.innerHTML = SY.map(([k, t, w]) => `<button type="button" data-k="${k}" aria-pressed="false" style="--c:${w >= 9 ? '#D6453D' : w >= 3 ? '#E0701F' : w >= 2 ? '#C98A00' : '#B98F00'}"><i></i>${t}${w >= 9 ? '<small>فوری</small>' : ''}</button>`).join('') + '<button type="button" class="mg-chips__reset" data-k="reset" hidden>پاک کردن</button>';
    const out = document.createElement('p'); out.className = 'mg-out dc-out'; out.setAttribute('aria-live', 'polite');
    cv.appendChild(box); cv.appendChild(out);
    const btns = $$('button[data-k]:not([data-k="reset"])', box), reset = $('[data-k="reset"]', box);
    const on = new Set();
    let cur = -1;
    const paint = () => {
      const score = [...on].reduce((a, k) => a + SY.find((s) => s[0] === k)[2], 0);
      const lv = score === 0 ? 0 : score <= 2 ? 1 : score <= 5 ? 2 : 3;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(on.has(b.dataset.k))));
      reset.hidden = !on.size;
      const L = LV[lv];
      water.style.transform = `translateY(${(P.gy + P.gh * (1 - L[3])).toFixed(1)}px)`;
      svg.style.setProperty('--lv', L[2]); out.style.setProperty('--lv', L[2]);
      $$('.dc-seg', svg).forEach((s) => s.classList.toggle('is-on', +s.dataset.i === lv));
      $$('.dc-sl', svg).forEach((s) => s.classList.toggle('is-on', +s.dataset.i === lv));
      ptr.style.transform = `translateX(${(P.sx1 - (lv + 0.5) * sw).toFixed(1)}px)`;
      if (lv !== cur) { lvT.textContent = L[0]; play(lvT, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 450, fill: 'none' }); cur = lv; }
      out.innerHTML = L[4] + (on.has('blood') ? ' با خون در استفراغ یا مدفوع سیاه، با اورژانس <b>۱۱۵</b> تماس بگیرید.' : '');
    };
    let demo = [];
    /* اگر کاربر وسط نمایش کوتاه چیزی را بزند، انتخاب‌های نمایشی پاک می‌شوند و فقط انتخاب خودش می‌ماند */
    const stopDemo = () => { if (demo.length) on.clear(); demo.forEach(clearTimeout); demo = []; };
    btns.forEach((b) => b.addEventListener('click', () => { stopDemo(); const k = b.dataset.k; if (on.has(k)) on.delete(k); else on.add(k); paint(); }));
    reset.addEventListener('click', () => { stopDemo(); on.clear(); paint(); });
    paint();
    let first = true;
    return {
      show(v) {
        svg.classList.toggle('is-on', !!v);
        if (!v || !first || !anim()) return; first = false;
        /* یک نمایش کوتاه: چند نشانه انتخاب و دوباره پاک می‌شود تا روش کار دیده شود */
        [['thirst', 700], ['urine', 1400], ['dizzy', 2100]].forEach(([k, t]) => demo.push(setTimeout(() => { on.add(k); paint(); }, t)));
        demo.push(setTimeout(() => { on.clear(); paint(); demo = []; }, 4600));
      },
      destroy() { stopDemo(); }
    };
  };

  /* ==========================================================================
     سرم‌تراپی: یک لیتر از هر سرم چند ساعت بعد کجای بدن است (رگ‌ها، بین سلول‌ها، داخل سلول‌ها؛ تقریبی)
     ========================================================================== */
  B['iv-fluids'] = (fig, narrow) => {
    const cv = $('.ap-mg__cv', fig);
    const F = [
      ['ns', 'سرم نمکی', 'آب، سدیم و کلر', [250, 750, 0], 'حدود یک‌چهارم در رگ‌ها می‌ماند و بقیه به بافت بین سلول‌ها می‌رود؛ وارد سلول‌ها نمی‌شود. برای جبران کم‌آبی ناشی از اسهال و استفراغ و افت فشار مناسب است.'],
      ['rl', 'رینگر', 'آب، سدیم، کلر، پتاسیم، کلسیم و لاکتات', [250, 750, 0], 'در بدن مثل سرم نمکی پخش می‌شود، اما ترکیبش به پلاسمای خون نزدیک‌تر است. وقتی مقدار زیادی مایع لازم است، اغلب انتخاب بهتری است.'],
      ['d5', 'سرم قندی ۵٪', 'آب و قند (گلوکز)', [80, 250, 670], 'قندش مصرف می‌شود و آب خالص می‌ماند که بیشترش وارد سلول‌ها می‌شود و فقط کمی در رگ‌ها می‌ماند. برای بالا بردن فشار مناسب نیست و جای غذا را هم نمی‌گیرد.'],
      ['dn', 'قندی‌نمکی', 'آب، قند، سدیم و کلر (با غلظت کمتر)', [140, 420, 440], 'رفتارش بین سرم نمکی و قندی است: بخشی در رگ و بافت‌ها می‌ماند و بخشی وارد سلول‌ها می‌شود. بیشتر برای نیاز روزانه‌ی آب در کسی است که نمی‌تواند بنوشد.']
    ];
    const TK = [['داخل رگ‌ها', 'dv'], ['بین سلول‌ها', 'di'], ['داخل سلول‌ها', 'dc']];
    const P = narrow
      ? { W: 740, H: 640, bx: 560, by: 16, bw: 140, bh: 180, my: 262, ty: 296, th: 250, tw: 212, tx: [508, 264, 20], fs: 26, vf: 30 }
      : { W: 740, H: 326, bx: 604, by: 12, bw: 96, bh: 132, my: 196, ty: 62, th: 210, tw: 132, tx: [424, 262, 100], fs: 14, vf: 19 };
    const bL = P.bx, bR = P.bx + P.bw, bT = P.by + (narrow ? 22 : 16), bB = P.by + P.bh;
    const cx = (bL + bR) / 2, chT = bB + (narrow ? 34 : 22), chH = narrow ? 56 : 40, chW = narrow ? 32 : 22;
    const tank = (i) => {
      const x = P.tx[i], y = narrow ? P.ty : P.ty, h = P.th;
      return `<g class="fl-t fl-t--${TK[i][1]}">
        <rect x="${x}" y="${y}" width="${P.tw}" height="${h}" rx="${narrow ? 22 : 16}" class="fl-tb"/>
        <rect x="${x}" y="${y}" width="${P.tw}" height="${h}" rx="${narrow ? 22 : 16}" class="fl-pt" fill="url(#flP-${TK[i][1]})"/>
        <g clip-path="url(#flC${i})"><rect x="${x}" y="${y}" width="${P.tw}" height="${h}" class="fl-f" style="transform-origin:0px ${y + h}px"/></g>
        <text x="${x + P.tw / 2}" y="${y + h + P.fs * 1.7}" text-anchor="middle" font-size="${P.fs}" class="fl-l">${TK[i][0]}</text>
        <text x="${x + P.tw / 2}" y="${y + P.vf * 1.5}" text-anchor="middle" font-size="${P.vf}" class="fl-v"></text>
      </g>`;
    };
    /* لوله: سرم اول وارد رگ‌ها می‌شود؛ پیکان‌ها جابه‌جایی آب از رگ به بین سلول‌ها و از آن‌جا به داخل سلول‌ها را نشان می‌دهند */
    const vR = P.tx[0] + P.tw, ey = P.ty + P.th * 0.8;
    const tube = narrow ? `M${cx} ${chT + chH} L ${cx} ${P.ty}`
      : `M${cx} ${chT + chH} L ${cx} ${ey - 14} Q ${cx} ${ey}, ${cx - 14} ${ey} L ${vR} ${ey}`;
    const ay = P.ty + P.th / 2, as = narrow ? 11 : 7;
    const arrow = (i) => { const x = (P.tx[i] + P.tx[i + 1] + P.tw) / 2; return `<g class="fl-ar fl-ar--${i + 1}">${[-1, 1].map((d) => `<path d="M${x + as * 0.6} ${ay + d * as * 2.2 - as} L ${x - as * 0.6} ${ay + d * as * 2.2} L ${x + as * 0.6} ${ay + d * as * 2.2 + as}"/>`).join('')}</g>`; };
    put(cv, `<svg class="mg-fl" viewBox="0 0 ${P.W} ${P.H}" data-s="ns" role="img" aria-label="پخش شدن یک لیتر سرم در بخش‌های مختلف بدن">
      <defs>
        <clipPath id="flBag"><rect x="${bL + 4}" y="${bT + 4}" width="${P.bw - 8}" height="${bB - bT - 8}" rx="${narrow ? 16 : 11}"/></clipPath>
        ${[0, 1, 2].map((i) => `<clipPath id="flC${i}"><rect x="${P.tx[i]}" y="${P.ty}" width="${P.tw}" height="${P.th}" rx="${narrow ? 22 : 16}"/></clipPath>`).join('')}
        <pattern id="flP-dv" width="30" height="26" patternUnits="userSpaceOnUse"><ellipse cx="8" cy="8" rx="6" ry="3.6"/><ellipse cx="23" cy="20" rx="6" ry="3.6"/></pattern>
        <pattern id="flP-di" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6"/><circle cx="13" cy="12" r="1.6"/></pattern>
        <pattern id="flP-dc" width="44" height="40" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="11"/><circle cx="14" cy="14" r="3.5"/><circle cx="36" cy="33" r="9"/></pattern>
      </defs>
      <g font-family="IBM Plex Sans Arabic, Vazirmatn, sans-serif" direction="rtl">
        <path d="${tube}" class="fl-tube"/>
        <rect x="${cx - (narrow ? 12 : 8)}" y="${P.by - 6}" width="${narrow ? 24 : 16}" height="${narrow ? 22 : 16}" rx="5" class="fl-hook"/>
        <rect x="${bL}" y="${bT}" width="${P.bw}" height="${bB - bT}" rx="${narrow ? 20 : 14}" class="fl-bag"/>
        <g clip-path="url(#flBag)"><rect x="${bL}" y="${bT}" width="${P.bw}" height="${bB - bT}" class="fl-liq" style="transform-origin:0px ${bB}px"/></g>
        <text x="${cx}" y="${bT + (bB - bT) * 0.42}" text-anchor="middle" font-size="${P.fs * 0.95}" class="fl-bt">۱ لیتر</text>
        <text x="${cx}" y="${bT + (bB - bT) * 0.42 + P.fs * 1.3}" text-anchor="middle" font-size="${P.fs * 0.8}" class="fl-bn"></text>
        <path d="M${cx - 6} ${bB} L ${cx - 6} ${chT} M${cx + 6} ${bB} L ${cx + 6} ${chT}" class="fl-neck"/>
        <rect x="${cx - chW / 2}" y="${chT}" width="${chW}" height="${chH}" rx="${chW / 3}" class="fl-ch"/>
        <circle cx="${cx}" cy="${chT + 8}" r="${narrow ? 5 : 3.5}" class="fl-drop"/>
        ${[0, 1, 2].map(tank).join('')}
        ${arrow(0)}${arrow(1)}
      </g>
    </svg>`);
    const svg = $('svg', cv), liq = $('.fl-liq', svg), fills = $$('.fl-f', svg), vals = $$('.fl-v', svg);
    const out = document.createElement('p'); out.className = 'mg-out'; out.setAttribute('aria-live', 'polite');
    let prev = null;
    const apply = (k) => {
      const f = F.find((x) => x[0] === k);
      svg.dataset.s = k; sg.set(k);
      $('.fl-bn', svg).textContent = f[1];
      out.innerHTML = `<b>${f[1]}</b> <span class="fl-mix">(${f[2]})</span>: ${f[4]}`;
      const D = 1900;
      liq.style.transform = 'scaleY(.1)';
      play(liq, [{ transform: `scaleY(${prev ? 0.1 : 1})` }, { transform: 'scaleY(1)', offset: 0.14 }, { transform: 'scaleY(.1)' }], { duration: D, easing: 'cubic-bezier(.45, 0, .3, 1)', fill: 'none' });
      f[3].forEach((v, i) => {
        const s = v / 1000;
        fills[i].style.transform = `scaleY(${s})`;
        const p0 = prev ? prev[3][i] / 1000 : 0;
        play(fills[i], [{ transform: `scaleY(${p0})` }, { transform: 'scaleY(0)', offset: 0.18 }, { transform: `scaleY(${s})` }], { duration: D, easing: 'cubic-bezier(.45, 0, .3, 1)', fill: 'none' });
        vals[i].textContent = v ? `${fa(v)} میلی‌لیتر` : 'تقریباً هیچ';
        play(vals[i], [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: D * 0.7, fill: 'backwards' });
      });
      prev = f;
    };
    const c = cycler(F.map((x) => x[0]), (k) => apply(k), 5600);
    const sg = seg(cv, F.map((x) => [x[0], x[1]]), (k) => { c.pick(k); apply(k); });
    cv.appendChild(out);
    let started = false;
    const first = () => { if (started) return; started = true; apply('ns'); };
    if (!anim()) first();
    return { show(v) { svg.classList.toggle('is-on', !!v); if (v) first(); c.show(v); }, destroy() { c.stop(); } };
  };

  /* هر نمودار دو چیدمان دارد: پهن و باریک (متن درشت‌تر برای گوشی)؛ اگر پهنا از مرز رد شود، از نو ساخته می‌شود */
  S.MG = {
    build(el) {
      const f = B[el.dataset.mg];
      if (!f) return null;
      const cv = $('.ap-mg__cv', el);
      let inst = null, narrow = null, vis = false;
      const make = () => {
        const n = (cv.clientWidth || el.clientWidth) < 560;
        if (inst && n === narrow) return;
        narrow = n;
        if (inst && inst.destroy) inst.destroy();
        cv.innerHTML = '';
        el.classList.toggle('is-narrow', n);
        inst = f(el, n) || {};
        if (vis && inst.show) inst.show(true);
      };
      make();
      if ('ResizeObserver' in window) { let rt = 0; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(make, 150); }).observe(el); }
      return { show(v) { vis = v; if (inst && inst.show) inst.show(v); } };
    }
  };
})();
