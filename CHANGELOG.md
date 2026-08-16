# Changelog

Releases are git tags, one line per plugin: `{plugin}--v{version}`. Every plugin that changed in a
release is named with its number in that release's section.

## v1.0.0 — One product, one version (2026-08-16)

**All eight plugins go to 1.0.0 together**, and every dependency range becomes `^1.0.0`. Until now
the coaches were pinned to `~0.x` ranges on core, so five of memory-coach's six releases existed
only to chase a core minor it did not otherwise care about. A caret on a shared major ends that:
core can ship a minor without eight follow-up tags.

This release is a full review of the harness as one thing rather than eight, so most of it is
corrections to seams between plugins.

**Fixed — memory could hand you the wrong row.** Memory ids are per-database and both databases
start at 1, so a project memory and a global memory routinely share a number. Three consequences,
all fixed: the session brief silently dropped a global memory whenever its id collided with a
branch memory already shown; `forget <id>` deleted the *project's* row when you meant the global
one; and nothing in the output said which scope an id belonged to. Ids are now printed
scope-qualified — `#12` is this project's, `#g12` is global — and `forget` honours the letter.

**Fixed — the session brief could exceed its own cap.** The branch section reserved a share *on top
of* the character budget instead of *out of* it, and the truncation marker's reserve was honoured by
only the last section. A brief asked for 4000 characters could return roughly 5600. Both are
clamped, and the test that allowed 50% slack now asserts the real ceiling.

**Fixed — `rekey` stranded six tables out of seven.** Adopting rows under a new project identity
moved `memories` and left sessions, observations, corrections, prompt signals, findings and repos
behind, unreachable. It now moves every tenant table in one transaction.

**Fixed — turning off coaching silently deleted the evidence.** The `coach` switch gated whether a
failure was *recorded*, not just whether the coach line was *shown*, so `coach: off` quietly emptied
the outcome data `/prompt-coach:prompt-stats` measures lift against. Recording now has its own
switch, `corrections`, which is what the docs always implied.

**Fixed — resuming a session left every sibling plugin broken.** SessionStart only matched
`startup|clear`, and the bootstrap that installs `~/.ai-coach/bin/engine.js` runs from there — so a
first session that happened to be a resume left twenty skills across seven plugins calling a file
that did not exist. The matcher now covers `resume` and `compact`, which also restores the brief
after a compaction instead of losing it.

**Fixed — the team seed could be read half-written.** `autoSeed` fires from PreCompact, post-commit
and session end, which overlap; it wrote straight onto the target. Now it writes a temp file and
renames.

**Removed — the undocumented `export` verb.** It dumped memories, sessions and observations as raw
JSON with no redaction, bypassing every rule the team seed enforces. `seed-export` is the supported
path and always was.

**Node's version is now stated once, loudly.** Below Node 22.5 `node:sqlite` throws inside every
hook, every hook swallows it (fail-open is the rule), and the plugin was silently dead forever. It
now says so on stderr.

**`/doctor` asked for a count nothing could produce.** It told you to count `distilled` rows in
`search --full` output, which never printed provenance. Search prints it now, and the new
`ENGINE stats` verb answers the question directly.

**The three investigation skills stop sweeping the repo three times.** `/map` and `/study` read the
`stack.md` that `/onboard` writes instead of rediscovering the structure, and `/map` now writes
feature notes in `/onboard`'s format — the two shared a directory while writing two different
shapes, and only one of them marked its files as generated.

**`INGEST write` accepts `--body-file`.** It read stdin only, and PowerShell 5.1 has no heredoc, so
an agent had no portable way to hand it markdown it had produced itself.

Also: `/recall` no longer advertises a `--corrections` flag that never existed; `where` became
`where.exe` where PowerShell would have resolved it to `Where-Object` and hung; the `researcher`
agent stops relying on `${CLAUDE_PLUGIN_ROOT}`, which is not substituted in agent files; references
to `/team-onboarding`, `/goal` and an unimplemented workflow script are gone; and CI now runs all
three test suites and validates all nine manifests on every push.

## v0.2.2 — Haiku pinning (2026-08-13)

