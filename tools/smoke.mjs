// Smoke test of the room in a real browser (Chromium, via Playwright):
//   A. the static demo, served like GitHub Pages serves it (desktop, ×3);
//   B. the same demo on a phone (390 × 844, ×1);
//   C. the live room served by the core (`codewizards demo`), events over the WebSocket;
//   D. `codewizards serve` on a throw-away git repo with the tests' fake Claude Code: cast, the diff
//      on the blackboard, approve, and the commit lands on the task branch.
// Fails on any page error, console error or request that leaves the machine. Also checks that a
// spell completes, that an unknown guild or a repeated event never freezes the room, that CRT is
// remembered, that the token leaves the address bar and that another origin cannot connect.
// Screenshots (×3, with and without CRT) go to tools/smoke/out/.
//
//   node tools/smoke.mjs [--bin path/to/codewizards.js] [--browser chromium|firefox]
//   CW_CHROMIUM=/path/to/chromium uses that browser instead of Playwright's download (NixOS:
//   `nix develop .#smoke`, which sets it).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
import { chromium, firefox } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'smoke', 'out');
const binArg = process.argv.indexOf('--bin');
const BIN = binArg > 0 ? path.resolve(process.argv[binArg + 1]) : path.join(ROOT, 'apps', 'core', 'bin', 'codewizards.js');
const browserArg = process.argv.indexOf('--browser');
const BROWSER = browserArg > 0 ? process.argv[browserArg + 1] : 'chromium';
const ROOM_SRC = path.join(ROOT, 'apps', 'room', 'src');
fs.mkdirSync(OUT, { recursive: true });

