#!/usr/bin/env python3
"""
همگام‌سازی بخش‌های مشترک صفحه‌ها (سر صفحه، هدر و منوی موبایل، فوتر و برگه‌ها و اسکریپت‌ها).

منبع: site/index.html. هر بخش مشترک بین دو نشانه است:
    <!-- LAYOUT:head ... -->  ...  <!-- /LAYOUT:head -->
    <!-- LAYOUT:top -->       ...  <!-- /LAYOUT:top -->
    <!-- LAYOUT:bottom -->    ...  <!-- /LAYOUT:bottom -->
هر صفحه‌ی دیگر در site/ که همین نشانه‌ها را دارد، همان بخش‌ها را می‌گیرد.
لینک‌های هدر، منوی موبایل و فوتر که به خود همان صفحه اشاره می‌کنند aria-current="page" می‌گیرند.

اجرا:      python3 tools/sync-layout.py
بررسی:     python3 tools/sync-layout.py --check   (اگر صفحه‌ای عقب باشد، خروج با کد ۱)
"""
import pathlib
import re
import sys

SITE = pathlib.Path(__file__).resolve().parent.parent / 'site'
BLOCKS = ('head', 'top', 'bottom')


def span(text, name):
    m = re.search(r'<!-- LAYOUT:%s\b[^>]*-->' % name, text)
    e = text.find('<!-- /LAYOUT:%s -->' % name)
    if not m or e < 0:
        return None
    return m.start(), e + len('<!-- /LAYOUT:%s -->' % name)


def mark_current(block, page):
    """لینک‌هایی که به همین صفحه می‌روند: aria-current؛ لینک «صفحه‌ی اصلی» در صفحه‌های دیگر دست نمی‌خورد."""
    return re.sub(r'(<a\b[^>]*\bhref="%s")' % re.escape(page), r'\1 aria-current="page"', block)


def main():
    check = '--check' in sys.argv
    src = (SITE / 'index.html').read_text(encoding='utf-8')
    blocks = {}
    for b in BLOCKS:
        sp = span(src, b)
        if not sp:
            sys.exit('index.html: نشانه‌ی LAYOUT:%s پیدا نشد' % b)
        blocks[b] = src[sp[0]:sp[1]]
    stale = []
    for page in sorted(SITE.glob('*.html')):
        if page.name == 'index.html':
            continue
        text = page.read_text(encoding='utf-8')
        out = text
        for b in BLOCKS:
            sp = span(out, b)
            if not sp:
                sys.exit('%s: نشانه‌ی LAYOUT:%s پیدا نشد' % (page.name, b))
            out = out[:sp[0]] + mark_current(blocks[b], page.name) + out[sp[1]:]
        if out != text:
            stale.append(page.name)
            if not check:
                page.write_text(out, encoding='utf-8')
    if check:
        if stale:
            sys.exit('عقب از index.html: ' + ', '.join(stale))
        print('همه‌ی صفحه‌ها با index.html هم‌خوان‌اند')
    else:
        print('به‌روز شد: ' + (', '.join(stale) if stale else 'چیزی عوض نشد'))


if __name__ == '__main__':
    main()
