#!/usr/bin/env bash
# ==========================================================================
# پاک کردن کامل ساسان کلینیک از روی سرور. با root، روی خود سرور (مثلاً از کنسول VNC):
#
#   bash /srv/sasan/server/deploy/wipe.sh --dry-run    فقط نشان می‌دهد چه چیزی پاک می‌شود؛ هیچ چیز پاک نمی‌شود
#   bash /srv/sasan/server/deploy/wipe.sh              می‌پرسد، بعد پاک می‌کند (برگشت ندارد)
#
# پاک می‌شود:
#   • کد سایت، همه‌ی داده‌ها (نوبت‌ها، مخاطب‌ها، حساب‌ها، مقاله‌ها و عکس‌های پنل) و server/.env (کلید sms.ir)
#   • نسخه‌های قدیمی کنار آن (/srv/sasan.old-…)
#   • بکاپ‌های ساسان روی همین سرور: /root/backups/sasan-server-backup-*، /var/backups/sasan، /root/sasan-*، /tmp/sasan-*
#   • گواهی HTTPS با کلید خصوصی‌اش، سرویس sasan، تنظیم nginx، کار شبانه‌ی بکاپ
#   • لاگ‌های nginx و journal و تاریخچه‌ی دستورهای root
# هر فایل اول یک بار با داده‌ی تصادفی و یک بار با صفر رونویسی (shred) و بعد پاک می‌شود.
# به چیز دیگری روی سرور دست نمی‌زند (سیستم‌عامل، nginx، Node.js، سایت‌های دیگر).
#
# زبان پیام‌ها: کنسول VNC (TERM=linux) حروف فارسی را نشان نمی‌دهد؛ آنجا پیام‌ها انگلیسی است.
# در PuTTY/SSH فارسی است. با WIPE_LANG=en یا WIPE_LANG=fa می‌شود تغییرش داد.
#
# بعدش سایت فقط با بکاپ دوباره بالا می‌آید (backups/…/README-RESTORE.md). مطمئن شوید بکاپ را دانلود کرده‌اید.
# رونویسی روی سرور مجازی ضمانت نمی‌کند شرکت سرور نسخه‌ای از دیسک نگه نداشته باشد؛ مطمئن‌ترین کار، نصب دوباره‌ی
# سیستم‌عامل یا حذف سرور در پنل شرکت سرور است.
# ==========================================================================
set -u
# اگر ارتباط وسط کار قطع شود (بستن PuTTY)، پاک کردن باید تا آخر برود، نه نصفه بماند
trap '' HUP
# پوشه‌ی سایت همین الان پاک می‌شود؛ پس اگر از داخلش اجرا شده، اول یک نسخه از خود اسکریپت به /tmp می‌رود و از آن‌جا ادامه می‌دهد
if [ -z "${WIPE_REEXEC:-}" ]; then
  COPY="$(mktemp "${TMPDIR:-/tmp}/sasan-wipe.XXXXXX")" && cp -- "$0" "$COPY" && WIPE_REEXEC="$COPY" exec bash "$COPY" "$@"
fi
trap 'rm -f -- "${WIPE_REEXEC:-}"' EXIT

main() {
# R فقط برای آزمایش است: همه‌ی مسیرها زیر این پوشه می‌روند. روی سرور واقعی خالی است.
R="${WIPE_ROOT:-}"
APP="$R/srv/sasan"
DOMAIN="sasan-clinic.ir"
DRY=0
for a in "$@"; do case "$a" in --dry-run) DRY=1 ;; -*) ;; *.*) DOMAIN="$a" ;; esac; done
# نام دامنه در مسیرها می‌رود؛ چیزی جز حرف، عدد، نقطه و خط‌تیره پذیرفته نمی‌شود
case "$DOMAIN" in '' | *[!A-Za-z0-9.-]* | *..* | .* | -*) echo "bad domain name / نام دامنه درست نیست"; exit 1 ;; esac
TTY="${TTY_IN:-/dev/tty}"

# زبان: فارسی فقط در ترمینال‌هایی که نشانش می‌دهند (PuTTY و مانند آن)؛ کنسول VNC انگلیسی
case "${WIPE_LANG:-}" in
  fa) FA=1 ;;
  en) FA=0 ;;
  *) case "${TERM:-linux}" in xterm* | screen* | tmux* | rxvt* | putty* | konsole* | gnome* | alacritty* | kitty* | foot*) FA=1 ;; *) FA=0 ;; esac ;;
