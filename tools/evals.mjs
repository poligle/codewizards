// CodeWizards evals (step 3): does a configuration of the Archmage save quota without losing quality?
// Each task in evals/tasks/<id>/ has a small repository (repo/), hidden tests (check/) that the
// wizard never sees, and a reference solution (solution/). A run copies the repository, lets the
// real Claude Code work on it through the same ClaudeRoom as `codewizards serve`, then copies the
// hidden tests in and runs them. Every run is one JSON line; the summary is a Markdown table.
//
//   node tools/evals.mjs --self-check                       the bank: tests fail before, pass with the solution
//   node tools/evals.mjs --routing                          the Archmage's rules against each task's label (no tokens)
//   node tools/evals.mjs --configs haiku,sonnet --tasks pilot
//   options: --tasks pilot|all|id,id  --configs a,b (evals/configs.json)  --stop-at 0.85 (5-hour window)
//            --max-runs N  --out DIR (evals/results)  --bin PATH (claude)  --oracle (CI: a fake agent
//            that applies the reference solution, so the pipeline is tested without tokens)
//
// It spends your Claude plan: see evals/README.md before a real run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EventStore } from '../apps/core/src/store.js';
import { ClaudeRoom } from '../apps/core/src/rooms/claude-room.js';
import { buildPolicy } from '../apps/core/src/agents/claude-code/policy.js';
import { findClaude } from '../apps/core/src/agents/claude-code/check.js';
import { claudeEnv } from '../apps/core/src/agents/claude-code/env.js';
import { loadRanks } from '../apps/core/src/router/config.js';
import { classify } from '../apps/core/src/router/router.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TASKS = path.join(ROOT, 'evals', 'tasks');
const FAKE = path.join(ROOT, 'apps', 'core', 'test', 'fixtures', 'fake-claude.mjs');

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

export function listTasks(sel = 'all') {
  const all = fs.readdirSync(TASKS).filter(d => fs.existsSync(path.join(TASKS, d, 'task.json'))).sort()
    .map(d => ({ ...JSON.parse(fs.readFileSync(path.join(TASKS, d, 'task.json'), 'utf8')), dir: path.join(TASKS, d) }));
  if (sel === 'all') return all;
  if (sel === 'pilot') return all.filter(t => t.pilot);
  const ids = new Set(sel.split(','));
  return all.filter(t => ids.has(t.id));
}

function copyTree(src, dst) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyTree(s, d); } else fs.copyFileSync(s, d);
  }
}

function freshRepo(task) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cw-eval-${task.id}-`));
  copyTree(path.join(task.dir, 'repo'), dir);
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'CodeWizards evals');
  git('config', 'user.email', 'evals@codewizards.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.autocrlf', 'false');
  git('add', '-A');
  git('commit', '-q', '-m', 'task');
  return dir;
}

/** Copies the hidden tests into `dir` and runs them. */
export function runCheck(task, dir) {
  fs.mkdirSync(path.join(dir, '.cw-check'), { recursive: true });
  copyTree(path.join(task.dir, 'check'), path.join(dir, '.cw-check'));
  const [cmd, ...args] = task.check;
  const r = spawnSync(cmd === 'node' ? process.execPath : cmd, args, { cwd: dir, encoding: 'utf8', timeout: 120000 });
  return { pass: r.status === 0, tail: `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-5).join('\n') };
}

