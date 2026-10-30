// `codewizards` command line. No network of its own: the only connections are the browser's to
// 127.0.0.1 and whatever the user's own CLIs (claude, git, gh) do.
import crypto from 'node:crypto';
import path from 'node:path';
import { EventStore } from './store.js';
import { startServer } from './server.js';
import { openBrowser } from './open.js';
import { killAll } from './procs.js';
import { dataDir, ensureDir, roomDir } from './paths.js';
import { git, repoRoot, rootCommit } from './git.js';
import { adoptRoomDir } from './rooms/identity.js';
import { Tower } from './rooms/tower.js';
import { run } from './exec.js';
import { which } from './which.js';
import { VERSION } from './version.js';
import { DemoRoom } from './rooms/demo-room.js';
import { ClaudeRoom, DEFAULT_CAPS } from './rooms/claude-room.js';
import { buildPolicy } from './agents/claude-code/policy.js';
import { checkClaude } from './agents/claude-code/check.js';
import { claudeEnv } from './agents/claude-code/env.js';
import { loadRanks } from './router/config.js';

export const HELP = `CodeWizards ${VERSION}: your coding agents as a tower of pixel-art wizards.

Usage
  codewizards [tower] [--port N] [--no-open] [--json] [the serve options]
  codewizards demo   [--port N] [--no-open] [--log] [--json]
  codewizards serve  --repo PATH [--port N] [--no-open] [--json] [--model NAME] [--rank aprendiz|joven|sabio]
                     [--test-command CMD] [--max-turns N] [--timeout-min N] [--max-agents N]
                     [--max-tasks N] [--room-tokens N] [--max-budget-usd N] [--merge | --open-prs]
                     [--record] [--use-api-key] [--no-sandbox] [--ranks FILE] [--effort LEVEL] [--no-plan]
  codewizards doctor
  codewizards --version | --help

  tower   La Torre (also with no command): list your rooms, enter one, or found a new one on a
          repository (existing, or a new one it creates with a first commit), from the browser.
  demo    The room with simulated wizards: no agent CLI, no account, no network.
  serve   Experimental (milestone 3). Claude Code works on a copy of the repository at PATH (a git
          worktree per task); your checkout is not touched. Approving on the blackboard commits the
          change to the task's branch, cw/<task>-<name>; bring it in with git merge, or start
          serve with --merge (fast-forward into your branch) or --open-prs (draft pull request).
          It spends your Claude plan: ANTHROPIC_API_KEY is not passed on unless --use-api-key.
          --record keeps each turn's output (secrets masked) next to the room's log.
          The Archmage picks each spell's rank, model and effort from a table (ranks.json);
          --rank, --model and --effort (low, medium, high, xhigh, max) set the default for every
          spell, the spell book can choose per spell, and --ranks points to another table. Unless a
          rank is chosen, the Archmage first plans the spell into tasks of different ranks (one
          short call to the cheapest model); --no-plan leaves it to the rules.
  doctor  Checks node, git, gh and claude without reading any credentials.

The room opens at http://127.0.0.1:PORT/#token=...: keep that address to yourself.
Data (event logs, worktrees) lives in ${dataDir()}.
`;

const FLAGS = {
  '--port': 'int', '--model': 'str', '--rank': 'str', '--test-command': 'str', '--max-turns': 'int', '--timeout-min': 'int',
  '--max-agents': 'int', '--max-tasks': 'int', '--room-tokens': 'int', '--max-budget-usd': 'num', '--repo': 'str',
  '--no-open': 'bool', '--log': 'bool', '--json': 'bool', '--open-prs': 'bool', '--no-sandbox': 'bool',
  '--merge': 'bool', '--record': 'bool', '--use-api-key': 'bool', '--ranks': 'str', '--effort': 'str', '--no-plan': 'bool',
};

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const [name, inline] = a.split(/=(.*)/s, 2);
    if (name === '--help' || name === '--version') { out[name.slice(2)] = true; continue; }
    const kind = FLAGS[name];
    if (!kind) throw new Error(`unknown option ${name}`);
    const key = name.slice(2);
    if (kind === 'bool') { out[key] = true; continue; }
    const v = inline !== undefined ? inline : argv[++i];
    if (v === undefined) throw new Error(`${name} needs a value`);
    if (kind === 'str') out[key] = v;
    else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || (kind === 'int' && !Number.isInteger(n))) throw new Error(`${name} needs a number`);
      out[key] = n;
    }
  }
  return out;
}

