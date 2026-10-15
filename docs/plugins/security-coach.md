# security-coach

Three user-only skills and one quarantine agent. Use them for the security work a session cannot
do by itself: judging content you are about to trust, reading the output of the scanners you
already have, and tracking a pentest report until every finding is retested and closed. The
automatic layer (the secrets guard and the injection spotlight) lives in
[ai-coach-core](ai-coach-core.md). This plugin is the on-demand side that sits next to it.

| | |
|---|---|
| Version | 1.2.1 |
| Depends on | `ai-coach-core` `^1.6.0` |
| Source | [`plugins/security-coach/`](../../plugins/security-coach/) |

## What it ships

| Name | Kind | How it is invoked | What it does |
|---|---|---|---|
| `scan` | skill | `/security-coach:scan`, user-only (`disable-model-invocation: true`) | Deep prompt-injection scan of files or pasted content, with a verdict per hit |
| `audit` | skill | `/security-coach:audit`, user-only | Runs the SAST, dependency and secrets scanners you have installed and ranks the results KEV > EPSS > CVSS |
| `triage` | skill | `/security-coach:triage`, user-only | Turns a pentest or security report into tracked findings with owners and a status ladder, plus a team report |
| `examiner` | agent | Dispatched by `scan` for every flagged file | Reads suspect content in a context that has only Read and Grep, and returns verdicts with quotes |

All three skills are pinned to `model: haiku` at `effort: low`
([audit/SKILL.md:5-6](../../plugins/security-coach/skills/audit/SKILL.md)). Because they are
user-only, none of their descriptions is loaded into the model's context at session start.

## scan

**Invocation:** `/security-coach:scan [file ...] [or pasted content]`

The spotlight hook in ai-coach-core already checks every WebFetch and WebSearch result, and every
file read from outside the repo. `scan` is the on-demand counterpart for anything else: a file
someone sent you, a README from a repo you are about to vendor, or content the hook flagged that
you want explained ([scan/SKILL.md:11-15](../../plugins/security-coach/skills/scan/SKILL.md)).

Steps, as the skill specifies them:

1. **File arguments.** It runs `ENGINE injection-scan <file>` for each file. A clean file gets one
   line. The engine command reads **one regular file, up to 512 KB**
   ([scan/SKILL.md:23-27](../../plugins/security-coach/skills/scan/SKILL.md);
   `INJECTION_SCAN_CAP = 512 * 1024` at
   [engine.js:1765](../../plugins/ai-coach-core/hooks/engine.js)). Above that cap, or for a
   directory, the command says so and exits non-zero. The skill does not treat that as a failed
   run: it falls back to reading the file and judging it directly, because "too big to regex"
   says nothing about whether the content is safe.
2. **Flagged files** go to the `examiner` agent with the path and the marker ids. The point is
   quarantine, not delegation: the instruction-shaped content never enters your session, and what
   comes back is a verdict per hit. On a harness without custom agents, the skill reads the file
   itself under the same taxonomy, and it says what that costs: the content being judged is now in
   the session it is meant to protect ([scan/SKILL.md:28-35](../../plugins/security-coach/skills/scan/SKILL.md)).
3. **Pasted content** is already in the session, so quarantine is moot. The skill evaluates it
   directly against the marker taxonomy.
4. **Images** have no deterministic scan. If you ask about one, the skill looks at it, describes
   any instruction-shaped text it can see, and says plainly that this is judgment, not a scan
   ([scan/SKILL.md:39-41](../../plugins/security-coach/skills/scan/SKILL.md)).

The marker ids it reports are `zero-width`, `unicode-tags`, `bidi`, `override-phrase`,
`new-instructions`, `fake-role`, `fake-tool`, `conceal`, `hidden-html` and `md-image-exfil`. Each
one is explained, with its source, in
[scan/references/injection.md](../../plugins/security-coach/skills/scan/references/injection.md).
The skill loads that file only when you ask why a marker matters.

**Reads:** the files you name. **Writes:** nothing. **Engine calls:** `injection-scan`.

**Guarantees and refusals** ([scan/SKILL.md:46-53](../../plugins/security-coach/skills/scan/SKILL.md)):

