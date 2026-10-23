<p align="center">
  <img src="docs/img/room.png" alt="The CodeWizards room in Game Boy Color style: wizards working at the lab table and the blackboard while the Archmage sits on his rune circle" width="624">
</p>

<h1 align="center">CodeWizards</h1>

<p align="center"><strong>Do not vibecode. Spellcode.</strong></p>

<p align="center">
  <a href="https://github.com/poligle/codewizards/actions/workflows/ci.yml"><img src="https://github.com/poligle/codewizards/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/poligle/codewizards/actions/workflows/secrets.yml"><img src="https://github.com/poligle/codewizards/actions/workflows/secrets.yml/badge.svg" alt="Secret scan"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code-MIT-blue" alt="Code: MIT"></a>
  <a href="codewizards-art/LICENSE"><img src="https://img.shields.io/badge/art-CC%20BY%204.0-orange" alt="Art: CC BY 4.0"></a>
</p>

CodeWizards is an open-source local app, in development, that turns the AI coding agents you already use into a tower of pixel-art wizards in the style of the Game Boy Color. A small process on your computer drives the official agent CLIs with your own accounts and opens the room in your browser, so your work spends the plan limits or free quotas you already have instead of pay-per-token credit. Each project is a room, each agent is a wizard, and every action is a spell you can see, approve and audit.

