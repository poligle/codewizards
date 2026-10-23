// CodeWizards · event contract v1.
// The single source of truth for event shapes. The core validates every event before it stores or
// broadcasts it, and the tests check the simulator and every adapter against it. The table for
// humans is in docs/agentes.md («Contrato de eventos v1»). Changing it needs Pol's go-ahead and a
// new `v`.

export const VERSION = 1;

// Guild ids are model makers (Pol, step 1). The room paints any other id with a neutral palette.
export const GUILDS = Object.freeze(['anthropic', 'openai', 'google', 'deepseek', 'qwen', 'meta']);
export const RANKS = Object.freeze(['aprendiz', 'sabio', 'archimago']);
export const BLOCK_REASONS = Object.freeze(['permission', 'quota', 'auth', 'user']);
export const FAIL_REASONS = Object.freeze(['max_turns', 'budget', 'timeout', 'quota', 'auth', 'cap', 'error']);
export const QUOTA_STATUS = Object.freeze(['ok', 'limited', 'exhausted', 'unknown']);
export const CANCEL_BY = Object.freeze(['user', 'cap']);

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,31}$/;

const str = (max, extra) => Object.assign({ type: 'string', max }, extra);
const int0 = { type: 'integer', min: 0 };
const id = { type: 'string', pattern: ID };
const opt = f => Object.assign({}, f, { optional: true });

const ENVELOPE = {
  v: { type: 'integer', enum: [VERSION] },
  t: { type: 'string', max: 40 },
  seq: { type: 'integer', min: 1 },
  ts: { type: 'integer', min: 0 },
  room: { type: 'string', pattern: ID },
};

export const EVENTS = Object.freeze({
  'room.opened': { project: str(120), guild: { type: 'string', pattern: SLUG } },
  'task.created': { task: id, title: str(200), estimate: { type: 'number', min: 0, nullable: true } },
  'agent.summoned': {
    agent: id, guild: { type: 'string', pattern: SLUG }, rank: { type: 'string', enum: RANKS }, model: str(80), account: str(64),
  },
  'agent.assigned': { agent: id, task: id },
  'context.read': { agent: id, files: { type: 'array', max: 200, items: str(512) }, tokens_in: opt(Object.assign({ nullable: true }, int0)) },
  'code.write': { agent: id, file: str(512), diff: str(65536) },
  'artifact.present': { agent: id, task: id, artifact: str(256), diff: str(262144) },
  'tokens.used': {
    agent: id, account: str(64), input: int0, output: int0, cache: int0, cost_usd: { type: 'number', min: 0, nullable: true },
  },
  'review.requested': { agent: id, task: id },
  'review.approved': { agent: id, task: id, comment: str(2000) },
  'review.rejected': { agent: id, task: id, comment: str(2000) },
  'agent.error': { agent: id, message: str(2000) },
  'agent.blocked': { agent: id, reason: { type: 'string', enum: BLOCK_REASONS }, detail: opt(str(200)) },
  'agent.unblocked': { agent: id },
  'quota.updated': {
    account: str(64), status: { type: 'string', enum: QUOTA_STATUS }, resets_at: opt(Object.assign({ nullable: true }, int0)),
  },
  'task.done': { agent: id, task: id, result: str(64), branch: opt(str(200)), pr: opt(str(500)) },
  'task.failed': { task: id, agent: opt(id), reason: { type: 'string', enum: FAIL_REASONS }, message: str(2000) },
  'task.cancelled': { task: id, agent: opt(id), by: { type: 'string', enum: CANCEL_BY } },
  'agent.idle': { agent: id },
});

export const EVENT_TYPES = Object.freeze(Object.keys(EVENTS));

function check(errs, path, val, f) {
  if (val === undefined) {
    if (!f.optional) errs.push(`${path}: missing`);
    return;
  }
  if (val === null) {
    if (!f.nullable) errs.push(`${path}: null`);
    return;
  }
  switch (f.type) {
    case 'string':
      if (typeof val !== 'string') { errs.push(`${path}: not a string`); return; }
      if (f.max !== undefined && val.length > f.max) errs.push(`${path}: longer than ${f.max}`);
      if (f.pattern && !f.pattern.test(val)) errs.push(`${path}: bad format`);
      break;
    case 'integer':
      if (!Number.isSafeInteger(val)) { errs.push(`${path}: not an integer`); return; }
      if (f.min !== undefined && val < f.min) errs.push(`${path}: below ${f.min}`);
      break;
    case 'number':
      if (typeof val !== 'number' || !Number.isFinite(val)) { errs.push(`${path}: not a number`); return; }
      if (f.min !== undefined && val < f.min) errs.push(`${path}: below ${f.min}`);
      break;
    case 'array':
      if (!Array.isArray(val)) { errs.push(`${path}: not an array`); return; }
      if (f.max !== undefined && val.length > f.max) errs.push(`${path}: more than ${f.max} items`);
      val.forEach((x, i) => check(errs, `${path}[${i}]`, x, f.items));
      return;
    default:
      errs.push(`${path}: unknown spec type`);
      return;
  }
  if (f.enum && !f.enum.includes(val)) errs.push(`${path}: not one of ${f.enum.join(', ')}`);
}

/**
 * Validates one event. Returns a list of errors (empty when valid).
 * `draft: true` accepts an event before the store stamps it (no `seq`, `v`, `ts` or `room`).
 * @param {Record<string, unknown>} ev
 * @param {{draft?: boolean}} [opts]
 * @returns {string[]}
 */
export function validate(ev, opts) {
  const draft = !!(opts && opts.draft);
  if (!ev || typeof ev !== 'object' || Array.isArray(ev)) return ['event: not an object'];
  const spec = Object.prototype.hasOwnProperty.call(EVENTS, ev.t) ? EVENTS[ev.t] : null;
  if (!spec) return [`t: unknown type ${JSON.stringify(ev.t)}`];
  const errs = [];
  for (const [k, f] of Object.entries(ENVELOPE)) {
    if (k === 't') continue;
    check(errs, k, ev[k], draft ? Object.assign({}, f, { optional: true }) : f);
  }
  for (const [k, f] of Object.entries(spec)) check(errs, `${ev.t}.${k}`, ev[k], f);
  for (const k of Object.keys(ev)) {
    if (!Object.prototype.hasOwnProperty.call(spec, k) && !Object.prototype.hasOwnProperty.call(ENVELOPE, k)) {
      errs.push(`${ev.t}.${k}: unknown field`);
    }
  }
  return errs;
}
