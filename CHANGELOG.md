# Changelog

Releases are git tags, one line per plugin: `{plugin}--v{version}`. Every plugin that changed in a
release is named with its number in that release's section.

## v1.10.2 — Commands that know their place (2026-08-29)

The first real run of `/ai-coach:wrap` hit a wall v1.10.0 had not tested: the command told the
model to run `/memory-coach:debrief`, and Claude Code refused — a skill marked user-only cannot
be fired by the model, even from inside a command the user typed. The docs go further, and it is
the right rule: the harness blocks the call **and instructs the model not to reproduce the
skill's steps another way**. Both escape hatches this release might have reached for are closed
by design, because "only you can fire a side effect" would mean nothing if a command could
re-implement the side effect inline.

**ai-coach 1.10.2**

All three commands are rewritten to their honest shape: they do their own reading, and they hand
you the firing lines.

- **wrap** runs the checks a person hits at the worst moment if nobody ran them early — the
  `whoami` identity gate, whether the session has any substance to conclude, the branch
  convention — then prints the one chained line that does the rest:
  `/memory-coach:debrief /memory-coach:handoff` (Claude Code runs skills the *user* names
  together in one message, up to six). Arguments are forwarded into the printed line, and the
  commit reminder still closes it.
- **start** detects instead of assumes: who is already registered, whether a project is declared,
  whether current onboarding docs exist, which plugins are installed — and prints only the steps
  this repo still needs, each ready to type, in the documented order. Day one on a documented
  project is two lines and a pointer, and the command now says so instead of re-generating docs.
- **sitrep** keeps everything that was already its own work — the raw engine reads (`stats`,
  `corrections --open`, `findings --open`, changed config rows, recent debriefs), the worst-first
  page, the absolute read-only rule — and stops claiming the two deep dives: it prints
  `/memory-coach:recall --health` and `/harness-coach:context` only when its own numbers say the
  dive would pay.

The lesson, recorded where the next release will trip over it: **a command orchestrates around
user-only skills, never through them.** What a command owns is detection, tailoring, gates
checked early, and exact invocations handed over — the runway, not the landing.

## v1.10.1 — The bill, measured at runtime (2026-08-29)

Five releases stated an "always-on" token figure — ~1,256, then ~2,200, ~2,590 — every one of
them counted from skill descriptions and calibrated against `claude plugin details`, this repo's
own stated instrument. A user's question ("why is partners a skill if only I can invoke it?")
forced the measurement nobody had run: what does the **model** actually see?

**ai-coach 1.10.1**

### The differential

