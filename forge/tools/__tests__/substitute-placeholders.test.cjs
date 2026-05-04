'use strict';

// Iron Law 2: failing tests written BEFORE implementation.
// This test file imports substitute-placeholders.cjs — which does not yet exist.
// All tests must fail until the implementation is written.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const SCRIPT_PATH = path.join(__dirname, '..', 'substitute-placeholders.cjs');

const {
  buildSubstitutionMap,
  applySubstitutions,
  extractFrontmatter,
  substituteFile,
  REQUIRED_KEYS,
  RUNTIME_PASSTHROUGH_KEYS,
} = require(SCRIPT_PATH);

// ── Helpers ──────────────────────────────────────────────────────────────────

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'subst-placeholders-'));
}

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) rmrf(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// ── Minimal fixtures ─────────────────────────────────────────────────────────

const MINIMAL_CONFIG = {
  project: { name: 'TestProject', prefix: 'TP' },
  commands: { test: 'npm test', lint: 'npm run lint' },
  paths: { engineering: 'engineering' },
};

const FULL_CONFIG = {
  project: { name: 'Acme Corp', prefix: 'ACME' },
  commands: { test: 'jest', lint: 'eslint .' },
  paths: { engineering: 'engineering' },
};

const MINIMAL_CONTEXT = {
  project: { name: 'TestProject', prefix: 'TP' },
  entities: ['User', 'Order', 'Product'],
  architecture: {
    frameworks: { backend: 'Express 4', frontend: 'React 18', database: 'MongoDB 7' },
    dataAccess: 'Mongoose ODM',
    keyDirectories: ['src/', 'routes/', 'models/'],
  },
  technicalDebt: ['Legacy auth module', 'Unindexed queries'],
  impactCategories: ['API', 'Database', 'Auth'],
  deployment: {
    environments: [
      { name: 'staging', frontend: 'https://staging.example.com', backend: 'https://api-staging.example.com', region: 'us-east-1' },
      { name: 'production', frontend: 'https://example.com', backend: 'https://api.example.com', region: 'us-east-1' },
    ],
  },
  conventions: { branching: 'feature/TASK-ID-slug' },
  verification: {
    typeCheck: 'npm run type-check',
    lint: 'npm run lint',
    test: 'npm test',
    build: 'npm run build',
    infraBuild: '',
  },
  skillWiring: [
    { skill: 'forge', personas: ['architect', 'engineer'] },
    { skill: 'security-watchdog', personas: ['supervisor'] },
  ],
};

// ── Test Group 1: buildSubstitutionMap — config-only (no context) ─────────────

describe('buildSubstitutionMap — config-only', () => {
  test('maps PROJECT_NAME from config.project.name', () => {
    const map = buildSubstitutionMap(FULL_CONFIG, null);
    assert.equal(map.get('PROJECT_NAME'), 'Acme Corp');
  });

  test('maps PREFIX from config.project.prefix', () => {
    const map = buildSubstitutionMap(FULL_CONFIG, null);
    assert.equal(map.get('PREFIX'), 'ACME');
  });

  test('maps TEST_COMMAND from config.commands.test', () => {
    const map = buildSubstitutionMap(FULL_CONFIG, null);
    assert.equal(map.get('TEST_COMMAND'), 'jest');
  });

  test('maps LINT_COMMAND from config.commands.lint', () => {
    const map = buildSubstitutionMap(FULL_CONFIG, null);
    assert.equal(map.get('LINT_COMMAND'), 'eslint .');
  });

  test('maps KB_PATH as paths.engineering + /architecture', () => {
    const map = buildSubstitutionMap(FULL_CONFIG, null);
    assert.equal(map.get('KB_PATH'), 'engineering/architecture');
  });

  test('returns a Map instance', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, null);
    assert.ok(map instanceof Map);
  });

  test('handles missing commands gracefully (empty strings)', () => {
    const config = { project: { name: 'X', prefix: 'X' }, paths: { engineering: 'eng' } };
    const map = buildSubstitutionMap(config, null);
    assert.equal(map.get('TEST_COMMAND'), '');
    assert.equal(map.get('LINT_COMMAND'), '');
  });
});

// ── Test Group 2: buildSubstitutionMap — with project-context ────────────────

