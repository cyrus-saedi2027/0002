#!/usr/bin/env python3
"""عکس‌های راهنمای پنل: PNGهای panel-guide-shots.js ← server/panel/guide/*.webp
و اندازه‌ی هر عکس (width/height)، بارگیری تنبل و لینک بزرگ‌نمایی را در guide.html می‌گذارد.

    python3 tools/panel-guide-webp.py [پوشه‌ی PNG]
فقط عکس‌هایی که guide.html به آن‌ها اشاره می‌کند ساخته می‌شوند؛ عکس‌های بی‌استفاده‌ی قبلی پاک می‌شوند.
"""
import os
import re
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PANEL = ROOT / 'server' / 'panel'
OUT = PANEL / 'guide'
HTML = PANEL / 'guide.html'
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.gettempdir()) / 'sasan-guide-png'
MAX_W = 1600

html = HTML.read_text(encoding='utf-8')
names = sorted(set(re.findall(r'src="guide/([a-z0-9-]+)\.webp"', html)))
OUT.mkdir(exist_ok=True)
sizes, missing = {}, []
for n in names:
    png = SRC / f'{n}.png'
    webp = OUT / f'{n}.webp'
    if png.exists():
        im = Image.open(png).convert('RGB')
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        im.save(webp, 'WEBP', quality=82, method=6)
    if not webp.exists():
        missing.append(n)
        continue
    with Image.open(webp) as im:
        sizes[n] = im.size
for f in OUT.glob('*.webp'):
    if f.stem not in names:
        f.unlink()


def fix(m):
    tag = m.group(0)
    n = re.search(r'src="guide/([a-z0-9-]+)\.webp"', tag).group(1)
    if n not in sizes:
        return tag
    w, h = sizes[n]
    tag = re.sub(r'\s(width|height|loading|decoding)="[^"]*"', '', tag)
    return tag[:-1] + f' width="{w}" height="{h}" loading="lazy" decoding="async">'


html = re.sub(r'<img src="guide/[^>]*>', fix, html)
# هر عکس با یک لمس بزرگ باز شود (روی گوشی متن عکس‌ها ریز است)
html = re.sub(r'(<figure class="g-fig[^"]*">)(<img src="(guide/[a-z0-9-]+\.webp)"[^>]*>)',
              r'\1<a href="\3" target="_blank" rel="noopener" aria-label="باز کردن عکس در اندازه‌ی بزرگ">\2</a>', html)
HTML.write_text(html, encoding='utf-8')
total = sum((OUT / f'{n}.webp').stat().st_size for n in sizes)
print(f'{len(sizes)} عکس، {total // 1024} کیلوبایت' + (f' · نیست: {", ".join(missing)}' if missing else ''))
sys.exit(1 if missing else 0)
