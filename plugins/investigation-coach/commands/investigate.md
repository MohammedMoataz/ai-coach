---
description: The whole investigation in one command - onboard, then map, then study, each reading what the last one wrote. Says the cost first and stops wherever you tell it to.
argument-hint: "[--project] [--feature <name>] [--full] [--diagrams drawio]"
disable-model-invocation: true
---

# /investigate — onboard, map, study, typed once

The three skills of this plugin have an order that matters: `map` and `study` read the `stack.md`
that `onboard` writes, instead of sweeping the repo again. `/investigation-coach:onboard --tour`
already owns that sequence. This command is its name, so nobody has to know about a flag.

Invoke `investigation-coach:onboard` through the Skill tool with `--tour`, and pass along every
flag you were given, unchanged: `--project`, `--feature <name>`, `--full`, `--diagrams drawio`.
The tour decides which flags each later skill gets. Handing a skill a flag it does not define is
undefined behaviour, so leave that sorting to the tour.

## Rules

- Never run the three skills yourself, one after another. The tour is the one place that owns the
  order and the flag forwarding, and a second copy of it would drift from the first.
- The tour's gates stay where they are. It says the total cost before it starts, because this is
  three code-reading skills back to back. It stops after any step the user asks to stop at.
- A step whose output already exists and is current is skipped by the tour, and named as skipped
  with the reason. All three skills ship in this plugin, so no step is ever missing.
