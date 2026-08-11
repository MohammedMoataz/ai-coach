#!/usr/bin/env node
'use strict';
// AI Coach engine: memory + sessions + observations + team seed. Zero dependencies.
// Requires Node >= 22.5 (node:sqlite). DB survives plugin updates (lives in ~/.ai-coach).

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const HOME = path.join(os.homedir(), '.ai-coach');
// AICOACH_DB names the USER-scope database; tenants live beside it under projects/.
// Tests point it at a temp file and get an isolated tree for free.
const DB_PATH = process.env.AICOACH_DB || path.join(HOME, 'user.db');
const ROOT = path.dirname(DB_PATH);
const PROJECTS_DIR = path.join(ROOT, 'projects');
const SCHEMA_PATH = path.join(__dirname, '..', 'memory', 'schema.sql');
const USER_SCHEMA_PATH = path.join(__dirname, '..', 'memory', 'user-schema.sql');
const LOG_PATH = process.env.AICOACH_LOG || path.join(HOME, 'log.jsonl');

// failures append here instead of vanishing — "AI Coach just stopped working" must be diagnosable
function log(where, err) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    try { if (fs.statSync(LOG_PATH).size > 512 * 1024) fs.renameSync(LOG_PATH, LOG_PATH + '.1'); } catch { /* first write */ }
    fs.appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), where, err: String((err && err.stack) || err) }) + '\n');
  } catch { /* logging must never throw */ }
}

