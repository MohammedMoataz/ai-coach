# Translate discipline

Load when a stub's rules need restating, or when the idiom is contested.

- **Idiom source order**: `docs/onboarding/stack.md` conventions → `docs/onboarding/patterns/`
  skeletons → the code adjacent to where the stub will live. The documentation's own style
  never wins over the project's.
- **Citation in code**: every stub opens with `// Source: <doc> § <heading>` (comment syntax
  per language). A stub that cannot name its section is a guess wearing code formatting.
- **The check travels with the stub**: an assert-based self-check or one minimal test in the
  project's test idiom — the smallest thing that fails if the stub is wrong. State plainly
  whether it was run; quote output when it was.
- **Ported test cases** keep a mapping comment per case (`upstream: <repo>/<file> — <case>`),
  so a future failure can be compared against the origin.
- **Scope**: this emits a starting point, not a feature. It never silently expands into wiring the
  stub through the codebase — that is a coding task the user drives.

## When the document is wrong

A document that contradicts the code it describes is a finding, not an obstacle. Write the stub
against what the code actually does, cite both, and say which one you followed. Silently picking
the document produces a stub that compiles and lies.
