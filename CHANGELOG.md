# Changelog

## v0.6.1 (2026-10-15)
- 仓库转私有; 清真 Token 硬编码 (`.env.example` / `bot-info.js` / 需求文档去敏感化);
  删废弃 Express/Vercel 残留; 包瘦身 (去 express/cors)。
- DevOps 补齐: `docs/{architecture,development,deployment,operations,security}.md`,
  `README` 重写, `.github/workflows/ci.yml`, `.nvmrc`, `.editorconfig`。
- 注意: 历史提交含真 Token, 必须去 @BotFather `/revoke` 换新。

## v0.6.0
- 线上 CF 全通 (D1/KV/R2 已建, 20 店), `scripts/init.sh` 一键初始化。

## v0.5.0-cf
- Hono 同构 + CF 全家桶 (D1 20 店 + KV 600s 缓存 + R2 占位 + 本地仿真)。

## v0.4.0
- Telegram 原生风真 App (搜索/分类/详情 + 主题自适应)。

## v0.3 / v0.2 / v0.1
- Telegram 风草稿 / 同城展示需求基线 / Express 骨架。
