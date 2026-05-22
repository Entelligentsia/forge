'use strict';
// FORGE-S24-T04 — cross-task replay scoring (recurrence boost).
//
// Iron Law 2: this test is written BEFORE replay-scoring.cjs lands.
//
// Contract under test (per TASK_PROMPT.md acceptance criteria):
//   1. computeRecurrence({ events, subkind, skillId, fromTaskId, taskOrder })
//      returns { recurrence_count, recurrence_task_ids } where:
//        - recurrence_count is the number of distinct taskIds in taskOrder
//          (origin + later tasks) that contain a friction event matching the
//          same (subkind, evidence.skillId) pair.
//        - recurrence_task_ids is the de-duplicated, taskOrder-sorted list
//          of those taskIds.
//        - recurrence_count is always >= 1 (origin task counts).
//   2. annotateProposals(proposals, frictionEvents, taskOrder) stamps
//      recurrence_count + recurrence_task_ids onto each proposal whose
//      sourceFrictionIds resolves to a friction event with subkind +
//      evidence.skillId. Proposals without resolvable provenance receive
//      recurrence_count: 1 and recurrence_task_ids: [originTaskId] when
//      originTaskId is known, otherwise the proposal is left unchanged
//      apart from a neutral recurrence_count: 1.
//   3. Tasks t+1..N only — earlier tasks (before fromTaskId in taskOrder)
//      are NOT counted, even if they have a matching subkind+skillId. The
//      "replay" direction is forward in the sprint.
//   4. Different skillId or different subkind on the same task is NOT a
//      match.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { computeRecurrence, annotateProposals } =
  require('../replay-scoring.cjs');

function frictionEvent({ taskId, subkind, skillId, eventId }) {
  return {
    eventId: eventId || `evt_${taskId}_${subkind}_${skillId}`,
    type: 'friction',
    taskId,
    subkind,
    workflow: 'implement',
    persona:  'engineer',
    issue:    subkind,
    evidence: skillId ? { skillId } : {},
  };
}

