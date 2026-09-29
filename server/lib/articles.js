/* ==========================================================================
   مجله‌ی سلامت: خواندن مقاله‌ها و ساختن صفحه‌هایشان
   - مقاله‌های خود سایت در content/articles/<slug>.html اند: اول یک توضیح <!-- {...} --> با مشخصات (JSON)، بعد متن HTML.
   - مقاله‌هایی که از پنل نوشته می‌شوند همین شکل را دارند و فقط جای نگه‌داری‌شان فرق می‌کند.
   - از یک صفحه‌ی آماده‌ی سایت (doctors.html) هدر، فوتر و اسکریپت‌ها گرفته می‌شود تا صفحه‌های مقاله دقیقاً مثل بقیه‌ی سایت باشند.
   خروجی: صفحه‌ی هر مقاله (article-<slug>.html)، فهرست همه‌ی مقاله‌ها (articles.html) و ردیف‌های مجله در صفحه‌ی اصلی.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const SITE_URL = (process.env.SITE_URL || 'https://sasan-clinic.ir').replace(/\/$/, '');
const TEL = '۰۱۱ ۵۴۶۱ ۱۵۶۰';
const CATS = {
  dental: { name: 'دندانپزشکی', by: 'بخش دندانپزشکی', book: 'درخواست نوبت دندانپزشکی',
    cta: ['سؤالی درباره‌ی دندان‌هایتان دارید؟', 'دندانپزشکی ساسان کلینیک شنبه، یکشنبه، دوشنبه و پنجشنبه از ۱۰ صبح تا ۸ شب پذیرش دارد. درخواست نوبت بدهید تا پذیرش با شما تماس بگیرد و زمان را هماهنگ کند.'] },
  beauty: { name: 'زیبایی و لیزر', by: 'بخش زیبایی و لیزر', book: 'درخواست نوبت زیبایی و لیزر',
    cta: ['برای مشاوره‌ی زیبایی وقت بگیرید', 'بخش زیبایی و لیزر ساسان کلینیک همه‌روزه با هماهنگی قبلی پذیرش دارد. درخواست بدهید تا برای جلسه‌ی مشاوره با شما تماس بگیریم.'] },
  medicine: { name: 'پزشکی عمومی', by: 'پزشک عمومی', book: 'درخواست نوبت پزشک عمومی',
    cta: ['پزشک عمومی همین حالا در کلینیک است', 'پزشک عمومی ساسان کلینیک شبانه‌روز در سلمان‌شهر حضور دارد؛ برای ویزیت، تزریقات، پانسمان یا نوار قلب می‌توانید مستقیم مراجعه کنید.'] }
};
const ORDER = ['dental', 'beauty', 'medicine'];
/* پهنای نسخه‌های هر عکس مقاله (img/art/…-<w>.webp) */
const WIDTHS = [720, 1280, 1920];

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fa = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const two = (n) => fa(String(n).padStart(2, '0'));
const faDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const jalali = (iso) => (iso ? faDate.format(new Date(iso + 'T12:00:00Z')) : '');
const strip = (h) => String(h).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const plain = (s) => strip(s).replace(/"/g, '«').slice(0, 5000);

/* ---------- خواندن ---------- */
function parse(text, file) {
  const m = /^\s*<!--\s*(\{[\s\S]*?\})\s*-->\s*/.exec(text);
  if (!m) throw new Error(`${file}: مشخصات مقاله (<!-- {...} -->) پیدا نشد`);
  let meta;
  try { meta = JSON.parse(m[1]); } catch (e) { throw new Error(`${file}: JSON مشخصات خراب است: ${e.message}`); }
  return normalize(meta, text.slice(m[0].length));
}

/* کمترین چیزهایی که هر مقاله باید داشته باشد، و مقدارهای پیش‌فرض */
function normalize(meta, body) {
  const a = Object.assign({}, meta);
  const need = ['slug', 'k', 'title', 'lead', 'cover'];
  need.forEach((f) => { if (!a[f]) throw new Error(`مقاله‌ی «${a.title || a.slug || '?'}»: «${f}» خالی است`); });
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) throw new Error(`نشانی مقاله باید فقط حروف کوچک انگلیسی، عدد و خط تیره باشد: ${a.slug}`);
  if (!CATS[a.k]) throw new Error(`بخش ناشناخته: ${a.k}`);
  a.cat = CATS[a.k].name;
  a.by = a.by || CATS[a.k].by;
  a.date = a.date || new Date().toISOString().slice(0, 10);
  a.updated = a.updated || a.date;
  a.seo = a.seo || `${a.title} | ساسان کلینیک`;
  a.desc = a.desc || strip(a.lead).slice(0, 155);
  a.faq = Array.isArray(a.faq) ? a.faq : [];
  a.points = Array.isArray(a.points) ? a.points : [];
  a.tags = Array.isArray(a.tags) ? a.tags : [];
  /* هر بخش اصلی متن (h2) شناسه می‌گیرد تا فهرست مطالب به آن لینک شود */
  let n = 0;
  a.body = String(body || '').trim().replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (all, attrs = '', inner) => {
    n++;
    if (/\sid="/.test(attrs)) return all;
    return `<h2${attrs} id="s${n}">${inner}</h2>`;
  });
  a.toc = [...a.body.matchAll(/<h2[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].map((x) => ({ id: x[1], t: strip(x[2]) }));
  const words = strip(a.lead + ' ' + a.body + ' ' + a.faq.map((f) => f.q + ' ' + f.a).join(' ')).split(' ').length;
  a.words = words;
  a.mins = Math.max(2, Math.round(words / 190));
  a.url = `article-${a.slug}.html`;
  return a;
}

function loadDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => parse(fs.readFileSync(path.join(dir, f), 'utf8'), f));
}

