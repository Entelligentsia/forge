'use strict';

// CLI-first redesign: getCommandsSubdir() returns the fixed 'forge' namespace.
// Project-prefix command namespaces (/acme:*, /hello:*) are retired — every
// project gets the same /forge:* surface, matching the 4ge bootstrap vendor.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { getCommandsSubdir } = require('./paths.cjs');

describe('getCommandsSubdir', () => {
  test("returns 'forge' for any prefix (namespace is fixed)", () => {
    assert.equal(getCommandsSubdir('ACME'), 'forge');
    assert.equal(getCommandsSubdir('MyProj'), 'forge');
    assert.equal(getCommandsSubdir('forge'), 'forge');
  });

  test("returns 'forge' when prefix is absent or empty (arg is vestigial)", () => {
    assert.equal(getCommandsSubdir(), 'forge');
    assert.equal(getCommandsSubdir(''), 'forge');
    assert.equal(getCommandsSubdir(null), 'forge');
  });
});
