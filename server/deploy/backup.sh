#!/usr/bin/env bash
# ==========================================================================
# پشتیبان کامل ساسان کلینیک از روی سرور زنده، با کاربر root:
#
#   bash /srv/sasan/server/deploy/backup.sh --link
#
# با --link (پیشنهادی) آخر کار یک لینک https می‌دهد که یک ساعت اعتبار دارد؛ در مرورگر بازش کنید تا فایل دانلود شود،
# بی‌نیاز به pscp و WinSCP. بدون --link فقط فایل روی سرور می‌ماند و دستور گرفتنش با pscp چاپ می‌شود.
#
# یک فایل می‌سازد که برای بالا آوردن سایت روی هر سرور دیگر کافی است (با restore.sh):
#   data/            نوبت‌ها، درخواست‌های تماس، مخاطب‌ها، حساب‌ها و رمزهای پنل (هش)، مقاله‌ها و عکس‌های ساخته‌شده در پنل، آمار، وضعیت قالب پیامک
#   env.txt          server/.env (کلید اصلی sms.ir و تنظیمات)
#   letsencrypt.tgz  گواهی HTTPS با کلید خصوصی (با --no-certs نمی‌آید؛ گواهی را می‌شود دوباره گرفت)
#   INFO.txt، nginx-sasan.conf، sasan.service، cron  فقط برای مرجع؛ setup.sh همه را از نو می‌سازد
#
# خروجی: /root/backups/sasan-server-backup-سال-ماه-روز_ساعتدقیقه.tgz (دسترسی 600)
# این فایل شماره‌ی بیمارها و کلیدها را دارد: روی گیت‌هاب یا جای عمومی نگذارید.
# رمزگذاری اختیاری (برای نگه‌داری در ابر یا فلش):
#   BACKUP_PASS='یک عبارت قوی' bash /srv/sasan/server/deploy/backup.sh      ← فایل .tgz.enc
# ==========================================================================
set -euo pipefail
APP="${APP:-/srv/sasan}"
SRV="$APP/server"
ETC="${ETC:-/etc}"
OUT_DIR="${OUT_DIR:-/root/backups}"
NOCERTS=0
LINK=0
DOMAIN="${DOMAIN:-sasan-clinic.ir}"
for a in "$@"; do case "$a" in --no-certs) NOCERTS=1 ;; --link) LINK=1 ;; esac; done
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok() { printf '\033[32m%s\033[0m\n' "$*"; }
bad() { printf '\033[31m%s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || [ -n "${ALLOW_NONROOT:-}" ] || { bad "با root اجرا کنید (sudo -i)"; exit 1; }
[ -d "$SRV/data" ] || { bad "پوشه‌ی $SRV/data پیدا نشد؛ این اسکریپت را روی خود سرور سایت اجرا کنید."; exit 1; }

umask 077
STAMP="$(date +%F_%H%M)"
NAME="sasan-server-backup-$STAMP"
mkdir -p "$OUT_DIR"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
W="$T/$NAME"
mkdir -p "$W"
# اجرای بی‌صدا: اگر دستور روی این سرور نبود، فقط «(نیست)» نوشته می‌شود
try() { if command -v "$1" >/dev/null 2>&1; then "$@" 2>&1 || true; else echo "(نیست)"; fi; }

say "داده‌ها"
cp -a "$SRV/data" "$W/data"
find "$W/data" -name '*.tmp' -delete
# لینک‌های دانلود قبلی (data/.dl) جزو داده نیستند
[ -d "$W/data/.dl" ] && find "$W/data/.dl" -delete
ok "$(find "$W/data" -type f | wc -l) فایل از $SRV/data"

say "تنظیمات (.env)"
if [ -f "$SRV/.env" ]; then cp -a "$SRV/.env" "$W/env.txt"; ok "server/.env"; else bad "server/.env پیدا نشد"; fi

say "گواهی HTTPS"
if [ "$NOCERTS" = 0 ] && [ -d "$ETC/letsencrypt" ]; then
  tar -C "$(dirname "$ETC")" -czf "$W/letsencrypt.tgz" "$(basename "$ETC")/letsencrypt"
  ok "گواهی و کلیدش گذاشته شد"
else
  echo "گذاشته نشد"
fi

say "مشخصات سرور (برای مرجع)"
for f in "$ETC/nginx/sites-available/sasan:nginx-sasan.conf" "$ETC/systemd/system/sasan.service:sasan.service" "$ETC/cron.d/sasan-backup:cron-sasan-backup"; do
  [ -f "${f%%:*}" ] && cp "${f%%:*}" "$W/${f##*:}"
done
{
  echo "تاریخ بکاپ:  $(date -R)"
  echo "سرور:        $(hostname) · آی‌پی: $(try hostname -I)"
  echo "سیستم‌عامل:   $(. "$ETC/os-release" 2>/dev/null && echo "$PRETTY_NAME") · $(uname -sr)"
  echo "node:        $(try node -v)"
  echo "nginx:       $(try nginx -v)"
  echo "نسخه‌ی کد:    $(git -C "$APP" log -1 --format='%H · %cd' --date=iso 2>/dev/null || echo 'بدون git (کد از فایل tar بازشده)')"
  echo "سرویس sasan: $(try systemctl is-active sasan)"
  echo "دامنه در DNS: $(getent ahostsv4 sasan-clinic.ir 2>/dev/null | awk 'NR==1{print $1}')"
  if [ -s "$ETC/letsencrypt/live/sasan-clinic.ir/fullchain.pem" ]; then
    echo "گواهی HTTPS: $(try openssl x509 -in "$ETC/letsencrypt/live/sasan-clinic.ir/fullchain.pem" -noout -enddate)"
  fi
  echo "فایروال:"; try ufw status | sed 's/^/  /'
  echo "پشتیبان‌های شبانه (/var/backups/sasan):"; ls -la /var/backups/sasan 2>/dev/null | sed 's/^/  /' || true
} >"$W/INFO.txt"
ok "INFO.txt"

summary() {
  command -v node >/dev/null || return 0
  node -e '
const fs = require("fs"), p = require("path"); const d = process.argv[1];
const rd = (f) => { try { return JSON.parse(fs.readFileSync(p.join(d, f), "utf8")); } catch (e) { return null; } };
const n = (x) => (Array.isArray(x) ? x.length : x && typeof x === "object" ? Object.keys(x).length : 0);
const cnt = (dir) => { let c = 0; const w = (q) => { try { for (const e of fs.readdirSync(q, { withFileTypes: true })) { e.isDirectory() ? w(p.join(q, e.name)) : c++; } } catch (e) {} }; w(dir); return c; };
console.log("  نوبت‌ها: " + n(rd("bookings.json")) + " · درخواست تماس: " + n(rd("callbacks.json")) + " · مخاطب‌ها: " + n(rd("contacts.json")) + " · کارکنان پنل: " + n(rd("users.json")));
console.log("  فایل‌های مقاله‌های پنل: " + cnt(p.join(d, "articles")) + " · عکس‌های بارگذاری‌شده: " + cnt(p.join(d, "uploads")));
' "$1"
}
say "آنچه در بکاپ است"
summary "$W/data"

say "ساخت فایل"
FILE="$OUT_DIR/$NAME.tgz"
tar -C "$T" -czf "$FILE" "$NAME"
if [ -n "${BACKUP_PASS:-}" ]; then
  openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:BACKUP_PASS -in "$FILE" -out "$FILE.enc"
  rm -f "$FILE"; FILE="$FILE.enc"
  ok "فایل با BACKUP_PASS رمزگذاری شد؛ همان عبارت را برای بازگردانی نگه دارید"
fi
chmod 600 "$FILE"
SUM="$(sha256sum "$FILE" | cut -d' ' -f1)"
echo "$SUM  $(basename "$FILE")" >"$FILE.sha256"
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"; IP="${IP:-آی‌پی-سرور}"
BYTES="$(stat -c %s "$FILE")"
echo
ok "بکاپ آماده است:"
echo "  $FILE  ($(du -h "$FILE" | cut -f1) · $BYTES بایت)"
echo "  sha256: $SUM"

CODE=""
if [ "$LINK" = 1 ]; then
  say "لینک دانلود"
  PORT="$(grep -E '^PORT=' "$SRV/.env" 2>/dev/null | cut -d= -f2 || true)"; PORT="${PORT:-8080}"
  DL="$SRV/data/.dl"
  mkdir -p "$DL"; chmod 700 "$DL"; chown www-data:www-data "$DL" 2>/dev/null || true
  find "$DL" -type f -mmin +60 -delete 2>/dev/null || true
  TOKEN="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  cp "$FILE" "$DL/$TOKEN.dat"
  printf '%s' "$(basename "$FILE")" >"$DL/$TOKEN.name"
  chmod 600 "$DL/$TOKEN.dat" "$DL/$TOKEN.name"
  chown www-data:www-data "$DL/$TOKEN.dat" "$DL/$TOKEN.name" 2>/dev/null || true
  here() { curl -s -o /dev/null -m 10 -I -w '%{http_code}' "http://127.0.0.1:$PORT/api/backup-dl/$TOKEN" 2>/dev/null || true; }
  CODE="$(here)"
  if [ "$CODE" != 200 ] && command -v systemctl >/dev/null 2>&1; then
    echo "سرویس هنوز کد قبلی را اجرا می‌کند؛ یک راه‌اندازی دوباره‌ی چندثانیه‌ای تا کد تازه بارگیری شود…"
    systemctl restart sasan || true
    sleep 4
    CODE="$(here)"
  fi
  if [ "$CODE" = 200 ]; then
    PUB="$(curl -s -o /dev/null -m 10 -I -w '%{http_code}' --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/backup-dl/$TOKEN" 2>/dev/null || true)"
    echo
    printf '\033[1;42;30m  لینک دانلود (یک ساعت اعتبار دارد):  \033[0m\n'
    echo
    echo "  https://$DOMAIN/api/backup-dl/$TOKEN"
    echo
    echo "این نشانی را کپی کنید، در مرورگر (با VPN خاموش) باز کنید تا فایل دانلود شود."
    echo "حجم فایل دانلودشده باید دقیقاً $BYTES بایت باشد؛ اگر کمتر بود، همین لینک را دوباره بزنید."
    [ "$PUB" = 200 ] || echo "(بررسی https از داخل سرور کد ${PUB:-؟} داد؛ اگر لینک باز نشد، از روش پایین استفاده کنید.)"
  else
    bad "لینک ساخته نشد (کد ${CODE:-؟})؛ از روش پایین استفاده کنید."
  fi
fi

echo
if [ "$LINK" = 1 ] && [ "$CODE" = 200 ]; then echo "روش دیگر، اگر لینک باز نشد:"; else echo "فایل را به کامپیوتر خودتان بگیرید (VPN خاموش):"; fi
echo "  • ویندوز، cmd یا PowerShell در پوشه‌ای که می‌خواهید فایل در آن بیاید:"
echo "      pscp root@$IP:$FILE ."
echo "  • یا برنامه‌ی WinSCP: پروتکل SFTP، سرور $IP، کاربر root، پوشه‌ی $OUT_DIR"
echo "  • مک و لینوکس:  scp root@$IP:$FILE ."
echo "این فایل را فقط پیش خودتان نگه دارید."
