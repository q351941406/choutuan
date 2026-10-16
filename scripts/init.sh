#!/usr/bin/env bash
# 丑团 choutuan 一键初始化 (给人/给AI都一样)
# 适用: 全新沙盒 + 已注入 CF Key (CLOUD_FLARE_API_TOKEN / CLOUD_FLARE_ACCOUNT_ID)
# 用法: bash scripts/init.sh  (跑完就能开发, 不会卡死, 自检用 timeout+后台+kill)
set -euo pipefail
cd "$(dirname "$0")/.."

need() { command -v "$1" >/dev/null 2>&1 || { echo "缺 $1, 先装"; exit 1; }; }
need node; need npm; need npx

# 测试密钥加载顺序 (后者覆盖前者): 仓库自带 config/test-secrets.env (测试专用, 有意提交) < 沙盒文件 < 环境变量
#   /workspace/.choutuan-secrets  或  $HOME/.config/choutuan/secrets.env  (格式 BOT_TOKEN=xxx / TEST_CHAT_ID=123)
for f in config/test-secrets.env /workspace/.choutuan-secrets "$HOME/.config/choutuan/secrets.env"; do
  [ -f "$f" ] && { echo "load secrets: $f (只看有没有,不打印值)"; set -a; . "$f"; set +a; }
done

echo "== 0/5 预检: 仓库 + secrets (缺失不红, 只降级, 值永不打印) =="
[ -f package.json ] && [ -d src ] || { echo "不在仓库根目录? 先: git clone https://github.com/q351941406/choutuan.git && cd choutuan"; exit 1; }
have() { local v="${!1:-}"; if [ -n "$v" ]; then echo "OK(len=${#v})"; else echo "MISSING"; fi; }
echo "TG_API_ID........: $(have TG_API_ID)"
echo "TG_API_HASH.......: $(have TG_API_HASH)"
echo "TG_STRING_SESSION: $(have TG_STRING_SESSION)"
echo "BOT_TOKEN.........: $(have BOT_TOKEN)"
echo "TEST_CHAT_ID......: $(have TEST_CHAT_ID)"
if [ -n "${BOT_TOKEN:-}" ]; then
  curl -sf --max-time 15 "https://api.telegram.org/bot${BOT_TOKEN}/getMe" -H 'content-type: application/json' -d '{}' \
    | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('ok'), d.get('description'); u=d['result']; print('bot连通: @%s id=%s' % (u.get('username'), u.get('id')))" \
    || echo "WARN: BOT_TOKEN 无效或网络不通 (Bot e2e 将 SKIP, 先继续)"
else echo "-> Bot e2e SKIP; 配法见 .choutuan-secrets.example"; fi
if [ -n "${TG_STRING_SESSION:-}" ]; then
  TG_STRING_SESSION="${TG_STRING_SESSION}" python3 -c "
import os, base64
s = os.environ['TG_STRING_SESSION']
raw = base64.b64decode(s[1:])
assert s[0] == '1' and len(raw) == 263, 'badlen'
print('session离线校验ok, dcId=%d' % raw[0])" || echo "WARN: 会话串格式不对 (用户号e2e 将 SKIP)"
  node -e "import('teleproto').then(() => console.log('teleproto: ok')).catch(() => { console.log('WARN: teleproto 未装好'); process.exit(1); })" || true
else echo "-> 用户号e2e SKIP; 配法见 .choutuan-secrets.example"; fi

echo "== 1/5 node 版本 =="
node -v; npm -v

echo "== 2/5 装依赖 =="
npm install --no-audit --no-fund

echo "== 3/5 检查 CF Key (只看有没有,不打印值) =="
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-${CLOUD_FLARE_API_TOKEN:-}}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-${CLOUD_FLARE_ACCOUNT_ID:-}}"
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || { echo "缺 CLOUD_FLARE_API_TOKEN / CLOUD_FLARE_API_TOKEN"; exit 1; }
[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || { echo "缺 CLOUDFLARE_ACCOUNT_ID / CLOUD_FLARE_ACCOUNT_ID"; exit 1; }
npx wrangler whoami

echo "== 4/5 本地 D1 建表+灌20家+自检 =="
npm run db:migrate:local
npm run db:seed:local
npx wrangler d1 execute choutuan-db --local --command="SELECT count(*) as shops FROM shops;"

echo "== 自检 Node内存API (PORT=3002, 8秒即停) =="
(PORT=3002 timeout 8 node src/node-server.js &>/tmp/choutuan-node-check.log & echo $! > /tmp/choutuan-node.pid; sleep 3; curl -sf http://localhost:3002/api/health | head -c 200; echo; kill "$(cat /tmp/choutuan-node.pid)" 2>/dev/null || true; wait 2>/dev/null || true)
echo "== 自检 CF仿真API (8787, 30秒即停, 后台wrangler) =="
(timeout 30 npx wrangler dev --local --persist-to=.wrangler/state --port 8787 &>/tmp/choutuan-cf-check.log & echo $! > /tmp/choutuan-cf.pid; sleep 12; curl -sf http://localhost:8787/api/health | head -c 200; echo; curl -sf --get --data-urlencode "category=美食" http://localhost:8787/api/shops | head -c 120; echo; kill "$(cat /tmp/choutuan-cf.pid)" 2>/dev/null || true; pkill -f "wrangler dev.*8787" 2>/dev/null || true; wait 2>/dev/null || true)
cat <<'NEXT'

✅ init 完成, 现在可以:
  npm run dev     # Node内存, 最快, http://localhost:3000
  npm run dev:cf  # CF仿真D1+KV+R2, 和线上一致, http://localhost:8787
  线上: https://choutuan.2453452242.shop
  Bot 端到端: bash scripts/e2e.sh (Bot API) / npm run e2e:tguser (用户号全链路);
  无secrets时SKIP, 配好重跑即全量, 模板见 .choutuan-secrets.example, 详见 docs/bot-testing.md
  注意: 不要用 pkill -f "node src/xxx" (会误杀自己), 用 kill PID 或 fuser -k 端口
NEXT
