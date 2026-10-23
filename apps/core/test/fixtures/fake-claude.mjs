#!/usr/bin/env node
// A fake `claude` for the tests: it answers --version and `auth status`, and in -p mode replays a
// recording from ./claude-code/, applying its Write and Edit calls to the working directory so that
// the worktree really changes. No network, no account, no tokens.
//   FAKE_CLAUDE_SCENARIO   success (default) | max-turns | rate-limit | hang | crash | oracle
//   FAKE_CLAUDE_ORACLE     oracle: a folder whose files are copied into the working directory
//                          (the evals' reference solution), reported as Write calls
//   FAKE_CLAUDE_ARGS_FILE  appends {args, prompt, cwd} per run (JSON Lines)
//   FAKE_CLAUDE_SIGNED_OUT `auth status` exits with 1
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dir = new URL('./claude-code/', import.meta.url);
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (args[0] === '--version') { process.stdout.write('2.1.999 (Claude Code)\n'); process.exit(0); }
if (args[0] === 'auth' && args[1] === 'status') {
  if (process.env.FAKE_CLAUDE_SIGNED_OUT) { process.stdout.write('{"loggedIn":false}\n'); process.exit(1); }
  process.stdout.write('{"loggedIn":true,"authMethod":"claude.ai","email":"someone@example.com"}\n');
  process.exit(0);
}
if (!args.includes('-p')) { process.stderr.write('fake-claude: only -p is supported\n'); process.exit(2); }

const value = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const resume = value('--resume');
const session = resume || value('--session-id');
let prompt = '';
for await (const chunk of process.stdin) prompt += chunk;
if (process.env.FAKE_CLAUDE_ARGS_FILE) {
  fs.appendFileSync(process.env.FAKE_CLAUDE_ARGS_FILE, JSON.stringify({ args, prompt, cwd: process.cwd() }) + '\n');
}

const scenario = resume ? 'resume' : (process.env.FAKE_CLAUDE_SCENARIO || 'success');
if (scenario === 'crash') { process.stderr.write('fake-claude: boom\n'); process.exit(3); }
if (scenario === 'oracle') {
  const src = process.env.FAKE_CLAUDE_ORACLE;
  const files = [];
  const walk = (d, rel = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) walk(path.join(d, e.name), r); else files.push(r);
    }
  };
  walk(src);
  const say = m => process.stdout.write(JSON.stringify(m) + '\n');
  say({ type: 'system', subtype: 'init', cwd: process.cwd(), session_id: session, model: 'oracle', tools: ['Write'] });
  say({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', rateLimitType: 'five_hour', utilization: 0.1, resetsAt: 1761150000 }, session_id: session });
  files.forEach((r, i) => {
    const target = path.join(process.cwd(), r);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const content = fs.readFileSync(path.join(src, r), 'utf8');
    fs.writeFileSync(target, content);
    say({ type: 'assistant', message: { id: `msg_o${i}`, content: [{ type: 'tool_use', id: `toolu_o${i}`, name: 'Write', input: { file_path: target, content } }] }, session_id: session });
  });
  say({ type: 'result', subtype: 'success', is_error: false, num_turns: files.length + 1, duration_ms: 10, result: 'done', session_id: session, total_cost_usd: 0, usage: { input_tokens: 1000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 100 }, permission_denials: [] });
  process.exit(0);
}
const file = scenario === 'hang' ? 'success.ndjson' : `${scenario}.ndjson`;
const cwd = process.cwd();
const lines = fs.readFileSync(new URL(file, dir), 'utf8').split('\n').filter(Boolean)
  .map(l => l.replaceAll('__CWD__', cwd.replaceAll('\\', '\\\\')).replaceAll('__SESSION__', session));

function apply(msg) {
  for (const b of (msg.message && msg.message.content) || []) {
    if (b.type !== 'tool_use') continue;
    const target = b.input.file_path && path.resolve(cwd, b.input.file_path);
    if (b.name === 'Write') fs.writeFileSync(target, b.input.content);
    if (b.name === 'Edit' && fs.existsSync(target)) fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace(b.input.old_string, b.input.new_string));
  }
}

process.stdout.write('\x1b[?1004l');   // stray terminal escape, as some versions print
for (const [i, l] of lines.entries()) {
  const msg = JSON.parse(l);
  if (msg.type === 'assistant') apply(msg);
  process.stdout.write(l + '\n');
  if (scenario === 'hang' && i === 0) await sleep(60 * 60 * 1000);
  await sleep(Number(process.env.FAKE_CLAUDE_DELAY_MS || 2));
}
