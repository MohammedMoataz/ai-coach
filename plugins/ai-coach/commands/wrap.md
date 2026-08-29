---
description: Finish a piece of work properly - check what is wrappable, then hand over the exact one-line invocation that publishes the debrief and exports the seed. The ordering the docs require, remembered for you.
argument-hint: "[--name <label>] [--encrypt]"
disable-model-invocation: true
---

# /wrap — the work is not done until it can be picked up

Two skills own the ending of a piece of work, and their own documentation orders them: a seed
exported without a debrief "carries attribution without the reasoning behind it". Both are
user-only, deliberately — publishing a conclusion and exporting a seed are side effects a person
fires. **Claude Code enforces that**: this command cannot run those skills for you and must not
reproduce their steps another way. What it can do is everything around the firing: check the
state, tailor the sequence, and hand you the exact line to type.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again. If memory-coach is not installed,
say so and stop — there is nothing to wrap with.

## Steps

1. **Check the identity gate before the user hits it.** `ENGINE whoami` — if the `missing` list
   is non-empty, say what is on it and how to fix each item now (git config, the roster, the
   project name), because hitting that wall inside the export is the annoying place to hit it.
2. **Check there is something to wrap.** `ENGINE session-digest` header and `ENGINE stats` — a
   session with no observations and no first prompt has nothing to conclude; say so plainly and
   stop, because an empty debrief is worse than none.
3. **Check the branch tells the story.** `ENGINE whoami` reports `branchOk` — if it carries a
   message, surface it once: the debrief key and the seed both file under this branch name.
4. **Hand over the firing line.** One message, both skills — Claude Code chains skills the user
   names together:

   ```
   /memory-coach:debrief /memory-coach:handoff
   ```

   Forward the arguments into the line you print: `--name <label>` belongs to debrief,
   `--encrypt` to handoff. Say what will happen when they run it: the debrief drafts four
   sections and shows them for approval, then handoff exports — every gate those skills have
   stays exactly where it is, which is the point of them being user-fired.
5. **Say what comes after.** The one step neither skill runs:

   ```
   git add .ai-coach/team-seed.jsonl && git commit
   ```

   Nothing leaves this machine until that commit is pushed — knowledge travels by git,
   reviewable in a pull request, never by sync.

## Rules

- Never invoke the two skills yourself and never re-implement what they do — the harness blocks
  the first and forbids the second, and both refusals are the feature: side effects fire when a
  person types them.
- If the session plainly contains two unrelated pieces of work, say so — a conclusion that
  covers everything concludes nothing — and suggest wrapping them as two debriefs.
- Report only what the checks found and the lines to type. This command's product is a prepared
  runway, not a landing it performed itself.
