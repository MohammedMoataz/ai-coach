---
description: Search this project's memory for what was already learned. Use for "did we hit this before", "what do we know about X", "/recall".
argument-hint: <query> [--full] [--corrections] [--task <t>] [--author <email>] [--role <r>] [--repo <r>] [--all]
---

# /recall — ask what is already known

Memory is keyword-searched, not semantic: it matches the words that were written down, so a miss
usually means a different word, not an absent fact. Start narrow and cheap, widen only when the
first answer is thin.

`ENGINE` below means `node "$HOME/.ai-coach/bin/engine.js"` on macOS/Linux, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Steps

1. `ENGINE search "<terms>"` — short lines, `#id [type] first-100-chars (conf)`, about ten tokens
   each. Searches this project (all of its repositories) plus your global knowledge.
2. Expand only a hit that looks relevant but truncated: add `--full`, which also returns *every*
   match instead of the short preview. Never open with `--full`.
3. Scope when the question is scoped: `--task <branch>`, `--author <email>`, `--role qa`,
   `--repo <repo>` for one service, `--all` to fan across every project you have worked in.
4. Nothing? Retry once with synonyms or word stems before concluding it was never recorded.
5. Answer from the hits and cite the ids you used. If a memory contradicts what the code now says,
   fix it rather than working around it: `ENGINE forget <id>`, then add the correction.

## Reading a result honestly

- `distilled` — a model compressed this out of a session transcript. Nobody confirmed it. Treat it
  as a lead, not a fact, and verify before acting on it.
- `imported` — it came from a teammate's handoff.
- `[workspace]` — from someone whose trust you set to `workspace`. Never auto-injected; weigh it
  accordingly.
- No label means a person wrote it deliberately.

## Corrections

`ENGINE corrections --open` lists failures this project hit that nobody wrote a memory about. That
list is what the coach line in your session brief is counting. Closing one is two commands: add the
memory, then `ENGINE correction-done <id>`.

## Related

- Add knowledge: `ENGINE add <learning|note|reference|pattern> "<text>" [confidence]`.
- Work already done on your current branch is in the session brief — no need to recall it.
- `/memory-coach:handoff` to pass memory on, `/memory-coach:team` for who is here and whom you trust.
