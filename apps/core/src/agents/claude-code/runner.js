// Runs one headless turn of the user's own, unmodified Claude Code and streams its parsed messages.
// The prompt goes in through stdin, so the spell text never touches a command line or a shell.
// The environment is passed through untouched (the CLI finds its own login there) and never logged.
import { spawnTracked, stopTree } from '../../procs.js';
import { command } from './check.js';

const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;    // some versions print terminal escapes around the JSON
const MAX_LINE = 16 * 1024 * 1024;

/**
 * @param {{bin: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv, prompt: string,
 *   timeoutMs?: number, onMessage?: (msg: any) => void}} o
 * @returns {{child: import('node:child_process').ChildProcess, stop: () => void,
 *   done: Promise<{code: number|null, signal: string|null, killedFor: null|'timeout'|'cancel',
 *   overflow: boolean, stderrTail: string}>}}
 */
export function runClaude({ bin, args, cwd, env = process.env, prompt, timeoutMs = 30 * 60000, onMessage = () => {} }) {
  const [cmd, pre] = command(bin);
  const child = spawnTracked(cmd, [...pre, ...args], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = '', stderr = '', killedFor = null, overflow = false;

  const line = raw => {
    const l = raw.replace(ANSI, '').trim();
    if (!l.startsWith('{')) return;
    let msg;
    try { msg = JSON.parse(l); } catch { return; }
    try { onMessage(msg); } catch { /* the caller's bug must not kill the stream */ }
  };

  child.stdin.on('error', () => {});
  child.stdin.end(prompt);
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', d => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) { line(buf.slice(0, i)); buf = buf.slice(i + 1); }
    if (buf.length > MAX_LINE) { buf = ''; overflow = true; }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', d => { stderr = (stderr + d).slice(-4000); });

  const timer = setTimeout(() => { killedFor = 'timeout'; stopTree(child); }, timeoutMs);
  const tail = () => stderr.trim().split('\n').slice(-3).join(' ').slice(0, 500);
  const done = new Promise(resolve => {
    child.once('error', err => { clearTimeout(timer); resolve({ code: null, signal: null, killedFor, overflow, stderrTail: String(err.message || err).slice(0, 500) }); });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (buf.trim()) line(buf);
      resolve({ code, signal, killedFor, overflow, stderrTail: tail() });
    });
  });
  return {
    child,
    done,
    stop() { if (!killedFor) killedFor = 'cancel'; stopTree(child); },
  };
}