- It never says "safe". The strongest claim it makes is "No markers matched", always with the
  caveat that sophisticated attacks evade deterministic scanning.
- It never blocks or deletes anything. It reports and classifies, and you decide.
- A benign-quote verdict has to quote the surrounding context, not just assert it.
- There is no blocklist, and the coach does not want one.

## audit

**Invocation:** `/security-coach:audit [sast|deps|secrets|standards] [path] [--triage]`

The skill treats an audit as a reading problem, not a tool problem. The scanners already exist and
are free. The hard part is that raw output is a wall of CVEs nobody prioritizes
([audit/SKILL.md:11-14](../../plugins/security-coach/skills/audit/SKILL.md)).

Modes ([audit/SKILL.md:20-47](../../plugins/security-coach/skills/audit/SKILL.md)):

| Mode | Detects and runs | Notes |
|---|---|---|
| none | everything below that is installed, in order | |
| `sast` | `opengrep`, else `semgrep` | Prefers Opengrep (LGPL engine and rules). On Windows it uses `where.exe`, never bare `where`, because PowerShell resolves that to `Where-Object` and it blocks waiting for input |
| `deps` | `osv-scanner`, else `pip-audit` or `npm audit` | Runs against lockfiles, not source. Treats `npm audit` severities as noisy |
| `secrets` | `gitleaks` | Mentions `trufflehog` only if you want live verification, because it phones the provider |
| `standards` | no scanner | Prints the OWASP Top 10 2025 list and marks the categories that plausibly apply, after reading the manifest files |

How it reads the results ([audit/SKILL.md:49-69](../../plugins/security-coach/skills/audit/SKILL.md)):

- **Priority is KEV > EPSS > CVSS.** Confirmed-exploited outranks likely-to-be-exploited, which
  outranks severe-on-paper. CVSS is severity, not risk.
- **Gate on new findings, not the backlog.** It baselines legacy findings and holds the line on
  new ones (NIST SSDF PW.5).
- **A suppression without a reason is a finding in itself.**
- **Hand-off to triage.** Without `--triage`, it offers `/security-coach:triage ingest --source
  audit` and never auto-ingests scanner noise. With `--triage`, it follows triage's `ingest` steps
  inline, because `triage` is user-only and the Skill tool cannot invoke it. It reads
  `${CLAUDE_PLUGIN_ROOT}/skills/triage/SKILL.md` and runs the `.gitignore` check, triage's
  validation gate, `ENGINE finding-add` with `--source audit`, and the table regeneration. It
  still asks before recording anything: the flag saves you retyping a command, it does not make
  the decision for you.

After the report, the skill records the *shape* of the run, never the findings
([audit/SKILL.md:74-84](../../plugins/security-coach/skills/audit/SKILL.md)):

```
ENGINE add reference "security audit <modes> on <date>: <tools that ran / missing>, <n> findings, baseline <n>" 0.75
```

This exists so the next session's brief knows an audit happened, without re-running a scanner to
rediscover that gitleaks is missing. Findings stay out of memory: "a vulnerability in a memory is
a vulnerability in a seed."

**Reads:** the repo, lockfiles and manifests through the scanners. **Writes:** one memory row,
plus findings rows and `.ai-coach/security/findings.md` only under `--triage` and only after you
confirm. **Engine calls:** `add`, and under `--triage`, `finding-add` and `findings --json`.

**Refusals** ([audit/SKILL.md:86-93](../../plugins/security-coach/skills/audit/SKILL.md)): it
never installs a tool without being asked (a missing scanner gets one install hint), never
reimplements a scanner with ad-hoc grep, and never presents a scanner's severity as the team's
priority. "osv-scanner not installed" is reported as a fact, not a failure.

[audit/references/standards.md](../../plugins/security-coach/skills/audit/references/standards.md)
holds the tool comparison and the reasoning behind the prioritization. It is loaded only on request.

## triage

**Invocation:** `/security-coach:triage <ingest|status|update|report> [--source pentest|audit|scan|disclosure] [args]`

