# ship-coach

Takes a finished change to a commit, and optionally a pushed branch and a pull request that closes
an issue. The message is drafted on a small model at low effort in the repository's own style, and
the whole plan is shown once before anything runs. The plugin touches neither memory nor the engine
([plugin.json:5](../../plugins/ship-coach/.claude-plugin/plugin.json)).

| | |
|---|---|
| Version | 1.0.0 |
| Depends on | `ai-coach-core` `^1.9.0` |
| Source | [`plugins/ship-coach/`](../../plugins/ship-coach/) |

## What it ships

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `commit` | skill | `/ship-coach:commit [--branch [name]] [--pr] [--issue N]`. User-only, because it writes your git history | Drafts, confirms once, then commits, and with `--pr` pushes and opens the PR |
| `context.js` | script | `node scripts/context.js [--issue N] [--json]` | Everything the draft needs in one read, with the diff capped |

## commit

The skill's frontmatter pins `model: haiku` and `effort: low`
([commit/SKILL.md:5-6](../../plugins/ship-coach/skills/commit/SKILL.md)), so the whole turn runs on
Haiku: the draft, the confirmation and the git calls. A live run started on Sonnet confirmed every
assistant message of that turn was Haiku.

1. **Read the state.** `context.js` prints the repository, branch, default branch, anything in
   progress, the issue guessed from the branch name, what will be staged, the last 15 commit
   subjects, the stat and the diff ([context.js:16](../../plugins/ship-coach/scripts/context.js)).
   A merge or rebase in progress stops the run; a detached HEAD asks for a branch.
2. **Draft.** The subject follows the style of the recent subjects. The body says why, and ends with
   `Fixes #N` when an issue is known.
3. **Confirm once.** One question shows message, branch, files, push, PR and issue: Run all, Edit
   message, Commit only or Cancel. `.env` files, `.pem` files and SSH keys are asked about first
   ([context.js:14](../../plugins/ship-coach/scripts/context.js)). With no question tool the plan
   is printed and nothing runs
   ([commit/SKILL.md:62](../../plugins/ship-coach/skills/commit/SKILL.md)).
4. **Run.** The message and PR body go through files in the OS temp directory, never a quoted `-m`
   ([context.js:49](../../plugins/ship-coach/scripts/context.js)). Every command runs in the printed
   repository, one at a time ([commit/SKILL.md:70](../../plugins/ship-coach/skills/commit/SKILL.md)).

Defaults: a new branch when on the default branch or with `--branch`; push and PR only with `--pr`;
staging is what is already staged, or everything. It never force-pushes, amends a pushed commit,
skips hooks or pushes to the default branch
([commit/SKILL.md:84](../../plugins/ship-coach/skills/commit/SKILL.md)). Its `allowed-tools`
pre-approve only the git and gh subcommands it runs
([commit/SKILL.md:7](../../plugins/ship-coach/skills/commit/SKILL.md)).

## The issue board

`Fixes #N` links the PR to the issue and closes it on merge. A GitHub project moves the issue's
status with its own built-in "Pull request linked to issue" workflow, switched on once in the
project's Workflows settings. The plugin has no board code.

## Hooks

None.

## Configuration

None.

## Data it keeps

Two scratch files per repository in the OS temp directory, cleared at the start of every run.

## Limits and known issues

- The diff is capped at 12,000 characters ([context.js:13](../../plugins/ship-coach/scripts/context.js)).
  A larger change is drafted from the stat and what fits, and the plan says it was truncated.
- The issue guess takes the first number that stands alone in the branch name, so
  `feature/2026-10-15-x` guesses 2026. The guess is shown in the plan before anything runs.
- Whether the built-in project workflow can target a status other than its default is not
  documented.

## Tests

[`scripts/context.test.js`](../../plugins/ship-coach/scripts/context.test.js) runs in CI. It checks
staged-only against everything, the diff cap and its marker, the issue from the branch name, the
default-branch fallback, a merge in progress, a detached HEAD, risky files, and that the scratch
files live outside the work tree.

## Source map

- [`../../plugins/ship-coach/.claude-plugin/plugin.json`](../../plugins/ship-coach/.claude-plugin/plugin.json): manifest
- [`../../plugins/ship-coach/scripts/context.js`](../../plugins/ship-coach/scripts/context.js): the commit context
- [`../../plugins/ship-coach/skills/commit/SKILL.md`](../../plugins/ship-coach/skills/commit/SKILL.md): the commit flow
