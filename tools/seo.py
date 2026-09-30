#!/usr/bin/env python3
"""
اطلاعات جست‌وجو و پیش‌نمایش لینک برای همه‌ی صفحه‌ها.

در هر صفحه، بین <!-- SEO --> و <!-- /SEO --> (درست بعد از meta description) می‌نویسد:
  canonical، og:*، twitter:card و اطلاعات ساختاریافته (JSON-LD):
  صفحه‌ی اصلی: کلینیک (MedicalClinic با بخش دندانپزشکی، خدمات و منطقه‌ها) و وب‌سایت؛
  صفحه‌های داخلی: مسیر صفحه (BreadcrumbList)؛ سؤال‌های پرتکرار: FAQPage؛ صفحه‌ی هر بخش: خدمات همان بخش.
و site/sitemap.xml (با تاریخ به‌روزرسانی و عکس مقاله‌ها) و site/robots.txt را می‌سازد.
صفحه‌های مجله (articles.html و article-….html) اطلاعات جست‌وجوی خودشان را از server/tools/articles.js می‌گیرند
و این‌جا فقط در sitemap می‌آیند.

اجرا:
    python3 tools/seo.py                                  (با دامنه‌ی سایت: https://sasan-clinic.ir)
    python3 tools/seo.py https://other-domain.ir          (دامنه‌ی دیگر)
    python3 tools/seo.py --local                          (بدون دامنه؛ نشانی‌های نسبی و بدون sitemap)
    python3 tools/seo.py --google-verify=کد              (کد تأیید Search Console؛ یک بار کافی است و می‌ماند)
"""
import datetime
import html
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
DOMAIN = 'https://sasan-clinic.ir'
SKIP_SITEMAP = {'404.html'}
PRIORITY = {'index.html': '1.0', 'dental.html': '0.95', 'beauty.html': '0.9', 'medicine.html': '0.9', 'contact.html': '0.9',
            'doctors.html': '0.8', 'articles.html': '0.8', 'faq.html': '0.8', 'about.html': '0.7', 'cases.html': '0.7', 'privacy.html': '0.2'}
CRUMB = {'doctors.html': 'پزشکان', 'about.html': 'درباره‌ی ما', 'contact.html': 'تماس و مسیر', 'faq.html': 'سؤال‌های پرتکرار',
         'cases.html': 'نمونه‌کارها', 'privacy.html': 'حریم خصوصی', 'dental.html': 'دندانپزشکی', 'beauty.html': 'زیبایی و لیزر',
         'medicine.html': 'پزشک عمومی شبانه‌روزی'}
PHONE = '+981154611560'
ADDRESS = {'@type': 'PostalAddress', 'streetAddress': 'بلوار امام رضا، روبه‌روی شهرداری، بالای داروخانه‌ی شبانه‌روزی، طبقه‌ی اول',
           'addressLocality': 'سلمان‌شهر (متل‌قو)', 'addressRegion': 'مازندران', 'addressCountry': 'IR'}
GEO = {'@type': 'GeoCoordinates', 'latitude': 36.709646, 'longitude': 51.203538}
AREA = ['سلمان‌شهر', 'متل‌قو', 'عباس‌آباد', 'کلارآباد', 'چالوس', 'تنکابن']
# شناسه‌ی ثابت همان مکان در گوگل‌مپ (CID)؛ گوگل با این لینک سایت را به کارت نقشه‌ی کلینیک وصل می‌کند
MAP_CID = 'https://maps.google.com/?cid=17153762661804471932'
NAMES = ['درمانگاه شبانه‌روزی ساسان', 'درمانگاه شبانه‌روزی ساسان متل‌قو', 'کلینیک ساسان سلمان‌شهر', 'Sasan Clinic']
PROFILES = [MAP_CID, 'https://balad.ir/p/4JKZ9cX2SFLybm', 'https://nshn.ir/37_bfjCJQxj20-',
            'https://www.instagram.com/clinic_sasan/', 'https://behtarino.com/p/zoawouktdx']
SERVICES = {
    'dental': ('دندانپزشکی', ['ایمپلنت دندان', 'لمینت و کامپوزیت دندان', 'عصب‌کشی (درمان ریشه)', 'ترمیم و پر کردن دندان', 'روکش دندان',
                             'جراحی لثه', 'کشیدن دندان و دندان عقل', 'جرم‌گیری و بروساژ', 'بلیچینگ (سفید کردن دندان)']),
    'beauty': ('زیبایی و لیزر', ['تزریق بوتاکس', 'تزریق فیلر', 'مزوتراپی و مزوژل', 'لیزر موهای زائد', 'میکرونیدلینگ و لایه‌برداری']),
    'medicine': ('پزشک عمومی شبانه‌روزی', ['ویزیت پزشک عمومی شبانه‌روزی', 'تزریقات و سرم‌تراپی', 'شست‌وشوی گوش', 'بخیه و پانسمان', 'نوار قلب']),
}
DENTAL_HOURS = [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Saturday', 'Sunday', 'Monday', 'Thursday'], 'opens': '10:00', 'closes': '20:00'}]
ALL_DAY = [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            'opens': '00:00', 'closes': '23:59'}]


