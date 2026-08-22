# Changelog

Releases are git tags, one line per plugin: `{plugin}--v{version}`. Every plugin that changed in a
release is named with its number in that release's section.

## v1.3.0 — What the business is, and what comes next (2026-08-22)

Six plugins document the code, the session, the prompts and the world outside the repo. None of
them documents the **business**: who the actors are, what the processes actually do, which rules
are enforced in code and which live in someone's inbox. And nothing turns "we need partial refunds"
into a specification with a definition of done and a plan a cheap model can execute unattended.

**strategy-coach 1.0.0 · harness-coach 1.0.1 · ai-coach 1.2.0**

### The boundary that makes this a separate plugin

investigation-coach answers *what the code is* — architecture, patterns, stack, all evidence from
the repo. strategy-coach answers *what the business is* and *what comes next*. The test is one
line: "how does X work here" → investigate; "what should we build and why" → strategize.

The consequence is a rule, not a preference: `blueprint` reads `docs/onboarding/` and never
re-derives it. Two tools tracing the same code and disagreeing is worse than one tool with a gap.

### `/strategy-coach:vault`

Makes `./docs` an Obsidian vault — a hub note, `business/` and `features/`, one page of
conventions, and links to whatever onboarding, study, research and ingest already wrote. Pinned to
Haiku; it is folder scaffolding.

It **never creates `.obsidian/`**, keeping the rule investigation-coach already set: Obsidian
writes its own on open, and a hand-made one with the wrong schema is worse than none. It only
gitignores the per-machine noise. `docs/00-index.md` belongs to `/atlas-coach:ingest`, so the hub
links it and never edits it.

### `/strategy-coach:blueprint`

The business in two voices, one file. A person gets the flow, so every process note carries a
Mermaid diagram. An agent gets the mapping, so every process note carries a table of
`file:line`. Splitting those into two documents guarantees one goes stale, so they share a file.

Every technical row is `file:line`, `INFERRED`, or **`NOT IN CODE`** — that third marker is the
one worth having. A step that exists in the business and nowhere in the code is a finding, and
most documentation tools have no way to say it. Claims sourced from a person are attributed
(`per Sara, 2026-08-20`), because unattributed they read as though the code proved them.

Renderings degrade rather than block: Mermaid in the note is the source of truth, an Artifact page
aggregates it, and a Miro board happens only when Miro is already connected.

### `/strategy-coach:feature`

Intake, then specification, then a dispatch. Two files: `spec.md` for people, `plan.md` for an
agent in a fresh session on a cheap model that cannot ask anything.

Two things make it more than a template. **The definition of done is a table whose every row names
a command or an observable** — "fast", "clean" and "robust" are rejected, and a criterion that
cannot be made checkable is moved to Unknowns rather than dressed up. And **the plan is not written
until the user signs off on the spec and the DoD**. That gate is deliberate: an AI-drafted spec
nobody read is how a wrong feature gets built quickly.

`plan.md` is written to `/prompt-coach:dispatch`'s four rules — its reader genuinely cannot ask a
follow-up — and the skill checks its own draft with `ENGINE prompt-check`, which runs the nine
detectors with no model call and no write.

`--prior-art` fans out at most four atlas-coach `researcher` agents to find how others solved this:
a reference implementation for the developer, the failure modes everyone hits for the tester. Load-
bearing claims go through `verifier`; `PLAUSIBLE` is written into the spec as `UNVERIFIED`.

### harness-coach 1.0.1 — Miro joins the catalog

Eighth partner. The verdict says the quiet part: the value of a board is the *audience*, not the
drawing — Mermaid in a committed file is free, diffs in a pull request, and needs no login. Its
caveat is a real trap this release had to handle: auth is interactive, so a headless session has
the tools and no session, and probing with an authenticate call hangs the run. Detect passively.

### Prior art, and what it changed

The design draws on six sources read with `/atlas-coach:ingest` — the converted corpus stayed
local rather than shipping with the plugin, so the sources are named here instead. Two of them
changed the design concretely rather than decorating it:

- **arXiv 2505.23695** measured that naming the business domain *before* analysis lifts insight
  depth 31% over the same model without it. So `blueprint`'s first step is one sentence naming the
  domain, shown to the user for correction before anything else is written — not a preamble, the
  step the rest depends on.
- **Thoughtworks, via Gudala (2025)**, reported a 30% cut in user-story lead time from GenAI — but
  only after instituting human review gates; the first drafts missed implicit requirements. That is
  the sign-off gate in `/feature`, and the reason it is a rule rather than a suggestion.

Also folded in: the researcher contract's negative space (`## Unknowns` is required in every
document this plugin writes, and "none" is not an answer), and the four question types from
Indeed's critical-thinking piece behind `/feature`'s clarification questions.

The corpus is honest about its own weakness, so this release should be too: four of those six
sources are vendor or SEO content that asserts rather than measures. The two dated, falsifiable
claims above are the two that shaped the design.

## v1.2.0 — The prompts the model writes (2026-08-22)

