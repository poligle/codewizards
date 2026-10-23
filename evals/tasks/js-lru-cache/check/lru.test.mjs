import test from 'node:test';
import assert from 'node:assert/strict';
import { LRUCache } from '../src/lru.js';

test('evicts the least recently used', () => {
  const c = new LRUCache(2);
  c.set('a', 1); c.set('b', 2);
  assert.equal(c.get('a'), 1);
  c.set('c', 3);
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('c'), 3);
  assert.equal(c.size, 2);
});
test('set refreshes and updates; delete', () => {
  const c = new LRUCache(2);
  c.set('a', 1); c.set('b', 2); c.set('a', 10); c.set('c', 3);
  assert.equal(c.get('a'), 10);
  assert.equal(c.get('b'), undefined);
  assert.equal(c.delete('a'), true);
  assert.equal(c.size, 1);
});
test('capacity', () => {
  for (const bad of [0, -1, 1.5]) assert.throws(() => new LRUCache(bad), RangeError);
});
