import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanEmails } from '../src/emails.js';

test('cleanEmails', () => {
  assert.deepEqual(cleanEmails([' Ada@Example.com', 'ada@example.com', 'bad', 'a@b', 'x@@y.com', '@y.com', 'z@.com', 'q@w.org ']), ['ada@example.com', 'q@w.org']);
  assert.deepEqual(cleanEmails([]), []);
});
