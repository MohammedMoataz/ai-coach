---
description: Who is on this project and whom you trust, and which repositories belong to one product. Use when the user explicitly asks ("/roster", "add me to the team", "trust this teammate", "group these repos", "declare the project"), or when /ai-coach:wrap chains it to close an identity gap; never proactively. Not for searching memory (see recall).
argument-hint: "[register [<role>] | trust <email> <full|workspace> [note] | sync | project | declare <name> | repos]"
model: haiku
effort: low
---

# /roster — who we are, and what this project is

Two files, both committed, both declaring something no engine can work out on its own: who the
people are, and which repositories are the same product. Everything memory does with identity —
`--role qa`, a teammate's name beside their memory, one database shared by a backend and a frontend
— joins back to these two files.

One private thing lives alongside them and never travels: **whom you trust**. It is in your own
database on this machine, never in the shared file and never in a seed. Nobody should have to
commit "I do not trust this teammate yet" to a repository, and nobody has to.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

## People — `.ai-coach/team.md`

**No argument** — show the picture: `ENGINE team-list` (the roster joined with your local trust),
then `ENGINE whoami` if the user is not listed, and offer to register them. Follow with the
project line from `ENGINE project`, so one call answers both halves of "where am I and who is
here".

**`register [<role>]`** — append the user to `.ai-coach/team.md`, creating the file if absent. Take
name and email from `whoami`. Ask for the role, unless it was passed as an argument — a caller that
already asked (`/ai-coach:wrap` does, alongside everything else it found missing) has the answer,
and asking again for something the user just typed is the tax this whole flow exists to remove.
Roles are single words: the roster parser reads `role:\s*([\w-]+)`, so `tech-lead` survives and
`tech lead` silently truncates. One member per line:

```markdown
# Team

- Sara Malik <sara@example.com> — role: tech-lead
- Omar Nabil <omar@example.com> — role: backend
```

Append only — never rewrite anyone else's line. Then tell the user to commit it.

**`trust <email> <full|workspace> [note]`** — `ENGINE trust <email> <level> "<note>"`. Say plainly
that this stays on this machine. `full` means their memories rank in your brief like your own;
`workspace` means held privately with capped confidence, searchable but never auto-injected.
The change applies to memories of theirs you **already hold**, from the next read — there is
nothing to re-import.

**`sync`** — give every roster member without a trust row the configured default, leaving existing
choices untouched. Report what changed.

## The product — `.ai-coach/project.md`

A **project** is the product. A **repo** is one repository inside it. Memory is stored per project,
so a backend and a frontend that belong together share what they learn — while every memory still
records which repo it came from, and your own repo always ranks first. A repo that declares nothing
is its own project, which is why single-repo work needs no setup.

**`project`** — `ENGINE project`. Report the resolved project, this repo, whether the project is
declared or implicit, its declared and registered repos, and where the database file lives. If it
is implicit, mention that `declare` groups repos together.

**`declare <name>`** — write `.ai-coach/project.md`, then tell the user to commit it **and add the
same file to every sibling repository** — the grouping only holds when every member declares it.

```markdown
# Project
name: acme-shop

branches: feat/ fix/ chore/ docs/ refactor/

repos:
  - github.com/acme/shop-api
  - github.com/acme/shop-web
```

Take this repo's identity from `ENGINE project` and put it in the list. Add the siblings the user
names; the list is documentation and a consistency check, not a gate.

**`branches:`** is this project's branch convention — a space-separated list of accepted prefixes.
The branch is what a memory, a session and a debrief file themselves under, so prefixes are what
make them groupable a month later. Omit the line and the common defaults apply (`feat/ fix/ chore/
docs/ refactor/ test/ perf/ hotfix/ release/`). Either way it is a convention, never a gate: a
branch that does not match is mentioned once at session start and then recorded as it is.
`/investigation-coach:onboard` detects the convention a repo already follows and can write this line
for you.

**`repos`** — `ENGINE repos` shows this project's members; `ENGINE projects` shows every project
you have worked in and its database. `ENGINE project register [<repo>]` adds a member not yet
listed.

## Rules

- Never write a `trust:` field into `.ai-coach/team.md`. Trust is not a fact about the team.
- A role is one word — the parser reads `role:\s*([\w-]+)`, so `tech-lead` survives and `tech lead`
  becomes `tech` with no warning. Within that, the vocabulary is the team's own. `team.md` is the
  **only** place roles live — a memory records the author's email and joins for the rest. So `/memory-coach:recall --role qa` means "written by
  people who are QA now", and editing a line here re-labels everything that person ever wrote.
  That is the trade: one editable truth, no role history.
- Registering is per person. Never add a teammate on their behalf.
- Renaming a project starts a new, empty one. `ENGINE rekey <old> <new>` carries the rows over —
  say plainly that it moves data and is not undoable.
- `.ai-coach/project.md` is committed: the grouping is a fact about the product, identical for
  everyone. Working in a repo the declaration does not list is fine — recorded, mentioned once,
  never an error.

## Related

`/memory-coach:recall` searches what those people wrote. `/memory-coach:handoff` moves it between
them, and asks this skill's questions before it exports.
