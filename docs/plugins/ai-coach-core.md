# ai-coach-core

The engine and every Claude Code hook AI Coach runs. It records what a session does, injects a
ranked memory brief when a session starts, records failures as they surface, and can guard tool
calls against leaking credentials. Every other plugin depends on it. You rarely invoke it directly:
it works through hooks, and the other plugins' skills call its engine at `~/.ai-coach/bin/engine.js`.

| | |
|---|---|
| Version | 1.9.0 |
| Depends on | none |
| Source | [`plugins/ai-coach-core/`](../../plugins/ai-coach-core/) |

Storage, the data model, settings and the full CLI are documented once, in
[engine.md](../engine.md). This page covers the hooks.

## What it ships

No skills, commands or agents. These are the hooks registered in
[`hooks/hooks.json`](../../plugins/ai-coach-core/hooks/hooks.json):

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `session-start.js` | hook | `SessionStart`, matcher `startup\|clear\|resume\|compact` | Installs the engine, records the session, and injects the memory brief. |
| `prompt.js` | hook | `UserPromptSubmit`, no matcher | Records prompt signals and shows up to two hints, to the user only. Runs plan-mode review. |
| `guard.js` | hook | `PreToolUse`, matcher `Bash\|WebFetch\|Read\|Write\|Edit\|NotebookEdit` | Secrets guard: blocks real credentials and asks about secret-ish payloads. Off by default. |
| `observe.js` | hook | `PostToolUse`, matcher `Edit\|Write\|Bash` | Writes one observation row per tool call. |
| `observe.js` | hook | `PostToolUseFailure`, matcher `Edit\|Write\|Bash` | The same, with the digest marked `FAIL`. |
| `spotlight.js` | hook | `PostToolUse`, matcher `WebFetch\|WebSearch\|Read` | Scans fetched content for injection markers and reminds the model it is data. |
| `notice.js` | hook | `Notification`, no matcher | Records a correction when a notification reads like a failure. |
| `precompact.js` | hook | `PreCompact`, no matcher | Saves working state for the session start that follows a compaction. |
| `session-end.js` | hook | `SessionEnd`, no matcher | Closes the session, distils learnings with one Haiku call, and prunes. |

Every hook runs as `node "${CLAUDE_PLUGIN_ROOT}/hooks/<script>"`. Every script exits immediately
when `AICOACH_INNER` is set, so the `claude -p` children the engine spawns record nothing and
cannot recurse (for example `session-start.js:5` and `guard.js:8`).

Only `guard.js` can stop anything. Every other hook catches its own errors, logs them to
`~/.ai-coach/log.jsonl`, and exits 0.

## session-start.js

- **Event:** `SessionStart` with matcher `startup|clear|resume|compact`. Timeout 20 s. Status
  message "Loading your memory brief..." (`hooks.json:3-7`).
