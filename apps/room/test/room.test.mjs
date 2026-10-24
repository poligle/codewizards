// Node tests for the room logic: paths, the simulator against event contract v1, a full spell end
// to end, repeats without double effects, gaps, unknown guilds and the v1 events.
// Run: node apps/room/test/room.test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, GUILDS } from '../../../packages/contract/contract.js';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
globalThis.CW = {};
for (const f of ['plan.gen.js', 'world.js', 'sim.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const { World, Sim, ROOM_META: M } = globalThis.CW;

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.error('✗', msg); } };
const T0 = 1761130000000;

for (const [name, list] of Object.entries(M.STATIONS)) {
  list.forEach((s, i) => {
    ok(M.free(Math.floor(s.x), Math.floor(s.y)), `${name}[${i}] stands on a free tile`);
    ok(M.astar(Math.floor(M.ENTRY.x), Math.floor(M.ENTRY.y), Math.floor(s.x), Math.floor(s.y)) !== null, `${name}[${i}] is reachable from the door`);
  });
}

function run(seed, onEvent) {
  const sim = new Sim({ seed, t0: T0 }), world = new World(seed), events = [];
  sim.on(ev => { events.push(ev); world.handle(ev); if (onEvent) onEvent(ev, sim); });
  return { sim, world, events };
}

function validateAll(events) {
  let lastTs = 0, lastSeq = 0;
  for (const ev of events) {
    const errs = validate(ev);
    ok(errs.length === 0, `${ev.t} #${ev.seq} follows contract v1: ${errs.join('; ')}`);
    ok(ev.seq === lastSeq + 1, `${ev.t}: seq goes up by one (${lastSeq} → ${ev.seq})`);
    ok(ev.ts >= lastTs, `${ev.t}: ts does not go back`);
    if (ev.t === 'agent.summoned') ok(GUILDS.includes(ev.guild), `${ev.guild} is a maker guild`);
    lastTs = ev.ts;
    lastSeq = ev.seq;
  }
}

const snapshot = w => JSON.stringify([...w.wizards.values()].map(z => [z.id, z.guild, z.x.toFixed(3), z.y.toFixed(3), z.dir, z.pose, z.actions.length, z.gone]));

// 1) one spell end to end with auto-approval
let log1;
{
  const { sim, world, events } = run(3);
  sim.setAuto(true);
  const n = sim.cast('Añade un modo oscuro a la página de ajustes');
  for (let t = 0; t < 150; t += 0.05) {
    sim.tick(0.05);
    world.update(0.05);
    for (const w of world.wizards.values()) {
      // The doorway (the door's own tile, outside the cross) is the only place off the floor.
      const doorway = Math.floor(w.x) === Math.floor(M.DOOR.x) && Math.floor(w.y) === Math.floor(M.DOOR.y);
      if (!doorway) ok(M.free(Math.floor(w.x), Math.floor(w.y)), `wizard ${w.id} never walks into furniture (${w.x.toFixed(2)}, ${w.y.toFixed(2)})`);
    }
  }
  validateAll(events);
  const done = events.filter(e => e.t === 'task.done');
  ok(done.length === n, `all ${n} tasks done (got ${done.length})`);
  ok(Math.max(...done.map(e => e.ts)) - T0 < 120000, 'the whole spell finishes in under 2 simulated minutes');
  ok(events.filter(e => e.t === 'agent.summoned').length === n, 'one wizard per task');
  log1 = events;
}

// 2) manual review: reject once (with a comment), then approve
{
  let rejected = false;
  const { sim, world, events } = run(5, (ev, s) => {
    if (ev.t !== 'review.requested') return;
    if (!rejected) { rejected = true; s.at(0.5, () => s.reject(ev.task, 'Usa un nombre más claro')); } else s.at(0.5, () => s.approve(ev.task));
  });
  const n = sim.cast('Fix the login form');
  for (let t = 0; t < 200; t += 0.05) { sim.tick(0.05); world.update(0.05); }
  validateAll(events);
  ok(events.some(e => e.t === 'review.rejected' && e.comment === 'Usa un nombre más claro'), 'a rejection carries the comment');
  ok(events.filter(e => e.t === 'task.done').length === n, 'every task ends after the rejection');
}

