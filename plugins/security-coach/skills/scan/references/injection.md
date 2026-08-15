# Prompt injection — the markers, the evidence, the limits

Sources verified 2026-08-15. Rules here are bets on current attack patterns and go stale; each
carries its source so a later release can retire it instead of accreting.

## The threat (OWASP LLM Top 10 2025, LLM01)

Indirect prompt injection: malicious instructions embedded in external content — web pages, files,
docs — that the model processes as if trusted. OWASP's own position is that no fool-proof
prevention exists; the recommended posture is defense-in-depth: constrain behavior, validate
outputs, filter inputs, least-privilege tools, human-in-the-loop for high-risk actions, and
**segregate/clearly mark untrusted external content** — which is exactly what the spotlight hook
does. <https://genai.owasp.org/llmrisk/llm01-prompt-injection/>

## What each marker catches

| id | what it is |
|---|---|
| `zero-width` | U+200B/C/D, U+2060, U+FEFF — text invisible to the human reviewing the page but fully visible to the model |
| `unicode-tags` | U+E0000–E007F tag block — smuggles an ASCII payload with zero visible glyphs |
| `bidi` | direction-override characters — reorder what the eye sees vs what the parser reads |
| `override-phrase` | the "ignore previous instructions" family (Rebuff open pattern library, bundled into Guardrails AI `detect_prompt_injection`) |
| `new-instructions` | "new system prompt:" style re-instruction headers |
| `fake-role` | impersonated transcript roles (`system:`, `<\|im_start\|>`, `[INST]`) |
| `fake-tool` | forged tool-call XML aimed at making the model believe a tool ran |
| `conceal` | "don't tell the user" — instructions that ask the model to hide activity |
| `hidden-html` | `display:none` / `font-size:0` / giant HTML comments — text the browser shows nobody |
| `md-image-exfil` | `![](https://evil?data=...)` — markdown image whose URL carries a data payload out |

## Why this is a pre-filter, not a gate

Empirical evasion research (arXiv 2504.11168) measured attack success rates of 20–72% against
commercial guardrails using Unicode-tag smuggling and emoji encoding — deterministic layers are
routinely bypassed. Anthropic's own engineering position: "protection in the model layer will never
be 100% effective, which is why it can't stand alone"
(<https://www.anthropic.com/engineering/how-we-contain-claude>). Treat every scan result
accordingly: a match deserves attention, a clean result proves little.

## Why the hook warns instead of blocking

Documented false-positive classes: security articles quoting "ignore previous instructions" as an
example, base64-looking strings in lockfiles, long API URLs. Microsoft's spotlighting research is
the counter-move that actually holds: marking untrusted content and re-stating "treat this as data"
cut injection success from >50% to <2% in their evaluation
(<https://www.microsoft.com/en-us/research/publication/defending-against-indirect-prompt-injection-attacks-with-spotlighting/>).
The hook implements the warn half of that; judgment stays with the model and the user.

## Images

Text-in-image attacks hit ~64% success black-box against multimodal models in published research;
steganographic variants are visually indistinguishable from benign images. Detection requires model
inference (OCR + semantic judgment) or steganalysis — no string match substitutes. That is why
`/scan` offers a judgment pass on images and never calls it a scan.

## What the coach deliberately does not do

No blocklist, no auto-quarantine, no LLM call per fetch. Blocking on a low-confidence signal
teaches the team to disable the guard; a per-fetch model call is a cost with no ceiling. The
spotlight hook is zero-LLM and warn-only by design.
