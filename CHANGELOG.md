# Changelog

Releases are git tags, one line per plugin: `{plugin}--v{version}`.

## v0.3.0 — Security coach (2026-08-15)

The third focus. Three thin pillars, each honest about its limits.

**Fetched content entered the model unscanned.** The guard checked what left the machine; nothing
checked what came back. A new PostToolUse hook (`spotlight.js`) scans WebFetch/WebSearch results —
and file reads from *outside* the repo — for deterministic injection markers: invisible Unicode,
"ignore previous instructions" phrasing, forged roles and tool syntax, hidden HTML, exfiltration
links. On a hit it warns both audiences: a one-line `systemMessage` for you, a spotlighting
reminder for the model. **Warn-only, never a block** — published evasion research puts bypass
rates against guardrails at 20–72%, and an article quoting an attack is not an attack, so this is
a pre-filter that says so out loud. In-repo reads are never scanned: a repo whose tests quote
attack strings must not set off its own alarm. Off switch: `AICOACH_SPOTLIGHT=off`.

**The engine's own reads are now guarded.** Every repo-controlled file the engine consumed
(`project.md`, `team.md`, `seed.key`, seeds) was a plain `readFileSync` — a planted symlink at
`.ai-coach/project.md` pointing at `~/.ssh/id_rsa` would have flowed into model context. All of
them now go through `safeRead()`: symlinks refused, size capped, fail-open preserved. This was the
known debt from the caveman teardown, closed in the release where it belongs.

**security-coach v0.1.0** — skills only, like its siblings. `/scan` judges files or pasted content
you are about to trust (and says plainly that images cannot be regex-scanned). `/audit` runs the
scanners you already have — Opengrep/Semgrep, osv-scanner, gitleaks — never installs, never
reimplements, and reads results in KEV > EPSS > CVSS order because exploited beats likely beats
severe-on-paper. `/triage` turns a pentest report into tracked findings with the discipline the
field keeps writing about: severity recorded as the pentester's claim beside the team's own
assessment, nothing closed without a retest, risk acceptance only with a named sign-off, fix the
CWE class not the PoC.

**Findings are local, and provably so.** A new `findings` table holds the canonical rows; the
human-readable copies live in `.ai-coach/security/`, which the triage skill keeps gitignored — an
unfixed vulnerability in a committed file is disclosure. Findings never enter the team seed:
`seedExport` is table-explicit, and a test now locks evidence text out of the seed format. The
brief gained one findings-aware coach line (count and oldest date, computed live), ranked below an
unrecorded failure. **No SLA numbers anywhere** — published windows contradict each other, so the
coach records the team's own numbers or stays quiet.


## v0.2.1 — `--team` for prompt-stats (2026-08-12)

`/prompt-coach:prompt-stats --team` was documented in v0.2.0 but had no engine behind it. It does now
— and building it exposed two things worth stating plainly.

**The default was never actually self-only.** `promptStats()` counted every signal in the database,
including any that had arrived through a handoff. It now scopes by the session's author, so seeing
your own habits does not require opting out of seeing everyone's.

**Signals travel; text still does not.** `prompt_signals` rows ride inside
`.ai-coach/team-seed.jsonl` alongside the sessions they belong to — flags and a length, never a word
anyone typed, which is exactly what makes them safe to commit. Re-importing a seed adds nothing.

**A teammate's failures had to travel as a number, or the pooled view would have lied.**
`corrections` and `observations` carry message text and so stay local — which meant an imported
session looked *perfect*, and a colleague's weakest habit showed a 0.00 outcome rate purely because
the evidence stayed on their machine. Sessions now carry an `outcomes` integer, computed at export
time: corrections plus failed tool calls, as a count. Live rows are used for your own sessions and
the carried number for imported ones, never both.

**Still never per-person.** The engine returns a pool size and nothing else identifying; there is no
flag that breaks the pooled view down by author, because a report that ranks colleagues gets the
plugin uninstalled.


## v0.2.0 — Prompt coach (2026-08-12)

The second focus. v0.1.0 remembered what happened; this release notices how you ask.

**The baseline evaluated every prompt and threw the evaluation away.** Four regexes fired a hint
and forgot. Now every prompt is scored by deterministic detectors and the result is recorded — the
signal names only, never the text — so the coach can eventually say *"prompts shaped like this one
cost you time"* instead of asserting it.

**Nine detectors, up from four**, each carrying the date and source it came from because a
prompting rule is a bet on how current models behave and bets go stale. New: `hedged-opener`
("Can you…" invites a suggestion, not an edit), `negative-only`, `paste-after-ask` (long input
belongs above the ask), `caps-emphasis` (stacked CRITICAL/MUST now *over*triggers), and
`no-scope-clause`. They live in the engine, not the hook, so they are unit-testable without
spawning a process.

**Exploratory prompts are exempt.** The official guidance blesses *"what would you improve in this
file?"* as a legitimate way to work. Coaching that is how a coach earns being switched off, so
question-form prompts are recorded and never hinted at.

**`prompt_signals`** — a new table holding length, which signals fired, and whether a hint showed.
There is no column to read your prompts out of. `promptStats()` joins it against `corrections` and
FAIL observations to compute lift against your own clean prompts, live, never as a stored constant.

