// Where CodeWizards keeps its local data: event logs, worktrees and per-task settings. Nothing
// leaves this folder and nothing in it is a credential. CODEWIZARDS_HOME overrides it (tests).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function dataDir(env = process.env, platform = process.platform) {
  if (env.CODEWIZARDS_HOME) return path.resolve(env.CODEWIZARDS_HOME);
  const home = os.homedir();
  if (platform === 'win32') return path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'CodeWizards');
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'CodeWizards');
  return path.join(env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'codewizards');
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true, mode: 0o700 });
  return p;
}

export function roomDir(roomId, env = process.env) {
  return path.join(dataDir(env), 'rooms', roomId);
}

// Where the user's settings live (ranks.json). CODEWIZARDS_CONFIG overrides it (tests).
export function configDir(env = process.env, platform = process.platform) {
  if (env.CODEWIZARDS_CONFIG) return path.resolve(env.CODEWIZARDS_CONFIG);
  const home = os.homedir();
  if (platform === 'win32') return path.join(env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'CodeWizards');
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'CodeWizards');
  return path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'codewizards');
}
