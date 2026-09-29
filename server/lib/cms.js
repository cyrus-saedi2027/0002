/* ==========================================================================
   مقاله‌های پنل: نوشتن، ویرایش، پیش‌نویس، برداشتن از سایت و عکس
   - مقاله‌های خود سایت در content/articles اند و دست نمی‌خورند. هر تغییر پنل در data/articles/<slug>.json است:
     مقاله‌ی تازه، یا نسخه‌ی ویرایش‌شده‌ی یک مقاله‌ی سایت که روی همان می‌نشیند (hidden = پیش‌نویس یا برداشته از سایت).
   - بعد از هر تغییر، صفحه‌هایی که به فهرست مقاله‌ها بستگی دارند در حافظه دوباره ساخته می‌شوند: صفحه‌ی هر مقاله،
     articles.html (شمار مقاله‌ها و بخش‌ها)، ردیف‌های مجله‌ی صفحه‌ی اصلی، کارت‌های صفحه‌ی هر بخش و sitemap.xml.
     سرور همین‌ها را به‌جای فایل‌های site/ می‌فرستد؛ پوشه‌ی site دست نمی‌خورد و git pull بعدی هم بی‌دردسر است.
   - عکس‌ها را مرورگر در سه اندازه‌ی ۷۲۰، ۱۲۸۰ و ۱۹۲۰ پیکسل WebP می‌سازد؛ این‌جا فقط بررسی و در
     data/uploads/img/art/p/ ذخیره می‌شوند و از نشانی /img/art/p/ فرستاده می‌شوند.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const A = require('./articles');
const S = require('./sanitize');
const T = require('./tehran');

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ART = /^img\/art\/[a-z0-9-]+\/[a-z0-9-]+$/;
const UP = 'img/art/p';
const WIDTHS = ['720', '1280', '1920'];
/* مشخصاتی از مقاله‌ی سایت که در پنل ویرایش نمی‌شوند و روی نسخه‌ی پنل هم می‌مانند */
const KEEP = ['id', 'coverP', 'feature', 'pin', 'related', 'by'];
const FIELDS = ['slug', 'k', 'title', 'seo', 'desc', 'lead', 'cover', 'coverAlt', 'points', 'faq', 'tags', 'date', 'updated'];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const plainLen = (h) => A.strip(h).length;