A live session was probed with positive controls: asked which of eight named items were visible
in its context, it reported exactly two — `recall` and `dispatch`, the only skills without
`disable-model-invocation: true` — and none of the six user-only skills and commands it was asked
about. The agents load (they appear in a session's agent list); user-only descriptions do not.

So the real bill is **~700 tokens per session**: two auto-invocable skills (~190) and six agents
(~510). The other twenty-two skills and all three commands cost nothing until invoked — their
descriptions live in the `/` menu, not in the model's context.

### What that corrects, and what it vindicates

Corrected: the README's cost section, and the landing page's — both had presented the projection
as "added to every session", roughly four times the measured number. The projection tool itself
is the trap: `claude plugin details` reports every description as always-on regardless of
`disable-model-invocation`, and even lists the bundle's commands under "Skills (3)" with a ~172
projection. It remains the right instrument for per-component sizes; it is the wrong one for
"what does a session pay".

Vindicated: the bundle's claim — three commands, "still adds nothing to the model's context at
session start" — is true at runtime, and the checker's rule enforcing `disable-model-invocation`
on every command is what keeps it true. Also standing, and now with the mechanism visible: the
description-trimming discipline of v1.6.0 and v1.9.0 was still worth it — but for `recall`,
`dispatch` and the agents it is load-bearing, and for everything else it buys a tidier `/` menu.

No code changed. The numbers did.

## v1.10.0 — Three commands (2026-08-28)

Twenty-two of the twenty-four skills are user-only, so almost everything here was already a
command with a better body. What nothing owned was the *sequences* — the chains that span
plugins, documented in prose and typed as two, three, four namespaced invocations by exactly the
people least likely to know the names. Chains inside one plugin became flags releases ago
(`--tour`, `--triage`, `--scaffold-only`); the cross-plugin ones had no home, because no coach
can own another coach's skills. One plugin knows all nine exist: the bundle, which until now
shipped nothing.

**ai-coach 1.10.0**

### /ai-coach:wrap

`handoff`'s own documentation orders the ending of a piece of work — debrief first, "or the seed
carries attribution without the reasoning behind it". That ordering is now typed once. It adds no
behaviour: the debrief draft is still shown before publishing, `whoami` still stops the export
over a missing identity, declining either gate is an outcome the command reports rather than
argues with, and it closes by printing the one command it will never run for you —
`git add .ai-coach/team-seed.jsonl && git commit` — because knowledge enters git when a person
decides it does.

### /ai-coach:start

Day one was four invocations across three plugins in a documented order: who you are, what the
product is, the onboarding tour, optionally the business blueprint. The command is the sequence
and nothing else — every step keeps its own questions, the cost is stated before anything runs,
`blueprint` stays behind `--with-blueprint` because defaulting into it would double the bill
uninvited, and a repo that already has current docs shrinks the whole thing to identity plus a
pointer.

### /ai-coach:sitrep

The morning read: memory health, the context bill, open security findings oldest-first, and the
`ENGINE stats` line verbatim. One page, worst first — ordered by the same priority ladder the
coach line uses, because it is the same judgement. **Read-only is absolute**: every
recommendation is a command the user could paste, never an action taken, and two sections that
disagree are reported as their own finding rather than papered over.

### The bundle's claim, restated honestly

"Ships no components, costs nothing at session start" was the bundle's one line, and it changes:
it ships three commands now. The cost claim survives because commands are user-only — no command
description enters the model's context — and the checker enforces that rather than trusting it:
`disable-model-invocation: true` is required on every command, along with frontmatter, the
description ceiling, and a partial-install line, since a command that sequences three plugins has
to say what happens when one is missing. The checker also resolves `/plugin:name` references
against commands now, not just skills — it caught its own gap the first time a command referenced
another one.

## v1.9.0 — Four more agents (2026-08-27)

The marketplace had two agents and one argument for them: some work is better done by a context
that is not yours. Researcher, because reading the web should not cost the session that asked;
verifier, because a judge that has seen your reasoning inherits your anchoring. That argument was
already being half-applied everywhere else — three skills said "sweeps go to Explore subagents",
two skills graded their own work, /scan read hostile content into the session it was protecting,
and /ingest fed 200-page PDFs through the caller's window twenty pages at a time.

Four agents finish the thought. Each is the isolation argument in one of its three forms: reading
you should not pay for, judgement that must not be anchored, and quarantine.

**atlas-coach 1.2.0 · investigation-coach 1.4.0 · security-coach 1.2.0 · analysis-coach 1.1.0 ·
strategy-coach 1.4.1 · ai-coach 1.9.0**

### scout — reading you should not pay for

The token-heaviest skills in the marketplace — onboard, map, study — relied on the harness's
generic Explore agent: not guaranteed to exist everywhere, and bound by no evidence contract.
`scout` is investigation-coach's own: read-only sweeps, sonnet-pinned like researcher because it
is the fan-out cost multiplier, and its contract is the point — max 500 words, every claim
`file:line` or `INFERRED`, honest counts, no opinions, a required closing line naming what it
could not determine. Five consumers: the three investigation skills spawn it directly;
blueprint's code-tracing and translate's idiom survey name it behind the standing convention —
use it when installed, do the same inline when not.

### examiner — quarantine

/scan's judgment step said "read the flagged file yourself" — pulling suspected injection content
into the exact session the spotlight hook exists to protect. `examiner` reads the suspect in a
disposable context whose tool list is the security boundary: Read and Grep, **nothing else**. No
WebFetch or WebSearch, so content that tries to exfiltrate or pull a second stage has no tool to
do it with; no Bash, so an embedded command has no shell; no Write, so nothing it reads persists
anything. One verdict per hit with the shortest quote that proves it, uncertain lands on
suspicious never on benign, and pasted content stays judged inline — it is already in the
session, so quarantine is moot and the skill now says so.

### critic — judgement that must not be anchored

insight's critique pass and blueprint's self-scoring were the same weak shape: the context that
produced the work grading the work. `critic` receives the work and the rubric, never the chain of
thought — callers are told to withhold it, the agent is told not to ask. It reads the rubric
before the work, recomputes what can be recomputed, attacks the headline finding hardest, and
returns ranked revision demands rather than edits, because the fixing belongs in the author's
context where the domain knowledge lives. No model pin — the verifier's rule: the judge must
never be weaker than the session trusting its verdicts.

### reader — the largest context spend, moved out of your context

A PDF with no converter was read into the calling session twenty pages per call — a 200-page
document is the single biggest context hit anything here can cause. `reader` does the batched
reading in its own window, haiku-pinned because transcription is mechanical, and hands the
markdown to `INGEST write --body-file`. It returns a receipt, not the content: pages read, batch
count, and anything that did not survive transcription by page number — silence about page 40
reads as "page 40 is in there", and that is the one lie an ingested corpus cannot carry.

### The bill, and the checker

Six agents now. Always-on cost ~2,200 → ~2,590; each agent's description was trimmed to the
researcher/verifier weight before shipping rather than after someone noticed. And
`check-manifests.js` lints agents the way it lints skills — frontmatter present, name matching
the filename skills spawn it by, description under the ceiling with a trigger phrase, and a tools
list, because an agent with every tool is an agent nobody scoped.

## v1.8.0 — analysis-coach (2026-08-27)

Everything in this marketplace so far serves the person writing the code. The work that decides
*what* the code should do — pulling requirements out of people who have not had to be precise yet,
reading data without describing it, and writing the version a decision-maker will actually read —
had no home here.

**analysis-coach 1.0.0 · ai-coach-core 1.6.1 · ai-coach 1.8.0**

Three skills, one plugin, no code: `elicit`, `insight`, `story`. Inward and evidence-first —
competitors and industry rules belong to `/atlas-coach:market`, and that boundary is in the
description rather than in a paragraph someone has to find.

### `/elicit` — the questions before the specification

Stakeholders as *decisions with owners* rather than a list of names: a role earns its line by
being the only one who can answer something. Then stories in one fixed form, and acceptance
criteria as checks — every criterion names an observable, and one that cannot fail is a
description of the happy path rather than a criterion. What cannot be made checkable moves to Open
questions with the person who has to settle it, because an untestable requirement is usually an
undecided one wearing a testable shape.

It stops before the design. `/strategy-coach:feature` reads this document as its input.

### `/insight` — an analysis that has already been argued with

Pointed at a spreadsheet, a model describes it. The pipeline here follows *Data-to-Dashboard*
(Zhang & Elhamod, arXiv:2505.23695, May 2025), whose agents do "domain detection, concept
extraction, multi-perspective analysis generation, and iterative self-reflection": name the domain
and the decision first, read the shape and the *gaps* before any value, then generate three
deliberately different readings — the obvious one, one from another dimension, and one that would
be bad news — and attack all three in writing before the user sees any of them. The critique is
written down and fed back in, which is Reflexion's actual mechanism (Shinn et al.,
arXiv:2303.11366, NeurIPS 2023) rather than re-reading and hoping.

