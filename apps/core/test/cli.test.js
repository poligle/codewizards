import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs, roomIdFor } from '../src/cli.js';
import { tmp } from './helpers.js';

const BIN = fileURLToPath(new URL('../bin/codewizards.js', import.meta.url));

test('parseArgs: flags, values and errors', () => {
  assert.deepEqual(parseArgs(['serve', '--repo', '.', '--max-turns=5', '--open-prs']), { _: ['serve'], repo: '.', 'max-turns': 5, 'open-prs': true });
  assert.throws(() => parseArgs(['demo', '--bogus']), /unknown option/);
  assert.throws(() => parseArgs(['serve', '--max-turns', 'many']), /needs a number/);
  assert.throws(() => parseArgs(['serve', '--repo']), /needs a value/);
});

test('serve refuses --merge with --open-prs before touching anything', () => {
  let err = null;
  try { execFileSync(process.execPath, [BIN, 'serve', '--repo', tmp(), '--merge', '--open-prs'], { stdio: 'pipe', encoding: 'utf8' }); } catch (e) { err = e; }
  assert.equal(err && err.status, 1);
  assert.match(err.stderr, /do not go together/);
  assert.deepEqual(parseArgs(['serve', '--repo', '.', '--merge', '--record', '--use-api-key']), { _: ['serve'], repo: '.', merge: true, record: true, 'use-api-key': true });
});

test('room ids are readable and stable per repository path', () => {
  assert.match(roomIdFor('/home/pol/My Repo'), /^my-repo-[0-9a-f]{8}$/);
  assert.equal(roomIdFor('/a/b'), roomIdFor('/a/b'));
  assert.notEqual(roomIdFor('/a/b'), roomIdFor('/c/b'));
});

test('--version and an unknown command', () => {
  assert.match(execFileSync(process.execPath, [BIN, '--version'], { encoding: 'utf8' }), /^\d+\.\d+\.\d+\n$/);
  assert.throws(() => execFileSync(process.execPath, [BIN, 'fly'], { stdio: 'pipe' }), e => e.status === 2);
});

test('demo --json prints where the room is, then serves it until stopped', async () => {
  const child = spawn(process.execPath, [BIN, 'demo', '--no-open', '--json'], { env: { ...process.env, CODEWIZARDS_HOME: tmp() } });
  const line = await new Promise((resolve, reject) => {
    let out = '';
    child.stdout.on('data', d => { out += d; if (out.includes('\n')) resolve(out.split('\n')[0]); });
    child.on('error', reject);
    setTimeout(() => reject(new Error('no output')), 10000);
  });
  const info = JSON.parse(line);
  assert.equal(info.event, 'listening');
  assert.equal(info.mode, 'demo');
  assert.match(info.url, /^http:\/\/127\.0\.0\.1:\d+\/#token=/);
  const res = await fetch(info.url.split('#')[0]);
  assert.equal(res.status, 200);
  child.kill('SIGTERM');
  await new Promise(r => child.on('exit', r));
});
