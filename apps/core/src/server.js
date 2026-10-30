// The core's local server: the room's files over HTTP and the event contract over a WebSocket.
// Threat model (docs/arquitectura.md §3): any web page the user visits can try to reach a port on
// 127.0.0.1, and this one drives agents that write code. So:
//   - it listens on 127.0.0.1 only, on a random port by default;
//   - every request must carry Host 127.0.0.1:PORT or localhost:PORT (DNS rebinding);
//   - the WebSocket needs Origin http://127.0.0.1:PORT or http://localhost:PORT (cross-site hijacking)
//     and a random per-run token offered as the `cw.token.<token>` subprotocol (never in a URL query);
//   - only the room's own files are served, with a strict Content-Security-Policy;
//   - commands are whitelisted and size-limited; events go out only after the contract check.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { VERSION as APP_VERSION } from './version.js';

const ROOM = new URL('../../room/src/', import.meta.url);
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8' };
const FILES = new Map([
  ['/', 'index.html'], ['/index.html', 'index.html'], ['/style.css', 'style.css'], ['/assets.gen.js', 'assets.gen.js'],
  ['/plan.gen.js', 'plan.gen.js'], ['/ui.gen.css', 'ui.gen.css'], ['/world.js', 'world.js'], ['/sim.js', 'sim.js'], ['/render.js', 'render.js'], ['/net.js', 'net.js'], ['/sound.js', 'sound.js'], ['/words.js', 'words.js'], ['/ui.js', 'ui.js'],
]);
const TASK = /^t\d{1,6}$/;
const RANK = new Set(['auto', 'aprendiz', 'joven', 'sabio']);
const EFFORT = new Set(['auto', 'low', 'medium', 'high', 'xhigh', 'max']);
const MODEL = /^[A-Za-z0-9._[\]-]{1,80}$/;

export const newToken = () => crypto.randomBytes(24).toString('base64url');

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Turns a client message into a known command, or null. */
export function sanitize(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
  const str = (v, max) => typeof v === 'string' && v.length <= max;
  switch (m.cmd) {
    case 'hello': return { cmd: 'hello', since: Number.isSafeInteger(m.since) && m.since > 0 ? m.since : 0 };
    case 'rooms': return { cmd: 'rooms' };
    case 'enter': return typeof m.room === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(m.room) ? { cmd: 'enter', room: m.room } : null;
    case 'found': return str(m.path, 1024) && m.path.trim() && !m.path.includes('\0') ? { cmd: 'found', path: m.path, create: m.create === true } : null;
    case 'cast': {
      if (!(str(m.text, 4000) && m.text.trim())) return null;
      if (m.rank !== undefined && !RANK.has(m.rank)) return null;
      if (m.effort !== undefined && !EFFORT.has(m.effort)) return null;
      if (m.model !== undefined && m.model !== 'auto' && !(typeof m.model === 'string' && MODEL.test(m.model))) return null;
      return {
        cmd: 'cast', text: m.text, ...(m.rank && m.rank !== 'auto' ? { rank: m.rank } : {}),
        ...(m.model && m.model !== 'auto' ? { model: m.model } : {}), ...(m.effort && m.effort !== 'auto' ? { effort: m.effort } : {}),
      };
    }
    case 'notes': return str(m.text, 64 * 1024) ? { cmd: 'notes', text: m.text } : null;
    case 'files': return { cmd: 'files' };
    case 'file': return str(m.path, 1024) && m.path && !m.path.includes('\0') ? { cmd: 'file', path: m.path } : null;
    case 'approve':
    case 'merge':
    case 'stop': return typeof m.task === 'string' && TASK.test(m.task) ? { cmd: m.cmd, task: m.task } : null;
    case 'reject':
      return typeof m.task === 'string' && TASK.test(m.task) && (m.comment === undefined || str(m.comment, 2000))
        ? { cmd: 'reject', task: m.task, comment: m.comment || '' } : null;
    case 'auto': return { cmd: 'auto', on: m.on === true };
    case 'speed': return [1, 2, 4].includes(m.speed) ? { cmd: 'speed', speed: m.speed } : null;
    default: return null;
  }
}

/**
 * @param {{room: {mode: string, hello(): object, handle(cmd: object): Promise<unknown>},
 *   store: import('./store.js').EventStore, port?: number, token?: string}} o
 * @returns {Promise<{url: string, port: number, token: string, close: () => Promise<void>}>}
 */
