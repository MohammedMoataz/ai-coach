# strategy-coach

Documents what the business is and specifies what comes next. `/blueprint` turns the actors,
processes, rules and vocabulary that live in people's heads into an Obsidian vault under `docs/`,
with every process step mapped to the code that implements it. `/feature` turns a request into a
signed-off spec and a plan a cheap model can execute in a fresh session. It is inward-facing by
design: looking outward is [atlas-coach](atlas-coach.md).

| | |
|---|---|
| Version | 1.5.1 |
| Depends on | `ai-coach-core` `^1.6.0` |
| Source | [`plugins/strategy-coach/`](../../plugins/strategy-coach/) |

Skills only ([plugin.json](../../plugins/strategy-coach/.claude-plugin/plugin.json)). Engine verbs
written below as `ENGINE <verb>` (`node "$HOME/.ai-coach/bin/engine.js" <verb>`) are documented in
[engine.md](../engine.md).

The boundary with investigation-coach is stated as one test: "how does X work here" is
investigation, "what should we build and why" is strategy
([blueprint/SKILL.md:127-129](../../plugins/strategy-coach/skills/blueprint/SKILL.md)).

## What it ships

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `blueprint` | skill | `/strategy-coach:blueprint`, model-invocable (chained by `/ai-coach:start --run --with-blueprint`) | Scaffolds the `docs/` vault, then writes business notes with diagrams and a `file:line` mapping per process step. |
| `feature` | skill | `/strategy-coach:feature`, user-only (`disable-model-invocation`) | Clarifying questions, `spec.md`, a sign-off gate, then `plan.md` for an unattended executor. |

`blueprint` has no `disable-model-invocation` line, so its description loads into every session.
It is reachable so `/ai-coach:start --run` can chain it, and its description says it never runs
proactively because it asks questions and writes files
([blueprint/SKILL.md:2](../../plugins/strategy-coach/skills/blueprint/SKILL.md),
[start.md:85-88](../../plugins/ai-coach/commands/start.md)).

## blueprint

**Invocation:** `/strategy-coach:blueprint [--full | --feature <name>] [--visual mermaid|drawio|miro|none] [--scaffold-only]`

Runs on the session model. Every process note serves two readers in one file: a person gets the
flow as a diagram, an agent gets a table of `file:line` entry points. The skill writes files rather
than answering because a committed note survives the session, diffs in review, and does not have
to be re-derived by the next agent ([blueprint/SKILL.md:12-21](../../plugins/strategy-coach/skills/blueprint/SKILL.md)).
If `/investigation-coach:map` has run, its output is the input; architecture is not re-derived.

### Step 0: scaffold the vault

This step absorbed the retired `/strategy-coach:vault`; `--scaffold-only` stops after it
([blueprint/SKILL.md:32-49](../../plugins/strategy-coach/skills/blueprint/SKILL.md)).

- Lists `docs/`, creates `docs/business/` and `docs/features/` if absent (no `.gitkeep`; each gets
  a hub note instead).
- Writes `docs/home.md`, `docs/conventions.md` and an empty `docs/features/index.md` from
  [layout.md](../../plugins/strategy-coach/skills/blueprint/references/layout.md). The index is
  written because `home.md` links it, and a link to a missing file is the thing this step exists
  to prevent.
- Appends `docs/.obsidian/workspace*` and `docs/.obsidian/cache/` to the repo-root `.gitignore` if
  missing, append only. The patterns are rooted at `docs/` because a pattern with a slash is
  anchored to the `.gitignore`'s directory. They are never widened, because
  `docs/.obsidian/graph.json` (written by `/investigation-coach:map`) is meant to be committed.
  Nothing else is created under `.obsidian/`.
- Reports three lists: created, linked, and **skipped because hand-written**, naming each skipped
  file and saying it carries no generated-by marker.
- `ENGINE add reference "docs/ is an Obsidian vault; hub at docs/home.md, business notes in docs/business/, feature specs in docs/features/" 0.75`

The layout it establishes, and who owns each part
([layout.md:20-36](../../plugins/strategy-coach/skills/blueprint/references/layout.md)):

