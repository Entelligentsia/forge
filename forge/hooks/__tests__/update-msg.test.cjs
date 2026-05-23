'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const libPath = require('path').join(__dirname, '..', 'lib', 'update-msg.cjs');

function clearCache() {
  delete require.cache[require.resolve(libPath)];
}

describe('hooks/lib/update-msg.cjs — extracted module', () => {
  beforeEach(() => { clearCache(); });
  afterEach(() => { clearCache(); });

  describe('module exports', () => {
    it('exports buildUpdateMsg and emit', () => {
      const mod = require(libPath);
      assert.strictEqual(typeof mod.buildUpdateMsg, 'function');
      assert.strictEqual(typeof mod.emit, 'function');
    });
  });

  describe('buildUpdateMsg()', () => {
    it('returns empty string when remoteVersion equals local', () => {
      const { buildUpdateMsg } = require(libPath);
      assert.strictEqual(buildUpdateMsg('0.49.0', '0.49.0'), '');
    });

    it('returns empty string when remoteVersion is falsy', () => {
      const { buildUpdateMsg } = require(libPath);
      assert.strictEqual(buildUpdateMsg('', '0.49.0'), '');
      assert.strictEqual(buildUpdateMsg(null, '0.49.0'), '');
    });

    it('returns update message when versions differ', () => {
      const { buildUpdateMsg } = require(libPath);
      const msg = buildUpdateMsg('0.50.0', '0.49.0');
      assert.ok(msg.includes('0.50.0'));
      assert.ok(msg.includes('0.49.0'));
      assert.ok(msg.includes('/forge:update'));
    });

    it('message references the newer remote version prominently', () => {
      const { buildUpdateMsg } = require(libPath);
      const msg = buildUpdateMsg('1.0.0', '0.49.0');
      assert.ok(msg.startsWith('Forge 1.0.0'));
    });
  });

  describe('emit()', () => {
    it('writes nothing when both forgeCtx and updateMsg are empty', () => {
      const { emit } = require(libPath);
      let written = '';
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => { written += s; return true; };
      try {
        emit('', '');
        assert.strictEqual(written, '');
      } finally {
        process.stdout.write = origWrite;
      }
    });

    it('writes JSON additionalContext when forgeCtx is provided', () => {
      const { emit } = require(libPath);
      let written = '';
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => { written += s; return true; };
      try {
        emit('Some context', '');
        const parsed = JSON.parse(written);
        assert.ok(parsed.additionalContext.includes('Some context'));
      } finally {
        process.stdout.write = origWrite;
      }
    });

    it('writes JSON additionalContext when updateMsg is provided', () => {
      const { emit } = require(libPath);
      let written = '';
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => { written += s; return true; };
      try {
        emit('', 'Update available!');
        const parsed = JSON.parse(written);
        assert.ok(parsed.additionalContext.includes('Update available!'));
      } finally {
        process.stdout.write = origWrite;
      }
    });

    it('combines forgeCtx and updateMsg in output', () => {
      const { emit } = require(libPath);
      let written = '';
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => { written += s; return true; };
      try {
        emit('Forge context', 'Update msg');
        const parsed = JSON.parse(written);
        assert.ok(parsed.additionalContext.includes('Forge context'));
        assert.ok(parsed.additionalContext.includes('Update msg'));
      } finally {
        process.stdout.write = origWrite;
      }
    });

    it('escapes backslashes and quotes in output', () => {
      const { emit } = require(libPath);
      let written = '';
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => { written += s; return true; };
      try {
        emit('path\\file "quoted"', '');
        // Must be valid JSON
        assert.doesNotThrow(() => JSON.parse(written));
      } finally {
        process.stdout.write = origWrite;
      }
    });
  });
});