Nine deterministic detectors grade every prompt the user types. None of them has ever seen a prompt
*Claude* writes — a subagent dispatch, a plan spec, a spec written for a fresh session after a
reset, a workflow stage. Those are prompts, they fail the same nine ways, and the hook that would
catch it is `UserPromptSubmit`, which never fires for them.

**prompt-coach 1.1.0**

### `/prompt-coach:dispatch`

Four rules for a prompt whose reader **cannot ask a follow-up**:

1. **Resolve the ambiguity now.** Receiving a vague prompt, the right move is to stop and ask.
   Sending one, that move does not exist — the recipient picks an interpretation silently and spends
   a whole context on it. The highest-value line in a dispatch is the approach already tried and
   rejected, and it is the one most often missing.
2. **Success criteria, not steps.** The point of a separate context is that it loops without you,
   and it can only loop against a check. Bounded, or it does not end. Without the verification
   ritual on top — "double-check everything" now causes over-verification, not care.
3. **Name the artifact and the shape.** `@path` and an exemplar file already in the repo. A
   dispatched context has no transcript, no cursor and no open tab, so `deictic-no-path` is strictly
   worse here than in chat, where at least you are both looking at the same screen.
4. **Say what comes back.** Size, evidence, negative space. The rule with no counterpart in chat and
   the specific way delegation fails: no return contract means a file dump, paid for twice — once in
   the subagent's tokens, once in the context it lands in. Copied from this product's own
   `agents/researcher.md`, where *what could not be determined* is a required closing line.

Then the part that is not advice: `ENGINE prompt-check "<draft>"`, run on the model's own draft
before sending. The same nine regexes, no model call — and **no write**, which is what makes it
safe. `prompt-check` is the one prompt verb that records nothing, so self-checking a dispatch cannot
put signals into `/prompt-coach:prompt-stats` for prompts the user never typed.

The skill is **model-invocable**, unlike every other skill here except `recall`. Guidance that has
to be remembered before it applies is guidance that never applies, and this one has no side effects
to justify a gate. It is also unpinned: `dispatch` runs inside real work, and a Haiku-shaped answer
would be a report about briefing rather than a brief.

### Also

- README's claim that "only `recall` fires on its own" was true when written and is now false. Fixed
  rather than left, on the same principle that killed `/handoff`'s "what they concluded".
- The always-on token figure is still the v0.6.0 measurement. It now says so plainly, and says it
  is understated by two skill descriptions rather than implying a rewrite is the only drift.

### Prior art

The shape — a compact behavioral skill, four principles, one file, model-invocable — is
[andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills). The substance is
inverted on purpose. Karpathy's first principle is *ask rather than guess*, which is the correct
move for a context that has someone to ask; a dispatch has nobody, so the same instinct has to be
spent before sending instead of deferred. And where those four principles are asserted, these carry
the dated source and the detector id that grades them — `references/rules.md` already records that
rule 2's verification advice reversed once. Advice with an expiry date is the only kind worth
shipping in a tool that outlives a model generation.

## v1.1.0 — Conclusions, not prompts (2026-08-22)

`/handoff` promised that "session history travels too — who worked which branch, and **what they
concluded**." It did not. A real user's committed seed settled it: all seven session rows carried
the raw first prompt, including `"summary":"/memory-coach:handoff"`, `"summary":"proceed"`, and one
row carrying prompt-coach's own internal judge prompt. What travelled was never a conclusion.

**memory-coach 1.1.0 · ai-coach-core 1.1.0**

### The leak

`sessionEnd` wrote `first_prompt.slice(0,200)` unconditionally and only *upgraded* it when the model
call succeeded — and `summary` was in `seedExport`'s column list. So every failed Haiku call shipped
raw prompt text into a git-committed file, against the rule `schema.sql` states for prompt signals:
prompt text is never stored, because it carries credentials and customer data.

Fixed at the root rather than at the caller: `sessionEnd()` now **refuses** a summary that is the
session's own prompt, or a prefix of it. One guard in the shared function, so the next person who
reaches for "something better than nothing" cannot reopen it. The hook passes `null`, the row still
gets its `ended` stamp, and the local brief falls back to `first_prompt` — which never leaves the
machine, because it is not a seed field at all.

### Debriefs

A memory is an atomic fact. A **debrief** is what a person concluded when a piece of work finished:
**business**, **technical**, **evidence**, and **unknowns**. Four columns rather than one blob,
because it is the only way the engine can *enforce* that negative space exists — "what you could not
determine" is a required field in this product's own subagent contract (`agents/researcher.md`), and
a prose blob cannot be checked for it. Sections are capped, ~600 words total.

Nothing writes one automatically. A conclusion exists when someone decides the work is done, which
is exactly why a subagent's final report is written once, at the end, on purpose.

Identity is `date/author-email/name-slug`, frozen at publish time — readable, and stable across
machines. Renaming the session afterwards does not orphan a key a teammate already holds. Publishing
twice under one name on one day replaces the first and **says** `replaced`, because a silent
overwrite is how two genuinely different conclusions lose one.