describe('buildSubstitutionMap — with project-context', () => {
  test('maps ENTITY_MODEL as comma-joined array', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    assert.equal(map.get('ENTITY_MODEL'), 'User, Order, Product');
  });

  test('maps KEY_DIRECTORIES as comma-joined array', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    assert.equal(map.get('KEY_DIRECTORIES'), 'src/, routes/, models/');
  });

  test('maps STACK_SUMMARY as backend + frontend + database joined with +', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    assert.equal(map.get('STACK_SUMMARY'), 'Express 4 + React 18 + MongoDB 7');
  });

  test('STACK_SUMMARY omits empty tier parts', () => {
    const ctx = {
      ...MINIMAL_CONTEXT,
      architecture: {
        ...MINIMAL_CONTEXT.architecture,
        frameworks: { backend: 'Express 4', frontend: '', database: 'MongoDB 7' },
      },
    };
    const map = buildSubstitutionMap(MINIMAL_CONFIG, ctx);
    assert.equal(map.get('STACK_SUMMARY'), 'Express 4 + MongoDB 7');
  });

  test('STACK_SUMMARY is empty string when all tiers are empty', () => {
    const ctx = {
      ...MINIMAL_CONTEXT,
      architecture: {
        ...MINIMAL_CONTEXT.architecture,
        frameworks: { backend: '', frontend: '', database: '' },
      },
    };
    const map = buildSubstitutionMap(MINIMAL_CONFIG, ctx);
    assert.equal(map.get('STACK_SUMMARY'), '');
  });

  test('maps TECHNICAL_DEBT as comma-joined array', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    assert.equal(map.get('TECHNICAL_DEBT'), 'Legacy auth module, Unindexed queries');
  });

  test('maps IMPACT_CATEGORIES as comma-joined array', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    assert.equal(map.get('IMPACT_CATEGORIES'), 'API, Database, Auth');
  });

  test('maps VERIFICATION_COMMANDS as comma-separated non-empty values', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    // infraBuild is empty, should be omitted
    const val = map.get('VERIFICATION_COMMANDS');
    assert.ok(val.includes('npm run type-check'));
    assert.ok(val.includes('npm run lint'));
    assert.ok(val.includes('npm test'));
    assert.ok(val.includes('npm run build'));
    assert.ok(!val.includes('  ')); // no double spaces from empty joins
    assert.ok(!val.startsWith(','));
    assert.ok(!val.endsWith(','));
  });

  test('maps DEPLOYMENT_ENVIRONMENTS as a markdown table', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    const val = map.get('DEPLOYMENT_ENVIRONMENTS');
    assert.ok(val.includes('| staging |') || val.includes('staging'));
    assert.ok(val.includes('| production |') || val.includes('production'));
    assert.ok(val.includes('|'));
  });

  test('maps BRANCHING_CONVENTION from conventions.branching', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    assert.equal(map.get('BRANCHING_CONVENTION'), 'feature/TASK-ID-slug');
  });

  test('maps DATA_ACCESS from architecture.dataAccess', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    assert.equal(map.get('DATA_ACCESS'), 'Mongoose ODM');
  });

  test('maps SKILL_DIRECTIVES from skillWiring array', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    const val = map.get('SKILL_DIRECTIVES');
    assert.ok(val.includes('forge → architect, engineer'));
    assert.ok(val.includes('security-watchdog → supervisor'));
  });

  test('empty entities array yields empty ENTITY_MODEL', () => {
    const ctx = { ...MINIMAL_CONTEXT, entities: [] };
    const map = buildSubstitutionMap(MINIMAL_CONFIG, ctx);
    assert.equal(map.get('ENTITY_MODEL'), '');
  });
});

// ── Test Group 3: buildSubstitutionMap — skill-context blocks ────────────────

const RULES_WITH_CONTEXT = {
  personaProjectContext: {
    architect: [
      '- **Entity model**: {{ENTITY_MODEL}}',
      '- **Prefix**: {{PREFIX}}',
    ],
    engineer: [
      '- **Entity model**: {{ENTITY_MODEL}}',
      '- **Data access**: {{DATA_ACCESS}}',
    ],
    supervisor: [
      '- **Entity model**: {{ENTITY_MODEL}}',
    ],
    collator: [
      '- **Engineering root**: `{{KB_PATH}}/`',
    ],
    'bug-fixer': [
      '- **Entity model**: {{ENTITY_MODEL}}',
    ],
    'qa-engineer': [
      '- **Verification**: {{VERIFICATION_COMMANDS}}',
    ],
  },
};

