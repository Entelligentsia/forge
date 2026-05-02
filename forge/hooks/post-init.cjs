#!/usr/bin/env node
'use strict';

// Forge hook: post-init
// PostToolUse hook that fires once at the END of a successful /forge:init
// Phase 4 (NOT on Resume "start over" or stale-checkpoint cleanup) and
// invokes /forge:enhance --phase 1 --auto.
//
// Trigger detection uses a positive end-of-flow signal: in addition to
// matching `rm -f .forge/init-progress.json`, the hook requires
// `.forge/structure-versions.json` to exist AND have an mtime within the
// last 10 seconds (T05 writes it just before the terminal rm in Phase 4).
//
// Idempotency: a sentinel file under .forge/cache/ prevents a second firing
// for the same init invocation. Because cache/ lives inside .forge/, a
// manual `rm -rf .forge/` followed by re-init naturally clears the sentinel.
//
// Fail-open: any internal error → stderr warning + exit 0. Hook failure must
// never block /forge:init.

process.on('uncaughtException', (err) => {
  try { process.stderr.write(`forge post-init: internal error (fail-open): ${err.message}\n`); } catch (_) {}
  process.exit(0);
});

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function resolveForgePaths() {
  const cfgPath = path.join(process.cwd(), '.forge', 'config.json');
  if (!fs.existsSync(cfgPath)) return null;
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (_) { return null; }
  const forgeDir = path.dirname(cfgPath);
  return {
    forgeDir,
    eventsRoot: path.join(forgeDir, 'store', 'events'),
    structureVersionsPath: path.join(forgeDir, 'structure-versions.json'),
    cacheDir: path.join(forgeDir, 'cache'),
    forgeRoot: (cfg.paths && cfg.paths.forgeRoot) || null,
  };
}

let raw = '';
try { raw = fs.readFileSync(0, 'utf8'); } catch (_) { process.exit(0); }

let envelope;
try { envelope = JSON.parse(raw); } catch (_) { process.exit(0); }

if (!envelope || envelope.tool_name !== 'Bash') process.exit(0);

const exitCode = envelope.tool_response && envelope.tool_response.exitCode;
if (exitCode !== 0 && exitCode !== undefined) process.exit(0);

const command = (envelope.tool_input && envelope.tool_input.command) || '';

// Primary trigger: terminal rm of init-progress.json.
const TRIGGER_RX = /\brm\s+-f\s+\.forge\/init-progress\.json\b/;
if (!TRIGGER_RX.test(command)) process.exit(0);

const paths = resolveForgePaths();
if (!paths) process.exit(0);

// Secondary positive signal: structure-versions.json must exist AND be
// freshly written (mtime within the last 10 s). T05 guarantees this for
// successful Phase 4 runs; Resume "start over" / stale-checkpoint cleanup
// branches do NOT touch structure-versions.json.
if (!fs.existsSync(paths.structureVersionsPath)) process.exit(0);

let mtimeMs;
try { mtimeMs = fs.statSync(paths.structureVersionsPath).mtimeMs; } catch (_) { process.exit(0); }
if (Date.now() - mtimeMs > 10_000) process.exit(0);

// Idempotency: sentinel under .forge/cache/.
try { fs.mkdirSync(paths.cacheDir, { recursive: true }); } catch (_) {}
const sentinel = path.join(paths.cacheDir, 'post-init-enhancement-triggered');
if (fs.existsSync(sentinel)) process.exit(0);

// Build a unique eventId — pid + hrtime guards against same-second collisions
// when two firings occur in the same wall-clock second.
const iso = new Date().toISOString().replace(/[:.]/g, '');
const eventId = `${iso}_enhance_trigger_phase1_${process.pid}_${process.hrtime.bigint()}`;

const now = new Date().toISOString();
const event = {
  eventId,
  taskId: 'enhancement',
  sprintId: 'enhancement',
  role: 'hook',
  action: 'enhancement-trigger',
  phase: 'post-init',
  iteration: 1,
  startTimestamp: now,
  endTimestamp: now,
  durationMinutes: 0,
  model: 'n/a',
  notes: JSON.stringify({
    triggerSource: 'post-init',
    targetPhase: 1,
    detectedSprintId: 'n/a',
  }),
};

// Emit via store-cli.cjs when forgeRoot is known. spawnSync timeout of 3s
// caps the impact of a hung child process — outer hook timeout is 10s.
try {
  if (paths.forgeRoot) {
    const eventsBucket = path.join(paths.eventsRoot, 'enhancement');
    fs.mkdirSync(eventsBucket, { recursive: true });
    const cli = path.join(paths.forgeRoot, 'tools', 'store-cli.cjs');
    if (fs.existsSync(cli)) {
      spawnSync('node', [cli, 'emit', 'enhancement', JSON.stringify(event)], {
        cwd: process.cwd(),
        timeout: 3000,
        encoding: 'utf8',
      });
    }
  }
} catch (_) { /* fail-open */ }

// Write sentinel AFTER emit so a crash during emit allows a retry on next
// firing (the user can re-run init if the first attempt failed).
try { fs.writeFileSync(sentinel, '', 'utf8'); } catch (_) {}

// Inject the slash-command request into the next assistant turn.
try {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        'Forge: /forge:init has completed Phase 4. Run /forge:enhance --phase 1 --auto to materialise project-specific starter-pack content from the freshly captured structural snapshot.',
    },
  }) + '\n');
} catch (_) { /* fail-open */ }

process.exit(0);
