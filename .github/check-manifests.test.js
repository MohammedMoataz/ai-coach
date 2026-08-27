#!/usr/bin/env node
'use strict';
// The checker is this repo's lint, and a lint that silently stops checking passes every time.
// Each case below breaks the repo in one specific way, in a throwaway copy, and asserts the
// checker notices — so "manifest check OK" keeps meaning something.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const repo = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-coach-checker-'));

// One copy of the repo per case: cheap enough (a few MB of text) and it means a case can break
// anything at all without the next case inheriting it.
function fixture(name) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of ['.github', 'plugins', '.claude-plugin', 'CHANGELOG.md']) {
    fs.cpSync(path.join(repo, entry), path.join(dir, entry), { recursive: true });
  }
  return dir;
}
function run(dir) {
  const r = spawnSync('node', [path.join(dir, '.github', 'check-manifests.js')],
    { encoding: 'utf8', timeout: 60000 });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
}
const edit = (file, from, to) => {
  const t = fs.readFileSync(file, 'utf8');
  assert.ok(t.includes(from), 'fixture edit found nothing to replace in ' + file + ': ' + from);
  fs.writeFileSync(file, t.replace(from, to));
};

// The repo as it stands must pass, or every case below is meaningless.
{
  const r = run(fixture('clean'));
  assert.ok(r.ok, 'the repo as committed passes its own checker: ' + r.out);
  assert.match(r.out, /manifest check OK/, 'and says so');
}

// Version strings are read from the fixture, never hardcoded here: a test that has to be edited on
// every release is a test people edit without reading, and this one exists to catch release drift.
const versionOf = (dir, plugin) =>
  JSON.parse(fs.readFileSync(path.join(dir, 'plugins', plugin, '.claude-plugin', 'plugin.json'), 'utf8')).version;

// A version that is well-formed on its own but disagrees with the release around it.
{
  const dir = fixture('version-drift');
  const file = path.join(dir, 'plugins', 'ai-coach', '.claude-plugin', 'plugin.json');
  edit(file, '"version": "' + versionOf(dir, 'ai-coach') + '"', '"version": "1.5.9"');
  const r = run(dir);
  assert.ok(!r.ok, 'a bundle version behind the marketplace is caught: ' + r.out);
  assert.match(r.out, /bundle is 1\.5\.9/, 'and named: ' + r.out);
}

// A dependency floor above what the marketplace ships can never be satisfied — and the old
// majors-only check could not see it.
{
  const dir = fixture('floor-ahead');
  const file = path.join(dir, 'plugins', 'memory-coach', '.claude-plugin', 'plugin.json');
  const core = versionOf(dir, 'ai-coach-core');
  edit(file, '"version": "^' + core + '"', '"version": "^' + core.split('.')[0] + '.99.9"');
  const r = run(dir);
  assert.ok(!r.ok, 'an unsatisfiable floor is caught: ' + r.out);
  assert.match(r.out, /ahead of/, 'and explained: ' + r.out);
}

// A skill that calls an engine verb the CLI does not dispatch: the cross-plugin ABI break that
// used to reach users as a usage line where an answer should have been.
{
  const dir = fixture('bad-verb');
  edit(path.join(dir, 'plugins', 'memory-coach', 'skills', 'recall', 'SKILL.md'),
    'ENGINE search', 'ENGINE serch');
  const r = run(dir);
  assert.ok(!r.ok, 'a typo in an engine verb is caught: ' + r.out);
  assert.match(r.out, /ENGINE serch/, 'and quoted: ' + r.out);
}

// A description with no trigger phrasing is a skill nothing routes to.
{
  const dir = fixture('no-trigger');
  const file = path.join(dir, 'plugins', 'security-coach', 'skills', 'scan', 'SKILL.md');
  const t = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, t.replace(/^description:.*$/m, 'description: A scanner.'));
  const r = run(dir);
  assert.ok(!r.ok, 'a description with no trigger is caught: ' + r.out);
  assert.match(r.out, /names no trigger/, 'and says why: ' + r.out);
}

// A reference to a skill that no longer exists — the exact breakage a merge or rename leaves
// behind, in prose no other check reads.
{
  const dir = fixture('dangling-ref');
  edit(path.join(dir, 'plugins', 'harness-coach', 'skills', 'partners', 'SKILL.md'),
    '/memory-coach:recall --health', '/memory-coach:doctor');
  const r = run(dir);
  assert.ok(!r.ok, 'a reference to a retired skill is caught: ' + r.out);
  assert.match(r.out, /memory-coach:doctor/, 'and named: ' + r.out);
}

// …but a sentence ABOUT a retired skill is documentation, and must not fail the build.
{
  const dir = fixture('historical-ref');
  const file = path.join(dir, 'plugins', 'harness-coach', 'skills', 'partners', 'SKILL.md');
  fs.appendFileSync(file, '\nThis check was /memory-coach:doctor before v1.6.0.\n');
  const r = run(dir);
  assert.ok(r.ok, 'a historical mention is not a dangling link: ' + r.out);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('check-manifests.test.js: ALL PASS');