> **Status: v1.2.** The room now runs on a local core: `codewizards demo` with simulated wizards, and an experimental `codewizards serve` that drives your own Claude Code on a repository. It is not on npm yet ([changelog](CHANGELOG.md)).
> [Try the demo](https://poligle.github.io/codewizards/): simulated agents, interface still in Spanish.

## How it will work

1. **Cast a spell.** Write a request. The Archmage splits it into tasks and gives each one a rank and an account: free or cheaper quota for apprentices, your strongest plan for the Grand Sage.
2. **Watch the wizards.** Each task runs in its own branch of your GitHub repository through an official CLI. Wizards read at the library, write at the lab table and present at the blackboard.
3. **Review on the blackboard.** You see the diff. Approve it and it is committed to the task's branch, with a draft pull request if you want one; reject it and the wizard goes back to the table with your comment.
4. **Mind the mana.** Mana is the quota left in each connected account. Every event is logged and can be replayed.

## Principles

- **Your accounts, your machine.** CodeWizards has no server and no sign-up. Official CLIs sign in with their own flows, and CodeWizards never stores or relays your keys, tokens or code. The core listens on 127.0.0.1 only, with a fresh token each run, and makes no network requests of its own.
- **Control over vibes.** An estimate before each spell, real usage after it, and nothing goes in without your approval.
- **Open source.** Code under MIT and art under CC BY 4.0. A download page at `codewizards.app` comes with the first release.

## Roadmap

| Milestone | What | Status |
| --- | --- | --- |
| 0 · Mockup | GBC room, spell book and blackboard with simulated agents | Done · v1.0 |
| 1 · Specialisation | Steps 1 to 7 polish their parts on the mockup | In progress · steps 1 and 2 done (v1.1, v1.2) |
| 2 · Local app | Local core with the room in the browser, CI with a browser smoke test and a test package | In progress · core, CI and test package in v1.2 |
| 3 · Claude, for real | Claude Code with the user's own Claude account | — |
| 4 · More accounts | Codex, Google's CLI and others, routed by remaining quota | — |
| 5 · Launch | Download page at `codewizards.app`, desktop app decision, launch plan and published release | — |

## Run it locally

You need Node 22 or newer and git. For `serve`, also [Claude Code](https://code.claude.com/docs), installed and signed in with your own account.

```sh
git clone https://github.com/poligle/codewizards && cd codewizards
npm ci --ignore-scripts
node apps/core/bin/codewizards.js demo                 # the room with simulated wizards
node apps/core/bin/codewizards.js doctor               # checks node, git, gh and claude
node apps/core/bin/codewizards.js serve --repo PATH    # experimental: your Claude Code on PATH
```

The room opens at `http://127.0.0.1:PORT/#token=…`; keep that address to yourself. With `serve`, each task works in its own branch and git worktree, and nothing is committed until you approve it. Add `--open-prs` to push the branch and open a draft pull request with your own `gh`. Caps, sandbox and data folders are described in [`docs/arquitectura.md`](docs/arquitectura.md) (in Spanish).

## Repository layout

| Path | Contents |
| --- | --- |
| `apps/room/` | The room (formerly the mockup): `src/` is served as is (world, simulator, renderer, interface, live link); `build.py` exports the art to `src/assets.gen.js`; `test/` |
| `apps/core/` | The local core: the `codewizards` command, the local server, the event log, the rooms (demo and Claude Code), the adapters and their tests |
| `packages/contract/` | Event contract v1 as code, with its validator |
| `tools/smoke.mjs` | Browser smoke test (Playwright, Chromium) |
| `codewizards-art/` | GBC-style pixel art painted by code and retouched by hand: assets, palettes, `meta.json` and the generator in `04_source/` |
| `docs/` | `agentes.md` (development plan, event contract and agent prompts), `arquitectura.md` (architecture), `concepto/` and `img/`; in Spanish |
| `auditorias/` | Step reports and the hand-off log, in Spanish |
| `licenses/` | Third-party components and their licenses |
| `.github/` | CI (art, room, core on Linux, macOS and Windows, smoke test), demo deploy to Pages, secret scan and Dependabot |

The first art round, in SNES style, was retired in v1.1 and lives in tag [`v1.0`](https://github.com/poligle/codewizards/tree/v1.0/codewizards-art/legacy/snes-ronda1).

## Event contract v1

The room knows nothing about LLMs: it only replays events (`room.opened`, `task.created`, `agent.summoned`, `agent.assigned`, `context.read`, `code.write`, `artifact.present`, `tokens.used`, `review.requested`, `review.approved`, `review.rejected`, `agent.error`, `agent.blocked`, `agent.unblocked`, `quota.updated`, `task.done`, `task.failed`, `task.cancelled`, `agent.idle`). The simulator and the Claude Code adapter emit the same ones, and the core checks every event against `packages/contract/contract.js` before it stores or sends it. Each event carries a sequence number, so replaying the log never doubles anything. Full table in `docs/agentes.md`.

## Development

```sh
npm ci --ignore-scripts                          # ws, plus Playwright for the smoke test
npm test                                         # core, contract and room tests
npx playwright install chromium && npm run smoke # the room in a real browser
python3 -m pip install -r codewizards-art/04_source/requirements.txt   # numpy, Pillow
python3 codewizards-art/04_source/gen/build.py   # regenerate art, previews and the art demo
python3 codewizards-art/04_source/gen/check.py   # validate art: format, palettes, colours, names, orphans
python3 apps/room/build.py                       # export the art to apps/room/src/assets.gen.js
```

CI runs the art check, the room tests and the `assets.gen.js` check, the core tests on Linux, macOS and Windows, and the smoke test on the package installed as a user would. Pages publishes only the room demo. A separate workflow scans the whole history for secrets.

## Conventions

- The product, commit messages and READMEs are in English; plans, reports and hand-offs are in Spanish.
- Each delivery comes as a git patch, applied with `git am`, so that deleted files are deleted too; it also brings its `COMMIT_MSG.txt` (git-ignored). Releases also bring a `TAG_MSG.txt` for the annotated tag.
- No key, token or secret ever goes into the repository.
- Art is painted by code, without generative image models, and retouched by hand. Integer scaling only (`image-rendering: pixelated`).

## License

- Code: [MIT](LICENSE).
- Art: [CC BY 4.0](codewizards-art/LICENSE). This covers `codewizards-art/`, the art exported to `apps/room/src/assets.gen.js` and the images in `docs/img/` and `auditorias/img/`.
- Third-party components: [`licenses/`](licenses/README.md).
- The CodeWizards name and logo are not licensed.

CodeWizards is an independent project, not affiliated with or endorsed by Anthropic, OpenAI, Google, GitHub, DeepSeek, Alibaba Cloud or Meta. Their names only identify the models and tools that a guild or an account uses.
