# گذاشتن سایت روی سرور (وقتی سرور و دامنه آماده شد)

این راهنما برای روزی است که سرور و دامنه‌ی کلینیک آماده شود. همه‌ی کارهای لازم از قبل آماده شده‌اند؛ روی سرور فقط همین قدم‌ها انجام می‌شود.

سایت (`site/`) و سرور نوبت (`server/`) یک برنامه‌ی Node.js هستند و هیچ وابستگی بیرونی ندارند: قلم‌ها و کتابخانه‌های حرکت هم از خود سایت بارگیری می‌شوند و صفحه‌ها به Google Fonts یا CDN درخواستی نمی‌فرستند.

## ۱. آنچه لازم است

- یک سرور لینوکس (مثلاً Ubuntu 22.04 یا 24.04) با دسترسی SSH
- Node.js نسخه‌ی ۱۸ یا بالاتر (پیشنهاد: نسخه‌ی LTS)
- nginx و certbot (برای HTTPS)
- رکورد DNS از نوع A برای دامنه (و `www`) به آی‌پی سرور

## ۲. آوردن پروژه و تنظیم پیامک

```bash
git clone <نشانی مخزن> /srv/sasan && cd /srv/sasan/server
npm test               # آزمون‌ها باید همه قبول شوند
npm run setup          # حالت ۲ (اصلی)، کلید اصلی sms.ir، قالب کد تأیید، قالب‌های تأیید نوبت و یادآوری
npm run check          # کلید، اعتبار پنل و وضعیت تأیید قالب‌ها
npm run user           # اولین حساب پنل پذیرش (مدیر)؛ بقیه‌ی کارکنان از خود پنل ساخته می‌شوند
```

در `server/.env` (با `npm run setup` ساخته می‌شود و هرگز وارد git نمی‌شود) این‌ها را برای سرور بگذارید:

```
HOST=127.0.0.1
PORT=8080
TRUST_PROXY=1
HSTS=1
```

- **پیش از استفاده، کلید اصلی sms.ir را در پنل عوض کنید** (کلید قبلی در گفت‌وگو فرستاده شده بود) و کلید تازه را فقط در `server/.env` بگذارید.
- در پنل sms.ir دسترسی کلید را به آی‌پی همین سرور محدود کنید.

## ۳. اجرای دائمی با systemd

فایل `/etc/systemd/system/sasan.service`:

```ini
[Unit]
Description=Sasan clinic site and booking server
After=network.target

[Service]
WorkingDirectory=/srv/sasan/server
ExecStart=/usr/bin/node server.js
Restart=always
User=www-data
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data /srv/sasan/server/data 2>/dev/null; sudo chown www-data /srv/sasan/server/.env
sudo systemctl daemon-reload && sudo systemctl enable --now sasan
```

## ۴. nginx و HTTPS

فایل `/etc/nginx/sites-available/sasan` (به جای `example.ir` دامنه‌ی واقعی):

```nginx
server {
  listen 80;
  server_name example.ir www.example.ir;
  location / { return 301 https://example.ir$request_uri; }
}
server {
  listen 443 ssl http2;
  server_name example.ir;
  # مسیر گواهی‌ها را certbot خودش اضافه می‌کند

  gzip on; gzip_proxied any; gzip_min_length 1024;
  gzip_types text/css application/javascript application/json image/svg+xml application/manifest+json application/xml text/plain;

  client_max_body_size 16k;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sasan /etc/nginx/sites-enabled/
sudo certbot --nginx -d example.ir -d www.example.ir
sudo nginx -t && sudo systemctl reload nginx
```

سرور خودش سربرگ‌های امنیتی (CSP و ...)، کش فایل‌ها و صفحه‌ی ۴۰۴ را می‌فرستد.

## ۵. دامنه در صفحه‌ها (جست‌وجو و پیش‌نمایش لینک)

```bash
cd /srv/sasan
python3 tools/seo.py https://example.ir
```

نشانی کامل صفحه‌ها (canonical)، عکس پیش‌نمایش لینک در تلگرام و واتساپ و اینستاگرام، اطلاعات ساختاریافته‌ی کلینیک برای گوگل، `sitemap.xml` و `robots.txt` با همین دامنه ساخته می‌شوند. بعد نشانی `https://example.ir/sitemap.xml` را در Google Search Console ثبت کنید.

## ۶. آزمایش نهایی روی سرور

- باز شدن همه‌ی صفحه‌ها با HTTPS، روی گوشی و کامپیوتر
- درخواست نوبت با شماره‌ی خودتان: رسیدن کد پیامکی و ثبت درخواست
- فرم «با من تماس بگیرید»
- یک نشانی ناموجود (مثلاً `/abc`) باید صفحه‌ی ۴۰۴ کلینیک را نشان دهد
- `npm run check` در پوشه‌ی `server`
- پنل پذیرش: `https://example.ir/panel/` ← ورود با حساب مدیر و کد پیامکی ← ساخت حساب پذیرش و پزشک‌ها در «کارکنان» ← دادن یک نوبت آزمایشی با تیک پیامک به شماره‌ی خودتان

## ۷. پشتیبان‌گیری از داده‌ها

همه‌ی داده‌ها (درخواست‌ها، کارکنان، گزارش کارها) در `server/data` است. روزی یک بار از آن کپی بگیرید؛ مثلاً با cron:

```bash
sudo mkdir -p /var/backups/sasan
echo '15 3 * * * root tar czf /var/backups/sasan/data-$(date +\%F).tgz -C /srv/sasan/server data && find /var/backups/sasan -mtime +30 -delete' | sudo tee /etc/cron.d/sasan-backup
```

کپی‌ها را گاهی بیرون از سرور هم نگه دارید؛ این فایل‌ها اطلاعات بیماران است و نباید جای عمومی برود.

## بعد از آن (طبق نقشه‌ی راه)

پنل پذیرش ساخته شده است (`server/README.md`، بخش «پنل پذیرش»). بعد از راه‌اندازی، کارفرما جزئیات بیشتر پنل را می‌گوید (مثلاً مدیریت محتوای سایت از پنل) — `IDEAS.md`.
