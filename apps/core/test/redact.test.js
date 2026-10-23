import test from 'node:test';
import assert from 'node:assert/strict';
import { redact, redactEvent } from '../src/redact.js';

// Fake keys are assembled at run time so that the repository itself never contains one
// (the secret scan in CI would rightly flag it).
const k = (...parts) => parts.join('');
const FAKES = [
  k('sk-ant-', 'api03-', 'A'.repeat(40)),
  k('sk-', 'proj-', 'B'.repeat(40)),
  k('gh', 'p_', 'C'.repeat(36)),
  k('github', '_pat_', 'D'.repeat(30)),
  k('AK', 'IA', 'E'.repeat(16)),
  k('AI', 'za', 'F'.repeat(35)),
  k('xo', 'xb-', '1234567890-abcdef'),
];

test('known secret formats are masked', () => {
  for (const f of FAKES) {
    const out = redact(`token: ${f} end`);
    assert.ok(!out.includes(f), `still visible: ${f.slice(0, 8)}…`);
    assert.match(out, /\[redacted\]/);
  }
});

test('private keys and authorization headers are masked', () => {
  const pem = k('-----BEGIN ', 'PRIVATE KEY-----\nabc\ndef\n-----END ', 'PRIVATE KEY-----');
  assert.equal(redact(`x\n${pem}\ny`), 'x\n[redacted private key]\ny');
  assert.equal(redact('Authorization: Bearer abcdefghijklmnop1234'), 'Authorization: Bearer [redacted]');
});

test('ordinary text and code stay as they are', () => {
  const code = 'const sk = "sk-learn"; // AKIA is a prefix; gh pr list\n+export function toggle() {}';
  assert.equal(redact(code), code);
});

test('redactEvent masks strings and string arrays, and nothing else', () => {
  const ev = redactEvent({ t: 'context.read', files: ['a.js', FAKES[0]], tokens_in: 3, n: null });
  assert.deepEqual(ev, { t: 'context.read', files: ['a.js', '[redacted]'], tokens_in: 3, n: null });
});