Dropped readings stay in the document with the reason. "No reading survived scrutiny" is a real
result and a better one than a confident wrong answer.

Two labels from this release's own plan did not survive verification and are not in the skill: the
paper says "multi-perspective analysis generation", not "three-lens analysis", and its
self-reflection step is not the Reflexion framework — that is a separate paper, cited separately.
The plan asserted both. Checking them cost one agent run.

### `/story` — the version that gets read

Re-orders an analysis into the order a decision-maker needs — the answer, three evidenced
supports, the ask, then only the caveats that would flip the recommendation. It never introduces a
claim the source does not carry, and it never drops a caveat to make the story cleaner, which is
the specific way this task fails and it fails silently, because the result reads better than the
honest version. Under 150 words by default; if the finding cannot be made honest at that length,
the length rule loses.

### A real failure, found while building this

Writing these skills meant running the engine, and one of those runs failed to store what it had
learned: `table memories has no column named workspace`. The cause is a genuine hazard rather than
a one-off. The engine copy at `~/.ai-coach/bin/` comes from whichever plugin build last ran
SessionStart, so an installed plugin and a repo checkout can disagree about the schema — and
v1.5.0's migration **drops** columns an older build still writes. The older engine then fails on
every write, with an error that reads like a corrupt database.

`open()` now checks the stamp in the other direction: a database written by a newer AI Coach than
the running engine says so once, on stderr, naming both versions and how to fix it, and then opens
anyway. Reads mostly work, and refusing to open would take a session's whole memory away over a
version number. If you are seeing that error today, the fix is `claude plugin update ai-coach`.

### On sources

`elicit`'s reference file attributes Given/When/Then to Gherkin and Dan North's BDD work rather
than to a standards body, because it is not a BABOK standard and is often cited as though it were.
Likewise: the Scrum Guide defines a Definition of Done and does not define a Definition of Ready,
so a team's DoR is a local agreement to surface, never a rule they are failing.

## v1.7.0 — Context economics (2026-08-27)

Context is the one resource a session spends continuously, that everything draws on, and that
nothing reports until it runs out. Then the session compacts, the thread gets vaguer, and the model
gets blamed. Nothing in this marketplace owned that — it was the largest gap in the suite and the
one with no obvious home, which is usually the same thing.

**ai-coach-core 1.6.0 · harness-coach 1.1.0 · ai-coach 1.7.0**

### `/harness-coach:context`

Itemizes the bill. It reads the live `/context` breakdown rather than estimating it, names the
largest line instead of the easiest one — for most sessions that is tool results, not conversation
— and answers the question people actually have, which is whether to `/clear` or let it compact.
The table is four rows because there are four real situations, and the underused answer is `/clear`
when the next task is unrelated to this one.

`--plugins` itemizes always-on cost per installed plugin via `claude plugin details`, worst first,
including this marketplace's own. A plugin whose description you cannot connect to work you do is a
plugin to uninstall, and this suite is not exempt from that test.

It never runs `/clear` itself. That discards the user's session, so it says when it is right and
lets them decide.

### The working state a summary drops

Compaction re-fires SessionStart, and since v1.4.0 that hands back a quarter-size brief. But a
brief is *memory* — durable facts, ranked. What compaction actually discards first is the boring
continuity nobody would think to keep: which files this session has been in, what broke ten minutes
ago, what is still open. None of that is durable enough to be a memory, and all of it is needed on
the very next turn.

A new `PreCompact` hook writes it down, and the SessionStart that follows hands it back — once, then
deletes it, because a snapshot that survives belongs to a session nobody is in any more. It is rows
the engine already has, formatted: no model call, so it cannot fail, cost anything, or be wrong in
an interesting way.

## v1.6.1 — Repo trust (2026-08-27)

The tests were good at what they covered and silent about what they did not, and the gaps were not
random: they were exactly the mechanisms nobody re-reads because they have always worked. Writing
those tests found a performance fix that had never actually worked.

**ai-coach-core 1.5.0 · ai-coach 1.6.1**

### The optimization that was never applied

v1.4.0 replaced two `git` spawns with direct reads of `.git`, and measured a 44% saving. Half of it
was not real. `gitConfigValue` normalized a section header as it read it out of the file — quotes
stripped, whitespace collapsed, lowercased — and then compared the result against the caller's
`remote "origin"`, quotes and all. That comparison could never be true, so **every lookup of the
origin URL fell through to spawning `git` anyway.** The fast path had never once returned a value,
and nothing failed, because the fallback is correct: it was simply slow.

Both sides are normalized now. Measured on Windows, median of 15 fresh processes resolving the
origin of this repo, same machine, same payload:

```
before  median 242.6ms  (min 170.4, max 347.5)   spawns git
after   median  79.4ms  (min  69.7, max  94.9)   reads .git/config
n=15, saved 163.2ms/call (67% faster)
```

`observe.js` resolves the repository on every Edit, Write and Bash, so this is paid per tool call.

### Tests for the things nobody re-reads

- **`bootstrap()`** — every skill in seven plugins reaches the engine at one fixed path, and one
  line puts it there. It had no test at all. Now: the copy lands, the schemas land beside it, a
  stale copy is refreshed rather than left, and the installed copy runs where it lands.
