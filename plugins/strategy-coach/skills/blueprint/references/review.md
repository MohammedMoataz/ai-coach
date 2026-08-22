# The self-check

Load at step 8, before showing the notes to anyone. Score the draft, revise once, stop.

This exists because of a measured result rather than a preference. The multi-agent pipeline this
skill borrows from (arXiv 2505.23695) reports two separate findings, and conflating them is easy:

- Naming the domain before analysing improved coverage, structure and business relevance —
  reported **qualitatively**, with no figure attached.
- The **measured** lift (G-Eval depth +31%, novelty +28%, insightfulness +12% over prompt-only
  GPT-4o) belongs to the **full pipeline** — profile, detect domain, extract concepts, analyse
  through three lenses, score, reflect, revise.

So domain detection alone is not the finding. The scoring-and-revision loop is the part that was
actually measured, which is why it is a step in this skill and not a suggestion at the bottom.

## The five dimensions

Score each 1–4 with a one-line justification. A score with no justification is not a score.

| # | Dimension | 4 looks like | 1 looks like |
|---|---|---|---|
| 1 | **Domain fit** | the domain sentence is specific enough that a competitor's docs could not reuse it | a generic industry label |
| 2 | **Concept coverage** | the glossary holds the words the team actually says, each mapped to code | terms invented by the reader of the code |
| 3 | **Evidence** | every technical row is `file:line`, `INFERRED` or `NOT IN CODE`, none blank | rows asserting behaviour with nothing behind them |
| 4 | **Depth** | at least one non-obvious relationship a first read would miss | a restatement of the function names |
| 5 | **Negative space** | the open questions are specific and name who can answer | "further investigation needed" |

## The revision pass

Any dimension below **3** gets one targeted pass. Not a rewrite — a pass aimed at that dimension:

- **Domain fit low** → re-ask the user. Do not re-guess; a wrong domain poisons everything else.
- **Concept coverage low** → extract the terms from the code and the user's own phrasing, then map
  them. Missing vocabulary is what makes an agent guess later.
- **Evidence low** → go read the files. A blank cell is not fixed by writing `INFERRED` over it;
  `INFERRED` means you looked and could not prove it.
- **Depth low** → look for the thing that is true across two processes and stated in neither.
- **Negative space low** → name the person who could answer each question.

**One pass, then stop.** The source paper set its bar at 4-of-4 and iterated until it hit it; that
is a research budget, not a session budget. One targeted pass captures most of the gain; a loop
that keeps grading itself will happily spend your afternoon agreeing with itself.

## Report the scores

Put them in the report, not in the notes — they describe this run, not the business:

```
Self-check: domain 4 · concepts 3 · evidence 4 · depth 2 → 3 · negative space 4
Revision pass: depth. Added the shared-reservation link between checkout and fulfilment.
```

A score that never moves across runs means the check is decorative. Say the number even when it
is unflattering, especially then — an unflattering score is the only kind that changes anything.
