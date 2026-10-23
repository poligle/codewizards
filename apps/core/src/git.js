// Git and GitHub through the user's own `git` and `gh`: CodeWizards stores no token and never sees
// one. Every task gets a branch `cw/<task>-<slug>` and a worktree in the room's data folder, so the
// user's checkout is never touched. Nothing is committed before the user approves the diff.
import { run } from './exec.js';

export async function git(cwd, args, opts = {}) {
  const r = await run('git', args, { cwd, ...opts });
  if (r.code !== 0) {
    const msg = (r.stderr || r.stdout || r.error || '').trim().split('\n').pop() || `exit ${r.code}`;
    throw new Error(`git ${args[0]}: ${msg}`);
  }
  return r.stdout;
}

export async function repoRoot(dir) { return (await git(dir, ['rev-parse', '--show-toplevel'])).trim(); }

/** The files committed at `ref` (read-only explorer). */
export async function listFiles(dir, ref = 'HEAD', max = 5000) {
  return (await git(dir, ['ls-tree', '-r', '--name-only', '-z', ref])).split('\0').filter(Boolean).slice(0, max);
}

/** One committed file, read through git (never the filesystem): text up to `max` bytes, or binary. */
export async function showFile(dir, ref, file, max = 200 * 1024) {
  const size = Number((await git(dir, ['cat-file', '-s', `${ref}:${file}`])).trim());
  if (size > max) return { size, binary: false, truncated: true, content: '' };
  const content = await git(dir, ['show', `${ref}:${file}`]);
  const binary = content.slice(0, 8000).includes('\0');
  return { size, binary, truncated: false, content: binary ? '' : content };
}

/** The repository's first commit, or null when it has no commits yet. */
export async function rootCommit(dir) {
  const r = await run('git', ['rev-list', '--max-parents=0', 'HEAD'], { cwd: dir });
  return r.code === 0 && r.stdout.trim() ? r.stdout.trim().split('\n')[0] : null;
}
export async function head(dir) { return (await git(dir, ['rev-parse', 'HEAD'])).trim(); }

/** Name of the checked-out branch, or null when HEAD is detached. */
export async function currentBranch(dir) {
  const b = (await git(dir, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
  return b && b !== 'HEAD' ? b : null;
}

export function branchName(task, title) {
  const slug = String(title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'task';
  return `cw/${task}-${slug}`;
}

export async function addWorktree(repo, dir, branch, base) {
  await git(repo, ['worktree', 'add', '-q', '-b', branch, dir, base]);
}

export async function removeWorktree(repo, dir) {
  await git(repo, ['worktree', 'remove', '--force', dir]);
}

/** Everything the agent changed against `base` (commits and working tree, new files included). */
// Claude Code keeps personal approvals in .claude/settings.local.json (it git-ignores it itself);
// it never goes into a wizard's commit, even if a repository lacks the ignore rule.
const ADD = ['add', '-A', '--', '.', ':(exclude).claude/settings.local.json'];

export async function diffAgainst(wt, base, maxBytes = 200000) {
  await git(wt, ADD);
  const out = await git(wt, ['diff', '--cached', '--no-color', '--no-ext-diff', base]);
  return out.length > maxBytes ? out.slice(0, maxBytes) + '\n… (diff truncated; the full change is on the branch)' : out;
}

/** Commits whatever is pending in the worktree. Returns false when there was nothing to commit. */
export async function commitAll(wt, message) {
  await git(wt, ADD);
  if ((await run('git', ['diff', '--cached', '--quiet'], { cwd: wt })).code === 0) return false;   // nothing staged
  await git(wt, ['commit', '-q', '-m', message]);
  return true;
}

/** Brings a task branch into the branch checked out in the user's repo, only as a fast-forward:
 *  git itself refuses if the branch moved meanwhile or if it would overwrite local changes. */
export async function mergeFastForward(repo, branch) {
  await git(repo, ['merge', '--ff-only', '--quiet', branch]);
}

export async function pushBranch(wt, branch) {
  await git(wt, ['push', '-q', '-u', 'origin', branch], { timeoutMs: 120000 });
}

export function prArgs({ branch, base, title, body }) {
  const a = ['pr', 'create', '--draft', '--head', branch, '--title', title, '--body', body];
  if (base) a.push('--base', base);
  return a;
}

/** Opens a draft pull request with the user's `gh`. Returns its URL. */
export async function openPr(wt, opts) {
  const r = await run('gh', prArgs(opts), { cwd: wt, timeoutMs: 120000 });
  if (r.code !== 0) throw new Error('gh pr create: ' + ((r.stderr || r.error || '').trim().split('\n').pop() || `exit ${r.code}`));
  return r.stdout.trim().split('\n').pop();
}
