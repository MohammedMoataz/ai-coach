# The prompt rules, with sources and dates

Every rule here is a bet on how the current models behave. Bets go stale — Anthropic's own harness
guidance says to strip scaffolding as models improve, and that applies to prompting advice too.
So each rule carries the date it was verified and where it came from. When a rule stops paying,
retire it; do not accrete.

Sources referenced below:
- **PBP** — platform.claude.com, *Prompting best practices* (read 2026-08-12)
- **CCB** — code.claude.com, *Best practices for Claude Code* (read 2026-08-12)
- **PM** — getmaxim.ai, *Best practices for prompt management* (read 2026-08-12)
- **HD** — anthropic.com/engineering, *Harness design for long-running application development*

---

## Detected automatically

These have a deterministic detector in `ai-coach-core`. The signal id is what shows up in
`/prompt-coach:prompt-stats`.

### 1. Name the file, not "this file" · `deictic-no-path` · 2026-08
The agent cannot see your cursor or your open tab. Reference with `@path`.
*Source: baseline, retained.*

### 2. An action verb needs a target · `action-no-ref` · 2026-08
"fix the login bug" gives nothing to start from. Name the file and the symptom.
*Source: baseline, retained.*

### 3. Say what done looks like · `no-done-criteria` · 2026-08
A build/create/add ask with no test, behavior or acceptance line has no agreed finish.
*Source: baseline, retained. Note the softening in rule 12 below.*

### 4. One outcome per prompt · `multi-ask` · 2026-08
Long asks stitched with "and also" get partially done. Split them, or use plan mode.
*Source: baseline + CCB "The kitchen sink session".*

### 5. Imperative, not hedged · `hedged-opener` · 2026-08
PBP is explicit: *"Can you suggest changes"* produces suggestions; *"Change this function"*
produces edits. If you want the edit, ask for the edit.
*Source: PBP, "Tool usage".*

### 6. Say what to do, not only what to avoid · `negative-only` · 2026-08
PBP: *"tell Claude what to do instead of what not to do."* A prompt made only of prohibitions
leaves the actual target unstated.
*Source: PBP, "Control the format of responses".*

### 7. Long input first, the ask last · `paste-after-ask` · 2026-08
PBP reports up to a 30% quality gain on long-context prompts from putting the document at the top
and the question at the bottom.
*Source: PBP, "Long context prompting".*

### 8. Do not stack emphasis · `caps-emphasis` · 2026-08
**This one reversed.** CCB still suggests "IMPORTANT"/"YOU MUST" in CLAUDE.md, but PBP says the
current models **overtrigger** on that language and advises dialling it back. Three or more
emphasis markers in one prompt now reads as noise.
*Source: PBP, "Migration considerations". Conflicts with CCB — PBP is the newer guidance.*

### 9. State what is out of scope · `no-scope-clause` · 2026-08
PBP names "Overeagerness" as a live failure mode: scope creep, defensive coding, unrequested
abstractions. A boundary line prevents most of it.
*Source: PBP, "Overeagerness"; CCB spec guidance ("states what is out of scope").*

---

## Not detectable, still true

No regex can judge these. They live in the review path and in the templates.

### 10. Ask for evidence, not a claim
CCB: *"Have Claude show evidence rather than asserting success."* The named failure is the
"trust-then-verify gap" — accepting "done" without the passing output.
There is a ladder of strength: criteria in the prompt → a `/goal` condition → a Stop hook →
a reviewer subagent. Reach up it as the cost of being wrong rises.
*Source: CCB, "Give Claude a way to verify its work".*

### 11. Point at an example already in the repo
CCB suggests naming an exemplar file and constraining to existing libraries. Concrete beats
adjectival: "follow `@src/orders/list.ts`" carries more than "write it cleanly".
*Source: CCB, "Reference existing patterns".*

### 12. Do not over-instruct verification — this rule is softening
PBP states Opus 5 *"verifies its own work well without explicit instruction"*, and that carried-over
verification boilerplate now causes **over**-verification. Rule 3 still holds for stating the
acceptance criterion; what to drop is the ritual "and make sure you double-check everything".
*Source: PBP, "Overthinking and excessive thoroughness". **Model-dependent — recheck each release.***

### 13. Vague is allowed when you are exploring
CCB: *"Vague prompts can be useful when you're exploring… A prompt like 'what would you improve in
this file?' can surface things you wouldn't have thought to ask about."*
This is why the coach exempts question-form prompts entirely. Do not let anyone "fix" that.
*Source: CCB, "Ask codebase questions".*

### 14. Plan first — but not always
CCB: *"If you could describe the diff in one sentence, skip the plan."* Plan mode has overhead.
*Source: CCB, "Explore first, then plan, then code".*

### 15. Two failed corrections → `/clear`
CCB states this almost verbatim: after two failed corrections, clear and write a better initial
prompt. Arguing with a confused thread is the most expensive move available.
*Source: CCB, "Course-correct early and often". Confirms the baseline rule.*

### 16. Delegate broad investigation — with restraint
Still right, but PBP warns models *"may spawn subagents where a direct grep call is faster."*
Delegate breadth, not every lookup.
*Source: PBP, "Subagent orchestration".*

### 17. Say why
Intent generalises where the letter of the ask is ambiguous.
*Source: PBP, "Add context to improve performance".*

### 18. Examples: 3–5, diverse, tagged
If you are steering format or style, show three to five examples covering edge cases, wrapped in
`<example>` tags. One example teaches the wrong lesson.
*Source: PBP, "Use examples effectively".*

### 19. The golden rule
PBP: *"Show your prompt to a colleague with minimal context… If they'd be confused, Claude will be
too."* The most useful single test, and the one you can apply without any tooling.
*Source: PBP, "Be clear and direct".*

### 20. Interview me → spec → fresh session
For a large feature, let Claude ask you questions, have it write a self-contained spec, then start
a fresh session from the spec. This is HD's handoff-artifact principle applied to a single feature:
the artifact carries the state, the fresh context does the work.
*Source: CCB, "Let Claude interview you"; HD, context resets.*

### 21. Ask before irreversible actions
Anything destructive — dropped tables, force pushes, deletions — gets an explicit confirmation step
in the prompt.
*Source: PBP, "Balancing autonomy and safety".*

### 22. Scope the investigation
CCB names "The infinite exploration" as a failure pattern: an unbounded "look into X" eats the
context window and returns little. Bound it — which directories, how deep, what would end it.
*Source: CCB, "Avoid common failure patterns".*

---

## The lifecycle view, deliberately not built

PM argues prompts are software artifacts: a registry decoupled from code, versioning with rollback,
a golden evaluation dataset instead of spot checks, side-by-side comparison, drift monitoring.

Two of those landed here in a modest form: the detector fixture set in `engine.test.js` **is** a
golden dataset — for the detectors, which have ground truth, rather than for model output, which
does not. And `/prompt-coach:prompt-stats` is the drift check.

A shared prompt registry is deliberately **not** built. promptfoo — a mature eval product — refuses
one too: prompts are files, git is the store. Revisit only if a team actually asks to share prompts,
not because an article said to.
