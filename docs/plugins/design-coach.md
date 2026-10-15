# design-coach

Makes "how a published page should look" checkable instead of a matter of taste. Text stays inside
its box. Every diagram sits in a zoomable wrapper. The page uses the project's own fonts and
palette, and passes WCAG contrast in both themes. A zero-dependency lint checks all of this
before the page goes out. Use it whenever you write or publish an Artifact page. `map` and
`/strategy-coach:blueprint` chain it for you. The plugin touches neither memory nor the engine
([plugin.json:5](../../plugins/design-coach/.claude-plugin/plugin.json)).

| | |
|---|---|
| Version | 1.0.2 |
| Depends on | `ai-coach-core` `^1.6.0` |
| Source | [`plugins/design-coach/`](../../plugins/design-coach/) |

## What it ships

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `artifact-style` | skill | `/design-coach:artifact-style`. Model-invocable so `map` and `blueprint` can chain it | Detects the project's design system, writes a design brief, builds the page from a skeleton, then lints and probes it |
| `check-artifact.js` | script | `node scripts/check-artifact.js <page.html> [--verbose]`, or `require()` | The static lint. Exits 1 on any error |
| `probe-overflow.js` | script | `node scripts/probe-overflow.js` prints a function to evaluate in the rendered page | Measures text that escaped its box. The static lint cannot do this |
| `artifact-lint.js` | hook | `PreToolUse` on `Artifact` | Runs the lint before a publish, and turns errors into an `ask` |
| `artifact-nudge.js` | hook | `PostToolUse` on `Skill` | After a native artifact skill loads, reminds the model to load `artifact-style` |

These are the only two hooks in the marketplace outside ai-coach-core. Both exit immediately when
`AICOACH_INNER` is set, and both fail open
([hooks/artifact-lint.js:5-7](../../plugins/design-coach/hooks/artifact-lint.js)).

## artifact-style

**Invocation:** `/design-coach:artifact-style [path/to/page.html]`

**Scope: the Artifact surface only**, meaning the single HTML file the Artifact tool publishes.
Mermaid inside a vault note stays unstyled
([SKILL.md:15-17](../../plugins/design-coach/skills/artifact-style/SKILL.md)). Precedence runs:
the user's words, then the project's own system, then the fallback. The fallback is never a house
style imposed on a project that has one. The skill assumes the native `artifact-design` skill has
loaded first.

Steps ([SKILL.md:23-52](../../plugins/design-coach/skills/artifact-style/SKILL.md)):

1. **Detect the project's system** using
   [references/detect.md](../../plugins/design-coach/skills/artifact-style/references/detect.md).
   It reads **at most six project files** ([detect.md:3-5](../../plugins/design-coach/skills/artifact-style/references/detect.md)):
   one `rg` sweep first, then only what matched, stopping at the first source that answers both
   font and colour. Sources are tried in precedence order:

   | Precedence | Where | For |
   |---|---|---|
   | 1, runtime truth | `**/*.css`, `**/*.scss` | `@theme {`, `:root` custom properties (`--color-*`, `--primary`, `--brand`, `--accent`, `--font-*`), Google Fonts `@import` |
   | 2 | `tailwind.config.{js,ts,cjs,mjs}` | `theme.extend.colors`, `theme.extend.fontFamily` |
   | 3 | `theme.{ts,js}`, `src/theme/**`, `.storybook/preview.*` | `createTheme(`, `extendTheme(`, `palette.primary.main` |
   | 4, often stale | `design-tokens.json`, `tokens.json`, `**/tokens/**`, `figma*.json` | Tokens Studio or Figma export |
   | 5 | `index.html`, `app/layout.*`, `_document.*`; `package.json` | font `<link>`s, `theme-color`; `@fontsource/*`, `next/font`, `geist` |
   | last | `assets/logo.*`, `public/logo.*`, the README's first image | two hues at most, read by eye, only when nothing else answered colour |

   It also reads the project's dark-mode selector, so the page's dark values are the project's
   own rather than an inversion of its light ones. A project that declares nothing gets the
   fallback, and the brief says so. The skill does not go looking harder.
2. **Write the design brief** before any HTML: five lines covering the sans and mono stacks, the
   semantic tokens for light and dark, and the `file:line` (or `fallback: sea` / `fallback: sage`)
   each came from. The brief is shown in the reply, so the reader sees what the page inherited.
