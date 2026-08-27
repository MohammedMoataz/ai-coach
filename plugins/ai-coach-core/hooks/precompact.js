#!/usr/bin/env node
'use strict';
// PreCompact: write down the working state compaction is about to summarize away, so the
// SessionStart that fires straight afterwards can hand it back. Deterministic — rows the engine
// already has, formatted. No model call, no output to the user.
if (process.env.AICOACH_INNER) process.exit(0);

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let engine = null;
  try {
    const data = JSON.parse(raw || '{}');
    engine = require('./engine.js');
    engine.writeSnapshot(data.session_id, data.cwd);
  } catch (err) {
    // Compaction must never be blocked or delayed by this. A missing snapshot costs continuity;
    // a throw here would cost the compaction itself.
    try { (engine || require('./engine.js')).log('precompact', err); } catch { /* silent */ }
  }
  process.exit(0);
});
