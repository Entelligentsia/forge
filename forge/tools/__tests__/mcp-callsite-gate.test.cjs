'use strict';
// Grep gate for FORGE-S34-T07: ensures no covered Bash-cjs call-sites remain
// in model-facing markdown after the MCP call-site migration.
//
// The 14 MCP tools each have a corresponding .cjs file. This gate scans all
// model-facing markdown (workflows, personas, commands, fragments) and FAILS
// if it finds any `node .forge/tools/<x>.cjs` instruction for the 8 cjs-backed
// covered tools (the 2 native-TS tools — forge_markdown, forge_ask_user — have
// no .cjs to grep for).
//
// Allowlisted exclusions:
//   1. forge/forge/hooks/**  — hook scripts exec .cjs outside the LLM loop.
//   2. friction-emit.cjs     — not in the 14 tools.
//   3. read-verdict.cjs, manage-versions.cjs, build-overlay.cjs,
//      build-context-pack.cjs, substitute-placeholders.cjs, forge-preflight.cjs
//      — orchestrator/build internals, not in 14.
//   4. _fragments/friction-emit.md — uses friction-emit.cjs (allowlisted above).
//   5. meta-migrate.md — legitimately references validate-store.cjs as a
//      migration run-command, not as an agent-facing instruction.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Resolve forge root relative to this test file.
// __dirname = forge/forge/tools/__tests__
// FORGE_ROOT = forge/forge
const FORGE_ROOT = path.resolve(__dirname, '..', '..');

// Directories to scan for model-facing markdown.
const SCAN_DIRS = [
  path.join(FORGE_ROOT, 'meta', 'workflows'),
  path.join(FORGE_ROOT, 'meta', 'personas'),
  path.join(FORGE_ROOT, 'meta', 'fragments'),
  path.join(FORGE_ROOT, 'meta', 'skills'),
  path.join(FORGE_ROOT, 'commands'),
];

// The 8 cjs-backed covered tool names (covered by the 14-tool MCP surface,
// excluding the 2 native-TS tools which have no .cjs counterpart).
const COVERED_CJS = [
  'store-cli.cjs',
  'collate.cjs',
  'validate-store.cjs',
  'manage-config.cjs',
  'commit-task.cjs',
  'preflight-gate.cjs',
  'banners.cjs',
  'verify-apply.cjs',
  'artifact.cjs',
];

// Allowlisted .cjs names: not in the 14-tool surface.
const ALLOWLISTED_CJS = new Set([
  'friction-emit.cjs',
  'read-verdict.cjs',
  'manage-versions.cjs',
  'build-overlay.cjs',
  'build-context-pack.cjs',
  'substitute-placeholders.cjs',
  'forge-preflight.cjs',
]);

// Allowlisted file basenames: these files legitimately reference covered .cjs
// for non-agent-instruction purposes.
const ALLOWLISTED_BASENAMES = new Set([
  'friction-emit.md',  // documents the excluded tool
  'meta-migrate.md',   // uses validate-store.cjs as a migration run-command
]);

/**
 * Collect all .md files under the given directory recursively,
 * excluding any path that contains /hooks/ (hook scripts are excluded).
 */
function collectMarkdownFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Exclude hook paths.
      if (full.includes('/hooks/')) continue;
      results.push(full);
    }
  }
  return results;
}

/**
 * Scan a file for any `node .forge/tools/<covered>.cjs` patterns.
 * Returns an array of { file, line, lineNumber, tool } objects.
 */
function scanFile(filePath) {
  const basename = path.basename(filePath);
  if (ALLOWLISTED_BASENAMES.has(basename)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const hits = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const tool of COVERED_CJS) {
      // Match: node .forge/tools/<tool> (with optional leading backtick/space)
      if (line.includes(`node .forge/tools/${tool}`) || line.includes(`node \`.forge/tools/${tool}`)) {
        hits.push({ file: filePath, line: line.trim(), lineNumber: i + 1, tool });
      }
    }
  }
  return hits;
}

test('no covered Bash-cjs call-sites remain in model-facing markdown', () => {
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    allFiles.push(...collectMarkdownFiles(dir));
  }

  const violations = [];
  for (const file of allFiles) {
    violations.push(...scanFile(file));
  }

  if (violations.length > 0) {
    const report = violations
      .map(v => `  ${path.relative(FORGE_ROOT, v.file)}:${v.lineNumber}: [${v.tool}] ${v.line}`)
      .join('\n');
    assert.fail(
      `Found ${violations.length} Bash-cjs call-site(s) for covered MCP tools:\n${report}\n\n` +
      'These must be migrated to forge_store/forge_preflight/forge_collate/etc. MCP tool calls.\n' +
      'See FORGE-S34-T07 for the migration playbook.'
    );
  }
});
