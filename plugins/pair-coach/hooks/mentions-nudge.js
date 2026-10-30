#!/usr/bin/env node
'use strict';
// UserPromptSubmit: when the developer's own uncommitted lines hold an open @coach thread, say so in
// one line of context so this turn can pick it up. Reads only lines the developer added — a mention
// someone else committed is never surfaced here (see mentions.js added). Never blocks; fails open.
if (process.env.AICOACH_INNER) process.exit(0);

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw || '{}');
    const open = require('../scripts/mentions.js').added(data.cwd || process.cwd());
    if (open.length) {
      const where = open.slice(0, 5).map((t) => `${t.file}:${t.line}`).join(', ')
        + (open.length > 5 ? `, and ${open.length - 5} more` : '');
      console.log(JSON.stringify({ hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `pair-coach: ${open.length} open @coach thread${open.length > 1 ? 's' : ''} in your changes: ${where}. `
          + 'Handle them with pair-coach:mentions after the user\'s request, unless the user says otherwise.',
      } }));
    }
  } catch { /* fail open */ }
  process.exit(0);
});