- **What it does** (`session-start.js:11-89`):
  1. `bootstrap()` copies the engine and schemas to `~/.ai-coach/` if they changed.
  2. `saveSettings()` rewrites `~/.ai-coach/settings.json` with the plugin options this process
     was given. This is how skills see the same settings ([engine.md](../engine.md#precedence)).
  3. Resolves the project from `cwd` and creates the session row. The row adopts Claude Code's own
     session name when one exists.
  4. Collects notes:
     - a branch-convention note, when the branch matches no declared or default prefix
     - a note when this repo is missing from the `repos:` list of `.ai-coach/project.md`
     - the brief, under `## AI Coach brief`
  5. After a compaction (`source == "compact"`), the brief is a quarter of `brief_chars`, at most
     1000 characters. The pre-compaction snapshot is appended and then deleted
     (`session-start.js:40-57`).
  6. Except after a compaction, it also adds two nudges: one when `.ai-coach/team-seed.jsonl`
     exists, and the partners note until it is dismissed (`session-start.js:59-74`).
- **Writes:**
  - `~/.ai-coach/bin/`, `~/.ai-coach/memory/` and `~/.ai-coach/settings.json`
  - a `sessions` row, and `repos` and `authors` rows in the tenant database
  - `projects` in `user.db` for a new project
- **Prints:** `hookSpecificOutput.additionalContext`, which reaches the model, and `sessionTitle`
  when it has a label (`session-start.js:75-84`). It prints nothing when it has nothing to say.
- **Can block:** no. It always exits 0.
- **Fail-open:** a top-level `try/catch` logs to `session-start` and exits 0. The branch note,
  project note, snapshot and nudges each have their own `try` (`session-start.js:26-74`).

## prompt.js

- **Event:** `UserPromptSubmit` with no matcher. Timeout 20 s (`hooks.json:9-11`).
- **What it does** (`prompt.js:24-66`):
  1. Ensures the session row exists, because a resumed session gets no `SessionStart` row. It
     stores the first prompt, truncated to 300 characters with `<private>…</private>` scrubbed.
  2. Skips everything below for a prompt shorter than 25 characters or one starting with `/` or `!`.
  3. Runs the deterministic detectors (`evaluatePrompt`). It records **signal ids and the prompt
     length, never the text**, into `prompt_signals`, whether the prompt was clean, exempt or
     flagged. Questions and exploratory prompts are exempt and never get hints
     (`engine.js:1553-1637`).
  4. When `coach` is on, it collects up to two hints.
  5. In plan mode with `plan_review` on, it makes one `claude -p` call (Haiku by default, 12 s
     budget) that scores the prompt and suggests a rewrite (`prompt.js:86-109`).
- **Writes:** `sessions.first_prompt` and a `prompt_signals` row.
- **Prints:** `{"systemMessage": "[coach] …"}`. This goes to the user only. The model never sees a
  critique of its own prompt (`prompt.js:10-12`).
- **Can block:** no.
- **Fail-open:** logs to `prompt` and `prompt.signal`, and exits 0. A failed model call starts a
  one-hour cooldown for plan review only.

## guard.js

- **Event:** `PreToolUse` with matcher `Bash|WebFetch|Read|Write|Edit|NotebookEdit`. Timeout
  10 s (`hooks.json:12-14`).
- **Off by default.** It does nothing unless the `guard` setting is on or `AICOACH_GUARD=on`
  (`guard.js:5-7`, `guard.js:44`).
- **What it does:** it collects the raw string values of `tool_input`, not the JSON, so escapes
  cannot hide a match (`guard.js:48-50`). Then:
  - **Block**, in every matched tool including file writes, on high-precision credential shapes:
    - PEM private keys
    - AWS `AKIA`/`ASIA` keys
    - `sk-` keys
    - GitHub `gh?_` and `github_pat_` tokens
    - Slack tokens and webhooks
    - Azure `AccountKey=` strings

    (`guard.js:10-20`)
  - **Ask** on a `Read` of a credentials-type path: `.env*`, `credentials*`, `id_rsa`/`id_ed25519`/
    `id_ecdsa`, `*.pem`/`.key`/`.pfx`/`.p12`, or `secret(s).json|yaml|toml`. Files ending
    `.example`, `.sample`, `.template` or `.dist` are exempt (`guard.js:27-31`, `guard.js:57-60`).
  - **Ask** on `Bash` and `WebFetch` only, when the payload matches a key/secret/token/password
    assignment or a JWT, or when a command token names a credentials-type file
    (`guard.js:21-26`, `guard.js:61-70`).
- **Writes:** nothing.
- **Prints:**
  - To block: a reason on stderr (`ai-coach-guard: blocked — …`) and exit code **2**.
  - To ask: `hookSpecificOutput.permissionDecision: "ask"` with a `permissionDecisionReason`
    (`guard.js:32-37`).
- **Can block:** yes. This is the only hook in the product that can stop a tool call.
- **Fail-open:** any exception is logged to `guard`, and the hook exits 0, so the call proceeds.
  A guard bug never bricks every tool call (`guard.js:4-5`, `guard.js:71-74`).

## observe.js

- **Events:** `PostToolUse` and `PostToolUseFailure`, both with matcher `Edit|Write|Bash`.
  Timeout 10 s (`hooks.json:16`, `hooks.json:19-21`).
- **What it does** (`observe.js:9-37`): builds a one-line digest and writes it to `observations`.
  - For `Bash`, the digest is the command with whitespace collapsed, up to 160 characters.
  - For `Edit` and `Write`, it is the tool name and the last three path segments.
  - `<private>…</private>` is scrubbed before anything is written.
  - On `PostToolUseFailure`, the digest is prefixed `FAIL `. Session-end distillation, prompt
    statistics and the debrief digest all read that prefix.
- **Writes:** one `observations` row. Observations expire after 30 days
  ([engine.md](../engine.md#pruning)).
- **Prints:** nothing. No model call.
- **Can block:** no.
- **Fail-open:** logs to `observe` and exits 0.

## spotlight.js

- **Event:** `PostToolUse` with matcher `WebFetch|WebSearch|Read`. Timeout 10 s
  (`hooks.json:17`).
- **On by default.** Turn it off with the `spotlight` setting or `AICOACH_SPOTLIGHT=off`
  (`spotlight.js:10`, `spotlight.js:20`).
- **What it does** (`spotlight.js:17-70`):
  - A `Read` inside the session's `cwd` is skipped, because repo files are semi-trusted. The
    comparison is case-insensitive.
  - Every other result is scanned (the first 512 KB) for the engine's injection markers:
    - zero-width characters, Unicode tags and bidi overrides
    - override and "new instructions" phrases
    - fake chat roles and fake tool-call syntax
    - instructions to conceal something from the user
    - hidden HTML
    - markdown-image exfiltration

    (`engine.js:1742-1777`)
- **Writes:** on a match, one `observations` row with digest `INJ <flags> <target>`.
- **Prints**, on a match only, two separate channels:
  - `systemMessage` to the user: how many markers matched, and a pointer to
    `/security-coach:scan`.
  - `hookSpecificOutput.additionalContext` to the model: a "SECURITY NOTE" telling it to treat the
    result as untrusted data. The full note is sent on the first hit in a session and a short form
    after that (`spotlight.js:52-63`).
- **Can block:** no. It only warns. A PostToolUse hook cannot rewrite the result, and the known
  false positives, such as an article quoting an attack, make a gate wrong here
  (`spotlight.js:4-7`).
- **Fail-open:** logs to `spotlight` or `spotlight-observe` and exits 0. If the bookkeeping query
  fails, the full warning is still sent (`engine.js:1376`).

## notice.js

- **Event:** `Notification` with no matcher. Timeout 10 s (`hooks.json:22-24`).
- **What it does** (`notice.js:15-39`): when the `corrections` setting is on, it matches the
  notification text against `error|failed|failure|incorrect|wrong|mistake|deprecated|broken`. On a
  match it records a correction with the message and the session's scrubbed first prompt. Most
  notifications match nothing, and the hook stays silent.
  - `coach` does **not** gate this. It only controls display, so turning it off does not empty the
    data that `/prompt-coach:prompt-stats` reads (`notice.js:23-27`).
- **Writes:** a `corrections` row, plus the session row if it is missing.
- **Prints:** nothing. A correction surfaces later, as the top coach line in the next brief.
- **Can block:** no (`notice.js:38`).
- **Fail-open:** logs to `notice` and exits 0.

## precompact.js

- **Event:** `PreCompact` with no matcher. Timeout 10 s (`hooks.json:25-27`).
- **What it does** (`precompact.js:10-22`, `engine.js:1496-1534`): writes a short Markdown
  snapshot with:
  - the branch
  - up to 8 files this session touched, most recent first
  - the last `FAIL` digest
  - up to three open corrections

  There is no model call.
- **Writes:** `~/.ai-coach/snapshots/<session-id>.md`, and nothing when there is nothing to say.
  The next `SessionStart` with source `compact` reads it once and deletes it.
- **Prints:** nothing.
- **Can block:** no. Compaction is never delayed by it (`precompact.js:17-18`).
- **Fail-open:** logs to `precompact` and exits 0.

## session-end.js

- **Event:** `SessionEnd` with no matcher. Timeout 60 s (`hooks.json:28-30`).
- **What it does** (`session-end.js:10-65`):
  1. Re-reads Claude Code's session name to catch a rename made mid-session.
  2. Stamps `ended` with **no** summary. The prompt is never used as a fallback summary, because
     summaries can travel in a committed seed (`session-end.js:29-35`).
  3. When `learn` is on and the session has a first prompt or at least 3 observations, it makes one
     `claude -p` call (Haiku by default, 45 s budget). The call gets the first prompt and the last
     40 observations, and returns a summary of at most 200 characters and 0–3 learnings.
     - Each learning that is not already known (`hasText`) is added as a `learning`, stamped
       `distilled`, with confidence clamped to 0.3–0.95 (default 0.6) (`session-end.js:37-53`,
       `session-end.js:67`).
     - The summary is stored, but it is not approved for sharing until a person approves it
       ([engine.md](../engine.md#summary-approval)).
  4. Prunes observations and prompt signals older than 30 days, and `distilled` memories that were
     never recalled and are older than 90 days.
  5. Does **not** export a seed. Sharing is a deliberate `/memory-coach:handoff`
     (`session-end.js:58-60`).
- **Writes:** `sessions` (`ended`, `summary`, `name`), `memories` and deletions.
- **Prints:** nothing.
- **Can block:** no.
- **Fail-open:** logs to `session-end` and `session-end.haiku`, and exits 0. A failed model call
  starts a one-hour cooldown for distillation only. A missing `claude` binary cools every model
  feature.

## Configuration

All settings belong to this plugin and are documented in [engine.md](../engine.md#settings). Each
one, and the hook it changes:

| Setting | Hook it changes |
|---|---|
| `brief_chars` | `session-start.js` |
| `coach` | `prompt.js` (hints) and the coach line in the brief |
| `corrections` | `notice.js` |
| `learn` | `session-end.js` |
| `plan_review` | `prompt.js` |
| `guard` | `guard.js` |
| `spotlight` | `spotlight.js` |
| `partners` | `session-start.js` |
| `default_trust` | the brief and search ranking |

`AICOACH_INNER` disables every hook. `AICOACH_LLM_CMD`, `AICOACH_MODEL` and `AICOACH_CLAUDE_BIN`
change the two model calls. See
[engine.md](../engine.md#environment-variables-that-are-not-settings).

## Data it keeps

Everything is described in [engine.md](../engine.md#storage). In short:

- **User scope**, `~/.ai-coach/`: `user.db`, `projects/<slug>/coach.db`, `bin/`, `memory/`,
  `settings.json`, `log.jsonl`, `snapshots/`, the cooldown markers and `partners-seen`. Never
  committed.
- **Repo scope**, `.ai-coach/`: the hooks only read it. `project.md` and `team.md` are committed,
  and the hooks never write either one. `team-seed.jsonl` is written by `/memory-coach:handoff`
  through the engine, not by a hook.

## Limits and known issues

- `guard` is off by default. An install that has not turned it on has no credential blocking at
  all (`guard.js:5-7`).
- Neither the guard nor the spotlight sees image content. Both are regex heuristics: the guard
  matches credential shapes, and the spotlight is described as low-confidence and "never a gate"
  (`engine.js:1743-1749`).
- The spotlight skips any `Read` inside the session's `cwd`. An injection planted in a repo file is
  not flagged on read.
- Prompts shorter than 25 characters, and slash or bang commands, are never evaluated
  (`prompt.js:34`).
- Distillation needs `claude` on PATH, or `AICOACH_LLM_CMD`. Without it, sessions end with no
  summary and no learnings, and nothing reports it.
- Claude Code's session name is read from `~/.claude/sessions/*.json`, which is internal to Claude
  Code. When that layout changes, the engine keeps its own name (`engine.js:1299-1331`).
- Open issues that touch these hooks:
  - [#45](https://github.com/MohammedMoataz/ai-coach/issues/45): memory search finds nothing for
    non-Latin text.
  - [#34](https://github.com/MohammedMoataz/ai-coach/issues/34): settings from a web UI (a
    question).
  - When the same scripts run under other harnesses through `adapters/shim.js`:
    - [#35](https://github.com/MohammedMoataz/ai-coach/issues/35): the Antigravity guard never
      sees tool input.
    - [#36](https://github.com/MohammedMoataz/ai-coach/issues/36): the Windsurf guard's ask and
      credential-file tiers never fire.
    - [#37](https://github.com/MohammedMoataz/ai-coach/issues/37): Windsurf prompt signals are
      never recorded.
    - [#38](https://github.com/MohammedMoataz/ai-coach/issues/38): Cursor ignores the guard's
      `ask` verdict.
    - [#39](https://github.com/MohammedMoataz/ai-coach/issues/39): the shim kills session-end at
      30 s, against a 45 s distillation call.
    - [#40](https://github.com/MohammedMoataz/ai-coach/issues/40): the shim relays guard reasons
      with doubled backslashes.

## Source map

- [`../../plugins/ai-coach-core/.claude-plugin/plugin.json`](../../plugins/ai-coach-core/.claude-plugin/plugin.json):
  the manifest and the `userConfig` settings.
- [`../../plugins/ai-coach-core/hooks/hooks.json`](../../plugins/ai-coach-core/hooks/hooks.json):
  event, matcher and timeout for every hook.
- [`../../plugins/ai-coach-core/hooks/session-start.js`](../../plugins/ai-coach-core/hooks/session-start.js):
  bootstrap, the settings snapshot, the session row and the brief.
- [`../../plugins/ai-coach-core/hooks/prompt.js`](../../plugins/ai-coach-core/hooks/prompt.js):
  prompt signals, hints and plan-mode review.
- [`../../plugins/ai-coach-core/hooks/guard.js`](../../plugins/ai-coach-core/hooks/guard.js): the
  secrets guard.
- [`../../plugins/ai-coach-core/hooks/observe.js`](../../plugins/ai-coach-core/hooks/observe.js):
  observation rows, with `FAIL` marking.
- [`../../plugins/ai-coach-core/hooks/spotlight.js`](../../plugins/ai-coach-core/hooks/spotlight.js):
  the injection-marker warning on fetched content.
- [`../../plugins/ai-coach-core/hooks/notice.js`](../../plugins/ai-coach-core/hooks/notice.js):
  corrections from failure notifications.
- [`../../plugins/ai-coach-core/hooks/precompact.js`](../../plugins/ai-coach-core/hooks/precompact.js):
  the pre-compaction snapshot.
- [`../../plugins/ai-coach-core/hooks/session-end.js`](../../plugins/ai-coach-core/hooks/session-end.js):
  close, distil and prune.
- [`../../plugins/ai-coach-core/hooks/engine.js`](../../plugins/ai-coach-core/hooks/engine.js): the
  engine. See [engine.md](../engine.md).
- [`../../plugins/ai-coach-core/memory/schema.sql`](../../plugins/ai-coach-core/memory/schema.sql)
  and [`user-schema.sql`](../../plugins/ai-coach-core/memory/user-schema.sql): the database
  schemas.
- [`../../plugins/ai-coach-core/hooks/engine.test.js`](../../plugins/ai-coach-core/hooks/engine.test.js)
  and [`hooks.test.js`](../../plugins/ai-coach-core/hooks/hooks.test.js): the tests.
