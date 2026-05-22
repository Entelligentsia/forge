'use strict';
// FORGE-S25-T01 — paired test for check-no-skipped-tests.cjs.
//
// The script scans test files for `it.skip` / `describe.skip` / `xit` /
// `xdescribe` / `it.only` / `describe.only` and exits non-zero on any hit.
// A secondary "re-?enable" / "FIXME: skip" check is warn-only — it prints
// to stderr but does NOT change the exit code, so the canonical
// `TODO(FORGE-S25-T28)` comment in the workflow file cannot self-trip CI.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'check-no-skipped-tests.cjs');

function makeProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-skip-gate-'));
  fs.mkdirSync(path.join(tmp, 'forge', 'tools', '__tests__'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'forge', 'hooks', '__tests__'), { recursive: true });
  return tmp;
}

function runGate(cwd) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd, encoding: 'utf8', timeout: 10000,
  });
}

describe('check-no-skipped-tests.cjs — clean tree', () => {
  test('exit 0 on a clean tree with passing tests', () => {
    const tmp = makeProject();
    try {
      fs.writeFileSync(
        path.join(tmp, 'forge', 'tools', '__tests__', 'a.test.cjs'),
        "const { test } = require('node:test');\ntest('ok', () => {});\n"
      );
      const r = runGate(tmp);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}. stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('exit 0 on empty tree (no test files)', () => {
    const tmp = makeProject();
    try {
      const r = runGate(tmp);
      assert.equal(r.status, 0, `expected exit 0 on empty tree, got ${r.status}. stderr: ${r.stderr}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('check-no-skipped-tests.cjs — primary regex hard-fails', () => {
  for (const offender of [
    "test.skip('x', () => {});",
    "it.skip('x', () => {});",
    "describe.skip('x', () => {});",
    "it.only('x', () => {});",
    "test.only('x', () => {});",
    "describe.only('x', () => {});",
    "xit('x', () => {});",
    "xdescribe('x', () => {});",
  ]) {
    test(`exit 1 on "${offender}"`, () => {
      const tmp = makeProject();
      try {
        const file = path.join(tmp, 'forge', 'tools', '__tests__', 'bad.test.cjs');
        fs.writeFileSync(file, "'use strict';\n" + offender + "\n");
        const r = runGate(tmp);
        assert.equal(r.status, 1, `expected exit 1 for ${offender}, got ${r.status}. stderr: ${r.stderr}\nstdout: ${r.stdout}`);
        assert.match(r.stderr + r.stdout, /bad\.test\.cjs/, `expected file path in output. Got stderr: ${r.stderr}\nstdout: ${r.stdout}`);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  }

  test('exit 1 on hook test file with skip', () => {
    const tmp = makeProject();
    try {
      fs.writeFileSync(
        path.join(tmp, 'forge', 'hooks', '__tests__', 'bad.test.cjs'),
        "test.skip('x', () => {});\n"
      );
      const r = runGate(tmp);
      assert.equal(r.status, 1, `expected exit 1, got ${r.status}. stderr: ${r.stderr}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('check-no-skipped-tests.cjs — secondary check is warn-only', () => {
  test('exit 0 on "// TODO: re-enable" comment (warn-only)', () => {
    const tmp = makeProject();
    try {
      fs.writeFileSync(
        path.join(tmp, 'forge', 'tools', '__tests__', 'comment.test.cjs'),
        "// TODO(FORGE-S25-T28): re-enable once devDependencies land.\ntest('ok', () => {});\n"
      );
      const r = runGate(tmp);
      assert.equal(r.status, 0, `expected exit 0 (warn-only), got ${r.status}. stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('exit 0 on "// FIXME: skip" comment (warn-only)', () => {
    const tmp = makeProject();
    try {
      fs.writeFileSync(
        path.join(tmp, 'forge', 'tools', '__tests__', 'fixme.test.cjs'),
        "// FIXME: skip this once root cause is fixed.\ntest('ok', () => {});\n"
      );
      const r = runGate(tmp);
      assert.equal(r.status, 0, `expected exit 0 (warn-only), got ${r.status}. stderr: ${r.stderr}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('check-no-skipped-tests.cjs — false-positive boundary', () => {
  test('string containing the word "skip" inside a test name does NOT trip', () => {
    const tmp = makeProject();
    try {
      fs.writeFileSync(
        path.join(tmp, 'forge', 'tools', '__tests__', 'name.test.cjs'),
        "test('this test does not skip anything', () => {});\n"
      );
      const r = runGate(tmp);
      assert.equal(r.status, 0, `expected exit 0, got ${r.status}. stderr: ${r.stderr}\nstdout: ${r.stdout}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('fixtures directory is excluded from scan', () => {
    const tmp = makeProject();
    try {
      fs.mkdirSync(path.join(tmp, 'forge', 'tools', '__tests__', 'fixtures'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, 'forge', 'tools', '__tests__', 'fixtures', 'bad.test.cjs'),
        "test.skip('x', () => {});\n"
      );
      const r = runGate(tmp);
      assert.equal(r.status, 0, `fixtures should be excluded. status=${r.status} stderr: ${r.stderr}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
