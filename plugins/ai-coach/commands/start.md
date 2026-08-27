---
description: Day one on a project - register who you are, declare what the product is, then generate the onboarding docs, in the order the skills already document. A guided sequence, not automation.
argument-hint: "[--feature <name>] [--with-blueprint]"
disable-model-invocation: true
---

# /start — four names nobody should need on day one

Setting up a project properly is four invocations across three plugins, in a documented order —
and the person who needs them most is the person who has not yet learned any of the names. This
command is the sequence. It automates nothing: every step below asks its own questions and keeps
its own gates, because they are all decisions, and the command's only job is that nobody has to
know the map before the tool that draws maps has run.

Before starting, say what the whole sequence will do and roughly what it costs — the onboarding
tour is three code-reading skills back to back — and let the user trim it. Each step that belongs
to a plugin that is not installed is skipped by name: "skipped study — investigation-coach not
installed" is a fine report line, and a partial install degrades this sequence, never fails it.

## Sequence

1. **Who you are.** Run the `/memory-coach:roster` skill with no argument: the roster joined with
   trust, `whoami` if the user is not listed, and the offer to register them. Registering is per
   person and never done on someone's behalf — if the user declines, record that and continue;
   memory works unregistered, it just attributes less.
2. **What this product is.** From the same skill: `project`. If the project is implicit and the
   user works across sibling repos (ask — one question), `declare <name>` groups them so a
   backend and a frontend share one memory. Single-repo work needs nothing here, and the right
   report line is "implicit project, nothing to declare".
3. **The docs.** Run the `/investigation-coach:onboard` skill with `--tour`, forwarding
   `--feature <name>` if given. The tour's own rules stand: it states the total cost before
   starting, stops after any step the user asks to stop at, and skips a step whose output already
   exists and is current. This is where most of the sequence's time and tokens go — the user was
   told at the top, but the tour says it again with real numbers.
4. **The business, only if asked.** With `--with-blueprint`, run the `/strategy-coach:blueprint`
   skill afterwards — it reads what the tour just wrote instead of re-deriving it, which is the
   reason it goes last. Without the flag, mention it in one line and stop; "what the business is"
   is a second piece of work, and defaulting into it would double the bill uninvited.
5. **Report.** One list: what was set up, what was skipped and why, what exists now that did not
   exist an hour ago (with paths), and the one-line next steps — `/memory-coach:recall` when a
   question matches prior work, `/ai-coach:wrap` when a piece of work finishes.

## Rules

- Never invent an identity, a project name, or a branch convention. Every one of those is a
  question with an owner, and the owner is in the chair.
- Re-running is safe and says so: every underlying skill amends rather than overwrites, and this
  command inherits that by adding nothing of its own.
- If the repo already has current onboarding docs, say so and shrink the sequence — day one on a
  documented project is steps 1 and 2 plus a pointer to `docs/onboarding/index.md`.