esac
t() { if [ "$FA" = 1 ]; then printf '%s' "$1"; else printf '%s' "$2"; fi; }
# علامت‌ها: فونت کنسول لینوکس تیک و علامت هشدار ندارد؛ آنجا حروف ساده
if [ "$FA" = 1 ]; then M_OK='✓'; M_NO='✗'; M_WARN='⚠'; BUL='•'; else M_OK='[ok]'; M_NO='[X]'; M_WARN='[!]'; BUL='-'; fi
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok() { printf '\033[32m%s\033[0m\n' "$*"; }
bad() { printf '\033[31m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }

[ -n "$R" ] || [ "$(id -u)" = 0 ] || [ -n "${ALLOW_NONROOT:-}" ] || { bad "$(t 'با root اجرا کنید (sudo -i)' 'Run as root (sudo -i)')"; exit 1; }
# نشانه‌های برنامه؛ اگر هیچ‌کدام نیست یعنی قبلاً پاک شده (یا آدرس غلط است) و چیزی پاک نمی‌شود.
# (فقط server.js نمی‌پرسیم تا اگر اجرای قبلی نصفه ماند، اجرای دوباره باقی‌مانده را هم پاک کند)
if [ ! -f "$APP/server/server.js" ] && [ ! -d "$APP/server/data" ] && [ ! -f "$APP/server/.env" ]; then
  bad "$(t "کد ساسان کلینیک در $APP نیست (شاید قبلاً پاک شده). چیزی پاک نشد." "Sasan Clinic is not in $APP (maybe it is already wiped). Nothing was deleted.")"
  exit 1
fi
SRV="$APP/server"
{ exec 3<"$TTY"; } 2>/dev/null || exec 3</dev/null

jcount() {
  command -v node >/dev/null 2>&1 || { echo '?'; return; }
  node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(Array.isArray(j)?j.length:Object.keys(j).length)}catch(e){console.log(0)}' "$1"
}
size() { du -sh "$1" 2>/dev/null | cut -f1; }
FAILED=0
# یک فایل یا پوشه: اول رونویسی، بعد پاک. فقط مسیرهای ثابت همین اسکریپت به آن داده می‌شود.
# لینک‌ها دنبال نمی‌شوند: خود لینک پاک می‌شود، نه آنچه به آن اشاره می‌کند.
wipe_path() {
  local p="$1"
  [ -e "$p" ] || [ -L "$p" ] || return 0
  if [ "$DRY" = 1 ]; then echo "  $(t '[آزمایشی] پاک می‌شد:' '[dry-run] would delete:') $p"; return 0; fi
  if [ -d "$p" ] && [ ! -L "$p" ]; then
    find "$p" -type f -exec shred -f -n 1 -z -u {} + 2>/dev/null
    rm -rf -- "$p"
  else
    [ -f "$p" ] && [ ! -L "$p" ] && shred -f -n 1 -z -u -- "$p" 2>/dev/null
    rm -f -- "$p"
  fi
  if [ -e "$p" ] || [ -L "$p" ]; then bad "  $M_NO $(t 'پاک نشد:' 'NOT deleted:') $p"; FAILED=$((FAILED + 1)); else ok "  $M_OK $p"; fi
}