3. **Build from
   [references/skeleton.html](../../plugins/design-coach/skills/artifact-style/references/skeleton.html)**,
   the one copy of the base CSS and the zoom script. Copy it, set the title, swap in
   `palettes/sage.css` or the project's hex values (the token names stay), and delete what the
   page does not use. Never paste a second copy of the CSS from memory, because the lint is
   written against the skeleton's names.
4. **Lint, then fix:**
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/check-artifact.js" <page.html>`. Every `error:` is fixed
   before publishing. Every `warn:` is either fixed or named in the reply. **Then probe once**: if
   a browser tool is available (Playwright MCP, Chrome DevTools), serve the file and evaluate the
   function `scripts/probe-overflow.js` prints, after fonts load and with figures at fit. Fix what
   it lists, re-probe, then publish. Without a browser, the skill says so and looks at the
   published page at 320 px and 900 px. Without Node, it applies the rules by hand and says so.
5. **Publish** with the native tool. The `PreToolUse` hook runs the same lint again.

**Reads:** at most six project files, plus its own references. **Writes:** only the page
([SKILL.md:2](../../plugins/design-coach/skills/artifact-style/SKILL.md)). **Engine calls:** none.
**Chained by:** `/investigation-coach:map` and `/strategy-coach:blueprint` before they publish.
The skill's description says it never fires unprompted.

### The four rule sets

**1. Text never leaves its box**
([references/overflow.md](../../plugins/design-coach/skills/artifact-style/references/overflow.md)).
Nearly every overflow has one of two causes: a flex or grid child stuck at `min-width: auto`, or an
unbreakable token. The skeleton sets `.row > *, .grid > * { min-width: 0 }` and
`body { overflow-wrap: anywhere }`. Beyond that, the fix depends on what the text is:

- Table cell: `.trunc` on a block *inside* the `td`, plus `title`, with the table in `.tablewrap`.
- Card title: `.clamp2`.
- URL, hash or id: `.anywhere`, so it breaks instead of hiding.
- Code: `pre` scrolls.
- Diagram label: shorten the words.
- KPI number: `.kpi` with `clamp()`, in a card and never in a table.

The licence is WCAG 1.4.10: tables, diagrams and code may scroll in two dimensions, and
everything else reflows at 320 px.

**2. Every diagram is zoomable**
([references/diagrams.md](../../plugins/design-coach/skills/artifact-style/references/diagrams.md)).
Inline SVG or mermaid, every diagram goes inside `figure.zoomable` from the skeleton. The
structure is `figcaption`, then `.zoom-toolbar`, then `.zoom-viewport[tabindex=0]`, then
`.zoom-stage`, then the `svg` or `pre.mermaid`, with a `.zoom-hint` at the bottom.

- **The viewport has a fixed starting height** (`--zoom-height`, 420 px by default), so zooming
  changes what is in the box, never the box, and the page does not jump.
- **Nothing scrolls.** The stage moves by `translate+scale`.
- **The controls** follow the GitHub preview: plain wheel pans, Ctrl/⌘+wheel and pinch zoom,
  double-click toggles between fit and 100 %, and the keys `+ - 0 f` and the arrows work too.
- **Mermaid is rendered by the host**, which puts the result in a sibling element. The script
  adopts that element with a `MutationObserver` and renders each diagram once more when
  `document.fonts.ready` resolves, because the host measures labels before the web font arrives.
- **Diagram text is never restyled.** No `%%{init}%%` `fontSize`, and no CSS that reaches into
  diagram text, because mermaid sized every box to text it measured at 16 px in the page's sans.
- **Drawing rules:** at most 7 nodes per view, a verb or protocol on every arrow, labels of at
  least 12 px (14 on a node and 12 on an arrow in an inline SVG), and a caption that states the
  takeaway.

**3. Fonts: the project's, else IBM Plex, else Arial**
([references/tokens.md](../../plugins/design-coach/skills/artifact-style/references/tokens.md)).
A detected font is placed in front of the fallback tail and never stands alone. The fallback
stacks are `"IBM Plex Sans", Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif` and
`"IBM Plex Mono", "JetBrains Mono", ui-monospace, Consolas, Menlo, monospace`. They load from
Google Fonts, the only font host the Artifact CSP admits, with `display=swap`. Body text is
16 px / 1.55, with a 60–72 ch measure and a 1.25 heading scale.

