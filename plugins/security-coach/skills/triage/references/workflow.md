# Security-report triage — the workflow and why each step exists

Verified 2026-08-15. Where sources disagree, that disagreement is stated rather than resolved by
picking a number.

## The canonical sequence

**validate → deduplicate → severity-normalize → assign owner → remediate → retest → close with
evidence.** Every step exists because skipping it has a named failure mode:

1. **Validate/reproduce** — pentest reports contain findings that don't reproduce, findings in
   third-party code, and chains listed as separate items. Recording unvalidated claims turns the
   tracker into noise, and noise is what gets a tracker abandoned.
2. **Deduplicate** — one root cause reported three ways is one finding with three symptoms.
3. **Severity-normalize** — the pentester scores in a vacuum, deliberately (technical severity,
   no business context). The org applies context: OWASP Risk Rating scores likelihood × impact
   with your environment in the factors. CVSS explicitly excludes compensating controls and
   exposure — which is why a vendor CVSS is an input, never the verdict.
4. **Assign an owner** — the most-cited reason findings rot is that nobody owned them.
5. **Remediate** — against the team's own SLA if one exists. Published SLA windows conflict
   (critical: 24–48h in some sources, 7 days in others, "immediately" in vendor readings of NIST) —
   there is no authoritative number, so this coach never supplies one.
6. **Retest** — the single most-cited discipline: a remediated finding is not confirmed fixed
   until someone re-ran the attack. "Nobody retests" is named in practitioner writing as the core
   accountability gap.
7. **Close with evidence** — the retest result, in the record, dated.

## Who signs off what

Risk acceptance is a business decision, not an engineering one. Enterprise policy standards put
sign-off with senior leadership — business-unit executive plus CISO for high-severity risk. A
developer (or an AI assistant) recording `accepted-risk` without a named accepter is the tracker
lying about governance that never happened.

## Anti-patterns, all documented in the field

- **Fixing the PoC, not the class** — the report shows one vulnerable endpoint; three siblings
  share the pattern. MITRE's guidance: fix at the CWE level, grep for the class before claiming
  done.
- **Silent closure without retest** — see step 6.
- **Undocumented severity downgrade** — negotiating a finding down is legitimate with a written
  rationale, an anti-pattern without one.
- **"Everything is critical"** — a priority scheme with one level is no scheme; it erodes until
  nothing is urgent.

## Mid-sprint interruption

No standards body publishes a stop-the-line threshold — this is genuinely the team's call. The
defensible heuristic from practitioner guidance: interrupt now only for findings that are both
severe and evidently exploitable (in CISA KEV, or trivially reachable from the internet);
batch the rest into the next sprint with owners already assigned. What kills teams is not the
choice of threshold but having none.

## Formats worth knowing

- **CWE** is the weakness taxonomy — bug-bounty platforms (HackerOne) adopted it outright; use it
  in the `cwe` column so findings can be grouped by class.
- **SARIF** (OASIS) is the interchange format for static-analysis results — scanners emit it, code
  hosts ingest it. The triage skill reads reports as text today; a SARIF parser earns its place
  when someone brings real SARIF.
- **OPTRS** (OWASP Penetration Test Reporting Standard) aims to standardize pentest findings as
  JSON but is still in community-feedback phase — watch it, don't build on it.
