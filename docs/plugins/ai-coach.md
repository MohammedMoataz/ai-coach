# ai-coach

The bundle, and the plugin to install. It has no skills of its own. It declares every other plugin
in the marketplace as a dependency, so one install brings in the engine and every coach, and it
ships the three commands that chain skills across plugins: `/ai-coach:start` for day one,
`/ai-coach:wrap` when a piece of work finishes, and `/ai-coach:sitrep` for a read-only status page.

| | |
|---|---|
| Version | 1.19.0 |
| Depends on | `ai-coach-core` `^1.9.1`, `memory-coach` `^1.5.0`, `prompt-coach` `^1.2.1`, `security-coach` `^1.2.0`, `harness-coach` `^1.1.0`, `investigation-coach` `^1.6.0`, `atlas-coach` `^1.2.0`, `strategy-coach` `^1.5.0`, `analysis-coach` `^1.1.0`, `design-coach` `^1.0.3`, `pair-coach` `^1.0.0`, `ship-coach` `^1.0.0` |
| Source | [`plugins/ai-coach/`](../../plugins/ai-coach/) |

## Installing the bundle

```bash
claude plugin marketplace add MohammedMoataz/ai-coach
claude plugin install ai-coach@ai-coach
```

The `dependencies` array in
[plugin.json](../../plugins/ai-coach/.claude-plugin/plugin.json) lists the engine and every coach,
which is how this one install pulls them all in
([README.md: Install](../../README.md#install)). To install only part of it, install a single coach
instead. Each coach depends on `ai-coach-core`, so the engine comes with it.

Each command checks what is actually installed with `claude plugin list` and reports a missing plugin
as "skipped — <plugin> not installed" rather than failing. The contributor rules require every
cross-plugin command to say what a partial install does
([CONTRIBUTING.md:87-91](../../CONTRIBUTING.md)).

Engine verbs written as `ENGINE <verb>` are documented in [engine.md](../engine.md).

## What it ships

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `start` | command | `/ai-coach:start`, user-only (`disable-model-invocation`) | Detects what a project already has set up, then prints or runs the steps still missing. |
| `wrap` | command | `/ai-coach:wrap`, user-only | Closes identity gaps in one question, then chains `debrief` and `handoff`. |
| `sitrep` | command | `/ai-coach:sitrep`, user-only | One read-only page of the engine's own numbers, worst first. |

All three are user-only. The contributor rules make that mandatory for every command, because the
bundle's claim of adding nothing to session start rests on no command description entering the
model's context ([CONTRIBUTING.md:87-89](../../CONTRIBUTING.md)).

## start

**Invocation:** `/ai-coach:start [--run] [--feature <name>] [--with-blueprint] [--diagrams drawio]`

| Flag | Effect |
|---|---|
| (none) | Detects, then prints a tailored checklist with the documentation steps as one line to paste. |
| `--run` | Runs the documentation steps instead of printing them, after one cost confirmation. |
| `--feature <name>` | Forwarded to `onboard --tour`, and to `blueprint` when that runs. |
| `--with-blueprint` | Adds `/strategy-coach:blueprint` after the tour. Without it, blueprint is mentioned and not run. |
| `--diagrams drawio` | Forwarded to `onboard --tour` as `--diagrams drawio`, and to `blueprint` as `--visual drawio`. |

**Detect (read-only)** ([start.md:23-43](../../plugins/ai-coach/commands/start.md)):

1. `ENGINE whoami`: identified, in the roster, project declared, branch convention.
2. Looks for `.ai-coach/team.md`, `.ai-coach/project.md`, `docs/onboarding/index.md` (and whether it
   is current) and `docs/business/`. Each one that exists removes a step.
3. `claude plugin list` to see which plugins are installed.
4. Decides whether to forward `--project` to onboard. It does when `.ai-coach/project.md` declares
   more than one repo, when more than one service manifest (`package.json`, `pom.xml`, `go.mod`,
   `pyproject.toml`, `Cargo.toml`, `.csproj`) sits below the root outside `node_modules` and vendor
   trees, or when a `docker-compose*.yml` defines more than one service. It reports which condition
   fired.

**Checklist**, only the steps detection says are needed:

1. `/memory-coach:roster register` when the user is not in the roster.
2. `/memory-coach:roster declare <name>` when they work across sibling repos (one question).
   Single-repo work skips it.
3. One line to paste:
   `/investigation-coach:onboard --tour [--project] [--feature <name>] [--diagrams drawio]`, with
   ` /strategy-coach:blueprint` appended under `--with-blueprint`. Flags are filled in from
   detection, never left as placeholders. It warns that the tour is three code-reading skills back
   to back.

**`--run`, the chain** ([start.md:72-94](../../plugins/ai-coach/commands/start.md)):

1. The roster steps are still only printed, never run.
2. States the cost once (three code-reading skills, four with `--with-blueprint`) and asks for one
   confirmation covering the whole run.
3. Invokes `investigation-coach:onboard --tour` through the Skill tool, forwarding `--project`,
   `--feature` and `--diagrams drawio`. The tour owns the order (onboard, then map, then study) and
   skips any step whose output is current. `start` never calls the three separately.
4. With `--with-blueprint` only, invokes `strategy-coach:blueprint`, with `--visual drawio` and
   `--feature <name>` as given. It takes no `--project`, and runs last because it reads what the tour
   wrote.
5. Reports the files each step wrote and anything skipped, and says to open `docs/` in Obsidian as
   the vault.

Rules: never re-implements a listed skill; never invents an identity, project name or branch
convention; closes by naming `/memory-coach:recall` and `/ai-coach:wrap`. It stops whenever the user
says stop and reports what was already written.

## wrap

**Invocation:** `/ai-coach:wrap [--name <label>] [--encrypt]`

| Flag | Effect |
|---|---|
| `--name <label>` | Forwarded to `memory-coach:debrief` as the debrief key's name. |
| `--encrypt` | Forwarded to `memory-coach:handoff` to encrypt the seed. |

It requires memory-coach. If `claude plugin list` does not show it, `wrap` says so and stops
([wrap.md:23-25](../../plugins/ai-coach/commands/wrap.md)).

1. **Read the state.** `ENGINE whoami` (`missing` can hold `username`, `email`, `role`,
   `project name`; `branchOk` notes a non-conforming branch). `ENGINE session-digest` header and
   `ENGINE stats`: a session with no observations and no first prompt stops here, since an empty
   debrief is worse than none. `ENGINE project` and `ENGINE projects` for the tenant check.
2. **Tenant check.** The project key selects the SQLite database. Only two keys are candidates: the
   one this session resolves to, and the name the user gives the project. Any other key in
   `ENGINE projects` belongs to another project. Both keys must match `^[A-Za-z0-9._@:/-]+$` before
   reaching a shell, because a key can come from a git remote
   ([wrap.md:61-64](../../plugins/ai-coach/commands/wrap.md)). Row counts come from
   `AICOACH_PROJECT="<key>" ENGINE stats`. Then:
   - only the resolving key has rows: nothing to do;
   - only the other candidate has rows: stop before declaring, and print (never run)
     `ENGINE rekey <old-key> <new-key>` with both counts, saying it deletes the source and is not
     undoable;
   - both have rows: report both counts and let the user choose;
   - neither: a fresh project, so declaring is free.
3. **Ask once.** One `AskUserQuestion` covering every gap: role (single word, options from
   `.ai-coach/team.md`), project name (inferred key and any key holding data, labelled), and email
   and username.
4. **Write identity, in order.** `git config user.email` and `user.name`, then
   `memory-coach:roster register <role>`, then `memory-coach:roster declare <name>`. Order matters:
   `.ai-coach/project.md` must exist before anything publishes, or the debrief lands in the inferred
   tenant. It re-runs `ENGINE whoami` and stops if `missing` is not empty.
5. **Publish and export.** Invokes `memory-coach:debrief` (forwarding `--name`) through the Skill
   tool. Its approval gate stays, and a "no" ends the run. Then `memory-coach:handoff` (forwarding
   `--encrypt`), whose own gate also stays. Two confirmations per run is by design
   ([wrap.md:131-141](../../plugins/ai-coach/commands/wrap.md)).
6. **Stops before the commit.** It prints `git add .ai-coach/team-seed.jsonl && git commit` and
   leaves it to the user.

Chain order: `roster register` → `roster declare` → `debrief` → `handoff`, with the roster steps only
when something is missing.

Rules: never re-implements debrief or handoff inline, since that would skip their gates; never
invents an identity, project name or branch convention; never declares a project name before the
tenant check clears; offers two debriefs when the session holds two unrelated pieces of work.

## sitrep

**Invocation:** `/ai-coach:sitrep` (no arguments).

Read-only end to end: it reports, recommends and changes nothing, including what it finds broken
([sitrep.md:9-12](../../plugins/ai-coach/commands/sitrep.md)).

Gather, each step skipped if its data is absent:

1. `ENGINE stats`: memories, provenance split, open corrections.
2. `ENGINE corrections --open`, oldest as the headline.
3. `ENGINE findings --open`: security findings, oldest first. Skipped with a note if security-coach
   never recorded any.
4. `ENGINE config`: only settings not at `default`, with their source.
5. `ENGINE debriefs --since 14`: what recently changed hands.

Report: one page, worst first, using the coach line's priority (an unrecorded failure, then an old
security finding, then a settings surprise, then stale memory). It opens with the single most urgent
line, gives one block per section with evidence and a pasteable command, and gives one line to clean
sections. It closes with the `ENGINE stats` line verbatim and, only when the numbers earn them and
the plugin is installed, the two deep dives it does not perform itself:

```
/memory-coach:recall --health
/harness-coach:context
```

Rules: no `ENGINE add`, no `forget`, no file writes, no fixes; every number names its source
command; a disagreement between sections is reported as its own finding.

`sitrep` chains no skill. It only prints invocations.

## Configuration

None of its own. The commands read engine settings through `ENGINE config`, and `wrap` uses the
`AICOACH_PROJECT` override to count rows per candidate key. See [engine.md](../engine.md#settings).

## Data it keeps

None directly. What the chained skills write:

| Command | Writes, through the skills it chains |
|---|---|
| `start --run` | `docs/onboarding/`, the map and study output, and with `--with-blueprint` the business vault under `docs/`. See [investigation-coach](investigation-coach.md) and [strategy-coach](strategy-coach.md). |
| `wrap` | `git config user.email` / `user.name`, `.ai-coach/team.md`, `.ai-coach/project.md`, a debrief row, `.ai-coach/team-seed.jsonl`. See [memory-coach](memory-coach.md). |
| `sitrep` | Nothing. |

## Limits and known issues

- Plugin dependencies are metadata. CONTRIBUTING states that manifests cannot enforce them
  ([CONTRIBUTING.md:93-96](../../CONTRIBUTING.md)), which is why every command handles a missing
  plugin by name.
- `start` never runs the roster steps, only prints them. `wrap` is where identity gaps get closed.
- `wrap` never runs `rekey` and never commits. Both are left to the user.
- `start --run` is the most expensive thing in the marketplace: three or four code-reading skills
  back to back.
- No open issue targets this plugin.

## Source map

- [`../../plugins/ai-coach/.claude-plugin/plugin.json`](../../plugins/ai-coach/.claude-plugin/plugin.json): manifest and the dependency list that makes it the bundle.
- [`../../plugins/ai-coach/commands/start.md`](../../plugins/ai-coach/commands/start.md): day-one detection, checklist and `--run` chain.
- [`../../plugins/ai-coach/commands/wrap.md`](../../plugins/ai-coach/commands/wrap.md): identity and tenant checks, then debrief and handoff.
- [`../../plugins/ai-coach/commands/sitrep.md`](../../plugins/ai-coach/commands/sitrep.md): the read-only status page.
