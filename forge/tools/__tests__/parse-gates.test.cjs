'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseGates } = require('../parse-gates.cjs');

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

  test('after directive requires approved|revision verdict', () => {
    const md = [
      '```gates phase=implement',
      'after review-plan = maybe',
      '```',
    ].join('\n');
    assert.throws(() => parseGates(md), /verdict/i);
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
