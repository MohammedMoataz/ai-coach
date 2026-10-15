# prompt-coach

Help with the prompt itself: a review or a template for the one you are about to send, a structured
walk for a scope too big to be one prompt, a measurement of which of your habits correlate with
sessions going wrong, and four rules for briefing a context that cannot ask you a follow-up. It
writes nothing and records nothing, so you can point it at half-formed thinking without
consequence.

| | |
|---|---|
| Version | 1.2.0 |
| Depends on | `ai-coach-core` `^1.6.0` |
| Source | [`plugins/prompt-coach/`](../../plugins/prompt-coach/) |

The plugin ships skills only. The prompt detectors, the `UserPromptSubmit` hook that runs them on
every prompt, and the `prompt_signals` table all belong to `ai-coach-core`
([plugin.json](../../plugins/prompt-coach/.claude-plugin/plugin.json)). Engine verbs written as
`ENGINE <verb>` are documented in [engine.md](../engine.md).

## What it ships

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `prompt` | skill | `/prompt-coach:prompt`, user-only (`disable-model-invocation`) | Prints a filled-in template, or reviews a pasted draft against the detectors and rewrites it once. |
| `scope` | skill | `/prompt-coach:scope`, user-only | Walks a big scope through eight dimensions, gates on readiness, then hands over one prompt. |
| `prompt-stats` | skill | `/prompt-coach:prompt-stats`, user-only | Joins which detectors fired on your prompts to what those sessions cost. |
| `dispatch` | skill | `/prompt-coach:dispatch`, model-invocable | Four rules for a prompt sent to a subagent, a fresh session, a workflow stage or a teammate. |
| `prompt/references/rules.md` | reference | Loaded by `prompt` | The full set of prompt rules with sources, dates, and the question bank per detector. |
| `scope/references/coverage.md` | reference | Loaded by `scope` | The eight dimensions and the seven-row readiness gate. |

`dispatch` is model-invocable because a model writes dispatches, and the detectors never see them
(next section).

## The prompt detectors

The detectors live in `PROMPT_RULES` in
[engine.js:1572-1621](../../plugins/ai-coach-core/hooks/engine.js). They are regular expressions,
with no model call. The ids are the strings `prompt-stats` reports and the numbering in
`references/rules.md` uses, so a signal, a rule and a reference entry are one thing
([prompt/SKILL.md:65-67](../../plugins/prompt-coach/skills/prompt/SKILL.md)).

| Id | Weight | Fires when | Rule |
|---|---|---|---|
| `deictic-no-path` | 5 | The text says "this/that/the file", "function", "component", "class", "module", "method" or "test" and contains no `@`. | Name the file with `@path`. |
| `action-no-ref` | 5 | Opens with fix, improve, update, optimize, clean, refactor or make, and has no `@path`, backticked name or filename. | An action verb needs a target. |
| `no-done-criteria` | 5 | Opens with build, create, implement, add, write or generate, and has no test, verify, should, passes, acceptance, "done when" or similar. | Say what done looks like. |
| `multi-ask` | 4 | Over 600 characters **and** more than six of and, also, then, plus. | One outcome per prompt. |
| `hedged-opener` | 4 | Opens with "can you", "could you", "would you", "should we" and similar. | Imperative, not hedged. |
| `negative-only` | 3 | Contains a negation, and nothing imperative is left once the negated clauses are removed. | Say what to do, not only what to avoid. |
| `paste-after-ask` | 3 | 1,200 characters or more, and the last 30% has over twice the lines of the first 30%. | Long input first, the ask last. |
| `caps-emphasis` | 2 | Three or more of CRITICAL, IMPORTANT, YOU MUST, MUST NOT, NEVER EVER, ALWAYS. | Do not stack emphasis. |
| `no-scope-clause` | 2 | Over 200 characters, opens with build, create, implement, add, refactor or migrate, and has no "only", "out of scope", "don't touch" or similar. | State what is out of scope. |

