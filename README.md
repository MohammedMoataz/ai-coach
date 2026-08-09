<p align="center">
  <img src="assets/cover.jpg" width="620" alt="AI Coach — harness your team">
</p>

<p align="center"><b>A coach for using Claude Code well.</b><br>
One focus per release. This one is memory.</p>

---

## Why

Every session starts cold. You re-explain the same constraint, rediscover the same trap, and lose
whatever a teammate already worked out on the branch you just checked out. Worse, the moment things
went wrong — the one worth remembering — is the moment nothing records.

AI Coach keeps what a session learned, puts it in front of you next time, and notices when you hit
the same wall twice without writing it down.

## Install

Requires **Node ≥ 22.5** (`node:sqlite`). Session-end distillation additionally wants `claude` on
PATH, and degrades quietly without it.

```bash
claude plugin marketplace add MohammedMoataz/ai-coach
claude plugin install ai-coach@ai-coach
```

That one command installs the engine and every coach released so far. The bundle itself ships no
components, so it costs nothing at session start.

Want only part of it: `claude plugin install memory-coach@ai-coach` pulls `ai-coach-core` with it.

## What ships

| Plugin | What it is |
|---|---|
| **ai-coach-core** | The engine. Every hook, the memory database, the secrets guard, the session brief. Everything else depends on it. |
| **memory-coach** | Skills only: `/recall`, `/handoff`, `/team`, `/project`, `/name`, `/doctor`. |
| **ai-coach** | The bundle. Install this one. |

## What happens on its own

- **A session brief**, capped and ranked, with the reason each line is there — `branch`, `global`,
  `from sara`, `distilled`. You learn the ranking model by reading your own brief.
- **A coach line**, when there is one true thing to say and not otherwise.
- **Corrections**: when a failure surfaces, that fact is recorded. It is the richest signal in a
  session and the one nothing else captures.
- **Observations**: every Edit, Write and Bash becomes a one-line record; failures marked `FAIL`.
  `<private>…</private>` is stripped at the boundary, before anything reaches disk.
- **Session-end distillation**: one Haiku call turns the session into a summary and 0–3 learnings.
- **A secrets guard**: real credentials are blocked outright; secret-*ish* payloads and
  credential-file reads ask first. Fails open, always logged.

## What you drive

`/memory-coach:recall` · `/memory-coach:handoff` · `/memory-coach:team` · `/memory-coach:project` ·
`/memory-coach:name` · `/memory-coach:doctor`

Five of the six never fire on their own. A skill with side effects should run when you say so.

## Design notes

**Nothing a model wrote can pass for something a person decided.** Every memory carries a
`provenance` — `human`, `distilled`, or `imported` — and there is deliberately no path that promotes
one to another. An agent is not an approval boundary.

**Identity is shared; trust is private.** `.ai-coach/team.md` is a committed directory of names,
emails and roles. Whom you trust lives only on your machine, never in the shared file and never in a
seed.

**Git is the transport.** `/handoff` writes `.ai-coach/team-seed.jsonl`; commit it and knowledge
moves with the branch, reviewable in a pull request before it touches anyone's database. Optionally
AES-256-GCM sealed.

**One product, however many repositories.** A backend and a frontend that belong together share one
memory; each line still records the repo it came from, and your own repo ranks first.

**The brief never truncates silently.** A capped brief that looks complete is the one failure mode a
memory tool cannot have, so the cap always leaves room to say what it dropped.

**The engine lives at `~/.ai-coach/`, not in a plugin directory.** A plugin directory is documented
as ephemeral and unreachable from a sibling plugin, so the engine installs a copy of itself beside
the databases at a path that never moves.

## Configuration

Plugin settings on `ai-coach-core`, or `AICOACH_*` env vars to override:
`brief_chars` (4000) · `coach` (on) · `learn` (on) · `plan_review` (on) · `guard` (on) ·
`seed_auto` (on) · `default_trust` (`full`).

## Tests

```bash
node plugins/ai-coach-core/hooks/engine.test.js
node plugins/ai-coach-core/hooks/hooks.test.js
```

No framework, throwaway databases, no network.

## License

MIT
