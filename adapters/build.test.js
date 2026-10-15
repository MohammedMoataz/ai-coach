#!/usr/bin/env node
'use strict';
// The compiler, run against a throwaway repo of fixture skills shaped the way YAML allows a
// description to be written — folded, literal, quoted — because the real 26 happen to be plain
// one-liners and so cannot catch a parser that only understands plain one-liners.
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// C:'s temp may be full or absent; keep everything on this repo's own drive.
const tmp = path.join(__dirname, '.test-tmp-build');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(path.join(tmp, 'adapters'), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'build.js'), path.join(tmp, 'adapters', 'build.js'));

const skill = (name, frontmatter, body) => {
  const dir = path.join(tmp, 'plugins', 'demo-coach', 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${body}\n`);
};
skill('folded', 'description: >\n  Folded across\n  two lines. Use when folding.\nargument-hint: "[a draft]"', 'Body.');
skill('literal', 'description: |-\n  Literal block.\n  Use when keeping lines.', 'Body.');
skill('quoted', 'description: "Quoted: has a colon, and a \\"quote\\". Use when quoting."', 'Body.');
skill('single', "description: 'It''s single-quoted. Use when quoting.'", 'Body.');
skill('plain', 'description: Plain one-liner. Use when nothing is special.',
  'Lint: `node "${CLAUDE_PLUGIN_ROOT}/scripts/check.js"`. Probe: run `scripts/probe.js`.\n'
  + 'Load `references/rules.md`.');

const r = spawnSync(process.execPath, [path.join(tmp, 'adapters', 'build.js')], { encoding: 'utf8', timeout: 30000 });
assert.strictEqual(r.status, 0, 'build.js runs: ' + r.stdout + r.stderr);

const out = (f) => fs.readFileSync(path.join(tmp, 'adapters', 'out', f), 'utf8');
const mdcDesc = (name) => (out(`cursor/demo-coach--${name}.mdc`).match(/^description: (.*)$/m) || [])[1];

// ---- #50: block scalars and quotes compile to the text they mean, not their YAML spelling ----
assert.strictEqual(mdcDesc('folded'), '"demo-coach: Folded across two lines. Use when folding."',
  'a folded description is joined, not compiled as its ">" indicator');
assert.strictEqual(mdcDesc('literal'), '"demo-coach: Literal block. Use when keeping lines."',
  'a literal block description is read in full');
assert.strictEqual(mdcDesc('quoted'), '"demo-coach: Quoted: has a colon, and a \\"quote\\". Use when quoting."',
  'a double-quoted description loses its quotes once, not escaped twice');
assert.strictEqual(mdcDesc('single'), '"demo-coach: It\'s single-quoted. Use when quoting."',
  'a single-quoted description is unquoted too');
assert.strictEqual(mdcDesc('plain'), '"demo-coach: Plain one-liner. Use when nothing is special."',
  'a plain description is unchanged');

const agents = out('AGENTS.md');
assert.match(agents, /- \*\*folded\*\* — `\[a draft\]`\n {2}Folded across two lines\. Use when folding\.\n/,
  'the AGENTS.md index carries the joined description and the unquoted hint');

// ---- #50: the AGENTS.md header is one HTML comment, opened once and closed once ----
assert.strictEqual(agents.split('<!--').length - 1, 1, 'exactly one comment opener in AGENTS.md');
assert.strictEqual(agents.split('-->').length - 1, 1, 'exactly one comment closer in AGENTS.md');
assert.ok(agents.indexOf('<!--') < agents.indexOf('-->'), 'and it opens before it closes');

// ---- #48: a bare scripts/ path resolves like a bare references/ path, into the clone ----
const plain = out('cursor/demo-coach--plain.mdc');
assert.ok(plain.includes('`$AICOACH_REPO/plugins/demo-coach/skills/plain/scripts/probe.js`'),
  'a bare scripts/ path is made absolute: ' + plain);
assert.ok(plain.includes('`$AICOACH_REPO/plugins/demo-coach/skills/plain/references/rules.md`'),
  'references/ still is');
assert.ok(plain.includes('"$AICOACH_REPO/plugins/demo-coach/scripts/check.js"'),
  'and a ${CLAUDE_PLUGIN_ROOT}/scripts/ path is not rewritten twice');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('build.test.js: ALL PASS');
