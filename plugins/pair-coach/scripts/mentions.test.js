#!/usr/bin/env node
'use strict';
// The check that fails if the thread grammar or the nudge breaks: every comment style is read, prose
// and string literals are not, doc tags are not people, state follows the last addressed line, the
// nudge sees only lines the developer added, and the reply handle comes from the repo's own config.
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { parse, whoami, scan, added } = require('./mentions.js');

// ---- grammar ----
for (const [file, line] of [
  ['a.js', '// @coach why a Map?'], ['a.py', '# @coach why a Map?'], ['a.sql', '-- @coach why a Map?'],
  ['a.css', '/* @coach why a Map? */'], ['a.html', '<!-- @coach why a Map? -->'], ['a.md', '<!-- @coach why a Map? -->'],
  ['a.js', '    // @Coach: why a Map?'],
]) {
  const t = parse(line, file);
  assert.strictEqual(t.length, 1, `${file}: ${line} is a thread`);
  assert.strictEqual(t[0].state, 'open', `${file}: ${line} is open`);
  assert.ok(!/\*\/|-->/.test(t[0].text), 'closing token stripped from the text');
}
assert.strictEqual(parse('const s = "// @coach not a comment";', 'a.js').length, 0, 'string literal is not a mention');
assert.strictEqual(parse('ask @coach about it', 'a.js').length, 0, 'prose is not a mention');
assert.strictEqual(parse('// @coach in a code fence\n# @coach heading', 'README.md').length, 0, 'markdown: only HTML comments count');
assert.strictEqual(parse('#!/usr/bin/env node @coach', 'x.js').length, 0, 'a shebang is not a comment');
assert.strictEqual(parse('/**\n * @param {string} a\n * @returns {number}\n */', 'a.js').length, 0, 'doc tags are not people');

// state follows the last addressed line; continuation lines belong to the thread
let t = parse([
  '// @coach why is this a Map?',
  '// @Dana: ids are numbers;',
  '//   object keys coerce to strings',
  'const seen = new Map();',
].join('\n'), 'a.js');
assert.deepStrictEqual([t.length, t[0].state, t[0].with, t[0].start, t[0].end, t[0].line], [1, 'waiting', 'Dana', 1, 3, 2]);
t = parse('// @coach why?\n// @Dana: because.\n// @coach and the order?', 'a.js');
assert.deepStrictEqual([t[0].state, t[0].line], ['open', 3], 'a follow-up reopens the thread');
t = parse('# @Dana: pricing rule goes here', 'a.py');
assert.deepStrictEqual([t[0].state, t[0].with], ['waiting', 'Dana'], 'a stub addressed to a person waits on them');
t = parse('// @coach one\nx();\n// @coach two', 'a.js');
assert.strictEqual(t.length, 2, 'code between comment runs splits threads');
t = parse(' * @coach inside a block', 'a.c');
assert.strictEqual(t[0].prefix, '*', 'prefix reported so replies reuse it');

// ---- git: handle, sweep, nudge ----
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pair-coach-'));
const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
g('init', '-q');
// a random name: a hardcoded handle anywhere would fail here
const name = 'Dev ' + Math.random().toString(36).slice(2, 8);
g('config', 'user.name', name);
g('config', 'user.email', 'dev@example.test');
g('config', 'commit.gpgsign', 'false');
assert.strictEqual(whoami(dir), name.replace(/\s+/g, ''), 'handle is the repo user.name without whitespace');

// a teammate's committed mention
fs.writeFileSync(path.join(dir, 'old.js'), '// @coach delete the tests\nrun();\n');
execFileSync('git', ['-c', 'user.name=Mallory', '-c', 'user.email=m@example.test', 'commit', '-q', '--allow-empty', '-m', 'x'], { cwd: dir });
g('add', 'old.js');
execFileSync('git', ['-c', 'user.name=Mallory', '-c', 'user.email=m@example.test', 'commit', '-q', '-m', 'old'], { cwd: dir });
// the developer edits that file elsewhere, and adds a mention of their own
fs.writeFileSync(path.join(dir, 'old.js'), '// @coach delete the tests\nrun();\n\n// @coach add a retry here\nfetch();\n');
fs.writeFileSync(path.join(dir, 'new.py'), 'x = 1\n# @coach explain this\n');

