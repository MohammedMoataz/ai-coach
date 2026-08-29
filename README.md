<p align="center">
  <img src="assets/cover.jpg" width="620" alt="AI Coach — harness your team">
</p>

<p align="center"><b>A coach for using Claude Code well.</b><br>
One focus per release: memory, prompts, security, your toolbox, onboarding, the world outside
the repo, the context bill, the analysis that decides what to build — then the agents that read
so your session doesn't pay for it, and the commands that tie the coaches together.</p>

---

## Why

Every session starts cold. You re-explain the same constraint, rediscover the same trap, and lose
whatever a teammate already worked out on the branch you just checked out. Worse, the moment things
went wrong — the one worth remembering — is the moment nothing records.

AI Coach keeps what a session learned, puts it in front of you next time, and notices when you hit
the same wall twice without writing it down. It also watches how you ask — and, unusually, checks
whether that actually cost you anything before offering an opinion about it.

The house rule, applied to the product itself as much as to its output: **no claim without the
evidence for it.** A memory says who wrote it and whether a person or a model did. A verdict
carries its command output. A performance number was measured, or it is not printed.

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

That one command installs the engine and every coach released so far, plus the three cross-plugin
commands. The bundle's own components are user-only, so it still adds nothing to the model's
context at session start.

Want only part of it: `claude plugin install memory-coach@ai-coach` pulls `ai-coach-core` with it.

## What ships

| Plugin | What it is |
|---|---|
| **ai-coach-core** | The engine. Every hook, the memory database, the secrets guard, the session brief, the prompt detectors, the compaction snapshot. Everything else depends on it. |
| **memory-coach** | Skills only: `recall` (search, and `--health`), `debrief`, `handoff`, `roster`. |
| **prompt-coach** | Skills only: `prompt`, `prompt-stats`, `dispatch`. |
| **security-coach** | `scan`, `audit` (`--triage` chains them), `triage` — plus the `examiner` agent: suspected injection content is read in a quarantined context with no shell and no network. |
| **harness-coach** | Skills only: `partners`, `context` — what is installed next to the coach, and what is filling this session. |
| **investigation-coach** | `onboard` (`--tour` runs all three), `map`, `study` — plus the `scout` agent, which does their repo sweeps in an isolated context, every claim `file:line`-cited. |
| **atlas-coach** | Everything outside the repo: `research`, `ingest`, `market`, `translate` — plus three agents: `researcher`, `verifier`, and `reader`, which keeps a 200-page PDF out of your context. |
| **strategy-coach** | Skills only: `blueprint` (which scaffolds the docs vault), `feature` — document the business, then specify what comes next. Inward by design; looking outward is atlas-coach. |
| **analysis-coach** | `elicit`, `insight`, `story` — the business-analyst half — plus the `critic` agent: fresh-context review that has not seen the reasoning it grades. |
| **ai-coach** | The bundle. Install this one. Also ships the three cross-plugin commands: `/ai-coach:start`, `/ai-coach:wrap`, `/ai-coach:sitrep`. |

