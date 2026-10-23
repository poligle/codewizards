// Claude Code headless output (`claude -p --output-format stream-json --verbose`) → contract v1.
// Pure and stateful per turn: push() takes one parsed line and returns the drafts it produces
// (events without seq, ts or room; the store stamps them). The orchestrator adds the lifecycle
// events (summoned, assigned, artifact, review, done). Raw tool output is never copied into events.
//
//   system/init            → (session, model, capabilities kept for diagnostics)
//   assistant, tool_use    → Read/Grep/Glob: context.read · Edit/Write/MultiEdit/NotebookEdit: code.write
//   system/api_retry       → rate_limit, billing_error: agent.blocked (quota) + quota.updated
//                            authentication_failed, oauth_org_not_allowed: agent.blocked (auth)
//   next assistant message → agent.unblocked
//   result                 → tokens.used, agent.error per permission denial, outcome (ok or failure)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const READ = new Set(['Read', 'Grep', 'Glob', 'LS', 'NotebookRead']);
const WRITE = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const QUOTA = new Set(['rate_limit', 'billing_error']);
const AUTH = new Set(['authentication_failed', 'oauth_org_not_allowed']);
const FAIL = {
  error_max_turns: 'max_turns', error_max_budget_usd: 'budget', error_during_execution: 'error', error_max_structured_output_retries: 'error',
};
// Unverified heuristic: how a plan's usage limit shows up in the result text.
const LIMIT_TEXT = /usage limit|limit reached|out of (?:extra )?usage/i;
const MAX_LINES = 40;
const MAX_CHARS = 8000;

export function miniDiff(tool, file, input) {
  const lines = [];
  let cut = false;
  const add = (prefix, text) => {
    for (const l of String(text ?? '').split('\n')) {
      if (lines.length > MAX_LINES) { cut = true; return; }
      lines.push(prefix + l);
    }
  };
  if (tool === 'Write') { lines.push(`@@ ${file} (whole file) @@`); add('+', input.content); }
  else if (tool === 'Edit') { lines.push(`@@ ${file} @@`); add('-', input.old_string); add('+', input.new_string); }
  else if (tool === 'MultiEdit') {
    lines.push(`@@ ${file} @@`);
    for (const e of Array.isArray(input.edits) ? input.edits : []) { add('-', e && e.old_string); add('+', e && e.new_string); }
  } else { lines.push(`@@ ${file} (notebook cell) @@`); add('+', input.new_source); }
  let s = lines.join('\n');
  if (cut) s += '\n… (the full change is in the final diff)';
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + '\n…' : s;
}

export class ClaudeTranslator {
  /** @param {{agent: string, task: string, cwd: string, account: string}} o */
  constructor({ agent, task, cwd, account }) {
    Object.assign(this, { agent, task, cwd, account });
    // The CLI may report paths under the real directory while we know it by a link (macOS /var).
    let real = cwd;
    try { real = fs.realpathSync.native(cwd); } catch { /* not on disk (recordings in tests) */ }
    this.roots = real === cwd ? [cwd] : [cwd, real];
    this.session = null;
    this.model = null;
    this.capabilities = [];
    this.blocked = null;
    this.result = null;
    this.tokens = 0;
    this.seen = new Set();
  }

  /** The turn's outcome once `result` arrives: {ok: true, message} or {ok: false, reason, message}. */
  get outcome() { return this.result; }

  push(msg) {
    if (!msg || typeof msg !== 'object') return [];
    if (msg.type === 'system') return this.system(msg);
    if (msg.type === 'assistant') return this.assistant(msg);
    if (msg.type === 'result') return this.finish(msg);
    return [];   // user (tool results), stream_event, hook events…
  }

