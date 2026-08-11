# Changelog

Releases are git tags, one line per plugin: `{plugin}--v{version}`.

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
