import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

async function get(path) {
  const res = await app.request(path);
  return { res, body: await res.json() };
}

describe('丑团内存模式 API', () => {
  it('health', async () => {
    const { res, body } = await get('/api/health');
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.name).toBe('choutuan 丑团');
  });

  it('categories 默认包含全部/洗浴按摩/商K', async () => {
    const { res, body } = await get('/api/categories');
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toContain('全部');
    expect(body.data).toContain('洗浴按摩');
    expect(body.data).toContain('商K');
  });

  it('categories 按 city 过滤', async () => {
    const { body } = await get('/api/categories?city=成都');
    expect(body.data).toContain('全部');
    expect(body.data.length).toBeGreaterThan(1);
  });

  it('shops 默认返回深圳全部', async () => {
    const { body } = await get('/api/shops?city=深圳');
    expect(body.ok).toBe(true);
    expect(body.total).toBe(20);
    expect(body.data[0].city).toBe('深圳');
  });

  it('shops 分类过滤', async () => {
    const { body } = await get('/api/shops?city=成都&category=商K');
    expect(body.total).toBe(10);
    expect(body.data.every((s) => s.category === '商K')).toBe(true);
  });

  it('shops 关键词搜索', async () => {
    const { body } = await get('/api/shops?city=成都&q=KTV');
    expect(body.total).toBeGreaterThan(0);
    expect(body.data.every((s) => (s.name + s.address + (s.tags || []).join('')).includes('KTV'))).toBe(true);
  });

  it('shops 坐标排序', async () => {
    const { body } = await get('/api/shops?city=深圳&lat=22.53&lng=113.93');
    expect(body.total).toBe(20);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('shops 详情存在', async () => {
    const { res, body } = await get('/api/shops/s01');
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe('s01');
    expect(body.data.lat).toBeGreaterThan(0);
  });

  it('shops 详情不存在返回 404', async () => {
    const { res, body } = await get('/api/shops/not-exist');
    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
  });

  it('venue 无合法 initData 返回 401', async () => {
    const res = await app.request('/api/venue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shop_id: 's01', init_data: 'bad' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('telegram 未知 hook 返回 404', async () => {
    const { res } = await get('/api/tg/not-a-hook');
    expect(res.status).toBe(404);
  });
});