**4. Palette: the project's, else one of two.** Components use semantic tokens only, never raw
hex: `--bg --surface --surface-2 --border --border-strong --text --muted --accent --accent-hover
--accent-contrast --accent-2 --accent-2-ink`. They are defined in the native three-state pattern:
light on bare `:root`, dark under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`,
and dark again under `:root[data-theme="dark"]`. Two fallbacks ship as drop-in token files:

- **sea** ([palettes/sea.css](../../plugins/design-coach/skills/artifact-style/references/palettes/sea.css))
  is the skeleton's default. It runs sea `#05668d` to lime `#f0f3bd`, on a navy dark ground. Use
  it for systems: architecture, APIs, pipelines, security.
- **sage** ([palettes/sage.css](../../plugins/design-coach/skills/artifact-style/references/palettes/sage.css))
  runs pale sage `#cad2c5` to charcoal `#2f3e46`. Use it for people and process: blueprints,
  onboarding, research briefs.

Pick one per project and keep it. Dark mode is a second palette, never `#000` and never an
inversion. Use at most three hues plus neutrals, and Okabe-Ito for categorical series.

## check-artifact.js: the lint

[`scripts/check-artifact.js`](../../plugins/design-coach/scripts/check-artifact.js) has no
dependencies. It walks the HTML with a tag tokenizer and an open-element stack, because "is this
svg inside `.zoomable`?" is a question about ancestry that a regex cannot answer. All the CSS
checks are regex over the `<style>` text
([check-artifact.js:13-15](../../plugins/design-coach/scripts/check-artifact.js)). It exports
`check`, `contrast` and `walk`.

```
node plugins/design-coach/scripts/check-artifact.js <page.html> [--verbose]
```

It prints `error:` and `warn:` lines and a summary. `--verbose` adds an `info:` line for every
computed contrast pair. It exits 1 if there is any error, and 2 on a usage error.

**Errors** (they block a clean run, and the hook turns them into an `ask`):

| Area | Check |
|---|---|
| Host invariants | Page is 16 MB or larger. No `<title>` in the first 8 KB. Any `<!doctype>`, `<html>`, `<head>` or `<body>` present (the host wraps the file itself) |
| Diagrams | A diagram `svg` (one with `role="img"`, or a `viewBox` at least 320 wide) or a `.mermaid` block that is not inside `.zoomable`. A diagram `svg` with no `viewBox`. A `figure.zoomable` without `.zoom-viewport > .zoom-stage`. `<script>`, `<style>` or `<foreignObject>` inside an `<svg>` |
| Theme | No `<style>` block. No bare `:root {`. No dark `@media` block guarded by `:root:not([data-theme="light"])`. No `:root[data-theme="dark"]`. The two dark blocks define different token names. A dark token with no light definition. Either block defines no tokens |
| Body and fonts | No `body {` rule, or a body background that is not `var(--…)`. A `font-family` or font token that does not end in a generic family. No font declared at all |
| Contrast | Any pair below its minimum, in either theme (see below) |
| Resources | A relative URL (an Artifact is one file). A host outside `cdnjs.cloudflare.com/`, `cdn.jsdelivr.net/npm/`, `cdn.tailwindcss.com`, `code.jquery.com/`, `fonts.googleapis.com/` and `fonts.gstatic.com/` |

**Warnings:**

- A diagram `svg` without `aria-label`.
- An SVG `text`, `tspan` or `g` with a `font-size` below 12.
- A mermaid `%%{init}%%` that sets `fontSize`, or CSS that restyles diagram text (font, size or
  spacing on `text`, `tspan`, `label` or `.mermaid` selectors).
- A `figure.zoomable` without a `figcaption`.
- No zoom script, or mermaid present without the `document.fonts.ready` → `mermaid.render`
  late-font pass.
- `.kpi` inside a table cell.
- A table with no scrolling ancestor, or tables but no `overflow-x:auto` rule anywhere.
- `text-overflow: ellipsis` with no `min-width: 0` anywhere.
- A bare `fr` track in `grid-template-columns` (write `minmax(0, 1fr)`).
- `<pre>` with no `pre {` rule, or one without `overflow-x`.
- A contrast pair that cannot be checked because a token is not a hex literal.
- `--accent` on a ground between 3:1 and 4.5:1, which is fine for strokes but not for link text.

### WCAG contrast checks

