// Which repository a room belongs to. A room's folder is named after the repository's path; if a
// different repository now lives at that path (deleted and created again), its first commit is
// different, and the old room is archived next to it instead of being mixed with the new one.
import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} dir   the room's folder (rooms/<id>)
 * @param {{repo: string, root: string, now?: () => number}} o   root: the repository's first commit
 * @returns {{archived: string|null}}  where the previous room went, if it belonged to another repository
 */
export function adoptRoomDir(dir, { repo, root, now = () => Date.now() }) {
  const meta = path.join(dir, 'room.json');
  let archived = null;
  if (fs.existsSync(dir)) {
    let old = null;
    try { old = JSON.parse(fs.readFileSync(meta, 'utf8')); } catch { /* a room from before room.json */ }
    if (old && old.root && old.root !== root) {
      const stamp = new Date(now()).toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
      archived = `${dir}.replaced-${stamp}`;
      fs.renameSync(dir, archived);
    }
  }
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (archived || !fs.existsSync(meta)) {
    fs.writeFileSync(meta, JSON.stringify({ repo, root, created: new Date(now()).toISOString() }, null, 2) + '\n', { mode: 0o600 });
  }
  return { archived };
}
