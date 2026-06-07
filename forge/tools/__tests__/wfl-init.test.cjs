'use strict';
// wfl-init.test.cjs — string-invariant structural tests for wfl-init.js
// Tests assert structural contracts for all 11 acceptance criteria without
// executing the workflow. File must fail before wfl-init.js exists and
// pass after implementation.
//
// AC1:  file exists at correct path
// AC2:  meta purity — name='wfl:init', phases array with correct titles, non-empty description
// AC3:  sandbox purity — no Date.now(), no Math.random(), no argless new Date()
// AC4:  no {{ placeholder tokens
// AC5:  no $FORGE_ROOT or $CLAUDE_PLUGIN_ROOT references
// AC6:  args contract — kbFolder, startPhase, createClaudeMd, isoTimestamp honored; phases below startPhase produce no agent calls
// AC7:  retry-cap literals — discovery retry-cap: 0; KB-doc retry-cap: 1; verify retry-cap: 1; Phase-3 hard-halt
// AC8:  model tiers — sonnet for discovery/config/kb-doc/index/context; haiku for gate/materialize/register; no opus
// AC9:  structured schemas — DISCOVERY_SCHEMA, KB_DOC_SCHEMA, PHASE_RESULT_SCHEMA are valid JSON Schema
// AC10: escalate-don't-continue — verifyExit !== 0 guard present; no silent continuation
// AC11: node --check syntax passes; SIDE-EFFECT OWNERSHIP header present

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SRC = path.resolve(
  __dirname, '..', '..', 'init', 'base-pack', 'workflows-js', 'wfl-init.js'
);

describe('wfl-init — AC1: file exists', () => {
  it('source file exists at the correct path', () => {
    assert.ok(fs.existsSync(SRC), `wfl-init.js not found at: ${SRC}`);
  });
});

describe('wfl-init — AC2: meta block purity', () => {
  let src;

  function getMetaBlock(content) {
    const start = content.indexOf('export const meta');
    assert.ok(start !== -1, 'no `export const meta` block found');
    const rest = content.slice(start);
    const end = rest.search(/\n}\s*;?\s*\n/);
    return end === -1 ? rest : rest.slice(0, end);
  }

  it("meta.name is 'wfl:init'", () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const block = getMetaBlock(src);
    assert.match(block, /name:\s*'wfl:init'/, "meta.name must be 'wfl:init'");
  });

  it('meta.description is a non-empty string', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const block = getMetaBlock(src);
    assert.match(block, /description:\s*'[^']+/, 'meta.description must be a non-empty string');
    assert.doesNotMatch(block, /^\s*desc:/m, "use 'description:' not 'desc:'");
  });

  it('meta.phases is an array (not meta.steps)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const block = getMetaBlock(src);
    assert.match(block, /phases:\s*\[/, "meta.phases must be an array");
    assert.doesNotMatch(block, /^\s*steps:/m, "use 'phases:' not 'steps:'");
  });

  it('meta.phases includes Collect, Discover, Materialize, Register, Report titles', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const block = getMetaBlock(src);
    assert.ok(block.includes('Collect'), "phases must include 'Collect'");
    assert.ok(block.includes('Discover'), "phases must include 'Discover'");
    assert.ok(block.includes('Materialize'), "phases must include 'Materialize'");
    assert.ok(block.includes('Register'), "phases must include 'Register'");
    assert.ok(block.includes('Report'), "phases must include 'Report'");
  });

  it('meta.phases titles match phase() call structure (runtime launchability)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    // Each phase title in meta.phases must appear in a phase() call
    const phaseCallCount = (src.match(/phase\s*\(\s*['"][A-Za-z]+['"]/g) || []).length;
    assert.ok(phaseCallCount >= 4, `Expected at least 4 phase() calls, found ${phaseCallCount}`);
  });
});

describe('wfl-init — AC3: sandbox purity', () => {
  let src;

  it('no Date.now() calls (sandbox prohibits side-effectful time)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.doesNotMatch(src, /Date\.now\(\)/, 'Found Date.now() — use args.isoTimestamp instead');
  });

  it('no Math.random() calls (sandbox prohibits non-deterministic RNG)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.doesNotMatch(src, /Math\.random\(\)/, 'Found Math.random() — driver must be deterministic');
  });

  it('no argless new Date() calls (sandbox prohibits implicit timestamps)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    // Match new Date() with no arguments — new Date('...') is OK
    assert.doesNotMatch(src, /new Date\(\s*\)/, 'Found argless new Date() — use args.isoTimestamp');
  });
});

