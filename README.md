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

CodeWizards is an open-source desktop app, in development, that turns the AI coding agents you already use into a tower of pixel-art wizards in the style of the Game Boy Color. It runs on your computer and drives the official agent CLIs with your own accounts, so your work spends the plan limits or free quotas you already have instead of pay-per-token credit. Each project is a room, each agent is a wizard, and every action is a spell you can see, approve and audit.

> **Status: v1.1.** The mockup (milestone 0) is done and the product direction is set; the app itself is not built yet ([changelog](CHANGELOG.md)).
> [Try the mockup](https://poligle.github.io/codewizards/apps/maqueta/maqueta.html): simulated agents, interface still in Spanish.

## How it will work

1. **Cast a spell.** Write a request. The Archmage splits it into tasks and gives each one a rank and an account: free or cheaper quota for apprentices, your strongest plan for the Grand Sage.
2. **Watch the wizards.** Each task runs in its own branch of your GitHub repository through an official CLI. Wizards read at the library, write at the lab table and present at the blackboard.
3. **Review on the blackboard.** You see the diff. Approve it and the pull request goes ahead; reject it and the wizard goes back to the table with your comment.
4. **Mind the mana.** Mana is the quota left in each connected account. Every event is logged and can be replayed.

## Principles

- **Your accounts, your machine.** CodeWizards has no server and no sign-up. Official CLIs sign in with their own flows, and CodeWizards never stores or relays your keys, tokens or code.
- **Control over vibes.** An estimate before each spell, real usage after it, and nothing goes in without your approval.
- **Open source.** Code under MIT and art under CC BY 4.0. A download page at `codewizards.app` comes with the first release.

## Roadmap

| Milestone | What | Status |
| --- | --- | --- |
| 0 · Mockup | GBC room, spell book and blackboard with simulated agents | Done · v1.0 |
| 1 · Specialisation | Steps 1 to 7 polish their parts on the mockup | In progress · step 1 done in v1.1 |
| 2 · Local app | Desktop packaging, CI and a first test build | Next |
| 3 · Claude, for real | Claude Code with the user's own Claude account | — |
| 4 · More accounts | Codex, Google's CLI and others, routed by remaining quota | — |
| 5 · Launch | Download page at `codewizards.app`, launch plan and published release | — |

## Repository layout

| Path | Contents |
| --- | --- |
| `apps/maqueta/` | The mockup: `src/` (world, simulator, renderer, interface), `build.py` (bundles one self-contained HTML file) and `test/` |
| `codewizards-art/` | GBC-style pixel art painted by code and retouched by hand: assets, palettes, `meta.json` and the generator in `04_source/` |
| `docs/` | `agentes.md` (development plan, event contract v0 and agent prompts, in Spanish), `concepto/` (original concept) and `img/` |
| `auditorias/` | Step reports and the hand-off log, in Spanish; `producto.md` is the product report |
| `.github/` | CI (art check, mockup tests, build check), secret scan and Dependabot |

The first art round, in SNES style, was retired in v1.1 and lives in tag [`v1.0`](https://github.com/poligle/codewizards/tree/v1.0/codewizards-art/legacy/snes-ronda1).

## Event contract v0

The room knows nothing about LLMs: it only replays events (`room.opened`, `task.created`, `agent.summoned`, `agent.assigned`, `context.read`, `code.write`, `artifact.present`, `tokens.used`, `review.requested`, `review.approved`, `review.rejected`, `agent.error`, `task.done`, `agent.idle`). The mockup simulator emits them today; the adapters for the real CLIs will emit the same ones. Full table in `docs/agentes.md`.

## Development

```sh
python3 -m pip install -r codewizards-art/04_source/requirements.txt   # numpy, Pillow
python3 codewizards-art/04_source/gen/build.py   # regenerate art, previews and the room demo
python3 codewizards-art/04_source/gen/check.py   # validate art: format, palettes, colours, names
python3 apps/maqueta/build.py                    # rebuild apps/maqueta/maqueta.html
node apps/maqueta/test/maqueta.test.mjs          # mockup logic, paths and event contract v0
```

CI runs the art check, the mockup tests and checks that `maqueta.html` matches its sources. A separate workflow scans the whole history for secrets.

## Conventions

- The product, commit messages and READMEs are in English; plans, reports and hand-offs are in Spanish.
- Commit with `git commit -F COMMIT_MSG.txt`; each delivery brings one, and it is git-ignored. Releases also bring a `TAG_MSG.txt` for the annotated tag.
- No key, token or secret ever goes into the repository.
- Art is painted by code, without generative image models, and retouched by hand. Integer scaling only (`image-rendering: pixelated`).

## License

- Code: [MIT](LICENSE).
- Art: [CC BY 4.0](codewizards-art/LICENSE). This covers `codewizards-art/`, the art embedded in the mockup and the images in `docs/img/` and `auditorias/img/`.
- The CodeWizards name and logo are not licensed.

CodeWizards is an independent project, not affiliated with or endorsed by Anthropic, OpenAI, Google, GitHub, DeepSeek, Alibaba Cloud or Meta. Their names only identify the models and tools that a guild or an account uses.
