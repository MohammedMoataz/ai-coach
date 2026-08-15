---
description: Check this project's memory for duplicates, stale entries and unclosed corrections. Reports only. Use for "/doctor", "check my memory".
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

1. **Scope** — `ENGINE project`. Report which project and database file this covers.
2. **Unclosed corrections** — `ENGINE corrections --open`. These are failures the project hit that
   nobody wrote a memory about; they are also what the coach line in the session brief counts. For
   each, suggest the memory that would close it, then `ENGINE correction-done <id>`.
3. **Unverified knowledge** — `ENGINE search "<the project's main topics>" --full` and count rows
   labelled `distilled`. A model compressed those out of a transcript and nobody confirmed them. If
   they outnumber the human-written ones, say so plainly: the memory is mostly guesses.
4. **Contradictions** — scan the top memories for pairs that cannot both be true, and for any that
   name a file, flag, or command that no longer exists in the repo. Verify before reporting: check
   the path.
5. **Low-value bulk** — memories that are one-off notes with no reuse, and anything with confidence
   below 0.4 that is months old.

## Report

One line per finding: what it is, the evidence, and the exact command to fix it. End with the
counts — total memories, how many distilled, how many corrections still open.

## Rules

- Never run `forget`. Propose it; the user runs it.
- Never report a contradiction you have not checked against the current code. A false positive here
  costs more than a missed one, because it teaches the team to ignore the report.
- Silence is a valid report. "Nothing wrong" is worth saying in one line.
