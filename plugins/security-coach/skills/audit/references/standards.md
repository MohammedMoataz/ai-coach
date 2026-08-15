# Standards and tools — the reasoning

Verified 2026-08-15. OWASP content is CC BY-SA 4.0 — this file teaches in its own words and links
out; it does not embed OWASP text.

## OWASP, current editions

- **Top 10 2025** (8th edition, RC1 Nov 2025, effectively final): the list in SKILL.md. Two new
  categories — A03 Software Supply Chain Failures (dependency and build-pipeline compromise
  promoted to its own category) and A10 Mishandling of Exceptional Conditions. SSRF was absorbed
  into Broken Access Control. <https://owasp.org/Top10/2025/>
- **ASVS 5.0** (May 2025): ~350 verification requirements in 17 chapters — the checklist to design
  against, where the Top 10 is only the awareness list. <https://asvs.dev/>
- **LLM Top 10 2025**: LLM01 Prompt Injection is #1 — the spotlight hook and `/scan` exist because
  of it. <https://genai.owasp.org/>
- **Cheat Sheet Series**: the per-topic how-to. Link, don't copy — CC BY-SA.
  <https://cheatsheetseries.owasp.org/>

## Tool choices, with reasons

| Job | Default | Why | Alternatives |
|---|---|---|---|
| SAST | **Opengrep** | LGPL-2.1 engine AND rules; community-governed fork (Jan 2025) after Semgrep moved bundled rules to a restrictive license (Dec 2024) | Semgrep CE (fine to run; check rules license before redistributing results) · Bearer (ELv2, single-file dataflow in free tier) |
| SCA | **osv-scanner** | Apache-2.0, single static Windows exe, winget/scoop, 19+ lockfile formats, Google-run OSV database | Trivy (broader: containers/IaC/secrets; choco/scoop install) · pip-audit (official PyPA) · OWASP dependency-check (maintained but needs a JVM) |
| Secrets | **gitleaks** | MIT, offline, zero network calls, single binary | trufflehog (AGPL; verifies leaked creds live against the provider — powerful and chatty) |

## Prioritization: KEV > EPSS > CVSS, and why

- **CISA KEV** — a catalog of vulnerabilities confirmed exploited in the wild. Membership is a
  fact, not a prediction: fix these first. <https://www.cisa.gov/known-exploited-vulnerabilities-catalog>
- **EPSS** (FIRST, v4 since Mar 2025) — probability a CVE is exploited in the next 30 days. A
  prediction, well-calibrated at scale. <https://www.first.org/epss/>
- **CVSS** (v4.0 current; v3.1 still everywhere) — severity in a vacuum. It explicitly does not
  account for your environment, exposure, or compensating controls — which is why it comes last.
- **SSVC** (CISA/CMU) — when the team wants a decision procedure instead of a score: a small
  decision tree ending in Track / Track* / Attend / Act. <https://www.cisa.gov/ssvc>

## Workflow doctrine (NIST SSDF SP 800-218, OWASP DSOMM)

- SAST runs on every change (PW.5); SCA is continuous, not point-in-time — dependencies accrue new
  CVEs while the code stands still (RV.1).
- Baseline-then-diff: commit a baseline of existing findings, gate pull requests only on what is
  new. The alternative — 400 legacy findings on every PR — trains everyone to ignore the gate.
- Every suppression carries an inline justification and gets re-reviewed periodically; a rule that
  keeps firing false positives gets tuned, not suppressed instance by instance.
- Maturity is a ladder (DSOMM): occasional manual scans → scanners in CI with human review →
  critical findings block releases with tracked remediation. Move one rung at a time.
