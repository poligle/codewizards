// La Torre: the rooms this user has, and founding new ones from the browser (step 5, round 2).
// A room is a git repository. Founding one "on an existing repository" needs a repository with at
// least one commit; "in a new repository" creates the folder, a README and a first commit with the
// user's own git identity. Rooms stay open in the core once entered.
import fs from 'node:fs';
import path from 'node:path';
import { dataDir } from '../paths.js';
import { git } from '../git.js';

export class Tower {
  /** @param {{open: (repo: string) => Promise<{id: string, room: any, store: any}>, env?: NodeJS.ProcessEnv}} o */
  constructor({ open, env = process.env }) {
    this.openRepo = open;
    this.env = env;
    this.rooms = new Map();
  }

  add(r) { this.rooms.set(r.id, r); return r; }

  /** The rooms on disk (archived ones left out), by name. */
  list() {
    const base = path.join(dataDir(this.env), 'rooms');
    const out = [];
    for (const d of fs.existsSync(base) ? fs.readdirSync(base) : []) {
      if (d.includes('.replaced-')) continue;
      try {
        const m = JSON.parse(fs.readFileSync(path.join(base, d, 'room.json'), 'utf8'));
        out.push({ id: d, name: path.basename(m.repo), repo: m.repo, open: this.rooms.has(d), exists: fs.existsSync(m.repo) });
      } catch { /* not a room */ }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name) || a.repo.localeCompare(b.repo));
  }

  async enter(id) {
    if (this.rooms.has(id)) return this.rooms.get(id);
    const meta = this.list().find(r => r.id === id);
    if (!meta) throw new Error('there is no such room');
    if (!meta.exists) throw new Error(`the repository of this room is gone (${meta.repo})`);
    return this.add(await this.openRepo(meta.repo));
  }

  /** @param {{path: string, create: boolean}} o */
  async found({ path: p, create }) {
    if (typeof p !== 'string' || !p.trim() || !path.isAbsolute(p.trim())) throw new Error('write the full path of the folder');
    const abs = path.resolve(p.trim());
    if (abs.startsWith(dataDir(this.env))) throw new Error('that folder belongs to CodeWizards itself');
    if (create) {
      if (fs.existsSync(path.join(abs, '.git'))) throw new Error('there is a repository there already: found the room on an existing repository');
      fs.mkdirSync(abs, { recursive: true });
      await git(abs, ['init', '-q', '-b', 'main']);
      if (!fs.existsSync(path.join(abs, 'README.md'))) fs.writeFileSync(path.join(abs, 'README.md'), `# ${path.basename(abs)}\n`);
      await git(abs, ['add', '-A']);
      try {
        await git(abs, ['commit', '-q', '-m', 'First commit']);
      } catch (err) {
        throw new Error(`the first commit failed (${err.message}): set your name and e-mail in git (git config --global user.name and user.email) and try again`);
      }
    } else if (!fs.existsSync(abs)) throw new Error('that folder does not exist');
    return this.add(await this.openRepo(abs));
  }

  async shutdown() {
    await Promise.allSettled([...this.rooms.values()].map(r => r.room.shutdown()));
  }
}
