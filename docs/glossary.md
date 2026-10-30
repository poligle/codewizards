# Glossary

<!-- Written by tools/glossary.mjs from apps/room/src/words.js: change the words there and run `npm run glossary`. -->

CodeWizards speaks like a tower of wizards, but every magic word stands for one technical thing and keeps its name on every screen. In the room, hover over a word to read what it means.

## The tower

| Word | Technical term | Meaning |
| --- | --- | --- |
| **Tower** | CodeWizards' local core | CodeWizards on your computer: the process that runs the agents and serves this page. The Tower is also where you choose a room. |
| **Room** | repository | A git repository, with its own wizards, quests and chronicle. |
| **Found a room** | add a repository | Make a room on a repository that exists, or on a new one created with a first commit. |
| **Change room** | switch repository | Open another repository. |
| **Illusion** | demo mode | The demo: the wizards are simulated. No model is called and no mana is spent. |

## Wizards

| Word | Technical term | Meaning |
| --- | --- | --- |
| **Wizard** | agent | One run of an agent CLI (Claude Code, for now) on one quest. |
| **Guild** | model maker | Whose models a wizard uses. Each guild has its own name, colour and emblem; the maker is data. |
| **Rank** | model tier | How strong a wizard's model is. Each rank has its model and effort in ranks.json. |
| **Arcana** | model | The model a wizard uses. Auto takes its rank's. |
| **Focus** | reasoning effort | How hard the model thinks: Light, Calm, Deep, Deeper or Absolute (low to max). Auto takes its rank's. |

## Spells and quests

| Word | Technical term | Meaning |
| --- | --- | --- |
| **Spell** | request (prompt) | What you ask the wizards to do. |
| **Spell book** | prompt box | Where you write a spell and choose who casts it. |
| **Cast** | run | Send the spell to the tower: the work starts. |
| **Quest** | task | One piece of a spell, done by one wizard on its own git branch. |
| **Library** | reading context | Where a wizard reads the files it needs. |
| **Alchemy table** | writing code | Where a wizard edits files and runs commands. |
| **Notes** | scratchpad | Spells for later, kept as you type next to the room's log. |
| **Tomes** | repository files | The files committed on your branch, read-only. |
| **Chronicle** | event log | Everything that happened in the room, event by event. |

## Judgement

| Word | Technical term | Meaning |
| --- | --- | --- |
| **Blackboard** | code review | Where a wizard presents its change, file by file, for your judgement. |
| **Judgement** | review decision | Your verdict on a change: bless it or send it back. |
| **Bless** | approve | Approve the change: it is committed to the quest's branch. |
| **Send back** | reject | Reject the change with your words: the same wizard tries again. |
| **Break** | stop | Stop the wizard and cancel its quest. |
| **Seal** | merge | Bring a blessed change into your branch: fast-forward only, never forced. |

## Resources

| Word | Technical term | Meaning |
| --- | --- | --- |
| **Mana** | usage quota | What is left of your plan's usage, as the agent CLI reports it: the 5-hour window, and the weekly one when there is one. |
| **Hourglass** | time to reset | How long until the usage window renews. |
| **Tower vigour** | project health | It rises when quests are blessed and fulfilled and falls when they are sent back, when a wizard gets confused or a command is refused, and when a quest fizzles. Tokens spent never move it. |

## Ranks

Each rank is a model tier. The event contract and `ranks.json` use the ids; `--rank` also takes the English names.

| Rank | Id | `--rank` | Technical term | Meaning |
| --- | --- | --- | --- | --- |
| **Apprentice** | `aprendiz` | `apprentice` | small model | The quick, frugal rank, for small jobs: haiku, unless ranks.json says otherwise. |
| **Young Mage** | `joven` | `young` | mid-size model | The everyday rank: sonnet, unless ranks.json says otherwise. |
| **Grand Sage** | `sabio` | `sage` | largest model | The strongest rank, for the hard jobs: opus, unless ranks.json says otherwise. |
| **Archmage** | `archimago` | — | router and planner | Picks the rank, model and effort of each spell and, unless you choose a rank, plans it into quests: its rules, plus one short call to the cheapest model. |

## Focus

Focus is the reasoning effort, with Claude Code's levels.

| Focus | Effort |
| --- | --- |
| **Light** | `low` |
| **Calm** | `medium` |
| **Deep** | `high` |
| **Deeper** | `xhigh` |
| **Absolute** | `max` |

## Quest states

| State | Technical term |
| --- | --- |
| **noted** | task created |
| **assigned** | agent assigned |
| **reading** | reading context |
| **writing** | editing files or running commands |
| **presenting** | presenting the change |
| **awaits your judgement** | review requested |
| **blessed** | approved |
| **sent back** | rejected |
| **fulfilled** | done |
| **confused** | agent error |
| **held up** | blocked (a permission, a sign-in or you) |
| **out of mana** | waiting for quota |
| **fizzled** | failed |
| **broken** | cancelled |
| **to seal** | approved, not merged yet |

## Guilds

One guild per model maker. A guild has its own name, colour and emblem, and its maker is data. Only the guilds of the accounts you connect appear in the room; today that means the Amber Order.

| Guild | Id | Colour | Maker | Models | In CodeWizards |
| --- | --- | --- | --- | --- | --- |
| **Amber Order** | `anthropic` | amber | Anthropic | Claude | ready, through Claude Code |
| **Cerulean Circle** | `openai` | cerulean | OpenAI | GPT | planned |
| **Crimson Synod** | `google` | crimson | Google | Gemini | planned |
| **Indigo Lodge** | `deepseek` | indigo | DeepSeek | — | planned |
| **Jade Cloister** | `qwen` | jade | Alibaba Cloud | Qwen | planned |
| **Violet Conclave** | `meta` | violet | Meta | Llama | planned |

CodeWizards is an independent open-source project, not affiliated with, endorsed or sponsored by Anthropic, OpenAI, Google, DeepSeek, Alibaba Cloud or Meta. Their names only say whose models a guild's wizards use, and their trademarks are theirs.
