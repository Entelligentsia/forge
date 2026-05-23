'use strict';
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');

// Resolve common.cjs relative to the hooks/ directory
const COMMON_PATH = path.join(__dirname, '..', 'lib', 'common.cjs');

describe('hooks/lib/common.cjs', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-common-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('module exports', () => {
    test('common.cjs exports the four expected named exports', () => {
      const m = require(COMMON_PATH);
      assert.ok(typeof m.resolveForgePaths === 'function', 'resolveForgePaths must be a function');
      assert.ok(typeof m.readStdinJson === 'function', 'readStdinJson must be a function');
      assert.ok(typeof m.formatHookOutput === 'function', 'formatHookOutput must be a function');
      assert.ok(Array.isArray(m.FORGE_COMMAND_PATTERNS), 'FORGE_COMMAND_PATTERNS must be an array');
    });
  });

  describe('resolveForgePaths()', () => {
    test('returns all expected fields when .forge/config.json is present', () => {
      const forgeDir = path.join(tmpDir, '.forge');
      fs.mkdirSync(forgeDir, { recursive: true });
      const cfg = { paths: { forgeRoot: '/some/forge/root' } };
      fs.writeFileSync(path.join(forgeDir, 'config.json'), JSON.stringify(cfg), 'utf8');

      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        const { resolveForgePaths } = require(COMMON_PATH);
        const result = resolveForgePaths();
        assert.ok(result !== null, 'result should not be null');
        assert.ok(result.forgeDir, 'forgeDir must be present');
        assert.ok(result.eventsRoot, 'eventsRoot must be present');
        assert.ok(result.cacheDir, 'cacheDir must be present');
        assert.ok('forgeRoot' in result, 'forgeRoot must be present');
        assert.ok('structureVersionsPath' in result, 'structureVersionsPath must be present');
        assert.ok(result.forgeRoot === '/some/forge/root', 'forgeRoot should match config');
      } finally {
        process.chdir(origCwd);
      }
    });

    test('returns null when .forge/config.json is missing', () => {
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        // Clear require cache so resolveForgePaths uses fresh cwd
        delete require.cache[COMMON_PATH];
        const { resolveForgePaths } = require(COMMON_PATH);
        const result = resolveForgePaths();
        assert.equal(result, null);
      } finally {
        process.chdir(origCwd);
        delete require.cache[COMMON_PATH];
      }
    });
  });

  describe('formatHookOutput(hookEventName, payload)', () => {
    test('produces valid JSON with hookSpecificOutput envelope', () => {
      const { formatHookOutput } = require(COMMON_PATH);
      const out = formatHookOutput('PostToolUse', { additionalContext: 'hello' });
      const parsed = JSON.parse(out);
      assert.ok(parsed.hookSpecificOutput, 'hookSpecificOutput key must be present');
      assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
      assert.equal(parsed.hookSpecificOutput.additionalContext, 'hello');
    });

    test('payload fields are spread into hookSpecificOutput', () => {
      const { formatHookOutput } = require(COMMON_PATH);
      const out = formatHookOutput('SessionStart', { foo: 1, bar: 'baz' });
      const parsed = JSON.parse(out);
      assert.equal(parsed.hookSpecificOutput.foo, 1);
      assert.equal(parsed.hookSpecificOutput.bar, 'baz');
    });
  });

  describe('FORGE_COMMAND_PATTERNS', () => {
    test('is a non-empty array of RegExp objects', () => {
      const { FORGE_COMMAND_PATTERNS } = require(COMMON_PATH);
      assert.ok(FORGE_COMMAND_PATTERNS.length > 0, 'FORGE_COMMAND_PATTERNS must not be empty');
      for (const p of FORGE_COMMAND_PATTERNS) {
        assert.ok(p instanceof RegExp, `expected RegExp, got ${typeof p}`);
      }
    });

    test('matches known forge command patterns', () => {
      const { FORGE_COMMAND_PATTERNS } = require(COMMON_PATH);
      const knownForge = ['forge:init', 'forge:health', '.forge/config.json', 'FORGE_ROOT', 'manage-config'];
      for (const cmd of knownForge) {
        const matched = FORGE_COMMAND_PATTERNS.some(p => p.test(cmd));
        assert.ok(matched, `FORGE_COMMAND_PATTERNS should match: ${cmd}`);
      }
    });
  });

  describe('logSwallowedError(tag, err, dataDir)', () => {
    test('creates log file with expected format when dataDir is provided', () => {
      delete require.cache[COMMON_PATH];
      const { logSwallowedError } = require(COMMON_PATH);
      assert.ok(typeof logSwallowedError === 'function', 'logSwallowedError must be a function');
      const dataDir = path.join(tmpDir, 'plugin-data');
      const err = new Error('test error');
      logSwallowedError('test-tag', err, dataDir);
      const logPath = path.join(dataDir, 'logs', 'forge-hooks.log');
      assert.ok(fs.existsSync(logPath), `log file should be created at ${logPath}`);
      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('test-tag'), 'log line should include the tag');
      assert.ok(content.includes('test error'), 'log line should include the error message');
      // ISO timestamp format check
      assert.match(content, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'log line should include ISO timestamp');
      delete require.cache[COMMON_PATH];
    });

    test('appends multiple errors to the same log file', () => {
      delete require.cache[COMMON_PATH];
      const { logSwallowedError } = require(COMMON_PATH);
      const dataDir = path.join(tmpDir, 'plugin-data-multi');
      logSwallowedError('tag-a', new Error('first error'), dataDir);
      logSwallowedError('tag-b', new Error('second error'), dataDir);
      const logPath = path.join(dataDir, 'logs', 'forge-hooks.log');
      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('first error'), 'log should contain first error');
      assert.ok(content.includes('second error'), 'log should contain second error');
      assert.ok(content.includes('tag-a'), 'log should contain tag-a');
      assert.ok(content.includes('tag-b'), 'log should contain tag-b');
      delete require.cache[COMMON_PATH];
    });

    test('is fail-open: does not throw when dataDir is null/undefined', () => {
      delete require.cache[COMMON_PATH];
      const { logSwallowedError } = require(COMMON_PATH);
      // Should not throw
      assert.doesNotThrow(() => {
        logSwallowedError('tag', new Error('err'), null);
      });
      assert.doesNotThrow(() => {
        logSwallowedError('tag', new Error('err'), undefined);
      });
      delete require.cache[COMMON_PATH];
    });

    test('module exports logSwallowedError', () => {
      delete require.cache[COMMON_PATH];
      const m = require(COMMON_PATH);
      assert.ok(typeof m.logSwallowedError === 'function', 'logSwallowedError must be exported');
      delete require.cache[COMMON_PATH];
    });
  });

  describe('readStdinJson()', () => {
    test('calls callback with parsed object on valid JSON input', (_, done) => {
      const { readStdinJson } = require(COMMON_PATH);

      // Build a fake readable stream
      const emitter = new EventEmitter();
      emitter.setEncoding = () => {};

      readStdinJson((result) => {
        try {
          assert.deepStrictEqual(result, { tool_name: 'Bash', value: 42 });
          done();
        } catch (err) {
          done(err);
        }
      }, emitter);

      emitter.emit('data', '{"tool_name":"Bash","value":42}');
      emitter.emit('end');
    });

    test('calls callback with null on malformed JSON input', (_, done) => {
      const { readStdinJson } = require(COMMON_PATH);

      const emitter = new EventEmitter();
      emitter.setEncoding = () => {};

      readStdinJson((result) => {
        try {
          assert.equal(result, null);
          done();
        } catch (err) {
          done(err);
        }
      }, emitter);

      emitter.emit('data', 'not valid json {{{');
      emitter.emit('end');
    });
  });
});
