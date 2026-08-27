---
description: Turns a dataset or query result into an analysis that survives argument: the domain named first, several readings generated, then critiqued in writing before you see it. Use for "/insight", "analyse this data", "what does this data say", "what should we chart". Not for market research (see atlas-coach:market).
argument-hint: "<file or table> [--question \"<the decision this informs>\"] [--charts]"
disable-model-invocation: true
---

# /insight — an analysis that has already been argued with

Point a model at a spreadsheet and it will describe it: means, counts, an observation about the
largest category. All true, none of it a finding, because nothing decided what mattered before the
description started.

Two things fix that, and this skill is built out of both. First, **name the domain before
analysing** — the vocabulary and the metrics a domain actually tracks change what an analyst
notices, so it is step one and never an afterthought. Second, **generate more than one reading,
then attack them** before any of it reaches the user.

The pipeline follows *Data-to-Dashboard: Multi-Agent LLM Framework for Insightful Visualization in
Enterprise Analytics* (Zhang & Elhamod, arXiv:2505.23695, May 2025), whose agents do "domain
detection, concept extraction, multi-perspective analysis generation, and iterative
self-reflection". The self-critique step below is that last stage made explicit, in the shape
Reflexion uses (Shinn et al., arXiv:2303.11366, NeurIPS 2023): write the criticism down, then redo
the work conditioned on it, rather than re-reading and hoping.

This costs real tokens — several passes over the data plus a critique round. A one-number question
does not need it.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

## Steps

1. **Name the domain and the decision.** One sentence each: what business this data is from, and
   what someone will do differently depending on the answer. `--question` supplies the second. If
   no decision depends on it, say so and offer to describe the data instead — that is a legitimate
   request, and it is not this skill.
2. **Read the shape before the values.** Columns, types, row count, date range, and what is
   *missing* — nulls, gaps in the series, a category that stops appearing in March. Report this
   before any finding. Most wrong analyses are wrong here, and quietly.
3. **Extract the concepts.** Which columns are measures, which are dimensions, which are identity,
   and which pairs could plausibly be related. Name the grain in one line ("one row per shipment,
   not per order") — getting the grain wrong is what produces a confident number that is double
   the truth.
4. **Generate several readings, deliberately different.** At least three, each stated as a claim
   with the numbers that support it: the obvious one, one from a different dimension (time,
   segment, cohort), and one that would be bad news if true. Do not pick a favourite yet.
5. **Attack your own readings, in writing.** For each: what else would produce this pattern? Is the
   denominator right? Is it a composition change rather than a real move? Is the window long enough
   to distinguish it from noise? Does a subgroup drive all of it? Write the critique down as its
   own section, then **revise the readings against it** — a self-check nobody wrote down is a
   self-check that always passes.
6. **Keep what survived, and say what did not.** The dropped readings appear in the document with
   the reason they were dropped. A vanished hypothesis teaches nobody, and it is the part that
   stops the same wrong reading being rediscovered next quarter.
7. **Chart only what carries a finding** (`--charts`). One chart per surviving claim, each with
   the claim as its title — a chart whose caption is "orders by month" is decoration. Specify
   them: chart type, axes, the exact filter, and the source column for each series. Load
   `references/analysis.md` for the document format and the chart spec shape.
8. **Write it, then remember it.** `docs/analysis/<slug>.md`, then
   `ENGINE add reference "analysis of <source> at docs/analysis/<slug>.md — <the surviving finding>" 0.7`

## Rules

- **Every number carries its basis.** "38%" is rhetoric; "38% (81 of 212 orders sampled in March)"
  is a finding. No denominator, no percentage.
- **Correlation is written as correlation.** Say what would have to be true for it to be causal,
  and whether the data can tell. This is the sentence that gets removed in summaries, which is
  exactly why it goes in the source document in strong form.
- **Never fill a gap by assuming.** A missing month is a fact about the data and often the most
  important one. Interpolating it silently is fabrication with an average on top.
- **The critique section is not optional and is never empty.** If nothing survives it, that is the
  result: "no reading survived scrutiny; here is what the data cannot answer" is a real, useful
  answer and beats a confident wrong one.
- Data with personal information stays where it is: analyse it, never quote a row, and never write
  an identifier into a document that lands in git.

## Related

`/analysis-coach:story` turns this into the version an executive reads — it will not add findings,
so anything that must survive the summary has to be in this document first.
`/atlas-coach:market` looks outward at competitors and the industry; this looks at your own data.
`/strategy-coach:blueprint` says what the business does; this says what it is doing.
