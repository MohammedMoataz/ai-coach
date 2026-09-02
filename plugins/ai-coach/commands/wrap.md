---
description: Finish a piece of work properly - find what is missing, ask for it once, then publish the debrief and export the seed. One command, one review, no sequence to remember.
argument-hint: "[--name <label>] [--encrypt]"
disable-model-invocation: true
---

# /wrap — the work is not done until it can be picked up

Two skills own the ending of a piece of work, and their own documentation orders them: a seed
exported without a debrief "carries attribution without the reasoning behind it". Getting there
used to cost four typed commands, and the two identity gaps in the middle were always discovered
at the worst moment — inside the export, after the thinking was done.

This command closes them first. It reads the state, asks **once** for everything missing, writes
it in the order the tenant key requires, then fires both skills. The gate that matters does not
move: the debrief still shows you four sections and waits. What went away is having to type the
command that reaches the gate.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

**Checking whether memory-coach is installed: run `claude plugin list` and look for it.** Never
judge by whether its skills appear in your context. Not installed: say so and stop; there is
nothing to wrap with.

## 1. Read the state

- `ENGINE whoami` — `missing` lists what identity is absent, and can only hold four things:
  `username`, `email`, `role`, `project name`. `branchOk` carries a note when the branch does not
  match the convention; the debrief key and the seed both file under this branch name, so surface
  it once if it speaks.
- `ENGINE session-digest` header and `ENGINE stats` — a session with no observations and no first
  prompt has nothing to conclude. Say so plainly and stop: an empty debrief is worse than none.
- `ENGINE project` and `ENGINE projects` — the tenant check below. These two report rather than
  change anything you can see, with one wrinkle that matters to the next step: resolving a key
  registers it, so `project` itself adds the current key to the list `projects` prints.

## 2. The tenant check — the one that is expensive to discover late

`ENGINE project` reports the key this session resolves to and whether it was `declared`. Undeclared,
it is inferred from the git remote, which is how a project ends up filed as
`bitbucket.org/acme/shop.web` rather than the name the team says out loud.

That key is not a label. It selects the database — one SQLite tenant per key.

`ENGINE projects` lists every key the engine has ever **opened**, and that list is machine-wide:
it holds keys from every project on this machine, including keys that hold nothing (a key is
recorded the first time it is resolved). Two consequences, and the second one is why this section
is written so carefully.

**Only two keys are ever candidates here**, and you must not consider a third:

1. the key this session resolves to, from `ENGINE project`;
2. the name the user says this project is called — from `.ai-coach/project.md` if it exists, or
   from the answer to step 3's question.

A third key in that list belongs to some other project. It is not a candidate, it is not a
mismatch, and it must never be named in a `rekey`.

**Validate both before either reaches a shell.** A key can come from a git remote, and a remote is
attacker-controllable text. Use a key only if it matches `^[A-Za-z0-9._@:/-]+$`; anything else —
`$(`, a backtick, a quote, a space, a newline — is reported and stops this check rather than being
interpolated into a command.

Then, for a candidate key, get its row count. `AICOACH_PROJECT` overrides resolution:

```bash
AICOACH_PROJECT="<candidate-key>" node "$HOME/.ai-coach/bin/engine.js" stats
```
```powershell
$env:AICOACH_PROJECT="<candidate-key>"
node "$env:USERPROFILE\.ai-coach\bin\engine.js" stats
$env:AICOACH_PROJECT=""
```

Then:

- **Only the resolving key holds rows** — nothing to do, and declaring that same name later is free.
- **Only the other candidate holds rows** — this is the real mismatch. Say both keys and their row
  counts, and stop before declaring anything: writing `.ai-coach/project.md` now would point every
  future write at an empty tenant and strand every memory, session, debrief and correction already
  recorded under the other one. The repair is `ENGINE rekey <old-key> <new-key>` — it moves the rows
  and **deletes the source**, and it is not undoable. Do not run it. Print it, name both keys and
  both row counts, say plainly what will be deleted, and let the user run it themselves. Resolve
  the name question (step 3) first when the target name is not already known, or you cannot fill in
  `<new-key>` honestly.