Backfilled: this release shipped and was tagged, but never got a section here.

**Seven user-invoked skills pinned to Haiku at low effort** — `ai-coach v0.2.2`,
`memory-coach v0.1.3`, `prompt-coach v0.1.2`. Formatting and CLI-wrapping work should not bill at
frontier rates. The skills that do real analysis were deliberately left on the session model.

## v0.6.0 — Atlas coach (2026-08-16)

The sixth focus: everything outside the repo. Web pages, PDFs, a security advisory, a teammate's
Notion export — sources the project consumes but does not control.

**atlas-coach v0.1.0** — three skills and, for the first time in this marketplace, two agents:
`researcher` (pathfinder loop: seed from memory and the ingested corpus, expand docs > source >
issues > blogs, prune dead paths out loud, return a ≤600-word cited brief — no source means
`UNVERIFIED`, never laundered into fact) and `verifier` (wrong-until-proven; CONFIRMED /
PLAUSIBLE / REFUTED, every verdict citing command output, file:line, or URL + quote; uncertain
defaults to PLAUSIBLE). Both are reusable from any session via the Agent tool. Their models are
split on purpose: the researcher is pinned to Sonnet — it is the fan-out, 3–7 run in parallel,
and scoped read-and-cite is default-tier work — while the verifier inherits the session model,
so the judge is never weaker than the session trusting its verdicts. Cheap many, strong judge.

**`/research` is a claim gate, not a fan-out.** Parallel researchers per non-overlapping
sub-question (3/5/7 by complexity, eight agents ceiling), then every non-obvious claim is
attacked by the verifier: REFUTED claims are dropped *and the drop is reported*, PLAUSIBLE ones
carry `(unverified)` inline. The survey that shaped this found OSS research agents share one
gap — none adversarially verify their own findings. Output: `./research/<slug>.md` with
provenance frontmatter, plus 1–3 conclusions stored to memory at source-tier confidence
(0.9 docs / 0.7 blog / 0.5 forum). Security is inherited, not reinvented: core's spotlight
already scans every fetch; downloaded files go through `/security-coach:scan` before trust.

**`/ingest` — documents in, markdown out** — ported from keka's tested engine and upgraded.
Deterministic script does routing, conversion, sha256-of-source idempotency (a renamed file is
still already ingested), collision refusal, provenance frontmatter, and the human index; the
model does only what needs judgment. New here: the `plan` output names who actually converts
each input **on this machine** (pandoc / markitdown / defuddle, detected never installed), and
every written doc feeds a **paragraph-level FTS5 index** (`.atlas-index.db`, `node:sqlite`,
gitignored, rebuilt anywhere by `reindex`) — ask a question, get the exact paragraph with its
heading trail. Embeddings are deliberately deferred until keyword search measurably misses.
Team-doc routes documented: Notion markdown export rides the copy route, Confluence HTML export
rides pandoc, MCP connectors are used when detected. Also fixed from the ancestor: the pandoc
spawn no longer passes an unquoted path through a shell — a filename with `&` or spaces
converts fine, and the test proves it.

**`/analyze` — the on-demand pieces**: `verify` (one verifier run against a claim, URL, or
file), `translate` (doc-to-code: a stub in *this project's* idiom — conventions from
investigation-coach's stack/patterns when present — citing the doc section it derives from and
shipping with its runnable check; upstream test cases port the same way, each mapped to its
origin), and `stats` (what the corpus knows, what has gone stale).

Zero core changes, zero hook changes — nothing else bumped. atlas-coach depends on
security-coach explicitly: the scan-before-trust step is part of the design, not a suggestion.
Deferred with reasons in the plan: semantic embeddings (until FTS misses are recorded),
internal-docs gap analysis (v0.7, builds on the index), n8n and all external automation
(Routines and Workflows already cover it).


## v0.5.0 — Investigation coach (2026-08-15)

The fifth focus: onboarding people, not sessions. A new teammate's first week is spent asking
questions the codebase could answer — if anyone had written the answers down where a newcomer
would look.