describe('FORGE-S24-T04 — replay-scoring', () => {
  describe('computeRecurrence', () => {
    test('AC3: 3 recurrent frictions in tasks t, t+1, t+2 -> recurrence_count: 3', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer' }),
        frictionEvent({ taskId: 'S24-T02', subkind: 'skill_unused', skillId: 'engineer' }),
        frictionEvent({ taskId: 'S24-T03', subkind: 'skill_unused', skillId: 'engineer' }),
      ];
      const result = computeRecurrence({
        events,
        subkind:    'skill_unused',
        skillId:    'engineer',
        fromTaskId: 'S24-T01',
        taskOrder:  ['S24-T01', 'S24-T02', 'S24-T03'],
      });
      assert.equal(result.recurrence_count, 3);
      assert.deepEqual(result.recurrence_task_ids, ['S24-T01', 'S24-T02', 'S24-T03']);
    });

    test('single-task friction yields recurrence_count: 1', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer' }),
      ];
      const result = computeRecurrence({
        events,
        subkind:    'skill_unused',
        skillId:    'engineer',
        fromTaskId: 'S24-T01',
        taskOrder:  ['S24-T01', 'S24-T02', 'S24-T03'],
      });
      assert.equal(result.recurrence_count, 1);
      assert.deepEqual(result.recurrence_task_ids, ['S24-T01']);
    });

    test('earlier-task frictions (before fromTaskId) are NOT counted', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer' }),
        frictionEvent({ taskId: 'S24-T02', subkind: 'skill_unused', skillId: 'engineer' }),
        frictionEvent({ taskId: 'S24-T03', subkind: 'skill_unused', skillId: 'engineer' }),
      ];
      const result = computeRecurrence({
        events,
        subkind:    'skill_unused',
        skillId:    'engineer',
        fromTaskId: 'S24-T02',
        taskOrder:  ['S24-T01', 'S24-T02', 'S24-T03'],
      });
      assert.equal(result.recurrence_count, 2, 'origin (T02) + later (T03), T01 excluded');
      assert.deepEqual(result.recurrence_task_ids, ['S24-T02', 'S24-T03']);
    });

    test('different subkind on later task does NOT match', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer' }),
        frictionEvent({ taskId: 'S24-T02', subkind: 'skill_stale',  skillId: 'engineer' }),
      ];
      const result = computeRecurrence({
        events,
        subkind:    'skill_unused',
        skillId:    'engineer',
        fromTaskId: 'S24-T01',
        taskOrder:  ['S24-T01', 'S24-T02'],
      });
      assert.equal(result.recurrence_count, 1);
      assert.deepEqual(result.recurrence_task_ids, ['S24-T01']);
    });

    test('different skillId on later task does NOT match', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer' }),
        frictionEvent({ taskId: 'S24-T02', subkind: 'skill_unused', skillId: 'architect' }),
      ];
      const result = computeRecurrence({
        events,
        subkind:    'skill_unused',
        skillId:    'engineer',
        fromTaskId: 'S24-T01',
        taskOrder:  ['S24-T01', 'S24-T02'],
      });
      assert.equal(result.recurrence_count, 1);
      assert.deepEqual(result.recurrence_task_ids, ['S24-T01']);
    });

    test('duplicate friction events on same task collapse to one taskId', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer', eventId: 'a' }),
        frictionEvent({ taskId: 'S24-T02', subkind: 'skill_unused', skillId: 'engineer', eventId: 'b' }),
        frictionEvent({ taskId: 'S24-T02', subkind: 'skill_unused', skillId: 'engineer', eventId: 'c' }),
      ];
      const result = computeRecurrence({
        events,
        subkind:    'skill_unused',
        skillId:    'engineer',
        fromTaskId: 'S24-T01',
        taskOrder:  ['S24-T01', 'S24-T02'],
      });
      assert.equal(result.recurrence_count, 2);
      assert.deepEqual(result.recurrence_task_ids, ['S24-T01', 'S24-T02']);
    });

    test('fromTaskId outside taskOrder yields recurrence_count: 1 (no scan possible)', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T99', subkind: 'skill_unused', skillId: 'engineer' }),
      ];
      const result = computeRecurrence({
        events,
        subkind:    'skill_unused',
        skillId:    'engineer',
        fromTaskId: 'S24-T99',
        taskOrder:  ['S24-T01', 'S24-T02'],
      });
      assert.equal(result.recurrence_count, 1);
      assert.deepEqual(result.recurrence_task_ids, ['S24-T99']);
    });

    test('events without evidence.skillId are ignored', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer' }),
        { type: 'friction', taskId: 'S24-T02', subkind: 'skill_unused', evidence: {} },
      ];
      const result = computeRecurrence({
        events,
        subkind:    'skill_unused',
        skillId:    'engineer',
        fromTaskId: 'S24-T01',
        taskOrder:  ['S24-T01', 'S24-T02'],
      });
      assert.equal(result.recurrence_count, 1);
      assert.deepEqual(result.recurrence_task_ids, ['S24-T01']);
    });
  });

  describe('annotateProposals', () => {
    test('AC1+AC3: each proposal carries recurrence_count >= 1 and recurrence_task_ids', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer', eventId: 'evt_1' }),
        frictionEvent({ taskId: 'S24-T02', subkind: 'skill_unused', skillId: 'engineer', eventId: 'evt_2' }),
        frictionEvent({ taskId: 'S24-T03', subkind: 'skill_unused', skillId: 'engineer', eventId: 'evt_3' }),
      ];
      const proposals = [
        {
          op:                'update_skill',
          target_path:       'forge/skills/engineer-skills.md',
          diff_body:         '+ guidance',
          sourceFrictionIds: ['evt_1'],
        },
      ];
      const annotated = annotateProposals(proposals, events, ['S24-T01', 'S24-T02', 'S24-T03']);
      assert.equal(annotated.length, 1);
      assert.equal(annotated[0].recurrence_count, 3);
      assert.deepEqual(annotated[0].recurrence_task_ids, ['S24-T01', 'S24-T02', 'S24-T03']);
      // Original fields preserved.
      assert.equal(annotated[0].op,          'update_skill');
      assert.equal(annotated[0].target_path, 'forge/skills/engineer-skills.md');
    });

    test('proposal without resolvable sourceFrictionIds gets recurrence_count: 1', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer', eventId: 'evt_1' }),
      ];
      const proposals = [
        {
          op:                'insert_skill',
          target_path:       'forge/skills/engineer-skills.md',
          diff_body:         '+ new',
          sourceFrictionIds: ['unknown_evt'],
        },
      ];
      const annotated = annotateProposals(proposals, events, ['S24-T01']);
      assert.equal(annotated[0].recurrence_count, 1);
      assert.deepEqual(annotated[0].recurrence_task_ids, []);
    });

    test('proposal is not mutated in place — annotateProposals returns new objects', () => {
      const events = [
        frictionEvent({ taskId: 'S24-T01', subkind: 'skill_unused', skillId: 'engineer', eventId: 'evt_1' }),
      ];
      const proposal = {
        op:                'insert_skill',
        target_path:       'forge/skills/engineer-skills.md',
        diff_body:         '+ new',
        sourceFrictionIds: ['evt_1'],
      };
      const proposals = [proposal];
      const annotated = annotateProposals(proposals, events, ['S24-T01']);
      assert.equal('recurrence_count' in proposal, false, 'input proposal must not be mutated');
      assert.equal(annotated[0].recurrence_count, 1);
    });
  });
});
