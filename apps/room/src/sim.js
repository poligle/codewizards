/* CodeWizards · room — simulated orchestrator. Emits event contract v2 (packages/contract/contract.js,
   table in docs/agentes.md); the core's adapters emit the same events, so the room does not change
   between the demo and the real agents. Only the Anthropic guild works, as in the real app until
   other accounts connect (Pol, 23/10/2026); the simulated Archmage spreads the work over the ranks.
   Runs in the browser (demo mode) and in node (the core's demo room and the tests). */
(function (G) {
  'use strict';
  const CW = G.CW = G.CW || {};
  const GUILD = 'anthropic';
  const RANKS = ['aprendiz', 'joven', 'sabio'];
  const PLAN = {
    read: { rank: 'aprendiz', title: 'Read the context', file: 'NOTES.md' },
    design: { rank: 'sabio', title: 'Design the change', file: 'docs/plan.md' },
    code: { rank: 'joven', title: 'Write the code', file: 'src/{slug}.js' },
    test: { rank: 'aprendiz', title: 'Write the tests', file: 'test/{slug}.test.js' },
    docs: { rank: 'aprendiz', title: 'Update the docs', file: 'README.md' },
  };
  const COST = { aprendiz: 3000, joven: 6000, sabio: 9000 };
  const WINDOW = 120000;          // tokens in the simulated five-hour window
  const RESET = 5 * 3600 * 1000;
  const ORDERS = { 3: ['read', 'code', 'test'], 4: ['read', 'code', 'test', 'docs'], 5: ['read', 'design', 'code', 'test', 'docs'] };
  const MODEL = { aprendiz: 'haiku (simulated)', joven: 'sonnet (simulated)', sabio: 'opus (simulated)' };
  const EFFORT = { aprendiz: 'low', joven: 'medium', sabio: 'high' };
  const LABEL = { aprendiz: 'Apprentice', joven: 'Young Mage', sabio: 'Grand Sage' };
  const STOP = new Set(['un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'de', 'del', 'a', 'al', 'en', 'y', 'o', 'para', 'con', 'por', 'que', 'mi', 'su', 'the', 'an', 'to', 'of', 'and', 'for', 'in', 'on', 'add', 'make']);

  function slugify(s) {
    const words = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    const keep = words.slice(1).filter(w => !STOP.has(w) && w.length > 2);
    return keep.slice(0, 2).join('-') || 'spell';
  }
  const short = s => (s.length > 34 ? s.slice(0, 33) + '…' : s);

  function diffFor(kind, slug, spell) {
    switch (kind) {
      case 'read':
        return ['@@ NOTES.md @@', '+ Request: ' + spell, '+ Key files: src/app.js, src/settings.js', '+ ' + slug + ': does not exist yet', '+ Risk: styles without colour tokens'];
      case 'design':
        return ['@@ docs/plan.md @@', '+## Plan: ' + spell, '+1. Colour tokens in :root', '+2. A switch in the settings', '+3. Remember the choice', '+4. Tests and docs'];
      case 'code':
        return ['@@ src/' + slug + '.js @@', "-const mode = 'light';", "+const KEY = '" + slug + "';", '+export function toggle() {', '+  const on = !load(KEY);', '+  save(KEY, on);', "+  document.body.classList.toggle('" + slug + "', on);", '+}'];
      case 'test':
        return ['@@ test/' + slug + '.test.js @@', "+test('" + slug + " switches on', () => {", '+  toggle();', "+  expect(load('" + slug + "')).toBe(true);", '+});'];
      default:
        return ['@@ README.md @@', '+## ' + spell, '+Switch it on in Settings.', '+The choice is kept in the browser.'];
    }
  }

  class Sim {
    constructor(opts) {
      opts = opts || {};
      this.t = 0;                                              // simulated seconds
      this.t0 = opts.t0 === undefined ? Date.now() : opts.t0;  // epoch ms of t = 0
      this.room = opts.room || 'demo';
      this.account = opts.account || 'demo';
      this.q = [];
      this.ls = [];
      this.seq = 0;      // order of scheduled callbacks
      this.evSeq = 0;    // contract `seq`: one per emitted event
      this.rand = CW.ROOM_META.mulberry32(opts.seed || 7);
      this.auto = false;
      this.tasks = new Map();
      this.opened = false;
      this.taskSeq = 0;
      this.agentSeq = 0;
      this.used = 0;      // tokens spent in the simulated window
      this.errRate = opts.errRate === undefined ? 0.15 : opts.errRate;
    }
    on(fn) { this.ls.push(fn); }
    emit(t, d) {
      const ev = Object.assign({ v: 1, t, seq: ++this.evSeq, ts: this.t0 + Math.round(this.t * 1000), room: this.room }, d);
      for (const f of this.ls) f(ev);
      return ev;
    }
    at(dt, fn) {
      this.q.push({ t: this.t + dt, fn, n: this.seq++ });
      this.q.sort((a, b) => a.t - b.t || a.n - b.n);
    }
    tick(dt) {
      if (!(dt >= 0)) return;   // time never goes back (negative or NaN dt)
      this.t += dt;
      while (this.q.length && this.q[0].t <= this.t) this.q.shift().fn();
    }
    // What the spell book shows for each rank in the demo.
    ranks() {
      const out = {};
      for (const r of RANKS) out[r] = { label: LABEL[r], model: MODEL[r], effort: EFFORT[r] };
      return out;
    }
    cast(spell, choice) {
      const c = typeof choice === 'string' ? { rank: choice } : (choice || {});
      const rank = c.rank;
      this.effortChoice = ['low', 'medium', 'high', 'xhigh', 'max'].indexOf(c.effort) >= 0 ? c.effort : null;
      spell = (spell || '').trim() || 'A nameless spell';
      if (!this.opened) { this.opened = true; this.emit('room.opened', { project: 'demo', guild: GUILD }); }
      const slug = slugify(spell);
      const order = ORDERS[3 + Math.floor(this.rand() * 3)];
      const forced = RANKS.indexOf(rank) >= 0 ? rank : null;
      order.forEach((kind, i) => this.at(0.4 + i * 3.2, () => this.runTask(kind, spell, slug, forced)));
      return order.length;
    }
    runTask(kind, spell, slug, forced) {
      const p = PLAN[kind];
      const rank = forced || p.rank;
      const id = 't' + (++this.taskSeq), agent = 'a' + (++this.agentSeq);
      const estimate = Math.round(COST[rank] * (0.8 + this.rand() * 0.5));
      const task = { id, kind, agent, rank, file: p.file.replace('{slug}', slug), diff: diffFor(kind, slug, spell), state: 'created', estimate, erred: false };
      this.tasks.set(id, task);
      this.emit('task.created', { task: id, title: p.title + (kind === 'read' ? ': ' + short(spell) : ''), estimate, rank, reason: forced ? 'chosen by you' : 'the illusion\'s plan: ' + kind });
      const effort = this.effortChoice || EFFORT[rank];
      this.at(0.6, () => this.emit('agent.summoned', { agent, guild: GUILD, rank, model: MODEL[rank], account: this.account, effort }));
      this.at(2.8, () => { task.state = 'assigned'; this.emit('agent.assigned', { agent, task: id }); });
      this.at(4.2, () => {
        task.state = 'reading';
        this.emit('context.read', { agent, files: ['src/app.js', 'src/settings.js', task.file], tokens_in: Math.round(estimate * 0.5) });
        this.at(0.3, () => this.spend(task, 0.5, 0.05));
      });
      this.at(9.5, () => this.write(task));
    }
    spend(task, fin, fout) {
      const input = Math.round(task.estimate * fin), output = Math.round(task.estimate * fout), cache = Math.round(input * 0.3);
      this.emit('tokens.used', { agent: task.agent, account: this.account, input, output, cache, cost_usd: Math.round((input * 3 + output * 15) / 10) / 1e5 });
      this.used += input + output;
      const u = Math.min(1, this.used / WINDOW);
      this.emit('quota.updated', { account: this.account, status: u >= 1 ? 'exhausted' : u >= 0.9 ? 'limited' : 'ok', window: 'five_hour', utilization: Math.round(u * 1000) / 1000, resets_at: this.t0 + RESET });
    }
    write(task) {
      task.state = 'writing';
      this.emit('code.write', { agent: task.agent, file: task.file, diff: task.diff.slice(0, 3).join('\n') });
      this.at(0.3, () => this.spend(task, 0.2, 0.25));
      if (!task.erred && this.rand() < this.errRate) {
        task.erred = true;
        this.at(2.5, () => {
          this.emit('agent.error', { agent: task.agent, message: 'Un test falla en ' + task.file });
          this.at(2.5, () => this.write(task));
        });
        return;
      }
      this.at(5.0, () => this.present(task));
    }
    present(task) {
      if (task.kind === 'test') this.emit('command.run', { agent: task.agent, command: 'npm test', failed: false });
      task.state = 'presenting';
      this.emit('artifact.present', { agent: task.agent, task: task.id, artifact: task.file, diff: task.diff.join('\n') });
      this.at(3.0, () => {
        task.state = 'review';
        this.emit('review.requested', { agent: task.agent, task: task.id });
        if (this.auto) this.at(2.0, () => this.approve(task.id));
      });
    }
    approve(id) {
      const task = this.tasks.get(id);
      if (!task || task.state !== 'review') return false;
      task.state = 'approved';
      this.emit('review.approved', { agent: task.agent, task: id, comment: 'Aprobado' });
      this.at(1.6, () => {
        task.state = 'done';
        this.emit('task.done', { agent: task.agent, task: id, result: 'ok' });
        this.at(2.0, () => this.emit('agent.idle', { agent: task.agent }));
      });
      return true;
    }
    reject(id, comment) {
      const task = this.tasks.get(id);
      if (!task || task.state !== 'review') return false;
      task.state = 'rejected';
      this.emit('review.rejected', { agent: task.agent, task: id, comment: comment || 'Rename the function' });
      this.at(2.0, () => this.write(task));
      return true;
    }
    setAuto(on) {
      this.auto = !!on;
      if (this.auto) for (const t of this.tasks.values()) if (t.state === 'review') this.at(1.0, () => this.approve(t.id));
    }
  }

  CW.Sim = Sim;
  CW.RANKS = RANKS;
})(typeof globalThis !== 'undefined' ? globalThis : window);
