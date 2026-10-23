import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../src/app.js';
import { shops as memShops } from '../src/data/shops.js';

const app = createApp();

function toDbRow(s) {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    rating: s.rating,
    sales: s.sales,
    per_capita: s.per,
    dist_text: s.dist,
    address: s.address,
    hours: s.hours,
    phone: s.phone,
    metro: s.metro,
    city: s.city || '',
    tags_json: JSON.stringify(s.tags || []),
    signature_json: JSON.stringify(s.signature || []),
    reviews_json: JSON.stringify(s.reviews || []),
    lat: s.lat,
    lng: s.lng,
    owner_tg_id: s.owner || '',
    emoji: s.emoji,
  };
}

const ALL_ROWS = memShops.map(toDbRow);

function makeMockDb(rows = ALL_ROWS) {
  return {
    prepare(_sql) {
      let bound = [];
      const stmt = {
        bind(...params) {
          bound = params;
          return stmt;
        },
        async all() {
          return { results: rows.map((r) => ({ ...r })) };
        },
        async first() {
          const id = bound[0];
          const r = rows.find((x) => x.id === id);
          return r ? { ...r } : null;
        },
      };
      return stmt;
    },
  };
}

function makeMockCache(prefill = null) {
  const store = new Map();
  if (prefill) store.set(prefill.key, JSON.stringify(prefill.value));
  return {
    store,
    async get(key, type) {
      const v = store.get(key);
      if (v === undefined) return null;
      return type === 'json' ? JSON.parse(v) : v;
    },
    async put(key, value, _opts) {
      store.set(key, value);
    },
  };
}

const originalFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ ok: true, result: { message_id: 42 } }),
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