def u(domain, page=''):
    return f"{domain}/{'' if page in ('', 'index.html') else page}"


def offers(k):
    name, items = SERVICES[k]
    return {'@type': 'OfferCatalog', 'name': name,
            'itemListElement': [{'@type': 'Offer', 'itemOffered': {'@type': 'MedicalProcedure', 'name': n}} for n in items]}


def clinic_ld(domain):
    cid = u(domain) + '#clinic' if domain else None
    ld = {
        '@context': 'https://schema.org',
        '@type': 'MedicalClinic',
        'name': 'ساسان کلینیک',
        'alternateName': NAMES,
        'description': 'درمانگاه شبانه‌روزی سلمان‌شهر (متل‌قو): دندانپزشکی، زیبایی و لیزر و پزشک عمومی ۲۴ ساعته.',
        'telephone': PHONE,
        'address': ADDRESS,
        'geo': GEO,
        'hasMap': MAP_CID,
        'areaServed': [{'@type': 'City', 'name': n} for n in AREA],
        'openingHoursSpecification': ALL_DAY,
        'medicalSpecialty': ['Dentistry', 'Dermatology', 'PrimaryCare'],
        'isAcceptingNewPatients': True,
        'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': 'خدمات ساسان کلینیک', 'itemListElement': [offers(k) for k in SERVICES]},
        'department': [{'@type': 'Dentist', 'name': 'دندانپزشکی ساسان کلینیک', 'telephone': PHONE, 'address': ADDRESS, 'geo': GEO,
                        'openingHoursSpecification': DENTAL_HOURS, 'hasOfferCatalog': offers('dental')}],
        'sameAs': PROFILES,
    }
    if domain:
        ld['@id'] = cid
        ld['url'] = u(domain)
        ld['logo'] = domain + '/img/icon-512.png'
        ld['image'] = [domain + '/img/og-image.jpg', domain + '/img/glance-room.webp']
        ld['department'][0]['@id'] = u(domain, 'dental.html') + '#dentist'
        ld['department'][0]['url'] = u(domain, 'dental.html')
        ld['department'][0]['image'] = domain + '/img/hero-dental.webp'
    return ld


def website_ld(domain):
    ld = {'@context': 'https://schema.org', '@type': 'WebSite', 'name': 'ساسان کلینیک',
          'alternateName': ['درمانگاه شبانه‌روزی ساسان', 'Sasan Clinic'], 'inLanguage': 'fa-IR'}
    if domain:
        ld.update({'@id': u(domain) + '#website', 'url': u(domain), 'publisher': {'@id': u(domain) + '#clinic'}})
    return ld


def crumb_ld(page, domain):
    if not domain or page not in CRUMB:
        return None
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'ساسان کلینیک', 'item': u(domain)},
        {'@type': 'ListItem', 'position': 2, 'name': CRUMB[page], 'item': u(domain, page)}]}


