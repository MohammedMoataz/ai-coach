---
description: Write study material explaining the project's design patterns and technologies - the why, not the how-to - into ./study. Use for "/study", "help me study this codebase", "explain the patterns used here".
argument-hint: "[<area>] [--full] [--project]"
disable-model-invocation: true
---

# /study — the why, written down

Onboarding docs tell a newcomer what to do; nothing tells them why the code is shaped this way.
This skill writes explanation — Diátaxis's neglected quadrant — into `./study/`: the patterns and
technologies actually used, each tied to the real instance that proves it. It reads a lot of
code: expect a real token spend; pass an area argument to bound it. Sweeps go to Explore
subagents — keep conclusions, not file dumps.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Scope

Default: all areas, surface depth — the patterns a newcomer will actually meet. **Areas are
never assumed — they are discovered from the project's structure**: backend/frontend for a
classic web app, one area per service for microservices, engine/cli for a tool — whatever the
architecture actually is. An area argument writes only that directory. `--full`: every pattern
found, not just the core ones. `--project`: span the repos in `.ai-coach/project.md`.

## Steps

1. **Detect** what exists under `study/` (generated-by line = regenerable; without it =
   hand-written, ask first).
2. **Discover the areas**: `docs/onboarding/stack.md` (written by `/investigation-coach:onboard`)
   already names the roots — when it exists it IS the area list, so spot-check it against the tree
   rather than re-deriving it. When it does not, read the project structure (roots, manifests) and
   name the real architectural areas yourself. Then sweep via Explore subagents, one per area:
   which design patterns and technologies are actually in use, with one proving instance each.
   A pattern with no instance is not in use — it is not written up.
3. **Write** (structure and voice in `references/structure.md` — load before writing):

```
study/
  index.md            threshold concepts + reading order + the discovered areas
  <area>/*.md         one directory per discovered area, one file per pattern/technology
  cross-cutting/*.md  the concerns spanning every area: auth, errors, config, logging, testing
```

   `cross-cutting/` is the one constant — every project has spanning concerns. Everything else
   follows the architecture; an area the project doesn't have is never scaffolded, and index.md
   names what was discovered so absence reads as a fact.
4. **Remember.** After a verified write — the files exist, and re-reading one shows the content you
   intended, generated-by line included:
   `ENGINE add reference "study material at study/ (<areas>)" 0.75`.

## Rules

- Explanation only: why this pattern here, what it trades away, how it interacts. Setup steps
  belong to `/onboard`'s start-here; API shapes belong to reference docs — neither belongs here.
- Every pattern claim cites a real instance (`file:line`). No instance, no chapter.
- Wikilinks between study notes and to `docs/onboarding/` notes — open the repo root in Obsidian
  and study/ joins the same graph.
- Filenames: no `* " \ / : | ?`.
- Re-run = amend, never silent overwrite of hand-written files.

## Related

`/investigation-coach:onboard` gets someone working; this makes them understand.
