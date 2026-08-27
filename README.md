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
| **memory-coach** | Skills only: `recall` (search, and `--health`), `debrief`, `handoff`, `roster`. |
| **prompt-coach** | Skills only: `prompt`, `prompt-stats`, `dispatch`. |
| **security-coach** | Skills only: `scan`, `audit`, `triage`. |
| **harness-coach** | Skills only: `partners` — the tools worth having next to the coach. |
| **investigation-coach** | Skills only: `onboard` (`--tour` runs all three), `map`, `study` — onboard anyone onto the project; diagrams as Mermaid, Obsidian canvas, or editable draw.io. |
| **atlas-coach** | Everything outside the repo: `research`, `ingest`, `market`, `translate` — plus the marketplace's first two agents, `researcher` and `verifier`, reusable from any session. |
| **strategy-coach** | Skills only: `blueprint` (which scaffolds the vault), `feature` — document the business, then specify what comes next. |
| **ai-coach** | The bundle. Install this one. |

Skills are invoked namespaced — `/memory-coach:recall`, not `/recall`. The full list is under
[What you drive](#what-you-drive).

**~1,770 always-on tokens** for the whole product as of v1.6.0 — core and the bundle are 0,
atlas-coach ~510 (four skills plus two agents), memory-coach ~320, investigation-coach ~260,
prompt-coach ~200, security-coach ~200, strategy-coach ~210, harness-coach ~70. What is always on
is the descriptions, and nothing else: every skill body, every reference file and every agent
prompt is paid only when it runs.

That number is counted from the descriptions themselves, calibrated against what
`claude plugin details` reported for the shipped v1.5.0 — this repo is the source, and the
marketplace's published copy is what the CLI can measure. Run `claude plugin details <plugin>`
after a release for the authoritative figure. v1.6.0 went from 23 skills to 20 and from ~1,880
tokens to ~1,770, while adding routing exclusions ("not for X — see Y") to the descriptions most
likely to be confused for each other.

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

`/memory-coach:recall` · `/memory-coach:debrief` · `/memory-coach:handoff` ·
`/memory-coach:roster` · `/prompt-coach:prompt` · `/prompt-coach:prompt-stats` ·
`/prompt-coach:dispatch` · `/security-coach:scan` · `/security-coach:audit` ·
`/security-coach:triage` · `/harness-coach:partners` · `/investigation-coach:onboard` ·
`/investigation-coach:map` · `/investigation-coach:study` · `/atlas-coach:research` ·
`/atlas-coach:ingest` · `/atlas-coach:market` · `/atlas-coach:translate` ·
`/strategy-coach:blueprint` · `/strategy-coach:feature`

Two fire on their own. `recall`, so Claude reaches for memory unprompted when a question matches
prior work. And `dispatch`, the rules for a prompt whose reader cannot ask a follow-up — advice that
has to be remembered before it applies is advice that never applies. Everything else waits for you:
a skill with side effects should run when you say so, and neither of these has any.

Every CLI-and-format skill is pinned to Haiku at low effort — that work should never bill at
frontier rates (`ingest` joins that tier: routing and refinement are mechanical). The rest stay on
the session model, deliberately: `recall` and `dispatch` run inside a real answer, never as a report
of their own; investigation-coach's three, atlas-coach's `research`, `market` and `translate`, and
strategy-coach's `blueprint` and `feature` are real analysis — pinned down, the output reads like a
file listing. `recall --health` is on the session model for the same reason: deciding that two
memories cannot both be true is judgement, and it used to run on the cheap tier. Each of those says
up front that it costs real tokens and takes a scoping flag to bound the spend. The hooks' own LLM
calls (plan-mode review, session-end distillation) are hardcoded to Haiku too.

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

**A person is stated once.** A memory, a session and a debrief record an email; the name and the
role are a join away, in one `authors` row per person. The consequence is deliberate: `--role qa`
means "written by people who are QA now", so correcting a line in `team.md` corrects every row that
person ever wrote. There is no role history, and that is the trade for having one editable truth.

**Whether you hold a teammate's memory back is not a property of the memory.** It is your current
trust in its author, so it is worked out as the row is read. Raise someone's trust and everything of
theirs you already have moves up — no re-import, which was the step everybody forgot.

**One name per session.** Claude Code already names every session and shows it in the status line;
AI Coach adopts that name at session start and checks again at session end, so a rename in between
is caught. A name someone typed is never overwritten by a derived one.

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

**See everything, including what it was originally:**

```bash
node "$HOME/.ai-coach/bin/engine.js" config          # table: now, default, and who set it
node "$HOME/.ai-coach/bin/engine.js" config --json   # the same, with descriptions
```

```
setting        now    default  set by
-------------  -----  -------  ------
brief_chars    1500   4000     env (AICOACH_BRIEF_CHARS)   <- changed
coach          off    on       plugin (CLAUDE_PLUGIN_OPTION_coach)   <- changed
corrections    on     on       default
...
2 of 10 differ from the default: brief_chars, coach
```

The `set by` column is the useful part: putting a setting back is a different action depending on
which of the three sources decided it.

**To change one** — `/plugin` → `ai-coach-core` → the setting. That persists.
**To override for one shell** — `AICOACH_<KEY>=<value>`, which wins over the plugin setting.
**To reset one** — clear it in `/plugin`, or unset the env var. There is no "reset all": the
defaults are what you get when nothing is set anywhere, and `config` shows you exactly what is.

Claude Code hands plugin settings to hook processes and to nothing else, so the engine a skill
shells out to could not see them: `default_trust` shaped your session brief and then did nothing in
`/memory-coach:recall`. The session-start hook now records what it was passed in
`~/.ai-coach/settings.json`, and every other process reads that — one setting, one answer,
everywhere. `config` marks those rows `settings.json`, and clearing a setting in `/plugin` clears
the record on the next session start.

| Setting | Default | What it governs |
|---|---|---|
| `brief_chars` | `4000` | Ceiling on the memory injected at session start. Ranking happens before the cap, so raising it surfaces more — it does not change what wins. Clamped to 500–16000. |
| `coach` | `on` | The coach line, and hints on vague prompts. **Display only** — and now actually so: prompt signals are recorded before this switch is read, because silencing a line must not empty the evidence that line is measured against. |
| `corrections` | `on` | Whether failures are recorded at all. |
| `learn` | `on` | One Haiku call at session end distils a summary and up to 3 learnings. |
| `plan_review` | `on` | In plan mode only: one Haiku call scores the prompt. |
| `guard` | `on` | Blocks tool calls carrying real credentials. The one hook allowed to stop a call. |
| `spotlight` | `on` | Injection-marker scan on fetched content. Warn-only, no model call. |
| `partners` | `on` | The one-time `/harness-coach:partners` note. |
| `seed_auto` | `on` | Whether `auto-seed` may refresh an existing seed in place. |
| `default_trust` | `full` | Trust for a teammate you have not rated: `full` or `workspace`. |

`coach` controls the coach *line*; `corrections` controls whether failures are recorded at all.
They are separate on purpose — silencing a display line should not quietly empty the evidence
`/prompt-coach:prompt-stats` measures against.

### Environment variables that are not settings

These have no plugin equivalent. Most exist for tests and scripts; the last three are the ones a
person might reach for.

| Variable | Effect |
|---|---|
| `AICOACH_DB` | Path to the user-scope database. Tenants, the bin copy, the settings record and the log all live beside it, so pointing this at a temp file really does give you a whole isolated tree. |
| `AICOACH_LOG` | Where failures append. Defaults to `log.jsonl` beside the database — `~/.ai-coach/log.jsonl` unless `AICOACH_DB` moved it. |
| `AICOACH_INNER` | Set to `1` inside spawned `claude -p` children so hooks do not recurse. |
| `AICOACH_CLAUDE_BIN` | The `claude` binary to shell out to for the two Haiku calls. |
| `AICOACH_SEED_KEY` | Passphrase for an encrypted seed, instead of `.ai-coach/seed.key`. |
| `AICOACH_OFF` | Silences the "your Node is too old" message on stderr. It does not disable anything else. |
| `AICOACH_AUTHOR` / `AICOACH_USERNAME` / `AICOACH_ROLE` | Override the identity read from git and the roster. |
| `AICOACH_PROJECT` / `AICOACH_TASK` | Override the resolved project key and the branch a memory files under. |

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
