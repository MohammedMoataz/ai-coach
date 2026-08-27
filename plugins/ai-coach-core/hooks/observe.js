#!/usr/bin/env node
'use strict';
// PostToolUse / PostToolUseFailure (Edit|Write|Bash): deterministic one-line observation row.
// No LLM, no output.
if (process.env.AICOACH_INNER) process.exit(0);

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw || '{}');
    const engine = require('./engine.js');
    const tool = data.tool_name || '';
    const input = data.tool_input || {};
    // <private>...</private> is stripped here, at the boundary, before anything is written.
    // Redacting later would mean the secret was already on disk.
    const scrub = (s) => String(s || '').replace(/<private>[\s\S]*?<\/private>/gi, '[private]');
    // failures are the richest learning signal — mark them so session-end distillation sees them
    // engine.FAIL_PREFIX, not a literal: four readers match this prefix with LIKE, and a copy
    // here would let a rename pass tests while silently emptying every one of them.
    const failed = data.hook_event_name === 'PostToolUseFailure' ? engine.FAIL_PREFIX : '';
    let target = '', digest = '';
    if (tool === 'Bash') {
      digest = failed + scrub(input.command).replace(/\s+/g, ' ').slice(0, 160);
    } else {
      target = scrub(input.file_path);
      digest = failed + tool.toLowerCase() + ' ' + target.split(/[\\/]/).slice(-3).join('/');
    }
    if (digest) {
      engine.useProject(data.cwd); // observations belong to this project's database
      engine.observe(data.session_id, tool, target, digest);
    }
  } catch (err) {
    try { require('./engine.js').log('observe', err); } catch { /* silent */ }
  }
  process.exit(0);
});
