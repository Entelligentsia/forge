'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Iron Law 2: failing tests written BEFORE implementation.
// This test file imports build-base-pack.cjs — which does not yet exist.
// All tests must fail until the implementation is written.

const SCRIPT_PATH = path.join(__dirname, '..', 'build-base-pack.cjs');

// ── Helpers ─────────────────────────────────────────────────────────────────

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'build-base-pack-'));
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

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FIXTURE_META_WORKFLOW_WITH_FRONTMATTER = `---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: plan
context:
  architecture: true
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: [PLAN_TEMPLATE]
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---

# 🌱 Meta-Workflow: Plan Task

## Purpose

The Engineer plans the task.

## Algorithm

1. Load Context: read the task.

## Generation Instructions

When generating the workflow, incorporate project-specific test commands.
`;

const FIXTURE_META_PERSONA = `---
id: engineer
role: engineer
summary: >
  Plans and implements tasks.
responsibilities:
  - Produce PLAN.md
  - Implement the plan
outputs:
  - PLAN.md
  - PROGRESS.md
file_ref: .forge/personas/engineer.md
---

# Meta-Persona: Engineer

## Symbol

🌱

## Banner

\`forge\` — The Engineer makes things.

## Role

The Engineer reads task requirements and plans implementation.

## What the Engineer Needs to Know

- The project's technology stack
- The project's entity model

## What the Engineer Produces

- \`PLAN.md\` — technical approach

## Generation Instructions

When generating the Engineer persona, include test commands.
`;

const FIXTURE_META_SKILL = `---
id: architect-skills
name: Architect Meta-Skills
description: Core capabilities for the Architect role.
role: Architect
applies_to: [architect]
summary: >
  High-level system design capabilities.
capabilities:
  - Evaluate system structure
file_ref: .forge/skills/architect-skills.md
---

## Generation Instructions

When generating, cross-reference the installedSkills list.

## Skill Set

### 🏗️ System Design & Modeling
- **Architecture Analysis**: Evaluating the current system structure.
- **Design Pattern Selection**: Determining patterns (e.g., Microservices, Event-driven) for new features.

### 🗺️ Strategic Planning
- **Technical Roadmap**: Mapping out the system evolution.
`;

// ── Module load ──────────────────────────────────────────────────────────────

let mod;
describe('build-base-pack.cjs — module load', () => {
  test('module loads without throwing', () => {
    // This will fail until the file is created
    mod = require(SCRIPT_PATH);
  });
});

// ── GENERICIZATION_RULES export ──────────────────────────────────────────────