# ---------- ۱. نشان دادن آنچه پاک می‌شود ----------
say "$(t 'این‌ها پاک می‌شود' 'What will be deleted')"
echo "  $BUL $(t 'کد سایت، داده‌ها و تنظیمات:' 'Site code, data and settings:') $APP  ($(size "$APP"))"
echo "      $(t 'نوبت‌ها' 'bookings'): $(jcount "$SRV/data/bookings.json") · $(t 'درخواست تماس' 'callback requests'): $(jcount "$SRV/data/callbacks.json") · $(t 'مخاطب‌ها' 'contacts'): $(jcount "$SRV/data/contacts.json") · $(t 'حساب‌های پنل' 'panel accounts'): $(jcount "$SRV/data/users.json")"
OLDS=""; for d in "$APP".old-*; do [ -e "$d" ] && OLDS="$OLDS $d"; done
[ -n "$OLDS" ] && echo "  $BUL $(t 'نسخه‌های قدیمی:' 'Old copies:')$OLDS"
NBK="$(find "$R/root/backups" "$R/var/backups/sasan" -maxdepth 1 -type f \( -name '*.tgz' -o -name '*.enc' \) 2>/dev/null | grep -c .)"
echo "  $BUL $(t 'بکاپ‌های ساسان روی همین سرور' 'Sasan backups on this server') ($NBK $(t 'فایل' 'files')): $R/root/backups, $R/var/backups/sasan"
SIDE=""; for f in "$R"/root/sasan-* "$R"/tmp/sasan-*; do [ -e "$f" ] && [ "$f" != "${WIPE_REEXEC:-}" ] && SIDE="$SIDE $f"; done
[ -n "$SIDE" ] && echo "  $BUL $(t 'فایل‌های جانبی:' 'Side files:')$SIDE"
echo "  $BUL $(t 'گواهی HTTPS و کلید خصوصی، سرویس sasan، تنظیم nginx، کار شبانه‌ی بکاپ' 'HTTPS certificate and private key, sasan service, nginx site, nightly backup job')"
echo "  $BUL $(t 'لاگ‌های nginx و journal، تاریخچه‌ی دستورهای root' 'nginx and journal logs, root command history')"
command -v shred >/dev/null 2>&1 || warn "  $M_WARN $(t 'برنامه‌ی shred روی این سرور نیست؛ فایل‌ها فقط پاک می‌شوند و رونویسی نمی‌شوند.' 'shred is not installed: files will only be deleted, not overwritten.')"

# ---------- ۲. آیا بعد از بکاپ دستی چیزی تغییر کرده؟ ----------
# بکاپ دستی همانی است که با backup.sh گرفته و دانلود شده؛ بکاپ شبانه‌ی /var/backups/sasan را کسی دانلود نکرده، پس مرجع نیست.
REF="$(ls -1t "$R"/root/backups/sasan-server-backup-*.tgz "$R"/root/backups/sasan-server-backup-*.tgz.enc 2>/dev/null | head -1)"
NEW=""
if [ -z "$REF" ]; then
  NEW="x"
  warn "  $M_WARN $(t 'روی این سرور هیچ بکاپ دستی (sasan-server-backup-…) پیدا نشد. مطمئن شوید بکاپ را جای دیگری دارید.' 'No manual backup (sasan-server-backup-...) found on this server. Make sure you have one saved elsewhere.')"
else
  REFD="$(basename "$REF") ($(date -r "$REF" '+%Y-%m-%d %H:%M' 2>/dev/null))"
  CH="$(find "$SRV/data" -path "$SRV/data/.dl" -prune -o -type f -newer "$REF" ! -name sessions.json ! -name stats.json ! -name audit.jsonl ! -name '*.tmp' -printf '%P\n' 2>/dev/null)"
  if [ -n "$CH" ]; then
    NEW="x"
    warn "  $M_WARN $(t "بعد از آخرین بکاپ دستی $REFD این‌ها تغییر کرده و تغییرشان فقط روی همین سرور است:" "Changed since the last manual backup $REFD (these changes exist only on this server):")"
    printf '%s\n' "$CH" | head -8 | sed 's/^/        /'
    [ "$(printf '%s\n' "$CH" | wc -l)" -gt 8 ] && echo "        ..."
  else
    ok "  $M_OK $(t "از آخرین بکاپ دستی $REFD چیزی تغییر نکرده؛ اگر همان را دانلود کرده‌اید، کامل است." "Nothing changed since the last manual backup $REFD - if you downloaded that file, you have everything.")"
  fi
fi

