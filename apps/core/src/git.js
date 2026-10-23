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
export async function diffAgainst(wt, base, maxBytes = 200000) {
  await git(wt, ['add', '-A']);
  const out = await git(wt, ['diff', '--cached', '--no-color', '--no-ext-diff', base]);
  return out.length > maxBytes ? out.slice(0, maxBytes) + '\n… (diff truncated; the full change is on the branch)' : out;
}

/** Commits whatever is pending in the worktree. Returns false when there was nothing to commit. */
export async function commitAll(wt, message) {
  await git(wt, ['add', '-A']);
  if (!(await git(wt, ['status', '--porcelain'])).trim()) return false;
  await git(wt, ['commit', '-q', '-m', message]);
  return true;
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
