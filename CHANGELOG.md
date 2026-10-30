# Changelog

Notable changes to CodeWizards, newest first. Each version is a git tag; plans and reports are in Spanish, in `docs/` and `auditorias/`.

## [1.7.0] · 2026-10-25 · The Archmage plans, the tower speaks English and sings

### Fixed
- CI: `apps/room/build.py --check` no longer needs fontTools. The pixel font is now an art file (`codewizards-art/05_ui/CWPixel.ttf`), written by the art generator; fontTools is added to the Nix shell.

### Added
- The Archmage plans: unless you choose a rank, one short call to the cheapest model splits a spell into up to 4 quests, each with the rank (and so the model) its complexity calls for. They run one after another, each from the previous one's approved branch; if one fails, the rest are cancelled; if planning fails, the rules decide as before. `--no-plan` and `planner` in `ranks.json` turn it off. The contract gains `after` on `task.created` and `plan` as a reason to cancel.
- Sound (step 7): chiptune effects synthesised with Web Audio after the Game Boy's channels, an optional quiet music loop (off by default), an optional review bell in the background, volume and mute, all remembered.

### Changed
- The product speaks English (step 7), in the tower's voice, with the technical meaning of each magic word on hover.
- The spell book has two rows: the spell takes the whole first one; who casts it, the model, the effort, the sound and Cast go below.
- The CRT covers the interface too.

## [1.6.5] · 2026-10-25 · One screen, one pixel

Step 6 of milestone 1 (GBC art): the polish Pol asked for after running v1.6.4.

### Changed
- The whole window is the screen: the room's darkness from edge to edge under one CRT, which is always on.
- One pixel size for everything: the room, the logo, the scrolls' rolls and edges, the icons, the pixel font and the cursor are all drawn at the room's own whole scale. The wand cursor is used on the whole page, at that same size.
- CODEWIZARDS, as a gold logo, at the top centre of the room's backdrop.
- The spell book is a long, low strip of parchment under the room's front corner: the spell first ("Lanza un hechizo…"), then who casts it, the model and the effort, and Cast. Above it, the room's name and "Cambiar de sala" (it was La Torre).
- Four scrolls with paper rolls instead of wooden rods (Tasks, Notes, Blackboard, Chronicle). Drag the top roll to move one, press it to roll it up completely; drag the bottom roll to make it longer or shorter, near its right end to make it wider too; double-click puts it back in its corner. Keyboard: Enter, arrows and Shift + arrows on the top roll. The browser remembers where each one is.
- Every word on screen speaks the tower's language (Bendecir, Devolver, Romper, Cumplidos, Crónica, Vigor de la torre…).
- The room: irregular stone with ivy; new stained glass (a diamond lattice with a star and a rose window); a longer alchemy table with an alembic, potions, a mortar, a candle and a book; no armchair (wizards sit on the benches); the banner no longer hides behind a bookshelf; new furniture: a cauldron over a fire, barrels, a crate, a chest, a globe, a plant and a floor candelabrum, with their light and bubbles.
- The new pieces are files in `codewizards-art/` too (props, and `05_ui/` for the logo, rolls, paper, icons and cursors), ready for retouching.

### Removed
- The speed buttons, "Aprobar solo" (auto-approval), the CRT switch and the line "Nada entra sin tu aprobación". The demo can still be sped up for tests with `?prisa=4&auto=1`.

## [1.6.4] · 2026-10-25 · The room is the screen

Step 6 of milestone 1 (GBC art): the final art, meant for publishing.

### Changed
- The room is a rectangle again, 16 × 12 tiles: the library and the door on the left wall; two gothic stained-glass windows and the blackboard on the back wall; the table, the Archmage's circle, the benches and the armchair on the floor. The cross is gone.
- The blackboard is a real object: a slate panel in a thick wooden frame that stands off the wall, a chalk tray with chalks and an eraser, and what the wizards present written on it in chalk, in the room's chalk font, along the wall's slope.
- The stained glass is a mosaic of coloured panes with lead lines under a pointed gothic arch, in two windows, each throwing its light and its shafts of dust.
- The room fills the window (×5 on 1440 × 900, ×6 on 1920 × 1080). The panels are parchment scrolls hung in the room's empty corners, sized from the room's own lines so they never cover it, and each rolls up or down from its rod; the controls sit on a plaque under the floor's front corner. Narrow screens get the room on top and the scrolls under it.
- The spell box says «Lanza un hechizo…».

