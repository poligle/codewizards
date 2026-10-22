// Node tests for the mockup logic: paths, event contract v0 and a full spell end to end.
// Run: node apps/maqueta/test/maqueta.test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
globalThis.CW = {};
for (const f of ['world.js', 'sim.js']) vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
const { World, Sim, SCHEMA, ROOM_META: M } = globalThis.CW;

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.error('✗', msg); } };

for (const [name, list] of Object.entries(M.STATIONS)) {
  list.forEach((s, i) => {
    ok(M.free(Math.floor(s.x), Math.floor(s.y)), `${name}[${i}] stands on a free tile`);
    ok(M.astar(0, 10, Math.floor(s.x), Math.floor(s.y)) !== null, `${name}[${i}] is reachable from the door`);
  });
}

function run(seed, onEvent) {
  const sim = new Sim({ seed }), world = new World(seed), events = [];
  sim.on(ev => { events.push(ev); world.handle(ev); if (onEvent) onEvent(ev, sim); });
  return { sim, world, events };
}

function validate(events) {
  let lastTs = 0;
  for (const ev of events) {
    ok(ev.v === 0, `${ev.t}: v = 0`);
    ok(SCHEMA[ev.t] !== undefined, `${ev.t}: known type`);
    for (const k of SCHEMA[ev.t] || []) ok(ev[k] !== undefined, `${ev.t}: has ${k}`);
    ok(ev.ts >= lastTs, `${ev.t}: ts does not go back`);
    lastTs = ev.ts;
  }
}

// 1) one spell end to end with auto-approval
{
  const { sim, world, events } = run(3);
  sim.setAuto(true);
  const n = sim.cast('Añade un modo oscuro a la página de ajustes');
  for (let t = 0; t < 150; t += 0.05) {
    sim.tick(0.05);
    world.update(0.05);
    for (const w of world.wizards.values()) {
      if (w.x >= 0.05) ok(M.free(Math.floor(w.x), Math.floor(w.y)), `wizard ${w.id} never walks into furniture (${w.x.toFixed(2)}, ${w.y.toFixed(2)})`);
    }
  }
  validate(events);
  const done = events.filter(e => e.t === 'task.done');
  ok(done.length === n, `all ${n} tasks done (got ${done.length})`);
  ok(Math.max(...done.map(e => e.ts)) < 120000, 'the whole spell finishes in under 2 simulated minutes');
  ok(events.filter(e => e.t === 'agent.summoned').length === n, 'one wizard per task');
}

// 2) manual review: reject once, then approve
{
  let rejected = false;
  const { sim, world, events } = run(5, (ev, s) => {
    if (ev.t !== 'review.requested') return;
    if (!rejected) { rejected = true; s.at(0.5, () => s.reject(ev.task)); } else s.at(0.5, () => s.approve(ev.task));
  });
  const n = sim.cast('Fix the login form');
  for (let t = 0; t < 200; t += 0.05) { sim.tick(0.05); world.update(0.05); }
  validate(events);
  ok(events.some(e => e.t === 'review.rejected'), 'a rejection happens');
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
  ok(world.time > 0 && events.every(e => e.ts >= 0), 'the clock then runs forward and no event has a negative ts');
}

console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
