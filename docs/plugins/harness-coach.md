# harness-coach

The harness around the coach, not the coach itself. `partners` finds which recommended companion
tools are already installed and installs only the ones you pick. `context` reads the session's
context breakdown with you and answers the practical question: clear, compact, or keep going. Reach
for it when setting up a machine, or when a session feels heavy.

| | |
|---|---|
| Version | 1.1.0 |
| Depends on | `ai-coach-core` `^1.6.0` |
| Source | [`plugins/harness-coach/`](../../plugins/harness-coach/) |

The plugin ships skills only ([plugin.json](../../plugins/harness-coach/.claude-plugin/plugin.json)).
Engine verbs written as `ENGINE <verb>` are documented in [engine.md](../engine.md).

## What it ships

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `partners` | skill | `/harness-coach:partners`, user-only (`disable-model-invocation`) | Detects curated companion tools, then installs only the ones the user picks. |
| `context` | skill | `/harness-coach:context`, user-only | Itemizes what fills the session's context and answers clear-or-compact. |
| `partners/references/catalog.md` | reference | Loaded by `partners` | The partner list: verdict, check command and install command for each. |

Both skills are user-only, so neither description is loaded into the model's context.

## partners

**Invocation:** `/harness-coach:partners [partner-name]`. Frontmatter pins `model: haiku`,
`effort: low`.

Steps ([partners/SKILL.md:18-41](../../plugins/harness-coach/skills/partners/SKILL.md)):

1. **Detect.** Reads `references/catalog.md` and batches every entry's `Check:` into as few shell
   calls as possible: one sweep for binaries (`command -v`, or `Get-Command` on Windows), one
   `claude plugin list`, one `claude mcp list`. Not found or a non-zero exit means missing. With a
   partner name as argument, it checks only that one and jumps to step 4.
2. **Brief.** One table: partner, installed or not, and the verdict line with its caveat.
3. **Ask.** One `AskUserQuestion` call with two multi-select questions covering only missing
   entries: "CLI tools" (gh, ast-grep, spec-kit, gsd-browser) and "Integrations" (chrome-devtools,
   figma, obsidian, miro). draw.io is in neither group, because generating a `.drawio` file needs
   nothing installed. Its editor extension is offered only if the user asks to edit diagrams.
4. **Install** each pick with its `Install:` line, then re-run the check to verify. Interactive
   steps (`gh auth login`, Figma OAuth, Obsidian settings) are handed to the user as `! <command>`.
   A failed install is reported and not retried.
5. **Remember** each verified install:
   `ENGINE add reference "partner installed: <name> — <verdict line>" 0.8`.
6. **Dismiss the nudge** after the first run, whatever was picked: `ENGINE partners-seen`.

Rules it states ([partners/SKILL.md:43-51](../../plugins/harness-coach/skills/partners/SKILL.md)):

- Never installs anything the user did not pick this run, and never reinstalls or upgrades unless
  asked.
- An MCP server added with `claude mcp add` is not usable until Claude Code restarts. Official
  plugins load with `/reload-plugins`.
- gsd-browser and obsidian setup is guided, never automated.
- A memory is recorded only after a verified re-check, never for an attempt.

### `references/catalog.md`

One section per partner, facts dated 2026-08. Adding a partner is a markdown edit there, with no
registry file ([catalog.md:3-5](../../plugins/harness-coach/skills/partners/references/catalog.md)).
The entries:

| Partner | Check | Notable caveat in the catalog |
|---|---|---|
| gh CLI | `gh --version` | GitHub MCP server deliberately not listed; `gh auth login` is the user's to run. |
| chrome-devtools | `claude plugin list` contains `chrome-devtools-mcp` | Exposes roughly 30 to 60 tools while enabled; needs Chrome. |
| figma | `claude plugin list` contains `figma@` | Browser OAuth from the `/plugin` panel. |
| obsidian | `claude mcp list` contains `obsidian` | A plain-markdown vault needs no install. The MCP path needs Local REST API 4.1.3 or later. |
| miro | `claude plugin list` contains `miro@` | Free tier caps editable boards; never call an authenticate tool to probe. |
| draw.io | `code --list-extensions` contains `hediet.vscode-drawio` | Nothing to install to generate files; a viewer only. |
| ast-grep | `ast-grep --version` | None. |
| gsd-browser | `gsd-browser --version` | On Windows run natively, never through `wsl.exe`; two repos claim the name. |
| spec-kit | `specify version` | Needs `uv`; use `uv tool install`, not `uvx`. |

