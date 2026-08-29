# AI Coach beyond Claude Code

Claude Code gets the full product through the marketplace. Every other harness gets it through
two doors that already speak everyone's language: **MCP** for the live memory, and **compiled
rules** for the workflows. This directory holds both, plus the compiler that keeps the rules in
sync with their sources.

Every config snippet below was checked against that harness's own documentation on 2026-08-29.
These tools move fast — when a snippet stops working, their docs win, and a PR fixing it here is
welcome.

## What works where

| | Claude Code | Codex CLI | Cursor | opencode | anything MCP |
|---|---|---|---|---|---|
| Team memory, debriefs, prompt-check | plugins | MCP | MCP | MCP | MCP |
| The 25 workflows (skills) | native | AGENTS.md index | `.mdc` rules | AGENTS.md index | — |
| Session-start memory brief | automatic (hook) | first move by convention | first move by convention | first move by convention | `memory_brief` tool |
| Failure/observation recording | automatic (hooks) | — | — | — | — |
| Secrets guard (blocking) | opt-in hook | — | — | — | — |
| Injection spotlight on fetched content | automatic (hook) | — | — | — | — |
| User-only skills (machine-enforced) | enforced | convention, labelled | convention, labelled | convention, labelled | — |

The honest line: **the automatic layer is Claude Code's.** Hooks are what fire without being asked
— the brief injection, the failure log, the guard — and no other harness exposes an equivalent
surface this repo can target without shipping per-harness code it cannot test. Elsewhere, the
brief is your first move instead of your zeroth, and the conventions are trusted rather than
enforced. Everything that *stores and retrieves* — the actual differentiator — works everywhere.

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

Built by `node adapters/build.js` from the 25 `SKILL.md` sources; checked in under `adapters/out/`
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

## What is deliberately not here

- **Lifecycle adapters** (opencode plugins, Cursor hooks, Codex notify) — each is per-harness code
  this repo cannot test in CI, targeting APIs marked beta. They become worth writing when someone
  actually runs AI Coach outside Claude Code daily; write the one that person needs, not all
  three ahead of demand.
- **A blocking secrets guard elsewhere** — nothing outside Claude Code exposes a pre-tool-call
  block this repo could attach to. Saying "guarded" without the mechanism would be a lie; the
  guard column above says — instead.
