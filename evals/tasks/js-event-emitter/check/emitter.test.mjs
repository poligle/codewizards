import test from 'node:test';
import assert from 'node:assert/strict';
import { Emitter } from '../src/emitter.js';

test('order, return value, off', () => {
  const e = new Emitter(), log = [];
  const a = x => log.push('a' + x);
  e.on('t', a); e.on('t', x => log.push('b' + x));
  assert.equal(e.emit('t', 1), 2);
  e.off('t', a);
  assert.equal(e.emit('t', 2), 1);
  assert.deepEqual(log, ['a1', 'b1', 'b2']);
  assert.equal(e.emit('none'), 0);
});
test('once and unsubscribe', () => {
  const e = new Emitter(); let n = 0, m = 0;
  e.once('t', () => n++);
  const stop = e.on('t', () => m++);
  e.emit('t'); e.emit('t'); stop(); e.emit('t');
  assert.deepEqual([n, m], [1, 2]);
});
test('removing during emit', () => {
  const e = new Emitter(), log = [];
  const b = () => log.push('b');
  e.on('t', () => { log.push('a'); e.off('t', b); });
  e.on('t', b);
  e.emit('t'); e.emit('t');
  assert.deepEqual(log, ['a', 'b', 'a']);
});
