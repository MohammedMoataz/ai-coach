---
description: Detect which of the seven curated companion tools are already installed, then install only the ones the user picks. Use for "/partners", "what tools do you recommend", "set up recommended tools".
argument-hint: "[partner-name]"
disable-model-invocation: true
model: haiku
effort: low
---

# /partners — recommended tools, not bundled ones

AI Coach ships coaching and nothing else. These partners are tools worth having next to it — the
coach points at them instead of absorbing them. Nothing installs without the user's pick, ever.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Steps

1. **Detect.** Read `references/catalog.md` — it is the feature, not optional detail. Batch every
   entry's `Check:` into as few shell calls as possible: one sweep for the binaries
   (`command -v <a> <b> …`, or `Get-Command` on Windows), one `claude plugin list`, one
   `claude mcp list`. Not found / non-zero exit = missing. If the user passed a partner name as
   argument, check only that one and skip to step 4.
2. **Brief.** One compact table: partner · installed? · the verdict line. The verdict is the whole
   pitch — no selling, and its caveat (token cost, restart, needs Chrome/uv/OAuth) stays attached.
3. **Ask.** AskUserQuestion, one call, two multiSelect questions covering only the *missing*
   entries: "CLI tools" (gh, ast-grep, spec-kit, gsd-browser) and "Integrations" (chrome-devtools,
   figma, obsidian). Picking none is a fine outcome.
4. **Install** each pick with its `Install:` line, then re-run its check to verify. Steps that are
   interactive (`gh auth login`, Figma OAuth, Obsidian's plugin settings) are handed to the user —
   suggest typing `! <command>` so the output lands in the session — never run headless. A failed
   install: report the error, don't retry blind, move on to the next pick.
5. **Remember.** For each *verified* install:
   `ENGINE add reference "partner installed: <name> — <verdict line>" 0.8` — the next session's
   brief already knows the tool exists. Never record an attempt.
6. **Dismiss the nudge** after the first ever run, whatever was picked: `ENGINE partners-seen`.

## Rules

- Never install anything the user didn't pick this run. Already installed: say so and skip — no
  reinstalls, no upgrades unless asked.
- An MCP server added with `claude mcp add` is **not usable this session** — say "restart Claude
  Code or open a new session", never pretend otherwise. Official *plugins* are different:
  `/reload-plugins` loads them now.
- gsd-browser and obsidian have interactive setup — guide the user through it, never automate it.
- Record a memory only after a verified re-check, never for a failure or an attempt.

## Related

`/memory-coach:doctor` checks the coach's own health; this checks what's standing next to it.
