# 丑团 choutuan

> 类美团 Telegram Mini App · Node.js + Express + Telegram WebApp SDK

- Bot: [@choutuan_bot](https://t.me/choutuan_bot) (`8659656759:*`)
- Mini App 骨架: `public/index.html` + `src/server.js`
- 后端 API: `GET /api/health` `GET /api/shops`

## 本地跑

```bash
npm install
cp .env.example .env
npm run dev
# 打开 http://localhost:3000
```

## Telegram 联调

1. 部署到 Vercel 拿到 `https://xxx.vercel.app`
2. @BotFather → `/mybots` → Bot Settings → Configure Mini App / Menu Button → 填 URL
3. 给 Bot 发 `/start` 点 Menu Button 打开

## 路线图

- [x] v0.1.0 仓库骨架 + Mock 商家 API
- [ ] 需求评审 (Issue)
- [ ] 草稿图 / 原型
- [ ] 外卖 / 团购 / 购物车 / 订单
