/* ==========================================================================
   پاک‌سازی HTML مقاله‌هایی که از پنل نوشته می‌شوند
   فقط برچسب‌ها و کلاس‌هایی می‌مانند که قالب مقاله‌های سایت دارد؛ هیچ اسکریپت، رویداد (on…)، style، id یا src
   از پنل به سایت نمی‌رسد. عکس‌ها فقط با data-art (مسیر img/art/…) می‌آیند و خود سایت نسخه‌هایشان را می‌سازد.
   body():   متن کامل مقاله (تیتر، پاراگراف، فهرست، جدول، عکس، کادر نکته و هشدار، نمودار تعاملی موجود)
   inline(): مقدمه، خلاصه و سؤال‌ها (فقط پررنگ، کج، لینک و شکست خط)
   text():   متن ساده (عنوان، توضیح گوگل، برچسب‌ها)
   ========================================================================== */
'use strict';

const VOID = new Set(['br', 'img']);
/* محتوای این‌ها کامل دور ریخته می‌شود، نه فقط برچسبشان */
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'svg', 'math', 'textarea', 'select',
  'button', 'form', 'head', 'title', 'video', 'audio', 'canvas', 'frame', 'frameset', 'applet', 'link', 'meta', 'base']);
const BODY = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 'a', 'br', 'blockquote', 'cite', 'sub', 'sup',
  'figure', 'figcaption', 'img', 'aside', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);
const INLINE = new Set(['b', 'strong', 'i', 'em', 'a', 'br']);
/* کلاس‌های مجاز هر برچسب (دقیقاً همین ترکیب‌ها)؛ div و span بدون کلاس مجاز فقط باز می‌شوند */
const CLS = {
  figure: ['ap-fig', 'ap-fig ap-fig--portrait', 'ap-pair', 'ap-mg'],
  figcaption: ['ap-mg__h'],
  span: ['ap-mg__t', 'ap-mg__k'],
  div: ['ap-mg__cv', 'ap-table'],
  p: ['ap-mg__cap'],
  aside: ['ar-box ar-box--tip', 'ar-box ar-box--warn', 'ar-box ar-box--ok'],
  table: ['ar-cmp']
};
const NEED_CLASS = new Set(['span', 'div', 'aside']);
/* مثل خود مرورگر: باز شدن این‌ها داخل <p>، پاراگراف را می‌بندد */
const CLOSES_P = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'blockquote', 'figure', 'aside', 'div', 'table']);
const ART = /^img\/art\/[a-z0-9-]+\/[a-z0-9-]+$/;
const RATIOS = ['3/2', '4/5', '16/9', '1/1', '4/3'];
const HREF = /^(https?:\/\/[^\s"'<>]+|[a-z0-9-]+\.html(#[\w-]+)?|#[\w-]+|tel:\+?[\d-]{5,20}|mailto:[^\s"'<>]+)$/i;

const escText = (s) => String(s).replace(/&(?!(?:[a-z][a-z0-9]{1,31}|#\d{1,7}|#x[\da-f]{1,6});)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const oneLine = (s) => String(s || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

function attrsOf(raw) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(raw))) out[m[1].toLowerCase()] = decode(m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : '');
  return out;
}

/* برچسب باز پاک‌شده، یا '' اگر خود برچسب باید کنار برود (محتوایش می‌ماند) */
function openTag(tag, a) {
  const cls = oneLine(a.class || '');
  let at = '';
  if (CLS[tag]) {
    if (CLS[tag].includes(cls)) at += ` class="${cls}"`;
    else if (NEED_CLASS.has(tag)) return '';
    else if (tag === 'figure') at += ' class="ap-fig"';
  }
  if (tag === 'figure' && cls === 'ap-mg') {
    if (!/^[a-z0-9-]{2,40}$/.test(a['data-mg'] || '')) return '';
    at += ` data-mg="${a['data-mg']}"`;
  }
  if (tag === 'a') {
    const href = oneLine(a.href || '');
    if (!HREF.test(href) || /^(javascript|data|vbscript):/i.test(href)) return '';
    at += ` href="${escAttr(href)}"`;
    if (/^https?:/i.test(href)) at += ' target="_blank" rel="noopener"';
  }
  if (tag === 'th' && (a.scope === 'row' || a.scope === 'col')) at += ` scope="${a.scope}"`;
  if (tag === 'img') {
    const art = oneLine(a['data-art'] || '');
    if (!ART.test(art)) return '';
    const ar = RATIOS.includes(a['data-ar']) ? a['data-ar'] : '3/2';
    return `<img data-art="${art}" data-ar="${ar}" alt="${escAttr(oneLine(a.alt).slice(0, 200))}">`;
  }
  return `<${tag}${at}>`;
}

function clean(html, allow) {
  const src = String(html || '');
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
  const out = [];
  const stack = []; /* [{tag, kept}] */
  let last = 0, m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(escText(src.slice(last, m.index)));
    last = re.lastIndex;
    if (!m[2]) continue; /* توضیح، CDATA یا doctype */
    const close = m[1] === '/', tag = m[2].toLowerCase();
    if (!close && DROP.has(tag)) {
      /* تا بسته شدن همین برچسب همه‌چیز دور ریخته می‌شود */
      const end = new RegExp(`</${tag}\\s*>`, 'ig');
      end.lastIndex = last;
      const e = end.exec(src);
      last = re.lastIndex = e ? end.lastIndex : src.length;
      continue;
    }
    if (!allow.has(tag)) continue;
    if (close) {
      const i = stack.map((x) => x.tag).lastIndexOf(tag);
      if (i < 0) continue;
      while (stack.length > i) { const x = stack.pop(); if (x.kept) out.push(`</${x.tag}>`); }
      continue;
    }
    const t = openTag(tag, attrsOf(m[3]));
    if (CLOSES_P.has(tag)) {
      const i = stack.map((x) => x.tag).lastIndexOf('p');
      if (i >= 0 && stack.slice(i + 1).every((x) => INLINE.has(x.tag) || x.tag === 'span')) {
        while (stack.length > i) { const x = stack.pop(); if (x.kept) out.push(`</${x.tag}>`); }
      }
    }
    if (VOID.has(tag)) { if (t) out.push(t); continue; }
    stack.push({ tag, kept: !!t });
    if (t) out.push(t);
  }
  if (last < src.length) out.push(escText(src.slice(last)));
  while (stack.length) { const x = stack.pop(); if (x.kept) out.push(`</${x.tag}>`); }
  return out.join('');
}

function body(html) {
  let s = clean(html, BODY);
  /* پاراگراف‌ها و تیترهای خالی (از ویرایشگر مرورگر) */
  for (let i = 0; i < 3; i++) s = s.replace(/<(p|h2|h3|li|blockquote)>(?:\s|&nbsp;|<br>)*<\/\1>/g, '');
  return s.replace(/(<br>\s*){3,}/g, '<br><br>').replace(/\n{3,}/g, '\n\n').trim();
}
const inline = (html) => clean(html, INLINE).replace(/^(\s|<br>)+|(\s|<br>)+$/g, '').trim();
const text = (s, max = 300) => oneLine(String(s || '').replace(/<[^>]*>/g, ' ')).slice(0, max);

module.exports = { body, inline, text };
