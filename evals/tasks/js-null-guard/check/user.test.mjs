import test from 'node:test';
import assert from 'node:assert/strict';
import { displayName } from '../src/user.js';

test('displayName', () => {
  assert.equal(displayName({ name: '  Ada ' }), 'Ada');
  assert.equal(displayName({}), 'Anonymous');
  assert.equal(displayName({ name: null }), 'Anonymous');
});
