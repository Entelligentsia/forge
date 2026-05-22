'use strict';
// FORGE-S24-T03 — LLM-judge step in Phase 2 (Sonnet rubric, drop <3/5).
//
// Iron Law 2: this test is written BEFORE judge-proposal.cjs lands.
//
// Contract under test (per TASK_PROMPT.md acceptance criteria):
//   1. Rubric has 5 axes (0..5 each):
//        specificity, when_not_to_use, no_trajectory_copy_paste,
//        body_under_2kb, cites_friction
//   2. scoreProposal(proposal) returns { axes: {<axis>: <0..5>}, average, notes? }
//      using deterministic heuristics — this is the fallback / validation
//      scorer the workflow uses when Sonnet is unavailable, and the contract
//      against which Sonnet-produced scores are validated.
//   3. decideJudgement({ axes }) returns { verdict, average, axes, reason }
//      with verdict === 'drop' iff average < 3, else 'keep'.
//   4. AC6 (failing test first): a fixture proposal whose average score is
//      2.8/5 returns verdict 'drop' with a reason naming the average.
//   5. AC4: synthetic 5/5 and 1/5 fixtures exercise keep + drop paths.
//   6. decideJudgement rejects out-of-range or missing axes (fail loud).

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  RUBRIC_AXES,
  scoreProposal,
  decideJudgement,
} = require('../judge-proposal.cjs');

// --- Synthetic fixtures ---------------------------------------------------

// 5/5 proposal: specific skill path, includes "When NOT to use", small body,
// cites multiple friction events with recurrence across tasks.
const FIXTURE_5_5 = {
  proposalId:        'p-5',
  op:                'insert_skill',
  target_path:       'forge/skills/auth-token-rotation.md',
  diff_body:
    '# auth-token-rotation\n\n' +
    'Rotate the OIDC refresh token before invoking the billing API.\n\n' +
    '## When to use\n- Calls to /billing/* with stale refresh token.\n\n' +
    '## When NOT to use\n- Read-only endpoints or anonymous calls.\n',
  rationale:           'Recurring auth-rotation friction across 3 tasks.',
  sourceFrictionIds:   ['frx-1', 'frx-2', 'frx-3'],
  recurrence_count:    3,
  recurrence_task_ids: ['S24-T07', 'S24-T08', 'S24-T09'],
};

// 1/5 proposal: generic title, missing "When NOT to use", giant pasted
// trajectory, no friction citation, >2KB body.
const FIXTURE_1_5 = {
  proposalId:        'p-1',
  op:                'insert_skill',
  target_path:       'forge/skills/misc-tips.md',
  diff_body:
    '# tips\n\n' + 'paste from trajectory log:\n' +
    'x'.repeat(2200),                          // > 2KB AND huge run = trajectory copy-paste
  rationale:           '',
  sourceFrictionIds:   [],
  recurrence_count:    1,
  recurrence_task_ids: [],
};

// 2.8/5 proposal: deliberately tuned to average just under threshold for AC6.
// Axes: specificity=3, when_not_to_use=0, no_trajectory_copy_paste=5,
// body_under_2kb=5, cites_friction=1  -> sum=14, avg=2.8 -> drop.
const FIXTURE_2_8 = {
  proposalId:        'p-28',
  op:                'insert_skill',
  target_path:       'forge/skills/cache-invalidation.md',
  diff_body:
    '# cache invalidation\n\n' +
    'Use the cache-control header to expire entries when the upstream changes.\n' +
    'No "When NOT" guidance provided here.\n',
  rationale:           'thin.',
  sourceFrictionIds:   ['frx-only-one'],
  recurrence_count:    1,
  recurrence_task_ids: [],
};

