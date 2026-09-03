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

## The teal fallback palette

Semantic names; components use the names, never the hex. Light on the bare `:root`, dark twice
(the native three-state pattern — `artifact-design` explains it; the skeleton implements it; the
lint checks that all three blocks define the same names).

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#fafefd` | `#0d1514` | page ground (`body { background: var(--bg) }`) |
| `--surface` | `#f3fbf9` | `#111c1b` | cards, sticky table head |
| `--surface-2` | `#e0f8f3` | `#0d2d2a` | code blocks, buttons, elevated |
| `--border` | `#a1ded2` | `#145750` | hairlines |
| `--border-strong` | `#83cdc1` | `#1c6961` | control borders |
| `--text` | `#0d3d38` | `#adf0dd` | body text, `currentColor` for strokes |
| `--muted` | `#475569` | `#94a3b8` | secondary text, captions (slate, not teal — see below) |
| `--accent` | `#0f766e` | `#2dd4bf` | links, emphasis strokes, primary fills |
| `--accent-hover` | `#115e59` | `#5eead4` | hover state |
| `--accent-contrast` | `#ffffff` | `#042f2e` | text on an `--accent` fill |
| `--accent-soft` | `#ccf3ea` | `#023b37` | tags, highlighted rows |

Sources: bg/surface/border/text steps from Radix Colors Teal (light 1·2·3·6·7·12, dark
1·2·3·6·7·12); accent from Tailwind teal-700/800 (light) and teal-400/300 (dark); muted from
Tailwind slate-600/400; `--accent-contrast` dark is Tailwind teal-950.

Two deliberate departures from "just use the scale": Radix's step 9 solid (`#12a594`) reads at
3.0:1 on the light ground — enough for a fill, not for a link — so `--accent` is a text-safe
teal instead and step 9 is not used; and a teal `--muted` (Radix 11, `#008573`) lands at 4.47:1,
a hair under 4.5, so secondary text is slate. The lint would have caught both; the table below
is what it prints.

### Contrast, as the lint computes it (WCAG 2.2)

| Pair | Light | Dark | Needs |
|---|---|---|---|
| `--text` on `--bg` | 11.86 | 14.35 | 4.5 (1.4.3) |
| `--text` on `--surface` | 11.47 | 13.51 | 4.5 |
| `--muted` on `--bg` | 7.45 | 7.22 | 4.5 |
| `--muted` on `--surface` | 7.21 | 6.79 | 4.5 |
| `--accent` on `--bg` | 5.38 | 9.94 | 3 as a stroke or fill (1.4.11); 4.5 as link text |
| `--accent-contrast` on `--accent` | 5.47 | 7.77 | 4.5 |

Run `node scripts/check-artifact.js <page> --verbose` to get this table for any palette,
including a project's.

## Dark mode is a second palette

- Near-black, never `#000` — halation, and no room for elevation.
- Elevation is a *lighter* surface (`--surface-2` above `--surface` above `--bg`), not a shadow.
- The accent gets lighter and less saturated (teal-400, not teal-700 inverted); text loses a
  little weight visually, so do not thin it further.
- Same token names, redefined in both dark blocks; components never mention a theme.
- `color-scheme: dark` in the dark blocks so form controls and scrollbars follow.

## Colour discipline for a page about data or systems

- Three hues plus neutrals, at most. On this fallback: teal, the slate neutrals, and one
  warning colour if the content needs it (`#b45309` light / `#fbbf24` dark reads on both grounds).
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
- Radix Colors — palette composition and the 12-step semantics: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Tailwind CSS default colours: https://tailwindcss.com/docs/colors
- Google Fonts CSS2 API: https://developers.google.com/fonts/docs/css2
- HTTP Archive Web Almanac 2025, Fonts: https://almanac.httparchive.org/en/2025/fonts
- Material Design, dark theme: https://m2.material.io/design/color/dark-theme.html
- Nielsen Norman Group — colour enhancement, dashboard preattentive attributes: https://www.nngroup.com/articles/
- Okabe & Ito, colour-universal design: https://jfly.uni-koeln.de/color/
