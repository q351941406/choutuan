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
    phone: r.phone, metro: r.metro, city: r.city || '', owner_id: r.owner_tg_id || '', emoji: r.emoji,
    tags: JSON.parse(r.tags_json || '[]'),
    signature: JSON.parse(r.signature_json || '[]'),
    reviews: JSON.parse(r.reviews_json || '[]'), lat: r.lat || 0, lng: r.lng || 0,
  };
}
function filterMem(category, q, city) {
  let list = memShops;if (city) list = list.filter(function(s){return s.city === city;});
  if (category && category !== '全部') list = list.filter(s => s.category === category);
  if (q) list = list.filter(s => (s.name + s.address + s.category + (s.tags||[]).join('')).includes(q));
  return list;
}

export function createApp() {
  const app = new Hono();
  app.use('/api/*', cors());

  app.get('/api/health', (c) => c.json({
    ok: true, name: 'choutuan 丑团', version: '0.14.0',
    runtime: c.env?.DB ? 'cloudflare-workers+d1' : 'node-memory',
    time: new Date().toISOString(),
  }));

  app.get('/api/categories', async (c) => {
    try {
      if (c.env?.DB) {
        // KV 缓存 10 分钟, 写极少
        if (c.env?.CACHE) {
          const ccity = c.req.query('city') || '';const ckey = 'cats:v3:' + (ccity || 'ALL');const hit = await c.env.CACHE.get(ckey, 'json');
          if (hit) return c.json({ ok: true, data: hit, cached: true });
        }
        const csql = ccity ? 'SELECT DISTINCT category FROM shops WHERE city = ?' : 'SELECT DISTINCT category FROM shops';const rs = ccity ? await c.env.DB.prepare(csql).bind(ccity).all() : await c.env.DB.prepare(csql).all();
        const cats = ['全部', ...rs.results.map(r => r.category)];
        if (c.env?.CACHE) await c.env.CACHE.put(ckey, JSON.stringify(cats), { expirationTtl: 600 });
        return c.json({ ok: true, data: cats });
      }
    } catch (e) { console.error('categories d1 fail, fallback mem', e); }
    const cats = ['全部', ...new Set((c.req.query('city')?memShops.filter(s=>s.city===c.req.query('city')):memShops).map(s => s.category))];
    return c.json({ ok: true, data: cats });
  });

  app.get('/api/shops', async (c) => {
    const category = c.req.query('category') || '';
    const city = c.req.query('city') || '';
    const q = c.req.query('q') || '';
    const glat = parseFloat(c.req.query('lat')), glng = parseFloat(c.req.query('lng'));
    const geo = Number.isFinite(glat) && Number.isFinite(glng) && Math.abs(glat) <= 90 && Math.abs(glng) <= 180;
    try {
      if (c.env?.DB) {
        // 免费KV写只有1000/天: 只缓存无q无坐标请求; 有q或带坐标(一人一序)直接查库不写KV
        const cacheKey = 'shops:v3:' + (city || 'ALL') + ':' + (category || 'ALL');
        if (!q && !geo && c.env?.CACHE) {
          const hit = await c.env.CACHE.get(cacheKey, 'json');
          if (hit) return c.json({ ok: true, total: hit.length, data: hit, cached: true });
        }
        let sql = 'SELECT * FROM shops';
        const conds = [], params = [];
        if (category && category !== '全部') { conds.push('category = ?'); params.push(category); }if (city) { conds.push('city = ?'); params.push(city); }
        if (q) { conds.push('(name LIKE ? OR address LIKE ? OR category LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
        if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
        if (geo) { sql += ' ORDER BY ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) LIMIT 100'; params.push(glat, glat, glng, glng); } else sql += ' ORDER BY rating DESC LIMIT 100';
        const rs = await c.env.DB.prepare(sql).bind(...params).all();
        const data = rs.results.map(mapRow);
        if (!q && !geo && c.env?.CACHE) await c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 600 });
        return c.json({ ok: true, total: data.length, data });
      }
    } catch (e) { console.error('shops d1 fail, fallback mem', e); }
    const data = filterMem(category, q, city);if (geo) data.sort(function(a,b){var x=(a.lat-glat)*(a.lat-glat)+(a.lng-glng)*(a.lng-glng);var y=(b.lat-glat)*(b.lat-glat)+(b.lng-glng)*(b.lng-glng);return x-y;});
    return c.json({ ok: true, total: data.length, data });
  });

  app.get('/api/shops/:id', async (c) => {
    const id = c.req.param('id');
    try {
      if (c.env?.DB) {
        if (c.env?.CACHE) {
          const hit = await c.env.CACHE.get(`shop:v2:${id}`, 'json');
          if (hit) return c.json({ ok: true, data: hit, cached: true });
        }
        const r = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(id).first();
        if (!r) return c.json({ ok: false, error: 'not found' }, 404);
        const data = mapRow(r);
        if (c.env?.CACHE) await c.env.CACHE.put(`shop:v2:${id}`, JSON.stringify(data), { expirationTtl: 600 });
        return c.json({ ok: true, data });
      }
    } catch (e) { console.error('shop detail d1 fail', e); }
    const s = memShops.find(x => x.id === id);
    if (!s) return c.json({ ok: false, error: 'not found' }, 404);
    return c.json({ ok: true, data: s });
  });

  const WEBAPP_URL = 'https://choutuan.2453452242.shop';
  async function tgApi(token, method, payload) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await r.json().catch(() => ({}));
    } catch (e) { console.error('tgApi fail', method, e); return {}; }
  }
  function hookToken(c, hook) {
    const env = c.env || {};
    if (hook === env.HOOK_PROD && env.BOT_TOKEN) return { token: env.BOT_TOKEN, role: 'prod' };
    if (hook === env.HOOK_TEST && env.TEST_BOT_TOKEN) return { token: env.TEST_BOT_TOKEN, role: 'test' };
    // 本地 Node 调试: 环境变量直通 (线上以 wrangler secret/vars 为准)
    try {
      const g = (typeof process !== 'undefined' && process.env) || {};
      if (hook === g.HOOK_PROD && g.BOT_TOKEN) return { token: g.BOT_TOKEN, role: 'prod' };
      if (hook === g.HOOK_TEST && g.TEST_BOT_TOKEN) return { token: g.TEST_BOT_TOKEN, role: 'test' };
    } catch {}
    return null;
  }
  // Telegram Bot webhook (生产/测试各走各的随机 path, 见 bot-webhook.sh ROLE=prod|test)
  app.get('/api/tg/:hook', (c) => {
    const hit = hookToken(c, c.req.param('hook'));
    if (!hit) return c.json({ ok: false, error: 'unknown hook' }, 404);
    return c.json({ ok: true, role: hit.role, usage: 'POST Telegram updates here' });
  });
  app.post('/api/tg/:hook', async (c) => {
    const hit = hookToken(c, c.req.param('hook'));
    if (!hit) return c.json({ ok: false, error: 'unknown hook' }, 404);
    const token = hit.token;
    let update;
    try { update = await c.req.json(); } catch { return c.json({ ok: false, error: 'bad json' }, 400); }
    const msg = update?.message;
    const chatId = msg?.chat?.id;
    if (!chatId) return c.json({ ok: true });
    const text = (msg?.text || '').trim();
    const isStart = text.startsWith('/start');
    await tgApi(token, 'sendMessage', {
      chat_id: chatId,
      text: isStart ? '欢迎来到丑团 choutuan,同城好店点开即看\nhttps://t.me/choutuan_bot/choutuan 👇' : '点下面进丑团看同城好店\nhttps://t.me/choutuan_bot/choutuan 👇',
      reply_markup: { inline_keyboard: [[{ text: '打开丑团', web_app: { url: WEBAPP_URL } }]] },
    });
    return c.json({ ok: true });
  });

  const te = new TextEncoder();
  async function hmacHex(keyBytes, msg) {
    const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const s = await crypto.subtle.sign('HMAC', k, te.encode(msg));
    return Array.from(new Uint8Array(s)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  function botTokens(c) {
    const out = [];
    try {
      const env = c.env || {};
      if (env.BOT_TOKEN) out.push(env.BOT_TOKEN);
      if (env.TEST_BOT_TOKEN) out.push(env.TEST_BOT_TOKEN);
      const g = (typeof process !== 'undefined' && process.env) || {};
      if (g.BOT_TOKEN) out.push(g.BOT_TOKEN);
      if (g.TEST_BOT_TOKEN) out.push(g.TEST_BOT_TOKEN);
    } catch {}
    return [...new Set(out)].filter(Boolean);
  }
  async function validateInitData(initData, tokens) {
    try {
      const p = new URLSearchParams(initData || '');
      const hash = p.get('hash');
      if (!hash || !tokens.length) return null;
      const ad = Number(p.get('auth_date') || 0);
      if (!ad || Math.abs(Date.now() / 1000 - ad) > 86400) return null;
      const ks = [];
      p.forEach((v, k) => { if (k !== 'hash') ks.push(k); });
      ks.sort();
      const dcs = ks.map((k) => k + '=' + p.get(k)).join('\n');
      let user = null;
      try { user = JSON.parse(p.get('user') || 'null'); } catch {}
      if (!user || !user.id) return null;
      for (const tk of tokens) {
        const sk = await crypto.subtle.importKey('raw', te.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const secret = new Uint8Array(await crypto.subtle.sign('HMAC', sk, te.encode(tk)));
        const sig = await hmacHex(secret, dcs);
        let ok = sig.length === hash.length;
        for (let i = 0; i < sig.length && i < hash.length; i++) { if (sig[i] !== hash[i]) ok = false; }
        if (ok) return user;
      }
      return null;
    } catch { return null; }
  }
  app.post('/api/venue', async (c) => {
    let b;
    try { b = await c.req.json(); } catch { return c.json({ ok: false, error: 'bad json' }, 400); }
    const sid = String(b?.shop_id || '');
    if (!sid) return c.json({ ok: false, error: 'bad args' }, 400);
    const user = await validateInitData(String(b?.init_data || ''), botTokens(c));
    if (!user) return c.json({ ok: false, error: 'bad initdata' }, 401);
    const uid = Number(user.id);
    let shop = null;
    try { if (c.env?.DB) { const r = await c.env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(sid).first(); if (r) shop = mapRow(r); } } catch (e) { console.error('venue d1 fail', e); }
    if (!shop) shop = memShops.find((s) => s.id === sid) || null;
    if (!shop || !shop.lat || !shop.lng) return c.json({ ok: false, error: 'no coords' }, 404);
    const toks = botTokens(c);
    for (const tk of toks) {
      const r = await tgApi(tk, 'sendVenue', { chat_id: uid, latitude: shop.lat, longitude: shop.lng, title: shop.name, address: shop.address });
      if (r && r.ok) return c.json({ ok: true, mid: r.result && r.result.message_id });
    }
    return c.json({ ok: false, error: 'send failed' }, 502); });
  return app;
}
