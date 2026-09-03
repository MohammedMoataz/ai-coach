# Detecting the project's own fonts and palette

Six file reads at most. Grep first, read only what matched, stop at the first source that
answers both questions (font, colours). A project that declares nothing gets the fallback — say
so in the brief; do not go looking harder.

## Where projects declare it

| Look in | For | Precedence |
|---|---|---|
| `**/*.css`, `**/*.scss` | `@theme {` (Tailwind v4), `:root {` with `--color-*`, `--primary`, `--brand`, `--accent`, `--font-*`; `@import url(https://fonts.googleapis…)` | 1 — runtime truth |
| `tailwind.config.{js,ts,cjs,mjs}` | `theme.extend.colors`, `theme.extend.fontFamily` | 2 |
| `theme.{ts,js}`, `src/theme/**`, `.storybook/preview.*` | `createTheme(`, `extendTheme(`, `palette.primary.main`, `typography.fontFamily` | 3 |
| `design-tokens.json`, `tokens.json`, `**/tokens/**`, `figma*.json` | Tokens Studio / Figma export | 4 — often stale |
| `index.html`, `public/index.html`, `app/layout.*`, `_document.*` | `<link href="https://fonts.googleapis…">`, `<meta name="theme-color">` | 5 |
| `package.json` | `@fontsource/*`, `next/font`, `geist`, `@fontsource-variable/*` | 5 |
| `assets/logo.*`, `public/logo.*`, the README's first image | ≤ 2 hues, read by eye | last — only when nothing above answered colour |

Also read the dark-mode selector the project uses (`.dark`, `[data-theme="dark"]`,
`prefers-color-scheme`) — the page keeps the three-state pattern regardless, but its dark values
should be the project's dark values, not an inversion of its light ones.

One grep does the sweep:

```
rg -n -m 3 -e "@theme|--color-|--primary|--brand|--accent|--font-|fonts\.googleapis|fontFamily|createTheme|extendTheme|palette\.primary|@fontsource|next/font|theme-color" \
   --glob "!node_modules" --glob "!dist" --glob "!build" --glob "!*.min.*" --glob "!**/vendor/**" .
```

## Mapping what you found onto the skeleton's names

Keep the names; change the hex. A project rarely has all eleven, so derive the rest:

| Skeleton token | Take from the project | If absent |
|---|---|---|
| `--bg` | page background / `background` / `--color-background` | near-white light, near-black dark (`#0d1514`-class, never `#000`) |
| `--surface`, `--surface-2` | card / paper / `--color-card`, elevated | one and two steps toward `--text` from `--bg` |
| `--border`, `--border-strong` | `--color-border`, divider | a step of the accent hue at low chroma |
| `--text` | foreground / `--color-foreground` | darkest (light) or lightest (dark) step of the neutral |
| `--muted` | muted-foreground / secondary text | slate `#475569` light, `#94a3b8` dark |
| `--accent` | primary / brand | teal `#0f766e` light, `#2dd4bf` dark |
| `--accent-hover` | primary hover / darker step | one step darker (light) or lighter (dark) |
| `--accent-contrast` | primary-foreground | white on a dark accent, `#042f2e`-class on a light one |
| `--accent-soft` | primary/10, badge background | the accent at very low chroma |

Then run the lint: it computes the contrast of every text token on every surface for both
themes. A project colour that fails 4.5:1 is not "the brand" for body text — keep it for
`--accent` fills and pick the nearest step that passes for `--text`/`--muted`, and say so.

## The brief

Five lines, before any HTML, repeated in the reply:

```
design brief
fonts   sans "Inter" (src/app.css:3) · mono "IBM Plex Mono" (fallback)
light   --bg #ffffff · --surface #f8fafc · --text #0f172a · --muted #475569 · --accent #2563eb · --accent-contrast #ffffff
dark    --bg #0b1220 · --surface #111a2e · --text #e2e8f0 · --muted #94a3b8 · --accent #60a5fa · --accent-contrast #0b1220
source  tailwind.config.ts:14 (colors) · src/app.css:3 (font) · dark values: fallback derived
```

A brief whose every source reads `fallback` is fine. A brief that is missing is not — it is
how the reader learns what the page inherited and what it invented.
