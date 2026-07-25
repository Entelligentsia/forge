/**
 * Tests for check-placeholders.cjs — the post-materialization gate that fails
 * when a generated file still carries a literal placeholder.
 *
 * Motivation (#47): `{SYNTAX_CHECK}` and `{BUILD_COMMAND}` shipped unsubstituted
 * in every materialized implement_plan.md across three projects because the
 * source used the single-brace form, which `substitute-placeholders.cjs` never
 * matches. generate-workflows.md already *required* a no-placeholder check; it
 * had no tool to run, so nothing enforced it.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const SCRIPT_PATH = path.join(__dirname, '..', 'check-placeholders.cjs');
const { findPlaceholders, SUBSTITUTION_KEYS } = require(SCRIPT_PATH);
const { buildSubstitutionMap } = require(path.join(__dirname, '..', 'substitute-placeholders.cjs'));

function withTempFile(content, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-placeholders-'));
  const file = path.join(dir, 'workflow.md');
  fs.writeFileSync(file, content);
  try {
    return fn(file, dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('findPlaceholders — unsubstituted double-brace tokens', () => {
  test('flags a leftover {{KEY}}', () => {
    const found = findPlaceholders('Run tests: {{TEST_COMMAND}}\n');
    assert.equal(found.length, 1);
    assert.equal(found[0].token, '{{TEST_COMMAND}}');
    assert.equal(found[0].line, 1);
  });

  test('reports every occurrence with its line number', () => {
    const found = findPlaceholders('a\n{{BUILD_COMMAND}}\nb\n{{SYNTAX_CHECK}}\n');
    assert.deepEqual(
      found.map((f) => [f.line, f.token]),
      [
        [2, '{{BUILD_COMMAND}}'],
        [4, '{{SYNTAX_CHECK}}'],
      ],
    );
  });

  test('ignores runtime passthrough keys', () => {
    const found = findPlaceholders('Sprint {{SPRINT_ID}} task {{TASK_ID}} on {{DATE}}\n');
    assert.deepEqual(found, []);
  });

  test('returns empty for a fully substituted file', () => {
    assert.deepEqual(findPlaceholders('Run tests: cargo test\n'), []);
  });

  // Prose that *describes* the token syntax wraps it in backticks. Real
  // migrate_structural.md line: "`{{KEY}}` tokens that survived substitution".
  test('ignores a token wrapped in backticks (documentation reference)', () => {
    const found = findPlaceholders('- **`{{KEY}}` tokens that survived substitution** → flag for review\n');
    assert.deepEqual(found, []);
  });

  test('still flags a bare token on a line that also has backticked prose', () => {
    const found = findPlaceholders('See `{{KEY}}` docs. Run: {{TEST_COMMAND}}\n');
    assert.equal(found.length, 1);
    assert.equal(found[0].token, '{{TEST_COMMAND}}');
  });

  // Workflows carry template tokens the substitution engine never owns —
  // enhance.md's report skeleton uses {{KEY1}}/{{KEY2}} as illustrative names
  // the agent fills at runtime. Flagging those made the gate unusable.
  test('ignores tokens outside the known substitution key set', () => {
    const found = findPlaceholders('Fills applied: N key(s) — {{KEY1}}, {{KEY2}}, ...\n');
    assert.deepEqual(found, []);
  });
});

describe('SUBSTITUTION_KEYS stays in sync with the substitution map', () => {
  // The gate can only flag a key it knows about. If a key is added to
  // substitute-placeholders.cjs but not here, an unsubstituted occurrence
  // ships silently — which is exactly how #47 reached three projects.
  test('every gate key is produced by buildSubstitutionMap', () => {
    const config = {
      project: { name: 'X', prefix: 'X' },
      commands: { test: 't', lint: 'l', build: 'b', syntaxCheck: { js: 'c' } },
      paths: { engineering: 'eng' },
    };
    const context = {
      entities: ['A'],
      architecture: { dataAccess: 'x', keyDirectories: ['src/'] },
    };
    const map = buildSubstitutionMap(config, context);
    const missing = [...SUBSTITUTION_KEYS].filter((k) => !map.has(k));
    assert.deepEqual(missing, [], `gate keys absent from the substitution map: ${missing.join(', ')}`);
  });
});

describe('findPlaceholders — wrong-brace-form authoring errors', () => {
  test('flags single-brace {SYNTAX_CHECK} as a never-substituted token', () => {
    const found = findPlaceholders('Run syntax verification: {SYNTAX_CHECK}\n');
    assert.equal(found.length, 1);
    assert.equal(found[0].token, '{SYNTAX_CHECK}');
    assert.match(found[0].reason, /double-brace/i);
  });

  test('flags single-brace {BUILD_COMMAND} and {TEST_COMMAND}', () => {
    const found = findPlaceholders('{BUILD_COMMAND} and {TEST_COMMAND}\n');
    assert.equal(found.length, 2);
  });

  test('does not flag arbitrary single-brace prose', () => {
    const found = findPlaceholders('Substitute {record_id} and {taskId} per step 0a.\n');
    assert.deepEqual(found, []);
  });
});

describe('CLI behaviour', () => {
  test('exits 0 on a clean file', () => {
    withTempFile('Run tests: cargo test\n', (file) => {
      const r = spawnSync('node', [SCRIPT_PATH, file], { encoding: 'utf8' });
      assert.equal(r.status, 0);
    });
  });

  test('exits 1 and names the file and token on a dirty file', () => {
    withTempFile('Run syntax verification: {SYNTAX_CHECK}\n', (file) => {
      const r = spawnSync('node', [SCRIPT_PATH, file], { encoding: 'utf8' });
      assert.equal(r.status, 1);
      const out = r.stdout + r.stderr;
      assert.match(out, /SYNTAX_CHECK/);
      assert.match(out, /workflow\.md/);
    });
  });

  test('scans a directory recursively', () => {
    withTempFile('{{BUILD_COMMAND}}\n', (_file, dir) => {
      const r = spawnSync('node', [SCRIPT_PATH, dir], { encoding: 'utf8' });
      assert.equal(r.status, 1);
      assert.match(r.stdout + r.stderr, /BUILD_COMMAND/);
    });
  });

  test('exits 2 when no path is given', () => {
    const r = spawnSync('node', [SCRIPT_PATH], { encoding: 'utf8' });
    assert.equal(r.status, 2);
  });
});
