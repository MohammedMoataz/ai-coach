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

const digestOf = (id) => spawnSync(process.execPath, [process.env.AICOACH_ENGINE, 'session-digest', id],
  { encoding: 'utf8', env: process.env, timeout: 15000 }).stdout || '';

// Session lifecycle arrives through the single `event` hook (Hooks.event in @opencode-ai/plugin
// 1.19.0), shaped as the SDK's Event union: session.created carries properties.info (a Session),
// session.idle carries properties.sessionID. There are no session.* hook keys.
assert.equal(typeof handlers.event, 'function', 'lifecycle is wired through the event hook');
await handlers.event({ event: { type: 'session.created', properties: {
  info: { id: 'oc-1', projectID: 'p', directory: tmp, title: 't', version: '1', time: { created: 0, updated: 0 } } } } });
assert.ok(!digestOf('oc-1').includes('no session found'), 'session.created stamps the session before any tool call');
await handlers.event({ event: { type: 'file.edited', properties: { file: 'x' } } }); // unrelated events are ignored

// observation round-trip through tool.execute.after
// Fixtures follow @opencode-ai/plugin 1.19.0 Hooks["tool.execute.after"]: args ride on the INPUT,
// the output is { title, output, metadata }. The title is what the tool shows, not what it touched.
await handlers['tool.execute.after'](
  { tool: 'edit', sessionID: 'oc-1', callID: 'c1', args: { filePath: path.join(tmp, 'x.rs') } },
  { title: 'edit src', output: '', metadata: {} });
await handlers['tool.execute.after'](
  { tool: 'bash', sessionID: 'oc-1', callID: 'c2', args: { command: 'cargo test --workspace' } },
  { title: 'Run tests', output: 'ok', metadata: {} });
const digest = digestOf('oc-1');
assert.ok(digest.includes('x.rs'), 'edit records the file from input.args: ' + digest.slice(0, 400));
assert.ok(digest.includes('cargo test --workspace'), 'bash records the command from input.args: ' + digest.slice(0, 400));

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

// session.idle stamps the end, and firing twice is harmless (idempotent on the engine side)
assert.ok(/→ open/.test(digestOf('oc-1')), 'still open before idle');
const idle = { event: { type: 'session.idle', properties: { sessionID: 'oc-1' } } };
await handlers.event(idle);
await handlers.event(idle);
assert.ok(!/→ open/.test(digestOf('oc-1')), 'session.idle stamped the end: ' + digestOf('oc-1').slice(0, 200));

fs.rmSync(tmp, { recursive: true, force: true });
console.log('ai-coach.test.mjs: ALL PASS');
