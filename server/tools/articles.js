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
  return { list, out: A.renderAll(list, SITE) };
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
