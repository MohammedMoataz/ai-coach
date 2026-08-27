---
description: Run the security scanners you already have (SAST, dependencies, secrets) and read the results against OWASP 2025. Use for "/audit", "security audit", "check dependencies for CVEs", "OWASP check".
argument-hint: "[sast|deps|secrets|standards] [path] [--triage]"
disable-model-invocation: true
model: haiku
effort: low
---

# /audit — the scanners you already have, read properly

A security audit is not a tool problem — the tools exist, are free, and are good. It is a reading
problem: raw scanner output is a wall of CVEs nobody prioritizes, so nobody acts. This skill runs
whatever is installed, then reads the results the way a security team would: exploited beats
likely-exploited beats severe-on-paper. It never installs anything and never reimplements a scanner.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell. Missing? The engine installs
itself at session start — open a new session and try again.

## Modes

**No argument** — detect and run everything installed, in this order.

**`sast`** — static analysis. Detect with `command -v opengrep` / `command -v semgrep`, or
`where.exe opengrep` on Windows — never bare `where`, which PowerShell resolves to `Where-Object`
and which then blocks waiting on pipeline input. Prefer Opengrep (fully LGPL, community rules);
Semgrep CE works too — note that its bundled rules moved to a restrictive license in Dec 2024 if
the team plans to redistribute results. Run against the given path or the repo root; ask for JSON
output when the tool offers it. Missing both: point at github.com/opengrep/opengrep for the
current install line — one line, move on. Do not invent a package id.

**`deps`** — dependency CVEs. Detect `osv-scanner` (best default: Apache-2.0, single Windows exe,
19+ lockfile types — `winget install Google.OSVScanner` or `scoop install osv-scanner`). Fall back
to what the ecosystem ships: `pip-audit` for Python, `npm audit` for Node (treat its severities as
noisy). Run against lockfiles, not source.

**`secrets`** — leaked credentials in the tree and history. Detect `gitleaks` (MIT, offline,
single binary — `winget install Gitleaks.Gitleaks`). Mention `trufflehog` only if the user wants
live verification that a leaked key still works (it phones the provider — that is the point and
the caveat).

**`standards`** — no scanner: print the OWASP Top 10 2025 list, one line each, and mark which
categories plausibly apply to this repo's stack (read the manifest files first, don't guess).
A01 Broken Access Control · A02 Security Misconfiguration · A03 Software Supply Chain Failures ·
A04 Cryptographic Failures · A05 Injection · A06 Insecure Design · A07 Authentication Failures ·
A08 Software/Data Integrity Failures · A09 Logging & Alerting Failures · A10 Mishandling of
Exceptional Conditions.

## Reading the results

- **Priority order: KEV > EPSS > CVSS.** Confirmed-exploited (CISA KEV) outranks
  likely-to-be-exploited (high EPSS) outranks severe-on-paper (CVSS). A medium-CVSS bug on an
  internet-facing path outranks a CVSS 9.8 on code nobody can reach. CVSS is severity, not risk.
- **Gate on new findings, not the backlog.** The first run of any scanner on an old repo produces
  legacy debt; treating all of it as urgent produces alert fatigue and then nothing. Baseline it,
  then hold the line on anything new (NIST SSDF PW.5).
- **Suppressions carry a reason.** An inline `# nosec`-style suppression without a justification
  comment is a finding in itself.
- Findings worth tracking beyond this session: offer
  `/security-coach:triage ingest --source audit` — never auto-ingest scanner noise into the
  findings table. The `--source audit` matters: a scanner hit and a pentester's finding are not
  worth the same, and a finding that lies about where it came from is one nobody can weigh.
- **`--triage` chains the two**: after the report, hand the findings the user confirms are worth
  tracking straight to `/security-coach:triage ingest --source audit`, without asking them to
  retype anything. It still validates each finding through triage's own gate and it still asks
  before recording — the flag removes a retyped command, not a decision. Without the flag, the
  hand-off stays an offer.

Load `references/standards.md` only when the user asks for the reasoning, the tool comparison, or
category detail.

## Remember what this run established

An audit is the one skill here that used to leave no trace at all, so the next session's brief had
no idea it had ever happened — and re-running a scanner to rediscover "gitleaks is not installed"
or "the baseline is 41 legacy findings" is exactly the re-derivation this product exists to stop.
After the report, record the shape of the run, never the findings themselves:

`ENGINE add reference "security audit <modes> on <date>: <tools that ran / missing>, <n> findings, baseline <n>" 0.75`

Findings stay out of memory: they belong in the local findings table via
`/security-coach:triage`, and a vulnerability in a memory is a vulnerability in a seed.

## Rules

- Never install a tool without being asked; a missing scanner gets one install hint and the audit
  moves on with what exists.
- Never reimplement a scanner's job in ad-hoc grep — partial coverage presented as an audit is
  worse than saying "not installed".
- Never present a scanner's severity as the team's priority — apply KEV/EPSS/CVSS ordering first.
- Absent is not the same as broken: "osv-scanner not installed" is a fact, not a failure.

## Related

`/security-coach:scan` checks content you consume; this checks code you ship.
`/security-coach:triage` tracks what this finds.