// 3) a negative or NaN dt (a browser's first frame) never moves time back
{
  const { sim, world, events } = run(7);
  sim.cast('Refactor the settings page');
  sim.tick(-0.016); world.update(-0.016);
  sim.tick(NaN); world.update(NaN);
  ok(sim.t === 0 && world.time === 0, `time stays at 0 (sim ${sim.t}, world ${world.time})`);
  for (let t = 0; t < 5; t += 0.05) { sim.tick(0.05); world.update(0.05); }
  ok(world.time > 0 && events.every(e => e.ts >= T0), 'the clock then runs forward and no event goes before t0');
}

// 4) replaying every event twice has no double effects (event sourcing, reconnections)
{
  const once = new World(9), twice = new World(9);
  let applied = 0, ignored = 0;
  for (const ev of log1) {
    once.handle(ev);
    if (twice.handle(ev)) applied++;
    if (!twice.handle(ev)) ignored++;
  }
  ok(applied === log1.length && ignored === log1.length, `each event applied once and its repeat ignored (${applied}/${ignored})`);
  for (let t = 0; t < 30; t += 0.05) { once.update(0.05); twice.update(0.05); }
  ok(snapshot(once) === snapshot(twice), 'the room after a doubled log equals the room after the log');
}

// 5) gaps: work from an agent the room never saw brings that wizard in, and it reaches the table
{
  const w = new World(1);
  w.handle({ v: 1, t: 'code.write', seq: 1, ts: T0, room: 'r', agent: 'ghost', file: 'a.js', diff: '+x' });
  ok(w.wizards.has('ghost'), 'an unknown agent is brought in on its first work event');
  ok(w.wizards.get('ghost').guild === 'unknown', 'and painted with the neutral guild');
  for (let t = 0; t < 20; t += 0.05) w.update(0.05);
  const g = w.wizards.get('ghost');
  ok(g.pose === 'work' && M.STATIONS.table.some(s => Math.hypot(s.x - g.x, s.y - g.y) < 0.01), 'it walks to the lab table and writes');
  w.handle({ v: 1, t: 'task.done', seq: 2, ts: T0, room: 'r', agent: 'nobody', task: 't9', result: 'ok' });
  ok(!w.wizards.has('nobody'), 'a closing event from an unknown agent does not bring anyone in');
}

// 6) a guild the art does not know, and the v1 events, never throw
{
  const w = new World(2);
  const ev = (seq, t, d) => Object.assign({ v: 1, t, seq, ts: T0 + seq, room: 'r' }, d);
  let threw = null;
  try {
    w.handle(ev(1, 'agent.summoned', { agent: 'g1', guild: 'mistral', rank: 'aprendiz', model: 'm', account: 'x' }));
    w.handle(ev(2, 'agent.blocked', { agent: 'g1', reason: 'quota', detail: 'rate_limit' }));
    w.handle(ev(3, 'agent.unblocked', { agent: 'g1' }));
    w.handle(ev(4, 'quota.updated', { account: 'x', status: 'limited' }));
    w.handle(ev(5, 'task.failed', { task: 't1', agent: 'g1', reason: 'max_turns', message: 'too many turns' }));
    w.handle(ev(6, 'agent.summoned', { agent: 'g2', guild: 'anthropic', rank: 'sabio', model: 'm', account: 'x' }));
    w.handle(ev(7, 'task.cancelled', { task: 't2', agent: 'g2', by: 'user' }));
    for (let t = 0; t < 40; t += 0.05) w.update(0.05);
  } catch (e) { threw = e; }
  ok(threw === null, `v1 events and an unknown guild are handled (${threw && threw.message})`);
  ok(!w.wizards.has('g2'), 'a cancelled wizard leaves the room');
  const v = new World(3);
  v.handle(ev(1, 'agent.summoned', { agent: 'g3', guild: 'qwen', rank: 'aprendiz', model: 'm', account: 'x' }));
  for (let t = 0; t < 3; t += 0.05) v.update(0.05);
  const before = v.wizards.get('g3'), x = before.x;
  v.handle(ev(2, 'agent.summoned', { agent: 'g3', guild: 'openai', rank: 'sabio', model: 'm', account: 'x' }));
  ok(v.wizards.get('g3') === before && before.x === x && before.guild === 'qwen', 'summoning an agent already in the room does not reset it');
}

