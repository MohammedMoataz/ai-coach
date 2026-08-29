#!/usr/bin/env node
'use strict';
// End-to-end over the real transport: spawn the server, speak newline-delimited JSON-RPC at it,
// assert on what comes back. An isolated AICOACH_DB so nothing touches real memory.
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-coach-mcp-'));
const srv = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  env: { ...process.env, AICOACH_DB: path.join(tmp, 'm.db'), AICOACH_AUTHOR: 'mcp-tester@example.com', FORCE_COLOR: '0' },
  cwd: tmp, // a non-repo cwd: the engine must still answer, filing under the directory tenant
});

const pending = new Map();
let nextId = 1;
let buf = '';
srv.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    const cb = pending.get(msg.id);
    if (cb) { pending.delete(msg.id); cb(msg); }
  }
});
let stderr = '';
srv.stderr.on('data', (d) => { stderr += d; });

const request = (method, params) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, resolve);
  srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  setTimeout(() => { if (pending.delete(id)) reject(new Error(method + ' timed out')); }, 30000);
});
const notify = (method, params) => srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
const text = (r) => r.result.content.map((c) => c.text).join('\n');

(async () => {
  // handshake
  let r = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
  assert.strictEqual(r.result.protocolVersion, '2025-06-18', 'echoes the requested protocol version');
  assert.strictEqual(r.result.serverInfo.name, 'ai-coach', 'names itself');
  assert.ok(r.result.capabilities.tools, 'declares tools capability');
  notify('notifications/initialized');

  // tools/list: the surface is exactly the safe seven — no publish verbs
  r = await request('tools/list', {});
  const names = r.result.tools.map((t) => t.name).sort();
  assert.deepStrictEqual(names,
    ['debrief_show', 'debriefs_list', 'memory_add', 'memory_brief', 'memory_search', 'prompt_check', 'whoami'],
    'tool surface is exactly the read-mostly seven: ' + names.join(','));
  for (const t of r.result.tools) {
    assert.ok(t.description && t.description.length > 40, t.name + ' has a real description');
    assert.strictEqual(t.inputSchema.type, 'object', t.name + ' has an object schema');
  }

  // prompt_check: deterministic, no DB involved
  r = await request('tools/call', { name: 'prompt_check', arguments: { prompt: 'fix the login bug' } });
  assert.ok(!r.result.isError, 'prompt_check succeeds');
  assert.ok(text(r).includes('action-no-ref'), 'detector fires through MCP: ' + text(r));

  // memory round-trip: add, then find it
  r = await request('tools/call', { name: 'memory_add', arguments: { type: 'learning', text: 'mcp adapter smoke fact about widgets', confidence: 0.9 } });
  assert.ok(!r.result.isError, 'memory_add succeeds: ' + text(r));
  r = await request('tools/call', { name: 'memory_search', arguments: { query: 'widgets' } });
  assert.ok(text(r).includes('mcp adapter smoke fact'), 'added memory is searchable: ' + text(r));

  // whoami answers, attributed to the injected tester identity
  r = await request('tools/call', { name: 'whoami', arguments: {} });
  assert.ok(text(r).includes('mcp-tester@example.com'), 'whoami reflects identity: ' + text(r));

  // a tool failure is a readable result, not a protocol error
  r = await request('tools/call', { name: 'debrief_show', arguments: { key: 'no/such/debrief' } });
  assert.ok(r.result, 'failure still returns a result object');

  // unknown tool and unknown method are proper JSON-RPC errors
  r = await request('tools/call', { name: 'seed_export', arguments: {} });
  assert.strictEqual(r.error && r.error.code, -32602, 'unknown (and deliberately unexposed) tool is -32602');
  r = await request('no/such/method', {});
  assert.strictEqual(r.error && r.error.code, -32601, 'unknown method is -32601');

  // ping, and garbage does not kill the loop
  r = await request('ping', {});
  assert.ok(r.result, 'ping pongs');
  srv.stdin.write('this is not json\n');
  r = await request('ping', {});
  assert.ok(r.result, 'still alive after a garbage line');

  srv.kill();
  console.log('server.test.js: ALL PASS');
  process.exit(0);
})().catch((err) => {
  console.error(err && err.stack || err);
  console.error('server stderr:', stderr.slice(0, 2000));
  srv.kill();
  process.exit(1);
});
