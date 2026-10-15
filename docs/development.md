# 本地开发

## 前置

- Node >= 18 (仓库有 `.nvmrc` → 22), npm
- CF Key 已注入沙盒 (`CLOUD_FLARE_API_TOKEN` / `CLOUD_FLARE_ACCOUNT_ID`), 只验存在不打印值
- 新环境只跑一次: `bash scripts/init.sh` (装依赖 → `wrangler whoami` →
  本地 D1 建表灌 20 家 → Node 和 CF 仿真各起一次自检即停)

## 两种跑法 (同一套 Hono)

```bash
npm run dev      # Node 内存数据, 最快, http://localhost:3000
npm run dev:cf   # CF 本地仿真 D1+KV+R2, 和线上一致, http://localhost:8787
npm run db:setup:local  # 本地 D1 重建 + 重灌 20 家 (搞乱了就重跑)
```

## 改数据 / 改接口

- 加店改店: 只改 `src/data/shops.js`, 然后 `npm run seed:gen` 重新生成 `db/seed.sql`,
  本地 `npm run db:seed:local` 重灌, CI 会校验两者一致。
- 加接口: 只改 `src/app.js`, Node 和 Workers 自动同构, 禁止用 `fs / path / __dirname`
  等 Node 专属 API (Workers 里没有, 写了本地行线上升天)。
- D1 表结构变更: 新增 `db/migrations/0002_xxx.sql`, 本地
  `npm run db:migrate:local` 验证, 线上 `npm run db:migrate:remote`。

## Telegram 真机联调本地代码

Telegram 只认 HTTPS, 本地 `http://localhost` 打不开:

```bash
cloudflared tunnel --url http://localhost:8787
# 得到 https://xxx.trycloudflare.com → 填到 @BotFather → @choutuan_bot → Menu Button
# 手机点开就是你本地代码, 改一行刷新即看; URL 带 ?mockUser=阿珍 可测不同用户
```

## 易踩坑

1. 端口冲突: 先 `fuser -k 8787/tcp` 再起, 不要 `pkill -f "node src/..."` (会误杀自己)。
2. `wrangler dev` 卡住: 看 `.wrangler/state` 是否损坏, 删了重 `db:setup:local`。
3. 本地行线上挂: 99% 是用了 Node API 或 D1 迁移没跑线上, 先看 `wrangler tail`。
