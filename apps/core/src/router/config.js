// The Archmage's rank table: rank → model, turns, estimate and a system note. Defaults live in
// ranks.default.json (data, not code: no model name is fixed in the code); the user's file
// overrides any field. Read once when a room starts.
import fs from 'node:fs';
import path from 'node:path';
import { configDir } from '../paths.js';

export const WORKER_RANKS = Object.freeze(['aprendiz', 'joven', 'sabio']);
export const EFFORTS = Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']);
export const MODEL = /^[A-Za-z0-9._[\]-]{1,80}$/;

export function defaultRanks() {
  return JSON.parse(fs.readFileSync(new URL('./ranks.default.json', import.meta.url), 'utf8'));
}

function merge(base, over) {
  const out = structuredClone(base);
  for (const r of WORKER_RANKS) if (over.ranks && over.ranks[r]) Object.assign(out.ranks[r], over.ranks[r]);
  if (over.router) Object.assign(out.router, over.router);
  return out;
}

/** Throws with a readable message when the table cannot be used. */
export function checkRanks(t) {
  const bad = m => { throw new Error(`ranks: ${m}`); };
  for (const r of WORKER_RANKS) {
    const x = t.ranks && t.ranks[r];
    if (!x) bad(`missing rank ${r}`);
    if (typeof x.model !== 'string' || !MODEL.test(x.model)) bad(`${r}.model must be a Claude Code alias or model id`);
    if (x.effort !== undefined && !EFFORTS.includes(x.effort)) bad(`${r}.effort must be one of ${EFFORTS.join(', ')}`);
    if (!Number.isSafeInteger(x.maxTurns) || x.maxTurns < 1 || x.maxTurns > 200) bad(`${r}.maxTurns must be 1–200`);
    if (!Number.isSafeInteger(x.estimate) || x.estimate < 0) bad(`${r}.estimate must be a whole number of tokens`);
    if (typeof x.note !== 'string' || x.note.length > 2000) bad(`${r}.note must be text (up to 2000 characters)`);
  }
  const ro = t.router || bad('missing router');
  if (!WORKER_RANKS.includes(ro.default)) bad('router.default must be aprendiz, joven or sabio');
  for (const k of ['downgradeAt', 'pauseAt']) if (!(typeof ro[k] === 'number' && ro[k] > 0 && ro[k] <= 1)) bad(`router.${k} must be between 0 and 1`);
  for (const k of ['aprendiz', 'sabio']) if (!Array.isArray(ro[k]) || ro[k].some(w => typeof w !== 'string')) bad(`router.${k} must be a list of words`);
  return t;
}

/** The table in effect: defaults, then the user's file if there is one (or `file`). */
export function loadRanks({ env = process.env, file = null } = {}) {
  const f = file || path.join(configDir(env), 'ranks.json');
  let over = {};
  if (fs.existsSync(f)) {
    try { over = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (err) { throw new Error(`ranks: ${f} is not valid JSON (${err.message})`); }
  }
  const table = checkRanks(merge(defaultRanks(), over));
  return { table, file: fs.existsSync(f) ? f : null };
}
