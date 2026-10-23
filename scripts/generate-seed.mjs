import { shops } from '../src/data/shops.js';
import fs from 'fs';
const esc = (s) => String(s).replace(/'/g, "''");
let out = `-- auto-generated from src/data/shops.js (${shops.length} shops)\nDELETE FROM shops;\n`;
for (const s of shops) {
  out += `INSERT INTO shops (id,name,category,rating,sales,per_capita,lat,lng,dist_text,address,hours,phone,metro,city,owner_tg_id,emoji,tags_json,signature_json,reviews_json) VALUES ('${esc(s.id)}','${esc(s.name)}','${esc(s.category)}',${s.rating},${s.sales},${s.per},${s.lat || 0},${s.lng || 0},'${esc(s.dist)}','${esc(s.address)}','${esc(s.hours)}','${esc(s.phone)}','${esc(s.metro)}','${esc(s.city)}','${esc(s.owner)}','${esc(s.emoji)}','${esc(JSON.stringify(s.tags))}','${esc(JSON.stringify(s.signature))}','${esc(JSON.stringify(s.reviews))}');\n`;
}
fs.writeFileSync(new URL('../db/seed.sql', import.meta.url), out);
console.log(`seed.sql written: ${shops.length} shops, ${out.length} bytes`);
