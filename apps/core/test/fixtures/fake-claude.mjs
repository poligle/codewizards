#!/usr/bin/env node
// A fake `claude` for the tests: it answers --version and `auth status`, and in -p mode replays a
// recording from ./claude-code/, applying its Write and Edit calls to the working directory so that
// the worktree really changes. No network, no account, no tokens.
//   FAKE_CLAUDE_SCENARIO   success (default) | max-turns | rate-limit | hang | crash
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
const file = scenario === 'hang' ? 'success.ndjson' : `${scenario}.ndjson`;
const cwd = process.cwd();
const lines = fs.readFileSync(new URL(file, dir), 'utf8').split('\n').filter(Boolean)
  .map(l => l.replaceAll('__CWD__', cwd.replaceAll('\\', '\\\\')).replaceAll('__SESSION__', session));

function apply(msg) {
  for (const b of (msg.message && msg.message.content) || []) {
    if (b.type !== 'tool_use') continue;
    const target = b.input.file_path && path.resolve(cwd, b.input.file_path);
    if (b.name === 'Write') fs.writeFileSync(target, b.input.content);
    if (b.name === 'Edit') fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace(b.input.old_string, b.input.new_string));
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
