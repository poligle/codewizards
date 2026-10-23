import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { addWorktree, branchName, commitAll, currentBranch, diffAgainst, head, prArgs, removeWorktree, repoRoot } from '../src/git.js';
import { makeRepo, tmp } from './helpers.js';

test('branch names are short, ASCII and prefixed', () => {
  assert.equal(branchName('t3', 'Añade un modo oscuro a la página de ajustes!!'), 'cw/t3-anade-un-modo-oscuro-a-la-pagina-de-ajus');
  assert.equal(branchName('t1', '¿¿??'), 'cw/t1-task');
});

test('a task works in its own worktree; the user checkout is untouched until approval', async () => {
  const { dir, git } = makeRepo();
  // .native: on Windows git and the temp folder may disagree on short (RUNNER~1) and long names.
  assert.equal(fs.realpathSync.native(await repoRoot(path.join(dir, 'src'))), fs.realpathSync.native(dir));
  const base = await head(dir);
  assert.equal(await currentBranch(dir), 'main');
  const wt = path.join(tmp(), 'wt');
  await addWorktree(dir, wt, 'cw/t1-hello', base);
  fs.writeFileSync(path.join(wt, 'hello.txt'), 'hi\n');
  fs.appendFileSync(path.join(wt, 'README.md'), 'more\n');
  const diff = await diffAgainst(wt, base);
  assert.match(diff, /\+\+\+ b\/hello\.txt/);
  assert.match(diff, /\+more/);
  assert.equal(git('status', '--porcelain'), '', 'the main checkout did not change');
  assert.equal(await commitAll(wt, 'Add hello'), true);
  assert.equal(await commitAll(wt, 'Nothing'), false);
  assert.match(await diffAgainst(wt, base), /hello\.txt/, 'the diff against the base survives the commit');
  await removeWorktree(dir, wt);
  assert.ok(!fs.existsSync(wt));
  assert.match(git('log', '--oneline', 'cw/t1-hello'), /Add hello/);
  assert.equal(git('rev-parse', 'main').trim(), base, 'main did not move');
});

test('Claude Code\'s personal settings never go into a wizard\'s commit', async () => {
  const { dir, git } = makeRepo();
  const base = await head(dir);
  const wt = path.join(tmp(), 'wt');
  await addWorktree(dir, wt, 'cw/t1-x', base);
  fs.mkdirSync(path.join(wt, '.claude'));
  fs.writeFileSync(path.join(wt, '.claude', 'settings.local.json'), '{"permissions":{}}\n');
  assert.equal(await commitAll(wt, 'Only local settings'), false, 'nothing to commit when that is all there is');
  fs.writeFileSync(path.join(wt, 'a.txt'), 'a\n');
  assert.equal(await commitAll(wt, 'Add a'), true);
  assert.deepEqual(git('show', '--name-only', '--format=', 'cw/t1-x').trim().split('\n'), ['a.txt']);
  assert.doesNotMatch(await diffAgainst(wt, base), /settings\.local\.json/);
});

test('pull request arguments: draft, head, title and body as separate arguments', () => {
  const a = prArgs({ branch: 'cw/t1-x', base: 'main', title: 'A "title"; rm -rf /', body: 'b' });
  assert.deepEqual(a, ['pr', 'create', '--draft', '--head', 'cw/t1-x', '--title', 'A "title"; rm -rf /', '--body', 'b', '--base', 'main']);
});
