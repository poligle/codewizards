// The local server: Host and Origin checks, token, CSP, static allowlist, replay and commands.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import WebSocket from 'ws';
import { EventStore } from '../src/store.js';
import { startServer, sanitize } from '../src/server.js';
import { DemoRoom } from '../src/rooms/demo-room.js';
import { validate } from '../../../packages/contract/contract.js';
import { waitFor } from './helpers.js';

async function boot() {
  const store = new EventStore({ room: 'demo' });
  const room = new DemoRoom({ store, seed: 3, tickMs: 0 });
  const srv = await startServer({ room, store });
  return { store, room, srv };
}

function get(port, p, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: p, headers: { host: `127.0.0.1:${port}`, ...headers } }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

function connect(srv, { token = srv.token, origin = `http://127.0.0.1:${srv.port}`, host } = {}) {
  const ws = new WebSocket(`ws://127.0.0.1:${srv.port}/ws`, ['cw.v1', `cw.token.${token}`], { headers: { origin, ...(host ? { host } : {}) } });
  const msgs = [];
  ws.on('message', d => msgs.push(JSON.parse(d)));
  const opened = new Promise(resolve => {
    ws.on('open', () => resolve({ ok: true }));
    ws.on('unexpected-response', (req, res) => resolve({ ok: false, status: res.statusCode }));
    ws.on('error', () => resolve({ ok: false, status: 0 }));
  });
  return { ws, msgs, opened };
}

test('listens on 127.0.0.1 only and serves only the room files, with a strict CSP', async () => {
  const { srv, room } = await boot();
  try {
    assert.match(srv.url, /^http:\/\/127\.0\.0\.1:\d+\/#token=[A-Za-z0-9_-]{32}$/);
    const page = await get(srv.port, '/');
    assert.equal(page.status, 200);
    assert.match(page.body, /<script src="net\.js"><\/script>/);
    const csp = page.headers['content-security-policy'];
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /script-src 'self'(;|$)/);
    assert.match(csp, new RegExp(`connect-src ws://127\\.0\\.0\\.1:${srv.port} ws://localhost:${srv.port}`));
    assert.equal(page.headers['x-content-type-options'], 'nosniff');
    assert.equal((await get(srv.port, '/assets.gen.js')).status, 200);
    for (const p of ['/../package.json', '/%2e%2e/package.json', '/apps/core/src/server.js', '/.git/config', '/sim.js.map']) {
      assert.equal((await get(srv.port, p)).status, 404, p);
    }
  } finally { await srv.close(); await room.shutdown(); }
});

test('a request for another host is refused (DNS rebinding)', async () => {
  const { srv, room } = await boot();
  try {
    assert.equal((await get(srv.port, '/', { host: `evil.example:${srv.port}` })).status, 403);
    assert.equal((await get(srv.port, '/', { host: `localhost:${srv.port}` })).status, 200);
  } finally { await srv.close(); await room.shutdown(); }
});

test('the WebSocket needs the right Origin, Host and token', async () => {
  const { srv, room } = await boot();
  try {
    assert.deepEqual(await connect(srv, { origin: 'https://evil.example' }).opened, { ok: false, status: 403 });
    assert.deepEqual(await connect(srv, { origin: 'null' }).opened, { ok: false, status: 403 });
    assert.deepEqual(await connect(srv, { token: 'x'.repeat(32) }).opened, { ok: false, status: 401 });
    assert.deepEqual(await connect(srv, { host: `evil.example:${srv.port}` }).opened, { ok: false, status: 403 });
    const good = connect(srv);
    assert.deepEqual(await good.opened, { ok: true });
    assert.equal(good.ws.protocol, 'cw.v1', 'the token is never echoed back as the protocol');
    good.ws.close();
  } finally { await srv.close(); await room.shutdown(); }
});

test('hello replays the log; commands drive the room; events follow contract v1', async () => {
  const { srv, room, store } = await boot();
  try {
    const a = connect(srv);
    await a.opened;
    await waitFor(() => a.msgs.some(m => m.ctl === 'hello'), { what: 'hello' });
    assert.deepEqual(a.msgs[0], { ctl: 'hello', room: 'demo', version: a.msgs[0].version, mode: 'demo', autoApprove: true });
    a.ws.send(JSON.stringify({ cmd: 'hello', since: 0 }));
    a.ws.send(JSON.stringify({ cmd: 'auto', on: true }));
    a.ws.send(JSON.stringify({ cmd: 'cast', text: 'Add a dark mode' }));
    await waitFor(() => store.events.some(e => e.t === 'room.opened'), { what: 'cast' });
    room.advance(150);
    const events = () => a.msgs.filter(m => m.t);
    await waitFor(() => events().length === store.seq, { what: 'all events delivered' });
    const n = events().filter(e => e.t === 'task.created').length;
    assert.ok(n >= 3);
    assert.equal(events().filter(e => e.t === 'task.done').length, n);
    for (const e of events()) assert.deepEqual(validate(e), [], `${e.t} #${e.seq}`);
    // a second client that reconnects after seq 10 gets only what it missed
    const b = connect(srv);
    await b.opened;
    b.ws.send(JSON.stringify({ cmd: 'hello', since: 10 }));
    await waitFor(() => b.msgs.filter(m => m.t).length === store.seq - 10, { what: 'replay since 10' });
    assert.equal(b.msgs.find(m => m.t).seq, 11);
    // malformed and unknown commands get an error, never a crash
    a.ws.send('not json');
    a.ws.send(JSON.stringify({ cmd: 'rm -rf' }));
    a.ws.send(JSON.stringify({ cmd: 'approve', task: '../../etc' }));
    await waitFor(() => a.msgs.filter(m => m.ctl === 'error').length === 2, { what: 'two errors' });
    a.ws.close();
    b.ws.close();
  } finally { await srv.close(); await room.shutdown(); }
});

test('sanitize accepts the known commands and nothing else', () => {
  assert.deepEqual(sanitize({ cmd: 'cast', text: 'x' }), { cmd: 'cast', text: 'x' });
  assert.equal(sanitize({ cmd: 'cast', text: '   ' }), null);
  assert.equal(sanitize({ cmd: 'cast', text: 'x'.repeat(4001) }), null);
  assert.deepEqual(sanitize({ cmd: 'reject', task: 't12' }), { cmd: 'reject', task: 't12', comment: '' });
  assert.equal(sanitize({ cmd: 'reject', task: 't1', comment: 'x'.repeat(2001) }), null);
  assert.deepEqual(sanitize({ cmd: 'speed', speed: 4 }), { cmd: 'speed', speed: 4 });
  assert.equal(sanitize({ cmd: 'speed', speed: 1000 }), null);
  assert.deepEqual(sanitize({ cmd: 'auto', on: 'yes' }), { cmd: 'auto', on: false });
  assert.deepEqual(sanitize({ cmd: 'hello', since: -4 }), { cmd: 'hello', since: 0 });
  for (const bad of [null, [], 'cast', { cmd: '__proto__' }, { cmd: 'stop', task: 't1; rm' }]) assert.equal(sanitize(bad), null);
});
