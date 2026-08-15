#!/usr/bin/env node
'use strict';
// SessionStart (startup|clear): create session row + inject <=4K memory brief.
// Never fails the session; failures go to ~/.ai-coach/log.jsonl.
if (process.env.AICOACH_INNER) process.exit(0); // spawned claude -p children: no recursion, no rows

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// If the user already named this session with /rename, adopt that name instead of
// inventing one. The name is not in the hook payload; it lives in Claude Code's own
// session metadata, whose layout is internal — so this is best-effort and never fatal.
function claudeSessionName(id) {
  try {
    const dir = path.join(os.homedir(), '.claude', 'sessions');
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        if (j && j.sessionId === id && j.name) return String(j.name);
      } catch { /* one unreadable file must not stop the scan */ }
    }
  } catch { /* directory absent or the layout changed — fall back to our own name */ }
  return null;
}

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let engine = null;
  try {
    const data = JSON.parse(raw || '{}');
    engine = require('./engine.js');
    engine.bootstrap(); // keep ~/.ai-coach/bin/engine.js current so sibling plugins can call it
    engine.useProject(data.cwd); // resolve which project's database this session belongs to
    const label = engine.sessionStart(data.session_id, data.cwd, claudeSessionName(data.session_id));
    const out = [];
    // a project may span several repos; register the declared members, and note when this
    // repo is working under a project that does not list it
    try {
      const decl = engine.projectDecl(data.cwd);
      for (const r of decl.repos) engine.registerRepo(r);
      const here = engine.active().repo;
      if (decl.name && decl.repos.length && !decl.repos.includes(String(here).toLowerCase())) {
        out.push(`This repo (${here}) is not listed in .ai-coach/project.md for project "${decl.name}" — memory still records it; add it to the list to make the project's shape explicit.`);
      }
    } catch { /* declaration is optional */ }
    const brief = engine.brief(Number(engine.opt('brief_chars', 4000)) || 4000, data.cwd);
    if (brief.trim()) out.push('## AI Coach brief\n' + brief);
    // teammate seed committed in this repo? point at it — deterministic, zero tokens
    try {
      const seed = require('node:path').join(String(data.cwd || process.cwd()), '.ai-coach', 'team-seed.jsonl');
      if (fs.existsSync(seed)) {
        const n = engine.safeRead(seed, 5 * 1024 * 1024).split('\n').filter((l) => l.trim()).length;
        out.push(`Team seed present (.ai-coach/team-seed.jsonl, ${n} entries) — run /handoff import to load teammate memories.`);
      }
    } catch { /* nudge is optional */ }
    // partners: nudge once, until the first /partners run writes the marker (engine partners-seen)
    try {
      if (engine.optOn('partners', 'on') && !fs.existsSync(engine.PARTNERS_SEEN)) {
        out.push('Partner tools worth pairing with this setup — run /harness-coach:partners to review them. (This note disappears after the first run.)');
      }
    } catch { /* nudge is optional */ }
    if (out.length || label) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: out.join('\n\n'),
          // so this session is findable by the same name AI Coach records it under
          ...(label ? { sessionTitle: label } : {}),
        },
      }));
    }
  } catch (err) {
    try { (engine || require('./engine.js')).log('session-start', err); } catch { /* never block a session */ }
  }
  process.exit(0);
});
