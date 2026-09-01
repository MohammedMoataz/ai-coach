# Contributing

Thanks for looking. This file is the short version of what the checker enforces and why, so you
can find that out before a CI run tells you.

The one thing worth reading first: **this repository has no runtime dependencies and intends to
keep none.** There is no `package.json`, no lockfile, no install step. Everything runs on Node's
own standard library — `node:sqlite` for storage, `node:test` nowhere at all (the suites are plain
scripts that exit non-zero). A pull request that adds a dependency needs to argue for it in the
description, because the answer is usually no.

## Getting set up

```bash
git clone https://github.com/MohammedMoataz/ai-coach
cd ai-coach
node .github/check-manifests.js
```

That is the whole setup. **Node 22.16+ or 24+** — the floor is not arbitrary: `node:sqlite` has to
be both unflagged (22.13) and built with FTS5 (22.16 / 24.0), and every search in the product rests
on FTS5. The 23.x line ships the module without FTS5 and is deliberately untested. CI asserts this
first, before any suite, so a missing feature reports itself instead of surfacing as a confusing
query error three files later.

To try your changes in a live session:

```bash
claude plugin marketplace add /absolute/path/to/this/repo
claude plugin install ai-coach@ai-coach
```

Plugins are loaded at session start. After `claude plugin update`, **restart the session or run
`/reload-plugins`** — a running session keeps the skill and command bodies it loaded, and every
"I fixed it but it still does the old thing" report so far has been this.

## Before you push

Four commands. All four run in CI on Windows and Ubuntu across four Node versions.

```bash
node plugins/ai-coach-core/hooks/engine.test.js
node plugins/ai-coach-core/hooks/hooks.test.js
node plugins/atlas-coach/tools/ingest.test.js
node .github/check-manifests.test.js
node .github/check-manifests.js
```

**Run the checker bare — never piped.** `node .github/check-manifests.js | tail` swallows the exit
code, and that is not hypothetical: a real failure shipped in a commit that way. If you want less
output, read less of it.

The checker has its own test suite, which breaks the repo in a throwaway copy and asserts the
checker notices. A lint that passes by finding nothing is not a lint, so if you add a rule, add the
fixture that proves it fires.

## What the checker enforces

Most review comments would otherwise be about these, so they are automated instead.

**Versions move together.** A plugin's own `plugin.json`, its entry in `.claude-plugin/marketplace.json`,
and the CHANGELOG section naming it must all agree. The release number *is* the `ai-coach` bundle
version, and the CHANGELOG's newest section must carry a bolded ship line listing every plugin it
ships:

```markdown
## v1.11.0 — The walk before the work (2026-08-29)

**prompt-coach 1.2.0 · ai-coach 1.11.0**
```

That line is parsed, so it has to be exactly one bolded line with claims separated by `·`. Bold
each half separately and the parser will not see it. This drift shipped once before the rule
existed.

**Skills need a trigger, not just a name.** Every `SKILL.md` needs YAML frontmatter with a
`description` that says *when* to use it — the words `use for`, `use when`, `use before` or
`use after` must appear. That description is what routing matches on; without a trigger the skill
is reachable only by someone who already knows it exists. Ceiling is 1024 characters, and no angle
brackets.

**Agents name their tools.** An agent's frontmatter `name` must match its filename (that is what
skills spawn it by), and it must list `tools`. An agent with every tool is an agent nobody scoped —
`security-coach`'s `examiner` reads suspected-injection content with `Read` and `Grep` only, no
shell and no network, and that boundary only exists because it is written down.

**Commands are user-only, always.** Every file under a plugin's `commands/` needs
`disable-model-invocation: true`. This is load-bearing: the bundle's claim of costing nothing at
session start rests on no command description entering the model's context. A cross-plugin command
must also say what a partial install does — the words `not installed`, `missing` or `skipped` have
to appear somewhere in it.

**Cross-plugin references resolve.** Mention `/other-plugin:skill` and it has to exist. Manifests
cannot enforce dependencies (they are metadata), so the convention instead is a fallback sentence:
*"when X is installed, use its agent; without it, do the same inline."* Prefer that over a
dependency declaration that nothing checks.

**The CLI is the ABI.** Skills reach the engine by shelling out to `ENGINE <verb>`. Every verb any
skill or agent names is checked against the engine's own dispatch switch, because renaming one
breaks skills silently and no test would catch it.

## Things the checker cannot see

**Line endings.** `.gitattributes` forces LF on every text format. Hooks are executed, not read —
a CRLF shebang is a broken hook. Do not fight it with editor settings.

**A command cannot run a user-only skill.** Claude Code blocks the Skill tool for a user-only skill
even from inside a command the user typed, and forbids reproducing that skill's steps another way.
So for anything still user-only, a command's product is a prepared runway rather than a landing:
read state, check the gates, hand over the exact line to type. Which skills stay behind that line is
a judgement, not a default — v1.14.0 moved the four documentation skills out from behind it so
`/ai-coach:start --run` could chain them, and kept the roster there because registering someone is
a decision with an owner. The test to apply: does firing this commit the user to something only they
can decide? A command also cannot tell what is installed by looking at its own context — user-only
skills are invisible to it by design — so it runs `claude plugin list` instead. Both of these were
learned by shipping the opposite.

**Flipping `disable-model-invocation` off makes the description the only gate.** A model-invocable
skill that reads a lot of code or writes files has to say in its own description when it may fire
and that it never fires unprompted. There is nothing else holding it back.

**Nothing a model wrote may pass for something a person decided.** Every memory carries a
`provenance` of `human`, `distilled` or `imported`, and there is deliberately no code path that
promotes one to another. An agent is not an approval boundary. If a change would create such a
path, it will be declined regardless of how convenient it is.

**Claims carry their evidence.** "No source, no claim" and the `UNVERIFIED` marker are stated
identically in several skills on purpose. Do not soften them, and do not add a claim to the README
or a skill body that you have not run. If you state a number, say how it was measured — the
always-on token figure was wrong for five releases because it came from a tool that counts every
description as always-on regardless of `disable-model-invocation`.

## Pull requests

Branch from `main`, one concern per PR, and say in the description what you ran and what it
printed. A green CI badge is not the same as evidence: paste the output.

Commit messages here explain *why*, in prose, not just what changed — read a few with
`git log` before writing one. If a change fixes a bug, say what the root cause was, not only the
symptom.

Releases are annotated git tags, one per plugin that shipped:

```bash
git tag -a "prompt-coach--v1.2.0" -m "prompt-coach 1.2.0 — The walk before the work"
```

Tagging is a maintainer step; you do not need to do it in a PR.

## Reporting things

Bugs and ideas: open an issue. **Security: do not open an issue** — `SECURITY.md` has the address
and what to include. Anything exploitable goes there first.

## License

By contributing you agree your work is licensed under the MIT License in `LICENSE`.
