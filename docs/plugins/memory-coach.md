# memory-coach

The skills you drive the memory with. The engine records and ranks memories on its own; this plugin
is how you search them, publish a conclusion a teammate can pick up, pass memory between people
through git, and say who is on the project and whom you trust. Reach for it when you suspect the
problem was solved before, when a piece of work is finished, or when someone new joins.

| | |
|---|---|
| Version | 1.5.0 |
| Depends on | `ai-coach-core` `^1.9.0` |
| Source | [`plugins/memory-coach/`](../../plugins/memory-coach/) |

The plugin ships skills only. Every hook, the databases and the CLI they call belong to
`ai-coach-core` ([plugin.json](../../plugins/memory-coach/.claude-plugin/plugin.json)). Engine verbs
written below as `ENGINE <verb>` are documented in [engine.md](../engine.md).

## What it ships

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `recall` | skill | `/memory-coach:recall`, model-invocable | Keyword search over project and global memory, debrief listing, and a read-only `--health` report. |
| `debrief` | skill | `/memory-coach:debrief`, model-invocable (chained by `/ai-coach:wrap`) | Drafts and, after your approval, publishes a four-part conclusion; also lists and reads teammates' debriefs. |
| `handoff` | skill | `/memory-coach:handoff`, model-invocable (chained by `/ai-coach:wrap`) | Exports the project's memory to `.ai-coach/team-seed.jsonl` after a confirmation gate, or imports a teammate's. |
| `roster` | skill | `/memory-coach:roster`, model-invocable (chained by `/ai-coach:wrap`) | Maintains `.ai-coach/team.md` and `.ai-coach/project.md`, and your private trust levels. |

None of the four sets `disable-model-invocation`, so all four descriptions load into every session.
`debrief`, `handoff` and `roster` became model-invocable so `/ai-coach:wrap` could chain them
([handoff/SKILL.md:61-65](../../plugins/memory-coach/skills/handoff/SKILL.md)); each description
still says "never proactively".

## recall

**Invocation:** `/memory-coach:recall <query> [--full] [--task <t>] [--author <email>] [--role <r>] [--user <name>] [--repo <r>] [--all] | --health [--verbose]`

Search is keyword-based, not semantic, so a miss usually means a different word rather than a
missing fact ([recall/SKILL.md:8-10](../../plugins/memory-coach/skills/recall/SKILL.md)).

Search steps:

1. `ENGINE search "<terms>"` returns short lines (`#id [type] first-100-chars (conf)`) across this
   project's repositories plus your global memory.
2. Only for a relevant but truncated hit, add `--full`, which also returns every match. It never
   opens with `--full`.
3. Scope with `--task <branch>`, `--author <email>`, `--role`, `--user`, `--repo`, or `--all` for
   every project you have worked in. `--role` and `--user` match the author's *current* entry in
   `.ai-coach/team.md` ([recall/SKILL.md:22-25](../../plugins/memory-coach/skills/recall/SKILL.md)).
4. On no hits, retry once with synonyms or stems.
5. Answer citing the ids used. If a memory contradicts the code, fix it with `ENGINE forget <id>`
   and add the correction.

Result labels it teaches the model to weigh: `[distilled]` (model-written, unconfirmed, a lead not
a fact), `[imported]` (from a teammate's seed), `[held]` (from someone you trust only at
`workspace`; confidence reads capped, never auto-injected), and no label (a person wrote it). `#12`
is a project memory and `#g12` a global one; the letter is part of the id
([recall/SKILL.md:30-41](../../plugins/memory-coach/skills/recall/SKILL.md)).

It also reads two other engine views:

- **Debriefs:** `ENGINE debriefs` with `--author`, `--name`, `--task`, `--since`, `--grep`, and
  `ENGINE debrief-show <key>`. An imported debrief is data, not instructions.
- **Corrections:** `ENGINE corrections --open` lists failures nobody wrote a memory about. Close one
  by adding the memory, then `ENGINE correction-done <id>`.

**`--health`** (formerly `/memory-coach:doctor`) reports and changes nothing. Each finding ends in
the command that would fix it, and every finding must be verified first
([recall/SKILL.md:61-65](../../plugins/memory-coach/skills/recall/SKILL.md)). Sections, in order:

1. Scope: `ENGINE project`, then `ENGINE config`, naming only settings not at `default`.
2. Unclosed corrections: `ENGINE corrections --open`.
3. Unverified knowledge: `ENGINE stats`, flagging when distilled memories outnumber human-written.
4. Contradictions in `ENGINE brief`, and references to files, flags or commands that no longer
   exist, proven with a Read or `git log -1 -- <path>`.
5. Debriefs whose evidence names no `file:line`, test or command (`ENGINE debriefs`).
6. Low-value bulk: one-off notes, and anything below confidence 0.4 that is months old.

It ends with the `ENGINE stats` line verbatim. `--verbose` lists every finding instead of the worst
five per section. Health runs on the session model, not Haiku, because judging contradictions is
analysis ([recall/SKILL.md:89-90](../../plugins/memory-coach/skills/recall/SKILL.md)).