The lint computes WCAG 2.x relative luminance for each pair below in **both** the light tokens and
the dark tokens. It uses the media-query block, or the `[data-theme="dark"]` block if the media
block is empty ([check-artifact.js:199-211](../../plugins/design-coach/scripts/check-artifact.js)):

| Foreground | Background | Minimum |
|---|---|---|
| `--text` | `--bg`, `--surface`, `--surface-2` | 4.5:1 (1.4.3) |
| `--muted` | `--bg`, `--surface` | 4.5:1 |
| `--accent` | `--bg` | 3:1 (1.4.11 non-text), with a warning below 4.5 |
| `--accent-contrast` | `--accent` | 4.5:1 |
| `--accent-2-ink` | `--accent-2` | 4.5:1 |

Only hex literals are resolved. `var()` chains, `rgb()` and `hsl()` produce a "cannot check"
warning, not a pass. This is marked as a known ceiling in the source
([check-artifact.js:72](../../plugins/design-coach/scripts/check-artifact.js)). The measured
numbers for both fallback palettes are tabled in
[tokens.md:100-155](../../plugins/design-coach/skills/artifact-style/references/tokens.md). One
near-miss is stated there: in light, `--accent` on `--surface` is 4.24 (sea) and 4.29 (sage), so a
link inside a card should use `--muted`. The lint does not check that pair.

## probe-overflow.js: the rendered-page probe

[`scripts/probe-overflow.js`](../../plugins/design-coach/scripts/probe-overflow.js) exports
`source`, a function to evaluate *inside* a rendered page (Playwright `browser_evaluate`, or a
DevTools console). Run directly, it prints that function. It catches what the static lint cannot,
because it needs the browser's text measurement. It reports six kinds of problem
([probe-overflow.js:3-17](../../plugins/design-coach/scripts/probe-overflow.js)):

| Kind | Meaning |
|---|---|
| `html-overflow-x` | A box whose content is wider than it, and not clipped or scrolled |
| `escapes-parent` | A child whose right edge passes its parent's |
| `svg-label-escapes-box` | A diagram label wider or taller than its node |
| `svg-label-crosses-shape` | A label straddling a node or cluster it is not inside |
| `svg-label-overlap` | Two labels drawn on top of each other |
| `svg-outside-viewBox` | Drawn content past the `viewBox`, which is cropped at fit |

It probes inline `svg[role="img"]` and host-rendered mermaid under `.zoom-stage`, comparing
geometry in screen space so nested transforms cannot skew it. It returns
`{ viewport, diagrams, count, kinds, items }`, capped at 60 items.

## Hooks

Registered in [hooks/hooks.json](../../plugins/design-coach/hooks/hooks.json).

**`artifact-lint.js`** (`PreToolUse`, matcher `Artifact`, 10 s timeout). It acts only on a
`publish` action (the default when none is given) of an existing `.html` or `.htm` file, resolved
against the hook's `cwd`. It runs `check()` on that file:

- No findings: silent.
- Warnings only: they are added as `additionalContext` for the model.
- Errors: `permissionDecision: "ask"`, with the list in the prompt, so **you** decide whether to
  publish anyway.

Anything else (another action, a missing file, a lint crash) exits 0. A lint bug never blocks a
publish ([artifact-lint.js:3-6, 18-33](../../plugins/design-coach/hooks/artifact-lint.js)).

**`artifact-nudge.js`** (`PostToolUse`, matcher `Skill`, 5 s timeout). When the loaded skill
matches exactly `artifact-design`, `artifact-diagramming`, `dataviz` or `design`, it adds one line
of context: load `design-coach:artifact-style` before writing the page, and run its lint before
publishing. The match is anchored, so `design-coach:artifact-style` itself never re-triggers it.
It keeps no state ([artifact-nudge.js:3-9](../../plugins/design-coach/hooks/artifact-nudge.js)).

## Configuration

