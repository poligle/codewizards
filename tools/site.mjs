// Builds codewizards.app (step 8): the page in site/, the room's demo in /demo/ (every file of
// apps/room/src: the demo is the app's own room), the logo from codewizards-art and the words the
// page shows (apps/room/src/words.js): some terms, the guilds with their emblems and the notice.
//   node tools/site.mjs build [DIR]    (default: _site, what GitHub Pages publishes)
//   node tools/site.mjs serve [PORT]   (builds into a temporary folder and serves it on 127.0.0.1)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { WORDS as W } from '../apps/core/src/words.js';
import { VERSION } from '../apps/core/src/version.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const ROOM = path.join(ROOT, 'apps', 'room', 'src');
const UI = path.join(ROOT, 'codewizards-art', '05_ui');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

function assets() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOM, 'assets.gen.js'), 'utf8'), ctx);
  return ctx.window.CW_ASSETS;
}

// The guild's emblem as the room draws it: 5 x 5 pixels in the guild's base colour.
function emblem(A, g) {
  const rects = [];
  (A.emblems[g] || A.emblems.unknown || []).forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  });
  const c = (A.pal.guilds[g] || A.pal.guilds.unknown)[1];
  return `<svg class="emb" viewBox="0 0 5 5" fill="rgb(${c.join(',')})" aria-hidden="true">${rects.join('')}</svg>`;
}

function words(ids) {
  return ids.map(id => {
    const t = W.terms[id];
    if (!t) throw new Error(`site: there is no term called ${id} in words.js`);
    return `<dt>${esc(t.word)}</dt><dd>${esc(t.means)} <span class="tech">In plain terms: ${esc(t.tech)}.</span></dd>`;
  }).join('');
}

function guilds(A) {
  return Object.entries(W.guilds).map(([id, g]) => `<li>${emblem(A, id)}<span><b>${esc(g.name)}</b> <span class="maker">${esc(g.maker)}` +
    `${g.models ? ': ' + esc(g.models) + ' models' : ''}${g.via ? ', through ' + esc(g.via) : ''}</span></span>` +
    `<span class="state${g.ready ? ' ready' : ''}">${g.ready ? 'Ready' : 'Planned'}</span></li>`).join('');
}

export function build(out = path.join(ROOT, '_site')) {
  fs.rmSync(out, { recursive: true, force: true });
  copyDir(SITE, out);
  copyDir(ROOM, path.join(out, 'demo'));
  fs.copyFileSync(path.join(UI, 'Logo_CodeWizards.png'), path.join(out, 'img', 'logo.png'));
  const A = assets();
  for (const page of fs.readdirSync(out).filter(f => f.endsWith('.html'))) {
    const file = path.join(out, page);
    const html = fs.readFileSync(file, 'utf8')
      .replace(/<!-- words: ([^>]*?) -->/g, (_, ids) => words(ids.trim().split(/\s+/)))
      .replace(/<!-- guilds -->/g, () => guilds(A))
      .replace(/<!-- notice -->/g, () => esc(W.notice))
      .replace(/<!-- version -->/g, () => esc(VERSION));
    const left = html.match(/<!-- (words|guilds|notice|version)\b/);
    if (left) throw new Error(`site: ${page} still has a marker (${left[0]})`);
    fs.writeFileSync(file, html);
  }
  // The demo's old address (the mockup, until v1.2) still finds it.
  fs.mkdirSync(path.join(out, 'apps', 'maqueta'), { recursive: true });
  fs.writeFileSync(path.join(out, 'apps', 'maqueta', 'maqueta.html'), '<!doctype html><meta charset="utf-8"><title>CodeWizards</title>\n' +
    '<meta http-equiv="refresh" content="0; url=../../demo/">\n<p>The demo moved: <a href="../../demo/">open it here</a>.</p>\n');
  return out;
}

const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ttf: 'font/ttf', json: 'application/json', txt: 'text/plain; charset=utf-8' };

// Serves a built site the way GitHub Pages does: index.html for a folder, a redirect when the
// folder's slash is missing, and 404.html for anything else.
export function serveDir(dir, port = 0) {
  const server = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); res.end(); return; }
    const file = path.join(dir, path.normalize(p.endsWith('/') ? p + 'index.html' : p));
    const inside = file === dir || file.startsWith(dir + path.sep);
    if (inside && fs.existsSync(file) && fs.statSync(file).isDirectory()) { res.writeHead(301, { Location: p + '/' }); res.end(); return; }
    if (!inside || !fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': TYPES.html });
      fs.createReadStream(path.join(dir, '404.html')).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).slice(1)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd = 'build', arg] = process.argv.slice(2);
  if (cmd === 'build') {
    const out = build(arg ? path.resolve(arg) : undefined);
    console.log(`built codewizards.app in ${path.relative(process.cwd(), out) || '.'}`);
  } else if (cmd === 'serve') {
    const { url } = await serveDir(build(fs.mkdtempSync(path.join(os.tmpdir(), 'cw-site-'))), Number(arg) || 0);
    console.log(`codewizards.app, on this computer: ${url} (Ctrl+C stops it)`);
  } else {
    console.error('usage: node tools/site.mjs build [DIR] | serve [PORT]');
    process.exit(2);
  }
}
