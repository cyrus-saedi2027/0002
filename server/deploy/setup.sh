#!/usr/bin/env bash
# ==========================================================================
# نصب یا به‌روزرسانی ساسان کلینیک روی سرور (Ubuntu یا Debian)، با کاربر root:
#
#   bash /srv/sasan/server/deploy/setup.sh sasan-clinic.ir
#
# پیش از آن پروژه باید در /srv/sasan باشد (git clone یا rsync؛ DEPLOY.md) و server/.env ساخته شده باشد
# (npm run setup، یا نوشتن دستی از روی server/.env.example).
# کارها (هر بار اجرا بی‌خطر است و فقط چیزهای لازم را عوض می‌کند):
#   ۱. nginx، certbot و python3؛ Node.js نسخه‌ی ۱۸.۱۷ یا بالاتر (اگر نیست، از nodejs.org؛ یا فایل آماده در /tmp/node.tar.xz)
#   ۲. سرویس systemd با کاربر www-data و راه‌اندازی دوباره‌ی آن
#   ۳. nginx: http و www به https://دامنه، پراکسی به Node، اندازه‌ی مجاز بارگذاری عکس مقاله‌ها
#   ۴. گواهی HTTPS با certbot (اگر DNS دامنه به همین سرور اشاره کند)
#   ۵. پشتیبان شبانه‌ی server/data و آزمایش سلامت
# ==========================================================================
set -euo pipefail
DOMAIN="${1:-sasan-clinic.ir}"
APP="${APP:-/srv/sasan}"
SRV="$APP/server"
PORT="$(grep -E '^PORT=' "$SRV/.env" 2>/dev/null | cut -d= -f2 || true)"; PORT="${PORT:-8080}"
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "با root اجرا کنید (sudo)"; exit 1; }
[ -f "$SRV/server.js" ] || { echo "پروژه در $APP پیدا نشد"; exit 1; }

say "بسته‌ها"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -q
apt-get install -y -q nginx certbot python3 curl ca-certificates xz-utils >/dev/null

say "Node.js"
node_ok() { command -v node >/dev/null && node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>18||(a===18&&b>=17)?0:1)'; }
if ! node_ok; then
  apt-get install -y -q nodejs >/dev/null 2>&1 || true
fi
if ! node_ok; then
  V=v22.12.0; T=/tmp/node.tar.xz
  [ -s "$T" ] || curl -fsSL "https://nodejs.org/dist/$V/node-$V-linux-x64.tar.xz" -o "$T" || { echo "Node.js بارگیری نشد؛ فایل node-$V-linux-x64.tar.xz را در $T بگذارید و دوباره اجرا کنید"; exit 1; }
  rm -rf /opt/node && mkdir -p /opt/node && tar -xJf "$T" -C /opt/node --strip-components=1
  ln -sf /opt/node/bin/node /usr/local/bin/node && ln -sf /opt/node/bin/npm /usr/local/bin/npm
fi
node_ok || { echo "Node.js نسخه‌ی ۱۸.۱۷ یا بالاتر لازم است"; exit 1; }
NODE="$(command -v node)"; echo "node $(node -v) در $NODE"
if [ ! -f "$SRV/.env" ]; then
  echo
  echo "server/.env هنوز نیست (بار اول). همین‌جا روی سرور بسازیدش و دوباره اجرا کنید:"
  echo "  cd $SRV && node tools/sms.js setup      # حالت ۲ (اصلی)، کلید اصلی sms.ir، قالب 284896"
  echo "یا دستی از روی server/.env.example (DEPLOY.md، بخش «بار اول»)."
  exit 2
fi

