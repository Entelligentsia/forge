'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, hashContent, MANIFEST_PATH } = require('../generation-manifest.cjs');

describe('generation-manifest.cjs', () => {
  describe('normalize', () => {
    test('converts CRLF to LF', () => {
      assert.equal(normalize('foo\r\nbar'), 'foo\nbar');
    });

    test('CRLF and LF produce identical results', () => {
      assert.equal(normalize('foo\r\nbar'), normalize('foo\nbar'));
    });

    test('strips trailing whitespace per line', () => {
      assert.equal(normalize('  hello  \nworld  \n'), '  hello\nworld\n');
    });

    test('does not strip leading whitespace', () => {
      assert.equal(normalize('  hello\n'), '  hello\n');
    });

    test('returns empty string unchanged', () => {
      assert.equal(normalize(''), '');
    });

    test('normalizes multiple lines with mixed CRLF and trailing spaces', () => {
      const input = 'line1  \r\nline2\r\n  line3  ';
      const expected = 'line1\nline2\n  line3';
      assert.equal(normalize(input), expected);
    });

    test('handles single line without newline', () => {
      assert.equal(normalize('hello  '), 'hello');
    });

    test('handles single line with newline', () => {
      assert.equal(normalize('hello  \n'), 'hello\n');
    });

    test('preserves internal spaces', () => {
      assert.equal(normalize('hello world  \n'), 'hello world\n');
    });

    test('handles mixed CRLF and LF in same string', () => {
      assert.equal(
        normalize('a\r\nb\nc\r\nd'),
        'a\nb\nc\nd'
      );
    });
  });

  describe('hashContent', () => {
    test('is deterministic: same content produces same hash', () => {
      const content = 'hello world\nline two\n';
      assert.equal(hashContent(content), hashContent(content));
    });

    test('different content produces different hash', () => {
      const hash1 = hashContent('aaa');
      const hash2 = hashContent('bbb');
      assert.notEqual(hash1, hash2);
    });

    test('hash starts with sha256: prefix', () => {
      const hash = hashContent('test');
      assert.ok(hash.startsWith('sha256:'), `expected sha256: prefix, got: ${hash}`);
    });

    test('hash after prefix is a valid hex string', () => {
      const hash = hashContent('test');
      const hexPart = hash.slice(7); // remove 'sha256:'
      assert.ok(/^[0-9a-f]{64}$/.test(hexPart), `expected 64-char hex, got: ${hexPart}`);
    });

    test('normalized CRLF content hashes identically to LF content', () => {
      const crlfContent = 'foo\r\nbar';
      const lfContent = 'foo\nbar';
      assert.equal(hashContent(crlfContent), hashContent(lfContent));
    });

    test('content differing only in trailing whitespace hashes identically', () => {
      const withSpaces = 'hello  \nworld  \n';
      const withoutSpaces = 'hello\nworld\n';
      assert.equal(hashContent(withSpaces), hashContent(withoutSpaces));
    });

    test('empty string produces a valid hash', () => {
      const hash = hashContent('');
      assert.ok(hash.startsWith('sha256:'));
      assert.equal(hash.length, 7 + 64); // 'sha256:' + 64 hex chars
    });
  });

  describe('MANIFEST_PATH', () => {
    test('ends with expected filename', () => {
      assert.ok(MANIFEST_PATH.endsWith('generation-manifest.json'),
        `MANIFEST_PATH should end with generation-manifest.json, got: ${MANIFEST_PATH}`);
    });

    test('contains .forge directory segment', () => {
      assert.ok(MANIFEST_PATH.includes('.forge'),
        `MANIFEST_PATH should contain .forge, got: ${MANIFEST_PATH}`);
    });
  });
});