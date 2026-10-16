// 丑团用户号端到端 (Node + teleproto, 全自治, 无需短信/扫码/人工).
// 流程: StringSession(已授权, 零登录) -> BotFather /newbot 自动建测试Bot(缺token时)
//       -> 给测试Bot发 /start -> 轮询断言欢迎语 + web_app 按钮.
// 输入全走环境变量 (值永不打印), 见 docs/bot-testing.md:
//   TG_API_ID / TG_API_HASH / TG_STRING_SESSION (协议号三件套, 测试专用号)
//   TEST_BOT_TOKEN (已有可填, 为空则 BotFather 自动建)
//   WEBAPP_URL (默认 https://choutuan.2453452242.shop)
// 无 TG_STRING_SESSION 时打印 SKIP exit 0.
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions/index.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOKEN_RE = /(\d{6,12}:[A-Za-z0-9_-]{30,})/;

async function waitForText(client, peer, pred, timeoutMs, stepMs = 5000, minId = 0) {
  const t0 = Date.now();
  let lastId = 0;
  for (;;) {
    const msgs = await client.getMessages(peer, { limit: 5 });
    for (const m of msgs) {
      if (m.out || m.id <= lastId || m.id <= minId) continue;
      lastId = Math.max(lastId, m.id);
      if (pred(m)) return m;
    }
    if (Date.now() - t0 > timeoutMs) return null;
    await sleep(stepMs);
  }
}

const s = process.env.TG_STRING_SESSION || '';
if (!s) { console.log('TGUSER SKIP: 无 TG_STRING_SESSION (见 docs/bot-testing.md)'); process.exit(0); }
const apiId = Number(process.env.TG_API_ID || 0);
const apiHash = process.env.TG_API_HASH || '';
if (!apiId || !apiHash) { console.log('TGUSER SKIP: 缺 TG_API_ID/TG_API_HASH'); process.exit(0); }
const webapp = process.env.WEBAPP_URL || 'https://choutuan.2453452242.shop';

const client = new TelegramClient(new StringSession(s), apiId, apiHash, { connectionRetries: 5 });
console.log('--- 1/6 用户号连接 (已授权会话, 零短信) ---');
await client.connect();
const me = await client.getMe();
console.log(`user: id=${me.id} username=${me.username || '-'}`);

let token = process.env.TEST_BOT_TOKEN || '';
if (!token) {
  console.log('--- 2/6 BotFather 自动建测试Bot ---');
  await client.sendMessage('BotFather', { message: '/newbot' });
  let m = await waitForText(client, 'BotFather', (x) => /call it|call him/i.test(x.text || ''), 60000);
  if (!m) { console.log('TGUSER FAIL: BotFather 无响应'); process.exit(1); }
  await client.sendMessage('BotFather', { message: 'ChouTuan Test' });
  m = await waitForText(client, 'BotFather', (x) => /username/i.test(x.text || ''), 60000);
  if (!m) { console.log('TGUSER FAIL: BotFather 没要用户名'); process.exit(1); }
  for (let i = 0; i < 8; i++) {
    const cand = `choutuan_t${10000 + Math.floor(Math.random() * 89999)}_bot`;
    await client.sendMessage('BotFather', { message: cand });
    m = await waitForText(client, 'BotFather', (x) => /Done!|Sorry/i.test(x.text || ''), 60000);
    if (!m) { console.log('TGUSER FAIL: BotFather 建号超时'); process.exit(1); }
    const hit = TOKEN_RE.exec(m.text || '');
    if (hit) { token = hit[1]; console.log(`created bot: @${cand}`); break; }
  }
  if (!token) { console.log('TGUSER FAIL: 用户名全被占, 重跑换一批'); process.exit(1); }
} else {
  console.log('--- 2/6 用现成 TEST_BOT_TOKEN ---');
}

console.log('--- 3/6 给测试Bot发 /start ---');
const gm = await (await fetch(`https://api.telegram.org/bot${token}/getMe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
if (!gm.ok) { console.log('TGUSER FAIL: bot token 无效'); process.exit(1); }
const botU = '@' + gm.result.username;
console.log(`bot: ${botU}`);
let sinceId=0; try { const h = await client.getMessages(botU, { limit: 1 }); if (h.length) sinceId = h[0].id; } catch (e) {} await client.sendMessage(botU, { message: '/start' });

console.log('--- 4/6 等欢迎语 (轮询历史, 最长90s) ---');
const found = await waitForText(client, botU, (x) => !x.out && (x.text || '').includes('丑团'), 90000, 5000, sinceId);
if (!found) { console.log('TGUSER FAIL: 90s 内没收到欢迎语 (webhook 没接好, 查 wrangler tail)'); process.exit(1); }
const dump = JSON.stringify(found.replyMarkup || '');
const hasWebapp = /web_app|WebView/i.test(dump) && dump.includes(new URL(webapp).host);
console.log(`reply: ${(found.text || '').slice(0, 80)}`);
console.log(`web_app button: ${hasWebapp}`);

console.log('--- 5/6 Mini App 页存活 ---');
const h = await (await fetch(`${webapp}/api/health`)).json();
if (!h.ok) { console.log('TGUSER FAIL: health 挂了'); process.exit(1); }
console.log(`health: ${h.version} ${h.runtime}`);
console.log(`TGUSER PASS(full): /start -> 欢迎语 -> web_app按钮${hasWebapp ? ' OK' : ' (缺失, 只回了文字!)'}`);
await client.disconnect();
process.exit(hasWebapp ? 0 : 1);