export function startServer({ room = null, store = null, tower = null, port = 0, token = newToken() }) {
  let actual = port;
  const hosts = () => new Set([`127.0.0.1:${actual}`, `localhost:${actual}`]);
  const origins = () => new Set([`http://127.0.0.1:${actual}`, `http://localhost:${actual}`]);
  const csp = () => [
    "default-src 'none'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data:", "font-src 'self' data:",
    `connect-src ws://127.0.0.1:${actual} ws://localhost:${actual}`, "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
  ].join('; ');

  const server = http.createServer((req, res) => {
    const send = (code, body = '', type = 'text/plain; charset=utf-8') => {
      res.writeHead(code, {
        'Content-Type': type, 'Content-Security-Policy': csp(), 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!hosts().has(req.headers.host)) return send(403, 'Forbidden host\n');
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'Method not allowed\n');
    let pathname;
    try { pathname = new URL(req.url, 'http://local').pathname; } catch { return send(400, 'Bad request\n'); }
    const file = FILES.get(pathname);
    if (!file) return send(404, 'Not found\n');
    fs.readFile(new URL(file, ROOM), (err, body) => {
      if (err) send(500, 'Missing room file\n');
      else send(200, body, TYPES[file.split('.').pop()]);
    });
    return undefined;
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, handleProtocols: offered => (offered.has('cw.v1') ? 'cw.v1' : false) });

  server.on('upgrade', (req, socket, head) => {
    const refuse = code => {
      socket.end(`HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    };
    socket.on('error', () => {});
    let pathname = '';
    try { pathname = new URL(req.url, 'http://local').pathname; } catch { /* refused below */ }
    if (!hosts().has(req.headers.host)) return refuse(403);
    if (pathname !== '/ws') return refuse(404);
    if (!origins().has(req.headers.origin)) return refuse(403);
    const offered = String(req.headers['sec-websocket-protocol'] || '').split(',').map(s => s.trim());
    const tok = offered.find(p => p.startsWith('cw.token.'));
    if (!tok || !safeEqual(tok.slice('cw.token.'.length), token)) return refuse(401);
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    return undefined;
  });

  // Each connection is in one room (or in La Torre, choosing one). `serve` and `demo` start it in
  // their room; `codewizards` alone starts it in La Torre (step 5, round 2).
  wss.on('connection', ws => {
    let cur = room ? { room, store } : null, subscribed = false, off = null;
    const out = obj => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); };
    const fail = err => out({ ctl: 'error', message: String((err && err.message) || err).slice(0, 300) });
    const hello = () => out({ ctl: 'hello', room: cur.store.room, version: APP_VERSION, tower: !!tower, ...cur.room.hello() });
    const bind = r => { if (off) off(); cur = r; subscribed = false; off = cur.store.on(ev => { if (subscribed) out(ev); }); };
    const replay = since => {
      // What happened before this moment comes first, then `live`: the room rebuilds itself from the
      // log without animating it, and only what follows is shown as it happens.
      for (const ev of cur.store.since(since)) out(ev);
      out({ ctl: 'live', seq: cur.store.seq });
      subscribed = true;
    };
    const towerList = () => out({ ctl: 'tower', rooms: tower ? tower.list() : [], current: cur ? cur.store.room : null });
    if (cur) { bind(cur); hello(); } else towerList();
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      let m;
      try { m = JSON.parse(data.toString('utf8')); } catch { return; }
      const cmd = sanitize(m);
      if (!cmd) { out({ ctl: 'error', message: 'unknown or malformed command' }); return; }
      if (cmd.cmd === 'rooms') { towerList(); return; }
      if (cmd.cmd === 'enter') {
        if (!tower) { fail('this core has a single room'); return; }
        Promise.resolve().then(() => tower.enter(cmd.room)).then(r => { bind(r); hello(); replay(0); }).catch(fail);
        return;
      }
      if (cmd.cmd === 'found') {
        if (!tower) { fail('this core has a single room'); return; }
        Promise.resolve().then(() => tower.found(cmd)).then(r => out({ ctl: 'founded', room: r.id })).catch(fail);
        return;
      }
      if (!cur) { if (cmd.cmd === 'hello') towerList(); else fail('enter a room first'); return; }
      if (cmd.cmd === 'hello') { replay(cmd.since); return; }
      if (cmd.cmd === 'files' || cmd.cmd === 'file') {
        Promise.resolve().then(() => (cur.room.query ? cur.room.query(cmd) : null))
          .then(r => out(r || { ctl: 'error', message: 'this room has no files to show' })).catch(fail);
        return;
      }
      const target = cur.room;
      Promise.resolve().then(() => target.handle(cmd)).catch(fail);
    });
    ws.on('close', () => { if (off) off(); });
    ws.on('error', () => {});
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      actual = server.address().port;
      resolve({
        url: `http://127.0.0.1:${actual}/#token=${token}`,
        port: actual,
        token,
        close: () => new Promise(done => {
          for (const c of wss.clients) c.terminate();
          wss.close();
          server.close(() => done());
          server.closeAllConnections?.();
        }),
      });
    });
  });
}
