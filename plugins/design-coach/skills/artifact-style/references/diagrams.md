# Every diagram is zoomable

A diagram that fits the column is too small to read; one that reads is too wide for the column.
The native skill's shrink-to-fit (`viewBox` + `max-width: 100%`) picks the first. This wrapper
lets the reader pick: fit to see the shape, zoom to read a label, drag to follow an edge,
fullscreen to see both.

## The wrapper — copy from `skeleton.html` `<!-- §zoom -->`

```
figure.zoomable[style="--zoom-height: 320px"]   fixed height per figure (default 420px)
  figcaption                  the claim the picture makes, one sentence
  .zoom-toolbar               icon cluster overlaid bottom-right: zoom out · level · zoom in │ reset · fullscreen
  .zoom-viewport[tabindex=0]  height: var(--zoom-height); overflow:auto; touch-action:none; scrollbars hidden
    .zoom-stage               centres a small drawing; grows with a zoomed one
      svg[viewBox][role=img][aria-label]      inline drawing
      — or —
      pre.mermaid                             host-rendered
```

**The viewport's height is fixed** — set per figure with `--zoom-height`, never left to the
drawing. Zooming changes what is inside the box, not the box, so the page never reflows or jumps
while the reader is reading below it. Pick the height from the drawing's shape: 320 px for a
wide flow, 420 px (default) for a container view, 560 px for a tall sequence diagram; fullscreen
lifts the limit.

**The controls are the cluster markdown viewers already taught readers** (GitHub's mermaid
viewer, the Mermaid live editor): icon buttons overlaid at the bottom-right of the drawing, in
this order — zoom out, the live level, zoom in, a separator, reset view, fullscreen. Icons are
inline 16 px SVG strokes on `currentColor`; every button is a real `<button>` with `aria-label`
and a `title` naming its key; 28 px targets (WCAG 2.5.8 asks 24). The cluster sits at 85 %
opacity until the figure is hovered or focused. Nothing else — no text buttons, no toolbar row
above the drawing.

One `<script>` at the end of the page initialises every `.zoomable`. It sizes the svg in CSS
pixels — `width`/`height` in px, no `transform` — so the viewport's own scroll box grows with
the zoom, text re-rasterises sharp, and native scrolling (arrow keys on the focused viewport,
trackpad) keeps working. **No scrollbars are shown** (`scrollbar-width: none` +
`::-webkit-scrollbar { display: none }`): a diagram viewer pans by drag and wheel, and a
scrollbar on a drawing reads as a broken layout, not a control.

| Gesture | Result |
|---|---|
| Ctrl/⌘ + wheel (a trackpad pinch arrives this way) | zoom around the cursor |
| plain wheel | scrolls the viewport; at its edge, stops (`overscroll-behavior: contain`) |
| drag with mouse or one finger | pan |
| two fingers | pinch zoom around the midpoint |
| `+` `=` / `-` | zoom in / out (viewport focused) |
| `0` / reset button | contain: the whole drawing visible, never above 1:1 |
| `1` | actual size |
| fullscreen button | fullscreen on the figure (hidden when the host forbids it) |

Initial state: reset (contain). `@media (prefers-reduced-motion: no-preference)` gates the one
short transition.

Nothing goes inside the `<svg>`: no `<script>`, `<style>`, or `<foreignObject>`
(artifact-diagramming's rule; the lint enforces it). The script lives on the page, the wrapper
lives around the drawing.

## Mermaid

The host renders `<pre class="mermaid">` natively — no library, no CDN. Two things about it are
undocumented and both matter:

- The rendered `svg` appears **under your wrapper but not as `pre.mermaid svg`** — the host
  replaces or wraps the block (observed as `.mermaid-box svg`). The script therefore watches the
  whole figure with a `MutationObserver` and initialises on the first `svg` that appears; never
  select by the host's class name, it can change.
- The host's default type is tiny once the drawing is fitted. Grow it in the source:
  `%%{init:{'themeVariables':{'fontSize':'26px'}}}%%` as the first line of the block. The lint
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
