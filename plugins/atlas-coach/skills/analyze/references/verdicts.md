# Verdicts, tiers, and translate discipline

Load when a verdict is questioned or a translate stub needs its rules restated.

## The three verdicts

- **CONFIRMED** — independent evidence found: the test was run, the source read, the number
  reproduced. Never granted for consistency alone.
- **PLAUSIBLE** — consistent with what was found, but single-source or not independently
  checkable. This is the default under uncertainty; an unverifiable claim can never do better.
  In reports it carries `(unverified)` inline.
- **REFUTED** — contradicted by quotable evidence. In `/research`, refuted claims are dropped
  and the drop is reported; in `verify`, the contradiction is the answer.

A verdict cites command + output, file:line, or URL + quote — always. Vendor benchmarks and
self-reported numbers cap at PLAUSIBLE regardless of how official the page looks.

## Source credibility tiers (store-back confidence)

0.9 official docs / spec · 0.7 maintainer blog / conference talk · 0.5 forum / secondhand post.
Facts likely to change (prices, versions, dates) carry a date inside the memory text.

## Translate-mode discipline

- **Idiom source order**: `docs/onboarding/stack.md` conventions → `docs/onboarding/patterns/`
  skeletons → the code adjacent to where the stub will live. The documentation's own style
  never wins over the project's.
- **Citation in code**: every stub opens with `// Source: <doc> § <heading>` (comment syntax
  per language). A stub that can't name its section is a guess wearing code formatting.
- **The check travels with the stub**: an assert-based self-check or one minimal test in the
  project's test idiom — the smallest thing that fails if the stub is wrong. State plainly
  whether it was run; quote output when it was.
- **Ported test cases** keep a mapping comment per case (`upstream: <repo>/<file> — <case>`),
  so a future failure can be compared against the origin.
- **Scope**: translate emits a starting point, not a feature. It never silently expands into
  wiring the stub through the codebase — that's a coding task the user drives.
