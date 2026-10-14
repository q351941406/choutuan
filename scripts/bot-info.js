// node scripts/bot-info.js — 验证 Bot 连通性
const token = process.env.BOT_TOKEN || '8659656759:AAGjqdfk35ZeJrOAc69zEjfA3sngQefZn3A';
const r = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(x => x.json());
console.log(JSON.stringify(r, null, 2));
