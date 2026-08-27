#!/usr/bin/env node
'use strict';
// A malformed manifest is the one bug that breaks every user at install time, and nothing in the
// test suites would catch it. Checks: every JSON parses, the marketplace's source paths resolve to
// a real plugin whose name matches, and no dependency names a plugin or a range that does not
// exist in this marketplace. Zero dependencies; run with `node .github/check-manifests.js`.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const fail = [];
const check = (ok, msg) => { if (!ok) fail.push(msg); };

function readJson(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); } catch (err) {
    fail.push(`${rel}: ${err.message}`);
    return null;
  }
}

const market = readJson('.claude-plugin/marketplace.json');
if (!market) { console.error(fail.join('\n')); process.exit(1); }
check(Array.isArray(market.plugins) && market.plugins.length > 0, 'marketplace.json: no plugins array');

// every marketplace entry points at a real plugin whose manifest agrees about its own name
const manifests = new Map();
for (const entry of market.plugins || []) {
  const src = String(entry.source || '');
  check(src.startsWith('./'), `marketplace entry ${entry.name}: source must be a repo-relative path, got ${src}`);
  const rel = path.posix.join(src.replace(/^\.\//, ''), '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(path.join(root, rel))) {
    fail.push(`marketplace entry ${entry.name}: no plugin.json at ${rel}`);
    continue;
  }
  const m = readJson(rel);
  if (!m) continue;
  check(m.name === entry.name, `${rel}: name "${m.name}" does not match marketplace entry "${entry.name}"`);
  check(/^\d+\.\d+\.\d+$/.test(m.version || ''), `${rel}: version "${m.version}" is not x.y.z`);
  manifests.set(m.name, m);
}

// no plugin directory is missing from the marketplace
for (const dir of fs.readdirSync(path.join(root, 'plugins'))) {
  const rel = path.posix.join('plugins', dir, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(path.join(root, rel))) continue;
  check(manifests.has(dir), `plugins/${dir} exists but is not listed in marketplace.json`);
}

// every dependency resolves to a plugin in this marketplace, at a range its version satisfies
const parse = (v) => String(v).replace(/^[\^~]/, '').split('.').map(Number);
const ahead = (a, b) => { // is a > b, comparing x.y.z left to right
  for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0); }
  return false;
};
for (const [name, m] of manifests) {
  for (const dep of m.dependencies || []) {
    const d = typeof dep === 'string' ? { name: dep } : dep;
    const target = manifests.get(d.name);
    if (!target) { fail.push(`${name}: depends on "${d.name}", which this marketplace does not ship`); continue; }
    if (!d.version) continue;
    // Only the majors have to agree; a caret range is satisfied by any later minor of that major.
    const want = String(d.version).match(/^[\^~]?(\d+)\./);
    const have = String(target.version).match(/^(\d+)\./);
    check(want && have && want[1] === have[1],
      `${name}: requires ${d.name}@${d.version}, but ${d.name} is ${target.version}`);
    // A floor above what ships can never be satisfied — the shape check above cannot see it
    // because the majors still agree.
    check(!ahead(parse(d.version), parse(target.version)),
      `${name}: requires ${d.name}@${d.version}, which is ahead of the ${target.version} this marketplace ships`);
  }
}