**investigation-coach v0.1.0** — three skills, zero hooks, zero core changes (so nothing else
bumped this release). `/onboard` writes `docs/onboarding/`: a start-here (setup to first run, a
suggested first task, core flows, the glossary veterans always skip, how-we-work mined from
CLAUDE.md and lint configs), a stack lookup table, 3–5 inferred ADR-style decisions marked
INFERRED, and 3–6 pattern docs in a fixed skeleton with `file:line` citations. **No citation, no
claim** — and no whole-system documentation by default, because docs for untouched code rot
unread. `--full` overrides; `--feature <name>` writes one eight-section feature doc instead;
`--project` spans the declared repos.

**`/map` renders one architecture model three ways**: an artifact page and
`docs/onboarding/architecture.md` (C4-style context/container views drawn as mermaid
flowcharts — never the experimental C4 diagram type GitHub refuses to render — plus a sequence
diagram per core flow), and `architecture.canvas`, a JSON Canvas file: open the folder in
Obsidian and the services-and-calls board just works. Every edge carries evidence or is marked
INFERRED. Huge project: the skill asks which features to focus on instead of mapping everything.

**`/study` writes the why** into `./study/` — index with the 2–3 threshold concepts plus a
reading order, then **one directory per architectural area the project actually has** —
backend/frontend for a web app, one per service for microservices, engine/cli for a tool —
discovered from the structure, never assumed, plus the one constant `cross-cutting/`. Each file
explains a pattern as this codebase uses it: why here, where to see it, what it trades away.
Explanation only — setup steps belong to onboarding, API shapes to reference. An area a reader
might expect but the project lacks gets that said in the index: a fact, not an omission.

**These three are deliberately not Haiku-pinned.** Investigation is codebase reading plus
synthesis, not CLI-and-format work — pinned down, the output reads like a file listing. Each
skill states the cost up front and bounds it with `--feature`. Heavy sweeps go to Explore
subagents; the session keeps conclusions, not file dumps.

**All output is Obsidian-ready and plain-markdown honest**: wikilinks, MOC-style index, sanitized
filenames, no generated `.obsidian/` directory, and every generated file carries a
`> Generated by` line — a file without it is hand-written and never overwritten silently.
Complementary to Claude Code's native `/team-onboarding`, which profiles how you drive Claude
Code and never reads the codebase; start-here.md points at it.


## v0.4.0 — Partners (2026-08-15)

The fourth focus: the tools standing next to the coach. AI Coach keeps shipping coaching and
nothing else — `/harness-coach:partners` is how it points at everything it deliberately did not
absorb.

**harness-coach v0.1.0** — one skill, ~72 measured always-on tokens. A curated catalog of seven
partners: gh CLI, chrome-devtools, figma, obsidian, ast-grep, gsd-browser, spec-kit. The skill
detects what is installed in one batched sweep, briefs you with one verdict line per tool — the
caveat attached, because the caveat is the useful part — and installs only what you pick.
Picking nothing is a fine outcome.

**Every verdict carries its honest limit.** An MCP server added with `claude mcp add` does not
load into the running session — the skill says "restart Claude Code", never "ready to use",
because pretending otherwise wastes the next ten minutes of the user's life. Official plugins
(chrome-devtools, figma) do load mid-session via `/reload-plugins`, and the catalog says which is
which. chrome-devtools ships with its context cost stated (~30–60 tools while enabled). obsidian
opens with the cheaper truth: if the vault is markdown files, pointing Claude at the folder needs
no install at all. gsd-browser is marked never-automate — interactive setup, and on Windows it
runs natively from PowerShell or the daemon dies.

**No auto-install mode, deliberately.** keka shipped ask/auto/off; Anthropic's own marketplace
precedent is detect-and-point — their LSP table tells you to install binaries yourself. Consent
per pick is the product. Verified installs (re-checked, not assumed) are written back as a
`reference` memory, so the next session's brief already knows the tool exists.

**Core 0.4.0** adds the one-time nudge: a single session-start line pointing at the skill, gone
forever once `engine partners-seen` writes its marker on the first run. Off switch:
`AICOACH_PARTNERS=off` or the `partners` plugin setting.


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
