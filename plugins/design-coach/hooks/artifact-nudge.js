#!/usr/bin/env node
'use strict';
// PostToolUse (Skill): when one of Claude Code's native artifact skills has just loaded, remind
// the model that this marketplace layers design-coach:artifact-style on top of it. One line, no
// state, no engine — a sibling plugin's files are unreachable from here anyway. The pattern is
// anchored so our own skill (design-coach:artifact-style) never re-triggers it. Fails open.
if (process.env.AICOACH_INNER) process.exit(0);

const NATIVE = /^(artifact-design|artifact-diagramming|dataviz|design)$/;

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw || '{}');
    const skill = String((data.tool_input || {}).skill || '').replace(/^\//, '').trim();
    if (data.tool_name === 'Skill' && NATIVE.test(skill)) {
      console.log(JSON.stringify({ hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `design-coach: this marketplace layers checkable page rules on top of ${skill} — `
          + 'load design-coach:artifact-style via the Skill tool before writing the page, and run its lint before publishing.',
      } }));
    }
  } catch { /* fail open */ }
  process.exit(0);
});