New: `/memory-coach:debrief`, and `ENGINE debrief-publish|debriefs|debrief-show|session-digest`.
`/memory-coach:recall` gained the read path, since that is the skill a "what did we decide about X"
question can actually reach without anyone typing a command.

### `session-digest` — a long session, uncapped

Session summarisation read the last 40 observations and dropped the rest. What makes a session long
is repetition, not information: forty edits to one file are one fact and forty rows. So the map step
is deterministic SQL with no model in it and the model only reduces — failures, recorded corrections
and the last 60 calls verbatim, repeated `(tool, target)` pairs collapsed to counts. Two hundred
identical edits become `Edit x200 src/big.ts`. Nothing is truncated. Pages when it has to, and says
so, so a very large session folds instead of overflowing.

It never includes a correction's `prompt_excerpt`: that is 200 characters of raw prompt, in front of
a model about to write a document that gets committed.

### Exports are manual now

No hook writes a seed. `autoSeed` fired from SessionEnd, and a second hook refreshed the file on
every commit and every compact — so knowledge left the machine before anyone decided it was worth
sharing, and that is the path the leak took. `seed-refresh.js` is **removed**, along with its
`PostToolUse:Bash` and `PreCompact` entries. A side effect worth having: one fewer node process
spawned on every Bash call.

`/memory-coach:name` is **removed** as a skill. Naming belongs to the moment you hand work over, so
`/handoff` and `/debrief` ask for it. The `ENGINE name` verb stays — and now works: it read `a[0]`
as a session id while every caller passed a label, so it updated zero rows and printed success
anyway. Both callers resolve the session through one new `latestSession()`, because a skill cannot
see its own session id.

### Cross-machine correctness

- **The wire format declares itself.** A `meta` line carries the generation, and every row has an
  explicit `kind` — `memory`, `session`, `prompt_signal`, `debrief`. Governing constraint: an older
  importer's last line is `if (!r.text) continue`, a *content* check, so any row carrying a top-level
  `text` is eaten as a memory. Memory rows may have `text`; nothing else ever may. A test enforces it.
- **Local session uuids stopped travelling.** Sessions and signals reference `skey`, the same
  `date/author/name` scheme. Verified across a three-machine relay: origin author and key survive
  each hop, while custody (`meta.by`) changes.
- **Import is one transaction**, in two passes — sessions first, so ordering inside the file stops
  mattering. A signal is accepted only when the local session agrees about *who* authored it;
  otherwise it is rejected and counted. Before, a teammate's signals could attach to your session
  row and `prompt-stats` would count them as yours.
- **Carried timestamps are clamped forward to now.** One expression fixes five query families:
  display ordering, branch ordering, the prompt-stats window, the prune cutoff, and identity dates.
  A machine with a fast clock could otherwise own "Last session here" for weeks.
- **`provenance: 'imported'` is finally written.** Declared and rendered since v0.1.0, never stored,
  while `/handoff` documented it as working. A `distilled` memory now stays distilled across a hop
  rather than being laundered into "a teammate wrote this".
- **One canonical email everywhere.** `coachLine` compared case-sensitively while `promptStats`
  lowercased, so one git identity behaved differently in two features.
- **A private trust decision no longer censors the shared file.** Holding a teammate's memory at
  `workspace` trust dropped it from your next export, deleting their contribution for everyone who
  had not imported yet. It is relayed now — it was already in the file — and still stays out of your
  own brief, which is what the flag is actually for.

- **A memory keeps the age it was written at.** `created` was exported but dropped on import, so a
  teammate's three-month-old lesson arrived dated today and outranked your own equally old one —
  `score()` decays confidence against age. Worse, because export carries the date, every relay hop
  re-stamped it, so a memory circulating in a seed could never decay at all. Found by asking whether
  memories transfer at all: they always did, but not their age.

### The brief

"Last session here" filtered on `project` alone and printed no attribution, so a teammate's newer
imported session presented as **your** last session. It now filters by author and prints the session
label. A debrief pointer line was added with no branch condition, deliberately: the branch section
needs an exact match and `task()` is null on `main`, so a conclusion published on a feature branch
was unreachable from mainline.

### Not done

The existing committed seed keeps its prompt text in git history — this release stops new leakage
only. Seed growth is unbounded; with automatic export gone the file no longer churns, so a retention
window waits for a team that actually needs one.

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

**The stated Node requirement was wrong, twice over.** The README asked for 22.5. Two things
actually have to line up: `node:sqlite` unflagged, which happened in **22.13**, and **FTS5** in
the bundled SQLite, which every search in the engine depends on and which arrives in **22.16** and
**24.0**. The supported floor is therefore `>= 22.16` or `>= 24`, and the whole **23.x line is
unsupported** — it has the module and no FTS5. Both boundaries were found by probing real Node
builds in CI rather than reasoned about, and both floors are now pinned in the test matrix.

Below either line the failure landed inside a hook, where fail-open swallowed it, so the plugin
was silently dead forever with the reason in a log nobody knew existed. Both cases now print one
line to stderr naming which of the two is missing.

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