describe('GENERICIZATION_RULES', () => {
  test('GENERICIZATION_RULES is exported as an array', () => {
    mod = mod || require(SCRIPT_PATH);
    assert.ok(Array.isArray(mod.GENERICIZATION_RULES), 'GENERICIZATION_RULES must be an array');
    assert.ok(mod.GENERICIZATION_RULES.length > 0, 'GENERICIZATION_RULES must not be empty');
  });

  test('GENERICIZATION_RULES contains Forge Architect → {{PROJECT_NAME}} Architect', () => {
    mod = mod || require(SCRIPT_PATH);
    const found = mod.GENERICIZATION_RULES.some(
      r => r.from === 'Forge Architect' && r.to === '{{PROJECT_NAME}} Architect'
    );
    assert.ok(found, 'missing rule: Forge Architect → {{PROJECT_NAME}} Architect');
  });

  test('GENERICIZATION_RULES contains Forge Engineer → {{PROJECT_NAME}} Engineer', () => {
    mod = mod || require(SCRIPT_PATH);
    const found = mod.GENERICIZATION_RULES.some(
      r => r.from === 'Forge Engineer' && r.to === '{{PROJECT_NAME}} Engineer'
    );
    assert.ok(found, 'missing rule: Forge Engineer → {{PROJECT_NAME}} Engineer');
  });

  test('GENERICIZATION_RULES contains Forge Supervisor → {{PROJECT_NAME}} Supervisor', () => {
    mod = mod || require(SCRIPT_PATH);
    const found = mod.GENERICIZATION_RULES.some(
      r => r.from === 'Forge Supervisor' && r.to === '{{PROJECT_NAME}} Supervisor'
    );
    assert.ok(found, 'missing rule: Forge Supervisor → {{PROJECT_NAME}} Supervisor');
  });

  test('GENERICIZATION_RULES contains Forge QA Engineer → {{PROJECT_NAME}} QA Engineer', () => {
    mod = mod || require(SCRIPT_PATH);
    const found = mod.GENERICIZATION_RULES.some(
      r => r.from === 'Forge QA Engineer' && r.to === '{{PROJECT_NAME}} QA Engineer'
    );
    assert.ok(found, 'missing rule: Forge QA Engineer → {{PROJECT_NAME}} QA Engineer');
  });

  test('GENERICIZATION_RULES contains Forge Collator → {{PROJECT_NAME}} Collator', () => {
    mod = mod || require(SCRIPT_PATH);
    const found = mod.GENERICIZATION_RULES.some(
      r => r.from === 'Forge Collator' && r.to === '{{PROJECT_NAME}} Collator'
    );
    assert.ok(found, 'missing rule: Forge Collator → {{PROJECT_NAME}} Collator');
  });

  test('GENERICIZATION_RULES contains Forge Bug Fixer → {{PROJECT_NAME}} Bug Fixer', () => {
    mod = mod || require(SCRIPT_PATH);
    const found = mod.GENERICIZATION_RULES.some(
      r => r.from === 'Forge Bug Fixer' && r.to === '{{PROJECT_NAME}} Bug Fixer'
    );
    assert.ok(found, 'missing rule: Forge Bug Fixer → {{PROJECT_NAME}} Bug Fixer');
  });

  test('GENERICIZATION_RULES contains Forge Orchestrator → {{PROJECT_NAME}} Orchestrator', () => {
    mod = mod || require(SCRIPT_PATH);
    const found = mod.GENERICIZATION_RULES.some(
      r => r.from === 'Forge Orchestrator' && r.to === '{{PROJECT_NAME}} Orchestrator'
    );
    assert.ok(found, 'missing rule: Forge Orchestrator → {{PROJECT_NAME}} Orchestrator');
  });
});

// ── transformPersona ──────────────────────────────────────────────────────────

describe('transformPersona(metaContent)', () => {
  test('strips YAML frontmatter from output', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformPersona(FIXTURE_META_PERSONA);
    assert.ok(!result.startsWith('---'), 'output must not start with frontmatter delimiter');
    assert.ok(!result.includes('file_ref:'), 'output must not contain file_ref key');
  });

  test('strips ## Generation Instructions section', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformPersona(FIXTURE_META_PERSONA);
    assert.ok(!result.includes('## Generation Instructions'), 'output must not contain ## Generation Instructions');
    assert.ok(!result.includes('When generating the Engineer persona'), 'output must not contain generation prose');
  });

  test('output does not contain Meta-Persona: prefix in heading', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformPersona(FIXTURE_META_PERSONA);
    assert.ok(!result.includes('Meta-Persona:'), 'output must not contain Meta-Persona: prefix');
  });
});

// ── transformWorkflow ─────────────────────────────────────────────────────────

describe('transformWorkflow(metaContent)', () => {
  test('strips ## Generation Instructions section', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformWorkflow(FIXTURE_META_WORKFLOW_WITH_FRONTMATTER);
    assert.ok(!result.includes('## Generation Instructions'), 'output must not contain ## Generation Instructions');
    assert.ok(!result.includes('When generating the workflow'), 'output must not contain generation prose');
  });

  test('strips ## Purpose section', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformWorkflow(FIXTURE_META_WORKFLOW_WITH_FRONTMATTER);
    assert.ok(!result.includes('## Purpose'), 'output must not contain ## Purpose section');
    assert.ok(!result.includes('The Engineer plans the task.'), 'output must not contain Purpose prose');
  });

  test('replaces Meta-Workflow: prefix in title', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformWorkflow(FIXTURE_META_WORKFLOW_WITH_FRONTMATTER);
    assert.ok(!result.includes('Meta-Workflow:'), 'output must not contain Meta-Workflow: prefix');
    assert.ok(result.includes('# Plan Task'), 'output must contain plain title without prefix');
  });

  test('FRONTMATTER PRESERVATION: YAML frontmatter is copied verbatim', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformWorkflow(FIXTURE_META_WORKFLOW_WITH_FRONTMATTER);

    // Extract the expected frontmatter block
    const expectedFm = `---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: plan
context:
  architecture: true
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: [PLAN_TEMPLATE]
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---`;

    assert.ok(
      result.startsWith(expectedFm),
      `output must start with verbatim frontmatter.\n` +
      `Expected start:\n${expectedFm}\n\n` +
      `Actual start:\n${result.slice(0, expectedFm.length + 50)}`
    );
  });

  test('replaces "see Generation Instructions" with "see `_fragments/finalize.md`"', () => {
    mod = mod || require(SCRIPT_PATH);
    const contentWithRef = FIXTURE_META_WORKFLOW_WITH_FRONTMATTER.replace(
      '## Algorithm',
      '## Algorithm\n\nSee Generation Instructions for token reporting.\n\n## Algorithm2'
    );
    const result = mod.transformWorkflow(contentWithRef);
    assert.ok(!result.includes('see Generation Instructions'), 'should not contain "see Generation Instructions"');
  });
});

