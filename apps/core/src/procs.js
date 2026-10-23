// Child processes of the agents. Each one runs in its own process group (POSIX) so that stopping a
// wizard also stops whatever its CLI started; on Windows, taskkill /T does the same.
import { spawn, execFile } from 'node:child_process';

const live = new Set();

export function spawnTracked(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { ...opts, shell: false, windowsHide: true, detached: process.platform !== 'win32' });
  live.add(child);
  child.once('exit', () => live.delete(child));
  child.once('error', () => live.delete(child));
  return child;
}

const alive = c => c && c.pid && c.exitCode === null && c.signalCode === null;

export function killTree(child, signal = 'SIGTERM') {
  if (!alive(child)) return;
  if (process.platform === 'win32') {
    execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }, () => {});
    return;
  }
  try { process.kill(-child.pid, signal); } catch { try { child.kill(signal); } catch { /* already gone */ } }
}

/** SIGTERM to the whole tree, then SIGKILL if it is still there after `graceMs`. */
export function stopTree(child, graceMs = 3000) {
  killTree(child, 'SIGTERM');
  const t = setTimeout(() => killTree(child, 'SIGKILL'), graceMs);
  t.unref();
}

export function killAll() {
  for (const c of live) killTree(c, 'SIGKILL');
}
