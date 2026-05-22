'use strict';
// FORGE-S24-T06 — compression gate (reject >20% growth without 3+ frictions).
//
// Iron Law 2: this test is written BEFORE compression-gate.cjs lands.
//
// Contract under test (per TASK_PROMPT.md acceptance criteria):
//   1. Synthetic update_skill proposal with >20% byte growth AND 0 supporting
//      frictions is REJECTED, with a structured reason.
//   2. The same update_skill proposal with >= 3 supporting frictions is
//      ADMITTED (passes the gate).
//   3. Growth is measured byte-wise (Buffer.byteLength UTF-8) on the rendered
//      diff applied to the current target file — i.e., on the NEW body that
//      would land if the proposal were applied.
//   4. Non-update ops (insert_skill, delete_skill) pass through unconditionally
//      — the gate only constrains growth of an existing skill body.
//   5. Growth exactly at 20% (newBytes === currentBytes * 1.20) ADMITS;
//      ">20%" is strict.
//   6. filterProposals partitions an input array into { admitted, rejected }
//      preserving order, and each rejected entry carries the structured
//      reason returned by evaluateProposal.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateGrowth,
  evaluateProposal,
  filterProposals,
  GROWTH_THRESHOLD,
  MIN_SUPPORTING_FRICTIONS,
} = require('../compression-gate.cjs');

const SKILL_PATH = 'forge/skills/engineer-skills.md';

// 100-byte body baseline. >20% growth = >120 bytes.
const BODY_100 = 'x'.repeat(100);
const BODY_121 = 'x'.repeat(121); // 21% growth — over the threshold
const BODY_120 = 'x'.repeat(120); // exactly 20% growth — at the threshold
const BODY_110 = 'x'.repeat(110); // 10% growth — under the threshold

function updateProposal({ frictionCount = 0, target = SKILL_PATH } = {}) {
  return {
    op:          'update_skill',
    target_path: target,
    diff_body:   '+ some added guidance',
    rationale:   'test',
    sourceFrictionIds: Array.from({ length: frictionCount }, (_, i) => `f-${i}`),
  };
}

