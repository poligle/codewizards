import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runClaude } from '../src/agents/claude-code/runner.js';
import { checkClaude } from '../src/agents/claude-code/check.js';
import { FAKE_CLAUDE, tmp } from './helpers.js';

const SESSION = '00000000-0000-4000-8000-00000000abcd';
const env = extra => ({ ...process.env, FAKE_CLAUDE_DELAY_MS: '1', ...extra });

test('streams parsed messages (terminal escapes stripped) and passes the prompt through stdin only', async () => {
  const cwd = tmp();
  fs.writeFileSync(path.join(cwd, 'README.md'), '# demo\n');
  const argsFile = path.join(tmp(), 'args.jsonl');
  const prompt = 'Add a greeting; then `rm -rf /` "quoted" $(not run)';
  const seen = [];
  const run = runClaude({ bin: FAKE_CLAUDE, args: ['-p', '--session-id', SESSION], cwd, env: env({ FAKE_CLAUDE_ARGS_FILE: argsFile }), prompt, onMessage: m => seen.push(m.type) });
  const exit = await run.done;
  assert.equal(exit.code, 0);
  assert.equal(exit.killedFor, null);
  assert.equal(seen[0], 'system');
  assert.equal(seen.at(-1), 'result');
  const rec = JSON.parse(fs.readFileSync(argsFile, 'utf8').trim());
  assert.equal(rec.prompt, prompt);
  assert.ok(!rec.args.some(a => a.includes('greeting')), 'the prompt never travels as an argument');
  assert.equal(fs.readFileSync(path.join(cwd, 'hello.txt'), 'utf8'), 'Hello from the wizard\n');
});

test('timeout stops the whole process and says so', async () => {
  const run = runClaude({ bin: FAKE_CLAUDE, args: ['-p', '--session-id', SESSION], cwd: tmp(), env: env({ FAKE_CLAUDE_SCENARIO: 'hang' }), prompt: 'x', timeoutMs: 400 });
  const exit = await run.done;
  assert.equal(exit.killedFor, 'timeout');
});

test('stop() cancels a running turn', async () => {
  const run = runClaude({ bin: FAKE_CLAUDE, args: ['-p', '--session-id', SESSION], cwd: tmp(), env: env({ FAKE_CLAUDE_SCENARIO: 'hang' }), prompt: 'x' });
  setTimeout(() => run.stop(), 200);
  const exit = await run.done;
  assert.equal(exit.killedFor, 'cancel');
});

test('a crash is reported with the end of stderr', async () => {
  const run = runClaude({ bin: FAKE_CLAUDE, args: ['-p', '--session-id', SESSION], cwd: tmp(), env: env({ FAKE_CLAUDE_SCENARIO: 'crash' }), prompt: 'x' });
  const exit = await run.done;
  assert.equal(exit.code, 3);
  assert.match(exit.stderrTail, /boom/);
});

test('a missing binary is an error, not a hang', async () => {
  const run = runClaude({ bin: path.join(tmp(), 'no-such-claude'), args: ['-p'], cwd: tmp(), prompt: 'x' });
  const exit = await run.done;
  assert.equal(exit.code, null);
  assert.match(exit.stderrTail, /ENOENT/);
});

test('checkClaude keeps only exit codes: version and signed in or out', async () => {
  const ok = await checkClaude({ env: { ...process.env, CW_CLAUDE_BIN: FAKE_CLAUDE } });
  assert.deepEqual(ok, { ok: true, bin: FAKE_CLAUDE, version: '2.1.999 (Claude Code)', signedIn: true, problem: null });
  assert.ok(!JSON.stringify(ok).includes('@'), 'the account e-mail is never kept');
  const out = await checkClaude({ env: { ...process.env, CW_CLAUDE_BIN: FAKE_CLAUDE, FAKE_CLAUDE_SIGNED_OUT: '1' } });
  assert.equal(out.problem, 'signed-out');
  const none = await checkClaude({ env: { PATH: tmp() } });
  assert.equal(none.problem, 'not-found');
  const shim = await checkClaude({ env: { CW_CLAUDE_BIN: 'C:\\npm\\claude.cmd' }, platform: 'win32' });
  assert.equal(shim.problem, 'windows-shim');
});
