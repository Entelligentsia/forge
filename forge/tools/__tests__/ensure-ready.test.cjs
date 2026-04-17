'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { computeClosure, resolveKbPath } = require('../ensure-ready.cjs');

// ── Synthetic manifest used across tests ──────────────────────────────────────

const MANIFEST = {
  edges: {
    workflows: {
      plan_task: {
        personas: ['.forge/personas/architect.md'],
        skills: ['.forge/skills/architect-skills.md', '.forge/skills/generic-skills.md'],
        templates: ['.forge/templates/PLAN_TEMPLATE.md', '.forge/templates/TASK_PROMPT_TEMPLATE.md'],
        sub_workflows: ['.forge/workflows/review_plan.md'],
        kb_docs: ['{KB_PATH}/architecture/stack.md', '{KB_PATH}/MASTER_INDEX.md'],
        config_fields: ['paths.engineering'],
      },
      review_plan: {
        personas: ['.forge/personas/supervisor.md'],
        skills: ['.forge/skills/supervisor-skills.md', '.forge/skills/generic-skills.md'],
        templates: ['.forge/templates/PLAN_REVIEW_TEMPLATE.md'],
        sub_workflows: [],
        kb_docs: ['{KB_PATH}/architecture/stack.md'],
        config_fields: ['paths.engineering'],
      },
      fix_bug: {
        personas: ['.forge/personas/bug-fixer.md'],
        skills: ['.forge/skills/bug-fixer-skills.md', '.forge/skills/generic-skills.md'],
        templates: [],
        sub_workflows: ['.forge/workflows/review_code.md'],
        kb_docs: [],
        config_fields: [],
      },
    },
  },
};

// ── computeClosure ─────────────────────────────────────────────────────────────

describe('ensure-ready.cjs — computeClosure', () => {

  test('closure for plan_task includes the workflow itself', () => {
    const c = computeClosure(MANIFEST, 'plan_task');
    assert.ok(c.workflows.includes('.forge/workflows/plan_task.md'));
  });

  test('closure for plan_task includes direct persona dep', () => {
    const c = computeClosure(MANIFEST, 'plan_task');
    assert.ok(c.personas.includes('.forge/personas/architect.md'));
  });

  test('closure for plan_task includes direct skill deps', () => {
    const c = computeClosure(MANIFEST, 'plan_task');
    assert.ok(c.skills.includes('.forge/skills/architect-skills.md'));
    assert.ok(c.skills.includes('.forge/skills/generic-skills.md'));
  });

  test('closure for plan_task includes sub_workflow review_plan', () => {
    const c = computeClosure(MANIFEST, 'plan_task');
    assert.ok(c.workflows.includes('.forge/workflows/review_plan.md'));
  });

  test('closure for plan_task includes review_plan personas and skills (transitive 1-level)', () => {
    const c = computeClosure(MANIFEST, 'plan_task');
    assert.ok(c.personas.includes('.forge/personas/supervisor.md'), 'supervisor persona from review_plan');
    assert.ok(c.skills.includes('.forge/skills/supervisor-skills.md'), 'supervisor-skills from review_plan');
    assert.ok(c.templates.includes('.forge/templates/PLAN_REVIEW_TEMPLATE.md'), 'PLAN_REVIEW from review_plan');
  });

  test('closure deduplicates shared deps (generic-skills appears once)', () => {
    const c = computeClosure(MANIFEST, 'plan_task');
    const count = c.skills.filter(s => s.includes('generic-skills')).length;
    assert.equal(count, 1, 'generic-skills deduped to one entry');
  });

  test('closure for leaf workflow (review_plan) does not traverse sub-sub-workflows', () => {
    const c = computeClosure(MANIFEST, 'review_plan');
    assert.ok(c.workflows.includes('.forge/workflows/review_plan.md'));
    assert.ok(!c.workflows.some(w => w !== '.forge/workflows/review_plan.md'), 'no extra workflows for leaf');
  });

  test('unknown workflowId returns empty closure with zero-length arrays', () => {
    const c = computeClosure(MANIFEST, 'nonexistent_workflow');
    assert.equal(c.workflows.length, 0);
    assert.equal(c.personas.length, 0);
    assert.equal(c.skills.length, 0);
  });

  test('manifest with no edges section returns empty closure', () => {
    const c = computeClosure({}, 'plan_task');
    assert.equal(c.workflows.length, 0);
  });

  test('fix_bug closure includes sub-workflow even when sub-workflow has no edge in manifest', () => {
    const c = computeClosure(MANIFEST, 'fix_bug');
    // review_code is listed as sub_workflow but has no edge in MANIFEST
    assert.ok(c.workflows.includes('.forge/workflows/review_code.md'), 'sub_workflow path included even without its own edge');
  });

});

// ── resolveKbPath ──────────────────────────────────────────────────────────────

describe('ensure-ready.cjs — resolveKbPath', () => {

  test('returns paths.engineering from config object', () => {
    assert.equal(resolveKbPath({ paths: { engineering: 'my-kb' } }), 'my-kb');
  });

  test('falls back to "engineering" when config is null', () => {
    assert.equal(resolveKbPath(null), 'engineering');
  });

  test('falls back to "engineering" when paths is missing', () => {
    assert.equal(resolveKbPath({}), 'engineering');
  });

  test('falls back to "engineering" when paths.engineering is empty string', () => {
    assert.equal(resolveKbPath({ paths: { engineering: '' } }), 'engineering');
  });

});

// ── {KB_PATH} placeholder resolution ──────────────────────────────────────────

describe('ensure-ready.cjs — resolvePath', () => {

  test('resolvePath substitutes {KB_PATH} with actual path', () => {
    const { resolvePath } = require('../ensure-ready.cjs');
    assert.equal(resolvePath('{KB_PATH}/architecture/stack.md', 'my-kb'), 'my-kb/architecture/stack.md');
  });

  test('resolvePath leaves paths without {KB_PATH} unchanged', () => {
    const { resolvePath } = require('../ensure-ready.cjs');
    assert.equal(resolvePath('.forge/personas/architect.md', 'my-kb'), '.forge/personas/architect.md');
  });

});
