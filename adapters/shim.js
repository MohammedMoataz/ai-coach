#!/usr/bin/env node
'use strict';
// One shim, many harnesses. Cursor, Windsurf, Antigravity and Blackbox all speak the same shape —
// an event as JSON on stdin, a verdict as JSON or an exit code — they just disagree on field
// names. So this translates a foreign event into the Claude-Code-shaped JSON the existing hook
// scripts already parse, runs the REAL hook (guard.js, observe.js, session-start.js…), and
// translates the verdict back. The hooks stay the single implementation, with their tests; the
// shim owns nothing but the two translations.
//
//   node adapters/shim.js <harness> <action>
//     harness: cursor | windsurf | antigravity | blackbox
//     action:  session-start | session-end | prompt | pre-tool | post-tool | post-fail | post-fetch
//
// The per-harness hooks.json templates in adapters/<harness>/ wire each native event to one of
// these canonical actions. Field extraction is deliberately lenient — these surfaces are beta and
// rename fields between releases — and a field the shim cannot find degrades the recording, never
// the user's tool call: this exits 0 on anything unexpected, exactly like the hooks it wraps.

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HARNESSES = ['cursor', 'windsurf', 'antigravity', 'blackbox'];
const ACTIONS = {
  'session-start': { script: 'session-start.js', event: 'SessionStart' },
  'session-end': { script: 'session-end.js', event: 'SessionEnd' },
  prompt: { script: 'prompt.js', event: 'UserPromptSubmit' },
  'pre-tool': { script: 'guard.js', event: 'PreToolUse' },
  'post-tool': { script: 'observe.js', event: 'PostToolUse' },
  'post-fail': { script: 'observe.js', event: 'PostToolUseFailure' },
  'post-fetch': { script: 'spotlight.js', event: 'PostToolUse' },
};

const harness = process.argv[2];
const action = process.argv[3];
if (!HARNESSES.includes(harness) || !ACTIONS[action]) {
  console.error('usage: shim.js <' + HARNESSES.join('|') + '> <' + Object.keys(ACTIONS).join('|') + '>');
  process.exit(0); // never break a session over a wiring mistake
}

const first = (...c) => c.find((v) => v !== undefined && v !== null && v !== '');

let raw = '';
try { raw = require('node:fs').readFileSync(0, 'utf8'); } catch { /* no stdin */ }
let d = {};
try { d = JSON.parse(raw || '{}'); } catch { /* lenient: an unparseable event still records nothing */ }

// ---- foreign fields -> the Claude Code shape the hooks parse ----------------------------------
// Documented names first (Cursor: conversation_id/workspace_roots; Windsurf: trajectory_id/
// tool_info; Antigravity: camelCase), then the generic fallbacks.
const toolInfo = d.tool_info || d.toolInput || d.tool_input || {};
const cc = {
  session_id: String(first(d.session_id, d.conversation_id, d.trajectory_id, d.sessionId, d.conversationId, 'unknown-' + harness)),
  cwd: String(first(d.cwd, Array.isArray(d.workspace_roots) ? d.workspace_roots[0] : undefined, d.workspaceRoot, d.workspace_root, process.cwd())),
  hook_event_name: ACTIONS[action].event,
  tool_name: String(first(d.tool_name, d.toolName, d.tool,
    // shell-specific events (beforeShellExecution / pre_run_command) carry a command, not a tool
    (first(d.command, toolInfo.command) !== undefined ? 'Bash' : undefined), '')),
  tool_input: (() => {
    // start from whichever payload object exists, then normalize the two fields the hooks read —
    // camelCase filePath and top-level command included, whatever the harness called them
    const src = (typeof d.tool_input === 'object' && d.tool_input) || (typeof d.toolInput === 'object' && d.toolInput)
      || (typeof toolInfo === 'object' && toolInfo) || {};
    const t = { ...src };
    const fp = first(t.file_path, t.filePath, d.file_path, d.filePath);
    if (fp !== undefined) t.file_path = fp;
    const cmd = first(t.command, d.command);
    if (cmd !== undefined) t.command = cmd;
    return t;
  })(),
  tool_response: first(d.tool_response, d.toolResponse, d.output, toolInfo.output, ''),
  prompt: String(first(d.prompt, d.user_prompt, d.userPrompt, d.text, '')),
  source: String(first(d.source, '')),
};

