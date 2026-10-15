#!/usr/bin/env bash
# 设置 Bot webhook + Menu Button (Token 只从环境变量读, 不打印不入库)
# 用法: BOT_TOKEN=xxx WEBAPP_URL=https://choutuan.telesearch.workers.dev bash scripts/bot-webhook.sh
set -euo pipefail
: "${BOT_TOKEN:?请先 export BOT_TOKEN (从 @BotFather 获取, 不要提交到git)}"
WEBAPP_URL="${WEBAPP_URL:-https://choutuan.telesearch.workers.dev}"
api() { curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/$1" -H 'content-type: application/json' -d "$2"; }
echo "--- getMe ---"
api getMe '{"a":1}' | head -c 200; echo
echo "--- setWebhook ---"
api setWebhook "{\"url\":\"${WEBAPP_URL}/api/telegram-webhook\",\"allowed_updates\":[\"message\"]}" | head -c 200; echo
echo "--- setChatMenuButton(web_app) ---"
api setChatMenuButton "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"打开丑团\",\"web_app\":{\"url\":\"${WEBAPP_URL}\"}}}" | head -c 200; echo
echo "--- getWebhookInfo ---"
curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | head -c 400; echo
echo "done. 去 Bot 里发 /start 验证。"