// 7) out of quota the wizard waits in the armchair and does not leave; the room says when one leaves
{
  const w = new World(4);
  const left = [];
  w.onLeave = id => left.push(id);
  const ev = (seq, t, d) => Object.assign({ v: 2, t, seq, ts: T0 + seq, room: 'r' }, d);
  w.handle(ev(1, 'agent.summoned', { agent: 'q1', guild: 'anthropic', rank: 'joven', model: 'sonnet', account: 'x' }));
  w.handle(ev(2, 'agent.assigned', { agent: 'q1', task: 't1' }));
  w.handle(ev(3, 'agent.blocked', { agent: 'q1', reason: 'quota', detail: 'five_hour', until: T0 + 3600000 }));
  for (let t = 0; t < 120; t += 0.05) w.update(0.05);
  const q = w.wizards.get('q1');
  ok(q && M.STATIONS.rest.some(s => Math.hypot(s.x - q.x, s.y - q.y) < 0.01), 'a wizard without quota waits in the armchair, for as long as it takes');
  w.handle(ev(4, 'agent.unblocked', { agent: 'q1' }));
  w.handle(ev(5, 'code.write', { agent: 'q1', file: 'a.js', diff: '+x' }));
  for (let t = 0; t < 20; t += 0.05) w.update(0.05);
  ok(M.STATIONS.table.some(s => Math.hypot(s.x - q.x, s.y - q.y) < 0.01), 'and goes back to the table when it can go on');
  w.handle(ev(6, 'command.run', { agent: 'q1', command: 'npm test', failed: false }));
  w.handle(ev(7, 'command.denied', { agent: 'q1', tool: 'Bash', command: 'git push' }));
  w.handle(ev(8, 'task.cancelled', { task: 't1', agent: 'q1', by: 'user' }));
  for (let t = 0; t < 30; t += 0.05) w.update(0.05);
  ok(left.join() === 'q1', `the room is told when a wizard walks out (${left.join()})`);
}

// 8) rebuilding the room from a log: wizards straight at their station, removed at once
{
  const w = new World(5);
  const a = w.place('p1', 'anthropic', 'joven', 'board', '!');
  ok(M.STATIONS.board.some(s => Math.hypot(s.x - a.x, s.y - a.y) < 0.01) && a.pose === 'idle', 'place() puts a wizard at its station without walking');
  const b = w.place('p2', 'anthropic', 'aprendiz', 'rest', 'z');
  for (let t = 0; t < 30; t += 0.05) w.update(0.05);
  ok(w.wizards.has('p1') && w.wizards.has('p2') && Math.hypot(b.x - a.x, b.y - a.y) > 0.5, 'and they stay there, in different places, until something happens');
  w.remove('p1');
  ok(!w.wizards.has('p1'), 'remove() takes a wizard out at once');
  w.handle({ v: 2, t: 'code.write', seq: 1, ts: T0, room: 'r', agent: 'p2', file: 'a.js', diff: '+x' });
  for (let t = 0; t < 20; t += 0.05) w.update(0.05);
  ok(M.STATIONS.table.some(s => Math.hypot(s.x - b.x, s.y - b.y) < 0.01), 'a placed wizard picks up live events as usual');
}

