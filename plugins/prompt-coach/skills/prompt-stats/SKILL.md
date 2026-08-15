---
description: Which of your prompt habits actually correlate with sessions going wrong. Use for "/prompt-stats", "how are my prompts".
argument-hint: "[days] [--team]"
disable-model-invocation: true
model: haiku
effort: low
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

`ENGINE prompt-stats [days] --team` pools everyone whose sessions have reached this project through
a handoff: signal, total occurrences, pooled lift, and the number of people in the pool.

**Never per-person, and there is no flag that makes it per-person.** The engine returns a pool size
and nothing else identifying; the breakdown does not exist to be printed. The point is finding the
habit worth discussing at a standup, not who to point at — and a report that ranks colleagues gets
the plugin uninstalled, which helps nobody.

If asked to break it down by person, say plainly that it deliberately cannot, and offer the pooled
view instead.

**Where the data comes from:** signals travel inside `.ai-coach/team-seed.jsonl` alongside the
sessions they belong to — flags and a length, never a word anyone typed, which is exactly why they
are safe to put in a file that lives in git. Empty team view usually means nobody has run
`/memory-coach:handoff` yet, not that the team writes perfect prompts.

## Rules

- Never present lift as proof. Correlation, stated as correlation.
- Never rank people, and never break `--team` down by author, even if asked — offer the pooled view
  and explain the choice.
- If the numbers are thin, say they are thin. Padding a report to look useful is how a measurement
  tool loses the right to be believed.
