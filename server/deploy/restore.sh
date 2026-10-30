#!/usr/bin/env bash
# ==========================================================================
# بالا آوردن ساسان کلینیک روی یک سرور تازه (Ubuntu یا Debian) از فایلی که backup.sh ساخته، با کاربر root:
#
#   bash /srv/sasan/server/deploy/restore.sh /root/sasan-server-backup-2026-10-30_1500.tgz
#   دامنه‌ی دیگر:   bash restore.sh فایل.tgz example.ir
#   فایل رمزگذاری‌شده (.tgz.enc):  BACKUP_PASS='عبارت' bash restore.sh فایل.tgz.enc
#   بدون گواهی داخل بکاپ (گواهی تازه گرفته شود):  --no-certs
#
# پیش از آن کد باید در /srv/sasan باشد؛ یکی از دو راه:
#   با گیت‌هاب:    apt-get update -qq && apt-get install -y -qq git && git clone --depth 1 -b claude/stoic-brahmagupta-1np5fy https://github.com/cyrus-saedi2027/0002.git /srv/sasan
#   بدون گیت‌هاب:  mkdir -p /srv/sasan && tar -xzf sasan-code-تاریخ.tar.gz -C /srv/sasan --strip-components=1
#
# کارها:
#   ۱. بازکردن بکاپ و گذاشتن server/.env و server/data (اگر چیزی از قبل هست، کنارش نگه داشته می‌شود، پاک نمی‌شود)
#   ۲. اگر گواهی HTTPS در بکاپ هست و هنوز معتبر است، گذاشتنش؛ وگرنه setup.sh گواهی تازه می‌گیرد
#   ۳. setup.sh: Node.js، nginx، سرویس، HTTPS، پشتیبان شبانه، فایروال و بررسی نهایی
# DNS: رکورد A دامنه و www را به آی‌پی همین سرور ببرید (جزئیات: backups/…/README-RESTORE.md).
# ==========================================================================
set -euo pipefail
APP="${APP:-/srv/sasan}"
SRV="$APP/server"
ETC="${ETC:-/etc}"
DOMAIN="sasan-clinic.ir"
FILE=""
NOCERTS=0
for a in "$@"; do
  case "$a" in
    --no-certs) NOCERTS=1 ;;
    *.tgz | *.tgz.enc | *.tar.gz) FILE="$a" ;;
    *.*) DOMAIN="$a" ;;
  esac
done
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok() { printf '\033[32m%s\033[0m\n' "$*"; }
bad() { printf '\033[31m%s\033[0m\n' "$*"; }
[ -n "$FILE" ] && [ -f "$FILE" ] || { bad "فایل بکاپ را بدهید: bash restore.sh /root/sasan-server-backup-....tgz"; exit 1; }
[ -f "$SRV/server.js" ] || { bad "کد سایت در $APP نیست؛ اول کد را بگذارید (توضیح بالای همین فایل)."; exit 1; }
[ "$(id -u)" = 0 ] || [ -n "${SKIP_SETUP:-}" ] || { bad "با root اجرا کنید (sudo -i)"; exit 1; }

need_openssl() { command -v openssl >/dev/null || { apt-get update -y -q >/dev/null && apt-get install -y -q openssl >/dev/null; }; }
umask 077
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT

say "بازکردن بکاپ"
PLAIN="$FILE"
case "$FILE" in
  *.enc)
    need_openssl
    if [ -z "${BACKUP_PASS:-}" ]; then
      printf 'عبارت رمزگذاری بکاپ را بنویسید (دیده نمی‌شود): '
      IFS= read -rs BACKUP_PASS <"${TTY_IN:-/dev/tty}" || true
      echo
      export BACKUP_PASS
    fi
    PLAIN="$T/backup.tgz"
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_PASS -in "$FILE" -out "$PLAIN" 2>/dev/null \
      || { bad "رمزگشایی نشد؛ عبارت درست نیست."; exit 1; }
    ;;
esac
tar -tzf "$PLAIN" >/dev/null 2>&1 || { bad "فایل بکاپ سالم نیست (دانلودش ناقص بوده؟)."; exit 1; }
mkdir -p "$T/x"
tar -xzf "$PLAIN" -C "$T/x"
B="$(find "$T/x" -mindepth 1 -maxdepth 1 -type d | head -1)"
[ -n "$B" ] && [ -d "$B/data" ] || { bad "پوشه‌ی data در بکاپ نیست."; exit 1; }
ok "بکاپ سالم است: $(basename "$B")"

