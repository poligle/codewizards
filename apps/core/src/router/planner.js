// The Archmage as a planner (Pol, 25/10/2026: "the Archmage should give the tasks to different Claude
// models by their complexity"). One cheap call to Claude Code, with no tools and a system prompt of its
// own, splits a spell into 1 to 4 tasks that run one after another on the same branch, each with the
// rank its complexity calls for; the rank table (ranks.json) then gives each one its model and effort.
// If anything goes wrong the rules of router.js take over, so a spell is never lost.
import { runClaude } from '../agents/claude-code/runner.js';
import { WORKER_RANKS } from './config.js';

export const PLAN_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['tasks'],
  properties: {
    tasks: {
      type: 'array', minItems: 1, maxItems: 4,
      items: {
        type: 'object', additionalProperties: false, required: ['title', 'prompt', 'rank', 'why'],
        properties: {
          title: { type: 'string', maxLength: 80 },
          prompt: { type: 'string', maxLength: 2000 },
          rank: { type: 'string', enum: [...WORKER_RANKS] },
          why: { type: 'string', maxLength: 140 },
        },
      },
    },
  },
});

export const PLANNER_PROMPT = [
  'You are the Archmage of CodeWizards. You never write code: you plan.',
  'Split the request into 1 to 4 tasks for coding agents that work one after another in the same git repository;',
  'each task starts from the changes the previous ones made, after a human approved them.',
  'Use as few tasks as the work needs: a small or single-file change is ONE task. Never add tasks only to explain or review.',
  'Give each task the rank its complexity calls for:',
  'aprendiz for trivial work (a typo, a rename, a small text or docs change, one small function);',
  'joven for an ordinary feature or fix across a few files;',
  'sabio for hard work (design, a refactor across many files, tricky algorithms, concurrency, security, performance).',
  'Write each prompt as a self-contained instruction for its agent, in the language of the request.',
  'Titles are short (under 60 characters). "why" says in a few words why that rank.',
].join(' ');

/** The arguments of the planning call (exported for the tests). */
export function plannerArgs(model) {
  return ['-p', '--output-format', 'json', '--model', model, '--tools', '', '--max-turns', '2', '--permission-mode', 'dontAsk',
    '--system-prompt', PLANNER_PROMPT, '--json-schema', JSON.stringify(PLAN_SCHEMA)];
}

const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Checks a plan and keeps only what CodeWizards can run; throws when there is nothing usable. */
export function checkPlan(raw, maxTasks = 4) {
  const list = raw && Array.isArray(raw.tasks) ? raw.tasks : null;
  if (!list || !list.length) throw new Error('the Archmage returned no tasks');
  const tasks = list.slice(0, maxTasks).map(t => ({
    title: clean(t && t.title, 80), prompt: String((t && t.prompt) || '').trim().slice(0, 2000),
    rank: WORKER_RANKS.includes(t && t.rank) ? t.rank : 'joven', why: clean(t && t.why, 140),
  })).filter(t => t.title && t.prompt);
  if (!tasks.length) throw new Error('the Archmage returned tasks without a title or a prompt');
  return tasks;
}

/**
 * @param {{text: string, bin: string, env: NodeJS.ProcessEnv, cwd: string, model: string, timeoutMs: number, maxTasks: number}} o
 * @returns {Promise<{tasks: {title: string, prompt: string, rank: string, why: string}[], usage: any, cost: number|null}>}
 */
export async function planSpell({ text, bin, env, cwd, model, timeoutMs, maxTasks }) {
  let last = null;
  const run = runClaude({ bin, args: plannerArgs(model), cwd, env, prompt: String(text), timeoutMs, onMessage: m => { last = m; } });
  const exit = await run.done;
  if (!last) throw new Error(`the planning call ended (${exit.code ?? exit.signal ?? exit.killedFor}) without an answer`);
  if (last.is_error) throw new Error(String(last.result || last.subtype || 'the planning call failed').slice(0, 300));
  let raw = last.structured_output;
  if (!raw && typeof last.result === 'string') {
    const m = /\{[\s\S]*\}/.exec(last.result);
    try { raw = m ? JSON.parse(m[0]) : null; } catch { raw = null; }
  }
  return { tasks: checkPlan(raw, maxTasks), usage: last.usage || {}, cost: typeof last.total_cost_usd === 'number' ? last.total_cost_usd : null };
}
