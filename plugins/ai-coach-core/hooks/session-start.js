#!/usr/bin/env node
'use strict';
// SessionStart (startup|clear|resume|compact): create session row + inject the memory brief.
// Never fails the session; failures go to ~/.ai-coach/log.jsonl.
if (process.env.AICOACH_INNER) process.exit(0); // spawned claude -p children: no recursion, no rows

const fs = require('node:fs');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let engine = null;
  try {
    const data = JSON.parse(raw || '{}');
    engine = require('./engine.js');
    engine.bootstrap(); // keep ~/.ai-coach/bin/engine.js current so sibling plugins can call it
    // A hook is one of the only processes Claude Code passes plugin settings to. Write down what
    // this one can see, so the copy of the engine every skill shells out to can honour the same
    // settings instead of silently falling back to the defaults.
    engine.saveSettings();
    engine.useProject(data.cwd); // resolve which project's database this session belongs to
    const label = engine.sessionStart(data.session_id, data.cwd, engine.claudeSessionName(data.session_id));
    const out = [];
    // The branch convention, said once and only when it is broken. `task` is the branch, and the
    // branch is what makes a memory findable next month — a note filed under "my-stuff" is not.
    try {
      const b = engine.branchCheck(data.cwd);
      if (b) out.push(b);
    } catch { /* a naming convention is never worth failing a session over */ }
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
    // Compaction re-fires SessionStart, and a full brief there is paid again on every compact —
    // repeatedly, in the one session that has already proven it runs long. But dropping the brief
    // outright loses exactly the context compaction just summarized away. So compaction gets a
    // quarter-size brief: the top-ranked lines survive, the bill does not repeat in full.
    const compacted = String(data.source || '') === 'compact';
    const cap = engine.briefChars(); // the setting, clamped to the range plugin.json declares
    const brief = engine.brief(compacted ? Math.min(1000, Math.floor(cap / 4)) : cap, data.cwd);
    if (brief.trim()) out.push('## AI Coach brief\n' + brief);
    // After a compaction, hand back the working state PreCompact wrote down. The brief above is
    // memory — durable facts — and deliberately not this: which files this session was in and what
    // broke ten minutes ago is exactly what a summary drops and what the next turn needs.
    // Read-and-delete, so it belongs to this one restart.
    if (compacted) {
      try {
        const snap = engine.takeSnapshot(data.session_id);
        if (snap) out.push(snap);
      } catch { /* continuity is a bonus, never a reason to fail a session start */ }
    }
    // The nudges below are onboarding, not continuity — after a compact they are pure noise.
    if (!compacted) {
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
    }
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