function say(opts, obj, text) {
  if (opts.json) process.stdout.write(JSON.stringify(obj) + '\n');
  else process.stdout.write(text + '\n');
}

async function serveRoom(opts, room, store, tower = null) {
  const srv = await startServer({ room, store, tower, port: opts.port || 0 });
  const mode = room ? room.mode : 'tower';
  const url = room && tower ? `${srv.url}&room=${store.room}` : srv.url;
  say(opts, { event: 'listening', url, room: store ? store.room : null, mode, version: VERSION },
    `CodeWizards ${VERSION} · ${room ? `${room.mode} room "${store.room}"` : 'La Torre'}\n  ${url}\nCtrl+C stops ${room && room.mode === 'demo' ? 'the room' : 'every room and every wizard in it'}.`);
  if (!opts['no-open'] && !openBrowser(url)) process.stdout.write('Open the address above in your browser.\n');
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    if (room) await room.shutdown();
    if (tower) await tower.shutdown();
    killAll();
    await srv.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  return new Promise(() => {});   // runs until a signal
}

async function demo(opts) {
  const id = 'demo';
  const file = opts.log ? path.join(ensureDir(roomDir(id)), 'events.jsonl') : null;
  const store = new EventStore({ room: id, file });
  return serveRoom(opts, new DemoRoom({ store }), store);
}

export function roomIdFor(repo) {
  const slug = path.basename(repo).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'repo';
  return `${slug}-${crypto.createHash('sha256').update(repo).digest('hex').slice(0, 8)}`;
}

// What every Claude Code room of this run shares: the checked CLI, the environment, the rank table,
// the policy and the caps. Checked once, when serve or La Torre starts.
async function claudeSetup(opts) {
  if (opts.merge && opts['open-prs']) throw new Error('--merge and --open-prs do not go together: pick one');
  if (opts.rank && !['aprendiz', 'joven', 'sabio'].includes(opts.rank)) throw new Error('--rank must be aprendiz, joven or sabio');
  const keys = claudeEnv(process.env, { useApiKey: !!opts['use-api-key'] });
  const claude = await checkClaude({ env: keys.env });
  if (!claude.ok) {
    const why = {
      'not-found': 'Claude Code is not installed: see https://code.claude.com/docs (CodeWizards runs your own copy).',
      'windows-shim': 'Found claude.cmd: CodeWizards needs the native claude.exe on Windows (native installer).',
      broken: '`claude --version` failed: check your Claude Code installation.',
      'signed-out': 'Claude Code is not signed in: run `claude` in a terminal and sign in with your own account (or set up your API key in Claude Code).',
    }[claude.problem];
    throw new Error(why);
  }
  const ranks = loadRanks({ file: opts.ranks ? path.resolve(opts.ranks) : null });
  const policy = buildPolicy({ testCommand: opts['test-command'] || null, sandbox: !opts['no-sandbox'] });
  const caps = {
    ...(opts['max-agents'] ? { maxAgents: opts['max-agents'] } : {}),
    ...(opts['max-tasks'] ? { maxTasks: opts['max-tasks'] } : {}),
    ...(opts['max-turns'] ? { maxTurns: opts['max-turns'] } : {}),
    ...(opts['timeout-min'] ? { timeoutMs: opts['timeout-min'] * 60000 } : {}),
    ...(opts['room-tokens'] ? { roomTokens: opts['room-tokens'] } : {}),
    ...(opts['max-budget-usd'] ? { maxBudgetUsd: opts['max-budget-usd'] } : {}),
  };
  return { keys, claude, ranks, policy, caps };
}