## [1.6.3] · 2026-10-24 · One game screen

Step 6 of milestone 1 (GBC art), closed: everything that was left.

### Added
- Light shafts from the stained glass, dithered every other pixel like a GBC would, with dust motes floating in them.
- Wizard particles: motes rise from the orb while a wizard works, and dust puffs at the feet as it walks.
- A pixel font for the interface, made from the room's chalk font with Spanish accents, embedded in `ui.gen.css`.

### Changed
- The interface and the room are one screen: the page is the room's darkness, the panels are parchment in stone frames, titles, labels and action buttons use the pixel font, and buttons are bevelled wood and gold like GBC menus. Task cards, code and logs stay in a readable font.
- Perspective in the cross: the two bookshelves have different lengths, with a gap and a torch between them, so the second one reads as further down the wall; the blackboard hangs lower, at a wizard's height, centred on the apse wall.
- The wizards' profile nose is a pixel longer and the backs show a rounded hump.

## [1.6.2] · 2026-10-24 · Stained glass, a wall blackboard and the interface kit

Step 6 of milestone 1 (GBC art): the rest of patch 6b, and 6c.

### Added
- A stained-glass window in the library arm, one colour per pane, that throws its coloured light on the floor.
- The blackboard hangs on the apse wall, drawn on the wall's own plane; the chalk follows the wall's slope.
- Two wooden benches in the rest arm, where waiting wizards sit.
- The project's health glows in a crystal orb on a stone pedestal (green, yellow or red); an hourglass on the table empties as the five-hour window goes by; the potions on the table bubble.
- The interface kit, in the room's stone, wood and gold: panel frames with gold studs, 8 × 8 icons on the headings, and a wand cursor. Generated as `apps/room/src/ui.gen.css`.

## [1.6.1] · 2026-10-24 · A room shaped like a cross

Step 6 of milestone 1 (GBC art), patch 6b, first part.

### Changed
- The room is a Greek cross of 14 × 14 tiles with the four corners cut (240 × 168 px): the library in one arm, the apse with the window and the blackboard at the back, the rest arm with the armchair, the table and the Archmage in the crossing, and the entrance door in the nave. Every wall the camera sees is drawn, with its inner and outer corners.
- The engine reads the room from the art: `apps/room/src/plan.gen.js`, generated from the generator's plan (the floor, what blocks the way, the stations, the door and the queue).
- Wizards waiting outside a full room stand in line by the door.
- The spell book fits in one row, so the bigger room still shows at ×3 on a 1440 × 900 screen (×4 on 1920 × 1080).

## [1.6.0] · 2026-10-23 · The wizards, redrawn

Step 6 of milestone 1 (GBC art), patch 6a.

### Added
- Ranks you can tell apart by their silhouette: the Apprentice with a short hat and a short staff, the Young Mage with a band on the hat, the Grand Sage with a star, a big orb and a longer beard, and the Archmage with a hat twice as tall (16 × 32).
- Nine poses in 8 directions: idle, walk, work, read (an open book), write (a quill), present, confused, celebrate and sit. The room picks the pose from what each wizard is doing.

### Changed
- The art follows the contract's guilds: Copilot is gone, `gemini` is `google`, and the free 8th sprite palette is the unknown guild's.
- One sheet per rank and pose in `codewizards-art/02_characters/`, in the Anthropic palette; any guild is the same pixels with its `.gpl`.

## [1.5.1] · 2026-10-23 · La Torre

Step 5 of milestone 1 (UI/UX), round 2.

### Added
- La Torre: `codewizards` with no command opens it in the browser. It lists your rooms, lets you enter one, or found a new one on a folder you write: on an existing repository, or in a new one that it creates with a README and a first commit. From inside a room, the "La Torre" button opens it again; changing room keeps the token out of the address bar.
- The core keeps several rooms open at once; each browser tab is in one of them.
- `tools/contrast.mjs`: the panels' text colours measured against WCAG 2.2 AA in both themes, checked in CI.

### Changed
- The header shows the room's repository next to the mode.

## [1.5.0] · 2026-10-23 · Files, a better diff, keyboard

