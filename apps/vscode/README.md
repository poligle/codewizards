# CodeWizards for VS Code (preview)

The [CodeWizards](https://codewizards.app) room in a panel beside your code: Claude Code works with your own plan, each quest on its own branch, and you judge every change on the blackboard before it is committed.

The extension is a window onto the tower you installed. It runs your own `codewizards` for the workspace folder and shows the room it serves on `127.0.0.1`, so it reads no credentials and talks to no server of its own.

## Before you start

- Install CodeWizards: `npm install -g codewizards` (Node.js 22 or later, and git).
- For real wizards, install Claude Code and sign in once. The demo needs neither.

## Commands

- **CodeWizards: Open the room for this folder** runs `codewizards serve` on the workspace folder's repository.
- **CodeWizards: Open The Tower** lists your rooms and founds new ones.
- **CodeWizards: Open the demo** shows simulated wizards: no agent, no account, no network.
- **CodeWizards: Stop the tower** stops it; closing the panel does too.

## Settings

- `codewizards.command`: the command to run (`codewizards` by default), or the path of `apps/core/bin/codewizards.js` in a checkout.
- `codewizards.extraArgs`: more options, such as `--merge` or `--rank sage`.

Both are machine settings, so a workspace's own settings cannot change what the extension runs.

## Limits of this preview

- Local folders only: remote workspaces (SSH, WSL, containers, Codespaces) are not supported yet.
- Tested against the core and in Chromium, not yet by hand in every VS Code; Windows is untested.
- A trusted workspace is required, because the wizards run commands in it.

## Licence

MIT. CodeWizards is an independent open-source project, not affiliated with, endorsed or sponsored by Anthropic, OpenAI, Google, DeepSeek, Alibaba Cloud or Meta.