/* ترتیب: جدیدترین اول؛ با pin می‌شود مقاله‌ای را جلو آورد */
function sort(list) {
  return list.slice().sort((x, y) => (y.pin || 0) - (x.pin || 0) || String(y.date).localeCompare(String(x.date)) || x.title.localeCompare(y.title, 'fa'));
}

/* مقاله‌های پنل روی مقاله‌ی هم‌نام سایت می‌نشینند؛ hidden یعنی از سایت برداشته شده */
function merge(builtin, custom) {
  const m = new Map(builtin.map((a) => [a.slug, a]));
  (custom || []).forEach((a) => m.set(a.slug, a));
  return sort([...m.values()].filter((a) => !a.hidden));
}

/* ---------- عکس‌ها ---------- */
/* «img/art/x/y» یا «img/art/x/y-1280.webp» → srcset با سه اندازه (اگر فایل‌ها باشند) */
function pic(base, siteDir) {
  const b = String(base).replace(/-(\d+)\.webp$/, '');
  const have = siteDir ? WIDTHS.filter((w) => fs.existsSync(path.join(siteDir, `${b}-${w}.webp`))) : WIDTHS;
  if (!have.length) return { src: base, srcset: '' };
  const mid = have.includes(1280) ? 1280 : have[have.length - 1];
  return { src: `${b}-${mid}.webp`, srcset: have.map((w) => `${b}-${w}.webp ${w}w`).join(', ') };
}
function img(base, o, siteDir) {
  const p = pic(base, siteDir);
  const ar = (o.ar || '3/2').split('/').map(Number);
  const w = 1280, h = Math.round((w * ar[1]) / ar[0]);
  return `<img src="${esc(p.src)}"${p.srcset ? ` srcset="${esc(p.srcset)}" sizes="${esc(o.sizes || '(max-width: 899px) calc(100vw - 32px), 760px')}"` : ''} width="${w}" height="${h}" alt="${esc(o.alt || '')}"${o.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}
/* عکس‌های داخل متن: <img data-art="img/art/…" data-ar="3/2" alt="…"> → عکس کامل با چند اندازه.
   sizes به جای عکس بستگی دارد تا مرورگر برای عکس‌های کنار هم و عمودی، نسخه‌ی سنگین‌تر از نیاز نگیرد */
function bodyImages(html, siteDir) {
  const conv = (part, sizes) => part.replace(/<img\b([^>]*)\bdata-art="([^"]+)"([^>]*)>/g, (all, pre, base, post) => {
    const attrs = pre + post;
    const alt = (/\balt="([^"]*)"/.exec(attrs) || [])[1] || '';
    const ar = (/\bdata-ar="([^"]*)"/.exec(attrs) || [])[1] || '3/2';
    return img(base, { alt, ar, sizes }, siteDir);
  });
  html = html.replace(/<figure class="ap-pair">[\s\S]*?<figcaption>/g, (m) => conv(m, '(max-width: 899px) calc(50vw - 22px), 360px'));
  html = html.replace(/<figure class="ap-fig ap-fig--portrait">[\s\S]*?<\/figure>/g, (m) => conv(m, '(max-width: 899px) min(460px, calc(100vw - 32px)), 460px'));
  return conv(html, '(max-width: 899px) calc(100vw - 32px), 720px');
}

/* ---------- تکه‌های مشترک ---------- */
const ic = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
function card(a, i, siteDir, cls = 'ac') {
  const p = pic(a.cover, siteDir);
  return `<a class="${cls}" href="${a.url}" data-k="${a.k}">
  <span class="${cls}__img"><img src="${esc(p.src)}"${p.srcset ? ` srcset="${esc(p.srcset)}" sizes="(max-width: 699px) 40vw, (max-width: 1099px) 46vw, 380px"` : ''} alt="" width="1280" height="853" loading="lazy" decoding="async">${i != null ? `<i class="${cls}__no">${two(i + 1)}</i>` : ''}<i class="${cls}__go" aria-hidden="true">${ic('arrow')}</i></span>
  <span class="${cls}__txt"><span class="${cls}__meta"><span class="ap-chip">${esc(a.cat)}</span><small>${fa(a.mins)} دقیقه</small></span><b>${esc(a.title)}</b><small class="${cls}__by">${esc(a.by)} · ${esc(jalali(a.updated))}</small></span>
</a>`;
}

function related(a, list) {
  const pool = list.filter((x) => x.slug !== a.slug);
  const pick = [];
  (a.related || []).forEach((s) => { const x = pool.find((y) => y.slug === s); if (x && !pick.includes(x)) pick.push(x); });
  pool.filter((x) => x.k === a.k).forEach((x) => { if (pick.length < 3 && !pick.includes(x)) pick.push(x); });
  pool.forEach((x) => { if (pick.length < 3 && !pick.includes(x)) pick.push(x); });
  return pick.slice(0, 3);
}

/* ---------- داده‌ی ساختاریافته ---------- */
function ldArticle(a) {
  const url = `${SITE_URL}/${a.url}`;
  const cover = `${SITE_URL}/${pic(a.cover).src.replace(/-\d+\.webp$/, '-1920.webp')}`;
  const org = { '@type': 'MedicalClinic', '@id': `${SITE_URL}/#clinic`, name: 'ساسان کلینیک', url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/img/icon-512.png` } };
  const out = [{
    '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url }, headline: a.title.slice(0, 110), description: a.desc,
    image: [cover], datePublished: a.date, dateModified: a.updated, inLanguage: 'fa-IR',
    articleSection: a.cat, keywords: a.tags.join('، '), wordCount: a.words,
    author: { '@type': 'Organization', name: `${a.by} ساسان کلینیک`, url: `${SITE_URL}/doctors.html` },
    publisher: org, isPartOf: { '@type': 'Blog', name: 'مجله‌ی سلامت ساسان کلینیک', url: `${SITE_URL}/articles.html` }
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [['خانه', `${SITE_URL}/`], ['مقالات', `${SITE_URL}/articles.html`], [a.cat, `${SITE_URL}/articles.html#cat-${a.k}`], [a.title, url]]
      .map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item }))
  }];
  if (a.faq.length) out.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: plain(f.q), acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } })) });
  return out;
}

