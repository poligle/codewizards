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

test('success: quota, reads, writes, a denied and a run command, tokens', () => {
  const { tr, drafts } = translate('success.ndjson');
  assert.deepEqual(drafts.map(d => d.t), ['quota.updated', 'context.read', 'code.write', 'code.write', 'command.denied', 'command.run', 'tokens.used']);
  assert.deepEqual(drafts[0], { t: 'quota.updated', account: 'claude-code', status: 'ok', window: 'five_hour', utilization: 0.12, resets_at: 1761150000000 });
  assert.deepEqual(drafts[1].files, ['README.md', 'src']);
  assert.equal(drafts[2].file, 'hello.txt');
  assert.match(drafts[2].diff, /^@@ hello\.txt \(whole file\) @@\n\+Hello from the wizard/);
  assert.equal(drafts[3].file, 'README.md');
  assert.match(drafts[3].diff, /-# demo\n\+# demo/);
  assert.deepEqual(drafts[4], { t: 'command.denied', agent: 'a1', tool: 'Bash', command: 'git push origin HEAD' });
  assert.deepEqual(drafts[5], { t: 'command.run', agent: 'a1', command: 'npm test', failed: false }, 'an OS "Permission denied" in the output is not a refusal');
  assert.deepEqual(drafts[6], { t: 'tokens.used', agent: 'a1', account: 'claude-code', input: 2190, output: 310, cache: 6600, cost_usd: 0.0123 });
  assert.deepEqual([tr.turns, tr.durationMs], [4, 4200]);
  assert.deepEqual(tr.quota.five_hour, { status: 'ok', utilization: 0.12, resets_at: 1761150000000 });
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

test('rate limit: blocked once, the window reported as used up, the turn ends for quota', () => {
  const { tr, drafts } = translate('rate-limit.ndjson');
  assert.deepEqual(drafts.map(d => d.t), ['agent.blocked', 'quota.updated', 'quota.updated', 'tokens.used', 'quota.updated']);
  assert.deepEqual(drafts[0], { t: 'agent.blocked', agent: 'a1', reason: 'quota', detail: 'rate_limit' });
  assert.equal(drafts[1].status, 'limited');
  assert.deepEqual(drafts[2], { t: 'quota.updated', account: 'claude-code', status: 'exhausted', window: 'five_hour', utilization: 1, resets_at: 1761150000000 });
  assert.equal(drafts[4].status, 'exhausted');
  assert.equal(tr.outcome.reason, 'quota');
});

test('newer rate_limit_event: one update per window, the main one with the reported status', () => {
  const { drafts } = translate('resume.ndjson');
  const q = drafts.filter(d => d.t === 'quota.updated');
  assert.deepEqual(q, [
    { t: 'quota.updated', account: 'claude-code', status: 'limited', window: 'five_hour', utilization: 0.91, resets_at: 1761150000000 },
    { t: 'quota.updated', account: 'claude-code', status: 'ok', window: 'seven_day', utilization: 0.35, resets_at: 1761600000000 },
  ]);
});

test('rate_limit_event odds and ends: percentages, milliseconds, missing fields', () => {
  const tr = new ClaudeTranslator({ agent: 'a1', task: 't1', cwd: CWD, account: 'x' });
  const [a] = tr.push({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', rateLimitType: 'five_hour', utilization: 42, resetsAt: 1761150000000 } });
  assert.deepEqual([a.utilization, a.resets_at], [0.42, 1761150000000]);
  const [b] = tr.push({ type: 'rate_limit_event', rate_limit_info: { status: 'weird' } });
  assert.deepEqual(b, { t: 'quota.updated', account: 'x', status: 'unknown', utilization: null, resets_at: null });
  assert.deepEqual(tr.push({ type: 'rate_limit_event' }), []);
  for (const d of [a, b]) assert.deepEqual(validate(d, { draft: true }), []);
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

test('a Claude Code too old for the model gets a message that says what to do', () => {
  const tr = new ClaudeTranslator({ agent: 'a1', task: 't1', cwd: CWD, account: 'x' });
  tr.push({ type: 'result', subtype: 'success', is_error: true, result: "API Error: 400 Claude Code 2.1.223 does not support this model; version 2.1.280 or newer is required. Run 'claude update', or update the Claude desktop app, then try again.", usage: {} });
  assert.equal(tr.outcome.ok, false);
  assert.match(tr.outcome.message, /Your Claude Code \(2\.1\.223\) is too old for this model: it needs 2\.1\.280 or newer/);
  assert.match(tr.outcome.message, /alias \(haiku, sonnet, opus\)/);
});
