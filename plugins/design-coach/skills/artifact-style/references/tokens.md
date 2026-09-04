# Type and colour — the fallback, and how to swap it for the project's

Everything here is what a page gets when `detect.md` found nothing. A project that declares a
font or a palette replaces the values below; the names and the checks stay.

## Fonts

```css
--sans: "IBM Plex Sans", Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
--mono: "IBM Plex Mono", "JetBrains Mono", ui-monospace, Consolas, Menlo, monospace;
```

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
```

Why these: IBM Plex is a workhorse text family with a matching mono, free, on Google Fonts —
the only font host the Artifact CSP admits. The tail is the fallback order a reader's machine
is most likely to have (Web Almanac 2025: Roboto, Open Sans, Inter lead web-font usage; Segoe
UI, -apple-system and Arial cover the desktops that load no web font at all). A project font
goes in front of the same tail — `"Geist", "IBM Plex Sans", …` — never alone.

Any other face must be a Google Fonts family or an inlined `@font-face` data URI; anything else
fails silently to the tail. Always `display=swap`.

| Setting | Value |
|---|---|
| body | 16 px / 1.55, `--sans` |
| measure | `.prose { max-width: 68ch }` — 60–72 ch |
| scale (×1.25) | 12 · 14 · 16 · 20 · 25 · 31 · 39 px; `h1` fluid: `clamp(26px, 4vw, 39px)` |
| code, labels, numbers | `--mono`, 13 px; `font-variant-numeric: tabular-nums` on numbers |
| spacing | 8 px ramp: 8 · 16 · 24 · 32 · 40 · 64 (4 px inside a component) |
| targets | ≥ 24 × 24 CSS px for anything clickable (WCAG 2.5.8); 28 px in the skeleton |
| motion | ≤ 200 ms, `opacity`/`transform`/size only, gated by `prefers-reduced-motion` |

Chart and diagram text uses `--mono` (the skeleton sets `.zoom-stage svg text`). The native
`dataviz` skill pins chart type to `system-ui`; on an Artifact page one voice matters more, and
IBM Plex Mono is a text face, not a display face, so its reasoning still holds.

## The fallback palette — five colours, sea to lime

```
sea    #05668d    teal   #028090    green  #00a896    mint   #02c39a    lime   #f0f3bd
```

Semantic names; components use the names, never the hex. Light on the bare `:root`, dark twice
(the native three-state pattern — `artifact-design` explains it; the skeleton implements it; the
lint checks that all three blocks define the same names). The five are *placed* by measured
contrast, and the two themes place them differently: what is ink in one is ground in the other.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#fdfdf4` lime-tinted paper | `#041f2b` deep sea | page ground (`body { background: var(--bg) }`) |
| `--surface` | `#f6f8e3` | `#063041` | cards, sticky table head |
| `--surface-2` | `#f0f3bd` **lime** | `#05668d` **sea** | code blocks, buttons, elevated |
| `--border` | `#b8dfd8` | `#0d5566` | hairlines |
| `--border-strong` | `#86cfc3` | `#028090` **teal** | control borders |
| `--text` | `#073b4f` deep sea | `#f0f3bd` **lime** | body text, `currentColor` for strokes |
| `--muted` | `#05668d` **sea** | `#9fd3cd` | secondary text, captions |
| `--accent` | `#028090` **teal** | `#02c39a` **mint** | links, emphasis strokes, primary fills |
| `--accent-hover` | `#05668d` **sea** | `#5fe3c3` | hover state |
| `--accent-contrast` | `#ffffff` | `#041f2b` | text on an `--accent` fill |
| `--accent-2` | `#02c39a` **mint** | `#00a896` **green** | tags, highlighted rows, a second series |
| `--accent-2-ink` | `#073b4f` | `#041f2b` | text on an `--accent-2` fill |

Bold cells are the five colours verbatim; the rest are tints and shades of them (`--text` light
is the sea darkened; `--bg` light is white pulled toward the lime; `--muted` dark is the green
lightened). Why the placement is what it is: on paper the mint reads at 2.3:1 and the green at
3.0:1 — fills, never text — so the teal carries links there (4.57:1) and the sea carries
secondary text (6.2:1). On the deep-sea ground the mint reads at 7.5:1 and the lime at 14.8:1, so
they trade roles and become the dark theme's accent and ink. The lint would refuse any other
arrangement; the table below is what it prints.