function seoBlock(o) {
  const out = ['<!-- SEO (ساخته‌شده با server/lib/articles.js؛ دستی ویرایش نکنید) -->',
    `<link rel="canonical" href="${esc(o.url)}">`,
    `<meta property="og:type" content="${o.type}">`,
    '<meta property="og:site_name" content="ساسان کلینیک">',
    '<meta property="og:locale" content="fa_IR">',
    `<meta property="og:title" content="${esc(o.title)}">`,
    `<meta property="og:description" content="${esc(o.desc)}">`,
    `<meta property="og:url" content="${esc(o.url)}">`,
    `<meta property="og:image" content="${esc(o.image)}">`,
    `<meta property="og:image:alt" content="${esc(o.imageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">'];
  if (o.published) out.push(`<meta property="article:published_time" content="${o.published}">`, `<meta property="article:modified_time" content="${o.modified}">`, `<meta property="article:section" content="${esc(o.section)}">`);
  (o.ld || []).forEach((x) => out.push('<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, '\\u003c') + '</script>'));
  out.push('<!-- /SEO -->');
  return out.join('\n');
}

/* ---------- قالب: یک صفحه‌ی آماده‌ی سایت با main، عنوان، توضیح و SEO تازه ---------- */
function fromTemplate(tpl, o) {
  let t = tpl;
  t = t.replace(/data-page="[^"]*"/, `data-page="${o.page}"`);
  t = t.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(o.title)}</title>`);
  t = t.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(o.desc)}">`);
  if (/<!-- SEO[\s\S]*?<!-- \/SEO -->/.test(t)) t = t.replace(/<!-- SEO[\s\S]*?<!-- \/SEO -->/, () => o.seo);
  else t = t.replace(/(<meta name="description" content="[^"]*">)/, (m) => m + '\n' + o.seo);
  t = t.replace(/<main id="main"[\s\S]*?<\/main>/, () => o.main);
  /* پیوند «مقالات» در هدر، منو و فوتر روشن می‌شود */
  t = t.replace(/ aria-current="page"/g, '').replace(/(<a\b[^>]*\bhref="articles\.html")/g, '$1 aria-current="page"');
  /* استایل و اسکریپت صفحه‌های مقاله */
  t = t.replace(/<link rel="stylesheet" href="css\/pages\.css">(\n<link rel="stylesheet" href="css\/[a-z-]+\.css">)*/, '<link rel="stylesheet" href="css/pages.css">\n<link rel="stylesheet" href="css/articles.css">' + (o.preload ? '\n' + o.preload : ''));
  t = t.replace(/<script src="js\/pages\.js"><\/script>(\n<script src="js\/[a-z-]+\.js"><\/script>)*/, '<script src="js/pages.js"></script>\n' + (o.mg ? '<script src="js/mg.js"></script>\n' : '') + '<script src="js/article.js"></script>');
  return t;
}