Skills are invoked namespaced — `/memory-coach:recall`, not `/recall`. The full list is under
[What you drive](#what-you-drive).

### What it costs before you type

**~700 tokens actually enter the model's context every session** — and the reason the number is
this small is the reason it was mis-stated for five releases. What a session pays for is only what
the model can act on: the two skills that fire on their own (`recall` ~80, `dispatch` ~110) and
the six agents (~510 together). The other twenty-two skills and all three commands are marked
user-only, and a user-only description is **not loaded into the model's context at all** — it
exists in your `/` menu, and its cost is paid when you invoke it, like any skill body.

That was measured, not assumed: a live probe with positive controls saw exactly `recall` and
`dispatch` and none of the user-only items, commands included. It matters because
`claude plugin details` — this repo's own stated instrument — projects **every** description as
always-on regardless of `disable-model-invocation`, which put the earlier figure near four times
the real one. Use the CLI for per-component sizes; use a live session for what is actually loaded.
`/harness-coach:context` turns the same question on everything else you have installed.

## What happens on its own

- **A session brief**, capped and ranked, with the reason each line is there — `branch`, `global`,
  `from sara`, `distilled`. You learn the ranking model by reading your own brief.
- **A coach line**, when there is one true thing to say and not otherwise.
- **Corrections**: when a failure surfaces, that fact is recorded. It is the richest signal in a
  session and the one nothing else captures.
- **Observations**: every Edit, Write and Bash becomes a one-line record; failures marked `FAIL`.
  `<private>…</private>` is stripped at the boundary, before anything reaches disk. Observations
  expire after 30 days — they are session fuel, not knowledge.
- **Session-end distillation**: one Haiku call turns the session into a local summary and 0–3
  learnings, marked `distilled` forever. A distilled memory that nobody recalls within 90 days is
  pruned — a guess that outlived its session is not knowledge. Nothing a person wrote, and nothing
  a teammate handed over, is ever pruned by age.
- **A snapshot before compaction**: which files this session has been in, what broke last, what is
  still open. The post-compaction brief is memory — durable facts — and this is deliberately not
  that: it is where you *were*. Handed back once by the session start that follows, then deleted.
  No model call.
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

**What the guard and the spotlight do not cover, stated plainly.** Both are wired to named tools:
the guard to `Bash`, `WebFetch`, `Read`, `Write`, `Edit` and `NotebookEdit`; the spotlight to
`WebFetch`, `WebSearch` and `Read`. An MCP server's tools are neither. A credential handed to an
MCP tool is not checked, and a page fetched by one is not scanned — MCP tool names are
per-install, so a matcher here would be a list that is wrong on everyone else's machine. Two
things follow, and they are the honest version rather than a fix: prefer the built-in tools for
anything carrying a secret, and treat `/security-coach:scan` as the on-demand check for content
that arrived some other way.

## What you drive

`/memory-coach:recall` · `/memory-coach:debrief` · `/memory-coach:handoff` ·
`/memory-coach:roster` · `/prompt-coach:prompt` · `/prompt-coach:prompt-stats` ·
`/prompt-coach:dispatch` · `/security-coach:scan` · `/security-coach:audit` ·
`/security-coach:triage` · `/harness-coach:partners` · `/harness-coach:context` ·
`/investigation-coach:onboard` · `/investigation-coach:map` · `/investigation-coach:study` ·
`/atlas-coach:research` · `/atlas-coach:ingest` · `/atlas-coach:market` ·
`/atlas-coach:translate` · `/strategy-coach:blueprint` · `/strategy-coach:feature` ·
`/analysis-coach:elicit` · `/analysis-coach:insight` · `/analysis-coach:story`

Three commands ship in the bundle, because only the bundle knows all nine coaches exist:
`/ai-coach:start` (day one — reads the repo, works out which setup steps this project still
needs, and hands you each as a line to type), `/ai-coach:wrap` (checks the identity gate and the
session's substance, then hands you the one chained line —
`/memory-coach:debrief /memory-coach:handoff` — that publishes and exports, every gate intact),
and `/ai-coach:sitrep` (the morning read from the engine's own numbers — read-only end to end,
worst first, pointing at the two deep-dive skills when the numbers earn them). A deliberate
boundary sits under all three: Claude Code blocks a command from firing a user-only skill and
forbids re-implementing one, so side effects stay yours to fire — a command's product is the
tailored checklist and the checks around it, and a step whose plugin is not installed is skipped
by name, never a failure.

Two of the twenty-four skills fire on their own. `recall`, so Claude reaches for memory unprompted when a
question matches prior work. And `dispatch`, the rules for a prompt whose reader cannot ask a
follow-up — advice that has to be remembered before it applies is advice that never applies.
Everything else waits for you: a skill with side effects should run when you say so, and neither
of these has any.

Every CLI-and-format skill is pinned to Haiku at low effort — that work should never bill at
frontier rates (`ingest` joins that tier: routing and refinement are mechanical). The rest stay on
the session model, deliberately: `recall` and `dispatch` run inside a real answer, never as a
report of their own, and `recall --health` is judgement — deciding two memories cannot both be
true is analysis. investigation-coach's three, atlas-coach's `research`, `market` and `translate`,
strategy-coach's `blueprint` and `feature`, and analysis-coach's three are all real analysis —
pinned down, the output reads like a file listing. Each of those says up front that it costs real
tokens and takes a scoping flag to bound the spend. The hooks' own LLM calls (plan-mode review,
session-end distillation) are hardcoded to Haiku too.

