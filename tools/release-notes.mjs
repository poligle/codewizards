// The notes of a release: the CHANGELOG.md section of that version (used by the release job in CI).
//   node tools/release-notes.mjs 1.3.0  >  notes.md
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export function notesFor(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex(l => l.startsWith(`## [${version}]`));
  if (start < 0) return `Release ${version}. See CHANGELOG.md.\n`;
  let end = lines.findIndex((l, i) => i > start && (l.startsWith('## [') || /^\[[^\]]+\]: /.test(l)));
  if (end < 0) end = lines.length;
  const title = lines[start].replace(/^## \[[^\]]+\]\s*·?\s*/, '').trim();
  const body = lines.slice(start + 1, end).join('\n').trim();
  return `${title ? `**${title}**\n\n` : ''}${body}\n\nFull history: [CHANGELOG.md](https://github.com/poligle/codewizards/blob/main/CHANGELOG.md)\n`;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = process.argv[2];
  if (!/^\d+\.\d+\.\d+$/.test(version || '')) { console.error('usage: node tools/release-notes.mjs X.Y.Z'); process.exit(2); }
  process.stdout.write(notesFor(fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'), version));
}
