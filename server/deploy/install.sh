#!/usr/bin/env bash
# ==========================================================================
# نصب کامل ساسان کلینیک روی سرور (Ubuntu یا Debian) با یک دستور، با کاربر root.
# بعد از ssh root@آی‌پی‌سرور، همین یک خط را بچسبانید:
#
#   apt-get update -qq && apt-get install -y -qq git && git clone --depth 1 -b claude/stoic-brahmagupta-1np5fy https://github.com/cyrus-saedi2027/0002.git /srv/sasan; bash /srv/sasan/server/deploy/install.sh
#
# به‌روزرسانی‌های بعدی (کد تازه از گیت‌هاب؛ server/.env و server/data دست نمی‌خورند):
#   bash /srv/sasan/server/deploy/install.sh
#
# کارها:
#   ۱. گرفتن یا به‌روز کردن کد از گیت‌هاب در /srv/sasan
#   ۲. بار اول: پرسیدن کلید اصلی sms.ir (با بررسی درستی‌اش) و موبایل پذیرش، و ساختن server/.env
#      کلید فقط در server/.env روی همین سرور می‌ماند (دسترسی 600)
#   ۳. setup.sh: Node.js، nginx، HTTPS، سرویس systemd، پشتیبان شبانه، ثبت قالب‌های پیامک نام‌دار
#   ۴. اگر هنوز حسابی نیست: حساب پنل پذیرش (paziresh) با رمز موقت تصادفی، و نشان دادن رمز در پایان
# متغیرهای اختیاری (تا کمتر پرسیده شود): SMS_KEY کلید اصلی sms.ir، PANEL_PASS رمز موقت حساب پنل، PANEL_NAME نام حساب
# گزینه‌ها:  --reset  داده‌های قبلی پنل کنار گذاشته می‌شوند (پشتیبان: server/data.bak-تاریخ) تا پنل تازه و خالی شروع شود
#            دامنه‌ی دیگر: bash install.sh example.ir
# ==========================================================================
set -euo pipefail
REPO="${REPO:-https://github.com/cyrus-saedi2027/0002.git}"
BRANCH="${BRANCH:-claude/stoic-brahmagupta-1np5fy}"
APP="${APP:-/srv/sasan}"
DOMAIN="sasan-clinic.ir"
TTY="${TTY_IN:-/dev/tty}"
RESET=0
for a in "$@"; do case "$a" in --reset) RESET=1 ;; *.*) DOMAIN="$a" ;; esac; done
SRV="$APP/server"
# نام حساب تا ساخته شدنش (بیرون از پوشه‌ی برنامه)
NAMEF="${NAMEF:-/root/.sasan-install-name}"
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok() { printf '\033[32m%s\033[0m\n' "$*"; }
bad() { printf '\033[31m%s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || [ -n "${SKIP_SETUP:-}" ] || { bad "با root اجرا کنید (sudo -i)"; exit 1; }
fa2en() { sed 's/۰/0/g;s/۱/1/g;s/۲/2/g;s/۳/3/g;s/۴/4/g;s/۵/5/g;s/۶/6/g;s/۷/7/g;s/۸/8/g;s/۹/9/g' | tr -d ' \t\r-'; }

# ---------- ۱. کد ----------
say "کد سایت از گیت‌هاب"
command -v git >/dev/null || { apt-get update -y -q >/dev/null && apt-get install -y -q git >/dev/null; }
if [ -d "$APP/.git" ]; then
  git -C "$APP" fetch -q --depth 1 origin "$BRANCH"
  git -C "$APP" reset -q --hard FETCH_HEAD
else
  OLD=""
  if [ -e "$APP" ]; then OLD="$APP.old-$(date +%F-%H%M%S)"; mv "$APP" "$OLD"; echo "نسخه‌ی قبلی کنار گذاشته شد: $OLD"; fi
  git clone -q --depth 1 -b "$BRANCH" "$REPO" "$APP"
  if [ -n "$OLD" ]; then
    [ -f "$OLD/server/.env" ] && cp -a "$OLD/server/.env" "$SRV/.env"
    [ -d "$OLD/server/data" ] && cp -a "$OLD/server/data" "$SRV/data"
  fi
fi
ok "نسخه: $(git -C "$APP" log -1 --format='%h · %cd' --date=format:'%Y-%m-%d %H:%M')"

# ---------- ۲. تنظیمات (فقط بار اول) ----------
FIRST=0
if [ ! -f "$SRV/.env" ]; then
  FIRST=1
  say "تنظیمات (فقط بار اول)"
  command -v curl >/dev/null || apt-get install -y -q curl >/dev/null
  exec 3<"$TTY" 2>/dev/null || exec 3</dev/null
  # کلید می‌تواند از پیش در SMS_KEY آمده باشد (در دستور نصب)؛ وگرنه پرسیده می‌شود
  KEY_IN="${SMS_KEY:-}"
  for i in 1 2 3 4 5; do
    if [ -n "$KEY_IN" ]; then KEY="$KEY_IN"; KEY_IN=""; else
    printf 'کلید اصلی پنل sms.ir را بچسبانید و Enter بزنید (دیده نمی‌شود): '
    IFS= read -rs KEY <&3 || true; echo
    fi
    KEY="$(printf '%s' "$KEY" | tr -d ' \t\r\n')"
    [ -n "$KEY" ] || continue
    R="$(curl -s -m 20 -H "x-api-key: $KEY" -H 'accept: application/json' https://api.sms.ir/v1/credit || true)"
    if printf '%s' "$R" | grep -q '"status":1'; then ok "  کلید درست است · اعتبار پنل: $(printf '%s' "$R" | sed -n 's/.*"data":\([0-9.]*\).*/\1/p')"; break; fi
    if [ -z "$R" ]; then bad "  sms.ir جواب نداد (اینترنت سرور؟)؛ کلید بدون بررسی ذخیره می‌شود."; break; fi
    bad "  sms.ir این کلید را نپذیرفت؛ دوباره امتحان کنید."; KEY=""
  done
  [ -n "${KEY:-}" ] || { bad "کلید sms.ir وارد نشد؛ دوباره همین دستور را اجرا کنید."; exit 1; }
  # موبایل لازم نیست: ورود پنل فقط با نام کاربری و رمز است (PANEL_2FA=0)
  MOB="${RECEPTION_MOBILE:-}"
  NAME="${PANEL_NAME:-پذیرش ساسان کلینیک}"
  exec 3<&-
  rnd() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
  umask 077
  cat >"$SRV/.env" <<EOF
# ساخته‌شده با deploy/install.sh — این فایل را به کسی ندهید و وارد git نکنید
SMSIR_MODE=live
SMSIR_API_KEY=$KEY
SMSIR_TEMPLATE_ID=284896
SMSIR_TEMPLATE_PARAM=OTP
RECEPTION_MOBILE=$MOB
OTP_SECRET=$(rnd 32)
ADMIN_TOKEN=$(rnd 20)
PANEL_2FA=0
PORT=8080
HOST=127.0.0.1
EOF
  umask 022
  printf '%s' "$NAME" >"$NAMEF"
  ok "server/.env ساخته شد"
fi

# ---------- پنل تازه (--reset) ----------
if [ "$RESET" = 1 ] && [ -d "$SRV/data" ]; then
  say "پنل تازه"
  systemctl stop sasan 2>/dev/null || true
  B="$SRV/data.bak-$(date +%F-%H%M%S)"; mv "$SRV/data" "$B"; chmod 700 "$B"
  ok "داده‌های قبلی کنار گذاشته شد: $B"
fi

# ---------- ۳. نصب ----------
if [ -z "${SKIP_SETUP:-}" ]; then
  bash "$SRV/deploy/setup.sh" "$DOMAIN"
fi
NODE="$(command -v node || true)"

# ---------- ۴. حساب پنل پذیرش ----------
PASS_LINE=""
COUNT="$(cd "$SRV" && "${NODE:-node}" -e "try{const j=require('./data/users.json');console.log(Array.isArray(j)?j.length:0)}catch(e){console.log(0)}" 2>/dev/null || echo 0)"
if [ "$COUNT" = 0 ]; then
  say "حساب پنل پذیرش"
  MOB="${MOB:-$(grep -E '^RECEPTION_MOBILE=' "$SRV/.env" | cut -d= -f2)}"; MOB="${MOB:--}"
  NAME="${NAME:-$(cat "$NAMEF" 2>/dev/null || echo 'پذیرش ساسان کلینیک')}"
  RUN=(); [ -z "${SKIP_SETUP:-}" ] && RUN=(runuser -u www-data --)
  # رمز موقت: از PANEL_PASS (اگر در دستور نصب آمده و به‌اندازه‌ی کافی قوی است)، وگرنه تصادفی
  OUT="$(cd "$SRV" && PANEL_PASS="${PANEL_PASS:-}" "${RUN[@]}" env PANEL_PASS="${PANEL_PASS:-}" "${NODE:-node}" tools/users.js create paziresh "$MOB" $NAME </dev/null 2>&1 || true)"
  printf '%s\n' "$OUT"
  PASS_LINE="$(printf '%s' "$OUT" | sed 's/\x1b\[[0-9;]*m//g' | sed -n 's/.*رمز موقت: \([A-Za-z0-9@#%+=_.-]*\).*/\1/p' | head -1)"
fi
rm -f "$NAMEF"

# ---------- پایان ----------
SCHEME=https; [ -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] || SCHEME=http
say "تمام"
echo "سایت:           $SCHEME://$DOMAIN"
echo "پنل پذیرش:      $SCHEME://$DOMAIN/panel/"
echo "راهنمای پنل:    $SCHEME://$DOMAIN/panel/guide.html"
if [ -n "$PASS_LINE" ]; then
  echo
  printf '\033[1;42;30m  ورود به پنل ←  نام کاربری: paziresh    رمز: %s  \033[0m\n' "$PASS_LINE"
  echo "ورود فقط با همین نام کاربری و رمز است. (رمز تازه اگر لازم شد: cd $SRV && runuser -u www-data -- node tools/users.js temp paziresh)"
fi
[ "$SCHEME" = http ] && echo "HTTPS هنوز نیست؛ وقتی DNS دامنه به همین سرور رسید، همین دستور را دوباره بزنید: bash $SRV/deploy/install.sh"
exit 0
