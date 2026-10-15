# AI Coach documentation

Reference documentation for every plugin and for the engine underneath them. The
[README](../README.md) explains why AI Coach exists and how to install it. These pages explain
exactly what each part does, how to invoke it, what it reads and writes, and where its code lives.

Every behavioral claim here cites the source file it came from. If a page and the code disagree,
the code is right and the page is a bug: [open an issue](https://github.com/MohammedMoataz/ai-coach/issues).

## Start here

- **[Engine](engine.md):** storage, the memory model, settings, and every CLI verb. Every plugin
  runs on it.
- **[ai-coach](plugins/ai-coach.md):** the bundle you install, and the `/start`, `/wrap` and
  `/sitrep` commands that tie the coaches together.

## Plugins

| Plugin | What it is for |
|---|---|
| [ai-coach-core](plugins/ai-coach-core.md) | The engine and every hook: session brief, memory database, secrets guard, injection spotlight. |
| [memory-coach](plugins/memory-coach.md) | Search memory, hand session conclusions to a teammate, manage the roster and trust. |
| [prompt-coach](plugins/prompt-coach.md) | Write prompts that land, scope big asks, measure which habits cost you, brief a subagent. |
| [security-coach](plugins/security-coach.md) | Injection defense, OWASP-grounded audits, pentest-report triage. |
| [harness-coach](plugins/harness-coach.md) | What is installed next to the coach, and what is filling this session's context. |
| [investigation-coach](plugins/investigation-coach.md) | Onboarding docs, architecture maps, study material. |
| [atlas-coach](plugins/atlas-coach.md) | Verified web research, document ingestion, competitor analysis, translated docs. |
| [strategy-coach](plugins/strategy-coach.md) | Document the business as an Obsidian vault, and specify features. |
| [analysis-coach](plugins/analysis-coach.md) | Requirements elicitation, data analysis with critique, executive write-ups. |
| [design-coach](plugins/design-coach.md) | Checkable design rules and a lint for published artifact pages. |
| [pair-coach](plugins/pair-coach.md) | Talk to Claude through `@claude` comments in the code, and pair on a task. |
| [ship-coach](plugins/ship-coach.md) | Commit, branch and PR with a small-model message and one confirmation. |

## Elsewhere

- [Adapters](../adapters/README.md): using AI Coach from Cursor, Windsurf, Antigravity, Blackbox,
  opencode, Codex and any MCP client.
- [CONTRIBUTING](../CONTRIBUTING.md): setup, the checks CI runs, and pull-request rules.
- [SECURITY](../SECURITY.md): reporting vulnerabilities, and what the defenses do and do not claim.
- [CHANGELOG](../CHANGELOG.md): what shipped in each release.