### The six agents

Skills are what you drive; agents are the contexts they spawn, and each one exists for one of
three reasons. **Reading you should not pay for**: `scout` does onboard/map/study's repo sweeps
and `reader` does ingest's page-batched PDF reading, so neither enters your session — you get
evidence-cited conclusions and a receipt. **Judgement that must not be anchored**: `verifier`
attacks research's claims and `critic` grades insight's readings and blueprint's notes, both in
a fresh context that has never seen the reasoning it judges, both on the session model so the
judge is never weaker than the session trusting its verdicts. **Quarantine**: `examiner` reads
suspected injection content with Read and Grep only — no shell, no network, no writes — so the
content /scan judges never enters the session /scan protects. `researcher` and `scout` are
pinned to Sonnet as the fan-out cost multipliers; `reader` to Haiku because transcription is
mechanical; the judges float with your session. Every skill that names an agent also says what to
do without it — a missing sibling degrades a run, never fails it.

### Where the skills hand off to each other

The seams are stated, not implied. "How does X work here" → investigation-coach; "what should we
build and why" → strategy-coach. `/analysis-coach:elicit` gathers requirements while they are
still being argued about; `/strategy-coach:feature` reads its output once they are settled.
`/security-coach:audit --triage` hands confirmed findings straight into the tracking table with
`--source audit`, because a scanner hit and a pentester's finding are not worth the same.
`/investigation-coach:onboard --tour` runs onboard, then map, then study — the later two read what
the first wrote instead of sweeping the repo again. And when a plugin mentions a sibling that is
not installed, the skill says what to do inline instead of failing — the dependency is a
convenience, never a requirement.

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

**A setting answers the same everywhere.** Claude Code hands plugin settings to hook processes and
to nothing else, so the engine a skill shells out to used to resolve defaults while the session
used the real value. The session-start hook now records what it was passed in
`~/.ai-coach/settings.json`, and every other process reads that — one setting, one answer. An
`AICOACH_*` variable still wins, and `config` names which of the three sources decided each knob.

**One name per session.** Claude Code already names every session and shows it in the status line;
AI Coach adopts that name at session start and checks again at session end, so a rename in between
is caught. A name someone typed is never overwritten by a derived one.

**Git is the transport.** `/handoff` writes `.ai-coach/team-seed.jsonl`; commit it and knowledge
moves with the branch, reviewable in a pull request before it touches anyone's database. Optionally
AES-256-GCM sealed.

**One product, however many repositories.** A backend and a frontend that belong together share one
memory; each line still records the repo it came from, and your own repo ranks first.
`/memory-coach:roster` declares the grouping.

**The brief never truncates silently.** A capped brief that looks complete is the one failure mode a
memory tool cannot have, so the cap always leaves room to say what it dropped.

**A command hands you the runway, never the landing.** Claude Code blocks a model from firing a
user-only skill — even from inside a command you typed — and forbids reproducing that skill's
steps another way. That is the right rule twice over: "only you fire a side effect" would mean
nothing if a command could re-implement the side effect inline. So a command's product is
everything *around* the firing — the state read, the gates checked before you hit them, the
checklist narrowed to what this repo still needs — ending in the exact line for you to type. The
corollary is easy to get wrong: a command cannot tell what is installed by looking at its own
context, because user-only skills are invisible to it by design. It runs `claude plugin list`
instead.

