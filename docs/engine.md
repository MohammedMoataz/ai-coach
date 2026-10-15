# The engine

`plugins/ai-coach-core/hooks/engine.js` is the one program behind every AI Coach feature that
remembers anything. The hooks `require()` it, the skills of every other plugin shell out to it,
and the MCP adapter wraps it. This page is its manual: where it keeps data, what each table holds,
how a memory is born, ranked and pruned, what every setting does, and every CLI verb.

For what the hooks do with it, see [plugins/ai-coach-core.md](plugins/ai-coach-core.md).

## Overview

The engine is one CommonJS file with zero dependencies (`engine.js:3`). Storage is SQLite through
Node's built-in `node:sqlite`, and every search is an FTS5 full-text query. That is why the Node
floor is what it is (`engine.js:129-136`):

- `node:sqlite` has to be usable without a flag, which arrived in 22.13.
- FTS5 has to be compiled into Node's bundled SQLite, which arrived in 22.16 and 24.0.
- The 23.x line has the module but no FTS5, so it is unsupported outright.

The message the engine prints is `AI Coach needs Node >= 22.16 or >= 24 (node:sqlite with FTS5)`.

Why one file with no dependencies: a plugin directory is ephemeral and unreachable from a sibling
plugin, so the engine copies itself to a fixed path (see below), and a single file with no
`node_modules` is the only thing that can be copied that way and still run (`engine.js:216-221`).
The two schema files travel with it.

## Install and bootstrap

There is no install step. Every `SessionStart` calls `bootstrap()` (`session-start.js:16`), which
copies three files into the user-scope directory whenever their bytes differ (`engine.js:223-243`):

| Source | Copied to |
|---|---|
| `plugins/ai-coach-core/hooks/engine.js` | `~/.ai-coach/bin/engine.js` |
| `plugins/ai-coach-core/memory/schema.sql` | `~/.ai-coach/memory/schema.sql` |
| `plugins/ai-coach-core/memory/user-schema.sql` | `~/.ai-coach/memory/user-schema.sql` |

It compares bytes first, so most session starts cost a read and nothing more. The copy at
`~/.ai-coach/bin/engine.js` is what the skills mean by `ENGINE`:

> `ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
> `node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
> itself at session start — open a new session and try again.
> ([elicit/SKILL.md:17-19](../plugins/analysis-coach/skills/elicit/SKILL.md), repeated in each skill)

You can also force the copy with `node <plugin>/hooks/engine.js bootstrap`.

One consequence: the bin copy comes from whichever plugin build last ran `SessionStart`, so a repo
checkout and an installed plugin can disagree. If a database was stamped by a newer engine than the
one opening it, the engine says so once on stderr and in the log and keeps going. Reads mostly
work, but writes that touch changed columns fail (`engine.js:180-198`).

## Storage

There are two scopes and one repo-side directory.

### User scope: `~/.ai-coach/`

The root is `dirname(AICOACH_DB)`, so `~/.ai-coach/` by default (`engine.js:11-16`). Pointing
`AICOACH_DB` at a temp file moves the whole tree, the log included (`engine.js:19-22`).

| Path | What it is | Written by |
|---|---|---|
| `user.db` | Trust, the project registry, global memories (schema: `user-schema.sql`) | engine |
| `projects/<slug>/coach.db` | One tenant database per project (schema: `schema.sql`) | engine |
| `bin/engine.js`, `memory/*.sql` | The bootstrapped engine copy | `bootstrap()` |
| `settings.json` | Snapshot of the plugin settings the session-start hook could see | `saveSettings()`, `engine.js:358-374` |
| `log.jsonl` (and `log.jsonl.1`) | Failure log, rotated at 512 KB | `log()`, `engine.js:27-39` |
| `snapshots/<session-id>.md` | Pre-compaction working state, deleted when read | `writeSnapshot()`, `engine.js:1490-1543` |
| `partners-seen` | Marker: the partners note has been dismissed | `partners-seen` verb |
| `coach-cooldown`, `coach-cooldown-<feature>` | One-hour backoff after a failed model call | `claudeRun()`, `engine.js:415-428` |

Every database opens in WAL mode with `busy_timeout=3000`, and foreign keys are switched on after
any migration (`engine.js:173`, `engine.js:176-179`). A database stores its schema version in
`PRAGMA user_version` (currently 3). A database already at that version skips the schema exec and
the migration probes, which matters because `observe.js` is a fresh process on every tool call
(`engine.js:148-152`, `engine.js:199`).

Nothing under `~/.ai-coach/` is in any repository.

### Per-project tenants and the project key

