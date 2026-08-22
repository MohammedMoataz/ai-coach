<p align="center">
  <img src="assets/cover.jpg" width="620" alt="AI Coach — harness your team">
</p>

<p align="center"><b>A coach for using Claude Code well.</b><br>
One focus per release. So far: memory, prompts, security, your toolbox, onboarding, then the
world outside the repo.</p>

---

## Why

Every session starts cold. You re-explain the same constraint, rediscover the same trap, and lose
whatever a teammate already worked out on the branch you just checked out. Worse, the moment things
went wrong — the one worth remembering — is the moment nothing records.

AI Coach keeps what a session learned, puts it in front of you next time, and notices when you hit
the same wall twice without writing it down. It also watches how you ask — and, unusually, checks
whether that actually cost you anything before offering an opinion about it.

## Install

Requires **Node ≥ 22.16, or ≥ 24**. Two things have to line up and CI checks both against real
Node builds: `node:sqlite` unflagged (22.13+) and FTS5 in its bundled SQLite, which every search
here depends on (22.16+ / 24.0+). **The 23.x line has the module without FTS5 and is not
supported.** On a Node that cannot run it, the engine says so on stderr rather than failing open
in silence. Session-end distillation additionally wants `claude` on PATH, and degrades quietly
without it.

```bash
claude plugin marketplace add MohammedMoataz/ai-coach
claude plugin install ai-coach@ai-coach
```

That one command installs the engine and every coach released so far. The bundle itself ships no
components, so it costs nothing at session start.

Want only part of it: `claude plugin install memory-coach@ai-coach` pulls `ai-coach-core` with it.

## What ships

| Plugin | What it is |
|---|---|
| **ai-coach-core** | The engine. Every hook, the memory database, the secrets guard, the session brief, the prompt detectors. Everything else depends on it. |
| **memory-coach** | Skills only: `recall`, `debrief`, `handoff`, `team`, `project`, `doctor`. |
| **prompt-coach** | Skills only: `prompt`, `prompt-stats`, `dispatch`. |
| **security-coach** | Skills only: `scan`, `audit`, `triage`. |
| **harness-coach** | Skills only: `partners` — the tools worth having next to the coach. |
| **investigation-coach** | Skills only: `onboard`, `map`, `study` — onboard anyone onto the project; diagrams as Mermaid, Obsidian canvas, or editable draw.io. |
| **atlas-coach** | `research`, `ingest`, `analyze` — plus the marketplace's first two agents: `researcher` and `verifier`, reusable from any session. |
| **strategy-coach** | Skills only: `vault`, `blueprint`, `feature`, `market` — document the business, specify what comes next, and look outward: competitors, industry rules, and how the industry already solved your gap. |
| **ai-coach** | The bundle. Install this one. |

