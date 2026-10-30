// Writes docs/glossary.md from the tower's words (apps/room/src/words.js). With --check it writes
// nothing and fails if the file is stale, if a guild, rank or effort of the contract has no word,
// if a guild's name gives away its maker, or if a page names a term that does not exist.
//   node tools/glossary.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORDS as W } from '../apps/core/src/words.js';
import { GUILDS, RANKS, EFFORTS } from '../packages/contract/contract.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'glossary.md');
const PAGES = ['apps/room/src/index.html', 'site/index.html', 'site/privacy.html'].map(f => path.join(ROOT, f));
const cell = s => String(s).replace(/\|/g, '\\|');
const row = cells => '| ' + cells.map(cell).join(' | ') + ' |';
const rule = n => row(Array(n).fill('---'));

export function render() {
  const ready = Object.values(W.guilds).filter(g => g.ready).map(g => 'the ' + g.name);
  const out = ['# Glossary', '',
    '<!-- Written by tools/glossary.mjs from apps/room/src/words.js: change the words there and run `npm run glossary`. -->', '',
    'CodeWizards speaks like a tower of wizards, but every magic word stands for one technical thing and keeps its name on every screen. In the room, hover over a word to read what it means.', ''];
  for (const s of W.sections) {
    out.push('## ' + s.title, '', row(['Word', 'Technical term', 'Meaning']), rule(3));
    for (const [, word, tech, means] of s.terms) out.push(row(['**' + word + '**', tech, means]));
    out.push('');
  }
  out.push('## Ranks', '', 'Each rank is a model tier. The event contract and `ranks.json` use the ids; `--rank` also takes the English names.', '',
    row(['Rank', 'Id', '`--rank`', 'Technical term', 'Meaning']), rule(5));
  for (const [id, r] of Object.entries(W.ranks)) out.push(row(['**' + r.word + '**', '`' + id + '`', r.cli ? '`' + r.cli + '`' : '—', r.tech, r.means]));
  out.push('', '## Focus', '', 'Focus is the reasoning effort, with Claude Code\'s levels.', '', row(['Focus', 'Effort']), rule(2));
  for (const [id, w] of Object.entries(W.efforts)) out.push(row(['**' + w + '**', '`' + id + '`']));
  out.push('', '## Quest states', '', row(['State', 'Technical term']), rule(2));
  for (const s of Object.values(W.states)) out.push(row(['**' + s.word + '**', s.tech]));
  out.push('', '## Guilds', '',
    'One guild per model maker. A guild has its own name, colour and emblem, and its maker is data. Only the guilds of the accounts you connect appear in the room; today that means ' + ready.join(' and ') + '.', '',
    row(['Guild', 'Id', 'Colour', 'Maker', 'Models', 'In CodeWizards']), rule(6));
  for (const [id, g] of Object.entries(W.guilds)) out.push(row(['**' + g.name + '**', '`' + id + '`', g.colour, g.maker, g.models || '—', g.ready ? 'ready, through ' + g.via : 'planned']));
  out.push('', W.notice, '');
  return out.join('\n');
}

export function problems() {
  const p = [];
  for (const g of GUILDS) if (!W.guilds[g]) p.push(`guild ${g} has no name`);
  for (const r of RANKS) if (!W.ranks[r]) p.push(`rank ${r} has no word`);
  for (const e of EFFORTS) if (!W.efforts[e]) p.push(`effort ${e} has no word`);
  const seen = new Map();
  for (const word of [...Object.values(W.guilds).map(g => g.name), ...Object.values(W.terms).map(t => t.word), ...Object.values(W.ranks).map(r => r.word)]) {
    const k = word.toLowerCase();
    if (seen.has(k)) p.push(`two things are called ${word}`);
    seen.set(k, true);
  }
  for (const g of Object.values(W.guilds)) {
    for (const n of [g.maker, g.models].filter(Boolean)) if (g.name.toLowerCase().includes(n.toLowerCase())) p.push(`${g.name} gives away its maker or models (${n})`);
  }
  for (const file of PAGES.filter(f => fs.existsSync(f))) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/data-term="([^"]*)"/g)) {
      if (!Object.prototype.hasOwnProperty.call(W.terms, m[1])) p.push(`${path.relative(ROOT, file)} names a term that does not exist: ${m[1]}`);
    }
  }
  return p;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const p = problems();
  const want = render();
  if (check) {
    if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== want) p.unshift('docs/glossary.md is out of date: run npm run glossary');
  } else {
    fs.writeFileSync(OUT, want);
    console.log('wrote docs/glossary.md');
  }
  for (const x of p) console.error('✗ ' + x);
  if (p.length) process.exit(1);
  if (check) console.log('docs/glossary.md and the pages\' terms match the tower\'s words');
}