The failure this skill is built against is a pentest report that everyone reads, two findings get
fixed, and the file rots in a channel. Every finding is validated, owned and tracked until it is
retested and closed. The reported severity is treated as the pentester's claim, not as fact
([triage/SKILL.md:11-14](../../plugins/security-coach/skills/triage/SKILL.md)).

Modes ([triage/SKILL.md:26-67](../../plugins/security-coach/skills/triage/SKILL.md)):

- **`ingest`.** For each finding in a pasted report or a file:
  1. Validate it before recording. Is it reproducible? Is it in code this team owns? Is it one
     finding, or a chain the report double-counted? A finding that cannot be validated is still
     recorded, with that stated in its detail.
  2. `ENGINE finding-add --source <source> --title "<one line>" --cwe CWE-nnn --severity <as reported> --detail "<evidence, location, repro>"`.
     `<source>` is where the finding actually came from: the `--source` you passed, `audit` when
     audit handed it over, `disclosure` for an outside report, and `pentest` by default. It used
     to be hardcoded to `pentest`, so a scanner run claimed a pentest produced it.
  3. Confirm `.gitignore` carries `.ai-coach/security/` (appending it if missing), then regenerate
     `.ai-coach/security/findings.md` from `ENGINE findings --json`. The table has id, title, CWE,
     both severities, status, owner and age.
- **`status`.** Runs `ENGINE findings --open`, grouped by status then owner, oldest first. The
  oldest open finding is the headline.
- **`update`.** Runs `ENGINE finding-update <id> --status <s> [--owner o] [--assessed sev]`, then
  regenerates `findings.md`. The status ladder is the discipline: `fixed` is not closed, and only
  a re-run of the original attack moves a finding to `retested`. A severity downgrade needs its
  reason written down. `accepted-risk` needs a named sign-off from someone who can carry the risk
  ("A developer cannot accept risk on the org's behalf, including you"). `false-positive` needs
  evidence.
- **`report`.** Writes `.ai-coach/security/report-YYYY-MM-DD-HHMM.md` with counts by status, the
  full table with both severity columns, what changed since the previous report, and open findings
  by age. It reads the newest existing report for the diff, then writes a new file and never
  overwrites one. The timestamp includes hour and minute because a date-only name let a second run
  on the same day overwrite the file it was meant to diff against.

The engine enforces the statuses. `finding-update` refuses anything outside `open`, `fixing`,
`fixed`, `retested`, `accepted-risk` and `false-positive`
([engine.js:1783](../../plugins/ai-coach-core/hooks/engine.js)). It writes `severity_assessed`
beside `severity_reported` rather than over it, so a downgrade stays visible
([schema.sql:136-137](../../plugins/ai-coach-core/memory/schema.sql)).

**Engine calls:** `finding-add`, `findings` (with `--open` or `--json`), `finding-update`.

**Rules** ([triage/SKILL.md:71-79](../../plugins/security-coach/skills/triage/SKILL.md)):

- Fix the class, not the proof of concept. Before claiming done, grep for every sibling of the
  same CWE.
- Never invent SLA day-counts. Published windows contradict each other, so the age column speaks
  for itself.
- Findings never go in a seed, in `team.md` or in any committed file. If you ask it to commit
  them, it explains the disclosure problem and offers the report file instead.
- One finding, one owner. "The team" owns nothing.

[triage/references/workflow.md](../../plugins/security-coach/skills/triage/references/workflow.md)
explains why each step exists and who signs off what. It is loaded only on request.

## examiner

**Kind:** agent, defined in [agents/examiner.md](../../plugins/security-coach/agents/examiner.md).
`scan` dispatches it for every flagged file. Its description also offers it for anything the
spotlight hook flagged.

**The tool set is the security boundary:** `tools: Read, Grep`
([examiner.md:4](../../plugins/security-coach/agents/examiner.md)). The comment at lines 6-10
explains each omission:

- No WebFetch and no WebSearch, so content that tries to exfiltrate data, phone home or pull a
  second-stage payload has no tool to do it with.
- No Bash, so there is no shell for an embedded command to talk its way into.
- No Write or Edit, so nothing it reads can persist anything.

