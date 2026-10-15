-- 丑团 choutuan D1 schema v0.5.0 (Hono + CF全家桶)
-- 免费额度保护: 索引减少rows_read, KV只缓存无q请求
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rating REAL NOT NULL,
  sales INTEGER NOT NULL,
  per_capita INTEGER NOT NULL,
  dist_text TEXT NOT NULL,
  address TEXT NOT NULL,
  hours TEXT NOT NULL,
  phone TEXT NOT NULL,
  metro TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '深圳',
  emoji TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  signature_json TEXT NOT NULL DEFAULT '[]',
  reviews_json TEXT NOT NULL DEFAULT '[]',
  lat REAL DEFAULT 0,
  lng REAL DEFAULT 0,
  geohash TEXT DEFAULT '',
  owner_tg_id TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_shops_category ON shops(category);
CREATE INDEX IF NOT EXISTS idx_shops_name ON shops(name);
CREATE INDEX IF NOT EXISTS idx_shops_geohash ON shops(geohash);
CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city);
CREATE INDEX IF NOT EXISTS idx_shops_city_category ON shops(city, category);
