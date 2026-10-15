ALTER TABLE shops ADD COLUMN city TEXT NOT NULL DEFAULT '深圳';
CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city);
CREATE INDEX IF NOT EXISTS idx_shops_city_category ON shops(city, category);
