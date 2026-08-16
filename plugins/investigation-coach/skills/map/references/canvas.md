# Rendering rules

Load only when writing the map outputs.

## JSON Canvas (architecture.canvas)

Spec: JSON Canvas 1.0 (jsoncanvas.org, open-sourced by Obsidian, MIT). One JSON object, two keys.

- **Nodes** — all carry `id, type, x, y, width, height`, optional `color` (`"1"`–`"6"` presets:
  red/orange/yellow/green/cyan/purple, or hex).
  - `text` node: `"text"` holds markdown — use for services/components; keep text to a title +
    one line.
  - `file` node: `"file"` is a vault-relative path — use to pin the feature notes
    (`docs/onboarding/features/<name>.md`) onto the board.
  - `group` node: `"label"` — one group per architectural layer or area, using the project's own
    names as discovered from its structure (never a preset list).
- **Edges** — `id, fromNode, toNode` required; `fromSide`/`toSide`
  (`top|right|bottom|left`), `label` (the call: "validates token", "publishes event"), `color`.

Minimal valid example:

```json
{
  "nodes": [
    {"id":"api","type":"text","x":0,"y":0,"width":220,"height":80,"text":"# API Gateway\nroutes + auth check"},
    {"id":"auth","type":"text","x":320,"y":0,"width":220,"height":80,"text":"# Auth Service\nJWT issue/verify"}
  ],
  "edges": [
    {"id":"e1","fromNode":"api","toNode":"auth","fromSide":"right","toSide":"left","label":"validates token"}
  ]
}
```

Layout: grid the nodes by layer (y per layer, x spread within), ~100px gaps — Obsidian does not
auto-layout. Comfortable up to ~100 nodes; a surface-layer map should be well under 40. Mark an
INFERRED edge with `"color": "2"` (orange) and `(inferred)` in its label.

Verify it after writing — a malformed `.canvas` fails silently in Obsidian, which looks exactly
like an empty diagram. One command, and it also counts the nodes against the ceiling below:

```bash
node -e "const c=JSON.parse(require('fs').readFileSync('docs/onboarding/architecture.canvas','utf8'));console.log(c.nodes.length+' nodes, '+c.edges.length+' edges')"
```

## Mermaid discipline

- Context/container views: `flowchart LR` (or `TB`) with `subgraph` per layer. NOT the `C4Context`
  diagram type — experimental syntax, and GitHub's renderer won't draw it at all.
- One `sequenceDiagram` per core flow, participants = the containers, each message = one traced
  hop.
- ≤15-20 nodes per diagram. Past that, split by concern — the canvas is the full picture.
- Diagram source lives in ```mermaid fences in architecture.md; the artifact page renders the
  same fences natively.

## Component table (architecture.md)

| Component | Responsibility | Talks to | Evidence |
|---|---|---|---|
One row per node. Evidence = `file:line` list, or the single word INFERRED — never blank.

## Obsidian notes

Vault = any folder; opening the repo root (or docs/onboarding/) in Obsidian makes wikilinks and
the canvas work with zero config. Never generate a `.obsidian/` directory — Obsidian creates its
own on open. Filenames: sanitize `* " \ / : | ?` to `-` (a service named `api/gateway` becomes
`api-gateway.md`, its note keeping the real name as an `aliases:` entry).