// schema.sql is CREATE ... IF NOT EXISTS throughout, so a new COLUMN in it is silently
// ignored on a database that already exists. Every added column must also land here, or
// upgrading installs keep the old shape and every insert naming the column throws.
function migrate(d, tables) {
  const has = (t, c) => d.prepare(`PRAGMA table_info(${t})`).all().some((r) => r.name === c);
  const add = (t, c, decl) => { if (!has(t, c)) d.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${decl}`); };
  add('memories', 'username', 'TEXT');
  add('memories', 'role', 'TEXT');
  add('memories', 'repo', 'TEXT');
  add('memories', 'provenance', "TEXT DEFAULT 'human'");
  add('memories', 'concepts', 'TEXT');
  if (tables !== 'user') {
    add('sessions', 'username', 'TEXT');
    add('sessions', 'role', 'TEXT');
    add('sessions', 'name', 'TEXT');
    add('sessions', 'repo', 'TEXT');
  }
}

function open(file, schemaPath, kind) {
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new DatabaseSync(file);
  d.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
  d.exec(fs.readFileSync(schemaPath, 'utf8')); // creates anything missing
  migrate(d, kind);                            // widens anything that predates it
  return d;
}

// ---------- the fixed home ----------
// A plugin directory is explicitly ephemeral: ${CLAUDE_PLUGIN_ROOT} changes on every update and
// old versions are deleted, and one plugin cannot reach into another's files at all. So the
// engine installs a copy of itself beside the databases, at a path that never moves. That is
// how memory-coach's skills — which live in a different plugin — can call the engine that
// ai-coach-core owns. Re-copies only when the source differs, so it costs a stat on most runs.
const BIN_DIR = path.join(ROOT, 'bin');
function bootstrap() {
  try {
    const files = [
      [path.join(__dirname, 'engine.js'), path.join(BIN_DIR, 'engine.js')],
      [SCHEMA_PATH, path.join(ROOT, 'memory', 'schema.sql')],
      [USER_SCHEMA_PATH, path.join(ROOT, 'memory', 'user-schema.sql')],
    ];
    let copied = 0;
    for (const [src, dst] of files) {
      if (path.resolve(src) === path.resolve(dst)) continue; // already running from the fixed home
      const from = fs.readFileSync(src);
      let same = false;
      try { same = fs.readFileSync(dst).equals(from); } catch { /* absent */ }
      if (same) continue;
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, from);
      copied++;
    }
    return copied;
  } catch (err) { log('bootstrap', err); return 0; }
}

// ---------- the two scopes ----------
// user scope: trust, the project registry, and global memories (knowledge that belongs
// to you rather than to any product). One file, always the same path.
let _userDb = null;
function userDb() {
  if (_userDb) return _userDb;
  _userDb = open(DB_PATH, USER_SCHEMA_PATH, 'user');
  return _userDb;
}

// tenant scope: one database per project. Every hook process serves exactly one project,
// so the active tenant is resolved once and db() keeps its zero-argument signature.
const _tenants = new Map();
let _active = null;
function openTenant(key) {
  const dir = tenantDir(key);
  const file = path.join(dir, 'coach.db');
  if (_tenants.has(file)) return _tenants.get(file);
  const d = open(file, SCHEMA_PATH, 'project');
  _tenants.set(file, d);
  return d;
}
function db() {
  return openTenant(active().project);
}

function tenantSlug(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'project';
}
function tenantDir(key) {
  const known = userDb().prepare('SELECT dir FROM projects WHERE key = ?').get(key);
  if (known) return known.dir;
  let slug = tenantSlug(key);
  const taken = userDb().prepare('SELECT key FROM projects WHERE dir = ?');
  let dir = path.join(PROJECTS_DIR, slug), n = 2;
  while (taken.get(dir)) { dir = path.join(PROJECTS_DIR, slug + '-' + n); n++; } // slug collision
  userDb().prepare('INSERT OR IGNORE INTO projects(key, dir) VALUES(?,?)').run(key, dir);
  return dir;
}

// resolve identity for this process: which repo we are in, and which project it belongs to
function useProject(cwd) {
  const r = repo(cwd);
  _active = { project: project(cwd), repo: r, cwd: cwd || null };
  return _active;
}
function active() {
  return _active || useProject();
}


// option lookup: AICOACH_<KEY> env (power-user override) > plugin userConfig
// (CLAUDE_PLUGIN_OPTION_<key>, set by Claude Code from plugin.json userConfig) > default
function opt(key, fallback) {
  const v = process.env['AICOACH_' + key.toUpperCase()]
    ?? process.env['CLAUDE_PLUGIN_OPTION_' + key]
    ?? process.env['CLAUDE_PLUGIN_OPTION_' + key.toUpperCase()];
  return v == null || v === '' ? fallback : v;
}
function optOn(key, def) { // boolean options; 'off'/'false'/'0' all mean off
  const v = String(opt(key, def)).toLowerCase();
  return !(v === 'off' || v === 'false' || v === '0' || v === 'no');
}

// ---------- identity, task, project ----------

function git(args, cwd) {
  try {
    return require('node:child_process')
      .execSync('git ' + args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch { return null; }
}

let _author;
function author() {
  if (process.env.AICOACH_AUTHOR) return process.env.AICOACH_AUTHOR;
  if (_author !== undefined) return _author;
  _author = git('config user.email');
  return _author;
}

let _username;
function username() { // display identity; the email stays the key everything joins on
  if (process.env.AICOACH_USERNAME) return process.env.AICOACH_USERNAME;
  if (_username !== undefined) return _username;
  _username = git('config user.name');
  return _username;
}

const _taskCache = new Map();
function task(explicit, cwd) {
  if (explicit) return String(explicit);
  if (process.env.AICOACH_TASK) return process.env.AICOACH_TASK;
  const key = String(cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (_taskCache.has(key)) return _taskCache.get(key);
  const b = git('rev-parse --abbrev-ref HEAD', key);
  const t = b && b !== 'main' && b !== 'master' && b !== 'HEAD' ? b : null; // mainline/detached = not a task
  _taskCache.set(key, t);
  return t;
}
function taskSlug(t) { // branch names contain slashes; filenames must not
  return String(t).replace(/[^\w.-]+/g, '-');
}

// project identity is portable: the git remote URL when there is one (same repo = same
// project on every teammate's machine), else the repo-root path. Raw-cwd identity broke
// imports (teammate's absolute path never matched yours) and Windows case differences.
function normalizeRemote(url) {
  let u = String(url).trim().toLowerCase().replace(/\.git$/, '');
  const ssh = u.match(/^[\w.+-]+@([^:/]+):(.+)$/); // git@host:org/repo
  if (ssh) return ssh[1] + '/' + ssh[2];
  return u.replace(/^[a-z+]+:\/\//, '').replace(/^[^@/]+@/, ''); // scheme, then credentials
}
const _repoCache = new Map();
function repo(cwd) { // identity of ONE repository
  const key = String(cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (_repoCache.has(key)) return _repoCache.get(key);
  const remote = git('remote get-url origin', key);
  const p = remote ? normalizeRemote(remote)
    : (git('rev-parse --show-toplevel', key) || key).replace(/\\/g, '/').toLowerCase();
  _repoCache.set(key, p);
  return p;
}

// A project is a product, which may be several repositories: a backend and a frontend,
// or a fleet of services. Each repo declares its project in a committed .ai-coach/project.md;
// an undeclared repo is its own project, so single-repo work behaves exactly as before.
function projectFile(cwd) {
  return path.join(String(cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()), '.ai-coach', 'project.md');
}
function projectDecl(cwd) {
  const out = { name: null, repos: [] };
  try {
    for (const line of fs.readFileSync(projectFile(cwd), 'utf8').split('\n')) {
      const n = line.match(/^\s*name:\s*(.+?)\s*$/i);
      if (n) { out.name = n[1].toLowerCase(); continue; }
      const r = line.match(/^\s*[-*]\s*(\S+)\s*$/); // members of the `repos:` list
      if (r) out.repos.push(r[1].toLowerCase());
    }
  } catch { /* undeclared — the repo is its own project */ }
  return out;
}
const _projCache = new Map();
function project(cwd) { // identity of the TENANT: env > .ai-coach/project.md > this repo
  const key = String(cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (_projCache.has(key)) return _projCache.get(key);
  const p = (process.env.AICOACH_PROJECT || projectDecl(cwd).name || repo(cwd)).toLowerCase();
  _projCache.set(key, p);
  return p;
}

// repos are members of a project, recorded inside the tenant so the project knows its
// own shape. Auto-registered on first sight: never a blocker, only a record.
function registerRepo(r, name) {
  if (!r) return null;
  db().prepare('INSERT OR IGNORE INTO repos(repo, name) VALUES(?,?)').run(String(r).toLowerCase(), name || null);
  return r;
}
function repoList() {
  return db().prepare('SELECT * FROM repos ORDER BY added, repo').all();
}
function projectList() {
  return userDb().prepare('SELECT * FROM projects ORDER BY key').all();
}

// ---------- team directory (shared) and trust (private) ----------

function teamFile(cwd) {
  return path.join(String(cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()), '.ai-coach', 'team.md');
}

// .ai-coach/team.md is a shared DIRECTORY — who is on this project and what they do:
//   - Sara Malik <sara@example.com> — role: tech-lead
// It carries no judgments. Trust is private (see below): "this teammate is not trusted
// yet" is not something anyone should have to commit to a shared repository.
function roster(cwd) {
  const map = {};
  try {
    for (const line of fs.readFileSync(teamFile(cwd), 'utf8').split('\n')) {
      const email = line.match(/[\w.+-]+@[\w.-]+\w/);
      if (!email) continue;
      const name = line.match(/^\s*[-*]\s*([^<(]+?)\s*[<(]/);
      const role = line.match(/role:\s*([\w-]+)/i);
      map[email[0].toLowerCase()] = {
        name: name ? name[1].trim() : null,
        role: role ? role[1].toLowerCase() : null,
      };
    }
  } catch { /* no roster — solo work needs no ceremony */ }
  return map;
}

function roleOf(email, cwd) {
  if (process.env.AICOACH_ROLE) return process.env.AICOACH_ROLE;
  const r = roster(cwd)[String(email || '').toLowerCase()];
  return (r && r.role) || null;
}

// Trust lives in USER scope, not in a tenant: you rate a person once, and that judgment
// holds in every project you share with them.
const TRUST_LEVELS = new Set(['full', 'workspace']);
function setTrust(email, level, note) {
  const lvl = TRUST_LEVELS.has(String(level).toLowerCase()) ? String(level).toLowerCase() : 'full';
  userDb().prepare(`INSERT INTO trust(email, level, note, updated) VALUES(?,?,?,datetime('now'))
     ON CONFLICT(email) DO UPDATE SET level = excluded.level, note = excluded.note, updated = datetime('now')`)
    .run(String(email).toLowerCase(), lvl, note || null);
  return lvl;
}
function trustList() { return userDb().prepare('SELECT * FROM trust ORDER BY email').all(); }

// Your private table wins; absent an entry, the configured default applies. Trust is never
// read from the shared roster — that file is a directory of people, not a set of judgments.
function trustLevel(email) {
  const fallback = String(opt('default_trust', 'full')).toLowerCase();
  if (!email) return fallback;
  const row = userDb().prepare('SELECT level FROM trust WHERE email = ?').get(String(email).toLowerCase());
  return row ? row.level : fallback;
}

// ---------- memories ----------

const TYPES = new Set(['learning', 'note', 'reference', 'pattern']);
// 'human' wrote it; 'distilled' means a model compressed it out of a session; 'imported'
// came from a teammate's seed. There is deliberately no path that upgrades one to another —
// an agent is not an approval boundary, so its output stays labelled forever.
const PROVENANCE = new Set(['human', 'distilled', 'imported']);
function norm(text) { return String(text).toLowerCase().replace(/\s+/g, ' ').trim(); }

// `proj` is a WORKING DIRECTORY, not an identity. Pass explicit identity through
// `extra.project` / `extra.repo` (imports do, so they never shell out to git per row).
// No project at all = a global memory: it belongs to you, not to a product.
function add(type, text, confidence, proj, source, extra) {
  const x = extra || {};
  const au = x.author !== undefined ? x.author : author();
  const p = x.project !== undefined ? x.project : (proj ? project(proj) : null);
  const r = x.repo !== undefined ? x.repo : (proj ? repo(proj) : null);
  const target = p ? openTenant(p) : userDb();
  if (p) registerRepoIn(target, r);
  target.prepare('INSERT INTO memories(type,text,text_key,confidence,provenance,project,repo,source,author,username,role,task,workspace) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(TYPES.has(type) ? type : 'note', String(text), norm(text),
      confidence == null ? 0.7 : Number(confidence),
      // who actually produced this line. A model-distilled memory must never be able to pass
      // for a human judgment: brief and /recall both show it, and nothing promotes it.
      PROVENANCE.has(x.provenance) ? x.provenance : 'human',
      p, r, source || null, au,
      x.username !== undefined ? x.username : username(),
      // snapshot the role: grouping by "what the testers found" must not shift when
      // someone's role later changes in the roster
      x.role !== undefined ? x.role : roleOf(au, proj),
      x.task !== undefined ? x.task : task(null, proj),
      x.workspace ? 1 : 0);
}
function registerRepoIn(d, r) {
  if (!r) return;
  try { d.prepare('INSERT OR IGNORE INTO repos(repo) VALUES(?)').run(String(r).toLowerCase()); } catch { /* older tenant */ }
}
function forget(id) { // ids are per-database, so try the tenant, then user scope
  for (const d of [db(), userDb()]) {
    const row = d.prepare('SELECT text FROM memories WHERE id = ?').get(Number(id));
    if (!row) continue;
    d.prepare('DELETE FROM memories WHERE id = ?').run(Number(id));
    return row.text; // echo what died — terminal history is the trash can
  }
  return null;
}
function hasText(text) { // dedup is on the normalized key: case/whitespace variants are the same fact
  const k = norm(text);
  return [db(), userDb()].some((d) => !!d.prepare('SELECT 1 FROM memories WHERE text_key = ? LIMIT 1').get(k));
}

function ftsQuery(q) {
  const terms = String(q).match(/[A-Za-z0-9_.\-]+/g) || [];
  return terms.length ? terms.map((t) => '"' + t + '"').join(' OR ') : null;
}

function ageDays(row) { // decay from created only — reading a memory must not reset its clock
  const ref = String(row.created || '').replace(' ', 'T');
  const t = Date.parse(ref + (ref.endsWith('Z') ? '' : 'Z'));
  return Number.isNaN(t) ? 0 : Math.max(0, (Date.now() - t) / 86400000);
}
// type-based decay: durable knowledge fades slower than perishable pointers
const DECAY_DAYS = { learning: 90, pattern: 90, reference: 45 }; // default 30 (notes etc.)
function score(row) {
  return (row.confidence == null ? 0.5 : row.confidence)
    * Math.exp(-ageDays(row) / (DECAY_DAYS[row.type] || 30));
}

// Searches this project plus your global memories — the environment traps that belong to
// you, not to a product, must stay findable from inside any project. `all` fans out over
// every registered project; `repo` narrows to one repository of this one.
// `limit` caps the short-line preview only, so recall stays cheap by default. `full`
// returns everything that matched — expanding a search must never hide a hit.
function search(q, opts) {
  const { limit = 8, full = false, task: t, author: au, role: rl, user: un, repo: rp, all = false } = opts || {};
  const cap = full ? Infinity : limit;
  const fq = ftsQuery(q);
  if (!fq) return [];
  let sql = `SELECT m.* FROM memories_fts f JOIN memories m ON m.id = f.rowid
     WHERE memories_fts MATCH ?`;
  const params = [fq];
  if (t) { sql += ' AND m.task = ?'; params.push(t); }
  if (au) { sql += ' AND m.author = ?'; params.push(au); }
  if (rl) { sql += ' AND lower(m.role) = ?'; params.push(String(rl).toLowerCase()); }
  if (un) { sql += ' AND lower(m.username) = ?'; params.push(String(un).toLowerCase()); }
  if (rp) { sql += ' AND lower(m.repo) = ?'; params.push(String(rp).toLowerCase()); }
  sql += ' ORDER BY rank';
  if (Number.isFinite(cap)) { sql += ' LIMIT ?'; params.push(cap); }

  const scopes = all
    ? [userDb(), ...projectList().map((p) => openTenant(p.key))]
    : [db(), userDb()];
  const seen = new Set();
  const rows = [];
  for (const d of scopes) {
    let hit = [];
    try { hit = d.prepare(sql).all(...params); } catch (err) { log('search', err); continue; }
    const bump = d.prepare('UPDATE memories SET uses = uses + 1 WHERE id = ?'); // counter only; never ranking
    for (const r of hit) {
      bump.run(r.id);
      const k = r.text_key || norm(r.text);
      if (seen.has(k)) continue; // the same fact known in two scopes is one hit
      seen.add(k);
      rows.push(r);
    }
  }
  const ranked = rows.sort((a, b) => score(b) - score(a));
  return (Number.isFinite(cap) ? ranked.slice(0, cap) : ranked)
    .map((r) => ({ ...r, _display: full ? null : shortLine(r) }));
}

function shortLine(r) {
  const t = r.text.length > 100 ? r.text.slice(0, 100) + '...' : r.text;
  return `#${r.id} [${r.type}]${r.workspace ? ' [workspace]' : ''} ${t} (conf ${Number(r.confidence).toFixed(2)})`;
}

const BRANCH_SHARE = 0.4; // reserved slice of the cap — general memories must not crowd out
                          // the history of the branch you just checked out

function brief(maxChars, proj) {
  const cap = maxChars || 4000;
  if (proj) useProject(proj); // the tenant must match the directory we were asked about
  const p = project(proj);
  const r = repo(proj);
  const t = task(null, proj);
  const out = [];
  let used = 0;
  const push = (line, budget) => { // every line counts against the cap, headers included
    if (used + line.length + 1 > (budget || cap)) return false;
    out.push(line); used += line.length + 1;
    return true;
  };
  const last = db().prepare(
    `SELECT first_prompt, summary, created FROM sessions
     WHERE project = ? AND (summary IS NOT NULL OR first_prompt IS NOT NULL)
     ORDER BY created DESC, rowid DESC LIMIT 1`
  ).get(p);
  if (last) push(`Last session here (${String(last.created).slice(0, 16)}): ${last.summary || last.first_prompt}`);

  // The coach line. One signal, the highest-priority one that is actually true right now —
  // several lines of advice per session is noise, and noise is what gets switched off.
  // Silence is the correct output when there is nothing to say.
  const coach = coachLine(p, t);
  if (coach) push('coach: ' + coach);

  // branch section: prior work on THIS branch is recalled automatically — that is the
  // context you cannot be expected to ask for, because you do not know it exists yet
  const shown = new Set();
  if (t) {
    const prior = db().prepare(
      `SELECT id, project, name, username, author, role, summary, first_prompt, created FROM sessions
       WHERE project = ? AND task = ? AND (summary IS NOT NULL OR first_prompt IS NOT NULL)
       ORDER BY created DESC, rowid DESC`
    ).all(p, t);
    const branchMem = db().prepare(
      `SELECT * FROM memories WHERE workspace IS NOT 1 AND project = ? AND task = ?
       ORDER BY created DESC, id DESC`
    ).all(p, t);
    if (prior.length || branchMem.length) {
      const budget = used + Math.floor(cap * BRANCH_SHARE);
      push(`On this branch (${t}):`, budget);
      for (const s of prior) {
        const who = s.username || s.author || 'unknown';
        if (!push(`- ${sessionLabel(s)} · ${who}${s.role ? ' (' + s.role + ')' : ''} · ${s.summary || s.first_prompt}`, budget)) break;
      }
      for (const m of branchMem) {
        if (!push(`- [${m.type} #${m.id}] ${m.text}`, budget)) break;
        shown.add(m.id);
      }
    }
  }

  // Affine ranking within the project: your own repo outranks a sibling service, which
  // outranks your global knowledge. Workspace rows never enter.
  // Every memory is a candidate — nothing is excluded from ranking before it has been
  // scored, so an old but strong memory can still win. The character cap is the only
  // limit on what reaches the session, and it applies after ranking, not before.
  const w = (m) => score(m) * (m.repo === r ? 1.5 : 1) * (t && m.task === t ? 1.5 : 1);
  const window = 'SELECT * FROM memories WHERE workspace IS NOT 1 ORDER BY created DESC, id DESC';
  const rows = db().prepare(window).all()
    .concat(userDb().prepare(window).all()) // global memories travel into every project
    .filter((m) => !shown.has(m.id))
    .sort((a, b) => w(b) - w(a));
  if (rows.length) push('Top memories:');
  // Reserve room for the truncation marker. Silent truncation reads as "that was everything",
  // which is the one thing a memory brief must never imply.
  const room = cap - MARKER_RESERVE;
  let dropped = 0;
  for (const m of rows) {
    if (dropped || !push(`- [${m.type} #${m.id}] ${m.text}${tags(m, r, t, p)}`, room)) dropped++;
  }
  if (dropped) out.push(`- … ${dropped} more ranked below the cap — /memory-coach:recall to search, or raise brief_chars.`);
  return out.join('\n');
}

const MARKER_RESERVE = 90;

// Say why a line is here. The reader learns the ranking model by reading their own brief,
// which is cheaper than documenting it and more likely to be believed.
function tags(m, r, t, p) {
  const out = [];
  if (t && m.task === t) out.push('branch');
  else if (m.project == null) out.push('global');
  else if (m.repo && r && m.repo !== r) out.push('sibling repo');
  const me = author();
  if (m.author && me && m.author !== me) out.push('from ' + (m.username || m.author));
  if (m.provenance === 'distilled') out.push('distilled');
  else if (m.provenance === 'imported') out.push('imported');
  return out.length ? '  · ' + out.join(', ') : '';
}

// Priority order, first true one wins: an unrecorded failure beats a handoff hint, because
// the thing you already hit and did not write down is the thing you are about to hit again.
function coachLine(p, t) {
  if (!optOn('coach', 'on')) return null;
  try {
    const open = corrections({ unrecordedOnly: true, limit: 50 });
    if (open.length) {
      const n = open.length;
      return `${n} failure${n > 1 ? 's' : ''} surfaced here and nothing was written down — `
        + 'worth one memory before it repeats.';
    }
    if (t) {
      const me = author();
      const others = db().prepare(
        `SELECT DISTINCT COALESCE(username, author) AS who FROM sessions
         WHERE project = ? AND task = ? AND author IS NOT NULL AND author <> COALESCE(?, '')`
      ).all(p, t, me).map((x) => x.who).filter(Boolean);
      if (others.length) {
        return `this branch was worked by ${others.slice(0, 2).join(' and ')} — you are picking up their work, not starting fresh.`;
      }
    }
    // Prompt-shaped advice comes last and only with evidence behind it. A signal that merely
    // fires often proves nothing; it has to fire often AND correlate with sessions that actually
    // went wrong. Below the thresholds this stays silent rather than moralising about style.
    const st = promptStats({ days: 30 });
    const worst = st.signals.find((s) => s.count >= 5 && s.lift != null && s.lift >= 1.5);
    if (worst) {
      const pct = Math.round((worst.lift - 1) * 100);
      return `your prompts flagged "${worst.id}" ${worst.count} times in 30 days, and those sessions `
        + `hit ${pct}% more corrections than your clean ones — /prompt-coach:prompt-stats for the detail.`;
    }
  } catch (err) { log('coachLine', err); }
  return null;
}

// ---------- sessions & observations ----------

function sessionStart(id, proj, name) {
  if (!id) return null;
  if (proj) useProject(proj);
  const existing = db().prepare('SELECT name FROM sessions WHERE id = ?').get(id);
  if (existing) { // resumed or mid-session call — never re-stamp identity
    if (name) return nameSession(id, name);
    return existing.name;
  }
  const p = project(proj), r = repo(proj), au = author(), t = task(null, proj);
  const label = name || autoName(p, t);
  registerRepoIn(db(), r); // the project learns its own shape as repos show up
  db().prepare('INSERT INTO sessions(id, project, repo, author, username, role, name, task) VALUES(?,?,?,?,?,?,?,?)')
    .run(id, p, r, au, username(), roleOf(au, proj), label, t);
  return label;
}

// a session always has a name — an unnamed one is invisible in a team's history
function autoName(p, t) {
  const who = String(username() || String(author() || 'dev').split('@')[0]).toLowerCase();
  const base = `${taskSlug(t || 'main')}-${taskSlug(who)}`;
  const taken = db().prepare('SELECT name FROM sessions WHERE project = ? AND name LIKE ?').all(p, base + '%')
    .map((r) => r.name);
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(base + '-' + n)) n++;
  return base + '-' + n;
}
function nameSession(id, label) {
  const l = String(label).trim().slice(0, 80);
  db().prepare('UPDATE sessions SET name = ? WHERE id = ?').run(l, id);
  return l;
}
// two teammates may pick the same label; the name is a label, not a key, so disambiguate
// on display rather than refusing the name
function sessionLabel(row) {
  if (!row.name) return String(row.id || '').slice(0, 8);
  const clash = db().prepare(
    "SELECT 1 FROM sessions WHERE project = ? AND name = ? AND IFNULL(author,'') <> IFNULL(?,'') LIMIT 1"
  ).get(row.project, row.name, row.author);
  return clash ? `${row.name}@${row.username || row.author || 'unknown'}` : row.name;
}
function firstPrompt(id, prompt) {
  if (!id || !prompt) return;
  db().prepare('UPDATE sessions SET first_prompt = ? WHERE id = ? AND first_prompt IS NULL')
    .run(String(prompt).slice(0, 300), id);
}
function observe(sessionId, tool, target, digest) {
  db().prepare('INSERT INTO observations(session_id, tool, target, digest) VALUES(?,?,?,?)')
    .run(sessionId || null, tool || '', String(target || '').slice(0, 300), String(digest || '').slice(0, 300));
}

