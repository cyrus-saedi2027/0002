#!/usr/bin/env python3
"""
اطلاعات جست‌وجو و پیش‌نمایش لینک برای همه‌ی صفحه‌ها.

در هر صفحه، بین <!-- SEO --> و <!-- /SEO --> (درست بعد از meta description) می‌نویسد:
  og:title، og:description، og:type، og:image، twitter:card و در صفحه‌ی اصلی اطلاعات ساختاریافته‌ی کلینیک (JSON-LD).
با دامنه، نشانی‌ها مطلق می‌شوند و canonical و og:url هم اضافه می‌شود، و site/sitemap.xml و site/robots.txt ساخته می‌شوند.

اجرا:
    python3 tools/seo.py                          (بدون دامنه؛ تا وقتی سایت روی سرور نرفته)
    python3 tools/seo.py https://clinic-sasan.ir  (روی سرور، با دامنه‌ی واقعی)
"""
import datetime
import html
import json
import pathlib
import re
import sys

SITE = pathlib.Path(__file__).resolve().parent.parent / 'site'
SKIP_SITEMAP = {'404.html'}
PRIORITY = {'index.html': '1.0', 'doctors.html': '0.9', 'contact.html': '0.9', 'faq.html': '0.8', 'about.html': '0.7', 'cases.html': '0.6', 'privacy.html': '0.3'}


def clinic_ld(domain):
    ld = {
        '@context': 'https://schema.org',
        '@type': 'MedicalClinic',
        'name': 'ساسان کلینیک',
        'alternateName': 'درمانگاه شبانه‌روزی ساسان',
        'telephone': '+981154611560',
        'address': {'@type': 'PostalAddress', 'streetAddress': 'روبه‌روی شهرداری، بالای داروخانه‌ی شبانه‌روزی، طبقه‌ی اول',
                    'addressLocality': 'سلمان‌شهر', 'addressRegion': 'مازندران', 'addressCountry': 'IR'},
        'geo': {'@type': 'GeoCoordinates', 'latitude': 36.709646, 'longitude': 51.203538},
        'openingHoursSpecification': [{'@type': 'OpeningHoursSpecification',
                                       'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                                       'opens': '00:00', 'closes': '23:59'}],
        'medicalSpecialty': ['Dentistry', 'Dermatology', 'PrimaryCare'],
        'department': [{'@type': 'Dentist', 'name': 'دندانپزشکی ساسان کلینیک', 'telephone': '+981154611560',
                        'openingHoursSpecification': [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Saturday', 'Sunday', 'Monday', 'Thursday'], 'opens': '10:00', 'closes': '20:00'}]}],
        'sameAs': ['https://www.instagram.com/clinic_sasan/', 'https://behtarino.com/p/zoawouktdx'],
    }
    if domain:
        ld['url'] = domain + '/'
        ld['logo'] = domain + '/img/icon-512.png'
        ld['image'] = domain + '/img/og-image.jpg'
    return ld


def block(page, text, domain):
    title = html.unescape(re.search(r'<title>(.*?)</title>', text, re.S).group(1)).strip()
    m = re.search(r'<meta name="description" content="([^"]*)">', text)
    desc = html.unescape(m.group(1)) if m else ''
    url = f"{domain}/{'' if page == 'index.html' else page}" if domain else ''
    img = (domain + '/' if domain else '') + 'img/og-image.jpg'
    e = lambda s: html.escape(s, quote=True)
    out = ['<!-- SEO (ساخته‌شده با python3 tools/seo.py؛ دستی ویرایش نکنید) -->']
    if url and page != '404.html':
        out.append(f'<link rel="canonical" href="{e(url)}">')
    out += [f'<meta property="og:type" content="website">',
            f'<meta property="og:site_name" content="ساسان کلینیک">',
            f'<meta property="og:locale" content="fa_IR">',
            f'<meta property="og:title" content="{e(title)}">',
            f'<meta property="og:description" content="{e(desc)}">']
    if url and page != '404.html':
        out.append(f'<meta property="og:url" content="{e(url)}">')
    out += [f'<meta property="og:image" content="{e(img)}">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            '<meta property="og:image:alt" content="ساسان کلینیک، سلمان‌شهر">',
            '<meta name="twitter:card" content="summary_large_image">']
    if page == 'index.html':
        out.append('<script type="application/ld+json">' + json.dumps(clinic_ld(domain), ensure_ascii=False) + '</script>')
    out.append('<!-- /SEO -->')
    return '\n'.join(out)


def main():
    domain = (sys.argv[1] if len(sys.argv) > 1 else '').rstrip('/')
    if len(sys.argv) > 2 or (domain and not re.match(r'^https://([a-z0-9-]+\.)+[a-z]{2,}$', domain)):
        sys.exit('دامنه را کامل و با https بنویسید؛ مثلاً https://clinic-sasan.ir')
    pages = sorted(SITE.glob('*.html'))
    for p in pages:
        t = p.read_text(encoding='utf-8')
        b = block(p.name, t, domain)
        if '<!-- SEO' in t:
            t = re.sub(r'<!-- SEO.*?<!-- /SEO -->', lambda m: b, t, flags=re.S)
        else:
            t = re.sub(r'(<meta name="description" content="[^"]*">(?:\n<meta name="robots"[^>]*>)?)', lambda m: m.group(1) + '\n' + b, t, count=1)
        p.write_text(t, encoding='utf-8')
    robots = ['User-agent: *', 'Allow: /', 'Disallow: /api/']
    if not domain and (SITE / 'sitemap.xml').exists():
        (SITE / 'sitemap.xml').unlink()
    if domain:
        today = datetime.date.today().isoformat()
        urls = ''.join(f"  <url><loc>{domain}/{'' if p.name == 'index.html' else p.name}</loc><lastmod>{today}</lastmod><priority>{PRIORITY.get(p.name, '0.5')}</priority></url>\n"
                       for p in pages if p.name not in SKIP_SITEMAP)
        (SITE / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n', encoding='utf-8')
        robots.append(f'Sitemap: {domain}/sitemap.xml')
    (SITE / 'robots.txt').write_text('\n'.join(robots) + '\n', encoding='utf-8')
    print('به‌روز شد:', len(pages), 'صفحه' + ('، sitemap.xml و robots.txt' if domain else ' و robots.txt (برای sitemap دامنه لازم است)'))


if __name__ == '__main__':
    main()