// ── transformSkill ─────────────────────────────────────────────────────────────

describe('transformSkill(metaContent)', () => {
  test('strips ## Generation Instructions section', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformSkill(FIXTURE_META_SKILL);
    assert.ok(!result.includes('## Generation Instructions'), 'output must not contain ## Generation Instructions');
    assert.ok(!result.includes('cross-reference the installedSkills'), 'output must not contain generation prose');
  });

  test('promotes ### headings to ## headings', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformSkill(FIXTURE_META_SKILL);
    assert.ok(result.includes('## 🏗️ System Design & Modeling'), 'must promote ### to ## for Skill Set section');
    assert.ok(result.includes('## 🗺️ Strategic Planning'), 'must promote ### to ## for second skill section');
    assert.ok(!result.includes('### 🏗️'), 'must not contain ### headings in skill sections');
  });

  test('strips file_ref from YAML frontmatter output', () => {
    mod = mod || require(SCRIPT_PATH);
    const result = mod.transformSkill(FIXTURE_META_SKILL);
    assert.ok(!result.includes('file_ref:'), 'output must not contain file_ref field');
  });
});

// ── applyGenericizationRules ──────────────────────────────────────────────────

describe('applyGenericizationRules(content, rules)', () => {
  test('replaces Forge Architect with {{PROJECT_NAME}} Architect', () => {
    mod = mod || require(SCRIPT_PATH);
    const rules = [{ from: 'Forge Architect', to: '{{PROJECT_NAME}} Architect' }];
    const content = '**Forge Architect** — I hold the shape.';
    const result = mod.applyGenericizationRules(content, rules);
    assert.equal(result, '**{{PROJECT_NAME}} Architect** — I hold the shape.');
  });

  test('replaces all occurrences in content', () => {
    mod = mod || require(SCRIPT_PATH);
    const rules = [{ from: 'Forge Engineer', to: '{{PROJECT_NAME}} Engineer' }];
    const content = 'Forge Engineer does this. The Forge Engineer does that.';
    const result = mod.applyGenericizationRules(content, rules);
    assert.ok(!result.includes('Forge Engineer'), 'must replace all occurrences');
    assert.equal(result.split('{{PROJECT_NAME}} Engineer').length - 1, 2, 'must have 2 replacements');
  });

  test('applies multiple rules in order', () => {
    mod = mod || require(SCRIPT_PATH);
    const rules = [
      { from: 'Forge Architect', to: '{{PROJECT_NAME}} Architect' },
      { from: 'Forge Engineer', to: '{{PROJECT_NAME}} Engineer' },
    ];
    const content = 'Forge Architect and Forge Engineer.';
    const result = mod.applyGenericizationRules(content, rules);
    assert.equal(result, '{{PROJECT_NAME}} Architect and {{PROJECT_NAME}} Engineer.');
  });

  test('returns content unchanged when rules list is empty', () => {
    mod = mod || require(SCRIPT_PATH);
    const content = 'Forge Architect unchanged.';
    const result = mod.applyGenericizationRules(content, []);
    assert.equal(result, content);
  });
});

// ── generateCommand ────────────────────────────────────────────────────────────