def strip(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def faq_ld(text):
    qa = re.findall(r'<span class="faq-item__q">(.*?)</span>.*?<div class="faq-item__a">(.*?)</div>\s*</details>', text, re.S)
    if not qa:
        return None
    return {'@context': 'https://schema.org', '@type': 'FAQPage',
            'mainEntity': [{'@type': 'Question', 'name': strip(q), 'acceptedAnswer': {'@type': 'Answer', 'text': strip(a)}} for q, a in qa]}


def dept_ld(page, domain):
    k = {'dental.html': 'dental', 'beauty.html': 'beauty', 'medicine.html': 'medicine'}.get(page)
    if not k:
        return None
    t = 'Dentist' if k == 'dental' else 'MedicalClinic'
    name, _ = SERVICES[k]
    ld = {'@context': 'https://schema.org', '@type': t, 'name': f'{name} ساسان کلینیک', 'telephone': PHONE, 'address': ADDRESS, 'geo': GEO,
          'areaServed': [{'@type': 'City', 'name': n} for n in AREA], 'hasOfferCatalog': offers(k),
          'openingHoursSpecification': DENTAL_HOURS if k == 'dental' else ALL_DAY}
    if k == 'beauty':
        ld['medicalSpecialty'] = 'Dermatology'
        ld.pop('openingHoursSpecification')  # همه‌روزه با هماهنگی قبلی
    if domain:
        ld['@id'] = u(domain, page) + ('#dentist' if k == 'dental' else '#dept')
        ld['url'] = u(domain, page)
        ld['parentOrganization'] = {'@id': u(domain) + '#clinic'}
    return ld


def block(page, text, domain, gsc):
    title = html.unescape(re.search(r'<title>(.*?)</title>', text, re.S).group(1)).strip()
    m = re.search(r'<meta name="description" content="([^"]*)">', text)
    desc = html.unescape(m.group(1)) if m else ''
    url = u(domain, page) if domain else ''
    img = (domain + '/' if domain else '') + 'img/og-image.jpg'
    e = lambda s: html.escape(s, quote=True)
    out = ['<!-- SEO (ساخته‌شده با python3 tools/seo.py؛ دستی ویرایش نکنید) -->']
    if url and page != '404.html':
        out.append(f'<link rel="canonical" href="{e(url)}">')
    if gsc and page == 'index.html':
        out.append(f'<meta name="google-site-verification" content="{e(gsc)}">')
    out += ['<meta property="og:type" content="website">',
            '<meta property="og:site_name" content="ساسان کلینیک">',
            '<meta property="og:locale" content="fa_IR">',
            f'<meta property="og:title" content="{e(title)}">',
            f'<meta property="og:description" content="{e(desc)}">']
    if url and page != '404.html':
        out.append(f'<meta property="og:url" content="{e(url)}">')
    out += [f'<meta property="og:image" content="{e(img)}">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            '<meta property="og:image:alt" content="ساسان کلینیک، سلمان‌شهر">',
            '<meta name="twitter:card" content="summary_large_image">']
    lds = []
    if page == 'index.html':
        lds += [clinic_ld(domain), website_ld(domain)]
    lds += [crumb_ld(page, domain), dept_ld(page, domain)]
    if page in ('faq.html', 'dental.html', 'beauty.html', 'medicine.html'):
        lds.append(faq_ld(text))
    for ld in lds:
        if ld:
            out.append('<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>')
    out.append('<!-- /SEO -->')
    return '\n'.join(out)


def lastmod(p, text):
    """تاریخ آخرین تغییر: برای مقاله‌ها از dateModified خودشان، برای بقیه از تاریخچه‌ی git"""
    ds = re.findall(r'"dateModified": ?"(\d{4}-\d{2}-\d{2})', text)
    if ds:
        return max(ds)
    try:
        d = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', str(p)], cwd=ROOT, capture_output=True, text=True).stdout.strip()
        if d:
            return d
    except OSError:
        pass
    return datetime.date.today().isoformat()


def sitemap(pages, domain):
    rows = []
    for p in pages:
        if p.name in SKIP_SITEMAP:
            continue
        t = p.read_text(encoding='utf-8')
        img = ''
        m = re.search(r'<meta property="og:image" content="([^"]+)"', t)
        if p.name.startswith('article-') and m:
            img = f'<image:image><image:loc>{html.escape(m.group(1))}</image:loc></image:image>'
        pr = PRIORITY.get(p.name, '0.7' if p.name.startswith('article-') else '0.5')
        rows.append(f'  <url><loc>{u(domain, p.name)}</loc><lastmod>{lastmod(p, t)}</lastmod><priority>{pr}</priority>{img}</url>')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
            + '\n'.join(rows) + '\n</urlset>\n')


def main():
    args = sys.argv[1:]
    gsc = next((a.split('=', 1)[1] for a in args if a.startswith('--google-verify=')), None)
    args = [a for a in args if not a.startswith('--google-verify=')]
    domain = '' if '--local' in args else (args[0] if args else DOMAIN).rstrip('/')
    if domain and not re.match(r'^https://([a-z0-9-]+\.)+[a-z]{2,}$', domain):
        sys.exit('دامنه را کامل و با https بنویسید؛ مثلاً https://sasan-clinic.ir')
    idx = (SITE / 'index.html').read_text(encoding='utf-8')
    if gsc is None:  # کد تأیید قبلی می‌ماند
        m = re.search(r'<meta name="google-site-verification" content="([^"]*)">', idx)
        gsc = html.unescape(m.group(1)) if m else ''
    pages = sorted(SITE.glob('*.html'))
    for p in pages:
        t = p.read_text(encoding='utf-8')
        if 'server/lib/articles.js' in t:
            continue
        b = block(p.name, t, domain, gsc)
        if '<!-- SEO' in t:
            t = re.sub(r'<!-- SEO.*?<!-- /SEO -->', lambda m: b, t, flags=re.S)
        else:
            t = re.sub(r'(<meta name="description" content="[^"]*">(?:\n<meta name="robots"[^>]*>)?)', lambda m: m.group(1) + '\n' + b, t, count=1)
        p.write_text(t, encoding='utf-8')
    robots = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /panel/']
    if not domain and (SITE / 'sitemap.xml').exists():
        (SITE / 'sitemap.xml').unlink()
    if domain:
        (SITE / 'sitemap.xml').write_text(sitemap(pages, domain), encoding='utf-8')
        robots.append(f'Sitemap: {domain}/sitemap.xml')
    (SITE / 'robots.txt').write_text('\n'.join(robots) + '\n', encoding='utf-8')
    print('به‌روز شد:', len(pages), 'صفحه' + (f'، sitemap.xml و robots.txt ({domain})' if domain else ' و robots.txt (بدون دامنه)')
          + ('؛ کد تأیید Search Console در صفحه‌ی اصلی' if gsc else ''))


if __name__ == '__main__':
    main()
