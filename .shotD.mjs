import { chromium } from '/opt/node/v22.2.0/lib/node_modules/playwright/index.mjs';
try {
  const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('console', m => console.log('CONSOLE: ' + m.text().slice(0, 200)));
  p.on('pageerror', e => console.log('PAGEERR: ' + String(e.message).slice(0, 200)));
  p.on('requestfailed', r => console.log('REQFAIL: ' + r.url().slice(0, 120) + ' ' + (r.failure()||{}).errorText));
  await p.goto('http://localhost:3011/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(9000);
  const html = await p.evaluate(() => document.getElementById('list').innerHTML.slice(0, 200));
  console.log('LIST: ' + html);
  const city = await p.evaluate(() => (document.getElementById('cityName')||{}).textContent);
  console.log('CITY: ' + city);
  await b.close();
} catch (e) { console.log('ERR: ' + String(e.message).slice(0, 300)); }