describe('buildSubstitutionMap — skill-context blocks', () => {
  test('renders ENGINEER_SKILL_PROJECT_CONTEXT by joining and substituting lines', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT, RULES_WITH_CONTEXT);
    const val = map.get('ENGINEER_SKILL_PROJECT_CONTEXT');
    assert.ok(val.includes('User, Order, Product'));
    assert.ok(val.includes('Mongoose ODM'));
  });

  test('renders ARCHITECT_SKILL_PROJECT_CONTEXT correctly', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT, RULES_WITH_CONTEXT);
    const val = map.get('ARCHITECT_SKILL_PROJECT_CONTEXT');
    assert.ok(val.includes('User, Order, Product'));
    assert.ok(val.includes('TP')); // PREFIX
  });

  test('renders GENERIC_SKILL_PROJECT_CONTEXT as empty string when generic key is absent', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT, RULES_WITH_CONTEXT);
    const val = map.get('GENERIC_SKILL_PROJECT_CONTEXT');
    // Missing 'generic' key in personaProjectContext → should be empty string, not throw
    assert.equal(typeof val, 'string');
    assert.equal(val, '');
  });

  test('each skill-context line has placeholders substituted', () => {
    const map = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT, RULES_WITH_CONTEXT);
    const val = map.get('COLLATOR_SKILL_PROJECT_CONTEXT');
    // Should have resolved {{KB_PATH}}
    assert.ok(val.includes('engineering/architecture'));
    assert.ok(!val.includes('{{KB_PATH}}'));
  });
});

// ── Test Group 4: applySubstitutions — basic substitution ────────────────────

describe('applySubstitutions', () => {
  test('replaces known keys correctly', () => {
    const map = new Map([['PROJECT_NAME', 'Acme'], ['PREFIX', 'ACM']]);
    const result = applySubstitutions('Hello {{PROJECT_NAME}} — {{PREFIX}}', map);
    assert.equal(result, 'Hello Acme — ACM');
  });

  test('leaves runtime passthrough keys intact', () => {
    const map = new Map([['PROJECT_NAME', 'Acme']]);
    // DATE, SPRINT_ID, TASK_ID etc. must not be replaced
    const input = 'Sprint: {{SPRINT_ID}} on {{DATE}}';
    const result = applySubstitutions(input, map);
    assert.equal(result, 'Sprint: {{SPRINT_ID}} on {{DATE}}');
  });

  test('leaves unknown {{KEY}} tokens intact (missing optional)', () => {
    const map = new Map([['PROJECT_NAME', 'Acme']]);
    const input = 'Name: {{PROJECT_NAME}}, Other: {{UNKNOWN_KEY}}';
    const result = applySubstitutions(input, map);
    assert.equal(result, 'Name: Acme, Other: {{UNKNOWN_KEY}}');
  });

  test('multiple occurrences of the same key are all replaced', () => {
    const map = new Map([['PREFIX', 'TP']]);
    const result = applySubstitutions('{{PREFIX}} and {{PREFIX}} again', map);
    assert.equal(result, 'TP and TP again');
  });

  test('does not alter content with no placeholders', () => {
    const map = new Map([['PROJECT_NAME', 'Acme']]);
    const input = 'No placeholders here.';
    assert.equal(applySubstitutions(input, map), input);
  });
});

// ── Test Group 5: extractFrontmatter ─────────────────────────────────────────

describe('extractFrontmatter', () => {
  test('extracts YAML frontmatter from a file starting with ---', () => {
    const content = '---\nkey: value\n---\n\nBody text here.';
    const { frontmatter, body } = extractFrontmatter(content);
    assert.equal(frontmatter, '---\nkey: value\n---\n');
    assert.equal(body, '\nBody text here.');
  });

  test('file with no frontmatter: frontmatter null, body = full content', () => {
    const content = '# Title\n\nBody text.';
    const { frontmatter, body } = extractFrontmatter(content);
    assert.equal(frontmatter, null);
    assert.equal(body, content);
  });

  test('frontmatter opening --- must be at line 1 column 0 (no leading whitespace)', () => {
    // Leading space means no frontmatter
    const content = ' ---\nkey: value\n---\n\nBody text.';
    const { frontmatter, body } = extractFrontmatter(content);
    assert.equal(frontmatter, null);
    assert.equal(body, content);
  });

  test('--- horizontal rule in body is not treated as frontmatter', () => {
    const content = '# Title\n\n---\n\nSome content.';
    const { frontmatter, body } = extractFrontmatter(content);
    assert.equal(frontmatter, null);
    assert.equal(body, content);
  });

  test('handles files with only frontmatter and empty body', () => {
    const content = '---\nkey: value\n---\n';
    const { frontmatter, body } = extractFrontmatter(content);
    assert.equal(frontmatter, '---\nkey: value\n---\n');
    assert.equal(body, '');
  });

  test('multi-key frontmatter is extracted correctly', () => {
    const content = '---\nrequirements:\n  reasoning: High\ncontext:\n  speed: Low\n---\n# Heading';
    const { frontmatter, body } = extractFrontmatter(content);
    assert.ok(frontmatter.startsWith('---\n'));
    assert.ok(frontmatter.endsWith('---\n'));
    assert.equal(body, '# Heading');
  });
});