# ---------- ۳. پرسش‌ها (در حالت --dry-run نمی‌پرسد) ----------
if [ "$DRY" = 0 ]; then
  if [ -n "$NEW" ] && [ -f "$SRV/deploy/backup.sh" ]; then
    echo
    printf '%s [Y/n] ' "$(t 'پیش از پاک کردن یک بکاپ تازه بگیرم؟' 'Take a fresh backup before wiping?')"
    IFS= read -r A <&3 || A=""
    case "$A" in n | N) ;; *)
      [ "$FA" = 1 ] || echo "(backup.sh prints Persian text that this console cannot show. The download link is the line that starts with https://. If typing it is hard, take the backup from PuTTY instead and run wipe.sh again.)"
      if ! APP="$APP" ETC="$R/etc" OUT_DIR="$R/root/backups" bash "$SRV/deploy/backup.sh" --link; then
        bad "$(t 'بکاپ گرفته نشد؛ هیچ چیزی پاک نشد.' 'The backup failed. Nothing was deleted.')"; exit 1
      fi
      printf '\n%s ' "$(t 'فایل بکاپ را به کامپیوتر خودتان بگیرید و بعد اینجا Enter بزنید (تا آن موقع چیزی پاک نمی‌شود):' 'Download the backup to your computer, then press Enter here (nothing is deleted until you do):')"
      IFS= read -r _ <&3 || true ;;
    esac
  fi
  echo
  warn "$(t 'این کار برگشت ندارد. فقط با بکاپ می‌شود سایت را دوباره بالا آورد.' 'This cannot be undone. The site can only come back from a backup.')"
  printf '%s ' "$(t "برای تأیید، نام دامنه را بنویسید ($DOMAIN) و Enter بزنید:" "To confirm, type the domain name ($DOMAIN) and press Enter:")"
  IFS= read -r ANS <&3 || ANS=""
  [ "$ANS" = "$DOMAIN" ] || { bad "$(t 'تأیید نشد؛ هیچ چیزی پاک نشد.' 'Not confirmed. Nothing was deleted.')"; exit 1; }
fi

# ---------- ۴. پاک کردن (کد سایت آخر از همه، تا اگر وسط کار قطع شد، اجرای دوباره ممکن باشد) ----------
say "$(t 'سرویس و تنظیم‌ها' 'Service and settings')"
if [ -z "$R" ] && [ "$DRY" = 0 ] && command -v systemctl >/dev/null 2>&1; then systemctl stop sasan 2>/dev/null; systemctl disable sasan 2>/dev/null; fi
wipe_path "$R/etc/systemd/system/sasan.service"
if [ -z "$R" ] && [ "$DRY" = 0 ] && command -v systemctl >/dev/null 2>&1; then systemctl daemon-reload 2>/dev/null; fi
wipe_path "$R/etc/nginx/sites-enabled/sasan"
wipe_path "$R/etc/nginx/sites-available/sasan"
if [ -z "$R" ] && [ "$DRY" = 0 ] && command -v nginx >/dev/null 2>&1; then nginx -t >/dev/null 2>&1 && systemctl reload nginx 2>/dev/null; fi
wipe_path "$R/etc/cron.d/sasan-backup"
wipe_path "$R/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh"

say "$(t 'گواهی HTTPS' 'HTTPS certificate')"
LE="$R/etc/letsencrypt"
for p in "$LE/live/$DOMAIN" "$LE/archive/$DOMAIN" "$LE/renewal/$DOMAIN.conf"; do wipe_path "$p"; done
# certbot از کلید خصوصی یک نسخه‌ی دیگر هم در keys/ و csr/ نگه می‌دارد؛ اگر گواهی سایت دیگری روی این سرور نیست، آن‌ها هم پاک می‌شود
if ls -1 "$LE/renewal" 2>/dev/null | grep '\.conf$' | grep -Fvx "$DOMAIN.conf" | grep -q .; then
  echo "  $(t 'گواهی سایت دیگری هم روی این سرور هست؛ بقیه‌ی فایل‌های certbot نگه داشته شد.' 'Another site has a certificate here too; the rest of certbot was kept.')"
else
  for p in "$LE/keys" "$LE/csr" "$LE/accounts"; do wipe_path "$p"; done
fi

say "$(t 'بکاپ‌ها و فایل‌های جانبی' 'Backups and side files')"
for f in "$R"/root/backups/sasan-server-backup-*; do wipe_path "$f"; done
[ "$DRY" = 1 ] || rmdir "$R/root/backups" 2>/dev/null
wipe_path "$R/var/backups/sasan"
wipe_path "$R/var/lib/sasan"
wipe_path "$R/root/.sasan-install-name"
# نسخه‌ی اجرایی همین اسکریپت ($WIPE_REEXEC) خودش آخر کار پاک می‌شود
for f in "$R"/root/sasan-* "$R"/tmp/sasan-*; do [ "$f" = "${WIPE_REEXEC:-}" ] || wipe_path "$f"; done