// The demo as GitHub Pages serves it: plain static files over http, no CSP header.
function startStatic() {
  const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8' };
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://x').pathname.replace(/^\/$/, '/index.html').slice(1);
    const file = path.join(ROOM_SRC, path.basename(name));
    if (name.includes('/') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[file.split('.').pop()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}
let STATIC = pathToFileURL(path.join(ROOM_SRC, 'index.html')).href;

const results = [];
const check = (ok, what) => { results.push({ ok: !!ok, what }); console.log(`${ok ? '✓' : '✗'} ${what}`); };

// Records the instances of the in-page simulator, so the test can inject events (demo mode only).
const HOOK = `window.CW = {}; let S;
Object.defineProperty(window.CW, 'Sim', { configurable: true, enumerable: true, get() { return S; },
  set(v) { S = class extends v { constructor(o) { super(o); (window.__sims = window.__sims || []).push(this); } }; } });`;

function watch(page, allowed) {
  const w = { errors: [], external: [] };
  page.on('pageerror', e => w.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') w.errors.push('console: ' + m.text()); });
  page.on('request', r => { const u = r.url(); if (!allowed(u)) w.external.push(u); });
  return w;
}

// Counts in the scroll: tasks leave the list once their wizard walks out, so the log is the record.
// Functions, not strings: the live room's CSP rightly refuses to evaluate strings.
const logged = page => page.evaluate(() => {
  const n = t => [...document.querySelectorAll('#log li b')].filter(b => b.textContent === t).length;
  return { created: n('task.created'), done: n('task.done'), merged: n('task.merged') };
});

async function castAndFinish(page, label) {
  check((await page.inputValue('#spell-text')) === '', `${label}: the spell book opens empty, without an example`);
  await page.fill('#spell-text', 'Añade un modo oscuro a la página de ajustes');
  await page.click('button[data-speed="4"]');
  if (await page.isEnabled('#auto')) await page.check('#auto');
  await page.click('button.cast');
  const done = await page.waitForFunction(() => {
    const n = t => [...document.querySelectorAll('#log li b')].filter(b => b.textContent === t).length;
    return n('task.created') >= 3 && n('task.done') === n('task.created');
  }, null, { timeout: 90000 }).then(() => true, () => false);
  const c = await logged(page);
  check(done, `${label}: a spell completes (every task done)${done ? '' : ` ${c.created} created, ${c.done} done`}`);
  const gone = await page.waitForFunction(() => document.querySelectorAll('#tasks li').length === 0
    && document.querySelectorAll('#history li').length >= 3, null, { timeout: 60000 }).then(() => true, () => false);
  check(gone, `${label}: finished tasks move to «Hechas» when their wizard walks out`);
}

async function crtShots(page, prefix) {
  const on = await page.getAttribute('#crt', 'aria-pressed');
  if (on !== 'true') await page.click('#crt');
  await page.locator('.tv').screenshot({ path: path.join(OUT, `${prefix}_crt.png`) });
  await page.click('#crt');
  await page.waitForTimeout(200);
  await page.locator('.tv').screenshot({ path: path.join(OUT, `${prefix}_sin_crt.png`) });
}

async function staticDemo(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(HOOK);
  const w = watch(page, u => u.startsWith(STATIC) || u.startsWith('data:'));
  await page.goto(STATIC);
  check((await page.textContent('#mode')).trim() === 'demo', 'A static: demo mode without a token');
  check((await page.locator('#mana li').count()) === 1, 'A static: only the connected account\'s guild has mana (Anthropic)');
  check((await page.locator('#rank option').count()) === 4, 'A static: the spell book lets you choose the rank or leave it to the Archmage');
  await castAndFinish(page, 'A static');
  check((await page.evaluate(() => getComputedStyle(document.getElementById('screen')).getPropertyValue('--px'))).trim() === '3px', 'A static: room at ×3 on a 1440 × 900 screen');
  // The side panels can be made narrower, and the room grows into the space.
  const box = await page.locator('#split-left').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x - 60, box.y + 40, { steps: 5 });
  await page.mouse.up();
  const leftW = Math.round((await page.locator('#left').boundingBox()).width);
  check(leftW < 260, `A static: dragging the edge makes the tasks panel narrower (${leftW} px)`);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(300);
  const big = Number((await page.evaluate(() => getComputedStyle(document.getElementById('screen')).getPropertyValue('--px'))).trim().replace('px', ''));
  check(big >= 4, `A static: on a 1920 × 1080 screen the room is at ×${big} (×4 or more)`);
  await page.setViewportSize({ width: 1440, height: 900 });
  // An unknown guild and a repeated event must not freeze the room (v1.1 froze on the first).
  const t0 = await page.evaluate(() => window.__sims[0].t);
  await page.evaluate(() => {
    const s = window.__sims[0];
    const ev = s.emit('agent.summoned', { agent: 'x9', guild: 'mistral', rank: 'aprendiz', model: 'm', account: 'demo' });
    for (const f of s.ls) f(ev);   // the same event again (same seq)
    s.emit('code.write', { agent: 'ghost', file: 'a.js', diff: '+x' });
  });
  await page.waitForTimeout(1500);
  check(await page.evaluate(t => window.__sims[0].t > t + 0.5, t0), 'A static: an unknown guild, a repeat and a gap do not freeze the room');
  await crtShots(page, 'demo');
  await page.reload();
  await page.waitForTimeout(300);
  check((await page.getAttribute('#crt', 'aria-pressed')) === 'false', 'A static: CRT off is remembered after a reload');
  await page.click('#crt');   // leave it on for the next run
  check(w.errors.length === 0, `A static: no page or console errors ${w.errors.join(' | ')}`);
  check(w.external.length === 0, `A static: no requests leave the machine ${w.external.join(' ')}`);
  await page.close();
}

async function mobileDemo(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const w = watch(page, u => u.startsWith(STATIC) || u.startsWith('data:'));
  await page.goto(STATIC);
  await page.click('button.cast');
  await page.waitForTimeout(4000);
  check((await page.evaluate(() => getComputedStyle(document.getElementById('screen')).getPropertyValue('--px'))).trim() === '1px', 'B phone: room at ×1 (integer scale)');
  check(w.errors.length === 0, `B phone: no page or console errors ${w.errors.join(' | ')}`);
  await ctx.close();
}

function startCore(extra = ['demo'], env = process.env) {
  const [cmd, args] = /\.(m?js)$/.test(BIN) ? [process.execPath, [BIN]] : [BIN, []];
  const child = spawn(cmd, [...args, ...extra, '--no-open', '--json'], { stdio: ['ignore', 'pipe', 'inherit'], env });
  return new Promise((resolve, reject) => {
    let out = '';
    child.stdout.on('data', d => {
      out += d;
      const nl = out.indexOf('\n');
      if (nl >= 0) { try { resolve({ child, info: JSON.parse(out.slice(0, nl)) }); } catch (e) { reject(e); } }
    });
    child.on('error', reject);
    setTimeout(() => reject(new Error('the core did not start')), 15000);
  });
}

async function liveRoom(browser) {
  const { child, info } = await startCore();
  const origin = new URL(info.url).origin;
  const token = new URL(info.url).hash.replace('#token=', '');
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const w = watch(page, u => u.startsWith(origin) || u.startsWith(origin.replace('http:', 'ws:')));
    await page.goto(info.url);
    await page.waitForFunction(() => document.getElementById('mode').textContent.trim() === 'demo' && /Conectado/.test(document.getElementById('hint').textContent), null, { timeout: 10000 })
      .then(() => check(true, 'C live: connected to the core'), () => check(false, 'C live: connected to the core'));
    check(!page.url().includes('token'), 'C live: the token left the address bar');
    await castAndFinish(page, 'C live');
    check((await page.request.get(origin + '/package.json')).status() === 404, 'C live: only the room files are served');
    await page.fill('#notes', '- add a dark mode\n- fix the login');
    await page.waitForTimeout(1200);
    const done = (await logged(page)).done;
    await page.goto(info.url.split('#')[0] + '#token=' + token);
    await page.waitForFunction(() => /Conectado/.test(document.getElementById('hint').textContent), null, { timeout: 10000 });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ now: document.querySelectorAll('#tasks li').length, hist: document.querySelectorAll('#history li').length }));
    check(after.now === 0 && after.hist === done, `C live: reopening the room rebuilds it at once: ${after.hist} tasks in «Hechas», none walking in again`);
    check((await page.inputValue('#notes')).includes('fix the login'), 'C live: «Por hacer» keeps its notes across reloads');
    await crtShots(page, 'local');
    check(w.errors.length === 0, `C live: no page or console errors ${w.errors.join(' | ')}`);
    check(w.external.length === 0, `C live: every request stays on ${origin} ${w.external.join(' ')}`);
    // Another origin with a stolen token still cannot connect (Origin check).
    const other = await browser.newPage();
    await other.goto('data:text/html,<title>evil</title>');
    const opened = await other.evaluate(([port, tok]) => new Promise(resolve => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, ['cw.v1', 'cw.token.' + tok]);
      ws.onopen = () => resolve(true);
      ws.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 3000);
    }), [new URL(origin).port, token]);
    check(opened === false, 'C live: a page from another origin cannot open the WebSocket, even with the token');
    await other.close();
    await page.close();
  } finally {
    child.kill('SIGTERM');
  }
}