// ── Test Group 6: substituteFile — end-to-end per-file function ──────────────

describe('substituteFile', () => {
  test('frontmatter block passes through byte-for-byte (no substitution)', () => {
    const map = new Map([['PROJECT_NAME', 'Acme'], ['PREFIX', 'ACM']]);
    const content = '---\nid: {{PREFIX}}-skill\n---\n# {{PROJECT_NAME}} Skills';
    const result = substituteFile(content, map);
    // Frontmatter must not be altered
    assert.ok(result.startsWith('---\nid: {{PREFIX}}-skill\n---\n'));
    // Body must have substitution applied
    assert.ok(result.includes('# Acme Skills'));
  });

  test('body has substitutions applied', () => {
    const map = new Map([['PROJECT_NAME', 'Acme']]);
    const content = 'Hello {{PROJECT_NAME}} world.';
    const result = substituteFile(content, map);
    assert.equal(result, 'Hello Acme world.');
  });

  test('runtime passthrough keys in body remain intact', () => {
    const map = new Map([['PROJECT_NAME', 'Acme']]);
    const content = 'Sprint {{SPRINT_ID}} — {{PROJECT_NAME}}';
    const result = substituteFile(content, map);
    assert.equal(result, 'Sprint {{SPRINT_ID}} — Acme');
  });
});

// ── Test Group 7: Required key validation ────────────────────────────────────

describe('Required key validation', () => {
  test('REQUIRED_KEYS contains PROJECT_NAME', () => {
    assert.ok(REQUIRED_KEYS.has('PROJECT_NAME') || REQUIRED_KEYS.includes('PROJECT_NAME'));
  });

  test('REQUIRED_KEYS contains PREFIX', () => {
    assert.ok(REQUIRED_KEYS.has('PREFIX') || REQUIRED_KEYS.includes('PREFIX'));
  });

  test('buildSubstitutionMap succeeds when PROJECT_NAME and PREFIX present', () => {
    assert.doesNotThrow(() => buildSubstitutionMap(MINIMAL_CONFIG, null));
  });

  test('buildSubstitutionMap throws or signals error when PROJECT_NAME missing', () => {
    const config = { project: { prefix: 'TP' }, paths: { engineering: 'eng' } };
    // Should throw — missing PROJECT_NAME
    assert.throws(() => buildSubstitutionMap(config, null));
  });

  test('buildSubstitutionMap throws or signals error when PREFIX missing', () => {
    const config = { project: { name: 'TestProject' }, paths: { engineering: 'eng' } };
    // Should throw — missing PREFIX
    assert.throws(() => buildSubstitutionMap(config, null));
  });
});

// ── Test Group 8: Idempotency ─────────────────────────────────────────────────

describe('Idempotency', () => {
  test('applying substitutions twice produces identical output to applying once', () => {
    const map = new Map([['PROJECT_NAME', 'Acme'], ['PREFIX', 'ACM']]);
    const input = '# {{PROJECT_NAME}} — prefix {{PREFIX}}';
    const once = applySubstitutions(input, map);
    const twice = applySubstitutions(once, map);
    assert.equal(once, twice);
  });

  test('substituteFile is idempotent on files with frontmatter', () => {
    const map = new Map([['PROJECT_NAME', 'Acme'], ['PREFIX', 'ACM']]);
    const content = '---\nid: {{PREFIX}}-skill\n---\n# {{PROJECT_NAME}} Skills\n\nSome text.';
    const once = substituteFile(content, map);
    const twice = substituteFile(once, map);
    assert.equal(once, twice);
  });

  test('buildSubstitutionMap returns stable Map (deterministic ordering)', () => {
    const map1 = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    const map2 = buildSubstitutionMap(MINIMAL_CONFIG, MINIMAL_CONTEXT);
    // Same keys and values
    assert.deepEqual([...map1.entries()].sort(), [...map2.entries()].sort());
  });
});