- **The git identity trio** — `gitPaths`, `originUrl`, `headBranch` across a repo with a remote, a
  subdirectory, a detached HEAD, a worktree pointer file and a directory that is not a repository.
  The CHANGELOG said these were verified by hand across those six shapes; the verification left
  nothing behind, and the bug above is what that costs.
- **`default_trust: workspace`** — the branch that inverts a SQL `NOT IN` into an `IN`. Never run.
- **The schema stamp**, **`clampTs`**, and **log rotation** — the last of which was fixed once
  because it broke, and then had no test to keep it fixed.
- **`check-manifests.js` itself.** A lint that silently stops checking passes every time, so it now
  has a suite that breaks the repo in seven specific ways in a throwaway copy and asserts the
  checker notices each one.

### What the checker checks now

Frontmatter on every skill: a description exists, is under the 1,024-character ceiling, carries a
trigger phrase, and has no angle brackets. **Every `ENGINE <verb>` a skill calls is dispatched by
the CLI** — that surface is the real cross-plugin ABI and a rename broke it silently. Every
`/plugin:skill` reference names a skill that exists, while a sentence about a *retired* skill is
recognized as documentation rather than a dangling link. And the draw.io grid spec, which two
plugins must each carry because neither can read the other's files, is checked constant by
constant — the two copies had already drifted.

CI gains the `permissions:` and `concurrency:` blocks it never had, and an explicit FTS5 probe that
says what is wrong instead of failing three tests deep.

### Dead weight

`auto-seed` is gone — the command, the `seed_auto` setting, its manifest entry and its README row,
all of which outlived by five releases the hook that used to call it. `memories.concepts`, declared
in v0.1.0 and never written or read, is no longer created. `memories.uses` was the opposite problem:
incremented on every read since v0.1.0 and used by nothing, so it now feeds a small saturating
ranking bonus — worth about 20% at ten reads, never enough to outrank confidence.

New: a distilled memory that nobody has ever recalled is deleted 90 days on. Deliberately narrow,
because deleting knowledge is the one irreversible thing here — never a memory a person wrote,
never one a teammate handed over, and never one that was recalled even once.

Also: `FAIL ` and `INJ ` are constants rather than eight scattered literals, the log follows
`AICOACH_DB` into an isolated tree, releases from v1.4.0 are tagged again, and the stale search
index in this repo — 218 paragraphs from files that no longer existed — was rebuilt by the
`reindex` its own `stats` mode now recommends.

## v1.6.0 — Fewer, sharper skills (2026-08-27)

Twenty-three skills, seven of them narrower than a skill needs to be: a folder-scaffolder whose
whole job was to run immediately before another skill, a health report separated from the search it
reports on, two thin wrappers around one engine command each, and a skill called `analyze` that did
three unrelated things. Meanwhile `market` — competitor research, spawning atlas-coach's agents,
sharing no file with anything beside it — sat in the plugin about documenting *this* business.

Twenty skills now, and the always-on cost went from ~1,880 to ~1,770 tokens even after adding
routing exclusions to the descriptions most likely to be mistaken for each other.

**ai-coach-core 1.4.0 · memory-coach 1.3.0 · prompt-coach 1.1.2 · security-coach 1.1.0 ·
harness-coach 1.0.4 · investigation-coach 1.3.0 · atlas-coach 1.1.0 · strategy-coach 1.4.0 ·
ai-coach 1.6.0**

### Where things moved

| Was | Is | Why |
|---|---|---|
| `/strategy-coach:market` | `/atlas-coach:market` | It spawns atlas's agents and reads the outside world. atlas-coach *is* "everything outside the repo"; strategy-coach is now purely inward. |
| `/strategy-coach:vault` | `/strategy-coach:blueprint` step 0, or `--scaffold-only` | Its entire documented job was to run immediately before blueprint. |
| `/memory-coach:doctor` | `/memory-coach:recall --health` | The health of the memory belongs beside the search of it — and it moves off Haiku, because deciding two memories cannot both be true is analysis, not formatting. |
| `/memory-coach:team` + `:project` | `/memory-coach:roster` | Two committed files answering one question: who we are, and what this project is. |
| `/atlas-coach:analyze` | `/atlas-coach:translate`, plus `ingest stats` | Three unrelated verbs. `verify` was research's claim gate described a second time — it is now one line in `references/verdicts.md`; `stats` belongs to the skill that owns the corpus. |

Old trigger phrases were kept on whichever skill absorbed the work, so "set up the docs vault" still
reaches something and "check my memory" still runs the health report.

### Two things a merge does not do

`/investigation-coach:study` was on the cut list and stays. The reason to merge it was a broken path
— it wrote `./study/` while four files read `docs/study/` — and v1.5.1 fixed that properly. What is
left is a clean Diátaxis split (onboard = tutorial, map = the picture, study = explanation) with
real hand-offs between the three, and merging it would have traded a working boundary for a smaller
number. `/investigation-coach:onboard --tour` runs all three in the documented order instead.

`prompt-coach` keeps its three. "Write me a prompt" and "which of my habits costs me the most" are
different questions asked at different moments, and folding the second into the first would have
saved ~50 always-on tokens at the cost of the trigger that finds it.

### Descriptions that say what they are *not*

The failure mode of a suite this size is two skills whose descriptions both plausibly match. The
pairs that actually collide now carry exclusions — `recall` says it is not for editing the roster,
`blueprint` says it is not for how the code works, `translate` says it is not for checking whether a
claim is true — and the investigate-versus-strategize test ("how does X work here" → investigate,
"what should we build" → strategize) moved out of one skill's closing prose into both descriptions.
Three skills ship `evals/evals.json` files pinning those boundaries.

