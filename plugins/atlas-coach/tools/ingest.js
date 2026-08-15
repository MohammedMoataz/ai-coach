#!/usr/bin/env node
'use strict';
// Documents in, markdown out. The deterministic half of /ingest: routing, conversion by
// pandoc/markitdown where they apply, source hashing for idempotency, frontmatter, the
// human index, and a paragraph-level FTS index so /research and /analyze can find the
// exact passage later. Anything needing judgment (PDFs without markitdown, live pages,
// refining a rough conversion) is left to the model, which hands the result back
// through `write`. Ported from keka's tools/ingest.js; the contracts its tests locked
// are preserved.
//
//   ingest.js plan    <file|url>...            what would happen, as JSON (no writes)
//   ingest.js convert <file> [--out <dir>]     convert what pandoc/markitdown/copy handle
//   ingest.js write   <slug> [--out <dir>] --source <s> [--title <t>] [--sha <h>]
//                                              body arrives on stdin (model-produced)
//   ingest.js index   [--out <dir>]            rebuild <dir>/00-index.md
//   ingest.js search  <query> [--limit N]      FTS over ingested paragraphs, JSON out
//   ingest.js reindex [--out <dir>]            rebuild the FTS index from the docs
//   ingest.js stats   [--out <dir>]            corpus stats: counts, tags, staleness

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const COPY = new Set(['.md', '.markdown', '.txt', '.text']);
const PANDOC = new Set(['.docx', '.odt', '.rtf', '.html', '.htm', '.epub', '.tex']);
const MODEL = new Set(['.pdf']); // readable by markitdown when installed, else the model reads it

const INDEX_DB = '.atlas-index.db'; // derivable state — the repo's *.db gitignore keeps it out

const isUrl = (s) => /^https?:\/\//i.test(String(s));

function route(input) {
  if (isUrl(input)) return 'fetch';
  const ext = path.extname(String(input)).toLowerCase();
  if (COPY.has(ext)) return 'copy';
  if (PANDOC.has(ext)) return 'pandoc';
  if (MODEL.has(ext)) return 'read';
  return 'unsupported';
}

function slugify(s) {
  return String(s).toLowerCase().replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// shell:true so .cmd/.ps1 shims (npm globals, pip scripts) resolve on Windows — probes only.
// One command string (not args + shell) so Node 24 doesn't warn DEP0190; bin names come from
// our own fixed ladder, never from input.
const haveCache = {};
function have(bin) {
  if (bin in haveCache) return haveCache[bin];
  const r = spawnSync(bin + ' --version', { encoding: 'utf8', shell: true });
  return (haveCache[bin] = r.status === 0);
}

// the converter ladder as facts, not assumptions — plan reports these so the skill routes honestly
function converters() {
  return { pandoc: have('pandoc'), markitdown: have('markitdown'), defuddle: have('defuddle') };
}

// frontmatter is the memory of what came from where — it makes re-ingesting a no-op
function readFrontmatter(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return {};
    const out = {};
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([\w-]+):\s*(.*)$/);
      if (kv) out[kv[1]] = kv[2].trim();
    }
    return out;
  } catch { return {}; }
}

function docs(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== '00-index.md')
      .map((f) => ({ file: f, ...readFrontmatter(path.join(dir, f)) }));
  } catch { return []; }
}

// already ingested? same bytes under any name means there is nothing to do
function existingFor(dir, sha) {
  return sha ? docs(dir).find((d) => d.sha256 === sha) : null;
}

function frontmatter(fields) {
  const order = ['title', 'source', 'converted', 'sha256', 'converter', 'summary', 'tags'];
  const lines = order.filter((k) => fields[k]).map((k) => `${k}: ${fields[k]}`);
  return '---\n' + lines.join('\n') + '\n---\n\n';
}

// ---------- the paragraph index ----------
// FTS5 over ingested paragraphs, each with its heading trail. Keyword-grade by design:
// embeddings are deferred until this measurably misses (house ceiling — record the misses).

function openIndex(dir) {
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, INDEX_DB));
  db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(file, heading, chunk)");
  return db;
}

