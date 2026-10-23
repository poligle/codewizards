import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../../../packages/contract/contract.js';
import { ClaudeTranslator, miniDiff } from '../src/agents/claude-code/translate.js';
import { recording } from './helpers.js';

const CWD = '/work/repo';
const translate = name => {
  const tr = new ClaudeTranslator({ agent: 'a1', task: 't1', cwd: CWD, account: 'claude-code' });
  const drafts = recording(name, CWD).flatMap(m => tr.push(m));
  for (const d of drafts) assert.deepEqual(validate(d, { draft: true }), [], `${d.t} is a valid contract v1 draft`);
  return { tr, drafts };
};

test('success: reads, writes, tokens and one denied command', () => {
  const { tr, drafts } = translate('success.ndjson');
  assert.deepEqual(drafts.map(d => d.t), ['context.read', 'code.write', 'code.write', 'tokens.used', 'agent.error']);
  assert.deepEqual(drafts[0].files, ['README.md', 'src']);
  assert.equal(drafts[1].file, 'hello.txt');
  assert.match(drafts[1].diff, /^@@ hello\.txt \(whole file\) @@\n\+Hello from the wizard/);
  assert.equal(drafts[2].file, 'README.md');
  assert.match(drafts[2].diff, /-# demo\n\+# demo/);
  assert.deepEqual(drafts[3], { t: 'tokens.used', agent: 'a1', account: 'claude-code', input: 2190, output: 310, cache: 6600, cost_usd: 0.0123 });
  assert.equal(drafts[4].message, 'Permission denied: Bash (git push origin HEAD)');
  assert.deepEqual(tr.outcome, { ok: true, message: 'Done: added hello.txt and a line to the README.' });
  assert.equal(tr.tokens, 2500);
  assert.equal(tr.model, 'claude-sonnet-5-5');
  assert.deepEqual(tr.capabilities, ['interrupt_receipt_v1']);
});

test('max turns ends as a failure with its reason', () => {
  const { tr, drafts } = translate('max-turns.ndjson');
  assert.deepEqual(drafts.map(d => d.t), ['context.read', 'tokens.used']);
  assert.deepEqual(drafts[0].files, ['**/*.md']);
  assert.equal(tr.outcome.ok, false);
  assert.equal(tr.outcome.reason, 'max_turns');
});

test('rate limit: blocked once, quota limited, then the usage limit ends the task', () => {
  const { tr, drafts } = translate('rate-limit.ndjson');
  assert.deepEqual(drafts.map(d => d.t), ['agent.blocked', 'quota.updated', 'tokens.used', 'quota.updated']);
  assert.deepEqual(drafts[0], { t: 'agent.blocked', agent: 'a1', reason: 'quota', detail: 'rate_limit' });
  assert.equal(drafts[1].status, 'limited');
  assert.equal(drafts[3].status, 'exhausted');
  assert.equal(tr.outcome.reason, 'quota');
});

test('a message after a block unblocks the wizard', () => {
  const tr = new ClaudeTranslator({ agent: 'a1', task: 't1', cwd: CWD, account: 'x' });
  tr.push({ type: 'system', subtype: 'api_retry', error: 'authentication_failed' });
  const out = tr.push({ type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }] } });
  assert.deepEqual(out.map(d => d.t), ['agent.unblocked']);
  assert.deepEqual(tr.push({ type: 'system', subtype: 'api_retry', error: 'overloaded' }), [], 'transient errors do not block');
});

test('paths outside the worktree keep their place; repeated tool calls count once', () => {
  const tr = new ClaudeTranslator({ agent: 'a1', task: 't1', cwd: CWD, account: 'x' });
  const msg = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'u1', name: 'Read', input: { file_path: '/etc/hosts' } }] } };
  assert.deepEqual(tr.push(msg)[0].files, ['/etc/hosts']);
  assert.deepEqual(tr.push(msg), []);
});

test('junk lines produce nothing', () => {
  const tr = new ClaudeTranslator({ agent: 'a1', task: 't1', cwd: CWD, account: 'x' });
  for (const m of [null, 42, 'x', {}, { type: 'user' }, { type: 'stream_event' }, { type: 'assistant' }, { type: 'assistant', message: { content: 'x' } }]) {
    assert.deepEqual(tr.push(m), []);
  }
  assert.equal(tr.outcome, null);
});

test('miniDiff stays short', () => {
  const big = Array.from({ length: 500 }, (_, i) => `line ${i}`).join('\n');
  const d = miniDiff('Write', 'big.txt', { content: big });
  assert.ok(d.split('\n').length < 50);
  assert.match(d, /full change is in the final diff/);
});
