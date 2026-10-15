#!/usr/bin/env bash
# 丑团 choutuan 一键初始化 (给人/给AI都一样)
# 适用: 全新沙盒 + 已注入 CF Key (CLOUD_FLARE_API_TOKEN / CLOUD_FLARE_ACCOUNT_ID)
# 用法: bash scripts/init.sh  (跑完就能开发, 不会卡死, 自检用 timeout+后台+kill)
set -euo pipefail
cd "$(dirname "$0")/.."

need() { command -v "$1" >/dev/null 2>&1 || { echo "缺 $1, 先装"; exit 1; }; }
need node; need npm; need npx

# Bot 自治验证约定 (可选): 测试 Bot Token 与测试 chat 只放环境变量或以下两个文件之一, 永不进 git
#   /workspace/.choutuan-secrets  或  $HOME/.config/choutuan/secrets.env  (格式 BOT_TOKEN=xxx / TEST_CHAT_ID=123)
for f in /workspace/.choutuan-secrets "$HOME/.config/choutuan/secrets.env"; do
  [ -f "$f" ] && { echo "load secrets: $f (只看有没有,不打印值)"; set -a; . "$f"; set +a; }
done

echo "== 1/4 node 版本 =="
node -v; npm -v

echo "== 2/4 装依赖 =="
npm install --no-audit --no-fund

echo "== 3/4 检查 CF Key (只看有没有,不打印值) =="
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-${CLOUD_FLARE_API_TOKEN:-}}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-${CLOUD_FLARE_ACCOUNT_ID:-}}"
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || { echo "缺 CLOUD_FLARE_API_TOKEN / CLOUD_FLARE_API_TOKEN"; exit 1; }
[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || { echo "缺 CLOUDFLARE_ACCOUNT_ID / CLOUD_FLARE_ACCOUNT_ID"; exit 1; }
npx wrangler whoami

echo "== 4/4 本地 D1 建表+灌20家+自检 =="
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
  线上: https://choutuan.telesearch.workers.dev
  Bot 端到端: 配好 BOT_TOKEN/TEST_CHAT_ID 后跑 bash scripts/e2e.sh (无则 SKIP, 详见 docs/bot-testing.md)
  注意: 不要用 pkill -f "node src/xxx" (会误杀自己), 用 kill PID 或 fuser -k 端口
NEXT
