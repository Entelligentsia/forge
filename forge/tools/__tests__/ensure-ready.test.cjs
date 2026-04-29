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

describe('ensure-ready.cjs — computeCapabilities + predictCapabilitiesAfter', () => {
  const { computeCapabilities, predictCapabilitiesAfter, FAST_STUB_SENTINEL } =
    require('../ensure-ready.cjs');

  // Build a synthetic project with a small known manifest.
  const SMALL_MANIFEST = {
    namespaces: {
      workflows: {
        dir: '.forge/workflows',
        files: ['plan_task.md', 'implement_plan.md', 'review_code.md'],
      },
      personas: {
        dir: '.forge/personas',
        files: ['architect.md', 'engineer.md'],
      },
      skills: {
        dir: '.forge/skills',
        files: ['architect-skills.md', 'engineer-skills.md'],
      },
      templates: {
        dir: '.forge/templates',
        files: ['PLAN_TEMPLATE.md'],
      },
    },
  };

  function makeFastProject(opts = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-cap-'));
    fs.mkdirSync(path.join(root, '.forge', 'workflows'),  { recursive: true });
    fs.mkdirSync(path.join(root, '.forge', 'personas'),   { recursive: true });
    fs.mkdirSync(path.join(root, '.forge', 'skills'),     { recursive: true });
    fs.mkdirSync(path.join(root, '.forge', 'templates'),  { recursive: true });

    // Stubs vs real files based on opts.
    const stub = FAST_STUB_SENTINEL + ' first-use materialisation\n';
    const real = '# real file\n';
    if (opts.workflows) {
      for (const [f, kind] of Object.entries(opts.workflows)) {
        fs.writeFileSync(path.join(root, '.forge', 'workflows', f), kind === 'real' ? real : stub);
      }
    }
    if (opts.personas) {
      for (const f of opts.personas) fs.writeFileSync(path.join(root, '.forge', 'personas', f), real);
    }
    if (opts.skills) {
      for (const f of opts.skills) fs.writeFileSync(path.join(root, '.forge', 'skills', f), real);
    }
    if (opts.templates) {
      for (const f of opts.templates) fs.writeFileSync(path.join(root, '.forge', 'templates', f), real);
    }
    return root;
  }

  test('computeCapabilities counts a fully-materialised project as 100%', () => {
    const root = makeFastProject({
      workflows: { 'plan_task.md': 'real', 'implement_plan.md': 'real', 'review_code.md': 'real' },
      personas: ['architect.md', 'engineer.md'],
      skills: ['architect-skills.md', 'engineer-skills.md'],
      templates: ['PLAN_TEMPLATE.md'],
    });
    const cap = computeCapabilities(SMALL_MANIFEST, root);
    assert.equal(cap.total, 8);
    assert.equal(cap.current, 8);
    assert.equal(cap.percent, 100);
    fs.rmSync(root, { recursive: true });
  });

  test('computeCapabilities treats stubs as not-materialised', () => {
    const root = makeFastProject({
      workflows: { 'plan_task.md': 'stub', 'implement_plan.md': 'real' },
      personas: ['architect.md'],
    });
    const cap = computeCapabilities(SMALL_MANIFEST, root);
    assert.equal(cap.byNamespace.workflows.current, 1, 'only the real workflow counts');
    assert.equal(cap.byNamespace.personas.current, 1);
    assert.equal(cap.byNamespace.templates.current, 0);
    assert.equal(cap.current, 2);
    assert.equal(cap.total, 8);
    assert.equal(cap.percent, Math.round(2 / 8 * 100));
    fs.rmSync(root, { recursive: true });
  });

  test('computeCapabilities returns 0% on a bare project', () => {
    const root = makeFastProject();
    const cap = computeCapabilities(SMALL_MANIFEST, root);
    assert.equal(cap.current, 0);
    assert.equal(cap.percent, 0);
    fs.rmSync(root, { recursive: true });
  });

  test('predictCapabilitiesAfter adds only paths from expected namespaces', () => {
    const root = makeFastProject({
      workflows: { 'plan_task.md': 'real' },
      personas: ['architect.md'],
    });
    const addPaths = [
      '.forge/workflows/implement_plan.md',  // not yet materialised — should add
      '.forge/personas/architect.md',         // already materialised — should not double-count
      '.forge/personas/engineer.md',          // new — should add
      '.forge/notexpected.md',                // outside expected paths — ignore
    ];
    const p = predictCapabilitiesAfter(SMALL_MANIFEST, root, addPaths);
    assert.equal(p.added, 2);
    assert.equal(p.currentBefore, 2);
    assert.equal(p.currentAfter, 4);
    assert.equal(p.total, 8);
    assert.equal(p.percentAfter, Math.round(4 / 8 * 100));
    fs.rmSync(root, { recursive: true });
  });

  test('predictCapabilitiesAfter with empty addPaths returns no change', () => {
    const root = makeFastProject({ personas: ['architect.md'] });
    const p = predictCapabilitiesAfter(SMALL_MANIFEST, root, []);
    assert.equal(p.added, 0);
    assert.equal(p.currentBefore, p.currentAfter);
    fs.rmSync(root, { recursive: true });
  });

  test('computeCapabilities handles missing namespaces gracefully', () => {
    const cap = computeCapabilities({ namespaces: {} }, '/tmp');
    assert.equal(cap.current, 0);
    assert.equal(cap.total, 0);
    assert.equal(cap.percent, 0);
  });
});

