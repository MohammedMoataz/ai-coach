# The question set

Load when scoping. Four questions per competitor by default, two more under `--deep`. One
researcher per competitor-question pair, capped at 4 per competitor and 8 concurrent.

Each researcher prompt must be self-contained — the agent cannot ask you a follow-up. Name the
competitor, the date, the source types to prefer, and the return contract.

## Source hierarchy — state it in every prompt

| Weight | Source | Why |
|---|---|---|
| Strongest | issue trackers, changelogs, postmortems, court/regulatory filings | costly to fake, dated |
| Strong | independent reviews, forum threads, conference talks by users | the complaint is the evidence |
| Weak | analyst reports, comparison blogs | often unmeasured or sponsored |
| Claim only | the vendor's own site, pricing page, docs | label it as a claim in the output |

The default assumption inverts the usual one: **a vendor's absence of a feature is better evidenced
by a user asking for it than by the vendor not listing it.**

## The four default questions

1. **What do they actually ship, and what do users say is missing?**
   Not the feature list — the delta between the feature list and the complaints. Ask for the three
   most-repeated complaints with links and dates.

2. **Who is it for, and who is it visibly not for?**
   Buyer, company size, the segment they have publicly declined to serve (pricing floors, "not for
   teams under N", enterprise-only gating). The declined segment is often the whole opportunity.

3. **What is the positioning claim, in their words?**
   The one sentence they lead with. Then: is it defensible, or is it a category everyone claims?
   Four vendors all claiming "AI-powered automation" is a finding about the category, not about
   any of them.

4. **What changed in the last six months?**
   Launches, pivots, funding, layoffs, a deprecation. Direction beats position: a product being
   actively rebuilt and one being quietly maintained look identical in a feature matrix.

## `--deep` adds two

5. **Pricing, and what it reveals.**
   Tiers, what gates the upgrade, and the floor. Pricing is the most honest document a company
   publishes — it names who they want. Report the model, not just the numbers; and if pricing is
   "contact us", that is itself the finding.

6. **Content and search position.**
   What topics they dominate and what they never write about. The gap in their content is often the
   gap in their product, and it is the cheapest gap to test.

## Deriving the gap

The gap is not "a feature nobody has". It is the intersection of three things, and all three are
required:

- **Demonstrated demand** — users asking, in public, with dates.
- **Consistent absence** — no competitor in the set serves it, and ideally one tried and retreated.
- **Our plausibility** — a reason *we* could serve it that is not simply "we would like to".

Missing the third turns the output into a wish. Missing the first turns it into a guess. Write the
three lines explicitly; if any is blank, the honest report is "no defensible gap in this pass".

## What not to do

- Do not run 6 questions × 5 competitors because the flags allow it. Three competitors answered
  well beats ten summarized.
- Do not summarize a competitor's marketing back as analysis. If a section could have been written
  from their homepage alone, cut it.
- Do not rank competitors on a score you invented. A weighted total hides which column decided it.