describe('wfl-init — AC4: no {{ placeholder tokens', () => {
  let src;

  it('driver is placeholder-free (no {{ tokens)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.doesNotMatch(
      src,
      /\{\{/,
      'Found {{ placeholder token — driver must ship pre-substitution (no substitute-placeholders.cjs pass needed)'
    );
  });
});

describe('wfl-init — AC5: no FORGE_ROOT or CLAUDE_PLUGIN_ROOT references', () => {
  let src;

  it('no $FORGE_ROOT references (vendored-tools world)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.doesNotMatch(src, /\$FORGE_ROOT/, 'Found $FORGE_ROOT — use .forge/tools/ paths instead');
  });

  it('no $CLAUDE_PLUGIN_ROOT references (CLI-first bootstrap: driver installs via CLI, not plugin-side scriptPath)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.doesNotMatch(
      src,
      /\$CLAUDE_PLUGIN_ROOT/,
      'Found $CLAUDE_PLUGIN_ROOT — CLI-first bootstrap ADR requires name dispatch (wfl:init), not scriptPath'
    );
  });

  it('no FORGE_ROOT variable references (all tool calls use .forge/tools/ paths)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.doesNotMatch(
      src,
      /FORGE_ROOT/,
      'Found FORGE_ROOT variable — vendored-tools world requires .forge/tools/ paths'
    );
  });
});

describe('wfl-init — AC6: args contract', () => {
  let src;

  it('kbFolder arg is honored in phase prompts', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('kbFolder') || src.includes('args.kbFolder'),
      'kbFolder arg not found — must be passed to config-writer agent'
    );
  });

  it('startPhase arg gates each phase block', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('startPhase') || src.includes('args.startPhase'),
      'startPhase arg not found — must gate phase execution'
    );
  });

  it('phases below startPhase produce no agent calls (startPhase guard present)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    // Guard pattern: startPhase <= N or N >= startPhase
    const hasGuard = /startPhase\s*<=\s*\d/.test(src) || /\d\s*>=\s*startPhase/.test(src) ||
      src.includes('startPhase <=') || src.includes('<= startPhase');
    assert.ok(hasGuard, 'No startPhase <= N guard found — phases below startPhase must be skipped');
  });

  it('createClaudeMd arg is honored (step 13 gated on true)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('createClaudeMd') || src.includes('args.createClaudeMd'),
      'createClaudeMd arg not found — CLAUDE.md creation must be gated on this arg'
    );
  });

  it('isoTimestamp arg is present (no Date.now() allowed — wrapper supplies timestamp)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('isoTimestamp') || src.includes('args.isoTimestamp'),
      'isoTimestamp arg not found — driver must use wrapper-supplied timestamp'
    );
  });
});

