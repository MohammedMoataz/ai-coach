# AI Coach beyond Claude Code

Claude Code gets the full product through the marketplace. Every other harness gets it through
two doors that already speak everyone's language: **MCP** for the live memory, and **compiled
rules** for the workflows. This directory holds both, plus the compiler that keeps the rules in
sync with their sources.

Every config snippet below was checked against that harness's own documentation on 2026-08-29.
These tools move fast — when a snippet stops working, their docs win, and a PR fixing it here is
welcome.

## What works where

| | Claude Code | Cursor | Windsurf | Antigravity | opencode | Blackbox | Codex CLI / anything MCP |
|---|---|---|---|---|---|---|---|
| Team memory, debriefs, prompt-check | plugins | MCP | MCP | MCP | MCP | MCP | MCP |
| The 26 workflows (skills) | native | `.mdc` rules | rules dir | rules dir | AGENTS.md | AGENTS.md | AGENTS.md index |
| Observation / failure recording | automatic | **shim** | **shim** (no failure event) | **shim** | **plugin** | **shim** † | — |
| Prompt signals | automatic | **shim** | **shim** | — (no prompt event) | — | **shim** † | — |
| Secrets guard (blocking, opt-in) | hook | **shim** — deny + ask | **shim** — deny only, no ask tier | **shim** — deny + ask | **plugin** — deny only | **shim** † | — |
| Session-end distillation | automatic | **shim** | — (no end event) | **shim** (Stop) | **plugin** (idle) | **shim** † | — |
| Session-start memory brief | injected | recorded, brief by convention | by convention | by convention | by convention | by convention | `memory_brief` tool |
| User-only skills | machine-enforced | convention, labelled | convention, labelled | convention, labelled | convention, labelled | convention, labelled | — |

† Blackbox's hook schema is stated on its marketing page (PreToolUse/PostToolUse/Stop) but not
publicly documented in detail; the template assumes the Claude Code contract it advertises.
Treat it as the least-verified row here.

**How the shim works.** `adapters/shim.js` translates each harness's event JSON into the
Claude-Code shape and runs the *same tested hook scripts* this repo already ships — guard.js,
observe.js, session-start.js — then answers in the harness's own dialect: Cursor gets a JSON
verdict plus exit 2, Windsurf gets exit codes (and having no ask tier, a secret-*ish* payload
blocks rather than slipping through), Antigravity gets a camelCase `decision` with the ask tier
intact. One shim, four dialects, zero duplicated logic. opencode is the exception: a native
plugin (`adapters/opencode/ai-coach.js`), because its surface is JS events, not shell commands.

**What is still honestly Claude Code's:** context injection. No other harness documents a way for
a session-start hook to hand text into the model's context, so the brief is your first move
(`ENGINE brief`, or the `memory_brief` MCP tool) instead of your zeroth. And these hook surfaces
are beta everywhere — field names move; the shim extracts leniently and degrades to
not-recording, never to breaking a session.

## Setup, once, any harness

```bash
git clone https://github.com/MohammedMoataz/ai-coach
node ai-coach/plugins/ai-coach-core/hooks/engine.js bootstrap   # plants ~/.ai-coach/bin/engine.js
```

Needs Node 22.16+ or 24+ (`node:sqlite` with FTS5 — the same floor as everywhere else in this
repo). Set `AICOACH_REPO` to the clone path; the compiled rules reference it.

Data lives in `~/.ai-coach/` regardless of harness — a Cursor session and a Claude Code session on
the same machine share one memory, which is the point.

## The MCP server

`adapters/mcp/server.js` — zero dependencies, stdio. Seven tools: `memory_search`, `memory_add`,
`memory_brief`, `debriefs_list`, `debrief_show`, `prompt_check`, `whoami`. Publishing verbs
(`seed-export`, `debrief-publish`) are deliberately absent: an MCP tool is model-invoked by
definition, and publishing is a person's act — on other harnesses, run those through the engine
CLI yourself.

**Codex CLI** — `~/.codex/config.toml`:

