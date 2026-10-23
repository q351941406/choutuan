// node scripts/bot-info.js — 验证 Bot 连通性
// 需要 BOT_TOKEN 环境变量 (见 .env.example), 不再内置任何真 token
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('缺 BOT_TOKEN: 请 cp .env.example .env 后填入, 或 BOT_TOKEN=xxx node scripts/bot-info.js');
  process.exit(1);
}
const r = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((x) => x.json());
console.log(JSON.stringify({ ok: r.ok, username: r.result?.username, id: r.result?.id }, null, 2));
