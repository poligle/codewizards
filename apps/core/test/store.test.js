import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventStore, ContractError } from '../src/store.js';
import { tmp } from './helpers.js';

const idle = { t: 'agent.idle', agent: 'a1' };

test('stamps v, seq, ts and room, in order', () => {
  const s = new EventStore({ room: 'r1', now: () => 1000 });
  const a = s.append(idle), b = s.append({ ...idle, ts: 5 });
  assert.deepEqual(Object.keys(a).slice(0, 5), ['v', 't', 'seq', 'ts', 'room']);
  assert.equal(a.v, 1);
  assert.deepEqual([a.seq, b.seq], [1, 2]);
  assert.deepEqual([a.ts, b.ts], [1000, 5]);
  assert.equal(b.room, 'r1');
});

test('a draft cannot choose its own seq or room', () => {
  const s = new EventStore({ room: 'r1' });
  const ev = s.append({ ...idle, seq: 99, room: 'elsewhere', v: 0 });
  assert.deepEqual([ev.seq, ev.room, ev.v], [1, 'r1', 1]);
});

test('rejects events that break the contract, and keeps nothing of them', () => {
  const s = new EventStore({ room: 'r1' });
  assert.throws(() => s.append({ t: 'agent.idle' }), ContractError);
  assert.throws(() => s.append({ t: 'agent.dance', agent: 'a1' }), ContractError);
  assert.equal(s.seq, 0);
  assert.equal(s.events.length, 0);
});

test('masks secrets before storing', () => {
  const s = new EventStore({ room: 'r1' });
  const key = ['sk-ant-', 'api03-', 'Z'.repeat(40)].join('');
  const ev = s.append({ t: 'agent.error', agent: 'a1', message: `leaked ${key}` });
  assert.equal(ev.message, 'leaked [redacted]');
});

test('since() returns what a reconnecting room missed', () => {
  const s = new EventStore({ room: 'r1' });
  for (let i = 0; i < 5; i++) s.append(idle);
  assert.deepEqual(s.since(3).map(e => e.seq), [4, 5]);
  assert.equal(s.since(0).length, 5);
  assert.equal(s.since(9).length, 0);
});

test('persists to JSON Lines, owner-only, and replays on load (a torn line is skipped)', () => {
  const dir = tmp();
  const file = path.join(dir, 'rooms', 'r1', 'events.jsonl');
  const s = new EventStore({ room: 'r1', file });
  s.append(idle);
  s.append({ t: 'agent.error', agent: 'a1', message: 'oops' });
  fs.appendFileSync(file, '{"v":1,"t":"agent.id');            // a crash in the middle of a write
  if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  const again = new EventStore({ room: 'r1', file });
  assert.equal(again.seq, 2);
  assert.equal(again.events[1].message, 'oops');
  assert.equal(again.append(idle).seq, 3);
});

test('a failing listener never breaks the log', () => {
  const s = new EventStore({ room: 'r1' });
  let seen = 0;
  s.on(() => { throw new Error('listener bug'); });
  const off = s.on(() => { seen++; });
  s.append(idle);
  off();
  s.append(idle);
  assert.equal(seen, 1);
  assert.equal(s.seq, 2);
});
