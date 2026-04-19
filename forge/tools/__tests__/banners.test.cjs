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
      assert.ok(typeof banners.BANNERS[name].art === 'string', `${name} should have art string`);
      assert.ok(banners.BANNERS[name].kanji, `${name} should have kanji`);
    }
  });
});

describe('banners.cjs — progressBar', () => {
  const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

  test('returns string with counter and label', () => {
    const out = banners.progressBar(5, 12, { label: 'Templates' });
    const plain = out.replace(ANSI_RE, '');
    assert.ok(plain.includes('5/12'), 'should contain counter');
    assert.ok(plain.includes('Templates'), 'should contain label');
  });

  test('clamps n to [0, total]', () => {
    const overOut = banners.progressBar(99, 12);
    const underOut = banners.progressBar(-3, 12);
    assert.ok(overOut.replace(ANSI_RE, '').includes('12/12'));
    assert.ok(underOut.replace(ANSI_RE, '').includes('0/12'));
  });

  test('0 cells uses only the empty glyph; full uses only filled glyph', () => {
    const empty = banners.progressBar(0, 12, { width: 12 }).replace(ANSI_RE, '');
    const full = banners.progressBar(12, 12, { width: 12 }).replace(ANSI_RE, '');
    // Strip everything after the bar (counter + label) by splitting on double space.
    const emptyBar = empty.split('  ')[0];
    const fullBar = full.split('  ')[0];
    assert.ok(!emptyBar.includes('▰'), `empty bar should have no filled glyphs, got "${emptyBar}"`);
    assert.ok(!fullBar.includes('▱'), `full bar should have no empty glyphs, got "${fullBar}"`);
  });

  test('partial fill includes both glyphs', () => {
    const partial = banners.progressBar(5, 12, { width: 12 }).replace(ANSI_RE, '');
    assert.ok(partial.includes('▰'));
    assert.ok(partial.includes('▱'));
  });

  test('honours custom width', () => {
    const out = banners.progressBar(5, 10, { width: 20 }).replace(ANSI_RE, '');
    const bar = out.split('  ')[0];
    assert.equal(bar.length, 20, `bar should be 20 cells, got "${bar}" (${bar.length})`);
  });

  test('total of 0 does not divide-by-zero', () => {
    assert.doesNotThrow(() => banners.progressBar(0, 0));
  });
});

describe('banners.cjs — subtitle', () => {
  test('returns single-line text containing the input', () => {
    const out = banners.subtitle('Forging your SDLC');
    assert.ok(!out.includes('\n'), 'subtitle should be single line');
    assert.ok(out.includes('Forging your SDLC'));
  });
});

describe('banners.cjs — phaseHeader', () => {
  test('returns three lines: badge, em-dash banner, progress bar', () => {
    const out = banners.phaseHeader(7, 12, 'Workflows', 'ember');
    const lines = out.split('\n');
    assert.equal(lines.length, 3, `expected 3 lines, got ${lines.length}: ${JSON.stringify(lines)}`);
    assert.ok(lines[0].includes('EMBER'), 'first line should be the ember badge');
    assert.ok(lines[1].includes('━━━'), 'second line should be em-dash banner');
    assert.ok(lines[1].includes('Phase 7/12 — Workflows'));
    assert.ok(lines[2].includes('7/12'), 'third line should be progress bar with counter');
  });

  test('mode tint via string opts', () => {
    const fast = banners.phaseHeader(1, 12, 'Discover', 'north', 'fast');
    const full = banners.phaseHeader(1, 12, 'Discover', 'north', 'full');
    assert.notEqual(fast, full, 'fast and full mode should produce different output');
  });

  test('throws on unknown banner key', () => {
    assert.throws(() => banners.phaseHeader(1, 12, 'X', 'nonexistent'), /unknown/i);
  });

  test('em-dash banner line carries ZEN_BLUE tint', () => {
    const out = banners.phaseHeader(7, 12, 'Workflows', 'ember');
    const lines = out.split('\n');
    const zenAnsi = '\x1b[38;2;100;140;200m';
    assert.ok(lines[1].includes(zenAnsi), 'em-dash line should carry zen-blue ANSI prefix');
  });
});

