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
  const room = new ClaudeRoom({ store, repo: repo.dir, dir, bin: FAKE_CLAUDE, policy: buildPolicy({ platform: 'linux' }), env, caps: extra.caps, ...(extra.room || {}) });
  const types = () => store.events.map(e => e.t);
  const has = (t, pred = () => true) => store.events.find(e => e.t === t && pred(e));
  const runs = () => (fs.existsSync(argsFile) ? fs.readFileSync(argsFile, 'utf8').trim().split('\n').map(l => JSON.parse(l)) : []);
  return { repo, dir, store, room, types, has, runs };
}

test('cast → wizard works in a worktree → blackboard → approve → commit on the task branch', async () => {
  const { repo, room, store, types, has, runs, dir } = setup();
  fs.mkdirSync(path.join(dir, 'worktrees', 't1', 'junk'), { recursive: true });   // a leftover from an older session
  room.cast('Add a greeting file');
  await waitFor(() => has('review.requested'), { what: 'review' });
  const art = has('artifact.present');
  assert.equal(art.artifact, 'cw/t1-add-a-greeting-file');
  assert.match(art.diff, /\+Hello from the wizard/);
  assert.match(art.diff, /Now with a greeting/);
  assert.deepEqual(types().slice(0, 4), ['room.opened', 'task.created', 'agent.summoned', 'agent.assigned']);
  assert.equal(has('agent.summoned').model, 'claude-sonnet-5-5', 'the wizard carries the model Claude Code reports at start');
  assert.ok(has('code.write', e => e.file === 'hello.txt'));
  assert.ok(has('command.denied', e => e.tool === 'Bash' && e.command === 'git push origin HEAD'));
  assert.ok(has('command.run', e => e.command === 'npm test'));
  assert.ok(!has('agent.error'), 'a refused command is not an error of the wizard');
  const created = has('task.created');
  assert.deepEqual([created.rank, created.reason, created.estimate], ['joven', 'default rank', 60000], 'the Archmage picks the default rank');
  assert.equal(has('agent.summoned').rank, 'joven');
  assert.ok(has('quota.updated', e => e.window === 'five_hour'), 'the quota Claude Code reports reaches the room');
  assert.equal(repo.git('status', '--porcelain'), '', 'nothing touches the user checkout before approval');
  const run = runs()[0];
  assert.equal(run.prompt, 'Add a greeting file');
  assert.ok(run.args.includes('dontAsk') && run.args.includes('--settings'));
  assert.deepEqual([run.args[run.args.indexOf('--model') + 1], run.args[run.args.indexOf('--effort') + 1], run.args[run.args.indexOf('--max-turns') + 1]],
    ['sonnet', 'medium', '30'], 'model, effort and turns come from the rank table');
  assert.match(run.args[run.args.indexOf('--append-system-prompt') + 1], /keep the diff focused/, 'with the rank\'s note');
  await room.handle({ cmd: 'approve', task: 't1' });
  const done = has('task.done');
  assert.deepEqual([done.result, done.branch, done.pr], ['ok', 'cw/t1-add-a-greeting-file', undefined]);
  assert.equal(types().at(-1), 'agent.idle');
  assert.match(repo.git('log', '--format=%s', '-1', 'cw/t1-add-a-greeting-file'), /Add a greeting file/);
  assert.match(repo.git('show', 'cw/t1-add-a-greeting-file:hello.txt'), /Hello from the wizard/);
  assert.equal(repo.git('rev-list', '--count', 'main').trim(), '1', 'main is untouched');
  assert.ok(store.events.every(e => e.seq > 0), 'every event went through the store');
});

test('a data folder reached through a link still gives paths relative to the worktree', async () => {
  // macOS: os.tmpdir() is under /var, a link to /private/var, and the CLI reports real paths.
  // A directory junction does the same on Windows without admin rights.
  const real = tmp('cw-real-');
  const link = path.join(tmp('cw-link-'), 'data');
  fs.symlinkSync(real, link, 'junction');
  const repo = makeRepo();
  const store = new EventStore({ room: 'linked' });
  const room = new ClaudeRoom({
    store, repo: repo.dir, dir: link, bin: FAKE_CLAUDE, policy: buildPolicy({ platform: 'linux' }), env: { ...process.env, FAKE_CLAUDE_DELAY_MS: '1' },
  });
  room.cast('Add a greeting file');
  await waitFor(() => store.events.some(e => e.t === 'review.requested'), { what: 'review' });
  const files = store.events.filter(e => e.t === 'code.write').map(e => e.file);
  assert.deepEqual(files, ['hello.txt', 'README.md']);
  assert.deepEqual(store.events.find(e => e.t === 'context.read').files, ['README.md', 'src']);
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
});