/* ---------- صفحه‌ی مقاله ---------- */
function articleMain(a, list, siteDir) {
  const c = CATS[a.k];
  const cov = pic(a.cover, siteDir);
  const toc = a.toc.map((x, i) => `<li><a href="#${x.id}" data-toc="${x.id}"><span>${two(i + 1)}</span>${esc(x.t)}</a></li>`).join('');
  const points = a.points.length ? `<aside class="ap-sum" aria-labelledby="ap-sum-h"><p class="ap-sum__h" id="ap-sum-h">${ic('sparkles')}خلاصه در چند خط</p><ul>${a.points.map((p) => `<li>${p}</li>`).join('')}</ul></aside>` : '';
  const faq = a.faq.length ? `<section class="ap-faq" aria-labelledby="ap-faq-h">
        <h2 id="ap-faq-h">سؤال‌هایی که زیاد می‌پرسند</h2>
        ${a.faq.map((f, i) => `<details class="ap-q"${i === 0 ? ' open' : ''}><summary><span>${f.q}</span><i aria-hidden="true"></i></summary><div class="ap-q__a"><p>${f.a}</p></div></details>`).join('\n        ')}
      </section>` : '';
  const upd = a.updated && a.updated !== a.date ? `<li>${ic('check')}به‌روزشده در <time datetime="${a.updated}">${jalali(a.updated)}</time></li>` : '';
  const more = related(a, list);
  const share = `${SITE_URL}/${a.url}`;
  return `<main id="main" class="ap" data-k="${a.k}">
  <div class="ap-prog" aria-hidden="true"><i></i></div>
  <section class="pg-hero ap-hero" id="top" aria-labelledby="ap-title">
    <div class="pg-hero__glow" aria-hidden="true"></div>
    <div class="wrap ap-hero__in">
      <nav class="pg-crumb pg-in" style="--d:0" aria-label="مسیر صفحه"><ol><li><a href="index.html">خانه</a></li><li><a href="articles.html">مقالات</a></li><li><a href="articles.html#cat-${a.k}">${esc(a.cat)}</a></li></ol></nav>
      <p class="ap-kick pg-in" style="--d:1"><span class="ap-chip ap-chip--light">${esc(a.cat)}</span><span>${fa(a.mins)} دقیقه مطالعه</span></p>
      <h1 class="pg-title ap-title pg-in" style="--d:2" id="ap-title">${esc(a.title)}</h1>
      <p class="pg-lead ap-lead pg-in" style="--d:3">${a.lead}</p>
      <ul class="ap-meta pg-in" style="--d:4">
        <li>${ic('user-round')}${esc(a.by)} ساسان کلینیک</li>
        <li>${ic('cal')}<time datetime="${a.date}">${jalali(a.date)}</time></li>
        ${upd}
      </ul>
    </div>
  </section>
  <div class="wrap ap-cover-wrap">
    <figure class="ap-cover pg-in" style="--d:5"><img src="${esc(cov.src)}"${cov.srcset ? ` srcset="${esc(cov.srcset)}" sizes="(max-width: 1239px) calc(100vw - 32px), 1180px"` : ''} width="1920" height="1080" alt="${esc(a.coverAlt || '')}" fetchpriority="high" decoding="async"></figure>
  </div>
  <div class="wrap ap-grid">
    <aside class="ap-side" aria-label="فهرست مطالب">
      <div class="ap-side__in">
        <p class="ap-side__h">در این مقاله</p>
        <ol class="ap-toc">${toc}</ol>
        <div class="ap-side__cta" data-k="${a.k}">
          <b>${esc(c.cta[0])}</b>
          <button type="button" class="ap-side__btn" data-book="${a.k}">${ic('cal')}<span>${esc(c.book)}</span></button>
          <a class="ap-side__tel" href="tel:+981154611560">${ic('phone')}<span dir="ltr">${TEL}</span></a>
        </div>
      </div>
    </aside>
    <div class="ap-main">
      <details class="ap-tocm"><summary>${ic('file')}<span>فهرست مطالب</span><small>${fa(a.toc.length)} بخش</small><i aria-hidden="true"></i></summary><ol class="ap-toc">${toc}</ol></details>
      <article class="ap-body" aria-labelledby="ap-title">
        ${points}
        ${bodyImages(a.body, siteDir)}
      </article>
      ${faq}
      <div class="ap-end">
        <div class="ap-share" aria-label="هم‌رسانی">
          <span>این مقاله را برای کسی بفرستید:</span>
          <a class="ap-share__b" href="https://t.me/share/url?url=${encodeURIComponent(share)}&amp;text=${encodeURIComponent(a.title)}" target="_blank" rel="noopener">تلگرام</a>
          <a class="ap-share__b" href="https://wa.me/?text=${encodeURIComponent(a.title + ' ' + share)}" target="_blank" rel="noopener">واتس‌اپ</a>
          <button type="button" class="ap-share__b ap-copy" data-url="${esc(share)}">${ic('copy')}<span>کپی لینک</span></button>
        </div>
        <p class="ap-note">این مقاله را ${esc(a.by)} ساسان کلینیک برای آگاهی عمومی نوشته است و جای معاینه و تشخیص پزشک را نمی‌گیرد. آخرین بازبینی: ${jalali(a.updated)}.</p>
      </div>
    </div>
  </div>
  <section class="ap-cta" data-k="${a.k}" aria-labelledby="ap-cta-h">
    <div class="wrap">
      <div class="ap-cta__in">
        <div class="ap-cta__t"><h2 id="ap-cta-h">${esc(c.cta[0])}</h2><p>${esc(c.cta[1])}</p></div>
        <div class="ap-cta__acts">
          <button type="button" class="btn btn--light btn--lg" data-book="${a.k}">${ic('cal')}${esc(c.book)}</button>
          <a class="btn btn--outline-light btn--lg" href="tel:+981154611560">${ic('phone')}<span dir="ltr">${TEL}</span></a>
        </div>
      </div>
    </div>
  </section>
  <section class="ap-more" aria-labelledby="ap-more-h">
    <div class="wrap">
      <header class="sec-head"><div><p class="kicker">ادامه‌ی مطالعه</p><h2 class="sec-title" id="ap-more-h">مقاله‌های مرتبط</h2></div><a class="link-arrow" href="articles.html">همه‌ی مقاله‌ها${ic('arrow')}</a></header>
      <div class="ac-grid">${more.map((x) => card(x, null, siteDir)).join('\n')}</div>
    </div>
  </section>
</main>`;
}