// ── Test Group 9: Flat-key constraint ────────────────────────────────────────

describe('Flat-key constraint (no dot-notation placeholders)', () => {
  test('RUNTIME_PASSTHROUGH_KEYS is a Set', () => {
    assert.ok(RUNTIME_PASSTHROUGH_KEYS instanceof Set);
  });

  test('RUNTIME_PASSTHROUGH_KEYS contains DATE', () => {
    assert.ok(RUNTIME_PASSTHROUGH_KEYS.has('DATE'));
  });

  test('RUNTIME_PASSTHROUGH_KEYS contains SPRINT_ID', () => {
    assert.ok(RUNTIME_PASSTHROUGH_KEYS.has('SPRINT_ID'));
  });

  test('RUNTIME_PASSTHROUGH_KEYS contains TASK_ID', () => {
    assert.ok(RUNTIME_PASSTHROUGH_KEYS.has('TASK_ID'));
  });

  test('dot-notation placeholder is left intact (not a supported syntax)', () => {
    // T03 uses flat keys only; dot-notation is not parsed
    const map = new Map([['architecture.frameworks.backend', 'Express 4']]);
    const input = '{{architecture.frameworks.backend}}';
    const result = applySubstitutions(input, map);
    // Should remain intact since T03 only handles flat UPPER_SNAKE keys
    assert.equal(result, input);
  });
});

// ── Test Group 10: CLI smoke test ─────────────────────────────────────────────

