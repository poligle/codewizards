// Captures the room for the site and the README (step 8): frames of the room as the browser draws
// it (the light included, the CRT left out) and the whole window with and without the CRT. It uses
// the static demo, sped up and approving by itself: no agent, account or network is needed.
//   node tools/capture.mjs [--out DIR] [--frames N] [--wait MS]
//   python3 tools/capture.py [DIR]      (makes the GIFs, the stills, the favicon and the icons)
// CW_CHROMIUM=/path/to/chromium uses that browser instead of Playwright's download.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps', 'room', 'src');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(ROOT, 'tools', 'capture', 'out')));
const FRAMES = Number(arg('--frames', 56));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });

const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://x').pathname.replace(/^\/$/, '/index.html').slice(1);
  const file = path.join(SRC, path.basename(name));
  if (name.includes('/') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[file.split('.').pop()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(process.env.CW_CHROMIUM ? { executablePath: process.env.CW_CHROMIUM } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url + '?prisa=2&auto=1');
  await page.waitForTimeout(1200);
  await page.fill('#spell-text', 'Add a dark mode to the settings page');
  await page.press('#spell-text', 'Enter');
  await page.waitForTimeout(Number(arg('--wait', 7000)));
  await page.screenshot({ path: path.join(OUT, 'window-crt.png') });
  await page.addStyleTag({ content: '.crt{display:none!important}' });
  await page.screenshot({ path: path.join(OUT, 'window.png') });
  // The frames show the room alone: the scrolls, the spell book and the room's line are the page's.
  await page.addStyleTag({ content: '.scroll,.grimoire,.roomline,.hint{visibility:hidden!important}' });
  const box = await page.locator('#room').boundingBox();
  const clip = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
  const times = [];
  for (let i = 0; i < FRAMES; i++) {
    times.push(Date.now());
    await page.screenshot({ path: path.join(OUT, 'frames', String(i).padStart(3, '0') + '.png'), clip });
    await page.waitForTimeout(60);
  }
  times.push(Date.now());
  const scale = await page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--px').replace('px', '')));
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify({ scale, clip, durations: times.slice(1).map((t, i) => t - times[i]) }));
  if (errors.length) throw new Error('page errors: ' + errors.join('; '));
  console.log(`captured ${FRAMES} frames at x${scale} and the window twice in ${path.relative(ROOT, OUT)}`);
} finally {
  await browser.close();
  server.close();
}