Install lines for gh and draw.io's desktop app use `winget`; the catalog says to verify install
lines against upstream once it has aged.

## context

**Invocation:** `/harness-coach:context [--plugins] [--session]`

It does not free context itself, because reading anything costs some. It is meant for when a session
feels heavy, not as routine hygiene
([context/SKILL.md:13-14](../../plugins/harness-coach/skills/context/SKILL.md)).

What it teaches is in the context, in the order it usually surprises people: tool results, the
conversation, always-on skill and agent descriptions, then system, tools and instruction files.

Steps ([context/SKILL.md:36-60](../../plugins/harness-coach/skills/context/SKILL.md)):

1. **Live numbers first.** Asks the user to run Claude Code's own `/context` and paste the output.
   Never estimates.
2. **Name the largest line.** If tool results dominate, the fix is fewer whole-file reads, `Grep`
   over `Read`, and subagents for sweeps.
3. **`--plugins`:** runs `claude plugin details <name>` per installed plugin and lists the projected
   always-on and on-invoke tokens worst-first.
4. **`--session`:** `ENGINE session-digest` for patterns behind the number: repeated reads, a command
   run many times, a sweep that should have been a subagent.
5. **Clear or compact:**

   | Situation | Do |
   |---|---|
   | Next task unrelated | `/clear` |
   | Same task, long thread, still progressing | Let it compact. AI Coach writes a snapshot first. |
   | Same task, gone in circles | `/clear`, then one good prompt |
   | About to hand off or stop | `/memory-coach:debrief` first |

6. **One line on cost:** what dominates, the one change worth making, and what was not checked.

Rules: report from output, never from estimate; `/clear` is a suggestion, never an action it takes;
compaction is not failure; on-invoke cost is not counted as always-on; say so if it is run twice in
a session ([context/SKILL.md:62-71](../../plugins/harness-coach/skills/context/SKILL.md)).

**Writes:** nothing.

## Configuration

None of its own. The shared `partners` setting (default `on`) controls the one-time session-start
note suggesting `/harness-coach:partners`
([engine.js:324-325](../../plugins/ai-coach-core/hooks/engine.js),
[session-start.js:68-71](../../plugins/ai-coach-core/hooks/session-start.js)). See
[engine.md](../engine.md#settings).

## Data it keeps

| Where | What | Scope |
|---|---|---|
| `~/.ai-coach/partners-seen` | Marker written by `ENGINE partners-seen`; its existence stops the session-start nudge ([engine.js:23](../../plugins/ai-coach-core/hooks/engine.js)) | User scope |
| Project memory | One `reference` memory per verified partner install, confidence 0.8 | User scope, in the project tenant |

`context` keeps nothing.

## Limits and known issues

- `context --plugins` relies on `claude plugin details`, which the README says projects every
  description as always-on regardless of `disable-model-invocation`, overstating the real cost
  ([README: What it costs before you type](../../README.md#what-it-costs-before-you-type)). The skill does not mention this.
  Use a live `/context` for what is actually loaded.
- The catalog's install lines are dated 2026-08 and Windows-first (`winget`). Verify against
  upstream.
- An MCP partner needs a restart before it is usable in the session.
- No open issue targets this plugin.

## Source map

- [`../../plugins/harness-coach/.claude-plugin/plugin.json`](../../plugins/harness-coach/.claude-plugin/plugin.json): manifest, version, dependency on `ai-coach-core`.
- [`../../plugins/harness-coach/skills/partners/SKILL.md`](../../plugins/harness-coach/skills/partners/SKILL.md): detect, ask, install, verify, remember.
- [`../../plugins/harness-coach/skills/partners/references/catalog.md`](../../plugins/harness-coach/skills/partners/references/catalog.md): the partner entries.
- [`../../plugins/harness-coach/skills/context/SKILL.md`](../../plugins/harness-coach/skills/context/SKILL.md): the context budget and clear-or-compact.
- [`../../plugins/ai-coach-core/hooks/session-start.js`](../../plugins/ai-coach-core/hooks/session-start.js): the one-time partners nudge.