Skills are invoked namespaced — `/memory-coach:recall`, not `/recall`. The full list is under
[What you drive](#what-you-drive).

Measured with `claude plugin details`, not estimated — **~1,317 always-on tokens** for the whole
product as of v0.6.0: core and the bundle are 0, memory-coach ~298, prompt-coach ~114,
security-coach ~201, harness-coach ~72, investigation-coach ~225, atlas-coach ~407 (three skills
plus two agents). It has drifted: descriptions were rewritten in v1.0.0, and skills were added
since — `debrief` in v1.1.0, `dispatch` in v1.2.0, and strategy-coach's four in v1.3.0 — so the
figure is stale and understated by roughly seven descriptions, and strategy-coach is missing from
the list entirely. The shape holds — what is always on is the descriptions, and nothing else.

## What happens on its own

- **A session brief**, capped and ranked, with the reason each line is there — `branch`, `global`,
  `from sara`, `distilled`. You learn the ranking model by reading your own brief.
- **A coach line**, when there is one true thing to say and not otherwise.
- **Corrections**: when a failure surfaces, that fact is recorded. It is the richest signal in a
  session and the one nothing else captures.
- **Observations**: every Edit, Write and Bash becomes a one-line record; failures marked `FAIL`.
  `<private>…</private>` is stripped at the boundary, before anything reaches disk.
- **Session-end distillation**: one Haiku call turns the session into a local summary and 0–3
  learnings. It stays on your machine — what teammates see is a debrief you published on purpose.
- **Prompt hints**: at most two, shown to you and never to the model. Nine deterministic detectors,
  no model call. **Exploratory questions are exempt** — "what would you improve in this file?" is a
  legitimate way to work, and a coach that nags at it deserves to be switched off.
- **A secrets guard**: real credentials are blocked outright; secret-*ish* payloads and
  credential-file reads ask first. Fails open, always logged.
- **An injection check on what comes back**: WebFetch/WebSearch results and file reads from
  outside the repo are scanned for prompt-injection markers — invisible Unicode, "ignore previous
  instructions" phrasing, forged tool syntax, hidden HTML. A hit warns you and reminds the model
  to treat the content as data. **Warn-only and honest about it**: deterministic scanning is a
  pre-filter attackers can evade, not a gate, and it never pretends to cover images. Zero LLM
  calls. In-repo reads are never scanned — a repo whose tests quote attack strings must not set
  off its own alarm.
- **Guarded reads of repo files**: everything the engine reads from `.ai-coach/` goes through a
  symlink-refusing, size-capped read — a planted link to `~/.ssh/id_rsa` cannot flow into context.
- **One partners note, once**: a single session-start line pointing at `/harness-coach:partners`,
  gone forever after the first run. Nothing ever installs without your pick.

## What you drive

`/memory-coach:recall` · `/memory-coach:debrief` · `/memory-coach:handoff` · `/memory-coach:team` ·
`/memory-coach:project` · `/memory-coach:doctor` · `/prompt-coach:prompt` ·
`/prompt-coach:prompt-stats` · `/prompt-coach:dispatch` · `/security-coach:scan` ·
`/security-coach:audit` · `/security-coach:triage` · `/harness-coach:partners` ·
`/investigation-coach:onboard` · `/investigation-coach:map` · `/investigation-coach:study` ·
`/atlas-coach:research` · `/atlas-coach:ingest` · `/atlas-coach:analyze` ·
`/strategy-coach:vault` · `/strategy-coach:blueprint` · `/strategy-coach:feature` ·
`/strategy-coach:market`

Two fire on their own. `recall`, so Claude reaches for memory unprompted when a question matches
prior work. And `dispatch`, the rules for a prompt whose reader cannot ask a follow-up — advice that
has to be remembered before it applies is advice that never applies. Everything else waits for you:
a skill with side effects should run when you say so, and neither of these has any.

Every CLI-and-format skill is pinned to Haiku at low effort — that work should never bill at
frontier rates (`ingest` and `vault` join that tier: routing, refinement and folder scaffolding are
mechanical). The rest stay on the session model, deliberately: `recall` and `dispatch` run inside a
real answer, never as a report of their own; investigation-coach's three, atlas-coach's
`research`/`analyze`, and strategy-coach's `blueprint`, `feature` and `market` are real analysis —
pinned down, the output reads like a file listing. Each of those says up front that it costs real
tokens and takes a scoping flag to bound the spend. The hooks' own LLM calls (plan-mode review,
session-end distillation) are hardcoded to Haiku too.

## What a teammate actually receives

A memory is one fact. A **debrief** is what you concluded when a piece of work was done, and it is
the thing worth handing over. It is published on purpose — no hook writes one — and it carries a
contract borrowed from this product's own research agents: every claim names a source or is written
`UNVERIFIED`, and *what you could not determine* is a required field rather than an omission.

```
$ engine debriefs
2026-08-20/sara@example.com/orders-csv-export  [imported]
    orders CSV export · Sara Malik · 2026-08-20 · feature/orders-csv
    Refunds settle the bank-transfer leg manually now; wallet and credit stay auto-approved.
```