### Two chains that were documented but not runnable

`/security-coach:audit --triage` hands confirmed findings straight to triage instead of asking for a
retyped command. `/investigation-coach:onboard --tour` runs onboard, then map, then study — the
order three files already recommended, on the grounds that the later two read what the first wrote.
Both still ask before doing anything with side effects; the flags remove typing, not decisions.

## v1.5.1 — Say what is true (2026-08-27)

A settings table that a skill could not read, a switch documented as cosmetic that quietly deleted
evidence, a reference file holding a skill's entire output format that nothing ever loaded, and a
scanner that threw a stack trace at the exact file it advertises. None of it failed loudly. All of
it disagreed with what this product says about itself.

**ai-coach-core 1.4.0 · memory-coach 1.2.1 · prompt-coach 1.1.1 · security-coach 1.0.1 ·
harness-coach 1.0.3 · investigation-coach 1.2.1 · atlas-coach 1.0.1 · strategy-coach 1.3.1 ·
ai-coach 1.5.1**

### A setting only half the product could see

Claude Code passes plugin settings to hook processes, MCP servers and LSP servers — and to nothing
else. Every skill here reaches the engine by shelling out to `node ~/.ai-coach/bin/engine.js`,
which is a Bash call, so not one of those settings ever reached it. The consequence was two answers
to the same question: `default_trust: workspace` held a teammate's memories out of the session
brief and then ranked them normally in `/memory-coach:recall`, and `brief_chars` was ignored
entirely by `/memory-coach:doctor`, which asked for a brief and got the built-in 4000.

The session-start hook is one of the processes that *is* told, so it now writes what it was told to
`~/.ai-coach/settings.json`, and every later process reads it. An `AICOACH_*` variable still wins.
The file is rewritten whole on every session start, so clearing a setting in `/plugin` clears it
here too — a snapshot that only ever gained keys would outlive the choice it recorded, which is
worse than not having one. `config` names the file in the `set by` column, because "you chose this,
and this process learned it second-hand" is a different state from "nobody ever set it".

### `coach: off` was never display-only

`plugin.json` says display only. The README says silencing a display line should not quietly empty
the evidence. The hook exited before recording the prompt signal, so turning off a one-line hint
stopped `/prompt-coach:prompt-stats` collecting the only data that could ever justify that hint.
Recording now happens before the display switch is consulted, where it always belonged — signal
names only, never prompt text, exactly as before. `corrections` remains the switch that stops
recording, and the suite now asserts the distinction from both sides.

### Everything else that was not true

- `injection-scan` on a file over 512 KB — "a README from a repo you are about to vendor", which is
  the use `/security-coach:scan` advertises — threw out of `safeRead` and printed a Node stack
  trace. The CLI now answers in one sentence, names the limit, and exits non-zero. Every other
  command got the same treatment: a skill can act on a message and can do nothing with a stack.
- `/strategy-coach:blueprint` never loaded `references/notes.md`, the file holding its evidence
  vocabulary, all four document skeletons and the ⚠-verify discipline. One line, and the skill's
  entire output contract is reachable again.
- `/investigation-coach:study` wrote to `./study/` while four files in strategy-coach read
  `docs/study/`. It writes `docs/study/` now: `/strategy-coach:vault`'s hub link resolves and
  `/strategy-coach:blueprint` can find the material it was told to read.
- `/security-coach:triage` stamped every finding `pentest`, including findings handed to it by
  `/security-coach:audit`. The source is the caller's now — the engine already understood all four.
- `/harness-coach:partners` offered seven tools from a catalog of nine; miro and draw.io were
  unreachable unless you already knew their names.
- `brief_chars` is clamped to the 500–16000 the manifest advertises, `default_trust` falls back to
  `full` only for values it recognises, a memory with no confidence is worth 0.7 everywhere
  instead of 0.7 in two places and 0.5 in the ranking, and the seed stamps the schema version it
  can actually know instead of a marketplace number pasted in by hand.
- `AICOACH_DB` now gives the isolated tree the README promises: the log moved with it, having
  pointed at the real `~/.ai-coach/log.jsonl` all along.
- The session-end distiller passed a project key where `add()` documents a working directory, and
  landed on the right project by accident.

### The check that would have caught this release's own drift

`ai-coach` shipped as 1.4.0 while the marketplace and the CHANGELOG both said 1.5.0. Every existing
check passed: each number was well-formed, and the dependency majors agreed. `check-manifests.js`
now requires the marketplace version, the bundle version and the newest CHANGELOG heading to be the
same release, requires that section to name each plugin at the version it actually ships, and
rejects a dependency floor that is ahead of what the marketplace has.

## v1.5.0 — One place per fact (2026-08-24)

Identity was recorded three times. A memory carried an email, a name and a role; so did a session;
so did a debrief; and the seed that moved them between machines repeated all three on every row.
Change your role and the database disagreed with itself for as long as the old rows lived. Whether
a teammate's memory was held back was stored on the row too, frozen at import — so raising someone's
trust did nothing until you remembered to re-import their seed, which is the step everybody forgets.

**ai-coach-core 1.3.0 · memory-coach 1.2.0 · investigation-coach 1.2.0 · ai-coach 1.5.0**

Schema version 2. Existing databases migrate when they are next opened: the names and roles sitting
on those rows are read into `authors` first, and only then are the columns dropped. A `PRAGMA
table_info` check and a per-column `try` mean a build that refuses `DROP COLUMN` leaves the column
behind unread rather than failing the open and taking the session's memory with it.

### A person is stated once