describe('banners.cjs — ruleLine', () => {
  const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

  test('returns single line of em-dashes when called with no text', () => {
    const out = banners.ruleLine();
    const plain = out.replace(ANSI_RE, '');
    assert.ok(!plain.includes('\n'), 'should be single line');
    assert.equal(plain.length, 65, `default width is 65, got ${plain.length}`);
    assert.ok(plain.split('').every(c => c === '━'), 'all chars should be ━');
  });

  test('embeds text in the rule', () => {
    const out = banners.ruleLine('Phase 5/12 — Templates');
    const plain = out.replace(ANSI_RE, '');
    assert.ok(plain.startsWith('━━━ Phase 5/12'), 'should start with rule + label');
    assert.ok(plain.endsWith('━'), 'should end with em-dash filler');
    assert.equal(plain.length, 65, `default width is 65, got ${plain.length}`);
  });

  test('honours custom width', () => {
    const out = banners.ruleLine('X', { width: 30 });
    const plain = out.replace(ANSI_RE, '');
    assert.equal(plain.length, 30);
  });

  test('default tint is ZEN_BLUE', () => {
    const out = banners.ruleLine();
    const zenAnsi = '\x1b[38;2;100;140;200m';
    assert.ok(out.includes(zenAnsi), `should carry ZEN_BLUE ANSI, got: ${JSON.stringify(out)}`);
  });

  test('custom color overrides ZEN_BLUE', () => {
    const out = banners.ruleLine('X', { color: [255, 0, 0] });
    assert.ok(out.includes('\x1b[38;2;255;0;0m'), 'should use custom tint');
    assert.ok(!out.includes('\x1b[38;2;100;140;200m'), 'should NOT include default tint');
  });

  test('plain mode strips ZEN_BLUE ANSI', () => {
    const original = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    try {
      const out = banners.ruleLine('X');
      assert.equal(out.match(ANSI_RE), null);
    } finally {
      if (original === undefined) delete process.env.NO_COLOR; else process.env.NO_COLOR = original;
    }
  });
});

describe('banners.cjs — plain mode', () => {
  const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

  test('NO_COLOR strips ANSI from render()', () => {
    const original = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    try {
      const out = banners.render('forge');
      assert.equal(out.match(ANSI_RE), null, `expected no ANSI, got: ${JSON.stringify(out)}`);
    } finally {
      if (original === undefined) delete process.env.NO_COLOR; else process.env.NO_COLOR = original;
    }
  });

  test('FORGE_BANNERS_PLAIN strips ANSI from badge()', () => {
    const original = process.env.FORGE_BANNERS_PLAIN;
    process.env.FORGE_BANNERS_PLAIN = '1';
    try {
      const out = banners.badge('north');
      assert.equal(out.match(ANSI_RE), null);
    } finally {
      if (original === undefined) delete process.env.FORGE_BANNERS_PLAIN; else process.env.FORGE_BANNERS_PLAIN = original;
    }
  });

  test('plain mode also strips ANSI from progressBar()', () => {
    const original = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    try {
      const out = banners.progressBar(5, 12, { color: [255, 100, 50], label: 'X' });
      assert.equal(out.match(ANSI_RE), null);
    } finally {
      if (original === undefined) delete process.env.NO_COLOR; else process.env.NO_COLOR = original;
    }
  });

  test('isPlain returns true when env is set', () => {
    const original = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    try {
      assert.equal(banners.isPlain(), true);
    } finally {
      if (original === undefined) delete process.env.NO_COLOR; else process.env.NO_COLOR = original;
    }
  });

  test('stripAnsi removes all CSI sequences', () => {
    const input = '\x1b[1m\x1b[38;2;255;0;0mhello\x1b[0m';
    assert.equal(banners.stripAnsi(input), 'hello');
  });
});