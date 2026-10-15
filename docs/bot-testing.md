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
## 协议号全自治 (Node + teleproto, 推荐)

`teleproto` (gramjs 已归档停更后的接班人, 纯 JS 无 native 依赖) 已进 `devDependencies`,
`scripts/tguser-e2e.mjs` 就绪 (语法验过, 待协议号首跑)。你只给一套**测试专用号**三件套:

- `TG_API_ID` / `TG_API_HASH` (my.telegram.org 取一次, 长期有效)
- `TG_STRING_SESSION` (已授权的登录串, 运行时零短信零扫码)

放法 (二选一, 都在仓库之外, 值永不打印): `/workspace/.choutuan-secrets`
(`TG_API_ID=..` / `TG_API_HASH=..` / `TG_STRING_SESSION=..`, `chmod 600`,
`init.sh`/`e2e.sh` 自动加载), 或临时代跑 `export`。
可选 `TEST_BOT_TOKEN`: 给了就用现成测试 Bot, 不给脚本用 BotFather 自动建一个
(用户名冲突自动换 8 次, token 从回复里抠, 照样不用你动手)。

跑法: `npm run e2e:tguser` → 连号 → 建 Bot(缺时) → 发 `/start` →
轮询断言欢迎语 + web_app 按钮 → 查线上 health → PASS/FAIL。
安全: StringSession = 完整账号权限, 必须测试专用号; 跑完可去官方客户端
「设置 → 设备」终止该会话; 泄露即换号, 别复用。

## 测试资产清单 (跟着项目走, 2026-10-15 落定)

- 测试用户号: id `8924350312` (协议号, StringSession, 测试专用)
- 测试 Bot: `@choutuan_t39714_bot` (BotFather 自动建, 归测试号所有)
- 线上 `BOT_TOKEN` secret: 当前 = 测试 Bot (生产 `@choutuan_bot` 接线时换生产 Token 重跑 `bot-webhook.sh`)
- 本地: `/workspace/.choutuan-secrets` (`TG_API_ID/TG_API_HASH/TG_STRING_SESSION`, 600) +
  `/workspace/.choutuan-tg/` (`account.json`/`test_bot_token`, 700), 都在仓库之外
- CI: GitHub Secrets `TG_API_ID` / `TG_API_HASH` / `TG_STRING_SESSION` /
  `BOT_TOKEN`(测试) / `TEST_CHAT_ID`(`8924350312`), CD 发版后自动跑用户号全链路
- 生产 Bot Token 从未进仓; 换生产接线只需换线上 secret + 重设 webhook, 代码不动
