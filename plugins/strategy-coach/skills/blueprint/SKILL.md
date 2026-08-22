---
description: Document what the business is — actors, processes, rules, glossary — mapped to the code that implements it, as Obsidian notes plus diagrams. Use for "/blueprint", "document the business", "map the processes", "what does this system actually do".
argument-hint: "[--full | --feature <name>] [--visual mermaid|drawio|miro|none]"
disable-model-invocation: true
---

# /blueprint — the business, in two voices

A codebase says how. It rarely says who, or why, or what happens when a refund is partial. That
knowledge lives in people's heads and leaves with them, and no amount of reading `src/` recovers
it — which is why this skill asks you as much as it reads the repo.

Two audiences, one set of notes. A **person** needs the flow: who starts it, what decides, where
it can fail — so every process note carries a diagram. An **agent** needs the mapping: which
function is that step, at which line — so every process note carries a table with `file:line`.
Same file, both readable; splitting them guarantees one goes stale.

Why files rather than a conversation: the documented failure of LLM analytics work is that nothing
accumulates — each new person reloads the context, rephrases the questions, and retraces the same
steps, because the previous session's understanding was never written anywhere durable. A committed
markdown note survives the session, diffs in a pull request, and is readable by the next agent
without being re-derived. That is the whole reason this skill writes files instead of answering.

It also does not re-derive the architecture. If `/investigation-coach:map` has run, its output is
the input here.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Steps

1. **Name the domain, before anything else.** One sentence: what business this system is in, and
   the sub-area it covers ("B2B wholesale ordering, specifically supplier price agreements"). Write
   it into `docs/business/overview.md` first. This is not ceremony — naming the domain up front
   measurably changes what the rest of the analysis notices, because it loads the vocabulary and
   the metrics that domain actually tracks. Get it wrong and everything downstream is wrong, so
   show it to the user and let them correct it before you continue.
2. **Read what already exists; do not re-derive it.** `docs/onboarding/stack.md`,
   `architecture.md`, `patterns/`, `docs/00-index.md`, `docs/study/`. Say in one line what you
   found and what is missing. If there is no onboarding output at all, say so and recommend
   `/investigation-coach:map` first — this skill will still run, but its technical mapping will be
   thinner and slower for having to trace the code itself.
3. **Scope, and say what it costs.** Default: actors, glossary, and the three processes that carry
   the most business weight. `--feature <name>`: one process only. `--full`: every process found —
   state that this is the expensive one before starting it. Never run more than 8 subagents
   concurrently.
4. **Ask what the code cannot tell you.** Actors and their goals, the rules with no enforcement in
   code (an approval someone does in email), what happens on the unhappy path, and which of these
   processes actually matters. Prefer a few sharp questions to a survey: what has been tried and
   rejected, and what is deliberately manual, are the two answers worth the most.
5. **Map each process to code.** One row per step: the entry point as `file:line`, or the word
   `INFERRED` when you are reading intent rather than proof. Never blank. A step that exists in the
   business and nowhere in the code is a finding, not an omission — record it as `NOT IN CODE`.
   Each `NOT IN CODE` row is a candidate for `/strategy-coach:market --gap "<it>"`, which searches
   how this industry already solved it — name that option in the report rather than speculating
   here.
6. **Draw it.** A Mermaid flowchart inside each process note — the note is the source of truth,
   always, whatever else you render. Then one Artifact page aggregating the diagrams for people who
   will not open Obsidian. `--visual none` skips both.
7. **Render anywhere else only if asked.** `--visual drawio` writes an editable `.drawio` beside
   the notes, for a picture someone who does not edit code will maintain. `--visual miro` puts it on
   a board, but only if Miro is already connected — check **passively**, never call an authenticate
   tool, and a missing Miro is one line in the report rather than a failed run. Load
   `references/visual.md` before either.
8. **Score your own draft, then revise once.** Before showing anything, grade the notes against the
   five dimensions in `references/review.md` — 1 to 4, each with a one-line justification. Any
   dimension below 3 gets one revision pass targeted at that dimension, then you stop. This is the
   step that separates "the model wrote some notes" from the measured version of this workflow, and
   the reason it is a numbered step rather than advice is that a self-check nobody scored is a
   self-check that always passes.
9. **Report, including the holes.** What was written, the scores and what the revision pass
   changed, what the user still needs to answer, and what you could not determine. Then
   `ENGINE add reference "business blueprint at docs/business/ — domain: <domain>, processes: <list>" 0.75`

## Rules

- **The domain is named before the analysis, never after.** If you cannot name it, you are not
  ready to write notes — ask.
- **No citation, no claim.** Every technical row is `file:line`, `INFERRED`, or `NOT IN CODE`.
- **What the user told you is evidence too** — attribute it (`per <who>, <date>`). It is often the
  only source for a rule, and unattributed it reads as if the code proves it.
- **Never overwrite a note without a `> Generated by /strategy-coach:blueprint` marker.**
- **A missing Miro, a failed Artifact publish, or an absent onboarding doc degrades the run — it
  never fails it.** The notes are the deliverable; everything else is a rendering of them.
- **Re-running amends.** Keep hand-added sections, update what you generated, and never silently
  drop a process that was documented before.

## Related

`/strategy-coach:vault` creates the folders this writes into — run it first.
`/strategy-coach:feature` turns this understanding into a specified feature.
`/investigation-coach:map` answers *what the code is*; this answers *what the business is*. The
test: "how does X work here" → investigate; "what should we build and why" → strategize.
`/atlas-coach:research` brings in outside sources when a domain question outruns the repo.
