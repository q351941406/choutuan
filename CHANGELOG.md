# Changelog
## v0.11.0 - 自有域名choutuan.2453452242.shop
## v0.10.3 - 选单关闭动画+系统地图+发到聊天TG内置地图
## v0.10.2 - 导航选单(高德/腾讯/百度/苹果+复制地址)
## v0.10.1 - 详情单导航栏(!important)+导航切高德
## v0.10.1 - 详情单导航栏(!important)+导航切高德(坐标打点)
## v0.10.0 - 双城(深圳/成都): 城市字段+定位判城+手动切换
## v0.9.1 - 距离排序进DB(服务端ORDER BY+跳KV缓存)
## v0.9.0 - 去底栏/push转场/按距离排序(定位+Haversine)
## v0.8.0 - 洗浴按摩/商K双分类 + 体验打磨(图标/骨架屏/星级/直拨/直跳/标签)

## v0.7.1 (2026-10-15)
- 单导航栏: TG 客户端内隐藏自绘顶栏 (只留原生头 + 系统返回键), 浏览器调试保持原样; 头/底色跟随主题, 禁掉下拉误关。


## v0.7.0 (2026-10-15)
- Bot 有反应了: 新增 `POST /api/telegram-webhook`, `/start` 回带 web_app 按钮的欢迎语, 其他消息回进店引导。
- `scripts/bot-webhook.sh`: 一键设 webhook + Menu Button (Token 只读环境变量)。
- `src/node-server.js` 自动读 `.env`, 线上用 `wrangler secret put BOT_TOKEN`。

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
