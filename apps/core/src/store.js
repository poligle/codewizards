// The room's event log. It is the only writer of `seq` and `room`: it stamps each draft, checks it
// against the contract, masks known secret formats and appends it to a local JSON Lines file
// (owner-only permissions). Replaying the file rebuilds the room (event sourcing).
import fs from 'node:fs';
import path from 'node:path';
import { VERSION, validate } from '../../../packages/contract/contract.js';
import { redactEvent } from './redact.js';

export class ContractError extends Error {
  constructor(t, errors) {
    super(`event ${t} breaks contract v${VERSION}: ${errors.slice(0, 3).join('; ')}`);
    this.errors = errors;
  }
}

export class EventStore {
  /** @param {{room: string, file?: string|null, now?: () => number}} opts */
  constructor({ room, file = null, now = () => Date.now() }) {
    this.room = room;
    this.file = file;
    this.now = now;
    this.events = [];
    this.seq = 0;
    this.listeners = new Set();
    if (file) this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
    if (!fs.existsSync(this.file)) return;
    for (const line of fs.readFileSync(this.file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let ev;
      try { ev = JSON.parse(line); } catch { continue; }      // a torn last line after a crash
      if (ev.room !== this.room || !(ev.seq > this.seq) || validate(ev).length) continue;
      this.events.push(ev);
      this.seq = ev.seq;
    }
  }

  /** Stamps, checks and stores one draft (`{t, ...fields}`, optional `ts`). Returns the event. */
  append(draft) {
    const { v, t, seq, ts, room, ...fields } = draft;    // eslint-disable-line no-unused-vars
    const ev = redactEvent({
      v: VERSION, t, seq: this.seq + 1, ts: Number.isSafeInteger(ts) && ts >= 0 ? ts : this.now(), room: this.room, ...fields,
    });
    const errs = validate(ev);
    if (errs.length) throw new ContractError(t, errs);
    this.seq = ev.seq;
    this.events.push(ev);
    if (this.file) fs.appendFileSync(this.file, JSON.stringify(ev) + '\n', { mode: 0o600 });
    for (const fn of this.listeners) {
      try { fn(ev); } catch { /* a listener never breaks the log */ }
    }
    return ev;
  }

  since(seq = 0) {
    if (!(seq > 0)) return this.events.slice();
    let i = this.events.length;
    while (i > 0 && this.events[i - 1].seq > seq) i--;
    return this.events.slice(i);
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
