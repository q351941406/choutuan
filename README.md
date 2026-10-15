# 丑团 choutuan

> 同城店铺信息展示 · Telegram Mini App · Hono + Cloudflare 全家桶 (私有仓)

Bot: [@choutuan_bot](https://t.me/choutuan_bot) · 线上: https://choutuan.telesearch.workers.dev · 架构见 [docs/architecture.md](docs/architecture.md)

## 这是什么

Telegram 里点开即用的“同城好店”展示页: 搜索 + 分类 + 店铺列表 + 店铺详情
(地址/营业/电话/地铁/招牌/评价 + 导航外跳 + 分享给朋友)。
当前 **仅展示** (不下单不支付), 20 家假数据, Telegram 免登录,
Telegram 原生风 (颜色跟随 `themeParams`, 深色模式自动跟随, 带震动/返回键)。

## 架构一览

```
Telegram → Workers(Hono API) → D1(店) / KV(缓存600s) / R2(图) → public/index.html
```

- 同构: `src/app.js` 一套代码, `src/node-server.js`(Node, 内存) 和
  `src/worker.js`(Workers, D1) 共用。详见 [docs/architecture.md](docs/architecture.md)。
- 费用: 全在 CF 免费额度内 (Workers 10万/天, D1 读500万/天, KV 写1000/天, R2 流出免费)。
  唯一红线是 **KV 写**, 有 `q` 的搜索链路禁写 KV。

## 5 分钟跑起来

```bash
git clone https://github.com/q351941406/choutuan.git && cd choutuan
bash scripts/init.sh     # 新环境只跑一次: 装依赖 + 本地D1建表灌20家 + 自检
npm run dev              # 方式1: Node内存, 最快 http://localhost:3000
npm run dev:cf           # 方式2: CF仿真(D1+KV+R2), 和线上一致 http://localhost:8787
```

真机联调本地代码见 [docs/development.md](docs/development.md) (cloudflared 隧道给 BotFather)。

## 常用命令

| 命令 | 干嘛 |
|---|---|
| `npm run dev` / `npm run dev:cf` | 本地跑 (内存 / CF仿真) |
| `npm run db:setup:local` | 本地 D1 重建+重灌 20 家 |
| `npm run seed:gen` | 改完 `src/data/shops.js` 后重生 `db/seed.sql` |
| `npm run check` | 语法自检 |
| `npm run deploy:dry` / `npm run deploy` | 预演 / 发版 |
| `npm run db:migrate:remote` | 迁线上库 (发版前先跑) |

发版、回滚、Bot 接线见 [docs/deployment.md](docs/deployment.md),
巡检、告警、备份见 [docs/operations.md](docs/operations.md),
密钥、安全红线见 [docs/security.md](docs/security.md)。

## 文档地图

- [docs/architecture.md](docs/architecture.md) 架构与数据模型
- [docs/development.md](docs/development.md) 本地开发与真机联调
- [docs/deployment.md](docs/deployment.md) 发版与 Bot 接线
- [docs/operations.md](docs/operations.md) 巡检与备份
- [docs/security.md](docs/security.md) 安全规范
- [docs/需求确认-v0.2.md](docs/需求确认-v0.2.md) 需求基线
- [docs/prototype/](docs/prototype/) 草稿与真机截图
- [CHANGELOG.md](CHANGELOG.md) 版本记录

## 路线图

- v0.7: `lat/lng/geohash` 落库 + 附近排序 (D1 索引, 不加 PostGIS)
- v0.8: 写接口 (`favorites` + `initData` 鉴权 + 限流)
- v0.9: `/api/ai/*` (Python Workers 可选, 语义搜/评价总结, 热路径不动)
- v1.0: R2 真店图 + 商家自助入驻 (`owner_tg_id`)
