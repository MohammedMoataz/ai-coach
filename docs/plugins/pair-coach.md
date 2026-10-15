# pair-coach

Lets a developer and Claude talk through the code itself. Write a comment that starts with
`@claude` where the question or the instruction belongs, and Claude answers inline, makes the
change and says so, or asks back, always addressed to the developer by their own git name.
`/pair-coach:pair` builds a task and hands the developer the few lines that are genuinely theirs to
write. The plugin touches neither memory nor the engine
([plugin.json:5](../../plugins/pair-coach/.claude-plugin/plugin.json)).

| | |
|---|---|
| Version | 1.0.0 |
| Depends on | `ai-coach-core` `^1.9.0` |
| Source | [`plugins/pair-coach/`](../../plugins/pair-coach/) |

## What it ships

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `mentions` | skill | `/pair-coach:mentions [dir or file]`. Model-invocable, so the hook's line can lead to it | Answers every open `@claude` thread inline: a reply, a change plus a one-line reply, or a question back |
| `pair` | skill | `/pair-coach:pair <task>`. User-only | Builds a task and leaves one to three stubs for the developer, each failing loudly until written |
| `mentions.js` | script | `node scripts/mentions.js json\|list\|added\|whoami [dir or file]` | The one thread parser, shared by the hook and both skills |
| `mentions-nudge.js` | hook | `UserPromptSubmit` | Adds one context line when the developer's own uncommitted lines hold open threads |

## The thread grammar

A thread is a run of adjacent comment lines with at least one addressed line
([mentions.js:27](../../plugins/pair-coach/scripts/mentions.js)).

- A **comment line** starts, after indentation, with `//`, `#`, `--`, `/*`, `*` or `<!--`
  ([mentions.js:20](../../plugins/pair-coach/scripts/mentions.js)). In `.md` and `.mdx` files only
  `<!--` counts, so prose and code fences that show the syntax never match
  ([mentions.js:21](../../plugins/pair-coach/scripts/mentions.js)). A mention inside a string
  literal or in prose is not a mention.
- `@claude` addresses Claude, with or without a colon. A person is addressed as `@Name:`, **with**
  a colon, so `@param`, `@returns` and decorators are never people
  ([mentions.js:24-25](../../plugins/pair-coach/scripts/mentions.js)).
- The **last** addressed line decides whose turn it is: `@claude` means open, anyone else means
  waiting on them. A thread ends when it is deleted; there is no resolved marker.

```js
// @claude why is this a Map and not an object?   <- open: Claude's turn
// @Dana: ids are numbers here; object keys
//   coerce to strings, a Map keeps them numbers. <- waiting on Dana
```

## Who replies are addressed to

`mentions.js whoami` reads `git config user.name` (repository config first, then global) and
removes the whitespace. Without one it falls back to `$USER` or `$USERNAME`, then to `you`
([mentions.js:61](../../plugins/pair-coach/scripts/mentions.js)). No name is written into the plugin:
the parser only has to tell `@claude` from everybody else, and each developer on a team gets their
own handle from their own config.

## mentions

1. Resolve the handle, then sweep with `mentions.js json`. The sweep uses `git grep` over tracked and
   untracked files (gitignored ones skipped), or one file when given a file
   ([mentions.js:84-86](../../plugins/pair-coach/scripts/mentions.js)). Binary files and files over
   1 MB are skipped ([mentions.js:69](../../plugins/pair-coach/scripts/mentions.js)).
2. Every `@claude` line is blamed separately
   ([mentions.js:76](../../plugins/pair-coach/scripts/mentions.js)). A line someone else committed
   is not an instruction from this developer, even when it sits directly above their own line, so
   all such lines go into one question and only the selected ones are acted on. With no question
   tool, as in a headless run, they are skipped and reported
   ([mentions/SKILL.md:47](../../plugins/pair-coach/skills/mentions/SKILL.md)).
3. Each open thread is answered in its own comment syntax and indentation. The skill only appends;
   it never rewrites the developer's lines.

## pair

Claude writes everything with one reasonable answer (structure, plumbing, tests) and leaves one to
three stubs where the call is the developer's
([pair/SKILL.md:23](../../plugins/pair-coach/skills/pair/SKILL.md)). Each stub is a thread addressed
to the developer above a body that throws, so an unwritten stub cannot ship as quietly wrong
behaviour ([pair/SKILL.md:26](../../plugins/pair-coach/skills/pair/SKILL.md)). Replying
`@claude check this` under a stub reopens it for review by `mentions`.

## Hooks

| Event | Script | What it does |
|---|---|---|
| `UserPromptSubmit` | `mentions-nudge.js` | Reads only lines the developer added and has not committed (`git diff -U0 HEAD` plus untracked files, [mentions.js:118](../../plugins/pair-coach/scripts/mentions.js)). Names at most five locations ([mentions-nudge.js:15](../../plugins/pair-coach/hooks/mentions-nudge.js)) |

Silent when there are no open threads, outside a git repository, or on any error. It never blocks
a prompt, writes nothing, and exits at once when `AICOACH_INNER` is set
([mentions-nudge.js:6](../../plugins/pair-coach/hooks/mentions-nudge.js)).

## Configuration

None. The handle comes from git config.

## Data it keeps

None. Threads live in the code; deleting one is the only state change.

## Limits and known issues

- No live watching. A thread is picked up on the next prompt or the next `/pair-coach:mentions`;
  waking an idle session from a file change is not documented by Claude Code.
- A person's handle cannot contain whitespace, a colon or `@`.
- A committed `@claude` line on an unchanged line of an edited file is never surfaced by the hook,
  only by the skill's sweep.

## Tests

[`scripts/mentions.test.js`](../../plugins/pair-coach/scripts/mentions.test.js) runs in CI. It checks
every comment style, the markdown rule, string literals and doc tags, thread state, per-line
authorship in a mixed thread, the file and directory arguments, the hook's added-lines-only rule,
and that the handle comes from the test repository's own random `user.name`.

## Source map

- [`../../plugins/pair-coach/.claude-plugin/plugin.json`](../../plugins/pair-coach/.claude-plugin/plugin.json): manifest
- [`../../plugins/pair-coach/scripts/mentions.js`](../../plugins/pair-coach/scripts/mentions.js): the thread parser
- [`../../plugins/pair-coach/hooks/mentions-nudge.js`](../../plugins/pair-coach/hooks/mentions-nudge.js): the prompt hook
- [`../../plugins/pair-coach/skills/mentions/SKILL.md`](../../plugins/pair-coach/skills/mentions/SKILL.md): answering threads
- [`../../plugins/pair-coach/skills/pair/SKILL.md`](../../plugins/pair-coach/skills/pair/SKILL.md): pair mode
