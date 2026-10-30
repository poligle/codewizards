// The Archmage v1: rules, your choice, the quota and the estimates; and its table.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { classify, route, estimate } from '../src/router/router.js';
import { defaultRanks, loadRanks, checkRanks } from '../src/router/config.js';
import { configDir } from '../src/paths.js';
import { tmp } from './helpers.js';

const table = defaultRanks();

test('no model name is fixed in the code: the table is data, with Claude Code aliases and an effort', () => {
  assert.deepEqual(['aprendiz', 'joven', 'sabio'].map(r => [table.ranks[r].model, table.ranks[r].effort]),
    [['haiku', 'low'], ['sonnet', 'medium'], ['opus', 'high']]);
  const src = ['router.js', 'config.js'].map(f => fs.readFileSync(new URL(`../src/router/${f}`, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(src, /\b(haiku|sonnet|opus)\b|claude-[a-z]+-\d/, 'model names live only in ranks.default.json');
});

test('rules: small jobs to the Apprentice, big ones to the Grand Sage, the rest to the default rank', () => {
  assert.equal(classify('Fix the typo in the README title', table).rank, 'aprendiz');
  assert.equal(classify('Haz un hello world en C++', table).rank, 'aprendiz');
  assert.equal(classify('Refactor the auth module into services', table).rank, 'sabio');
  assert.equal(classify('Update a.js, b.js, c.py and d.md to the new API', table).rank, 'sabio');
  assert.equal(classify('x'.repeat(700), table).rank, 'sabio');
  const d = classify('Add a dark mode toggle to the settings page', table);
  assert.deepEqual(d, { rank: 'joven', reason: 'default rank' });
  assert.equal(classify('Fix the typo in a.js, b.js', table).rank, 'joven', 'a small word does not make two files small');
});

test('your choice wins; the quota lowers the rank, or makes the task wait', () => {
  assert.equal(route({ text: 'refactor everything', override: 'aprendiz', table }).rank, 'aprendiz');
  const tired = { five_hour: { status: 'ok', utilization: 0.85, resets_at: 9 } };
  const down = route({ text: 'Refactor the parser', table, quota: tired, now: 0 });
  assert.equal(down.rank, 'joven');
  assert.match(down.reason, /85 %: one rank down/);
  assert.equal(route({ text: 'Refactor the parser', override: 'sabio', table, quota: tired, now: 0 }).rank, 'sabio', 'not when you chose');
  const out = route({ text: 'anything', table, quota: { five_hour: { status: 'exhausted', utilization: 1, resets_at: 1234 } }, now: 0 });
  assert.deepEqual(out.wait, { until: 1234, reason: 'the 5-hour window is at 100 %' });
  assert.equal(route({ text: 'anything', table, quota: { five_hour: { status: 'ok', utilization: 0.98, resets_at: null } } }).wait.until, null);
  assert.equal(route({ text: 'anything', table }).wait, null);
  const old = { five_hour: { status: 'exhausted', utilization: 1, resets_at: 1000 } };
  assert.equal(route({ text: 'anything', table, quota: old, now: 5000 }).wait, null, 'a window whose reset time has passed is renewed');
  assert.equal(route({ text: 'Refactor the parser', table, quota: { five_hour: { ...tired.five_hour } }, now: 10 }).rank, 'sabio');
});

test('estimates: the table until three real tasks of a rank, then their median', () => {
  assert.equal(estimate('joven', table, { joven: [10, 20] }), 60000);
  assert.equal(estimate('joven', table, { joven: [30000, 10000, 20000] }), 20000);
  assert.equal(route({ text: 'add a toggle', table, history: { joven: [1, 2, 3, 4] } }).estimate, 3);
});

test('the user\'s table overrides fields, and a broken one says what is wrong', () => {
  const dir = tmp();
  const file = path.join(dir, 'ranks.json');
  fs.writeFileSync(file, JSON.stringify({ ranks: { sabio: { model: 'sonnet' } }, router: { default: 'aprendiz' } }));
  const { table: t, file: used } = loadRanks({ file });
  assert.deepEqual([t.ranks.sabio.model, t.ranks.sabio.maxTurns, t.router.default, used], ['sonnet', 40, 'aprendiz', file]);
  fs.writeFileSync(file, '{ nope');
  assert.throws(() => loadRanks({ file }), /not valid JSON/);
  assert.throws(() => checkRanks({ ...table, ranks: { ...table.ranks, joven: { ...table.ranks.joven, model: 'a b' } } }), /joven.model/);
  assert.equal(loadRanks({ env: { CODEWIZARDS_CONFIG: tmp() } }).file, null, 'no file: the defaults');
});

test('config folder per system', () => {
  assert.equal(configDir({ XDG_CONFIG_HOME: '/x' }, 'linux'), path.join('/x', 'codewizards'));
  assert.match(configDir({ APPDATA: 'C:\\Users\\a\\AppData\\Roaming' }, 'win32'), /CodeWizards$/);
  assert.match(configDir({}, 'darwin'), /Library.Application Support.CodeWizards$/);
});

test('model and effort: the user\'s choice when it is valid, the rank\'s otherwise', () => {
  const r = route({ text: 'add a toggle', model: 'haiku', effort: 'xhigh', table });
  assert.deepEqual([r.rank, r.model, r.effort], ['joven', 'haiku', 'xhigh']);
  const bad = route({ text: 'add a toggle', model: 'nope', effort: 'ultra', table });
  assert.deepEqual([bad.model, bad.effort], ['sonnet', 'medium']);
  assert.equal(route({ text: 'x', model: 'my-model', extraModels: ['my-model'], table }).model, 'my-model', 'one given with --model');
  assert.throws(() => checkRanks({ ...table, ranks: { ...table.ranks, sabio: { ...table.ranks.sabio, effort: 'ultra' } } }), /sabio.effort/);
});

test('the planner\'s plan is checked: ranks known, titles and prompts present, at most its maximum', async () => {
  const { checkPlan, plannerArgs } = await import('../src/router/planner.js');
  const t = checkPlan({ tasks: [{ title: ' A  b ', prompt: 'do a', rank: 'sabio', why: 'hard' }, { title: 'x', prompt: 'y', rank: 'emperor', why: '' },
    { title: '', prompt: 'z', rank: 'joven', why: '' }] }, 4);
  assert.deepEqual(t.map(x => [x.title, x.rank]), [['A b', 'sabio'], ['x', 'joven']]);
  assert.throws(() => checkPlan({ tasks: [] }), /no tasks/);
  assert.equal(checkPlan({ tasks: Array(6).fill({ title: 't', prompt: 'p', rank: 'aprendiz', why: '' }) }, 3).length, 3);
  const a = plannerArgs('haiku');
  assert.ok(a.includes('--system-prompt') && a[a.indexOf('--tools') + 1] === '' && JSON.parse(a[a.indexOf('--json-schema') + 1]).required[0] === 'tasks');
});
