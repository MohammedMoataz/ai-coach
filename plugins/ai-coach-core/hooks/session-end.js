#!/usr/bin/env node
'use strict';
// SessionEnd: close the session row + ONE Haiku call compressing the session's last
// observations into a one-line summary and 0-3 durable learnings.
// Opt-out: AICOACH_LEARN=off. AICOACH_INNER guards against claude -p recursion.
if (process.env.AICOACH_INNER) process.exit(0);

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let engine = null;
  try {
    const data = JSON.parse(raw || '{}');
    engine = require('./engine.js');
    engine.useProject(data.cwd);
    const id = data.session_id;
    if (!id) process.exit(0);

    // A session can be renamed at any point after it starts, and the name is half of every
    // debrief key — so the last chance to notice is here, before the row closes and gets exported.
    try {
      const cn = engine.claudeSessionName(id);
      if (cn && cn.name) engine.adoptName(id, cn.name, cn.source);
    } catch { /* the name we already have stands */ }

    const act = engine.sessionActivity(id, 40); // LAST 40 — the conclusion is where learnings live
    const first = (act.session && act.session.first_prompt) || '';
    const obsLines = act.observations.map((o) => '- ' + (o.digest || o.target)).join('\n');
    // Close the row first so a killed hook still leaves a timestamped session.
    // Deliberately NO summary here: the old fallback was first_prompt.slice(0, 200), and `summary`
    // is exported into a git-committed seed — so every failed model call shipped raw prompt text to
    // the whole team. With no summary the row still gets its `ended` stamp, and the local brief
    // falls back to first_prompt, which never leaves this machine.
    // The shared conclusion is a debrief, published on purpose: /memory-coach:debrief.
    engine.sessionEnd(id, null);

    if (engine.optOn('learn', 'on') && (first || act.observations.length >= 3)) {
      const out = haikuCompress(engine, first, obsLines);
      if (out.summary) engine.sessionEnd(id, out.summary); // upgrade fallback to a real summary
      for (const l of out.learnings) {
        // dedup: repeated sessions rediscovering the same lesson must not pile up rows
        if (l && l.text && !engine.hasText(l.text)) {
          // stamped 'distilled': a model compressed this out of a transcript, and it must
          // never be able to read as something a person decided. Nothing promotes it later.
          // data.cwd, not engine.project(data.cwd): add() documents its 4th argument as a WORKING
          // DIRECTORY and resolves identity from it. Handing it a project key made it path.resolve
          // a name that is not a path, walk 64 levels up from it looking for a .git, and cache the
          // answer under a key nothing else uses. It landed on the right project by accident.
          engine.add('learning', l.text, clamp(l.confidence), data.cwd, id,
            { provenance: 'distilled' });
        }
      }
    }
    engine.pruneObservations(); // observations are session fuel, not knowledge
    // …and a distilled memory nobody has ever recalled, 90 days on, is a guess that outlived its
    // session. Nothing a person wrote and nothing imported is touched — see pruneStale().
    engine.pruneStale();
    // No automatic export. A seed is published deliberately with /memory-coach:handoff — the same
    // rule a debrief follows. Exporting on every session end meant knowledge left the machine
    // before anyone had decided it was worth sharing, and it is what shipped the prompt-text leak.
  } catch (err) {
    try { (engine || require('./engine.js')).log('session-end', err); } catch { /* silent */ }
  }
  process.exit(0);
});

function clamp(c) { const n = Number(c); return Number.isFinite(n) ? Math.min(0.95, Math.max(0.3, n)) : 0.6; }

function haikuCompress(engine, firstPrompt, obsLines) {
  const none = { summary: null, learnings: [] };
  try {
    const instructions =
      'Compress this coding session. Output ONLY one JSON object: ' +
      '{"summary":"one line, max 120 chars, what was accomplished","learnings":[{"text":"one-sentence durable learning","confidence":0.5}]} ' +
      'with 0-3 learnings. Durable = useful in FUTURE sessions (environment quirks, decisions made, ' +
      'gotchas discovered). NOT task narration. Empty learnings array if nothing durable.\n\n' +
      'First prompt: ' + firstPrompt + '\nActions:\n' + obsLines;
    // Backoff and logging live in the engine, scoped to 'session-end': a distillation that times
    // out on a long session must not also disable plan review for the next hour.
    const r = engine.claudeRun('session-end', instructions, 45000);
    if (!r.ok) return none;
    const m = r.stdout.match(/\{[\s\S]*\}/);
    if (!m) return none;
    const parsed = JSON.parse(m[0]);
    return {
      summary: parsed.summary ? String(parsed.summary).slice(0, 200) : null,
      learnings: Array.isArray(parsed.learnings) ? parsed.learnings.slice(0, 3) : [],
    };
  } catch (err) {
    engine.log('session-end.haiku', err);
    return none;
  }
}
