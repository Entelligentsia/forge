'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseGates, parseOutputs } = require('../parse-gates.cjs');

describe('parse-gates.cjs :: parseGates()', () => {
  test('parses a single phase with all directive types', () => {
    const md = [
      '```gates phase=implement',
      'artifact engineering/sprints/{sprint}/tasks/{task}/PLAN.md min=200',
      'require task.status in [plan-approved, implementing]',
      'forbid  task.status == completed',
      'after   review-plan = approved',
      '```',
    ].join('\n');
    const gates = parseGates(md);
    assert.deepEqual(gates, {
      implement: {
        artifacts: [
          { path: 'engineering/sprints/{sprint}/tasks/{task}/PLAN.md', minBytes: 200 },
        ],
        require: [
          { field: 'task.status', op: 'in', value: ['plan-approved', 'implementing'] },
        ],
        forbid: [
          { field: 'task.status', op: '==', value: 'completed' },
        ],
        after: [
          { phase: 'review-plan', verdict: 'approved' },
        ],
      },
    });
  });

  test('parses multiple phases from one file', () => {
    const md = [
      '```gates phase=plan',
      'forbid task.status == completed',
      '```',
      '',
      'Some prose between blocks.',
      '',
      '```gates phase=implement',
      'after plan = approved',
      '```',
    ].join('\n');
    const gates = parseGates(md);
    assert.ok(gates.plan);
    assert.ok(gates.implement);
    assert.equal(gates.plan.forbid.length, 1);
    assert.equal(gates.implement.after.length, 1);
  });

  test('artifact without min= defaults to minBytes 0', () => {
    const md = [
      '```gates phase=review',
      'artifact engineering/sprints/{sprint}/REVIEW.md',
      '```',
    ].join('\n');
    const gates = parseGates(md);
    assert.deepEqual(gates.review.artifacts, [
      { path: 'engineering/sprints/{sprint}/REVIEW.md', minBytes: 0 },
    ]);
  });

  test('blank lines and # comments are ignored', () => {
    const md = [
      '```gates phase=plan',
      '# top comment',
      '',
      'forbid task.status == completed',
      '   # indented comment',
      '',
      '```',
    ].join('\n');
    const gates = parseGates(md);
    assert.equal(gates.plan.forbid.length, 1);
  });

  test('require with != op', () => {
    const md = [
      '```gates phase=implement',
      'require task.status != completed',
      '```',
    ].join('\n');
    const gates = parseGates(md);
    assert.deepEqual(gates.implement.require[0], {
      field: 'task.status', op: '!=', value: 'completed',
    });
  });

  test('unknown directive throws with line number', () => {
    const md = [
      '```gates phase=plan',
      'banana task.status == completed',
      '```',
    ].join('\n');
    assert.throws(() => parseGates(md), /line 2.*banana/i);
  });

  test('unknown op in predicate throws', () => {
    const md = [
      '```gates phase=plan',
      'require task.status =~ completed',
      '```',
    ].join('\n');
    assert.throws(() => parseGates(md), /op|predicate/i);
  });

  test('fence without phase= label is ignored (not a gates fence)', () => {
    const md = [
      '```gates',
      'forbid task.status == completed',
      '```',
    ].join('\n');
    // Missing phase attribute → not recognised as a gates fence → empty result.
    assert.deepEqual(parseGates(md), {});
  });

  test('duplicate phase throws', () => {
    const md = [
      '```gates phase=plan',
      'forbid task.status == completed',
      '```',
      '',
      '```gates phase=plan',
      'forbid task.status == archived',
      '```',
    ].join('\n');
    assert.throws(() => parseGates(md), /duplicate.*plan/i);
  });

  test('after directive requires approved|revision|n/a verdict', () => {
    const md = [
      '```gates phase=implement',
      'after review-plan = maybe',
      '```',
    ].join('\n');
    assert.throws(() => parseGates(md), /verdict/i);
  });

  test('after directive accepts n/a verdict (setup phases like triage/plan)', () => {
    // n/a is a legitimate verdict for non-review phases (plan, implement,
    // triage) — see read-verdict.cjs ALLOWED_VERDICTS. The parser MUST
    // accept it so meta-fix-bug.md gates like `after triage = n/a` parse.
    // Previously rejected; surfaced as "preflight exit 2 (misconfigured)"
    // on EMBERGLOW-BUG-001 first run.
    const md = [
      '```gates phase=plan',
      'after triage = n/a',
      '```',
    ].join('\n');
    const gates = parseGates(md);
    assert.ok(gates.plan);
    assert.equal(gates.plan.after.length, 1);
    assert.equal(gates.plan.after[0].phase, 'triage');
    assert.equal(gates.plan.after[0].verdict, 'n/a');
  });

  test('empty document returns empty object', () => {
    assert.deepEqual(parseGates(''), {});
    assert.deepEqual(parseGates('# just a doc\n\nNo gates here.\n'), {});
  });

  test('phase names may contain dashes and digits', () => {
    const md = [
      '```gates phase=review-plan',
      'after plan = approved',
      '```',
    ].join('\n');
    const gates = parseGates(md);
    assert.ok(gates['review-plan']);
  });

  test('list values tolerate extra whitespace', () => {
    const md = [
      '```gates phase=plan',
      'require task.status in [  a,b ,  c]',
      '```',
    ].join('\n');
    const gates = parseGates(md);
    assert.deepEqual(gates.plan.require[0].value, ['a', 'b', 'c']);
  });

  test('unterminated fence throws', () => {
    const md = [
      '```gates phase=plan',
      'forbid task.status == completed',
      '',
    ].join('\n');
    assert.throws(() => parseGates(md), /unterminated/i);
  });
});

