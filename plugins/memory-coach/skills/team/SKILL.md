---
description: The project's team directory, and your private trust settings. Use for "/team", "add me to the team", "trust this teammate".
argument-hint: "[register | trust <email> <full|workspace> [note] | sync]"
disable-model-invocation: true
model: haiku
effort: low
---

# /team — who is here, and whom you trust

Two separate things, deliberately.

**`.ai-coach/team.md` is a shared directory** — name, email, role — committed to the repo. It
carries no judgments about anyone.

**Trust is private.** It lives only in your own database on this machine, never in the shared file
and never in a seed. Nobody should have to commit "I do not trust this teammate yet" to a
repository, and nobody has to.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Modes

**No argument** — show the picture: `ENGINE team-list` (the roster joined with your local trust),
then `ENGINE whoami` if the user is not listed, and offer to register them.

**`register`** — append the user to `.ai-coach/team.md`, creating the file if absent. Take name and
email from `whoami`; ask for the role. One member per line:

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

## Rules

- Never write a `trust:` field into `.ai-coach/team.md`. Trust is not a fact about the team.
- Roles are free text, and this file is the **only** place they live — a memory records the
  author's email and joins for the rest. So `/memory-coach:recall --role qa` means "written by
  people who are QA now", and editing a line here re-labels everything that person ever wrote.
  That is the trade: one editable truth, no role history.
- Registering is per person. Never add a teammate on their behalf.
