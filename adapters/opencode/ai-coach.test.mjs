// The opencode plugin's handlers, driven directly: observation recorded, guard throw on a live
// credential when armed AND resolvable, silence otherwise. opencode itself is not required —
// the handlers are plain functions once the context object is faked.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..', '..');
const tmp = path.join(here, '.test-tmp');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

process.env.AICOACH_DB = path.join(tmp, 'o.db');
process.env.AICOACH_LOG = path.join(tmp, 'log.jsonl');
process.env.AICOACH_AUTHOR = 'opencode-tester@example.com';
process.env.AICOACH_LEARN = 'off';
process.env.AICOACH_ENGINE = path.join(repo, 'plugins', 'ai-coach-core', 'hooks', 'engine.js');
delete process.env.AICOACH_GUARD;
delete process.env.AICOACH_REPO;

const { AiCoach } = await import('./ai-coach.js');
const handlers = await AiCoach({ directory: tmp });

// observation round-trip through session.created + tool.execute.after
await handlers['session.created']({ session: { id: 'oc-1' } });
await handlers['tool.execute.after']({ tool: 'edit', sessionID: 'oc-1' }, { args: { filePath: path.join(tmp, 'x.rs') } });
const digest = spawnSync(process.execPath, [process.env.AICOACH_ENGINE, 'session-digest', 'oc-1'],
  { encoding: 'utf8', env: process.env, timeout: 15000 }).stdout || '';
assert.ok(digest.includes('x.rs'), 'edit recorded through the plugin: ' + digest.slice(0, 200));

// guard: silent when unarmed, silent when armed but AICOACH_REPO unset, throws when both are set
const KEY = 'AKIA' + 'ABCDEFGHIJKLMNOP';
const bash = { tool: 'bash', sessionID: 'oc-1' };
const payload = { args: { command: 'export K=' + KEY } };
await handlers['tool.execute.before'](bash, payload); // default: guard off, no throw

process.env.AICOACH_GUARD = 'on';
await handlers['tool.execute.before'](bash, payload); // armed but unresolvable: fails open

process.env.AICOACH_REPO = repo;
await assert.rejects(() => handlers['tool.execute.before'](bash, payload),
  /credential/i, 'armed + resolvable: the block surfaces as a thrown error');
await handlers['tool.execute.before'](bash, { args: { command: 'git status' } }); // clean passes

// session.idle closes out without error, twice (idempotent on the engine side)
await handlers['session.idle']({ sessionID: 'oc-1' });
await handlers['session.idle']({ sessionID: 'oc-1' });

fs.rmSync(tmp, { recursive: true, force: true });
console.log('ai-coach.test.mjs: ALL PASS');
