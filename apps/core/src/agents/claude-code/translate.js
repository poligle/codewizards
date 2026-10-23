// Claude Code headless output (`claude -p --output-format stream-json --verbose`) → contract v2.
// Pure and stateful per turn: push() takes one parsed line and returns the drafts it produces
// (events without seq, ts or room; the store stamps them). The orchestrator adds the lifecycle
// events (summoned, assigned, artifact, review, done). Raw tool output is never copied into events.
//
//   system/init            → (session, model, capabilities kept for diagnostics)
//   assistant, tool_use    → Read/Grep/Glob: context.read · Edit/Write/MultiEdit/NotebookEdit: code.write
//   system/api_retry       → rate_limit, billing_error: agent.blocked (quota) + quota.updated
//                            authentication_failed, oauth_org_not_allowed: agent.blocked (auth)
//   next assistant message → agent.unblocked
//   tool_result of a Bash  → command.run (failed when the command failed)
//   denied tool call       → command.denied (from its tool_result, or from result.permission_denials)
//   rate_limit_event       → quota.updated per window (five_hour, seven_day…), with utilization and reset
//   result                 → tokens.used and the outcome (ok or failure)
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
// Seen with Claude Code 2.1.223 and claude-opus-5-5 (23/10/2026): a model newer than the CLI.
const TOO_OLD = /Claude Code (\d+\.\d+\.\d+) does not support this model; version (\d+\.\d+\.\d+) or newer is required/i;
const MAX_LINES = 40;
const MAX_CHARS = 8000;
// How Claude Code words a refused tool call (dontAsk mode); a command that ran and hit a file's
// "Permission denied" is not one of these.
const DENIED = /permission to use|requested permissions? to use|haven't granted|has been denied|was denied by|not allowed by your/i;
const STATUS = { allowed: 'ok', allowed_warning: 'limited', rejected: 'exhausted' };
const WINDOW = /^[a-z0-9_]{1,32}$/;

// rate_limit_event values seen in the wild: utilization 0–1 (some tools print percentages) and
// resetsAt in seconds or milliseconds since the epoch.
const fraction = u => (typeof u === 'number' && Number.isFinite(u) ? Math.min(1, Math.max(0, u > 1 ? u / 100 : u)) : null);
const epochMs = t => (typeof t === 'number' && Number.isFinite(t) && t > 0 ? Math.round(t < 1e12 ? t * 1000 : t) : null);
const statusOf = u => (u === null ? 'unknown' : u >= 1 ? 'exhausted' : u >= 0.9 ? 'limited' : 'ok');
const textOf = c => (typeof c === 'string' ? c : Array.isArray(c) ? c.map(b => (b && typeof b.text === 'string' ? b.text : '')).join(' ') : '');

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
    this.turns = null;
    this.durationMs = null;
    this.quota = {};            // window → {status, utilization, resets_at}, the latest seen
    this.seen = new Set();
    this.calls = new Map();     // tool_use id → {tool, command}
    this.denied = new Set();    // tool_use ids already reported as denied
  }

  /** The turn's outcome once `result` arrives: {ok: true, message} or {ok: false, reason, message}. */
  get outcome() { return this.result; }

  push(msg) {
    if (!msg || typeof msg !== 'object') return [];
    if (msg.type === 'system') return this.system(msg);
    if (msg.type === 'assistant') return this.assistant(msg);
    if (msg.type === 'user') return this.toolResults(msg);
    if (msg.type === 'rate_limit_event') return this.rateLimit(msg);
    if (msg.type === 'result') return this.finish(msg);
    return [];   // stream_event, hook events…
  }

  rateLimit(msg) {
    const info = msg.rate_limit_info && typeof msg.rate_limit_info === 'object' ? msg.rate_limit_info : null;
    if (!info) return [];
    const main = WINDOW.test(info.rateLimitType || '') ? info.rateLimitType : null;
    const windows = info.unifiedWindows && typeof info.unifiedWindows === 'object' ? Object.entries(info.unifiedWindows) : [];
    const rows = windows.length
      ? windows.filter(([w, v]) => WINDOW.test(w) && v && typeof v === 'object').map(([w, v]) => [w, fraction(v.utilization), epochMs(v.resetsAt)])
      : [[main, fraction(info.utilization), epochMs(info.resetsAt)]];
    return rows.map(([w, u, r]) => {
      const status = w === main || !windows.length ? (STATUS[info.status] || statusOf(u)) : statusOf(u);
      if (w) this.quota[w] = { status, utilization: u, resets_at: r };
      return { t: 'quota.updated', account: this.account, status, ...(w ? { window: w } : {}), utilization: u, resets_at: r };
    });
  }

  toolResults(msg) {
    const out = [];
    const content = msg.message && Array.isArray(msg.message.content) ? msg.message.content : [];
    for (const b of content) {
      if (!b || b.type !== 'tool_result' || !this.calls.has(b.tool_use_id)) continue;
      const call = this.calls.get(b.tool_use_id);
      this.calls.delete(b.tool_use_id);
      if (b.is_error && DENIED.test(textOf(b.content))) {
        this.denied.add(b.tool_use_id);
        out.push({ t: 'command.denied', agent: this.agent, tool: call.tool.slice(0, 64), ...(call.command ? { command: call.command } : {}) });
      } else if (call.tool === 'Bash' && call.command) {
        out.push({ t: 'command.run', agent: this.agent, command: call.command, failed: !!b.is_error });
      }
    }
    return out;
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
      if (b.id) {
        const command = String(input.command || input.url || input.file_path || '').slice(0, 500);
        this.calls.set(b.id, { tool: String(b.name || 'tool'), command });
      }
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
    this.turns = Number.isSafeInteger(msg.num_turns) ? msg.num_turns : null;
    this.durationMs = Number.isSafeInteger(msg.duration_ms) ? msg.duration_ms : null;
    const out = [{ t: 'tokens.used', agent: this.agent, account: this.account, input, output, cache, cost_usd: cost }];
    for (const d of Array.isArray(msg.permission_denials) ? msg.permission_denials.slice(0, 10) : []) {
      if (!d || this.denied.has(d.tool_use_id)) continue;   // already reported from its tool_result
      if (d.tool_use_id) this.denied.add(d.tool_use_id);
      const what = d.tool_input && typeof d.tool_input === 'object' ? String(d.tool_input.command || d.tool_input.file_path || d.tool_input.url || '') : '';
      out.push({ t: 'command.denied', agent: this.agent, tool: String(d.tool_name || 'tool').slice(0, 64), ...(what ? { command: what.slice(0, 500) } : {}) });
    }
    const text = typeof msg.result === 'string' ? msg.result : '';
    if (msg.subtype === 'success' && !msg.is_error) {
      this.result = { ok: true, message: text.slice(0, 2000) };
    } else {
      const reason = this.blocked === 'auth' ? 'auth' : LIMIT_TEXT.test(text) ? 'quota' : (FAIL[msg.subtype] || 'error');
      const old = TOO_OLD.exec(text);
      const readable = old
        ? `Your Claude Code (${old[1]}) is too old for this model: it needs ${old[2]} or newer. Update Claude Code, or use an alias (haiku, sonnet, opus) in ranks.json, which always picks a model your version supports.`
        : text;
      this.result = { ok: false, reason, message: (readable || String(msg.subtype || 'Claude Code reported an error')).slice(0, 2000) };
      if (reason === 'quota') out.push({ t: 'quota.updated', account: this.account, status: 'exhausted', resets_at: null });
    }
    return out;
  }
}
