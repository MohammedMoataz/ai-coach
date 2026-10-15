#!/usr/bin/env node
'use strict';
// Everything the commit turn needs to draft a message, in one read, with the diff capped — the turn
// runs on a small model, and an uncapped diff is what would make it expensive. Read-only, except
// that it clears the two scratch files, in the OS temp dir, that the skill writes its message and PR body into.
//   node context.js [--issue N] [--json]
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const CAP = 12000;
const RISKY = /(^|\/)(\.env(\.[^/]*)?|[^/]+\.pem|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?)$/;

function gather(cwd = process.cwd(), { issue = null, cap = CAP } = {}) {
  const git = (...a) => { try { return execFileSync('git', ['-c', 'core.quotepath=off', ...a],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }).replace(/\s+$/, ''); } catch { return null; } };
  const top = git('rev-parse', '--show-toplevel');
  if (!top) return { error: 'not a git repository' };
  const exists = (p) => { const r = git('rev-parse', '--git-path', p); return !!r && fs.existsSync(path.resolve(cwd, r)); };

  const branch = git('branch', '--show-current') || null; // empty on a detached HEAD
  const hasHead = git('rev-parse', '--verify', '-q', 'HEAD') != null;
  const inProgress = ['MERGE_HEAD', 'rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD', 'REVERT_HEAD'].filter(exists);
  const originHead = (git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD') || '').replace(/^origin\//, '');
  const defaultBranch = originHead
    || ['main', 'master'].find((b) => git('rev-parse', '--verify', '-q', 'refs/heads/' + b) != null) || 'main';

  const staged = (git('diff', '--cached', '--name-only') || '').split('\n').filter(Boolean);
  const mode = staged.length ? 'staged' : 'all';
  const files = mode === 'staged' ? staged
    : (git('status', '--porcelain=v1', '-uall') || '').split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^.* -> /, ''));
  const untracked = mode === 'all' ? (git('ls-files', '--others', '--exclude-standard') || '').split('\n').filter(Boolean) : [];

  const base = mode === 'staged' ? ['--cached'] : (hasHead ? ['HEAD'] : ['--cached']);
  const stat = git('diff', '--stat', '--no-color', ...base) || '';
  let diff = git('diff', '--no-color', '--no-ext-diff', ...base) || '';
  for (const f of untracked) { // new files are not in `git diff HEAD`; show their head instead
    let body = '';
    try { const b = fs.readFileSync(path.join(top, f)); body = b.includes(0) ? '(binary)' : b.toString('utf8').split('\n').slice(0, 40).join('\n'); } catch { /* gone */ }
    diff += `\nnew file: ${f}\n${body}\n`;
  }
  const full = diff.length;
  if (full > cap) diff = diff.slice(0, cap) + `\n[... diff truncated at ${cap} of ${full} characters ...]`;

  const fromBranch = ((branch || '').match(/(?:^|[/_-])#?(\d{1,6})(?=[-_/]|$)/) || [])[1];
  // outside the work tree, so it can never be staged; one directory per repository
  const tmp = path.join(os.tmpdir(), 'ship-coach', crypto.createHash('sha1').update(top).digest('hex').slice(0, 10));
  fs.mkdirSync(tmp, { recursive: true });
  const scratch = { message: path.join(tmp, 'message.txt'), prBody: path.join(tmp, 'pr-body.md') };
  for (const f of Object.values(scratch)) fs.rmSync(f, { force: true });

  return {
    root: top, branch, detached: !branch, hasHead, inProgress, defaultBranch,
    onDefault: branch === defaultBranch,
    upstream: git('rev-parse', '--abbrev-ref', '@{u}'),
    remote: git('remote', 'get-url', 'origin'),
    mode, files, risky: files.filter((f) => RISKY.test(f)),
    stat, diff, truncated: full > cap,
    log: hasHead ? (git('log', '--format=%s', '-15') || '').split('\n').filter(Boolean) : [],
    issue: issue != null ? Number(issue) : (fromBranch ? Number(fromBranch) : null),
    scratch,
  };
}

module.exports = { gather, RISKY };

if (require.main === module) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--issue');
  const c = gather(process.cwd(), { issue: i >= 0 ? (args[i + 1] || '').replace(/^#/, '') : null });
  if (args.includes('--json') || c.error) { console.log(JSON.stringify(c, null, 2)); process.exit(0); }
  const line = (k, v) => console.log(`${k.padEnd(16)}${v}`);
  line('repository', c.root);
  line('branch', c.detached ? '(detached HEAD)' : c.branch + (c.onDefault ? '  (the default branch)' : ''));
  line('default branch', c.defaultBranch);
  line('upstream', c.upstream || '(none)');
  line('remote origin', c.remote || '(none)');
  line('in progress', c.inProgress.join(', ') || '(nothing)');
  line('issue', c.issue ? '#' + c.issue : '(none)');
  line('staging', c.mode === 'staged' ? 'only what is already staged' : 'all changes, untracked included');
  line('message file', c.scratch.message);
  line('PR body file', c.scratch.prBody);
  if (c.risky.length) line('RISKY FILES', c.risky.join(', '));
  console.log('\n## files (' + c.files.length + ')\n' + (c.files.join('\n') || '(nothing to commit)'));
  console.log('\n## recent subjects — match this style\n' + (c.log.join('\n') || '(no commits yet)'));
  console.log('\n## stat\n' + c.stat);
  console.log('\n## diff\n' + c.diff);
}
