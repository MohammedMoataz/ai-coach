---
description: Map the architecture — services, components, who calls whom — as an artifact page, markdown diagrams, one Obsidian note per component, a canvas, and optionally draw.io. Use when the user explicitly asks ("/map", "architecture diagram", "how do the services connect"), or when onboard --tour or /ai-coach:start --run chains it; never proactively, it reads a lot of code and writes files.
argument-hint: "[--full] [--feature <name>] [--project] [--diagrams drawio]"
---

# /map — one model, several renderings

An architecture doc is a set of claims about who calls whom. This skill traces those claims from
the code — every edge carries `file:line` evidence or is marked **INFERRED** — then renders one
model several ways: a shareable artifact page, markdown diagrams that render on GitHub, a note per
component whose links make the vault's graph view the architecture, and an Obsidian canvas that
places those notes. It reads a lot of code: expect a real token spend; scope with `--feature` to
bound it. Tracing goes to `scout` agents — keep conclusions, not file dumps.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

## Scope

Default: this repo, surface layer — the services/components on the core paths. `--full`:
everything. `--project`: span the repos in `.ai-coach/project.md`, writing into the `docs/` of the
repo you ran from — one vault, one graph, whatever the repo count. `--feature <name>`: one
feature traced end to end (sequence diagram + its feature note only). Large repo and no flag:
AskUserQuestion (multiSelect) offering the detected top areas — never map a huge system
unprompted.

`--diagrams drawio` adds `docs/onboarding/architecture.drawio` to the outputs. Ask for it when
someone who does not edit code has to maintain the picture — that is the one thing mermaid cannot
do, and the reason not to reach for a subscription whiteboard instead.

## Steps

1. **Trace** via `scout` agents (shipped with this plugin — evidence-cited briefs, one per area;
   a harness without custom agents falls back to its generic read-only subagent under the same
   contract): services, components, and the call/data edges between them.
   `docs/onboarding/stack.md` (written by `/investigation-coach:onboard`) is discovery already
   done — when it exists, take the roots and areas from it and sweep only the edges, one agent per
   area, instead of rediscovering the structure. When it does not, discover the structure in the
   same sweep. An edge without evidence is either dropped or kept as INFERRED — never silently
   promoted, and never inherited from stack.md without its own `file:line`.
2. **Render** (rules and canvas format in `references/canvas.md` — load before writing):
   - **Artifact page** — load the `artifact-design` skill if it is available, then
     `/design-coach:artifact-style` (skip by name if that plugin is not installed — it puts every
     diagram in a zoomable wrapper, keeps text inside its box, takes the project's own fonts and
     palette, and lints the file before it publishes), then publish: a C4-style
     context + container view drawn as mermaid `flowchart`/`subgraph` (never mermaid's
     experimental C4 diagram type), one `sequenceDiagram` per core flow. Split any diagram past
     ~15-20 nodes. The page states its evidence discipline and marks INFERRED edges visibly.
     Artifacts start private — tell the user where the share menu is.
   - **`docs/onboarding/components/<name>.md`** — one note per service or component, and the
     reason this skill produces a graph rather than three pictures. Each traced edge becomes a
     wikilink in the note's **Talks to** section, so Obsidian's graph view draws the call structure
     with no further configuration; a canvas edge, by contrast, is invisible to it. Under
     `--project` the path is `components/<repo>/<name>.md` — one vault holding two repos will
     collide on names like `api` or `worker` otherwise. Template in `references/canvas.md`.
   - **`docs/onboarding/architecture.md`** — the same diagrams as mermaid fences plus a component
     table (component · responsibility · talks to · evidence), each row's first cell linking
     `[[onboarding/components/<name>]]`.
   - **`docs/onboarding/architecture.canvas`** — JSON Canvas: one `file` node per component note,
     grouped per layer, edges = calls with labels. File nodes, never text cards — the note is the
     model and the canvas only places it.
   - **`docs/.obsidian/graph.json`** — the four colour groups that make the graph readable, written
     only when the file is absent and never overwritten. The one sanctioned exception to "no skill
     generates `.obsidian/`"; the content and the reasoning are in `references/canvas.md`.
   - **`docs/onboarding/architecture.drawio`** — only with `--diagrams drawio`. Load
     `references/drawio.md` first: the coordinates are on a fixed grid because the format has no
     auto-layout, and a generated diagram with overlapping boxes is worse than none. Say in the
     report how to open it — the VS Code extension `hediet.vscode-drawio`, the free desktop app, or
     app.diagrams.net. GitHub will not render it.
   - **`docs/onboarding/features/<feature>.md`** — one note per feature the map demonstrates, in
     `/investigation-coach:onboard`'s eight-section feature format (read
     `${CLAUDE_PLUGIN_ROOT}/skills/onboard/references/formats.md` before writing one — the two
     skills share this directory and must not write two shapes into it). Skip ones that already
     exist; amend generated ones that went stale.
3. **Remember.** After a verified write — the files exist, re-reading one shows the content you
   intended, every component note has at least one outbound wikilink (a component with no traced
   outbound edge says so and links `[[onboarding/architecture]]`, which is why this is always
   satisfiable), and the `.canvas` and any
   `graph.json` parse as JSON (step 2's `references/canvas.md` gives both checks) — record it:
   `ENGINE add reference "architecture map at docs/onboarding/architecture.md (<scope>)" 0.75`.

## Rules

- Every edge cites evidence or says INFERRED. A map that guesses quietly is worse than no map.
- ≤15-20 nodes per diagram — split, don't cram. The canvas holds the full picture; diagrams hold
  one view each.
- Never mermaid's C4 diagram type: experimental, and GitHub won't render it.
- Node and file names sanitized: no `* " \ / : | ?` (Obsidian refuses them).
- **The vault root is `docs/`** — cross-directory wikilinks are vault-absolute from there, canvas
  `file` paths likewise, and the report says to open `docs/` rather than the repo root.
- Re-run = amend. Generated means `> Generated by /investigation-coach:` appears in the first 10
  lines — every `.md` this skill writes carries it directly below its frontmatter block.
  Regenerate those when stale; hand-written files are asked about, never clobbered. The `.canvas`
  is always regenerable: only this skill writes it.

## Related

`/investigation-coach:onboard` writes the words; this draws the picture. Run `/onboard` first when
both are wanted — this skill reads its `stack.md` instead of sweeping the repo a second time.