// One repository's room: its folder (archived if another repository now lives at that path), its
// log and its ClaudeRoom.
async function openRepoRoom(repoPath, setup, opts, say) {
  const repo = await repoRoot(path.resolve(repoPath)).catch(() => { throw new Error(`${repoPath} is not a git repository`); });
  // A wizard works on a branch made from a commit: an empty repository has nothing to branch from.
  const root = await rootCommit(repo);
  if (!root) {
    throw new Error(`${repo} has no commits yet. Make a first one, for example:\n  git -C "${repo}" commit --allow-empty -m "First commit"\nand start again.`);
  }
  const id = roomIdFor(repo);
  const dir = roomDir(id);
  const { archived } = adoptRoomDir(dir, { repo, root });
  if (archived) say(`A different repository lives at ${repo} now: the previous room was archived to ${archived}.`);
  await git(repo, ['worktree', 'prune']).catch(() => {});   // forget worktrees whose folders are gone
  const store = new EventStore({ room: id, file: path.join(dir, 'events.jsonl') });
  const { keys, claude, ranks, policy, caps } = setup;
  const room = new ClaudeRoom({
    store, repo, dir, bin: claude.bin, policy, caps, ranks: ranks.table, model: opts.model || null, effort: opts.effort || null, rank: opts.rank || null,
    openPrs: !!opts['open-prs'], merge: !!opts.merge, record: !!opts.record, env: keys.env, log: say, planner: opts['no-plan'] ? false : null,
  });
  return { id, room, store, repo };
}

function banner(opts, setup, repo) {
  if (opts.json) return;
  const { keys, claude, ranks, policy, caps } = setup;
  const c = { ...DEFAULT_CAPS, ...caps };
  const approved = opts.merge ? 'committed to its cw/ branch and fast-forwarded into your branch (--merge)'
    : opts['open-prs'] ? 'committed to its cw/ branch, pushed, and opened as a draft pull request (--open-prs)'
      : 'committed to its cw/ branch; bring it in with `git merge` (or use --merge / --open-prs)';
  const billing = keys.removed.length ? `${keys.removed.join(' and ')} set: not passed to Claude Code, so your plan pays (--use-api-key to bill the API).\n`
    : keys.found.length ? `WARNING: --use-api-key: Claude Code bills ${keys.found.join(' and ')} per token, not your plan.\n` : '';
  process.stdout.write(`Claude Code ${claude.version}${repo ? ` · repository ${repo}` : ' · La Torre'}\n` +
    `An approved change is ${approved}.\n` + billing +
    `Archmage: ${ranks.table.planner.enabled && !opts['no-plan'] ? `plans each spell with ${ranks.table.planner.model} into up to ${ranks.table.planner.maxTasks} tasks; ` : ''}` +
    `${['aprendiz', 'joven', 'sabio'].map(r => `${ranks.table.ranks[r].label} → ${opts.model || ranks.table.ranks[r].model} (${opts.effort || ranks.table.ranks[r].effort || 'default'} effort)`).join(', ')}` +
    `${ranks.file ? ` (from ${ranks.file})` : ''}${opts.rank ? `; every spell goes to ${opts.rank}` : ''}.\n` +
    `Caps: ${c.maxAgents} wizards at a time, ${c.maxTasks} tasks, ${c.maxTurns ? `${c.maxTurns} turns` : 'the turns of each rank'} and ${c.timeoutMs / 60000} min per task, ${c.roomTokens} tokens per room.\n` +
    (policy.bash ? (policy.sandboxed ? 'Bash runs in Claude Code\'s sandbox (required to start).\n' : 'WARNING: --no-sandbox: Bash runs without Claude Code\'s sandbox.\n')
      : 'Native Windows: wizards get no Bash (the sandbox needs WSL2).\n'));
}

