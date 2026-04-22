#!/usr/bin/env node
// Forge permission auto-approver — runs on PermissionRequest events.
//
// Purpose: eliminate the permission prompt storm (BUG-014) by auto-approving
// known Forge tool patterns and persisting allow rules to localSettings.
//
// Protocol (Claude Code PermissionRequest hook):
//   - stdin: JSON envelope { tool_name, tool_input, permission_suggestions }
//   - stdout: { hookSpecificOutput: { hookEventName, decision: { behavior,
//     updatedPermissions } } } to allow and persist rules
//   - exit 0 with no output: let normal permission flow proceed
//   - exit 2 with stderr: block the tool call
//
// Security model:
//   - This hook can only ALLOW, never DENY
//   - User deny rules always take precedence over hook allows
//   - Rules persist to .claude/settings.local.json (gitignored, per-project)
//   - Users can inspect/remove rules via /permissions

'use strict';

process.on('uncaughtException', (err) => {
  try { process.stderr.write(`forge-permissions: internal error (fail-open): ${err.message}\n`); } catch (_) {}
  process.exit(0);
});

// ── Pattern registry ──────────────────────────────────────────────
// Each entry: { pattern: RegExp, rule: string }
// pattern matches against the tool input string (Bash command, file path, or URL)
// rule is the allow rule content to persist via updatedPermissions

const BASH_PATTERNS = [
  // Node tool invocations — covers $FORGE_ROOT/tools/*.cjs and $CLAUDE_PLUGIN_ROOT
  { pattern: /^node\s+.*\/tools\/[\w-]+\.(cjs|js)\b/, rule: 'node ~/.claude/plugins/cache/forge/forge/*/tools/*' },
  // Inline node execution (config reads, one-liners)
  { pattern: /^node\s+-e\s+/, rule: 'node -e *' },
  { pattern: /^node\s+-p\s+/, rule: 'node -p *' },
  // Shell commands used by Forge workflows
  { pattern: /^mkdir\s+-p\s+/, rule: 'mkdir -p .forge/*' },
  { pattern: /^mkdir\s+-p\s+\S+/, rule: 'mkdir -p .forge/*' },
  { pattern: /^cp\s+/, rule: 'cp */schemas/*.schema.json .forge/schemas/' },
  { pattern: /^ls\s+/, rule: 'ls *' },
  { pattern: /^cat\s+/, rule: 'cat .forge/*' },
  { pattern: /^date\s+-u\s+/, rule: 'date -u *' },
  { pattern: /^date\s+/, rule: 'date -u *' },
  { pattern: /^jq\s+/, rule: 'jq *' },
  { pattern: /^touch\s+/, rule: 'touch *' },
  { pattern: /^uname\s+/, rule: 'uname *' },
  { pattern: /^rm\s+-f\s+/, rule: 'rm -f .forge/*' },
  { pattern: /^rm\s+-rf\s+\.forge/, rule: 'rm -rf .forge/*' },
  { pattern: /^rmdir\s+/, rule: 'rmdir *' },
  { pattern: /^gh\s+auth\s+/, rule: 'gh auth status *' },
  { pattern: /^gh\s+issue\s+/, rule: 'gh issue create *' },
  // git read-only commands (already auto-approved by Claude Code, but belt-and-suspenders)
  { pattern: /^git\s+status\b/, rule: 'git status *' },
  { pattern: /^git\s+log\b/, rule: 'git log *' },
  { pattern: /^git\s+diff\b/, rule: 'git diff *' },
  { pattern: /^git\s+add\s+/, rule: 'git add *' },
  { pattern: /^git\s+commit\s+-m\s+/, rule: 'git commit -m *' },
  { pattern: /^git\s+push\b/, rule: 'git push *' },
  { pattern: /^git\s+checkout\s+/, rule: 'git checkout *' },
  { pattern: /^git\s+branch\s+/, rule: 'git branch *' },
  { pattern: /^git\s+stash\b/, rule: 'git stash *' },
  { pattern: /^git\s+worktree\s+/, rule: 'git worktree *' },
];

