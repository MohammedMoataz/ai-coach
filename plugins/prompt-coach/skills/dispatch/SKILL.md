---
description: The four rules for a prompt whose reader cannot ask you anything — a subagent, a fresh session after a reset, a workflow stage, or a teammate. Use before dispatching an agent, writing a plan spec, splitting work across contexts, or handing a task to another context.
argument-hint: "[the draft you are about to send]"
---

# dispatch — a prompt nobody can ask you about

Chat is a conversation. A dispatch is not. A subagent, a fresh session after `/clear`, a workflow
stage, a teammate opening your debrief next week — none of them can ask a follow-up. Every fact left
out stays out, and the way you find out is by paying for the wrong answer twice: once in their
tokens, once in your context when the wrong thing comes back.

The nine detectors in `ai-coach-core` grade what the *user* types. They never see this one — a prompt
the model writes is not a `UserPromptSubmit`, so nothing warns you. That is the gap these four rules
cover, and the reason step 5 runs the detectors by hand.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## 1. Resolve the ambiguity now — there is nobody to ask

Receiving a vague prompt, the right move is to stop and ask. Sending one, that move does not exist:
the recipient will pick an interpretation silently and spend a whole context on it.

- If two readings survive, the dispatch is not ready. Pick one and **say which**, or ask the user
  before you send — not the agent, the user.
- Carry the facts the recipient cannot recover: the branch, the error text, the decision already
  made, the approach already tried and rejected. "Already tried and rejected" is the highest-value
  line in a dispatch and the one most often missing.
- Never write `this file`, `the bug`, `as we discussed`, `the approach above`. A dispatched context
  has no transcript, no cursor, and no open tab. This is detector `deictic-no-path`, and it is
  strictly worse here than in chat, where you are at least both looking at the same screen.

## 2. Success criteria, not steps

The point of a separate context is that it can loop without you. It can only loop against a check.

| Instead of | Send |
|---|---|
| "look into why the export is slow" | "find why `POST /export` exceeds 2s; end with the slowest span named, `file:line`" |
| "clean up the orders module" | "`npm test -- orders` passes before and after; no public signature changes" |
| "research state management" | "recommend one, with the three trade-offs that decided it; every claim sourced" |

Bound it, or it will not end: which directories, how deep, what would make it stop. An unbounded
"look into X" eats a whole context and returns a summary of the codebase.

Do **not** add the verification ritual on top — "make sure you double-check everything" now causes
over-verification rather than care. State the criterion once; skip the ceremony.

## 3. Name the artifact and the shape

`@path`, not a description of a path. Then point at something that already exists: "follow the shape
of `@src/orders/list.ts`" carries more than any adjective and pins the recipient to libraries the
project already has. Concrete beats adjectival — an exemplar file is the cheapest constraint
available, and the only one that survives being read out of context.

Say what is out of scope, in one line. Overeagerness is a live failure mode — scope creep,
defensive code, unrequested abstractions — and a boundary line prevents most of it. A dispatched
context is where it costs most, because you are not watching.

## 4. Say what comes back

This is the rule with no counterpart in chat, and the specific way delegation fails. A dispatch with
no return contract returns a file dump.

Name three things: **size**, **evidence**, **negative space**. This product's own agents are written
that way — atlas-coach's `researcher` agent caps at 600 words, requires every claim to name a source
or be marked `UNVERIFIED`, and makes *what could not be determined* a required closing line rather
than an omission. (It lives in a sibling plugin, so the shape is reproduced here rather than linked;
the contract below is the whole of it, and nothing needs atlas-coach installed to use it.) Copy that
shape; it is load-bearing, not decoration:

```
Return: <= 300 words. Findings first, method never.
Every claim carries file:line or a URL. No source -> mark UNVERIFIED.
End with what you could not determine, in one line.
```

Negative space is the field that makes a report safe to act on. Without it, silence reads as
coverage.

## 5. Check the draft — do not trust it

```
ENGINE prompt-check "<the draft you are about to send>"
```

Nine deterministic detectors, no model call, and **no write** — `prompt-check` is the one prompt verb
that records nothing, so self-checking a dispatch cannot pollute `/prompt-coach:prompt-stats` with
prompts the user never typed. Fix what it flags, then send.

Two results are not faults. `exempt` means it read as an exploratory question — legitimate, and
sometimes exactly what you want from a subagent. `clean` means the nine regexes found nothing, which
is not the same as ready: rule 4 has no detector at all.

## When not to do any of this

- **Delegating is not free.** A single grep in this context beats a subagent that has to be briefed.
  Delegate breadth, not lookups. If you can describe the whole job in one sentence and finish it in
  two tool calls, do it here.
- **Trivial dispatch, trivial brief.** A mechanical rename across four files does not need a return
  contract.
- The bias here is caution over speed, and it is worth it exactly when re-running the work is
  expensive — which is the normal case for a context you cannot interrupt.

## Sources, and their expiry

Rules 1–3 are the sendable half of `/prompt-coach:prompt rules`; the numbered sources and the date
each was verified live in `references/rules.md` — read it before defending a rule, not after. Rule 4
comes from this repository's own agent contracts rather than any vendor's guidance.

These are dated bets on current model behavior, not principles. Rule 2's warning about verification
ritual already reversed once. If a rule is marked stale for the model in use, say so instead of
enforcing it.

## Related

- Prompts *you* are about to send: `/prompt-coach:prompt`.
- Which of your own habits actually cost you: `/prompt-coach:prompt-stats`.
- Handing conclusions to a person rather than an agent: `/memory-coach:debrief`.
