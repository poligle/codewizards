import test from 'node:test';
import assert from 'node:assert/strict';
import { median } from '../src/stats.js';

test('median', () => {
  assert.equal(median([10, 9, 2]), 9);
  assert.equal(median([1, 100, 20, 3]), 11.5);
  assert.equal(median([5]), 5);
});
