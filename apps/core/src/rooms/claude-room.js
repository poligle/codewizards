// A room bound to one git repository where Claude Code does the work (milestone 3 material).
// One spell = one task for now (the Archmage's split arrives with step 3). Each task gets a branch
// and a worktree; the wizard's turn runs headless; the diff goes to the blackboard; approval
// commits it (and, with --open-prs, pushes and opens a draft PR with the user's own `gh`);
// a rejection resumes the same Claude Code session with the reviewer's comment.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { addWorktree, branchName, commitAll, currentBranch, diffAgainst, head, openPr, pushBranch, removeWorktree } from '../git.js';
import { ensureDir } from '../paths.js';
import { buildPolicy, claudeArgs, systemNote } from '../agents/claude-code/policy.js';
import { ClaudeTranslator } from '../agents/claude-code/translate.js';
import { runClaude } from '../agents/claude-code/runner.js';

// Provisional caps; step 3 calibrates them with measurements.
export const DEFAULT_CAPS = Object.freeze({
  maxAgents: 2, maxTasks: 20, maxTurns: 40, timeoutMs: 30 * 60000, roomTokens: 2000000, maxBudgetUsd: null,
});

const short = (s, n) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
const message = err => String((err && err.message) || err);
// The real path of a folder. A CLI reports the files it touches under its real working directory
// (macOS: /var is /private/var; Windows: long names, not RUNNER~1), so the worktrees live under it.
const realDir = p => { try { return fs.realpathSync.native(p); } catch { return p; } };

export class ClaudeRoom {
  /**
   * @param {{store: import('../store.js').EventStore, repo: string, dir: string, bin: string,
   *   policy?: ReturnType<typeof buildPolicy>, caps?: Partial<typeof DEFAULT_CAPS>, account?: string,
   *   model?: string|null, rank?: 'aprendiz'|'sabio', openPrs?: boolean, env?: NodeJS.ProcessEnv,
   *   now?: () => number}} o
   */
  constructor({ store, repo, dir, bin, policy = buildPolicy(), caps = {}, account = 'claude-code', model = null, rank = 'sabio', openPrs = false, env = process.env, now = () => Date.now() }) {
    Object.assign(this, { store, repo, dir: realDir(dir), bin, policy, account, model, rank, openPrs, env, now });
    this.caps = { ...DEFAULT_CAPS, ...caps };
    this.tasks = new Map();
    this.queue = [];
    this.running = 0;
    this.started = 0;
    this.tokensUsed = 0;
    this.closing = false;
    this.opened = store.events.some(e => e.t === 'room.opened');
    // Ids go on after the ones already in the log: a restarted room never reuses them.
    this.taskSeq = 0;
    this.agentSeq = 0;
    for (const e of store.events) {
      const tn = /^t(\d+)$/.exec(e.task || '');
      if (tn) this.taskSeq = Math.max(this.taskSeq, Number(tn[1]));
      const an = /^a(\d+)$/.exec(e.agent || '');
      if (an) this.agentSeq = Math.max(this.agentSeq, Number(an[1]));
    }
  }

  get mode() { return 'claude-code'; }
  hello() { return { mode: 'claude-code', autoApprove: false }; }

  emit(draft) { return this.store.append({ ts: this.now(), ...draft }); }

  async handle(cmd) {
    switch (cmd.cmd) {
      case 'cast': return this.cast(cmd.text);
      case 'approve': return this.approve(cmd.task);
      case 'reject': return this.reject(cmd.task, cmd.comment);
      case 'stop': return this.stop(cmd.task);
      default: return undefined;   // no auto-approval and no speed outside the demo
    }
  }

  cast(text) {
    if (this.closing) return null;
    if (!this.opened) {
      this.opened = true;
      this.emit({ t: 'room.opened', project: path.basename(this.repo).slice(0, 120), guild: 'anthropic' });
    }
    const id = 't' + (++this.taskSeq);
    const title = short(text, 120) || 'Untitled spell';
    this.emit({ t: 'task.created', task: id, title, estimate: null });
    const task = {
      id, title, prompt: String(text), state: 'queued', agent: null, sessionId: randomUUID(), branch: null, wt: null, base: null, baseBranch: null, run: null,
    };
    this.tasks.set(id, task);
    if (this.tokensUsed >= this.caps.roomTokens) {
      this.fail(task, 'cap', `This room has used ${this.tokensUsed} tokens and its cap is ${this.caps.roomTokens}: restart with a higher --room-tokens to go on.`);
      return task;
    }
    if (this.started >= this.caps.maxTasks) {
      this.fail(task, 'cap', `This session already started ${this.caps.maxTasks} tasks (--max-tasks).`);
      return task;
    }
    this.started++;
    this.queue.push({ task, prompt: task.prompt, resume: false });
    this.pump();
    return task;
  }

  pump() {
    while (!this.closing && this.running < this.caps.maxAgents && this.queue.length) {
      const job = this.queue.shift();
      this.running++;
      this.exec(job).finally(() => { this.running--; this.pump(); });
    }
  }

  async exec(job) {
    const { task } = job;
    try {
      if (!job.resume) await this.prepare(task);
      if (task.state === 'cancelled') return;
      await this.turn(task, job.prompt, job.resume);
    } catch (err) {
      if (task.state !== 'cancelled') this.fail(task, 'error', message(err));
    }
  }

