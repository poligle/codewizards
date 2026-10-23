// Contract v1: the validator accepts the documented shapes and rejects the rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, EVENTS, EVENT_TYPES, VERSION, GUILDS, RANKS } from '../contract.js';

const base = { v: VERSION, seq: 1, ts: 1761130000000, room: 'demo' };

test('every event type has a spec and the guild list holds the six makers', () => {
  assert.equal(EVENT_TYPES.length, Object.keys(EVENTS).length);
  assert.deepEqual([...GUILDS], ['anthropic', 'openai', 'google', 'deepseek', 'qwen', 'meta']);
});

test('a well-formed event is valid', () => {
  const ev = { ...base, t: 'agent.summoned', agent: 'a1', guild: 'anthropic', rank: 'sabio', model: 'default', account: 'claude-code' };
  assert.deepEqual(validate(ev), []);
});

test('optional and nullable fields', () => {
  assert.deepEqual(validate({ ...base, t: 'task.created', task: 't1', title: 'x', estimate: null }), []);
  assert.deepEqual(validate({ ...base, t: 'context.read', agent: 'a1', files: ['a.js'] }), []);
  assert.deepEqual(validate({ ...base, t: 'task.failed', task: 't1', reason: 'cap', message: 'Room token cap reached' }), []);
  assert.deepEqual(validate({ ...base, t: 'task.done', agent: 'a1', task: 't1', result: 'ok', branch: 'cw/t1-x' }), []);
});

test('envelope errors: version, seq, ts and room', () => {
  const ev = { v: 0, t: 'agent.idle', seq: 0, ts: -1, room: 'no spaces', agent: 'a1' };
  const errs = validate(ev).join(' | ');
  for (const k of ['v:', 'seq:', 'ts:', 'room:']) assert.match(errs, new RegExp(k.replace('.', '\\.')));
});

test('drafts may omit the stamped envelope but nothing else', () => {
  assert.deepEqual(validate({ t: 'agent.idle', agent: 'a1' }, { draft: true }), []);
  assert.match(validate({ t: 'agent.idle' }, { draft: true }).join(), /agent: missing/);
});

test('unknown types, unknown fields and wrong types are rejected', () => {
  assert.match(validate({ ...base, t: 'agent.dance', agent: 'a1' }).join(), /unknown type/);
  assert.match(validate({ ...base, t: 'agent.idle', agent: 'a1', extra: 1 }).join(), /unknown field/);
  assert.match(validate({ ...base, t: 'tokens.used', agent: 'a1', account: 'x', input: '3', output: 1, cache: 0, cost_usd: null }).join(), /input: not an integer/);
  assert.match(validate({ ...base, t: 'agent.summoned', agent: 'a1', guild: 'Google!', rank: 'sabio', model: 'm', account: 'x' }).join(), /guild: bad format/);
  assert.match(validate({ ...base, t: 'agent.blocked', agent: 'a1', reason: 'coffee' }).join(), /reason: not one of/);
  assert.match(validate({ ...base, t: 'code.write', agent: 'a1', file: 'a', diff: 'x'.repeat(70000) }).join(), /diff: longer than/);
  assert.deepEqual(validate(null), ['event: not an object']);
  assert.match(validate({ ...base, t: '__proto__' }).join(), /unknown type/);
});

test('v2 adds the Young Mage, the router\'s choice, quota windows, commands and merges', () => {
  assert.equal(VERSION, 2);
  assert.deepEqual([...RANKS], ['aprendiz', 'joven', 'sabio', 'archimago']);
  const ok = evs => evs.forEach(e => assert.deepEqual(validate({ ...base, v: 2, ...e }), [], e.t));
  ok([
    { t: 'task.created', task: 't1', title: 'x', estimate: 30000, rank: 'joven', reason: 'default rank' },
    { t: 'quota.updated', account: 'claude-code', status: 'ok', window: 'five_hour', utilization: 0.42, resets_at: 1761150000000 },
    { t: 'command.run', agent: 'a1', command: 'npm test', failed: false },
    { t: 'command.denied', agent: 'a1', tool: 'Bash', command: 'git push' },
    { t: 'task.merged', task: 't1', branch: 'cw/t1-x' },
    { t: 'agent.blocked', agent: 'a1', reason: 'quota', detail: 'five_hour', until: 1761150000000 },
  ]);
  assert.match(validate({ ...base, t: 'quota.updated', account: 'x', status: 'ok', utilization: 1.5 }).join(), /utilization: above 1/);
  assert.match(validate({ ...base, t: 'command.run', agent: 'a1', command: 'x', failed: 'no' }).join(), /failed: not a boolean/);
  assert.match(validate({ ...base, t: 'task.created', task: 't1', title: 'x', estimate: null, rank: 'emperor' }).join(), /rank: not one of/);
});

test('logs written with v1 still replay', () => {
  assert.deepEqual(validate({ ...base, v: 1, t: 'agent.idle', agent: 'a1' }), []);
  assert.match(validate({ ...base, v: 3, t: 'agent.idle', agent: 'a1' }).join(), /v: not one of/);
});
