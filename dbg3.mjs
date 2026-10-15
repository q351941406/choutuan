import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync('/tmp/choutuan/public/index.html', 'utf8');
function fakeFetch(url) { return Promise.resolve({ json: function() { return Promise.resolve({ ok: true, data: [], total: 0 }); } }); }
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'dangerously', beforeParse(w) { w.fetch = fakeFetch; } });
const tick = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
await tick(400);
const btns = dom.window.document.querySelectorAll('#citychips .chip');
const b = btns[1];
console.log('outer=' + b.outerHTML);
console.log('attr=' + b.getAttribute('data-c'));
b.click();
await tick(200);
console.log('after-outer=' + b.outerHTML);
const t = b.outerHTML;
let o = '';
for (const ch of t) { o += ch.codePointAt(0).toString(16) + ' '; }
console.log(o);
const w = dom.window;
w.eval('var RT = typeof CITIES + CHR0 + JSON.stringify(CITIES) + CHR0 + city');
console.log('rt=' + w.RT);
