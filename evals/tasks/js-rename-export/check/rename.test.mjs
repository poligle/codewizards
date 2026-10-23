import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../src/math.js';
import { report } from '../src/report.js';

test('sum is the export and report still works', () => {
  assert.equal(typeof math.sum, 'function');
  assert.equal(math.sum([1, 2, 3]), 6);
  assert.equal(math.sumAll, undefined);
  assert.equal(report([2, 3]), 'Total: 5');
});