say "آزمون‌ها"
(cd "$SRV" && "$NODE" --test test/*.test.js >/tmp/sasan-test.log 2>&1) && echo "همه‌ی آزمون‌ها قبول شدند" || { tail -30 /tmp/sasan-test.log; echo "آزمون‌ها رد شدند؛ نصب متوقف شد"; exit 1; }

say "پوشه‌ها و دسترسی‌ها"
mkdir -p "$SRV/data"
chown -R www-data:www-data "$SRV/data"
chown www-data:www-data "$SRV/.env" && chmod 600 "$SRV/.env"

say "سرویس systemd"
cat > /etc/systemd/system/sasan.service <<EOF
[Unit]
Description=Sasan clinic site, booking and reception panel
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=$SRV
ExecStart=$NODE server.js
Restart=always
RestartSec=3
User=www-data
Group=www-data
Environment=NODE_ENV=production
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$SRV/data

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable sasan >/dev/null 2>&1
systemctl restart sasan
sleep 2
curl -fsS "http://127.0.0.1:$PORT/api/health" && echo || { journalctl -u sasan -n 30 --no-pager; echo "سرویس بالا نیامد"; exit 1; }

say "nginx"
mkdir -p /var/www/certbot
# IPv6 فقط اگر سرور دارد (وگرنه nginx بالا نمی‌آید)
L6_80=""; L6_443=""
if [ -s /proc/net/if_inet6 ]; then L6_80="listen [::]:80;"; L6_443="listen [::]:443 ssl http2;"; fi
CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
PROXY="
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 60s;"
COMMON="
  gzip on; gzip_proxied any; gzip_min_length 1024;
  gzip_types text/css application/javascript application/json image/svg+xml application/manifest+json application/xml text/plain;
  # عکس‌های مقاله از پنل (سه اندازه‌ی WebP) تا ۱۲ مگابایت
  client_max_body_size 16m;"
write_http_only() {
  cat > /etc/nginx/sites-available/sasan <<EOF
server {
  listen 80;
  $L6_80
  server_name $DOMAIN www.$DOMAIN;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  $COMMON
  location / { $PROXY
  }
}
EOF
}
write_https() {
  cat > /etc/nginx/sites-available/sasan <<EOF
# http و www همیشه به https://$DOMAIN
server {
  listen 80;
  $L6_80
  server_name $DOMAIN www.$DOMAIN;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / { return 301 https://$DOMAIN\$request_uri; }
}
server {
  listen 443 ssl http2;
  $L6_443
  server_name www.$DOMAIN;
  ssl_certificate $CERT;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  return 301 https://$DOMAIN\$request_uri;
}
server {
  listen 443 ssl http2;
  $L6_443
  server_name $DOMAIN;
  ssl_certificate $CERT;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_session_cache shared:SSL:10m;
  $COMMON
  location / { $PROXY
  }
}
EOF
}
ln -sf /etc/nginx/sites-available/sasan /etc/nginx/sites-enabled/sasan
rm -f /etc/nginx/sites-enabled/default
if [ -s "$CERT" ]; then write_https; else write_http_only; fi
nginx -t && systemctl reload nginx

say "HTTPS"
if [ ! -s "$CERT" ]; then
  IP="$(curl -fsS -4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
  DNS="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')"
  echo "آی‌پی سرور: $IP   ·   $DOMAIN در DNS: ${DNS:-پیدا نشد}"
  if certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring; then
    write_https && nginx -t && systemctl reload nginx
    echo "گواهی گرفته شد"
  else
    echo "گواهی گرفته نشد؛ سایت فعلاً با http کار می‌کند. وقتی رکورد A دامنه (و www) به $IP رسید، همین اسکریپت را دوباره اجرا کنید."
  fi
fi
if [ -s "$CERT" ]; then
  # سربرگ HSTS فقط وقتی https برقرار است
  grep -q '^HSTS=' "$SRV/.env" && sed -i 's/^HSTS=.*/HSTS=1/' "$SRV/.env" || echo 'HSTS=1' >> "$SRV/.env"
fi
grep -q '^TRUST_PROXY=' "$SRV/.env" && sed -i 's/^TRUST_PROXY=.*/TRUST_PROXY=1/' "$SRV/.env" || echo 'TRUST_PROXY=1' >> "$SRV/.env"
chown www-data:www-data "$SRV/.env" && chmod 600 "$SRV/.env"
systemctl restart sasan
# تمدید خودکار گواهی: تایمر خود certbot؛ بعد از تمدید nginx دوباره خوانده می‌شود
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

say "پشتیبان شبانه‌ی داده‌ها"
mkdir -p /var/backups/sasan && chmod 700 /var/backups/sasan
echo "15 3 * * * root tar czf /var/backups/sasan/data-\$(date +\\%F).tgz -C $SRV data && find /var/backups/sasan -mtime +30 -delete" > /etc/cron.d/sasan-backup

say "دیواره‌ی آتش"
if command -v ufw >/dev/null && ufw status | grep -q active; then ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; echo "ufw: 22، 80 و 443 باز"; else echo "ufw فعال نیست"; fi

say "بررسی نهایی"
sleep 2
curl -fsS "http://127.0.0.1:$PORT/api/health"; echo
for u in "http://$DOMAIN/" "http://www.$DOMAIN/" "https://www.$DOMAIN/" "https://$DOMAIN/"; do
  printf '%-32s ' "$u"; curl -s -o /dev/null -m 10 -w '%{http_code} → %{redirect_url}\n' "$u" || echo "در دسترس نیست (DNS؟)"
done
(cd "$SRV" && runuser -u www-data -- "$NODE" tools/sms.js check) || true
# قالب‌های پیامک با نام ساسان کلینیک: sms.ir فقط وقتی تأیید می‌کند که سایت روی دامنه باز باشد
if grep -q '^SMSIR_MODE=live' "$SRV/.env" && [ "$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://$DOMAIN/")" = "200" ]; then
  say "قالب‌های پیامک نام‌دار"
  (cd "$SRV" && runuser -u www-data -- "$NODE" tools/sms.js templates) || true
fi
echo; echo "تمام. پنل پذیرش: https://$DOMAIN/panel/   (اولین حساب: cd $SRV && runuser -u www-data -- node tools/users.js)"
