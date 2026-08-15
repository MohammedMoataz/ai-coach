---
description: Turn a pentest or security report into tracked findings with owners and status, and produce the team report. Use for "/triage", "we got a pentest report", "security findings status".
argument-hint: "<ingest|status|update|report> [args]"
disable-model-invocation: true
model: haiku
effort: low
---

# /triage — a report is not done when it is read

A pentest report lands mid-sprint and the failure mode is always the same: everyone reads it,
two findings get fixed, the file rots in a channel. Triage is the discipline that prevents that:
every finding validated, owned, tracked to retested-closure — and severity treated as the
pentester's claim, verified by the team, not inherited as fact.

**Where findings live, stated up front:** the canonical records go in the local ai-coach database;
human-readable copies go in `.ai-coach/security/` which is **gitignored** — an unfixed
vulnerability written into a committed file is disclosure to everyone with repo access. Findings
**never** enter the team seed. Before writing any file here, check the repo's `.gitignore`
contains a `.ai-coach/security/` line and append it if missing.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Modes

**`ingest`** — a report was pasted or a file path given. For each finding in it:
1. Validate before recording: is it reproducible, is it in code this team owns, is it one finding
   or a chain the report double-counted? A finding that cannot be validated is recorded with that
   said in its detail, not silently dropped.
2. `ENGINE finding-add --source pentest --title "<one line>" --cwe CWE-nnn --severity <as reported> --detail "<evidence, location, repro>"`
   — the reported severity is recorded as the claim it is; `--assessed` comes later, after the
   team judges likelihood × impact in their own environment.
3. When all findings are in: regenerate `.ai-coach/security/findings.md` from
   `ENGINE findings --json` — a table of id, title, CWE, both severities, status, owner, age.

**`status`** — `ENGINE findings --open`, grouped by status then owner, oldest first. The oldest
open finding is the headline, not the newest.

**`update`** — `ENGINE finding-update <id> --status <s> [--owner o] [--assessed sev]`, then
regenerate `findings.md`. The status ladder is the discipline:
- `fixed` is not closed. Nothing closes without a retest — move to `retested` only when someone
  re-ran the original attack and it failed.
- Downgrading severity is legitimate **only** with the reason written into detail. An undocumented
  downgrade is the anti-pattern pentesters complain about by name.
- `accepted-risk` requires a named sign-off in detail from someone who can carry the risk — a
  CISO, a lead, an owner. A developer cannot accept risk on the org's behalf, including you.
- `false-positive` also carries evidence. "We don't think so" is not evidence.

**`report`** — write `.ai-coach/security/report-YYYY-MM-DD.md` for the dev team: summary counts by
status, the full table (both severity columns visible — the claim and the judgment), what changed
since the previous report file, and open findings by age. This file is the thing to share
out-of-band with the security team; it deliberately does not live in git.

Load `references/workflow.md` only when the user asks why a step exists or who should sign what.

## Rules

- Fix the class, not the PoC: a finding names one endpoint; the fix greps for every sibling of the
  same CWE before it claims done.
- Never invent SLA day-counts. Published windows contradict each other; if the team has SLAs,
  record them in the findings detail — if not, the age column speaks for itself.
- Findings never travel in a seed, never in `team.md`, never in a committed file. If asked to
  commit them, explain the disclosure problem and offer the report file instead.
- One finding, one owner. "The team" owns nothing.

## Related

`/security-coach:audit` produces candidate findings; `/memory-coach:recall` remembers what past
triage decided.