const WRITE_PATTERNS = [
  { pattern: /^\.forge\//, rule: '.forge/**' },
  { pattern: /^\.claude\/commands\//, rule: '.claude/commands/**' },
  { pattern: /^engineering\//, rule: 'engineering/**' },
  { pattern: /^CLAUDE\.md$/i, rule: 'CLAUDE.md' },
  { pattern: /^AGENTS\.md$/i, rule: 'AGENTS.md' },
  { pattern: /^\.gitignore$/, rule: '.gitignore' },
];

const EDIT_PATTERNS = [
  { pattern: /^\.forge\//, rule: '.forge/**' },
  { pattern: /^\.claude\/commands\//, rule: '.claude/commands/**' },
  { pattern: /^engineering\//, rule: 'engineering/**' },
  { pattern: /^CLAUDE\.md$/i, rule: 'CLAUDE.md' },
  { pattern: /^AGENTS\.md$/i, rule: 'AGENTS.md' },
];

const WEBFETCH_PATTERNS = [
  { pattern: /^https:\/\/raw\.githubusercontent\.com\/Entelligentsia\/forge\//, rule: 'domain:raw.githubusercontent.com' },
];

const PATTERN_MAP = {
  Bash: BASH_PATTERNS,
  Write: WRITE_PATTERNS,
  Edit: EDIT_PATTERNS,
  MultiEdit: EDIT_PATTERNS,
  WebFetch: WEBFETCH_PATTERNS,
};

// ── All rules to persist on first approval ─────────────────────────
// These are written to .claude/settings.local.json via updatedPermissions
// so subsequent calls skip the PermissionRequest hook entirely.

const ALL_RULES = [
  { toolName: 'Bash', ruleContent: 'node ~/.claude/plugins/cache/forge/forge/*/tools/*' },
  { toolName: 'Bash', ruleContent: 'node -e *' },
  { toolName: 'Bash', ruleContent: 'node -p *' },
  { toolName: 'Bash', ruleContent: 'mkdir -p .forge/*' },
  { toolName: 'Bash', ruleContent: 'cp */schemas/*.schema.json .forge/schemas/' },
  { toolName: 'Bash', ruleContent: 'ls *' },
  { toolName: 'Bash', ruleContent: 'cat .forge/*' },
  { toolName: 'Bash', ruleContent: 'date -u *' },
  { toolName: 'Bash', ruleContent: 'jq *' },
  { toolName: 'Bash', ruleContent: 'touch *' },
  { toolName: 'Bash', ruleContent: 'uname *' },
  { toolName: 'Bash', ruleContent: 'rm -f .forge/*' },
  { toolName: 'Bash', ruleContent: 'rm -rf .forge/*' },
  { toolName: 'Bash', ruleContent: 'rmdir *' },
  { toolName: 'Bash', ruleContent: 'gh auth status *' },
  { toolName: 'Bash', ruleContent: 'gh issue create *' },
  { toolName: 'Bash', ruleContent: 'git add *' },
  { toolName: 'Bash', ruleContent: 'git commit -m *' },
  { toolName: 'Bash', ruleContent: 'git push *' },
  { toolName: 'Write', ruleContent: '.forge/**' },
  { toolName: 'Write', ruleContent: '.claude/commands/**' },
  { toolName: 'Write', ruleContent: 'engineering/**' },
  { toolName: 'Write', ruleContent: 'CLAUDE.md' },
  { toolName: 'Write', ruleContent: 'AGENTS.md' },
  { toolName: 'Write', ruleContent: '.gitignore' },
  { toolName: 'Edit', ruleContent: '.forge/**' },
  { toolName: 'Edit', ruleContent: '.claude/commands/**' },
  { toolName: 'Edit', ruleContent: 'engineering/**' },
  { toolName: 'Edit', ruleContent: 'CLAUDE.md' },
  { toolName: 'Edit', ruleContent: 'AGENTS.md' },
  { toolName: 'WebFetch', ruleContent: 'domain:raw.githubusercontent.com' },
];

// ── Core logic ─────────────────────────────────────────────────────

function matchTool(toolName, toolInput) {
  const patterns = PATTERN_MAP[toolName];
  if (!patterns) return null;

  const input = toolName === 'Bash' ? (toolInput.command || '')
    : (toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit') ? (toolInput.file_path || '')
    : toolName === 'WebFetch' ? (toolInput.url || '')
    : '';

  for (const { pattern, rule } of patterns) {
    if (pattern.test(input)) return rule;
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────────

let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  let event;
  try {
    event = JSON.parse(input);
  } catch (_) {
    // Unparseable input — fail open, let normal permission flow handle it
    process.exit(0);
  }

  const { tool_name, tool_input } = event;
  if (!tool_name || !tool_input) {
    process.exit(0);
  }

  const matchedRule = matchTool(tool_name, tool_input || {});
  if (matchedRule) {
    const response = {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: {
          behavior: 'allow',
          updatedPermissions: [{
            type: 'addRules',
            rules: ALL_RULES,
            behavior: 'allow',
            destination: 'localSettings',
          }],
        },
      },
    };
    process.stdout.write(JSON.stringify(response));
    process.exit(0);
  }

  // Not a Forge pattern — exit 0 with no output to let normal permission flow proceed
  process.exit(0);
});

// Export for testing
module.exports = { matchTool, BASH_PATTERNS, WRITE_PATTERNS, EDIT_PATTERNS, WEBFETCH_PATTERNS, ALL_RULES };