  async prepare(task) {
    task.agent = 'a' + (++this.agentSeq);
    this.emit({ t: 'agent.summoned', agent: task.agent, guild: 'anthropic', rank: this.rank, model: this.model || 'default', account: this.account });
    task.base = await head(this.repo);
    task.baseBranch = await currentBranch(this.repo);
    task.branch = branchName(task.id, task.title);
    task.wt = path.join(this.dir, 'worktrees', task.id);
    ensureDir(path.dirname(task.wt));
    await addWorktree(this.repo, task.wt, task.branch, task.base);
    this.emit({ t: 'agent.assigned', agent: task.agent, task: task.id });
  }

  settingsFile(task) {
    if (!this.policy.settings) return null;
    const file = path.join(ensureDir(path.join(this.dir, 'tasks', task.id)), 'claude-settings.json');
    fs.writeFileSync(file, JSON.stringify(this.policy.settings, null, 2) + '\n', { mode: 0o600 });
    return file;
  }

  async turn(task, prompt, resume) {
    task.state = 'running';
    const tr = new ClaudeTranslator({ agent: task.agent, task: task.id, cwd: task.wt, account: this.account });
    const args = claudeArgs({
      sessionId: task.sessionId, resume, policy: this.policy, model: this.model, maxTurns: this.caps.maxTurns,
      maxBudgetUsd: this.caps.maxBudgetUsd, settingsFile: this.settingsFile(task), note: systemNote(task.branch),
    });
    const run = runClaude({
      bin: this.bin, args, cwd: task.wt, env: this.env, prompt, timeoutMs: this.caps.timeoutMs,
      onMessage: msg => { for (const d of tr.push(msg)) this.emit(d); },
    });
    task.run = run;
    const exit = await run.done;
    task.run = null;
    this.tokensUsed += tr.tokens;
    if (exit.killedFor === 'cancel') return this.cancelled(task, 'user');
    if (exit.killedFor === 'timeout') return this.fail(task, 'timeout', `No result after ${Math.round(this.caps.timeoutMs / 60000)} min: the wizard was stopped.`);
    const out = tr.outcome;
    if (!out) return this.fail(task, 'error', `Claude Code ended (${exit.code ?? exit.signal ?? 'no exit code'}) without a result.${exit.stderrTail ? ' ' + exit.stderrTail : ''}`);
    if (!out.ok) return this.fail(task, out.reason, out.message);
    const diff = await diffAgainst(task.wt, task.base);
    this.emit({ t: 'artifact.present', agent: task.agent, task: task.id, artifact: task.branch, diff: diff.trim() ? diff : '(no changes)' });
    task.state = 'review';
    this.emit({ t: 'review.requested', agent: task.agent, task: task.id });
    return undefined;
  }

  async approve(id) {
    const task = this.tasks.get(id);
    if (!task || task.state !== 'review') return;
    task.state = 'approving';
    this.emit({ t: 'review.approved', agent: task.agent, task: id, comment: '' });
    try {
      await commitAll(task.wt, `${task.title}\n\nCast in CodeWizards with Claude Code and approved on the blackboard.`);
      const changed = (await diffAgainst(task.wt, task.base)).trim().length > 0;
      let pr = null;
      if (changed && this.openPrs) {
        await pushBranch(task.wt, task.branch);
        const quoted = task.prompt.slice(0, 1500).replace(/\n/g, '\n> ');
        pr = await openPr(task.wt, { branch: task.branch, base: task.baseBranch, title: task.title, body: `Cast in CodeWizards and approved on the blackboard.\n\nSpell:\n\n> ${quoted}` });
      }
      task.state = 'done';
      this.emit({ t: 'task.done', agent: task.agent, task: id, result: changed ? 'ok' : 'no-changes', branch: task.branch, ...(pr ? { pr: pr.slice(0, 500) } : {}) });
      this.emit({ t: 'agent.idle', agent: task.agent });
      await removeWorktree(this.repo, task.wt).catch(() => {});
    } catch (err) {
      task.state = 'review';
      this.emit({ t: 'agent.error', agent: task.agent, message: `Approval did not finish: ${message(err)}` });
      this.emit({ t: 'review.requested', agent: task.agent, task: id });
    }
  }

  reject(id, comment) {
    const task = this.tasks.get(id);
    if (!task || task.state !== 'review') return;
    const c = String(comment || '').trim().slice(0, 2000) || 'Please revise the change.';
    this.emit({ t: 'review.rejected', agent: task.agent, task: id, comment: c });
    task.state = 'queued';
    this.queue.push({ task, resume: true, prompt: `The reviewer rejected your change with this comment:\n\n${c}\n\nPlease address it in the same worktree.` });
    this.pump();
  }

  stop(id) {
    const task = this.tasks.get(id);
    if (!task || ['done', 'failed', 'cancelled', 'approving'].includes(task.state)) return;
    if (task.run) { task.run.stop(); return; }   // turn() reports the cancellation when it ends
    this.queue = this.queue.filter(j => j.task !== task);
    this.cancelled(task, 'user');
  }

  fail(task, reason, msg) {
    task.state = 'failed';
    this.emit({ t: 'task.failed', task: task.id, ...(task.agent ? { agent: task.agent } : {}), reason, message: String(msg).slice(0, 2000) });
    if (task.agent) this.emit({ t: 'agent.idle', agent: task.agent });
  }

  cancelled(task, by) {
    task.state = 'cancelled';
    this.emit({ t: 'task.cancelled', task: task.id, ...(task.agent ? { agent: task.agent } : {}), by });
    if (task.agent) this.emit({ t: 'agent.idle', agent: task.agent });
  }

  async shutdown() {
    this.closing = true;
    const runs = [...this.tasks.values()].filter(t => t.run).map(t => { t.run.stop(); return t.run.done; });
    await Promise.allSettled(runs);
  }
}