describe('ensure-ready.cjs — _renderAnnouncement', () => {
  const { _renderAnnouncement } = require('../ensure-ready.cjs');
  const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

  test('returns a SINGLE line (no newlines) — fits inline display', () => {
    const out = _renderAnnouncement({
      currentBefore: 2, currentAfter: 12, total: 41,
      percentBefore: 5, percentAfter: 29, added: 10,
    });
    assert.ok(!out.includes('\n'), `expected single line but got newlines: ${JSON.stringify(out)}`);
    assert.ok(out.includes('Forge capability'), 'should include Forge capability prefix');
  });

  test('single-line contains before and after ratio and percent', () => {
    const out = _renderAnnouncement({
      currentBefore: 5, currentAfter: 20, total: 41,
      percentBefore: 12, percentAfter: 49, added: 15,
    }).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    assert.ok(out.includes('5/41'), 'should contain before ratio');
    assert.ok(out.includes('20/41'), 'should contain after ratio');
    assert.ok(out.includes('12%'), 'should contain before percent');
    assert.ok(out.includes('49%'), 'should contain after percent');
    assert.ok(out.includes('+15'), 'should contain added count');
  });

  test('single-line already-materialised shows refresh message', () => {
    const out = _renderAnnouncement({
      currentBefore: 12, currentAfter: 12, total: 41,
      percentBefore: 29, percentAfter: 29, added: 0,
    }).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    assert.ok(!out.includes('\n'), 'should be single line');
    assert.ok(out.includes('refresh') || out.includes('materialised'), 'should include refresh message');
  });

  test('single-line --all 100% materialised shows promote hint', () => {
    const out = _renderAnnouncement({
      currentBefore: 41, currentAfter: 41, total: 41,
      percentBefore: 100, percentAfter: 100, added: 0,
    }, { allFlag: true }).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    assert.ok(!out.includes('\n'), 'should be single line');
    assert.ok(out.includes('/forge:config'), 'should hint at promote command');
  });

  test('returns a single-line summary', () => {
    const out = _renderAnnouncement({
      currentBefore: 2, currentAfter: 12, total: 41,
      percentBefore: 5, percentAfter: 29, added: 10,
    });
    assert.ok(!out.includes('\n'), 'should be a single line');
    assert.ok(out.includes('Forge capability'), 'should contain Forge capability prefix');
  });

  test('single line does not contain ANSI rule characters (━━━)', () => {
    const out = _renderAnnouncement({
      currentBefore: 2, currentAfter: 12, total: 41,
      percentBefore: 5, percentAfter: 29, added: 10,
    });
    assert.ok(!out.includes('━━━'), 'should not contain em-dash rules in single-line output');
  });

  test('shows percentages and ratios in the data lines', () => {
    const out = _renderAnnouncement({
      currentBefore: 5, currentAfter: 20, total: 41,
      percentBefore: 12, percentAfter: 49, added: 15,
    }).replace(ANSI_RE, '');
    assert.ok(out.includes('12%'), 'should include before percent');
    assert.ok(out.includes('49%'), 'should include after percent');
    assert.ok(out.includes('5/41'), 'should include before ratio (from progress bar)');
    assert.ok(out.includes('20/41'), 'should include after ratio');
    assert.ok(out.includes('+15 artifacts'), 'should include added count (plural)');
  });

  test('uses singular "artifact" for added=1', () => {
    const out = _renderAnnouncement({
      currentBefore: 0, currentAfter: 1, total: 41,
      percentBefore: 0, percentAfter: 2, added: 1,
    }).replace(ANSI_RE, '');
    assert.ok(out.includes('+1 artifact'), 'should use singular');
    assert.ok(!out.includes('+1 artifacts'), 'should NOT use plural');
  });

  test('already-materialised closure (added=0) shows refresh-in-place message', () => {
    const out = _renderAnnouncement({
      currentBefore: 12, currentAfter: 12, total: 41,
      percentBefore: 29, percentAfter: 29, added: 0,
    }).replace(ANSI_RE, '');
    assert.ok(out.includes('refreshing in place'), `expected refresh message, got: ${out}`);
    assert.ok(!out.includes('+0 artifact'), 'should not emit a +0 line');
  });

  test('--all with 100% materialisation shows promote hint', () => {
    const out = _renderAnnouncement({
      currentBefore: 41, currentAfter: 41, total: 41,
      percentBefore: 100, percentAfter: 100, added: 0,
    }, { allFlag: true }).replace(ANSI_RE, '');
    assert.ok(!out.includes('\n'), 'should be single line');
    assert.ok(out.includes('materialised'), 'should announce materialised state');
    assert.ok(out.includes('/forge:config'), 'should hint at the promote command');
  });
});
