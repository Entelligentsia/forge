'use strict';
// Tests for lib/frontmatter.cjs
// Written red-bar first (Iron Law 2) — these tests fail until lib/frontmatter.cjs is created.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { extractFrontmatter } = require('../lib/frontmatter.cjs');

describe('lib/frontmatter.cjs — extractFrontmatter', () => {

  // -------------------------------------------------------------------------
  // LF-only (baseline)
  // -------------------------------------------------------------------------
  test('LF-only: parses frontmatter and body correctly', () => {
    const content = '---\ntitle: Hello\n---\nbody text\n';
    const result = extractFrontmatter(content);
    assert.ok(result.frontmatter !== null, 'frontmatter should not be null');
    assert.ok(result.frontmatter.includes('title: Hello'));
    assert.ok(result.body.includes('body text'));
    // No \r chars in output
    assert.ok(!result.frontmatter.includes('\r'), 'frontmatter must not contain CR');
    assert.ok(!result.body.includes('\r'), 'body must not contain CR');
  });

  test('LF-only: no frontmatter returns null frontmatter and full body', () => {
    const content = 'just body text\nno frontmatter here\n';
    const result = extractFrontmatter(content);
    assert.strictEqual(result.frontmatter, null);
    assert.strictEqual(result.body, content);
  });

  // -------------------------------------------------------------------------
  // CRLF (Windows line endings throughout)
  // -------------------------------------------------------------------------
  test('CRLF: parses and normalizes to LF on read', () => {
    const content = '---\r\ntitle: Windows\r\nkey: value\r\n---\r\nbody text\r\n';
    const result = extractFrontmatter(content);
    assert.ok(result.frontmatter !== null, 'frontmatter should not be null for CRLF input');
    assert.ok(result.frontmatter.includes('title: Windows'), 'frontmatter should contain title');
    assert.ok(result.body.includes('body text'), 'body should contain text');
    // Canonical posture: normalize to LF on read
    assert.ok(!result.frontmatter.includes('\r'), 'frontmatter must be normalized to LF');
    assert.ok(!result.body.includes('\r'), 'body must be normalized to LF');
  });

  test('CRLF: body content normalized to LF', () => {
    const content = '---\r\nfoo: bar\r\n---\r\nline1\r\nline2\r\n';
    const result = extractFrontmatter(content);
    assert.ok(result.body.includes('line1\nline2'), 'body lines should be LF-separated');
    assert.ok(!result.body.includes('\r'), 'no CR in body after normalization');
  });

  // -------------------------------------------------------------------------
  // CR-only (legacy Mac)
  // -------------------------------------------------------------------------
  test('CR-only: normalizes to LF on read', () => {
    const content = '---\rtitle: Legacy\rkey: val\r---\rbody text\r';
    const result = extractFrontmatter(content);
    assert.ok(result.frontmatter !== null, 'frontmatter should be extracted from CR-only input');
    assert.ok(!result.frontmatter.includes('\r'), 'frontmatter must not contain CR');
    assert.ok(!result.body.includes('\r'), 'body must not contain CR');
  });

  // -------------------------------------------------------------------------
  // Mixed LF/CRLF within frontmatter block
  // -------------------------------------------------------------------------
  test('mixed LF/CRLF: normalizes mixed line endings to LF', () => {
    // First line CRLF, second line LF, closing CRLF
    const content = '---\r\ntitle: Mixed\nkey: value\r\n---\r\nbody\n';
    const result = extractFrontmatter(content);
    assert.ok(result.frontmatter !== null);
    assert.ok(!result.frontmatter.includes('\r'), 'no CR after normalization of mixed input');
    assert.ok(!result.body.includes('\r'));
  });

  // -------------------------------------------------------------------------
  // Malformed frontmatter (no closing ---)
  // -------------------------------------------------------------------------
  test('malformed: no closing --- returns null frontmatter and full body', () => {
    const content = '---\ntitle: Unclosed\nkey: value\nbody without closing delimiter\n';
    const result = extractFrontmatter(content);
    assert.strictEqual(result.frontmatter, null, 'malformed frontmatter should yield null');
    assert.strictEqual(result.body, content, 'full content returned as body when malformed');
  });

  // -------------------------------------------------------------------------
  // No frontmatter (body only)
  // -------------------------------------------------------------------------
  test('no frontmatter: returns null frontmatter and full content as body', () => {
    const content = '# Heading\n\nSome content without frontmatter.\n';
    const result = extractFrontmatter(content);
    assert.strictEqual(result.frontmatter, null);
    assert.strictEqual(result.body, content);
  });

  // -------------------------------------------------------------------------
  // Opening --- with trailing whitespace (should NOT match per plan §step1)
  // -------------------------------------------------------------------------
  test('leading whitespace before --- does not match', () => {
    const content = ' ---\ntitle: Indented\n---\nbody\n';
    const result = extractFrontmatter(content);
    // The spec requires opening --- at column 0 (no leading whitespace)
    assert.strictEqual(result.frontmatter, null, 'leading whitespace before --- must prevent frontmatter parse');
    assert.strictEqual(result.body, content);
  });

  // -------------------------------------------------------------------------
  // CRLF regression: build-base-pack behavior vs new lib
  // Verifies that the new lib produces LF-normalized output where the old
  // build-base-pack.cjs inline implementation would leave \r chars in content.
  // -------------------------------------------------------------------------
  test('CRLF regression: same result as normalize-to-LF canonical behavior', () => {
    // build-base-pack.cjs old behavior: split('\n') leaves '\r' at end of each line
    // The old implementation would have 'title: CRLF Title\r' in frontmatter
    const content = '---\r\ntitle: CRLF Title\r\nkey: value\r\n---\r\nbody line\r\n';

    const result = extractFrontmatter(content);

    // New canonical lib: no \r anywhere in output
    assert.ok(!result.frontmatter.includes('\r'),
      'new lib must produce CR-free frontmatter (regression against old build-base-pack behavior)');
    assert.ok(!result.body.includes('\r'),
      'new lib must produce CR-free body (regression against old build-base-pack behavior)');
    assert.ok(result.frontmatter.includes('title: CRLF Title'),
      'title value must be clean (no trailing \\r)');
  });

  // -------------------------------------------------------------------------
  // Empty frontmatter block
  // -------------------------------------------------------------------------
  test('empty frontmatter block: returns empty frontmatter and body', () => {
    const content = '---\n---\nbody after empty block\n';
    const result = extractFrontmatter(content);
    assert.ok(result.frontmatter !== null, 'empty block between --- --- is valid frontmatter');
    assert.ok(result.body.includes('body after empty block'));
  });

  // -------------------------------------------------------------------------
  // Frontmatter only (no body)
  // -------------------------------------------------------------------------
  test('frontmatter only (no body): returns frontmatter and empty/newline body', () => {
    const content = '---\ntitle: Only FM\n---\n';
    const result = extractFrontmatter(content);
    assert.ok(result.frontmatter !== null);
    // Body may be empty string or just a newline
    assert.ok(typeof result.body === 'string');
  });

});
