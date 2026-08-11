---
description: Which of your prompt habits actually correlate with sessions going wrong. Use for "/prompt-stats", "how are my prompts".
argument-hint: "[days] [--team]"
disable-model-invocation: true
---

# /prompt-stats — your habits, against your outcomes

Most prompt advice is etiquette: someone's taste, asserted. This report is the other thing — it
counts which signals fired on your prompts, then joins them to what those sessions actually cost in
corrections and failed tool calls.

**No prompt text is stored anywhere.** Only length, which signals fired, and whether a hint was
shown. There is no column to read your prompts out of, by design.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Steps

1. `ENGINE prompt-stats [days]` — defaults to 30.
2. Read the table. Columns: **fired** (how often the signal appeared), **rate** (corrections plus
   failed tool calls per session that had it), **lift** (that rate against your prompts which fired
   no signal at all).
3. Report the **one** signal worth acting on: highest lift with at least five occurrences. One
   habit at a time; a list of nine things to fix is a list nobody acts on.
4. Name the rule behind it from `/prompt-coach:prompt rules`, and show what the fix looks like on a
   prompt they actually plausibly write.
5. If nothing clears the bar, say so in one line and stop. "Nothing worth changing" is a real
   result and the most likely one for a careful person.

## Reading it honestly

- **Lift is correlation across your own sessions, not causation.** A hard task produces both weak
  prompts and messy sessions. Say this out loud when you report — a number presented as proof is
  worse than no number.
- **A blank lift means there is no baseline yet** — none of your clean prompts have had a bad
  session, so there is nothing to compare against. Not a good score; no score.
- **Low volume is not evidence.** Under five occurrences, report the count and nothing else.
- `exempt` in the flags column means an exploratory question, which is never coached and is not a
  fault.

## `--team`

Aggregates across everyone who has handed off memory into this project: signal, total occurrences,
pooled lift. **Never per-person.** The point is finding which habit the team should discuss, not
who to point at, and a report that ranks colleagues will simply get the plugin uninstalled.

## Rules

- Never present lift as proof. Correlation, stated as correlation.
- Never rank people, and never break `--team` down by author, even if asked — offer the pooled view
  and explain the choice.
- If the numbers are thin, say they are thin. Padding a report to look useful is how a measurement
  tool loses the right to be believed.
