CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_tg_id);
CREATE TABLE IF NOT EXISTS contact_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  updated INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, shop_id)
);
CREATE INDEX IF NOT EXISTS idx_threads_user ON contact_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_owner ON contact_threads(owner_id);
