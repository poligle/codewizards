# Changelog

Notable changes to CodeWizards, newest first. Each version is a git tag; plans and reports are in Spanish, in `docs/` and `auditorias/`.

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

[1.2.1]: https://github.com/poligle/codewizards/compare/v1.2...v1.2.1
[1.2]: https://github.com/poligle/codewizards/compare/v1.1...v1.2
[1.1]: https://github.com/poligle/codewizards/compare/v1.0...v1.1
[1.0]: https://github.com/poligle/codewizards/tree/v1.0