A project is the product, and it may span several repositories (`schema.sql:1-3`). Each process
resolves its project once, through `useProject(cwd)` (`engine.js:286-290`). The project key is
resolved in this order (`engine.js:672-681`):

1. `AICOACH_PROJECT`, lowercased.
2. The `name:` line of `.ai-coach/project.md` in the working directory, lowercased.
3. The repository identity (`engine.js:641-651`): the `origin` remote, normalized (lowercased,
   `.git` stripped, scheme and credentials removed, `git@host:org/repo` becomes `host/org/repo`,
   `engine.js:634-639`). With no remote, it is the repo root path, lowercased with forward slashes.

The engine reads `.git/config` and `.git/HEAD` directly and only spawns `git` for the shapes it
does not handle: worktrees, submodules and `include` (`engine.js:474-541`).

The key maps to a directory through the `projects` table in `user.db`. A new key gets a slug made
of lowercase `[a-z0-9._-]`, at most 80 characters, with `-2`, `-3` and so on added on a collision
(`engine.js:271-283`).

`.ai-coach/project.md` is read from the working directory as given, not from the git root
(`engine.js:656-658`). Hooks pass the session's `cwd`. A CLI call made from a subdirectory needs
`--dir <repo-root>`, and the skills pass it.

If a repo gained a remote after it already had memories, its old path-based key strands those rows.
`rekey <old> <new>` moves every tenant table across in one transaction per side
(`engine.js:2775-2814`).

### Repo scope: `.ai-coach/`

| File | Read or written by | Committed? |
|---|---|---|
| `.ai-coach/project.md` | Read: `name:`, a `repos:` list of `- <repo>` lines, and `branches:` prefixes (`engine.js:599-615`, `engine.js:659-670`) | Committed. It is the shared declaration. |
| `.ai-coach/team.md` | Read: roster lines of the form `- Name <email> — role: x` (`engine.js:703-722`) | Committed. It holds names and roles, never trust. |
| `.ai-coach/team-seed.jsonl` | Written by `seed-export`, read by `seed-import`. The handoff skill uses this path ([handoff/SKILL.md:70](../plugins/memory-coach/skills/handoff/SKILL.md)). | Committed. Git is the transport. |
| `.ai-coach/seed.key` | The seed passphrase (`engine.js:1823-1829`) | **Gitignored.** The handoff skill confirms this before an encrypted export. |
| `.ai-coach/security/*.md` | Written by `/security-coach:triage`, not by the engine | **Gitignored** |

This repository's own [`.gitignore`](../.gitignore) carries `.ai-coach/seed.key`,
`.ai-coach/security/` and `*.db`. The engine never edits a `.gitignore` itself.

Every repo-controlled file goes through `safeRead()`. It refuses symlinks and non-regular files and
caps the size (256 KB by default), so a planted `project.md -> ~/.ssh/id_rsa` cannot flow into
model context (`engine.js:41-51`).

## Data model

Read from [`schema.sql`](../plugins/ai-coach-core/memory/schema.sql) (tenant) and
[`user-schema.sql`](../plugins/ai-coach-core/memory/user-schema.sql) (user). Both files are
`CREATE ... IF NOT EXISTS`, so a column added later also has to appear in `migrate()`
(`engine.js:63-122`).

### Tenant: `projects/<slug>/coach.db`

| Table | Key columns | Notes |
|---|---|---|
| `repos` | `repo` PK, `name`, `added` | The project's member repositories. Seeded from `project.md` and auto-registered on first sight. |
| `authors` | `email` PK, `username`, `role` | The one place a name and a role live. Every `author` column is a foreign key into it. The role is the *current* one, not a snapshot (`schema.sql:16-27`). |
| `memories` | `id`, `type`, `text`, `text_key`, `confidence` (0.7), `provenance` (`human`), `project`, `repo`, `source`, `author`, `task`, `created`, `uses` | `type` is one of `learning`, `note`, `reference`, `pattern`. `text_key` is the normalized dedup key. `task` is the branch. There is no `workspace` column: a held memory is derived from trust when the row is read (`schema.sql:56-59`). |
| `memories_fts` | FTS5 over `text` | An external-content index kept in sync by insert, delete and update triggers. |
| `sessions` | `id` PK, `project`, `repo`, `author`, `name`, `name_source` (`auto`/`claude`/`user`), `task`, `first_prompt`, `summary`, `summary_ok`, `outcomes`, `created`, `ended` | `summary_ok = 1` means a person approved the summary for a seed. `outcomes` is filled only on imported sessions. |
| `observations` | `session_id`, `tool`, `target`, `digest`, `created` | One line per Edit, Write or Bash call. The digest is prefixed `FAIL ` for a failed call and `INJ ` for a spotlight hit (`engine.js:159-167`). |
| `corrections` | `session_id`, `signal`, `message`, `prompt_excerpt`, `recorded` | A failure notification. `recorded` flips once a memory is written about it. |
| `prompt_signals` | `session_id`, `len`, `flags`, `hinted` | Detector ids and the prompt length. **Never the prompt text** (`schema.sql:118-122`). |
| `findings` | `source`, `title`, `cwe`, `severity_reported`, `severity_assessed`, `status`, `owner`, `detail` | Security triage. Local only, and never exported (`schema.sql:132-138`). |
| `debriefs` | `key` UNIQUE, `name`, `author`, `task`, `business`, `technical`, `evidence`, `unknowns`, `provenance`, `session_id` | A published conclusion. All four body columns are `NOT NULL`. |