**The brief gained one prompt-facing coach line**, ranked below the corrections line and gated on
evidence: it needs five or more occurrences *and* a 1.5× lift before it says anything.

**The plan-mode judge was reshaped** after promptfoo's grading prompts: a fixed
`{score, reason, rewrite, hypothesis}` contract taught by two contrasting worked examples instead
of a rule list, and every suggestion must state why it should help. One rewrite, never a menu.
`<private>` spans are stripped before the prompt leaves for the judge process.

**New plugin `prompt-coach`** — skills only, zero hooks, mirroring memory-coach exactly.
`/prompt` (templates pre-filled from context, draft review, 12 rules with a 22-rule reference) and
`/prompt-stats`. Both user-invoked only.

### Fixes in ai-coach-core 0.2.0

- `pruneObservations(0)` silently meant *30 days*, because `Number(0) || 30` is 30. Explicit zero
  now means zero, and a negative window prunes everything — the sign is built rather than
  concatenated, since `'-' + -1` produced `'--1 days'`, which SQLite ignores while reporting
  success.
- Two detector bugs found by the fixture corpus before shipping: `no-done-criteria` cancelled
  itself on every prompt opening with "build" (the verb was in its own criteria list), and
  `negative-only` fired on *"do not touch the tax code"* — the out-of-scope clause the coach exists
  to encourage.


## v0.1.0 — Memory (2026-08-09)

The first release. Memory that compounds across sessions and travels across the team, plus the one
coaching thread that makes it a coach rather than a filing cabinet.

**Architecture.** Three plugins in one marketplace. `ai-coach-core` owns the engine and **every**
hook — cross-plugin hook ordering is undocumented, so there is exactly one place hooks live.
`memory-coach` ships skills and nothing else. `ai-coach` is a bundle with no components: one install
command, and measured at ~0 always-on tokens.

**The engine lives at `~/.ai-coach/`.** `${CLAUDE_PLUGIN_ROOT}` is documented as ephemeral, old
versions are deleted after 14 days, and path traversal into a sibling plugin is blocked outright — so
core installs a copy of the engine beside the databases, at a path that never moves, and refreshes it
only when the source differs.

**Storage.** One SQLite file per project at `~/.ai-coach/projects/<slug>/coach.db`, plus
`~/.ai-coach/user.db` for what belongs to you rather than to a product: private trust, your global
memories, the project registry. FTS5 throughout, zero runtime dependencies.

**Provenance.** Every memory records whether a `human` wrote it, a model `distilled` it out of a
transcript, or it was `imported` from a teammate. Nothing promotes one to another. Session-end
learnings are stamped `distilled` and stay labelled in the brief and in `/recall` — an agent is not
an approval boundary, and a compressed guess must never read as a decision someone made.

**Corrections — the coach surface.** A `Notification` hook records the moment a failure surfaces:
the signal word, the message, and what the session was being asked at the time. Deterministic, no
model call. The session brief then says one true thing, or nothing:
`coach: 2 failures surfaced here and nothing was written down`.

**A brief that explains itself.** Every line carries the reason it ranked — `branch`, `global`,
`sibling repo`, `from sara`, `distilled` — so the ranking model is learned by reading it. Ranking
happens before the cap, and truncation is never silent: the cap reserves room to say what it
dropped.

**Team.** `.ai-coach/team.md` is a committed directory of names, emails and roles, carrying no
judgments. Trust is private, set with `/team trust`, never exported. `/handoff` moves memory and
session history over git, optionally sealed with AES-256-GCM.

**Privacy.** `<private>…</private>` spans are stripped in the observation hook, before anything
reaches disk. The secrets guard blocks real credentials outright and asks on secret-ish payloads and
credential-file reads. Fails open, always logged.

**Skills.** `/recall` is model-invocable — Claude should recall unprompted when a question matches
prior work. `/handoff`, `/team`, `/project`, `/name` and `/doctor` are user-only: a skill with side
effects runs when you say so. `/doctor` reports and never repairs.

**Measured, not assumed.** Always-on token cost tracks skill *description length* and nothing else —
`disable-model-invocation` saves nothing (a 662-character description costs ~200 tokens with the flag
set; a short one costs under 20). Multiple plugins' `SessionStart` hooks all fire and nothing is
deduplicated, so the brief is capped and stays silent when it has nothing to say.

## ai-coach-core v0.1.1 — CLI read the wrong database (2026-08-09)

`useProject(cwdFlag || a[a.indexOf('--dir') + 1] || process.cwd())` read a flag's value without
checking the flag was present. `indexOf` returns `-1` when it is absent, and `a[-1 + 1]` is `a[0]` —
the first *positional* argument. So `engine.js search round` resolved the project as `"round"`,
opened an empty tenant database, and reported `no matches` against knowledge that was really there;
`corrections --open` resolved the project as `"--open"`. `brief` escaped it only because it
re-resolves the project internally, which is why the brief showed memories the CLI swore did not
exist.

Fixed by reading a flag's value only when the flag is present. Covered by a regression test that
drives the real CLI from a project directory and fails on the old line.

Inherited from keka, where the same line is live at `hooks/engine.js:733`.
