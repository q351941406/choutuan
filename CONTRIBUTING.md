# 贡献指南

- 分支: `main` 受保护, 功能分支 `feat/xxx` → PR → CI 绿才合。
- 提交: `<type>: <一句话>` (`feat/fix/docs/chore`), 一个 PR 只做一件事。
- 改店: 只改 `src/data/shops.js` + `npm run seed:gen`, 不手改 `db/seed.sql`。
- 改表: 新增 `db/migrations/0002_*.sql`, 本地和远端各跑一次迁移。
- 禁止: 提交 `.env` / 真 Token / `.wrangler/state` / 大二进制图 (图走 R2)。
