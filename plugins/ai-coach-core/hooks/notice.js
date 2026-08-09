#!/usr/bin/env node
'use strict';
// Notification: record that something went wrong, while it is going wrong.
//
// This is the one signal none of the harnesses this was built from ever captured. Everything
// else records what the agent DID; this records the moment the work stopped being right. It is
// deterministic — a word match, no model call, no theory about whose fault it was — because a
// hook that runs on every notification has to be free.
//
// Writes a row and prints nothing. The brief is where it surfaces, one session later.
if (process.env.AICOACH_INNER) process.exit(0);

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let engine = null;
  try {
    const data = JSON.parse(raw || '{}');
    const message = String(data.message || data.notification || '').trim();
    if (!message) process.exit(0);

    engine = require('./engine.js');
    if (!engine.optOn('coach', 'on')) process.exit(0);
    engine.useProject(data.cwd);

    const signal = engine.correctionSignal(message);
    if (!signal) process.exit(0); // most notifications are not failures; say nothing

    engine.sessionStart(data.session_id, data.cwd); // no-op when the row exists
    engine.correction(data.session_id, message, signal);
  } catch (err) {
    try { (engine || require('./engine.js')).log('notice', err); } catch { /* silent */ }
  }
  process.exit(0); // a notification hook must never be able to interrupt a session
});