### User: `user.db`

| Table | Key columns | Notes |
|---|---|---|
| `trust` | `email` PK, `level` (`full`/`workspace`), `note` | Private, per person, and never exported (`user-schema.sql:4-8`). |
| `projects` | `key` PK, `dir` | Maps a project key to its tenant directory. Used by `search --all`. |
| `authors` | Same shape as the tenant table | In practice it holds you. |
| `memories` (+ `memories_fts`) | Same shape as the tenant table | Global memories: knowledge that belongs to you, not to a product. `project` is always NULL. |

## Memory lifecycle

### Add

`add(type, text, confidence, cwd, source, extra)` (`engine.js:875-903`):

- The type is coerced: anything outside `learning|note|reference|pattern` becomes `note`.
- Confidence defaults to 0.7. It is **not range-checked**: `Number(confidence)` is stored as given
  (`engine.js:896`).
- The project and repo come from the working directory. With no project, the row goes to `user.db`
  as a global memory.
- `author`, `username` and `role` come from git and the roster, and `task` comes from the current
  branch (null on `main`, `master` or a detached HEAD, `engine.js:578-587`).
- An imported row keeps its original `created`, clamped so it can never be later than now
  (`engine.js:551-559`, `engine.js:888-892`).

The CLI `add` always passes a working directory (`engine.js:2395`), so **the CLI cannot create a
global memory**. Only module callers that pass no project can.

Dedup uses `text_key`, which is lowercased with whitespace collapsed. `hasText()` checks both
scopes, and session-end distillation uses it to avoid piling up the same lesson
(`engine.js:928-931`). The CLI `add` itself does not dedup.

### Provenance

| Value | Meaning | How it gets set |
|---|---|---|
| `human` | A person wrote it | The default |
| `distilled` | A model compressed it out of a session | Session-end distillation (`session-end.js:49-50`), `add --provenance distilled`, `AICOACH_PROVENANCE=distilled`, and the MCP `memory_add` |
| `imported` | It came from a teammate's seed | `seedImport()` only. The CLI refuses `--provenance imported` (`engine.js:2389-2390`). |

Nothing ever upgrades a row from one value to another (`engine.js:866-869`). An imported row that
was `distilled` on its author's machine stays `distilled` (`engine.js:2334`). The brief, search and
`stats` all print provenance.

### Confidence and ranking

`score = effConfidence × exp(-age / decayDays[type]) × useBonus` (`engine.js:955-959`):

- **Decay** runs from `created` only, because reading a memory must not make it younger
  (`engine.js:938-942`). The decay constant (the age at which the score has fallen to about 37%)
  is 90 days for `learning` and `pattern`, 45 for `reference` and 30 for everything else
  (`engine.js:944`).
- **Use bonus:** every search hit that survives dedup increments `uses`. The bonus saturates at
  +20% and can never outrank confidence (`engine.js:945-954`).
- **Held cap:** a memory whose author you trust at `workspace` level ranks with its confidence
  capped at 0.3. The cap is applied when the row is read, so changing trust takes effect on rows you
  already hold (`engine.js:849-861`). Your own rows and authorless rows are never held
  (`engine.js:825-829`).

### How the brief is built

`brief(maxChars, cwd)` (`engine.js:1030-1171`) builds sections in this order. Each section is
guarded separately, so one SQL error loses one section and not the whole brief:

1. **Last session here:** your own most recent session in this project, with its summary or first
   prompt.
2. **The latest debrief** in the project: one line plus `/memory-coach:debrief show <key>`.
3. **The coach line** (only when `coach` is on), the first of these that is true
   (`engine.js:1193-1237`):
   - unrecorded corrections
   - open security findings
   - this branch was worked by someone else
   - a prompt signal that fired at least 5 times in 30 days with at least 1.5× the corrections of
     clean prompts