```toml
[mcp_servers.ai-coach]
command = "node"
args = ["/absolute/path/to/ai-coach/adapters/mcp/server.js"]
```

or `codex mcp add ai-coach -- node /absolute/path/to/ai-coach/adapters/mcp/server.js`

**Cursor** — `.cursor/mcp.json` in the project (or `~/.cursor/mcp.json` for everywhere):

```json
{
  "mcpServers": {
    "ai-coach": {
      "command": "node",
      "args": ["/absolute/path/to/ai-coach/adapters/mcp/server.js"]
    }
  }
}
```

**opencode** — `opencode.json` in the workspace:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "ai-coach": {
      "type": "local",
      "command": ["node", "/absolute/path/to/ai-coach/adapters/mcp/server.js"],
      "enabled": true
    }
  }
}
```

**Claude Code** — you do not need this; install the plugins. The server exists for everyone else.

## The compiled rules

Built by `node adapters/build.js` from the 26 `SKILL.md` sources; checked in under `adapters/out/`
and CI fails if they drift from the sources. Do not hand-edit the outputs.

**Cursor**: copy the rules into your project —

```bash
cp ai-coach/adapters/out/cursor/*.mdc your-project/.cursor/rules/
```

Each is an agent-requested rule: Cursor attaches it when its description matches what you are
doing. Rules that are user-only in the original say so at the top and are honoured by convention.

**Codex / opencode / Gemini CLI / Copilot / Zed** (anything that reads the
[AGENTS.md standard](https://agents.md)): append or link `adapters/out/AGENTS.md` into your
project's `AGENTS.md`. It is an index — descriptions plus pointers into the clone — not a dump,
so it costs little context and the full instructions load only when followed.

**The model pipeline**: the engine's two internal LLM calls default to `claude -p`. On a machine
without it, set `AICOACH_LLM_CMD` to any command that reads a prompt on stdin and prints the
answer (`codex exec -`, `ollama run llama3.2`) — or set nothing, and those two niceties quietly
skip while everything else works.

## The lifecycle adapters

Written 2026-08-30, against each harness's documentation as of that date, because real users on
these harnesses now exist. The shim's translations are covered by `adapters/shim.test.js` with
each harness's documented payload shapes; what CI cannot cover is the harness actually firing the
hook — the first person on each harness is that integration test, and a field-name drift shows up
as silent non-recording, never as a broken session.

Each template carries `/absolute/path/to/ai-coach` — replace it with your clone's path.

**Cursor** — copy `adapters/cursor/hooks.json` into the project's `.cursor/hooks.json` (or merge
into `~/.cursor/hooks.json` for everywhere). Richest surface outside Claude Code: session
start/end, prompt signals, observations, failures, and the guard with its ask tier.

**Windsurf** — copy `adapters/windsurf/hooks.json` into `.windsurf/hooks.json` (or
`~/.codeium/windsurf/hooks.json`). Twelve events but no session-start/end and no failure event,
so: observations and prompt signals yes, distillation no. No ask tier — with the guard armed, a
secret-ish payload blocks outright. The shim ensures session rows itself, so digests still work.

**Antigravity** — copy `adapters/antigravity/hooks.json` into `.agents/hooks.json` in the
workspace (or `~/.gemini/config/hooks.json`). PreToolUse/PostToolUse/Stop map cleanly; its
`decision` dialect keeps the guard's ask tier.

**Blackbox** — copy `adapters/blackbox/hooks.json` where its docs put hooks config (†: the schema
is the least-verified here; it advertises the Claude Code contract and the template assumes it).

**opencode** — copy `adapters/opencode/ai-coach.js` into `.opencode/plugins/` (or
`~/.config/opencode/plugins/`). Native plugin, not the shim: observations, idle-close-out, and
the guard as a thrown error. The guard needs both `AICOACH_GUARD=on` and `AICOACH_REPO` set —
bootstrap plants only the engine, and guard.js runs from the clone.

**Codex CLI** — still MCP + AGENTS.md only: its `notify` fires on turn completion, which is too
little surface for observations or a guard. The matrix says — where that is the honest answer.