New `authors` table, keyed on the git email — the one identifier that is stable across machines.
`memories.author`, `sessions.author` and `debriefs.author` are foreign keys into it, both of the
hot ones indexed, and **the foreign keys are enforced**: `PRAGMA foreign_keys=ON` after migration,
never during. A declared constraint that nothing checks is a comment, so every write path that
stamps an email now registers the person first. The suite proves it by having caught a test that
wrote an unregistered author.

`.ai-coach/team.md` stays the shared source of truth and now genuinely is one: session start
refreshes `authors` from it, and an import prefers it over whatever the seed claimed.

**The trade, stated plainly: role is current, not historical.** `/recall --role qa` used to mean
"written while they were QA" because the role was snapshotted onto every row. It now means "written
by people who are QA now". Correcting one line in `team.md` corrects every row that person ever
wrote — that is the point — but dated role history is gone. If it is ever wanted back, the
normalized answer is an `author_roles(email, role, from, to)` table, not a column back on memories.

### Holding a teammate's memory is a fact about your trust, not about the memory

The `workspace` column is gone. Whether a row is held is computed from your trust in its author as
the row is read, which fixes the behaviour the old design could not: `/memory-coach:team trust
<email> full` now lifts everything of theirs you already hold, immediately, with no re-import. The
confidence cap moved with it — stored confidence is what the seed said, and the cap is applied at
read time, so it tracks your current opinion instead of the one you held at import.

The label in `/recall` is `[held]`, not `[workspace]`. A re-import still repairs a confidence that
an older engine wrote capped onto the disk, since that number had no way back otherwise.

### Seed format 3

Authors travel as their own `kind: 'author'` rows and every other row carries the email alone. Those
rows carry no `text` key, so the compatibility rule that governs this format still holds: an older
importer walks past them and reads every memory exactly as before, rendering teammates by email
instead of by name until it upgrades. In the other direction a format-2 seed still imports with
names intact — the inline fields it repeats on every row are harvested into `authors` on the way in.

### The branch is what groups the work, so the branch name has to mean something

`task` is the branch, and a memory filed under `my-stuff` is one nobody finds next month. A project
declares its convention in the committed `.ai-coach/project.md`:

```markdown
branches: feat/ fix/ chore/ docs/ refactor/
```

With no line declared, the common prefixes are the default. A branch that matches neither is
mentioned **once**, at session start, and then recorded as it is — this is a convention, not a gate,
and nothing is ever blocked over a branch name. `/investigation-coach:onboard` detects what a repo
already does and offers to write the line; it will not invent a convention nobody agreed to.

### One name per session, and no skill to set it

Claude Code names every session, shows that name in the status line, and lets you rename it. AI
Coach adopts it at session start — it already did — and now checks again at session end, which is
what catches a rename made in between. A new `name_source` column ranks `user` over `claude` over
our own branch-and-author fallback, so a name someone typed is never overwritten by a derived one.
`ENGINE name` survives as an escape hatch; the step telling `/handoff` to call it is gone, because
there is nothing left for it to do.

### /handoff asks who you are before it exports

`ENGINE whoami` now returns a `missing` list — email, name, role, project name — and `/handoff`
stops and asks for whatever is on it. A seed is a file other people read, and work that arrives with
no name and no email attached is work nobody can ask you about. It reports the branch check too.

## v1.4.0 — Hooks that get out of the way (2026-08-23)

Every hook here runs as a fresh process, and `observe.js` runs on every Edit, Write and Bash. That
process was paying for a `git` spawn, a full schema exec and ten `PRAGMA table_info` probes before
it wrote its single row — work whose answer had not changed since the last tool call. Nothing about
it was visible: it never failed, it just made every tool call slower on the machines least able to
afford it.

**ai-coach-core 1.2.0 · ai-coach 1.4.0**

Measured on Windows, median of 25 fresh `observe.js` processes against a warm database, same
payload, same machine — `head` is the previous release, `work` is this one:

```
head  median 738.6ms  (min 490.9, max 1599.4)
work  median 414.5ms  (min 262.9, max 1028.9)
n=25, saved 324.1ms/call (44% faster)
```

### The database already knows its own shape

`open()` ran `schema.sql` and then `migrate()`'s ten `PRAGMA table_info` probes on every single
open, on every hook process, forever — to discover each time that everything already existed. It
now stamps `PRAGMA user_version` and returns immediately when the stamp is current. The stamp is
written **last**, so a throw part-way through leaves the database unstamped and the next open
retries the whole setup rather than trusting a half-built schema.

### Reading .git instead of spawning it

`repo()` and `task()` shelled out to `git remote get-url origin` and `git rev-parse --abbrev-ref
HEAD`. Both answers live in plain files, so they are read directly now — and the real `git` is
still the fallback for every shape the parser does not cover: worktrees and submodules (a `.git`
*file*, not a directory), detached HEAD, `url.insteadOf` rewrites, unreadable configs.

Identity is what the tenant database is keyed on, so a changed answer here would silently file
memories under a different project. Verified identical to the previous release across a repo with a
remote, a repo without one, a subdirectory, a non-repo directory, a detached HEAD and a linked
worktree.

### One `claude -p` call, one cooldown per feature

Plan review (`prompt.js`) and session-end distillation (`session-end.js`) each carried a copy of
the same spawn block **and shared one cooldown file**. So a distillation that timed out at the end
of a long session silently disabled plan review for the next hour, and a failed judge silently
disabled distillation — two unrelated features behind one switch, in opposite directions.

Both now call one `engine.claudeRun(feature, …)`. The cooldown is per feature. The one case that
still backs off everything is a `claude` that cannot be run at all: that is the CLI's problem, not
one feature's. `shell: true` turns a missing binary into the shell's own error rather than an
`ENOENT`, so that case is detected on the shell's message and exit status.

