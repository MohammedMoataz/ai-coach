#!/usr/bin/env node
'use strict';
// PreToolUse (Artifact): run the page lint before a publish leaves the machine. Errors become an
// `ask` — the user sees the list in the permission prompt and decides; warnings ride along as
// context for the model. Anything that is not a publish of a readable .html file is ignored, and
// a lint crash never blocks a publish: fail-open, like every hook in this marketplace.
if (process.env.AICOACH_INNER) process.exit(0);

const fs = require('node:fs');
const path = require('node:path');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw || '{}');
    const input = data.tool_input || {};
    const action = input.action || 'publish';
    const file = String(input.file_path || '');
    if (data.tool_name !== 'Artifact' || action !== 'publish' || !/\.html?$/i.test(file)) process.exit(0);
    const abs = path.resolve(String(data.cwd || process.cwd()), file);
    if (!fs.existsSync(abs)) process.exit(0);
    const { check } = require('../scripts/check-artifact.js');
    const r = check(fs.readFileSync(abs, 'utf8'));
    if (!r.errors.length && !r.warnings.length) process.exit(0);
    const lines = [...r.errors.map((e) => 'error: ' + e), ...r.warnings.map((w) => 'warn: ' + w)].join('\n');
    const out = { hookEventName: 'PreToolUse', additionalContext: `design-coach lint for ${path.basename(file)}:\n${lines}` };
    if (r.errors.length) {
      out.permissionDecision = 'ask';
      out.permissionDecisionReason = `design-coach: ${r.errors.length} lint error(s) in ${path.basename(file)} — publish anyway?\n${lines}`;
    }
    console.log(JSON.stringify({ hookSpecificOutput: out }));
  } catch { /* fail open */ }
  process.exit(0);
});
