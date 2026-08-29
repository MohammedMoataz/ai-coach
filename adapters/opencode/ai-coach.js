// AI Coach for opencode — install by copying this file into your project's `.opencode/plugins/`
// (or `~/.config/opencode/plugins/` for everywhere). It wires opencode's plugin events into the
// same engine every other harness shares: observations recorded, the secrets guard consulted
// before a tool runs, the session closed out when work goes quiet.
//
// The engine resolves like everywhere else: AICOACH_ENGINE, then the installed ~/.ai-coach/bin
// copy (run `node <repo>/plugins/ai-coach-core/hooks/engine.js bootstrap` once), and the guard
// stays opt-in: AICOACH_GUARD=on. Failures here never break the session — every handler
// swallows its own errors, the same rule the Claude Code hooks live by.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ENGINE = process.env.AICOACH_ENGINE || join(homedir(), '.ai-coach', 'bin', 'engine.js');

const engine = (args, cwd) => {
  if (!existsSync(ENGINE)) return '';
  try {
    const r = spawnSync(process.execPath, [ENGINE, ...args], { encoding: 'utf8', timeout: 15000, cwd });
    return (r.stdout || '').trim();
  } catch { return ''; }
};

// Same normalization the shim does for the guard: opencode tool names (bash, read, edit, write,
// webfetch) map onto the tiers the guard understands; everything else records under its own name.
const guardTool = (tool, args) => {
  if (args && args.command !== undefined) return 'Bash';
  if (/read/i.test(tool)) return 'Read';
  if (/write|edit/i.test(tool)) return 'Write';
  if (/fetch|url|browse/i.test(tool)) return 'WebFetch';
  return tool || '';
};

export const AiCoach = async ({ directory }) => {
  const seen = new Set(); // session rows already ensured, so one spawn per session not per event

  const ensureSession = (id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    engine(['session-start', id, directory], directory);
  };

  return {
    'session.created': async (input) => {
      try { ensureSession(input?.session?.id || input?.sessionID); } catch { /* never break the session */ }
    },

    'tool.execute.before': async (input, output) => {
      // The guard is the one hook allowed to stop anything, and it is opt-in twice over here:
      // AICOACH_GUARD=on to arm it, and AICOACH_REPO set so the guard script can be found —
      // bootstrap plants only the engine, guard.js lives in the repo clone. Blocking in opencode
      // is a thrown error; the guard's exit 2 becomes exactly that.
      const repo = process.env.AICOACH_REPO;
      if (!repo || !/^(1|on|true|yes)$/i.test(process.env.AICOACH_GUARD || '')) return;
      const guardJs = join(repo, 'plugins', 'ai-coach-core', 'hooks', 'guard.js');
      let blocked = null;
      try {
        if (!existsSync(guardJs)) return;
        const cc = {
          session_id: input?.sessionID || 'opencode',
          cwd: directory,
          hook_event_name: 'PreToolUse',
          tool_name: guardTool(input?.tool, output?.args),
          tool_input: output?.args || {},
        };
        const r = spawnSync(process.execPath, [guardJs], {
          input: JSON.stringify(cc), encoding: 'utf8', timeout: 10000,
        });
        if (r.status === 2) blocked = (r.stderr || 'blocked by the AI Coach secrets guard').trim();
      } catch { /* a missing file or timeout fails open, like every hook here */ }
      if (blocked) throw new Error(blocked);
    },

    'tool.execute.after': async (input, output) => {
      try {
        const id = input?.sessionID || 'opencode';
        ensureSession(id);
        const target = output?.args?.filePath || output?.args?.file_path || output?.args?.command || output?.title || '';
        engine(['observe', id, input?.tool || '', String(target).slice(0, 200), ''], directory);
      } catch { /* recording must never break the session */ }
    },

    'session.idle': async (input) => {
      // opencode has no session-end event; idle is the closest signal. session-end is idempotent
      // on the engine side, so firing it more than once costs nothing.
      try {
        const id = input?.sessionID || input?.session?.id;
        if (id) engine(['session-end', id, ''], directory);
      } catch { /* never break the session */ }
    },
  };
};
