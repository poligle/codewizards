// The tower's words for the core and the tools: the room's own apps/room/src/words.js (one source
// for the room, the site, the CLI's help and docs/glossary.md), run in a sandbox of its own.
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = {};
vm.runInNewContext(fs.readFileSync(new URL('../../room/src/words.js', import.meta.url), 'utf8'), sandbox, { filename: 'words.js' });

export const WORDS = sandbox.CW.WORDS;
