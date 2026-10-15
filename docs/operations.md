# 运维手册

## 免费额度红线 (2026-10, 超了当天直接报错不扣钱)

Workers 10万次/天 (CPU 10ms/次), D1 读500万行/写10万行/天 (存5GB),
KV 读10万/写删列各1000/天 (存1GB), R2 存10GB + A类100万/B类1000万/月。
2000人/天×20次=4万请求时 Workers 用40%、D1 用16%, 全在免费内。
最紧的是 **KV 写**: 有 `q` 链路禁写 KV 就是保这根线。

## 日常巡检 (5 分钟)

```bash
curl -s https://choutuan.telesearch.workers.dev/api/health
curl -s "https://choutuan.telesearch.workers.dev/api/shops?category=美食" | grep -o '"cached":[a-z]*'
npx wrangler tail --format pretty   # 看线上错
```

## 告警征兆 → 动作

- `cached:true` 长期没有 → KV 绑定掉了或被逐出, 查 `wrangler.toml`。
- D1 rows_read 暴涨 → 索引没命中, `EXPLAIN QUERY PLAN` 查 `category/name` 是否走索引。
- Workers CPU 超 10ms → 有人在 Worker 里做大循环/大 JSON, 下沉到 build 时做。
- KV 429 → 写超 1000/天, 查是否有人把有 `q` 请求也写了 KV。

## 备份

代码即 GitHub 私有仓。数据每周导出一次 D1:
`npx wrangler d1 export choutuan-db --remote --output=backup-$(date +%F).sql`,
R2 图开启版本控制或定期 `rclone sync` 到本地。