async function claudeRoom(browser) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-smoke-repo-'));
  const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Smoke Wizard');
  git('config', 'user.email', 'smoke@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(repo, 'README.md'), '# demo\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'init');
  const env = {
    ...process.env, CW_CLAUDE_BIN: path.join(ROOT, 'apps', 'core', 'test', 'fixtures', 'fake-claude.mjs'),
    CODEWIZARDS_HOME: fs.mkdtempSync(path.join(os.tmpdir(), 'cw-smoke-home-')), FAKE_CLAUDE_DELAY_MS: '40',
  };
  const { child, info } = await startCore(['serve', '--repo', repo], env);
  const origin = new URL(info.url).origin;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const w = watch(page, u => u.startsWith(origin) || u.startsWith(origin.replace('http:', 'ws:')));
    await page.goto(info.url);
    await page.waitForFunction(() => document.getElementById('mode').textContent.trim() === 'Claude Code', null, { timeout: 10000 })
      .then(() => check(true, 'D serve: room in Claude Code mode'), () => check(false, 'D serve: room in Claude Code mode'));
    check(await page.isDisabled('#auto'), 'D serve: no auto-approval outside the demo');
    check(await page.isVisible('#stop'), 'D serve: the stop button is there for real wizards');
    await page.fill('#spell-text', 'Add a greeting file');
    await page.selectOption('#rank', 'aprendiz');
    check((await page.locator('#model option').count()) === 4, 'D serve: the spell book offers the table\'s models');
    await page.selectOption('#effort', 'high');
    await page.click('button.cast');
    const review = await page.waitForSelector('#tasks .st-review', { timeout: 30000 }).then(() => true, () => false);
    check(review, 'D serve: the wizard\'s change reaches the blackboard');
    check(/Hello from the wizard/.test(await page.textContent('#deliv')), 'D serve: the blackboard shows the real git diff');
    check(git('status', '--porcelain') === '', 'D serve: the user\'s checkout is untouched before approval');
    await page.click('#approve');
    const done = await page.waitForSelector('#tasks .st-pending', { timeout: 30000 }).then(() => true, () => false);
    check(done && /Hello from the wizard/.test(git('show', 'cw/t1-add-a-greeting-file:hello.txt')), 'D serve: approval commits to the task branch');
    const note = await page.textContent('#deliv');
    check(/guardado en la rama cw\/t1-add-a-greeting-file/.test(note) && /git merge cw\/t1-add-a-greeting-file/.test(note), 'D serve: the blackboard says where the change went and how to bring it in');
    check(/claude-sonnet-5-5/.test(note), 'D serve: the blackboard shows the model Claude Code reported');
    check(git('rev-list', '--count', 'main').trim() === '1', 'D serve: main does not move');
    check(/Aprendiz/.test(note) && /esfuerzo alto/.test(note), 'D serve: the rank and the effort you chose are the ones that worked');
    await page.click('[data-merge]');
    const merged = await page.waitForFunction(() => [...document.querySelectorAll('#log li b')].some(b => b.textContent === 'task.merged'), null, { timeout: 15000 }).then(() => true, () => false);
    check(merged && /Hello from the wizard/.test(git('show', 'main:hello.txt')), `D serve: the merge button brings the change into your branch${merged ? '' : ` (${await page.textContent('#hint')})`}`);
    await page.locator('.tv').screenshot({ path: path.join(OUT, 'claude_code_sala.png') });
    await page.screenshot({ path: path.join(OUT, 'claude_code_pantalla.png') });
    check(w.errors.length === 0, `D serve: no page or console errors ${w.errors.join(' | ')}`);
    check(w.external.length === 0, `D serve: every request stays on ${origin} ${w.external.join(' ')}`);
    await page.close();
  } finally {
    child.kill('SIGTERM');
  }
}

const statics = await startStatic();
STATIC = statics.url;
const browser = BROWSER === 'firefox' ? await firefox.launch()
  : await chromium.launch(process.env.CW_CHROMIUM ? { executablePath: process.env.CW_CHROMIUM } : {});
console.log(`Browser: ${BROWSER}`);
try {
  await staticDemo(browser);
  await mobileDemo(browser);
  await liveRoom(browser);
  await claudeRoom(browser);
} catch (err) {
  check(false, 'smoke test crashed: ' + (err && err.stack || err));
} finally {
  await browser.close();
  statics.server.close();
}
fs.writeFileSync(path.join(OUT, `results-${BROWSER}.json`), JSON.stringify(results, null, 2) + '\n');
const failed = results.filter(r => !r.ok).length;
console.log(`${results.length - failed}/${results.length} smoke checks passed · screenshots in tools/smoke/out/`);
process.exit(failed ? 1 : 0);
