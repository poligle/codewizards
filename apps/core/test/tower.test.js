// La Torre: founding rooms on existing or new repositories, listing and entering them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Tower } from '../src/rooms/tower.js';
import { EventStore } from '../src/store.js';
import { adoptRoomDir } from '../src/rooms/identity.js';
import { roomIdFor } from '../src/cli.js';
import { rootCommit } from '../src/git.js';
import { makeRepo, tmp } from './helpers.js';

// A git identity for the first commit of a new repository (CI machines have none).
Object.assign(process.env, { GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.invalid' });

function tower() {
  const env = { ...process.env, CODEWIZARDS_HOME: tmp() };
  const opened = [];
  const t = new Tower({
    env,
    open: async repo => {
      const root = await rootCommit(repo);
      if (!root) throw new Error('no commits');
      const real = fs.realpathSync.native(repo), id = roomIdFor(real);
      adoptRoomDir(path.join(env.CODEWIZARDS_HOME, 'rooms', id), { repo: real, root });
      opened.push(real);
      return { id, repo: real, store: new EventStore({ room: id }), room: { shutdown: async () => {} } };
    },
  });
  return { t, opened };
}

test('found a room on an existing repository, then it is listed and entered', async () => {
  const { t, opened } = tower();
  const repo = makeRepo();
  const r = await t.found({ path: repo.dir, create: false });
  assert.match(r.id, /^cw-repo-.+-[0-9a-f]{8}$/);
  const list = t.list();
  assert.deepEqual(list.map(x => [x.id, x.open, x.exists]), [[r.id, true, true]]);
  assert.equal(await t.enter(r.id), r, 'an open room is reused');
  assert.equal(opened.length, 1);
});

test('found a room in a new repository: folder, README and a first commit', async () => {
  const { t } = tower();
  const dir = path.join(tmp(), 'brand-new');
  const r = await t.found({ path: dir, create: true });
  assert.ok(fs.existsSync(path.join(dir, '.git')));
  assert.equal(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'), '# brand-new\n');
  assert.ok(await rootCommit(dir), 'it has a first commit, so wizards can branch from it');
  assert.equal(t.list()[0].name, 'brand-new');
  await assert.rejects(t.found({ path: dir, create: true }), /there is a repository there already/);
  assert.ok(r.id);
});

test('founding refuses relative paths, missing folders, empty repositories and unknown rooms', async () => {
  const { t } = tower();
  await assert.rejects(t.found({ path: 'relative/dir', create: false }), /full path/);
  await assert.rejects(t.found({ path: path.join(tmp(), 'nope'), create: false }), /does not exist/);
  const empty = tmp();
  fs.mkdirSync(path.join(empty, '.git'));
  await assert.rejects(t.found({ path: empty, create: false }));
  await assert.rejects(t.enter('no-such-room'), /no such room/);
});
