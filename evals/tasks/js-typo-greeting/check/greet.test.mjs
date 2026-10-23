import test from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../src/greet.js';

test('greet', () => {
  assert.equal(greet('Ada'), 'Hello, Ada!');
  assert.equal(greet('Linus'), 'Hello, Linus!');
});
