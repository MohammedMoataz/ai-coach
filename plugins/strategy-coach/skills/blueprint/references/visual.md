# The visual rendering

Load before publishing an Artifact or touching Miro. Three surfaces, one source: the Mermaid in
`docs/business/processes/<name>.md`. Never draw something on a board that is not in a note — the
note is what survives, gets reviewed in a pull request, and is read by the next agent.

## Order of preference

| Surface | When | Cost of failing |
|---|---|---|
| Mermaid in the note | always | none — it is the source |
| Artifact page | unless `--no-visual` | low: report it, notes are unaffected |
| Miro board | only when Miro is already connected | none: skip with one line |

## The Artifact page

One page for the whole blueprint, not one per process. Load the `artifact-design` skill before
writing it. Contents, in order: the domain sentence, the actor list, then one section per process
with its Mermaid fenced as ```mermaid (Artifacts render mermaid natively — no library, no CDN),
and last the open questions. Give it a favicon and keep the same file path on re-runs so the URL
is stable.

Write the Artifact's URL back into `docs/business/overview.md` under a `## Visual` heading. A
published page nobody can find from the vault is a page that rots.

## Miro — detection first

Miro is an optional partner. Check whether its tools are present in this session **passively** —
look at whether Miro tools are available, or whether `claude plugin list` names `miro@`.

**Never call an authenticate tool to find out.** An unauthenticated Miro session answers an auth
call with an interactive flow, and this skill must not hang waiting on a browser. If Miro is
present but not authenticated, say exactly that and point at `/harness-coach:partners`; the user
authenticates once, on purpose, and re-runs.

Absent, or present-but-unauthenticated, the whole Miro step is one line in the report:

```
Miro: not connected — skipped. The diagrams are in the notes and on the Artifact page.
```

## When Miro is connected

Use the Miro plugin's own skills rather than driving the MCP directly: `/miro-diagram` for the
flowcharts, `/miro-doc` for a companion document, `/miro-browse` first to see whether a board for
this project already exists. Those skills defer to the MCP server as the source of truth for what
the tools accept, and that server changes faster than this file.

What a board is *for*, given the notes already exist: an actor-centric view that markdown is bad
at. One frame per actor with the processes they touch, arrows crossing between frames where a
handoff happens — the picture that makes someone say "wait, why does finance touch that". Do not
re-render the per-process flowcharts onto a board; they are already legible as Mermaid.

Rules:

- **One board per project, not per run.** Browse for it, update it, never fan out new boards.
- **Write the board URL into `docs/business/overview.md`** under `## Visual`, next to the Artifact
  link. A board nobody links to is lost.
- **The board is a rendering, never the record.** If board and note disagree, the note wins, and
  the fix is to re-render.
- **Never delete a frame a person made.** Add beside it and say so in the report.