// The marketplace's own version and the bundle's must agree, and the CHANGELOG's newest section
// has to be about that release. All three were 1.5.0 / 1.4.0 / 1.5.0 at once: the bundle was
// simply never bumped, and every check here passed anyway because each number was well-formed on
// its own. A release number is a claim about the other two, so it is checked against them.
{
  const bundle = manifests.get('ai-coach');
  if (market.version && bundle) {
    check(market.version === bundle.version,
      `marketplace.json is ${market.version} but the ai-coach bundle is ${bundle.version} — a release bumps both`);
  }
  try {
    const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
    const newest = (changelog.match(/^##\s+v(\d+\.\d+\.\d+)/m) || [])[1];
    check(newest === market.version,
      `CHANGELOG's newest release is v${newest}, but marketplace.json says ${market.version}`);
    // Each release states the versions it ships on one bolded line — `**core 1.6.0 · ai-coach
    // 1.8.0**`. Every version claimed there has to be the version that actually ships. Prose
    // elsewhere in the section may name a plugin for other reasons (a boundary, a comparison),
    // and naming one is not a claim about its version.
    const section = changelog.split(/^##\s+/m).find((s) => s.startsWith('v' + market.version)) || '';
    const shipLine = (section.match(/^\*\*([^*]*\d+\.\d+\.\d+[^*]*)\*\*$/m) || [])[1];
    check(!!shipLine, `CHANGELOG v${market.version} has no bolded line stating the versions it ships`);
    for (const claim of (shipLine || '').split('·')) {
      const m = claim.trim().match(/^([a-z-]+)\s+(\d+\.\d+\.\d+)$/);
      if (!m) continue;
      const target = manifests.get(m[1]);
      check(!!target, `CHANGELOG v${market.version} ships "${m[1]}", which this marketplace does not have`);
      if (target) {
        check(target.version === m[2],
          `CHANGELOG v${market.version} says ${m[1]} ${m[2]}, but its manifest is ${target.version}`);
      }
    }
  } catch (err) {
    fail.push('CHANGELOG.md: ' + err.message);
  }
}

// every hooks.json referenced by a plugin parses, and names a script that exists
for (const [name, m] of manifests) {
  const dir = path.join(root, 'plugins', name);
  const hooksPath = path.join(dir, 'hooks', 'hooks.json');
  if (!fs.existsSync(hooksPath)) continue;
  const rel = path.posix.join('plugins', name, 'hooks', 'hooks.json');
  const h = readJson(rel);
  if (!h) continue;
  for (const [event, groups] of Object.entries(h.hooks || {})) {
    for (const g of groups) {
      for (const hook of g.hooks || []) {
        const script = String(hook.command || '').match(/hooks\/([\w.-]+\.js)/);
        check(script && fs.existsSync(path.join(dir, 'hooks', script[1])),
          `${rel}: ${event} references a script that does not exist: ${hook.command}`);
      }
    }
  }
}

// ---- every SKILL.md has usable frontmatter ----
// Descriptions are the ONLY thing this product puts in every session's context, so a missing or
// bloated one is paid by every user on every session, forever.
const DESCRIPTION_MAX = 1024; // platform.claude.com best-practice ceiling for a description
let skillCount = 0;
const skillNames = new Set();
function eachSkill(fn) {
  for (const name of manifests.keys()) {
    const dir = path.join(root, 'plugins', name, 'skills');
    if (!fs.existsSync(dir)) continue;
    for (const skill of fs.readdirSync(dir)) {
      const file = path.join(dir, skill, 'SKILL.md');
      // Normalize line endings: a CRLF checkout is normal on Windows, and a frontmatter parser
      // that only understands LF reports "no frontmatter" on a file that has perfectly good
      // frontmatter — which is a false failure, the worst kind for a gate everyone has to pass.
      if (fs.existsSync(file)) fn(name, skill, file, fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
    }
  }
}
// Agents pay the same always-on bill as skills — their descriptions sit in every session — and
// they are spawned by name from SKILL.md prose, so a missing or bloated description fails the
// same way a skill's does.
let agentCount = 0;
for (const name of manifests.keys()) {
  const dir = path.join(root, 'plugins', name, 'agents');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    agentCount++;
    const rel = path.posix.join('plugins', name, 'agents', f);
    const text = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
    const fm = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---', 4)) : '';
    check(!!fm, `${rel}: no YAML frontmatter`);
    check((fm.match(/^name:\s*(.+)$/m) || [])[1] === f.replace('.md', ''),
      `${rel}: frontmatter name does not match the filename skills spawn it by`);
    const desc = (fm.match(/^description:\s*(.+)$/m) || [])[1] || '';
    check(!!desc && desc.length <= DESCRIPTION_MAX,
      `${rel}: description missing or over the ${DESCRIPTION_MAX} ceiling (${desc.length})`);
    check(/use for|use when|use as|use before|use after/i.test(desc),
      `${rel}: description names no trigger — say when a skill should spawn it`);
    check(/^tools:\s*\S/m.test(fm),
      `${rel}: no tools list — an agent with every tool is an agent nobody scoped`);
  }
}

// Commands are the user-typed macros. They must stay user-only — the bundle's claim of costing
// nothing at session start rests on no command description entering the model's context — and a
// command that sequences skills across plugins has to say what a partial install does.
let commandCount = 0;
for (const name of manifests.keys()) {
  const dir = path.join(root, 'plugins', name, 'commands');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    commandCount++;
    const rel = path.posix.join('plugins', name, 'commands', f);
    const text = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
    const fm = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---', 4)) : '';
    check(!!fm, `${rel}: no YAML frontmatter`);
    const desc = (fm.match(/^description:\s*(.+)$/m) || [])[1] || '';
    check(!!desc && desc.length <= DESCRIPTION_MAX,
      `${rel}: description missing or over the ${DESCRIPTION_MAX} ceiling (${desc.length})`);
    check(/^disable-model-invocation:\s*true$/m.test(fm),
      `${rel}: commands must be user-only — the bundle's zero-cost claim depends on it`);
    check(/not installed|missing|skipped/i.test(text),
      `${rel}: a cross-plugin command must say what a partial install does`);
  }
}

eachSkill((plugin, skill, file, text) => {
  skillCount++;
  skillNames.add(plugin + ':' + skill);
  const rel = path.posix.join('plugins', plugin, 'skills', skill, 'SKILL.md');
  const fm = text.startsWith('---\n') ? text.slice(4, text.indexOf('\n---', 4)) : '';
  check(!!fm, `${rel}: no YAML frontmatter`);
  const desc = (fm.match(/^description:\s*(.+)$/m) || [])[1] || '';
  check(!!desc, `${rel}: no description — this is what routing matches on`);
  check(desc.length <= DESCRIPTION_MAX,
    `${rel}: description is ${desc.length} chars, over the ${DESCRIPTION_MAX} ceiling`);
  check(!/[<>]/.test(desc), `${rel}: description contains angle brackets, which are not allowed`);
  // Every skill has to be reachable by more than its own name.
  check(/use for|use when|use before|use after/i.test(desc),
    `${rel}: description names no trigger — say when to use it, not only what it is`);
});

// ---- the CLI surface is the cross-plugin ABI, and nothing guarded it ----
// Skills reach the engine by shelling out to `ENGINE <verb>`. A renamed verb breaks them silently:
// the skill still loads, the command still runs, and the user gets a usage line instead of an
// answer. Compare what the skills call against what the CLI actually dispatches.
{
  const engine = fs.readFileSync(path.join(root, 'plugins', 'ai-coach-core', 'hooks', 'engine.js'), 'utf8');
  const verbs = new Set();
  for (const m of engine.matchAll(/^\s*case '([a-z][\w-]*)':/gm)) verbs.add(m[1]);
  check(verbs.size > 10, 'could not read the engine CLI verbs — the ABI check is not running');
  const called = new Map(); // verb -> where it was called from
  const scan = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { scan(p); continue; }
      if (!entry.name.endsWith('.md')) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(/ENGINE\s+([a-z][\w-]*)/g)) {
        if (!called.has(m[1])) called.set(m[1], path.relative(root, p));
      }
    }
  };
  scan(path.join(root, 'plugins'));
  for (const [verb, where] of called) {
    check(verbs.has(verb), `${where}: calls \`ENGINE ${verb}\`, which the engine CLI does not dispatch`);
  }
}

