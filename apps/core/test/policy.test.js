import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPolicy, claudeArgs, systemNote } from '../src/agents/claude-code/policy.js';

const SESSION = '00000000-0000-4000-8000-00000000abcd';

test('default policy: read and edit, read-only git, sandbox required, no network tools', () => {
  const p = buildPolicy({ platform: 'linux' });
  assert.ok(p.tools.includes('Bash') && p.sandboxed);
  assert.deepEqual(p.settings, { sandbox: { enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, network: { allowedDomains: [] } } });
  assert.ok(p.allow.includes('Bash(git diff *)') && !p.allow.some(r => /push|gh /.test(r)));
  for (const r of ['Bash(git push *)', 'Bash(gh *)', 'WebFetch', 'WebSearch']) assert.ok(p.deny.includes(r), r);
});

test('native Windows: no Bash at all (the sandbox needs WSL2)', () => {
  const p = buildPolicy({ platform: 'win32', testCommand: 'npm test' });
  assert.ok(!p.tools.includes('Bash') && !p.allow.some(r => r.startsWith('Bash')));
  assert.equal(p.settings, null);
});

test('the test command becomes an allow rule, and only plain commands are accepted', () => {
  assert.ok(buildPolicy({ platform: 'darwin', testCommand: 'npm test' }).allow.includes('Bash(npm test *)'));
  for (const bad of ['npm test; rm -rf /', 'a && b', 'x | y', '$(id)', '"quoted"']) {
    assert.throws(() => buildPolicy({ platform: 'linux', testCommand: bad }), /plain command/, bad);
  }
});

test('--no-sandbox is the user\'s explicit choice', () => {
  const p = buildPolicy({ platform: 'linux', sandbox: false });
  assert.equal(p.sandboxed, false);
  assert.equal(p.settings, null);
});

test('arguments: headless stream-json, dontAsk, caps, settings file; the prompt is not among them', () => {
  const policy = buildPolicy({ platform: 'linux' });
  const a = claudeArgs({ sessionId: SESSION, policy, maxTurns: 12, settingsFile: '/data/s.json', note: systemNote('cw/t1-x') });
  assert.deepEqual(a.slice(0, 4), ['-p', '--output-format', 'stream-json', '--verbose']);
  assert.equal(a[a.indexOf('--session-id') + 1], SESSION);
  assert.equal(a[a.indexOf('--permission-mode') + 1], 'dontAsk');
  assert.equal(a[a.indexOf('--max-turns') + 1], '12');
  assert.equal(a[a.indexOf('--settings') + 1], '/data/s.json');
  assert.ok(!a.includes('--bare'), 'bare mode skips the subscription login');
  assert.ok(!a.includes('--dangerously-skip-permissions'));
  const r = claudeArgs({ sessionId: SESSION, resume: true, policy, model: 'sonnet', maxBudgetUsd: 2 });
  assert.equal(r[r.indexOf('--resume') + 1], SESSION);
  assert.ok(!r.includes('--session-id'));
  assert.equal(r[r.indexOf('--model') + 1], 'sonnet');
  assert.equal(r[r.indexOf('--max-budget-usd') + 1], '2');
});

test('arguments refuse odd model names and session ids', () => {
  const policy = buildPolicy({ platform: 'linux' });
  assert.throws(() => claudeArgs({ sessionId: SESSION, policy, model: 'sonnet; rm' }), /model/);
  assert.throws(() => claudeArgs({ sessionId: 'nope', policy }), /UUID/);
});
