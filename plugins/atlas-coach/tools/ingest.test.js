#!/usr/bin/env node
'use strict';
// Checks for the deterministic half of /ingest. No framework, throwaway output dir.
// Ported from keka's suite; the original eight contracts are preserved verbatim, then
// the atlas additions (FTS paragraph index, search, reindex, stats) get their own.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

// a host shell exporting FORCE_COLOR would colorize console.log output in spawned
// children and break JSON.parse — pin colors off so the suite is host-independent
process.env.FORCE_COLOR = '0';

const g = require('./ingest.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-ingest-'));
const out = path.join(tmp, 'docs');
const run = (...args) => spawnSync('node', [path.join(__dirname, 'ingest.js'), ...args],
  { encoding: 'utf8', env: process.env, timeout: 20000 });

// routing: each input type goes exactly one way
assert.strictEqual(g.route('notes.md'), 'copy', 'markdown copied');
assert.strictEqual(g.route('README.TXT'), 'copy', 'extension match is case-insensitive');
assert.strictEqual(g.route('spec.docx'), 'pandoc', 'docx via pandoc');
assert.strictEqual(g.route('paper.pdf'), 'read', 'pdf needs markitdown or the model');
assert.strictEqual(g.route('https://example.com/post'), 'fetch', 'url fetched');
assert.strictEqual(g.route('archive.zip'), 'unsupported', 'unknown type refused, not guessed');

// slugs are filesystem-safe and lose the extension
assert.strictEqual(g.slugify('Q3 Planning Notes.docx'), 'q3-planning-notes', 'slug from a filename');
assert.strictEqual(g.slugify('example.com/a/b?x=1'), 'example-com-a-b-x-1', 'slug from a url');
assert.strictEqual(g.slugify('***'), 'document', 'slug never empty');

// convert: a markdown file lands with provenance frontmatter
const src = path.join(tmp, 'Meeting Notes.md');
fs.writeFileSync(src, '# Notes\n\nDecided to ship the widget export on Friday after the review.\n');
let r = run('convert', src, '--out', out);
assert.strictEqual(r.status, 0, 'convert exits 0: ' + r.stderr);
const first = JSON.parse(r.stdout);
assert.ok(first.handled && first.file, 'file written: ' + r.stdout);
const written = fs.readFileSync(first.file, 'utf8');
assert.match(written, /^---\n/, 'frontmatter present');
assert.match(written, /source: .*Meeting Notes\.md/, 'source recorded');
assert.match(written, /sha256: [0-9a-f]{64}/, 'source hash recorded');
assert.match(written, /Decided to ship the widget export/, 'body preserved verbatim');

// idempotency is by content hash, not filename
r = run('convert', src, '--out', out);
assert.ok(JSON.parse(r.stdout).skipped, 're-ingesting the same file is a no-op');
const renamed = path.join(tmp, 'Same Content Different Name.md');
fs.copyFileSync(src, renamed);
r = run('convert', renamed, '--out', out);
assert.ok(JSON.parse(r.stdout).skipped, 'same bytes under a new name still skipped');

// plan reports without writing anything — and reports what converters this machine has
const before = fs.readdirSync(out).length;
r = run('plan', src, 'https://example.com/x', 'mystery.zip', '--out', out);
const plan = JSON.parse(r.stdout);
assert.strictEqual(plan.plan.length, 3, 'one plan entry per input');
assert.ok(plan.plan[0].alreadyIngested, 'plan flags an already-ingested source');
assert.strictEqual(plan.plan[1].how, 'fetch', 'url routed to fetch');
assert.ok(plan.plan[1].via === 'defuddle' || plan.plan[1].via === 'WebFetch', 'fetch names its converter');
assert.strictEqual(plan.plan[2].how, 'unsupported', 'unknown type flagged');
assert.ok('pandoc' in plan.converters && 'markitdown' in plan.converters && 'defuddle' in plan.converters,
  'plan reports converter availability');
assert.strictEqual(fs.readdirSync(out).length, before, 'plan wrote nothing');

// write: model-produced markdown arrives on stdin and gains frontmatter
r = spawnSync('node', [path.join(__dirname, 'ingest.js'), 'write', 'annual-report',
  '--out', out, '--source', 'annual.pdf', '--summary', 'What the year cost.', '--tags', 'finance,annual'],
  { input: '# Annual report\n\nRevenue was up across every region this year, led by exports.\n',
    encoding: 'utf8', env: process.env, timeout: 20000 });
assert.strictEqual(r.status, 0, 'write exits 0: ' + r.stderr);
const reportFile = JSON.parse(r.stdout).file;
const report = fs.readFileSync(reportFile, 'utf8');
assert.match(report, /source: annual\.pdf/, 'write records the source');
assert.match(report, /summary: What the year cost\./, 'summary stored for the index');
assert.match(report, /tags: finance,annual/, 'tags stored');

// a slug collision from a different source is refused, not silently overwritten
assert.throws(
  () => g.writeDoc(out, 'annual-report', 'other text', { source: 'somewhere-else.docx' }),
  /slug collision/, 'refuses to overwrite a doc from a different source');

// index lists every document with its provenance
r = run('index', '--out', out);
assert.strictEqual(r.status, 0, 'index exits 0: ' + r.stderr);
const index = fs.readFileSync(path.join(out, '00-index.md'), 'utf8');
assert.match(index, /\[annual report\]\(annual-report\.md\)/, 'index links the doc');
assert.match(index, /annual\.pdf/, 'index shows where it came from');
assert.match(index, /What the year cost\./, 'index shows the summary');
assert.ok(!index.includes('00-index.md](00-index'), 'index does not list itself');

