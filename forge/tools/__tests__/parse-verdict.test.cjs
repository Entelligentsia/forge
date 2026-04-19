'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseVerdict } = require('../parse-verdict.cjs');

describe('parse-verdict.cjs :: parseVerdict()', () => {
  test('recognises **Verdict:** Approved', () => {
    assert.equal(parseVerdict('**Verdict:** Approved'), 'approved');
  });

  test('strips surrounding brackets: **Verdict:** [Approved]', () => {
    assert.equal(parseVerdict('**Verdict:** [Approved]'), 'approved');
  });

  test('is case-insensitive on the value: **Verdict:** revision required', () => {
    assert.equal(parseVerdict('**Verdict:** revision required'), 'revision');
  });

  test('accepts "Needs Revision" synonym', () => {
    assert.equal(parseVerdict('**Verdict:** Needs Revision'), 'revision');
  });

  test('accepts "Changes Requested" synonym', () => {
    assert.equal(parseVerdict('**Verdict:** Changes Requested'), 'revision');
  });

  test('accepts "approve" short form', () => {
    assert.equal(parseVerdict('**Verdict:** approve'), 'approved');
  });

  test('label is case-insensitive: **verdict:** approved', () => {
    assert.equal(parseVerdict('**verdict:** approved'), 'approved');
  });

  test('last verdict line wins when multiple present', () => {
    const md = [
      '**Verdict:** Revision Required',
      '',
      'After addressing the notes:',
      '',
      '**Verdict:** Approved',
    ].join('\n');
    assert.equal(parseVerdict(md), 'approved');
  });

  test('missing bold markers → null', () => {
    assert.equal(parseVerdict('Verdict: Approved'), null);
  });

  test('free-form prose value → null', () => {
    assert.equal(parseVerdict('**Verdict:** Looks good to me'), null);
  });

  test('empty string → null', () => {
    assert.equal(parseVerdict(''), null);
  });

  test('no verdict line at all → null', () => {
    assert.equal(parseVerdict('# Review\n\nSome notes about the code.\n'), null);
  });

  test('extra whitespace around value is tolerated', () => {
    assert.equal(parseVerdict('**Verdict:**    Approved   '), 'approved');
  });

  test('verdict line embedded in larger document', () => {
    const md = [
      '# Code Review',
      '',
      '## Findings',
      '- item one',
      '- item two',
      '',
      '## Verdict',
      '',
      '**Verdict:** Approved',
      '',
      'Nice work.',
    ].join('\n');
    assert.equal(parseVerdict(md), 'approved');
  });

  test('null/undefined input → null (defensive)', () => {
    assert.equal(parseVerdict(null), null);
    assert.equal(parseVerdict(undefined), null);
  });
});

describe('parse-verdict.cjs :: CLI shim', () => {
  const { spawnSync } = require('node:child_process');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');

  const tool = path.resolve(__dirname, '..', 'parse-verdict.cjs');

  function run(contents) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parse-verdict-'));
    const file = path.join(dir, 'review.md');
    if (contents !== null) fs.writeFileSync(file, contents);
    const result = spawnSync(process.execPath, [tool, contents === null ? path.join(dir, 'missing.md') : file], { encoding: 'utf8' });
    fs.rmSync(dir, { recursive: true, force: true });
    return result;
  }

  test('exits 0 and prints "approved" on approved verdict', () => {
    const r = run('**Verdict:** Approved\n');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /approved/);
  });

  test('exits 1 and prints "revision" on revision verdict', () => {
    const r = run('**Verdict:** Revision Required\n');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /revision/);
  });

  test('exits 2 and prints "unknown" on malformed verdict', () => {
    const r = run('Verdict: approved\n');
    assert.equal(r.status, 2);
    assert.match(r.stdout, /unknown/);
  });

  test('exits 2 when file is missing', () => {
    const r = run(null);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /cannot read/);
  });

  test('exits 2 when no path is given', () => {
    const r = spawnSync(process.execPath, [tool], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage:/);
  });
});
