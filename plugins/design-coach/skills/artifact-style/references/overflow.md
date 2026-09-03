# Text never leaves its box

Two causes account for nearly every overflow on a generated page. A flex or grid child defaults
to `min-width: auto`, which means "never narrower than my longest word", so a long label pushes
its column wider than its track and the row overflows instead of the text wrapping. And an
unbreakable token — a URL, a hash, a file path, an identifier — has no break opportunity, so no
amount of wrapping helps until you allow a break anywhere. The skeleton fixes both at the base
(`<!-- §overflow -->`): `.row > *, .grid > * { min-width: 0 }` and `body { overflow-wrap:
anywhere }`. Table cells opt back out (`overflow-wrap: normal`) so a table keeps its natural
width and scrolls inside `.tablewrap` instead of breaking words character by character.

## The ladder — pick by what the text is

| Content | CSS (skeleton class) | Reveal | Why this and not another |
|---|---|---|---|
| table cell | `<td><span class="trunc" title="…">` — `.trunc` is `display: block; max-width: 24ch; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0` | `title="full text"` (native hover tooltip, no JS) | the row must stay one line; the full value is one hover away. The class goes on a block *inside* the cell: a `td` ignores `max-width` in auto table layout, so on the cell itself nothing truncates |
| whole table | `.tablewrap { overflow-x: auto }` around it | scroll | WCAG 1.4.10 exempts data tables from reflow; the page never scrolls sideways |
| card / section title | `.clamp2` — `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden` | `title` | two lines keeps a card grid aligned; the prefixed form is what ships in every browser today |
| URL, hash, id, path | `.anywhere` — `overflow-wrap: anywhere` | none needed — it breaks | hiding it makes it unrecoverable; breaking it keeps it copyable |
| code | `pre { overflow-x: auto; white-space: pre }` | scroll | wrapped code changes meaning; a long line scrolls |
| prose in a `<pre>` | `pre.wrap { white-space: pre-wrap }` | — | it is text, not code |
| diagram / SVG label | shorten the words; or a smaller `font-size` on that `<text>` | — | an ellipsised node label is meaningless; a diagram may scroll (1.4.10) but its words must read |
| KPI number | `.kpi { font-size: clamp(22px, 4vw, 36px) }`, in a card | — | numbers shrink; they are never clamped or truncated. Never inside a table: every cell of a table shares one font size (the skeleton sets `th, td { font-size: 15px }`), and a figure that needs to be big is a card, not a row |
| nav / TOC item | `.trunc` + `title` | hover | one line per item |
| heading | `text-wrap: balance`, `clamp()` size | — | wraps by design; never nowrap |

## `overflow-wrap: anywhere` vs `break-word`

They render the same break. The difference is intrinsic sizing: `anywhere` counts its break
opportunities toward `min-content`, so a grid or flex track can actually collapse to fit;
`break-word` does not, and the track stays as wide as the longest unbroken word. Use `anywhere`
in grids and flex rows (the skeleton's default), `break-word` only in a fixed-width block where
the width is already known. `word-break: break-all` breaks inside words even when a normal
break exists — for CJK and hashes only, never prose.

## Container-relative type

When a label must fit a box of unknown width — a KPI in a card that may be one-, two- or
three-up — put `container-type: inline-size` on the card (the skeleton does) and size with
container units: `font-size: clamp(1.25rem, 12cqi, 2.25rem)`. This is the "make the font smaller"
fix done once instead of per breakpoint.

## Check, then look

The lint warns on `text-overflow: ellipsis` without any `min-width: 0` (the ellipsis never
appears), on a `<pre>` rule without `overflow-x`, and on a `<table>` with no scrolling ancestor.
Then look once at 320 px wide: nothing but tables, diagrams and code may scroll sideways.
