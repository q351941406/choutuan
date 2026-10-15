# 贡献指南

- 分支: `main` 集成, `production` 发版, 都受保护。
- 日常: `feat/xxx` → PR → `main` (CI 绿才合)。
- 发版: `main` → PR → `production` (CI+CD 全绿才合, 合入即上线)。
- 热修: `hotfix/xxx` 从 `production` 切, 同时合回 `main` 和 `production`。
- 提交: `<type>: <一句话>` (`feat/fix/docs/chore`), 一个 PR 只做一件事。
- 改店: 只改 `src/data/shops.js` + `npm run seed:gen`, 不手改 `db/seed.sql`。
- 改表: 新增 `db/migrations/0002_*.sql`, 本地和远端各跑一次迁移。
- 禁止: 提交 `.env` / 真 Token / `.wrangler/state` / 大二进制图 (图走 R2)。
