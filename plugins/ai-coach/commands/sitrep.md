---
description: The morning read - what the engine's own numbers say about memory, security and failures, one page, worst first, read-only. Points at the two deep dives it deliberately does not perform.
argument-hint: ""
disable-model-invocation: true
---

# /sitrep — the state of everything, changing nothing

The engine already knows most of what a status check needs, and it answers raw queries to anyone
who asks. This command asks them all and writes one page. It is **read-only end to end** — it
reports, recommends, and changes nothing, including the things it finds broken, because a status
report that repairs things is a status report nobody dares run.

Two deeper checks exist as user-only skills, deliberately — contradiction-hunting in memory and
the live context breakdown are judgment work a person fires. This command does not run them and
does not re-implement them; it reports the raw numbers the engine gives directly, and prints the
two invocations when those numbers say a deep dive would pay.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

## Gather — raw engine reads, every one skippable if its data is absent

1. `ENGINE stats` — total memories, provenance split, open corrections. This is the floor the
   other sections must agree with.
2. `ENGINE corrections --open` — failures this project hit that nobody wrote a memory about.
   These are what the coach line counts, and the oldest is the headline.
3. `ENGINE findings --open` — security findings, oldest first, because age is the number nobody
   watches. Skipped with a note if security-coach has never recorded any.
4. `ENGINE config` — report only the rows whose `set by` is not `default`, naming the source. A
   turned-off `corrections` or `learn` explains half of what the other sections show, and
   reading a settings problem as a memory problem wastes the report.
5. `ENGINE debriefs --since 14` — what recently changed hands, one line each, so "nothing has
   been handed over in two weeks of activity" can surface as the finding it is.

## Report

One page, worst first — the ordering *is* the analysis, and it is the same priority ladder the
coach line uses: an unrecorded failure outranks an old security finding outranks a settings
surprise outranks stale memory.

- Open with the single most urgent line across every section, whichever it came from.
- Then one short block per section: the finding, the evidence, and the exact command that would
  address it — always a command the user could paste, never an action taken.
- Sections with nothing wrong get one line. "Nothing worth flagging" is a real result and the
  usual one; a sitrep padded to look thorough teaches people to skim sitreps.
- Close with the `ENGINE stats` line verbatim — retyped numbers are invented numbers — and the
  two deep dives, offered only when the numbers above earned them:

  ```
  /memory-coach:recall --health     when distilled outnumbers human, or memory looks stale
  /harness-coach:context            when this session feels heavy, or before a long run
  ```

## Rules

- Read-only is absolute: no `ENGINE add`, no `forget`, no file writes, no fixes — even trivial
  ones. Recommend, and stop.
- Every number carries its source command, so any line can be re-run and checked.
- If two sections disagree — stats says corrections are open, the corrections list is empty —
  report the disagreement as its own finding. It usually means a scope problem, and papering
  over it is how scope problems survive.
