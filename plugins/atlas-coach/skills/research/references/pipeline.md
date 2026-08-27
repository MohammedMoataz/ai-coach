# The research pipeline, structurally

Load only for a comprehensive run (the user explicitly asked for a workflow / "be thorough")
or when explaining the mechanism.

## Why a claim gate

A survey of open-source research agents found one shared gap: none adversarially verify their own
findings before reporting them. Plausible-but-wrong survives every pipeline that only gathers.
The gate is the product; the fan-out is just speed.

## The shape, whichever way it runs

Some harnesses expose a workflow/orchestration tool that runs this as one script; most do not, and
**the sequential path is the pipeline** — spawn the researchers, collect, gate, synthesize. Check
what your harness actually offers rather than assuming either. The structure below is the same
either way; only the scheduling differs:

- **Schemas** force structure at the tool-call layer:
  - findings: `{ findings: [{ claim, source, quote }] }` — a claim without a quote from its
    source doesn't parse, so it can't exist.
  - verdicts: `{ verdict: "CONFIRMED"|"PLAUSIBLE"|"REFUTED", reason }`.
- **Phases**: Gather (one researcher per sub-question, parallel) → Verify (one verifier per
  claim batch, parallel — this is a real barrier: verification needs the full claim set for
  dedup) → Synthesize (single agent, receives only surviving claims).
- **The filter is mechanical**: `judged.filter(c => c.verdict !== 'REFUTED')` — no judgment
  call, no mercy. The synthesis prompt receives PLAUSIBLE claims pre-marked `(unverified)`.
- Drops are counted and the count goes into the report — "3 claims dropped as refuted" is a
  finding about the source landscape.

## Tiering guide

| Tier | Shape of question | Example |
|---|---|---|
| 3 | one thing, verified | "what's the current state of X" |
| 5 | comparison / decision | "X vs Y for our case" |
| 7 | landscape / survey | "what exists for Z, what's credible" |

Tier counts are sub-questions, not total agents; verification adds 1-2 more, so the widest run
(tier 7) spawns 9. **Ten agents total is the ceiling** — past that, coverage gains drown in
coordination noise (house finding). The skill used to say eight while this table described nine,
which is the sort of arithmetic nobody notices until a tier-7 run quietly drops a sub-question.

## Report anatomy (`./research/<slug>.md`)

```markdown
---
question: <verbatim>
date: YYYY-MM-DD
tier: N
sources: N
dropped_refuted: N
---
## Findings          <- verdict-annotated, source per claim
## Contradictions    <- both sides, named sources
## Dropped           <- what was refuted, by what evidence
## Not determined    <- the honest gaps
```
