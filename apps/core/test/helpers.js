// Shared helpers for the core tests.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const FAKE_CLAUDE = fileURLToPath(new URL('./fixtures/fake-claude.mjs', import.meta.url));
export const FIXTURES = fileURLToPath(new URL('./fixtures/claude-code/', import.meta.url));

export function tmp(prefix = 'cw-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** A throw-away git repository with one commit (README.md and src/app.js). */
export function makeRepo() {
  const dir = tmp('cw-repo-');
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Test Wizard');
  git('config', 'user.email', 'wizard@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(dir, 'README.md'), '# demo\n');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'app.js'), 'export const greet = () => "hi";\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'init');
  return { dir, git: (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }) };
}

/** Lines of a recording with its placeholders filled in, parsed. */
export function recording(name, cwd = '/work/repo', session = '00000000-0000-4000-8000-00000000abcd') {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8').split('\n').filter(Boolean)
    .map(l => JSON.parse(l.replaceAll('__CWD__', cwd.replaceAll('\\', '\\\\')).replaceAll('__SESSION__', session)));
}

export async function waitFor(fn, { timeoutMs = 10000, stepMs = 20, what = 'condition' } = {}) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise(r => setTimeout(r, stepMs));
  }
}