say "گذاشتن داده‌ها و تنظیمات"
TS="$(date +%F-%H%M%S)"
if [ -d "$SRV/data" ] && [ -n "$(ls -A "$SRV/data" 2>/dev/null)" ]; then
  mv "$SRV/data" "$SRV/data.before-restore-$TS"
  echo "داده‌های موجود کنار گذاشته شد: $SRV/data.before-restore-$TS"
fi
if [ -f "$SRV/.env" ]; then
  mv "$SRV/.env" "$SRV/.env.before-restore-$TS"
  echo "server/.env موجود کنار گذاشته شد: $SRV/.env.before-restore-$TS"
fi
cp -a "$B/data" "$SRV/data"
if [ -f "$B/env.txt" ]; then
  install -m 600 "$B/env.txt" "$SRV/.env"
  ok "server/.env گذاشته شد"
else
  bad "env.txt در بکاپ نبود؛ بعد از این مرحله باید server/.env را خودتان بسازید (DEPLOY.md)."
fi
chown -R www-data:www-data "$SRV/data" 2>/dev/null || true
[ -f "$SRV/.env" ] && chown www-data:www-data "$SRV/.env" 2>/dev/null || true
ok "$(find "$SRV/data" -type f | wc -l) فایل داده گذاشته شد"

say "گواهی HTTPS"
if [ "$NOCERTS" = 1 ] || [ ! -f "$B/letsencrypt.tgz" ]; then
  echo "گواهی در بکاپ نیست یا خواسته نشد؛ setup.sh گواهی تازه می‌گیرد (DNS باید به این سرور برسد)."
elif [ -e "$ETC/letsencrypt/live/$DOMAIN" ]; then
  echo "روی این سرور از قبل گواهی هست؛ دست نمی‌خورد."
else
  need_openssl
  mkdir -p "$T/le"
  tar -xzf "$B/letsencrypt.tgz" -C "$T/le"
  C="$(find "$T/le" -path "*/letsencrypt/live/$DOMAIN/fullchain.pem" | head -1)"
  if [ -n "$C" ] && [ -s "$C" ] && openssl x509 -in "$C" -noout -checkend 604800 >/dev/null 2>&1; then
    mkdir -p "$ETC"
    tar -xzf "$B/letsencrypt.tgz" -C "$ETC" --strip-components=1
    ok "گواهی بازگردانده شد؛ تا DNS عوض شود هم HTTPS روی همین سرور آماده است."
  else
    echo "گواهی داخل بکاپ برای $DOMAIN نیست یا کمتر از یک هفته اعتبار دارد؛ گواهی تازه گرفته می‌شود."
  fi
fi

if [ -z "${SKIP_SETUP:-}" ]; then
  bash "$SRV/deploy/setup.sh" "$DOMAIN"
else
  echo; echo "SKIP_SETUP: اجرای setup.sh رد شد."
fi

say "تمام"
echo "داده‌های بازگردانده‌شده:"
if command -v node >/dev/null; then
  node -e '
const fs = require("fs"), p = require("path"); const d = process.argv[1];
const rd = (f) => { try { return JSON.parse(fs.readFileSync(p.join(d, f), "utf8")); } catch (e) { return null; } };
const n = (x) => (Array.isArray(x) ? x.length : x && typeof x === "object" ? Object.keys(x).length : 0);
console.log("  نوبت‌ها: " + n(rd("bookings.json")) + " · درخواست تماس: " + n(rd("callbacks.json")) + " · مخاطب‌ها: " + n(rd("contacts.json")) + " · کارکنان پنل: " + n(rd("users.json")));
' "$SRV/data"
fi
echo "سایت:      https://$DOMAIN   (تا DNS عوض نشده، با آی‌پی این سرور و http باز می‌شود)"
echo "پنل پذیرش: https://$DOMAIN/panel/   (همان نام کاربری و رمز قبلی)"
echo "اگر آی‌پی سرور عوض شده، رکورد A دامنه و www را به $(hostname -I 2>/dev/null | awk '{print $1}') ببرید و بعد از رسیدن DNS دوباره بزنید: bash $SRV/deploy/setup.sh $DOMAIN"