say "$(t 'لاگ‌ها و تاریخچه' 'Logs and history')"
for f in "$R"/var/log/nginx/*.log "$R"/var/log/letsencrypt/*.log; do
  [ -f "$f" ] || continue
  if [ "$DRY" = 1 ]; then echo "  $(t '[آزمایشی] خالی می‌شد:' '[dry-run] would empty:') $f"; else : >"$f" && ok "  $M_OK $(t 'خالی شد:' 'emptied:') $f"; fi
done
for f in "$R"/var/log/nginx/*.log.* "$R"/var/log/letsencrypt/*.log.*; do [ -f "$f" ] && wipe_path "$f"; done
if [ -f "$R/root/.bash_history" ]; then
  if [ "$DRY" = 1 ]; then echo "  $(t '[آزمایشی] خالی می‌شد:' '[dry-run] would empty:') $R/root/.bash_history"; else : >"$R/root/.bash_history" && ok "  $M_OK $(t 'تاریخچه‌ی دستورهای root خالی شد' 'root command history emptied')"; fi
fi
if [ -z "$R" ] && [ "$DRY" = 0 ] && command -v journalctl >/dev/null 2>&1; then
  journalctl --rotate >/dev/null 2>&1; journalctl --vacuum-time=1s >/dev/null 2>&1 && ok "  $M_OK $(t 'لاگ‌های journal پاک شد' 'journal logs deleted')"
fi

say "$(t 'کد و داده‌های سایت' 'Site code and data')"
wipe_path "$APP"
for d in "$APP".old-*; do [ -e "$d" ] && wipe_path "$d"; done

# ---------- ۵. بررسی و پایان ----------
if [ "$DRY" = 1 ]; then
  say "$(t 'آزمایشی بود' 'Dry run')"
  echo "$(t 'هیچ چیز پاک نشد. برای پاک کردن واقعی همین دستور را بدون --dry-run بزنید.' 'Nothing was deleted. Run the same command without --dry-run to wipe for real.')"
  return 0
fi
say "$(t 'بررسی' 'Check')"
LEFT=0
for p in "$APP" "$R/var/backups/sasan" "$R/etc/nginx/sites-enabled/sasan" "$R/etc/systemd/system/sasan.service" "$LE/live/$DOMAIN" "$R"/root/backups/sasan-server-backup-*; do
  if [ -e "$p" ] || [ -L "$p" ]; then bad "  $M_NO $(t 'هنوز هست:' 'still there:') $p"; LEFT=$((LEFT + 1)); fi
done
RC=0
if [ "$LEFT" = 0 ] && [ "$FAILED" = 0 ]; then
  ok "$(t 'تمام شد: چیزی از ساسان کلینیک روی این سرور نمانده.' 'Done: nothing of Sasan Clinic is left on this server.')"
else
  bad "$(t 'همه‌چیز پاک نشد؛ خطاهای بالا را بفرستید.' 'Not everything was deleted; see the errors above.')"
  RC=1
fi
echo
echo "$(t 'دو کار آخر:' 'Two last things:')"
echo "  1. $(t 'تاریخچه‌ی همین نشست را هم پاک کنید:' 'Clear the history of this session too:')   history -c; : > ~/.bash_history; exit"
echo "  2. $(t 'کلیدهای sms.ir (اصلی و آزمایشی) در پنل sms.ir هنوز فعال‌اند؛ اگر دیگر لازم نیست، همان‌جا حذفشان کنید.' 'The sms.ir API keys (live and sandbox) are still active in the sms.ir panel: delete them there if you no longer need them.')"
echo "$(t 'اگر سرور را پس می‌دهید یا کنارش می‌گذارید، در پنل شرکت سرور «نصب دوباره‌ی سیستم‌عامل» یا حذف سرویس را هم بزنید.' 'If you are giving the server back, also use "reinstall OS" or delete the service in your hosting panel.')"
return "$RC"
}
main "$@"; exit $?
