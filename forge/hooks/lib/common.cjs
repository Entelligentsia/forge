'use strict';

/**
 * hooks/lib/common.cjs — Shared primitives for Forge hooks
 *
 * Provides four canonical exports used across hook files:
 *   - resolveForgePaths()       (H-1a) — read .forge/config.json and derive key paths
 *   - readStdinJson(cb, stdin)  (H-1b) — async stdin → JSON parsing (callback pattern)
 *   - formatHookOutput(name, p) (H-1c) — build hookSpecificOutput JSON envelope
 *   - FORGE_COMMAND_PATTERNS    (H-1d) — canonical forge-command RegExp array
 *
 * IMPORTANT: This file is intentionally excluded from the forge-cli payload
 * (build-payload.cjs copies only hooks/*.js, not hooks/lib/). Therefore:
 *   - Only .cjs hooks (post-init.cjs, post-sprint.cjs) may require this file.
 *   - .js hooks (triage-error.js, forge-permissions.js) retain inline copies
 *     of the patterns they need. Those inline copies carry comments pointing
 *     here as the canonical source. Keep both in sync when patterns change.
 *
 * Closes findings: H-1a, H-1b, H-1c, H-1d (FORGE-S25-T08)
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// H-1a: resolveForgePaths
// ---------------------------------------------------------------------------

/**
 * Read .forge/config.json from the current working directory and derive the
 * key filesystem paths used by hooks.
 *
 * Merged from the two identical implementations in post-init.cjs and
 * post-sprint.cjs. The post-init version included structureVersionsPath;
 * this function always returns all fields — callers that don't need a field
 * simply ignore it.
 *
 * @returns {{ forgeDir: string, eventsRoot: string, cacheDir: string,
 *             forgeRoot: string|null, structureVersionsPath: string } | null}
 *   Returns null if .forge/config.json is missing or unparseable.
 */
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

// ---------------------------------------------------------------------------
// H-1b: readStdinJson
// ---------------------------------------------------------------------------

/**
 * Read all data from a readable stream (defaulting to process.stdin), parse
 * as JSON, and invoke the callback with the result.
 *
 * Merges the async stdin reading pattern used by triage-error.js and
 * forge-permissions.js. Note: .js hooks retain inline copies of this
 * pattern to avoid a module-scope require on hooks/lib/ (forge-cli bundle
 * gap — see file header). This function is provided for .cjs hook consumers
 * and for future use when the .js extension is migrated in T14.
 *
 * @param {function(object|null): void} callback
 *   Called with the parsed object, or null if input is empty or malformed.
 * @param {NodeJS.ReadableStream} [stdin]
 *   Readable stream to consume. Defaults to process.stdin.
 */
function readStdinJson(callback, stdin) {
  const stream = stdin || process.stdin;
  if (stream.setEncoding) stream.setEncoding('utf8');
  let raw = '';
  stream.on('data', chunk => { raw += chunk; });
  stream.on('end', () => {
    if (!raw) { callback(null); return; }
    try {
      callback(JSON.parse(raw));
    } catch (_) {
      callback(null);
    }
  });
}

// ---------------------------------------------------------------------------
// H-1c: formatHookOutput
// ---------------------------------------------------------------------------

/**
 * Build the Claude Code hook stdout envelope as a JSON string.
 *
 * Claude Code hook protocol: hooks write a JSON object to stdout where the
 * top-level key is `hookSpecificOutput` containing `hookEventName` plus any
 * additional fields from payload.
 *
 * @param {string} hookEventName - e.g. 'PostToolUse', 'SessionStart'
 * @param {object} payload - additional fields to include in hookSpecificOutput
 * @returns {string} JSON string ready for process.stdout.write
 */
function formatHookOutput(hookEventName, payload) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName,
      ...payload,
    },
  });
}

// ---------------------------------------------------------------------------
// H-1d: FORGE_COMMAND_PATTERNS
// ---------------------------------------------------------------------------

/**
 * Canonical array of RegExp patterns that identify forge-related commands.
 *
 * This is the single source of truth for forge command recognition (the seam
 * that Sprint E's enum catalog will later consume). Two .js hooks maintain
 * inline copies of subsets of this list:
 *   - hooks/triage-error.js: FORGE_PATTERNS (13 regexes — subset for error triage)
 *   - hooks/forge-permissions.js: part of BASH_PATTERNS (forge-command subset)
 *
 * When adding a new forge command, update this array AND the inline copies in
 * those .js hooks. The .js hooks cannot require() this file — see file header.
 */
const FORGE_COMMAND_PATTERNS = [
  /manage-config/,
  /\.forge\//,
  /CLAUDE_PLUGIN_ROOT/,
  /FORGE_ROOT/,
  /MANAGE_CONFIG/,
  /engineering\/tools\//,
  /forge:init/,
  /forge:health/,
  /forge:regenerate/,
  /forge:update/,
  /forge:add-pipeline/,
  /forge:plan/,
  /forge:implement/,
  /forge:approve/,
  /forge:commit/,
  /forge:review/,
  /forge:sprint/,
  /forge:report-bug/,
  /forge:enhance/,
  /forge:collate/,
  /forge:validate/,
  /store-cli\.cjs/,
  /validate-store\.cjs/,
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  resolveForgePaths,
  readStdinJson,
  formatHookOutput,
  FORGE_COMMAND_PATTERNS,
};
