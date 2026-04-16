'use strict';
const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  buildBrief,
  extractPersonaSymbol,
  parseEntities,
} = require('../build-init-context.cjs');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MINIMAL_CONFIG = {
  project: { name: 'acme-web', prefix: 'ACME' },
  stack: { primary: 'TypeScript', frameworks: ['Express', 'React'] },
  commands: {
    test: 'npm test',
    build: 'npm run build',
    syntaxCheck: 'tsc --noEmit',
    lint: 'npm run lint',
  },
  paths: {
    engineering: 'engineering',
    store: '.forge/store',
    workflows: '.forge/workflows',
    templates: '.forge/templates',
    personas: '.forge/personas',
    commands: '.claude/commands',
    tools: '.forge/tools',
  },
  installedSkills: ['vue-best-practices'],
};

const CONFIG_NO_SKILLS = { ...MINIMAL_CONFIG, installedSkills: [] };

const CONFIG_CUSTOM_KB = {
  ...MINIMAL_CONFIG,
  paths: { ...MINIMAL_CONFIG.paths, engineering: 'ai-docs' },
};

function makeTmpDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `bic-test-${name}-`));
}

function seedFixture(base, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(base, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

const ARCHITECT_PERSONA = `---
symbol: 🏛
---

# Architect

I plan before cutting.
`;

const ENGINEER_PERSONA = `---
symbol: ⚒
---

# Engineer

I implement to the plan.
`;

const MASTER_INDEX = `# Master Index

## Domain Entities

User, Organization, Sprint, Task, Bug

## Architecture
`;

// ── Helpers setup ─────────────────────────────────────────────────────────────

let tmpDirs = [];

function setup(configOverride) {
  const base = makeTmpDir('fixture');
  tmpDirs.push(base);

  const config = configOverride || MINIMAL_CONFIG;
  const kbDir = path.join(base, config.paths.engineering);

  seedFixture(base, {
    'config.json': JSON.stringify(config),
    '.forge/personas/architect.md': ARCHITECT_PERSONA,
    '.forge/personas/engineer.md': ENGINEER_PERSONA,
    '.forge/personas/README.md': '# README — do not list',
    '.forge/templates/plan.md': '# Plan Template',
    '.forge/templates/code-review.md': '# Code Review',
    '.forge/templates/README.md': '# Templates README — do not list',
    [path.join(config.paths.engineering, 'architecture/01-overview.md')]: '# Overview',
    [path.join(config.paths.engineering, 'architecture/02-database.md')]: '# Database',
    [path.join(config.paths.engineering, 'MASTER_INDEX.md')]: MASTER_INDEX,
  });

  return {
    configPath: path.join(base, 'config.json'),
    personasDir: path.join(base, '.forge/personas'),
    templatesDir: path.join(base, '.forge/templates'),
    kbPath: kbDir,
  };
}

afterEach(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch {}
  }
  tmpDirs = [];
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('build-init-context.cjs — extractPersonaSymbol', () => {

  test('extracts symbol from YAML frontmatter "symbol:" line', () => {
    const content = `---\nsymbol: 🏛\n---\n\n# Architect\n`;
    assert.equal(extractPersonaSymbol(content), '🏛');
  });

  test('extracts symbol with extra whitespace', () => {
    const content = `---\nsymbol:   ⚒  \n---\n`;
    assert.equal(extractPersonaSymbol(content), '⚒');
  });

  test('returns fallback when no symbol line found', () => {
    const content = `# Persona\n\nNo symbol here.\n`;
    assert.equal(extractPersonaSymbol(content), '·');
  });

  test('extracts emoji from first-line format (generated persona style)', () => {
    const content = `🗻 **emberglow Architect** — I hold the shape of the whole.\n\n# emberglow Architect\n`;
    assert.equal(extractPersonaSymbol(content), '🗻');
  });

  test('extracts emoji from first-line format with multi-codepoint emoji', () => {
    const content = `🍂 **emberglow Bug Fixer** — I find what has decayed.\n\n# Bug Fixer\n`;
    assert.equal(extractPersonaSymbol(content), '🍂');
  });

  test('only reads first 15 lines (does not scan full file)', () => {
    const header = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const content = header + '\nsymbol: 🌊\n';
    // symbol is beyond line 15 — should not be found
    assert.equal(extractPersonaSymbol(content), '·');
  });

});

describe('build-init-context.cjs — parseEntities', () => {

  test('extracts comma-separated entities from an Entities section', () => {
    const content = `# Index\n\n## Domain Entities\n\nUser, Organization, Sprint\n`;
    const entities = parseEntities(content);
    assert.deepEqual(entities, ['Organization', 'Sprint', 'User']);
  });

  test('extracts list-item entities', () => {
    const content = `# Index\n\n## Entities\n\n- User\n- Sprint\n- Task\n`;
    const entities = parseEntities(content);
    assert.deepEqual(entities, ['Sprint', 'Task', 'User']);
  });

  test('returns empty array when no Entities section found', () => {
    const content = `# Index\n\n## Architecture\n\nSome content.\n`;
    assert.deepEqual(parseEntities(content), []);
  });

  test('deduplicates entities', () => {
    const content = `## Domain Entities\n\nUser, User, Sprint\n`;
    const entities = parseEntities(content);
    assert.equal(entities.filter(e => e === 'User').length, 1);
  });

  test('returns entities sorted alphabetically', () => {
    const content = `## Domain Entities\n\nZebra, Apple, Mango\n`;
    const entities = parseEntities(content);
    assert.deepEqual(entities, ['Apple', 'Mango', 'Zebra']);
  });

});

describe('build-init-context.cjs — buildBrief', () => {

  test('produces markdown with all required sections', () => {
    const opts = setup();
    const result = buildBrief(opts);
    assert.ok(result.markdown.includes('## Commands'), 'missing Commands section');
    assert.ok(result.markdown.includes('## Paths'), 'missing Paths section');
    assert.ok(result.markdown.includes('## Personas'), 'missing Personas section');
    assert.ok(result.markdown.includes('## Templates'), 'missing Templates section');
    assert.ok(result.markdown.includes('## Architecture Docs'), 'missing Architecture Docs section');
    assert.ok(result.markdown.includes('## Domain Entities'), 'missing Domain Entities section');
    assert.ok(result.markdown.includes('## Installed Skill Wiring'), 'missing Skill Wiring section');
  });

  test('substitution placeholders use config command values', () => {
    const opts = setup();
    const result = buildBrief(opts);
    assert.ok(result.markdown.includes('npm test'), 'missing test command');
    assert.ok(result.markdown.includes('npm run build'), 'missing build command');
    assert.ok(result.markdown.includes('tsc --noEmit'), 'missing syntax check');
  });

  test('personas section includes architect and engineer but NOT README', () => {
    const opts = setup();
    const result = buildBrief(opts);
    assert.ok(result.markdown.includes('architect'), 'missing architect persona');
    assert.ok(result.markdown.includes('engineer'), 'missing engineer persona');
    assert.ok(!result.markdown.includes('do not list'), 'README content leaked into personas');
  });

  test('templates section includes plan and code-review but NOT README', () => {
    const opts = setup();
    const result = buildBrief(opts);
    assert.ok(result.markdown.includes('plan'), 'missing plan template');
    assert.ok(result.markdown.includes('code-review'), 'missing code-review template');
    assert.ok(!result.markdown.match(/Templates README/), 'README.md appeared in templates');
  });

  test('architecture docs section lists 01-overview.md and 02-database.md', () => {
    const opts = setup();
    const result = buildBrief(opts);
    assert.ok(result.markdown.includes('01-overview.md'), 'missing 01-overview.md');
    assert.ok(result.markdown.includes('02-database.md'), 'missing 02-database.md');
  });

  test('persona symbols appear in the personas section', () => {
    const opts = setup();
    const result = buildBrief(opts);
    assert.ok(result.markdown.includes('🏛'), 'missing architect symbol');
    assert.ok(result.markdown.includes('⚒'), 'missing engineer symbol');
  });

  test('empty installedSkills produces empty wiring block without error', () => {
    const opts = setup(CONFIG_NO_SKILLS);
    const result = buildBrief(opts);
    assert.ok(result.markdown.includes('## Installed Skill Wiring'), 'section header missing');
    // Section should exist but have no skill→persona lines
    const section = result.markdown.split('## Installed Skill Wiring')[1] || '';
    const nextSection = section.indexOf('##');
    const wiring = nextSection >= 0 ? section.slice(0, nextSection) : section;
    assert.ok(!wiring.includes('→'), 'expected no wiring arrows with empty skills');
  });

  test('custom paths.engineering is used for architecture docs path', () => {
    const opts = setup(CONFIG_CUSTOM_KB);
    // Should not throw even though KB path is 'ai-docs' instead of 'engineering'
    assert.doesNotThrow(() => buildBrief(opts));
    const result = buildBrief(opts);
    assert.ok(result.markdown.includes('01-overview.md'), 'arch docs not found under custom KB path');
  });

  test('determinism: two calls with same inputs produce byte-identical markdown', () => {
    const opts = setup();
    const r1 = buildBrief(opts);
    const r2 = buildBrief(opts);
    assert.equal(r1.markdown, r2.markdown, 'output is not deterministic');
  });

  test('json output contains all expected keys', () => {
    const opts = setup();
    const result = buildBrief(opts);
    assert.ok(result.json.project, 'missing json.project');
    assert.ok(result.json.commands, 'missing json.commands');
    assert.ok(result.json.paths, 'missing json.paths');
    assert.ok(Array.isArray(result.json.personas), 'json.personas not array');
    assert.ok(Array.isArray(result.json.templates), 'json.templates not array');
    assert.ok(Array.isArray(result.json.architectureDocs), 'json.architectureDocs not array');
    assert.ok(Array.isArray(result.json.entities), 'json.entities not array');
    assert.ok(Array.isArray(result.json.skillWiring), 'json.skillWiring not array');
  });

  test('json.personas excludes README.md entries', () => {
    const opts = setup();
    const result = buildBrief(opts);
    const roles = result.json.personas.map(p => p.role);
    assert.ok(!roles.includes('README'), 'README appeared as a persona');
  });

  test('json.templates excludes README.md entries', () => {
    const opts = setup();
    const result = buildBrief(opts);
    assert.ok(!result.json.templates.includes('README'), 'README appeared as a template');
  });

});
