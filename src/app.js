// 丑团 Hono 同构 App: Node 和 Cloudflare Workers 共用一套
// 免费额度保护策略见注释
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { shops as memShops } from './data/shops.js';

function mapRow(r) {
  return {
    id: r.id, name: r.name, category: r.category,
    rating: r.rating, sales: r.sales, per: r.per_capita,
    dist: r.dist_text, address: r.address, hours: r.hours,
    phone: r.phone, metro: r.metro, emoji: r.emoji,
    tags: JSON.parse(r.tags_json || '[]'),
    signature: JSON.parse(r.signature_json || '[]'),
    reviews: JSON.parse(r.reviews_json || '[]'),
  };
}
function filterMem(category, q) {
  let list = memShops;
  if (category && category !== '全部') list = list.filter(s => s.category === category);
  if (q) list = list.filter(s => (s.name + s.address + s.category + (s.tags||[]).join('')).includes(q));
  return list;
}

export function createApp() {
  const app = new Hono();
  app.use('/api/*', cors());

  app.get('/api/health', (c) => c.json({
    ok: true, name: 'choutuan 丑团', version: '0.7.0',
    runtime: c.env?.DB ? 'cloudflare-workers+d1' : 'node-memory',
    time: new Date().toISOString(),
  }));

  app.get('/api/categories', async (c) => {
    try {
      if (c.env?.DB) {
        // KV 缓存 10 分钟, 写极少
        if (c.env?.CACHE) {
          const hit = await c.env.CACHE.get('cats:v1', 'json');
          if (hit) return c.json({ ok: true, data: hit, cached: true });
        }
        const rs = await c.env.DB.prepare('SELECT DISTINCT category FROM shops').all();
        const cats = ['全部', ...rs.results.map(r => r.category)];
        if (c.env?.CACHE) await c.env.CACHE.put('cats:v1', JSON.stringify(cats), { expirationTtl: 600 });
        return c.json({ ok: true, data: cats });
      }
    } catch (e) { console.error('categories d1 fail, fallback mem', e); }
    const cats = ['全部', ...new Set(memShops.map(s => s.category))];
    return c.json({ ok: true, data: cats });
  });

  app.get('/api/shops', async (c) => {
    const category = c.req.query('category') || '';
    const q = c.req.query('q') || '';
    try {
      if (c.env?.DB) {
        // 免费KV写只有1000/天: 只缓存无q请求, 有q直接查库不写KV
        const cacheKey = `shops:v1:${category || 'ALL'}`;
        if (!q && c.env?.CACHE) {
          const hit = await c.env.CACHE.get(cacheKey, 'json');
          if (hit) return c.json({ ok: true, total: hit.length, data: hit, cached: true });
        }
        let sql = 'SELECT * FROM shops';
        const conds = [], params = [];
        if (category && category !== '全部') { conds.push('category = ?'); params.push(category); }
        if (q) { conds.push('(name LIKE ? OR address LIKE ? OR category LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
        if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
        sql += ' ORDER BY rating DESC LIMIT 100';
        const rs = await c.env.DB.prepare(sql).bind(...params).all();
        const data = rs.results.map(mapRow);
        if (!q && c.env?.CACHE) await c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 600 });
        return c.json({ ok: true, total: data.length, data });
      }
    } catch (e) { console.error('shops d1 fail, fallback mem', e); }
    const data = filterMem(category, q);
    return c.json({ ok: true, total: data.length, data });
  });

  app.get('/api/shops/:id', async (c) => {
    const id = c.req.param('id');
    try {
      if (c.env?.DB) {
        if (c.env?.CACHE) {
          const hit = await c.env.CACHE.get(`shop:v1:${id}`, 'json');
          if (hit) return c.json({ ok: true, data: hit, cached: true });
        }
        const r = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(id).first();
        if (!r) return c.json({ ok: false, error: 'not found' }, 404);
        const data = mapRow(r);
        if (c.env?.CACHE) await c.env.CACHE.put(`shop:v1:${id}`, JSON.stringify(data), { expirationTtl: 600 });
        return c.json({ ok: true, data });
      }
    } catch (e) { console.error('shop detail d1 fail', e); }
    const s = memShops.find(x => x.id === id);
    if (!s) return c.json({ ok: false, error: 'not found' }, 404);
    return c.json({ ok: true, data: s });
  });

  const WEBAPP_URL = 'https://choutuan.telesearch.workers.dev';
  async function tgApi(token, method, payload) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await r.json().catch(() => ({}));
    } catch (e) { console.error('tgApi fail', method, e); return {}; }
  }
  // Telegram Bot webhook: BotFather 设 webhook 到此地址后, /start 即有反应
  app.get('/api/telegram-webhook', (c) => c.json({ ok: true, usage: 'POST Telegram updates here' }));
  app.post('/api/telegram-webhook', async (c) => {
    const token = c.env?.BOT_TOKEN || (typeof process !== 'undefined' ? process.env?.BOT_TOKEN : '');
    let update;
    try { update = await c.req.json(); } catch { return c.json({ ok: false, error: 'bad json' }, 400); }
    const msg = update?.message;
    const chatId = msg?.chat?.id;
    if (!chatId) return c.json({ ok: true });
    if (!token || token === 'YOUR_BOT_TOKEN_HERE') { console.error('BOT_TOKEN missing, skip reply'); return c.json({ ok: true }); }
    const text = (msg?.text || '').trim();
    const isStart = text.startsWith('/start');
    await tgApi(token, 'sendMessage', {
      chat_id: chatId,
      text: isStart ? '欢迎来到丑团 choutuan,同城好店点开即看 👇' : '点下面进丑团看同城好店 👇',
      reply_markup: { inline_keyboard: [[{ text: '打开丑团', web_app: { url: WEBAPP_URL } }]] },
    });
    return c.json({ ok: true });
  });

  return app;
}