// ---- a cross-plugin reference has to name a skill that exists ----
// `${CLAUDE_PLUGIN_ROOT}` cannot reach a sibling plugin, so these references are prose — which is
// exactly why a rename leaves them pointing at nothing and no test notices.
{
  const scan = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { scan(p); continue; }
      if (!entry.name.endsWith('.md')) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(/\/([a-z]+(?:-coach)?):([a-z][\w-]*)/g)) {
        const ref = m[1] + ':' + m[2];
        if (skillNames.has(ref)) continue;
        // A /plugin:name may be a command as well as a skill — the bundle ships those.
        if (fs.existsSync(path.join(root, 'plugins', m[1], 'commands', m[2] + '.md'))) continue;
        // A sentence that says a skill USED to exist is documentation, not a dangling link.
        const line = text.slice(text.lastIndexOf('\n', m.index) + 1, text.indexOf('\n', m.index));
        if (/\b(was|used to be|absorbed|replaced|retired|merged)\b/i.test(line)) continue;
        fail.push(`${path.relative(root, p)}: references /${ref}, which is not a skill in this marketplace`);
      }
    }
  };
  scan(path.join(root, 'plugins'));
}

// ---- a spec duplicated across plugins has to stay identical ----
// `${CLAUDE_PLUGIN_ROOT}` cannot reach a sibling plugin, so the draw.io grid rules exist twice by
// necessity. They had already drifted — one copy capped rows and boxes, the other only columns —
// and a picture drawn to the looser copy overlaps itself. The numbers are the contract; check them.
{
  const copies = [
    'plugins/investigation-coach/skills/map/references/drawio.md',
    'plugins/strategy-coach/skills/blueprint/references/visual.md',
  ];
  // Each copy may phrase the geometry its own way (`160×60` or `width=160`), so the numbers are
  // checked as numbers and the two ceilings as the phrases both copies must state verbatim.
  const numbers = [160, 60, 240, 120];
  const phrases = ['6 columns × 5 rows', '30 boxes'];
  for (const f of copies) {
    const t = fs.readFileSync(path.join(root, f), 'utf8');
    for (const n of numbers) {
      check(new RegExp('\\b' + n + '\\b').test(t),
        `${f}: the draw.io grid spec does not mention ${n}, which its other copy uses`);
    }
    for (const p of phrases) {
      check(t.includes(p), `${f}: the draw.io grid spec is missing "${p}", which its other copy states`);
    }
  }
}

if (fail.length) {
  console.error('manifest check FAILED:\n- ' + fail.join('\n- '));
  process.exit(1);
}
console.log(`manifest check OK: ${manifests.size} plugins, ${skillCount} skills, ${agentCount} agents, `
  + `${commandCount} commands — sources, versions, dependencies, hook scripts, frontmatter, engine verbs `
  + 'and cross-plugin references all resolve');