test('out of quota in the middle of the work: the wizard waits, then resumes the same session', async () => {
  const b = setup({ env: { FAKE_CLAUDE_SCENARIO: 'rate-limit' }, caps: { quotaWaitMs: 300 } });
  b.room.cast('Explore');
  await waitFor(() => b.has('agent.blocked', e => e.reason === 'quota' && e.until), { what: 'waiting for quota' });
  assert.ok(!b.has('task.failed'), 'it does not give up');
  await waitFor(() => b.has('review.requested'), { what: 'resumed after the wait' });
  assert.ok(b.has('agent.unblocked'));
  const [first, second] = b.runs();
  assert.equal(second.args[second.args.indexOf('--resume') + 1], first.args[first.args.indexOf('--session-id') + 1]);
  assert.match(second.prompt, /usage limit has reset/);
});

test('the Archmage: your choice wins, and a used-up window makes the wizard wait before starting', async () => {
  const a = setup();
  a.room.cast('Add a greeting file', 'aprendiz');
  await waitFor(() => a.has('review.requested'), { what: 'review' });
  assert.equal(a.has('task.created').reason, 'chosen by you');
  const r = a.runs()[0];
  assert.deepEqual([r.args[r.args.indexOf('--model') + 1], r.args[r.args.indexOf('--effort') + 1], r.args[r.args.indexOf('--max-turns') + 1]], ['haiku', 'low', '15']);
  const p = setup({ caps: { quotaWaitMs: 300 } });
  p.room.quota.five_hour = { status: 'exhausted', utilization: 1, resets_at: null };
  p.room.cast('Add a greeting file');
  await waitFor(() => p.has('agent.blocked'), { what: 'blocked before starting' });
  assert.equal(p.runs().length, 0, 'no tokens are spent while the window is used up');
  assert.deepEqual(p.types().slice(0, 5), ['room.opened', 'task.created', 'agent.summoned', 'agent.assigned', 'agent.blocked']);
  p.room.quota = {};
  await waitFor(() => p.has('review.requested'), { what: 'runs after the wait' });
});

test('the merge button: an approved change on its branch reaches the user\'s branch, once', async () => {
  const { repo, room, has } = setup();
  room.cast('Add a greeting file');
  await waitFor(() => has('review.requested'), { what: 'review' });
  await room.handle({ cmd: 'approve', task: 't1' });
  assert.equal(has('task.done').result, 'ok');
  assert.throws(() => repo.git('show', 'main:hello.txt'));
  await room.handle({ cmd: 'merge', task: 't1' });
  assert.deepEqual(has('task.merged'), { ...has('task.merged'), t: 'task.merged', task: 't1', branch: 'cw/t1-add-a-greeting-file' });
  assert.match(repo.git('show', 'main:hello.txt'), /Hello from the wizard/);
  await assert.rejects(room.handle({ cmd: 'merge', task: 't1' }), /only an approved task/);
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
  assert.equal(cf.agent, undefined, 'a CLI that never started has no wizard in the room');
  assert.ok(!c.has('agent.summoned'));
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
  const h = s.room.hello();
  assert.deepEqual([h.mode, h.autoApprove, h.merge, h.accounts], ['claude-code', false, false, [{ id: 'claude-code', guild: 'anthropic', label: 'Claude Code' }]]);
  assert.deepEqual(h.ranks.joven, { label: 'Mago Joven', model: 'sonnet', effort: 'medium' });
  assert.deepEqual(h.models, ['haiku', 'sonnet', 'opus']);
});

test('a restarted room continues the ids of its log', async () => {
  const { room, store, repo, dir } = setup();
  room.cast('First');
  await waitFor(() => store.events.some(e => e.t === 'review.requested'), { what: 'review' });
  const again = new ClaudeRoom({ store: new EventStore({ room: 'test-room', file: path.join(dir, 'events.jsonl') }), repo: repo.dir, dir, bin: FAKE_CLAUDE });
  assert.equal(again.taskSeq, 1);
  assert.equal(again.agentSeq, 1);
});

