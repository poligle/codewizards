# Changelog

Notable changes to CodeWizards, newest first. Each version is a git tag; plans and reports are in Spanish, in `docs/` and `auditorias/`.

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

[1.1]: https://github.com/poligle/codewizards/compare/v1.0...v1.1
[1.0]: https://github.com/poligle/codewizards/tree/v1.0
