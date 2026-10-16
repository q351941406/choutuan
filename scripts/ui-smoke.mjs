import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const calls = [];
function fakeFetch(url) {
  calls.push(String(url));
  let body = { ok: true, data: [] };
  const su = String(url);
  if (su.indexOf('/api/categories') === 0) body = { ok: true, data: ['qb', 'c1', 'c2'] };
  else if (su.indexOf('/api/shops/') === 0) { body = { ok: true, data: { id: 'a1', name: 'ShopA', category: 'c1', rating: 4.5, sales: 10, per: 100, dist: '1km', address: 'addrA', hours: 'h', phone: '13800000000', metro: 'm', emoji: 'E', tags: ['t1'], signature: [{n:'s1',p:'p1'}], reviews: [{u:'u1',s:5,t:'good'}], lat: 22.5, lng: 113.9 } }; } else if (su.indexOf('/api/shops') === 0) {
    const u = new URL(su, 'http://x');
    const city = u.searchParams.get('city') || 'NONE';
    const mk = function(id, nm) { return { id: id, name: city + nm, category: 'c1', rating: 4.5, sales: 10, per: 100, dist: '1km', address: 'a', hours: 'h', phone: '1', metro: 'm', emoji: 'E', tags: [], signature: [], reviews: [] }; };
    body = { ok: true, total: 2, data: [mk('a1', '-A'), mk('a2', '-B')] };
  }
  return Promise.resolve({ json: function() { return Promise.resolve(body); } });
}
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
  beforeParse: function(w) { w.fetch = fakeFetch; w.Telegram = { WebApp: { platform: 'android', initData: 'x=1', initDataUnsafe: { user: { id: 123, first_name: 'T' } } } }; }
});
const tick = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
await tick(400);
const cityBtn = dom.window.document.getElementById('cityBtn');
const goBtn = dom.window.document.getElementById('goBtn');
console.log('cityBtn: ' + (cityBtn ? cityBtn.textContent : 'MISSING') + ' | goBtn: ' + (goBtn ? 'yes' : 'MISSING'));
if (!cityBtn || !goBtn) { console.log('UI FAIL: 按钮缺失'); process.exit(1); }
const shops0 = calls.filter(function(u) { return u.indexOf('/api/shops') === 0; });
cityBtn.click();
await tick(400);
const shops1 = calls.filter(function(u) { return u.indexOf('/api/shops') === 0; });
const lastShop = shops1[shops1.length - 1];
console.log('点城市后URL: ' + lastShop);
const cityName = dom.window.document.getElementById('cityName').textContent;
console.log('顶栏城市: ' + cityName);
const names = Array.from(dom.window.document.querySelectorAll('#list .meta b')).map(function(el) { return el.textContent; });
console.log('列表店名: ' + names.join(','));
goBtn.click();
await tick(400);
const shops2 = calls.filter(function(u) { return u.indexOf('/api/shops') === 0; });
console.log('点搜索后请求数: ' + shops2.length);
let fail = '';
if (shops1.length <= shops0.length) fail = '点城市没发请求';
else if (lastShop.indexOf('city=') < 0) fail = '请求没带city';
else if (cityName !== '成都') fail = '顶栏城市没变:' + cityName;
else if (shops2.length <= shops1.length) fail = '点搜索没发请求';
if (fail) { console.log('UI FAIL: ' + fail); process.exit(1); }
const cell = dom.window.document.querySelector('#list .cell'); cell.click(); await tick(400); dom.window.document.getElementById('navBtn').click(); await tick(300); const sheet = dom.window.document.getElementById('mapSheet'); const rows = dom.window.document.querySelectorAll('#mapList .maprow'); console.log('选单可见: ' + sheet.style.display + ' 选项数: ' + rows.length); var vbtn = rows[rows.length-1];vbtn.click(); await tick(400);var vposts = calls.filter(function(u){return u.indexOf('/api/venue')===0;});console.log('venue POST数: ' + vposts.length);dom.window.document.getElementById('mapCancel').click(); await tick(200); const closed = dom.window.document.getElementById('mapSheet').style.display; if (rows.length !== 6) fail = '选项数不对:' + rows.length; else if (vposts.length < 1) fail = 'venue没发请求';else if (closed !== 'none') fail = '取消没关闭'; if (fail) { console.log('UI FAIL: ' + fail); process.exit(1); } console.log('UI PASS: 城市切换+搜索按钮+导航选单');