// 9) step 4: room capacity, queues at full stations, pace, health and states
{
  const w = new World(6);
  let seq = 0;
  const ev = (t, d) => Object.assign({ v: 2, t, seq: ++seq, ts: T0 + seq, room: 'r' }, d);
  for (let i = 0; i < 14; i++) w.handle(ev('agent.summoned', { agent: 'c' + i, guild: 'anthropic', rank: 'aprendiz', model: 'm', account: 'x' }));
  const inside = [...w.wizards.values()].filter(z => !z.outside).length;
  ok(inside === M.CAPACITY && w.outside.length === 14 - M.CAPACITY, `at most ${M.CAPACITY} wizards inside; the rest wait outside (${inside} in, ${w.outside.length} out)`);
  ok(w.stateOf(w.wizards.get('c13')) === 'fuera', 'a wizard waiting outside is in state "fuera"');
  for (let i = 0; i < 4; i++) w.handle(ev('artifact.present', { agent: 'c' + i, task: 't' + i, artifact: 'a', diff: '+x' }));
  for (let t = 0; t < 30; t += 0.05) w.update(0.05);
  const four = ['c0', 'c1', 'c2', 'c3'].map(id => w.wizards.get(id));
  const spots = four.map(z => z.x.toFixed(2) + ',' + z.y.toFixed(2));
  ok(new Set(spots).size === 4, `no two wizards share a place at a full station (${spots.join(' ')})`);
  ok(four.filter(z => w.stateOf(z) === 'en cola').length === 2, 'the board has two places: two wizards queue next to it');
  ok(four.every(z => M.free(Math.floor(z.x), Math.floor(z.y))), 'the queue stands on free tiles');
  w.handle(ev('task.cancelled', { task: 't0', agent: 'c0', by: 'user' }));
  w.handle(ev('task.cancelled', { task: 't1', agent: 'c1', by: 'user' }));
  for (let t = 0; t < 30; t += 0.05) w.update(0.05);
  ok(w.outside.length === 14 - M.CAPACITY - 2, 'when two leave, two come in from outside');
  ok(['c2', 'c3'].every(id => w.stateOf(w.wizards.get(id)) !== 'en cola'), 'and the queue moves up to the board');
}
{
  const w = new World(7);
  let seq = 0;
  const ev = (t, d) => Object.assign({ v: 2, t, seq: ++seq, ts: T0 + seq, room: 'r' }, d);
  w.handle(ev('agent.summoned', { agent: 'b1', guild: 'anthropic', rank: 'joven', model: 'm', account: 'x' }));
  for (let i = 0; i < 12; i++) w.handle(ev('code.write', { agent: 'b1', file: 'f' + i, diff: '+x' }));
  const b = w.wizards.get('b1');
  ok(b.actions.length <= 3, `a burst of 12 writes is one longer visit to the table (${b.actions.length} actions pending)`);
  for (let i = 0; i < 6; i++) { w.handle(ev('context.read', { agent: 'b1', files: [] })); w.handle(ev('code.write', { agent: 'b1', file: 'g', diff: '+y' })); }
  ok(b.actions.length <= M.BACKLOG + 2 && b.hurry, `a long backlog is compressed and the wizard hurries (${b.actions.length} pending)`);
  for (let t = 0; t < 40; t += 0.05) w.update(0.05);
  ok(M.STATIONS.table.some(s => Math.hypot(s.x - b.x, s.y - b.y) < 0.01) && w.stateOf(b) === 'escribiendo', 'it ends where the log says: writing at the table');
}
{
  const w = new World(8);
  let seq = 0;
  const ev = (t, d) => Object.assign({ v: 2, t, seq: ++seq, ts: T0 + seq, room: 'r' }, d);
  const h0 = w.health;
  w.handle(ev('tokens.used', { agent: 'x', account: 'a', input: 99999, output: 99999, cache: 0, cost_usd: 9 }));
  ok(w.health === h0, 'spending tokens does not change the project\'s health');
  w.handle(ev('task.failed', { task: 't1', reason: 'error', message: 'x' }));
  const h1 = w.health;
  ok(h1 < h0, 'a failure lowers it');
  w.handle(ev('task.done', { agent: 'x', task: 't2', result: 'ok' }));
  ok(w.health > h1 && w.health <= 1, 'a finished task raises it, never above 1');
}

// 10) step 6e: a rectangular room, 16 x 12, read from the art's plan
{
  ok(M.W === 16 && M.D === 12 && M.inRoom(0, 0) && M.inRoom(15, 11) && !M.inRoom(16, 0) && !M.inRoom(0, 12), 'the room is a 16 x 12 rectangle');
  ok(M.free(Math.floor(M.ENTRY.x), Math.floor(M.ENTRY.y)) && !M.inRoom(Math.floor(M.DOOR.x), Math.floor(M.DOOR.y)), 'the door opens from outside onto a free tile');
  const all = Object.values(M.STATIONS).flat().map(s => Math.floor(s.x) + ',' + Math.floor(s.y));
  ok(new Set(all).size === all.length, 'no two station places share a tile');
}

console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
