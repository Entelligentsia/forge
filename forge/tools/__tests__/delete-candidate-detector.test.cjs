'use strict';
// FORGE-S24-T05 — delete-candidate detection (3-sprint zero-use).
//
// Iron Law 2: this test is written BEFORE delete-candidate-detector.cjs lands.
//
// Contract under test (per TASK_PROMPT.md acceptance criteria):
//   1. scanZeroUse({ events, sprintOrder, windowSize }) returns an array of
//      { skillId, observedSprintIds } records, one per skill that has at
//      least one skill_usage event in the trailing `windowSize` sprints of
//      `sprintOrder` AND whose every observation in the window has
//      retrieved === false AND used === false.
//   2. buildDeleteProposals({ events, sprintOrder, windowSize, targetPathFor })
//      returns delete_skill proposals (one per qualifying skill) with shape
//      { op: 'delete_skill', target_path, diff_body, rationale,
//        sourceFrictionIds: [], window_size, window_sprint_ids,
//        recurrence_count: 1, recurrence_task_ids: [] }.
//      target_path is resolved via the supplied targetPathFor(skillId) callback.
//   3. windowSize defaults to 3.
//   4. A skill with retrieved: true in ANY observation in the window does NOT
//      qualify.
//   5. A skill with used: true in ANY observation in the window does NOT
//      qualify.
//   6. A skill never observed inside the window is NOT proposed for deletion
//      (we only delete what we've seen go cold; never-observed skills are
//      indistinguishable from never-loaded new skills).
//   7. The window is the TRAILING N sprints of sprintOrder. Events in sprints
//      outside the window are ignored.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { scanZeroUse, buildDeleteProposals } =
  require('../delete-candidate-detector.cjs');

function usage({ sprintId, skillId, retrieved = false, used = false, taskId, eventId }) {
  return {
    eventId: eventId || `evt_${sprintId}_${skillId}_${retrieved}_${used}`,
    type:    'skill_usage',
    sprintId,
    taskId:  taskId || `${sprintId}-T01`,
    skillId,
    retrieved,
    used,
    tool_call_success_rate: 1.0,
    retrieval_score:        retrieved ? 0.8 : 0.0,
  };
}

