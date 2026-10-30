// The VS Code extension against the real core, with a stand-in for the vscode module: the panel
// frames the room the core serves, the core lets only VS Code's webviews frame it, closing the
// panel stops the core, and what goes wrong is said plainly.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(HERE, '..', '..', 'core', 'bin', 'codewizards.js');
const require = createRequire(import.meta.url);

function load(state) {
  const vscode = {
    ViewColumn: { Beside: -2 },
    ProgressLocation: { Notification: 15 },
    Uri: { parse: s => ({ toString: () => s }), joinPath: (base, ...p) => ({ fsPath: path.join(base.fsPath, ...p) }) },
    env: { remoteName: state.remoteName, asExternalUri: async u => u },
    workspace: { workspaceFolders: state.folders, getConfiguration: () => ({ get: k => state.config[k] }) },
    window: {
      createWebviewPanel: (id, title) => {
        const panel = { id, title, webview: { html: '' }, gone: false, handlers: [],
          onDidDispose(fn) { this.handlers.push(fn); return { dispose() {} }; },
          dispose() { if (!this.gone) { this.gone = true; this.handlers.forEach(f => f()); } } };
        state.panels.push(panel);
        return panel;
      },
      withProgress: (o, fn) => fn({ report() {} }),
      showErrorMessage: async m => { state.said.push(m); },
      showWarningMessage: async m => { state.said.push(m); },
    },
    commands: { registerCommand: (id, fn) => { state.commands[id] = fn; return { dispose() {} }; } },
  };
  const original = Module._load;
  Module._load = function (request, ...rest) { return request === 'vscode' ? vscode : original.call(this, request, ...rest); };
  try {
    delete require.cache[require.resolve('../extension.js')];
    const ext = require('../extension.js');
    ext.activate({ subscriptions: [], extensionUri: { fsPath: path.resolve(HERE, '..') } });
    return ext;
  } finally {
    Module._load = original;
  }
}

const fresh = (over = {}) => ({ folders: undefined, remoteName: undefined, config: { command: BIN, extraArgs: [] }, panels: [], said: [], commands: {}, ...over });

test('the demo opens in a panel that frames the room, and closing the panel stops the core', async () => {
  const state = fresh();
  const ext = load(state);
  await state.commands['codewizards.openDemo']();
  assert.deepEqual(state.said, []);
  const panel = state.panels[0];
  const src = /<iframe src="([^"]+)"/.exec(panel.webview.html)[1].replace(/&amp;/g, '&');
  assert.match(src, /^http:\/\/127\.0\.0\.1:\d+\/#token=/);
  assert.match(panel.webview.html, /default-src 'none'; frame-src http:\/\/127\.0\.0\.1:\d+;/);
  const res = await fetch(src.split('#')[0]);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors vscode-webview:/);
  assert.equal(res.headers.get('x-frame-options'), null);
  panel.dispose();
  let down = false;
  for (let i = 0; i < 40 && !down; i++) {
    await new Promise(r => setTimeout(r, 100));
    down = await fetch(src.split('#')[0]).then(() => false, () => true);
  }
  assert.ok(down, 'the core stops with the panel');
  ext.deactivate();
});

test('no folder, no command and a remote workspace are each said plainly', async () => {
  let state = fresh();
  load(state);
  await state.commands['codewizards.openRoom']();
  assert.match(state.said[0], /open the folder of a git repository first/);
  state = fresh({ config: { command: 'codewizards-that-is-not-installed', extraArgs: [] } });
  load(state);
  await state.commands['codewizards.openDemo']();
  assert.match(state.said[0], /was not found\. Install it with npm install -g codewizards/);
  state = fresh({ remoteName: 'ssh-remote' });
  load(state);
  await state.commands['codewizards.openDemo']();
  assert.match(state.said[0], /remote workspaces/);
  assert.equal(state.panels.length, 0);
});

test('the core refuses any other frame ancestor', async () => {
  const { parseArgs } = await import('../../core/src/cli.js');
  assert.equal(parseArgs(['demo', '--frame-ancestor', 'vscode-webview:'])['frame-ancestor'], 'vscode-webview:');
  assert.throws(() => parseArgs(['demo', '--frame-ancestor', 'https://evil.example']), /--frame-ancestor must be/);
});
