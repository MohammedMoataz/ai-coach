# The eight dimensions, and the gate that says planning is done

Load once, at the start of the walk. Both halves are used in the same run: the dimensions are what
you ask about, the gate is what you check before you are allowed to emit anything.

The eight are not a questionnaire. They are the eight things a fresh context cannot recover on its
own, ordered so that the expensive answers come while the user is still interested. Nothing here is
invented: they are `/strategy-coach:feature`'s four clarifying questions, `/analysis-coach:elicit`'s
owned-open-questions discipline, and `/prompt-coach:dispatch`'s four rules, collected into the one
place a scope gets shaped.

---

## Half A — the dimensions

Each carries the question to ask, two example answers, and the failure it exists to prevent. **The
examples are the load-bearing part.** A question with no examples gets a one-word answer; a question
that shows two shapes gets an answer in one of those shapes. When the answer is a choice between
concrete options, ask with `AskUserQuestion` and let the examples be the options. When it is not,
ask in prose and show the examples inline.

Draw examples from *this* repo and *this* session wherever you can. A generic example is a hint; an
example naming a file the user recognises is a template.

### 1. Outcome — what changes, for whom

**Ask:** After this ships, what is different, and for whom? In your words, not the feature's name.

*e.g.* "a reviewer stops hand-checking the version numbers before every release"
*e.g.* "new hires stop asking which file owns auth"

**Prevents:** building the thing that was named instead of the thing that was wanted. A feature name
is a label for a solution somebody already picked; the outcome is what lets the executor pick a
better one when the wording runs out.

### 2. Observable finish — how we know it worked

**Ask:** What command, status, value or state says it is done? Push until the answer can be run or
seen.

*e.g.* "`node .github/check-manifests.js` exits 0 with the new rule firing on the fixture"
*e.g.* "the roster shows two people and `ENGINE whoami` reports no missing fields"

**Prevents:** the unfinishable task. This is detector `no-done-criteria` and it is the single most
common gap in the whole corpus. An adjective — "fast", "clean", "robust" — is a preference, and the
gate below rejects it.

### 3. Boundary — what is deliberately out of scope

**Ask:** What must this change *not* touch, even if it looks obviously related?

*e.g.* "no engine change, no schema bump — skills and docs only"
*e.g.* "leave the hooks alone; they were measured last week and I do not want the number moving"

**Prevents:** overeagerness, which is a live failure mode and costs most where nobody is watching.
`"nothing"` is not a boundary — every scope has a neighbour it could grow into, and naming it is
cheaper than reviewing it out later.

### 4. Ground truth — what it touches, and one thing to imitate

**Ask:** Which files or systems does this land in? Name them with `@path`. Is there something in
the repo already shaped the right way?

*e.g.* "`@plugins/prompt-coach/skills/prompt/SKILL.md`, and follow the shape of
`@plugins/prompt-coach/skills/dispatch/SKILL.md`"
*e.g.* "`@hooks/engine.js` around the detector table; the rows above it are the pattern"

**Prevents:** an executor inventing its own conventions. An exemplar is the cheapest constraint
available and the only one that survives being read out of context — it carries the naming, the test
layout and the library choices without a single adjective.

### 5. Already tried and rejected — and why

**Ask:** What has been attempted here before, or considered and dropped? Why?

*e.g.* "tried a new engine detector for this; rejected because it forces a schema bump for a
docs-only change"
*e.g.* "we tried single-sourcing this across plugins — `${CLAUDE_PLUGIN_ROOT}` cannot cross"

**Prevents:** paying twice for the same dead end. This is the highest-value line in any brief and
the one most often missing, because it is the only one that lives nowhere but in someone's head.
Nothing in this repo records it automatically.

### 6. Constraints — what must not change

**Ask:** What has to keep working exactly as it does now? Contracts, data, compatibility, behaviour
under test.

*e.g.* "the detector ids are an ABI — `prompt-stats` reports those strings, so the numbering cannot
move"
*e.g.* "existing databases must open without a migration"

**Prevents:** a correct change that breaks something the executor never knew was load-bearing.
Distinct from the boundary: the boundary says *do not go there*, a constraint says *you may go
there, and this must still hold when you leave*.

### 7. Unknowns, and who owns each

**Ask:** What is genuinely not decided yet? For each one — who decides, and what should the executor
do when it hits it?

*e.g.* "whether the walk should ever write a file — the user decides; until then, do not write"
*e.g.* "the right question cap — me; if three feels wrong mid-run, stop and report, do not adjust"

**Prevents:** a confident wrong build. The normal on-hit instruction is **stop and report, do not
guess**, and an unknown with no owner is not an unknown, it is an argument scheduled for later.
`"none"` is almost never true; if the answer really is none, say why.

### 8. Execution shape — one session or several

**Ask:** Is this one sitting, or does it split? What would a fresh context need handed to it?

*e.g.* "four phases, commit between each — the reference file has to exist before the skill cites it"
*e.g.* "one session; it is three files and they only make sense together"

**Prevents:** a plan that cannot be executed as written. A scope that needs three contexts and says
nothing about ordering gets executed in the wrong order once, and the rework is the whole point of
having planned.

---

## Half B — the gate

> **Planning is done when a fresh session on a cheap model could execute the work unattended and
> stop at a place both of you would call finished.**

That is the definition of done for planning, and every row below is one way of failing it. Print all
of them with a verdict, including the ones that pass — a gate that only shows failures reads as a
list of complaints rather than a state.

| # | Row | FAIL when |
|---|---|---|
| 1 | Every dimension answered | any dimension is blank, or was answered by the model on the user's behalf without an `ASSUMED — <who confirms>` mark |
| 2 | The finish is observable | the answer to dimension 2 is an adjective, or names no command, state or value anyone could check |
| 3 | The boundary is non-empty | dimension 3 is missing, or the answer is "nothing" / "no limits" |
| 4 | Reality is named | dimension 4 produced zero `@path`, or no exemplar to imitate |
| 5 | Unknowns are owned | any unknown lacks an owner or an on-hit instruction |
| 6 | One outcome | the scope still carries an "and also" that was not split into named parts, each with its own finish |
| 7 | The draft survives its own check | `ENGINE prompt-check` on the prompt about to be emitted returns anything other than `clean` or `exempt` |

**A failing gate stops the walk.** Say which rows failed, what each one needs, and who owns it. Do
not emit the prompt — an executable-looking brief built over an unanswered dimension is worse than
no brief, because it will be executed.

Two things the gate deliberately does not check. It does not judge whether the work is *worth
doing* — that is a decision document, and `/strategy-coach:feature` has the cost-and-benefit field
for it. And it does not check that the answers are *right*, only that they exist and are checkable;
the person in the chair is the only one who can rule on right.