describe('FORGE-S24-T05 — delete-candidate-detector', () => {

  describe('scanZeroUse', () => {
    test('AC: zero retrieval + zero invocation across 3 trailing sprints qualifies', () => {
      const events = [
        usage({ sprintId: 'S22', skillId: 'cold-skill' }),
        usage({ sprintId: 'S23', skillId: 'cold-skill' }),
        usage({ sprintId: 'S24', skillId: 'cold-skill' }),
      ];
      const result = scanZeroUse({
        events,
        sprintOrder: ['S22', 'S23', 'S24'],
        windowSize:  3,
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].skillId, 'cold-skill');
      assert.deepEqual(result[0].observedSprintIds, ['S22', 'S23', 'S24']);
    });

    test('AC: retrieved=true in ANY in-window sprint disqualifies', () => {
      const events = [
        usage({ sprintId: 'S22', skillId: 'warm-skill' }),
        usage({ sprintId: 'S23', skillId: 'warm-skill', retrieved: true }),
        usage({ sprintId: 'S24', skillId: 'warm-skill' }),
      ];
      const result = scanZeroUse({
        events,
        sprintOrder: ['S22', 'S23', 'S24'],
        windowSize:  3,
      });
      assert.equal(result.length, 0);
    });

    test('AC: used=true in ANY in-window sprint disqualifies', () => {
      const events = [
        usage({ sprintId: 'S22', skillId: 'invoked-skill' }),
        usage({ sprintId: 'S23', skillId: 'invoked-skill' }),
        usage({ sprintId: 'S24', skillId: 'invoked-skill', used: true }),
      ];
      const result = scanZeroUse({
        events,
        sprintOrder: ['S22', 'S23', 'S24'],
        windowSize:  3,
      });
      assert.equal(result.length, 0);
    });

    test('window is trailing N: history sprint with usage does NOT save a cold skill', () => {
      const events = [
        usage({ sprintId: 'S20', skillId: 'cold-skill', used: true }),
        usage({ sprintId: 'S22', skillId: 'cold-skill' }),
        usage({ sprintId: 'S23', skillId: 'cold-skill' }),
        usage({ sprintId: 'S24', skillId: 'cold-skill' }),
      ];
      const result = scanZeroUse({
        events,
        sprintOrder: ['S20', 'S22', 'S23', 'S24'],
        windowSize:  3,
      });
      assert.equal(result.length, 1, 'S20 usage is outside the trailing window');
      assert.equal(result[0].skillId, 'cold-skill');
      assert.deepEqual(result[0].observedSprintIds, ['S22', 'S23', 'S24']);
    });

    test('windowSize defaults to 3 when omitted', () => {
      const events = [
        usage({ sprintId: 'S22', skillId: 'cold-skill' }),
        usage({ sprintId: 'S23', skillId: 'cold-skill' }),
        usage({ sprintId: 'S24', skillId: 'cold-skill' }),
      ];
      const result = scanZeroUse({
        events,
        sprintOrder: ['S22', 'S23', 'S24'],
      });
      assert.equal(result.length, 1);
    });

    test('windowSize is configurable', () => {
      const events = [
        usage({ sprintId: 'S23', skillId: 'cold-skill' }),
        usage({ sprintId: 'S24', skillId: 'cold-skill' }),
      ];
      const result = scanZeroUse({
        events,
        sprintOrder: ['S22', 'S23', 'S24'],
        windowSize:  2,
      });
      assert.equal(result.length, 1);
      assert.deepEqual(result[0].observedSprintIds, ['S23', 'S24']);
    });

    test('skill never observed inside the window is NOT proposed', () => {
      const events = [
        usage({ sprintId: 'S20', skillId: 'never-seen', used: true }),
      ];
      const result = scanZeroUse({
        events,
        sprintOrder: ['S20', 'S22', 'S23', 'S24'],
        windowSize:  3,
      });
      assert.equal(result.length, 0,
        'no observations in trailing window — cannot tell unused-and-dead from never-loaded');
    });

    test('empty events → []', () => {
      assert.deepEqual(
        scanZeroUse({ events: [], sprintOrder: ['S24'], windowSize: 3 }),
        [],
      );
    });

    test('non-skill_usage events are ignored', () => {
      const events = [
        { type: 'friction', sprintId: 'S24', subkind: 'skill_unused' },
        usage({ sprintId: 'S24', skillId: 'cold-skill' }),
        usage({ sprintId: 'S23', skillId: 'cold-skill' }),
        usage({ sprintId: 'S22', skillId: 'cold-skill' }),
      ];
      const result = scanZeroUse({
        events,
        sprintOrder: ['S22', 'S23', 'S24'],
        windowSize:  3,
      });
      assert.equal(result.length, 1);
    });

    test('shorter-than-window sprintOrder uses what is available (carry-over case)', () => {
      // Carry-over caveat: when fewer than `windowSize` sprints have been
      // observed, the function still runs on the available sprints. The
      // workflow documents that results are only meaningful once N sprints
      // have actually elapsed post-T01.
      const events = [
        usage({ sprintId: 'S24', skillId: 'cold-skill' }),
      ];
      const result = scanZeroUse({
        events,
        sprintOrder: ['S24'],
        windowSize:  3,
      });
      assert.equal(result.length, 1);
      assert.deepEqual(result[0].observedSprintIds, ['S24']);
    });

    test('input arrays are not mutated', () => {
      const events = [usage({ sprintId: 'S24', skillId: 'cold-skill' })];
      const sprintOrder = ['S24'];
      const eventsCopy = JSON.parse(JSON.stringify(events));
      const sprintOrderCopy = sprintOrder.slice();
      scanZeroUse({ events, sprintOrder, windowSize: 3 });
      assert.deepEqual(events, eventsCopy);
      assert.deepEqual(sprintOrder, sprintOrderCopy);
    });
  });

  describe('buildDeleteProposals', () => {
    test('AC: builds one delete_skill proposal per qualifying skill', () => {
      const events = [
        usage({ sprintId: 'S22', skillId: 'cold-skill' }),
        usage({ sprintId: 'S23', skillId: 'cold-skill' }),
        usage({ sprintId: 'S24', skillId: 'cold-skill' }),
      ];
      const proposals = buildDeleteProposals({
        events,
        sprintOrder: ['S22', 'S23', 'S24'],
        windowSize:  3,
        targetPathFor: (skillId) => `forge/skills/${skillId}.md`,
      });
      assert.equal(proposals.length, 1);
      const p = proposals[0];
      assert.equal(p.op, 'delete_skill');
      assert.equal(p.target_path, 'forge/skills/cold-skill.md');
      assert.ok(typeof p.diff_body === 'string' && p.diff_body.length > 0);
      assert.ok(typeof p.rationale === 'string' && p.rationale.includes('cold-skill'));
      assert.deepEqual(p.sourceFrictionIds, []);
      assert.equal(p.window_size, 3);
      assert.deepEqual(p.window_sprint_ids, ['S22', 'S23', 'S24']);
      assert.equal(p.recurrence_count, 1);
      assert.deepEqual(p.recurrence_task_ids, []);
    });

    test('AC: retrieved=1 anywhere in window produces NO proposal', () => {
      const events = [
        usage({ sprintId: 'S22', skillId: 'warm-skill' }),
        usage({ sprintId: 'S23', skillId: 'warm-skill', retrieved: true }),
        usage({ sprintId: 'S24', skillId: 'warm-skill' }),
      ];
      const proposals = buildDeleteProposals({
        events,
        sprintOrder: ['S22', 'S23', 'S24'],
        windowSize:  3,
        targetPathFor: (skillId) => `forge/skills/${skillId}.md`,
      });
      assert.equal(proposals.length, 0);
    });

    test('windowSize defaults to 3', () => {
      const events = [
        usage({ sprintId: 'S22', skillId: 'cold-skill' }),
        usage({ sprintId: 'S23', skillId: 'cold-skill' }),
        usage({ sprintId: 'S24', skillId: 'cold-skill' }),
      ];
      const proposals = buildDeleteProposals({
        events,
        sprintOrder:   ['S22', 'S23', 'S24'],
        targetPathFor: (skillId) => `forge/skills/${skillId}.md`,
      });
      assert.equal(proposals.length, 1);
      assert.equal(proposals[0].window_size, 3);
    });

    test('throws if targetPathFor is not a function', () => {
      assert.throws(
        () => buildDeleteProposals({
          events:      [],
          sprintOrder: ['S24'],
          windowSize:  3,
          targetPathFor: 'not-a-function',
        }),
        /targetPathFor must be a function/,
      );
    });

    test('multiple cold skills yield multiple proposals', () => {
      const events = [
        usage({ sprintId: 'S22', skillId: 'cold-a' }),
        usage({ sprintId: 'S23', skillId: 'cold-a' }),
        usage({ sprintId: 'S24', skillId: 'cold-a' }),
        usage({ sprintId: 'S22', skillId: 'cold-b' }),
        usage({ sprintId: 'S23', skillId: 'cold-b' }),
        usage({ sprintId: 'S24', skillId: 'cold-b' }),
      ];
      const proposals = buildDeleteProposals({
        events,
        sprintOrder: ['S22', 'S23', 'S24'],
        windowSize:  3,
        targetPathFor: (skillId) => `forge/skills/${skillId}.md`,
      });
      assert.equal(proposals.length, 2);
      const ids = proposals.map(p => p.target_path).sort();
      assert.deepEqual(ids, [
        'forge/skills/cold-a.md',
        'forge/skills/cold-b.md',
      ]);
    });
  });
});
