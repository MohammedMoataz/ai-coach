#!/usr/bin/env node
'use strict';
// The release main is on: the marketplace version, its CHANGELOG section as the notes, and the
// `{plugin}--v{version}` tags its bolded ship line names. The Release workflow tags and publishes
// from this output, so a release says exactly what the CHANGELOG (already checked by
// check-manifests.js) says. Usage: `node .github/release.js <notes-file>` prints key=value lines.
const fs = require('node:fs');
const path = require('node:path');

function parse(changelog, version) {
  const section = changelog.split(/^## /m).find((s) => s.startsWith(`v${version} `));
  if (!section) throw new Error(`CHANGELOG.md has no section for v${version}`);
  const [heading, ...body] = section.split('\n');
  const title = heading.replace(/^v\S+\s+—\s+/, '').replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, '');
  const shipLine = (section.match(/^\*\*([^*]*\d+\.\d+\.\d+[^*]*)\*\*$/m) || [])[1] || '';
  const tags = shipLine.split('·')
    .map((claim) => claim.trim().match(/^([a-z-]+)\s+(\d+\.\d+\.\d+)$/))
    .filter(Boolean)
    .map((m) => `${m[1]}--v${m[2]}`);
  // The bundle tag is the release's own tag, so it is there even if the ship line forgot it.
  if (!tags.includes(`ai-coach--v${version}`)) tags.push(`ai-coach--v${version}`);
  return { title, notes: body.join('\n').trim() + '\n', tags };
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const { version } = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));
  const release = parse(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), version);
  fs.writeFileSync(process.argv[2] || 'release-notes.md', release.notes);
  console.log(`version=${version}\ntitle=${release.title}\ntags=${release.tags.join(' ')}`);
}

module.exports = { parse };
