# Every diagram is zoomable

A diagram that fits the column is too small to read; one that reads is too wide for the column.
The native skill's shrink-to-fit (`viewBox` + `max-width: 100%`) picks the first. This wrapper
lets the reader pick: fit to see the shape, zoom to read a label, drag to follow an edge,
fullscreen to see both.

## The wrapper — copy from `skeleton.html` `<!-- §zoom -->`

It is the pan/zoom canvas a Markdown preview gives a diagram, the same one the Extranet
Monorepo page shipped and readers already know how to drive:

```
figure.zoomable[style="--zoom-height: 320px"]   starting height per figure (default 420px)
  figcaption                  the claim the picture makes, one sentence
  .zoom-toolbar               text tools top-right:  −  100%  +  ⤢  ⛶   (the level IS the reset button)
  .zoom-viewport[tabindex=0]  height: var(--zoom-height); overflow:hidden; resize:vertical — clips, never scrolls
    .zoom-stage               absolute canvas at the svg's natural size; moved by translate+scale
      svg[viewBox][role=img][aria-label]      inline drawing
      — or —
      pre.mermaid                             host-rendered into a sibling svg, adopted on arrival
  .zoom-hint                  bottom-left, one line: "drag or wheel to move · ctrl+wheel to zoom · double-click fits"
```

**The viewport's height is fixed at load** — set per figure with `--zoom-height`, never left
to the drawing — so zooming changes what is inside the box, not the box, and the page never
reflows while someone reads below it. The reader may drag the viewport's bottom edge
(`resize: vertical`, 240–1400 px); an untouched diagram re-fits itself when they do. Pick the
starting height from the drawing's shape: 320 px for a wide flow, 420 px (default) for a
container view, 560 px for a tall sequence diagram; fullscreen lifts the limit.

**Nothing scrolls.** The viewport clips; the canvas moves with a `translate(...) scale(...)`
transform on `.zoom-stage`. No scrollbars, no scroll chaining into the page — a scrollbar on a
drawing reads as a broken layout, not a control.

**The tools are text, top-right, faded until hovered** — the cluster GitHub's preview and the
Mermaid live editor taught readers: zoom out, the live level (clicking it resets to 100 %), zoom
in, fit (⤢), fullscreen (⛶, hidden when the host forbids it). Real `<button>`s with `aria-label`
and a `title` naming the key; mono 11 px; 26 px targets (WCAG 2.5.8 asks 24). The hint
bottom-left says the three gestures in one line and hides under 560 px.

| Gesture | Result |
|---|---|
| plain wheel / trackpad two-finger scroll | pan (the page does not scroll while the pointer is on the drawing) |
| Ctrl/⌘ + wheel (a trackpad pinch arrives this way) | zoom around the pointer |
| drag with mouse or one finger | pan |
| two fingers | pinch zoom around the midpoint |
| double-click | fit ⇄ 100 % (zooms to the clicked point) |
| `+` `=` / `-` | zoom in / out (viewport focused) |
| `0` / the level button | 100 % |
| `f` / ⤢ | fit: the whole drawing visible, never above 100 % |
| arrow keys | pan by 40 px |
| ⛶ | fullscreen on the figure |

Initial state: fit. The svg keeps its natural size (from `viewBox`, or mermaid's `max-width`);
the transform does the scaling, so text re-rasterises sharp at every level.
`@media (prefers-reduced-motion: no-preference)` gates the one 60 ms transition, and dragging
turns it off.

Nothing goes inside the `<svg>`: no `<script>`, `<style>`, or `<foreignObject>`
(artifact-diagramming's rule; the lint enforces it). The script lives on the page, the wrapper
lives around the drawing.

## Mermaid

The host renders `<pre class="mermaid">` natively — no library, no CDN. Two things about it are
undocumented and both matter:

- The rendered `svg` appears **under your wrapper but not as `pre.mermaid svg`** — the host
  renders the block into a sibling `<div class="mermaid-diagram">` holding the svg, and does it
  again on a theme change. The script therefore watches the whole figure with a
  `MutationObserver`, adopts the first `svg` that appears, and only re-sizes a re-rendered one;
  never select by the host's class name, it can change.
- Size the type in the source, and turn HTML labels off so the svg measures its own text:
  `%%{init:{'flowchart':{'htmlLabels':false},'themeVariables':{'fontSize':'16px'}}}%%` as the
  first line of the block (16 px reads at fit; 26 px only when the drawing is small). The lint
  cannot see the rendered size; check it once by eye.

Mermaid in the page follows the same theme as the rest: it inherits `currentColor`. Do not
paste a mermaid `theme` or hand-picked node colours — colour carries meaning or it is absent
(`investigation-coach:map`'s rule, kept).

## Drawing rules the native skill leaves implicit

- **≤ 7 nodes per view.** Past that, split into layers or per-flow diagrams; a canvas or the
  vault holds the whole picture.
- **A verb or protocol on every arrow.** `calls`, `publishes`, `HTTP`, `polls 30s`. An unlabeled
  arrow is "related somehow".
- **Labels ≥ 12 px at 1:1**, `text-anchor` set, a word or three. Sentences go in the caption.
- **A legend only when the same encoding repeats** across two or more figures. Otherwise put
  the meaning on the mark (`stroke-dasharray` + "INFERRED" text, not a dashed line and a key).
- **The caption states the takeaway**, not the title: "Writes go through the queue; reads hit
  the replica" rather than "Data flow".
- **INFERRED edges look different and say so** — dashed stroke and the word, both.
- Strokes and non-text marks meet 3:1 against their background in both themes
  (WCAG 1.4.11); `currentColor` gets this for free from `--text`.
