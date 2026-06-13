'use strict';
// Test-first (Iron Law 2) for FORGE-S32-T07: apply-plugin-shim.cjs —
// release-branch shim-overlay generator for the plugin v1.5.0 sunset release.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOOL = path.resolve(__dirname, '..', 'apply-plugin-shim.cjs');
const VERIFY = path.resolve(__dirname, '..', 'verify-integrity.cjs');
const GEN = path.resolve(__dirname, '..', 'gen-integrity.cjs');

let tmpDir;

// The set of commands that must receive the FULL consent-gated migration shim.
const FULL = ['init', 'update', 'rebuild'];
// A representative slice of commands that must receive the SHORT redirect notice.
const REDIRECT = ['plan', 'implement', 'commit', 'health', 'status'];

function makeForgeRoot() {
  const root = fs.mkdtempSync(path.join(tmpDir, 'forge-root-'));
  for (const d of ['commands', 'agents', 'hooks', 'schemas/transitions', 'tools', '.claude-plugin']) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  // Real command files (frontmatter + body) for the full + redirect tiers.
  for (const name of [...FULL, ...REDIRECT]) {
    fs.writeFileSync(
      path.join(root, 'commands', `${name}.md`),
      `---\nname: ${name}\ndescription: real ${name} command.\n---\n\n# /forge:${name}\n\nReal body for ${name}.\n`,
    );
  }
  // Integrity inputs so gen/verify-integrity has a full file set to hash.
  fs.writeFileSync(path.join(root, 'agents', 'tomoshibi.md'), '# tomoshibi\n');
  fs.writeFileSync(path.join(root, 'hooks', 'check-update.cjs'), '// hook\n');
  fs.writeFileSync(path.join(root, 'schemas', 'transitions', 'task.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'schemas', 'enum-catalog.json'), '{}\n');
  // verify-integrity.cjs is part of the manifest — copy the real one in.
  fs.copyFileSync(VERIFY, path.join(root, 'tools', 'verify-integrity.cjs'));
  fs.writeFileSync(
    path.join(root, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'forge', version: '1.5.0' }, null, 2) + '\n',
  );
  return root;
}

function bodyFor(shimmed, name) {
  const e = shimmed.find(s => s.name === name);
  assert.ok(e, `expected a shim entry for ${name}`);
  return e.body;
}

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-plugin-shim-test-'));
});
after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('apply-plugin-shim.cjs', () => {
  test('the three primary commands receive the full consent-gated migration block', () => {
    const { applyShim } = require(TOOL);
    const root = makeForgeRoot();
    const { shimmed } = applyShim(root, { check: true });
    for (const name of FULL) {
      const body = bodyFor(shimmed, name);
      assert.equal(shimmed.find(s => s.name === name).tier, 'full', `${name} must be full tier`);
      // Migration explanation names what is preserved.
      assert.match(body, /\.forge\/config\.json/, `${name} shim must name the preserved config`);
      assert.match(body, /\.forge\/store/, `${name} shim must name the preserved store`);
      // The consent-gated install offer is present.
      assert.match(body, /npm i -g @entelligentsia\/forgecli/, `${name} shim must carry the install offer`);
      assert.match(body, /4ge init claude \./, `${name} shim must carry the migration command`);
    }
  });

  test('remaining commands receive the short redirect notice (no full consent block)', () => {
    const { applyShim } = require(TOOL);
    const root = makeForgeRoot();
    const { shimmed } = applyShim(root, { check: true });
    for (const name of REDIRECT) {
      const body = bodyFor(shimmed, name);
      assert.equal(shimmed.find(s => s.name === name).tier, 'redirect', `${name} must be redirect tier`);
      assert.match(body, /\/forge:init/, `${name} redirect must point at /forge:init`);
      // Redirect notices must NOT carry the preflight or the auto-install surface.
      assert.doesNotMatch(body, /command -v node/, `${name} redirect must not carry node preflight`);
      assert.doesNotMatch(body, /npm i -g @entelligentsia\/forgecli/, `${name} redirect must not carry the install command`);
    }
  });

  test('the consent offer is prose only — explicitly gated, never auto-executed', () => {
    const { applyShim } = require(TOOL);
    const root = makeForgeRoot();
    const { shimmed } = applyShim(root, { check: true });
    const body = bodyFor(shimmed, 'init');
    assert.match(body, /explicit/i, 'consent gate must use explicit-consent language');
    assert.match(body, /consent|agree|confirm/i, 'consent gate must require user consent');
    assert.match(body, /do not run|never run|only.*after|only.*consent/i,
      'the offer must be marked do-not-auto-run');
  });

  test('the node/npm preflight precedes the install offer', () => {
    const { applyShim } = require(TOOL);
    const root = makeForgeRoot();
    const { shimmed } = applyShim(root, { check: true });
    const body = bodyFor(shimmed, 'init');
    const preflight = body.indexOf('command -v node');
    const npmPreflight = body.indexOf('command -v npm');
    const offer = body.indexOf('npm i -g @entelligentsia/forgecli');
    assert.ok(preflight !== -1, 'node preflight must be present');
    assert.ok(npmPreflight !== -1, 'npm preflight must be present');
    assert.ok(offer !== -1, 'install offer must be present');
    assert.ok(preflight < offer, 'node preflight must precede the install offer');
    assert.ok(npmPreflight < offer, 'npm preflight must precede the install offer');
  });

  test('integrity.json re-verifies clean against the shimmed tree', () => {
    const { applyShim } = require(TOOL);
    const { verifyIntegrity } = require(VERIFY);
    const root = makeForgeRoot();
    const res = applyShim(root, { check: false });
    assert.equal(res.integrityRegenerated, true, 'apply must regenerate integrity.json');
    assert.ok(fs.existsSync(path.join(root, 'integrity.json')), 'integrity.json must exist after apply');
    const v = verifyIntegrity(root);
    assert.equal(v.exitCode, 0, `verify-integrity must be clean, got: ${v.output}`);
    // The regenerated manifest must track the full shimmed command set.
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'integrity.json'), 'utf8'));
    const tracked = Object.keys(manifest.files).filter(f => f.startsWith('commands/'));
    assert.equal(tracked.length, FULL.length + REDIRECT.length,
      'integrity manifest must track every shimmed command');
    assert.equal(manifest.version, '1.5.0', 'integrity version must match plugin.json');
  });

  test('--check / applyShim({check:true}) mutates nothing on disk', () => {
    const { applyShim } = require(TOOL);
    const root = makeForgeRoot();
    const before = fs.readFileSync(path.join(root, 'commands', 'init.md'), 'utf8');
    applyShim(root, { check: true });
    const after = fs.readFileSync(path.join(root, 'commands', 'init.md'), 'utf8');
    assert.equal(after, before, 'check mode must not rewrite command files');
    assert.equal(fs.existsSync(path.join(root, 'integrity.json')), false,
      'check mode must not regenerate integrity.json');
  });

  test('CLI refuses to apply without --target release (guards against a destructive run on main)', () => {
    const { spawnSync } = require('node:child_process');
    const root = makeForgeRoot();
    const before = fs.readFileSync(path.join(root, 'commands', 'init.md'), 'utf8');
    const r = spawnSync(process.execPath, [TOOL, '--forge-root', root], { encoding: 'utf8' });
    assert.equal(r.status, 1, 'apply without --target release must exit 1');
    assert.match(r.stderr, /release/i, 'refusal must mention the release-only discipline');
    const after = fs.readFileSync(path.join(root, 'commands', 'init.md'), 'utf8');
    assert.equal(after, before, 'a refused apply must not mutate command files');
  });

  test('CLI --check prints the planned shim bodies without mutating', () => {
    const { spawnSync } = require('node:child_process');
    const root = makeForgeRoot();
    const before = fs.readFileSync(path.join(root, 'commands', 'init.md'), 'utf8');
    const r = spawnSync(process.execPath, [TOOL, '--forge-root', root, '--check'], { encoding: 'utf8' });
    assert.equal(r.status, 0, `--check must exit 0, stderr: ${r.stderr}`);
    assert.match(r.stdout, /init/, '--check output should name the shimmed commands');
    const after = fs.readFileSync(path.join(root, 'commands', 'init.md'), 'utf8');
    assert.equal(after, before, '--check must not mutate command files');
  });

  test('CLI --target release applies the overlay and regenerates integrity', () => {
    const { spawnSync } = require('node:child_process');
    const { verifyIntegrity } = require(VERIFY);
    const root = makeForgeRoot();
    const r = spawnSync(process.execPath, [TOOL, '--forge-root', root, '--target', 'release'], { encoding: 'utf8' });
    assert.equal(r.status, 0, `apply must exit 0, stderr: ${r.stderr}`);
    const init = fs.readFileSync(path.join(root, 'commands', 'init.md'), 'utf8');
    assert.match(init, /npm i -g @entelligentsia\/forgecli/, 'init.md must be overlaid with the full shim');
    assert.equal(verifyIntegrity(root).exitCode, 0, 'integrity must verify clean after a real apply');
  });
});
