import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync('/tmp/choutuan/public/index.html', 'utf8');
function fakeFetch(url) { return Promise.resolve({ json: function() { return Promise.resolve({ ok: true, data: [], total: 0 }); } }); }
const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'dangerously', beforeParse(w) { w.fetch = fakeFetch; } });
const tick = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
await tick(400);
const w = dom.window;
w.eval('window.RT = typeof CITIES + String.fromCharCode(124) + JSON.stringify(CITIES) + String.fromCharCode(124) + city;');
console.log('rt=' + w.RT);
w.eval('window.RT2 = CITIES.map(function(c){return 1;})');
console.log('map-ok=' + w.RT2);
w2 = dom.window;
w2.eval('document.getElementById(XXXcitychipsXXX).innerHTML = XXX_PLACEHOLDER;');
console.log('manual=' + dom.window.document.querySelectorAll('#citychips .chip')[1].outerHTML);
w2 = dom.window;
w2.eval('var tc=%DQHTML%'.replace('AAA','BBB'));
