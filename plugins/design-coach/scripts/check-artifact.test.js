#!/usr/bin/env node
'use strict';
// The one check that fails if the lint or the hooks break: the shipped skeleton passes; taking
// away each thing the skill promises makes it fail; the nudge fires for a native skill and not
// for our own; the publish hook asks on a failing page and stays silent on a passing one.
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { check, contrast } = require('./check-artifact.js');

const root = path.join(__dirname, '..');
const skeleton = fs.readFileSync(path.join(root, 'skills/artifact-style/references/skeleton.html'), 'utf8');
const errorsOf = (html) => check(html).errors.join('\n');

// the skeleton is the self-check
let r = check(skeleton);
assert.deepStrictEqual(r.errors, [], 'skeleton has no errors:\n' + r.errors.join('\n'));
assert.deepStrictEqual(r.warnings, [], 'skeleton has no warnings:\n' + r.warnings.join('\n'));
assert.ok(r.info.length >= 12, 'contrast computed for both themes');

// each promise, removed, is caught
assert.match(errorsOf(skeleton.replace('class="zoomable"', 'class="figure"')), /not inside a figure\.zoomable/);
assert.match(errorsOf(skeleton.replace(/:root\[data-theme="dark"\]/, ':root.never')), /data-theme="dark"/);
assert.match(errorsOf(skeleton.replace(/@media \(prefers-color-scheme: dark\)/, '@media (min-width: 1px)')), /prefers-color-scheme/);
assert.match(errorsOf(skeleton.replace('--text: #073b4f;', '--text: #86cfc3;')), /--text .* below 4\.5:1/);
assert.match(errorsOf(skeleton.replace('background: var(--bg);', 'background: #fff;')), /body background is not a var/);
assert.match(errorsOf(skeleton.replace(/Arial, sans-serif;/, 'Arial;')), /does not end in a generic family/);
assert.match(errorsOf(skeleton.replace('fonts.googleapis.com/css2', 'fonts.example.com/css2')), /host not allowed/);
assert.match(errorsOf(skeleton.replace('<title>Page Name</title>', '')), /no <title>/);
assert.match(errorsOf('<!doctype html><html>' + skeleton), /<!doctype> present/);
assert.match(errorsOf(skeleton.replace('<defs>', '<style>.x{}</style><defs>')), /<style> inside an <svg>/);
assert.match(errorsOf(skeleton + '<svg viewBox="0 0 640 200" role="img" aria-label="loose"></svg>'), /svg "loose" is not inside a figure\.zoomable/);
// toolbar icons are 16px svgs without role="img" — never mistaken for diagrams
assert.strictEqual(check(skeleton).errors.filter((e) => /offset/.test(e)).length, 0);
// a mermaid block outside the wrapper is the same error
assert.match(errorsOf(skeleton + '<pre class="mermaid">flowchart LR</pre>'), /mermaid block .* not inside/);
// the one dark block that drifts from the other
assert.match(errorsOf(skeleton.replace('--accent-2-ink: #041f2b;\n  }\n}', '--accent-2-ink: #041f2b; --extra: #fff;\n  }\n}')), /different token names/);
// warnings
assert.match(check(skeleton.replace(/\.trunc \{[^}]*min-width: 0;/, '.trunc { white-space: nowrap; overflow: hidden; text-overflow: ellipsis;').replace(/\.row > \*, \.grid > \* \{ min-width: 0; \}/, '')).warnings.join('\n'), /min-width: 0/);
assert.match(check(skeleton.replace('<div class="tablewrap">', '<div>')).warnings.join('\n'), /no scrolling ancestor/);
assert.match(check(skeleton.replace('<td>api</td>', '<td><span class="kpi">9</span></td>')).warnings.join('\n'), /inside a table cell/);

// contrast maths against the WCAG worked examples
assert.strictEqual(contrast('#000', '#fff').toFixed(0), '21');
assert.strictEqual(contrast('#777777', '#ffffff').toFixed(2), '4.48');

// hooks, run as Claude Code runs them
const run = (file, input) => spawnSync('node', [path.join(root, 'hooks', file)], { input: JSON.stringify(input), encoding: 'utf8', timeout: 20000 });
r = run('artifact-nudge.js', { tool_name: 'Skill', tool_input: { skill: 'artifact-design' } });
assert.strictEqual(r.status, 0);
assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /design-coach:artifact-style/);
r = run('artifact-nudge.js', { tool_name: 'Skill', tool_input: { skill: 'design-coach:artifact-style' } });
assert.strictEqual(r.status, 0);
assert.strictEqual(r.stdout.trim(), '', 'our own skill never re-triggers the nudge');
r = run('artifact-nudge.js', { tool_name: 'Read', tool_input: { file_path: 'x' } });
assert.strictEqual(r.stdout.trim(), '', 'other tools are ignored');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'design-coach-'));
const good = path.join(tmp, 'good.html'), bad = path.join(tmp, 'bad.html');
fs.writeFileSync(good, skeleton);
fs.writeFileSync(bad, skeleton.replace('class="zoomable"', 'class="figure"'));
r = run('artifact-lint.js', { tool_name: 'Artifact', cwd: tmp, tool_input: { file_path: good } });
assert.strictEqual(r.status, 0);
assert.strictEqual(r.stdout.trim(), '', 'a passing page publishes silently');
r = run('artifact-lint.js', { tool_name: 'Artifact', cwd: tmp, tool_input: { file_path: 'bad.html' } });
assert.strictEqual(r.status, 0);
const out = JSON.parse(r.stdout).hookSpecificOutput;
assert.strictEqual(out.permissionDecision, 'ask');
assert.match(out.permissionDecisionReason, /not inside a figure\.zoomable/);
r = run('artifact-lint.js', { tool_name: 'Artifact', cwd: tmp, tool_input: { action: 'read', url: 'https://claude.ai/x' } });
assert.strictEqual(r.stdout.trim(), '', 'non-publish actions are ignored');
r = run('artifact-lint.js', { tool_name: 'Artifact', cwd: tmp, tool_input: { file_path: 'missing.html' } });
assert.strictEqual(r.status, 0, 'a missing file fails open');

console.log('check-artifact.test: ok');