### A brief that survives a bad row

Three of `brief()`'s sections were unguarded, so one SQL error anywhere threw out of the whole
function: the session started with no brief at all, and nothing said one was owed. Each section is
guarded on its own now — a bad row costs you that section.

The branch queries read every session and memory on the branch to print a handful; both are bounded
now. Ranking of top memories stays whole-corpus by design — an old but strong memory must still be
able to win — so the cap there is a safety valve at 5000 rows and is marked as one.

### Compaction gets a brief it does not pay for twice

`SessionStart` fires again on compaction, and it was re-injecting the full ~1k-token brief every
time — repeatedly, in the one session that has already proven it runs long. Dropping it outright
would have been worse: compaction is exactly the moment that context was summarized away. So
compaction now gets a quarter-size brief and none of the onboarding nudges, which are not
continuity and are pure noise there.

### Smaller things

- The spotlighting reminder is ~480 characters of model-facing context and it said the same thing
  on every hit. Full text on the session's first flagged result; after that, the flags and one line
  saying the rule already applies.
- `claudeSessionName()` read every file in `~/.claude/sessions` to find one session — a session
  start that got slower the longer you had used Claude Code. Newest 25 by mtime.
- `sessionLabel()` re-prepared its clash query once per printed row; memoized.

## v1.3.0 — What the business is, and what comes next (2026-08-22)

Six plugins document the code, the session, the prompts and the world outside the repo. None of
them documents the **business**: who the actors are, what the processes actually do, which rules
are enforced in code and which live in someone's inbox. Nothing turns "we need partial refunds"
into a specification with a definition of done and a plan a cheap model can execute unattended.
And nothing looks outward at who else is solving the same problem.

Four skills, in the order you would use them: `vault` prepares the place, `blueprint` documents what
exists, `market` looks outward — at competitors, at the industry's own rules, and at how that
industry already solved the gap you are stuck on — and `feature` specifies what to build.

**strategy-coach 1.3.0 · investigation-coach 1.1.0 · harness-coach 1.0.2 · ai-coach 1.3.0**

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

### `/strategy-coach:market`

Competitive analysis fails in a specific way: it produces an accurate document that changes no
decision. The feature matrix answers "what do they have?", which is not the question anyone needed
answering. So this skill inverts the shape — features are inventory, and the finding is what every
competitor's users complain about, because that is a gap demonstrated rather than asserted.

The source hierarchy is written into the skill rather than left to taste. A vendor's own page is a
**claim**; an issue tracker, changelog or postmortem is **evidence**; and the output labels which is
which per row. The default assumption inverts the usual one: a missing feature is better evidenced
by a user asking for it than by the vendor not listing it. Everything carries the date it was
checked, because competitor facts decay in weeks.

A gap has to pass three tests, all required — demonstrated demand, consistent absence, and a reason
*we* could serve it. Missing the third makes it a wish; missing the first makes it a guess. And
**"no defensible gap found in this pass" is a valid deliverable**: manufacturing a differentiator to
fill out a document is how a strategy document becomes actively harmful.

Claims that would change a decision go through `atlas-coach:verifier` before they do; `PLAUSIBLE`
is written as `UNVERIFIED`. Failed claims are listed rather than deleted, so the next refresh does
not rediscover them as new — and a competitor that later *ships* the thing you built a strategy
around shows up as a `## Superseded` diff instead of vanishing.

Two of the six ingested sources were competitive-analysis frameworks, and they are the reason this
skill is shaped against them: both supplied procedure with no measurement, and neither weighted its
sources or dated a single claim. The prompt templates were useful as raw material; the method is
not inherited.

### `/strategy-coach:market --industry` and `--gap` — the rules of the game

Competitors are *who*. The industry is *the rules everyone plays by*, and those are the constraints
a project most often discovers late and expensively. `--industry` writes `docs/business/industry.md`
across six families: regulatory, standards, conventions, commercial, operational, and — the one
nobody documents — **anti-patterns the industry tried and abandoned**. Each row carries a **We**
column: `file:line`, `INFERRED`, or `NOT IN CODE`. A `NOT IN CODE` beside a regulatory row is the
most valuable cell this plugin can produce.

`--gap "<the gap>"` is the mode to reach for when `blueprint` surfaced a step that exists in the
business and nowhere in the code. It searches for **precedent before proposing anything**, then
classifies the answer honestly — *converged* (one dominant approach), *divergent* (real trade-offs,
report them rather than picking a winner), *regulated* (the answer is dictated; stop guessing),
*unsolved* (the industry has not cracked it either), or *dissolved* (the problem is avoided upstream
— usually the best answer available). Only when nothing is found does it propose, labelled
`NO PRECEDENT FOUND — proposal` with the trade-off it accepts and the smallest thing that would
disprove it. A proposal offered where precedent exists is negligence; one offered where none exists
is the job.

The answer is written back into `industry.md`, so the next gap search finds it instead of re-running
the research. Where it becomes work, it hands off to `/feature`.

**On regulatory claims, the skill is deliberately timid.** Every regulatory row is marked
`⚠ verify` — meaning a qualified professional must confirm it before anyone relies on it — the note
says so in its own text, and **it never states that this project complies**. A regulation summarized
by a language model from secondary sources is the start of a conversation with counsel, not a
substitute for one. This is the one place in the marketplace where being useful and being cautious
genuinely conflict, and caution wins.

`industry.md` also draws the line `rules.md` could not: rules *we* chose live in `blueprint`'s note,
rules *imposed on us* live here, and confusing the two is how a convention gets defended as law.