test('--merge: approval fast-forwards the user\'s branch to the task branch', async () => {
  const { repo, room, has } = setup({ room: { merge: true } });
  room.cast('Add a greeting file');
  await waitFor(() => has('review.requested'), { what: 'review' });
  await room.handle({ cmd: 'approve', task: 't1' });
  assert.deepEqual([has('task.done').result, has('task.done').branch], ['merged', 'cw/t1-add-a-greeting-file']);
  assert.match(repo.git('show', 'main:hello.txt'), /Hello from the wizard/);
  assert.equal(fs.readFileSync(path.join(repo.dir, 'hello.txt'), 'utf8').replace(/\r\n/g, '\n'), 'Hello from the wizard\n', 'the file is in the user\'s checkout');
  assert.equal(repo.git('rev-parse', 'main').trim(), repo.git('rev-parse', 'cw/t1-add-a-greeting-file').trim());
});

test('--merge never forces: if the user\'s branch moved, the change stays on its branch', async () => {
  const { repo, room, has } = setup({ room: { merge: true } });
  room.cast('Add a greeting file');
  await waitFor(() => has('review.requested'), { what: 'review' });
  fs.writeFileSync(path.join(repo.dir, 'NOTES.md'), 'mine\n');
  repo.git('add', 'NOTES.md');
  repo.git('commit', '-q', '-m', 'meanwhile');
  await room.handle({ cmd: 'approve', task: 't1' });
  assert.equal(has('task.done').result, 'ok');
  assert.match(has('agent.error', e => /^Not merged/.test(e.message)).message, /cw\/t1-add-a-greeting-file/);
  assert.throws(() => repo.git('show', 'main:hello.txt'), 'main keeps the user\'s own commit only');
  assert.match(repo.git('show', 'cw/t1-add-a-greeting-file:hello.txt'), /Hello from the wizard/);
});

test('--merge and --open-prs do not go together', () => {
  assert.throws(() => setup({ room: { merge: true, openPrs: true } }), /do not go together/);
});

test('--record keeps each turn\'s output as JSON Lines, owner-only', async () => {
  const lines = [];
  const { dir, room, has } = setup({ room: { record: true, log: l => lines.push(l) } });
  room.cast('Add a greeting file');
  await waitFor(() => has('review.requested'), { what: 'review' });
  const file = path.join(fs.realpathSync.native(dir), 'tasks', 't1', 'turn-1.ndjson');
  const recorded = fs.readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  assert.deepEqual([recorded[0].type, recorded[0].subtype, recorded.at(-1).type], ['system', 'init', 'result']);
  if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.ok(lines.some(l => l.includes('turn-1.ndjson')), 'the user is told where it is');
});

test('the spell book picks model and effort per spell; the user\'s effort variable cannot override it', async () => {
  const a = setup({ env: { CLAUDE_CODE_EFFORT_LEVEL: 'low' } });
  a.room.handle({ cmd: 'cast', text: 'Add a greeting file', rank: 'aprendiz', model: 'opus', effort: 'max' });
  await waitFor(() => a.has('review.requested'), { what: 'review' });
  const r = a.runs()[0];
  assert.deepEqual([r.args[r.args.indexOf('--model') + 1], r.args[r.args.indexOf('--effort') + 1]], ['opus', 'max']);
  assert.match(a.has('task.created').reason, /model chosen by you · effort chosen by you/);
  assert.equal(a.has('agent.summoned').effort, 'max');
  const b = setup();
  b.room.cast('Add a greeting file', { model: 'gpt-9000' });
  await waitFor(() => b.has('review.requested'), { what: 'review' });
  assert.equal(b.runs()[0].args[b.runs()[0].args.indexOf('--model') + 1], 'sonnet', 'a model outside the table is ignored');
});

test('«Por hacer»: the room\'s notes are kept next to its log', async () => {
  const { room, dir } = setup();
  await room.handle({ cmd: 'notes', text: '- add a dark mode\n- fix the login' });
  assert.equal(room.hello().notes, '- add a dark mode\n- fix the login');
  const again = new ClaudeRoom({ store: new EventStore({ room: 'test-room' }), repo: room.repo, dir, bin: FAKE_CLAUDE });
  assert.match(again.hello().notes, /fix the login/);
  if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(fs.realpathSync.native(dir), 'notes.md')).mode & 0o777, 0o600);
});