function articlePage(a, list, tpl, siteDir) {
  const cov = pic(a.cover, siteDir);
  const image = `${SITE_URL}/${cov.src.replace(/-\d+\.webp$/, '-1920.webp')}`;
  const seo = seoBlock({ type: 'article', url: `${SITE_URL}/${a.url}`, title: a.title, desc: a.desc, image, imageAlt: a.coverAlt || a.title,
    published: a.date, modified: a.updated, section: a.cat, ld: ldArticle(a) });
  const preload = cov.srcset ? `<link rel="preload" as="image" href="${esc(cov.src)}" imagesrcset="${esc(cov.srcset)}" imagesizes="(max-width: 1239px) calc(100vw - 32px), 1180px" fetchpriority="high">` : '';
  return fromTemplate(tpl, { page: 'article', title: a.seo, desc: a.desc, seo, main: articleMain(a, list, siteDir), preload, mg: /data-mg=/.test(a.body) });
}

/* ---------- فهرست همه‌ی مقاله‌ها ---------- */
function indexMain(list, siteDir) {
  const counts = Object.fromEntries(ORDER.map((k) => [k, list.filter((a) => a.k === k).length]));
  const mins = list.reduce((s, a) => s + a.mins, 0);
  const last = list.reduce((m, a) => (a.updated > m ? a.updated : m), '');
  const feat = list.filter((a) => a.feature).slice(0, 4);
  const F = feat.length >= 2 ? feat : list.slice(0, 4);
  const slides = F.map((a, i) => {
    const p = pic(a.cover, siteDir);
    return `<a class="axf__slide${i ? '' : ' is-on'}" href="${a.url}" data-k="${a.k}" tabindex="${i ? -1 : 0}" draggable="false" aria-label="${esc(a.title)}"><span class="axf__in"><img src="${esc(p.src)}"${p.srcset ? ` srcset="${esc(p.srcset)}" sizes="(max-width: 1239px) calc(100vw - 32px), 1180px"` : ''} alt="" width="1920" height="1080" decoding="async"${i ? ' loading="lazy"' : ' fetchpriority="high"'}></span></a>`;
  }).join('');
  const txts = F.map((a, i) => `<div class="axf__t${i ? '' : ' is-on'}" data-i="${i}"${i ? ' hidden' : ''}><span class="ap-chip ap-chip--light">${esc(a.cat)}</span><b>${esc(a.title)}</b><small>${ic('clock')}${fa(a.mins)} دقیقه مطالعه · ${esc(a.by)}</small></div>`).join('');
  const idx = F.map((a, i) => `<li><button type="button" data-i="${i}"${i ? '' : ' aria-current="true"'} aria-label="مقاله‌ی ${fa(i + 1)}: ${esc(a.title)}"><span class="axf__no">${two(i + 1)}</span><span class="axf__c">${esc(a.cat)}</span><i class="axf__bar"><i></i></i></button></li>`).join('');
  const tabs = `<button type="button" data-f="all" aria-pressed="true">همه <small>${fa(list.length)}</small></button>` + ORDER.filter((k) => counts[k]).map((k) => `<button type="button" data-f="${k}" aria-pressed="false">${CATS[k].name} <small>${fa(counts[k])}</small></button>`).join('');
  return `<main id="main" class="ax">
  <section class="pg-hero ax-hero" id="top" aria-labelledby="ax-title">
    <div class="pg-hero__glow" aria-hidden="true"></div>
    <div class="wrap">
      <nav class="pg-crumb pg-in" style="--d:0" aria-label="مسیر صفحه"><ol><li><a href="index.html">خانه</a></li><li aria-current="page">مقالات</li></ol></nav>
      <p class="kicker kicker--light pg-in" style="--d:1">مجله‌ی سلامت ساسان کلینیک</p>
      <h1 class="pg-title pg-in" style="--d:2" id="ax-title">پیش از درمان، <em>با خیال راحت بخوانید</em></h1>
      <p class="pg-lead pg-in" style="--d:3">راهنماهایی که پزشکان ساسان کلینیک سلمان‌شهر برای بیمارانشان نوشته‌اند؛ از دندانپزشکی و زیبایی تا فشار خون، بخیه و سرم. ساده، دقیق و به زبان خودمانی.</p>
      <dl class="pg-stats pg-in" style="--d:4">
        <div><dt>مقاله</dt><dd data-count="${list.length}">${fa(list.length)}</dd></div>
        <div><dt>بخش</dt><dd data-count="${ORDER.filter((k) => counts[k]).length}">${fa(ORDER.filter((k) => counts[k]).length)}</dd></div>
        <div><dt>دقیقه مطالعه</dt><dd data-count="${mins}">${fa(mins)}</dd></div>
        <div><dt>آخرین به‌روزرسانی</dt><dd class="ax-last">${esc(jalali(last))}</dd></div>
      </dl>
    </div>
  </section>

  <section class="axf" aria-roledescription="carousel" aria-label="مقاله‌های برگزیده">
    <div class="wrap">
      <div class="axf__stage">${slides}<i class="axf__shade" aria-hidden="true"></i><div class="axf__txt" aria-live="polite">${txts}</div><span class="axf__go" aria-hidden="true">خواندن مقاله${ic('arrow')}</span></div>
      <div class="axf__nav"><ol class="axf__idx">${idx}</ol><div class="axf__arrows"><button type="button" class="axf__arrow" data-d="-1" aria-label="مقاله‌ی قبلی">${ic('arrow-r')}</button><button type="button" class="axf__arrow" data-d="1" aria-label="مقاله‌ی بعدی">${ic('arrow')}</button></div></div>
    </div>
  </section>

  <section class="ax-list" id="list" aria-labelledby="ax-list-h">
    <h2 class="sr-only" id="ax-list-h">همه‌ی مقاله‌ها</h2>
    <i class="pg-bar__top" aria-hidden="true"></i>
    <div class="pg-bar ax-bar">
      <div class="wrap pg-bar__in">
        <div class="ar-tabs ax-tabs" role="group" aria-label="نمایش مقاله‌ها بر اساس بخش">${tabs}</div>
        <p class="pg-count ax-count" aria-live="polite"><b>${fa(list.length)}</b> مقاله</p>
      </div>
    </div>
    <div class="wrap">
      <div class="ac-grid ax-grid">${list.map((a, i) => card(a, i, siteDir)).join('\n')}</div>
    </div>
  </section>

  <section class="cs-cta ax-cta" aria-labelledby="ax-cta-h">
    <div class="wrap">
      <div class="cs-cta__in" data-rv>
        <h2 class="cs-cta__t" id="ax-cta-h">سؤالتان در مقاله‌ها نبود؟</h2>
        <p class="cs-cta__p">با پذیرش ساسان کلینیک تماس بگیرید یا درخواست نوبت بدهید؛ پزشک عمومی شبانه‌روز در کلینیک است.</p>
        <div class="cs-cta__row">${ORDER.map((k) => `<button type="button" class="cs-cta__b" data-book="${k}" data-k="${k}"><span class="cs-cta__ic">${ic(k === 'dental' ? 'tooth' : k === 'beauty' ? 'sparkles' : 'steth')}</span><b>${k === 'medicine' ? 'پزشک عمومی' : CATS[k].name}</b><span class="cs-cta__go">${ic('arrow')}</span></button>`).join('')}</div>
      </div>
    </div>
  </section>
</main>`;
}

