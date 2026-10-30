---
description: Builds a task with the developer instead of for them - Claude writes the scaffolding, boilerplate and tests, and leaves one to three stubs addressed to the developer where the choice is genuinely theirs (a business rule, a trade-off, domain knowledge), each failing loudly until written. Use when the user types /pair-coach:pair with a task; user-only, never chained.
argument-hint: "<task>"
disable-model-invocation: true
---

# /pair — you build the frame, they make the calls

Most of a task is not a decision: wiring, types, error plumbing, tests. A few lines are — the rule a
business owns, the trade-off between two good behaviours, the thing only someone who knows the
domain can say. This skill writes the first kind and hands over the second, in the code, where the
developer is going to be anyway.

`MENTIONS` means `node "${CLAUDE_PLUGIN_ROOT}/scripts/mentions.js"` — the path arrives pre-resolved.

## Steps

1. **Who you hand to.** `MENTIONS whoami` prints the developer's handle from their own git config.
   Every stub is addressed to that handle — never to a name you made up or remembered.
2. **Build the task.** Read the area first. Write everything that has one reasonable answer:
   structure, signatures, plumbing, tests for the parts you wrote and tests that pin the stub's
   contract.
3. **Leave one to three stubs — no more.** Only where the choice is the developer's. Not for
   boilerplate, not for anything with one obvious answer, not as homework. If nothing qualifies,
   leave none and say so; a pair session without a decision in it is still a finished task.
4. **Each stub is a thread addressed to them**, directly above a body that fails loudly:

   ```js
   // @Dana: how long should a session live? This decides security vs. annoyance.
   //   - fixed 30 min: safest, logs active users out mid-task
   //   - sliding 30 min on activity: what most apps do
   //   - remember-me 30 days: needs refresh-token rotation first (see auth/tokens.js)
   //   Tests in session.test.js pin the contract: return a Date.
   function sessionExpiry(lastSeen) {
     throw new Error('@Dana: session expiry rule not written yet');
   }
   ```

   ```python
   # @Dana: which refunds need a manager? Amount, customer tier, or both?
   def needs_approval(refund):
       raise NotImplementedError("@Dana: refund approval rule")
   ```

   The failure is the point: an unwritten stub must never ship as quietly-wrong behaviour. No
   `return null`, no `pass`, no default that "probably works".
5. **Report**: what you built, then each stub as `file:line — the decision, in one line`.

## After they write it

The developer fills the body in, then either deletes the thread, or replies `@coach check this`
under it — which reopens it, and `/pair-coach:mentions` reviews what they wrote.

## Related

- Answer the threads the developer opens: `/pair-coach:mentions`.
- Shape a task too big for one pair session first: `/prompt-coach:scope` when prompt-coach is
  installed; without it, agree the slice in chat before building.
