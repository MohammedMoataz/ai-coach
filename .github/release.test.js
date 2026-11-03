#!/usr/bin/env node
'use strict';
const assert = require('node:assert');
const { parse } = require('./release.js');

const changelog = `# Changelog

## v1.3.0 — \`@coach\`, not \`@claude\` (2026-10-31)

**pair-coach 1.1.0 · ai-coach 1.3.0**

Body line.

## v1.2.0 — Older (2026-10-01)

**core 1.0.0**

Old body.
`;

const r = parse(changelog, '1.3.0');
assert.strictEqual(r.title, '`@coach`, not `@claude`');
assert.deepStrictEqual(r.tags, ['pair-coach--v1.1.0', 'ai-coach--v1.3.0']);
assert.strictEqual(r.notes, '**pair-coach 1.1.0 · ai-coach 1.3.0**\n\nBody line.\n');
// a ship line without the bundle still yields the release's own tag
assert.deepStrictEqual(parse(changelog, '1.2.0').tags, ['core--v1.0.0', 'ai-coach--v1.2.0']);
assert.throws(() => parse(changelog, '9.9.9'), /no section for v9\.9\.9/);
console.log('release.test.js: ok');
