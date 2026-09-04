#!/usr/bin/env node
'use strict';
// Zero-dependency lint for an Artifact page (the single HTML file the Artifact tool publishes).
// It checks the things design-coach:artifact-style promises and a reader would otherwise catch
// by eye after publishing: every diagram inside a zoomable wrapper, the three theme states with
// matching token names, text/background contrast in both themes, a font stack that ends in a
// generic family, resources only from hosts the Artifact CSP admits, and the host's own
// invariants (no doctype/html/head/body, a <title> in the first 8 KB, under 16 MB).
//
//   node check-artifact.js <page.html> [--verbose]     exit 1 on any error
//
// The HTML walk is a tag tokenizer with an open-element stack — ancestry ("is this svg inside
// .zoomable?") is the one question a regex cannot answer, and it is the check this plugin exists
// for. Everything about CSS is regex over the <style> text; a real CSS parser buys nothing here.
const fs = require('node:fs');

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const HOSTS = ['cdnjs.cloudflare.com/', 'cdn.jsdelivr.net/npm/', 'cdn.tailwindcss.com', 'code.jquery.com/', 'fonts.googleapis.com/', 'fonts.gstatic.com/'];
const GENERIC = /(?:sans-serif|serif|monospace|system-ui|ui-monospace|ui-sans-serif|cursive|fantasy)\s*$/i;
const MAX_BYTES = 16 * 1024 * 1024;

const attr = (attrs, name) => {
  const m = attrs.match(new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))', 'i'));
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};
const classes = (attrs) => (attr(attrs, 'class') || '').split(/\s+/).filter(Boolean);

// Visit every opening tag with the stack of its open ancestors. Script and style bodies are
// skipped whole; a closing tag pops itself and anything left open inside it.
function walk(html, visit) {
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  const stack = [];
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    const [, close, rawName, attrs, self] = m;
    const name = rawName.toLowerCase();
    if (close) {
      const i = stack.map((s) => s.name).lastIndexOf(name);
      if (i >= 0) stack.length = i;
      continue;
    }
    const node = { name, attrs, classes: classes(attrs), index: m.index };
    visit(node, stack);
    if (self || VOID.has(name)) continue;
    if (name === 'script' || name === 'style') {
      const end = html.toLowerCase().indexOf('</' + name, re.lastIndex);
      re.lastIndex = end < 0 ? html.length : end;
      continue;
    }
    stack.push(node);
  }
}