// ---------- corrections ----------
// The moment something went wrong is the moment worth keeping, and it is the one signal none
// of the harnesses this was built from ever captured. Recorded deterministically: no model
// call, no judgment about whose fault it was — just that a failure surfaced, and what was
// being asked at the time. `recorded` flips once a memory has been written about it, which is
// what lets the brief say "you hit this twice and wrote nothing down".
const SIGNALS = /\b(error|failed|failure|incorrect|wrong|mistake|deprecated|broken)\b/i;
function correctionSignal(text) {
  const m = SIGNALS.exec(String(text || ''));
  return m ? m[1].toLowerCase() : null;
}
function correction(sessionId, message, signal) {
  const sig = signal || correctionSignal(message);
  if (!sig) return null;
  const s = sessionId
    ? db().prepare('SELECT first_prompt FROM sessions WHERE id = ?').get(sessionId)
    : null;
  db().prepare('INSERT INTO corrections(session_id, signal, message, prompt_excerpt) VALUES(?,?,?,?)')
    .run(sessionId || null, sig, String(message || '').slice(0, 500),
      s && s.first_prompt ? String(s.first_prompt).slice(0, 200) : null);
  return sig;
}
function corrections(opts) {
  const { sessionId, unrecordedOnly = false, limit = 20 } = opts || {};
  let sql = 'SELECT * FROM corrections WHERE 1=1';
  const params = [];
  if (sessionId) { sql += ' AND session_id = ?'; params.push(sessionId); }
  if (unrecordedOnly) sql += ' AND recorded = 0';
  sql += ' ORDER BY created DESC, id DESC LIMIT ?';
  params.push(limit);
  try { return db().prepare(sql).all(...params); } catch (err) { log('corrections', err); return []; }
}
function markCorrectionsRecorded(ids) {
  if (!ids || !ids.length) return 0;
  const stmt = db().prepare('UPDATE corrections SET recorded = 1 WHERE id = ?');
  let n = 0;
  for (const id of ids) { stmt.run(Number(id)); n++; }
  return n;
}
function sessionEnd(id, summary) {
  if (!id) return;
  db().prepare("UPDATE sessions SET summary = COALESCE(?, summary), ended = datetime('now') WHERE id = ?")
    .run(summary ? String(summary).slice(0, 500) : null, id);
}
function sessionActivity(id, maxRows) {
  const s = db().prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  // last N, oldest-first — a long session's conclusion is where the learnings live
  const obs = db().prepare('SELECT tool, target, digest FROM observations WHERE session_id = ? ORDER BY id DESC LIMIT ?')
    .all(id, maxRows || 40).reverse();
  return { session: s, observations: obs };
}
// ---------- prompt signals ----------
// Deterministic detectors over the prompt string. They live here rather than in the hook so the
// hook, the stats query and the tests all read one table, and so a rule can be unit-tested without
// spawning a process. Order in the array is only cosmetic; `weight` decides which hints surface.
//
// Every rule is a bet on a weakness of the current models, and bets go stale — each carries the
// date and source it came from, so a later release can retire one instead of accreting forever.