None of its own. There is no setting to turn either hook off short of disabling the plugin;
`AICOACH_INNER` only suppresses them inside the engine's own child calls. Shared settings are in
[engine.md](../engine.md#settings).

## Data it keeps

None. It writes only the page you are building. No memory, no engine calls, no files under
`.ai-coach/`.

## Limits and known issues

- **The lint is static.** It cannot measure text. Use `probe-overflow.js` for that, and it needs a
  browser tool.
- **Contrast is checked for hex literals only**, and only for the eight token pairs listed above.
- **Node is required for the lint.** Without it, the skill applies the rules by hand.
- **#48: the relative `scripts/probe-overflow.js`
  path.** The compiled Cursor rule
  [`adapters/out/cursor/design-coach--artifact-style.mdc:50`](../../adapters/out/cursor/design-coach--artifact-style.mdc)
  leaves `scripts/probe-overflow.js` relative, so it does not resolve outside the skill
  directory. The proposed fix adds `scripts/` to the `build.js` substitution table. The source
  has the same shape: [SKILL.md:44](../../plugins/design-coach/skills/artifact-style/SKILL.md)
  names `scripts/probe-overflow.js` without the `${CLAUDE_PLUGIN_ROOT}` prefix that line 38 gives
  `check-artifact.js`.
- **#46**: the same compiled rule calls
  the lint through `$AICOACH_REPO`, which fails in PowerShell and cmd.

## Tests

[`scripts/check-artifact.test.js`](../../plugins/design-coach/scripts/check-artifact.test.js) runs
in CI (`.github/workflows/ci.yml:54`). It checks the following:

- The shipped skeleton lints clean, with no errors and no warnings.
- Removing each promised property (the zoom wrapper, either dark block, contrast, the body
  background, the generic font family, an allowed host, the title, the no-doctype rule) produces
  the matching error.
- `palettes/sea.css` is byte-equal to the skeleton's `§tokens` section, and `sage.css` swapped in
  lints clean.
- The contrast maths matches the WCAG worked examples.
- Both hooks behave as described above when run the way Claude Code runs them.

```
node plugins/design-coach/scripts/check-artifact.test.js
```

## Source map

- [`../../plugins/design-coach/.claude-plugin/plugin.json`](../../plugins/design-coach/.claude-plugin/plugin.json): manifest, version and dependency
- [`../../plugins/design-coach/skills/artifact-style/SKILL.md`](../../plugins/design-coach/skills/artifact-style/SKILL.md): the skill, with its steps and four rule sets
- [`../../plugins/design-coach/skills/artifact-style/references/detect.md`](../../plugins/design-coach/skills/artifact-style/references/detect.md): six-read detection, token mapping, the design brief
- [`../../plugins/design-coach/skills/artifact-style/references/overflow.md`](../../plugins/design-coach/skills/artifact-style/references/overflow.md): the overflow ladder
- [`../../plugins/design-coach/skills/artifact-style/references/diagrams.md`](../../plugins/design-coach/skills/artifact-style/references/diagrams.md): the zoomable wrapper, mermaid behaviour, drawing rules
- [`../../plugins/design-coach/skills/artifact-style/references/tokens.md`](../../plugins/design-coach/skills/artifact-style/references/tokens.md): font stacks, both palettes, measured contrast tables
- [`../../plugins/design-coach/skills/artifact-style/references/skeleton.html`](../../plugins/design-coach/skills/artifact-style/references/skeleton.html): the one copy of base CSS and the zoom script
- [`../../plugins/design-coach/skills/artifact-style/references/palettes/sea.css`](../../plugins/design-coach/skills/artifact-style/references/palettes/sea.css), [`sage.css`](../../plugins/design-coach/skills/artifact-style/references/palettes/sage.css): drop-in token sections
- [`../../plugins/design-coach/skills/artifact-style/evals/evals.json`](../../plugins/design-coach/skills/artifact-style/evals/evals.json): trigger-accuracy prompts, including the boundaries with `dataviz`, `design` and `blueprint`
- [`../../plugins/design-coach/scripts/check-artifact.js`](../../plugins/design-coach/scripts/check-artifact.js): the static lint
- [`../../plugins/design-coach/scripts/probe-overflow.js`](../../plugins/design-coach/scripts/probe-overflow.js): the in-browser overflow probe
- [`../../plugins/design-coach/scripts/check-artifact.test.js`](../../plugins/design-coach/scripts/check-artifact.test.js): lint and hook self-test
- [`../../plugins/design-coach/hooks/hooks.json`](../../plugins/design-coach/hooks/hooks.json): hook registration
- [`../../plugins/design-coach/hooks/artifact-lint.js`](../../plugins/design-coach/hooks/artifact-lint.js): pre-publish lint, asks on errors
- [`../../plugins/design-coach/hooks/artifact-nudge.js`](../../plugins/design-coach/hooks/artifact-nudge.js): post-skill reminder