- **Both candidates hold rows** — two tenants have been accumulating in parallel. `rekey` merges by
  moving and deleting, so this is not a decision to take on someone's behalf: report both counts,
  say that merging them is lossy in one direction, and let the user choose. Continue the wrap under
  whichever key they name, or stop if they want to sort it out first.
- **No rows anywhere yet** — a fresh project. Declaring is free; ask for the name with everything
  else.

Never declare a project name that contradicts where the data lives just because the user typed it.

## 3. Ask once, for everything missing

One `AskUserQuestion` call covering every gap found, never one question per gap — the handoff skill
already states this rule and it is the reason this command exists. Include:

- **role**, when missing — the options are the roles already in `.ai-coach/team.md`, plus whatever
  the repo suggests. Single words only: the roster parses `role:\s*([\w-]+)`, so `tech-lead` works
  and `tech lead` silently truncates to `tech`.
- **project name**, when missing or when step 2 found a conflict — offer the inferred key and any
  key that already holds data, and say which is which. This is the question that decides where a
  team's memory lives; it is worth its own option list rather than a default.
- **email and username**, when missing — these come from git, so ask for the values and run
  `git config user.email "<email>"` and `git config user.name "<name>"` yourself.

Nothing here is invented. A name, a role and an identity are answers with an owner, and the owner
is in the chair — this command asks them rather than making them up, which is the whole difference
between collecting an answer and deciding one.

## 4. Write identity, in this order

Order is load-bearing: `.ai-coach/project.md` must exist **before** anything publishes, or the
debrief lands in the inferred tenant and step 2's repair is the only way back.

1. `git config user.email` / `git config user.name` for those two.
2. `memory-coach:roster register <role>` — it owns `.ai-coach/team.md` and appends one line.
   Pass the role you just collected so it does not ask again.
3. `memory-coach:roster declare <name>` — it owns `.ai-coach/project.md`.

Then re-run `ENGINE whoami` and confirm `missing` is empty. This is not ceremony: `handoff` runs
the same check and stops to ask if anything is still absent, so an empty `missing` here is what
keeps the user from being asked a second time for what they already answered. If it is not empty,
stop and say which item did not take — publishing into a half-set identity is how a seed ends up
unattributable.

## 5. Publish and export

Invoke `memory-coach:debrief` through the Skill tool, forwarding `--name <label>` when given. **Its
approval gate is the point of this whole command and stays exactly where it is** — it drafts
business, technical, evidence and unknowns, shows them, and waits. Nothing is published until the
user says yes, and a "no" ends the run here rather than exporting a draft nobody accepted.

Then `memory-coach:handoff`, forwarding `--encrypt` when given. It has a gate of its own — it says
what will travel and waits — and that one is not yours to satisfy on the user's behalf either. Two
confirmations in one run is the correct number: one approves a conclusion being published, the other
approves a file other people will read.

## 6. Say what comes after

The one step this command deliberately does not take:

```bash
git add .ai-coach/team-seed.jsonl && git commit
```

Nothing leaves this machine until that commit is pushed — knowledge travels by git, reviewable in
a pull request, never by sync. Committing is the user's, because a commit in someone's history is
theirs to author.

## Rules

- Never re-implement what debrief and handoff do. Invoking them is now allowed; reproducing their
  steps inline is not, and it would skip the approval gate that makes them trustworthy.
- Never invent an identity, a project name, or a branch convention. Every one is a question with an
  owner. Ask, then write what you were told.
- Never declare a project name before the tenant check clears. Stranding a team's memory is silent,
  and the user finds out weeks later when a search comes back empty.
- If the session plainly contains two unrelated pieces of work, say so — a conclusion that covers
  everything concludes nothing — and offer to wrap them as two debriefs.
- A step whose plugin is not installed is reported as skipped by name, never as a failure.
