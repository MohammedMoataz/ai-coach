---
description: Turn a feature request into a spec, a definition of done whose every line is checkable, and an execution plan a cheap model can run in a fresh session. Use for "/feature", "spec this feature", "plan feature X", "write the requirements".
argument-hint: "<slug or description> [--prior-art] [--amend]"
disable-model-invocation: true
---

# /feature — clarify, then specify, then dispatch

Most feature work fails at the start, quietly: the request was ambiguous, everyone filled the gap
differently, and the disagreement surfaces in review. So this skill spends its first effort on
questions, not documents.

Two artifacts, two readers. `spec.md` is for **people** — what we are building, for whom, and how
we will know it is done. `plan.md` is for **an agent in a fresh session on a cheap model** that
cannot ask you anything, so it must be self-contained. They are written in that order, and the
plan is not written until you have signed off on the spec. That gate is the whole point: an
AI-drafted spec that nobody read is how a wrong feature gets built fast.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

## Steps

1. **Slug, and refuse to clobber.** Derive a kebab-case slug. If `docs/features/<slug>/` exists,
   stop and say so — re-running needs `--amend`, which is a different flow (see Rules).
2. **Read the context you already have.** `docs/business/` for the processes and glossary this
   touches, `docs/onboarding/features/<name>.md` if the code side is already documented. Link
   both; never restate them. Missing business notes are worth one line: `/strategy-coach:blueprint`
   makes the spec sharper, but this skill runs without it.
   **If `docs/business/industry.md` exists, check this feature against it.** An industry
   requirement or convention that touches what we are building and is absent from the DoD is a
   finding — add the row, or record in Unknowns why it does not apply. Regulatory rows stay marked
   `⚠ verify`: cite them, never restate them as settled, and never claim the feature complies.
3. **Clarify, with real questions.** Use AskUserQuestion. The four that earn their place:
   - *What outcome changes for whom?* — the goal, in the user's words, not a feature name.
   - *How will we know it worked?* — push until the answer is observable. "Faster" is not.
   - *What is deliberately out of scope?* — the most valuable line in the document.
   - *What has already been tried or rejected here, and why?* — this is the answer that stops the
     plan from re-proposing a dead end, and nothing in the repo records it.
   Do not proceed on an assumption you could have asked about. There is nobody to ask later.
4. **Prior art, when asked** (`--prior-art`). How other projects solved this, and whether
   something existing already covers it — useful to a developer looking for a reference
   implementation and to a tester looking for the edge cases everyone hits. Load
   `references/prior-art.md`. Bounded: at most 4 researchers.
5. **Write `spec.md`.** Load `references/formats.md` once, here — it carries the shape of both
   documents this skill writes, so step 7 needs no second read. The definition of done is a table where
   every row names a command or an observable behaviour. Any row you cannot make checkable goes to
   Unknowns instead — an uncheckable criterion is a disagreement scheduled for later. The cost and
   benefit line is required: a specification nobody could decline is not a decision document.
6. **Gate: get sign-off.** Show the goal, the scope boundary, the cost-and-benefit line, and the
   whole DoD table. Ask plainly whether it is right, and make declining an explicit option — a
   gate that only accepts is not a gate. **Do not write `plan.md` until the user answers.** If they
   change something, update `spec.md` and ask again.
7. **Write `plan.md` for a reader who cannot ask**, to the skeleton already loaded at step 5. It restates the
   DoD as its success criteria, names files with `@path` and an exemplar to imitate, and says what
   comes back. Then check it: `ENGINE prompt-check "<the plan's task statement>"` — flags mean
   ambiguity a fresh session will hit. `/prompt-coach:dispatch` is the full contract.
8. **Report and remember.** The two paths, the DoD row count, the open unknowns, and how to
   execute it (a fresh session, cheap model, pointed at `plan.md`). Then
   `ENGINE add reference "feature spec at docs/features/<slug>/ — <one line on the goal>" 0.75`

## Rules

- **No sign-off, no plan.** The gate at step 6 is not advisory. A plan written before the spec was
  read is a plan for whatever the model guessed.
- **Every DoD row carries its check** — a command, a test name, or `observable:` plus where to see
  it. No adjectives: "fast", "clean" and "robust" are not criteria.
- **Cost, benefit, and who judged it worthwhile are required fields.** "Unknown until we spike" is
  a legitimate cost; omitting the question is not.
- **`## Unknowns` is required in both files, and "none" is not an answer.** Something is always
  unresolved; the honest list is what stops a confident wrong build.
- **`plan.md` assumes nothing.** No "as we discussed", no "the file we looked at". Its reader is a
  fresh session that has never seen this conversation.
- **Prior-art claims are sourced or marked `UNVERIFIED`.** A borrowed approach presented as proven
  is worse than no research.
- **`--amend` regenerates both files together**, appending a `## Changelog` line, and re-runs the
  sign-off gate. Never amend one and leave the other — a plan verifying last week's DoD is the
  worst failure this skill has. A file whose marker line was deleted is hand-owned: treat it as
  read-only input and regenerate only the other.
- **Never write under `docs/onboarding/`** — that belongs to investigation-coach. This skill owns
  `docs/features/<slug>/` only.

## Related

`/strategy-coach:blueprint` supplies the business context that makes a spec specific.
`/atlas-coach:market --gap "<the gap>"` answers "how has this already been solved" before you
specify a solution to it — reach for that first when the feature is filling a gap rather than
adding a capability, and `--industry` for the rules this feature has to live inside.
`/prompt-coach:dispatch` is the contract `plan.md` is written to — read it if the plan needs to be
defended. `/memory-coach:debrief` is the other end: what was actually concluded once the work is
done. `/harness-coach:partners` lists spec-kit, which also does spec-driven development — reach
for it when you want a standalone spec workflow; use this when you want the spec grounded in this
project's own business vault and a plan a cheap model can execute unattended.
