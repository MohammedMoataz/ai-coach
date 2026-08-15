---
description: Map the architecture - services, components, and who calls whom - as an artifact page, markdown diagrams, and an Obsidian canvas. Use for "/map", "architecture diagram", "how do the services connect".
argument-hint: "[--full] [--feature <name>] [--project]"
disable-model-invocation: true
---

# /map — one model, three renderings

An architecture doc is a set of claims about who calls whom. This skill traces those claims from
the code — every edge carries `file:line` evidence or is marked **INFERRED** — then renders one
model three ways: a shareable artifact page, markdown diagrams that render on GitHub, and an
Obsidian canvas. It reads a lot of code: expect a real token spend; scope with `--feature` to
bound it. Tracing goes to Explore subagents — keep conclusions, not file dumps.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Scope

Default: this repo, surface layer — the services/components on the core paths. `--full`:
everything. `--project`: span the repos in `.ai-coach/project.md`. `--feature <name>`: one
feature traced end to end (sequence diagram + its feature note only). Large repo and no flag:
AskUserQuestion (multiSelect) offering the detected top areas — never map a huge system
unprompted.

## Steps

1. **Trace** via Explore subagents: services, components, and the call/data edges between them.
   An edge without evidence is either dropped or kept as INFERRED — never silently promoted.
2. **Render** (rules and canvas format in `references/canvas.md` — load before writing):
   - **Artifact page** — load the `artifact-design` skill first, then publish: a C4-style
     context + container view drawn as mermaid `flowchart`/`subgraph` (never mermaid's
     experimental C4 diagram type), one `sequenceDiagram` per core flow. Split any diagram past
     ~15-20 nodes. The page states its evidence discipline and marks INFERRED edges visibly.
     Artifacts start private — tell the user where the share menu is.
   - **`docs/onboarding/architecture.md`** — the same diagrams as mermaid fences plus a component
     table (component · responsibility · talks to · evidence).
   - **`docs/onboarding/architecture.canvas`** — JSON Canvas: nodes = services/components grouped
     per layer, edges = calls with labels.
   - **`docs/onboarding/features/<feature>.md`** — one wikilinked vault note per feature the map
     demonstrates (skip ones that already exist; amend if stale).
3. **Remember.** After verified writes:
   `ENGINE add reference "architecture map at docs/onboarding/architecture.md (<scope>)" 0.75`.

## Rules

- Every edge cites evidence or says INFERRED. A map that guesses quietly is worse than no map.
- ≤15-20 nodes per diagram — split, don't cram. The canvas holds the full picture; diagrams hold
  one view each.
- Never mermaid's C4 diagram type: experimental, and GitHub won't render it.
- Node and file names sanitized: no `* " \ / : | ?` (Obsidian refuses them).
- Re-run = amend: regenerate only generated files that went stale; hand-written files are asked
  about, never clobbered.

## Related

`/investigation-coach:onboard` writes the words; this draws the picture.
