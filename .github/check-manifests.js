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

if (fail.length) {
  console.error('manifest check FAILED:\n- ' + fail.join('\n- '));
  process.exit(1);
}
console.log(`manifest check OK: ${manifests.size} plugins, all sources, versions, dependencies and hook scripts resolve`);
