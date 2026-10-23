# Third-party components

CodeWizards' own code is MIT (`LICENSE`) and its art is CC BY 4.0 (`codewizards-art/LICENSE`).
These are the third-party pieces the repository uses. None of them is bundled: npm and pip install
them from their registries, each with its own license file.

| Component | Version | License | Used for | Shipped to users |
| --- | --- | --- | --- | --- |
| [ws](https://github.com/websockets/ws) | 8.22.0 | MIT | The core's WebSocket server | Yes, as an npm dependency |
| [Playwright](https://github.com/microsoft/playwright) | 1.56.0 | Apache-2.0 | Smoke tests in Chromium | No (development only) |
| [NumPy](https://numpy.org/) | ≥ 1.24 | BSD-3-Clause | Art generator | No |
| [Pillow](https://python-pillow.github.io/) | ≥ 10 | MIT-CMU | Art generator | No |
| [gitleaks](https://github.com/gitleaks/gitleaks) | 8.30.1 | MIT | Secret scan in CI | No |

Claude Code, Codex, Google's CLI, `git` and `gh` are not part of CodeWizards: each user installs
and signs in to their own copy, under its own terms.
