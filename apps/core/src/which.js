// Finds a program on PATH the way a shell would, without running a shell.
import fs from 'node:fs';
import path from 'node:path';

function isExec(p, platform) {
  try {
    if (!fs.statSync(p).isFile()) return false;
    if (platform !== 'win32') fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} cmd  program name (`claude`) or a path
 * @returns {string|null} absolute path, or null when it is not installed
 */
export function which(cmd, env = process.env, platform = process.platform) {
  if (cmd.includes('/') || cmd.includes('\\')) return isExec(cmd, platform) ? path.resolve(cmd) : null;
  const dirs = String(env.PATH || env.Path || '').split(path.delimiter).filter(Boolean);
  const exts = platform === 'win32' ? String(env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean) : [''];
  for (const d of dirs) {
    for (const e of exts) {
      const p = path.join(d, cmd + e);
      if (isExec(p, platform)) return p;
    }
  }
  return null;
}
