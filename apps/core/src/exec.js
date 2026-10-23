// Runs a program and captures its output. No shell: arguments are an array and nothing in them is
// ever interpreted by a shell.
import { execFile } from 'node:child_process';

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{cwd?: string, env?: NodeJS.ProcessEnv, timeoutMs?: number, input?: string}} [opts]
 * @returns {Promise<{code: number, stdout: string, stderr: string, error: string|null}>}
 */
export function run(cmd, args, opts = {}) {
  const { cwd, env, timeoutMs = 60000, input } = opts;
  return new Promise(resolve => {
    const child = execFile(cmd, args, {
      cwd, env, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true, encoding: 'utf8',
    }, (err, stdout, stderr) => {
      if (!err) { resolve({ code: 0, stdout, stderr, error: null }); return; }
      const code = typeof err.code === 'number' ? err.code : -1;
      resolve({ code, stdout: stdout || '', stderr: stderr || '', error: code === -1 ? String(err.code || err.signal || err.message) : null });
    });
    if (child.stdin) {
      child.stdin.on('error', () => {});
      child.stdin.end(input === undefined ? undefined : input);
    }
  });
}
