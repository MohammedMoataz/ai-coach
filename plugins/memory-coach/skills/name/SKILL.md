---
description: Label this session so the people reading the history later can tell what it was. Use for "/name", "rename this session".
argument-hint: <label>
disable-model-invocation: true
---

# /name — label this session

Every session is recorded with a name, an author and a branch, because an unnamed session is
invisible in a team's history. The default is `<branch>-<username>`, which is accurate and
forgettable. A real label is what makes the history readable a month from now.

## Steps

1. `node "$HOME/.ai-coach/bin/engine.js" name "<label>"` — PowerShell:
   `node "$env:USERPROFILE\.ai-coach\bin\engine.js" name "<label>"`.
2. Report the label as stored. Claude Code's own session list adopts the same name, so the two
   histories agree.

## Rules

- Two teammates may use the same label. It is disambiguated on display as `label@username` rather
  than refused — a naming collision is not an error worth interrupting anyone for.
- Name the *work*, not the day: "orders CSV export" beats "tuesday".