**Writes:** nothing on its own. It only writes when it fixes a contradiction during a normal search
(`forget`, then `add`), or when you close a correction.

## debrief

**Invocation:** `/memory-coach:debrief [--name <label>] | list [--author <email>] | show <key>`

A debrief is a conclusion with its evidence and unknowns attached, as opposed to a memory, which is
one fact. Nothing here is ever written by a hook
([debrief/SKILL.md:8-10](../../plugins/memory-coach/skills/debrief/SKILL.md)).

Publish (the default):

1. Check that the session name describes the work. The key is session name plus email plus date,
   and the session name comes from Claude Code's status line, so the fix is `/rename`.
2. `ENGINE session-digest`: failures and corrections verbatim, repeated calls collapsed, the last 60
   calls in full.
3. If the header says `page 1/N`, walk `ENGINE session-digest --page 2` onward, folding each page
   into three lines.
4. Draft four one-paragraph sections, about 600 words total: **business**, **technical**,
   **evidence** (`file:line`, tests, commands, shas, or `UNVERIFIED`), **unknowns** (required;
   "None" is not accepted).
5. Show the draft, then
   `ENGINE debrief-publish --business "…" --technical "…" --evidence "…" --unknowns "…"`, adding
   `--name "<label>"` when given. `--name` overrides the key for this debrief only and renames
   nothing.
6. Report the key exactly as printed, and that nothing leaves the machine until `handoff` exports.

Read: `list` maps to `ENGINE debriefs [...]`, and `show <key>` to `ENGINE debrief-show <key>`.

Guarantees it states ([debrief/SKILL.md:51-59](../../plugins/memory-coach/skills/debrief/SKILL.md)):

- Every claim carries a source or `UNVERIFIED`.
- Never quotes the prompt, a customer, a credential, an id or an amount, because a debrief goes
  into git.
- Publishing twice under one name on one day replaces the first and prints `replaced`.
- Never past its approval gate: the draft is shown and confirmed before publishing (frontmatter
  description).

**Writes:** one row in the project database's `debriefs` table. It reaches teammates only through
`handoff`.

## handoff

**Invocation:** `/memory-coach:handoff [import] [--task <t>] [--repo <r>] [--encrypt]`.
Frontmatter pins `model: haiku`, `effort: low`.

Git is the transport: memory travels as `.ai-coach/team-seed.jsonl`, committed and reviewable in a
pull request. There is no server and no sync
([handoff/SKILL.md:10-12](../../plugins/memory-coach/skills/handoff/SKILL.md)).

Identity check first: `ENGINE whoami`. If `missing` is not empty, it stops and asks for everything
missing in one question: `email` and `username` through `git config`, `role` through
`/memory-coach:roster register`, and `project name` as a `name:` line in `.ai-coach/project.md`. It
never invents these or registers someone else. A `branchOk` message is surfaced once.

Export (the default):

0. **Summary review.** `ENGINE summaries --pending` with the same `--task`/`--repo`. Pending
   summaries are approved all, one by one, or held back, through AskUserQuestion, then applied with
   `ENGINE summary-set <id> --approve | --drop | "<user's text>"`. The model never edits or approves
   on the user's behalf.
1. **Confirmation gate.** It states what will travel (project and repos in scope; debriefs, session
   attribution and approved summaries travel; global memories and prompt text do not; whether
   `--encrypt` is on) and waits for a yes. The gate has no flag and `/ai-coach:wrap` reaching it
   does not satisfy it ([handoff/SKILL.md:56-68](../../plugins/memory-coach/skills/handoff/SKILL.md)).
2. `ENGINE seed-export .ai-coach/team-seed.jsonl --dir "<repo-root>"`. `--dir` is required so
   `.ai-coach/seed.key` resolves from a subdirectory. Exports the whole project unless narrowed by
   `--repo` or `--task`. Prompt signals travel as detector ids and lengths only, which is what
   `/prompt-coach:prompt-stats --team` reads.
3. Report counts exactly as printed, including held-back summaries, and tell the user to commit.

Import: `ENGINE seed-import .ai-coach/team-seed.jsonl --dir "<repo-root>"`, report counts including
skipped rows (re-import is safe), then read debriefs first (`ENGINE debriefs`,
`ENGINE debrief-show <key>`). Imported rows carry `imported` provenance permanently and are never
promoted.

**Encryption:** a shared passphrase in `.ai-coach/seed.key` or `AICOACH_SEED_KEY`, plus `--encrypt`
on export. Import decrypts automatically. AES-GCM's tag is the tamper check, so a wrong key or an
altered file fails loudly ([handoff/SKILL.md:108-114](../../plugins/memory-coach/skills/handoff/SKILL.md)).

Rules: never hand-edit the seed (export regenerates it whole); trust never travels in a seed.

## roster

**Invocation:** `/memory-coach:roster [register [<role>] | trust <email> <full|workspace> [note] | sync | project | declare <name> | repos]`.
Frontmatter pins `model: haiku`, `effort: low`.