describe('parse-gates.cjs :: parseOutputs()', () => {
  test('valid grammar: artifact directive', () => {
    const md = [
      '```outputs phase=implement',
      'artifact engineering/sprints/{sprint}/{task}/PROGRESS.md',
      '```',
    ].join('\n');
    const outputs = parseOutputs(md);
    assert.ok(outputs.implement, 'expected implement block');
    assert.deepEqual(outputs.implement.artifacts, [
      { path: 'engineering/sprints/{sprint}/{task}/PROGRESS.md', minBytes: 0 },
    ]);
  });

  test('valid grammar: artifact with min=', () => {
    const md = [
      '```outputs phase=plan',
      'artifact engineering/sprints/{sprint}/{task}/PLAN.md min=200',
      '```',
    ].join('\n');
    const outputs = parseOutputs(md);
    assert.deepEqual(outputs.plan.artifacts, [
      { path: 'engineering/sprints/{sprint}/{task}/PLAN.md', minBytes: 200 },
    ]);
  });

  test('valid grammar: require directive (== op)', () => {
    const md = [
      '```outputs phase=implement',
      'require summaries.implementation.verdict == n/a',
      '```',
    ].join('\n');
    const outputs = parseOutputs(md);
    assert.deepEqual(outputs.implement.require, [
      { field: 'summaries.implementation.verdict', op: '==', value: 'n/a' },
    ]);
  });

  test('unknown directive throws', () => {
    const md = [
      '```outputs phase=plan',
      'destroy /tmp',
      '```',
    ].join('\n');
    assert.throws(() => parseOutputs(md), /line.*destroy|destroy.*line/i);
  });

  test('blank lines and # comments are ignored', () => {
    const md = [
      '```outputs phase=plan',
      '',
      '# this is a comment',
      '   # indented comment',
      '```',
    ].join('\n');
    const outputs = parseOutputs(md);
    assert.ok(outputs.plan, 'expected plan block');
    assert.equal(outputs.plan.artifacts.length, 0);
    assert.equal(outputs.plan.require.length, 0);
  });

  test('duplicate phase block throws', () => {
    const md = [
      '```outputs phase=plan',
      'artifact foo.md',
      '```',
      '```outputs phase=plan',
      'artifact bar.md',
      '```',
    ].join('\n');
    assert.throws(() => parseOutputs(md), /duplicate.*plan/i);
  });

  test('unterminated fence throws', () => {
    const md = [
      '```outputs phase=plan',
      'artifact foo.md',
      '',
    ].join('\n');
    assert.throws(() => parseOutputs(md), /unterminated/i);
  });
});
