# pair-coach and ship-coach — design

Date: 2026-10-15 · Status: implemented; amended after live runs (see Amendments) · Release target: v1.18.0

Two new plugins. **pair-coach** lets a developer and Claude talk through the code itself: a
developer writes `@claude` in a comment, Claude answers or acts in place, and Claude can hand
pieces back the same way. **ship-coach** turns a finished change into a commit, and optionally a
pushed branch and a PR linked to an issue, with a cheap model and one confirmation.

## Intent

What the user asked for:

- A coach that helps a developer read code, implement pieces, and hold a conversation through the
  codebase in both directions.
- "Reply comments": a developer writes a comment starting with `@claude` to ask a question or give
  an instruction; Claude decides whether to explain or to implement.
- A commit flow where a low-effort, low-budget model writes the message, commits on the current
  branch or a new one, can open a PR, and links it to an issue whose board status then changes.

Decisions taken in conversation (2026-10-15):

| Question | Decision |
|---|---|
| Packaging | Two plugins: `pair-coach` and `ship-coach` |
| How a mention is noticed | A command, plus a cheap per-prompt nudge. No live file watching |
| Where answers go | Always inline, as a comment thread in the code |
| Who Claude addresses | The current developer by handle, resolved at runtime. Never a hardcoded name |
| When Claude mentions the developer | Inside threads it is answering; handoff stubs only in an opt-in pair mode |
| Commit confirmation | One confirmation of the whole plan before anything runs |
| Issue board status | GitHub's built-in "Pull request linked to issue" project workflow; the plugin only writes `Fixes #N` |

Assumptions (not stated by the user, open to correction):

- Everything runs inside a Claude Code session. Reacting to PR comments on GitHub is out of scope.
- Zero runtime dependencies, per CONTRIBUTING.
- "Read the code" is served by investigation-coach's `/study`; pair-coach does not duplicate it.

## Prior art and how this differs

- **commit-commands** (claude-plugins-official): `/commit`, `/commit-push-pr`. Runs on the
  session model, no confirmation, no issue linking. ship-coach differs in running on Haiku at low
  effort, matching the repository's own commit style, confirming once, and linking an issue.
- **learning-output-style** (claude-plugins-official): asks the user to write 5–10 meaningful
  lines. pair-coach's `pair` mode borrows the idea, but opt-in and with stubs that fail loudly.
- **Aider's `AI!` / `AI?` comments** (from memory, UNVERIFIED): the nearest precedent for
  in-code instructions. Aider watches files live; pair-coach deliberately does not (see Rejected).

## pair-coach

```
plugins/pair-coach/
  .claude-plugin/plugin.json
  hooks/hooks.json            UserPromptSubmit -> mentions-nudge.js
  hooks/mentions-nudge.js     open @claude threads in the developer's uncommitted lines; fail-open
  scripts/mentions.js         the one thread parser: `list`, `json`, `whoami`, `added`
  scripts/mentions.test.js
  skills/mentions/SKILL.md    model-invocable: handle open threads, reply inline
  skills/pair/SKILL.md        user-only: /pair-coach:pair <task>
```

Touches neither memory nor the engine. Depends on `ai-coach-core` like every coach.

### Thread grammar

- A **comment line** is a line whose first non-whitespace characters are one of `//`, `#`, `--`,
  `/*`, `*`, `<!--`. A mention anywhere else (string literal, prose, code) is not a mention.
