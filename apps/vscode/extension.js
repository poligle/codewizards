// CodeWizards for VS Code (step 8, preview): the room in a panel beside your code. It runs the
// codewizards you installed on this machine (npm install -g codewizards) for the workspace folder
// and shows the room it serves on 127.0.0.1 in a webview: the same local core, the same room and
// the same rules as in the browser. It reads no credentials and talks to no server of its own.
'use strict';
const vscode = require('vscode');
const { spawn } = require('child_process');

// The core lets VS Code's webviews, and no other page, show the room in a frame.
const FRAME = 'vscode-webview:';
let current = null;   // { proc, panel }

function settings() {
  const c = vscode.workspace.getConfiguration('codewizards');
  return { command: c.get('command') || 'codewizards', extra: c.get('extraArgs') || [] };
}

// A .js or .mjs path (a checkout of the repository) runs with this editor's own Node.
function launch(command, args, cwd) {
  const stdio = ['ignore', 'pipe', 'pipe'];
  if (/\.m?js$/i.test(command)) return spawn(process.execPath, [command, ...args], { cwd, stdio, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
  if (process.platform === 'win32') {   // npm's shims are .cmd files, and those need a shell
    const q = a => (/[\s"&|<>^]/.test(a) ? '"' + a.replace(/"/g, '""') + '"' : a);
    return spawn([command, ...args].map(q).join(' '), { cwd, stdio, shell: true, env: process.env });
  }
  return spawn(command, args, { cwd, stdio, env: process.env });
}

function startTower(args, cwd) {
  const { command, extra } = settings();
  const proc = launch(command, [...args, ...extra, '--no-open', '--json', '--frame-ancestor', FRAME], cwd);
  return new Promise((resolve, reject) => {
    let out = '', err = '';
    const fail = e => { clearTimeout(timer); reject(e); };
    const timer = setTimeout(() => { proc.kill(); fail(new Error('the tower did not answer within 30 seconds.')); }, 30000);
    proc.stdout.on('data', d => {
      out += d;
      for (let i = out.indexOf('\n'); i >= 0; i = out.indexOf('\n')) {
        let m = null;
        try { m = JSON.parse(out.slice(0, i)); } catch { /* not a line of JSON */ }
        out = out.slice(i + 1);
        if (m && m.event === 'listening' && typeof m.url === 'string') { clearTimeout(timer); resolve({ proc, url: m.url }); }
      }
    });
    proc.stderr.on('data', d => { err += d; });
    proc.on('error', e => fail(e.code === 'ENOENT' ? new Error(`${command} was not found. Install it with npm install -g codewizards, or set codewizards.command.`) : e));
    proc.on('exit', code => fail(new Error(`codewizards stopped (exit ${code}): ${err.trim().split('\n').filter(Boolean).pop() || 'it said nothing.'}`)));
  });
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page(url) {
  const origin = url.replace(/^(https?:\/\/[^/?#]+).*$/, '$1');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${esc(origin)}; style-src 'unsafe-inline'">` +
    '<style>html,body{margin:0;height:100%;overflow:hidden;background:#181828}iframe{display:block;width:100%;height:100%;border:0}</style>' +
    `</head><body><iframe src="${esc(url)}" title="CodeWizards" allow="autoplay; clipboard-write"></iframe></body></html>`;
}

function stop() {
  const c = current;
  current = null;
  if (!c) return;
  if (c.proc.exitCode === null && c.proc.signalCode === null) c.proc.kill();
  try { c.panel.dispose(); } catch { /* already closed */ }
}

async function open(label, args, cwd, context) {
  if (vscode.env.remoteName) {
    vscode.window.showWarningMessage('CodeWizards does not work in remote workspaces yet: run codewizards in the remote terminal and open the room in a browser.');
    return;
  }
  stop();
  let started;
  try {
    started = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `CodeWizards: opening ${label}…` }, () => startTower(args, cwd));
  } catch (e) {
    vscode.window.showErrorMessage(`CodeWizards: ${e.message}`);
    return;
  }
  const { proc, url } = started;
  const base = url.split('#')[0];
  const external = (await vscode.env.asExternalUri(vscode.Uri.parse(base))).toString(true);
  const panel = vscode.window.createWebviewPanel('codewizards.room', `CodeWizards: ${label}`, vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');
  panel.webview.html = page(external + url.slice(base.length));
  current = { proc, panel };
  panel.onDidDispose(() => { if (current && current.panel === panel) stop(); });
  proc.on('exit', () => {
    if (current && current.proc === proc) { current = null; vscode.window.showWarningMessage('CodeWizards: the tower stopped.'); }
  });
}

async function folder() {
  const folders = vscode.workspace.workspaceFolders || [];
  if (folders.length < 2) return folders[0] || null;
  return vscode.window.showWorkspaceFolderPick({ placeHolder: 'Which repository gets a room?' });
}

function activate(context) {
  const command = (id, fn) => context.subscriptions.push(vscode.commands.registerCommand(id, fn));
  command('codewizards.openRoom', async () => {
    const f = await folder();
    if (!f) { vscode.window.showErrorMessage('CodeWizards: open the folder of a git repository first.'); return; }
    await open(f.name, ['serve', '--repo', f.uri.fsPath], f.uri.fsPath, context);
  });
  command('codewizards.openTower', () => open('The Tower', ['tower'], undefined, context));
  command('codewizards.openDemo', () => open('Demo', ['demo'], undefined, context));
  command('codewizards.stop', () => stop());
  context.subscriptions.push({ dispose: stop });
}

function deactivate() { stop(); }

module.exports = { activate, deactivate };
