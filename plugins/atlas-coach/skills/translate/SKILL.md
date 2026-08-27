---
description: Turns documentation, a spec or an upstream example into a code stub in this project's idiom, with the runnable check that proves it. Use for "/translate", "turn these docs into code", "port this example into our codebase". Not for checking whether a claim is true (see research).
argument-hint: "<doc|url|section> [--for <area/feature>]"
disable-model-invocation: true
---

# /translate — documentation into code that belongs here

Documentation is written in the vendor's idiom: their naming, their error handling, their module
system, their example app. Pasting it in works and then reads as foreign code forever. This skill
does the translation that reading skips — the same behaviour, expressed the way this project
already expresses things — and it ships the check that proves the stub does what the document says.

It costs real tokens: reading the source, then reading enough of this codebase to know its idiom.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.
`INGEST` means `node "${CLAUDE_PLUGIN_ROOT}/tools/ingest.js"` — the path arrives pre-resolved;
same command in PowerShell.

## Steps

1. **Get the source.** Already in `./docs` → `INGEST search` finds the section; a file → ingest it
   first with `/atlas-coach:ingest`; a URL → fetch it (spotlight scans it automatically).
2. **Learn the idiom.** `docs/onboarding/stack.md` and `docs/onboarding/patterns/` when
   `/investigation-coach:onboard` has run; otherwise read the neighbouring code the stub will live
   beside. Never the documentation's idiom — that is the whole job.
3. **Emit the stub**, with two hard rules:
   - It cites the section it derives from (`Source: <doc> § <heading>`). No citation, no claim —
     in code too.
   - It ships with its runnable check: the smallest thing that fails if the stub is wrong. Run it
     and quote the output. Say "stub + check, not yet run" only when running it is genuinely
     impossible here — a missing service, credentials, hardware — and name which.
4. **Upstream examples and tests** ("bring the GitHub test cases in") are the same mode: source is
   the upstream repo, output is those cases re-expressed in this project's test idiom, each citing
   the upstream file it came from.

## Rules

- **A stub, not a feature.** This writes the piece the document describes and stops. It never
  silently expands into wiring that piece through the codebase, refactoring its neighbours, or
  building the three things the document mentions in passing. If the work wants that, say so and
  let the user ask.
- **A stub never pretends to be tested.** Quote the check's real output, or name the reason it
  could not run. Never both silent.
- Downloaded files go through `/security-coach:scan` before this touches them.
- The project's conventions win over the document's on every disagreement, including naming that
  looks wrong to the document's author.

## Related

`/atlas-coach:ingest` puts the source in the corpus first, and `INGEST stats` says what that corpus
covers. `/atlas-coach:research` is the skill that decides whether a source is *true*; this one
assumes you already decided and want it in the codebase.