describe('generateCommand(name, metadata)', () => {
  test('produces command file with {{PREFIX}} placeholder in heading', () => {
    mod = mod || require(SCRIPT_PATH);
    const meta = { description: 'Design and document the implementation plan for a task', workflow: 'plan_task.md' };
    const result = mod.generateCommand('plan.md', meta);
    assert.ok(result.includes('{{PREFIX}}'), 'command file must contain {{PREFIX}} placeholder');
    assert.ok(result.includes('/{{PREFIX}}:plan'), 'command file must contain /{{PREFIX}}:plan heading');
  });

  test('produces command file with correct description in frontmatter', () => {
    mod = mod || require(SCRIPT_PATH);
    const meta = { description: 'Design and document the implementation plan for a task', workflow: 'plan_task.md' };
    const result = mod.generateCommand('plan.md', meta);
    assert.ok(result.includes('Design and document the implementation plan for a task'), 'must include description');
  });

  test('includes workflow reference in Execute section', () => {
    mod = mod || require(SCRIPT_PATH);
    const meta = { description: 'Execute the approved plan', workflow: 'implement_plan.md' };
    const result = mod.generateCommand('implement.md', meta);
    assert.ok(result.includes('implement_plan.md'), 'must reference workflow file');
  });

  test('includes $ARGUMENTS at the end', () => {
    mod = mod || require(SCRIPT_PATH);
    const meta = { description: 'Test command', workflow: 'plan_task.md' };
    const result = mod.generateCommand('plan.md', meta);
    assert.ok(result.includes('$ARGUMENTS'), 'must include $ARGUMENTS');
  });
});

// ── COMMAND_METADATA table ────────────────────────────────────────────────────

describe('COMMAND_METADATA', () => {
  test('COMMAND_METADATA is exported with 16 entries', () => {
    mod = mod || require(SCRIPT_PATH);
    assert.ok(Array.isArray(mod.COMMAND_METADATA), 'COMMAND_METADATA must be an array');
    assert.equal(mod.COMMAND_METADATA.length, 16, 'COMMAND_METADATA must have 16 entries');
  });

  test('enhance.md entry has ENHANCE_AGENT_SENTINEL as workflow', () => {
    mod = mod || require(SCRIPT_PATH);
    const enhanceEntry = mod.COMMAND_METADATA.find(c => c.file === 'enhance.md');
    assert.ok(enhanceEntry, 'must have enhance.md entry');
    assert.equal(enhanceEntry.workflow, 'ENHANCE_AGENT_SENTINEL', 'enhance.md must use ENHANCE_AGENT_SENTINEL');
  });

  test('plan.md entry maps to plan_task.md workflow', () => {
    mod = mod || require(SCRIPT_PATH);
    const planEntry = mod.COMMAND_METADATA.find(c => c.file === 'plan.md');
    assert.ok(planEntry, 'must have plan.md entry');
    assert.equal(planEntry.workflow, 'plan_task.md');
  });

  test('quiz-agent.md entry maps to quiz_agent.md workflow', () => {
    mod = mod || require(SCRIPT_PATH);
    const quizEntry = mod.COMMAND_METADATA.find(c => c.file === 'quiz-agent.md');
    assert.ok(quizEntry, 'must have quiz-agent.md entry');
    assert.equal(quizEntry.workflow, 'quiz_agent.md');
  });

  test('validate.md entry maps to validate_task.md workflow', () => {
    mod = mod || require(SCRIPT_PATH);
    const validateEntry = mod.COMMAND_METADATA.find(c => c.file === 'validate.md');
    assert.ok(validateEntry, 'must have validate.md entry');
    assert.equal(validateEntry.workflow, 'validate_task.md');
  });
});

// ── Idempotency ────────────────────────────────────────────────────────────────

