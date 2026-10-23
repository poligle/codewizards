import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration } from '../src/duration.js';

test('valid', () => {
  assert.equal(parseDuration('1h30m'), 5400);
  assert.equal(parseDuration('45s'), 45);
  assert.equal(parseDuration('2h5s'), 7205);
  assert.equal(parseDuration('10m'), 600);
});
test('invalid', () => {
  for (const bad of ['', '5', 'h', '1m1h', '1x', '1h1h', ' 1h']) assert.throws(() => parseDuration(bad), TypeError, bad);
});
