// The Archmage, v1: a router without a model. It reads the spell, picks a rank with plain rules
// (or takes the one the user chose), looks at the quota left and gives the model, turns, system
// note and token estimate for the task. It costs no tokens. A model-based Archmage only comes in if
// an eval shows that it routes better than these rules by more than it costs (docs: §5 of
// auditorias/orquestacion.md).
import { WORKER_RANKS } from './config.js';

const FILE = /(?:^|[\s`'"(])[\w./-]+\.(?:js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|rb|php|c|h|cc|cpp|hpp|cs|swift|kt|md|json|ya?ml|toml|css|html|sh|sql)\b/gi;
const lower = r => (r === 'sabio' ? 'joven' : 'aprendiz');

/** Plain rules: words that mark a big or a small job, the size of the spell, the files it names. */
export function classify(text, table) {
  const t = ` ${String(text).toLowerCase()} `;
  const files = (String(text).match(FILE) || []).length;
  const hit = list => list.find(w => t.includes(w.toLowerCase()));
  const big = hit(table.router.sabio);
  if (big) return { rank: 'sabio', reason: `big job: "${big.trim()}"` };
  if (files >= 4 || text.length > 600) return { rank: 'sabio', reason: files >= 4 ? `${files} files named` : 'long spell' };
  const small = hit(table.router.aprendiz);
  if (small && text.length <= 200 && files <= 1) return { rank: 'aprendiz', reason: `small job: "${small.trim()}"` };
  return { rank: table.router.default, reason: 'default rank' };
}

/** Median of the last ten real costs of a rank, once there are three; else the table's estimate. */
export function estimate(rank, table, history = {}) {
  const seen = (history[rank] || []).slice(-10);
  if (seen.length < 3) return table.ranks[rank].estimate;
  const s = [...seen].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * @param {{text: string, override?: string|null, table: any, quota?: Record<string, {status: string, utilization: number|null, resets_at: number|null}>,
 *   history?: Record<string, number[]>}} o
 * @returns {{rank: string, model: string, maxTurns: number, note: string, estimate: number, reason: string,
 *   wait: null|{until: number|null, reason: string}}}
 */
export function route({ text, override = null, table, quota = {}, history = {} }) {
  let { rank, reason } = override && WORKER_RANKS.includes(override)
    ? { rank: override, reason: 'chosen by you' } : classify(text, table);
  const q = quota.five_hour || null;
  const used = q && typeof q.utilization === 'number' ? q.utilization : null;
  let wait = null;
  if (q && (q.status === 'exhausted' || (used !== null && used >= table.router.pauseAt))) {
    wait = { until: q.resets_at || null, reason: `the 5-hour window is ${used === null ? 'used up' : `at ${Math.round(used * 100)} %`}` };
  } else if (!override && used !== null && used >= table.router.downgradeAt && rank !== 'aprendiz') {
    rank = lower(rank);
    reason += ` · 5-hour window at ${Math.round(used * 100)} %: one rank down`;
  }
  const r = table.ranks[rank];
  return { rank, model: r.model, maxTurns: r.maxTurns, note: r.note, estimate: estimate(rank, table, history), reason, wait };
}
