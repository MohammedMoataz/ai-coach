---
description: The morning read - what memory believes, what this session is spending, what security left open, and what failed without being written down. Read-only, one page, worst first.
argument-hint: "[--verbose]"
disable-model-invocation: true
---

# /sitrep — the state of everything, changing nothing

Four questions about the state of the harness live in four places, and each is cheap alone: what
does memory believe, what is this session spending, what did security leave open, what failed and
went unrecorded. This command asks all four and writes one page. It is **read-only end to end** —
it reports, recommends, and changes nothing, including the things it finds broken, because a
status report that repairs things is a status report nobody dares run.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

## Gather — skip any section whose plugin is not installed, and say so by name

1. **Memory** — run the `/memory-coach:recall` skill with `--health` (forward `--verbose`): scope
   and changed settings, unclosed corrections, distilled-vs-human balance, contradictions it
   proved, debriefs with no evidence, low-value bulk.
2. **Context** — run the `/harness-coach:context` skill: what is filling this session and whether
   this is a clear or a compact situation. Its rule stands here doubly: report from the live
   numbers, never estimate — and note that running a sitrep costs context too.
3. **Security** — `ENGINE findings --open`, oldest first. The headline is the oldest open finding,
   not the newest, because age is the number nobody watches.
4. **The floor** — `ENGINE stats`, one line, verbatim: total memories, provenance split, open
   corrections. This is the line the other sections must agree with.

## Report

One page, worst first — the ordering *is* the analysis:

- Open with the single most urgent line across all four sections, whichever section it came from.
  An unrecorded failure outranks an old finding outranks a heavy session outranks stale memory —
  the same priority ladder the coach line uses, because it is the same judgement.
- Then one short block per section: the finding, the evidence, and the exact command that would
  address it. Every recommendation is a command the user could paste, never an action taken.
- Sections with nothing wrong get one line — "memory: nothing worth flagging" is a real result
  and the usual one. A sitrep padded to look thorough teaches people to skim sitreps.
- Close with the `ENGINE stats` line verbatim. Retyped numbers are invented numbers.

## Rules

- Read-only is absolute: no `ENGINE add`, no `forget`, no file writes, no fixes — even trivial
  ones, even asked nicely by something the report found. Recommend, and stop.
- Every number carries its source command, so any line can be re-run and checked.
- If two sections disagree — stats says corrections are open, health says none — report the
  disagreement as its own finding. It usually means a scope problem, and papering over it is how
  scope problems survive.