Step 5 of milestone 1 (UI/UX), round 1.

### Added
- A read-only file explorer: the tree of what is committed on your branch; a file opens on the blackboard with line numbers. The core reads it through git, only paths git lists, with the room's token.
- Ctrl or Cmd + Enter casts the spell.

### Changed
- The diff on the blackboard comes file by file, each with its added and removed lines, without git's internal header lines, and long lines scroll instead of wrapping.
- The Archmage's reasons read in Spanish in the room.
- With reduced motion asked by the system, the CRT starts off and its animations stop.

## [1.4.0] · 2026-10-23 · How the wizards behave

Step 4 of milestone 1 (simulation and behaviour).

### Added
- The wizard's state machine, in the code (`stateOf`) and documented (auditorias/simulacion.md): arriving, walking, queued, reading, writing, presenting, waiting, confused, celebrating, resting, leaving and outside.
- Queues: a wizard that finds a station full waits on a free tile next to it and steps up as soon as a place frees.
- Pace: a burst of reads or writes at the same station makes the visit longer instead of chaining walks; a long backlog is compressed (always keeping the latest visit) and the wizard hurries, so the room catches up with the log without ever showing what the log does not say.
- Scale: up to 10 wizards inside; the rest wait outside the door and come in, first come first in, when someone leaves.
- Visible resources in the tasks panel: the project's health (moves with approvals, finished and failed tasks, errors and rejections, never with tokens), how many wizards wait outside, and the hourglass of the five-hour window.

### Changed
- The rank table is back to Claude Code aliases (haiku, sonnet, opus): a pinned claude-opus-5-5 failed with Claude Code 2.1.223, which is older than that model. Aliases pick the newest model your Claude Code supports, and the room shows which one.
- A model newer than your Claude Code now fails with a message that says which version it needs.
- The spell book opens empty, with a hint instead of an example spell.

## [1.3.2] · 2026-10-23 · A repository created again at the same path

### Fixed
- `serve` on a repository without commits used to start and then fail every task with a git error, which looked as if Claude Code did not connect. It now stops at once and says how to make the first commit.
- A repository deleted and created again at the same path reused the old room, with its history and its quota. The room now remembers the repository's first commit: if another repository lives at that path, the old room is archived (`rooms/<id>.replaced-<date>`) and the new one starts empty.
- A quota window whose reset time has passed no longer makes the Archmage lower the rank or wait, and the mana bar shows it renewed.
- A leftover worktree folder from an older session no longer blocks a new task; `serve` also prunes the repository's stale worktrees when it starts.

## [1.3.1] · 2026-10-23 · Opening a room, models and effort, a new layout

### Fixed
- Opening a room on an existing log no longer brings every past wizard in to walk out again: the room rebuilds itself at once from the log, puts the wizards still at work at their stations, and only animates what happens from then on.
- `codewizards` really is on the PATH inside `nix develop` (the script is named codewizards.js; the shell now links it under its real name).

