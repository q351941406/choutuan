# 丑团架构 (v0.6.x, Hono + 全 Cloudflare)

> 一句话: 同一套 Hono 代码, 本地 Node 跑内存数据最快联调, 线上 Workers 跑 D1/KV/R2,
> 前端是单个 `public/index.html`, Telegram 原生风, 颜色跟随 `themeParams`。

```
Telegram 客户端 (@choutuan_bot → Menu Button → https://choutuan.2453452242.shop)
  │  HTTPS + Telegram.WebApp (initData / themeParams / Haptic / BackButton / 分享 / 地图外跳)
  ▼
Cloudflare Workers `choutuan` (src/worker.js → src/app.js, Hono)
  ├─ GET /api/health                     无状态
  ├─ GET /api/categories                 KV `cats:v1` 600s → D1 DISTINCT
  ├─ GET /api/shops?category=&q=         无 q: KV `shops:v1:{CAT}` 600s → D1 (category 索引)
  │                                      有 q: 直接 D1 LIKE, 不写 KV (保 1000 写/天)
  └─ GET /api/shops/:id                  KV `shop:v1:{id}` 600s → D1 主键
  │  绑定: DB (D1 choutuan-db, 5GB / 读500万行/天),
  │        CACHE (KV, 读10万/写1000/天), IMAGES (R2 choutuan-images, 流出免费)
  ▼
静态前端: [assets] ./public (Pages 同等全球缓存, 静态请求免费无限)
```

## 为什么这样定

- 读多写少 + 脉冲流量 → Serverless 最省, Workers 无冷启动, 点开即看。
- D1 按扫描行收费 → `category / name / geohash` 三个索引是强制的, 全表扫一次算 20 行变 20000 行。
- KV 写只有 1000/天 → 有 `q` 的搜索链路禁止写 KV, 只缓存无参/分类/详情。
- R2 流出免费 → 店图只放 R2, 绝不 base64 进 D1。
- 同构 Hono → `src/app.js` 被 `src/node-server.js` 和 `src/worker.js` 共用,
  本地 `npm run dev` (内存) 和 `npm run dev:cf` (本地 D1/KV/R2 仿真) 行为一致。

## 数据模型

`db/migrations/0001_schema.sql` → `shops(id, name, category, rating, sales,
per_capita, dist_text, address, hours, phone, metro, emoji,
tags_json, signature_json, reviews_json, lat, lng, geohash, owner_tg_id)`。
`owner_tg_id / lat / lng / geohash` 现在是预留位, 以后做商家入驻和附近排序不用返工。
真源是 `src/data/shops.js` (20 家), `npm run seed:gen` 生成 `db/seed.sql`, D1 只是它的投影。

## 以后加 AI 不推翻

热路径保持 Hono JS (20ms 级)。以后要语义搜/评价总结/商家录入助手,
新增 `Workers-Python(FastAPI) /api/ai/*` 即可, 走 Vectorize + Workers AI,
和现有链路互不影响。详见 README 的路线图。