Before any rule runs, a prompt that opens like a question ("what", "how", "why", "explain", "tell
me" and others), or ends in `?` without an imperative opener, is marked `exempt` and never coached
([engine.js:1556](../../plugins/ai-coach-core/hooks/engine.js),
[engine.js:1628-1631](../../plugins/ai-coach-core/hooks/engine.js)). The README's reason is that
"what would you improve in this file?" is a legitimate way to work.

The core hook skips prompts under 25 characters and those starting with `/` or `!`, records the
fired ids (or `exempt`) and the prompt length but never the text, and shows the user at most two
hints, highest weight first. The model never sees the hints
([prompt.js:10-12](../../plugins/ai-coach-core/hooks/prompt.js),
[prompt.js:34-48](../../plugins/ai-coach-core/hooks/prompt.js)).

`ENGINE prompt-check "<text>"` runs the same evaluation on demand, with no model call and no write
([engine.js:2519](../../plugins/ai-coach-core/hooks/engine.js)). All four skills use it.

## prompt

**Invocation:** `/prompt-coach:prompt <bugfix|feature|refactor|research|review|rules> [draft to review]`.
User-only, `model: haiku`, `effort: low`.

Modes:

- **A template name** (`bugfix`, `feature`, `refactor`, `research`, `review`) prints that template
  filled in from the session (file, branch, error text, test command). Unknown fields stay blank
  rather than invented.
- **A pasted draft:**
  1. `ENGINE prompt-check "<the draft>"`.
  2. For each detector that fired, it looks up the rule's `**Ask:**` line and two example answers in
     `references/rules.md` and asks with `AskUserQuestion`, examples as the options. At most three
     questions, highest weight first, skipping any the draft already answers.
  3. One rewrite: quote each weak spot, give exactly one rewrite, one line on why. If the user skips
     questions, the rewrite keeps an honest blank.
- **`rules`** prints the twelve rules worth reciting, each tagged with its id in `references/rules.md`.
- **No argument** asks for the prompt in one line. A skill cannot read the previous turn.

When a draft carries more than one outcome, it says so and offers `/prompt-coach:scope`. It reads
the draft rather than trusting `multi-ask`, because that detector stays silent on a short draft with
several outcomes ([prompt/SKILL.md:52-57](../../plugins/prompt-coach/skills/prompt/SKILL.md)).

Rules it states ([prompt/SKILL.md:127-137](../../plugins/prompt-coach/skills/prompt/SKILL.md)):
one rewrite per review, never a menu; never more than three questions; never a question not backed
by a detector that fired; never rewrite into a bigger ask; if a rule in `references/rules.md` is
marked stale for the model in use, say so instead of enforcing it.

**Reads:** `references/rules.md`. **Writes:** nothing.

### `references/rules.md`

Twenty-two dated rules, each with its source (Anthropic's prompting and Claude Code best-practice
pages, and a prompt-management article) and the date it was read. Rules 1 to 9 are the detected ones
and carry the `**Ask:**` question bank; rules 10 to 22 are "not detectable, still true" and live in
the review path and templates. Rule 8 (`caps-emphasis`) is marked as reversed, and rule 12 (do not
over-instruct verification) as model-dependent, to recheck each release
([rules.md:86-93](../../plugins/prompt-coach/skills/prompt/references/rules.md),
[rules.md:121-125](../../plugins/prompt-coach/skills/prompt/references/rules.md)). It also records
that a shared prompt registry was deliberately not built.

## scope

**Invocation:** `/prompt-coach:scope "<the big scope, in your own words>" [--quick]`. User-only.

Steps:

1. **Size it.** It only proceeds if the scope names more than one outcome, lands in more than about
   three files or subsystems, or nobody can state an observable finish. Otherwise it hands over
   `/prompt-coach:prompt <bugfix|feature|refactor>`. It runs `ENGINE prompt-check`, but treats
   `clean` as no evidence of smallness.
2. **Read before asking.** `ENGINE search "<the topic>"`, `ENGINE whoami`, then `docs/features/`,
   `docs/requirements/`, `docs/onboarding/` and the named files. It opens by saying what it found.
3. **Walk the dimensions** from `references/coverage.md`, asking only about those the reading did not
   settle, with `AskUserQuestion` when the answer is a choice. `--quick` limits this to the five
   dimensions that would change the plan most, chosen from what step 2 found.
4. **Coverage table:** one row per dimension, its answer and its source. A guessed answer is marked
   `ASSUMED — needs the user` and is never quietly promoted.
5. **Gate:** prints all seven rows with verdicts. Any FAIL stops the walk with no prompt emitted.
6. **One prompt**, written to the four rules in `dispatch`, checked with `ENGINE prompt-check` before
   it is printed.
7. **Where next:** `/strategy-coach:feature <slug>` for a product feature needing a committed spec,
   `/analysis-coach:elicit "<…>"` for requirements still argued over, otherwise nothing. Whether
   those plugins are installed is checked with `claude plugin list`, never by whether their skills
   are visible ([scope/SKILL.md:89-92](../../plugins/prompt-coach/skills/scope/SKILL.md)).

Rules: writes nothing and records nothing (no file, no `ENGINE add`); never answers a dimension
for the user without marking it; never asks what step 2 found; the gate is not advisory; one outcome
or named parts ([scope/SKILL.md:94-107](../../plugins/prompt-coach/skills/scope/SKILL.md)).

### `references/coverage.md`

Half A is the eight dimensions, each with a question, two example answers and the failure it
prevents: outcome, observable finish, boundary, ground truth (files plus one exemplar), already
tried and rejected, constraints, unknowns with owners, and execution shape. Half B is the gate:
planning is done "when a fresh session on a cheap model could execute the work unattended and stop
at a place both of you would call finished"
([coverage.md:124-125](../../plugins/prompt-coach/skills/scope/references/coverage.md)). Its seven
rows are: every dimension answered, finish observable, boundary non-empty, reality named (an `@path`
and an exemplar), unknowns owned, one outcome, and the emitted draft returning `clean` or `exempt`
from `prompt-check`. The gate does not judge whether the work is worth doing or whether the answers
are right.

## prompt-stats

**Invocation:** `/prompt-coach:prompt-stats [days] [--team]`. User-only, `model: haiku`,
`effort: low`.

1. `ENGINE prompt-stats [days]`, default 30.
2. Reads the columns: **fired** (occurrences), **rate** (corrections plus failed tool calls per
   session that had the signal), **lift** (that rate against prompts that fired nothing).
3. Reports one signal: the highest lift with at least five occurrences.
4. Names the rule behind it from `/prompt-coach:prompt rules` and shows the fix on a plausible
   prompt.
5. If nothing clears the bar, says so in one line.

It must state that lift is correlation, not causation. A blank lift means no baseline yet. Under
five occurrences only the count is reported
([prompt-stats/SKILL.md:35-44](../../plugins/prompt-coach/skills/prompt-stats/SKILL.md)).

**`--team`** runs `ENGINE prompt-stats [days] --team`, pooling everyone whose sessions reached this
project through a handoff seed: signal, occurrences, pooled lift and pool size. It is never
per-person, there is no flag that makes it so, and asked for a breakdown it refuses and offers the
pooled view ([prompt-stats/SKILL.md:51-57](../../plugins/prompt-coach/skills/prompt-stats/SKILL.md)).
An empty team view usually means nobody has run `/memory-coach:handoff` yet.

## dispatch

**Invocation:** `/prompt-coach:dispatch [the draft you are about to send]`. Model-invocable, so the
model can apply it before dispatching an agent or writing a plan spec.

A prompt the model writes is not a `UserPromptSubmit`, so the core hook never grades it. The four
rules cover that gap ([dispatch/SKILL.md:13-15](../../plugins/prompt-coach/skills/dispatch/SKILL.md)):

1. **Resolve the ambiguity now.** Pick one reading and say which, or ask the user before sending.
   Carry the branch, error text, decisions made and approaches rejected. Never write "this file" or
   "as we discussed".
2. **Success criteria, not steps.** Give a check the recipient can loop against, and bound the work.
   Skip the "double-check everything" ritual.
3. **Name the artifact and the shape.** `@path`, an exemplar file, and one line on what is out of
   scope.
4. **Say what comes back:** size, evidence and negative space. The suggested return contract is
   300 words, every claim with `file:line` or a URL or marked `UNVERIFIED`, ending with what could
   not be determined.
5. **Check the draft** with `ENGINE prompt-check`. It is the one prompt verb that records nothing,
   so self-checks do not pollute `prompt-stats`. `clean` is not the same as ready, because rule 4
   has no detector.

It also says when not to bother: a single grep beats a briefed subagent, and a trivial dispatch
needs a trivial brief.

**Reads:** points at `references/rules.md` for the sources behind rules 1 to 3, a path that does not
resolve from this skill (see Limits). **Writes:** nothing.

## Configuration

None of its own. The shared `coach` setting turns the per-prompt hints off but not the recording,
`corrections` controls the outcomes `prompt-stats` measures against, and `plan_review` adds a Haiku
rewrite suggestion in plan mode ([engine.js:309-316](../../plugins/ai-coach-core/hooks/engine.js),
[prompt.js:53-59](../../plugins/ai-coach-core/hooks/prompt.js)). See
[engine.md](../engine.md#settings).

## Data it keeps

None. The skills write no file and no row. The data `prompt-stats` reads is kept by `ai-coach-core`:

| Where | What | Scope |
|---|---|---|
| `prompt_signals` table in the project tenant under `~/.ai-coach/projects/` | Session id, prompt length, fired ids (or `exempt`), whether a hint was shown. No prompt text. | User scope. Expires with observations after 30 days ([engine.js:1700-1716](../../plugins/ai-coach-core/hooks/engine.js)). |
| `.ai-coach/team-seed.jsonl` | The same signals, exported by `/memory-coach:handoff` | Committed; feeds `--team` |

## Limits and known issues

- `dispatch` and `scope` cite `references/rules.md`, but neither skill has that file. It lives at
  `skills/prompt/references/rules.md`
  ([dispatch/SKILL.md:110](../../plugins/prompt-coach/skills/dispatch/SKILL.md),
  [scope/SKILL.md:59](../../plugins/prompt-coach/skills/scope/SKILL.md)). Tracked in
  [#48](https://github.com/MohammedMoataz/ai-coach/issues/48).
- `multi-ask` needs both over 600 characters and more than six conjunctions, so it misses a short
  prompt that carries many outcomes. `prompt` and `scope` both say to read the draft rather than
  trust the flag.
- The rules are dated bets (2026-08) on current model behavior. `references/rules.md` marks the ones
  that already reversed or are model-dependent.
- Lift is correlation over your own sessions, and is blank until clean prompts have a bad session to
  compare against.
- Windsurf does not record prompt signals: [#37](https://github.com/MohammedMoataz/ai-coach/issues/37).

## Source map

- [`../../plugins/prompt-coach/.claude-plugin/plugin.json`](../../plugins/prompt-coach/.claude-plugin/plugin.json): manifest, version, dependency on `ai-coach-core`.
- [`../../plugins/prompt-coach/skills/prompt/SKILL.md`](../../plugins/prompt-coach/skills/prompt/SKILL.md): templates, draft review, the twelve recited rules.
- [`../../plugins/prompt-coach/skills/prompt/references/rules.md`](../../plugins/prompt-coach/skills/prompt/references/rules.md): all rules with sources, dates and the per-detector question bank.
- [`../../plugins/prompt-coach/skills/scope/SKILL.md`](../../plugins/prompt-coach/skills/scope/SKILL.md): the scope walk and its hand-over.
- [`../../plugins/prompt-coach/skills/scope/references/coverage.md`](../../plugins/prompt-coach/skills/scope/references/coverage.md): the eight dimensions and the readiness gate.
- [`../../plugins/prompt-coach/skills/prompt-stats/SKILL.md`](../../plugins/prompt-coach/skills/prompt-stats/SKILL.md): reading the signal-versus-outcome report.
- [`../../plugins/prompt-coach/skills/dispatch/SKILL.md`](../../plugins/prompt-coach/skills/dispatch/SKILL.md): the four rules for a prompt nobody can ask about.
- [`../../plugins/ai-coach-core/hooks/engine.js`](../../plugins/ai-coach-core/hooks/engine.js): `PROMPT_RULES`, `evaluatePrompt`, `promptStats`, the `prompt-check` and `prompt-stats` verbs.
- [`../../plugins/ai-coach-core/hooks/prompt.js`](../../plugins/ai-coach-core/hooks/prompt.js): the `UserPromptSubmit` hook that records signals and shows hints.
