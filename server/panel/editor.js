/* ==========================================================================
   پنل پذیرش: مقاله‌ها (فهرست و ویرایشگر)
   - فهرست همه‌ی مقاله‌های سایت و پنل با وضعیت: در سایت، پیش‌نویس، برداشته از سایت، ویرایش‌شده
   - ویرایشگر: بخش، عنوان، مقدمه، عکس اصلی، متن با نوار ابزار (تیتر، فهرست، لینک، کادر نکته و هشدار، عکس)،
     خلاصه، سؤال‌های پرتکرار، نشانی صفحه، پیش‌نمایش گوگل و امتیاز سئو با فهرست کارهای مانده
   - «انتشار» همان لحظه صفحه‌ی مقاله، فهرست مقاله‌ها، صفحه‌ی اصلی و صفحه‌ی بخش را در سایت به‌روز می‌کند (server/lib/cms.js)
   - عکس‌ها همین‌جا در سه اندازه‌ی WebP ساخته و فرستاده می‌شوند؛ نوشته‌ی ذخیره‌نشده هر چند ثانیه در همین مرورگر نگه داشته می‌شود
   بدون استایل درون‌خطی (CSP پنل)؛ اندازه‌ها و رنگ‌ها با CSSOM.
   ========================================================================== */
(() => {
  'use strict';
  window.SasanArticles = (X) => {
    const { $, $$, ic, esc, fa, call, toast, busy, openModal, closeModal, confirmBox, errText, relDay, DEMO, rerender } = X;
    const SITE = DEMO ? (location.pathname.includes('/panel/') ? '../' : './') : '/';
    const CATS = { dental: 'دندانپزشکی', beauty: 'زیبایی و لیزر', medicine: 'پزشکی عمومی' };
    const CAT_IC = { dental: 'i-tooth', beauty: 'i-sparkles', medicine: 'i-steth' };
    const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const PAGES = [['dental.html', 'دندانپزشکی در سلمان‌شهر'], ['beauty.html', 'زیبایی و لیزر'], ['medicine.html', 'پزشک عمومی شبانه‌روزی'],
      ['contact.html', 'آدرس و تماس'], ['doctors.html', 'پزشکان'], ['faq.html', 'سؤال‌های پرتکرار'], ['cases.html', 'نمونه‌کارها'], ['articles.html', 'همه‌ی مقاله‌ها']];
    const upUrls = {};
    const imgUrl = (p) => (/^(data:|\/|https?:)/.test(p || '') ? p : SITE + p);
    const artSrc = (base, w = 1280) => upUrls[base] || imgUrl(`${base}-${w}.webp`);
    const parse = (h) => new DOMParser().parseFromString('<!doctype html><body>' + (h || '') + '</body>', 'text/html').body;
    const plain = (h) => parse(h).textContent.replace(/\s+/g, ' ').trim();
    const nWords = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);
    const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trim() + '…' : s);
    const LS = 'sasan-ed:';
    const store = {
      get: (k) => { try { return JSON.parse(localStorage.getItem(LS + k) || 'null'); } catch (e) { return null; } },
      set: (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* حافظه‌ی مرورگر در دسترس نیست */ } },
      del: (k) => { try { localStorage.removeItem(LS + k); } catch (e) { /* */ } }
    };

    let list = null, loading = false, filter = 'all', ED = null, raf = 0, range = null;
    const sub = () => { const m = /^#\/articles\/(?:(new)|edit\/([a-z0-9-]+))\/?$/.exec(location.hash); return m ? { slug: m[2] || '', isNew: !!m[1] } : null; };
    const srcLabel = (a) => (a.src === 'panel' ? 'نوشته‌ی پنل' : a.src === 'edited' ? 'مقاله‌ی سایت، ویرایش‌شده در پنل' : 'مقاله‌ی سایت');
    const stateOf = (a) => (a.hidden ? (a.src === 'panel' ? 'پیش‌نویس' : 'برداشته از سایت') : 'در سایت');

    /* ==========================================================================
       فهرست
       ========================================================================== */
    async function load() {
      if (loading) return;
      loading = true;
      const r = await call('get', '/articles');
      loading = false;
      if (!r.ok) { toast(errText(r), true); return; }
      list = r.articles;
      if (X.route() === 'articles' && !sub()) rerender('none');
    }
    function card(a) {
      const badge = a.hidden ? `<i class="acard__badge is-off">${esc(stateOf(a))}</i>` : a.src !== 'site' ? `<i class="acard__badge">${a.src === 'panel' ? 'نوشته‌ی پنل' : 'ویرایش‌شده'}</i>` : '';
      return `<a class="acard ${esc(a.k)}${a.hidden ? ' is-off' : ''}" href="#/articles/edit/${esc(a.slug)}" data-key="art-${esc(a.slug)}">
        <span class="acard__img"><img src="${esc(imgUrl(a.cover))}" alt="" loading="lazy" decoding="async">${badge}</span>
        <span class="acard__b">
          <span class="acard__meta"><span class="dchip ${esc(a.k)}">${ic(CAT_IC[a.k])}${esc(CATS[a.k] || a.k)}</span><small>${fa(a.mins)} دقیقه · ${fa(a.words)} کلمه</small></span>
          <b class="acard__t">${esc(a.title)}</b>
          <small class="acard__by">${a.updated ? 'به‌روز ' + esc(relDay(a.updated)) : esc(srcLabel(a))}${a.savedBy ? ' · ' + esc(a.savedBy) : ''}</small>
        </span>
        <span class="acard__go">${ic('i-pencil', 'ic--s')}ویرایش</span>
      </a>`;
    }
    function listView() {
      const head = `<header class="ph"><div><h1>مقاله‌ها</h1><p>هر مقاله‌ای که این‌جا منتشر کنید همان لحظه در سایت است: صفحه‌ی خودش، فهرست مقاله‌ها، صفحه‌ی اصلی و صفحه‌ی بخش. شمار مقاله‌ها و بخش‌ها هم خودکار به‌روز می‌شود.</p></div><span class="sp"></span>
        <a class="btn btn--pri" href="#/articles/new">${ic('i-plus')}<span>مقاله‌ی تازه</span></a></header>`;
      if (!list) { load(); return head + '<div class="tiles">' + '<div class="skel skel--tile"></div>'.repeat(3) + '</div><div class="agrid">' + '<div class="skel skel--card"></div>'.repeat(6) + '</div>'; }
      const pub = list.filter((a) => !a.hidden), off = list.filter((a) => a.hidden);
      const n = (k) => pub.filter((a) => a.k === k).length;
      const last = pub.reduce((m, a) => (a.updated > m ? a.updated : m), '');
      const shown = list.filter((a) => (filter === 'hidden' ? a.hidden : !a.hidden && (filter === 'all' || a.k === filter)));
      const seg = (k, t, c) => `<button type="button" data-act="edf" data-v="${k}" aria-pressed="${filter === k}">${t}<em>${fa(c)}</em></button>`;
      return head + `
        <div class="tiles tiles--art">
          <div class="kpi k-blue"><span class="kpi__ic">${ic('i-file')}</span><b class="num" data-count="${pub.length}" data-key="ak1">${fa(pub.length)}</b><span>مقاله در سایت</span><small>${Object.keys(CATS).map((k) => esc(CATS[k]) + ' ' + fa(n(k))).join(' · ')}</small></div>
          <div class="kpi k-violet"><span class="kpi__ic">${ic('i-pencil')}</span><b class="num" data-count="${off.length}" data-key="ak2">${fa(off.length)}</b><span>پیش‌نویس یا برداشته از سایت</span><small>در سایت دیده نمی‌شوند</small></div>
          <div class="kpi k-ok"><span class="kpi__ic">${ic('i-clock')}</span><b class="num" data-count="${pub.reduce((s, a) => s + a.mins, 0)}" data-key="ak3">${fa(pub.reduce((s, a) => s + a.mins, 0))}</b><span>دقیقه مطالعه در مجله</span><small>${last ? 'آخرین به‌روزرسانی: ' + esc(relDay(last)) : '—'}</small></div>
        </div>
        <div class="toolbar"><div class="seg" data-k="art" role="group" aria-label="نمایش مقاله‌ها">${seg('all', 'همه', pub.length)}${Object.keys(CATS).map((k) => seg(k, esc(CATS[k]), n(k))).join('')}${seg('hidden', 'پیش‌نویس‌ها', off.length)}</div></div>
        ${shown.length ? `<div class="agrid">${shown.map(card).join('')}</div>`
          : `<div class="empty"><span class="empty__art">${ic('i-file')}</span><b>${filter === 'hidden' ? 'پیش‌نویسی نیست' : 'مقاله‌ای در این بخش نیست'}</b><span>با «مقاله‌ی تازه» اولین را بنویسید.</span></div>`}`;
    }

    /* ==========================================================================
       ویرایشگر
       ========================================================================== */
    const blank = () => ({ slug: '', k: '', title: '', lead: '', cover: '', coverAlt: '', body: '', seo: '', desc: '', points: [], faq: [], tags: [] });
    async function open(s) {
      const key = location.hash;
      ED = { key, loading: true };
      /* همیشه بعد از پایان render جاری (برای مقاله‌ی تازه هیچ درخواستی نیست) */
      await Promise.resolve();
      let data, meta = { isNew: s.isNew, slug: s.slug, src: 'panel', hidden: true, savedAt: '', savedBy: '', url: '' };
      if (s.isNew) data = blank();
      else {
        const r = await call('get', '/articles/' + s.slug);
        if (location.hash !== key) return;
        if (!r.ok) { toast(r.status === 404 ? 'این مقاله پیدا نشد' : errText(r), true); location.hash = '#/articles'; return; }
        data = r.article;
        if (r.article.coverUrl && data.cover) upUrls[data.cover] = upUrls[data.cover] || imgUrl(r.article.coverUrl);
        meta = { isNew: false, slug: s.slug, src: r.article.src, hidden: r.article.hidden, savedAt: r.article.savedAt, savedBy: r.article.savedBy, url: r.article.url };
      }
      const local = store.get(s.slug || 'new');
      const newer = local && local.data && (s.isNew || local.at > (Date.parse(meta.savedAt) || 0));
      ED = Object.assign({ key, data, cover: data.cover || '', tags: (data.tags || []).slice(), dirty: false, local: newer ? local : null }, meta);
      if (X.route() === 'articles' && location.hash === key) rerender('enter');
    }
    const tb = (v, t, icn, title) => `<button type="button" class="tb${t ? ' tb--t' : ''}" data-ed="${v}" title="${title}" aria-label="${title}">${icn ? ic(icn, 'ic--s') : ''}${t ? `<span>${t}</span>` : ''}</button>`;
    function pubCard() {
      const E = ED;
      const facts = [['وضعیت', E.isNew ? 'هنوز ذخیره نشده' : stateOf(E)], ['منبع', E.isNew ? 'مقاله‌ی تازه' : srcLabel(E)]];
      if (E.savedAt) facts.push(['آخرین ذخیره', relDay(E.savedAt.slice(0, 10)) + (E.savedBy ? ' · ' + E.savedBy : '')]);
      return `<section class="card ed__card" id="edPubCard"><div class="card__h">${ic('i-send')}<h2>انتشار</h2></div><div class="card__b ed__pub">
        <ul class="ed__facts">${facts.map(([k, v]) => `<li><span>${k}</span><b>${esc(v)}</b></li>`).join('')}</ul>
        ${!E.isNew && !E.hidden ? `<a class="btn btn--sec btn--s btn--block" href="${esc(SITE + 'article-' + E.slug + '.html')}" target="_blank" rel="noopener">${ic('i-ext', 'ic--s')}دیدن در سایت</a>` : ''}
        ${!E.isNew ? `<button class="btn btn--ghost btn--s btn--block" type="button" data-act="edhide">${ic(E.hidden ? 'i-eye' : 'i-eye-off', 'ic--s')}${E.hidden ? 'نمایش دوباره در سایت' : 'برداشتن از سایت'}</button>` : ''}
        ${E.src === 'edited' ? `<button class="btn btn--ghost btn--s btn--block" type="button" data-act="edrevert">${ic('i-undo', 'ic--s')}برگرداندن به نسخه‌ی اصلی سایت</button>` : ''}
        ${!E.isNew && E.src === 'panel' ? `<button class="btn btn--bad btn--s btn--block" type="button" data-act="eddel">${ic('i-trash', 'ic--s')}حذف مقاله</button>` : ''}
        <p class="hint">${E.src === 'panel' || E.isNew ? '«ذخیره‌ی پیش‌نویس» مقاله را نگه می‌دارد ولی در سایت نشان نمی‌دهد.' : 'مقاله‌های خود سایت پاک نمی‌شوند؛ می‌توانید از سایت برشان دارید یا به نسخه‌ی اصلی برگردانید.'}</p>
      </div></section>`;
    }
    function barHtml() {
      const E = ED;
      const draft = E.isNew || E.src === 'panel';
      return `<a class="btn btn--ghost btn--s" href="#/articles">${ic('i-arrow-r', 'ic--s')}<span>مقاله‌ها</span></a>
        <span class="ed__state" id="edState"></span><span class="sp"></span>
        ${draft ? `<button class="btn btn--sec btn--s" type="button" data-act="edsave" data-v="draft"><span class="spin"></span><span class="btn__t"><span class="l-long">ذخیره‌ی پیش‌نویس</span><span class="l-short">پیش‌نویس</span></span></button>` : ''}
        <button class="btn btn--pri btn--s" type="button" data-act="edsave" data-v="pub"><span class="spin"></span>${ic('i-send', 'ic--s')}<span class="btn__t"><span class="l-long">${E.isNew || E.hidden ? 'انتشار در سایت' : 'ذخیره و انتشار'}</span><span class="l-short">انتشار</span></span></button>`;
    }
    function edView(s) {
      if (!ED || ED.key !== location.hash) { open(s); return '<div class="skel skel--bar"></div><div class="ed__grid"><div class="ed__main"><div class="skel skel--edh"></div><div class="skel skel--edb"></div></div><div class="ed__side"><div class="skel skel--eds"></div></div></div>'; }
      if (ED.loading) return '<div class="skel skel--bar"></div>';
      const d = ED.data, E = ED;
      const leadTxt = plain(d.lead);
      return `<div class="ed" id="ed">
        <div class="ed__bar" id="edBar">${barHtml()}</div>
        ${E.local ? `<div class="ed__restore" id="edRestore">${ic('i-history')}<span>نوشته‌ی ذخیره‌نشده‌ای از <b>${esc(relDay(new Date(E.local.at).toISOString().slice(0, 10)))}</b> روی همین کامپیوتر مانده است.</span><button class="btn btn--sec btn--s" type="button" data-act="edlocal" data-v="1">بازیابی</button><button class="btn btn--ghost btn--s" type="button" data-act="edlocal" data-v="0">دور ریختن</button></div>` : ''}
        <div class="ed__grid">
          <div class="ed__main">
            <section class="card ed__card ed__head">
              <div class="ed__cats" role="radiogroup" aria-label="بخش مقاله">${Object.keys(CATS).map((k) => `<label class="ecat ${k}"><input type="radio" name="edk" value="${k}" ${d.k === k ? 'checked' : ''}><span>${ic(CAT_IC[k], 'ic--s')}${esc(CATS[k])}</span></label>`).join('')}</div>
              <label class="sr" for="edTitle">عنوان مقاله</label>
              <textarea class="ed__title" id="edTitle" rows="1" maxlength="110" placeholder="عنوان مقاله؛ مثلاً «جرم‌گیری دندان؛ هر چند وقت یک بار؟»">${esc(d.title)}</textarea>
              <div class="ed__cnt" id="cntTitle"></div>
              <label class="sr" for="edLead">مقدمه</label>
              <textarea class="ed__lead" id="edLead" rows="2" maxlength="700" data-h="${esc(d.lead)}" placeholder="مقدمه: دو سه جمله‌ی خودمانی که بگوید این مقاله به چه درد خواننده می‌خورد">${esc(leadTxt)}</textarea>
            </section>
            <section class="card ed__card">
              <div class="card__h">${ic('i-image')}<h2>عکس اصلی</h2><span class="sp"></span><small class="muted">افقی و باکیفیت؛ دست‌کم ۱۶۰۰ پیکسل</small></div>
              <div class="card__b ed__coverb">
                <div class="ed__cover${E.cover ? ' has-img' : ''}" id="edCover">
                  <img id="edCoverImg" alt=""${E.cover ? ` src="${esc(artSrc(E.cover))}"` : ''}>
                  <button class="ed__drop" type="button" data-act="edcover">${ic('i-upload')}<b>${E.cover ? 'عوض کردن عکس' : 'انتخاب عکس اصلی'}</b><small>JPG، PNG یا WebP؛ برای سایت خودکار در سه اندازه آماده می‌شود</small></button>
                  <span class="ed__busy">${ic('i-refresh', 'ic--s')}<span>در حال آماده‌سازی عکس…</span></span>
                </div>
                <label class="field"><span>توضیح عکس برای گوگل و نابینایان (alt)</span><input class="input" id="edAlt" maxlength="160" value="${esc(d.coverAlt || '')}" placeholder="مثلاً: دندانپزشک در حال جرم‌گیری دندان بیمار"></label>
              </div>
            </section>
            <section class="card ed__card ed__bodycard">
              <div class="ed__tools" role="toolbar" aria-label="ابزار متن">
                ${tb('h2', 'تیتر', '', 'تیتر بخش؛ در فهرست مطالب می‌آید')}${tb('h3', 'زیرتیتر', '', 'زیرتیتر')}${tb('p', 'متن', '', 'متن ساده')}<i class="tb__sep"></i>
                ${tb('bold', '', 'i-bold', 'پررنگ (Ctrl+B)')}${tb('italic', '', 'i-italic', 'کج (Ctrl+I)')}${tb('ul', '', 'i-list', 'فهرست نقطه‌ای')}${tb('ol', '', 'i-list-ol', 'فهرست شماره‌دار')}${tb('quote', '', 'i-quote', 'نقل‌قول')}<i class="tb__sep"></i>
                ${tb('link', 'لینک', 'i-link', 'لینک به صفحه یا مقاله‌ی دیگر')}${tb('tip', 'نکته', 'i-bulb', 'کادر نکته')}${tb('warn', 'هشدار', 'i-alert', 'کادر هشدار')}${tb('img', 'عکس', 'i-image', 'عکس داخل متن')}<i class="tb__sep"></i>
                ${tb('undo', '', 'i-undo', 'برگرداندن (Ctrl+Z)')}${tb('redo', '', 'i-redo', 'دوباره (Ctrl+Y)')}
              </div>
              <div class="ed__doc" id="edDoc" contenteditable="true" role="textbox" aria-multiline="true" aria-label="متن مقاله" spellcheck="true" data-ph="متن مقاله را این‌جا بنویسید. با «تیتر» مقاله را به چند بخش تقسیم کنید؛ هر تیتر در فهرست مطالب می‌آید."></div>
              <div class="ed__stats" id="edStats" aria-live="polite"></div>
            </section>
            <section class="card ed__card">
              <div class="card__h">${ic('i-sparkles')}<h2>خلاصه در چند خط</h2><span class="sp"></span><small class="muted">بالای متن، در کادر «خلاصه»</small></div>
              <div class="card__b"><ol class="ed__pts" id="edPoints"></ol><button class="btn btn--ghost btn--s" type="button" data-act="edadd" data-v="points">${ic('i-plus', 'ic--s')}یک خط دیگر</button></div>
            </section>
            <section class="card ed__card">
              <div class="card__h">${ic('i-help')}<h2>سؤال‌های پرتکرار</h2><span class="sp"></span><small class="muted">در گوگل هم به‌شکل سؤال و جواب نشان داده می‌شود</small></div>
              <div class="card__b"><div class="ed__faq" id="edFaq"></div><button class="btn btn--ghost btn--s" type="button" data-act="edadd" data-v="faq">${ic('i-plus', 'ic--s')}سؤال دیگر</button></div>
            </section>
          </div>
          <aside class="ed__side">
            <section class="card ed__card">
              <div class="card__h">${ic('i-search')}<h2>در گوگل این‌طور دیده می‌شود</h2></div>
              <div class="card__b ed__seo">
                <div class="serp" aria-hidden="true"><div class="serp__site"><span class="serp__fav"><img src="${DEMO ? SITE + 'img/icon-192.png' : '/img/icon-192.png'}" alt=""></span><span><b>ساسان کلینیک</b><small id="serpUrl"></small></span></div><b class="serp__t" id="serpT"></b><p class="serp__d" id="serpD"></p></div>
                <label class="field"><span>عنوان در گوگل</span><input class="input" id="edSeo" maxlength="90" value="${esc(d.seo || '')}"><i class="meter" id="mSeo"><i></i></i><small id="cSeo"></small></label>
                <label class="field"><span>توضیح در گوگل</span><textarea class="input" id="edDesc" rows="3" maxlength="220">${esc(d.desc || '')}</textarea><i class="meter" id="mDesc"><i></i></i><small id="cDesc"></small></label>
                <div class="field"><label class="flabel" for="edTagIn">کلمه‌های کلیدی</label><div class="tags" id="edTags"></div><small>اولی کلمه‌ی کلیدی اصلی است، مثلاً «جرم‌گیری دندان»؛ با Enter اضافه می‌شود.</small></div>
                ${E.isNew ? `<label class="field"><span>نشانی صفحه</span><span class="slug"><span class="slug__pre" dir="ltr">…/article-</span><input class="input input--ltr" id="edSlug" maxlength="60" value="${esc(d.slug || '')}" autocapitalize="none" spellcheck="false" placeholder="scaling-guide"><button class="btn btn--ghost btn--s" type="button" data-act="edslug">خودکار</button></span><small>چند کلمه‌ی انگلیسی با خط تیره. بعد از انتشار عوض نمی‌شود.</small></label>`
                  : `<div class="field"><span class="flabel">نشانی صفحه</span><span class="slug slug--ro" dir="ltr">sasan-clinic.ir/${esc(E.url || 'article-' + E.slug + '.html')}</span></div>`}
              </div>
            </section>
            <section class="card ed__card">
              <div class="card__h">${ic('i-check-circle')}<h2>امتیاز سئو</h2></div>
              <div class="card__b"><div class="score" id="edScore"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" class="score__bg"/><circle cx="32" cy="32" r="27" class="score__fg" id="scoreFg"/></svg><b class="num" id="scoreN">۰</b><div><b id="scoreT"></b><small>هر مورد سبز، شانس دیده شدن در گوگل را بیشتر می‌کند.</small></div></div><ul class="checks" id="edChecks"></ul></div>
            </section>
            ${pubCard()}
          </aside>
        </div>
      </div>`;
    }

    /* ---------- بعد از قرار گرفتن در صفحه ---------- */
    const CHECKS = [
      ['title', 'عنوان روشن، ۲۰ تا ۷۰ نویسه', 'عنوان کوتاه و روشن در نتیجه‌ی گوگل کامل دیده می‌شود.'],
      ['kw', 'کلمه‌ی کلیدی اصلی در عنوان', 'اولین کلمه‌ی کلیدی را عیناً در عنوان بیاورید.'],
      ['seo', 'عنوان گوگل ۳۵ تا ۶۵ نویسه', 'بلندتر از این در نتیجه‌ی جست‌وجو بریده می‌شود.'],
      ['desc', 'توضیح گوگل ۱۱۰ تا ۱۶۰ نویسه', 'دو جمله که بگوید این صفحه چه جوابی می‌دهد.'],
      ['local', 'نام سلمان‌شهر یا متل‌قو در متن', 'برای جست‌وجوهای محلی مثل «دندانپزشکی سلمان‌شهر».'],
      ['words', 'دست‌کم ۶۰۰ کلمه', 'مقاله‌ی کامل‌تر در گوگل بالاتر می‌آید.'],
      ['h2', 'دست‌کم ۳ تیتر', 'تیترها خواندن را راحت و فهرست مطالب را کامل می‌کنند.'],
      ['cover', 'عکس اصلی با توضیح (alt)', 'گوگل عکس را از روی توضیحش می‌شناسد.'],
      ['link', 'لینک به صفحه‌ی دیگری از سایت', 'مثلاً به صفحه‌ی بخش یا مقاله‌ی مرتبط.'],
      ['faq', 'دست‌کم ۲ سؤال پرتکرار', 'سؤال و جواب‌ها در خود نتیجه‌ی گوگل هم دیده می‌شوند.'],
      ['points', 'خلاصه در چند خط', 'خواننده‌ی عجول در چند ثانیه جواب را می‌گیرد.']
    ];
    function after(v) {
      if (!ED || ED.loading || !$('#ed', v)) return;
      const doc = $('#edDoc', v);
      doc.innerHTML = toEditor(ED.data.body || '');
      try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* */ }
      $('#edPoints', v).innerHTML = (ED.data.points || []).map(ptRow).join('');
      $('#edFaq', v).innerHTML = (ED.data.faq || []).map(qaRow).join('');
      if (!(ED.data.points || []).length) $('#edPoints', v).innerHTML = ptRow('') + ptRow('');
      if (!(ED.data.faq || []).length) $('#edFaq', v).innerHTML = qaRow({ q: '', a: '' }) + qaRow({ q: '', a: '' });
      drawTags();
      $('#edChecks', v).innerHTML = CHECKS.map(([k, t, tip]) => `<li data-k="${k}"><i>${ic('i-check', 'ic--s')}</i><span><b>${t}</b><small>${tip}</small></span></li>`).join('');
      $$('textarea', v).forEach(grow);
      doc.addEventListener('paste', onPaste);
      doc.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); saveRange(); pickFile('body', e.dataTransfer.files[0]); } });
      doc.addEventListener('keydown', (e) => {
        /* Enter در انتهای تیتر: خط بعدی متن ساده است */
        if (e.key === 'Enter' && !e.shiftKey) setTimeout(() => { const b = blockEl(); if (b && /^H[23]$/.test(b.nodeName) && !b.textContent.trim()) document.execCommand('formatBlock', false, '<p>'); }, 0);
      });
      upd(true);
    }

    /* ---------- تبدیل متن برای ویرایشگر و برگشت ---------- */
    function toEditor(html) {
      const b = parse(html);
      $$('img[data-art]', b).forEach((im) => { im.setAttribute('src', artSrc(im.getAttribute('data-art'), 720)); im.setAttribute('loading', 'lazy'); });
      $$('figure.ap-mg', b).forEach((f) => { f.setAttribute('contenteditable', 'false'); f.setAttribute('title', 'نمودار تعاملی سایت؛ همین‌جا می‌ماند (با Delete پاک می‌شود)'); });
      return b.innerHTML;
    }
    function docHtml() {
      const c = $('#edDoc').cloneNode(true);
      $$('[contenteditable]', c).forEach((e) => e.removeAttribute('contenteditable'));
      $$('[title]', c).forEach((e) => e.removeAttribute('title'));
      $$('img', c).forEach((im) => { if (!im.getAttribute('data-art')) { im.remove(); return; } ['src', 'srcset', 'sizes', 'width', 'height', 'loading', 'decoding', 'style', 'class'].forEach((a) => im.removeAttribute(a)); });
      $$('div:not([class])', c).forEach((dv) => { const p = document.createElement('p'); p.innerHTML = dv.innerHTML; dv.replaceWith(p); });
      $$('[style]', c).forEach((e) => e.removeAttribute('style'));
      /* متن و برچسب‌های کوچکی که بیرون از پاراگراف مانده‌اند */
      const out = document.createElement('div');
      let para = null;
      [...c.childNodes].forEach((n) => {
        const inl = n.nodeType === 3 || (n.nodeType === 1 && /^(B|STRONG|I|EM|A|SPAN|BR|SUB|SUP|CITE)$/.test(n.nodeName));
        if (!inl) { para = null; if (n.nodeType === 1) out.appendChild(n); return; }
        if (n.nodeType === 3 && !n.textContent.trim() && !para) return;
        if (!para) { para = document.createElement('p'); out.appendChild(para); }
        para.appendChild(n);
      });
      return out.innerHTML.replace(/&nbsp;/g, ' ').replace(/<p>(\s|<br>)*<\/p>/g, '');
    }
    /* چسباندن از Word، Google Docs یا صفحه‌ی وب: فقط ساختار (تیتر، پاراگراف، فهرست، پررنگ، لینک) می‌ماند */
    function onPaste(e) {
      const dt = e.clipboardData;
      if (!dt) return;
      e.preventDefault();
      const html = dt.getData('text/html');
      const out = html ? cleanPaste(html) : dt.getData('text/plain').split(/\n\s*\n/).map((p) => p.trim() && '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>').join('');
      document.execCommand('insertHTML', false, out);
      changed();
    }
    function cleanPaste(html) {
      const walk = (node) => {
        let s = '';
        node.childNodes.forEach((n) => {
          if (n.nodeType === 3) { s += esc(n.textContent.replace(/\s+/g, ' ')); return; }
          if (n.nodeType !== 1) return;
          const t = n.nodeName.toLowerCase();
          if (/^(script|style|meta|link|title|head|svg|img|iframe|object|video|audio|canvas|button|input|select|textarea|noscript|template)$/.test(t)) return;
          const inner = walk(n);
          const fw = (n.style && n.style.fontWeight) || '';
          if (t === 'h1' || t === 'h2') s += `<h2>${inner}</h2>`;
          else if (/^h[3-6]$/.test(t)) s += `<h3>${inner}</h3>`;
          else if (t === 'p' || t === 'div') s += inner.trim() ? `<p>${inner}</p>` : '';
          else if (t === 'ul' || t === 'ol' || t === 'li' || t === 'blockquote') s += `<${t}>${inner}</${t}>`;
          else if ((t === 'b' || t === 'strong') && !/normal|^[1-4]00$/.test(fw)) s += `<b>${inner}</b>`;
          else if (t === 'span' && /bold|^[6-9]00$/.test(fw)) s += `<b>${inner}</b>`;
          else if (t === 'i' || t === 'em') s += `<i>${inner}</i>`;
          else if (t === 'br') s += '<br>';
          else if (t === 'a' && /^(https?:\/\/|[a-z0-9-]+\.html)/i.test(n.getAttribute('href') || '')) s += `<a href="${esc(n.getAttribute('href'))}">${inner}</a>`;
          else s += inner;
        });
        return s;
      };
      return walk(parse(html)).replace(/<p>\s*<\/p>/g, '');
    }

    /* ---------- خلاصه، سؤال‌ها و برچسب‌ها ---------- */
    const ptRow = (h) => `<li class="ed__pt"><input class="input" value="${esc(plain(h))}" data-h="${esc(h)}" maxlength="400" placeholder="یک نکته‌ی کلیدی در یک جمله"><button class="iconbtn" type="button" data-act="edrm" aria-label="حذف این خط">${ic('i-x', 'ic--s')}</button></li>`;
    const qaRow = (f) => `<div class="ed__qa"><input class="input ed__q" value="${esc(plain(f.q))}" data-h="${esc(f.q)}" maxlength="220" placeholder="سؤال؛ مثلاً «جرم‌گیری درد دارد؟»"><textarea class="input ed__a" rows="2" data-h="${esc(f.a)}" maxlength="1500" placeholder="جواب کوتاه و خودمانی">${esc(plain(f.a))}</textarea><button class="iconbtn" type="button" data-act="edrm" aria-label="حذف این سؤال">${ic('i-x', 'ic--s')}</button></div>`;
    /* اگر متن دست نخورده، همان HTML اصلی (با پررنگ‌ها) می‌ماند */
    const valOf = (el) => { const v = el.value.trim(); return el.dataset.h && v === plain(el.dataset.h) ? el.dataset.h : esc(v); };
    function drawTags() {
      const host = $('#edTags');
      if (!host) return;
      host.innerHTML = ED.tags.map((t, i) => `<span class="tag${i ? '' : ' tag--main'}">${esc(t)}<button type="button" data-act="edtag" data-v="${i}" aria-label="حذف ${esc(t)}">${ic('i-x', 'ic--s')}</button></span>`).join('') +
        `<input id="edTagIn" class="tags__in" maxlength="40" placeholder="${ED.tags.length ? 'کلمه‌ی دیگر…' : 'کلمه‌ی کلیدی اصلی…'}">`;
    }
    function addTag(v) {
      v = v.replace(/[،,]+$/, '').trim();
      if (!v || ED.tags.includes(v) || ED.tags.length >= 12) return;
      ED.tags.push(v); drawTags(); changed();
      $('#edTagIn').focus();
    }

    /* ---------- داده‌ی فرم ---------- */
    function collect() {
      const g = (id) => ($('#' + id) ? $('#' + id).value.trim() : '');
      return {
        slug: ED.isNew ? g('edSlug').toLowerCase() : ED.slug,
        k: ($('input[name="edk"]:checked') || {}).value || '',
        title: g('edTitle'), lead: valOf($('#edLead')), cover: ED.cover, coverAlt: g('edAlt'), body: docHtml(),
        seo: g('edSeo'), desc: g('edDesc'),
        points: $$('#edPoints input').map(valOf).filter((x) => plain(x)),
        faq: $$('#edFaq .ed__qa').map((r) => ({ q: valOf($('.ed__q', r)), a: valOf($('.ed__a', r)) })).filter((f) => plain(f.q) && plain(f.a)),
        tags: ED.tags.slice()
      };
    }

    /* ---------- به‌روزرسانی شمارنده‌ها، پیش‌نمایش گوگل و امتیاز (یک بار در هر فریم) ---------- */
    function changed() {
      if (!ED) return;
      ED.dirty = true;
      if (!raf) raf = requestAnimationFrame(() => upd(false));
    }
    function meter(id, len, lo, hi, max) {
      const m = $('#' + id);
      if (!m) return;
      m.dataset.s = !len ? 'none' : len < lo ? 'low' : len > hi ? 'bad' : 'ok';
      m.firstElementChild.style.transform = `scaleX(${Math.min(1, len / max).toFixed(3)})`;
    }
    function upd(first) {
      raf = 0;
      if (!ED || !$('#ed')) return;
      const t = $('#edTitle').value.trim(), lead = $('#edLead').value.trim(), seo = $('#edSeo').value.trim(), desc = $('#edDesc').value.trim();
      const slug = ED.isNew ? ($('#edSlug') ? $('#edSlug').value.trim() : '') : ED.slug;
      const seoEff = seo || (t ? t + ' | ساسان کلینیک' : ''), descEff = desc || cut(lead, 155);
      $('#edSeo').placeholder = t ? t + ' | ساسان کلینیک' : 'اگر خالی بماند، از عنوان ساخته می‌شود';
      $('#edDesc').placeholder = lead ? cut(lead, 155) : 'اگر خالی بماند، از مقدمه ساخته می‌شود';
      $('#serpT').textContent = cut(seoEff || 'عنوان مقاله در گوگل', 64);
      $('#serpD').textContent = cut(descEff || 'توضیح کوتاهی که زیر عنوان در نتیجه‌ی جست‌وجو دیده می‌شود.', 158);
      $('#serpUrl').textContent = 'sasan-clinic.ir › article-' + (slug || '…');
      meter('mSeo', seoEff.length, 35, 65, 80);
      meter('mDesc', descEff.length, 110, 160, 200);
      $('#cSeo').textContent = `${fa(seoEff.length)} نویسه${seo ? '' : ' (خودکار از عنوان)'} · بهترین: ۳۵ تا ۶۵`;
      $('#cDesc').textContent = `${fa(descEff.length)} نویسه${desc ? '' : ' (خودکار از مقدمه)'} · بهترین: ۱۱۰ تا ۱۶۰`;
      const ct = $('#cntTitle');
      ct.textContent = t ? `${fa(t.length)} نویسه` : '';
      ct.dataset.s = t.length > 70 ? 'bad' : t.length >= 20 ? 'ok' : 'low';
      /* متن */
      const doc = $('#edDoc');
      const bodyTxt = doc.textContent.replace(/\s+/g, ' ').trim();
      const faqs = $$('#edFaq .ed__qa').filter((r) => $('.ed__q', r).value.trim() && $('.ed__a', r).value.trim());
      const pts = $$('#edPoints input').filter((x) => x.value.trim());
      const words = nWords(lead + ' ' + bodyTxt + ' ' + faqs.map((r) => $('.ed__q', r).value + ' ' + $('.ed__a', r).value).join(' '));
      const h2 = $$('h2', doc).filter((h) => h.textContent.trim()).length;
      const imgs = $$('img', doc).length;
      $('#edStats').innerHTML = `<span><b>${fa(words)}</b> کلمه</span><span>حدود <b>${fa(Math.max(2, Math.round(words / 190)))}</b> دقیقه مطالعه</span><span><b>${fa(h2)}</b> بخش</span><span><b>${fa(imgs)}</b> عکس</span>`;
      doc.classList.toggle('is-empty', !bodyTxt && !imgs && !$('figure', doc));
      /* امتیاز */
      const kw = ED.tags[0] || '';
      const all = [t, lead, bodyTxt, desc].join(' ');
      const ok = {
        title: t.length >= 20 && t.length <= 70, kw: !!kw && t.includes(kw), seo: seoEff.length >= 35 && seoEff.length <= 65,
        desc: descEff.length >= 110 && descEff.length <= 160, local: /سلمان[‌ ]?شهر|متل[‌ ]?قو/.test(all), words: words >= 600, h2: h2 >= 3,
        cover: !!ED.cover && $('#edAlt').value.trim().length >= 5, link: $$('a[href]', doc).some((a) => !/^https?:/i.test(a.getAttribute('href'))), faq: faqs.length >= 2, points: pts.length >= 2
      };
      const pass = CHECKS.filter(([k]) => ok[k]).length, score = Math.round((pass / CHECKS.length) * 100);
      $$('#edChecks li').forEach((li) => {
        const on = !!ok[li.dataset.k], was = li.classList.contains('is-ok');
        if (on !== was) { li.classList.toggle('is-ok', on); if (on && !first) { li.classList.remove('is-pop'); void li.offsetWidth; li.classList.add('is-pop'); } }
      });
      const box = $('#edScore');
      box.dataset.s = score >= 80 ? 'ok' : score >= 50 ? 'mid' : 'low';
      $('#scoreFg').style.strokeDashoffset = String((169.65 * (1 - score / 100)).toFixed(1));
      $('#scoreN').textContent = fa(score);
      $('#scoreT').textContent = score >= 80 ? 'عالی؛ آماده‌ی انتشار' : score >= 50 ? 'خوب است؛ چند مورد مانده' : 'هنوز جای کار دارد';
      state();
    }
    function state() {
      const el = $('#edState');
      if (!el || !ED) return;
      const [s, t] = ED.saving ? ['busy', 'در حال ذخیره…'] : ED.dirty ? ['dirty', 'تغییرات ذخیره نشده'] : ED.isNew ? ['new', 'مقاله‌ی تازه'] : ED.hidden ? ['off', stateOf(ED)] : ['on', 'در سایت منتشر شده'];
      if (el.dataset.s !== s) { el.dataset.s = s; el.title = t; el.innerHTML = `<i></i><span>${t}</span>`; }
    }
    const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };

    /* ---------- نوار ابزار ---------- */
    const blockEl = () => {
      const s = getSelection();
      let n = s && s.anchorNode;
      const doc = $('#edDoc');
      if (!n || !doc || !doc.contains(n)) return null;
      while (n && n.parentNode !== doc) n = n.parentNode;
      return n && n.nodeType === 1 ? n : null;
    };
    /* عکس یا کادر تازه وسط جمله یا داخل کادر و فهرست دیگر نمی‌رود: بعد از همان بلوک می‌نشیند (یا در پاراگراف خالی) */
    function toTopLevel() {
      const b = blockEl();
      if (!b || (b.nodeName === 'P' && !b.textContent.trim() && !b.querySelector('img'))) return;
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      b.after(p);
      const r = document.createRange();
      r.setStart(p, 0); r.collapse(true);
      const sel = getSelection();
      sel.removeAllRanges(); sel.addRange(r);
    }
    function saveRange() {
      const s = getSelection(), doc = $('#edDoc');
      range = s && s.rangeCount && doc && doc.contains(s.anchorNode) ? s.getRangeAt(0).cloneRange() : null;
    }
    function restoreRange() {
      const doc = $('#edDoc');
      if (!doc) return;
      doc.focus({ preventScroll: true });
      const s = getSelection();
      s.removeAllRanges();
      if (range && doc.contains(range.startContainer)) s.addRange(range);
      else { const r = document.createRange(); r.selectNodeContents(doc); r.collapse(false); s.addRange(r); }
    }
    function tool(v) {
      const doc = $('#edDoc');
      if (!doc) return;
      if (!doc.contains(getSelection().anchorNode)) restoreRange();
      const b = blockEl(), tag = b ? b.nodeName.toLowerCase() : '';
      const fmt = (t) => document.execCommand('formatBlock', false, `<${t}>`);
      switch (v) {
        case 'h2': case 'h3': fmt(tag === v ? 'p' : v); break;
        case 'p': fmt('p'); break;
        case 'quote': fmt(tag === 'blockquote' ? 'p' : 'blockquote'); break;
        case 'bold': document.execCommand('bold'); break;
        case 'italic': document.execCommand('italic'); break;
        case 'ul': document.execCommand('insertUnorderedList'); break;
        case 'ol': document.execCommand('insertOrderedList'); break;
        case 'undo': document.execCommand('undo'); break;
        case 'redo': document.execCommand('redo'); break;
        case 'tip': case 'warn':
          toTopLevel();
          document.execCommand('insertHTML', false, `<aside class="ar-box ar-box--${v}"><b>${v === 'tip' ? 'نکته' : 'مراقب باشید'}</b><p>${v === 'tip' ? 'متن نکته را این‌جا بنویسید.' : 'متن هشدار را این‌جا بنویسید.'}</p></aside><p><br></p>`);
          break;
        case 'link': saveRange(); linkModal(); return;
        case 'img': saveRange(); pickFile('body'); return;
        default: return;
      }
      changed();
      toolState();
    }
    function toolState() {
      const tools = $('.ed__tools');
      if (!tools) return;
      const b = blockEl(), tag = b ? b.nodeName.toLowerCase() : '';
      const q = (c) => { try { return document.queryCommandState(c); } catch (e) { return false; } };
      const on = { h2: tag === 'h2', h3: tag === 'h3', quote: tag === 'blockquote', ul: tag === 'ul', ol: tag === 'ol', bold: q('bold'), italic: q('italic') };
      $$('[data-ed]', tools).forEach((x) => { if (x.dataset.ed in on) x.setAttribute('aria-pressed', String(!!on[x.dataset.ed])); });
    }

    /* ---------- لینک ---------- */
    function linkModal() {
      const sel = range ? range.toString().trim() : '';
      const opts = PAGES.concat((list || []).filter((a) => !a.hidden && a.slug !== ED.slug).map((a) => [a.url, a.title]));
      openModal(`<div class="modal__h"><h2 id="mdTitle">لینک</h2><button class="iconbtn" type="button" data-act="mclose" aria-label="بستن">${ic('i-x')}</button></div>
        <form class="modal__b form" id="linkForm" novalidate>
          <label class="field"><span>متن لینک</span><input class="input" name="text" value="${esc(sel)}" placeholder="مثلاً: ایمپلنت دندان" ${sel ? 'readonly' : ''}></label>
          <label class="field"><span>به کجا برود؟</span><input class="input" name="q" placeholder="جست‌وجو در صفحه‌ها و مقاله‌ها، یا نشانی کامل https://…" autocomplete="off"></label>
          <div class="lpick" id="lpick">${opts.map(([h, t]) => `<button type="button" class="lpick__i" data-href="${esc(h)}"><b>${esc(t)}</b><small dir="ltr">${esc(h)}</small></button>`).join('')}</div>
          <p class="err" id="mdErr" role="alert"></p>
          <div class="modal__f"><button class="btn btn--ghost" type="button" data-act="mclose">انصراف</button><button class="btn btn--pri" type="submit">افزودن لینک</button></div>
        </form>`, { focus: sel ? '[name="q"]' : '[name="text"]' });
      const f = $('#linkForm');
      let href = '';
      if (!list) call('get', '/articles').then((r) => { if (r.ok) list = r.articles; });
      f.q.addEventListener('input', () => {
        const q = f.q.value.trim();
        href = /^https?:\/\/\S+$/i.test(q) ? q : '';
        $$('.lpick__i', f).forEach((b) => { b.hidden = !!q && !href && !b.textContent.includes(q); b.setAttribute('aria-pressed', 'false'); });
      });
      $('#lpick').addEventListener('click', (e) => {
        const b = e.target.closest('.lpick__i');
        if (!b) return;
        href = b.dataset.href;
        $$('.lpick__i', f).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        if (!f.text.value.trim()) f.text.value = $('b', b).textContent;
      });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = f.text.value.trim();
        if (!href) { $('#mdErr').textContent = 'یکی از صفحه‌ها را انتخاب کنید یا نشانی کامل با https بنویسید.'; return; }
        if (!text) { $('#mdErr').textContent = 'متن لینک را بنویسید.'; return; }
        closeModal(true);
        restoreRange();
        if (sel) document.execCommand('createLink', false, href);
        else document.execCommand('insertHTML', false, `<a href="${esc(href)}">${esc(text)}</a>&nbsp;`);
        changed();
      });
    }

    /* ---------- عکس: برش، سه اندازه‌ی WebP و بارگذاری ---------- */
    function pickFile(kind, file) {
      const go = (f) => { if (f) processImage(kind, f); };
      if (file) return go(file);
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp';
      inp.addEventListener('change', () => go(inp.files[0]));
      inp.click();
    }
    const toB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
    async function sizes(file, kind) {
      const bmp = await createImageBitmap(file);
      const W = bmp.width, H = bmp.height;
      const ratio = kind === 'cover' ? 16 / 9 : H > W * 1.05 ? 4 / 5 : 3 / 2;
      let sw = W, sh = W / ratio;
      if (sh > H) { sh = H; sw = H * ratio; }
      const sx = (W - sw) / 2, sy = (H - sh) / 2;
      const files = {};
      for (const w of [1920, 1280, 720]) {
        const c = document.createElement('canvas');
        c.width = w; c.height = Math.round(w / ratio);
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
        const blob = await new Promise((r) => c.toBlob(r, 'image/webp', w === 720 ? 0.8 : 0.82));
        if (!blob || blob.type !== 'image/webp') throw new Error('webp');
        files[w] = await toB64(blob);
      }
      if (bmp.close) bmp.close();
      return { files, ar: kind === 'cover' ? '16/9' : ratio < 1 ? '4/5' : '3/2', small: sw < 1280 };
    }
    async function processImage(kind, file) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast('فقط عکس JPG، PNG یا WebP', true); return; }
      if (file.size > 25e6) { toast('عکس خیلی حجیم است (بیشتر از ۲۵ مگابایت)', true); return; }
      const cov = $('#edCover');
      if (kind === 'cover' && cov) cov.classList.add('is-busy');
      const t = kind === 'body' ? toastBusy('در حال آماده‌سازی عکس…') : null;
      let s;
      try { s = await sizes(file, kind); }
      catch (e) { if (cov) cov.classList.remove('is-busy'); if (t) t(); toast(e.message === 'webp' ? 'این مرورگر عکس WebP نمی‌سازد؛ لطفاً با Chrome یا Edge عکس بگذارید.' : 'این عکس خوانده نشد', true); return; }
      const r = await call('post', '/articles/upload', { files: s.files });
      if (cov) cov.classList.remove('is-busy');
      if (t) t();
      if (!r.ok) { toast(errText(r), true); return; }
      upUrls[r.base] = r.url || imgUrl(r.base + '-1280.webp');
      if (s.small) toast('عکس کوچک است؛ برای کیفیت بهتر عکسی با پهنای دست‌کم ۱۶۰۰ پیکسل بگذارید.', true);
      if (kind === 'cover') {
        ED.cover = r.base;
        const img = $('#edCoverImg');
        if (img) { img.src = artSrc(r.base); cov.classList.add('has-img', 'is-new'); $('.ed__drop b', cov).textContent = 'عوض کردن عکس'; setTimeout(() => cov.classList.remove('is-new'), 900); }
        if (!$('#edAlt').value.trim()) $('#edAlt').focus();
        changed();
        return;
      }
      imageModal(r.base, s.ar);
    }
    function toastBusy(text) {
      const host = $('#toasts');
      const el = document.createElement('div');
      el.className = 'toast toast--busy'; el.setAttribute('role', 'status');
      el.innerHTML = `<span class="spin"></span><span>${esc(text)}</span>`;
      host.appendChild(el);
      return () => { el.classList.add('is-out'); setTimeout(() => el.remove(), 320); };
    }
    function imageModal(base, ar) {
      openModal(`<div class="modal__h"><h2 id="mdTitle">عکس داخل متن</h2><button class="iconbtn" type="button" data-act="mclose" aria-label="بستن">${ic('i-x')}</button></div>
        <form class="modal__b form" id="imgForm" novalidate>
          <div class="ed__imgprev${ar === '4/5' ? ' is-tall' : ''}"><img src="${esc(artSrc(base))}" alt=""></div>
          <label class="field"><span>توضیح عکس برای گوگل و نابینایان (alt)</span><input class="input" name="alt" maxlength="160" placeholder="چه چیزی در عکس دیده می‌شود؟" required></label>
          <label class="field"><span>زیرنویس (اختیاری)</span><input class="input" name="cap" maxlength="220" placeholder="جمله‌ای که زیر عکس نوشته می‌شود"></label>
          <p class="err" id="mdErr" role="alert"></p>
          <div class="modal__f"><button class="btn btn--ghost" type="button" data-act="mclose">انصراف</button><button class="btn btn--pri" type="submit">گذاشتن در متن</button></div>
        </form>`, { focus: '[name="alt"]' });
      const f = $('#imgForm');
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const alt = f.alt.value.trim(), cap = f.cap.value.trim();
        if (alt.length < 3) { $('#mdErr').textContent = 'در چند کلمه بنویسید در عکس چه دیده می‌شود.'; return; }
        closeModal(true);
        restoreRange();
        toTopLevel();
        document.execCommand('insertHTML', false, `<figure class="ap-fig${ar === '4/5' ? ' ap-fig--portrait' : ''}"><img data-art="${esc(base)}" data-ar="${ar}" alt="${esc(alt)}" src="${esc(artSrc(base, 720))}">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure><p><br></p>`);
        changed();
      });
    }

    /* ---------- ذخیره و انتشار ---------- */
    function problems(d) {
      if (!d.k) return ['.ed__cats', 'بخش مقاله را انتخاب کنید (دندانپزشکی، زیبایی یا پزشکی عمومی).'];
      if (d.title.length < 10) return ['#edTitle', 'عنوان مقاله را بنویسید (دست‌کم ۱۰ نویسه).'];
      if (plain(d.lead).length < 40) return ['#edLead', 'مقدمه را بنویسید (دست‌کم ۴۰ نویسه).'];
      if (!d.cover) return ['#edCover', 'عکس اصلی مقاله را بگذارید.'];
      if (plain(d.body).length < 200) return ['#edDoc', 'متن مقاله هنوز خیلی کوتاه است.'];
      if (ED.isNew && (!SLUG.test(d.slug) || d.slug.length < 3)) return ['#edSlug', 'نشانی صفحه را با حروف انگلیسی کوچک و خط تیره بنویسید (یا «خودکار» را بزنید).'];
      return null;
    }
    function flag(sel) {
      const el = $(sel);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.remove('is-flag'); void el.offsetWidth; el.classList.add('is-flag');
      if (el.focus && /INPUT|TEXTAREA/.test(el.tagName)) setTimeout(() => el.focus({ preventScroll: true }), 350);
    }
    async function save(mode, btn) {
      if (!ED || ED.saving) return;
      const d = collect();
      const p = problems(d);
      if (p) { toast(p[1], true); flag(p[0]); return; }
      d.hidden = mode === 'draft' || (mode === 'keep' ? !!ED.hidden : false);
      ED.saving = true; state(); busy(btn, true);
      const r = ED.isNew ? await call('post', '/articles', d) : await call('put', '/articles/' + ED.slug, d);
      ED.saving = false; busy(btn, false);
      if (!r.ok) { state(); toast(r.status === 409 ? r.message : errText(r), true); if (r.status === 409) flag('#edSlug'); return; }
      const a = r.article;
      store.del(ED.isNew ? 'new' : ED.slug);
      const wasNew = ED.isNew;
      Object.assign(ED, { isNew: false, slug: a.slug, src: a.src, hidden: a.hidden, savedAt: a.savedAt, savedBy: a.savedBy, url: a.url, dirty: false, local: null, cover: a.cover });
      ED.data = Object.assign({}, d, { slug: a.slug });
      list = null;
      if (wasNew) {
        /* نشانی ویرایش همین مقاله؛ متن و نوار ابزار دست نمی‌خورند */
        history.replaceState(null, '', '#/articles/edit/' + a.slug);
        ED.key = location.hash;
        const sf = $('#edSlug') && $('#edSlug').closest('.field');
        if (sf) sf.outerHTML = `<div class="field"><span class="flabel">نشانی صفحه</span><span class="slug slug--ro" dir="ltr">sasan-clinic.ir/${esc(a.url)}</span></div>`;
      }
      $('#edBar').innerHTML = barHtml();
      $('#edPubCard').outerHTML = pubCard();
      state();
      const st = $('#edState');
      if (st) { st.classList.remove('is-pop'); void st.offsetWidth; st.classList.add('is-pop'); }
      toast(a.hidden ? (a.src === 'panel' ? 'پیش‌نویس ذخیره شد؛ در سایت دیده نمی‌شود' : 'ذخیره شد؛ این مقاله فعلاً در سایت نیست') : 'منتشر شد؛ همین حالا در سایت است');
    }
    async function setHidden(btn) {
      const hide = !ED.hidden;
      if (hide && !(await confirmBox('این مقاله از سایت برداشته شود؟ صفحه‌اش دیگر باز نمی‌شود و از فهرست مقاله‌ها و گوگل هم کم‌کم حذف می‌شود.', 'برداشتن از سایت'))) return;
      if (!hide && ED.dirty) { await save('pub', btn); return; }
      busy(btn, true);
      const r = await call('post', `/articles/${ED.slug}/hide`, { hidden: hide });
      busy(btn, false);
      if (!r.ok) { toast(errText(r), true); return; }
      Object.assign(ED, { hidden: r.article.hidden, src: r.article.src });
      list = null;
      $('#edBar').innerHTML = barHtml(); $('#edPubCard').outerHTML = pubCard(); state();
      toast(hide ? 'از سایت برداشته شد' : 'دوباره در سایت است');
    }
    async function remove(revert) {
      const q = revert ? 'همه‌ی ویرایش‌های پنل روی این مقاله کنار گذاشته شود و نسخه‌ی اصلی سایت برگردد؟' : 'این مقاله برای همیشه حذف شود؟ صفحه‌اش هم از سایت برداشته می‌شود.';
      if (!(await confirmBox(q, revert ? 'برگرداندن' : 'حذف مقاله'))) return;
      const r = await call('del', '/articles/' + ED.slug);
      if (!r.ok) { toast(errText(r), true); return; }
      store.del(ED.slug);
      const slug = ED.slug;
      ED.dirty = false; ED = null; list = null;
      toast(revert ? 'نسخه‌ی اصلی سایت برگشت' : 'مقاله حذف شد');
      location.hash = revert ? '#/articles/edit/' + slug : '#/articles';
      if (revert) rerender('enter');
    }
    /* نشانی خودکار: بخش + تاریخ امروز، مثلاً dental-14050707 */
    function autoSlug() {
      const k = ($('input[name="edk"]:checked') || {}).value || 'article';
      const d = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const part = (t) => (d.find((x) => x.type === t) || {}).value || '';
      $('#edSlug').value = `${k}-${part('year')}${part('month')}${part('day')}`;
      changed();
    }

    /* ---------- رویدادها ---------- */
    document.addEventListener('mousedown', (e) => { if (e.target.closest('.ed__tools [data-ed]')) e.preventDefault(); });
    document.addEventListener('click', (e) => {
      const t = e.target.closest('.ed__tools [data-ed]');
      if (t) { tool(t.dataset.ed); return; }
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const a = el.dataset.act, v = el.dataset.v;
      switch (a) {
        case 'edf': filter = v; X.morph(); break;
        case 'edsave': save(v, el); break;
        case 'edcover': pickFile('cover'); break;
        case 'edhide': setHidden(el); break;
        case 'edrevert': remove(true); break;
        case 'eddel': remove(false); break;
        case 'edslug': autoSlug(); break;
        case 'edadd': {
          const host = v === 'points' ? $('#edPoints') : $('#edFaq');
          if ($$(v === 'points' ? 'li' : '.ed__qa', host).length >= (v === 'points' ? 8 : 12)) { toast('بیشتر از این جا ندارد', true); break; }
          host.insertAdjacentHTML('beforeend', v === 'points' ? ptRow('') : qaRow({ q: '', a: '' }));
          const last = host.lastElementChild;
          last.classList.add('is-new');
          $('input', last).focus();
          changed();
          break;
        }
        case 'edrm': { const row = el.closest('.ed__pt, .ed__qa'); if (row) { row.remove(); changed(); } break; }
        case 'edtag': ED.tags.splice(Number(v), 1); drawTags(); changed(); break;
        case 'edlocal':
          if (v === '1' && ED.local) { ED.data = Object.assign(blank(), ED.local.data); ED.cover = ED.data.cover || ''; ED.tags = (ED.data.tags || []).slice(); ED.local = null; rerender('none'); ED.dirty = true; state(); toast('نوشته‌ی ذخیره‌نشده برگشت؛ برای ماندن، ذخیره کنید'); }
          else { store.del(ED.slug || 'new'); ED.local = null; const b = $('#edRestore'); if (b) b.remove(); }
          break;
        default: break;
      }
    });
    document.addEventListener('input', (e) => {
      if (!ED || !e.target.closest || !e.target.closest('#ed')) return;
      if (e.target.tagName === 'TEXTAREA') grow(e.target);
      if (e.target.id === 'edSlug') { const c = e.target.selectionStart; e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-'); e.target.setSelectionRange(c, c); }
      if (e.target.id === 'edTagIn') { if (/[،,]$/.test(e.target.value)) { addTag(e.target.value); return; } return; }
      changed();
    });
    document.addEventListener('change', (e) => { if (ED && e.target.name === 'edk') changed(); });
    document.addEventListener('keydown', (e) => {
      if (!ED || !$('#ed')) return;
      if (e.target.id === 'edTagIn') {
        if (e.key === 'Enter') { e.preventDefault(); addTag(e.target.value); }
        else if (e.key === 'Backspace' && !e.target.value && ED.tags.length) { ED.tags.pop(); drawTags(); changed(); $('#edTagIn').focus(); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); const b = $('[data-act="edsave"][data-v="pub"]'); save(ED.isNew || (ED.src === 'panel' && ED.hidden) ? 'draft' : 'keep', b); }
      if (e.key === 'Enter' && e.target.closest && e.target.closest('#edPoints') && e.target.tagName === 'INPUT') { e.preventDefault(); $('[data-act="edadd"][data-v="points"]').click(); }
    });
    document.addEventListener('selectionchange', () => { if (ED && $('#edDoc') && $('#edDoc').contains(getSelection().anchorNode)) toolState(); });
    document.addEventListener('focusout', (e) => { if (ED && e.target.id === 'edTagIn' && e.target.value.trim()) addTag(e.target.value); });
    /* نوشته‌ی ذخیره‌نشده هر چند ثانیه در همین مرورگر می‌ماند (اگر نشست تمام شد یا مرورگر بسته شد) */
    setInterval(() => { if (ED && ED.dirty && !ED.saving && $('#ed')) store.set(ED.isNew ? 'new' : ED.slug, { at: Date.now(), data: collect() }); }, 4000);
    addEventListener('beforeunload', (e) => { if (ED && ED.dirty && $('#ed')) { e.preventDefault(); e.returnValue = ''; } });

    /* بیرون رفتن از ویرایشگر با تغییرات ذخیره‌نشده: اول می‌پرسیم */
    function guard() {
      if (!ED || location.hash === ED.key) return false;
      if (!ED.dirty) { ED = null; return false; }
      const target = location.hash;
      history.replaceState(null, '', ED.key);
      confirmBox('تغییرات این مقاله ذخیره نشده‌اند. بدون ذخیره بیرون می‌روید؟', 'بیرون می‌روم').then((ok) => {
        if (!ok || !ED) return;
        store.del(ED.isNew ? 'new' : ED.slug);
        ED = null;
        location.hash = target;
      });
      return true;
    }

    function view() { const s = sub(); return s ? edView(s) : listView(); }
    view.after = (v) => { if (sub()) after(v); };
    return { view, guard, busy: () => !!(ED && $('#ed')), reset: () => { list = null; ED = null; filter = 'all'; } };
  };
})();
