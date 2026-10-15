# Bot 自治验证 (一次配好, 以后免交互)

> 目标: 任何人/AI 在同样沙盒里, 无需再找你, 就能把 `/start` 端到端跑通。
> 原理: Token 与测试 chat 全走环境变量/secrets 文件, `scripts/e2e.sh` 一键验证,
> CD 发版后自动跑 (secrets 就绪前 SKIP, 就绪后强制)。

## 你只需要给一次 (2 分钟)

1. **测试 Bot Token** (强烈建议单独建测试 Bot, 别拿生产 Bot 玩):
   `@BotFather → /newbot → 得 `TEST_BOT_TOKEN (形如 `123:ABC`)。
   生产 Bot (`@choutuan_bot`) 的 Token 只在正式接线时用一次, 平时不进沙盒。
2. **测试 chat_id**: 把测试 Bot 拉进一个测试群 (或私聊它发任意一句话),
   然后浏览器打开 `https://api.telegram.org/bot<TEST_BOT_TOKEN>/getUpdates`,
   找到 `chat.id` 那串数字, 就是 `TEST_CHAT_ID`。
3. 把这两样放到沙盒其一 (二选一, 都在 git 仓库之外):
   - 方式一 (推荐长期沙盒): 写文件 `/workspace/.choutuan-secrets`:
     ```
     BOT_TOKEN=123:ABC
     TEST_CHAT_ID=456789
     ```
     `chmod 600` 即可, `init.sh` / `e2e.sh` 会自动加载, 值永不打印。
   - 方式二 (临时代跑): 直接在跑脚本前 `export BOT_TOKEN=... TEST_CHAT_ID=...`。

就这些, 给完你就不用管了。换 Token 时改这个文件 + 重跑 `e2e.sh` 即可。

## AI 侧自治链路 (已就绪)

- `bash scripts/init.sh`: 自动加载 secrets 文件 → 本地 D1/API 自检。
- `bash scripts/e2e.sh`: getMe → webhook 指向 → Menu Button → 向测试 chat 收发往返(含清理)
  → 合成 `/start` 打线上 webhook 全链路。无 Token 时 SKIP 不红。
- `E2E_SET_WEBHOOK=1 bash scripts/e2e.sh`: webhook/menu 不一致时自动修复。
- CD (`cd.yml`): 生产发版后自动跑 e2e (读 GitHub Secrets `BOT_TOKEN` / `TEST_CHAT_ID`,
  没配则 SKIP, 配了则强制, 红了不算发版成功)。
- 线上 `BOT_TOKEN`: `npx wrangler secret put BOT_TOKEN` (一次性, 值不进仓)。

## GitHub/CD 侧 (维护者做一次)

```
gh secret set BOT_TOKEN --repo q351941406/choutuan       # 测试或生产 Token二选一, 建议先测试
gh secret set TEST_CHAT_ID --repo q351941406/choutuan
npx wrangler secret put BOT_TOKEN                        # 线上 Worker 收 webhook 回调用
BOT_TOKEN=xxx bash scripts/bot-webhook.sh                # 设 webhook + Menu Button
```

之后每次 `main → production` 发版, CD 自动: 迁库 → 发版 → 线上冒烟 → Telegram e2e,
全绿才算成功, 全程无人值守。
