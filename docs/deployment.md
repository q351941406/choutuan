# 部署与发布

## 线上资源 (已建, 别重复建)

- D1 `choutuan-db` (`f149b6c1-c0d2-4606-9168-4f8861cc6d92`, WNAM)
- KV `CACHE` (`10d94612…`) / preview (`571fc218…`)
- R2 `choutuan-images` / preview, Worker `choutuan` → https://choutuan.telesearch.workers.dev
- 配置全在 `wrangler.toml`, 改绑定必须同步改此文件并提交。

## 分支与环境 (含保护状态, 2026-10-15实测)

- `main`: 集成, 推了只跑 CI。
- `production`: 发版, 推了跑 CI + CD, 线上 Worker 只认它。
- 默认分支保持 `main`, `production` 常驻不删。
- 硬分支保护: 开不了。私有仓 + Free 计划调保护 API 直接 403
  (`Upgrade to GitHub Pro or make this repository public`), Rulesets 同理。
  要硬保护二选一: 仓库改公开 (免费即有), 或升级 Pro/Team。
- 已落地的软保护 (不用花钱):
  1. `production` 环境门禁: 已设 `custom_branch_policies=[production]`,
     只有 `production` 分支能往 production 环境部署, `main` 推了也不会发版。
  2. `guard` 工作流: 推 `production` 时断言它包含 `main`, 分叉直接红。
  3. `CODEOWNERS`: 所有改动 @q351941406 为默认 reviewer。

- `main`: 集成, 推了只跑 CI。
- `production`: 发版, 推了跑 CI + CD, 线上 Worker 只认它。
- 默认分支保持 `main`, `production` 常驻不删。

## 发版流程 (PR main → production)

先在 `main` 上验证, 再提 PR 到 `production`:

```bash
git checkout main && git pull
npm run check                       # 语法自检
npm run db:migrate:remote           # 先迁线上库, 再发代码
npx wrangler d1 execute choutuan-db --remote --command="SELECT count(*) as shops FROM shops;"
npm run deploy:dry                  # 预演
npm run deploy                      # 发版
curl -s https://choutuan.telesearch.workers.dev/api/health
curl -s --get --data-urlencode "category=美食" https://choutuan.telesearch.workers.dev/api/shops | head -c 200
```

## 回滚

- 代码回滚: `git revert <sha>` 后重新 `npm run deploy`。
- 数据回滚: D1 无自动备份, 线上 `migrate` 前先
  `npx wrangler d1 export choutuan-db --remote --output=backup-$(date +%F).sql`。
- 大版本先发 preview (`wrangler deploy --preview`) 测完再发生产。

## Bot 接线 (发版后必做)

`@BotFather → /mybots → @choutuan_bot → Bot Settings → Menu Button →
Configure Menu Button →` 填线上 URL。Telegram 缓存重, 改完等 1-2 分钟或重进 Bot。
