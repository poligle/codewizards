import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/slug.js';

test('slugify', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
  assert.equal(slugify('  Café con leche!! '), 'cafe-con-leche');
  assert.equal(slugify('a__b--c'), 'a-b-c');
  assert.equal(slugify('Ñandú 2026'), 'nandu-2026');
  assert.equal(slugify('***'), '');
});