describe('FORGE-S24-T06 — compression-gate', () => {

  describe('constants', () => {
    test('GROWTH_THRESHOLD is exactly 0.20', () => {
      assert.equal(GROWTH_THRESHOLD, 0.20);
    });

    test('MIN_SUPPORTING_FRICTIONS is exactly 3', () => {
      assert.equal(MIN_SUPPORTING_FRICTIONS, 3);
    });
  });

  describe('evaluateGrowth', () => {
    test('returns currentBytes, newBytes, growthRatio', () => {
      const r = evaluateGrowth({ currentBody: BODY_100, newBody: BODY_121 });
      assert.equal(r.currentBytes, 100);
      assert.equal(r.newBytes,     121);
      assert.ok(Math.abs(r.growthRatio - 0.21) < 1e-9);
    });

    test('measures bytes via Buffer.byteLength (UTF-8 multibyte safe)', () => {
      // "ö" is 2 bytes in UTF-8. 50 ö = 100 bytes.
      const ascii  = 'x'.repeat(100);              // 100 bytes
      const multi  = 'ö'.repeat(61);               // 122 bytes (>20% growth)
      const r = evaluateGrowth({ currentBody: ascii, newBody: multi });
      assert.equal(r.currentBytes, 100);
      assert.equal(r.newBytes,     122);
    });

    test('current body of zero bytes yields growthRatio Infinity (handled by caller)', () => {
      const r = evaluateGrowth({ currentBody: '', newBody: BODY_121 });
      assert.equal(r.currentBytes, 0);
      assert.equal(r.newBytes,     121);
      assert.equal(r.growthRatio,  Infinity);
    });
  });

  describe('evaluateProposal — update_skill', () => {
    test('AC1: >20% growth + 0 frictions → REJECTED', () => {
      const r = evaluateProposal({
        proposal:                   updateProposal({ frictionCount: 0 }),
        currentBody:                BODY_100,
        newBody:                    BODY_121,
        supportingFrictionCount:    0,
      });
      assert.equal(r.admit, false);
      assert.equal(r.reason, 'compression_gate_growth_unsupported');
      assert.ok(Math.abs(r.growthRatio - 0.21) < 1e-9);
      assert.equal(r.supportingFrictionCount, 0);
      assert.equal(r.threshold, 0.20);
      assert.equal(r.minSupportingFrictions, 3);
    });

    test('AC2: >20% growth + 3 frictions → ADMITTED', () => {
      const r = evaluateProposal({
        proposal:                   updateProposal({ frictionCount: 3 }),
        currentBody:                BODY_100,
        newBody:                    BODY_121,
        supportingFrictionCount:    3,
      });
      assert.equal(r.admit, true);
      assert.equal(r.reason, 'admitted_with_friction_support');
    });

    test('AC2 strictness: 2 frictions is NOT enough', () => {
      const r = evaluateProposal({
        proposal:                   updateProposal({ frictionCount: 2 }),
        currentBody:                BODY_100,
        newBody:                    BODY_121,
        supportingFrictionCount:    2,
      });
      assert.equal(r.admit, false);
      assert.equal(r.reason, 'compression_gate_growth_unsupported');
    });

    test('AC5: growth exactly at threshold (20%) admits — strict ">20%"', () => {
      const r = evaluateProposal({
        proposal:                   updateProposal({ frictionCount: 0 }),
        currentBody:                BODY_100,
        newBody:                    BODY_120,
        supportingFrictionCount:    0,
      });
      assert.equal(r.admit, true);
      assert.equal(r.reason, 'admitted_below_threshold');
    });

    test('growth under threshold (10%) admits regardless of friction count', () => {
      const r = evaluateProposal({
        proposal:                   updateProposal({ frictionCount: 0 }),
        currentBody:                BODY_100,
        newBody:                    BODY_110,
        supportingFrictionCount:    0,
      });
      assert.equal(r.admit, true);
      assert.equal(r.reason, 'admitted_below_threshold');
    });

    test('supportingFrictionCount defaults to proposal.sourceFrictionIds.length when omitted', () => {
      const r = evaluateProposal({
        proposal:    updateProposal({ frictionCount: 3 }),
        currentBody: BODY_100,
        newBody:     BODY_121,
        // supportingFrictionCount intentionally omitted
      });
      assert.equal(r.admit, true);
      assert.equal(r.supportingFrictionCount, 3);
    });

    test('shrink (negative growth) admits unconditionally', () => {
      const r = evaluateProposal({
        proposal:                   updateProposal({ frictionCount: 0 }),
        currentBody:                BODY_121,
        newBody:                    BODY_100,
        supportingFrictionCount:    0,
      });
      assert.equal(r.admit, true);
      assert.equal(r.reason, 'admitted_below_threshold');
      assert.ok(r.growthRatio < 0);
    });
  });

  describe('evaluateProposal — non-update ops pass through (AC4)', () => {
    test('insert_skill admits regardless of growth / friction', () => {
      const r = evaluateProposal({
        proposal: {
          op:          'insert_skill',
          target_path: 'forge/skills/new-skill.md',
          diff_body:   BODY_121,
          sourceFrictionIds: [],
        },
        currentBody:             '',
        newBody:                 BODY_121,
        supportingFrictionCount: 0,
      });
      assert.equal(r.admit, true);
      assert.equal(r.reason, 'op_not_gated');
    });

    test('delete_skill admits regardless of friction (delete shrinks to 0)', () => {
      const r = evaluateProposal({
        proposal: {
          op:          'delete_skill',
          target_path: SKILL_PATH,
          diff_body:   '',
          sourceFrictionIds: [],
        },
        currentBody:             BODY_121,
        newBody:                 '',
        supportingFrictionCount: 0,
      });
      assert.equal(r.admit, true);
      assert.equal(r.reason, 'op_not_gated');
    });
  });

  describe('evaluateProposal — input validation', () => {
    test('throws if proposal is missing', () => {
      assert.throws(
        () => evaluateProposal({
          currentBody: BODY_100, newBody: BODY_121, supportingFrictionCount: 0,
        }),
        /proposal/,
      );
    });

    test('throws if currentBody is not a string', () => {
      assert.throws(
        () => evaluateProposal({
          proposal: updateProposal(),
          currentBody: 123,
          newBody: BODY_121,
          supportingFrictionCount: 0,
        }),
        /currentBody/,
      );
    });

    test('throws if newBody is not a string', () => {
      assert.throws(
        () => evaluateProposal({
          proposal: updateProposal(),
          currentBody: BODY_100,
          newBody: null,
          supportingFrictionCount: 0,
        }),
        /newBody/,
      );
    });

    test('throws if supportingFrictionCount is negative', () => {
      assert.throws(
        () => evaluateProposal({
          proposal: updateProposal(),
          currentBody: BODY_100,
          newBody: BODY_121,
          supportingFrictionCount: -1,
        }),
        /supportingFrictionCount/,
      );
    });

    test('throws if proposal.op is not one of the three known ops', () => {
      assert.throws(
        () => evaluateProposal({
          proposal: { op: 'rename_skill', target_path: SKILL_PATH, diff_body: '' },
          currentBody: BODY_100,
          newBody: BODY_121,
          supportingFrictionCount: 0,
        }),
        /op/,
      );
    });
  });

  describe('filterProposals (AC6)', () => {
    test('partitions admitted vs rejected, preserves input order', () => {
      const reject1 = updateProposal({ frictionCount: 0, target: 'forge/skills/a.md' });
      const insert  = { op: 'insert_skill', target_path: 'forge/skills/b.md', diff_body: '+', sourceFrictionIds: [] };
      const admit1  = updateProposal({ frictionCount: 3, target: 'forge/skills/c.md' });
      const admitSmall = updateProposal({ frictionCount: 0, target: 'forge/skills/d.md' });

      const proposals = [reject1, insert, admit1, admitSmall];

      const result = filterProposals({
        proposals,
        currentBodyFor: (p) => ({
          'forge/skills/a.md': BODY_100,
          'forge/skills/b.md': '',
          'forge/skills/c.md': BODY_100,
          'forge/skills/d.md': BODY_100,
        }[p.target_path]),
        newBodyFor: (p) => ({
          'forge/skills/a.md': BODY_121,
          'forge/skills/b.md': BODY_121,
          'forge/skills/c.md': BODY_121,
          'forge/skills/d.md': BODY_110,
        }[p.target_path]),
      });

      assert.equal(result.admitted.length, 3);
      assert.deepEqual(
        result.admitted.map(p => p.target_path),
        ['forge/skills/b.md', 'forge/skills/c.md', 'forge/skills/d.md'],
      );
      assert.equal(result.rejected.length, 1);
      assert.equal(result.rejected[0].proposal.target_path, 'forge/skills/a.md');
      assert.equal(result.rejected[0].reason, 'compression_gate_growth_unsupported');
      assert.ok(Math.abs(result.rejected[0].growthRatio - 0.21) < 1e-9);
      assert.equal(result.rejected[0].supportingFrictionCount, 0);
    });

    test('empty input → empty partitions', () => {
      const r = filterProposals({
        proposals:      [],
        currentBodyFor: () => '',
        newBodyFor:     () => '',
      });
      assert.deepEqual(r, { admitted: [], rejected: [] });
    });

    test('does not mutate the input array', () => {
      const proposals = [updateProposal({ frictionCount: 0 })];
      const copy = JSON.parse(JSON.stringify(proposals));
      filterProposals({
        proposals,
        currentBodyFor: () => BODY_100,
        newBodyFor:     () => BODY_121,
      });
      assert.deepEqual(proposals, copy);
    });

    test('throws if currentBodyFor is not a function', () => {
      assert.throws(
        () => filterProposals({
          proposals: [updateProposal()],
          currentBodyFor: 'nope',
          newBodyFor: () => BODY_121,
        }),
        /currentBodyFor/,
      );
    });

    test('throws if newBodyFor is not a function', () => {
      assert.throws(
        () => filterProposals({
          proposals: [updateProposal()],
          currentBodyFor: () => BODY_100,
          newBodyFor: null,
        }),
        /newBodyFor/,
      );
    });

    test('supportingFrictionCountFor override is honoured when provided', () => {
      // Proposal carries 0 sourceFrictionIds, but the caller-supplied counter
      // resolves 5 — typically because the caller is counting frictions by
      // (subkind, skillId) across the sprint rather than by proposal.
      const proposal = updateProposal({ frictionCount: 0 });
      const r = filterProposals({
        proposals:       [proposal],
        currentBodyFor:  () => BODY_100,
        newBodyFor:      () => BODY_121,
        supportingFrictionCountFor: () => 5,
      });
      assert.equal(r.admitted.length, 1);
      assert.equal(r.rejected.length, 0);
    });
  });
});
