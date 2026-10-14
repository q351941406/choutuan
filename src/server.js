import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// 静态前端: Telegram Mini App 页面
app.use(express.static(path.join(__dirname, '../public')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'choutuan 丑团', time: new Date().toISOString() });
});

// Mock: 商家列表 (后续按需求替换为真实业务)
app.get('/api/shops', (req, res) => {
  res.json({
    ok: true,
    data: [
      { id: 's1', name: '丑团黄焖鸡(旗舰店)', category: '快餐', rating: 4.8, sales: 3200, fee: 2.5, min: 15, img: '', tags: ['快', '辣'] },
      { id: 's2', name: '隔壁老王奶茶', category: '奶茶', rating: 4.6, sales: 1800, fee: 1.5, min: 10, img: '', tags: ['甜', '去冰'] },
      { id: 's3', name: '丑团火锅(拼团)', category: '火锅', rating: 4.9, sales: 960, fee: 0, min: 49, img: '', tags: ['团购', '4人餐'] },
    ]
  });
});

// SPA 兜底
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`[choutuan 丑团] running on http://localhost:${PORT}`);
});