4. **On this branch:** debriefs, prior sessions and memories whose `task` is the current branch.
   This section gets at most 40% of the cap, so general memories cannot crowd it out
   (`engine.js:1027`, `engine.js:1088-1133`).
5. **Top memories:** every memory in the tenant and in `user.db`, held rows excluded, ranked by
   `score × 1.5 (same repo) × 1.5 (same branch)`. The scan is capped at 5000 rows per scope as a
   safety valve, not as a filter (`engine.js:1140-1161`).

Each memory line says why it is there: `branch`, `global`, `sibling repo`, `from <name>`,
`distilled` or `imported` (`engine.js:1177-1189`). The cap is enforced with 100 characters held
back, so the brief can always end with `- … N more ranked below the cap` rather than truncating
silently (`engine.js:1163-1175`). The session-start hook passes `brief_chars`. After a compaction
it passes a quarter of that, at most 1000 (`session-start.js:44-46`).

### Search and FTS

`search(q, opts)` (`engine.js:966-1011`):

- The query is tokenized to `[\p{L}\p{N}_.\-]+` terms (letters and digits of every script),
  quoted, and joined with `OR` (`engine.js:942-945`). The FTS table's default `unicode61`
  tokenizer folds diacritics, so `café` and `cafe` match each other. An unbroken CJK run is one
  token, so a substring of it does not match; that would need a trigram tokenizer.
- Scopes searched: this tenant plus `user.db`, or every registered project plus `user.db` with
  `--all`.
- Filters: `--task`, `--author` (email), `--role` and `--user` (the author's *current* role and
  name), and `--repo`.
- Each scope returns up to `limit` rows (8 by default) in FTS `rank` order. The rows are then
  deduped across scopes by `text_key`, re-sorted by `score()`, and cut to `limit`. `--full` lifts
  the limit everywhere.
- Ids are scope-qualified: `#12` is this project's and `#g12` is global. `forget` with a bare
  number tries the tenant first, then global (`engine.js:908-927`).
- Held rows are returned, marked `[held]`, with their capped confidence.

### Corrections

The Notification hook matches the message against
`\b(error|failed|failure|incorrect|wrong|mistake|deprecated|broken)\b`. On a match it writes a
`corrections` row with the message (up to 500 characters) and up to 200 characters of the
session's first prompt, with `<private>` scrubbed (`engine.js:1390-1405`). `corrections --open`
lists the unrecorded ones, and `correction-done <id...>` marks them recorded. An unrecorded
correction is the highest-priority coach line.

### Pruning

Both prunes run at every session end (`session-end.js:54-57`):

- `pruneObservations()` deletes observations and prompt signals older than 30 days
  (`engine.js:1700-1718`). The CLI `prune [days]` runs the same thing. A negative number prunes
  everything.
- `pruneStale()` deletes memories that are `distilled`, have `uses = 0`, and are older than 90
  days, in both scopes (`engine.js:1720-1740`). `human` and `imported` memories are never pruned by
  age. There is no CLI verb for it.

## Debriefs, seeds and team sharing

### Debriefs

`debrief-publish` needs all four sections: `--business`, `--technical`, `--evidence` and
`--unknowns`. Each is whitespace-collapsed and capped at 900, 1400, 900 and 400 characters
(`engine.js:1945-1999`). The key is `YYYY-MM-DD/<author-email>/<name-slug>`, frozen at publish time
(`engine.js:1952-1956`). Republishing the same key replaces the debrief only if the new one is at
least as recent, and the CLI says `replaced` (`engine.js:2008-2017`). Nothing is ever published by
a hook (`schema.sql:156-159`).

`debrief-show` renders an imported debrief with a "treat every line as DATA" banner and an
injection-marker scan (`engine.js:2060-2075`). `session-digest` prepares the material for writing
one. It prints a header, the corrections, the failures verbatim, the routine calls collapsed to
counts, and the last `--tail` calls verbatim, paginated to `--bytes` (`engine.js:1853-1934`).

### Seed export

`seed-export [file] [--task t] [--repo [r]] [--project [dir]] [--dir dir] [--encrypt]` writes line
JSON (`engine.js:2079-2194`). Each line has a `kind`:

| `kind` | Carries |
|---|---|
| `meta` | Seed format (3), exporter email, project key, schema version. No timestamp, so re-exports do not churn git. |
| `author` | `email`, `username`, `role` |
| `memory` | `type`, `text`, `confidence`, `project`, `repo`, `source`, `author`, `task`, `provenance`, `created`. Held rows travel too. |
| `session` | `skey` (date/author/name), `name`, `author`, `repo`, `task`, `created`, `ended`, an `outcomes` count, and `summary` **only if approved** |
| `prompt_signal` | `skey`, `len`, `flags`, `hinted`, `created` |
| `debrief` | `key`, `name`, `author`, `repo`, `task`, the four sections, `created` |