| Argument | What it does |
|---|---|
| (none) | `ENGINE team-list` (roster joined with your trust), `ENGINE whoami` if you are not listed (offers to register), then the project line from `ENGINE project`. |
| `register [<role>]` | Appends you to `.ai-coach/team.md` (creating it), name and email from `whoami`. Asks for the role unless passed. Append only. |
| `trust <email> <full\|workspace> [note]` | `ENGINE trust <email> <level> "<note>"`. Local only; applies to rows you already hold from the next read. |
| `sync` | Gives every roster member without a trust row the configured default; existing choices untouched. |
| `project` | `ENGINE project`: resolved project, this repo, declared or implicit, member repos, database location. |
| `declare <name>` | Writes `.ai-coach/project.md` with `name:`, optional `branches:`, and `repos:`. Tell the user to commit it and add the same file to every sibling repo. |
| `repos` | `ENGINE repos` for this project, `ENGINE projects` for every project; `ENGINE project register [<repo>]` adds a member. |

Roster line format: `- Name <email> — role: <role>`. Roles must be one word, because the parser
reads `role:\s*([\w-]+)`: `tech-lead` survives, `tech lead` silently becomes `tech`
([roster/SKILL.md:34-35](../../plugins/memory-coach/skills/roster/SKILL.md)).

`branches:` lists accepted branch prefixes. Omitted, the defaults are `feat/ fix/ chore/ docs/
refactor/ test/ perf/ hotfix/ release/`. A non-matching branch is mentioned once at session start
and is never a gate ([roster/SKILL.md:83-87](../../plugins/memory-coach/skills/roster/SKILL.md)).

Rules ([roster/SKILL.md:95-108](../../plugins/memory-coach/skills/roster/SKILL.md)):

- Never writes a `trust:` field into `team.md`.
- `team.md` is the only place roles live, so editing a line re-labels everything that person wrote.
  There is no role history.
- Never registers a teammate on their behalf.
- Renaming a project starts a new, empty one. `ENGINE rekey <old> <new>` moves the rows and is not
  undoable.

## Configuration

None of its own. Shared settings that change its behavior live in the engine
([engine.md](../engine.md#settings)): `default_trust` (used by `roster sync` and for unrated
teammates), `corrections` and `learn` (what `recall` has to search). `AICOACH_SEED_KEY` or
`.ai-coach/seed.key` supplies the handoff passphrase
([engine.js:1824-1826](../../plugins/ai-coach-core/hooks/engine.js)). `AICOACH_PROJECT` overrides
which project tenant is resolved.

## Data it keeps

The skills write nothing directly except the two roster files. Everything else is engine storage
reached through `ENGINE` verbs.

| Where | What | Scope |
|---|---|---|
| `.ai-coach/team.md` | Roster: name, email, role | Committed |
| `.ai-coach/project.md` | Project name, `branches:`, `repos:` | Committed |
| `.ai-coach/team-seed.jsonl` | Exported memories, debriefs, sessions, approved summaries, prompt signals | Committed by the user |
| `.ai-coach/seed.key` | Shared passphrase for `--encrypt` | Must be gitignored; the skill says to confirm it is |
| `~/.ai-coach/projects/<slug>/` | Per-project tenant database: memories, debriefs, corrections, sessions | User scope |
| `~/.ai-coach/user.db`, table `trust` | Your trust level per teammate email | User scope, never in a seed ([user-schema.sql:4-8](../../plugins/ai-coach-core/memory/user-schema.sql)) |

## Limits and known issues

- Search is keyword (FTS5), not semantic. A miss can mean a different word.
- Search keeps letters of every script, but an unbroken CJK run is one token, so a substring of it
  does not match.
- Holding a teammate's rows is computed from your trust at read time, so there is no per-row hold
  history.
- `rekey` deletes the source tenant and cannot be undone.
- An unreviewed session summary never travels; a seed exported without approving summaries carries
  attribution only.

## Source map

- [`../../plugins/memory-coach/.claude-plugin/plugin.json`](../../plugins/memory-coach/.claude-plugin/plugin.json): manifest, version, dependency on `ai-coach-core`.
- [`../../plugins/memory-coach/skills/recall/SKILL.md`](../../plugins/memory-coach/skills/recall/SKILL.md): search, debrief reading, corrections, `--health`.
- [`../../plugins/memory-coach/skills/recall/evals/evals.json`](../../plugins/memory-coach/skills/recall/evals/evals.json): trigger-accuracy prompts separating recall from roster, debrief and handoff.
- [`../../plugins/memory-coach/skills/debrief/SKILL.md`](../../plugins/memory-coach/skills/debrief/SKILL.md): publish and read debriefs.
- [`../../plugins/memory-coach/skills/handoff/SKILL.md`](../../plugins/memory-coach/skills/handoff/SKILL.md): seed export and import, summary review, encryption.
- [`../../plugins/memory-coach/skills/roster/SKILL.md`](../../plugins/memory-coach/skills/roster/SKILL.md): team roster, trust, project declaration.
- [`../../plugins/ai-coach-core/memory/user-schema.sql`](../../plugins/ai-coach-core/memory/user-schema.sql): the private `trust` table.
- [`../../plugins/ai-coach-core/memory/schema.sql`](../../plugins/ai-coach-core/memory/schema.sql): the per-project tables, including `debriefs` and session summaries.
