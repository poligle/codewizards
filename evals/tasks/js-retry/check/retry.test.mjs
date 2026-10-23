import test from 'node:test';
import assert from 'node:assert/strict';
import { retry } from '../src/retry.js';

test('succeeds after failures', async () => {
  let n = 0;
  const v = await retry(async () => { n++; if (n < 3) throw new Error('e' + n); return 'ok'; }, { attempts: 3, delayMs: 1 });
  assert.equal(v, 'ok');
  assert.equal(n, 3);
});
test('rejects with the last error', async () => {
  let n = 0;
  await assert.rejects(retry(async () => { n++; throw new Error('e' + n); }, { attempts: 2 }), /e2/);
  assert.equal(n, 2);
});
test('defaults to three attempts', async () => {
  let n = 0;
  await assert.rejects(retry(async () => { n++; throw new Error('x'); }));
  assert.equal(n, 3);
});