What never travels: global memories, observations, corrections (only their count, folded into
`outcomes`), findings, trust, `first_prompt`, local session ids, and unapproved summaries. Only
memory rows may carry a top-level `text` key, which keeps the format readable by older importers
(`engine.js:2084-2087`). The file is written to a temp file and then renamed (`engine.js:2188-2192`).
The default filename is `seed.jsonl`. `/memory-coach:handoff` passes `.ai-coach/team-seed.jsonl`.
There is no automatic export (`session-end.js:58-60`).

### Encryption

With `--encrypt`, the whole body is sealed with AES-256-GCM using a scrypt-derived key. The
envelope is one JSON line with `salt`, `iv`, `tag` and `ct`. The GCM tag doubles as the tamper
check (`engine.js:1818-1851`). The passphrase comes from `AICOACH_SEED_KEY`, else
`<dir>/.ai-coach/seed.key`. Export refuses to run without one, and import refuses an encrypted
seed without one. Note that `<dir>` is the `--dir` or `--project` value, or the working directory.

### Seed import

`seed-import [file] [--dir dir]` (`engine.js:2196-2343`):

- Reads at most 16 MB, decrypts if the file is sealed, and applies everything in **one
  transaction**.
- People first. A `.ai-coach/team.md` entry outranks what the seed says about a name or role.
- Sessions land as `seed:<skey>`. A summary that arrives in a seed counts as approved.
- A prompt signal whose session cannot be attributed to the same author is rejected and counted as
  an orphan.
- Debriefs import even when their session is missing.
- Memories are deduped on `text_key`. A re-import from the same author can raise a confidence
  that an older engine had capped on disk (`repaired`). New memories are stamped `imported`, or
  stay `distilled`.
- The output reports what was skipped, and warns when the seed format is newer than the engine.

### Summary approval

A session summary is a model's paraphrase of what was asked, so it travels only once a person has
read it (`schema.sql:81-84`). `summaries [--pending]` lists this machine's summaries.
`summary-set <id> --approve | --drop | "<edited text>"` records the decision. Writing a new summary
resets the approval (`engine.js:1440-1444`). `sessionEnd()` also refuses a "summary" that is, or
starts with, the first prompt (`engine.js:1423-1445`). `seed-export` reports how many summaries it
held back.

## Identity and roster

| Fact | Source, in order |
|---|---|
| Author (the key) | `AICOACH_AUTHOR`, else `git config user.email`. Lowercased and trimmed (`engine.js:543-567`). |
| Display name | `AICOACH_USERNAME`, else `git config user.name` |
| Role | `AICOACH_ROLE`, else the `role:` on your line in `.ai-coach/team.md` (`engine.js:724-728`) |

The `authors` row is refreshed from the roster at each session start (`engine.js:1255-1258`).
`whoami [dir]` prints the resolved identity as JSON, plus a `missing` list naming what is unset:
username, email, role, or a project name (`engine.js:2734-2752`). `team-list [dir]` prints the
roster with each person's trust level.

### Trust

Trust is a private judgment stored in `user.db`. It applies across every project and never appears
in `team.md` or a seed. `trust <email> <full|workspace> [note]` sets it. An unrecognized level
becomes `full` (`engine.js:792-800`). `trust-list` shows what you have set. For a teammate you have
not rated, the `default_trust` setting applies. Any value other than `full` or `workspace` is read
as `full` (`engine.js:393-399`).

| Level | Effect |
|---|---|
| `full` | Their memories rank like your own. |
| `workspace` | Their memories are held: kept out of the brief, still found by search with confidence capped at 0.3, and still relayed in seeds you export (`engine.js:2107-2111`). |

When `default_trust` is `workspace`, the brief admits only you, authorless rows, and people you
explicitly rated `full` (`engine.js:830-848`).

### Sessions and names

A session is named after Claude Code's own session name when one exists. The engine reads it from
`~/.claude/sessions/*.json` at session start and again at session end
(`engine.js:1299-1331`). Without one, the name is `<branch>-<user>`. A typed name outranks a
derived one, which outranks the auto name (`engine.js:1280-1296`). `name <label>` renames the
latest session in the project.

### Branch convention

`branchCheck()` returns a one-line note at session start when the branch matches neither the
`branches:` prefixes in `project.md` nor the defaults (`feat/ fix/ chore/ docs/ refactor/ test/
perf/ hotfix/ release/`). It is a convention, never a gate (`engine.js:592-629`).

## Settings