function makeInitData(token, userId = 123) {
  const user = JSON.stringify({ id: userId, first_name: 'Tester' });
  const authDate = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('user', user);
  const keys = [];
  params.forEach((v, k) => {
    if (k !== 'hash') keys.push(k);
  });
  keys.sort();
  const dcs = keys.map((k) => k + '=' + params.get(k)).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(dcs).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('丑团 Cloudflare 分支 API', () => {
  it('categories D1+KV miss then hit', async () => {
    const env = { DB: makeMockDb(), CACHE: makeMockCache() };
    const r1 = await app.request('/api/categories?city=深圳', {}, env);
    const b1 = await r1.json();
    expect(b1.ok).toBe(true);
    expect(b1.cached).not.toBe(true);
    const r2 = await app.request('/api/categories?city=深圳', {}, env);
    const b2 = await r2.json();
    expect(b2.cached).toBe(true);
  });

  it('categories D1 无 city', async () => {
    const env = { DB: makeMockDb(), CACHE: makeMockCache() };
    const r = await app.request('/api/categories', {}, env);
    const b = await r.json();
    expect(b.ok).toBe(true);
    expect(b.data).toContain('全部');
  });

  it('categories CACHE 预置命中', async () => {
    const env = { DB: makeMockDb(), CACHE: makeMockCache({ key: 'cats:v3:ALL', value: ['全部', '商K'] }) };
    const r = await app.request('/api/categories', {}, env);
    const b = await r.json();
    expect(b.cached).toBe(true);
    expect(b.data).toEqual(['全部', '商K']);
  });

  it('categories D1 异常回退 mem', async () => {
    const env = {
      DB: {
        prepare: () => {
          throw new Error('boom');
        },
      },
      CACHE: null,
    };
    const r = await app.request('/api/categories?city=深圳', {}, env);
    const b = await r.json();
    expect(b.ok).toBe(true);
  });

  it('shops D1+KV miss/hit、分类、q、坐标', async () => {
    const env = { DB: makeMockDb(), CACHE: makeMockCache() };
    const r1 = await app.request('/api/shops?category=商K&city=深圳', {}, env);
    const b1 = await r1.json();
    expect(b1.ok).toBe(true);
    const r2 = await app.request('/api/shops?category=商K&city=深圳', {}, env);
    const b2 = await r2.json();
    expect(b2.cached).toBe(true);

    const rq = await app.request('/api/shops?q=丑团&city=深圳', {}, env);
    const bq = await rq.json();
    expect(bq.ok).toBe(true);

    const rg = await app.request('/api/shops?city=深圳&lat=22.5&lng=113.9', {}, env);
    const bg = await rg.json();
    expect(bg.ok).toBe(true);
  });

  it('shops 全部无 city', async () => {
    const env = { DB: makeMockDb(), CACHE: null };
    const r = await app.request('/api/shops', {}, env);
    const b = await r.json();
    expect(b.ok).toBe(true);
    expect(b.total).toBeGreaterThan(0);
  });

  it('shops D1 异常回退 mem', async () => {
    const env = {
      DB: {
        prepare: () => {
          throw new Error('boom');
        },
      },
      CACHE: null,
    };
    const r = await app.request('/api/shops?city=深圳', {}, env);
    const b = await r.json();
    expect(b.ok).toBe(true);
    expect(b.total).toBeGreaterThan(0);
  });

  it('shops 详情 D1 命中/miss/异常', async () => {
    const envHit = { DB: makeMockDb(), CACHE: makeMockCache() };
    const r1 = await app.request('/api/shops/s01', {}, envHit);
    const b1 = await r1.json();
    expect(b1.ok).toBe(true);
    const r2 = await app.request('/api/shops/s01', {}, envHit);
    const b2 = await r2.json();
    expect(b2.cached).toBe(true);

    const envMiss = { DB: makeMockDb(), CACHE: null };
    const rm = await app.request('/api/shops/nope', {}, envMiss);
    expect(rm.status).toBe(404);

    const envErr = {
      DB: {
        prepare: () => {
          throw new Error('boom');
        },
      },
      CACHE: null,
    };
    const re = await app.request('/api/shops/s01', {}, envErr);
    const be = await re.json();
    expect(be.ok).toBe(true);
  });

  it('venue 有合法 initData 返回 ok', async () => {
    const token = '8450167476:AAENwkQfT1G_z42cgEjU-LgAMgCmprggLYM';
    const initData = makeInitData(token, 8924350312);
    const env = {
      DB: makeMockDb(),
      CACHE: null,
      BOT_TOKEN: token,
      HOOK_PROD: 'hp',
      HOOK_TEST: 'ht',
    };
    const res = await app.request(
      '/api/venue',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shop_id: 's01', init_data: initData }),
      },
      env
    );
    const b = await res.json();
    expect(res.status).toBe(200);
    expect(b.ok).toBe(true);
  });

  it('venue shop 无坐标返回 404', async () => {
    const token = '8450167476:AAENwkQfT1G_z42cgEjU-LgAMgCmprggLYM';
    const initData = makeInitData(token, 8924350312);
    const row = toDbRow(memShops[0]);
    row.lat = 0;
    row.lng = 0;
    const env = { DB: makeMockDb([row]), CACHE: null, BOT_TOKEN: token };
    const res = await app.request(
      '/api/venue',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shop_id: row.id, init_data: initData }),
      },
      env
    );
    expect(res.status).toBe(404);
  });

  it('venue bad body 返回 400', async () => {
    const res = await app.request(
      '/api/venue',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'not json' },
      { DB: makeMockDb(), CACHE: null }
    );
    expect(res.status).toBe(400);
  });

  it('telegram webhook GET/POST 与未知 hook', async () => {
    const token = '8450167476:AAENwkQfT1G_z42cgEjU-LgAMgCmprggLYM';
    const env = { BOT_TOKEN: token, HOOK_PROD: 'hookprod', HOOK_TEST: 'hooktest' };
    const g = await app.request('/api/tg/hookprod', {}, env);
    const gb = await g.json();
    expect(g.status).toBe(200);
    expect(gb.ok).toBe(true);
    expect(gb.role).toBe('prod');

    const p = await app.request(
      '/api/tg/hookprod',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: { chat: { id: 999 }, text: '/start' } }),
      },
      env
    );
    expect(p.status).toBe(200);
    const pb = await p.json();
    expect(pb.ok).toBe(true);

    const p2 = await app.request(
      '/api/tg/hookprod',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: { chat: { id: 999 }, text: 'hi' } }),
      },
      env
    );
    expect(p2.status).toBe(200);

    const p3 = await app.request(
      '/api/tg/hookprod',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'bad' },
      env
    );
    expect(p3.status).toBe(400);

    const u = await app.request('/api/tg/nope', {}, env);
    expect(u.status).toBe(404);
  });

  it('telegram webhook 无 chatId 返回 ok', async () => {
    const env = { BOT_TOKEN: '8450167476:AAENwkQfT1G_z42cgEjU-LgAMgCmprggLYM', HOOK_PROD: 'hookprod' };
    const r = await app.request(
      '/api/tg/hookprod',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ foo: 1 }) },
      env
    );
    expect(r.status).toBe(200);
  });

  it('botTokens / validateInitData 无 token 分支', async () => {
    const env = { DB: makeMockDb(), CACHE: null };
    const res = await app.request(
      '/api/venue',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shop_id: 's01', init_data: 'bad' }),
      },
      env
    );
    expect(res.status).toBe(401);
  });

  it('geo 排序分支 (env)', async () => {
    const env = { DB: makeMockDb(), CACHE: null };
    const r = await app.request('/api/shops?city=深圳&lat=22.5&lng=113.9', {}, env);
    const b = await r.json();
    expect(b.ok).toBe(true);
    expect(b.total).toBeGreaterThan(0);
  });

  it('categories D1 CACHE null 分支', async () => {
    const env = { DB: makeMockDb(), CACHE: null };
    const r = await app.request('/api/categories?city=深圳', {}, env);
    const b = await r.json();
    expect(b.ok).toBe(true);
  });

  it('shops D1 CACHE null 分支', async () => {
    const env = { DB: makeMockDb(), CACHE: null };
    const r = await app.request('/api/shops?city=深圳', {}, env);
    const b = await r.json();
    expect(b.ok).toBe(true);
  });

  it('venue DB 异常回退 mem/无坐标', async () => {
    const token = '8450167476:AAENwkQfT1G_z42cgEjU-LgAMgCmprggLYM';
    const initData = makeInitData(token, 8924350312);
    const env = {
      DB: {
        prepare: () => {
          throw new Error('boom');
        },
      },
      CACHE: null,
      BOT_TOKEN: token,
    };
    const res = await app.request(
      '/api/venue',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shop_id: 's01', init_data: initData }),
      },
      env
    );
    // s01 有坐标，回退 mem 成功（fetch mock 返回 ok）
    expect(res.status).toBe(200);
  });

  it('venue 发送失败返回 502', async () => {
    const token = '8450167476:AAENwkQfT1G_z42cgEjU-LgAMgCmprggLYM';
    const initData = makeInitData(token, 8924350312);
    const old = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ ok: false }) });
    try {
      const env = { DB: makeMockDb(), CACHE: null, BOT_TOKEN: token };
      const res = await app.request(
        '/api/venue',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ shop_id: 's01', init_data: initData }),
        },
        env
      );
      expect(res.status).toBe(502);
    } finally {
      globalThis.fetch = old;
    }
  });

  it('validateInitData 过期/哈希错误/无 hash', async () => {
    const token = '8450167476:AAENwkQfT1G_z42cgEjU-LgAMgCmprggLYM';
    // 无 hash
    let initData = makeInitData(token, 8924350312).replace(/&hash=[^&]*/, '');
    let env = { DB: makeMockDb(), CACHE: null, BOT_TOKEN: token };
    let res = await app.request(
      '/api/venue',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shop_id: 's01', init_data: initData }),
      },
      env
    );
    expect(res.status).toBe(401);

    // 过期 auth_date：手动构造
    const uid = 8924350312;
    const user = JSON.stringify({ id: uid, first_name: 'Tester' });
    const params = new URLSearchParams();
    params.set('auth_date', String(Math.floor(Date.now() / 1000) - 100000));
    params.set('user', user);
    const keys = ['auth_date', 'user'];
    const dcs = keys.map((k) => k + '=' + params.get(k)).join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const hash = crypto.createHmac('sha256', secret).update(dcs).digest('hex');
    params.set('hash', hash);
    res = await app.request(
      '/api/venue',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shop_id: 's01', init_data: params.toString() }),
      },
      env
    );
    expect(res.status).toBe(401);

    // 哈希错误：改 user
    const good = makeInitData(token, uid);
    const bad = good.replace('Tester', 'Hacker');
    res = await app.request(
      '/api/venue',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shop_id: 's01', init_data: bad }),
      },
      env
    );
    expect(res.status).toBe(401);

    // user JSON 非法触发 catch
    const malformed = makeInitData(token, uid).replace(/user=[^&]*/, 'user=%7Bbad');
    res = await app.request(
      '/api/venue',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shop_id: 's01', init_data: malformed }),
      },
      env
    );
    expect(res.status).toBe(401);
  });

  it('mapRow city 为空回退', async () => {
    const row = toDbRow(memShops[0]);
    row.city = '';
    const env = { DB: makeMockDb([row]), CACHE: null };
    const r = await app.request('/api/shops/' + row.id, {}, env);
    const b = await r.json();
    expect(b.ok).toBe(true);
    expect(b.data.city).toBe('');
  });
});