describe('CLI smoke test', () => {
  test('exits 0 with synthetic fixture and verifies output content', () => {
    const dir = tmpDir();
    try {
      // Create minimal base-pack structure
      const basePack = path.join(dir, 'base-pack');
      writeFile(path.join(basePack, 'skills', 'engineer-skills.md'),
        '---\nid: engineer-skills\n---\n# {{PROJECT_NAME}} Engineer Skills\n\n{{ENGINEER_SKILL_PROJECT_CONTEXT}}\n');
      writeFile(path.join(basePack, 'personas', 'engineer.md'),
        '# {{PROJECT_NAME}} Engineer\n\nPrefix: {{PREFIX}}\n');
      writeFile(path.join(basePack, 'templates', 'COST_REPORT_TEMPLATE.md'),
        '# Cost — {{PREFIX}}\n\nGenerated: {{DATE}}\n');

      // Config and context
      const configFile = path.join(dir, 'config.json');
      const contextFile = path.join(dir, 'project-context.json');
      const outDir = path.join(dir, 'out');

      fs.writeFileSync(configFile, JSON.stringify({
        project: { name: 'SmokeTest', prefix: 'ST' },
        commands: { test: 'node --test', lint: 'node --check' },
        paths: { engineering: 'engineering' },
      }), 'utf8');

      fs.writeFileSync(contextFile, JSON.stringify({
        project: { name: 'SmokeTest', prefix: 'ST' },
        entities: ['Widget'],
        architecture: {
          frameworks: { backend: 'Koa', frontend: '', database: 'SQLite' },
          dataAccess: 'Knex',
          keyDirectories: ['src/'],
        },
        technicalDebt: [],
        impactCategories: [],
        skillWiring: [],
        deployment: { environments: [] },
        conventions: {},
        verification: {},
      }), 'utf8');

      const start = Date.now();
      const result = spawnSync(process.execPath, [
        SCRIPT_PATH,
        '--base-pack', basePack,
        '--config', configFile,
        '--context', contextFile,
        '--out', outDir,
      ], { encoding: 'utf8' });

      const elapsed = Date.now() - start;
      // Under 5000 ms (generous CI slack; target is under 2000 ms)
      assert.ok(elapsed < 5000, `CLI took ${elapsed}ms, expected < 5000ms`);

      if (result.status !== 0) {
        throw new Error(`CLI exited ${result.status}:\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
      }

      // Verify output files were created
      const personaOut = path.join(outDir, '.forge', 'personas', 'engineer.md');
      const skillOut = path.join(outDir, '.forge', 'skills', 'engineer-skills.md');
      const templateOut = path.join(outDir, '.forge', 'templates', 'COST_REPORT_TEMPLATE.md');

      assert.ok(fs.existsSync(personaOut), `Missing: ${personaOut}`);
      assert.ok(fs.existsSync(skillOut), `Missing: ${skillOut}`);
      assert.ok(fs.existsSync(templateOut), `Missing: ${templateOut}`);

      // Verify substitution was applied in body
      const personaContent = fs.readFileSync(personaOut, 'utf8');
      assert.ok(personaContent.includes('SmokeTest Engineer'));
      assert.ok(personaContent.includes('ST'));

      // Verify frontmatter was preserved in skill file
      const skillContent = fs.readFileSync(skillOut, 'utf8');
      assert.ok(skillContent.startsWith('---\nid: engineer-skills\n---\n'));
      assert.ok(skillContent.includes('SmokeTest Engineer Skills'));

      // Verify runtime passthrough key {{DATE}} was NOT replaced
      const templateContent = fs.readFileSync(templateOut, 'utf8');
      assert.ok(templateContent.includes('{{DATE}}'));
      // But {{PREFIX}} in header (body, not frontmatter) was replaced
      assert.ok(templateContent.includes('ST'));

    } finally {
      rmrf(dir);
    }
  });

  test('exits 1 when required keys missing (no project.name, no project.prefix)', () => {
    const dir = tmpDir();
    try {
      const basePack = path.join(dir, 'base-pack');
      writeFile(path.join(basePack, 'personas', 'engineer.md'), '# {{PROJECT_NAME}}\n');

      const configFile = path.join(dir, 'config.json');
      fs.writeFileSync(configFile, JSON.stringify({ commands: {}, paths: { engineering: 'eng' } }), 'utf8');

      const result = spawnSync(process.execPath, [
        SCRIPT_PATH,
        '--base-pack', basePack,
        '--config', configFile,
        '--out', path.join(dir, 'out'),
      ], { encoding: 'utf8', cwd: dir });

      assert.equal(result.status, 1);
    } finally {
      rmrf(dir);
    }
  });

  test('--dry-run flag suppresses all writes', () => {
    const dir = tmpDir();
    try {
      const basePack = path.join(dir, 'base-pack');
      writeFile(path.join(basePack, 'personas', 'engineer.md'), '# {{PROJECT_NAME}}\n');

      const configFile = path.join(dir, 'config.json');
      fs.writeFileSync(configFile, JSON.stringify({
        project: { name: 'DryRun', prefix: 'DR' },
        commands: {},
        paths: { engineering: 'eng' },
      }), 'utf8');

      const outDir = path.join(dir, 'out');
      const result = spawnSync(process.execPath, [
        SCRIPT_PATH,
        '--base-pack', basePack,
        '--config', configFile,
        '--out', outDir,
        '--dry-run',
      ], { encoding: 'utf8' });

      assert.equal(result.status, 0, `Dry run failed: ${result.stderr}`);
      // outDir must NOT have been created
      assert.ok(!fs.existsSync(outDir), 'outDir should not be created in dry-run mode');
    } finally {
      rmrf(dir);
    }
  });
});

// ── Test Group 11: FR-004 — _fragments ghost nesting regression ────────────────
//
// Verify that walking a base-pack containing a _fragments/ subdirectory
// under workflows/ produces output at .forge/workflows/_fragments/ (correct)
// and NOT at .forge/workflows/_fragments/_fragments/ (ghost nest).

describe('FR-004: _fragments ghost nesting', () => {
  test('fragment files appear at .forge/workflows/_fragments/ with NO ghost-nested _fragments/_fragments/', () => {
    const dir = tmpDir();
    try {
      const basePack = path.join(dir, 'base-pack');
      // Create workflows with a _fragments/ subdirectory
      writeFile(path.join(basePack, 'workflows', 'plan_task.md'), '---\nid: plan\n---\n# {{PROJECT_NAME}} Plan\n');
      writeFile(path.join(basePack, 'workflows', '_fragments', 'progress-reporting.md'), '# Progress Reporting\n{{PROJECT_NAME}}\n');
      writeFile(path.join(basePack, 'workflows', '_fragments', 'finalize.md'), '# Finalize\n');
      writeFile(path.join(basePack, 'workflows', '_fragments', 'context-injection.md'), '# Context Injection\n');
      writeFile(path.join(basePack, 'workflows', '_fragments', 'event-emission-schema.md'), '# Event Emission\n');

      const configFile = path.join(dir, 'config.json');
      fs.writeFileSync(configFile, JSON.stringify({
        project: { name: 'GhostTest', prefix: 'GT' },
        commands: { test: 'npm test', lint: 'npm run lint' },
        paths: { engineering: 'engineering' },
      }), 'utf8');

      const outDir = path.join(dir, 'out');
      const result = spawnSync(process.execPath, [
        SCRIPT_PATH,
        '--base-pack', basePack,
        '--config', configFile,
        '--out', outDir,
      ], { encoding: 'utf8' });

      assert.equal(result.status, 0, `CLI exited ${result.status}: ${result.stderr}`);

      // Correct path: .forge/workflows/_fragments/ must contain all 4 fragment files
      const fragDir = path.join(outDir, '.forge', 'workflows', '_fragments');
      assert.ok(fs.existsSync(fragDir), `_fragments dir must exist at ${fragDir}`);
      const fragFiles = fs.readdirSync(fragDir).filter(f => f.endsWith('.md'));
      assert.equal(fragFiles.length, 4, `expected 4 fragment files, got ${fragFiles.length}: ${fragFiles.join(', ')}`);

      // Verify each fragment file exists at the correct path
      for (const fname of ['progress-reporting.md', 'finalize.md', 'context-injection.md', 'event-emission-schema.md']) {
        assert.ok(fs.existsSync(path.join(fragDir, fname)), `fragment file must exist: ${fname}`);
      }

      // Ghost-nest check: .forge/workflows/_fragments/_fragments/ must NOT exist
      const ghostDir = path.join(fragDir, '_fragments');
      assert.ok(!fs.existsSync(ghostDir), `ghost-nested _fragments/_fragments/ directory must NOT exist, but it does at ${ghostDir}`);

      // Verify substitution was applied in fragment content
      const progressContent = fs.readFileSync(path.join(fragDir, 'progress-reporting.md'), 'utf8');
      assert.ok(progressContent.includes('GhostTest'), `fragment content must have PROJECT_NAME substituted, got: ${progressContent}`);
    } finally {
      rmrf(dir);
    }
  });
});

// ── Test Group 12: FR-006 — Commands path uses prefix-derived subdir ────────────
//
// Verify that the commands output directory is .claude/commands/{prefix-lowercased}/
// NOT the hardcoded .claude/commands/forge/

describe('FR-006: commands path uses prefix-derived subdir', () => {
  test('commands output directory uses {prefix-lowercased}/, not hardcoded forge/', () => {
    const dir = tmpDir();
    try {
      const basePack = path.join(dir, 'base-pack');
      writeFile(path.join(basePack, 'commands', 'plan.md'), '---\ndescription: plan\n---\n# /{{PREFIX}}:plan\n');

      const configFile = path.join(dir, 'config.json');
      fs.writeFileSync(configFile, JSON.stringify({
        project: { name: 'AcmeCorp', prefix: 'ACME' },
        commands: { test: 'npm test', lint: 'npm run lint' },
        paths: { engineering: 'engineering' },
      }), 'utf8');

      const outDir = path.join(dir, 'out');
      const result = spawnSync(process.execPath, [
        SCRIPT_PATH,
        '--base-pack', basePack,
        '--config', configFile,
        '--out', outDir,
      ], { encoding: 'utf8' });

      assert.equal(result.status, 0, `CLI exited ${result.status}: ${result.stderr}`);

      // Correct path: .claude/commands/acme/plan.md must exist
      const correctPath = path.join(outDir, '.claude', 'commands', 'acme', 'plan.md');
      assert.ok(fs.existsSync(correctPath), `command file must exist at ${correctPath}`);

      // Wrong path: .claude/commands/forge/ must NOT exist
      const wrongDir = path.join(outDir, '.claude', 'commands', 'forge');
      assert.ok(!fs.existsSync(wrongDir), `hardcoded 'forge/' directory must NOT exist, but found at ${wrongDir}`);

      // Verify substitution was applied
      const content = fs.readFileSync(correctPath, 'utf8');
      assert.ok(content.includes('ACME'), `command content must have PREFIX substituted, got: ${content}`);
    } finally {
      rmrf(dir);
    }
  });
});
