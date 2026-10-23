// A room belongs to a repository: the same path with a different repository gets a fresh room.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { adoptRoomDir } from '../src/rooms/identity.js';
import { tmp } from './helpers.js';

test('the same repository keeps its room; a different one archives the old room', () => {
  const dir = path.join(tmp(), 'rooms', 'prueba-faf48bdc');
  assert.deepEqual(adoptRoomDir(dir, { repo: '/tmp/prueba', root: 'aaa', now: () => 0 }), { archived: null });
  fs.writeFileSync(path.join(dir, 'events.jsonl'), '{"old":true}\n');
  assert.deepEqual(adoptRoomDir(dir, { repo: '/tmp/prueba', root: 'aaa' }), { archived: null }, 'same first commit: same room');
  assert.ok(fs.existsSync(path.join(dir, 'events.jsonl')));
  const { archived } = adoptRoomDir(dir, { repo: '/tmp/prueba', root: 'bbb', now: () => Date.UTC(2026, 9, 23, 12, 0, 0) });
  assert.equal(archived, `${dir}.replaced-20261023-120000`);
  assert.ok(fs.existsSync(path.join(archived, 'events.jsonl')), 'the old room is kept, archived');
  assert.ok(!fs.existsSync(path.join(dir, 'events.jsonl')), 'the new repository starts with an empty room');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'room.json'), 'utf8')).root, 'bbb');
});

test('a room from before room.json is adopted as it is', () => {
  const dir = path.join(tmp(), 'old-room');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'events.jsonl'), '');
  assert.deepEqual(adoptRoomDir(dir, { repo: '/r', root: 'ccc' }), { archived: null });
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'room.json'), 'utf8')).root, 'ccc');
});