### Diagrams you can hand-edit, without a subscription

Miro solved a real problem — a diagram a product owner can drag boxes around in — and priced it
per editable board, so a team that documents on Miro meets a paid plan quickly. That is a bad
dependency for documentation that has to outlive the project.

So the renderer is now a choice, and `.drawio` is the free answer to the same problem: plain
uncompressed XML, committed to the repo, diffing in a pull request, editable by anyone with a free
viewer and no account.

| | Mermaid | draw.io | Miro |
|---|---|---|---|
| Cost | free | free, no account | subscription caps editable boards |
| Renders in GitHub | yes | **no** — needs a viewer | n/a |
| Auto-layout | yes | **no** — every box placed by hand | yes-ish |
| A non-developer can edit it | no, it is code | **yes** | yes |
| Live, several people at once | no | no | yes |

**Mermaid stays the default everywhere.** It is free, lays itself out, and renders where the code
review happens. The new flags are opt-in:

- `/investigation-coach:map --diagrams drawio` — adds `docs/onboarding/architecture.drawio`
  alongside the existing three renderings.
- `/investigation-coach:onboard --diagrams drawio` — this skill had no diagrams at all. Off by
  default on purpose: its job is the prose a teammate reads on day one, and an unmaintained diagram
  is the exact failure these docs exist to avoid.
- `/strategy-coach:blueprint --visual mermaid|drawio|miro|none` — replaces the blunt `--no-visual`.

Two honest limits are written into the reference rather than discovered later. **The format has no
auto-layout**, so coordinates follow a fixed grid — 160×60 boxes, 240 column pitch, 120 row pitch,
six columns maximum — because a generated diagram with overlapping boxes is worse than no diagram.
And **GitHub will not render `.drawio` in-browser**: the skills name the viewer
(`hediet.vscode-drawio`, the desktop app, or app.diagrams.net) in the report, once. `.drawio.svg`
renders everywhere and stays editable, but it is an export from the app — nothing here writes an SVG
by hand.

Evidence discipline carries into the picture: an unverified edge is dashed, grey and labelled
`INFERRED`, because a diagram is believed harder than a sentence. The XML comment
`<!-- Generated by /… -->` is the overwrite marker, so a hand-edited diagram is never regenerated.

### harness-coach 1.0.2 — Miro, then draw.io

Eighth and ninth partners. Miro's verdict says the quiet part: the value of a board is the
*audience*, not the drawing — Mermaid in a committed file is free, diffs in a pull request, and
needs no login. Its caveat is a real trap this release had to handle: auth is interactive, so a
headless session has the tools and no session, and probing with an authenticate call hangs the run.
Detect passively. A cost ceiling is named too — the free tier caps editable boards, so Miro earns
its price for live workshops, not for documentation.

draw.io is the ninth, and the only entry in the catalogue where **nothing needs installing to use
the feature**: the skills write `.drawio` XML directly, and a viewer is needed only to open it. The
install lines are therefore viewer options — the VS Code extension, the desktop app, or dragging the
file onto app.diagrams.net — not a prerequisite.

### Prior art, and what it changed

The design draws on six sources read with `/atlas-coach:ingest` — the converted corpus stayed
local rather than shipping with the plugin, so the sources are named here instead. Two of them
changed the design concretely rather than decorating it:

- **arXiv 2505.23695** is a seven-agent pipeline — profile, detect domain, extract concepts,
  analyse through three lenses, score, reflect, revise. Two findings, and they are not the same
  strength. Naming the domain before analysing is reported **qualitatively**: better coverage,
  structure and business relevance, no number attached. The **measured** result — G-Eval depth
  +31%, novelty +28%, insightfulness +12% against prompt-only GPT-4o — belongs to the *whole
  pipeline*, not to any one step. `blueprint` takes both: naming the domain is step 1, and the
  scored self-check with one revision pass (step 8) is the loop that produced the measured lift.
  Taking the first without the second would have been name-dropping a number.
- **Thoughtworks, via Gudala (2025)**, reported a 30% cut in user-story lead time from GenAI — but
  only after instituting human review gates; the first drafts missed implicit requirements. That is
  the sign-off gate in `/feature`, and the reason it is a rule rather than a suggestion.
- **Savant Labs** names four structural gaps between LLMs and analytics work: context that will not
  fit, data handling that stays manual, no visual reasoning, and no foundation for collaboration —
  "each new user has to start from scratch, reloading context, rephrasing prompts, retracing
  steps". That last one is the argument for a committed vault of plain markdown rather than a
  conversation, and it is now written into `blueprint`'s rationale instead of being implied by it.
- **Indeed's business-analyst skill list** was used as a coverage checklist against these four
  skills, and it found a real hole: cost-benefit analysis. A definition of done is binary, so
  nothing anywhere asked whether the benefit exceeded the cost. `spec.md` now requires one line
  naming the cost, the benefit and who judged it worthwhile — a specification that cannot be
  declined is not a decision document.

Also folded in: the researcher contract's negative space — `## Unknowns` is required in every
document this plugin writes, and "none" is not an answer.

The corpus is honest about its own weakness, so this release should be too: four of those six
sources are vendor or SEO content that asserts rather than measures, and the two remaining
competitive-analysis frameworks contributed nothing but a method to avoid.

One correction to an earlier draft of this entry, recorded rather than quietly edited: it credited
the +31% depth figure to domain detection alone. That is wrong — the paper reports domain detection
qualitatively and the +31% for the full pipeline. The claim was checked against the source, found
overstated, and both the number and the design were corrected: `blueprint` now implements the
scored revision loop the figure actually measures.

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
