// A room bound to one git repository where Claude Code does the work.
// The Archmage (router/router.js) reads each spell and picks the rank, model, turns and note; the
// task gets a branch and a worktree; the wizard walks in when Claude Code starts and reports its
// real model; the diff goes to the blackboard. Approval commits it to the task branch; it reaches
// the user's branch with --merge, with the blackboard's merge button (both fast-forward only) or as
// a draft PR with --open-prs. A rejection resumes the same session with the comment. A wizard that
// runs out of quota does not leave: it waits for the window to reset and then carries on.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { addWorktree, branchName, commitAll, commitOf, currentBranch, diffAgainst, head, listFiles, mergeFastForward, openPr, pushBranch, removeWorktree, showFile } from '../git.js';
import { ensureDir } from '../paths.js';
import { redact } from '../redact.js';
import { buildPolicy, claudeArgs, systemNote } from '../agents/claude-code/policy.js';
import { ClaudeTranslator } from '../agents/claude-code/translate.js';
import { runClaude } from '../agents/claude-code/runner.js';
import { defaultRanks, WORKER_RANKS, EFFORTS } from '../router/config.js';
import { route } from '../router/router.js';
import { planSpell } from '../router/planner.js';

// Provisional caps; the evals calibrate them. maxTurns null: each rank's own (ranks.json).
export const DEFAULT_CAPS = Object.freeze({
  maxAgents: 2, maxTasks: 20, maxTurns: null, timeoutMs: 30 * 60000, roomTokens: 2000000, maxBudgetUsd: null,
  quotaWaitMs: 30 * 60000, maxWaits: 3,
});
const CONTINUE = 'The usage limit has reset. Continue the task where you left off.';
const NOTES_MAX = 64 * 1024;

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
   *   policy?: ReturnType<typeof buildPolicy>, caps?: Partial<typeof DEFAULT_CAPS>, ranks?: any, account?: string,
   *   model?: string|null, effort?: string|null, rank?: string|null, openPrs?: boolean, merge?: boolean, record?: boolean,
   *   env?: NodeJS.ProcessEnv, now?: () => number, log?: (line: string) => void}} o
   *   `ranks`: the Archmage's table (router/config.js); `rank`, `model` and `effort` are the defaults for
   *   every spell (from the command line), over the table; a choice in the spell book wins over both.
   *   `env` is what Claude Code gets (agents/claude-code/env.js); `record` keeps each turn's output,
   *   secrets masked, in tasks/<task>/turn-<n>.ndjson.
   */
  constructor({ store, repo, dir, bin, policy = buildPolicy(), caps = {}, ranks = null, account = 'claude-code', model = null, effort = null, rank = null, openPrs = false, merge = false, record = false, planner = null, env = process.env, now = () => Date.now(), log = () => {} }) {
    if (merge && openPrs) throw new Error('--merge and --open-prs do not go together: pick one');
    if (rank && !WORKER_RANKS.includes(rank)) throw new Error('--rank must be aprendiz, joven or sabio');
    if (effort && !EFFORTS.includes(effort)) throw new Error(`--effort must be one of ${EFFORTS.join(', ')}`);
    Object.assign(this, { store, repo, dir: realDir(dir), bin, policy, account, model, effort, openPrs, merge, record, env, now, log });
    this.forcedRank = rank;
    this.ranks = ranks || defaultRanks();
    // The Archmage plans a spell into tasks for different models unless the spell book chose a rank.
    this.usePlanner = planner === null ? !!(this.ranks.planner && this.ranks.planner.enabled) : !!planner;
    this.caps = { ...DEFAULT_CAPS, ...caps };
    this.tasks = new Map();
    this.queue = [];
    this.running = 0;
    this.started = 0;
    this.tokensUsed = 0;
    this.closing = false;
    this.quota = {};      // window → {status, utilization, resets_at}: the latest Claude Code reported
    this.history = {};    // rank → real tokens per task, for the Archmage's estimates
    this.opened = store.events.some(e => e.t === 'room.opened');
    // Ids go on after the ones already in the log: a restarted room never reuses them. The log also
    // seeds the estimates and the quota.
    this.taskSeq = 0;
    this.agentSeq = 0;
    const rankOf = {};
    for (const e of store.events) {
      const tn = /^t(\d+)$/.exec(e.task || '');
      if (tn) this.taskSeq = Math.max(this.taskSeq, Number(tn[1]));
      const an = /^a(\d+)$/.exec(e.agent || '');
      if (an) this.agentSeq = Math.max(this.agentSeq, Number(an[1]));
      if (e.t === 'agent.summoned') rankOf[e.agent] = e.rank;
      if (e.t === 'tokens.used' && rankOf[e.agent]) (this.history[rankOf[e.agent]] ||= []).push(e.input + e.output);
      if (e.t === 'quota.updated' && e.window) this.quota[e.window] = { status: e.status, utilization: e.utilization ?? null, resets_at: e.resets_at ?? null };
    }
  }

  get mode() { return 'claude-code'; }
  hello() {
    const ranks = Object.fromEntries(WORKER_RANKS.map(r => [r, {
      label: this.ranks.ranks[r].label, model: this.model || this.ranks.ranks[r].model, effort: this.effort || this.ranks.ranks[r].effort || null,
    }]));
    return {
      mode: 'claude-code', name: path.basename(this.repo), autoApprove: false, merge: this.merge, accounts: [{ id: this.account, guild: 'anthropic', label: 'Claude Code' }],
      ranks, models: this.models(), efforts: [...EFFORTS], notes: this.readNotes(),
    };
  }

  // The read-only file explorer (step 5): what is committed on the user's current branch, read
  // through git, only paths that git lists. Answers go to the asking client only.
  async query(cmd) {
    const files = await listFiles(this.repo);
    if (cmd.cmd === 'files') return { ctl: 'files', files };
    if (!files.includes(cmd.path)) throw new Error('that file is not in the repository');
    return { ctl: 'file', path: cmd.path, ...(await showFile(this.repo, 'HEAD', cmd.path)) };
  }

  /** The models a spell may ask for: the table's, and the one given with --model. */
  models() {
    return [...new Set([...WORKER_RANKS.map(r => this.ranks.ranks[r].model), ...(this.model ? [this.model] : [])])];
  }

  // The room's "to do" notes: a plain file next to its log, the user's own scratchpad.
  readNotes() {
    try { return fs.readFileSync(path.join(this.dir, 'notes.md'), 'utf8').slice(0, NOTES_MAX); } catch { return ''; }
  }
  writeNotes(text) {
    ensureDir(this.dir);
    fs.writeFileSync(path.join(this.dir, 'notes.md'), String(text).slice(0, NOTES_MAX), { mode: 0o600 });
  }

  emit(draft) {
    const ev = this.store.append({ ts: this.now(), ...draft });
    if (ev.t === 'quota.updated' && ev.window) this.quota[ev.window] = { status: ev.status, utilization: ev.utilization ?? null, resets_at: ev.resets_at ?? null };
    return ev;
  }

  async handle(cmd) {
    switch (cmd.cmd) {
      case 'cast': return this.cast(cmd.text, { rank: cmd.rank, model: cmd.model, effort: cmd.effort });
      case 'notes': return this.writeNotes(cmd.text);
      case 'approve': return this.approve(cmd.task);
      case 'reject': return this.reject(cmd.task, cmd.comment);
      case 'stop': return this.stop(cmd.task);
      case 'merge': return this.mergeTask(cmd.task);
      default: return undefined;   // no auto-approval and no speed outside the demo
    }
  }

  /** @param {string|{rank?: string|null, model?: string|null, effort?: string|null}|null} choice what the spell book chose */
  cast(text, choice = null) {
    if (this.closing) return null;
    const c = typeof choice === 'string' ? { rank: choice } : (choice || {});
    if (!this.opened) {
      this.opened = true;
      this.emit({ t: 'room.opened', project: path.basename(this.repo).slice(0, 120), guild: 'anthropic' });
    }
    if (this.usePlanner && !c.rank && !this.forcedRank && !c.noPlan) {
      this.planAndCast(String(text), c);
      return null;
    }
    const plan = this.routeFor(String(text), c.rank || this.forcedRank, c);
    return this.createTask({ prompt: String(text), title: short(text, 120) || 'Untitled spell', plan });
  }

  routeFor(text, rank, c) {
    return route({
      text, override: rank, model: c.model || this.model, effort: c.effort || this.effort,
      table: this.ranks, quota: this.quota, history: this.history, extraModels: this.model ? [this.model] : [], now: this.now(),
    });
  }

  // The Archmage plans: one cheap call (router/planner.js) splits the spell into tasks, each with the
  // rank its complexity calls for; they run one after another, each from the previous one's approved
  // branch. If planning fails, the rules decide a single task, as before.
  async planAndCast(text, c) {
    const P = this.ranks.planner;
    let res = null;
    try {
      res = await planSpell({ text, bin: this.bin, env: this.env, cwd: this.repo, model: P.model, timeoutMs: P.timeoutSec * 1000, maxTasks: P.maxTasks });
    } catch (err) {
      this.log(`The Archmage could not plan (${message(err)}); the rules decide.`);
    }
    if (this.closing) return;
    if (!res) { this.cast(text, { ...c, noPlan: true }); return; }
    const u = res.usage || {};
    const input = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0), output = u.output_tokens || 0;
    this.tokensUsed += input + output;
    this.emit({ t: 'tokens.used', agent: 'archimago', account: this.account, input, output, cache: u.cache_read_input_tokens || 0, cost_usd: res.cost });
    let prev = null;
    res.tasks.forEach((t, i) => {
      const plan = this.routeFor(t.prompt, t.rank, c);
      plan.reason = `the Archmage's plan, ${i + 1} of ${res.tasks.length}: ${t.why || t.rank}`;
      prev = this.createTask({ prompt: t.prompt, title: t.title, plan, after: prev ? prev.id : null }) || prev;
    });
  }

  createTask({ prompt, title, plan, after = null }) {
    const id = 't' + (++this.taskSeq);
    this.emit({ t: 'task.created', task: id, title: title.slice(0, 200), estimate: plan.estimate, rank: plan.rank, reason: plan.reason.slice(0, 200), ...(after ? { after } : {}) });
    const task = {
      id, title, prompt, state: 'queued', agent: null, summoned: false, prepared: false, model: null, turns: 0, waits: 0, timer: null,
      rank: plan.rank, plannedModel: plan.model, effort: plan.effort, maxTurns: this.caps.maxTurns ? Math.min(this.caps.maxTurns, plan.maxTurns) : plan.maxTurns,
      note: plan.note, sessionId: randomUUID(), branch: null, wt: null, base: null, baseBranch: null, run: null, result: null, after, job: null,
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
    const job = { task, prompt: task.prompt, resume: false, wait: plan.wait };
    if (after) { task.state = 'planned'; task.job = job; return task; }   // starts when the task before it is approved
    this.queue.push(job);
    this.pump();
    return task;
  }

  // The next task of a plan starts from the branch the previous one left, once it is approved.
  advance(prev) {
    for (const t of this.tasks.values()) {
      if (t.after !== prev.id || t.state !== 'planned') continue;
      t.state = 'queued';
      this.queue.push(t.job);
      t.job = null;
    }
    this.pump();
  }

  // A plan stops where a task fails or is cancelled: the tasks after it are cancelled too.
  dropChain(task) {
    for (const t of this.tasks.values()) {
      if (t.after !== task.id || t.state !== 'planned') continue;
      t.state = 'cancelled';
      t.job = null;
      this.emit({ t: 'task.cancelled', task: t.id, by: 'plan' });
      this.dropChain(t);
    }
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
      if (!task.prepared) await this.prepare(task);
      if (task.state === 'cancelled') return;
      if (job.wait) {
        // The window is (almost) used up before starting: the wizard comes in and waits.
        if (!task.summoned) this.summon(task, task.plannedModel);
        this.waitForQuota(task, { task, prompt: job.prompt, resume: job.resume }, job.wait.until);
        return;
      }
      await this.turn(task, job.prompt, job.resume);
    } catch (err) {
      if (task.state !== 'cancelled') this.fail(task, 'error', message(err));
    }
  }

  async prepare(task) {
    task.agent = 'a' + (++this.agentSeq);
    const prev = task.after ? this.tasks.get(task.after) : null;
    task.base = prev && prev.branch ? await commitOf(this.repo, prev.branch) : await head(this.repo);
    task.baseBranch = await currentBranch(this.repo);
    task.branch = branchName(task.id, task.title);
    task.wt = path.join(this.dir, 'worktrees', task.id);
    ensureDir(path.dirname(task.wt));
    fs.rmSync(task.wt, { recursive: true, force: true });   // a leftover from an older session, never the user's checkout
    await addWorktree(this.repo, task.wt, task.branch, task.base);
    task.prepared = true;
  }

  // The wizard walks in when Claude Code starts, with the model it really uses (system/init).
  summon(task, model) {
    task.summoned = true;
    task.model = String(model || task.plannedModel || 'default').slice(0, 80);
    this.emit({ t: 'agent.summoned', agent: task.agent, guild: 'anthropic', rank: task.rank, model: task.model, account: this.account, ...(task.effort ? { effort: task.effort } : {}) });
    this.emit({ t: 'agent.assigned', agent: task.agent, task: task.id });
  }

  recorder(task) {
    if (!this.record) return null;
    const file = path.join(ensureDir(path.join(this.dir, 'tasks', task.id)), `turn-${task.turns}.ndjson`);
    this.log(`Recording ${task.id}, turn ${task.turns}: ${file}`);
    return line => fs.appendFileSync(file, redact(line) + '\n', { mode: 0o600 });
  }

  settingsFile(task) {
    if (!this.policy.settings) return null;
    const file = path.join(ensureDir(path.join(this.dir, 'tasks', task.id)), 'claude-settings.json');
    fs.writeFileSync(file, JSON.stringify(this.policy.settings, null, 2) + '\n', { mode: 0o600 });
    return file;
  }

  async turn(task, prompt, resume) {
    task.state = 'running';
    task.turns++;
    const tr = new ClaudeTranslator({ agent: task.agent, task: task.id, cwd: task.wt, account: this.account });
    const args = claudeArgs({
      sessionId: task.sessionId, resume, policy: this.policy, model: task.plannedModel, effort: task.effort, maxTurns: task.maxTurns,
      maxBudgetUsd: this.caps.maxBudgetUsd, settingsFile: this.settingsFile(task), note: `${systemNote(task.branch)} ${task.note}`.trim(),
    });
    // The effort we pass must win: Claude Code lets CLAUDE_CODE_EFFORT_LEVEL override --effort.
    const env = task.effort ? Object.fromEntries(Object.entries(this.env).filter(([k]) => k.toUpperCase() !== 'CLAUDE_CODE_EFFORT_LEVEL')) : this.env;
    const run = runClaude({
      bin: this.bin, args, cwd: task.wt, env, prompt, timeoutMs: this.caps.timeoutMs, onLine: this.recorder(task),
      onMessage: msg => {
        const drafts = tr.push(msg);
        if (!task.summoned && (tr.session || drafts.length)) this.summon(task, tr.model);
        for (const d of drafts) this.emit(d);
      },
    });
    task.run = run;
    const exit = await run.done;
    task.run = null;
    this.tokensUsed += tr.tokens;
    if (tr.tokens) (this.history[task.rank] ||= []).push(tr.tokens);
    if (exit.killedFor === 'cancel') return this.cancelled(task, 'user');
    if (exit.killedFor === 'timeout') return this.fail(task, 'timeout', `No result after ${Math.round(this.caps.timeoutMs / 60000)} min: the wizard was stopped.`);
    const out = tr.outcome;
    if (!out) return this.fail(task, 'error', `Claude Code ended (${exit.code ?? exit.signal ?? 'no exit code'}) without a result.${exit.stderrTail ? ' ' + exit.stderrTail : ''}`);
    if (!out.ok && out.reason === 'quota' && task.summoned) {
      // Out of quota in the middle of the work: wait for the window, then resume the same session.
      return this.waitForQuota(task, { task, prompt: CONTINUE, resume: true }, (this.quota.five_hour || {}).resets_at);
    }
    if (!out.ok) return this.fail(task, out.reason, out.message);
    const diff = await diffAgainst(task.wt, task.base);
    this.emit({ t: 'artifact.present', agent: task.agent, task: task.id, artifact: task.branch, diff: diff.trim() ? diff : '(no changes)' });
    task.state = 'review';
    this.emit({ t: 'review.requested', agent: task.agent, task: task.id });
    return undefined;
  }

  waitForQuota(task, job, until) {
    task.waits++;
    if (task.waits > this.caps.maxWaits) {
      return this.fail(task, 'quota', `Still out of quota after ${this.caps.maxWaits} waits; the task stops here (its branch stays).`);
    }
    const now = this.now();
    const at = until && until > now ? until + 60000 : now + this.caps.quotaWaitMs;
    task.state = 'waiting';
    this.emit({ t: 'agent.blocked', agent: task.agent, reason: 'quota', detail: 'waiting for the usage window to reset', until: at });
    task.timer = setTimeout(() => {
      task.timer = null;
      if (task.state !== 'waiting' || this.closing) return;
      this.emit({ t: 'agent.unblocked', agent: task.agent });
      task.state = 'queued';
      this.queue.push({ ...job, wait: null });
      this.pump();
    }, Math.max(0, at - now));
    if (task.timer.unref) task.timer.unref();
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
      let pr = null, result = changed ? 'ok' : 'no-changes';
      if (changed && this.merge) result = await this.mergeIn(task);
      if (changed && this.openPrs) {
        await pushBranch(task.wt, task.branch);
        const quoted = task.prompt.slice(0, 1500).replace(/\n/g, '\n> ');
        pr = await openPr(task.wt, { branch: task.branch, base: task.baseBranch, title: task.title, body: `Cast in CodeWizards and approved on the blackboard.\n\nSpell:\n\n> ${quoted}` });
      }
      task.state = 'done';
      task.result = pr ? 'pr' : result;
      this.emit({ t: 'task.done', agent: task.agent, task: id, result, branch: task.branch, ...(pr ? { pr: pr.slice(0, 500) } : {}) });
      this.emit({ t: 'agent.idle', agent: task.agent });
      await removeWorktree(this.repo, task.wt).catch(() => {});
      this.advance(task);
    } catch (err) {
      task.state = 'review';
      this.emit({ t: 'agent.error', agent: task.agent, message: `Approval did not finish: ${message(err)}` });
      this.emit({ t: 'review.requested', agent: task.agent, task: id });
    }
  }

  // Fast-forward the user's branch to the task branch, or say why not (the change stays on its branch).
  async ffInto(task) {
    const now = await currentBranch(this.repo);
    if (!task.baseBranch || now !== task.baseBranch) {
      throw new Error(`your checkout is on ${now || 'a detached HEAD'}, the task started from ${task.baseBranch || 'a detached HEAD'}`);
    }
    await mergeFastForward(this.repo, task.branch);
  }

  async mergeIn(task) {
    try {
      await this.ffInto(task);
      return 'merged';
    } catch (err) {
      this.emit({ t: 'agent.error', agent: task.agent, message: `Not merged (${message(err)}). The change is on ${task.branch}.`.slice(0, 2000) });
      return 'ok';
    }
  }

  // The blackboard's merge button, for an approved task that is still only on its branch.
  async mergeTask(id) {
    const task = this.tasks.get(id);
    if (!task || task.state !== 'done' || task.result !== 'ok') throw new Error('only an approved task whose change is still on its branch can be merged');
    try {
      await this.ffInto(task);
    } catch (err) {
      throw new Error(`Not merged (${message(err)}). The change is still on ${task.branch}: bring it in with git merge.`);
    }
    task.result = 'merged';
    this.emit({ t: 'task.merged', task: id, branch: task.branch, ...(task.summoned ? { agent: task.agent } : {}) });
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
    if (task.timer) { clearTimeout(task.timer); task.timer = null; }
    this.queue = this.queue.filter(j => j.task !== task);
    this.cancelled(task, 'user');
  }

  // Only a wizard that walked in is named (a CLI that never started has no wizard in the room).
  fail(task, reason, msg) {
    task.state = 'failed';
    this.dropChain(task);
    this.emit({ t: 'task.failed', task: task.id, ...(task.summoned ? { agent: task.agent } : {}), reason, message: String(msg).slice(0, 2000) });
    if (task.summoned) this.emit({ t: 'agent.idle', agent: task.agent });
  }

  cancelled(task, by) {
    task.state = 'cancelled';
    this.dropChain(task);
    this.emit({ t: 'task.cancelled', task: task.id, ...(task.summoned ? { agent: task.agent } : {}), by });
    if (task.summoned) this.emit({ t: 'agent.idle', agent: task.agent });
  }

  async shutdown() {
    this.closing = true;
    for (const t of this.tasks.values()) if (t.timer) { clearTimeout(t.timer); t.timer = null; }
    const runs = [...this.tasks.values()].filter(t => t.run).map(t => { t.run.stop(); return t.run.done; });
    await Promise.allSettled(runs);
  }
}
