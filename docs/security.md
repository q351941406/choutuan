# 安全规范

1. **密钥绝不进仓**: `BOT_TOKEN`、CF Token 只走环境变量/`.env`(已 gitignore),
   参考 `.env.example`。历史提交曾误带真 Token, 已清理当前文件,
   但历史仍可找回 —— **必须去 @BotFather `/revoke` 换新 Token**, 换完只填 `.env`。
2. **最小权限**: CF Token 仅给 Workers/D1/KV/R2 所需, 不给账号级; GitHub Token 不进代码。
3. **Telegram 鉴权**: 展示页可匿名, 一旦加写接口 (收藏/商家入驻) 必须验
   `initData HMAC-SHA256` 中间件, 拒绝无 `hash` 请求, 并限流 (KV 计数)。
4. **输入即脏**: `category/q/id` 全部参数化绑定 (`prepare().bind()`), 禁止字符串拼 SQL;
   前端 `innerHTML` 只渲染受信 seed 数据, 用户输入用 `textContent`。
5. **依赖与 CI**: `npm audit` 高危必修, `ci.yml` 每次 push 跑 `check + seed 一致性 + deploy dry-run`。
6. **公开面**: 私有仓 + 线上 API 只暴露读接口, 写接口默认 403, 开白名单才放行。

## initData 验签 (v0.12.0 起)
写接口(/api/venue)强制验 Telegram WebApp 签名: HMAC(WebAppData, token)->HMAC(dcs), auth_date 24h 内, user 取自签名内(客户端传的 user_id 一律忽略, 只能发给自己)。
读接口保持公开(公开展示数据, 无需鉴权)。
