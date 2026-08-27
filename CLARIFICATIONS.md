# AI Coach audit 2026-08-27 — clarification questions

Full plan: `C:\Users\dell\.claude\plans\scan-the-current-ai-coach-serene-aho.md`
(findings appendix included there). Each question has a default so work can proceed;
answer inline or just say "all defaults".

**Q1 — market's home.** It spawns atlas's agents, shares no file/reader with its strategy
siblings, and `--industry/--gap` is effectively a second skill wearing its name.
- (a) Move to atlas-coach **(recommended)**

**Q2 — harness-coach.** One skill, ~72 always-on tokens, state lives in core.
- (a) Keep standalone **(recommended — Phase D's `context` skill gives it a second resident)**

**Q3 — `analyze translate`.** In-repo code generation inside the research plugin.
- (a) Keep, sharper fence + "Do NOT use for" exclusion **(recommended)**

**Q4 — `coach: off` semantics.** Today it silently stops recording prompt signals, contradicting
its own "Display only" documentation.
- (a) Fix the code — record signals regardless of display **(recommended — matches README's own
  "silencing a display line should not empty the evidence" principle)**

**Q5 — Phase 2 merge list still as approved?** (vault→blueprint, doctor→recall --health,
project+team→recall, study→onboard, analyze drops verify, market thinned.)
Default: proceed as approved. Note: the doctor merge also fixes doctor doing judgment work
on a haiku pin.

**Q6 — `auto-seed` + `seed_auto`.** Dead since v1.1.0; CLI verb, setting, plugin.json entry and
README row all survive it.
- (a) Remove all four **(recommended)**

**Q7 — Combo commands for Phase B.**
- (a) `audit --triage` chain flag
- (b) investigation full-tour (onboard, then map+study)
- (c) corpus-doctor reindex rule in `analyze stats` (this repo has 218 orphan chunks right now)
Default: all three — each is one flag/rule, no new skill.

**Q8 — New config knobs.** Default: only two — observation retention days and `AICOACH_MODEL`
escape hatch. Everything else stays hardcoded but single-sourced. Veto or extend.

**Q9 — Review-artifact chapter timing.**
- (a) When v1.5.1 ships **(recommended — the doc is release-framed)**
