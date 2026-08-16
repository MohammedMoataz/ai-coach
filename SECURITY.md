# Security

## Reporting a vulnerability

Email **m.moataz@ignteq.org** with what you found and how to reproduce it. Please do not open a
public issue for anything exploitable. Expect an acknowledgement within a week.

## What this software touches

Worth knowing before you audit it, and worth knowing before you install it:

- **It writes outside the repository.** Databases, logs and the engine copy live in `~/.ai-coach/`
  (`%USERPROFILE%\.ai-coach` on Windows). Nothing else on the machine is written.
- **It runs on every tool call.** Hooks fire on tool use, prompts, notifications and session
  boundaries. Every one of them fails open: a hook that throws exits 0 and appends to
  `~/.ai-coach/log.jsonl`. A broken hook must never be able to break a session.
- **It spawns `claude -p` twice**, at most: plan-mode prompt review and session-end distillation.
  Both are Haiku, both are opt-out (`plan_review`, `learn`), and both set `AICOACH_INNER=1` so the
  child cannot re-enter the hooks.
- **Prompt text is never stored.** `prompt_signals` holds which detectors fired and a length.
  `<private>…</private>` spans are stripped before anything reaches disk.
- **Security findings never travel.** `.ai-coach/security/` is gitignored and `seedExport` is
  table-explicit, so vulnerability evidence cannot reach a committed team seed.

## What the defenses do and do not claim

- **The secrets guard** blocks tool calls carrying credentials and asks about secret-ish payloads.
  It is pattern-based. It will miss things.
- **The injection spotlight** scans fetched content for known prompt-injection markers and warns.
  It is a **low-confidence pre-filter, not a gate** — deterministic scanning is evadable by anyone
  who knows it is there, and it does not look at images at all. A clean result is not a safety
  proof, and the skill that runs it says so in those words.
- **Guarded reads** refuse symlinks and cap file size for everything read out of `.ai-coach/`, so
  a planted link to a private key cannot flow into model context.

Treat all three as defense in depth. None of them is a reason to run untrusted content.
