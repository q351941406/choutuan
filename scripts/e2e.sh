#!/usr/bin/env bash
# 丑团 Telegram 端到端自检 (给人/给AI, 无人值守, 值永不打印)
# 输入全走环境变量 (见 docs/bot-testing.md):
#   E2E_BOT_TOKEN (或 BOT_TOKEN)  测试用 Bot Token, 建议用专用测试 Bot
#   E2E_CHAT_ID (或 TEST_CHAT_ID) 测试聊天 ID (bot 须是成员; 私聊需对方先给 bot 发过任意消息)
#   E2E_WEBAPP_URL (默认 https://choutuan.telesearch.workers.dev)
#   E2E_SET_WEBHOOK=1  webhook/menu 与期望不一致时自动修复 (默认只检查不改)
# 无 Token 时打印 SKIP exit 0 (CD 在 secrets 就绪前保持绿灯, 就绪后自动变强制验证)
set -euo pipefail
TOKEN="${E2E_BOT_TOKEN:-${BOT_TOKEN:-}}"
CHAT="${E2E_CHAT_ID:-${TEST_CHAT_ID:-}}"
WEBAPP="${E2E_WEBAPP_URL:-https://choutuan.telesearch.workers.dev}"
FIX="${E2E_SET_WEBHOOK:-0}"
if [ -z "$TOKEN" ]; then echo "E2E SKIP: 无 BOT_TOKEN (按 docs/bot-testing.md 配好后自动验证)"; exit 0; fi
echo "token: SET(len=${#TOKEN}) chat: ${CHAT:-MISSING} webapp: $WEBAPP"
api() { # $1=method $2=json(不回显) ; 成功打印body, 失败返回非零
  curl -sf --max-time 20 "https://api.telegram.org/bot${TOKEN}/$1" -H 'content-type: application/json' -d "$2"
}
echo "--- 0/5 chat 自动发现 (无TEST_CHAT_ID时调getUpdates) ---"
if [ -z "$CHAT" ]; then
  UPD="$(api getUpdates '{"timeout":5,"limit":20}' 2>/dev/null || true)"
  CHAT="$(echo "$UPD" | python3 -c "
import sys,json
try:
  rs = json.load(sys.stdin).get('result', [])
  ms = [u.get('message') or u.get('edited_message') or {} for u in rs]
  ms = [m for m in ms if m.get('chat',{}).get('id')]
  print(ms[-1]['chat']['id'] if ms else '')
except Exception:
  print('')")"
  if [ -n "$CHAT" ]; then echo "发现 chat_id=$CHAT (来自最近一条消息, 记到secrets文件即可一劳永逸)"
  else echo "未发现聊天: 给测试Bot发任意一句话后重跑 (Telegram规定bot不能主动找人, 这是唯一一次需要人手的10秒动作)"; fi
fi
echo "--- 1/5 getMe (token 有效性) ---"
ME="$(api getMe '{}')"
echo "$ME" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('ok'), d; u=d['result']; print('bot: @%s id=%s' % (u.get('username'), u.get('id')))"
echo "--- 2/5 webhook 指向 ---"
WH="$(api getWebhookInfo '{}')"
echo "$WH" | python3 -c "import sys,json; d=json.load(sys.stdin)['result']; print('url=%s pending=%s last_error=%s' % (d.get('url'), d.get('pending_update_count'), d.get('last_error_message')))"
URL_NOW="$(echo "$WH" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'].get('url',''))")"
# 期望地址: 优先显式传入, 否则按双hook路由从 wrangler.toml 自读测试专道
if [ -z "${E2E_WEBHOOK_URL:-}" ] && [ -f wrangler.toml ]; then
  _HOOK_TEST="$(grep '^HOOK_TEST' wrangler.toml | cut -d'"' -f2)"
  [ -n "$_HOOK_TEST" ] && E2E_WEBHOOK_URL="$WEBAPP/api/tg/$_HOOK_TEST"
fi
URL_WANT="${E2E_WEBHOOK_URL:-$WEBAPP/api/telegram-webhook}"
if [ "$URL_NOW" != "$URL_WANT" ]; then
  if [ "$FIX" = 1 ]; then echo "webhook 不一致, 修复中..."; api setWebhook "{\"url\":\"$URL_WANT\",\"allowed_updates\":[\"message\"]}" | head -c 120; echo
  else echo "E2E FAIL: webhook=$URL_NOW 期望=$URL_WANT (置 E2E_SET_WEBHOOK=1 自动修复)"; exit 1; fi
fi
echo "--- 3/5 Menu Button ---"
MB="$(api getChatMenuButton '{}')"
echo "$MB" | head -c 300; echo
echo "$MB" | python3 -c "import sys,json; d=json.load(sys.stdin)['result']; w=(d.get('web_app') or {}).get('url',''); print('menu_webapp=%s' % w)"
echo "--- 4/5 收发往返 (test chat) ---"
if [ -z "$CHAT" ]; then echo "SKIP: 无 E2E_CHAT_ID, 跳过收发 (其它项已验证)"; echo "E2E PASS(basic)"; exit 0; fi
TS="$(date -u +%FT%TZ)"
SENT="$(api sendMessage "{\"chat_id\":\"$CHAT\",\"text\":\"丑团 e2e $TS (自动验证, 可忽略)\"}")"
MID="$(echo "$SENT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('ok'), d; print(d['result']['message_id'])")"
echo "sent message_id=$MID"
api deleteMessage "{\"chat_id\":\"$CHAT\",\"message_id\":$MID}" | head -c 120; echo; echo "send+delete ok (已清理)"
echo "--- 5/5 /start 全链路 (合成update打线上webhook, 会向测试chat落一条欢迎语) ---"
curl -sf --max-time 20 "$URL_WANT" -H 'content-type: application/json' -d "{\"message\":{\"chat\":{\"id\":$CHAT},\"text\":\"/start\"}}" | head -c 120; echo
echo "E2E PASS(full)"