- In `.md` and `.mdx` files only `<!--` counts, so documentation and code fences that show the
  syntax (including this plugin's own SKILL.md files) never match.
- A **thread** is a run of adjacent comment lines containing at least one addressed line.
- An **addressed line** starts, after the comment token, with `@claude` (colon optional) or with
  `@name:` — a person **with** a colon, so `@param`, `@returns` and decorators are never people.
  Continuation lines are comment lines with no address.
- **State** comes from the last addressed line in the thread:
  - `@claude …` → **open**, Claude's turn.
  - any other `@name` → **waiting**, that person's turn (an answer, a question back, or a stub).
- A thread is **closed** by deleting it. There is no resolved marker.

The parser never needs to know who the developer is: anything that is not `@claude` is a person.

### Handle resolution

`node scripts/mentions.js whoami` prints the handle Claude writes replies to:

1. `git config user.name` (repository config wins over global), with all whitespace removed.
2. Otherwise `$USER` or `$USERNAME`.
3. Otherwise the literal `you`.

No name appears in any shipped file. Every developer on a team gets their own handle from their own
config.

### Nudge hook (`UserPromptSubmit`)

- Scans only text the developer wrote: added lines from `git diff -U0 HEAD` plus untracked files
  (`git ls-files --others --exclude-standard`). A committed mention on an unchanged line is ignored
  even inside an edited file.
- When it finds open threads it injects one line of context:
  `pair-coach: 2 open @claude threads in your changes: src/a.js:40, lib/b.ts:12. Handle them with pair-coach:mentions after the user's request.`
- Silent, exit 0 when there are none, outside a git repository, or on any error. Timeout 5 s.
- Never blocks a prompt.

### `/pair-coach:mentions` (model-invocable)

Its description says when it may fire: on the user's request, or after the nudge has reported open
threads; never unprompted otherwise. Steps:

1. `node scripts/mentions.js json` sweeps the tree with `git grep` (tracked and untracked,
   gitignored skipped), or one file when given a file, and returns
   `{file, line, start, end, state, prefix, indent, text, asks}` per thread; `asks` lists every
   `@claude` line with its own `mine` and `author`.
2. Keep the open threads. Every `@claude` **line** whose `git blame` author is not the current
   developer goes into one multi-select question ("act on these?"); unselected lines are left
   untouched, and the developer's own lines in the same thread are still handled. With no question
   tool (headless), foreign lines are skipped and reported. This is the prompt-injection boundary:
   text someone else committed is not an instruction from this user.
3. For each kept thread, decide:
   - **question** → append the answer as reply lines, as long as it needs to be;
   - **instruction** → make the change, then append `@<handle>: done — <what, where>`;
   - **ambiguous** → append a question back; change no code.
   Replies reuse the thread's comment prefix and indentation.
4. Report in chat, one line per thread: `file:line — answered | done | asked`.

### `/pair-coach:pair <task>` (user-only)

- Claude builds the task: scaffolding, boilerplate, tests.
- It leaves **one to three** stubs addressed to the developer, only where the choice is genuinely
  theirs (a business rule, a trade-off, domain knowledge). Each stub says what goes there, why it
  matters, and the options Claude sees.
- A stub's body **fails loudly** (`throw new Error("@<handle>: pricing rule")`,
  `raise NotImplementedError(...)`), so an unfilled stub cannot ship as silent wrong behaviour.
- The developer fills it in, then deletes the thread or writes `@claude check this`, which reopens it
  for review through `mentions`.

## ship-coach

```
plugins/ship-coach/
  .claude-plugin/plugin.json
  scripts/context.js          git state for the drafting turn, diff capped
  scripts/context.test.js
  skills/commit/SKILL.md      user-only, model: haiku, effort: low
```

Touches neither memory nor the engine. Depends on `ai-coach-core`.

### `/ship-coach:commit [--branch [name]] [--pr] [--issue N]`

Frontmatter: `disable-model-invocation: true`, `model: haiku`, `effort: low`. Committing writes the
user's git history, so the skill is user-only: typing it is the user's decision (CONTRIBUTING,
"Things the checker cannot see").

`scripts/context.js` exists because a skill's inline shell cannot cap diff size portably on Windows,
and an uncapped diff defeats the low-budget model. It prints:

- current branch, upstream, default branch (`origin/HEAD`, falling back to `main`);
- in-progress state (merge, rebase, detached HEAD);
- what will be staged: the staged set if anything is staged, otherwise all changes;
- diff stat, then the diff capped at about 12 KB with a truncation marker;
- the last 15 commit subjects, which is where the house style is read from;
- an issue guess from the branch name (`fix/36-windsurf` → 36), overridden by `--issue`;
- the repository root, and two scratch file paths for the message and PR body, in the OS temp
  directory so they can never be staged.

Sequence:

1. **Draft.** Subject in the log's style (a conventional prefix only if the log uses one). Body
   explains why. `Fixes #N` when an issue is known. For a new branch, a name of the form
   `<type>/<issue>-<slug>`.
2. **Defaults.** New branch when on the default branch or when `--branch` is given; otherwise the
   current branch. Push and PR only with `--pr`.
3. **Confirm once.** One question showing message, branch, files, push, PR, issue. Options:
   Run all · Edit message · Commit only · Cancel.
4. **Run.** `git switch -c` (if new) → `git add` → `git commit -F <tmpfile>` → `git push -u origin`
   → `gh pr create --base <default> --title <subject> --body-file <tmpfile>`. Messages go through
   files so Windows quoting cannot corrupt them. Report the commit hash and PR URL.