### Contrast, as the lint computes it (WCAG 2.2)

| Pair | Light | Dark | Needs |
|---|---|---|---|
| `--text` on `--bg` | 11.75 | 14.77 | 4.5 (1.4.3) |
| `--text` on `--surface` | 11.13 | 12.12 | 4.5 |
| `--text` on `--surface-2` | 10.45 | 5.55 | 4.5 — code on the lime / on the sea |
| `--muted` on `--bg` | 6.24 | 10.25 | 4.5 |
| `--muted` on `--surface` | 5.91 | 8.41 | 4.5 |
| `--accent` on `--bg` | 4.57 | 7.50 | 3 as a stroke or fill (1.4.11); 4.5 as link text |
| `--accent-contrast` on `--accent` | 4.67 | 7.50 | 4.5 |
| `--accent-2-ink` on `--accent-2` | 5.31 | 5.70 | 4.5 |

One number to know: light `--accent` on `--surface` is 4.24 — a link inside a card is a shade
under 4.5. Links in running text sit on `--bg` and pass; a link that must live on a card can use
`--muted` (the sea, 5.9:1) instead.

Run `node scripts/check-artifact.js <page> --verbose` to get this table for any palette,
including a project's.

## Dark mode is a second placement, not an inversion

- Near-black *of the palette's own hue* (`#041f2b`, the sea darkened), never `#000` — halation,
  and no room for elevation.
- Elevation is a *lighter* surface (`--surface-2` above `--surface` above `--bg`), not a shadow.
- The accent gets lighter (mint, not teal); the ink is the lime, not white — the page stays in
  its palette at night. Text loses a little weight visually on dark, so do not thin it further.
- Same token names, redefined in both dark blocks; components never mention a theme.
- `color-scheme: dark` in the dark blocks so form controls follow.

## Colour discipline for a page about data or systems

- Three hues plus neutrals, at most, on any one page. On this fallback: sea/teal as one family,
  mint as the highlight, lime as paper — and one warning colour only if the content needs it
  (`#b45309` light / `#fbbf24` dark reads on both grounds).
- Colour carries meaning or it is absent (`investigation-coach:map`'s rule). Say what it means
  on the mark or in the caption.
- Hue never encodes magnitude — length and position do (bars, positions on an axis).
- Categorical series, when the native `dataviz` palette is not in play: Okabe-Ito, colour-blind
  safe, in this order — `#E69F00 #56B4E9 #009E73 #F0E442 #0072B2 #D55E00 #CC79A7 #000000`. Six
  to eight series is the ceiling; past that, group.
- Strokes, borders that carry meaning, and icons meet 3:1 (1.4.11); text meets 4.5:1 or 3:1 at
  ≥ 24 px / ≥ 18.66 px bold (1.4.3).

## Sources

- WCAG 2.2 — 1.4.3 Contrast (Minimum), 1.4.10 Reflow, 1.4.11 Non-text Contrast, 2.5.8 Target
  Size (Minimum): https://www.w3.org/WAI/WCAG22/quickref/
- MDN — `overflow-wrap`, `touch-action`, `color-scheme`, `prefers-reduced-motion`, `-webkit-line-clamp`
- The five-colour palette: https://coolors.co/05668d-028090-00a896-02c39a-f0f3bd
- Radix Colors — the 12-step semantics the token roles follow: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Google Fonts CSS2 API: https://developers.google.com/fonts/docs/css2
- HTTP Archive Web Almanac 2025, Fonts: https://almanac.httparchive.org/en/2025/fonts
- Material Design, dark theme: https://m2.material.io/design/color/dark-theme.html
- Nielsen Norman Group — colour enhancement, dashboard preattentive attributes: https://www.nngroup.com/articles/
- Okabe & Ito, colour-universal design: https://jfly.uni-koeln.de/color/
