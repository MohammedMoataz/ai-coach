---
description: Give this coding session a human-readable name, so the session history stays readable a month later. Use for "/name", "name this session", "rename this session".
argument-hint: "<label>"
disable-model-invocation: true
model: haiku
effort: low
---

# /name — label this session

Every session is recorded with a name, an author and a branch, because an unnamed session is
invisible in a team's history. The default is `<branch>-<username>`, which is accurate and
forgettable. A real label is what makes the history readable a month from now.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Steps

1. `ENGINE name "<label>"`.
2. Report the label as stored. Claude Code's own session list adopts the same name, so the two
   histories agree.

## Rules

- Two teammates may use the same label. It is disambiguated on display as `label@username` rather
  than refused — a naming collision is not an error worth interrupting anyone for.
- Name the *work*, not the day: "orders CSV export" beats "tuesday".
