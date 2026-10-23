// The Claude Code room end to end with the fake CLI: worktree, turn, blackboard, approval,
// rejection with resume, failures, caps and stop. Real git, no network, no account.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventStore } from '../src/store.js';
import { ClaudeRoom } from '../src/rooms/claude-room.js';
import { buildPolicy } from '../src/agents/claude-code/policy.js';
import { FAKE_CLAUDE, makeRepo, tmp, waitFor } from './helpers.js';

function setup(extra = {}) {
  const repo = makeRepo();
  const dir = tmp('cw-room-');
  const store = new EventStore({ room: 'test-room', file: path.join(dir, 'events.jsonl') });
  const argsFile = path.join(dir, 'args.jsonl');
  const env = { ...process.env, FAKE_CLAUDE_DELAY_MS: '1', FAKE_CLAUDE_ARGS_FILE: argsFile, ...(extra.env || {}) };
  const room = new ClaudeRoom({ store, repo: repo.dir, dir, bin: FAKE_CLAUDE, policy: buildPolicy({ platform: 'linux' }), env, caps: extra.caps });
  const types = () => store.events.map(e => e.t);
  const has = (t, pred = () => true) => store.events.find(e => e.t === t && pred(e));
  const runs = () => (fs.existsSync(argsFile) ? fs.readFileSync(argsFile, 'utf8').trim().split('\n').map(l => JSON.parse(l)) : []);
  return { repo, dir, store, room, types, has, runs };
}

test('cast → wizard works in a worktree → blackboard → approve → commit on the task branch', async () => {
  const { repo, room, store, types, has, runs } = setup();
  room.cast('Add a greeting file');
  await waitFor(() => has('review.requested'), { what: 'review' });
  const art = has('artifact.present');
  assert.equal(art.artifact, 'cw/t1-add-a-greeting-file');
  assert.match(art.diff, /\+Hello from the wizard/);
  assert.match(art.diff, /Now with a greeting/);
  assert.deepEqual(types().slice(0, 4), ['room.opened', 'task.created', 'agent.summoned', 'agent.assigned']);
  assert.ok(has('code.write', e => e.file === 'hello.txt'));
  assert.ok(has('agent.error', e => /Permission denied: Bash/.test(e.message)));
  assert.equal(repo.git('status', '--porcelain'), '', 'nothing touches the user checkout before approval');
  const run = runs()[0];
  assert.equal(run.prompt, 'Add a greeting file');
  assert.ok(run.args.includes('dontAsk') && run.args.includes('--settings'));
  await room.handle({ cmd: 'approve', task: 't1' });
  const done = has('task.done');
  assert.deepEqual([done.result, done.branch, done.pr], ['ok', 'cw/t1-add-a-greeting-file', undefined]);
  assert.equal(types().at(-1), 'agent.idle');
  assert.match(repo.git('log', '--format=%s', '-1', 'cw/t1-add-a-greeting-file'), /Add a greeting file/);
  assert.match(repo.git('show', 'cw/t1-add-a-greeting-file:hello.txt'), /Hello from the wizard/);
  assert.equal(repo.git('rev-list', '--count', 'main').trim(), '1', 'main is untouched');
  assert.ok(store.events.every(e => e.seq > 0), 'every event went through the store');
});

test('reject → the same session resumes with the comment → back to the blackboard', async () => {
  const { room, has, runs, store } = setup();
  room.cast('Add a greeting file');
  await waitFor(() => has('review.requested'), { what: 'first review' });
  room.handle({ cmd: 'reject', task: 't1', comment: 'Say it is revised' });
  await waitFor(() => store.events.filter(e => e.t === 'review.requested').length === 2, { what: 'second review' });
  const [first, second] = runs();
  const sid = first.args[first.args.indexOf('--session-id') + 1];
  assert.equal(second.args[second.args.indexOf('--resume') + 1], sid, 'resumes the same Claude Code session');
  assert.match(second.prompt, /Say it is revised/);
  const arts = store.events.filter(e => e.t === 'artifact.present');
  assert.match(arts[1].diff, /revised/);
  assert.ok(has('review.rejected', e => e.comment === 'Say it is revised'));
});

test('failures end the task with a reason: max turns and quota', async () => {
  const a = setup({ env: { FAKE_CLAUDE_SCENARIO: 'max-turns' } });
  a.room.cast('Explore');
  const f = await waitFor(() => a.has('task.failed'), { what: 'max-turns failure' });
  assert.equal(f.reason, 'max_turns');
  const b = setup({ env: { FAKE_CLAUDE_SCENARIO: 'rate-limit' } });
  b.room.cast('Explore');
  const g = await waitFor(() => b.has('task.failed'), { what: 'quota failure' });
  assert.equal(g.reason, 'quota');
  assert.ok(b.has('agent.blocked', e => e.reason === 'quota'));
  assert.ok(b.has('quota.updated', e => e.status === 'exhausted'));
});

test('caps: timeout, crash without result, room tokens, task count', async () => {
  const t = setup({ env: { FAKE_CLAUDE_SCENARIO: 'hang' }, caps: { timeoutMs: 400 } });
  t.room.cast('Hang');
  assert.equal((await waitFor(() => t.has('task.failed'), { what: 'timeout' })).reason, 'timeout');
  const c = setup({ env: { FAKE_CLAUDE_SCENARIO: 'crash' } });
  c.room.cast('Crash');
  const cf = await waitFor(() => c.has('task.failed'), { what: 'crash' });
  assert.equal(cf.reason, 'error');
  assert.match(cf.message, /without a result.*boom/);
  const k = setup({ caps: { roomTokens: 100, maxTasks: 2 } });
  k.room.cast('One');
  await waitFor(() => k.has('review.requested'), { what: 'first task' });
  k.room.cast('Two');
  assert.equal(k.has('task.failed', e => e.task === 't2').reason, 'cap', 'the room token cap stops new tasks');
  assert.equal(k.has('task.failed', e => e.task === 't2').agent, undefined, 'no wizard was summoned for it');
});

test('stop cancels a running wizard; outside the demo there is no auto-approval', async () => {
  const s = setup({ env: { FAKE_CLAUDE_SCENARIO: 'hang' } });
  s.room.cast('Long');
  await waitFor(() => s.has('agent.assigned'), { what: 'assigned' });
  await new Promise(r => setTimeout(r, 150));
  s.room.handle({ cmd: 'auto', on: true });
  s.room.handle({ cmd: 'stop', task: 't1' });
  const c = await waitFor(() => s.has('task.cancelled'), { what: 'cancelled' });
  assert.equal(c.by, 'user');
  assert.ok(!s.has('review.approved'));
  assert.deepEqual(s.room.hello(), { mode: 'claude-code', autoApprove: false });
});

test('a restarted room continues the ids of its log', async () => {
  const { room, store, repo, dir } = setup();
  room.cast('First');
  await waitFor(() => store.events.some(e => e.t === 'review.requested'), { what: 'review' });
  const again = new ClaudeRoom({ store: new EventStore({ room: 'test-room', file: path.join(dir, 'events.jsonl') }), repo: repo.dir, dir, bin: FAKE_CLAUDE });
  assert.equal(again.taskSeq, 1);
  assert.equal(again.agentSeq, 1);
});