```
docs/
  home.md                 hub, written by blueprint
  conventions.md          written by blueprint
  00-index.md             /atlas-coach:ingest owns it; linked, never edited
  business/               /strategy-coach:blueprint
  features/index.md       scaffolded by blueprint; /strategy-coach:feature appends to it
  features/<slug>/        /strategy-coach:feature
  onboarding/             /investigation-coach:onboard and :map
  onboarding/components/  one note per service; /investigation-coach:map
  .obsidian/graph.json    colour groups; /investigation-coach:map writes it once
  study/                  /investigation-coach:study
  market/                 /atlas-coach:market
  research/               /atlas-coach:research
```

`home.md` is links only, one line of context each, and includes a section only when its target
exists. The vault root is `docs/`: open that folder in Obsidian, not the repo root, or every path
wikilink breaks, and the report says so.

### Steps 1-9: the business notes

1. **Name the domain first**, in one sentence with the sub-area ("B2B wholesale ordering,
   specifically supplier price agreements"), written into `docs/business/overview.md` and shown to
   the user for correction before continuing.
2. **Read what exists**: `docs/onboarding/stack.md`, `architecture.md`, `patterns/`,
   `docs/00-index.md`, `docs/study/`. With no onboarding output it recommends
   `/investigation-coach:map` first, and still runs.
3. **Scope and cost.** Default: actors, glossary, and the three processes with the most business
   weight. `--feature <name>`: one process. `--full`: every process, announced as the expensive
   one. At most 8 subagents concurrently. Code-tracing legs use investigation-coach's `scout`
   agent when installed, otherwise any read-only subagent under the same contract (every claim
   `file:line` or `INFERRED`, capped, ending with what it could not determine).
4. **Ask what the code cannot tell you** (see below).
5. **Load [notes.md](../../plugins/strategy-coach/skills/blueprint/references/notes.md), then map
   each process to code**, one table row per step.
6. **Draw it**: a Mermaid flowchart inside each process note, then one Artifact page aggregating
   the diagrams. `--visual none` skips both.
7. **Render elsewhere only if asked**: `--visual drawio` or `--visual miro`, after loading
   [visual.md](../../plugins/strategy-coach/skills/blueprint/references/visual.md).
8. **Get the draft scored, then revise once** (see below).
9. **Report**, including scores, what the revision changed, what the user still needs to answer and
   what could not be determined, then
   `ENGINE add reference "business blueprint at docs/business/ — domain: <domain>, processes: <list>" 0.75`.

### The questions it asks

Step 4 asks for what has no trace in `src/`: the actors and their goals, rules with no enforcement
in code (an approval done in email), what happens on the unhappy path, and which processes actually
matter. The skill prefers a few sharp questions to a survey, and names the two answers worth most:
**what has been tried and rejected, and what is deliberately manual**
([blueprint/SKILL.md:69-72](../../plugins/strategy-coach/skills/blueprint/SKILL.md)). The domain
sentence in step 1 is itself a question: if it cannot be named, the skill asks rather than writing
notes. Answers are evidence and are attributed inline, `per <who>, <date>`.

### How it maps business processes to code

Every technical row carries exactly one of three markers, never blank
([notes.md:21-29](../../plugins/strategy-coach/skills/blueprint/references/notes.md)):

| Marker | Means |
|---|---|
| `path/to/file.ts:120` | verified: this line implements the step |
| `INFERRED` | read from naming or structure, not proven |
| `NOT IN CODE` | happens in the business, has no implementation — a finding |

A `NOT IN CODE` row is a finding, not an omission, and each one is named in the report as a
candidate for `/atlas-coach:market --gap "<it>"`
([blueprint/SKILL.md:76-81](../../plugins/strategy-coach/skills/blueprint/SKILL.md)).

The notes written under `docs/business/`:

| Note | Holds |
|---|---|
| `overview.md` | the domain sentence, why it exists, links to each process and to actors, glossary, rules and industry; a required "What we could not determine" section |
| `actors.md` | one section per actor: goal (what they are trying to finish), processes touched, constraints, source |
| `glossary.md` | term, what the business means, what it is called in code, and `file:line` — called the most valuable note in the vault |
| `rules.md` | rules *we* chose, their source, and where each is enforced; industry-imposed rules belong in `industry.md` from `/atlas-coach:market --industry` |
| `processes/<name>.md` | business view (numbered steps), a Mermaid flowchart, the technical mapping table (step, entry point, notes), and Unknowns |

Mermaid rules: a flowchart per process, a sequence diagram only when message order is the point
and never both; every decision edge labelled; under about 15 nodes, otherwise split; no styling or
colour ([notes.md:149-156](../../plugins/strategy-coach/skills/blueprint/references/notes.md)).

### Diagrams beyond the note

[visual.md](../../plugins/strategy-coach/skills/blueprint/references/visual.md) sets one source of
truth, the Mermaid in the note, and three optional renderings:

- **Artifact page** (unless `--visual none`): one page for the whole blueprint — domain sentence,
  actors, one section per process with its Mermaid, open questions. It loads `artifact-design`,
  then `/design-coach:artifact-style` when that plugin is installed. Same file path on re-runs so
  the URL is stable, and the URL is written into `overview.md` under `## Visual`.
- **draw.io** (`--visual drawio`): `docs/business/processes/<name>.drawio`, plain uncompressed XML
  with the generated-by marker as an XML comment. A fixed grid, because draw.io has no
  auto-layout: boxes `160×60`, columns step 240, rows step 120, at most 6 columns × 5 rows. More
  than 30 boxes is two diagrams. `NOT IN CODE` steps are dashed, `INFERRED` edges dashed grey. The
  XML is parse-checked before it is reported written. These grid numbers are duplicated in
  investigation-coach's `map` and CI checks the two copies agree
  ([check-manifests.js:266-289](../../.github/check-manifests.js)).
- **Miro** (`--visual miro`): only when Miro is already connected, detected passively. It never
  calls an authenticate tool, because that starts an interactive flow the skill would hang on. A
  missing Miro is one report line. When connected it uses the Miro plugin's own skills, one board
  per project, an actor-centric view rather than re-rendered flowcharts; the board URL goes under
  `## Visual`, and it never deletes a frame a person made.

### The scoring pass

Before anything is shown, the notes are graded 1-4 on five dimensions in
[review.md](../../plugins/strategy-coach/skills/blueprint/references/review.md), each with a
one-line justification: domain fit, concept coverage, evidence, depth, negative space. When
[analysis-coach](analysis-coach.md) is installed, the notes and rubric go to its `critic` agent, a
scorer that has not seen the reasoning behind the notes; otherwise the skill grades them itself.
Any dimension below 3 gets one revision pass aimed at that dimension, then it stops. The scores go
in the report, not in the notes ([blueprint/SKILL.md:90-98](../../plugins/strategy-coach/skills/blueprint/SKILL.md)).

### Frontmatter and the overwrite marker

These rules are shared by every note the plugin writes
([layout.md:3-15](../../plugins/strategy-coach/skills/blueprint/references/layout.md),
[layout.md:118-162](../../plugins/strategy-coach/skills/blueprint/references/layout.md)):

- **Frontmatter first, at byte 0.** Obsidian parses frontmatter only when the `---` block starts
  the file; a line above it discards every tag and alias.
- **The marker second.** `> Generated by /strategy-coach:<skill> · YYYY-MM-DD` sits directly below
  the frontmatter, or on line 1 when there is none — always within the first 10 lines.
- **The marker is the overwrite permission.** No marker means a person wrote the file: it is
  reported as skipped, never regenerated. Deleting the line makes the file yours.
- **Frontmatter holds only `tags:` and `aliases:`.** Tags come from a fixed vocabulary the graph
  view colours by: `business`, `process`, `onboarding`, `component`, `feature`, `study`.
- **Links:** wikilinks between vault notes; a link crossing directories is vault-absolute from
  `docs/` (`[[business/processes/checkout]]`) and never uses `../`, which Obsidian does not
  resolve. Links to files another skill owns, like `00-index.md`, use the plain markdown form.
- **No orphans:** every generated note keeps at least one outbound wikilink.
- **Filenames** sanitize `* " \ / : | ?` to `-`, keeping the real name in `aliases:`.

### Other rules it states

- `docs/00-index.md` belongs to `/atlas-coach:ingest`: link it, never touch it. Never rename or move
  an existing file.
- A missing Miro, a failed Artifact publish or an absent onboarding doc degrades the run; it never
  fails it. The notes are the deliverable.
- Re-running amends: hand-added sections are kept, and a previously documented process is never
  silently dropped.

## feature

**Invocation:** `/strategy-coach:feature <slug or description> [--prior-art] [--amend]`

Two documents for two readers: `spec.md` for people, `plan.md` for an agent in a fresh session on
a cheap model that cannot ask anything. The plan is not written until you have signed off the spec
([feature/SKILL.md:13-17](../../plugins/strategy-coach/skills/feature/SKILL.md)).

1. **Slug, and refuse to clobber.** If `docs/features/<slug>/` exists, stop; re-running needs
   `--amend`.
2. **Read context.** `docs/business/` and `docs/onboarding/features/<name>.md`, linked rather than
   restated. If `docs/business/industry.md` exists, an industry requirement that touches the feature
   but is missing from the DoD is a finding; regulatory rows stay `⚠ verify` and compliance is
   never claimed.
3. **Clarify** with AskUserQuestion. The four questions:
   - What outcome changes for whom?
   - How will we know it worked? (pushed until observable)
   - What is deliberately out of scope?
   - What has already been tried or rejected here, and why?
4. **Prior art** under `--prior-art`, at most 4 researchers, loading
   [prior-art.md](../../plugins/strategy-coach/skills/feature/references/prior-art.md): existing
   solutions and their licences, reference implementations, known failure modes, and domain rules.
   It uses atlas-coach's `researcher` when installed, inline reading under the same contract when
   not, and design-changing claims go through atlas-coach's `verifier`. Findings land only in
   Rejected approaches and Unknowns.
5. **Write `spec.md`** per [formats.md](../../plugins/strategy-coach/skills/feature/references/formats.md):
   goal, why now, a required cost-and-benefit table with who judged it worthwhile, scope in and
   deliberately out, rejected approaches, a definition-of-done table whose every row names a
   command, a test or `observable:` plus where to see it, and required Unknowns.
6. **Sign-off gate.** Show the goal, scope boundary, cost-and-benefit line and the whole DoD, with
   declining as an explicit option. `plan.md` is not written until the user answers.
7. **Write `plan.md`**: task, context table with `@path` references and a file to imitate, the DoD
   verbatim as "Done when", out of scope, what to return, unknowns carried into execution, and a
   changelog. Then `ENGINE prompt-check "<the plan's task statement>"`; flags mean ambiguity the
   executor will hit. The contract it follows is `/prompt-coach:dispatch`.
8. **Join the vault.** Append a row to `docs/features/index.md` linking the spec and the plan:
   create it if absent, amend it if it carries a `> Generated by /strategy-coach:` marker, skip it
   if not.
9. **Report and remember** the two paths, DoD row count, open unknowns, and how to execute it, then
   `ENGINE add reference "feature spec at docs/features/<slug>/ — <one line on the goal>" 0.75`.

Rules it states: no sign-off, no plan; no adjectives as criteria; `## Unknowns` is required in both
files and "none" is not an answer; `plan.md` assumes nothing from the conversation; prior-art claims
are sourced or `UNVERIFIED`; `--amend` regenerates both files together with a `## Changelog` line
and re-runs the gate, and a file whose marker was deleted is read-only input; it never writes under
`docs/onboarding/` ([feature/SKILL.md:68-87](../../plugins/strategy-coach/skills/feature/SKILL.md)).

## Configuration

None of its own. What changes its behavior is what else is installed: investigation-coach's
`scout` for code tracing, analysis-coach's `critic` for scoring, atlas-coach's `researcher` and
`verifier` for `--prior-art`, design-coach's `artifact-style` for the Artifact page, and a
connected Miro for `--visual miro`. Each is optional, and a missing one degrades the run. The
shared settings are in [engine.md](../engine.md#settings).

## Data it keeps

| What | Where | Committed? |
|---|---|---|
| Vault hub and conventions | `docs/home.md`, `docs/conventions.md` | Yes |
| Business notes | `docs/business/overview.md`, `actors.md`, `glossary.md`, `rules.md`, `processes/<name>.md` | Yes |
| Editable diagrams | `docs/business/processes/<name>.drawio` (only with `--visual drawio`) | Yes |
| Feature hub | `docs/features/index.md` | Yes |
| Spec and plan | `docs/features/<slug>/spec.md`, `plan.md` | Yes |
| Gitignore lines | `docs/.obsidian/workspace*`, `docs/.obsidian/cache/` appended to the repo-root `.gitignore` | Yes |
| Artifact page and Miro board | published outside the repo; URLs recorded in `overview.md` under `## Visual` | URLs only |
| `reference` memories (vault, blueprint, each spec) | the engine's memory database | User scope, under `~/.ai-coach/`; see [engine.md](../engine.md) |

## Limits and known issues

- **Scoring is one pass.** One revision per low dimension, then stop: the source paper iterated to
  4-of-4, which the skill calls a research budget, not a session budget
  ([review.md:41-43](../../plugins/strategy-coach/skills/blueprint/references/review.md)).
- **Concurrency:** at most 8 subagents in `/blueprint`, at most 4 researchers in
  `/feature --prior-art`.
- **draw.io files do not render on GitHub**; they need the VS Code extension, the desktop app or
  app.diagrams.net.
- **The overview template's process links are not vault-absolute.**
  [notes.md:46-47](../../plugins/strategy-coach/skills/blueprint/references/notes.md) writes
  `[[processes/order-checkout]]` from `docs/business/overview.md`, and the actors template does the
  same, while the conventions page says a link crossing a directory is vault-absolute
  (`[[business/processes/checkout]]`) ([layout.md:121-123](../../plugins/strategy-coach/skills/blueprint/references/layout.md)).
- **`/feature`'s ownership rule is narrower than what it does.** It says it owns
  `docs/features/<slug>/` only, yet step 8 appends to `docs/features/index.md`
  ([feature/SKILL.md:59-63](../../plugins/strategy-coach/skills/feature/SKILL.md),
  [feature/SKILL.md:86-87](../../plugins/strategy-coach/skills/feature/SKILL.md)); `formats.md`
  documents the index as shared with `/blueprint`.
- No open GitHub issue is filed against this plugin.

## Source map

- [`.claude-plugin/plugin.json`](../../plugins/strategy-coach/.claude-plugin/plugin.json) — manifest: version, dependency.
- [`skills/blueprint/SKILL.md`](../../plugins/strategy-coach/skills/blueprint/SKILL.md) — `/blueprint`: scaffold, domain, questions, mapping, drawing, scoring.
- [`skills/blueprint/references/layout.md`](../../plugins/strategy-coach/skills/blueprint/references/layout.md) — vault layout, `home.md`, `features/index.md` and `conventions.md` templates, frontmatter and link rules.
- [`skills/blueprint/references/notes.md`](../../plugins/strategy-coach/skills/blueprint/references/notes.md) — output contract: evidence vocabulary and the overview, actors, glossary, rules and process templates; Mermaid rules.
- [`skills/blueprint/references/review.md`](../../plugins/strategy-coach/skills/blueprint/references/review.md) — the five-dimension rubric and the one-pass revision.
- [`skills/blueprint/references/visual.md`](../../plugins/strategy-coach/skills/blueprint/references/visual.md) — Artifact page, `.drawio` grid, Miro detection.
- [`skills/blueprint/evals/evals.json`](../../plugins/strategy-coach/skills/blueprint/evals/evals.json) — trigger-accuracy prompts for blueprint versus feature and investigation-coach.
- [`skills/feature/SKILL.md`](../../plugins/strategy-coach/skills/feature/SKILL.md) — `/feature`: clarify, spec, gate, plan, index row.
- [`skills/feature/references/formats.md`](../../plugins/strategy-coach/skills/feature/references/formats.md) — `spec.md`, `plan.md` and `features/index.md` templates; the `--amend` flow.
- [`skills/feature/references/prior-art.md`](../../plugins/strategy-coach/skills/feature/references/prior-art.md) — `--prior-art`: four questions, bounds, verification.
