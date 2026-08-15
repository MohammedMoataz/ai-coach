-- AI Coach project (tenant) schema. One database file per project at
-- ~/.ai-coach/projects/<slug>/coach.db. A project is the product; it may span several
-- repositories, which the `repos` table below lists and every row records.
-- Idempotent: safe to exec on every open. Columns added after v0.1.0 must ALSO be applied
-- as explicit ALTER TABLE probes in the engine — a CREATE-only file silently ignores them
-- on a database that already exists.

-- The repositories that make up this project. Seeded from the committed .ai-coach/project.md,
-- and auto-registered when a session runs in a repo not yet listed.
CREATE TABLE IF NOT EXISTS repos (
  repo  TEXT PRIMARY KEY,              -- normalized git remote, else repo-root path
  name  TEXT,                          -- friendly label, when .ai-coach/project.md gives one
  added TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memories (
  id         INTEGER PRIMARY KEY,
  type       TEXT NOT NULL,              -- learning | note | reference | pattern (coerced in engine)
  text       TEXT NOT NULL,
  text_key   TEXT NOT NULL,              -- lower(collapsed-whitespace(text)) — indexed dedup key
  confidence REAL DEFAULT 0.7,
  -- Who actually produced this line. An agent-written memory is not a human judgment and must
  -- never be able to pass for one: the brief and /recall both show it. Nothing is auto-promoted.
  provenance TEXT DEFAULT 'human',       -- human | distilled | imported
  -- Reserved for concept tagging (how-it-works, gotcha, trade-off, ...) so a future release can
  -- filter what the brief injects instead of taking the top N wholesale. Unused in v0.1.0;
  -- the column ships now because widening a table is cheaper than breaking one.
  concepts   TEXT,
  project    TEXT,                       -- the tenant this database belongs to
  repo       TEXT,                       -- which repository of that project it came from
  source     TEXT,                       -- url | session id | manual
  author     TEXT,                       -- git user.email of whoever wrote it
  username   TEXT,                       -- git user.name — display identity
  role       TEXT,                       -- snapshot of the author's roster role when written
  task       TEXT,                       -- branch name or explicit --task tag
  workspace  INTEGER DEFAULT 0,          -- 1 = private workspace only; findable, never in the brief
  created    TEXT DEFAULT (datetime('now')),
  uses       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  project      TEXT,
  repo         TEXT,
  author       TEXT,
  username     TEXT,
  role         TEXT,
  name         TEXT,                     -- human label; unique per (project, author)
  task         TEXT,
  first_prompt TEXT,
  summary      TEXT,
  -- How badly this session went: corrections raised plus failed tool calls, as a single number.
  -- Locally this is computed live from the rows and stays NULL. It is filled only on a session
  -- imported from a teammate, because `corrections` and `observations` do not travel — they carry
  -- message text, and the privacy rule is flags and counts only. Without this, a teammate's weak
  -- prompts would show a perfect outcome rate in the pooled view purely because their failures
  -- stayed on their machine.
  outcomes     INTEGER,
  created      TEXT DEFAULT (datetime('now')),
  ended        TEXT
);

CREATE TABLE IF NOT EXISTS observations (
  id         INTEGER PRIMARY KEY,
  session_id TEXT,
  tool       TEXT,
  target     TEXT,
  digest     TEXT,
  created    TEXT DEFAULT (datetime('now'))
);

-- The moment the work went wrong is the moment worth remembering, and it is the one signal no
-- harness in this lineage captured. Written deterministically by the Notification hook — no model
-- call, no judgment, just the fact that a failure surfaced and what was being asked at the time.
CREATE TABLE IF NOT EXISTS corrections (
  id             INTEGER PRIMARY KEY,
  session_id     TEXT,
  signal         TEXT,                   -- the matched word: error | failed | wrong | ...
  message        TEXT,                   -- the notification text, truncated
  prompt_excerpt TEXT,                   -- what the session was asked, for context
  recorded       INTEGER DEFAULT 0,      -- 1 once a memory was written about it
  created        TEXT DEFAULT (datetime('now'))
);

-- What the prompt coach saw, and nothing more. Flags only: which deterministic signals fired,
-- how long the prompt was, whether a hint was shown. **The prompt text is never stored** — it can
-- carry credentials and pasted customer data, and none of that is needed to answer the only
-- question worth asking: do prompts with a given weakness lead to worse sessions?
-- Joined against `corrections` and FAIL observations by session_id. Pruned with observations.
CREATE TABLE IF NOT EXISTS prompt_signals (
  id         INTEGER PRIMARY KEY,
  session_id TEXT,
  len        INTEGER,                  -- prompt length in characters
  flags      TEXT,                     -- csv of signal ids; empty string = a clean prompt
  hinted     INTEGER DEFAULT 0,        -- 1 if a hint was actually surfaced to the user
  created    TEXT DEFAULT (datetime('now'))
);

-- Security findings: pentest/audit/scan results being triaged. LOCAL ONLY by design:
-- seedExport() is table-explicit and this table must never join it — `detail` carries
-- vulnerability evidence, which must not travel in a committed seed. The human-facing
-- copies live in gitignored .ai-coach/security/*.md, written by /security-coach:triage.
-- Both severity columns persist so a downgrade is visible: `severity_reported` is the
-- report's claim, `severity_assessed` is the team's judgment and stays NULL until made.
-- No SLA columns and no SLA defaults anywhere — sources conflict; the team owns its numbers.
CREATE TABLE IF NOT EXISTS findings (
  id                INTEGER PRIMARY KEY,
  project           TEXT,
  repo              TEXT,
  source            TEXT,                  -- pentest | audit | scan | disclosure
  title             TEXT NOT NULL,
  cwe               TEXT,                  -- fix the class, not the PoC
  severity_reported TEXT,
  severity_assessed TEXT,
  status            TEXT DEFAULT 'open',   -- open | fixing | fixed | retested | accepted-risk | false-positive
  owner             TEXT,
  detail            TEXT,                  -- evidence / repro / location; never exported
  created           TEXT DEFAULT (datetime('now')),
  updated           TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(project, status, created);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  text, content='memories', content_rowid='id'
);
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, text) VALUES (new.id, new.text);
END;
CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, text) VALUES ('delete', old.id, old.text);
END;
CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE OF text ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, text) VALUES ('delete', old.id, old.text);
  INSERT INTO memories_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE INDEX IF NOT EXISTS idx_memories_text_key ON memories(text_key);
CREATE INDEX IF NOT EXISTS idx_memories_created  ON memories(created);
CREATE INDEX IF NOT EXISTS idx_memories_repo     ON memories(repo, created);
CREATE INDEX IF NOT EXISTS idx_obs_session       ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project  ON sessions(project, created);
CREATE INDEX IF NOT EXISTS idx_sessions_branch   ON sessions(project, task, created);
CREATE INDEX IF NOT EXISTS idx_corrections_sess  ON corrections(session_id, created);
CREATE INDEX IF NOT EXISTS idx_psignals_sess      ON prompt_signals(session_id, created);
CREATE INDEX IF NOT EXISTS idx_psignals_created   ON prompt_signals(created);
