/* CodeWizards · mockup — simulated orchestrator. Emits event contract v0 (docs/agentes.md);
   the real backend will emit the same events, so the room does not change. */
(function (G) {
  'use strict';
  const CW = G.CW = G.CW || {};
  const GUILDS = ['anthropic', 'openai', 'gemini', 'deepseek', 'qwen', 'copilot', 'meta'];
  const SCHEMA = {
    'room.opened': ['project', 'guild'],
    'task.created': ['task', 'title', 'estimate'],
    'agent.summoned': ['agent', 'guild', 'rank', 'model'],
    'agent.assigned': ['agent', 'task'],
    'context.read': ['agent', 'files', 'tokens_in'],
    'code.write': ['agent', 'file', 'diff'],
    'artifact.present': ['agent', 'task', 'artifact', 'diff'],
    'tokens.used': ['agent', 'input', 'output', 'cache', 'cost'],
    'review.requested': ['agent', 'task'],
    'review.approved': ['agent', 'task', 'comment'],
    'review.rejected': ['agent', 'task', 'comment'],
    'agent.error': ['agent', 'message'],
    'task.done': ['agent', 'task', 'result'],
    'agent.idle': ['agent'],
  };
  const PLAN = {
    read: { rank: 'aprendiz', title: 'Leer el contexto', file: 'NOTAS.md' },
    design: { rank: 'sabio', title: 'Diseñar el cambio', file: 'docs/plan.md' },
    code: { rank: 'sabio', title: 'Escribir el código', file: 'src/{slug}.js' },
    test: { rank: 'aprendiz', title: 'Escribir los tests', file: 'test/{slug}.test.js' },
    docs: { rank: 'aprendiz', title: 'Actualizar la documentación', file: 'README.md' },
  };
  const ORDERS = { 3: ['read', 'code', 'test'], 4: ['read', 'code', 'test', 'docs'], 5: ['read', 'design', 'code', 'test', 'docs'] };
  const MODEL = { aprendiz: 'ligero (simulado)', sabio: 'avanzado (simulado)' };
  const STOP = new Set(['un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'de', 'del', 'a', 'al', 'en', 'y', 'o', 'para', 'con', 'por', 'que', 'mi', 'su', 'the', 'an', 'to', 'of', 'and', 'for', 'in', 'on', 'add', 'make']);

  function slugify(s) {
    const words = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    const keep = words.slice(1).filter(w => !STOP.has(w) && w.length > 2);
    return keep.slice(0, 2).join('-') || 'hechizo';
  }
  const short = s => (s.length > 34 ? s.slice(0, 33) + '…' : s);

  function diffFor(kind, slug, spell) {
    switch (kind) {
      case 'read':
        return ['@@ NOTAS.md @@', '+ Petición: ' + spell, '+ Ficheros clave: src/app.js, src/settings.js', '+ ' + slug + ': todavía no existe', '+ Riesgo: estilos sin tokens de color'];
      case 'design':
        return ['@@ docs/plan.md @@', '+## Plan: ' + spell, '+1. Tokens de color en :root', '+2. Interruptor en ajustes', '+3. Guardar la preferencia', '+4. Tests y documentación'];
      case 'code':
        return ['@@ src/' + slug + '.js @@', "-const mode = 'light';", "+const KEY = '" + slug + "';", '+export function toggle() {', '+  const on = !load(KEY);', '+  save(KEY, on);', "+  document.body.classList.toggle('" + slug + "', on);", '+}'];
      case 'test':
        return ['@@ test/' + slug + '.test.js @@', "+test('" + slug + " se activa', () => {", '+  toggle();', "+  expect(load('" + slug + "')).toBe(true);", '+});'];
      default:
        return ['@@ README.md @@', '+## ' + spell, '+Se activa desde Ajustes.', '+La preferencia se guarda en el navegador.'];
    }
  }

  class Sim {
    constructor(opts) {
      opts = opts || {};
      this.t = 0;
      this.q = [];
      this.ls = [];
      this.seq = 0;
      this.rand = CW.ROOM_META.mulberry32(opts.seed || 7);
      this.auto = false;
      this.tasks = new Map();
      this.opened = false;
      this.taskSeq = 0;
      this.agentSeq = 0;
      this.guildTurn = Math.floor(this.rand() * GUILDS.length);
      this.errRate = opts.errRate === undefined ? 0.15 : opts.errRate;
    }
    on(fn) { this.ls.push(fn); }
    emit(t, d) {
      const ev = Object.assign({ v: 0, t, ts: Math.round(this.t * 1000), room: 'sala-1' }, d);
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
    cast(spell) {
      spell = (spell || '').trim() || 'Hechizo sin nombre';
      if (!this.opened) { this.opened = true; this.emit('room.opened', { project: 'maqueta', guild: 'anthropic' }); }
      const slug = slugify(spell);
      const order = ORDERS[3 + Math.floor(this.rand() * 3)];
      order.forEach((kind, i) => this.at(0.4 + i * 3.2, () => this.runTask(kind, spell, slug)));
      return order.length;
    }
    runTask(kind, spell, slug) {
      const p = PLAN[kind];
      const id = 't' + (++this.taskSeq), agent = 'a' + (++this.agentSeq);
      const guild = GUILDS[(this.guildTurn++) % GUILDS.length];
      const estimate = Math.round((p.rank === 'sabio' ? 9000 : 3000) * (0.8 + this.rand() * 0.5));
      const task = { id, kind, agent, rank: p.rank, file: p.file.replace('{slug}', slug), diff: diffFor(kind, slug, spell), state: 'created', estimate, erred: false };
      this.tasks.set(id, task);
      this.emit('task.created', { task: id, title: p.title + (kind === 'read' ? ': ' + short(spell) : ''), estimate });
      this.at(0.6, () => this.emit('agent.summoned', { agent, guild, rank: p.rank, model: MODEL[p.rank] }));
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
      this.emit('tokens.used', { agent: task.agent, input, output, cache, cost: Math.round((input * 3 + output * 15) / 10) / 1e5 });
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
    reject(id) {
      const task = this.tasks.get(id);
      if (!task || task.state !== 'review') return false;
      task.state = 'rejected';
      this.emit('review.rejected', { agent: task.agent, task: id, comment: 'Cambia el nombre de la función' });
      this.at(2.0, () => this.write(task));
      return true;
    }
    setAuto(on) {
      this.auto = !!on;
      if (this.auto) for (const t of this.tasks.values()) if (t.state === 'review') this.at(1.0, () => this.approve(t.id));
    }
  }

  CW.Sim = Sim;
  CW.SCHEMA = SCHEMA;
  CW.GUILDS = GUILDS;
})(typeof globalThis !== 'undefined' ? globalThis : window);
