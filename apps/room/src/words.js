/* CodeWizards · room — the tower's words (step 7).
   One name per thing on every screen: the room, the site, the CLI's help and docs/glossary.md
   (written from this file by tools/glossary.mjs; the CI checks they match). Every magic word keeps
   its plain meaning, which the room shows on hover. A guild has a name of its own and its maker is
   data: CodeWizards is not affiliated with any maker. British spelling, like the rest of the copy. */
(function (G) {
  'use strict';
  const CW = G.CW = G.CW || {};

  // The guilds (Pol, 22/10/2026 and 30/10/2026): one per model maker, with a name of its own, the
  // art's colour and emblem, and the maker as data. The ids are the event contract's.
  const guilds = {
    anthropic: { name: 'Amber Order', colour: 'amber', maker: 'Anthropic', models: 'Claude', via: 'Claude Code', ready: true },
    openai: { name: 'Cerulean Circle', colour: 'cerulean', maker: 'OpenAI', models: 'GPT', via: null, ready: false },
    google: { name: 'Crimson Synod', colour: 'crimson', maker: 'Google', models: 'Gemini', via: null, ready: false },
    deepseek: { name: 'Indigo Lodge', colour: 'indigo', maker: 'DeepSeek', models: null, via: null, ready: false },
    qwen: { name: 'Jade Cloister', colour: 'jade', maker: 'Alibaba Cloud', models: 'Qwen', via: null, ready: false },
    meta: { name: 'Violet Conclave', colour: 'violet', maker: 'Meta', models: 'Llama', via: null, ready: false },
  };
  const makers = Object.values(guilds).map(g => g.maker);
  const or = list => list.slice(0, -1).join(', ') + ' or ' + list[list.length - 1];
  const notice = 'CodeWizards is an independent open-source project, not affiliated with, endorsed or sponsored by ' +
    or(makers) + '. Their names only say whose models a guild\'s wizards use, and their trademarks are theirs.';

  // The ranks (the contract's ids; `cli` is the name --rank takes) and the efforts (Claude Code's levels).
  const ranks = {
    aprendiz: { word: 'Apprentice', cli: 'apprentice', tech: 'small model', means: 'The quick, frugal rank, for small jobs: haiku, unless ranks.json says otherwise.' },
    joven: { word: 'Young Mage', cli: 'young', tech: 'mid-size model', means: 'The everyday rank: sonnet, unless ranks.json says otherwise.' },
    sabio: { word: 'Grand Sage', cli: 'sage', tech: 'largest model', means: 'The strongest rank, for the hard jobs: opus, unless ranks.json says otherwise.' },
    archimago: { word: 'Archmage', cli: null, tech: 'router and planner', means: 'Picks the rank, model and effort of each spell and, unless you choose a rank, plans it into quests: its rules, plus one short call to the cheapest model.' },
  };
  const efforts = { low: 'Light', medium: 'Calm', high: 'Deep', xhigh: 'Deeper', max: 'Absolute' };

  // What a quest is doing, as the quest list and the blackboard say it.
  const states = {
    created: { word: 'noted', tech: 'task created' },
    assigned: { word: 'assigned', tech: 'agent assigned' },
    reading: { word: 'reading', tech: 'reading context' },
    writing: { word: 'writing', tech: 'editing files or running commands' },
    presenting: { word: 'presenting', tech: 'presenting the change' },
    review: { word: 'awaits your judgement', tech: 'review requested' },
    approved: { word: 'blessed', tech: 'approved' },
    rejected: { word: 'sent back', tech: 'rejected' },
    done: { word: 'fulfilled', tech: 'done' },
    error: { word: 'confused', tech: 'agent error' },
    blocked: { word: 'held up', tech: 'blocked (a permission, a sign-in or you)' },
    waiting: { word: 'out of mana', tech: 'waiting for quota' },
    failed: { word: 'fizzled', tech: 'failed' },
    cancelled: { word: 'broken', tech: 'cancelled' },
    pending: { word: 'to seal', tech: 'approved, not merged yet' },
  };

  // The glossary: [id, word, technical term, plain meaning]. The room uses the ids in data-term.
  const sections = [
    { title: 'The tower', terms: [
      ['tower', 'Tower', 'CodeWizards\' local core', 'CodeWizards on your computer: the process that runs the agents and serves this page. The Tower is also where you choose a room.'],
      ['room', 'Room', 'repository', 'A git repository, with its own wizards, quests and chronicle.'],
      ['found', 'Found a room', 'add a repository', 'Make a room on a repository that exists, or on a new one created with a first commit.'],
      ['changeRoom', 'Change room', 'switch repository', 'Open another repository.'],
      ['illusion', 'Illusion', 'demo mode', 'The demo: the wizards are simulated. No model is called and no mana is spent.'],
    ] },
    { title: 'Wizards', terms: [
      ['wizard', 'Wizard', 'agent', 'One run of an agent CLI (Claude Code, for now) on one quest.'],
      ['guild', 'Guild', 'model maker', 'Whose models a wizard uses. Each guild has its own name, colour and emblem; the maker is data.'],
      ['rank', 'Rank', 'model tier', 'How strong a wizard\'s model is. Each rank has its model and effort in ranks.json.'],
      ['arcana', 'Arcana', 'model', 'The model a wizard uses. Auto takes its rank\'s.'],
      ['focus', 'Focus', 'reasoning effort', 'How hard the model thinks: ' + or(Object.values(efforts)) + ' (low to max). Auto takes its rank\'s.'],
    ] },
    { title: 'Spells and quests', terms: [
      ['spell', 'Spell', 'request (prompt)', 'What you ask the wizards to do.'],
      ['spellBook', 'Spell book', 'prompt box', 'Where you write a spell and choose who casts it.'],
      ['cast', 'Cast', 'run', 'Send the spell to the tower: the work starts.'],
      ['quest', 'Quest', 'task', 'One piece of a spell, done by one wizard on its own git branch.'],
      ['library', 'Library', 'reading context', 'Where a wizard reads the files it needs.'],
      ['alchemyTable', 'Alchemy table', 'writing code', 'Where a wizard edits files and runs commands.'],
      ['notes', 'Notes', 'scratchpad', 'Spells for later, kept as you type next to the room\'s log.'],
      ['tomes', 'Tomes', 'repository files', 'The files committed on your branch, read-only.'],
      ['chronicle', 'Chronicle', 'event log', 'Everything that happened in the room, event by event.'],
    ] },
    { title: 'Judgement', terms: [
      ['blackboard', 'Blackboard', 'code review', 'Where a wizard presents its change, file by file, for your judgement.'],
      ['judgement', 'Judgement', 'review decision', 'Your verdict on a change: bless it or send it back.'],
      ['bless', 'Bless', 'approve', 'Approve the change: it is committed to the quest\'s branch.'],
      ['sendBack', 'Send back', 'reject', 'Reject the change with your words: the same wizard tries again.'],
      ['break', 'Break', 'stop', 'Stop the wizard and cancel its quest.'],
      ['seal', 'Seal', 'merge', 'Bring a blessed change into your branch: fast-forward only, never forced.'],
    ] },
    { title: 'Resources', terms: [
      ['mana', 'Mana', 'usage quota', 'What is left of your plan\'s usage, as the agent CLI reports it: the 5-hour window, and the weekly one when there is one.'],
      ['hourglass', 'Hourglass', 'time to reset', 'How long until the usage window renews.'],
      ['vigour', 'Tower vigour', 'project health', 'It rises when quests are blessed and fulfilled and falls when they are sent back, when a wizard gets confused or a command is refused, and when a quest fizzles. Tokens spent never move it.'],
    ] },
  ];
  const terms = {};
  for (const s of sections) for (const [id, word, tech, means] of s.terms) terms[id] = { id, word, tech, means };

  const guild = id => (Object.prototype.hasOwnProperty.call(guilds, id) ? guilds[id] : null);
  CW.WORDS = Object.freeze({
    guilds, makers, notice, ranks, efforts, states, sections, terms,
    hover: id => (Object.prototype.hasOwnProperty.call(terms, id) ? terms[id].word + ': ' + terms[id].means : ''),
    guildName: id => (guild(id) ? guild(id).name : 'Unknown guild'),
    guildMaker: id => (guild(id) ? guild(id).maker : String(id)),
    guildHover: id => {
      const g = guild(id);
      if (!g) return 'A guild this tower does not know yet (' + id + ').';
      return g.name + ': ' + g.maker + '\'s ' + (g.models ? g.models + ' ' : '') + 'models' + (g.via ? ', through ' + g.via : '') +
        '. Not affiliated with ' + g.maker + '.';
    },
  });
})(globalThis);
