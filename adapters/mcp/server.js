#!/usr/bin/env node
'use strict';
// AI Coach as an MCP server — the team memory, the debriefs, and the prompt detectors, spoken
// over the one protocol every harness understands: Claude Code, Codex, Cursor, opencode,
// Windsurf, Gemini CLI. Zero dependencies, like everything else here: stdio transport is
// newline-delimited JSON-RPC 2.0, and that needs a readline loop, not an SDK.
//
// The server shells out to the engine CLI rather than requiring engine.js, on purpose: the CLI
// is the cross-plugin ABI, it is what CI guards, and a server one refactor behind the engine
// should fail loudly at a verb boundary rather than quietly at a renamed internal.
//
// Deliberately NOT exposed: seed-export, debrief-publish, handoff — side effects a person fires.
// That rule is the product's oldest ("only you publish it"), and an MCP tool is model-invoked
// by definition, so the write surface here is memory_add and nothing else.
//
// Run:  node adapters/mcp/server.js
// Engine resolution: AICOACH_ENGINE > ~/.ai-coach/bin/engine.js > this repo checkout.

const path = require('node:path');
const fs = require('node:fs');
const readline = require('node:readline');
const { spawnSync } = require('node:child_process');

const PROTOCOL_FALLBACK = '2025-06-18';
const VERSION = '1.0.0';

function enginePath() {
  if (process.env.AICOACH_ENGINE) return process.env.AICOACH_ENGINE;
  const installed = path.join(require('node:os').homedir(), '.ai-coach', 'bin', 'engine.js');
  if (fs.existsSync(installed)) return installed;
  // running from a repo checkout — the normal case for a non-Claude harness
  return path.join(__dirname, '..', '..', 'plugins', 'ai-coach-core', 'hooks', 'engine.js');
}

function engine(args) {
  const r = spawnSync(process.execPath, [enginePath(), ...args], {
    encoding: 'utf8', timeout: 30000, cwd: process.cwd(),
  });
  if (r.error) throw new Error('engine did not run: ' + r.error.message);
  if (r.status !== 0) throw new Error(('engine ' + args[0] + ' failed: ' + (r.stderr || r.stdout || 'exit ' + r.status)).trim());
  return (r.stdout || '').trim() || '(no output)';
}

// One place per tool: name, what the model reads to decide, the schema, and the verb mapping.
const TOOLS = [
  {
    name: 'memory_search',
    description: 'Search this team\'s persistent project memory — learnings, constraints, references and notes accumulated across sessions and teammates. Use before re-deriving anything: "did we hit this before", "what do we know about X". Results are ranked and carry who learned each fact and when.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look for. Plain words; FTS handles the rest.' },
        full: { type: 'boolean', description: 'Include full memory bodies instead of the ranked summary.' },
      },
      required: ['query'],
    },
    run: (a) => engine(['search', ...(a.full ? ['--full'] : []), String(a.query)]),
  },
  {
    name: 'memory_add',
    description: 'Save one durable fact to the team\'s project memory: a learning, a constraint, a reference, or a note. Use for something worth knowing next session — not for narrating this one. One fact per call; confidence defaults sensibly.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['learning', 'constraint', 'reference', 'note'], description: 'What kind of fact this is.' },
        text: { type: 'string', description: 'The fact, one or two sentences, self-contained.' },
        confidence: { type: 'number', minimum: 0, maximum: 1, description: 'How sure. Omit for the default.' },
      },
      required: ['type', 'text'],
    },
    run: (a) => engine(['add', String(a.type), String(a.text),
      ...(a.confidence != null ? [String(a.confidence)] : [])]),
  },
  {
    name: 'memory_brief',
    description: 'The session-start brief: the highest-ranked memories for this project, sized to a character budget. Use at the start of work in a harness that has no session hooks — this is what Claude Code users get injected automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        chars: { type: 'number', description: 'Budget in characters. Omit for the configured default.' },
      },
    },
    run: (a) => engine(['brief', ...(a.chars ? [String(a.chars)] : [])]),
  },
  {
    name: 'debriefs_list',
    description: 'List the published debriefs for this project — what people concluded when they finished pieces of work, newest first. Each is date/author/name.',
    inputSchema: { type: 'object', properties: {} },
    run: () => engine(['debriefs']),
  },
  {
    name: 'debrief_show',
    description: 'Show one published debrief in full by its date/author/name key, as listed by debriefs_list.',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string', description: 'The debrief key, e.g. 2026-08-20/sara@example.com/orders-csv-export' } },
      required: ['key'],
    },
    run: (a) => engine(['debrief-show', String(a.key)]),
  },
  {
    name: 'prompt_check',
    description: 'Run nine deterministic prompt-quality detectors over a draft prompt before sending it to an agent or a fresh context. No model call, records nothing. Returns the flags and hints, "clean", or "exempt" for exploratory questions.',
    inputSchema: {
      type: 'object',
      properties: { prompt: { type: 'string', description: 'The draft prompt to check.' } },
      required: ['prompt'],
    },
    run: (a) => engine(['prompt-check', String(a.prompt)]),
  },
  {
    name: 'whoami',
    description: 'The identity the memory files under: email, name, role, project, branch — and which of those are missing. Useful to diagnose why memories or debriefs are not attributed.',
    inputSchema: { type: 'object', properties: {} },
    run: () => engine(['whoami']),
  },
];

const rpc = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');

function handle(msg) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;
  switch (method) {
    case 'initialize':
      return send(rpc(id, {
        protocolVersion: (params && params.protocolVersion) || PROTOCOL_FALLBACK,
        capabilities: { tools: {} },
        serverInfo: { name: 'ai-coach', version: VERSION },
        instructions: 'Team memory, debriefs and prompt checks for this machine\'s AI Coach data. '
          + 'Search memory before re-deriving; add one durable fact when you learn one. '
          + 'Publishing (debriefs, seed exports) is deliberately absent — a person fires those.',
      }));
    case 'tools/list':
      return send(rpc(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) }));
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === (params && params.name));
      if (!tool) return send(rpcErr(id, -32602, 'unknown tool: ' + (params && params.name)));
      try {
        return send(rpc(id, { content: [{ type: 'text', text: tool.run((params && params.arguments) || {}) }] }));
      } catch (err) {
        // tool failure is a result, not a protocol error — the model should read it
        return send(rpc(id, { content: [{ type: 'text', text: String(err.message || err) }], isError: true }));
      }
    }
    case 'ping':
      return send(rpc(id, {}));
    default:
      // notifications (initialized, cancelled, …) are absorbed; unknown REQUESTS get an error
      if (isRequest) return send(rpcErr(id, -32601, 'method not found: ' + method));
  }
}

readline.createInterface({ input: process.stdin, terminal: false }).on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return send(rpcErr(null, -32700, 'parse error')); }
  try { handle(msg); } catch (err) {
    if (msg && msg.id !== undefined) send(rpcErr(msg.id, -32603, String(err.message || err)));
  }
}).on('close', () => process.exit(0));
