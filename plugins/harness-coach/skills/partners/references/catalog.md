# Partner catalog

Nine entries, each: verdict (the whole pitch, caveat attached) · check · install. Adding a partner
is a markdown edit here — there is deliberately no registry file to parse. Facts dated 2026-08;
verify install lines against upstream if this file has aged.

### gh CLI — GitHub from inside the session

- **Verdict:** Claude Code drives `gh` natively — PRs, issues, releases, CI runs — with zero token
  overhead. The GitHub MCP server is deliberately not listed: PAT handling plus tool-definition
  tokens plus a restart, for marginal gain over `gh`.
- **Check:** `gh --version` (auth state: `gh auth status`)
- **Install:** `winget install --id GitHub.cli --exact --silent --accept-package-agreements --accept-source-agreements`
- **Then:** the user runs `gh auth login` themselves (interactive OAuth device flow — suggest `! gh auth login`).

### chrome-devtools — live browser debugging

- **Verdict:** inspect pages, console, network and performance traces from inside the session.
  Official plugin. Caveat: it exposes dozens of tools (~30–60) while enabled — a real context
  cost; enable it for web debugging, consider disabling it after.
- **Check:** `claude plugin list` output contains `chrome-devtools-mcp`
- **Install:** `claude plugin install chrome-devtools-mcp@claude-plugins-official`, then the user
  runs `/reload-plugins` — plugins do load mid-session. Needs Chrome installed.

### figma — design context into code

- **Verdict:** for teams implementing Figma designs — components, variables, screenshots, Code
  Connect. Official plugin; auth is a browser OAuth flow from the `/plugin` panel.
- **Check:** `claude plugin list` output contains `figma@`
- **Install:** `claude plugin install figma@claude-plugins-official`, then `/reload-plugins`, then
  the user opens `/plugin` → Installed → figma → authenticate. Guide, don't automate.

### obsidian — notes vault as a knowledge source

- **Verdict:** if the vault is just markdown files, pointing Claude at the folder needs no install
  at all — start there. Reach for the MCP path only when the REST features matter.
- **Check:** `claude mcp list` output contains `obsidian`
- **Install (MCP path):** in Obsidian, install the community plugin **Local REST API, version
  4.1.3 or later** — earlier versions have a patched path-traversal vulnerability, say so — copy
  its API key, then:
  `claude mcp add obsidian --transport http http://127.0.0.1:27123/mcp/ --header "Authorization: Bearer <key>"`
  (the plain-HTTP endpoint must be enabled in the plugin's settings; the HTTPS one uses a
  self-signed cert).
- **Caveat:** a server added with `claude mcp add` is not usable until Claude Code restarts. Setup
  is interactive end to end — guide the user, never automate it.

### miro — a shared whiteboard the session can draw on

- **Verdict:** for the diagram a stakeholder will actually look at — actor flows, process maps,
  a visual code review — on a board the team already has open. Official plugin, and its skills
  defer to the MCP server, so they track upstream rather than going stale. Caveat: the value is
  the *audience*, not the drawing. Mermaid in a committed markdown file is free, diffs in a pull
  request, and needs no login; reach for a board when people outside the repo need to see it.
- **Cost ceiling:** the free tier caps editable boards, so a team that documents on Miro hits a
  paid plan quickly. If what you actually wanted was a diagram a non-developer can edit, draw.io
  below does that in a committed file for nothing. Miro earns its price for live, many-people-at-
  once workshops — not for documentation that has to last.
- **Check:** `claude plugin list` output contains `miro@`
- **Install:** `claude plugin install miro@claude-plugins-official`, then `/reload-plugins`, then
  the user opens `/plugin` → Installed → miro → authenticate. Guide, don't automate.
- **Caveat:** auth is an interactive OAuth flow, so a headless or fresh session has the tools and
  no session — never call an authenticate tool to probe for it, or the run hangs waiting on a
  browser. Detect passively, skip with one line.

### draw.io — diagrams as committed, hand-editable files

- **Verdict:** the answer to "a stakeholder needs to edit this picture" without a subscription.
  Free, open source, no account, and the file lives in the repo and diffs in a pull request.
  `/investigation-coach:map --diagrams drawio`, `/investigation-coach:onboard --diagrams drawio` and
  `/strategy-coach:blueprint --visual drawio` all write `.drawio` XML directly, so **nothing needs
  installing to generate one** — a viewer is only needed to open it. Caveat: the format has no
  auto-layout and GitHub will not render it in-browser. Mermaid stays the better default whenever
  the person maintaining the diagram edits code.
- **Check:** `code --list-extensions` contains `hediet.vscode-drawio` (nothing to check if you only
  ever open files at app.diagrams.net)
- **Install (viewer, pick one):** `code --install-extension hediet.vscode-drawio` — opens `.drawio`
  files natively in VS Code, no account; or `winget install -e --id JGraph.Draw` for the desktop
  app; or nothing at all and drag the file onto app.diagrams.net.
- **Then:** `.drawio.svg` and `.drawio.png` are export formats that render anywhere *and* stay
  editable — export from the app when you need one embedded in a README. No skill hand-writes those.

### ast-grep — structural search and codemods

- **Verdict:** the default over grep whenever structure matters; one YAML rule with `fix:` is a
  deterministic multi-file rewrite with zero LLM drift.
- **Check:** `ast-grep --version`
- **Install:** `winget install -e --id ast-grep.ast-grep` (or `npm i -g @ast-grep/cli`)

### gsd-browser — persistent browser-automation daemon

- **Verdict:** scripted browsing for flows heavier than one-shot page checks. The most interactive
  setup in this list — never auto-anything here. On Windows run it natively from PowerShell, never
  through `wsl.exe`: the daemon dies when a one-shot WSL call returns (live upstream issue).
- **Check:** `gsd-browser --version`
- **Install:** per the upstream README (a Windows x64 binary is listed as of mid-2026; two repos
  claim the name — open-gsd/gsd-browser and gsd-build/gsd-browser — check which is current before
  trusting either).

### spec-kit — spec-driven development

- **Verdict:** specify → plan → tasks scaffolding for features that deserve a spec before code.
  Overlaps Claude Code's plan mode — reach for it on the big ones, not every ticket.
- **Check:** `specify version`
- **Install:** `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`
  (needs `uv`). Use `uv tool install`, not one-shot `uvx` — it doesn't persist, and broken `uvx`
  shims exist in the wild (`where.exe uvx` shows what would actually run).
