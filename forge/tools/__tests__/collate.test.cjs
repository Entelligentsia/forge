'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { statusBadge, padTable, fmtTokens, fmtCost, sourceLabel, GENERATED } = require('../collate.cjs');

describe('collate.cjs — statusBadge', () => {
  test('completed returns badge with status name', () => {
    const result = statusBadge('completed');
    assert.ok(result.includes('completed'), `expected "completed" in "${result}"`);
  });

  test('implementing returns badge with status name', () => {
    const result = statusBadge('implementing');
    assert.ok(result.includes('implementing'), `expected "implementing" in "${result}"`);
  });

  test('unknown status returns bare status string', () => {
    const result = statusBadge('unknown_status');
    assert.equal(result, 'unknown_status');
  });

  test('committed returns badge string', () => {
    const result = statusBadge('committed');
    assert.ok(result.includes('committed'), `expected "committed" in "${result}"`);
  });

  test('draft returns badge string', () => {
    const result = statusBadge('draft');
    assert.ok(result.includes('draft'), `expected "draft" in "${result}"`);
  });

  test('blocked returns badge string', () => {
    const result = statusBadge('blocked');
    assert.ok(result.includes('blocked'), `expected "blocked" in "${result}"`);
  });
});

describe('collate.cjs — padTable', () => {
  test('formats a simple 2x2 table with header separator', () => {
    const result = padTable([['Name', 'Count'], ['foo', '3']]);
    const lines = result.split('\n');
    assert.equal(lines.length, 3, `expected 3 lines (header, separator, data), got ${lines.length}`);
    assert.ok(lines[0].startsWith('| '), 'header line starts with |');
    assert.ok(lines[1].includes('-'), 'separator line has dashes');
    assert.ok(lines[1].startsWith('|'), 'separator line starts with |');
  });

  test('handles empty rows array', () => {
    assert.equal(padTable([]), '');
  });

  test('pads columns to equal width', () => {
    const result = padTable([['A', 'BBB'], ['CC', 'D']]);
    const lines = result.split('\n');
    // Both data lines should have the same width
    assert.equal(lines[0].length, lines[1].length, 'columns should be padded to equal width');
  });

  test('includes header separator row', () => {
    const result = padTable([['H1', 'H2'], ['v1', 'v2']]);
    assert.ok(result.includes('--'), 'should include separator row with dashes');
  });
});

describe('collate.cjs — fmtTokens', () => {
  test('formats integer with locale separators', () => {
    const result = fmtTokens(1500);
    assert.ok(result.includes('1') && result.includes('500'), `expected formatted 1500, got "${result}"`);
  });

  test('returns em-dash for null', () => {
    assert.equal(fmtTokens(null), '—');
  });

  test('returns em-dash for undefined', () => {
    assert.equal(fmtTokens(undefined), '—');
  });

  test('formats zero', () => {
    assert.equal(fmtTokens(0), '0');
  });
});

describe('collate.cjs — fmtCost', () => {
  test('formats number as USD with 4 decimal places', () => {
    assert.equal(fmtCost(0.05), '$0.0500');
  });

  test('returns em-dash for null', () => {
    assert.equal(fmtCost(null), '—');
  });

  test('returns em-dash for undefined', () => {
    assert.equal(fmtCost(undefined), '—');
  });

  test('formats whole dollar amount', () => {
    assert.equal(fmtCost(10), '$10.0000');
  });
});

describe('collate.cjs — sourceLabel', () => {
  test('reported-only sources return (reported)', () => {
    assert.equal(sourceLabel(new Set(['reported'])), '(reported)');
  });

  test('estimated-only sources return (estimated)', () => {
    assert.equal(sourceLabel(new Set(['estimated'])), '(estimated)');
  });

  test('mixed sources with reported and estimated return (mixed)', () => {
    assert.equal(sourceLabel(new Set(['reported', 'estimated'])), '(mixed)');
  });

  test('unrecognized single source returns (mixed)', () => {
    // 'api' is not a recognized label, so it falls through to (mixed)
    assert.equal(sourceLabel(new Set(['api'])), '(mixed)');
  });

  test('estimated with unrecognized source returns (estimated)', () => {
    // 'estimated' takes priority over unrecognized source label
    assert.equal(sourceLabel(new Set(['api', 'estimated'])), '(estimated)');
  });

  test('unknown-only sources return (unknown)', () => {
    assert.equal(sourceLabel(new Set([undefined])), '(unknown)');
  });

  test('reported and estimated together return (mixed)', () => {
    assert.equal(sourceLabel(new Set(['reported', 'estimated'])), '(mixed)');
  });

  test('reported with unknown returns (mixed)', () => {
    assert.equal(sourceLabel(new Set(['reported', undefined])), '(mixed)');
  });
});

describe('collate.cjs — GENERATED constant', () => {
  test('is the expected marker string', () => {
    assert.ok(GENERATED.includes('GENERATED'), `expected GENERATED marker, got "${GENERATED}"`);
    assert.ok(GENERATED.includes('collate'), `expected "collate" in marker, got "${GENERATED}"`);
  });
});