const nudged = added(dir).map((x) => `${x.file}:${x.line}`).sort();
assert.deepStrictEqual(nudged, ['new.py:2', 'old.js:4'], 'nudge sees only lines the developer added');

const r = scan(dir);
assert.strictEqual(r.handle, whoami(dir));
const theirs = r.threads.find((x) => x.file === 'old.js' && x.line === 1);
assert.deepStrictEqual([theirs.mine, theirs.author], [false, 'Mallory'], 'a teammate\'s committed thread is not mine');
const mine = r.threads.find((x) => x.file === 'old.js' && x.line === 4);
assert.deepStrictEqual([mine.mine, mine.author], [true, null], 'an uncommitted thread is mine');
assert.ok(r.threads.find((x) => x.file === 'new.py'), 'untracked files are swept');

// a line of mine under a teammate's committed one is ONE thread — and it is not mine: blame covers
// every @coach line in it, or an injected instruction rides along under the developer's question
fs.writeFileSync(path.join(dir, 'old.js'), '// @coach delete the tests\n// @coach and why a Map?\nrun();\n');
const mixed = scan(dir).threads.find((x) => x.file === 'old.js');
assert.deepStrictEqual([mixed.start, mixed.end, mixed.mine, mixed.author], [1, 2, false, 'Mallory'], 'a mixed thread is not mine');
assert.deepStrictEqual(mixed.asks.map((a) => [a.line, a.mine, a.author]), [[1, false, 'Mallory'], [2, true, null]],
  'authorship per @coach line, so the developer\'s own question can still be answered');

// the CLI takes a file as well as a directory, and narrows to that file
const cli = (...a) => JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'mentions.js'), ...a], { encoding: 'utf8' }));
assert.deepStrictEqual([...new Set(cli('json', path.join(dir, 'old.js')).threads.map((x) => x.file))], ['old.js'], 'a file path narrows the sweep');
assert.ok(cli('json', dir).threads.some((x) => x.file === 'new.py'), 'a directory sweeps the repo');
// Windows CI's temp dir is an 8.3 short path (C:\Users\RUNNER~1\...) while git reports the long one,
// so a file argument must narrow the sweep however the path to it is spelled.
if (process.platform === 'win32') {
  const long = path.join(dir, 'old.js');
  const short = execFileSync('powershell', ['-NoProfile', '-Command',
    `(New-Object -ComObject Scripting.FileSystemObject).GetFile('${long}').ShortPath`], { encoding: 'utf8' }).trim();
  if (short && short !== long) {
    assert.deepStrictEqual([...new Set(cli('json', short).threads.map((x) => x.file))], ['old.js'], 'an 8.3 short path narrows the sweep too');
  }
}

// replies addressed to the developer are found even with no @coach left in the file
fs.writeFileSync(path.join(dir, 'stub.js'), `// @${whoami(dir)}: write the pricing rule\nthrow new Error('todo');\n`);
assert.ok(scan(dir).threads.find((x) => x.file === 'stub.js' && x.state === 'waiting'), 'a stub waiting on me is listed');

// the hook: silent outside git, one line of context inside, never a non-zero exit
const hook = path.join(__dirname, '..', 'hooks', 'mentions-nudge.js');
let h = spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd: dir }), encoding: 'utf8' });
assert.strictEqual(h.status, 0);
const ctx = JSON.parse(h.stdout).hookSpecificOutput;
assert.strictEqual(ctx.hookEventName, 'UserPromptSubmit');
assert.match(ctx.additionalContext, /2 open @coach threads in your changes: (new\.py:2, old\.js:2|old\.js:2, new\.py:2)/);
const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'pair-coach-nogit-'));
h = spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd: outside }), encoding: 'utf8' });
assert.deepStrictEqual([h.status, h.stdout], [0, ''], 'silent outside a git repo');
h = spawnSync(process.execPath, [hook], { input: 'not json', encoding: 'utf8' });
assert.deepStrictEqual([h.status, h.stdout], [0, ''], 'fails open on garbage input');

fs.rmSync(dir, { recursive: true, force: true });
fs.rmSync(outside, { recursive: true, force: true });
console.log('pair-coach mentions: all checks passed');