// The guard's tiers are tool-aware — the ask tier fires only where a payload leaves the machine
// (Bash, WebFetch) or a credentials file is read (Read) — and foreign names like `run_command`
// or `pre_read_code` match none of that. Normalize for the guard only; observations keep the
// harness's own names, because the digest reading `write_code` is more honest than a guess.
if (action === 'pre-tool') {
  if (cc.tool_input.command !== undefined) cc.tool_name = 'Bash';
  else if (/read/i.test(cc.tool_name)) cc.tool_name = 'Read';
  else if (/write|edit/i.test(cc.tool_name)) cc.tool_name = 'Write';
  else if (/fetch|url|browse/i.test(cc.tool_name)) cc.tool_name = 'WebFetch';
}

// ---- run the real hook -------------------------------------------------------------------------
const hookDir = path.join(__dirname, '..', 'plugins', 'ai-coach-core', 'hooks');

// Windsurf has no session-start event at all, and any harness can fire a tool event before its
// session one — so observations ensure their session row first. The engine verb is a documented
// no-op when the row already exists; one cheap spawn buys a digest that never says "no session".
if (ACTIONS[action].script === 'observe.js' || ACTIONS[action].script === 'spotlight.js') {
  spawnSync(process.execPath, [path.join(hookDir, 'engine.js'), 'session-start', cc.session_id, cc.cwd],
    { encoding: 'utf8', timeout: 15000, env: process.env });
}
const r = spawnSync(process.execPath, [path.join(hookDir, ACTIONS[action].script)], {
  input: JSON.stringify(cc), encoding: 'utf8', timeout: 30000,
  env: { ...process.env, AICOACH_HARNESS: harness },
});
const out = r.stdout || '';
const blocked = r.status === 2;
// guard's ask tier surfaces as Claude's permissionDecision JSON on stdout
const asked = /"permissionDecision"\s*:\s*"ask"/.test(out);
const reason = (r.stderr || '').trim() || (asked ? (out.match(/"permissionDecisionReason"\s*:\s*"([^"]*)"/) || [])[1] || 'flagged by the AI Coach guard' : '');

// ---- the verdict, in the harness's own dialect --------------------------------------------------
if (action === 'pre-tool') {
  if (harness === 'antigravity') {
    // Antigravity wants a camelCase JSON decision; it has a real "ask"
    process.stdout.write(JSON.stringify(blocked ? { decision: 'deny', reason }
      : asked ? { decision: 'ask', reason } : { decision: 'allow' }) + '\n');
    process.exit(0);
  }
  if (harness === 'cursor') {
    // Cursor honours both the JSON verdict and exit 2; send both, they agree
    process.stdout.write(JSON.stringify(blocked ? { permission: 'deny', user_message: reason, agent_message: reason }
      : asked ? { permission: 'ask', user_message: reason } : { permission: 'allow' }) + '\n');
    process.exit(blocked ? 2 : 0);
  }
  // Windsurf: exit 2 blocks, and there is no ask — a secret-ish payload blocks rather than
  // slipping through, stated in the template. Blackbox claims the Claude contract; pass through.
  if (blocked || (asked && harness === 'windsurf')) {
    if (reason) console.error(reason);
    process.exit(2);
  }
  if (harness === 'blackbox' && out) process.stdout.write(out);
  process.exit(0);
}

// Non-blocking actions: recording was the point and it already happened. Claude-targeted stdout
// (context injections, coach lines) is not replayed into harnesses with different response
// schemas — except Blackbox, which advertises the Claude contract.
if (harness === 'blackbox' && out) process.stdout.write(out);
process.exit(0);
