/* CodeWizards · room — world: grid, paths, stations and wizard behaviour.
   Pure logic (no DOM): used by the browser, the core and the node tests. It replays events of the
   contract v1: an event with a `seq` it has already seen is ignored (no double effects), and an
   event from an agent it has never seen brings that wizard in through the door (gaps are fine). */
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
  const CAPACITY = 10; // wizards inside the room at once; the rest wait outside the door (step 4)
  const BACKLOG = 6;   // pending actions before a wizard catches up with the log
  // The project's health moves with outcomes, never with tokens: spending more is not rewarded.
  const HEALTH = { 'task.done': 0.08, 'review.approved': 0.04, 'review.rejected': -0.05, 'agent.error': -0.05, 'task.failed': -0.15, 'command.denied': -0.02 };
  // Events that bring in an agent the room has not seen yet (it walks in, then does the work).
  const MATERIALIZE = new Set(['agent.assigned', 'context.read', 'code.write', 'artifact.present', 'review.requested', 'agent.error', 'agent.blocked']);

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
        mood: null, flash: null, flashT: 0, glow: 0, jump: 0, task: null, lined: false, gone: false, outside: false, hurry: false,
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
      this.lastSeq = 0;
      this.capacity = CAPACITY;
      this.outside = [];   // wizards waiting outside the door, first come first in
      this.health = 0.7;
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

    inside() { let n = 0; for (const w of this.wizards.values()) if (!w.outside && !w.gone) n++; return n; }

    summon(id, guild, rank) {
      const nw = new Wizard({ id, guild: guild || 'unknown', rank: rank || 'aprendiz', x: DOOR.x, y: DOOR.y, dir: 'SE' });
      nw.actions.push({ type: 'walk', to: ENTRY });
      if (this.inside() >= this.capacity) {
        nw.outside = true;          // the room is full: it waits outside and its work queues up
        this.outside.push(nw);
      } else this.door.openUntil = this.time + 2.6;
      this.wizards.set(id, nw);
      return nw;
    }

    admit() {
      while (this.outside.length && this.inside() < this.capacity) {
        const w = this.outside.shift();
        if (!this.wizards.has(w.id)) continue;
        w.outside = false;
        this.door.openUntil = this.time + 2.6;
        if (w.actions.length > BACKLOG) this.compress(w);
      }
    }

    // Station work, with the pace of real agents: a burst of reads or writes at the same station
    // makes the current visit longer instead of queuing walks; a long backlog is compressed so the
    // wizard catches up with the log (step 4).
    queueWork(w, station, work) {
      const last = w.actions.length ? w.actions[w.actions.length - 1] : (w.cur && w.cur.type === 'work' ? w.cur : null);
      if (last && last.type === 'work' && last.station === station) { last.min = Math.min(last.min + 0.8, 8); return; }
      w.actions.push({ type: 'goto', station }, Object.assign({ type: 'work', station }, work));
      if (w.actions.length > BACKLOG) this.compress(w);
    }

    // Keep the latest station visit and every non-station action (waits, celebrations, exits) in
    // order: what is shown is still what the log says, only sooner.
    compress(w) {
      const acts = w.actions;
      let lastPair = -1;
      for (let i = acts.length - 2; i >= 0; i--) if (acts[i].type === 'goto' && acts[i + 1].type === 'work') { lastPair = i; break; }
      w.actions = acts.filter((a, i) => !(a.type === 'goto' || (a.type === 'work' && a.station)) || i >= lastPair);
      for (const a of w.actions) if (a.type === 'work') a.min = Math.min(a.min, 1.5);
      w.hurry = true;
    }

    /** What the wizard is doing, in the words of the state machine (docs: auditorias/simulacion.md). */
    stateOf(w) {
      if (w.outside) return 'fuera';
      const a = w.cur;
      if (w.flashT > 0 && w.flash === '?') return 'confuso';
      if (!a) return w.x < 0.5 ? 'llegando' : 'quieto';
      if (a.type === 'walk') return 'llegando';
      if (a.type === 'goto') return a.queued && !w.path.length ? 'en cola' : 'caminando';
      if (a.type === 'work') return { read: 'leyendo', write: 'escribiendo', present: 'presentando' }[a.fx] || 'pensando';
      if (a.type === 'wait') return 'esperando';
      if (a.type === 'celebrate') return 'celebrando';
      if (a.type === 'rest') return 'descansando';
      if (a.type === 'leave') return 'saliendo';
      return 'quieto';
    }

    // Puts a wizard straight at a station, without walking in or animating: how the room rebuilds
    // what is still going on when it opens on an existing log.
    place(id, guild, rank, station, emote) {
      let w = this.wizards.get(id);
      if (!w) {
        w = new Wizard({ id, guild: guild || 'unknown', rank: rank || 'aprendiz', x: ENTRY.x, y: ENTRY.y, dir: 'SE' });
        this.wizards.set(id, w);
      }
      const s = this.claim(w, station) || this.queueSpot(w, station);
      Object.assign(w, { x: s.x, y: s.y, dir: s.dir || 'S', path: [], cur: null, pose: 'idle', mood: null, gone: false });
      w.actions.length = 0;
      w.actions.push({ type: 'wait', emote: emote || null });
      return w;
    }

    // Takes a wizard out at once (no walk to the door).
    remove(id) {
      const w = this.wizards.get(id);
      if (!w) return;
      this.release(w);
      this.wizards.delete(id);
      this.outside = this.outside.filter(o => o !== w);
      if (this.selected === id) this.selected = null;
    }

    // Applies one event. Returns false when it was a repeat (same or older `seq`) and was ignored.
    handle(ev) {
      if (typeof ev.seq === 'number') {
        if (ev.seq <= this.lastSeq) return false;
        this.lastSeq = ev.seq;
      }
      let w = ev.agent ? this.wizards.get(ev.agent) : null;
      if (!w && ev.agent && MATERIALIZE.has(ev.t)) w = this.summon(ev.agent, ev.guild, ev.rank);
      if (HEALTH[ev.t]) this.health = Math.max(0, Math.min(1, this.health + HEALTH[ev.t]));
      switch (ev.t) {
        case 'room.opened':
          this.guild = ev.guild || this.guild;
          break;
        case 'task.created':
          this.say(this.archi, '!', 1.2);
          this.burst(this.archi, 'rune', 3);
          break;
        case 'agent.summoned':
          if (!this.wizards.has(ev.agent)) this.summon(ev.agent, ev.guild, ev.rank);
          break;
        case 'agent.assigned':
          if (w) { w.task = ev.task; this.say(w, '…', 1.2); }
          break;
        case 'context.read':
          if (w) this.queueWork(w, 'library', { min: 2.5, emote: 'book', fx: 'read' });
          break;
        case 'code.write':
          if (w) this.queueWork(w, 'table', { min: 3, emote: 'pen', fx: 'write' });
          break;
        case 'artifact.present':
          if (w) this.queueWork(w, 'board', { min: 2, emote: 'board', fx: 'present' });
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
        case 'agent.blocked':
          // Out of quota: to the armchair to wait for the window (it does not leave). Anything else: wait here.
          if (w && ev.reason === 'quota') w.actions.push({ type: 'goto', station: 'rest' }, { type: 'wait', emote: 'z' });
          else if (w) w.actions.push({ type: 'wait', emote: '!' });
          break;
        case 'command.denied':
          if (w) this.say(w, '!', 1.4);
          break;
        case 'command.run':
          if (w) this.burst(w, 'rune', 3);
          break;
        case 'task.failed':
          if (w) { this.say(w, '?', 2.2); this.burst(w, 'smoke', 6); w.actions.push({ type: 'goto', station: 'rest' }, { type: 'rest' }); }
          break;
        case 'task.cancelled':
          if (w) { w.actions.length = 0; w.cur = null; w.mood = null; w.actions.push({ type: 'leave' }); }
          break;
        default:
          break;
      }
      return true;
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
      if (!best) return null;   // full: the caller queues the wizard nearby
      this.taken.set(best.k, w.id);
      w.slot = best.k;
      return best.s;
    }

    // A free tile near a full station, not taken by another wizard: where the queue forms.
    queueSpot(w, station) {
      const s0 = STATIONS[station][0], sx = Math.floor(s0.x), sy = Math.floor(s0.y);
      const busy = (x, y) => {
        for (const o of this.wizards.values()) {
          if (o === w || o.outside) continue;
          if (o.queueAt === x + ',' + y || (Math.floor(o.x) === x && Math.floor(o.y) === y)) return true;   // taken or promised
        }
        return Object.values(STATIONS).some(list => list.some(p => Math.floor(p.x) === x && Math.floor(p.y) === y));
      };
      const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
      while (q.length) {
        const [x, y] = q.shift();
        if (free(x, y) && !busy(x, y) && !(x === sx && y === sy)) return { x: x + 0.5, y: y + 0.5, dir: dirOf(s0.x - x - 0.5, s0.y - y - 0.5) || 'S' };
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = (x + dx) + ',' + (y + dy);
          if (!seen.has(k) && free(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
        }
      }
      return { x: ENTRY.x, y: ENTRY.y, dir: 'E' };
    }

    release(w) {
      w.queueAt = null;
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
        let slot = this.claim(w, a.station);
        a.queued = !slot;
        if (!slot) { slot = this.queueSpot(w, a.station); w.mood = '…'; w.queueAt = Math.floor(slot.x) + ',' + Math.floor(slot.y); }
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
      if (w.hurry && w.actions.length <= 1) w.hurry = false;
      let left = dt * SPEED * (w.hurry ? 1.6 : 1);
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
      if (w.outside) return;   // waiting outside the door: nothing to animate yet
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
          if (this.move(w, dt)) { w.pose = 'idle'; w.cur = null; }
          break;
        case 'goto':
          if (!this.move(w, dt)) break;
          if (a.queued) {
            // In the queue: step up as soon as a place at the station is free.
            w.pose = 'idle';
            const keep = w.queueAt;
            const slot = this.claim(w, a.station);
            if (!slot) w.queueAt = keep;
            if (slot) { a.queued = false; a.face = slot.dir; w.mood = null; w.queueAt = null; w.path = this.route(w, slot); w.pose = 'walk'; }
            break;
          }
          if (a.face) w.dir = a.face;
          w.pose = 'idle';
          w.cur = null;
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
      for (const [id, w] of this.wizards) {
        if (!w.gone) continue;
        this.wizards.delete(id);
        if (this.selected === id) this.selected = null;
        if (this.onLeave) this.onLeave(id);
      }
      this.admit();
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
  CW.ROOM_META = { ROOM, DIRS, STATIONS, ARCHI, DOOR, ENTRY, CAPACITY, BACKLOG, free, astar, dirOf, mulberry32 };
})(typeof globalThis !== 'undefined' ? globalThis : window);