// paragraphs with their heading trail; short fragments carry no findable signal
function chunk(body) {
  const out = [];
  let trail = [];
  for (const block of String(body).split(/\n{2,}/)) {
    const text = block.trim();
    if (!text) continue;
    const h = text.match(/^(#{1,6})\s+(.*)$/m);
    if (h && text.startsWith('#')) {
      const depth = h[1].length;
      trail = trail.filter((t) => t.depth < depth).concat({ depth, text: h[2].trim() });
      continue;
    }
    if (text.length < 40) continue;
    out.push({ heading: trail.map((t) => t.text).join(' > '), text });
  }
  return out;
}

// indexing must never fail a write — the doc on disk is the truth, the index is derivable
function indexDoc(dir, file, body) {
  try {
    const db = openIndex(dir);
    const del = db.prepare('DELETE FROM chunks WHERE file = ?');
    del.run(file);
    const ins = db.prepare('INSERT INTO chunks(file, heading, chunk) VALUES(?, ?, ?)');
    for (const c of chunk(body)) ins.run(file, c.heading, c.text);
    db.close();
    return true;
  } catch { return false; }
}

function stripFrontmatter(raw) {
  return String(raw).replace(/^---\n[\s\S]*?\n---\n*/, '');
}

function reindex(dir) {
  try { fs.rmSync(path.join(dir, INDEX_DB), { force: true }); } catch { /* fresh anyway */ }
  let n = 0;
  for (const d of docs(dir)) {
    const raw = fs.readFileSync(path.join(dir, d.file), 'utf8');
    if (indexDoc(dir, d.file, stripFrontmatter(raw))) n++;
  }
  return n;
}

function searchIndex(dir, query, limit) {
  if (!fs.existsSync(path.join(dir, INDEX_DB))) return [];
  // sanitize to bare terms OR'd together — rank ordering does the relevance work,
  // and a raw question mustn't be able to break FTS5 query syntax
  const terms = String(query).toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  try {
    const db = openIndex(dir);
    const rows = db.prepare(
      'SELECT file, heading, chunk FROM chunks WHERE chunks MATCH ? ORDER BY rank LIMIT ?'
    ).all(terms.join(' OR '), limit);
    db.close();
    return rows;
  } catch { return []; }
}

// ---------- documents ----------

function writeDoc(dir, slug, body, fields) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, slug + '.md');
  const prior = readFrontmatter(file);
  // a slug collision between two different sources must not silently overwrite
  if (prior.source && fields.source && prior.source !== fields.source) {
    throw new Error(`slug collision: ${slug}.md already came from ${prior.source}`);
  }
  const text = String(body).trim();
  fs.writeFileSync(file, frontmatter(fields) + text + '\n');
  indexDoc(dir, slug + '.md', text);
  return file;
}

function today() { return new Date().toISOString().slice(0, 10); }

function buildIndex(dir) {
  const list = docs(dir).sort((a, b) => (a.title || a.file).localeCompare(b.title || b.file));
  if (!list.length) return null;
  const lines = ['# Documents', '',
    'Converted with `/ingest`. Each entry records where it came from.', ''];
  for (const d of list) {
    const title = d.title || d.file.replace(/\.md$/, '');
    lines.push(`- [${title}](${d.file}) — ${d.source || 'unknown source'}${d.converted ? ` · ${d.converted}` : ''}`);
    if (d.summary) lines.push(`  - ${d.summary}`);
  }
  const file = path.join(dir, '00-index.md');
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return file;
}

