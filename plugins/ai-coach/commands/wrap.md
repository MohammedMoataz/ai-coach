---
description: Finish a piece of work properly - publish the debrief, export the seed, and say what to commit. The two-step the docs already require, typed once.
argument-hint: "[--name <label>] [--encrypt]"
disable-model-invocation: true
---

# /wrap — the work is not done until it can be picked up

Two skills already own the ending of a piece of work, and their own documentation orders them:
a seed exported without a debrief "carries attribution without the reasoning behind it". This
command is that ordering, typed once. It adds no behaviour of its own — every gate the two skills
have stays exactly where it is, because the point of a wrap-up is deliberateness, not speed.

If memory-coach is not installed, say so and stop — there is nothing to wrap with.

## Sequence

1. **Publish the conclusion.** Run the `/memory-coach:debrief` skill, forwarding `--name <label>`
   if it was given. Follow that skill exactly: the session digest, the four required sections,
   and the draft shown for approval before anything is published. If the user reads the draft
   and decides the session does not deserve a debrief, that is a fine outcome — say so, skip to
   step 2, and note in the report that the seed will carry attribution only.
2. **Export the seed.** Run the `/memory-coach:handoff` skill, forwarding `--encrypt` if it was
   given. Its own gate stands: `whoami` first, and stop to ask for anything on the `missing`
   list before exporting — a wrap-up that ships anonymous work has wrapped nothing.
3. **Say what leaves the machine, and how.** Report the debrief key exactly as printed, the
   export counts exactly as printed, and the one step this command cannot do for the user:

   ```
   git add .ai-coach/team-seed.jsonl && git commit
   ```

   Nothing has left this machine until that commit is pushed — say that plainly, because the
   whole design is that knowledge travels by git, reviewable in a pull request, never by sync.

## Rules

- Never skip a gate to make the wrap feel faster. The debrief draft is shown, the identity check
  runs, and declining either is a legitimate answer this command reports rather than argues with.
- Never commit or push for the user. The seed enters git when a person decides it does.
- One piece of work per wrap. If the session plainly contains two unrelated pieces of work, say
  so and suggest two debriefs — a conclusion that covers everything concludes nothing.