The agent is **deliberately not model-pinned**. Its whole job is resisting adversarial text, so the
judge must never be weaker than the session that trusts its verdicts
([examiner.md:12-14](../../plugins/security-coach/agents/examiner.md)).

**Procedure** ([examiner.md:23-35](../../plugins/security-coach/agents/examiner.md)): it reads the
flagged regions with enough context to judge them, greps for every occurrence of a marker, and
classifies each hit:

- **benign-quote**: an article, test fixture or document quoting an attack string, recognizable
  by its framing.
- **suspicious**: instruction-shaped text with no legitimate reason to be where it is.
- **hostile**: content plainly trying to steer a model or exfiltrate data.

**Output contract** ([examiner.md:37-49](../../plugins/security-coach/agents/examiner.md)):

- One line per hit, as `<class> · <marker id> · <where>`, followed by the shortest quote that
  proves it and one sentence of reasoning. 300 words at most.
- It quotes no more of the content than the evidence needs, because the report enters the caller's
  session.
- An uncertain hit is classed **suspicious**, never benign-quote.
- It never says "safe".
- It ends with one line on what it could not examine.

## How this relates to the guard and spotlight hooks

Both hooks belong to ai-coach-core and are documented there:
[guard.js](ai-coach-core.md#guardjs) and [spotlight.js](ai-coach-core.md#spotlightjs).
This plugin installs no hooks of its own. The division of labour:

- The **spotlight** hook runs automatically after WebFetch, WebSearch and Read (Read only for
  files outside the session's working directory). It warns and never blocks
  ([spotlight.js:3-9](../../plugins/ai-coach-core/hooks/spotlight.js)). `scan` is its on-demand
  counterpart for anything the hook did not see, and the place to take a hook warning you want
  explained. Both run the same deterministic marker set.
- The **guard** hook stops credentials from going *out* in a tool call. Nothing in security-coach
  replaces it, and `audit secrets` (gitleaks) only finds credentials already committed to the tree
  or its history.

From [SECURITY.md](../../SECURITY.md), on what these defenses do and do not claim:

> **The secrets guard is off by default, and nothing replaces it.** [...] Left off — which is what
> a fresh install gets — nothing in this product stops a private key, an AWS key or a token from
> going into a `Bash` command, a `WebFetch` or a file write.

> **The injection spotlight** scans fetched content for known prompt-injection markers and warns.
> It is a **low-confidence pre-filter, not a gate** — deterministic scanning is evadable by anyone
> who knows it is there, and it does not look at images at all. A clean result is not a safety
> proof, and the skill that runs it says so in those words.

> Treat all three as defense in depth. None of them is a reason to run untrusted content.

## Configuration

None of its own. The guard (`guard` setting or `AICOACH_GUARD=on`) and the spotlight (`spotlight`
setting or `AICOACH_SPOTLIGHT=off`) are ai-coach-core settings. See
[engine.md](../engine.md#settings). The scanners `audit` runs are whatever is on your PATH.

## Data it keeps

| What | Where | Committed? |
|---|---|---|
| Finding rows: source, title, CWE, both severities, status, owner, detail | `findings` table in the engine database under `~/.ai-coach/` ([schema.sql:132-154](../../plugins/ai-coach-core/memory/schema.sql)) | User-scope. Never exported |
| `findings.md`, `report-YYYY-MM-DD-HHMM.md` | `.ai-coach/security/` in the repo | **Gitignored.** The skill appends the `.gitignore` line if it is missing |
| One `reference` memory per audit run (the shape of the run, not the findings) | engine database | Can travel in a seed like any memory. It holds no finding |

**Why findings never travel in seeds.** An unfixed vulnerability written into a committed file is
disclosure to everyone with repo access ([triage/SKILL.md:16-20](../../plugins/security-coach/skills/triage/SKILL.md)).
The protection is structural, not a convention. `seedExport` is table-explicit, and `findings` is
not one of its tables. The schema comment says the table "must never join it" because `detail`
carries vulnerability evidence ([schema.sql:132-135](../../plugins/ai-coach-core/memory/schema.sql)).
A test in
[engine.test.js:828-836](../../plugins/ai-coach-core/hooks/engine.test.js) records a finding whose
detail holds a marker string, then checks that the exported seed contains neither that evidence,
nor the title, nor any `finding` row kind. `finding-add`
prints "local only — findings never enter the team seed"
([engine.js:2494](../../plugins/ai-coach-core/hooks/engine.js)).

Open findings do appear in your own session brief as a coach line (`1 security finding open
(oldest …)`). An unrecorded failure still outranks that line
([engine.js:1202](../../plugins/ai-coach-core/hooks/engine.js)).

## Limits and known issues

- **Deterministic markers are a pre-filter.**
  [injection.md:30-37](../../plugins/security-coach/skills/scan/references/injection.md) cites
  published evasion research with attack success rates of 20–72% against commercial guardrails.
  A match deserves attention; a clean result proves little.
- **Images are not scanned.** Text-in-image and steganographic instructions are invisible to
  regex. `scan` offers a judgment pass and never calls it a scan.
- **`injection-scan` reads one regular file of up to 512 KB.** Larger files and directories fall
  back to the model reading them.
- **MCP tools are not covered by the hooks.** The guard and spotlight match built-in tool names
  only. [README.md:140-146](../../README.md) says to treat `/security-coach:scan` as the on-demand check for content that
  arrived some other way.
- **`update` cannot write the reasons it requires.** The skill says a downgrade,
  `accepted-risk` and `false-positive` must carry their reason or sign-off "in detail"
  ([triage/SKILL.md:53-57](../../plugins/security-coach/skills/triage/SKILL.md)). But
  `finding-update` accepts only `--status`, `--owner` and `--assessed`
  ([engine.js:2497-2506](../../plugins/ai-coach-core/hooks/engine.js)), and no engine command
  amends `detail` after `finding-add`. Until that changes, record the reason in the report file.
- **Triage reads reports as text.** There is no SARIF parser yet
  ([workflow.md:58-60](../../plugins/security-coach/skills/triage/references/workflow.md)).

No open GitHub issue targets this plugin directly. Its compiled Cursor rules
(`adapters/out/cursor/security-coach--*.mdc`) invoke the engine through `$AICOACH_REPO`, which
fails in PowerShell and cmd (#46). Several adapter issues weaken the guard outside Claude Code
(#35, #36, #38, #40); see [ai-coach-core.md](ai-coach-core.md).

## Source map

- [`../../plugins/security-coach/.claude-plugin/plugin.json`](../../plugins/security-coach/.claude-plugin/plugin.json): manifest, version and dependency
- [`../../plugins/security-coach/agents/examiner.md`](../../plugins/security-coach/agents/examiner.md): the quarantine agent, with Read and Grep only
- [`../../plugins/security-coach/skills/scan/SKILL.md`](../../plugins/security-coach/skills/scan/SKILL.md): on-demand injection scan
- [`../../plugins/security-coach/skills/scan/references/injection.md`](../../plugins/security-coach/skills/scan/references/injection.md): what each marker catches, and why the hook warns rather than blocks
- [`../../plugins/security-coach/skills/audit/SKILL.md`](../../plugins/security-coach/skills/audit/SKILL.md): scanner runner and result reader
- [`../../plugins/security-coach/skills/audit/references/standards.md`](../../plugins/security-coach/skills/audit/references/standards.md): OWASP editions, tool choices, KEV/EPSS/CVSS reasoning
- [`../../plugins/security-coach/skills/triage/SKILL.md`](../../plugins/security-coach/skills/triage/SKILL.md): finding tracker and report writer
- [`../../plugins/security-coach/skills/triage/references/workflow.md`](../../plugins/security-coach/skills/triage/references/workflow.md): the triage sequence and who signs off what
- [`../../plugins/ai-coach-core/hooks/engine.js`](../../plugins/ai-coach-core/hooks/engine.js): `injection-scan`, `finding-add`, `finding-update`, `findings` (in the engine, not this plugin)
- [`../../plugins/ai-coach-core/memory/schema.sql`](../../plugins/ai-coach-core/memory/schema.sql): the `findings` table