Every setting lives in one table, `SETTINGS` (`engine.js:306-328`). It mirrors `userConfig` in
[plugin.json](../plugins/ai-coach-core/.claude-plugin/plugin.json), and a test keeps the two in step
(`engine.js:296-299`).

| Setting | Type | Default | What it governs |
|---|---|---|---|
| `brief_chars` | number | `4000` | Ceiling on the session brief. Clamped to 500–16000. Ranking happens before the cap (`engine.js:385-391`). |
| `coach` | boolean | `on` | The coach line in the brief and the prompt hints. Display only: prompt signals and corrections are still recorded. |
| `corrections` | boolean | `on` | Whether `notice.js` records failures at all. |
| `learn` | boolean | `on` | The session-end Haiku call that distils a summary and up to 3 learnings. Needs `claude` on PATH. |
| `plan_review` | boolean | `on` | In plan mode only: one Haiku call scores the prompt. |
| `guard` | boolean | `off` | The secrets guard, the only hook that can stop a tool call. Opt-in. |
| `spotlight` | boolean | `on` | The injection-marker scan of fetched content and out-of-repo reads. Warn-only. |
| `partners` | boolean | `on` | The one-time `/harness-coach:partners` note. |
| `default_trust` | string | `full` | Trust for teammates you have not rated: `full` or `workspace`. |

A boolean counts as off when its value is `off`, `false`, `0` or `no`, case-insensitively. Anything
else counts as on (`engine.js:401-404`).

### Precedence

`optResolve()` (`engine.js:330-347`) takes the first of these that is set to a non-empty value:

1. **Environment:** `AICOACH_<KEY>`, e.g. `AICOACH_BRIEF_CHARS` or `AICOACH_GUARD`.
2. **Plugin option:** `CLAUDE_PLUGIN_OPTION_<key>`, in lower then upper case. Claude Code passes
   these only to hook processes.
3. **Snapshot:** `~/.ai-coach/settings.json`. The session-start hook rewrites the whole file on
   every start with the plugin options it could see (`engine.js:349-374`), so a skill's
   `node engine.js` call honors the same settings as the hooks.
4. **Default:** the value in the table above.

An empty value counts as unset. `config` prints each setting's current value, its default, and
which source decided it. `config --json` adds the descriptions.

### Changing a setting

