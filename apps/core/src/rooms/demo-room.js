// Demo room: the room's own simulator (apps/room/src/sim.js) running inside the core. Its events go
// through the same store, contract check and WebSocket as a real agent's, so `codewizards demo`
// tests the whole pipeline without any CLI, account or network.
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../../../room/src/', import.meta.url);

export function loadSimClass() {
  const ctx = vm.createContext({});
  for (const f of ['world.js', 'sim.js']) {
    const url = new URL(f, SRC);
    vm.runInContext(fs.readFileSync(url, 'utf8'), ctx, { filename: fileURLToPath(url) });
  }
  return ctx.CW.Sim;
}

export class DemoRoom {
  /** @param {{store: import('../store.js').EventStore, seed?: number, now?: () => number, tickMs?: number}} o
   *  `tickMs: 0` turns the real-time clock off (tests drive it with advance()). */
  constructor({ store, seed = Date.now() % 100000, now = () => Date.now(), tickMs = 100 }) {
    this.store = store;
    const Sim = loadSimClass();
    this.sim = new Sim({ seed, t0: now(), room: store.room, account: 'demo' });
    this.sim.on(ev => {
      const { v, seq, room, ...draft } = ev;    // eslint-disable-line no-unused-vars
      store.append(draft);                        // the store owns seq and room
    });
    this.speed = 1;
    this.last = performance.now();
    this.timer = tickMs > 0 ? setInterval(() => this.tick(), tickMs) : null;
  }

  get mode() { return 'demo'; }
  hello() { return { mode: 'demo', autoApprove: true }; }

  tick() {
    const now = performance.now();
    const dt = Math.min(0.5, Math.max(0, (now - this.last) / 1000)) * this.speed;
    this.last = now;
    this.sim.tick(dt);
  }

  /** Moves simulated time forward by `seconds`, in small steps (tests). */
  advance(seconds, step = 0.1) {
    for (let t = 0; t < seconds; t += step) this.sim.tick(step);
  }

  async handle(cmd) {
    switch (cmd.cmd) {
      case 'cast': this.sim.cast(cmd.text); break;
      case 'approve': this.sim.approve(cmd.task); break;
      case 'reject': this.sim.reject(cmd.task, cmd.comment); break;
      case 'auto': this.sim.setAuto(cmd.on); break;
      case 'speed': this.speed = cmd.speed; break;
      default: break;
    }
  }

  async shutdown() {
    if (this.timer) clearInterval(this.timer);
  }
}