### Added
- Tasks panel: «En curso», «Hechas» (the history, where finished tasks go when their wizard walks out) and «Por hacer», a notes editor kept per room (next to the room's log; in the demo, in the browser) with a button that sends the selected line to the spell book.
- Model and effort per spell: the spell book shows each rank's model and effort and lets you pick both; `--effort` sets the default. Claude Code's reasoning effort (low, medium, high, xhigh, max) goes with `--effort`, and a `CLAUDE_CODE_EFFORT_LEVEL` in your environment no longer overrides it.
- Layout: the room large in the middle with the spell book under it, and a panel on each side that you can make wider or narrower by dragging its edge (remembered in the browser).

### Changed
- The rank table pins model versions: Apprentice `claude-haiku-5-5` (low effort), Young Mage `claude-sonnet-5-5` (medium), Grand Sage `claude-opus-5-5` (high). Aliases such as `opus` still work in your own `ranks.json`.
- Event contract v2 gains an optional `effort` in `agent.summoned`.

## [1.3.0] · 2026-10-23 · The Archmage and the quota

Step 3 of milestone 1 (orchestration and tokens).

### Added
- The Archmage, version 1: plain rules, no model and no tokens, pick each spell's rank (Apprentice, Young Mage or Grand Sage), or you pick it in the spell book. Each rank's model, turns, token estimate and system note live in `ranks.json` (haiku, sonnet and opus to start); you can override any of it in `~/.config/codewizards/ranks.json`, and no model name is fixed in the code.
- A fourth rank, the Young Mage, as in the original concept (drawn as an Apprentice until the art round).
- Real quota: Claude Code's rate-limit events become the account's mana in the room (what is left of the five-hour window, and when it resets). Past 80 % the Archmage picks one rank lower; when the window is used up, the wizard waits in the armchair and resumes the same session after the reset, instead of failing.
- A "Merge into my branch" button on the blackboard for an approved change that is still on its branch (fast-forward only, never forced).
- Event contract v2: the Young Mage, the Archmage's rank and reason, quota per window, `command.run`, `command.denied` and `task.merged`. Logs written with v1 still replay.
- Evals: 20 small tasks with hidden tests and reference solutions, and `tools/evals.mjs` to compare configurations on your own plan (`evals/README.md`). CI checks the bank, the routing and the whole pipeline with a fake agent, without tokens.
- CI: a smoke test in Firefox (not blocking yet), and a GitHub release published automatically when a push to main brings a new version.
- `codewizards` on the PATH inside `nix develop`.

### Changed
- Only the guilds of connected accounts appear; for now that is Anthropic, in the demo too.
- Finished tasks leave the list when their wizard walks out; a change waiting to be merged stays until it is.
- A command refused by the rules shows as a refusal, not as an error of the wizard.
- `.claude/settings.local.json` never goes into a wizard's commit.

### Fixed
- The `--merge` test failed on Windows, where Git converts line endings on checkout.

## [1.2.2] · 2026-10-23 · After the first real run

The first `codewizards serve` with a real Claude Code (2.1.223) worked end to end. This release makes clear where approved work goes and who pays.

### Added
- `--merge`: approving also fast-forwards your branch to the task branch. It is never forced: if your branch moved, the change stays on its own branch and the scroll says so.
- `--record`: keeps each turn's raw Claude Code output, with known secret formats masked, next to the room's log, to replace the synthetic test recordings with real ones.
- A "Workflow" section in the README: the copy, the wizard's limits, the blackboard, approve, reject or stop, and who pays.

### Changed
- The wizard walks in when Claude Code starts and carries the model it really uses; the blackboard and the scroll show it.
- After approval the blackboard says where the change went: its branch and the `git merge` that brings it in, the fast-forward, or the draft pull request.
- `serve` does not pass `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` to Claude Code, so your plan pays; `--use-api-key` keeps them, and `doctor` tells you when they are set.

## [1.2.1] · 2026-10-23 · Fixes after the first CI run

### Fixed
- macOS and Windows: the Claude Code room reported the files a wizard touched as absolute paths when its data folder was reached through a link (macOS `/var` is `/private/var`); worktrees now live under the real path, and a test with a link (a junction on Windows) keeps it that way.
- The room no longer asks the server for `/favicon.ico`, which a full Chromium logged as an error.
- The Pages workflow drops `configure-pages`, which a plain static site does not need; Pages still has to be switched to "GitHub Actions" once.

### Added
- `flake.nix` with development shells: `nix develop` (node, npm, git, Python with numpy and Pillow) and, on Linux, `nix develop .#smoke` with nixpkgs' Chromium for the smoke test (`CW_CHROMIUM`).

## [1.2] · 2026-10-22 · Architecture and the local core

Step 2 of milestone 1 (architecture and software, phase A). The room runs on a local core.

### Added
- Local core (`apps/core/`): the `codewizards` command with `demo` (simulated wizards, no account, no network), `serve --repo PATH` (experimental: your own Claude Code works in a branch and git worktree per task, and nothing is committed until you approve it; `--open-prs` pushes and opens a draft pull request with your own `gh`) and `doctor`.
- Local server on 127.0.0.1 only: per-run token, Host and Origin checks, a strict Content-Security-Policy and whitelisted commands.
- Claude Code adapter: headless `stream-json`, the spell through stdin, `dontAsk` permissions, Bash only inside Claude Code's sandbox (none on native Windows), and caps on turns, time, wizards and tokens.
- Event log in JSON Lines with owner-only permissions, masking of known secret formats, and replay on reconnect.
- Event contract v1 as code (`packages/contract/`), with its validator.
- Tests for the core with a fake Claude Code and synthetic recordings; a browser smoke test (Playwright, Chromium) on the installed package; a Pages workflow that publishes only the room demo; Dependabot for npm.
- Architecture document (`docs/arquitectura.md`), step report (`auditorias/software.md`) and third-party licenses (`licenses/`), in Spanish except the last.

### Changed
- Event contract v1: a sequence number per room (replaying the log never doubles anything), timestamps in epoch milliseconds, the account in `agent.summoned` and `tokens.used`, `cost_usd`, guilds named after model makers (`google`), and new events for blocked wizards, quota, failed and cancelled tasks.
- The mockup became the room (`apps/room/`): the page loads its scripts as files and `build.py` exports the art to `src/assets.gen.js`. The old Pages address redirects to the demo.
- The room takes in agents it has not seen, paints unknown guilds in a neutral palette, offers a comment box for rejections and a stop button for real wizards.
- README: a local app, how to run it, layout and conventions. Deliveries now come as git patches.

### Fixed
- The room froze on a guild it did not know.
- The v1.1 cleanup had not reached git; its files are gone now, and the art check fails on orphan files.

### Removed
- The self-contained `apps/maqueta/maqueta.html`.

## [1.1] · 2026-10-22 · Product and brand

Step 1 of milestone 1. The mockup is the same as in v1.0.

### Added
- Product report (`auditorias/producto.md`, in Spanish): audience, positioning, MVP, business model, risks, metrics and tasks for steps 2 to 8.
- Licenses: code under MIT (`LICENSE`), art under CC BY 4.0 (`codewizards-art/LICENSE`).
- This changelog and a picture of the room for the README (`docs/img/room.png`).

### Changed
- Product direction: CodeWizards will be a local, open-source app that drives the official agent CLIs, Claude Code first, with the user's own accounts, instead of the hosted web IDE planned before. It has no server and never stores keys, tokens or code. `codewizards.app` will host the download page.
- Guilds: six, one per model maker, with fantasy names to come. GitHub Copilot will come back as an account, not a guild; its art goes in step 6.
- README rewritten: status, principles, roadmap, layout, licenses and a non-affiliation notice.
- Development plan (`docs/agentes.md`) and hand-off log updated with these decisions.

### Removed
- The SNES art round (`codewizards-art/legacy/`) and its two style documents.
- SNES leftovers in the GBC art: the apprentice read, create, present and rest sheets, the chalk font, the dust puff and nine SNES palettes.
- Five unused generator modules.
- All of it remains in tag `v1.0`.

## [1.0] · 2026-10-22 · Milestone 0: mockup

### Added
- Development plan, event contract v0 and agent prompts (`docs/agentes.md`), and the original concept documents.
- Phase 1 art in GBC style: 64 assets painted by code, with palettes, `meta.json`, generator and validator. The earlier SNES round was kept in `codewizards-art/legacy/`.
- Mockup (`apps/maqueta/`): the GBC room, spell book, blackboard review and event log, with simulated agents that emit the event contract v0.
- CI: art check, mockup tests and build check. Secret scan of the full history with gitleaks, actions pinned to commit SHAs and Dependabot with a cooldown.

### Fixed
- The mockup no longer freezes on its first frame in real browsers.

[1.7.0]: https://github.com/poligle/codewizards/compare/v1.6.5...v1.7.0
[1.6.5]: https://github.com/poligle/codewizards/compare/v1.6.4...v1.6.5
[1.6.4]: https://github.com/poligle/codewizards/compare/v1.6.3...v1.6.4
[1.6.3]: https://github.com/poligle/codewizards/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/poligle/codewizards/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/poligle/codewizards/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/poligle/codewizards/compare/v1.5.1...v1.6.0
[1.5.1]: https://github.com/poligle/codewizards/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/poligle/codewizards/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/poligle/codewizards/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/poligle/codewizards/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/poligle/codewizards/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/poligle/codewizards/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/poligle/codewizards/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/poligle/codewizards/compare/v1.2...v1.2.1
[1.2]: https://github.com/poligle/codewizards/compare/v1.1...v1.2
[1.1]: https://github.com/poligle/codewizards/compare/v1.0...v1.1
[1.0]: https://github.com/poligle/codewizards/tree/v1.0