function statsFor(dir) {
  const list = docs(dir);
  const tags = {};
  let oldest = null, newest = null, stale = 0;
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  for (const d of list) {
    for (const t of String(d.tags || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      tags[t] = (tags[t] || 0) + 1;
    }
    if (d.converted) {
      if (!oldest || d.converted < oldest) oldest = d.converted;
      if (!newest || d.converted > newest) newest = d.converted;
      if (d.converted < cutoff) stale++;
    }
  }
  let chunks = 0;
  try {
    const db = openIndex(dir);
    chunks = db.prepare('SELECT count(*) AS n FROM chunks').get().n;
    db.close();
  } catch { /* index absent is a fact, not a failure */ }
  return { docs: list.length, chunks, tags, oldest, newest, staleOver90d: stale,
    sources: list.map((d) => d.source || 'unknown') };
}

// ---------- cli ----------

function cli() {
  const [cmd, ...a] = process.argv.slice(2);
  const flag = (name, def) => { const i = a.indexOf('--' + name); return i >= 0 ? a[i + 1] : def; };
  const rest = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) i++; else rest.push(a[i]);
  }
  const out = path.resolve(flag('out', 'docs'));

  switch (cmd) {
    case 'plan': {
      const conv = converters();
      const plan = rest.map((input) => {
        const how = route(input);
        let sha = null, skip = null;
        if (how !== 'fetch' && how !== 'unsupported') {
          try { sha = sha256(fs.readFileSync(input)); } catch { return { input, how: 'missing' }; }
          const dup = existingFor(out, sha);
          if (dup) skip = dup.file;
        }
        // via: who actually does the work, given what is installed on THIS machine
        const via = how === 'read' ? (conv.markitdown ? 'markitdown' : 'model-read (20-page batches)')
          : how === 'fetch' ? (conv.defuddle ? 'defuddle' : 'WebFetch')
          : how === 'pandoc' ? (conv.pandoc ? 'pandoc' : 'MISSING pandoc — /harness-coach:partners')
          : how;
        return { input, how, via, slug: slugify(isUrl(input) ? input.replace(/^https?:\/\//, '') : path.basename(input)), sha256: sha, alreadyIngested: skip };
      });
      console.log(JSON.stringify({ out, converters: conv, pandoc: conv.pandoc, plan }, null, 2));
      break;
    }
    case 'convert': {
      const input = rest[0];
      if (!input) { console.error('usage: ingest.js convert <file> [--out <dir>]'); process.exitCode = 1; break; }
      const how = route(input);
      if (how === 'fetch' || how === 'unsupported') {
        console.log(JSON.stringify({ input, how, handled: false,
          note: how === 'unsupported' ? 'no route for this type' : 'needs the model — fetch it, then pipe markdown to `write`' }));
        break;
      }
      const buf = fs.readFileSync(input);
      const sha = sha256(buf);
      const dup = existingFor(out, sha);
      if (dup) { console.log(JSON.stringify({ input, handled: true, skipped: dup.file, reason: 'identical source already ingested' })); break; }
      const slug = slugify(path.basename(input));
      let body, converter = null;
      if (how === 'copy') {
        body = buf.toString('utf8');
      } else if (how === 'read') {
        if (!have('markitdown')) {
          console.log(JSON.stringify({ input, how, handled: false,
            note: 'needs the model — read the PDF in 20-page batches, then pipe markdown to `write` (or install markitdown: uv tool install markitdown)' }));
          break;
        }
        // markitdown writes markdown to stdout; no shell — paths with & or spaces stay one argument
        // (pip/uv install a real .exe on Windows, so PATH resolution works without a shell)
        const r = spawnSync('markitdown', [input], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
        if (r.status !== 0 || !String(r.stdout).trim()) {
          console.log(JSON.stringify({ input, how, handled: false, note: 'markitdown failed: ' + String(r.stderr || 'empty output').slice(0, 300) }));
          break;
        }
        body = r.stdout; converter = 'markitdown';
      } else {
        if (!have('pandoc')) {
          console.log(JSON.stringify({ input, how, handled: false, note: 'pandoc not installed — see /harness-coach:partners' }));
          break;
        }
        // no shell: pandoc is a real .exe and a path containing & or spaces must stay one argument
        const r = spawnSync('pandoc', [input, '-t', 'gfm', '--wrap=none'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
        if (r.status !== 0) {
          console.log(JSON.stringify({ input, how, handled: false, note: 'pandoc failed: ' + String(r.stderr || '').slice(0, 300) }));
          break;
        }
        body = r.stdout; converter = 'pandoc';
      }
      const file = writeDoc(out, slug, body, {
        title: slug.replace(/-/g, ' '), source: input, converted: today(), sha256: sha,
        converter,
      });
      console.log(JSON.stringify({ input, how, handled: true, file, slug, sha256: sha, converter }));
      break;
    }
    case 'write': {
      const slug = slugify(rest[0] || '');
      let body = '';
      try { body = fs.readFileSync(0, 'utf8'); } catch { /* empty stdin */ }
      if (!body.trim()) { console.error('write: markdown body expected on stdin'); process.exitCode = 1; break; }
      const file = writeDoc(out, slug, body, {
        title: flag('title', slug.replace(/-/g, ' ')),
        source: flag('source', 'unknown'),
        converted: today(),
        sha256: flag('sha', null),
        converter: flag('converter', null),
        summary: flag('summary', null),
        tags: flag('tags', null),
      });
      console.log(JSON.stringify({ file, slug }));
      break;
    }
    case 'index': {
      const file = buildIndex(out);
      console.log(file ? 'index written: ' + file : 'no documents in ' + out);
      break;
    }
    case 'search': {
      const q = rest.join(' ');
      if (!q.trim()) { console.error('usage: ingest.js search <query> [--limit N] [--out <dir>]'); process.exitCode = 1; break; }
      console.log(JSON.stringify(searchIndex(out, q, Number(flag('limit', 8)) || 8), null, 2));
      break;
    }
    case 'reindex':
      console.log(`reindexed ${reindex(out)} documents in ${out}`);
      break;
    case 'stats':
      console.log(JSON.stringify(statsFor(out), null, 2));
      break;
    default:
      console.log('usage: ingest.js <plan|convert|write|index|search|reindex|stats> [inputs...] [--out <dir>]');
  }
}

module.exports = { route, slugify, sha256, readFrontmatter, writeDoc, buildIndex, existingFor, docs,
  chunk, indexDoc, searchIndex, reindex, statsFor, converters, stripFrontmatter };
if (require.main === module) cli();
