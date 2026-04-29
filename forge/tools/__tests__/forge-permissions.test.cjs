'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Import the module under test
const {
  matchTool,
  BASH_PATTERNS,
  WRITE_PATTERNS,
  EDIT_PATTERNS,
  WEBFETCH_PATTERNS,
} = require('../../hooks/forge-permissions.js');

// ── C1: Bulk permission escalation ────────────────────────────────
// A match should return ONLY the matched rule, not ALL_RULES.
// After fix: module no longer exports ALL_RULES.

describe('C1: no bulk permission escalation', () => {
  test('matchTool returns matched rule string, not an array of all rules', () => {
    const result = matchTool('Bash', { command: 'ls .forge/' });
    assert.equal(typeof result, 'string', 'matchTool should return a string rule');
    // The result should be the specific matched rule, not something containing 'git push'
    assert.ok(!result.includes('git push'), 'matched rule must not contain unrelated git push rule');
  });

  test('ls command matches scoped ls rule', () => {
    const result = matchTool('Bash', { command: 'ls .forge/' });
    assert.equal(result, 'ls *', 'ls should match ls *');
  });

  test('matchTool returns null for unmatched tool', () => {
    const result = matchTool('Bash', { command: 'curl https://evil.com' });
    assert.equal(result, null, 'unmatched command should return null');
  });
});

// ── C2: node -e/p must NOT be auto-approved ──────────────────────
describe('C2: node -e and node -p patterns removed', () => {
  test('node -e does NOT match any pattern', () => {
    const result = matchTool('Bash', { command: 'node -e "console.log(1)"' });
    assert.equal(result, null, 'node -e should not be auto-approved');
  });

  test('node -p does NOT match any pattern', () => {
    const result = matchTool('Bash', { command: 'node -p "process.version"' });
    assert.equal(result, null, 'node -p should not be auto-approved');
  });

  test('node tools/*.cjs still matches', () => {
    const result = matchTool('Bash', { command: 'node /home/user/.claude/plugins/cache/forge/forge/0.28.1/tools/validate-store.cjs' });
    assert.ok(result !== null, 'node tools/*.cjs should still be matched');
    assert.ok(result.includes('tools'), 'node tools rule should contain "tools"');
  });
});

// ── W1-W3: Broad wildcards scoped ─────────────────────────────────
describe('W1-W3: broad wildcards scoped', () => {
  test('touch matches scoped .forge/* rule', () => {
    // After fix: touch pattern should scope to project paths
    const result = matchTool('Bash', { command: 'touch .forge/config.json' });
    assert.ok(result !== null, 'touch .forge/ should still match');
  });

  test('rm -f .forge/* changed to rm .forge/* (no -f)', () => {
    const result = matchTool('Bash', { command: 'rm -f .forge/cache.json' });
    // After fix, the -f pattern is removed; only rm .forge/* remains
    // This specific command with -f should still match if a broader rm pattern exists
    // OR it should not match if -f was removed
    // We'll verify the pattern change in the patterns themselves
    const hasMinusF = BASH_PATTERNS.some(p => p.rule === 'rm -f .forge/*');
    assert.equal(hasMinusF, false, 'rm -f .forge/* rule must be removed');
  });

  test('ALL_RULES constant removed from exports', () => {
    const mod = require('../../hooks/forge-permissions.js');
    assert.equal(mod.ALL_RULES, undefined, 'ALL_RULES must not be exported');
  });
});