// Exploratory prompts are BLESSED usage, not sloppiness: code.claude.com/docs/en/best-practices
// says "A prompt like 'what would you improve in this file?' can surface things you wouldn't have
// thought to ask about." Coaching those is how a coach gets switched off. Detect and stay silent.
const QUESTION_OPENER = /^\s*(what|how|why|where|which|who|when|is|are|does|do|did|can you (tell|explain|describe)|explain|describe|tell me|any thoughts|thoughts on)\b/i;
const VERBS = 'add|build|create|implement|write|fix|change|update|refactor|remove|delete|rename|move|extract|migrate|convert|replace|switch|optimi[sz]e|clean|make|set|wire|hook|install|configure|generate|run|test|document|keep|use';
const IMPERATIVE = new RegExp('^\\s*(?:please\\s+)?(' + VERBS + ')\\b', 'i');
// Anywhere in the text, not just at the start. "In @src/total.ts switch rounding to half-up.
// … do not touch the tax code." carries a perfectly good positive instruction — it just does not
// open with one. Judging that on the first word flagged an out-of-scope clause, which is exactly
// the habit the coach is meant to encourage.
const IMPERATIVE_ANY = new RegExp('\\b(' + VERBS + ')\\b', 'i');
const NEGATION = /\b(?:don'?t|do not|never|avoid|no longer|stop)\b/i;
const HAS_REF = /@[\w./\\-]|`[^`]+`|\b[\w-]{2,}\.(?:js|mjs|cjs|ts|tsx|jsx|py|md|json|yml|yaml|css|scss|html|sql|ps1|sh|go|rs|java|rb|php|c|h|cpp|cs|vue|svelte|toml|txt)\b/;
// Note the absence of a bare `build`: "build a CSV export" is the ASK, not the criterion, and
// listing it here made the rule cancel itself on every prompt that opened with that verb.
// "the build passes" is caught by `passes` instead.
const DONE_CRITERIA = /\b(test|tests|verify|verifies|should|so that|acceptance|done when|passes|passing|green|expect|assert|screenshot|lint)\b/i;
const SCOPE_CLAUSE = /\b(only|out of scope|don'?t touch|do not touch|leave .* alone|without changing|no new (deps|dependencies))\b/i;

const PROMPT_RULES = [
  { id: 'deictic-no-path', weight: 5, // 2026-08 · keka baseline #1
    hint: '"this file" is ambiguous — reference it with @path.',
    test: (p) => /\b(this|that|the) (file|function|component|class|module|method|test)\b/i.test(p) && !p.includes('@') },

  { id: 'action-no-ref', weight: 5, // 2026-08 · keka baseline #2
    hint: 'Name the file and the symptom (@path refs help).',
    test: (p) => /^\s*(?:please\s+)?(fix|improve|update|optimi[sz]e|clean|refactor|make)\b/i.test(p) && !HAS_REF.test(p) },

  { id: 'no-done-criteria', weight: 5, // 2026-08 · keka baseline #3
    hint: 'State what done looks like — a test, a behavior, an acceptance line.',
    test: (p) => /^\s*(?:please\s+)?(build|create|implement|add|write|generate)\b/i.test(p) && !DONE_CRITERIA.test(p) },

  { id: 'multi-ask', weight: 4, // 2026-08 · keka baseline #4
    hint: 'Large multi-part ask — consider plan mode, or split it.',
    test: (p) => p.length > 600 && (p.match(/\b(and|also|then|plus)\b/gi) || []).length > 6 },

  { id: 'hedged-opener', weight: 4, // 2026-08 · platform.claude.com "Tool usage"
    hint: '"Can you…" invites a suggestion. Say "Change X" if you want the edit made.',
    test: (p) => /^\s*(can you|could you|would you|might you|do you think you could|what if you|should we|shall we)\b/i.test(p) },

  { id: 'negative-only', weight: 3, // 2026-08 · platform.claude.com "Control the format of responses"
    hint: 'Say what to do, not only what to avoid — positive instructions land better.',
    // Fires only when the prompt is negation and nothing else. The negated clauses are removed
    // first, because the verb inside "don't USE the legacy client" is not a positive instruction —
    // matching it would silence the rule on precisely the prompts it exists for.
    test: (p) => {
      if (!NEGATION.test(p)) return false;
      const positive = p.replace(new RegExp(NEGATION.source + '[^.;\\n]*', 'gi'), '');
      return !IMPERATIVE_ANY.test(positive);
    } },

  { id: 'paste-after-ask', weight: 3, // 2026-08 · platform.claude.com "Long context prompting"
    hint: 'Put the long input first and the ask last — it measurably improves long prompts.',
    test: (p) => {
      if (p.length < 1200) return false;
      const head = p.slice(0, Math.floor(p.length * 0.3));
      const tail = p.slice(Math.floor(p.length * 0.7));
      const lines = (s) => s.split('\n').length;
      return lines(tail) > lines(head) * 2; // the bulk arrived after the request
    } },

  { id: 'caps-emphasis', weight: 2, // 2026-08 · platform.claude.com: emphasis now OVERtriggers
    hint: 'Heavy CRITICAL/MUST emphasis now overtriggers — one clear instruction reads better.',
    test: (p) => (p.match(/\b(CRITICAL|IMPORTANT|YOU MUST|MUST NOT|NEVER EVER|ALWAYS)\b/g) || []).length >= 3 },

  { id: 'no-scope-clause', weight: 2, // 2026-08 · platform.claude.com "Overeagerness"
    hint: 'Say what is out of scope, or expect more changed than you asked for.',
    test: (p) => p.length > 200 && /^\s*(?:please\s+)?(build|create|implement|add|refactor|migrate)\b/i.test(p) && !SCOPE_CLAUSE.test(p) },
];

// Returns { exempt, flags[], hints[] }. `exempt` means the prompt is a question or exploration —
// legitimate usage that must never be coached.
function evaluatePrompt(text, maxHints) {
  const p = String(text || '');
  const out = { exempt: false, flags: [], hints: [] };
  if (QUESTION_OPENER.test(p) || (/\?\s*$/.test(p.trim()) && !IMPERATIVE.test(p))) {
    out.exempt = true;
    return out;
  }
  const fired = PROMPT_RULES.filter((r) => { try { return r.test(p); } catch { return false; } });
  out.flags = fired.map((r) => r.id);
  out.hints = fired.slice().sort((a, b) => b.weight - a.weight)
    .slice(0, maxHints == null ? 2 : maxHints).map((r) => r.hint);
  return out;
}

function promptSignal(sessionId, len, flags, hinted) {
  db().prepare('INSERT INTO prompt_signals(session_id, len, flags, hinted) VALUES(?,?,?,?)')
    .run(sessionId || null, Number(len) || 0,
      Array.isArray(flags) ? flags.join(',') : String(flags || ''), hinted ? 1 : 0);
}

// Does a weak prompt actually cost you anything? Joins signals against the outcomes v0.1.0 already
// records — corrections raised, and tool failures. Computed live from the rows; never a stored
// constant. `lift` is a ratio against sessions where the signal did NOT fire, so a signal that
// fires everywhere cannot look damning by volume alone.
function promptStats(opts) {
  const { days = 30 } = opts || {};
  const since = `-${Number(days) || 30} days`;
  const rows = db().prepare(
    `SELECT ps.session_id AS sid, ps.flags AS flags,
            (SELECT COUNT(*) FROM corrections c WHERE c.session_id = ps.session_id) AS corr,
            (SELECT COUNT(*) FROM observations o WHERE o.session_id = ps.session_id
               AND o.digest LIKE 'FAIL %') AS fails
       FROM prompt_signals ps
      WHERE ps.created >= datetime('now', ?)`
  ).all(since);

  const total = rows.length;
  const per = new Map();
  let cleanCount = 0, cleanBad = 0;
  for (const r of rows) {
    const bad = (r.corr || 0) + (r.fails || 0);
    const ids = String(r.flags || '').split(',').filter(Boolean);
    if (!ids.length) { cleanCount++; cleanBad += bad; continue; }
    for (const id of ids) {
      const e = per.get(id) || { id, count: 0, bad: 0 };
      e.count++; e.bad += bad;
      per.set(id, e);
    }
  }
  const cleanRate = cleanCount ? cleanBad / cleanCount : 0;
  const signals = [...per.values()].map((e) => {
    const rate = e.bad / e.count;
    return { ...e, rate, lift: cleanRate > 0 ? rate / cleanRate : null };
  }).sort((a, b) => b.count - a.count);
  return { total, clean: cleanCount, cleanRate, days: Number(days) || 30, signals };
}

function pruneObservations(days) { // observations are session fuel, not knowledge — they expire
  // `days || 30` would turn an explicit 0 into 30, because 0 is falsy — so "prune everything"
  // silently became "prune nothing recent". Check for absence, not for falsiness.
  const keep = days == null || Number.isNaN(Number(days)) ? 30 : Number(days);
  // Sign has to be built, not string-concatenated: '-' + -1 yields '--1 days', which SQLite
  // ignores silently, and the prune then deletes nothing while reporting success. A negative
  // window means "everything, including rows written this second" — which is also the only
  // way to prune deterministically, since datetime('now') has one-second granularity.
  const cutoff = (keep < 0 ? '+' : '-') + Math.abs(keep) + ' days';
  const n = db().prepare("DELETE FROM observations WHERE created < datetime('now', ?)")
    .run(cutoff).changes;
  // prompt signals expire on the same clock and for the same reason
  db().prepare("DELETE FROM prompt_signals WHERE created < datetime('now', ?)").run(cutoff);
  return n;
}

// ---------- team seed (git is the transport) ----------

// The seed is committed to a repository, so it is readable by everyone with repo access.
// AES-256-GCM with a shared passphrase closes that; the auth tag doubles as the tamper
// check, which is why there is no separate signature.
function seedKey(dir) {
  if (process.env.AICOACH_SEED_KEY) return process.env.AICOACH_SEED_KEY;
  try {
    const k = fs.readFileSync(path.join(String(dir || process.cwd()), '.ai-coach', 'seed.key'), 'utf8').trim();
    return k || null;
  } catch { return null; }
}
function seal(text, pass) {
  const crypto = require('node:crypto');
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', crypto.scryptSync(pass, salt, 32), iv);
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return JSON.stringify({
    v: 1, alg: 'aes-256-gcm', kdf: 'scrypt',
    salt: salt.toString('base64'), iv: iv.toString('base64'),
    tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64'),
  }) + '\n';
}
function unseal(raw, pass) {
  const crypto = require('node:crypto');
  const env = JSON.parse(raw);
  const d = crypto.createDecipheriv('aes-256-gcm',
    crypto.scryptSync(pass, Buffer.from(env.salt, 'base64'), 32), Buffer.from(env.iv, 'base64'));
  d.setAuthTag(Buffer.from(env.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(env.ct, 'base64')), d.final()]).toString('utf8');
}
function isSealed(raw) {
  try { const o = JSON.parse(String(raw).trim()); return !!(o && o.alg === 'aes-256-gcm' && o.ct); } catch { return false; }
}

// Exports the WHOLE project by default — a teammate picking up any repo of a product
// should get the whole picture. `repo` narrows it to one service.
function seedExport(file, opts) {
  const o = opts || {};
  // workspace rows never re-export: they are someone else's claim, held privately, not yours to pass on
  let sql = 'SELECT type, text, confidence, project, repo, source, author, username, role, task, created FROM memories WHERE workspace IS NOT 1';
  const params = [];
  if (o.task) { sql += ' AND task = ?'; params.push(o.task); }
  if (o.repo) { sql += ' AND lower(repo) = ?'; params.push(String(o.repo).toLowerCase()); }
  sql += ' ORDER BY id';
  const rows = db().prepare(sql).all(...params);
  const lines = rows.map((r) => JSON.stringify(r));

  // session rows carry who did what on which branch. Tagged with `kind`; they have no
  // `text`, and every importer skips rows without one, so older AI Coach versions ignore them.
  let sessions = [];
  if (o.sessions !== false) {
    let ssql = `SELECT id, name, username, author, role, repo, task, summary, created FROM sessions
       WHERE summary IS NOT NULL`;
    const sp = [];
    if (o.task) { ssql += ' AND task = ?'; sp.push(o.task); }
    if (o.repo) { ssql += ' AND lower(repo) = ?'; sp.push(String(o.repo).toLowerCase()); }
    ssql += ' ORDER BY created DESC, rowid DESC'; // a handoff carries the whole history
    sessions = db().prepare(ssql).all(...sp);
    for (const s of sessions) lines.push(JSON.stringify({ kind: 'session', ...s }));
  }

  const body = lines.join('\n') + (lines.length ? '\n' : '');
  const pass = o.encrypt ? seedKey(o.dir || process.cwd()) : null;
  if (o.encrypt && !pass) throw new Error('encryption requested but no key: set AICOACH_SEED_KEY or create .ai-coach/seed.key');
  fs.writeFileSync(file, pass ? seal(body, pass) : body);
  return { memories: rows.length, sessions: sessions.length, encrypted: !!pass };
}

function seedImport(file, dir) {
  let raw = fs.readFileSync(file, 'utf8');
  let encrypted = false;
  if (isSealed(raw)) {
    const pass = seedKey(dir);
    if (!pass) throw new Error('seed is encrypted but no key: set AICOACH_SEED_KEY or create .ai-coach/seed.key');
    try { raw = unseal(raw, pass); } catch { throw new Error('seed could not be decrypted — wrong key, or the file was altered'); }
    encrypted = true;
  }
  if (dir) useProject(dir);
  const here = project(dir);       // imported rows join the project doing the importing
  const lines = raw.split('\n').filter((l) => l.trim());
  const find = db().prepare('SELECT id, author, workspace FROM memories WHERE text_key = ? LIMIT 1');
  const findSession = db().prepare('SELECT id FROM sessions WHERE id = ?');
  let added = 0, dup = 0, workspace = 0, promoted = 0, sessions = 0;
  for (const line of lines) {
    let r; try { r = JSON.parse(line); } catch { continue; }

    if (r.kind === 'session') { // teammate session history: identity only, never a memory
      if (!r.id || findSession.get(r.id)) continue;
      db().prepare('INSERT INTO sessions(id, project, repo, author, username, role, name, task, summary, created) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .run(r.id, here, r.repo || null, r.author || null, r.username || null, r.role || null,
          r.name || null, r.task || null, r.summary || null, r.created || new Date().toISOString().slice(0, 19).replace('T', ' '));
      sessions++;
      continue;
    }

    if (!r.text) continue;
    const au = r.author ? String(r.author).toLowerCase() : null;
    const w = trustLevel(au) === 'workspace';
    const conf = r.confidence == null ? 0.7 : Number(r.confidence);
    const row = find.get(norm(r.text));
    if (row) {
      dup++;
      // trust changed since the last import? apply it to the existing row (both directions)
      if (row.author && au && String(row.author).toLowerCase() === au && !!row.workspace !== w) {
        db().prepare('UPDATE memories SET workspace = ?, confidence = ? WHERE id = ?')
          .run(w ? 1 : 0, w ? Math.min(conf, 0.3) : conf, row.id);
        if (w) workspace++; else promoted++;
      }
      continue;
    }
    // pass identity explicitly: r.project is a stored key, never a path, so it must not
    // be handed to add() as a working directory (that shelled out to git on every row)
    add(r.type || 'note', r.text, w ? Math.min(conf, 0.3) : r.confidence, null, r.source,
      { project: here, repo: r.repo || null, author: r.author || null, username: r.username || null,
        role: r.role || null, task: r.task || null, workspace: w });
    added++; if (w) workspace++;
  }
  return { added, dup, workspace, promoted, sessions, encrypted };
}

// Keeps an existing seed current on /compact, /clear and after a commit. Never creates the
// file — running /handoff once is the opt-in — and never touches git state.
function autoSeed(cwd) {
  if (!optOn('seed_auto', 'on')) return null;
  const dir = String(cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const plain = path.join(dir, '.ai-coach', 'team-seed.jsonl');
  const enc = plain + '.enc';
  const target = fs.existsSync(enc) ? enc : (fs.existsSync(plain) ? plain : null);
  if (!target) return null;
  useProject(dir);
  const r = seedExport(target, { dir, encrypt: target === enc });
  return { file: path.basename(target), ...r };
}

// ---------- CLI ----------

function cli() {
  const [cmd, ...a] = process.argv.slice(2);
  // every CLI invocation serves one project; resolve it before touching a database
  // Read a flag's value only when the flag is actually present. indexOf returns -1 when it is
  // not, and a[-1 + 1] is a[0] — the first POSITIONAL argument — so `search round` used to
  // resolve the project as "round" and open an empty database. Everything downstream then
  // reported "no matches" against knowledge that was really there.
  const flagValue = (name) => {
    const i = a.indexOf(name);
    if (i < 0) return null;
    const v = a[i + 1];
    return v && !v.startsWith('--') ? v : null;
  };
  useProject(flagValue('--project') || flagValue('--dir') || process.cwd());
  switch (cmd) {
    case 'init': db(); console.log('project db ready:', path.join(tenantDir(active().project), 'coach.db')); break;
    case 'add': {
      const rest = []; let proj = null, t = null;
      for (let i = 0; i < a.length; i++) {
        if (a[i] === '--project') proj = a[++i];
        else if (a[i] === '--task') t = a[++i];
        else rest.push(a[i]);
      }
      // default project = current repo — a memory added here belongs here unless told otherwise
      add(rest[0], rest[1], rest[2], proj || process.cwd(), rest[3] || null, t ? { task: t } : undefined);
      console.log('added');
      break;
    }
    case 'forget': { const t = forget(a[0]); console.log(t ? `forgotten #${a[0]}: ${t}` : 'no memory #' + a[0]); break; }
    case 'search': {
      const flags = { full: false };
      const rest = [];
      for (let i = 0; i < a.length; i++) {
        if (a[i] === '--full') flags.full = true;
        else if (a[i] === '--task') flags.task = a[++i];
        else if (a[i] === '--author') flags.author = a[++i];
        else if (a[i] === '--role') flags.role = a[++i];
        else if (a[i] === '--user') flags.user = a[++i];
        else if (a[i] === '--repo') flags.repo = a[++i];
        else if (a[i] === '--all') flags.all = true;
        else rest.push(a[i]);
      }
      const rows = search(rest.join(' '), flags); // --full returns every match
      if (!rows.length) console.log('no matches');
      for (const r of rows) console.log(flags.full
        ? `#${r.id} [${r.type}]${r.workspace ? ' [workspace]' : ''} (conf ${r.confidence}) ${r.author ? '@' + r.author + ' ' : ''}${r.source ? '<' + r.source + '> ' : ''}${r.text}`
        : r._display);
      break;
    }
    case 'bootstrap': console.log('installed ' + bootstrap() + ' file(s) to ' + BIN_DIR); break;
    case 'brief': console.log(brief(Number(a[0]) || 4000, a[1])); break;
    case 'corrections': {
      const openOnly = a.includes('--open');
      const rows = corrections({ unrecordedOnly: openOnly, limit: 50 });
      if (!rows.length) { console.log(openOnly ? 'nothing open' : 'no corrections recorded'); break; }
      for (const c of rows) {
        console.log(`#${c.id} [${c.signal}]${c.recorded ? '' : ' OPEN'} ${String(c.created).slice(0, 16)} `
          + `${String(c.message).replace(/\s+/g, ' ').slice(0, 110)}`
          + (c.prompt_excerpt ? `\n     while: ${c.prompt_excerpt}` : ''));
      }
      break;
    }
    case 'correction-done': console.log('marked ' + markCorrectionsRecorded(a.map(Number)) + ' recorded'); break;
    case 'prompt-stats': {
      const days = Number(a.find((x) => /^\d+$/.test(x))) || 30;
      const st = promptStats({ days });
      if (!st.total) { console.log(`no prompts recorded in the last ${st.days} days`); break; }
      console.log(`${st.total} prompts in ${st.days} days · ${st.clean} clean `
        + `(${(st.cleanRate).toFixed(2)} corrections+failures per clean session)`);
      if (!st.signals.length) { console.log('no signals fired — nothing to coach'); break; }
      console.log('signal              fired  rate  lift');
      for (const s of st.signals) {
        console.log(s.id.padEnd(20) + String(s.count).padStart(5)
          + '  ' + s.rate.toFixed(2).padStart(4)
          + '  ' + (s.lift == null ? '   —' : (s.lift.toFixed(1) + '×').padStart(4)));
      }
      console.log('\nlift = outcome rate vs your prompts that fired no signal. '
        + 'Correlation across your own sessions, not proof.');
      break;
    }
    case 'prompt-check': { // deterministic evaluation of one prompt; no model call, no write
      const r = evaluatePrompt(a.join(' '));
      console.log(r.exempt ? 'exempt (question or exploration — not coached)'
        : (r.flags.length ? 'flags: ' + r.flags.join(', ') + '\n' + r.hints.map((h) => '- ' + h).join('\n')
          : 'clean'));
      break;
    }
    case 'session-start': sessionStart(a[0], a[1]); break;
    case 'session-end': sessionEnd(a[0], a.slice(1).join(' ')); break;
    case 'observe': observe(a[0], a[1], a[2], a.slice(3).join(' ')); break;
    case 'prune': console.log('pruned', pruneObservations(a[0]), 'observations'); break;
    case 'seed-export': {
      const rest = []; let t = null, proj = null, encrypt = false, dir = null, rp = null;
      for (let i = 0; i < a.length; i++) {
        if (a[i] === '--task') t = a[++i];
        else if (a[i] === '--project') proj = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : process.cwd();
        else if (a[i] === '--repo') rp = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : active().repo;
        else if (a[i] === '--encrypt') encrypt = true;
        else if (a[i] === '--dir') dir = a[++i];
        else rest.push(a[i]);
      }
      const r = seedExport(rest[0] || 'seed.jsonl', { task: t, repo: rp, dir: dir || proj, encrypt });
      console.log(`exported ${r.memories} memories / ${r.sessions} sessions`
        + (r.encrypted ? ' (encrypted)' : '')
        + ` (project: ${active().project}${rp ? `, repo: ${rp}` : ''}${t ? `, task: ${t}` : ''})`);
      break;
    }
    case 'seed-import': {
      const rest = []; let dir = null;
      for (let i = 0; i < a.length; i++) {
        if (a[i] === '--dir') dir = a[++i];
        else rest.push(a[i]);
      }
      const r = seedImport(rest[0] || 'seed.jsonl', dir || process.cwd());
      console.log(`imported ${r.added} new / ${r.dup} dup`
        + (r.sessions ? ` / ${r.sessions} sessions` : '')
        + (r.workspace ? ` / ${r.workspace} to workspace` : '')
        + (r.promoted ? ` / ${r.promoted} promoted` : '')
        + (r.encrypted ? ' (decrypted)' : ''));
      break;
    }
    case 'auto-seed': {
      const r = autoSeed(a[0]);
      console.log(r ? `refreshed ${r.file}: ${r.memories} memories / ${r.sessions} sessions${r.encrypted ? ' (encrypted)' : ''}`
        : 'no seed file in this project — run /handoff once to opt in');
      break;
    }
    case 'name': {
      const label = nameSession(a[0], a.slice(1).join(' '));
      console.log('session named:', label);
      break;
    }
    case 'trust': {
      if (!a[0]) { console.log('usage: engine.js trust <email> <full|workspace> [note]'); break; }
      const lvl = setTrust(a[0], a[1] || 'full', a.slice(2).join(' '));
      console.log(`trust set (private, this machine only): ${a[0]} -> ${lvl}`);
      break;
    }
    case 'trust-list': {
      const rows = trustList();
      if (!rows.length) console.log('no explicit trust set — everyone defaults to', opt('default_trust', 'full'));
      for (const r of rows) console.log(`${r.email} -> ${r.level}${r.note ? '  (' + r.note + ')' : ''}`);
      break;
    }
    case 'team-list': {
      const team = roster(a[0]);
      const emails = Object.keys(team);
      if (!emails.length) console.log('no .ai-coach/team.md in this project');
      for (const em of emails) {
        const t = db().prepare('SELECT level FROM trust WHERE email = ?').get(em);
        console.log(`${team[em].name || em} <${em}>${team[em].role ? ' — role: ' + team[em].role : ''}`
          + `  [trust: ${t ? t.level : 'default ' + opt('default_trust', 'full')}]`);
      }
      break;
    }
    case 'whoami':
      console.log(JSON.stringify({
        username: username(), author: author(), role: roleOf(author(), a[0]),
        project: active().project, repo: active().repo, task: task(null, a[0]),
      }, null, 2));
      break;
    case 'project': {
      if (a[0] === 'register') { registerRepo(a[1] || active().repo, a[2]); console.log('repo registered:', a[1] || active().repo); break; }
      const decl = projectDecl(active().cwd || process.cwd());
      console.log(JSON.stringify({
        project: active().project,
        repo: active().repo,
        declared: !!decl.name,
        declaredRepos: decl.repos,
        registeredRepos: repoList().map((r) => r.repo),
        db: path.join(tenantDir(active().project), 'coach.db'),
      }, null, 2));
      break;
    }
    case 'repos':
      for (const r of repoList()) console.log(`${r.repo}${r.name ? '  (' + r.name + ')' : ''}`);
      break;
    case 'projects': {
      const rows = projectList();
      if (!rows.length) console.log('no projects recorded yet');
      for (const p of rows) console.log(`${p.key}  ->  ${p.dir}`);
      break;
    }
    case 'rekey': { // adopt rows stranded under an old identity (a repo that gained a remote later)
      const [from, to] = a;
      if (!from || !to) { console.log('usage: engine.js rekey <old-key> <new-key>'); break; }
      const src = openTenant(from), dst = openTenant(to);
      const cols = src.prepare('PRAGMA table_info(memories)').all().map((r) => r.name).filter((c) => c !== 'id');
      const rows = src.prepare(`SELECT ${cols.join(',')} FROM memories`).all();
      const ins = dst.prepare(`INSERT INTO memories(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`);
      for (const row of rows) ins.run(...cols.map((c) => (c === 'project' ? to : row[c])));
      src.prepare('DELETE FROM memories').run();
      console.log(`moved ${rows.length} memories: ${from} -> ${to}`);
      break;
    }
      break;
    case 'export': console.log(JSON.stringify({
      memories: db().prepare('SELECT * FROM memories').all(),
      sessions: db().prepare('SELECT * FROM sessions').all(),
      observations: db().prepare('SELECT * FROM observations').all(),
    }, null, 2)); break;
    default:
      console.log('usage: engine.js <init|add|forget|search|brief|session-start|session-end|name|observe|prune|'
        + 'seed-export|seed-import|auto-seed|trust|trust-list|team-list|whoami|project|repos|projects|rekey|corrections|correction-done|prompt-stats|prompt-check|export>');
  }
}

module.exports = {
  db, userDb, openTenant, useProject, active, log, bootstrap, BIN_DIR, add, forget, hasText, norm, search, brief,
  sessionStart, firstPrompt, observe, sessionEnd, sessionActivity, pruneObservations,
  correction, corrections, correctionSignal, markCorrectionsRecorded,
  evaluatePrompt, promptSignal, promptStats, PROMPT_RULES,
  seedExport, seedImport, autoSeed, project, repo, projectDecl, projectFile, registerRepo,
  repoList, projectList, tenantDir, tenantSlug, normalizeRemote, opt, optOn,
  DB_PATH, ROOT, PROJECTS_DIR, LOG_PATH, author, username,
  task, taskSlug, roster, roleOf, setTrust, trustList, trustLevel,
  nameSession, sessionLabel, autoName, seal, unseal, isSealed, seedKey,
};
if (require.main === module) cli();