function indexPage(list, tpl, siteDir) {
  const title = 'مقالات سلامت؛ دندانپزشکی، زیبایی و پزشکی | ساسان کلینیک سلمان‌شهر';
  const desc = `مجله‌ی سلامت ساسان کلینیک سلمان‌شهر: ${fa(list.length)} مقاله‌ی کاربردی درباره‌ی ایمپلنت، حساسیت دندان، ضدآفتاب، بوتاکس، لیزر، فشار خون، بخیه و سرم‌تراپی.`;
  const cov = list[0] ? `${SITE_URL}/${pic(list[0].cover, siteDir).src.replace(/-\d+\.webp$/, '-1920.webp')}` : `${SITE_URL}/img/og-image.jpg`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Blog', '@id': `${SITE_URL}/articles.html#blog`, name: 'مجله‌ی سلامت ساسان کلینیک', url: `${SITE_URL}/articles.html`, inLanguage: 'fa-IR',
    publisher: { '@type': 'MedicalClinic', '@id': `${SITE_URL}/#clinic`, name: 'ساسان کلینیک' },
    blogPost: list.map((a) => ({ '@type': 'BlogPosting', headline: a.title.slice(0, 110), url: `${SITE_URL}/${a.url}`, datePublished: a.date, dateModified: a.updated }))
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'خانه', item: `${SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: 'مقالات', item: `${SITE_URL}/articles.html` }]
  }];
  const seo = seoBlock({ type: 'website', url: `${SITE_URL}/articles.html`, title, desc, image: cov, imageAlt: 'مجله‌ی سلامت ساسان کلینیک', ld });
  return fromTemplate(tpl, { page: 'articles', title, desc, seo, main: indexMain(list, siteDir) });
}

/* ---------- ردیف‌های مجله در صفحه‌ی اصلی (شش مقاله) ---------- */
function magList(list, siteDir) {
  const six = list.slice(0, 6);
  const rows = six.map((a, i) => `        <li data-rv class="mag__item" data-k="${a.k}">
          <a class="mag__row" href="${a.url}" data-i="${i}">
            <span class="mag__media"><img src="${esc(pic(a.cover, siteDir).src.replace(/-\d+\.webp$/, '-720.webp'))}" alt="" width="1120" height="700" loading="lazy" decoding="async"></span>
            <span class="mag__no">${two(i + 1)}</span>
            <span class="mag__cat">${esc(a.cat)}</span>
            <span class="mag__title">${esc(a.title)}</span>
            <span class="mag__meta">${fa(a.mins)} دقیقه مطالعه · ${esc(a.by)}</span>
            <span class="mag__go" aria-hidden="true">${ic('arrow').replace('class="ic" aria-hidden="true"', 'class="ic"')}</span>
          </a>
        </li>`).join('\n');
  const pv = six.map((a, i) => `<img src="${esc(a.coverP || pic(a.cover, siteDir).src.replace(/-\d+\.webp$/, '-720.webp'))}" alt="" width="800" height="1000" loading="lazy" decoding="async" data-i="${i}">`).join('');
  return { rows, pv };
}

/* کارت مقاله‌های یک بخش برای صفحه‌ی همان بخش (dental.html و …)، بین <!-- ARTICLES:dept:بخش --> و <!-- /ARTICLES:dept:بخش --> */
function deptCards(list, k, siteDir, max = 6) {
  return list.filter((a) => a.k === k).slice(0, max).map((a) => card(a, null, siteDir)).join('\n');
}

module.exports = { SITE_URL, CATS, WIDTHS, parse, normalize, loadDir, merge, sort, articlePage, indexPage, magList, deptCards, jalali, fa, esc, strip, pic };
