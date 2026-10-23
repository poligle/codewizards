// What a Claude Code wizard may do, and the command line that enforces it.
// Layers (docs/arquitectura.md §7): its own worktree; Claude Code's permission rules in `dontAsk`
// mode (anything not allowed is denied, no prompts); Claude Code's OS sandbox for Bash, required to
// start (`failIfUnavailable`) and without its escape hatch; turn and time caps. The agent never
// pushes and never opens a pull request: CodeWizards does that after the user approves.
export const READ_TOOLS = Object.freeze(['Read', 'Grep', 'Glob']);
export const WRITE_TOOLS = Object.freeze(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
export const DENY = Object.freeze([
  'Bash(git push)', 'Bash(git push *)', 'Bash(gh *)', 'Bash(curl *)', 'Bash(wget *)', 'WebFetch', 'WebSearch',
]);
// A project's test command, as typed by the user in `--test-command` ("npm test", "pytest -q").
const SAFE_COMMAND = /^[A-Za-z0-9][A-Za-z0-9 _.,:=+/@-]{0,120}$/;
const MODEL = /^[A-Za-z0-9._[\]-]{1,80}$/;

/**
 * @param {{platform?: string, testCommand?: string|null, sandbox?: boolean, allowedDomains?: string[]}} [o]
 */
export function buildPolicy({ platform = process.platform, testCommand = null, sandbox = true, allowedDomains = [] } = {}) {
  // Native Windows has no Claude Code sandbox (it needs WSL2): there the wizards get no Bash at all
  // (Pol's decision, step 2).
  const bash = platform !== 'win32';
  const tools = [...READ_TOOLS, ...WRITE_TOOLS];
  const allow = [...READ_TOOLS, ...WRITE_TOOLS];
  if (bash) {
    tools.push('Bash');
    allow.push('Bash(git status)', 'Bash(git diff *)', 'Bash(git log *)');
    if (testCommand) {
      if (!SAFE_COMMAND.test(testCommand)) throw new Error('--test-command: use a plain command such as "npm test" (no quotes, pipes or ;)');
      allow.push(`Bash(${testCommand})`, `Bash(${testCommand} *)`);
    }
  }
  const sandboxed = bash && sandbox;
  const settings = sandboxed
    ? { sandbox: { enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, network: { allowedDomains: [...allowedDomains] } } }
    : null;
  return { tools, allow, deny: [...DENY], settings, bash, sandboxed };
}

export function systemNote(branch) {
  return `You are a CodeWizards wizard working in a git worktree on branch ${branch}. ` +
    'Make the requested change and keep it focused. Do not commit, push or open pull requests: ' +
    'CodeWizards commits your work after the user approves it.';
}

/**
 * Arguments for one headless turn. The prompt is not here: it goes in through stdin.
 * @param {{sessionId: string, resume?: boolean, policy: ReturnType<typeof buildPolicy>, model?: string|null,
 *   maxTurns?: number, maxBudgetUsd?: number|null, settingsFile?: string|null, note?: string|null}} o
 */
export function claudeArgs({ sessionId, resume = false, policy, model = null, maxTurns = 40, maxBudgetUsd = null, settingsFile = null, note = null }) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) throw new Error('session id must be a UUID');
  const a = ['-p', '--output-format', 'stream-json', '--verbose'];
  a.push(resume ? '--resume' : '--session-id', sessionId);
  a.push('--permission-mode', 'dontAsk');
  a.push('--tools', policy.tools.join(','));
  a.push('--allowedTools', ...policy.allow);
  a.push('--disallowedTools', ...policy.deny);
  a.push('--max-turns', String(Math.max(1, Math.floor(maxTurns))));
  if (maxBudgetUsd) a.push('--max-budget-usd', String(maxBudgetUsd));
  if (model) {
    if (!MODEL.test(model)) throw new Error('--model: unexpected characters');
    a.push('--model', model);
  }
  if (settingsFile) a.push('--settings', settingsFile);
  if (note) a.push('--append-system-prompt', note);
  return a;
}