// --- atlas additions: the paragraph index ------------------------------------

// chunking keeps the heading trail and drops fragments too short to find
{
  const cs = g.chunk('# Top\n\n## Sub\n\nA paragraph long enough to carry real searchable signal here.\n\nshort\n');
  assert.strictEqual(cs.length, 1, 'short fragments dropped');
  assert.strictEqual(cs[0].heading, 'Top > Sub', 'heading trail kept');
}

// convert/write indexed their paragraphs; search finds the exact one, with its trail
r = run('search', 'widget export friday', '--out', out);
assert.strictEqual(r.status, 0, 'search exits 0: ' + r.stderr);
let hits = JSON.parse(r.stdout);
assert.ok(hits.length >= 1, 'search finds the ingested paragraph: ' + r.stdout);
assert.ok(hits[0].chunk.includes('widget export'), 'the exact paragraph comes back');
assert.ok('heading' in hits[0] && 'file' in hits[0], 'hit carries file and heading trail');

// a query that is all punctuation cannot break FTS5 syntax
r = run('search', '?!*"(', '--out', out);
assert.strictEqual(r.status, 0, 'garbage query exits 0');
assert.strictEqual(JSON.parse(r.stdout).length, 0, 'garbage query returns empty, not an error');

// search against a dir with no index is an empty result, not a crash
r = run('search', 'anything', '--out', path.join(tmp, 'nowhere'));
assert.strictEqual(JSON.parse(r.stdout).length, 0, 'no index = no hits, exit 0');

// reindex from the docs alone reproduces the same hit — the index is disposable
fs.rmSync(path.join(out, '.atlas-index.db'), { force: true });
r = run('reindex', '--out', out);
assert.match(r.stdout, /reindexed 2 documents/, 'reindex reports the count: ' + r.stdout);
r = run('search', 'revenue exports', '--out', out);
hits = JSON.parse(r.stdout);
assert.ok(hits.some((h) => h.file === 'annual-report.md'), 'rebuilt index reproduces the hit');

// stats: counts, tags, staleness
{
  const old = path.join(out, 'ancient-spec.md');
  fs.writeFileSync(old, '---\ntitle: ancient spec\nsource: spec.docx\nconverted: 2024-01-01\ntags: spec\n---\n\nOld enough to be flagged stale by any 90-day cutoff, clearly.\n');
  r = run('stats', '--out', out);
  const s = JSON.parse(r.stdout);
  assert.strictEqual(s.docs, 3, 'stats counts docs: ' + r.stdout);
  assert.ok(s.chunks >= 2, 'stats counts chunks');
  assert.strictEqual(s.tags.finance, 1, 'stats counts tags');
  assert.ok(s.staleOver90d >= 1, 'stale docs flagged');
  assert.strictEqual(s.oldest, '2024-01-01', 'date range starts at the oldest');
}

// pandoc conversion with a hostile path (spaces + &) — skipped silently when pandoc is absent
if (g.converters().pandoc) {
  const hostile = path.join(tmp, 'notes & drafts.html');
  fs.writeFileSync(hostile, '<h1>Draft</h1><p>The ampersand path must survive conversion intact.</p>');
  r = run('convert', hostile, '--out', out);
  const res = JSON.parse(r.stdout);
  assert.ok(res.handled, 'pandoc handles a path with & and spaces: ' + r.stdout);
  assert.match(fs.readFileSync(res.file, 'utf8'), /ampersand path/, 'converted body present');
}

// write --body-file: the route for a caller that cannot build a pipe. PowerShell 5.1 has no
// heredoc, so an agent handing over markdown it generated itself has no other portable option.
{
  const body = path.join(tmp, 'generated body.md');
  fs.writeFileSync(body, '# Read by the model\n\nA paragraph the agent produced itself, & survived.\n');
  r = run('write', 'model-read-doc', '--body-file', body, '--source', 'paper.pdf', '--out', out);
  assert.strictEqual(r.status, 0, 'write --body-file exits 0: ' + r.stderr);
  const written = JSON.parse(r.stdout).file;
  const text = fs.readFileSync(written, 'utf8');
  assert.match(text, /A paragraph the agent produced itself, & survived\./, 'body written verbatim');
  assert.match(text, /source: paper\.pdf/, 'frontmatter still applied');

  // a missing --body-file fails loudly rather than writing an empty document
  r = run('write', 'no-such-body', '--body-file', path.join(tmp, 'absent.md'), '--out', out);
  assert.notStrictEqual(r.status, 0, 'a missing body file is an error');
  assert.match(r.stderr, /cannot read --body-file/, 'and says which file: ' + r.stderr);
}

// reading a corpus must not create one
{
  const empty = path.join(tmp, 'no-corpus-here');
  let r = run('stats', '--out', empty);
  assert.strictEqual(r.status, 0, 'stats on an absent corpus is not an error: ' + r.stderr);
  assert.strictEqual(JSON.parse(r.stdout).docs, 0, 'and reports nothing');
  assert.ok(!fs.existsSync(empty), 'asking what a corpus covers does not create the corpus');

  r = run('search', 'anything at all', '--out', empty);
  assert.strictEqual(r.status, 0, 'search on an absent corpus is not an error either');
  assert.ok(!fs.existsSync(empty), 'and it stays absent');
}

console.log('ingest.test.js: ALL PASS');