5. **Board.** Nothing to do: `Fixes #N` links the PR, and GitHub's built-in "Pull request linked to
   issue" workflow moves the issue (to In progress by default, per GitHub's changelog of
   2025-11-06). Whether its target status can be changed to "In review" is UNVERIFIED; the user
   configures it once in the project's Workflows settings.

Never: force-push, amend a pushed commit, `--no-verify`. A failing pre-commit hook is shown and the
run stops. Files matching `.env*`, `*.pem` or an SSH key name (`id_rsa`, `id_ed25519`, …) stop the
plan and ask before staging. With no question tool (headless) the plan is printed and nothing runs.
Every command runs in the repository the context printed, one at a time, never chained.

Commit attribution follows the session's own Claude Code attribution setting; the skill adds no
trailer of its own.

## Error handling

| Where | Situation | Behaviour |
|---|---|---|
| nudge | anything unexpected | silent, exit 0 |
| mentions.js | not a git repository | empty list plus a reason |
| commit | nothing to commit | say so, stop |
| commit | merge or rebase in progress | stop |
| commit | detached HEAD | ask for a branch name |
| commit | no remote, gh missing or not authenticated | commit locally; print the exact skipped push/PR commands |
| commit | PR already exists for the branch | report its URL (`gh pr view --json url`) |

## Testing

Plain scripts that exit non-zero, building throwaway git repositories, like the existing suites.

- `plugins/pair-coach/scripts/mentions.test.js`: every comment style; the `.md` rule; no match in a
  string literal; open / waiting / multi-turn thread states; the nudge sees added lines only, not a
  committed mention in an edited file; `whoami` returns the temp repo's own random `user.name` with
  whitespace stripped (a hardcoded handle would fail).
- `plugins/ship-coach/scripts/context.test.js`: staged-only vs all; the diff cap and its marker;
  issue from the branch name; default-branch fallback; merge-in-progress detection.
- Both suites added to `.github/workflows/ci.yml` and to CONTRIBUTING's "Before you push".
- `node adapters/build.js` rerun and `adapters/out` committed; `node .github/check-manifests.js`
  run bare.
- Live, once each, in a scratch repository: a question thread, an instruction thread, a foreign
  committed thread (must ask), a pair stub round trip; a commit with `--pr --issue`. Confirm from
  the session transcript that the commit turn's model is Haiku, not just that the frontmatter says
  so.

## Release

Both plugins enter `.claude-plugin/marketplace.json` and the `ai-coach` bundle's dependencies in
v1.18.0, with a CHANGELOG section and its bolded ship line
(`**pair-coach 1.0.0 · ship-coach 1.0.0 · ai-coach 1.18.0**`). Each gets a page in `docs/plugins/`
once PR #51 has merged.

## Amendments after live runs (2026-10-15)

Headless `claude -p` runs in a scratch repository, each finding fixed test-first:

- **A mixed thread carried an injection.** A developer's `@claude` line written directly under a
  teammate's committed one formed one thread, and blaming only the last line marked the whole
  thread as the developer's. Authorship is now per `@claude` line.
- **A file argument failed.** `mentions.js json store.js` reported "not a git repository"; a file
  path now narrows the sweep to that file.
- **No question tool.** Both skills now say what a headless run does: mentions skips foreign lines;
  commit prints the plan and stops.
- **The commit turn guessed the repository** from the plugin's own path and tried to `cd` there
  (refused by the permission check; nothing was touched). The context now prints the repository,
  and the skill pins every command to it, one at a time.
- **Verified:** with the session started on `--model sonnet`, `/ship-coach:commit` ran entirely on
  `claude-haiku-5-5` (every assistant message, and `modelUsage`); plan /usr/bin/bash.0095, execution /usr/bin/bash.014.

## Rejected

- **Live watch on save** (`FileChanged` hook or a plugin monitor). Waking an idle session from either
  is undocumented, and Claude editing a file the developer is typing in is a conflict generator.
  Revisit only after a spike proves the wake works.
- **One combined plugin.** The user chose two, one focus each.
- **A pinned Haiku agent for the commit message.** It would keep the diff out of the session, but a
  subagent cannot ask the confirmation question, so it needs a second hop. The skill-level
  `model: haiku` does the whole turn in one.
- **Plugin-side board updates** (`gh project item-edit` from a board declared in
  `.ai-coach/project.md`). The user chose GitHub's built-in workflow; the plugin stays board-agnostic.
- **Asking before every mention reply.** The developer wrote the instruction; the only gate is on
  text someone else committed.
