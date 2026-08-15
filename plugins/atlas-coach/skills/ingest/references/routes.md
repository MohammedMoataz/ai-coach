# Ingest routes — the full table

Load when planning a conversion that isn't a plain local file, or when a converter is missing.

## Converter ladder (detected by `plan`, never installed by this skill)

| Converter | Wins at | Install hint (via /harness-coach:partners style) | Detect |
|---|---|---|---|
| pandoc | docx/html/epub/odt/rtf → md, high fidelity | `winget install --id JohnMacFarlane.Pandoc --exact --silent --accept-package-agreements --accept-source-agreements` | `pandoc --version` |
| markitdown | pdf/pptx/xlsx → structured md | `uv tool install markitdown` (or `pip install markitdown[all]`) | `markitdown --version` |
| defuddle | web page → clean md (strips nav/ads; powers Obsidian's clipper) | `npm i -g defuddle` | `defuddle --version` |

Fallbacks when absent: pdf → the model reads in 20-page batches (zero install, always works) ·
web → WebFetch. docling is deliberately not on the ladder — ML-heavy; it earns a place only if
PDF-table fidelity becomes a measured pain.

## Team-doc sources

- **Notion** — native export: Settings → Export → Markdown & CSV. The `.md` files ride the
  `copy` route unchanged (unzip first). If `claude mcp list` shows a notion connector, fetch the
  page through it and pipe the markdown to `INGEST write <slug> --source "notion:<page-url>"`.
- **Confluence** — page/space export as HTML → `pandoc` route. Word export also works (docx).
  An atlassian MCP connector, when installed, replaces the export step the same way.
- **Google Docs** — File → Download → .docx → `pandoc` route. (Markdown download exists on
  newer workspaces — then it's the `copy` route.)
- MCP connectors are detected (`claude mcp list`), never installed by this skill; a bare
  `claude mcp add` needs a session restart — say so if suggesting one.

## Provenance fields (written by the script, fixed order)

`title · source · converted (date) · sha256 (files only) · converter · summary · tags` —
the informal convention the ecosystem converged on; no formal standard exists, and this skill
does not claim one. `source` for team docs keeps the origin URL, not the export's temp path.

## The paragraph index

Every `write`/`convert` chunks the body (blank-line split, heading trail kept, <40-char
fragments dropped) into `<out>/.atlas-index.db` (FTS5, `node:sqlite`, zero deps). Keyword-grade
by design — embeddings are deferred until FTS measurably misses; when a search misses something
you know is in the corpus, note it: those misses are the evidence the upgrade decision needs.
`reindex` rebuilds the whole thing from the markdown, so the index is never precious.
