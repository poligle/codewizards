// Is Claude Code installed and signed in? CodeWizards asks the CLI itself (`claude --version`,
// `claude auth status`) and keeps only the exit codes: it never reads, prints or stores what the CLI
// knows about the account. Signing in happens in the CLI's own flow (`claude`, then /login).
import { run } from '../../exec.js';
import { which } from '../../which.js';

/** How to launch a binary: a .js/.mjs file (the tests' fake CLI) runs with this node. */
export function command(bin) {
  return /\.(mjs|cjs|js)$/i.test(bin) ? [process.execPath, [bin]] : [bin, []];
}

export function findClaude(env = process.env, platform = process.platform) {
  return env.CW_CLAUDE_BIN || which('claude', env, platform);
}

/**
 * @returns {Promise<{ok: boolean, bin: string|null, version: string|null, signedIn: boolean|null,
 *   problem: null|'not-found'|'windows-shim'|'broken'|'signed-out'}>}
 */
export async function checkClaude({ env = process.env, platform = process.platform } = {}) {
  const bin = findClaude(env, platform);
  if (!bin) return { ok: false, bin: null, version: null, signedIn: null, problem: 'not-found' };
  // npm's claude.cmd needs cmd.exe, which would re-parse our arguments: only the native claude.exe.
  if (platform === 'win32' && /\.(cmd|bat)$/i.test(bin)) return { ok: false, bin, version: null, signedIn: null, problem: 'windows-shim' };
  const [cmd, pre] = command(bin);
  const v = await run(cmd, [...pre, '--version'], { env, timeoutMs: 20000 });
  if (v.code !== 0) return { ok: false, bin, version: null, signedIn: null, problem: 'broken' };
  const version = v.stdout.trim().split('\n')[0].slice(0, 80);
  const a = await run(cmd, [...pre, 'auth', 'status'], { env, timeoutMs: 20000 });
  const signedIn = a.code === 0;
  return { ok: signedIn, bin, version, signedIn, problem: signedIn ? null : 'signed-out' };
}
