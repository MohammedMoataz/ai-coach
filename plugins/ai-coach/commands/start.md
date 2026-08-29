---
description: Day one on a project - detect what is already set up, then hand over the exact invocations for what is not, in the order the skills document. A tailored checklist, not automation.
argument-hint: "[--feature <name>] [--with-blueprint]"
disable-model-invocation: true
---

# /start — four names nobody should need on day one

Setting up a project properly is a handful of invocations across three plugins, in a documented
order — and the person who needs the sequence most is the one who has not yet learned any of the
names. Those skills are user-only on purpose (they write your identity, your project file, your
docs), and **Claude Code enforces that**: this command cannot run them for you and must not
reproduce their steps another way. What it can do is read the repo, work out which steps this
project actually still needs, and hand you each one as a line to type.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

## Detect — reading only, so the checklist is about this repo, not a generic one

1. `ENGINE whoami` — is the user identified (email, name), are they in the roster, is a project
   declared, does the branch pass the convention?
2. Look for what already exists: `.ai-coach/team.md`, `.ai-coach/project.md`,
   `docs/onboarding/index.md` and whether it is current, `docs/business/`. Every one that exists
   removes a step — day one on a documented project is short, and this command's main value is
   saying so instead of re-generating what is there.
3. Note which of the three plugins are installed — **by running `claude plugin list`, never by
   whether their skills appear in your context.** User-only skills are invisible to you by
   design, so what you can see says nothing about what is installed. A step whose plugin is
   missing appears on the checklist as "skipped — <plugin> not installed", never as a failure.

## The checklist — printed, tailored, in order, each line ready to type

Only the steps the detection says are needed, each with one sentence on what it will do and what
it will ask:

1. `/memory-coach:roster register` — when the user is not in the roster. It asks for the role;
   registering is per person and never done on someone's behalf.
2. `/memory-coach:roster declare <name>` — when they work across sibling repos that should share
   one memory (ask this — one question). Single-repo work skips this line, and the report says
   "implicit project, nothing to declare".
3. `/investigation-coach:onboard --tour` — the docs, the architecture picture, the explanation,
   in the order that costs least. Forward `--feature <name>` into the printed line if it was
   given. Warn honestly: this is three code-reading skills back to back, the most expensive thing
   in the marketplace, and the tour re-states the cost with real numbers before it runs.
4. `/strategy-coach:blueprint` — only when `--with-blueprint` was given; otherwise one line
   saying it exists and why it goes last (it reads what the tour wrote instead of re-deriving
   it). Defaulting into it would double the bill uninvited.

## Rules

- Never run the checklist's skills and never re-implement them — the harness blocks the first
  and forbids the second. The product here is the *tailored* list: what this repo still needs,
  in the right order, with nothing to memorize.
- Never invent an identity, a project name, or a branch convention. Every one is a question with
  an owner, and the owner is in the chair.
- Close with the two names worth keeping after day one: `/memory-coach:recall` when a question
  matches prior work, and `/ai-coach:wrap` when a piece of work finishes.
