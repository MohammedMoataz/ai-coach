---
description: Package this project's memory for a teammate, or load theirs. Use for "hand this off", "share what I learned", "/handoff import".
argument-hint: "[import] [--task <t>] [--repo <r>] [--encrypt]"
disable-model-invocation: true
---

# /handoff — pass memory between teammates

Memory travels as `.ai-coach/team-seed.jsonl`, committed to the repo. No server and no sync: git is
the transport, so knowledge moves along the branch it belongs to, and it is reviewable in a pull
request before it reaches anyone's database.

`ENGINE` means `node "$HOME/.ai-coach/bin/engine.js"`, or
`node "$env:USERPROFILE\.ai-coach\bin\engine.js"` in PowerShell.

## Hand off — the default

1. `ENGINE seed-export .ai-coach/team-seed.jsonl`
   - Exports the **whole project**, every repository in it, because whoever picks up one repo
     deserves the whole picture. Narrow with `--repo` or `--task "<branch>"`.
   - Your global memories never travel: they are yours, not the product's.
   - Session history travels too — who worked which branch, and what they concluded.
2. Report the counts exactly as printed, and tell the user to commit the file.
3. First handoff in this repo? Say that from now on the seed keeps itself current — on `/compact`,
   on `/clear`, and after each commit.

## Pick up — `/handoff import`

1. `ENGINE seed-import .ai-coach/team-seed.jsonl --dir "<repo-root>"`. Pass the repo root so trust
   and the key location resolve.
2. Report the counts as printed. Re-running is safe; dedup is on normalized text.
3. Continue from what the imported memories say, citing ids when you lean on one. Imported rows are
   labelled `imported` and stay labelled.

## Encryption

The seed sits in git, readable by anyone with repo access. To close that: put a shared passphrase in
`.ai-coach/seed.key` (or `AICOACH_SEED_KEY`), **confirm the key file is gitignored**, and export with
`--encrypt`. Import detects and decrypts automatically. A wrong key or an altered file fails loudly
— the AES-GCM tag is the tamper check, which is why there is no separate signature to manage. Never
write a decrypted copy back into the repo.

## Where an imported memory lands

Full-trust memories join your ranked brief like your own. Memories from someone you trust at
`workspace` level stay on your machine: confidence capped, never auto-injected, never re-exported,
but findable in `/memory-coach:recall` marked `[workspace]`.

Workspace is a holding area, not a penalty box — raise their trust with `/memory-coach:team`,
re-import, and their memories move up with their confidence restored.

## Rules

- Never hand-edit the seed. Handing off regenerates it whole.
- Trust is private and never travels in a seed.