  system(msg) {
    if (msg.subtype === 'init') {
      this.session = typeof msg.session_id === 'string' ? msg.session_id : null;
      this.model = typeof msg.model === 'string' ? msg.model : null;
      this.capabilities = Array.isArray(msg.capabilities) ? msg.capabilities.filter(c => typeof c === 'string') : [];
      return [];
    }
    if (msg.subtype !== 'api_retry') return [];
    const err = String(msg.error || '');
    const reason = QUOTA.has(err) ? 'quota' : AUTH.has(err) ? 'auth' : null;
    if (!reason || this.blocked === reason) return [];   // overloaded, server_error…: transient
    this.blocked = reason;
    const out = [{ t: 'agent.blocked', agent: this.agent, reason, detail: err.slice(0, 200) }];
    if (reason === 'quota') out.push({ t: 'quota.updated', account: this.account, status: 'limited', resets_at: null });
    return out;
  }

  assistant(msg) {
    const out = [];
    if (this.blocked) {
      out.push({ t: 'agent.unblocked', agent: this.agent });
      if (this.blocked === 'quota') out.push({ t: 'quota.updated', account: this.account, status: 'ok', resets_at: null });
      this.blocked = null;
    }
    const content = msg.message && Array.isArray(msg.message.content) ? msg.message.content : [];
    const files = [], writes = [];
    for (const b of content) {
      if (!b || b.type !== 'tool_use' || this.seen.has(b.id)) continue;
      if (b.id) this.seen.add(b.id);
      const input = b.input && typeof b.input === 'object' ? b.input : {};
      if (READ.has(b.name)) {
        const f = this.target(input);
        if (f && !files.includes(f)) files.push(f);
      } else if (WRITE.has(b.name)) {
        const f = this.target(input) || '(file)';
        writes.push({ t: 'code.write', agent: this.agent, file: f, diff: miniDiff(b.name, f, input) });
      }
    }
    if (files.length) out.push({ t: 'context.read', agent: this.agent, files: files.slice(0, 200), tokens_in: null });
    return out.concat(writes);
  }

  target(input) {
    const p = [input.file_path, input.notebook_path, input.path, input.pattern].find(x => typeof x === 'string' && x);
    return p ? this.display(p).slice(0, 512) : null;
  }

  // Paths inside the worktree become relative; anything else keeps its place, with ~ for home.
  display(p) {
    if (!path.isAbsolute(p)) return p;
    for (const root of this.roots) {
      const rel = path.relative(root, p);
      if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
    }
    const home = os.homedir();
    return home && p.startsWith(home) ? '~' + p.slice(home.length) : p;
  }

  finish(msg) {
    const u = msg.usage && typeof msg.usage === 'object' ? msg.usage : {};
    const n = k => (Number.isSafeInteger(u[k]) && u[k] >= 0 ? u[k] : 0);
    const input = n('input_tokens') + n('cache_creation_input_tokens');
    const output = n('output_tokens');
    const cache = n('cache_read_input_tokens');
    this.tokens += input + output;
    const cost = typeof msg.total_cost_usd === 'number' && msg.total_cost_usd >= 0 ? msg.total_cost_usd : null;
    const out = [{ t: 'tokens.used', agent: this.agent, account: this.account, input, output, cache, cost_usd: cost }];
    for (const d of Array.isArray(msg.permission_denials) ? msg.permission_denials.slice(0, 5) : []) {
      const what = d && d.tool_input && typeof d.tool_input === 'object' ? (d.tool_input.command || d.tool_input.file_path || d.tool_input.url || '') : '';
      out.push({ t: 'agent.error', agent: this.agent, message: `Permission denied: ${String((d && d.tool_name) || 'tool')}${what ? ` (${String(what).slice(0, 120)})` : ''}` });
    }
    const text = typeof msg.result === 'string' ? msg.result : '';
    if (msg.subtype === 'success' && !msg.is_error) {
      this.result = { ok: true, message: text.slice(0, 2000) };
    } else {
      const reason = this.blocked === 'auth' ? 'auth' : LIMIT_TEXT.test(text) ? 'quota' : (FAIL[msg.subtype] || 'error');
      this.result = { ok: false, reason, message: (text || String(msg.subtype || 'Claude Code reported an error')).slice(0, 2000) };
      if (reason === 'quota') out.push({ t: 'quota.updated', account: this.account, status: 'exhausted', resets_at: null });
    }
    return out;
  }
}
