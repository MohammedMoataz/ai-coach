#!/usr/bin/env node
'use strict';
// The check that fails if the commit context lies: staged-only vs everything, the diff cap and its
// marker, the issue read from a branch name, the default-branch fallback, a merge in progress, risky
// files flagged, and stale scratch files cleared. Builds throwaway repositories; touches nothing else.
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { gather, RISKY } = require('./context.js');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-coach-'));
const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
g('init', '-q', '-b', 'main');
g('config', 'user.name', 'Dev');
g('config', 'user.email', 'dev@example.test');
g('config', 'commit.gpgsign', 'false');
const write = (f, s) => fs.writeFileSync(path.join(dir, f), s);

// before the first commit: no log, nothing breaks
write('a.js', 'one\n');
let c = gather(dir);
assert.deepStrictEqual([c.hasHead, c.log, c.mode, c.files], [false, [], 'all', ['a.js']]);
assert.match(c.diff, /new file: a\.js\none/, 'an untracked file shows its head');

g('add', 'a.js'); g('commit', '-q', '-m', 'feat: first');
write('a.js', 'one\ntwo\n');
write('b.js', 'new\n');

c = gather(dir);
assert.deepStrictEqual([c.branch, c.onDefault, c.defaultBranch, c.mode], ['main', true, 'main', 'all']);
assert.deepStrictEqual(c.files.sort(), ['a.js', 'b.js'], 'nothing staged: everything, untracked included');
assert.deepStrictEqual(c.log, ['feat: first'], 'recent subjects carry the house style');
assert.match(c.diff, /\+two/);
const printed = execFileSync(process.execPath, [path.join(__dirname, 'context.js')], { cwd: dir, encoding: 'utf8' });
assert.match(printed, /^repository +\S/m, 'the repository is printed, so commands never run anywhere else');

g('add', 'a.js');
c = gather(dir);
assert.deepStrictEqual([c.mode, c.files], ['staged', ['a.js']], 'something staged: only that');
assert.ok(!/new file: b\.js/.test(c.diff), 'staged mode leaves unstaged files out of the diff');

// the cap, and its marker
write('big.js', 'x'.repeat(50000) + '\n');
g('add', 'big.js');
c = gather(dir, { cap: 1000 });
assert.ok(c.truncated && c.diff.length < 1200, 'diff is capped');
assert.match(c.diff, /\[\.\.\. diff truncated at 1000 of \d+ characters \.\.\.\]$/);
g('reset', '-q');

// issue from the branch name, and the flag beats it
g('switch', '-q', '-c', 'fix/36-windsurf-guard');
c = gather(dir);
assert.deepStrictEqual([c.issue, c.onDefault], [36, false]);
assert.strictEqual(gather(dir, { issue: '41' }).issue, 41, '--issue overrides the branch');
g('switch', '-q', '-c', 'chore/tidy');
assert.strictEqual(gather(dir).issue, null, 'no number, no issue');
g('switch', '-q', '-c', 'feat/oauth2-login');
assert.strictEqual(gather(dir).issue, null, 'a digit inside a word is not an issue number');

// default branch: origin/HEAD when there is one, then main/master, then main
g('switch', '-q', 'main');
g('branch', '-m', 'main', 'master');
assert.strictEqual(gather(dir).defaultBranch, 'master');
g('update-ref', 'refs/remotes/origin/trunk', 'HEAD');
g('symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk');
assert.strictEqual(gather(dir).defaultBranch, 'trunk', 'origin/HEAD wins');

// risky files, and the scratch files are cleared for a fresh Write
for (const f of ['.env', 'config/.env.local', 'certs/server.pem', '.ssh/id_ed25519']) assert.ok(RISKY.test(f), f);
for (const f of ['id_utils.js', 'environment.ts', 'docs/pem.md']) assert.ok(!RISKY.test(f), f);
write('.env', 'SECRET=1\n');
c = gather(dir);
assert.deepStrictEqual(c.risky, ['.env']);
fs.writeFileSync(c.scratch.message, 'stale');
c = gather(dir);
assert.ok(!fs.existsSync(c.scratch.message), 'a stale message file is removed');
assert.ok(!path.resolve(c.scratch.message).startsWith(path.resolve(dir) + path.sep), 'scratch lives outside the work tree, never staged');
fs.rmSync(path.join(dir, '.env'));

// a merge in progress is reported
g('add', '-A'); g('commit', '-q', '-m', 'wip');
g('switch', '-q', '-c', 'side'); write('a.js', 'side\n'); g('commit', '-qam', 'side');
g('switch', '-q', 'master'); write('a.js', 'master\n'); g('commit', '-qam', 'master');
try { g('merge', 'side'); } catch { /* conflict expected */ }
assert.deepStrictEqual(gather(dir).inProgress, ['MERGE_HEAD']);
g('merge', '--abort');

// detached HEAD
g('switch', '-q', '--detach', 'HEAD');
c = gather(dir);
assert.deepStrictEqual([c.detached, c.branch], [true, null]);

const nogit = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-coach-nogit-'));
assert.strictEqual(gather(nogit).error, 'not a git repository');
fs.rmSync(nogit, { recursive: true, force: true });
fs.rmSync(dir, { recursive: true, force: true });
console.log('ship-coach context: all checks passed');
