import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDS } from '../src/words.js';
import { HELP, parseArgs } from '../src/cli.js';
import { GUILDS, RANKS, EFFORTS } from '../../../packages/contract/contract.js';
import { problems } from '../../../tools/glossary.mjs';

test('every guild of the contract has a name of its own and its maker as data', () => {
  for (const g of GUILDS) {
    const w = WORDS.guilds[g];
    assert.ok(w && w.name && w.maker, g);
    assert.ok(!w.name.toLowerCase().includes(w.maker.toLowerCase()), `${w.name} gives away ${w.maker}`);
    assert.match(WORDS.guildHover(g), new RegExp(`^${w.name}: .*Not affiliated with ${w.maker}\\.$`));
  }
  assert.equal(new Set(GUILDS.map(g => WORDS.guilds[g].name)).size, GUILDS.length);
  assert.equal(WORDS.guildName('mistral'), 'Unknown guild');
  assert.equal(WORDS.guildMaker('mistral'), 'mistral');
});

test('every rank and effort of the contract has its word, and the glossary finds nothing wrong', () => {
  for (const r of RANKS) assert.ok(WORDS.ranks[r].word, r);
  for (const e of EFFORTS) assert.ok(WORDS.efforts[e], e);
  assert.deepEqual(problems(), []);
});

test('the help says The Tower, takes English rank names and carries the notice', () => {
  assert.match(HELP, /The Tower/);
  assert.doesNotMatch(HELP, /La Torre/);
  assert.match(HELP, /--rank apprentice\|young\|sage/);
  assert.match(HELP.replace(/\s+/g, ' '), /not affiliated with, endorsed or sponsored by Anthropic, OpenAI, Google, DeepSeek, Alibaba Cloud or Meta/);
});

test('--rank takes the English names and the contract ids', () => {
  const rank = r => parseArgs(['serve', '--rank', r]).rank;
  assert.equal(rank('apprentice'), 'aprendiz');
  assert.equal(rank('Young'), 'joven');
  assert.equal(rank('young-mage'), 'joven');
  assert.equal(rank('sage'), 'sabio');
  assert.equal(rank('grand-sage'), 'sabio');
  assert.equal(rank('sabio'), 'sabio');
  assert.equal(rank('archmage'), 'archmage');   // not a rank you can choose: refused later, as before
});