describe('FORGE-S24-T03 — judge-proposal', () => {

  describe('RUBRIC_AXES', () => {
    test('exposes exactly the five named axes', () => {
      assert.deepEqual(
        [...RUBRIC_AXES].sort(),
        [
          'body_under_2kb',
          'cites_friction',
          'no_trajectory_copy_paste',
          'specificity',
          'when_not_to_use',
        ],
      );
    });
  });

  describe('scoreProposal', () => {
    test('AC4 keep path: 5/5 fixture scores high (avg >= 4)', () => {
      const { axes, average } = scoreProposal(FIXTURE_5_5);
      assert.ok(average >= 4, `expected avg >= 4, got ${average}`);
      assert.equal(axes.when_not_to_use, 5);
      assert.equal(axes.body_under_2kb, 5);
      assert.ok(axes.cites_friction >= 4);
    });

    test('AC4 drop path: 1/5 fixture scores low (avg < 2)', () => {
      const { axes, average } = scoreProposal(FIXTURE_1_5);
      assert.ok(average < 2, `expected avg < 2, got ${average}`);
      assert.equal(axes.body_under_2kb, 0);
      assert.equal(axes.cites_friction, 0);
      assert.equal(axes.when_not_to_use, 0);
    });

    test('body_under_2kb: exact 2KB body scores 5; over-2KB scores 0', () => {
      const at2k = { ...FIXTURE_5_5, diff_body: 'a'.repeat(2048) };
      const over = { ...FIXTURE_5_5, diff_body: 'a'.repeat(2049) };
      assert.equal(scoreProposal(at2k).axes.body_under_2kb, 5);
      assert.equal(scoreProposal(over).axes.body_under_2kb, 0);
    });

    test('cites_friction: zero sourceFrictionIds scores 0', () => {
      const p = { ...FIXTURE_5_5, sourceFrictionIds: [], recurrence_count: 1, recurrence_task_ids: [] };
      assert.equal(scoreProposal(p).axes.cites_friction, 0);
    });

    test('when_not_to_use: phrase absent scores 0, present scores 5', () => {
      const without = { ...FIXTURE_5_5, diff_body: '# x\nno guard phrase here' };
      const with_   = { ...FIXTURE_5_5, diff_body: '# x\n## When NOT to use\n- never' };
      assert.equal(scoreProposal(without).axes.when_not_to_use, 0);
      assert.equal(scoreProposal(with_).axes.when_not_to_use, 5);
    });

    test('AC6 — average 2.8/5 fixture scores below the drop threshold', () => {
      const { average } = scoreProposal(FIXTURE_2_8);
      assert.ok(average < 3, `expected avg < 3, got ${average}`);
    });
  });

  describe('decideJudgement', () => {
    test('AC6 — 2.8/5 fixture is dropped with a reason naming the average', () => {
      const scored = scoreProposal(FIXTURE_2_8);
      const decision = decideJudgement(scored);
      assert.equal(decision.verdict, 'drop');
      assert.ok(decision.reason.includes('2.8') || /average\s*[=:]\s*2\.8/.test(decision.reason),
        `reason should mention the average; got: ${decision.reason}`);
      assert.equal(decision.average, scored.average);
      assert.deepEqual(decision.axes, scored.axes);
    });

    test('AC4 keep path: 5/5 fixture is kept', () => {
      const scored = scoreProposal(FIXTURE_5_5);
      const decision = decideJudgement(scored);
      assert.equal(decision.verdict, 'keep');
    });

    test('AC4 drop path: 1/5 fixture is dropped', () => {
      const scored = scoreProposal(FIXTURE_1_5);
      const decision = decideJudgement(scored);
      assert.equal(decision.verdict, 'drop');
    });

    test('boundary: average exactly 3 keeps (drop iff strictly < 3)', () => {
      const axes = {
        specificity:              3,
        when_not_to_use:          3,
        no_trajectory_copy_paste: 3,
        body_under_2kb:           3,
        cites_friction:           3,
      };
      const decision = decideJudgement({ axes });
      assert.equal(decision.verdict, 'keep');
      assert.equal(decision.average, 3);
    });

    test('fail loud: missing axis throws', () => {
      assert.throws(
        () => decideJudgement({ axes: { specificity: 4 } }),
        /missing axis/i,
      );
    });

    test('fail loud: out-of-range axis throws', () => {
      const axes = {
        specificity: 6, when_not_to_use: 3, no_trajectory_copy_paste: 3,
        body_under_2kb: 3, cites_friction: 3,
      };
      assert.throws(
        () => decideJudgement({ axes }),
        /out of range/i,
      );
    });
  });
});
