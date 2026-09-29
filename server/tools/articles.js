#!/usr/bin/env node
/* ==========================================================================
   ساختن صفحه‌های مجله از content/articles:
     node server/tools/articles.js          صفحه‌ی هر مقاله، articles.html، ردیف‌های مجله در index.html و کارت مقاله‌های صفحه‌ی هر بخش را می‌سازد
     node server/tools/articles.js --check  فقط بررسی می‌کند که خروجی‌ها به‌روزند (خروج با کد ۱ اگر نباشند)
   بعد از آن: python3 tools/sync-layout.py و python3 tools/seo.py
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const A = require('../lib/articles');

const ROOT = path.resolve(__dirname, '..', '..');
const SITE = path.join(ROOT, 'site');
const SRC = path.join(ROOT, 'content', 'articles');
const check = process.argv.includes('--check');

function build() {
  const list = A.sort(A.loadDir(SRC));
  if (!list.length) throw new Error('هیچ مقاله‌ای در content/articles نیست');
  const slugs = new Set();
  list.forEach((a) => { if (slugs.has(a.slug)) throw new Error('نشانی تکراری: ' + a.slug); slugs.add(a.slug); });
  const tpl = fs.readFileSync(path.join(SITE, 'doctors.html'), 'utf8');
  const out = new Map();
  list.forEach((a) => out.set(a.url, A.articlePage(a, list, tpl, SITE)));
  out.set('articles.html', A.indexPage(list, tpl, SITE));
  /* ردیف‌های مجله در صفحه‌ی اصلی */
  const idx = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const m = A.magList(list, SITE);
  const put = (t, name, inner) => {
    const re = new RegExp(`(<!-- ARTICLES:${name} -->)[\\s\\S]*?(<!-- /ARTICLES:${name} -->)`);
    if (!re.test(t)) throw new Error(`index.html: نشانه‌ی ARTICLES:${name} پیدا نشد`);
    return t.replace(re, (all, a, b) => `${a}\n${inner}\n${b}`);
  };
  out.set('index.html', put(put(idx, 'mag', m.rows), 'pv', m.pv));
  /* صفحه‌ی هر بخش (dental.html و …): کارت مقاله‌های همان بخش */
  fs.readdirSync(SITE).filter((f) => /\.html$/.test(f) && !out.has(f)).forEach((f) => {
    const t = fs.readFileSync(path.join(SITE, f), 'utf8');
    const re = /(<!-- ARTICLES:dept:(\w+) -->)[\s\S]*?(<!-- \/ARTICLES:dept:\2 -->)/g;
    if (re.test(t)) out.set(f, t.replace(re, (all, a, k, b) => `${a}\n${A.deptCards(list, k, SITE)}\n${b}`));
  });
  return { list, out };
}

function main() {
  const { list, out } = build();
  const stale = [];
  out.forEach((html, name) => {
    const f = path.join(SITE, name);
    const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    if (cur === html) return;
    stale.push(name);
    if (!check) fs.writeFileSync(f, html);
  });
  /* صفحه‌ی مقاله‌ای که دیگر در content نیست پاک می‌شود */
  fs.readdirSync(SITE).filter((f) => /^article-.+\.html$/.test(f) && !out.has(f)).forEach((f) => {
    stale.push(f + ' (حذف)');
    if (!check) fs.unlinkSync(path.join(SITE, f));
  });
  if (check) {
    if (stale.length) { console.error('صفحه‌های مجله عقب‌اند: ' + stale.join(', ')); process.exit(1); }
    console.log(`صفحه‌های مجله به‌روزند (${A.fa(list.length)} مقاله)`);
  } else {
    console.log(`${A.fa(list.length)} مقاله؛ ` + (stale.length ? 'به‌روز شد: ' + stale.join(', ') : 'چیزی عوض نشد'));
    list.forEach((a) => console.log(`  ${a.url}  ${A.fa(a.words)} کلمه، ${A.fa(a.mins)} دقیقه، ${A.fa(a.toc.length)} بخش، ${A.fa(a.faq.length)} سؤال`));
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { build };
