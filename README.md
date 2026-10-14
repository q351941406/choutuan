# 丑团 choutuan v0.5.0-cf

> 同城店铺信息展示 · Telegram Mini App · Hono + Cloudflare 全家桶

- Bot: [@choutuan_bot](https://t.me/choutuan_bot)
- 前端: `public/index.html` (Telegram原生风, 主题自适应)
- API: `src/app.js` (Hono同构, Node和Workers共用)
  - Node入口: `src/node-server.js` (`npm run dev`)
  - CF入口: `src/worker.js` (`npm run dev:cf`)
- 数据库: D1 `choutuan-db` (`db/migrations/0001_schema.sql` + `db/seed.sql` 20家店)
- 缓存: KV `CACHE` (只缓存无q请求+分类+详情, 600s, 保1000写/天)
- 图片: R2 `choutuan-images` (占位, 有真图再传)

## 本地跑 (两种, 同一套代码)

```bash
npm install
# 方式1: Node直跑 (最快, 内存数据)
npm run dev # http://localhost:3000
# 方式2: CF本地仿真 (D1+KV+R2全仿真, 和线上一致)
npm run db:setup:local
npm run dev:cf # http://localhost:8787
```

## 费用 (全免费额度内)
- Workers 10万次/天, D1读500万行/天, KV读10万/写1000/天, R2存10GB读1000万/月
- 2000人/天*20次=4万请求, D1读80万行, 全在免费内
- KV写是瓶颈: 只缓存无q请求, 有q不写KV

## 上线前
```bash
wrangler d1 create choutuan-db
wrangler kv:namespace create CACHE
wrangler r2 bucket create choutuan-images
# 把id填进 wrangler.toml, 再:
npm run db:migrate:local # 换 --remote 跑线上
wrangler deploy
```
