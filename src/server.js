import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { shops } from './data/shops.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'choutuan 丑团', version: '0.4.0', shops: shops.length, time: new Date().toISOString() });
});

// 列表: ?category=美食&q=火锅
app.get('/api/shops', (req, res) => {
  const { category = '', q = '' } = req.query;
  let list = shops;
  if (category && category !== '全部') list = list.filter(s => s.category === category);
  if (q) list = list.filter(s => (s.name + s.address + s.category + (s.tags||[]).join('')).includes(q));
  res.json({ ok: true, total: list.length, data: list });
});

app.get('/api/shops/:id', (req, res) => {
  const s = shops.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ ok: false, error: 'not found' });
  res.json({ ok: true, data: s });
});

app.get('/api/categories', (req, res) => {
  const cats = ['全部', ...new Set(shops.map(s => s.category))];
  res.json({ ok: true, data: cats });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => console.log(`[choutuan 丑团 v0.4.0] http://localhost:${PORT} shops=${shops.length}`));