**The engine lives at `~/.ai-coach/`, not in a plugin directory.** A plugin directory is documented
as ephemeral and unreachable from a sibling plugin, so the engine installs a copy of itself beside
the databases at a path that never moves. The corollary is handled too: if that copy is older than
the database a newer release migrated, it says so on stderr — naming both versions and the fix —
instead of failing every write with an error that reads like corruption.

## Configuration

**See everything, including what it was originally:**

```bash
node "$HOME/.ai-coach/bin/engine.js" config          # table: now, default, and who set it
node "$HOME/.ai-coach/bin/engine.js" config --json   # the same, with descriptions
```

```
setting        now    default  set by
-------------  -----  -------  ------
brief_chars    2500   4000     plugin (settings.json)   <- changed
coach          off    on       env (AICOACH_COACH)      <- changed
corrections    on     on       default
...
2 of 9 differ from the default: brief_chars, coach
```

The `set by` column is the useful part: putting a setting back is a different action depending on
which of the three sources decided it. `settings.json` means you set it in `/plugin` and this
process learned it second-hand from the session-start hook — the only process Claude Code passes
plugin settings to directly.

**To change one** — `/plugin` → `ai-coach-core` → the setting. That persists.
**To override for one shell** — `AICOACH_<KEY>=<value>`, which wins over the plugin setting.
**To reset one** — clear it in `/plugin`, or unset the env var. There is no "reset all": the
defaults are what you get when nothing is set anywhere, and `config` shows you exactly what is.

| Setting | Default | What it governs |
|---|---|---|
| `brief_chars` | `4000` | Ceiling on the memory injected at session start, clamped to 500–16000. Ranking happens before the cap, so raising it surfaces more — it does not change what wins. |
| `coach` | `on` | The coach line, and hints on vague prompts. **Display only** — failures are still recorded, and so are prompt signals, because silencing a line must not empty the evidence it is measured against. |
| `corrections` | `on` | Whether failures are recorded at all. |
| `learn` | `on` | One Haiku call at session end distils a summary and up to 3 learnings. |
| `plan_review` | `on` | In plan mode only: one Haiku call scores the prompt. |
| `guard` | `on` | Blocks tool calls carrying real credentials. The one hook allowed to stop a call. |
| `spotlight` | `on` | Injection-marker scan on fetched content. Warn-only, no model call. |
| `partners` | `on` | The one-time `/harness-coach:partners` note. |
| `default_trust` | `full` | Trust for a teammate you have not rated: `full` or `workspace`. Anything else falls back to `full` — a typo is not silently a trust level. |

Every setting also has an environment twin — `brief_chars` is `AICOACH_BRIEF_CHARS`, `coach` is
`AICOACH_COACH`, and so on for all nine. The twin wins over the plugin setting and over the
recorded snapshot, and it lasts for exactly one shell.

### Environment variables that are not settings

These have no plugin equivalent. Most exist for tests and scripts; the last three are the ones a
person might reach for.

| Variable | Effect |
|---|---|
| `AICOACH_DB` | Path to the user-scope database. Tenants, the bin copy, the settings record and the log all live beside it, so pointing this at a temp file really does give you a whole isolated tree. |
| `AICOACH_LOG` | Where failures append. Defaults to `log.jsonl` beside the database. |
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
node .github/check-manifests.test.js && node .github/check-manifests.js
```

No framework, throwaway databases, no network. CI runs all of it on every push, across both
supported Node floors and both operating systems, with an explicit FTS5 probe that names the
problem instead of failing three tests deep. The manifest checker is the repo's lint — versions,
dependency floors, skill frontmatter, every `ENGINE` verb a skill calls, and every cross-plugin
reference — and it has its own test suite, because a lint that silently stops checking passes
every time.

Releases are git tags, one per plugin version: `{plugin}--v{version}`. The performance numbers in
the [changelog](CHANGELOG.md) are medians of repeated fresh-process runs on the machine that wrote
the release, stated with their spread — measured, or not printed.

## License

MIT