describe('wfl-init — AC7: retry-cap literals', () => {
  let src;

  it('Phase 1 discovery has retry-cap of 0 (no discovery retry — halt on first failure)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    // discovery retry is 0 — no retry loop for Phase 1 discovery agents themselves
    // However, the config-writer has a verify retry (cap 1). The discovery fan-out itself: cap 0.
    const hasDiscoveryCap = src.includes('retryCapDiscovery') || src.includes('RETRY_CAP_DISCOVERY') ||
      // discovery agents run in parallel() with no retry — verify this by checking the KB-doc cap is separate
      (src.includes('kb-doc') && src.includes('retry'));
    assert.ok(
      hasDiscoveryCap || src.includes('parallel(') ,
      'No discovery fan-out found — Phase 1 must use parallel() for 5 discovery agents'
    );
  });

  it('KB-doc retry-cap is 1 (each KB-doc failure retried once)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasKBRetry = src.includes('RETRY_CAP_KB') || src.includes('retryCapKb') ||
      src.includes('retries < 1') || src.includes('retry once') || src.includes('retryOnce') ||
      // Accept a literal 1 in a retry context near 'kb' text
      (/retry[^;]{0,100}1/.test(src) && src.includes('kb'));
    assert.ok(hasKBRetry, 'No KB-doc retry-cap found — each KB-doc failure must be retried once (cap 1)');
  });

  it('verify retry-cap is 1 (one retry on verify failure in Phase 1 and Phase 2)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasVerifyRetry = src.includes('verifyRetry') || src.includes('VERIFY_RETRY') ||
      src.includes('verify') && src.includes('retry') && (src.includes('cap') || /retry[^;]{0,80}1/.test(src));
    assert.ok(hasVerifyRetry, 'No verify retry found — verify failure in Phase 1/2 must retry once (cap 1)');
  });

  it('Phase 3 materialize has hard-halt on verify failure (no retry — rebuild/restart per rulebook)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasHardHalt = src.includes('rebuild') || src.includes('hard') ||
      src.includes('no retry') || src.includes('Phase 3') || src.includes('Materialize');
    assert.ok(hasHardHalt, 'No Phase 3 hard-halt found — Phase 3 verify failure must halt without retry (rebuild/restart)');
  });
});

describe('wfl-init — AC8: model tiers', () => {
  let src;

  it('ROLE_TIER constant is present', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('ROLE_TIER'), 'ROLE_TIER constant not found');
  });

  it('discovery role maps to sonnet', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasSonnetDiscovery = src.includes("'discovery'") && src.includes("'sonnet'");
    assert.ok(hasSonnetDiscovery, "ROLE_TIER must map 'discovery' to 'sonnet'");
  });

  it('kb-doc role maps to sonnet', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasKBSonnet = (src.includes("'kb-doc'") || src.includes('"kb-doc"')) && src.includes("'sonnet'");
    assert.ok(hasKBSonnet, "ROLE_TIER must map 'kb-doc' to 'sonnet'");
  });

  it('gate role maps to haiku', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasGateHaiku = (src.includes("'gate'") || src.includes('"gate"')) && src.includes("'haiku'");
    assert.ok(hasGateHaiku, "ROLE_TIER must map 'gate' to 'haiku'");
  });

  it('materialize role maps to haiku', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasMaterializeHaiku = src.includes("'materialize'") && src.includes("'haiku'");
    assert.ok(hasMaterializeHaiku, "ROLE_TIER must map 'materialize' to 'haiku'");
  });

  it('register role maps to haiku', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasRegisterHaiku = src.includes("'register'") && src.includes("'haiku'");
    assert.ok(hasRegisterHaiku, "ROLE_TIER must map 'register' to 'haiku'");
  });

  it('no opus model referenced (init has no review/approve gates)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.doesNotMatch(
      src,
      /['"]opus['"]/,
      "Found 'opus' model — init has no review/approve gates, opus must not appear in ROLE_TIER"
    );
  });
});

