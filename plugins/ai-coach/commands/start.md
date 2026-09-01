---
description: Day one on a project - detect what is already set up, then either hand over the exact invocations for what is not, or run them with --run. A tailored checklist, and now a way to act on it.
argument-hint: "[--run] [--feature <name>] [--with-blueprint] [--diagrams drawio]"
disable-model-invocation: true
---

# /start — four names nobody should need on day one

Setting up a project properly is a handful of invocations across three plugins, in a documented
order — and the person who needs the sequence most is the one who has not yet learned any of the
names. Two kinds of step live in that list and they are not the same kind of thing. The **roster**
steps write who you are and what project this is; they stay lines you type, because nobody
registers you or declares your project on your behalf. The four **documentation** skills only read
code and write notes, so as of v1.14.0 this command can run them: `--run` does, and without it you
get the same tailored checklist as a single line to paste.

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
   whether their skills appear in your context.** A step whose plugin is missing appears on the
   checklist as "skipped — <plugin> not installed", never as a failure.
4. **Work out the shape of the project**, because `--project` is the flag nobody knows to pass and
   the one a microservices repo always needs. Forward it when any of these holds, and say in the
   report which one fired:
   - `.ai-coach/project.md` declares more than one repo.
   - More than one service manifest sits below the root — `package.json`, `pom.xml`, `go.mod`,
     `pyproject.toml`, `Cargo.toml` or a `.csproj`, ignoring `node_modules` and vendor trees.
   - A `docker-compose*.yml` defines more than one service.

   One manifest at the root and nothing else is a single repo: say so rather than passing a flag
   that doubles the reading for nothing.

## The checklist — tailored, in order, and one line to paste

Only the steps the detection says are needed, each with one sentence on what it will do and what
it will ask:

1. `/memory-coach:roster register` — when the user is not in the roster. It asks for the role;
   registering is per person and never done on someone's behalf.
2. `/memory-coach:roster declare <name>` — when they work across sibling repos that should share
   one memory (ask this — one question). Single-repo work skips this line, and the report says
   "implicit project, nothing to declare".
3. Then the documentation, as **one line to paste** rather than three to remember — Claude Code
   chains skills the user names together, the same way `/ai-coach:wrap` hands over its two:

   ```
   /investigation-coach:onboard --tour [--project] [--feature <name>] [--diagrams drawio]
   ```

   Append ` /strategy-coach:blueprint` when `--with-blueprint` was given — with `--visual drawio`
   if `--diagrams drawio` was, and `--feature <name>` if that was, so the pasted line and `--run`
   produce the same thing. Otherwise one line saying it exists and why it goes last (it reads what
   the tour wrote instead of re-deriving it) — defaulting into it would double the bill uninvited.
   Fill the flags in from the detection: a printed line with a placeholder still in it is a line
   nobody can paste.

   Warn honestly about the cost: the tour is three code-reading skills back to back, the most
   expensive thing in the marketplace, and it re-states the cost with real numbers before it runs.

## `--run` — the same list, performed

The roster steps are still printed, never run. Then:

1. **Say what it costs, once, and ask.** Three code-reading skills back to back, four with
   `--with-blueprint`. One confirmation covers the whole run; stop immediately whenever the user
   says stop, and report what had already been written.
2. **Invoke `investigation-coach:onboard --tour`** through the Skill tool, forwarding `--project`
   as detected plus any `--feature <name>` and `--diagrams drawio` you were given. The tour owns
   the order — onboard, then map, then study — and owns the skipping: a step whose output already
   exists and is current is skipped by name. Do not call the three skills separately; two callers
   sequencing the same three skills is how the order drifts.
3. **Then `strategy-coach:blueprint`, only with `--with-blueprint`** — with `--visual drawio` when
   `--diagrams drawio` was given and `--feature <name>` when that was, so the whole run stays one
   scope and one rendering. It takes no `--project`; it reads what the tour wrote, which is why it
   goes last.
4. **Close with what landed**: the files each step wrote, anything it skipped and why, and the one
   instruction that makes the result usable — open `docs/` in Obsidian, not the repo root. That
   folder is the vault; its graph view is the architecture.

A skill whose plugin `claude plugin list` did not show is not invoked: report it as
"skipped — <plugin> not installed" and carry on with the rest.

## Rules

- Never run the roster steps and never re-implement any skill on this list. What this command adds
  is the *tailored* sequence — what this repo still needs, in the right order, with the flags
  already worked out.
- Never invent an identity, a project name, or a branch convention. Every one is a question with
  an owner, and the owner is in the chair.
- Close with the two names worth keeping after day one: `/memory-coach:recall` when a question
  matches prior work, and `/ai-coach:wrap` when a piece of work finishes.