async function serve(opts) {
  if (!opts.repo) throw new Error('serve needs --repo PATH (a git repository)');
  if (opts.merge && opts['open-prs']) throw new Error('--merge and --open-prs do not go together: pick one');
  const say = line => { if (!opts.json) process.stdout.write(line + '\n'); };
  const repo = await repoRoot(path.resolve(opts.repo)).catch(() => { throw new Error(`${opts.repo} is not a git repository`); });
  if (!(await rootCommit(repo))) {   // the repository first: its problem is the one to fix
    throw new Error(`${repo} has no commits yet. Make a first one, for example:\n  git -C "${repo}" commit --allow-empty -m "First commit"\nand start again.`);
  }
  const setup = await claudeSetup(opts);
  const first = await openRepoRoom(repo, setup, opts, say);
  banner(opts, setup, first.repo);
  const tower = new Tower({ open: repo => openRepoRoom(repo, setup, opts, say) });
  tower.add(first);
  return serveRoom(opts, first.room, first.store, tower);
}

// La Torre: no room yet; the browser lists the rooms and founds new ones.
async function towerMode(opts) {
  const say = line => { if (!opts.json) process.stdout.write(line + '\n'); };
  const setup = await claudeSetup(opts);
  banner(opts, setup, null);
  const tower = new Tower({ open: repo => openRepoRoom(repo, setup, opts, say) });
  return serveRoom(opts, null, null, tower);
}

async function doctor() {
  const line = (name, ok, text) => process.stdout.write(`${ok ? 'ok  ' : 'no  '} ${name.padEnd(7)} ${text}\n`);
  process.stdout.write(`CodeWizards ${VERSION} · doctor (reads no credentials)\n`);
  const major = Number(process.versions.node.split('.')[0]);
  line('node', major >= 22, `v${process.versions.node}${major >= 22 ? '' : ' (needs 22 or newer)'}`);
  const g = which('git') ? await run('git', ['--version'], { timeoutMs: 10000 }) : null;
  line('git', !!g && g.code === 0, g && g.code === 0 ? g.stdout.trim() : 'not found (needed by `serve`)');
  const gh = which('gh') ? await run('gh', ['--version'], { timeoutMs: 10000 }) : null;
  line('gh', !!gh && gh.code === 0, gh && gh.code === 0 ? gh.stdout.split('\n')[0].trim() : 'not found (needed only by --open-prs)');
  const keys = claudeEnv(process.env);
  const c = await checkClaude({ env: keys.env });
  const text = c.ok ? `${c.version}, signed in` : {
    'not-found': 'not found: install Claude Code to use `serve`',
    'windows-shim': 'found claude.cmd: install the native claude.exe',
    broken: '`claude --version` failed',
    'signed-out': `${c.version}, not signed in: run \`claude\` and sign in`,
  }[c.problem];
  line('claude', c.ok, text);
  if (keys.found.length) process.stdout.write(`note    ${keys.found.join(' and ')} set: serve leaves it out so your plan pays (--use-api-key keeps it)\n`);
  process.stdout.write(`data    ${dataDir()}\n`);
  return major >= 22 && !!g && g.code === 0 ? 0 : 1;
}

export async function main(argv) {
  let opts;
  try { opts = parseArgs(argv); } catch (err) { process.stderr.write(`codewizards: ${err.message}\n\n${HELP}`); return 2; }
  if (opts.version) { process.stdout.write(VERSION + '\n'); return 0; }
  const cmd = opts._[0];
  if (opts.help) { process.stdout.write(HELP); return 0; }
  if (!cmd || cmd === 'tower') return towerMode(opts);
  if (cmd === 'demo') return demo(opts);
  if (cmd === 'serve') return serve(opts);
  if (cmd === 'doctor') return doctor();
  process.stderr.write(`codewizards: unknown command ${cmd}\n\n${HELP}`);
  return 2;
}