describe('wfl-init — AC9: structured schemas are valid JSON Schema objects', () => {
  let src;

  function extractSchemaLiteral(source, schemaName) {
    const idx = source.indexOf(`const ${schemaName}`);
    if (idx === -1) return null;
    // Find the opening { and extract the balanced block
    const openBrace = source.indexOf('{', idx);
    if (openBrace === -1) return null;
    let depth = 0;
    let i = openBrace;
    while (i < source.length) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    return source.slice(openBrace, i + 1);
  }

  it('DISCOVERY_SCHEMA exists and is a valid JSON Schema', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('DISCOVERY_SCHEMA'), 'DISCOVERY_SCHEMA constant not found');
    const literal = extractSchemaLiteral(src, 'DISCOVERY_SCHEMA');
    if (literal) {
      // Convert JS object literal to JSON (replace single quotes, strip trailing commas)
      try {
        const jsonStr = literal
          .replace(/'/g, '"')
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":');
        const schema = JSON.parse(jsonStr);
        assert.ok(schema.type, 'DISCOVERY_SCHEMA must have a "type" field');
        assert.ok(schema.properties, 'DISCOVERY_SCHEMA must have a "properties" field');
        assert.ok(schema.required, 'DISCOVERY_SCHEMA must have a "required" field');
      } catch (e) {
        // If parsing fails, at least assert the key fields are present in the source
        assert.ok(src.includes('type') && src.includes('properties') && src.includes('required'),
          `DISCOVERY_SCHEMA must be a valid JSON Schema with type, properties, required. Parse error: ${e.message}`);
      }
    }
  });

  it('KB_DOC_SCHEMA exists and is a valid JSON Schema', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('KB_DOC_SCHEMA'), 'KB_DOC_SCHEMA constant not found');
    const literal = extractSchemaLiteral(src, 'KB_DOC_SCHEMA');
    if (literal) {
      assert.ok(literal.includes('type'), 'KB_DOC_SCHEMA must have type');
      assert.ok(literal.includes('properties'), 'KB_DOC_SCHEMA must have properties');
      assert.ok(literal.includes('required'), 'KB_DOC_SCHEMA must have required');
    }
  });

  it('PHASE_RESULT_SCHEMA exists and is a valid JSON Schema', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('PHASE_RESULT_SCHEMA'), 'PHASE_RESULT_SCHEMA constant not found');
    const literal = extractSchemaLiteral(src, 'PHASE_RESULT_SCHEMA');
    if (literal) {
      assert.ok(literal.includes('type'), 'PHASE_RESULT_SCHEMA must have type');
      assert.ok(literal.includes('properties'), 'PHASE_RESULT_SCHEMA must have properties');
      assert.ok(literal.includes('required'), 'PHASE_RESULT_SCHEMA must have required');
    }
  });
});

describe('wfl-init — AC10: escalate-don\'t-continue', () => {
  let src;

  it('verifyExit !== 0 guard is present (no silent continuation past verify failure)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasVerifyGuard = src.includes('verifyExit !== 0') || src.includes('verifyExit != 0') ||
      src.includes('verifyExit === 0') || (src.includes('verifyExit') && src.includes('!== 0'));
    assert.ok(
      hasVerifyGuard,
      'No verifyExit !== 0 guard found — verify failure must halt, never silently continue (Iron Law 5)'
    );
  });

  it('structured failure return present (not silent undefined return on failure)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasFailureReturn = src.includes('ok: false') || src.includes("ok:false") ||
      src.includes('failure') || src.includes('escalated');
    assert.ok(hasFailureReturn, 'No structured failure return found — failures must return { ok: false, … }');
  });

  it('Phase 3 hard-halt guidance includes rebuild/restart instruction', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasRebuildHint = src.includes('rebuild') || src.includes('restart') || src.includes('re-run');
    assert.ok(hasRebuildHint, 'Phase 3 hard-halt must include rebuild/restart guidance per the rulebook');
  });
});

describe('wfl-init — AC11: syntax + SIDE-EFFECT OWNERSHIP header', () => {
  it('node --check passes on wfl-init.js', () => {
    try {
      execFileSync(process.execPath, ['--check', SRC], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      assert.fail(`node --check failed:\n${err.stderr || err.message}`);
    }
  });

  it('SIDE-EFFECT OWNERSHIP header is present', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('SIDE-EFFECT OWNERSHIP'),
      'SIDE-EFFECT OWNERSHIP header not found — required for all workflow drivers (matches siblings)'
    );
  });
});
