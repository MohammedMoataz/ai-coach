---
description: Health report on this project's memory — unclosed corrections, unverified knowledge, contradictions, low-value bulk. Reports only, changes nothing. Use for "/doctor", "check my memory".
argument-hint: "[--verbose]"
disable-model-invocation: true
model: haiku
effort: low
---

# /doctor — inspect the memory, change nothing

A health report, never a repair. Everything here is a judgment call about knowledge, and a tool that
silently rewrites what a team believes is worse than one that stays quiet. Every finding ends with
the command *you* would run, and you decide.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Steps

1. **Scope** — `ENGINE project`. Report which project and database file this covers. Then
   `ENGINE config`: report only the settings whose `set by` is **not** `default`, naming the source.
   Silence when nothing is changed. A turned-off `corrections` or `learn` explains half the findings
   below, and reading them as a memory problem when they are a settings problem wastes the report.
2. **Unclosed corrections** — `ENGINE corrections --open`. These are failures the project hit that
   nobody wrote a memory about; they are also what the coach line in the session brief counts. List
   them. Closing one is `/memory-coach:recall`'s two-command procedure — point there, don't restate it.
3. **Unverified knowledge** — `ENGINE stats`. If the distilled memories outnumber the human-written
   ones, say so plainly: a model compressed those out of transcripts and nobody confirmed them, so
   the memory is mostly guesses.
4. **Contradictions** — scan the top memories (`ENGINE brief`) for pairs that cannot both be true,
   and for any that name a file, flag, or command that no longer exists. Verify before reporting:
   Read the path, or `git log -1 -- <path>` if it was deleted. No check, no finding.
5. **Conclusions without evidence** — `ENGINE debriefs`. A debrief whose evidence section names
   no `file:line`, test or command is an opinion with a header on it. Say which ones, and that
   the fix is republishing under the same name (it replaces, it does not duplicate).
6. **Low-value bulk** — memories that are one-off notes with no reuse, and anything with confidence
   below 0.4 that is months old.

## Report

One line per finding: what it is, the evidence, and the exact command to fix it. End with the
`ENGINE stats` line verbatim — it is already the counts, and retyping numbers invents them.

`--verbose` changes exactly one thing: findings are listed in full instead of capped at the worst
five per section, and each contradiction carries the check that proved it (the command and its
output, or the `file:line` read). Everything else — the sections, the order, the closing stats
line — is identical. The default is the short report because a health check nobody finishes
reading is a health check nobody acts on.

## Rules

- Never run `forget`. Propose it; the user runs it.
- Never report a contradiction you have not checked against the current code. A false positive here
  costs more than a missed one, because it teaches the team to ignore the report.
- Silence is a valid report. "Nothing wrong" is worth saying in one line.
