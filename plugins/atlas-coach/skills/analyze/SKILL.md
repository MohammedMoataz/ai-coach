---
description: Three things to do with an external source - attack a claim adversarially for a CONFIRMED/PLAUSIBLE/REFUTED verdict, translate documentation into project-idiom code stubs, or report what the ingested corpus covers. Use for "/analyze", "verify this claim", "is this true", "turn these docs into code", "what do our docs cover".
argument-hint: "verify <claim|url|file> | translate <doc|url> [--for <area>] | stats"
disable-model-invocation: true
---

# /analyze — what a source is worth, and what to do with it

Reading a source is not analyzing it. This skill does the three things reading skips: attack a
claim before trusting it, turn documentation into code that matches this project, and say what
the corpus actually covers. verify and translate cost real tokens (agents, code reading) and
say so.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.
`INGEST` means `node "${CLAUDE_PLUGIN_ROOT}/tools/ingest.js"` — the path arrives pre-resolved;
same command in PowerShell.

## Modes

**`verify <claim | url | file>`** — one `verifier` agent run. A bare claim gets attacked
directly; a URL or file gets its central claims extracted first, then attacked. Output: one
verdict per claim — CONFIRMED / PLAUSIBLE / REFUTED — each with its evidence (command + output,
file:line, or URL + quote). Uncertain defaults to PLAUSIBLE, never CONFIRMED. Definitions in
`references/verdicts.md` (load only if the user questions a verdict).

**`translate <doc | url | section> [--for <area/feature>]`** — doc-to-code. Steps:
1. Get the source: already in `./docs` → `INGEST search` finds the section; a file → ingest it
   first; a URL → fetch (spotlight scans it automatically).
2. Learn the idiom: `docs/onboarding/stack.md` + `docs/onboarding/patterns/` when
   investigation-coach ran; otherwise read the neighboring code the stub will live beside.
3. Emit the stub in the project's idiom — its naming, error handling, module system — not the
   documentation's. Two hard rules:
   - The stub cites the doc section it derives from (`Source: <doc> § <heading>`) — no
     citation, no claim, in code too.
   - The stub ships with its runnable check — the smallest thing that fails if the stub is
     wrong. Lazy code without its check is unfinished. Run it, and quote the output; only say
     "stub + check, not yet run" when running it is genuinely impossible here (missing service,
     credentials, hardware) and say which.
4. Upstream examples/tests ("bring the GitHub test cases into the project") are the same mode:
   source = the upstream repo, output = the cases re-expressed in this project's test idiom,
   each citing the upstream file it came from.

**`stats`** — `INGEST stats`, rendered readable: docs and paragraphs indexed, tags, date range,
what has gone stale (>90 days). One closing line on gaps only if the numbers show one ("12 docs,
none newer than March") — never invented.

## Rules

- A verdict without evidence is not a verdict.
- A translate stub never pretends to be tested: quote the check's real output, or name the reason
  it could not run. Never both silent.
- Downloaded files go through `/security-coach:scan` before verify or translate touches them.
- stats reports numbers, not opinions about them.

## Related

`/atlas-coach:research` is verify at question scale. `/atlas-coach:ingest` feeds the corpus
stats reads.