/* پهنا و بلندی WebP از سربرگ فایل (VP8، VP8L یا VP8X) */
function webpSize(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const c = b.toString('ascii', 12, 16);
  if (c === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (c === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  if (c === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  return null;
}

class ArticleCMS {
  constructor({ siteDir, contentDir, dataDir, log }) {
    this.siteDir = siteDir;
    this.contentDir = contentDir;
    this.dir = path.join(dataDir, 'articles');
    this.upRoot = path.join(dataDir, 'uploads');
    this.upDir = path.join(this.upRoot, UP);
    this.log = log || (() => {});
    fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(this.upDir, { recursive: true });
    this.chain = Promise.resolve();
    this.docs = new Map();
    this.overlay = null;
    this.load();
  }

  /* ---------- خواندن ---------- */
  load() {
    this.base = [];
    this.raw = new Map();
    if (fs.existsSync(this.contentDir)) {
      fs.readdirSync(this.contentDir).filter((f) => f.endsWith('.html')).forEach((f) => {
        try {
          const text = fs.readFileSync(path.join(this.contentDir, f), 'utf8');
          const a = A.parse(text, f);
          const m = /^\s*<!--\s*(\{[\s\S]*?\})\s*-->\s*/.exec(text);
          this.base.push(a);
          this.raw.set(a.slug, { meta: JSON.parse(m[1]), body: text.slice(m[0].length).trim() });
        } catch (e) { this.log('articles:', e.message); }
      });
    }
    fs.readdirSync(this.dir).filter((f) => f.endsWith('.json')).forEach((f) => {
      try { const d = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8')); if (d && SLUG.test(d.slug || '')) this.docs.set(d.slug, d); } catch (e) { this.log('articles: خراب', f); }
    });
    try { this.overlay = this.build(this.docs); } catch (e) { this.log('articles: ساختن صفحه‌ها', e.message); this.overlay = null; }
  }

  /* مقاله‌ی نهایی یک سند پنل (با مشخصات ثابت مقاله‌ی سایت، اگر هست) */
  norm(d, base) {
    const orig = base ? this.raw.get(base.slug).meta : null;
    const meta = Object.assign(orig ? pick(orig, KEEP) : {}, pick(d, FIELDS));
    /* عکس عمودی صفحه‌ی اصلی فقط وقتی می‌ماند که عکس اصلی عوض نشده باشد */
    if (orig && d.cover !== orig.cover) delete meta.coverP;
    return A.normalize(meta, d.body);
  }
  /* همه‌ی مقاله‌ها، منتشرشده و پنهان، با منبعشان: site (دست‌نخورده)، edited (ویرایش پنل روی مقاله‌ی سایت)، panel (تازه) */
  effective(docs = this.docs) {
    const out = [];
    const seen = new Set();
    this.base.forEach((a) => {
      seen.add(a.slug);
      const d = docs.get(a.slug);
      if (!d) out.push(Object.assign({}, a, { src: 'site', hidden: false }));
      else if (!d.title) out.push(Object.assign({}, a, { src: 'site', hidden: !!d.hidden, doc: d }));
      else out.push(Object.assign(this.norm(d, a), { src: 'edited', hidden: !!d.hidden, doc: d }));
    });
    docs.forEach((d) => { if (!seen.has(d.slug) && d.title) out.push(Object.assign(this.norm(d), { src: 'panel', hidden: !!d.hidden, doc: d })); });
    return out;
  }

  /* ---------- ساختن صفحه‌ها ---------- */
  build(docs) {
    if (!docs.size) return null;
    const all = this.effective(docs);
    const pub = A.sort(all.filter((a) => !a.hidden));
    if (!pub.length) throw new Error('دست‌کم یک مقاله باید در سایت بماند');
    const out = A.renderAll(pub, this.siteDir, [this.siteDir, this.upRoot]);
    const sm = this.sitemap(pub);
    if (sm) out.set('sitemap.xml', sm);
    return { out, gone: new Set(all.filter((a) => a.hidden).map((a) => a.url)) };
  }
  /* همان sitemap ساخته‌شده با tools/seo.py، با ردیف مقاله‌های تازه */
  sitemap(pub) {
    let xml;
    try { xml = fs.readFileSync(path.join(this.siteDir, 'sitemap.xml'), 'utf8'); } catch (e) { return null; }
    const D = A.SITE_URL;
    const rows = xml.split('\n').filter((r) => !/<loc>[^<]*\/article-[^<]*<\/loc>/.test(r));
    const last = pub.reduce((m, a) => (a.updated > m ? a.updated : m), '');
    const cover = (a) => `${D}/${A.pic(a.cover, [this.siteDir, this.upRoot]).src.replace(/-\d+\.webp$/, '-1920.webp')}`;
    const art = pub.slice().sort((x, y) => (x.url < y.url ? -1 : 1))
      .map((a) => `  <url><loc>${D}/${a.url}</loc><lastmod>${a.updated}</lastmod><priority>0.7</priority><image:image><image:loc>${A.esc(cover(a))}</image:loc></image:image></url>`);
    let i = rows.findIndex((r) => r.includes(`<loc>${D}/articles.html</loc>`));
    if (i >= 0 && last) rows[i] = rows[i].replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${last}</lastmod>`);
    if (i < 0) i = rows.findIndex((r) => r.includes('</urlset>'));
    rows.splice(i < 0 ? rows.length : i, 0, ...art);
    return rows.join('\n');
  }
  /* HTML تازه‌ی یک صفحه، false اگر مقاله برداشته شده، یا null (همان فایل site/) */
  page(name) {
    const o = this.overlay;
    if (!o) return null;
    if (o.out.has(name)) return o.out.get(name);
    return o.gone.has(name) ? false : null;
  }
  /* فایل عکس بارگذاری‌شده برای نشانی /img/art/p/… */
  uploadFile(rel) {
    const m = /^\/img\/art\/p\/(p[a-f0-9]{10}-(?:720|1280|1920)\.webp)$/.exec(rel);
    return m ? path.join(this.upDir, m[1]) : null;
  }

  /* ---------- برای پنل ---------- */
  list() {
    const imgs = [this.siteDir, this.upRoot];
    return A.sort(this.effective()).map((a) => ({
      slug: a.slug, url: a.url, k: a.k, cat: a.cat, title: a.title, lead: A.strip(a.lead).slice(0, 200),
      cover: A.pic(a.cover, imgs).src.replace(/-\d+\.webp$/, '-720.webp'), date: a.date, updated: a.updated,
      words: a.words, mins: a.mins, sections: a.toc.length, faq: a.faq.length, hidden: a.hidden, src: a.src,
      savedBy: a.doc && a.doc.savedBy ? a.doc.savedBy.name : '', savedAt: (a.doc && a.doc.savedAt) || ''
    }));
  }
  get(slug) {
    const a = this.effective().find((x) => x.slug === slug);
    if (!a) return null;
    const d = a.doc && a.doc.title ? a.doc : null;
    const r = !d && this.raw.get(slug);
    const src = d || Object.assign({}, r.meta, { body: r.body });
    const out = pick(src, FIELDS.concat(['body']));
    ['points', 'faq', 'tags'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    return Object.assign(out, { url: a.url, src: a.src, hidden: a.hidden, words: a.words, mins: a.mins,
      savedBy: d && d.savedBy ? d.savedBy.name : '', savedAt: (d && d.savedAt) || '', coverUrl: A.pic(a.cover, [this.siteDir, this.upRoot]).src });
  }
  coverOk(c) {
    return ART.test(c) && WIDTHS.some((w) => [this.siteDir, this.upRoot].some((d) => fs.existsSync(path.join(d, `${c}-${w}.webp`))));
  }
  /* ورودی فرم پنل → { v } یا { error } */
  validate(b, { slug, base, prev }) {
    const arr = (x) => (Array.isArray(x) ? x : []);
    const k = String(b.k || '');
    if (!A.CATS[k]) return { error: 'بخش مقاله را انتخاب کنید' };
    const title = S.text(b.title, 300);
    if (title.length < 10) return { error: 'عنوان دست‌کم ۱۰ نویسه باشد' };
    if (title.length > 110) return { error: 'عنوان خیلی بلند است (حداکثر ۱۱۰ نویسه)' };
    const lead = S.inline(b.lead);
    if (plainLen(lead) < 40) return { error: 'مقدمه دست‌کم ۴۰ نویسه باشد' };
    if (plainLen(lead) > 700) return { error: 'مقدمه خیلی بلند است (حداکثر ۷۰۰ نویسه)' };
    const body = S.body(b.body);
    if (plainLen(body) < 200) return { error: 'متن مقاله خیلی کوتاه است' };
    if (body.length > 250000) return { error: 'متن مقاله خیلی بلند است' };
    const cover = S.text(b.cover, 120);
    if (!this.coverOk(cover)) return { error: 'عکس اصلی مقاله را بگذارید' };
    const points = arr(b.points).map((x) => S.inline(x).slice(0, 600)).filter((x) => plainLen(x) > 1).slice(0, 8);
    const faq = arr(b.faq).map((f) => ({ q: S.inline(f && f.q).slice(0, 300), a: S.inline(f && f.a).slice(0, 2500) })).filter((f) => plainLen(f.q) > 2 && plainLen(f.a) > 2).slice(0, 12);
    const tags = [...new Set(arr(b.tags).map((t) => S.text(t, 40)).filter(Boolean))].slice(0, 12);
    const today = T.today();
    const v = {
      slug, k, title, lead, body, cover, points, faq, tags,
      seo: S.text(b.seo, 90) || `${title} | ساسان کلینیک`,
      desc: S.text(b.desc, 220) || A.strip(lead).slice(0, 155),
      coverAlt: S.text(b.coverAlt, 160),
      date: (prev && prev.date) || (base && base.date) || today,
      updated: today,
      hidden: !!b.hidden
    };
    return { v };
  }

  /* ذخیره‌ی یک سند: اول صفحه‌ها با نسخه‌ی تازه ساخته می‌شوند؛ اگر خطا داشت، چیزی نوشته نمی‌شود */
  async commit(slug, doc) {
    const next = new Map(this.docs);
    if (doc) next.set(slug, doc); else next.delete(slug);
    const overlay = this.build(next);
    const file = path.join(this.dir, slug + '.json');
    this.chain = this.chain.then(() => new Promise((res, rej) => {
      if (!doc) return fs.unlink(file, (e) => (e && e.code !== 'ENOENT' ? rej(e) : res()));
      const tmp = file + '.' + process.pid + '.tmp';
      fs.writeFile(tmp, JSON.stringify(doc, null, 1), { mode: 0o600 }, (e) => (e ? rej(e) : fs.rename(tmp, file, (e2) => (e2 ? rej(e2) : res()))));
    }));
    await this.chain;
    this.docs = next;
    this.overlay = overlay;
  }
  async save(slug, input, user, { create = false } = {}) {
    slug = String(slug || '').trim().toLowerCase();
    if (!SLUG.test(slug) || slug.length < 3 || slug.length > 60) return { error: 'نشانی صفحه: ۳ تا ۶۰ حرف کوچک انگلیسی، عدد و خط تیره؛ مثلاً implant-care' };
    const base = this.base.find((a) => a.slug === slug) || null;
    const prev = this.docs.get(slug) || null;
    if (create && (base || prev)) return { error: 'مقاله‌ای با همین نشانی هست؛ نشانی دیگری بنویسید', code: 409 };
    if (!create && !base && !prev) return { error: 'این مقاله پیدا نشد', code: 404 };
    const r = this.validate(input, { slug, base, prev: prev && prev.title ? prev : null });
    if (r.error) return r;
    const now = new Date().toISOString();
    const by = { id: user.id, name: user.name };
    const doc = Object.assign(r.v, { savedBy: by, savedAt: now, createdBy: (prev && prev.createdBy) || by, createdAt: (prev && prev.createdAt) || now });
    try { await this.commit(slug, doc); } catch (e) { this.log('articles: ذخیره', e.message); return { error: e.message.startsWith('دست‌کم') ? e.message : 'ساختن صفحه‌ی مقاله ممکن نشد' }; }
    return { article: this.get(slug), created: !base && !prev };
  }
  /* پیش‌نویس یا برداشتن از سایت، و برگرداندن */
  async setHidden(slug, hidden) {
    const base = this.base.find((a) => a.slug === slug);
    const prev = this.docs.get(slug);
    if (!base && !prev) return { error: 'این مقاله پیدا نشد', code: 404 };
    const doc = prev ? Object.assign({}, prev, { hidden: !!hidden }) : { slug, hidden: !!hidden };
    /* مقاله‌ی سایت که دوباره نمایش داده می‌شود و ویرایشی ندارد: نیازی به سند نیست */
    const drop = base && !doc.title && !doc.hidden;
    try { await this.commit(slug, drop ? null : doc); } catch (e) { return { error: e.message }; }
    return { article: this.get(slug) };
  }
  /* مقاله‌ی پنل پاک می‌شود؛ مقاله‌ی سایت به نسخه‌ی اصلی خودش برمی‌گردد */
  async remove(slug) {
    const base = this.base.find((a) => a.slug === slug);
    if (!this.docs.has(slug)) return { error: base ? 'این مقاله همان نسخه‌ی اصلی سایت است' : 'این مقاله پیدا نشد', code: base ? 400 : 404 };
    try { await this.commit(slug, null); } catch (e) { return { error: e.message }; }
    return { removed: !base, reverted: !!base, article: base ? this.get(slug) : null };
  }
  /* عکس: { '720': base64, '1280': base64, '1920': base64 } → { base: 'img/art/p/p…' } */
  async saveUpload(files) {
    if (!files || typeof files !== 'object') return { error: 'عکسی نرسید' };
    const bufs = {};
    for (const w of WIDTHS) {
      const b64 = String(files[w] || '');
      if (!b64) return { error: 'هر سه اندازه‌ی عکس لازم است' };
      const buf = Buffer.from(b64, 'base64');
      const sz = webpSize(buf);
      if (!sz) return { error: 'فقط عکس WebP پذیرفته می‌شود' };
      if (buf.length > 3.5e6) return { error: 'عکس خیلی حجیم است' };
      if (Math.abs(sz.w - Number(w)) > 2 || sz.h < 100 || sz.h > Number(w) * 2) return { error: 'اندازه‌ی عکس درست نیست' };
      bufs[w] = buf;
    }
    const name = 'p' + crypto.randomBytes(5).toString('hex');
    await Promise.all(WIDTHS.map((w) => fs.promises.writeFile(path.join(this.upDir, `${name}-${w}.webp`), bufs[w], { mode: 0o644 })));
    return { base: `${UP}/${name}`, url: `/${UP}/${name}-1280.webp` };
  }
}

module.exports = { ArticleCMS, webpSize };