Identity is `date/author/name` — readable, and stable across machines. A session's own id is a
local UUID that means nothing on your teammate's laptop and nothing to a person, so it never
travels. Publish twice under one name on one day and the second **replaces** the first, and says so.

```
$ engine debrief-show 2026-08-20/sara@example.com/orders-csv-export
```

Sessions still travel, as attribution only: who worked which branch, when, and how rough it was.
The one-line session summary stays on the machine that made it — every fallback it ever had was raw
prompt text, and this file lives in git.

## Coaching from evidence, not etiquette

Most prompt advice is somebody's taste, asserted. AI Coach records which detectors fired on each
prompt — **the signal names only, never the prompt text** — and joins that to what those sessions
actually cost in corrections and failed tool calls.

```
$ engine prompt-stats
41 prompts in 30 days · 22 clean (0.41 corrections+failures per clean session)
signal              fired  rate  lift
action-no-ref          11  1.27  3.1×
no-done-criteria        7  0.86  2.1×
hedged-opener           3  0.33     —
```

`--team` pools everyone whose sessions reached the project through a handoff — signals travel in the
seed, prompt text does not, and a teammate's outcome count travels as a number so the pooled view is
not quietly flattered by evidence that stayed on their machine. **Never per-person**: the engine
returns a pool size and nothing else identifying.

`/prompt-coach:prompt-stats` names the one habit worth changing, and says plainly that this is
correlation across your own sessions rather than proof. Under five occurrences it reports the count
and nothing else. When nothing clears the bar it says so in one line — "nothing worth changing" is
a real result, and the most likely one for a careful person.

## Design notes

**Nothing a model wrote can pass for something a person decided.** Every memory carries a
`provenance` — `human`, `distilled`, or `imported` — and there is deliberately no path that promotes
one to another. An agent is not an approval boundary.

**Identity is shared; trust is private.** `.ai-coach/team.md` is a committed directory of names,
emails and roles. Whom you trust lives only on your machine, never in the shared file and never in a
seed.

**Git is the transport.** `/handoff` writes `.ai-coach/team-seed.jsonl`; commit it and knowledge
moves with the branch, reviewable in a pull request before it touches anyone's database. Optionally
AES-256-GCM sealed.

**One product, however many repositories.** A backend and a frontend that belong together share one
memory; each line still records the repo it came from, and your own repo ranks first.

**The brief never truncates silently.** A capped brief that looks complete is the one failure mode a
memory tool cannot have, so the cap always leaves room to say what it dropped.

**The engine lives at `~/.ai-coach/`, not in a plugin directory.** A plugin directory is documented
as ephemeral and unreachable from a sibling plugin, so the engine installs a copy of itself beside
the databases at a path that never moves.

## Configuration

Plugin settings on `ai-coach-core`, or the matching `AICOACH_*` env var to override one
(`coach` → `AICOACH_COACH=off`):
`brief_chars` (4000) · `coach` (on) · `corrections` (on) · `learn` (on) · `plan_review` (on) ·
`guard` (on) · `spotlight` (on) · `partners` (on) · `seed_auto` (on) · `default_trust` (`full`).

`coach` controls the coach *line*; `corrections` controls whether failures are recorded at all.
They are separate on purpose — silencing a display line should not quietly empty the evidence
`/prompt-coach:prompt-stats` measures against.

## Uninstall

```bash
claude plugin uninstall ai-coach
```

Your data outlives the plugin by design: memories, sessions and trust live in `~/.ai-coach/`
(`%USERPROFILE%\.ai-coach` on Windows), so reinstalling picks up where you left off. Delete that
directory to remove it. Repo-side, `/handoff` and `/security-coach:triage` write inside
`.ai-coach/` in the project — the team seed is meant to be committed; `.ai-coach/security/` is
gitignored and never should be.

## Tests

```bash
node plugins/ai-coach-core/hooks/engine.test.js
node plugins/ai-coach-core/hooks/hooks.test.js
node plugins/atlas-coach/tools/ingest.test.js
```

No framework, throwaway databases, no network. CI runs all three on every push.

## License

MIT
