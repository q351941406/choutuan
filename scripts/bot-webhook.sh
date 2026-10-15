#!/usr/bin/env bash
# 设置 Bot webhook + Menu Button (Token 只从环境变量读, 不打印不入库)
# 用法: ROLE=prod|test BOT_TOKEN=xxx HOOK=xxx [WEBAPP_URL=...] bash scripts/bot-webhook.sh
#   ROLE=prod: BOT_TOKEN=生产号token HOOK=$HOOK_PROD (wrangler.toml)
#   ROLE=test: BOT_TOKEN=测试号token HOOK=$HOOK_TEST
set -euo pipefail
ROLE="${ROLE:-test}"
: "${BOT_TOKEN:?请先 export BOT_TOKEN (对应ROLE的token, 不要提交到git)}"
: "${HOOK:?请先 export HOOK (对应ROLE的hook path id, 见 wrangler.toml)}"
WEBAPP_URL="${WEBAPP_URL:-https://choutuan.telesearch.workers.dev}"
api() { curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/$1" -H 'content-type: application/json' -d "$2"; }
echo "--- role=$ROLE hook=$HOOK getMe ---"
api getMe '{"a":1}' | head -c 200; echo
echo "--- setWebhook ---"
api setWebhook "{\"url\":\"${WEBAPP_URL}/api/tg/${HOOK}\",\"allowed_updates\":[\"message\"]}" | head -c 200; echo
echo "--- setChatMenuButton(web_app) ---"
api setChatMenuButton "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"打开丑团\",\"web_app\":{\"url\":\"${WEBAPP_URL}\"}}}" | head -c 200; echo
echo "--- getWebhookInfo ---"
curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | head -c 400; echo
echo "done. 去 Bot 里发 /start 验证。"
