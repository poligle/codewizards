import test from 'node:test';
import assert from 'node:assert/strict';
import { padLeft } from '../src/pad.js';

test('padLeft', () => {
  assert.equal(padLeft('7', 3), '  7');
  assert.equal(padLeft('7', 3, '0'), '007');
  assert.equal(padLeft('abcd', 2), 'abcd');
});
