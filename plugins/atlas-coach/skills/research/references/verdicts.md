# Verdicts and source tiers

Load when a verdict is questioned, or when the claim gate has to justify one.

## The three verdicts

- **CONFIRMED** — independent evidence found: the test was run, the source read, the number
  reproduced. Never granted for consistency alone.
- **PLAUSIBLE** — consistent with what was found, but single-source or not independently
  checkable. This is the default under uncertainty; an unverifiable claim can never do better.
  In reports it carries `(unverified)` inline.
- **REFUTED** — contradicted by quotable evidence. Refuted claims are dropped from the report and
  the drop is counted in `dropped_refuted`, because a claim that silently vanishes teaches nobody.

A verdict cites command + output, file:line, or URL + quote — always. Vendor benchmarks and
self-reported numbers cap at PLAUSIBLE regardless of how official the page looks.

## Source credibility tiers (store-back confidence)

0.9 official docs / spec · 0.7 maintainer blog / conference talk · 0.5 forum / secondhand post.
Facts likely to change (prices, versions, dates) carry a date inside the memory text.

## Verifying one claim on its own

There is no separate skill for this any more. A single claim is a one-question research run: hand
it to the `verifier` agent with the same instruction the gate uses — try to refute this, demand
evidence, default to PLAUSIBLE under uncertainty — and report the verdict with what it cites. The
gate and the one-off were the same mechanism described twice, and the copy that lived in a
different skill was the one that drifted.
