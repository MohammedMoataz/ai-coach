---
description: Show or declare which product this repository belongs to, so sibling repos share one memory. Use for "/project", "group these repos", "which project is this".
argument-hint: "[declare <name> | register [<repo>] | list]"
disable-model-invocation: true
model: haiku
effort: low
---

# /project — one product, however many repositories

A **project** is the product. A **repo** is one repository inside it. Memory is stored per project,
so a backend and a frontend that belong together share what they learn — while every memory still
records which repo it came from, and your own repo always ranks first.

A repo that declares nothing is its own project, which is why single-repo work needs no setup.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Modes

**No argument** — `ENGINE project`. Report the resolved project, this repo, whether the project is
declared or implicit, its declared and registered repos, and where the database file lives. If it is
implicit, mention that `declare` groups repos together.

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

**`register [<repo>]`** — `ENGINE project register [<repo>]`, for a member not yet listed.

**`list`** — `ENGINE projects` shows every project and its database; `ENGINE repos` shows this
project's members.

## Rules

- Renaming a project starts a new, empty one. `ENGINE rekey <old> <new>` carries the rows over —
  say plainly that it moves data and is not undoable.
- `.ai-coach/project.md` is committed: the grouping is a fact about the product, identical for
  everyone.
- Working in a repo the declaration does not list is fine. It gets recorded and mentioned once,
  never treated as an error.
