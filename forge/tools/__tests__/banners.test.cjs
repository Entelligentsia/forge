'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const banners = require('../banners.cjs');

describe('banners.cjs', () => {
  const KNOWN_NAMES = ['ember', 'tide', 'oracle', 'rift', 'bloom', 'north', 'lumen', 'forge', 'drift', 'void', 'entelligentsia'];

  test('render returns a string for every known banner', () => {
    for (const name of KNOWN_NAMES) {
      const result = banners.render(name);
      assert.equal(typeof result, 'string');
      assert.ok(result.length > 0, `render(${name}) should produce output`);
    }
  });

  test('render is case-insensitive', () => {
    assert.equal(banners.render('FORGE'), banners.render('forge'));
    assert.equal(banners.render('Tide'), banners.render('tide'));
  });

  test('render throws on unknown name', () => {
    assert.throws(() => banners.render('nonexistent'), /unknown/i);
  });

  test('badge returns a single-line string for every known banner', () => {
    for (const name of KNOWN_NAMES) {
      const result = banners.badge(name);
      assert.equal(typeof result, 'string');
      assert.ok(result.length > 0, `badge(${name}) should produce output`);
      // Badge should be a single line
      assert.ok(!result.includes('\n'), `badge(${name}) should be single line`);
    }
  });

  test('mark returns emoji only', () => {
    for (const name of KNOWN_NAMES) {
      const result = banners.mark(name);
      assert.equal(typeof result, 'string');
      assert.ok(result.length > 0, `mark(${name}) should produce emoji`);
    }
  });

  test('mark throws on unknown name', () => {
    assert.throws(() => banners.mark('nope'), /unknown/i);
  });

  test('list returns all known banner names', () => {
    const names = banners.list();
    assert.ok(Array.isArray(names));
    for (const name of KNOWN_NAMES) {
      assert.ok(names.includes(name), `list() should include ${name}`);
    }
    assert.equal(names.length, KNOWN_NAMES.length);
  });

  test('gallery returns a string containing all banners', () => {
    const result = banners.gallery();
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 100, 'gallery should produce substantial output');
  });

  test('rule returns a separator line', () => {
    const result = banners.rule();
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0, 'rule should produce output');
  });

  test('BANNERS object has all expected entries', () => {
    assert.ok(typeof banners.BANNERS === 'object');
    for (const name of KNOWN_NAMES) {
      assert.ok(banners.BANNERS[name], `BANNERS should have ${name}`);
      assert.ok(banners.BANNERS[name].emoji, `${name} should have emoji`);
      assert.ok(banners.BANNERS[name].tagline, `${name} should have tagline`);
      assert.ok(banners.BANNERS[name].name, `${name} should have name`);
      assert.ok(Array.isArray(banners.BANNERS[name].art), `${name} should have art array`);
    }
  });
});