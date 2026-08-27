---
description: Templates and a review for prompts you are about to send. Use for "/prompt", "help me write this prompt", "review my prompt".
argument-hint: <bugfix|feature|refactor|research|review|rules> [draft to review]
disable-model-invocation: true
model: haiku
effort: low
---

# /prompt — write prompts that land

A prompt is a brief for someone competent who has never seen your project. The recurring failure is
not rudeness or length — it is a missing fact the reader had no way to supply: which file, what
"working" looks like, what must not change.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Modes

**A template name** (`bugfix` | `feature` | `refactor` | `research` | `review`) — print the template
**filled in from what you already know** in this session: the file under discussion, the branch, the
error text, the test command. Leave a blank where nothing is known rather than inventing a
plausible value; a wrong specific is worse than an honest gap.

**A pasted draft** — review it. Quote each weak spot, then give **exactly one** rewrite, then one
line saying why the rewrite should work better. One rewrite, not three: a menu of options moves the
judgment back onto the person who asked for help.

**`rules`** — print the twelve rules below. `references/rules.md` holds the full set with sources
and dates, numbered 1-22 — the twelve here are the ones worth reciting, and each names its
reference id in brackets so "the rule behind this signal" resolves to exactly one entry in either
list. Load the reference only when the user wants the reasoning.

**No argument** — ask for the prompt to check, in one line: "paste the prompt and I will check it".
A skill cannot read the previous turn, so there is nothing to run `prompt-check` against until
something is pasted. If the user would rather see the list, `rules` prints it.

## The rules

The bracket after each rule is its id in `references/rules.md`, which numbers all twenty-two. A
detector name in `/prompt-coach:prompt-stats` output is that same id, so a signal, a rule here and
an entry there are three views of one thing rather than three numbering schemes.

1. **Name the file, not "this file"** — `@path`. The agent cannot see your cursor. [ref 1,
   `deictic-no-path`; and ref 2, `action-no-ref`, for a verb with no target]
2. **Say what done looks like** — a test, a command, an observable behavior. [ref 3,
   `no-done-criteria`]
3. **Ask for evidence, not a claim** — "show the passing output", not "make sure it works". [ref 10]
4. **Imperative, not hedged** — "Change X" edits; "Could you look at X" only suggests. [ref 5,
   `hedged-opener`]
5. **Say what to do, not only what to avoid** — positive instructions land; prohibitions drift.
   [ref 6, `negative-only`]
6. **State what is out of scope** — or expect more changed than you asked for. [ref 9,
   `no-scope-clause`]
7. **Point at an example already in the repo** — "follow the shape of `@src/orders/list.ts`" beats
   any adjective, and constrains it to libraries you already use. [ref 11]
8. **Long input first, the ask last** — for anything with a big paste, this measurably helps.
   [ref 7, `paste-after-ask`]
9. **Say why** — intent lets the agent make the right call where your wording is ambiguous. [ref 17]
10. **One outcome per prompt** — split anything with an "and also". [ref 4, `multi-ask`]
11. **Two failed corrections → stop** — `/clear` and write a better first prompt. A third patch on
    a confused thread is the most expensive thing you can do. [ref 15]
12. **Broad investigation → a subagent** — but not reflexively; a single grep is often faster.
    [ref 16, and ref 22 on scoping it]

## Templates

**bugfix**
```
@<file> fails: <symptom, exact error text>.
Repro: <command or steps>. Expected: <behavior>.
Find the root cause rather than guarding the symptom. Prove it with <test command>.
```

**feature**
```
Add <capability> to @<file>. Done when: <observable check>.
Follow the shape of @<existing example>. Use only libraries already in the project.
Out of scope: <what not to touch>.
```

**refactor**
```
Refactor @<target> to <goal>. Behavior must not change: <test suite> passes before and after.
No API changes unless listed. Mechanical and repeated? Use ast-grep with a fix rule, not per-file edits.
```

**research**
```
Question: <one sentence>. Decision this informs: <decision>.
Prefer <sources>. Every claim needs a source or a code citation; mark anything unverified.
Output: <comparison table | recommendation | cited summary>.
```

**review**
```
Review <diff/branch/@files> for <correctness|security|performance>.
Severity-tagged findings, file:line evidence, most severe first.
Skip style nits unless they change meaning.
```

## Rules

- One rewrite per review. Never a menu.
- Never rewrite a prompt into something that asks for more than the user wanted — tightening is not
  scope creep.
- Rules are dated bets on how the current models behave, not eternal truths. If a rule in
  `references/rules.md` is marked stale for the model in use, say so instead of enforcing it.

## Related

- Your own prompt habits, measured: `/prompt-coach:prompt-stats`.
- Do not use this to look up project knowledge — that is `/memory-coach:recall`.