function selfCheck(tasks) {
  let bad = 0;
  for (const t of tasks) {
    const before = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-eval-sc-'));
    copyTree(path.join(t.dir, 'repo'), before);
    const fails = !runCheck(t, before).pass;
    const after = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-eval-sc-'));
    copyTree(path.join(t.dir, 'repo'), after);
    copyTree(path.join(t.dir, 'solution'), after);
    const r = runCheck(t, after);
    const ok = fails && r.pass;
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${t.id.padEnd(20)} ${t.difficulty.padEnd(9)} hidden tests ${fails ? 'fail' : 'PASS'} before, ${r.pass ? 'pass' : 'FAIL'} with the solution${ok ? '' : '\n' + r.tail}`);
  }
  console.log(`${tasks.length - bad}/${tasks.length} tasks are valid`);
  return bad ? 1 : 0;
}

// How often the rules give each task the rank it is labelled with (the label is the cheapest rank
// expected to solve it; the real answer comes from running the configs).
function routing(tasks) {
  const table = loadRanks().table;
  const order = ['aprendiz', 'joven', 'sabio'];
  const grid = Object.fromEntries(order.map(r => [r, Object.fromEntries(order.map(c => [c, 0]))]));
  let hit = 0;
  for (const t of tasks) {
    const { rank, reason } = classify(t.prompt, table);
    grid[t.difficulty][rank]++;
    if (rank === t.difficulty) hit++;
    console.log(`${rank === t.difficulty ? '✓' : '·'} ${t.id.padEnd(20)} label ${t.difficulty.padEnd(9)} rules ${rank.padEnd(9)} (${reason})`);
  }
  console.log(`\n| Label \\ rules | ${order.join(' | ')} |\n| --- | --- | --- | --- |`);
  for (const r of order) console.log(`| ${r} | ${order.map(c => grid[r][c]).join(' | ')} |`);
  console.log(`\n${hit}/${tasks.length} tasks get their label (${Math.round(hit / tasks.length * 100)} %)`);
  return 0;
}

const until = (fn, ms) => new Promise((resolve, reject) => {
  const end = Date.now() + ms;
  const tick = () => { const v = fn(); if (v) resolve(v); else if (Date.now() > end) reject(new Error('timed out')); else setTimeout(tick, 200); };
  tick();
});

async function runOne(task, name, config, base) {
  const repo = freshRepo(task);
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-eval-data-'));
  const store = new EventStore({ room: `eval-${task.id}` });
  const table = structuredClone(base.table);
  if (config.noNote) for (const r of Object.keys(table.ranks)) table.ranks[r].note = '';
  const env = { ...base.env, ...(base.oracle ? { FAKE_CLAUDE_SCENARIO: 'oracle', FAKE_CLAUDE_ORACLE: path.join(task.dir, 'solution'), FAKE_CLAUDE_DELAY_MS: '1' } : {}) };
  const room = new ClaudeRoom({
    store, repo, dir: data, bin: base.bin, ranks: table, model: config.model || null, rank: config.rank || null, record: true, env,
    policy: buildPolicy({ testCommand: task.testCommand }), caps: { maxAgents: 1, timeoutMs: 15 * 60000, maxWaits: 0 },
  });
  const quotaBefore = base.quota;
  const t0 = Date.now();
  room.cast(task.prompt, config.router ? null : (config.rank || null));
  let outcome = 'review';
  try {
    await until(() => store.events.find(e => ['review.requested', 'task.failed', 'agent.blocked'].includes(e.t)), 16 * 60000);
  } catch { outcome = 'timeout'; }
  const end = store.events.find(e => ['review.requested', 'task.failed', 'agent.blocked'].includes(e.t));
  if (end && end.t === 'task.failed') outcome = `failed:${end.reason}`;
  if (end && end.t === 'agent.blocked') outcome = 'quota';
  const task1 = room.tasks.get('t1');
  const check = outcome === 'review' ? runCheck(task, task1.wt) : { pass: false, tail: '' };
  await room.shutdown();
  const used = store.events.filter(e => e.t === 'tokens.used');
  const sum = k => used.reduce((a, e) => a + (e[k] || 0), 0);
  const q = store.events.filter(e => e.t === 'quota.updated' && (e.window === 'five_hour' || !e.window) && typeof e.utilization === 'number').at(-1);
  if (q) base.quota = q.utilization;
  let turns = null;
  try {
    const rec = fs.readFileSync(path.join(fs.realpathSync.native(data), 'tasks', 't1', 'turn-1.ndjson'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
    turns = (rec.find(m => m.type === 'result') || {}).num_turns ?? null;
  } catch { /* no recording: the CLI never ran */ }
  const created = store.events.find(e => e.t === 'task.created') || {};
  const summoned = store.events.find(e => e.t === 'agent.summoned') || {};
  return {
    at: new Date().toISOString(), config: name, task: task.id, difficulty: task.difficulty, rank: created.rank, model: summoned.model || null,
    outcome, pass: check.pass, input: sum('input'), output: sum('output'), cache: sum('cache'),
    cost_usd: Math.round(used.reduce((a, e) => a + (e.cost_usd || 0), 0) * 10000) / 10000,
    turns, seconds: Math.round((Date.now() - t0) / 1000),
    five_hour_before: quotaBefore, five_hour_after: q ? q.utilization : null,
  };
}

function summary(rows) {
  const by = new Map();
  for (const r of rows) (by.get(r.config) || by.set(r.config, []).get(r.config)).push(r);
  const avg = (xs, f) => { const v = xs.map(f).filter(x => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const fmt = (x, d = 0) => (x === null ? '—' : x.toFixed(d));
  const lines = ['| Config | Runs | Pass | Input + output | Cache read | 5 h window used | Turns | Seconds |', '| --- | --- | --- | --- | --- | --- | --- | --- |'];
  for (const [name, rs] of by) {
    const delta = avg(rs, r => (typeof r.five_hour_before === 'number' && typeof r.five_hour_after === 'number' ? (r.five_hour_after - r.five_hour_before) * 100 : null));
    lines.push(`| ${name} | ${rs.length} | ${rs.filter(r => r.pass).length}/${rs.length} | ${fmt(avg(rs, r => r.input + r.output))} | ${fmt(avg(rs, r => r.cache))} | ${delta === null ? '—' : `${delta.toFixed(1)} pts per task`} | ${fmt(avg(rs, r => r.turns), 1)} | ${fmt(avg(rs, r => r.seconds))} |`);
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const tasks = listTasks(opt('--tasks', 'all'));
  if (!tasks.length) { console.error('no tasks match --tasks'); return 2; }
  if (flag('--self-check')) return selfCheck(tasks);
  if (flag('--routing')) return routing(tasks);
  const configs = JSON.parse(fs.readFileSync(path.join(ROOT, 'evals', 'configs.json'), 'utf8')).configs;
  const names = opt('--configs', 'sonnet').split(',');
  for (const n of names) if (!configs[n]) { console.error(`unknown config ${n} (see evals/configs.json)`); return 2; }
  const oracle = flag('--oracle');
  const bin = oracle ? FAKE : (opt('--bin', null) || findClaude());
  if (!bin) { console.error('Claude Code is not installed (or use --bin)'); return 2; }
  const stopAt = Number(opt('--stop-at', '0.85'));
  const maxRuns = Number(opt('--max-runs', '1000'));
  const outDir = path.resolve(opt('--out', path.join(ROOT, 'evals', 'results')));
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = path.join(outDir, `${stamp}.jsonl`);
  const base = { bin, oracle, env: claudeEnv(process.env).env, table: loadRanks().table, quota: null };
  const rows = [];
  console.log(`${oracle ? 'Oracle (fake agent)' : `Claude Code at ${bin}`} · ${tasks.length} tasks × ${names.length} configs → ${out}`);
  outer: for (const n of names) {
    for (const t of tasks) {
      if (rows.length >= maxRuns) break outer;
      if (typeof base.quota === 'number' && base.quota >= stopAt) { console.log(`Stopping: the 5-hour window is at ${Math.round(base.quota * 100)} % (--stop-at ${stopAt}).`); break outer; }
      const r = await runOne(t, n, configs[n], base);
      rows.push(r);
      fs.appendFileSync(out, JSON.stringify(r) + '\n');
      console.log(`${r.pass ? '✓' : '✗'} ${n.padEnd(10)} ${t.id.padEnd(20)} ${String(r.rank).padEnd(9)} ${String(r.model).padEnd(18)} ${r.outcome.padEnd(14)} ${r.input + r.output} tok · ${r.seconds} s${r.five_hour_after !== null ? ` · 5 h ${Math.round(r.five_hour_after * 100)} %` : ''}`);
      if (r.outcome === 'quota' || r.outcome === 'failed:quota') { console.log('Out of quota: stopping.'); break outer; }
    }
  }
  const md = summary(rows);
  fs.writeFileSync(out.replace(/\.jsonl$/, '.md'), `# Evals ${stamp}\n\n${md}`);
  console.log('\n' + md);
  return oracle && rows.some(r => !r.pass) ? 1 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
