#!/usr/bin/env bash
# ==========================================================================
# بردن نسخه‌ی تازه‌ی سایت و پنل به سرور و نصب یا به‌روزرسانی آن، از هر کامپیوتری که مخزن را دارد:
#
#   bash server/deploy/push.sh root@89.44.243.30 sasan-clinic.ir
#
# با کلید SSH کار می‌کند؛ اگر سرور فقط رمز دارد، رمز را در متغیر SSHPASS بگذارید (sshpass لازم است).
# server/.env و server/data روی سرور دست نمی‌خورند (درخواست‌ها، کارکنان، مقاله‌های پنل و عکس‌هایشان می‌مانند).
# بار اول، بعد از نصب Node.js اگر server/.env روی سرور نیست، می‌ایستد و می‌گوید چه کنید (DEPLOY.md).
# ==========================================================================
set -euo pipefail
HOST="${1:?نشانی سرور، مثلاً root@89.44.243.30}"
DOMAIN="${2:-sasan-clinic.ir}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH=(ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
[ -n "${SSHPASS:-}" ] && SSH=(sshpass -e "${SSH[@]}")

echo "== آزمون‌ها پیش از فرستادن"
(cd "$ROOT/server" && node --test test/*.test.js >/tmp/sasan-push-test.log 2>&1) || { tail -30 /tmp/sasan-push-test.log; echo "آزمون‌ها رد شدند؛ چیزی فرستاده نشد"; exit 1; }
(cd "$ROOT" && node server/tools/articles.js --check && python3 tools/sync-layout.py --check) || { echo "صفحه‌ها عقب‌اند؛ اول ساختن صفحه‌ها (README) را اجرا کنید"; exit 1; }

echo "== آماده‌سازی سرور"
"${SSH[@]}" "$HOST" 'command -v rsync >/dev/null || (apt-get update -y -q >/dev/null && apt-get install -y -q rsync >/dev/null); mkdir -p /srv/sasan'

echo "== فرستادن فایل‌ها"
rsync -az --delete --info=stats1 \
  --exclude '.git/' --exclude 'node_modules/' --exclude '/server/data/' --exclude '/server/.env' --exclude '.DS_Store' \
  -e "${SSH[*]}" "$ROOT/" "$HOST:/srv/sasan/"

echo "== نصب و راه‌اندازی"
"${SSH[@]}" "$HOST" "bash /srv/sasan/server/deploy/setup.sh $DOMAIN"
