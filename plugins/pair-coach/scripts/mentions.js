#!/usr/bin/env node
'use strict';
// The one parser for @coach comment threads, shared by the nudge hook and the mentions skill.
//   node mentions.js json  [dir]   every thread in files that mention @coach or the developer
//   node mentions.js list  [dir]   the same, one line each
//   node mentions.js added [dir]   open threads whose @coach line the developer added (uncommitted)
//   node mentions.js whoami [dir]  the handle Claude writes replies to
// No name is hardcoded anywhere: the parser only needs to tell @coach from everybody else, and the
// handle Claude replies to is read from the developer's own git config at runtime.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const git = (cwd, args) => execFileSync('git', ['-c', 'core.quotepath=off', ...args],
  { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
const tryGit = (cwd, args) => { try { return git(cwd, args); } catch { return null; } };

// A comment line starts, after indentation, with one of these tokens. In markdown only an HTML
// comment counts, so prose and code fences that show the syntax (this plugin's own docs) never match.
const CODE_COMMENT = /^(\s*)(\/\/+|#+|--|\/\*+|\*|<!--)\s?(.*)$/;
const MD_COMMENT = /^(\s*)(<!--)\s?(.*)$/;
// The coach is addressed with or without a colon; a person only WITH one, so doc tags (@param, @returns) and
// decorators are never mistaken for someone being addressed.
const TO_COACH = /^@coach\b:?\s*/i;
const TO_PERSON = /^@([^\s:@]+):\s*/;

function parse(text, file = '') {
  const md = /\.mdx?$/i.test(file);
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const threads = [];
  let run = [];
  const flush = () => {
    const addressed = run.filter((l) => l.to);
    if (addressed.length) {
      const last = addressed[addressed.length - 1];
      threads.push({
        file, start: run[0].n, end: run[run.length - 1].n, line: last.n,
        state: last.to === 'coach' ? 'open' : 'waiting', with: last.to,
        prefix: run[0].prefix, indent: run[0].indent,
        text: run.map((l) => l.body).join('\n'),
        asks: run.filter((l) => l.to === 'coach').map((l) => ({ line: l.n })),
      });
    }
    run = [];
  };
  lines.forEach((raw, i) => {
    const m = raw.match(md ? MD_COMMENT : CODE_COMMENT);
    if (!m) return flush();
    const body = m[3].replace(/\s*(\*\/|-->)\s*$/, '');
    const to = TO_COACH.test(body) ? 'coach' : ((body.match(TO_PERSON) || [])[1] || null);
    run.push({ n: i + 1, indent: m[1], prefix: m[2], body, to });
  });
  flush();
  return threads;
}

function root(dir) {
  return (tryGit(dir, ['rev-parse', '--show-toplevel']) || '').trim() || null;
}

function whoami(dir = process.cwd()) {
  const name = (tryGit(dir, ['config', 'user.name']) || '').replace(/\s+/g, '');
  return name || (process.env.USER || process.env.USERNAME || '').replace(/\s+/g, '') || 'you';
}

function readText(file) {
  try {
    const buf = fs.readFileSync(file);
    if (buf.length > 1 << 20 || buf.includes(0)) return null; // binary or huge: nobody comments there
    return buf.toString('utf8');
  } catch { return null; }
}

// Who wrote a line: a mention someone else committed is not an instruction from this developer, and
// the skill asks before acting on one.
function blame(top, file, line) {
  const out = tryGit(top, ['blame', '--porcelain', '-L', `${line},${line}`, '--', file]) || '';
  const mail = (out.match(/^author-mail <([^>]*)>/m) || [])[1] || '';
  const committed = !!out && mail !== 'not.committed.yet';
  return { committed, author: committed ? (out.match(/^author (.*)$/m) || [])[1] || mail : null, mail };
}

// `target` is a directory (sweep its repository) or a file (just that file).
function scan(target = process.cwd(), { withBlame = true } = {}) {
  let dir = target, file = null;
  try { if (fs.statSync(target).isFile()) { dir = path.dirname(target); file = path.basename(target); } } catch { /* git decides */ }
  const top = root(dir);
  if (!top) return { error: 'not a git repository', threads: [] };
  // git names the file relative to the repository, so no two spellings of a path are ever
  // compared: an 8.3 short temp path on Windows and git's long one never matched as strings.
  const only = file == null ? null : (tryGit(dir, ['rev-parse', '--show-prefix']) || '').trim() + file;
  const handle = whoami(top);
  const files = (tryGit(top, ['grep', '-l', '-I', '-i', '--untracked', '-e', '@coach', '-e', `@${handle}:`]) || '')
    .split('\n').filter(Boolean).filter((f) => only == null || f === only);
  const email = (tryGit(top, ['config', 'user.email']) || '').trim().toLowerCase();
  const threads = [];
  for (const f of files) {
    const text = readText(path.join(top, f));
    if (text == null) continue;
    for (const t of parse(text, f)) {
      // Every @coach line in the thread, not just the last: a developer's question written under a
      // teammate's committed instruction would otherwise carry that instruction in as theirs. Per
      // line, so the developer's own line can still be answered while the other one waits for a yes.
      if (withBlame && t.state === 'open') {
        for (const a of t.asks) {
          const b = blame(top, f, a.line);
          a.mine = !b.committed || (!!email && b.mail.toLowerCase() === email);
          a.author = a.mine ? null : b.author;
        }
        const foreign = t.asks.find((a) => !a.mine);
        Object.assign(t, { mine: !foreign, author: foreign ? foreign.author : null });
      }
      threads.push(t);
    }
  }
  return { root: top, handle, threads };
}

// Lines the developer added and has not committed: `git diff -U0 HEAD` additions, plus every line of
// an untracked file. Only these count for the per-prompt nudge — text the developer wrote.
function addedLines(top) {
  const added = new Map(); // file -> Set(line)
  const hasHead = tryGit(top, ['rev-parse', '--verify', '-q', 'HEAD']) != null;
  const diff = hasHead ? tryGit(top, ['diff', '-U0', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', 'HEAD']) || '' : '';
  let file = null;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) { file = l === '+++ /dev/null' ? null : l.slice(6); continue; }
    const h = l.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/);
    if (h && file) {
      const from = Number(h[1]), count = h[2] == null ? 1 : Number(h[2]);
      const set = added.get(file) || new Set();
      for (let n = from; n < from + count; n++) set.add(n);
      added.set(file, set);
    }
  }
  const untracked = hasHead
    ? tryGit(top, ['ls-files', '--others', '--exclude-standard']) || ''
    : tryGit(top, ['ls-files', '--cached', '--others', '--exclude-standard']) || '';
  for (const f of untracked.split('\n').filter(Boolean)) added.set(f, 'all');
  return added;
}

function added(dir = process.cwd()) {
  const top = root(dir);
  if (!top) return [];
  const out = [];
  for (const [f, set] of addedLines(top)) {
    const text = readText(path.join(top, f));
    if (text == null || !/@coach/i.test(text)) continue;
    for (const t of parse(text, f)) {
      if (t.state === 'open' && (set === 'all' || set.has(t.line))) out.push(t);
    }
  }
  return out;
}

module.exports = { parse, whoami, scan, added };

if (require.main === module) {
  const [cmd = 'list', dir = process.cwd()] = process.argv.slice(2);
  if (cmd === 'whoami') console.log(whoami(dir));
  else if (cmd === 'added') for (const t of added(dir)) console.log(`${t.file}:${t.line}`);
  else if (cmd === 'json') console.log(JSON.stringify(scan(dir), null, 2));
  else if (cmd === 'list') {
    const r = scan(dir);
    if (r.error) { console.log(r.error); process.exit(0); }
    if (!r.threads.length) console.log(`no @coach threads (replies go to @${r.handle})`);
    for (const t of r.threads) {
      const who = t.state === 'open' ? (t.mine ? 'open' : `open, committed by ${t.author}`) : `waiting on @${t.with}`;
      console.log(`${t.file}:${t.line}  ${who}  ${t.text.split('\n')[0].slice(0, 80)}`);
    }
  } else { console.error('usage: mentions.js json|list|added|whoami [dir]'); process.exit(2); }
}