describe('Idempotency: running build twice produces byte-identical output', () => {
  let outDir1;
  let outDir2;
  const FORGE_DIR = path.join(__dirname, '..', '..');

  before(() => {
    outDir1 = tmpDir();
    outDir2 = tmpDir();
  });

  after(() => {
    rmrf(outDir1);
    rmrf(outDir2);
  });

  test('all output file hashes match between two independent runs', () => {
    mod = mod || require(SCRIPT_PATH);

    // Run the build twice into separate temp dirs
    mod.buildBasePack({ forgeRoot: FORGE_DIR, outRoot: outDir1 });
    mod.buildBasePack({ forgeRoot: FORGE_DIR, outRoot: outDir2 });

    // Collect all files from run 1
    const files1 = collectFiles(outDir1);
    const files2 = collectFiles(outDir2);

    assert.deepEqual(
      files1.map(f => f.rel).sort(),
      files2.map(f => f.rel).sort(),
      'both runs must produce the same set of files'
    );

    // Compare SHA-256 of every file
    for (const { rel } of files1) {
      const c1 = fs.readFileSync(path.join(outDir1, rel), 'utf8');
      const c2 = fs.readFileSync(path.join(outDir2, rel), 'utf8');
      assert.equal(
        sha256(c1),
        sha256(c2),
        `hash mismatch for ${rel} between run 1 and run 2`
      );
    }
  });

  function collectFiles(dir) {
    const results = [];
    function walk(current, rel) {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name);
        const relPath = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(fullPath, relPath);
        else results.push({ rel: relPath });
      }
    }
    walk(dir, '');
    return results;
  }
});

// ── Output validation ──────────────────────────────────────────────────────────

describe('buildBasePack: validates all expected output files exist', () => {
  let outDir;
  const FORGE_DIR = path.join(__dirname, '..', '..');

  before(() => { outDir = tmpDir(); });
  after(() => rmrf(outDir));

  test('exits successfully and creates output directory', () => {
    mod = mod || require(SCRIPT_PATH);
    // Should not throw
    mod.buildBasePack({ forgeRoot: FORGE_DIR, outRoot: outDir });
    assert.ok(fs.existsSync(outDir), 'output directory must exist');
  });

  test('all 9 persona files created in output/personas/', () => {
    mod = mod || require(SCRIPT_PATH);
    const personaDir = path.join(outDir, 'personas');
    const files = fs.readdirSync(personaDir).filter(f => f.endsWith('.md'));
    assert.equal(files.length, 9, `expected 9 persona files, got ${files.length}: ${files.join(', ')}`);
  });

  test('all 9 skill files created in output/skills/', () => {
    mod = mod || require(SCRIPT_PATH);
    const skillDir = path.join(outDir, 'skills');
    const files = fs.readdirSync(skillDir).filter(f => f.endsWith('.md'));
    assert.equal(files.length, 9, `expected 9 skill files, got ${files.length}: ${files.join(', ')}`);
  });

  test('all 19 workflow files + 4 fragments created', () => {
    mod = mod || require(SCRIPT_PATH);
    const wfDir = path.join(outDir, 'workflows');
    const files = fs.readdirSync(wfDir).filter(f => f.endsWith('.md'));
    assert.equal(files.length, 19, `expected 19 workflow files, got ${files.length}: ${files.join(', ')}`);
    const fragDir = path.join(outDir, 'workflows', '_fragments');
    const frags = fs.readdirSync(fragDir).filter(f => f.endsWith('.md'));
    assert.equal(frags.length, 4, `expected 4 fragment files, got ${frags.length}`);
  });

  test('all 10 template files created in output/templates/', () => {
    mod = mod || require(SCRIPT_PATH);
    const tplDir = path.join(outDir, 'templates');
    const files = fs.readdirSync(tplDir);
    assert.equal(files.length, 10, `expected 10 template files, got ${files.length}: ${files.join(', ')}`);
  });

  test('all 16 command files created in output/commands/', () => {
    mod = mod || require(SCRIPT_PATH);
    const cmdDir = path.join(outDir, 'commands');
    const files = fs.readdirSync(cmdDir).filter(f => f.endsWith('.md'));
    assert.equal(files.length, 16, `expected 16 command files, got ${files.length}: ${files.join(', ')}`);
  });

  // FR-007-7a: migrate_structural.md must be in base-pack output
  test('FR-007-7a: migrate_structural.md present in workflow output after build', () => {
    mod = mod || require(SCRIPT_PATH);
    const wfDir = path.join(outDir, 'workflows');
    assert.ok(fs.existsSync(path.join(wfDir, 'migrate_structural.md')),
      'migrate_structural.md must exist in workflows output');
  });
});
