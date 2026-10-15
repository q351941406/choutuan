import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const calls = [];
function fakeFetch(url) {
  calls.push(String(url));
  let body = { ok: true, data: [] };
  const su = String(url);
  if (su.indexOf('/api/categories') === 0) body = { ok: true, data: ['qb', 'c1', 'c2'] };
  else if (su.indexOf('/api/shops') === 0) {
    const u = new URL(su, 'http://x');
    const city = u.searchParams.get('city') || 'NONE';
    body = { ok: true, total: 2, data: [
      { id: 'a1', name: city + '-A', category: 'c1', rating: 4.5, sales: 10, per: 100, dist: '1km', address: 'a', hours: 'h', phone: '1', metro: 'm', emoji: 'E', tags: [], signature: [], reviews: [] },
      { id: 'a2', name: city + '-B', category: 'c1', rating: 4.6, sales: 11, per: 101, dist: '2km', address: 'a', hours: 'h', phone: '1', metro: 'm', emoji: 'E', tags: [], signature: [], reviews: [] }
    ]};
  }
  return Promise.resolve({ json: function() { return Promise.resolve(body); } });
}
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'dangerously', beforeParse(w) { w.fetch = fakeFetch; } });
void 0;
const scriptTextXXX = dom.window.document.querySelectorAll('script')[1].textContent;
void 0;
const tick = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
await tick(400);
const btns = dom.window.document.querySelectorAll('#citychips .chip');
console.log('city chips: ' + btns.length);
if (btns.length !== 2) { console.log('UI FAIL: 城市按钮不是2个'); process.exit(1); }
function shopUrls() { return calls.filter(function(u) { return u.indexOf('/api/shops') === 0; }); }
console.log('首屏列表URL: ' + shopUrls().pop());
btns[1].click();
await tick(400);
const lastShop = shopUrls().pop();
console.log('点切换后URL: ' + lastShop);
const cityName = dom.window.document.getElementById('cityName').textContent;
console.log('顶栏城市: ' + cityName);
const names = Array.from(dom.window.document.querySelectorAll('#list .meta b')).map(function(el) { return el.textContent; });
console.log('列表店名: ' + names.join(','));
let fail = '';
if (shopUrls().pop() === shopUrls()[0]) fail = '点击后没有重新请求';
if (shopUrls().length < 2) fail = '点击后没有重新请求';
else if (lastShop.indexOf('city=') < 0) fail = '请求没带city';
else if (cityName !== '成都') fail = '顶栏城市没变';
else if (names.length === 0 || names[0].indexOf('成都') !== 0) fail = '列表没刷成成都店';
if (fail) { console.log('UI FAIL: ' + fail); process.exit(1); }
console.log('UI PASS: 城市切换可点');