// The block that follows `selector {` — brace-matched, so nested @media do not truncate it.
function block(css, selectorRe, from = 0) {
  const m = selectorRe.exec(css.slice(from));
  if (!m) return null;
  const open = from + m.index + m[0].length - 1;
  let depth = 1, i = open + 1;
  for (; i < css.length && depth; i++) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; }
  return { start: open + 1, end: i - 1, text: css.slice(open + 1, i - 1) };
}
const tokens = (text) => {
  const out = new Map();
  for (const m of text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
};

// WCAG 2.x relative luminance and contrast ratio, hex literals only.
// ponytail: hex only — resolve var() chains and rgb()/hsl() if a project's tokens ever need it.
function hex(v) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(v).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
}
function contrast(a, b) {
  const [ra, rb] = [hex(a), hex(b)];
  if (!ra || !rb) return null;
  const L = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const [hi, lo] = [L(ra), L(rb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function check(html) {
  const errors = [], warnings = [], info = [];
  const err = (s) => errors.push(s), warn = (s) => warnings.push(s);

  // ---- host invariants ----
  if (Buffer.byteLength(html) >= MAX_BYTES) err(`page is ${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB; the host caps a rendered page at 16 MB`);
  if (!/<title[^>]*>[^<]+<\/title>/i.test(html.slice(0, 8192))) err('no <title> in the first 8 KB — the host scans only that far for the tab and gallery name');
  for (const tag of ['!doctype', 'html', 'head', 'body']) {
    if (new RegExp('<' + tag + '[\\s>]', 'i').test(html)) err(`<${tag}> present — the host wraps the file in its own skeleton; write page content only`);
  }

  // ---- structure: diagrams, wrappers, tables, svg contents ----
  const has = (stack, cls) => stack.some((n) => n.classes.includes(cls));
  let zoomables = 0, pres = 0, tables = 0;
  walk(html, (node, stack) => {
    const inSvg = stack.some((n) => n.name === 'svg');
    if (node.name === 'svg' && !inSvg) {
      const vb = (attr(node.attrs, 'viewBox') || '').trim().split(/[\s,]+/).map(Number);
      const diagram = /^img$/i.test(attr(node.attrs, 'role') || '') || (vb.length === 4 && vb[2] >= 320);
      if (!diagram) return;
      const label = (attr(node.attrs, 'aria-label') || '').slice(0, 40);
      const where = label ? `svg "${label}"` : `svg at offset ${node.index}`;
      if (!has(stack, 'zoomable')) err(`${where} is not inside a figure.zoomable — every diagram gets the zoom/pan/fit wrapper`);
      if (!attr(node.attrs, 'aria-label')) warn(`${where}: no aria-label — role="img" needs the one sentence a screen reader gets instead of the picture`);
      if (!attr(node.attrs, 'viewBox')) err(`${where}: no viewBox — the zoom script and shrink-to-fit both need it`);
    }
    if (inSvg && (node.name === 'script' || node.name === 'style' || node.name === 'foreignobject')) {
      err(`<${node.name}> inside an <svg> — artifact-diagramming forbids it; put script and style on the page, not in the drawing`);
    }
    if (node.classes.includes('mermaid') && !has(stack, 'zoomable')) err(`mermaid block at offset ${node.index} is not inside a figure.zoomable`);
    if (node.classes.includes('zoomable')) {
      zoomables++;
      const seg = html.slice(node.index, node.index + 4000);
      if (!/<figcaption/i.test(seg)) warn(`figure.zoomable at offset ${node.index} has no <figcaption> — say what the picture shows`);
      if (!/class="[^"]*zoom-viewport/.test(seg) || !/class="[^"]*zoom-stage/.test(seg)) err(`figure.zoomable at offset ${node.index} lacks .zoom-viewport > .zoom-stage — copy the wrapper from skeleton.html`);
    }
    if (node.name === 'pre' && !node.classes.includes('mermaid')) pres++;
    if (node.classes.includes('kpi') && stack.some((n) => n.name === 'td' || n.name === 'th')) {
      warn(`.kpi at offset ${node.index} is inside a table cell — every cell shares one font size; a big number is a card, not a row`);
    }
    if (node.name === 'table') {
      tables++;
      const scrolls = stack.some((n) => n.classes.includes('tablewrap') || /overflow(?:-x)?\s*:\s*(?:auto|scroll)/i.test(attr(n.attrs, 'style') || ''));
      if (!scrolls) warn(`table at offset ${node.index} has no scrolling ancestor (.tablewrap or overflow-x:auto) — a wide table will scroll the whole page`);
    }
  });
  if (zoomables && !/data-zoom|zoom-viewport/.test(html.slice(html.lastIndexOf('<script')))) warn('figure.zoomable present but no zoom script found in the last <script> — copy §zoom from skeleton.html');

  // ---- css ----
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  if (!css.trim()) err('no <style> block — the page has no tokens, no theme, no overflow rules');

  const light = block(css, /(?:^|[^\w\[:-])(:root)\s*\{/);
  const media = block(css, /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{/);
  const darkMedia = media ? block(media.text, /:root:not\(\s*\[data-theme\s*=\s*["']?light["']?\]\s*\)\s*\{/) : null;
  const darkStamp = block(css, /:root\s*\[data-theme\s*=\s*["']?dark["']?\]\s*\{/);
  if (!light) err('no bare `:root {` block — light tokens must be defined there (the viewer\'s default state)');
  if (!darkMedia) err('no `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }` — system-dark viewers get the light palette');
  if (!darkStamp) err('no `:root[data-theme="dark"] {…}` — the viewer\'s explicit dark toggle has no effect');
  const tL = light ? tokens(light.text) : new Map(), tM = darkMedia ? tokens(darkMedia.text) : new Map(), tS = darkStamp ? tokens(darkStamp.text) : new Map();
  if (darkMedia && darkStamp) {
    const a = [...tM.keys()].sort().join(','), b = [...tS.keys()].sort().join(',');
    if (a !== b) err('the two dark blocks define different token names — the media block and the [data-theme="dark"] block must redefine the same set');
    for (const k of tM.keys()) if (tL.size && !tL.has(k)) err(`dark defines ${k} but the light :root does not — every token needs a light definition first`);
    if (!tM.size) err('the dark blocks define no --tokens');
  }
  if (light && !tL.size) err('bare :root defines no --tokens — style through tokens, not literal colours');

  const bodyRule = block(css, /(?:^|[}\s,])body\s*(?:,[^{]*)?\{/);
  if (!bodyRule) err('no `body {` rule — set background: var(--bg) there; the viewer paints its own ground behind a transparent body');
  else if (!/background(?:-color)?\s*:\s*var\(/i.test(bodyRule.text)) err('body background is not a var(--token) — a literal or missing background borrows the host theme in one of the three states');

  for (const m of css.matchAll(/(font-family|--[\w-]*(?:sans|mono|font|display|serif)[\w-]*)\s*:\s*([^;}]+)/gi)) {
    const value = m[2].trim();
    if (/var\(/.test(value) || /^(?:inherit|initial|unset)$/.test(value)) continue;
    if (!GENERIC.test(value)) err(`${m[1]}: "${value.slice(0, 60)}" does not end in a generic family — a face that fails to load falls back to the browser default`);
  }
  if (!/font-family|--sans|--mono|font\s*:/i.test(css)) err('no font declared anywhere — the page renders in the host default');
  if (/text-overflow\s*:\s*ellipsis/i.test(css) && !/min-width\s*:\s*0/i.test(css)) warn('text-overflow: ellipsis without any min-width: 0 — flex/grid children default to min-width:auto and the ellipsis never appears');
  if (pres && !block(css, /(?:^|[}\s,])pre(?:\.[\w-]+)?\s*(?:,[^{]*)?\{/)) warn('<pre> present but no `pre {` rule — code needs overflow-x:auto; white-space:pre');
  else if (pres) {
    const pre = block(css, /(?:^|[}\s,])pre(?:\.[\w-]+)?\s*(?:,[^{]*)?\{/);
    if (pre && !/overflow(?:-x)?\s*:\s*(?:auto|scroll)/i.test(pre.text)) warn('`pre {` has no overflow-x:auto — a long line scrolls the page');
  }
  if (tables && !/\.tablewrap\s*\{[^}]*overflow-x\s*:\s*auto/i.test(css) && !/overflow-x\s*:\s*auto/i.test(css)) warn('tables present but no overflow-x:auto rule in the CSS');

  // ---- contrast, both themes ----
  const pairs = [['--text', '--bg', 4.5], ['--text', '--surface', 4.5], ['--text', '--surface-2', 4.5], ['--muted', '--bg', 4.5], ['--muted', '--surface', 4.5], ['--accent', '--bg', 3], ['--accent-contrast', '--accent', 4.5], ['--accent-2-ink', '--accent-2', 4.5]];
  for (const [theme, t] of [['light', tL], ['dark', tM.size ? tM : tS]]) {
    if (!t.size) continue;
    for (const [fg, bg, min] of pairs) {
      if (!t.has(fg) || !t.has(bg)) continue;
      const c = contrast(t.get(fg), t.get(bg));
      if (c == null) { warn(`${theme}: cannot check ${fg} on ${bg} — not hex literals`); continue; }
      info.push(`${theme}: ${fg} on ${bg} = ${c.toFixed(2)}:1`);
      if (c < min) err(`${theme}: ${fg} ${t.get(fg)} on ${bg} ${t.get(bg)} is ${c.toFixed(2)}:1 — below ${min}:1 (WCAG 2.2 ${min === 3 ? '1.4.11 non-text' : '1.4.3 text'})`);
      else if (fg === '--accent' && c < 4.5) warn(`${theme}: --accent on ${bg} is ${c.toFixed(2)}:1 — fine for strokes and fills, too low for link or label text (needs 4.5:1)`);
    }
  }

  // ---- external resources ----
  const urls = new Set();
  walk(html, (node) => {
    if (!['script', 'link', 'img', 'iframe', 'video', 'audio', 'source', 'embed', 'object'].includes(node.name)) return;
    for (const a of ['src', 'href', 'data']) { const v = attr(node.attrs, a); if (v) urls.add(v); }
  });
  for (const m of css.matchAll(/url\(\s*["']?([^"')\s]+)/gi)) urls.add(m[1]);
  for (const m of css.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/gi)) urls.add(m[1]);
  for (const u of urls) {
    if (/^(?:data:|blob:|#|about:)/i.test(u)) continue;
    const m = /^https?:\/\/(.+)$/i.exec(u);
    if (!m) { err(`resource "${u.slice(0, 60)}" is a relative URL — an Artifact is one file; inline it or embed a data: URI`); continue; }
    const rest = m[1].includes('/') ? m[1] : m[1] + '/';   // a bare preconnect origin counts as its root
    if (!HOSTS.some((h) => rest.startsWith(h))) err(`resource host not allowed by the Artifact CSP: ${u.slice(0, 80)} — allowed: ${HOSTS.join(' ')}`);
  }

  return { errors, warnings, info };
}

module.exports = { check, contrast, walk };

if (require.main === module) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) { console.error('usage: node check-artifact.js <page.html> [--verbose]'); process.exit(2); }
  const r = check(fs.readFileSync(file, 'utf8'));
  for (const e of r.errors) console.log('error: ' + e);
  for (const w of r.warnings) console.log('warn: ' + w);
  if (args.includes('--verbose')) for (const i of r.info) console.log('info: ' + i);
  console.log(`check-artifact: ${r.errors.length} error(s), ${r.warnings.length} warning(s) — ${file}`);
  process.exit(r.errors.length ? 1 : 0);
}
