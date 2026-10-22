/* CodeWizards · mockup — world: grid, paths, stations and wizard behaviour.
   Pure logic (no DOM): used by the browser and by the node tests. */
(function (G) {
  'use strict';
  const CW = G.CW = G.CW || {};
  const ROOM = 12;
  const DIRS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];

  const BLOCKED = new Set();
  function block(x0, y0, x1, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) BLOCKED.add(x + ',' + y);
  }
  block(0, 1, 0, 3);    // bookshelf A
  block(0, 5, 0, 8);    // bookshelf B
  block(4, 3, 6, 4);    // lab table
  block(9, 1, 10, 2);   // blackboard
  block(8, 6, 9, 6);    // armchair
  block(5, 7, 6, 8);    // Archmage's rune circle
  const free = (x, y) => x >= 0 && y >= 0 && x < ROOM && y < ROOM && !BLOCKED.has(x + ',' + y);

  const STATIONS = {
    library: [{ x: 1.3, y: 2.0, dir: 'NW' }, { x: 1.3, y: 3.3, dir: 'NW' }, { x: 1.3, y: 6.1, dir: 'NW' }, { x: 1.3, y: 7.5, dir: 'NW' }],
    table: [{ x: 5.0, y: 2.45, dir: 'SW' }, { x: 6.1, y: 2.45, dir: 'SW' }, { x: 4.9, y: 5.3, dir: 'NE' }, { x: 6.1, y: 5.3, dir: 'NE' }],
    board: [{ x: 9.3, y: 3.6, dir: 'NE' }, { x: 10.6, y: 3.3, dir: 'NE' }],
    rest: [{ x: 9.1, y: 7.7, dir: 'SW' }, { x: 10.5, y: 6.6, dir: 'W' }, { x: 10.5, y: 8.7, dir: 'W' }, { x: 3.2, y: 8.4, dir: 'SE' },
      { x: 3.2, y: 10.3, dir: 'E' }, { x: 8.7, y: 10.6, dir: 'NW' }, { x: 7.5, y: 11.2, dir: 'N' }, { x: 2.2, y: 6.2, dir: 'E' }],
  };
  const ARCHI = { x: 6.0, y: 8.25 };
  const DOOR = { x: -0.45, y: 10.5 };
  const ENTRY = { x: 0.5, y: 10.5 };
  const SPEED = 1.6;   // tiles per second

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function dirOf(dx, dy) {
    const sx = dx - dy, sy = (dx + dy) / 2;
    if (Math.abs(sx) < 1e-6 && Math.abs(sy) < 1e-6) return null;
    const a = (Math.atan2(sy, sx) * 180 / Math.PI + 360) % 360;
    return ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][Math.round(a / 45) % 8];
  }

  function astar(sx, sy, tx, ty) {
    const key = (x, y) => x + ',' + y, start = key(sx, sy), goal = key(tx, ty);
    if (start === goal) return [];
    const g = new Map([[start, 0]]), came = new Map(), closed = new Set(), open = [[0, sx, sy]];
    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (open.length) {
      open.sort((a, b) => a[0] - b[0]);
      const [, cx, cy] = open.shift(), ck = key(cx, cy);
      if (closed.has(ck)) continue;
      closed.add(ck);
      if (ck === goal) break;
      for (const [dx, dy] of steps) {
        const nx = cx + dx, ny = cy + dy, nk = key(nx, ny);
        if (!free(nx, ny)) continue;
        if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue;
        const cost = g.get(ck) + (dx && dy ? Math.SQRT2 : 1);
        if (!g.has(nk) || cost < g.get(nk)) {
          g.set(nk, cost);
          came.set(nk, ck);
          const ax = Math.abs(tx - nx), ay = Math.abs(ty - ny);
          open.push([cost + Math.max(ax, ay) + (Math.SQRT2 - 1) * Math.min(ax, ay), nx, ny]);
        }
      }
    }
    if (!came.has(goal)) return null;
    const path = [];
    for (let k = goal; k !== start; k = came.get(k)) {
      const [x, y] = k.split(',').map(Number);
      path.unshift({ x: x + 0.5, y: y + 0.5 });
    }
    return path;
  }

  const tile = v => Math.max(0, Math.min(ROOM - 1, Math.floor(v)));

  class Wizard {
    constructor(o) {
      Object.assign(this, {
        id: o.id, guild: o.guild, rank: o.rank || 'aprendiz', x: o.x, y: o.y, dir: o.dir || 'SE',
        pose: 'idle', anim: 0, path: [], actions: [], cur: null, slot: null,
        mood: null, flash: null, flashT: 0, glow: 0, jump: 0, task: null, lined: false, gone: false,
      });
    }
    get emote() { return this.flashT > 0 ? this.flash : this.mood; }
  }

  class World {
    constructor(seed) {
      this.time = 0;
      this.wizards = new Map();
      this.particles = [];
      this.taken = new Map();
      this.board = { lines: [] };
      this.door = { openUntil: -1, p: 0 };
      this.guild = 'anthropic';
      this.selected = null;
      this.rand = mulberry32(seed || 11);
      this.archi = new Wizard({ id: 'archmage', guild: 'archmage', rank: 'archmage', x: ARCHI.x, y: ARCHI.y, dir: 'S' });
    }

    say(w, e, dur) { w.flash = e; w.flashT = dur; }

    burst(w, type, n) {
      for (let i = 0; i < n; i++) {
        const r = this.rand, p = { x: w.x, y: w.y, ox: 0, oy: 0, life: 1, max: 1, type, guild: w.guild, k: Math.floor(r() * 4) };
        if (type === 'rune') Object.assign(p, { oy: -12, vx: (r() - 0.5) * 6, vy: -9 - r() * 4, max: 1.4 });
        else if (type === 'page') Object.assign(p, { ox: -8, oy: -18 - r() * 6, vx: 6 + r() * 4, vy: 2 + r() * 2, max: 1.1 });
        else if (type === 'chalk') Object.assign(p, { ox: 4 + r() * 4, oy: -24, vx: (r() - 0.5) * 4, vy: 5 + r() * 3, max: 0.9 });
        else if (type === 'spark') Object.assign(p, { oy: -20, vx: (r() - 0.5) * 22, vy: -6 - r() * 12, max: 0.8 });
        else if (type === 'smoke') Object.assign(p, { oy: -22, vx: (r() - 0.5) * 4, vy: -5 - r() * 3, max: 1.4 });
        p.life = p.max;
        this.particles.push(p);
      }
    }

    addLine(guild) {
      this.board.lines.push({ len: 6 + Math.floor(this.rand() * 15), guild });
      if (this.board.lines.length > 4) this.board.lines.shift();
    }

    handle(ev) {
      const w = ev.agent ? this.wizards.get(ev.agent) : null;
      switch (ev.t) {
        case 'room.opened':
          this.guild = ev.guild || this.guild;
          break;
        case 'task.created':
          this.say(this.archi, '!', 1.2);
          this.burst(this.archi, 'rune', 3);
          break;
        case 'agent.summoned': {
          const nw = new Wizard({ id: ev.agent, guild: ev.guild, rank: ev.rank, x: DOOR.x, y: DOOR.y, dir: 'SE' });
          nw.actions.push({ type: 'walk', to: ENTRY });
          this.wizards.set(ev.agent, nw);
          this.door.openUntil = this.time + 2.6;
          break;
        }
        case 'agent.assigned':
          if (w) { w.task = ev.task; this.say(w, '…', 1.2); }
          break;
        case 'context.read':
          if (w) w.actions.push({ type: 'goto', station: 'library' }, { type: 'work', min: 2.5, emote: 'book', fx: 'read' });
          break;
        case 'code.write':
          if (w) w.actions.push({ type: 'goto', station: 'table' }, { type: 'work', min: 3, emote: 'pen', fx: 'write' });
          break;
        case 'artifact.present':
          if (w) w.actions.push({ type: 'goto', station: 'board' }, { type: 'work', min: 2, emote: 'board', fx: 'present' });
          break;
        case 'tokens.used':
          if (w) w.glow = 1;
          break;
        case 'review.requested':
          if (w) w.actions.push({ type: 'wait', emote: '!' });
          break;
        case 'review.approved':
          if (w) w.actions.push({ type: 'celebrate', min: 1.4 });
          break;
        case 'review.rejected':
          if (w) w.actions.push({ type: 'work', min: 1.2, emote: '…', fx: null });
          break;
        case 'agent.error':
          if (w) { this.say(w, '?', 2.2); this.burst(w, 'smoke', 6); }
          break;
        case 'task.done':
          if (w) w.actions.push({ type: 'goto', station: 'rest' }, { type: 'rest' });
          break;
        case 'agent.idle':
          if (w) this.say(w, 'z', 1.5);
          break;
        default:
          break;
      }
    }

    claim(w, station) {
      this.release(w);
      const list = STATIONS[station];
      let best = null;
      let bd = Infinity;
      list.forEach((s, i) => {
        const k = station + i;
        if (this.taken.has(k)) return;
        const d = Math.hypot(s.x - w.x, s.y - w.y);
        if (d < bd) { bd = d; best = { s, k }; }
      });
      if (!best) {
        const i = Math.floor(this.rand() * list.length);
        best = { s: list[i], k: station + i };
      }
      this.taken.set(best.k, w.id);
      w.slot = best.k;
      return best.s;
    }

    release(w) {
      if (w.slot && this.taken.get(w.slot) === w.id) this.taken.delete(w.slot);
      w.slot = null;
    }

    route(w, to) {
      const p = astar(tile(w.x), tile(w.y), tile(to.x), tile(to.y)) || [];
      return p.concat([{ x: to.x, y: to.y }]);
    }

    start(w, a) {
      a.t = 0;
      if (a.type === 'walk') { w.path = [a.to]; w.pose = 'walk'; }
      if (a.type === 'goto') {
        const slot = this.claim(w, a.station);
        a.face = slot.dir;
        w.path = w.x < 0 ? [ENTRY].concat(this.route({ x: ENTRY.x, y: ENTRY.y }, slot)) : this.route(w, slot);
        w.pose = 'walk';
        w.lined = false;
      }
      if (a.type === 'leave') {
        this.release(w);
        w.path = this.route(w, ENTRY).concat([DOOR]);
        w.pose = 'walk';
      }
      if ((a.type === 'work' || a.type === 'wait') && a.emote) w.mood = a.emote;
      if (a.type === 'celebrate') w.mood = 'star';
    }

    move(w, dt) {
      let left = dt * SPEED;
      while (left > 0 && w.path.length) {
        const p = w.path[0], dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy);
        const nd = dirOf(dx, dy);
        if (nd) w.dir = nd;
        if (d <= left) { w.x = p.x; w.y = p.y; w.path.shift(); left -= d; } else { w.x += dx / d * left; w.y += dy / d * left; left = 0; }
      }
      if (w.path.length) w.pose = 'walk';
      return w.path.length === 0;
    }

    fx(w, kind, dt) {
      if (!kind) return;
      const rate = { read: 5, write: 4, present: 3 }[kind];
      if (this.rand() < rate * dt) this.burst(w, kind === 'read' ? 'page' : kind === 'write' ? 'rune' : 'chalk', 1);
      if (kind === 'present' && !w.lined) { this.addLine(w.guild); w.lined = true; }
    }

    step(w, dt) {
      w.anim += dt;
      if (w.flashT > 0) w.flashT -= dt;
      w.glow = Math.max(0, w.glow - dt * 1.5);
      let a = w.cur;
      if (!a) {
        a = w.cur = w.actions.shift() || null;
        if (a) this.start(w, a);
      }
      if (!a) return;
      const next = () => { w.cur = null; w.mood = null; w.jump = 0; };
      switch (a.type) {
        case 'walk':
        case 'goto':
          if (this.move(w, dt)) { if (a.face) w.dir = a.face; w.pose = 'idle'; w.cur = null; }
          break;
        case 'leave':
          if (this.move(w, dt)) w.gone = true;
          if (w.path.length <= 2) this.door.openUntil = this.time + 1.2;
          break;
        case 'work':
          a.t += dt; w.pose = 'work'; this.fx(w, a.fx, dt);
          if (a.t >= a.min && w.actions.length) next();
          break;
        case 'wait':
          a.t += dt; w.pose = 'idle';
          if (w.actions.length) next();
          break;
        case 'celebrate':
          a.t += dt; w.pose = 'idle';
          w.jump = a.t < 1.0 && Math.floor(a.t / 0.25) % 2 === 0 ? 2 : 0;
          if (this.rand() < dt * 10) this.burst(w, 'spark', 1);
          if (a.t >= a.min) next();
          break;
        case 'rest':
          a.t += dt; w.pose = 'idle';
          if (a.t > 3 && !w.mood) w.mood = 'z';
          if (w.actions.length) next();
          else if (a.t > 14) { next(); w.actions.push({ type: 'leave' }); }
          break;
        default:
          next();
      }
    }

    update(dt) {
      if (!(dt >= 0)) return;   // time never goes back (negative or NaN dt)
      this.time += dt;
      for (const w of this.wizards.values()) this.step(w, dt);
      for (const [id, w] of this.wizards) if (w.gone) { this.wizards.delete(id); if (this.selected === id) this.selected = null; }
      this.archi.anim += dt;
      if (this.archi.flashT > 0) this.archi.flashT -= dt;
      const target = this.time < this.door.openUntil ? 1 : 0;
      this.door.p += Math.sign(target - this.door.p) * Math.min(Math.abs(target - this.door.p), dt * 4);
      this.particles = this.particles.filter(p => (p.life -= dt) > 0);
      for (const p of this.particles) { p.ox += p.vx * dt; p.oy += p.vy * dt; }
    }

    doorFrame() { return Math.round(this.door.p * 3); }
  }

  CW.World = World;
  CW.ROOM_META = { ROOM, DIRS, STATIONS, ARCHI, DOOR, ENTRY, free, astar, dirOf, mulberry32 };
})(typeof globalThis !== 'undefined' ? globalThis : window);
