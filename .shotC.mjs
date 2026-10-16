import { chromium } from '/opt/node/v22.2.0/lib/node_modules/playwright/index.mjs';
try {
  const b = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:3011/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(11000);
  const n = await p.locator('#list .cell').count();
  console.log('cells=' + n);
  if (n > 0) { await p.click('#list .cell'); await p.waitForTimeout(1000); }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(600);
  await p.screenshot({ path: '/tmp/mock2/live-detail.png' });
  console.log('shot ok');
  await b.close();
} catch (e) { console.log('ERR: ' + String(e.message).slice(0, 300)); }
