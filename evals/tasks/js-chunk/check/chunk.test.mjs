import test from 'node:test';
import assert from 'node:assert/strict';
import { chunk } from '../src/chunk.js';

test('chunk', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
  assert.deepEqual(chunk([1], 5), [[1]]);
  for (const bad of [0, -1, 1.5, NaN, '2']) assert.throws(() => chunk([1], bad), RangeError);
});
