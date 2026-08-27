---
description: Elicits requirements — stakeholders, the question each one alone can answer, user stories, and acceptance criteria that can be checked. Use for "/elicit", "gather requirements", "write acceptance criteria", "turn this into user stories". Not for specifying an agreed feature (see strategy-coach:feature).
argument-hint: "<what is being asked for> [--stakeholders <roles>] [--quick]"
disable-model-invocation: true
---

# /elicit — the questions before the specification

Requirements do not arrive; they are extracted from people who have not yet had to be precise.
The failure is always the same and always late: everyone agreed, and then disagreed about what
they agreed to, because the agreement was in prose that could be read two ways.

This skill produces the artefacts that cannot be read two ways — a stakeholder list with the
question each of them is the only person who can answer, stories in a fixed form, and acceptance
criteria written as checks. It asks the user a lot; that is the work, not overhead.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

## Steps

1. **Read what is already known before asking anyone anything.** `ENGINE search "<topic>"`, then
   `docs/business/` if `/strategy-coach:blueprint` has run, then the code if the request names a
   part of it. Open by saying what you already found — a stakeholder asked a question the repo
   answers is a stakeholder who stops answering questions.
2. **Name the stakeholders as roles, and what each one alone can answer.** Not a list of people: a
   list of *decisions* and who owns each. The useful shape is one line per role — "billing lead:
   whether a partial refund can exceed the original charge; nobody else can rule on this." A role
   with no unique question does not belong on the list.
3. **Ask.** Group questions by role, hardest first, and prefer questions that have a wrong answer:
   "what happens if it arrives twice" beats "what should the flow look like". Use AskUserQuestion
   when the answer is a choice between two or three concrete options; use prose when it is not.
   Never ask a question whose answer you already have from step 1.
   `--quick` limits this to the five questions that would change the design most.
4. **Write stories in one fixed form.** `As a <role>, I want <capability>, so that <outcome>` —
   the `so that` is not decoration, it is what lets a developer make the right call when the
   wording runs out. One outcome per story; an "and also" is two stories.
5. **Write acceptance criteria as checks, in Given/When/Then.** Every criterion names an
   observable: a value, a state, a message, a status code. A criterion nobody can run is not a
   criterion — move it to Open questions and say who has to decide it. Load
   `references/formats.md` for the shapes and the worked examples.
6. **Say what is still open, and who owns each open item.** Required, and the section people skip.
   An unanswered question written down is a scheduled decision; unwritten, it is a scheduled
   argument.
7. **Write it, then remember it.** `docs/requirements/<slug>.md`, then
   `ENGINE add reference "requirements for <slug> at docs/requirements/<slug>.md — <n> stories, <n> open questions" 0.75`

## Rules

- **Never invent a stakeholder's answer.** An assumed requirement is worse than a missing one: it
  looks decided. Mark it `ASSUMED — <who must confirm>` and put it in Open questions too.
- **Never write an acceptance criterion you could not check yourself.** "The page is fast" is a
  preference; "p95 under 400ms on the orders list, measured by <command>" is a criterion.
- The user's own words are evidence — quote them and attribute (`per <role>, <date>`). Paraphrase
  loses exactly the nuance that caused the disagreement.
- Scope creep enters through elicitation, not implementation. When an answer implies work nobody
  asked for, name it as a separate item rather than folding it in.

## Related

`/strategy-coach:feature` takes agreed requirements and specifies the build, with a plan a cheap
model can execute — run this first when what to build is still being argued about, that one when
it is settled. `/analysis-coach:insight` is the same discipline pointed at data instead of people.
`/analysis-coach:story` turns either into the version an executive reads.
