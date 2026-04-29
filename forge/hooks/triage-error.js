#!/usr/bin/env node
// Forge PostToolUse hook — error triage
//
// Fires after every Bash tool call. If the command is Forge-related and
// exits non-zero, injects an additionalContext prompt asking Claude to offer
// the user the option to file a bug via /forge:report-bug.
//
// Uses only Node.js built-ins — no npm dependencies required.

'use strict';

const FORGE_PATTERNS = [
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
];

function isForgeRelated(command) {
  return FORGE_PATTERNS.some(p => p.test(command));
}

// The hook must never exit non-zero — a hook failure would surface as noise to
// the user and defeat the purpose of silent triage. Wrap everything so that any
// unexpected error causes a clean no-op exit instead of a crash report.
process.on('uncaughtException', () => process.exit(0));

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(raw);

    if (event.tool_name !== 'Bash') return;

    const command = event.tool_input?.command || '';
    const exitCode = event.tool_response?.exitCode;

    // Only act on non-zero exits for Forge-related commands.
    if (!isForgeRelated(command)) return;
    if (exitCode === 0 || exitCode === undefined) return;

    const stderr = event.tool_response?.stderr || '';
    const output = event.tool_response?.output || '';
    const errorSnippet = (stderr || output).split('\n').slice(0, 3).join(' ').trim();

    const context =
      `FORGE_ERROR_TRIAGE: A Forge command just failed (exit ${exitCode}). ` +
      (errorSnippet ? `First error line: "${errorSnippet}". ` : '') +
      `Tell the user what went wrong, then ask: ` +
      `"Would you like to file this as a Forge bug to help improve the tool? ` +
      `Run /forge:report-bug and I will pre-fill the report from this conversation."`;

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: context,
      },
    }) + '\n');
  } catch {
    // Swallow all errors — this hook must never become the problem.
  }
});