- **In a session:** `/plugin configure ai-coach-core@ai-coach` opens the settings form directly.
  The long way is `/plugin`, then the **Installed** tab, then **ai-coach-core**, then **Configure
  options**; do not pick **Configure**, which is for MCP servers. Each option also appears as a row
  in `/config`. These are Claude Code features, documented at
  [plugins/cli-reference](https://code.claude.com/docs/en/plugins/cli-reference.md) and
  [manifest-reference](https://code.claude.com/docs/en/plugins/manifest-reference.md#user-configuration).
  The engine's own `config` output still uses the shorter wording `/plugin → ai-coach-core → the
  setting` (`engine.js:2716`).
- **From a shell:**
  `echo '{"guard":"on"}' | claude plugin configure ai-coach-core@ai-coach --values-stdin`. The
  values are "a JSON object of single-line strings; options left out keep their values" (from
  `claude plugin configure --help`). Run it without `--values-stdin` to list the options and which
  are unset.
- **For one shell only:** `AICOACH_<KEY>=<value>`. This wins over everything else.

A setting changed in `/plugin` reaches `settings.json` at the next session start. Until then, a
skill's `ENGINE` call still sees the old snapshot.

### Environment variables that are not settings

| Variable | Effect | Source |
|---|---|---|
| `AICOACH_DB` | Path to `user.db`. Everything else lives beside it. | `engine.js:12-16` |
| `AICOACH_LOG` | Path to the failure log | `engine.js:22` |
| `AICOACH_OFF` | Silences the Node-version message. Disables nothing else. | `engine.js:140` |
| `AICOACH_INNER` | Set to `1` in spawned `claude -p` children. Every hook exits immediately when it is set. | `engine.js:448`, each hook's first line |
| `AICOACH_LLM_CMD` | Replaces the model call with any stdin-to-stdout command | `engine.js:429-442` |
| `AICOACH_MODEL` | The model for the default `claude -p` path (default `claude-haiku-4-5`) | `engine.js:442` |
| `AICOACH_CLAUDE_BIN` | The `claude` binary to run | `engine.js:441` |
| `AICOACH_AUTHOR`, `AICOACH_USERNAME`, `AICOACH_ROLE` | Override identity | `engine.js:563`, `571`, `725` |
| `AICOACH_PROJECT`, `AICOACH_TASK` | Override the project key and the branch | `engine.js:675`, `580` |
| `AICOACH_SEED_KEY` | Seed passphrase | `engine.js:1824` |
| `AICOACH_PROVENANCE` | Default `--provenance` for `add`. `human` or `distilled`. | `engine.js:2379-2390` |
| `CLAUDE_PROJECT_DIR` | Fallback working directory when none is passed | `engine.js:481` |

`AICOACH_ENGINE` and `AICOACH_HARNESS` belong to the adapters, not to the engine
([adapters/mcp/server.js:17](../adapters/mcp/server.js), [adapters/shim.js:98](../adapters/shim.js)).

## CLI reference

```
node ~/.ai-coach/bin/engine.js <verb> [args]
```

Before dispatch, the CLI resolves the project from `--project <dir>`, else `--dir <dir>`, else the
working directory (`engine.js:2355-2361`). A thrown error prints one line,
`engine <verb>: <message>`, on stderr and exits 1. The stack goes to the log
(`engine.js:2362-2372`). An unknown verb prints a usage line. That usage line omits `bootstrap`
and `config`, both of which exist (`engine.js:2823-2827`).

Every verb in `dispatch()` (`engine.js:2375-2829`):

### Memory

| Verb | Arguments | What it does |
|---|---|---|
| `init` | — | Opens (and creates) the project database and prints its path. |
| `add` | `<type> <text> [confidence] [source] [--project <dir>] [--task <branch>] [--provenance human\|distilled]` | Adds a memory to this project. Prints `added`. Exits 2 on a bad `--provenance`. |
| `forget` | `<id>`, `<#id>` or `<#gid>` | Deletes one memory and echoes its text. |
| `search` | `<query...> [--full] [--task t] [--author email] [--role r] [--user name] [--repo r] [--all]` | FTS search over this project and global memories. `--all` covers every project. |
| `brief` | `[chars] [dir]` | Prints the session brief. Without `chars` it uses `brief_chars`. |
| `stats` | — | Prints the total memories, the count by provenance, and the open corrections. |
| `corrections` | `[--open]` | Lists the 50 most recent corrections. `--open` lists only the unrecorded ones. |
| `correction-done` | `<id...>` | Marks corrections as recorded. |
| `prune` | `[days]` | Deletes observations and prompt signals older than `days` (default 30). |

### Sessions and debriefs

| Verb | Arguments | What it does |
|---|---|---|
| `session-start` | `<session-id> [dir]` | Creates the session row if it does not exist. |
| `session-end` | `<session-id> [summary...]` | Stamps `ended`, plus a summary unless it is the prompt. |
| `observe` | `<session-id> <tool> <target> <digest...>` | Writes one observation row. |
| `name` | `<label...>` | Names the latest session in this project as a typed name. |
| `session-digest` | `[session-id] [--bytes n] [--page n] [--tail n]` | Prints the session's material for writing a debrief. Defaults to the latest session, 24000 bytes and a 60-call tail. |
| `debrief-publish` | `--business t --technical t --evidence t --unknowns t [--name label] [--session id]` | Publishes or replaces a debrief. All four sections are required. |
| `debriefs` | `[--author e] [--name n] [--task t] [--since days] [--grep s] [--limit n]` | Lists debriefs, newest first (default limit 20). |
| `debrief-show` | `<key\|name>` | Renders one debrief. Refuses an ambiguous name and lists the matching keys. |

### Team sharing

| Verb | Arguments | What it does |
|---|---|---|
| `seed-export` | `[file] [--task t] [--repo [r]] [--project [dir]] [--dir dir] [--encrypt]` | Writes a team seed (default `seed.jsonl`). A bare `--repo` means this repo. |
| `seed-import` | `[file] [--dir dir]` | Imports a seed into the project at `dir`. |
| `summaries` | `[--pending] [--task t] [--repo r] [--json]` | Lists this machine's session summaries and their approval state. |
| `summary-set` | `<session-id> --approve \| --drop \| "<edited summary>"` | Approves, drops, or replaces-and-approves a summary. |

### Identity, trust and projects

| Verb | Arguments | What it does |
|---|---|---|
| `whoami` | `[dir]` | Prints the resolved identity, project, repo and branch as JSON, plus a `missing` list. |
| `team-list` | `[dir]` | Prints the `.ai-coach/team.md` roster with each person's trust level. |
| `trust` | `<email> <full\|workspace> [note...]` | Sets private trust for a person. |
| `trust-list` | — | Lists the explicit trust entries. |
| `project` | — | Prints the project key, repo, declared and registered repos, and the database path as JSON. |
| `project register` | `[repo] [name]` | Registers a repo as a member of this project. Defaults to this repo. |
| `repos` | — | Lists the project's registered repos. |
| `projects` | — | Lists every known project key and its directory. |
| `rekey` | `<old-key> <new-key>` | Moves every tenant table from one project key to another. |

### Prompts, security and housekeeping

| Verb | Arguments | What it does |
|---|---|---|
| `prompt-check` | `<prompt...>` | Runs the deterministic prompt detectors once. No model call and no write. |
| `prompt-stats` | `[days] [--team]` | Prints, per signal, the count, the outcome rate and the lift against clean prompts. Pooled and never broken down by person when `--team` is given (`engine.js:1645-1698`). |
| `injection-scan` | `<file>` | Scans one regular file of at most 512 KB for injection markers (`engine.js:1750-1777`). |
| `finding-add` | `--title t [--source pentest\|audit\|scan\|disclosure] [--cwe id] [--severity s] [--owner o] [--detail d]` | Records a local security finding. |
| `finding-update` | `<id> [--status s] [--owner o] [--assessed severity]` | Updates a finding. The status must be one of `open`, `fixing`, `fixed`, `retested`, `accepted-risk` or `false-positive`. |
| `findings` | `[--open] [--status s] [--json]` | Lists findings. |
| `config` | `[--json]` | Prints every setting's value, its default, and its source. |
| `bootstrap` | — | Copies the engine and schemas to `~/.ai-coach/`. |
| `partners-seen` | — | Writes the marker that dismisses the partners note. |

## Failure behavior

- **Fail-open.** Every hook wraps its whole body in `try/catch`, logs the error, and exits 0. Only
  the guard's deliberate block exits non-zero. The brief guards each of its sections separately.
  A bookkeeping failure never stops a session, a prompt, a tool call or a compaction.
- **The log** is `~/.ai-coach/log.jsonl` (or `AICOACH_LOG`). Each line is
  `{"ts","where","err"}`, with the stack when there is one. Past 512 KB the file rotates to
  `log.jsonl.1`, or is truncated if the rename fails, as it can on Windows (`engine.js:26-39`). The
  `where` field names the hook or function, e.g. `session-start`, `brief.coach` or
  `session-end.haiku`.
- **Model calls** (`claudeRun`, `engine.js:406-463`) run with a timeout: 12 s for plan review and
  45 s for distillation. A failure starts a one-hour cooldown for that feature only. If the
  `claude` binary is missing, the cooldown covers every feature. Either way the feature is skipped
  quietly.
- **Node version.** A missing `node:sqlite`, or a SQLite build without FTS5, prints
  `AI Coach needs Node >= 22.16 or >= 24 (node:sqlite with FTS5) — this is vX, which has no …`
  on stderr (unless `AICOACH_OFF` is set) and logs it (`engine.js:137-146`, `engine.js:203-204`).
  Hooks still exit 0, so the session runs without memory.
- **Newer database.** A database stamped by a newer engine produces one stderr warning naming both
  versions and `claude plugin update ai-coach` (`engine.js:187-198`).
- **Schema setup** stamps the version last, so a failed setup is retried on the next open rather
  than trusted half-built (`engine.js:208-210`).

## Known issues

- [#34](https://github.com/MohammedMoataz/ai-coach/issues/34): open question about managing
  settings from a web UI.

Limits stated in the source and not tracked as issues:

- The CLI has no way to add a global memory, and no verb for `pruneStale`.
- The brief's ranking scan stops at 5000 rows per scope (`engine.js:1141-1145`).
- Seed import reads at most 16 MB (`engine.js:2197`).
- `.ai-coach/project.md` is resolved from the working directory, not the git root
  (`engine.js:656-658`).

## Source map

- [`plugins/ai-coach-core/hooks/engine.js`](../plugins/ai-coach-core/hooks/engine.js): the
  engine. Storage, ranking, brief, seeds, settings and CLI.
- [`plugins/ai-coach-core/memory/schema.sql`](../plugins/ai-coach-core/memory/schema.sql): the
  tenant schema.
- [`plugins/ai-coach-core/memory/user-schema.sql`](../plugins/ai-coach-core/memory/user-schema.sql):
  the user-scope schema.
- [`plugins/ai-coach-core/.claude-plugin/plugin.json`](../plugins/ai-coach-core/.claude-plugin/plugin.json):
  the `userConfig` declarations behind the settings.
- [`plugins/ai-coach-core/hooks/engine.test.js`](../plugins/ai-coach-core/hooks/engine.test.js):
  engine tests against a throwaway `AICOACH_DB`.
- [`plugins/ai-coach-core/hooks/hooks.test.js`](../plugins/ai-coach-core/hooks/hooks.test.js):
  hook smoke tests with fake stdin.
- [`adapters/mcp/server.js`](../adapters/mcp/server.js): the MCP wrapper that exposes the engine to
  other harnesses.
