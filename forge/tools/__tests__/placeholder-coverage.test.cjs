'use strict';

/**
 * placeholder-coverage.test.cjs
 *
 * Validates that {{PLACEHOLDER}} slots are present in the expected
 * base-pack files after build. This is an acceptance gate.
 *
 * Iron Law 2: written BEFORE build-base-pack.cjs produces any output.
 * These tests will fail until the build script runs and produces
 * the re-genericized base-pack files.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const BASE_PACK = path.join(__dirname, '..', '..', 'init', 'base-pack');

function readBP(subPath) {
  const full = path.join(BASE_PACK, subPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

// ── Personas: every file must contain {{PROJECT_NAME}} ──────────────────────

describe('base-pack personas contain {{PROJECT_NAME}} placeholder', () => {
  const PERSONA_FILES = [
    'personas/architect.md',
    'personas/bug-fixer.md',
    'personas/collator.md',
    'personas/engineer.md',
    'personas/librarian.md',
    'personas/orchestrator.md',
    'personas/product-manager.md',
    'personas/qa-engineer.md',
    'personas/supervisor.md',
  ];

  for (const f of PERSONA_FILES) {
    test(`${f} contains {{PROJECT_NAME}}`, () => {
      const content = readBP(f);
      assert.ok(content !== null, `${f} must exist`);
      assert.ok(
        content.includes('{{PROJECT_NAME}}'),
        `${f} must contain {{PROJECT_NAME}} placeholder`
      );
    });
  }
});

// ── Personas: every file must contain {{SKILL_DIRECTIVES}} ──────────────────

describe('base-pack personas contain {{SKILL_DIRECTIVES}} placeholder', () => {
  const PERSONA_FILES = [
    'personas/architect.md',
    'personas/bug-fixer.md',
    'personas/collator.md',
    'personas/engineer.md',
    'personas/librarian.md',
    'personas/orchestrator.md',
    'personas/product-manager.md',
    'personas/qa-engineer.md',
    'personas/supervisor.md',
  ];

  for (const f of PERSONA_FILES) {
    test(`${f} contains {{SKILL_DIRECTIVES}}`, () => {
      const content = readBP(f);
      assert.ok(content !== null, `${f} must exist`);
      assert.ok(
        content.includes('{{SKILL_DIRECTIVES}}'),
        `${f} must contain {{SKILL_DIRECTIVES}} placeholder`
      );
    });
  }
});

// ── Skills: meta-backed skills must contain project-context placeholder ─────

describe('base-pack meta-backed skills contain project context placeholder', () => {
  const META_BACKED_SKILLS = [
    { file: 'skills/architect-skills.md', placeholder: '{{ARCHITECT_SKILL_PROJECT_CONTEXT}}' },
    { file: 'skills/bug-fixer-skills.md', placeholder: '{{BUG_FIXER_SKILL_PROJECT_CONTEXT}}' },
    { file: 'skills/collator-skills.md', placeholder: '{{COLLATOR_SKILL_PROJECT_CONTEXT}}' },
    { file: 'skills/engineer-skills.md', placeholder: '{{ENGINEER_SKILL_PROJECT_CONTEXT}}' },
    { file: 'skills/generic-skills.md', placeholder: '{{GENERIC_SKILL_PROJECT_CONTEXT}}' },
    { file: 'skills/qa-engineer-skills.md', placeholder: '{{QA_ENGINEER_SKILL_PROJECT_CONTEXT}}' },
    { file: 'skills/supervisor-skills.md', placeholder: '{{SUPERVISOR_SKILL_PROJECT_CONTEXT}}' },
  ];

  // Base-pack-only skills are exempted (copy-verbatim, no project-context placeholder)
  const BASE_PACK_ONLY_SKILLS = new Set([
    'skills/librarian-skills.md',
    'skills/store-custodian-skills.md',
  ]);

  for (const { file, placeholder } of META_BACKED_SKILLS) {
    test(`${file} contains ${placeholder}`, () => {
      const content = readBP(file);
      assert.ok(content !== null, `${file} must exist`);
      assert.ok(
        content.includes(placeholder),
        `${file} must contain project context placeholder ${placeholder}`
      );
    });
  }

  // Verify base-pack-only skills are also present (sanity check)
  for (const f of BASE_PACK_ONLY_SKILLS) {
    test(`${f} exists (base-pack-only, no project-context placeholder required)`, () => {
      const content = readBP(f);
      assert.ok(content !== null, `${f} must exist`);
    });
  }
});

// ── Commands: every file must contain {{PREFIX}} ────────────────────────────

describe('base-pack commands contain {{PREFIX}} placeholder', () => {
  const COMMAND_FILES = [
    'commands/approve.md',
    'commands/collate.md',
    'commands/commit.md',
    'commands/enhance.md',
    'commands/fix-bug.md',
    'commands/implement.md',
    'commands/plan.md',
    'commands/quiz-agent.md',
    'commands/retrospective.md',
    'commands/review-code.md',
    'commands/review-plan.md',
    'commands/run-sprint.md',
    'commands/run-task.md',
    'commands/sprint-intake.md',
    'commands/sprint-plan.md',
    'commands/validate.md',
  ];

  for (const f of COMMAND_FILES) {
    test(`${f} contains {{PREFIX}}`, () => {
      const content = readBP(f);
      assert.ok(content !== null, `${f} must exist`);
      assert.ok(
        content.includes('{{PREFIX}}'),
        `${f} must contain {{PREFIX}} placeholder`
      );
    });
  }
});

// ── Residual Forge persona names must be absent ─────────────────────────────

describe('base-pack files must not contain residual Forge persona names', () => {
  test('workflows/sprint_retrospective.md must not contain **Forge Architect**', () => {
    const content = readBP('workflows/sprint_retrospective.md');
    assert.ok(content !== null, 'sprint_retrospective.md must exist');
    assert.ok(
      !content.includes('**Forge Architect**'),
      'sprint_retrospective.md must not contain **Forge Architect** — use **{{PROJECT_NAME}} Architect**'
    );
  });

  test('workflows/sprint_retrospective.md must not contain "Forge-specific invariant"', () => {
    const content = readBP('workflows/sprint_retrospective.md');
    assert.ok(content !== null, 'sprint_retrospective.md must exist');
    assert.ok(
      !content.includes('Forge-specific invariant'),
      'sprint_retrospective.md must not contain "Forge-specific invariant"'
    );
  });

  test('workflows/architect_sprint_plan.md must not contain **Forge Architect**', () => {
    const content = readBP('workflows/architect_sprint_plan.md');
    assert.ok(content !== null, 'architect_sprint_plan.md must exist');
    assert.ok(
      !content.includes('**Forge Architect**'),
      'architect_sprint_plan.md must not contain **Forge Architect**'
    );
  });

  test('workflows/quiz_agent.md must not contain **Forge QA Engineer**', () => {
    const content = readBP('workflows/quiz_agent.md');
    assert.ok(content !== null, 'quiz_agent.md must exist');
    assert.ok(
      !content.includes('**Forge QA Engineer**'),
      'quiz_agent.md must not contain **Forge QA Engineer** — use **{{PROJECT_NAME}} QA Engineer**'
    );
  });

  test('workflows/run_sprint.md must not contain "since this repository is Forge itself"', () => {
    const content = readBP('workflows/run_sprint.md');
    assert.ok(content !== null, 'run_sprint.md must exist');
    assert.ok(
      !content.includes('since this repository is Forge itself'),
      'run_sprint.md must not contain "since this repository is Forge itself"'
    );
  });

  test('templates/PLAN_TEMPLATE.md must not contain *Forge Engineer* (should use *{{PROJECT_NAME}} Engineer*)', () => {
    const content = readBP('templates/PLAN_TEMPLATE.md');
    assert.ok(content !== null, 'PLAN_TEMPLATE.md must exist');
    assert.ok(
      !content.includes('*Forge Engineer*'),
      'PLAN_TEMPLATE.md must not contain *Forge Engineer* — use *{{PROJECT_NAME}} Engineer*'
    );
  });

  test('templates/PROGRESS_TEMPLATE.md must not contain *Forge Engineer*', () => {
    const content = readBP('templates/PROGRESS_TEMPLATE.md');
    assert.ok(content !== null, 'PROGRESS_TEMPLATE.md must exist');
    assert.ok(
      !content.includes('*Forge Engineer*'),
      'PROGRESS_TEMPLATE.md must not contain *Forge Engineer*'
    );
  });

  test('templates/PLAN_REVIEW_TEMPLATE.md must not contain *Forge Supervisor*', () => {
    const content = readBP('templates/PLAN_REVIEW_TEMPLATE.md');
    assert.ok(content !== null, 'PLAN_REVIEW_TEMPLATE.md must exist');
    assert.ok(
      !content.includes('*Forge Supervisor*'),
      'PLAN_REVIEW_TEMPLATE.md must not contain *Forge Supervisor*'
    );
  });

  test('templates/CODE_REVIEW_TEMPLATE.md must not contain *Forge Supervisor*', () => {
    const content = readBP('templates/CODE_REVIEW_TEMPLATE.md');
    assert.ok(content !== null, 'CODE_REVIEW_TEMPLATE.md must exist');
    assert.ok(
      !content.includes('*Forge Supervisor*'),
      'CODE_REVIEW_TEMPLATE.md must not contain *Forge Supervisor*'
    );
  });

  test('workflows/collator_agent.md must not contain **Forge Collator**', () => {
    const content = readBP('workflows/collator_agent.md');
    assert.ok(content !== null, 'collator_agent.md must exist');
    assert.ok(
      !content.includes('**Forge Collator**'),
      'collator_agent.md must not contain **Forge Collator**'
    );
  });

  test('workflows/architect_review_sprint_completion.md must not contain **Forge Architect**', () => {
    const content = readBP('workflows/architect_review_sprint_completion.md');
    assert.ok(content !== null, 'architect_review_sprint_completion.md must exist');
    assert.ok(
      !content.includes('**Forge Architect**'),
      'architect_review_sprint_completion.md must not contain **Forge Architect**'
    );
  });
});

// ── PLAN_TEMPLATE.md correct placeholder ────────────────────────────────────

describe('PLAN_TEMPLATE.md uses correct generic placeholder', () => {
  test('PLAN_TEMPLATE.md contains *{{PROJECT_NAME}} Engineer*', () => {
    const content = readBP('templates/PLAN_TEMPLATE.md');
    assert.ok(content !== null, 'PLAN_TEMPLATE.md must exist');
    assert.ok(
      content.includes('{{PROJECT_NAME}} Engineer'),
      'PLAN_TEMPLATE.md must contain {{PROJECT_NAME}} Engineer placeholder'
    );
  });
});

// ── package.json no-npm guarantee ────────────────────────────────────────────

describe('forge/package.json must not introduce npm dependencies', () => {
  test('forge/package.json exists', () => {
    const pkgPath = path.join(__dirname, '..', '..', '..', 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'forge/package.json must exist');
  });

  test('forge/package.json has no "dependencies" or "devDependencies" fields', () => {
    const pkgPath = path.join(__dirname, '..', '..', '..', 'package.json');
    if (!fs.existsSync(pkgPath)) return; // skip if file doesn't exist yet
    const content = fs.readFileSync(pkgPath, 'utf8');
    assert.ok(
      !content.includes('"dependencies"'),
      'forge/package.json must not have "dependencies" field — Iron Law: no npm packages'
    );
    assert.ok(
      !content.includes('"devDependencies"'),
      'forge/package.json must not have "devDependencies" field — Iron Law: no npm packages'
    );
  });

  test('forge/package.json has "build-base-pack" script', () => {
    const pkgPath = path.join(__dirname, '..', '..', '..', 'package.json');
    if (!fs.existsSync(pkgPath)) return; // skip if file doesn't exist yet
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.ok(
      pkg.scripts && typeof pkg.scripts['build-base-pack'] === 'string',
      'forge/package.json must have "build-base-pack" script'
    );
  });
});
