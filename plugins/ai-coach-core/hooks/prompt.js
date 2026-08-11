#!/usr/bin/env node
'use strict';
// UserPromptSubmit: session bookkeeping (resumed sessions get no SessionStart, so the row is
// ensured here + first prompt recorded), and the prompt coach.
//
// Two things happen to every prompt, and they must not be confused:
//   1. It is EVALUATED by deterministic detectors that live in the engine, and the result — the
//      signal ids only, never the text — is RECORDED. That record is what later lets the coach
//      say "prompts shaped like this one cost you time", instead of just asserting it.
//   2. At most two hints are SHOWN, and only to the human, via `systemMessage`. The model must
//      never receive a critique of the prompt alongside the prompt, or answers drift into
//      meta-commentary about the question instead of answering it.
//
// A question or an exploratory prompt is exempt from (1)'s hints entirely — the official guidance
// blesses "what would you improve in this file?" as a legitimate way to work. Coaching that is how
// a coach earns being switched off.
if (process.env.AICOACH_INNER) process.exit(0);

const fs = require('node:fs');
const path = require('node:path');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let engine = null;
  try {
    const data = JSON.parse(raw || '{}');
    engine = require('./engine.js');
    engine.useProject(data.cwd);
    engine.sessionStart(data.session_id, data.cwd); // no-op when the row exists
    const prompt = String(data.prompt || '').trim();
    engine.firstPrompt(data.session_id, prompt);

    if (!engine.optOn('coach', 'on')) process.exit(0);
    if (prompt.length < 25 || prompt.startsWith('/') || prompt.startsWith('!')) process.exit(0);

    const verdict = engine.evaluatePrompt(prompt, 2);

    // Record before deciding whether to speak. An exempt prompt and a clean prompt are both
    // useful data: without them there is no baseline to measure a weak prompt against.
    try {
      engine.promptSignal(data.session_id, prompt.length,
        verdict.exempt ? ['exempt'] : verdict.flags,
        verdict.hints.length ? 1 : 0);
    } catch (err) { engine.log('prompt.signal', err); }

    if (verdict.exempt) process.exit(0);

    const notes = verdict.hints.slice();
    const planMode = (data.permission_mode || data.permissionMode) === 'plan';
    if (planMode && engine.optOn('plan_review', 'on')) {
      const review = haikuReview(engine, prompt);
      if (review) notes.push(review);
    }
    if (notes.length) console.log(JSON.stringify({ systemMessage: '[coach] ' + notes.join(' | ') }));
  } catch (err) {
    try { (engine || require('./engine.js')).log('prompt', err); } catch { /* silent */ }
  }
  process.exit(0);
});

// The judge is taught by two contrasting worked examples and a fixed output contract, rather than
// by a list of rules. A rule list invites the model to recite the rules back; examples show it what
// a verdict looks like. `hypothesis` is required so a suggestion has to say why it should help —
// an unfalsifiable "this is better" is not advice.
const JUDGE = `You review one prompt written for an AI coding agent. Reply with ONLY minified JSON:
{"score":<1-10>,"reason":"<one sentence>","rewrite":"<improved prompt, or empty if score>=8>","hypothesis":"<why the rewrite should work better, or empty>"}

Example A
PROMPT: fix the login bug
{"score":3,"reason":"No file, no symptom, and no way to tell when it is fixed.","rewrite":"@src/auth/login.ts throws 'session undefined' after a password reset. Repro: reset, then sign in. Find the root cause rather than guarding the symptom, and prove it with npm test -- auth.","hypothesis":"Naming the file and the exact error removes the search step, and stating the repro plus the test gives a check both sides can agree on."}

Example B
PROMPT: In @src/orders/total.ts, rounding is half-even but finance needs half-up. Change it and keep the existing tests green; do not touch the tax code.
{"score":9,"reason":"Location, expected behaviour, verification and an out-of-scope boundary are all present.","rewrite":"","hypothesis":""}

Now review:
PROMPT: `;

function haikuReview(engine, prompt) {
  const cooldown = path.join(path.dirname(engine.DB_PATH), 'coach-cooldown');
  try {
    // a wedged CLI must not tax every plan-mode prompt: after one failure, skip for 1h
    try { if (Date.now() - fs.statSync(cooldown).mtimeMs < 3600000) return null; } catch { /* none */ }
    // strip anything the user marked private before it leaves for another process
    const safe = prompt.replace(/<private>[\s\S]*?<\/private>/gi, '[private]').slice(0, 2000);
    const { spawnSync } = require('node:child_process');
    const r = spawnSync(process.env.AICOACH_CLAUDE_BIN || 'claude', ['-p', '--model', 'claude-haiku-4-5'], {
      input: JUDGE + safe,
      encoding: 'utf8',
      timeout: 12000, // inside the hook's 20s budget, with margin
      shell: true,
      env: { ...process.env, AICOACH_INNER: '1' },
    });
    if (r.status !== 0 || !r.stdout || !r.stdout.trim()) {
      fs.writeFileSync(cooldown, new Date().toISOString());
      engine.log('coach.haiku', 'claude -p failed: status=' + r.status + ' stderr=' + String(r.stderr || '').slice(0, 300));
      return null;
    }
    return format(r.stdout);
  } catch (err) {
    try { fs.writeFileSync(cooldown, new Date().toISOString()); } catch { /* best effort */ }
    engine.log('coach.haiku', err);
    return null;
  }
}

// A judge that returns prose instead of JSON is still useful — show it rather than dropping it.
function format(stdout) {
  const text = String(stdout).trim();
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : text);
    if (!j || typeof j.score === 'undefined') return text.slice(0, 700);
    let out = `prompt ${j.score}/10 — ${j.reason || ''}`.trim();
    if (j.rewrite) out += `\ntry: ${j.rewrite}`;
    if (j.hypothesis) out += `\nwhy: ${j.hypothesis}`;
    return out.slice(0, 900);
  } catch {
    return text.slice(0, 700);
  }
}
