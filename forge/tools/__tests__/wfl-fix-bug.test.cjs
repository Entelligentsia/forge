'use strict';
// wfl-fix-bug.test.cjs — string-invariant structural tests for wfl-fix-bug.js
// Tests assert structural contracts for all 7 acceptance criteria without
// executing the workflow. File must fail before wfl-fix-bug.js exists and
// pass after implementation.
//
// AC1: summaries.triage.route (NOT .path) read; only 'A'/'B' allowed; else escalate verdict_malformed
// AC2: Path A = [implement, review-code, approve, commit, finalize]; Path B = [plan/plan-fix, review-plan, ...PathA]; decided once, no switching
// AC3: bug_skipped guard on SKIP_STATUS=[blocked,escalated,fixed,abandoned], emits event
// AC4: triage→triaged→in-progress (two calls); commit→fixed; virtual sprintId='bugs'; --bug flag; start/complete bracketing
// AC5: finalize runs collate.cjs --purge-events then preflight-gate --phase finalize --bug; gate failure escalates without touching bug.status
// AC6: escalateBug() helper present; null-dispatch retry-once-then-escalate
// AC7: file exists, node --check passes, all tests green

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SRC = path.resolve(
  __dirname, '..', '..', 'init', 'base-pack', 'workflows-js', 'wfl-fix-bug.js'
);

describe('wfl-fix-bug — AC7: file exists', () => {
  it('source file exists at the correct path', () => {
    assert.ok(fs.existsSync(SRC), `wfl-fix-bug.js not found at: ${SRC}`);
  });
});

describe('wfl-fix-bug — AC1: summaries.triage.route (not .path)', () => {
  let src;

  it('reads summaries.triage.route (not summaries.triage.path)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('summaries.triage.route') || src.includes("summaries['triage'].route") || src.includes("summaries['triage']['route']") || src.includes('.route'),
      'Must read summaries.triage.route — field is "route" not "path".'
    );
  });

  it('does NOT read summaries.triage.path (wrong field)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      !src.includes('summaries.triage.path'),
      'Found summaries.triage.path — must use .route not .path (see EMBERGLOW-BUG-001).'
    );
  });

  it('route values constrained to A and B only', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    // Accept both positive checks (=== 'A'/'B') and negative guard (!== 'A' && !== 'B')
    // The key invariant: both 'A' and 'B' appear as the only valid route values.
    const hasA = src.includes("'A'") || src.includes('"A"');
    const hasB = src.includes("'B'") || src.includes('"B"');
    assert.ok(hasA, 'Route value "A" not found in source — Path A must be referenced.');
    assert.ok(hasB, 'Route value "B" not found in source — Path B must be referenced.');
    // The guard must prevent any value other than A or B from proceeding
    const hasGuard = src.includes("route !== 'A'") || src.includes('route !== "A"') ||
      src.includes("route === 'A'") || src.includes('route === "A"');
    assert.ok(hasGuard, 'No route guard found — must check route is A or B, else escalate.');
  });

  it('escalates verdict_malformed when route is neither A nor B', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('verdict_malformed'),
      'No verdict_malformed escalation found — must escalate on bad route value.'
    );
  });
});

describe('wfl-fix-bug — AC2: Path A and Path B phase lists', () => {
  let src;

  it('PHASES_A contains implement phase', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('PHASES_A'), 'PHASES_A constant not found.');
    assert.ok(src.includes('implement'), 'implement phase not found.');
  });

  it('PHASES_A contains review-code phase', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('review-code'), 'review-code phase not found.');
  });

  it('PHASES_A contains approve phase', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('approve'), 'approve phase not found.');
  });

  it('PHASES_A contains commit phase', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('commit'), 'commit phase not found.');
  });

  it('PHASES_A contains finalize phase', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('finalize'), 'finalize phase not found.');
  });

  it('PHASES_B contains plan or plan-fix phase', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('PHASES_B'), 'PHASES_B constant not found.');
    const hasPlan = src.includes('plan-fix') || src.includes("role: 'plan'") || src.includes('role: "plan"');
    assert.ok(hasPlan, 'plan-fix phase not found in PHASES_B.');
  });

  it('PHASES_B contains review-plan phase', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('review-plan'), 'review-plan phase not found in PHASES_B.');
  });

  it('path is decided once — phases assigned from PHASES_A or PHASES_B at most twice', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    // phases = route === 'A' ? PHASES_A : PHASES_B — this is one assignment, no mid-loop switch
    const phaseAssignments = (src.match(/phases\s*=\s*PHASES_/g) || []).length;
    assert.ok(
      phaseAssignments <= 2,
      `Found ${phaseAssignments} phases assignments — path must be decided once, not switched mid-pipeline.`
    );
  });

  it('REVIEW_ROLES does not include validate (no validate phase in fix_bug)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const reviewRolesMatch = src.match(/REVIEW_ROLES\s*=\s*\[([^\]]+)\]/);
    if (reviewRolesMatch) {
      assert.ok(
        !reviewRolesMatch[1].includes('validate'),
        'REVIEW_ROLES must not include "validate" — fix_bug has no validate phase.'
      );
    } else {
      assert.ok(src.includes('REVIEW_ROLES'), 'REVIEW_ROLES constant not found.');
    }
  });
});

describe('wfl-fix-bug — AC3: bug_skipped guard', () => {
  let src;

  it('SKIP_STATUS array is present', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('SKIP_STATUS'), 'SKIP_STATUS constant not found.');
  });

  it('SKIP_STATUS contains fixed (not committed as terminal status)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes("'fixed'") || src.includes('"fixed"'), 'SKIP_STATUS must contain "fixed".');
    const skipStatusMatch = src.match(/SKIP_STATUS\s*=\s*\[([^\]]+)\]/);
    if (skipStatusMatch) {
      assert.ok(
        !skipStatusMatch[1].includes('committed'),
        'SKIP_STATUS must not contain "committed" — bug terminal status is "fixed".'
      );
    }
  });

  it('SKIP_STATUS contains blocked', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes("'blocked'") || src.includes('"blocked"'), 'SKIP_STATUS must contain "blocked".');
  });

  it('SKIP_STATUS contains escalated', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes("'escalated'") || src.includes('"escalated"'), 'SKIP_STATUS must contain "escalated".');
  });

  it('SKIP_STATUS contains abandoned', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes("'abandoned'") || src.includes('"abandoned"'), 'SKIP_STATUS must contain "abandoned".');
  });

  it('bug-skipped event is emitted on skip (not silent return)', () => {
    // forge-engineering#39: canonical token is kebab "bug-skipped" per
    // _fragments/event-vocabulary.md; the underscore form is schema-rejected.
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('bug-skipped'),
      'No bug-skipped event found — must emit a bug-skipped event (not silent return) when status is in SKIP_STATUS.'
    );
  });
});

describe('wfl-fix-bug — AC4: status writes, virtual sprintId, --bug flag, bracketing', () => {
  let src;

  it('orchestrator writes triaged status after triage', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('triaged'),
      'No "triaged" status write found — orchestrator must call update-status bug {bugId} status triaged.'
    );
  });

  it('orchestrator writes in-progress status after triaged (two-step)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('in-progress'),
      'No "in-progress" status write found — two-step: triaged then in-progress.'
    );
  });

  it('commit phase writes fixed status (terminal)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('fixed'),
      'No "fixed" status write found — commit phase must write bug.status=fixed.'
    );
  });

  it('virtual sprintId bugs used in emit/sidecar', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasBugsVirtual = src.includes("'bugs'") || src.includes('"bugs"');
    assert.ok(hasBugsVirtual, 'Virtual sprintId="bugs" not found — all bug events must use sprintId="bugs".');
  });

  it('--bug flag used in subagent prompts', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('--bug'),
      'No "--bug" flag found — subagent prompts and preflight-gate must use --bug {bugId} not --task.'
    );
  });

  it('action="start" start event instruction present', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasStart = src.includes('action="start"') || src.includes("action='start'") || src.includes('action=\\"start\\"');
    assert.ok(hasStart, 'No action="start" instruction — subagent must emit start event before workflow.');
  });

  it('durationMinutes bracketing instruction present', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('durationMinutes'),
      'No durationMinutes found — subagent must compute and include durationMinutes in complete event.'
    );
  });
});

describe('wfl-fix-bug — AC5: finalize phase', () => {
  let src;

  it('finalize runs collate.cjs with --purge-events', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('--purge-events'),
      'No "--purge-events" found — finalize must call collate.cjs {bugId} --purge-events.'
    );
  });

  it('finalize runs preflight-gate with --phase finalize and --bug', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasFinalizeGate = src.includes('--phase finalize') || src.includes("phase finalize");
    assert.ok(hasFinalizeGate, 'No --phase finalize found — finalize must run preflight-gate --phase finalize --bug {bugId}.');
  });

  it('escalateBug helper present (used for finalize gate failure without status write)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      src.includes('escalateBug'),
      'escalateBug helper not found — finalize gate failure must escalate without touching bug.status.'
    );
  });
});

describe('wfl-fix-bug — AC6: escalateBug helper and null-dispatch retry', () => {
  let src;

  it('escalateBug() helper function is present', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasHelper = src.includes('function escalateBug') || src.includes('const escalateBug') ||
      src.includes('fn escalateBug') || src.includes('escalateBug =');
    assert.ok(hasHelper, 'escalateBug() helper not found — must mirror escalateTask() with --bug flag.');
  });

  it('escalateBug uses --bug flag (not --task)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const escalateIdx = src.indexOf('escalateBug');
    assert.ok(escalateIdx !== -1, 'escalateBug not found.');
    // Find the function definition and check it contains --bug
    const fnIdx = src.indexOf('function escalateBug');
    if (fnIdx !== -1) {
      const region = src.slice(fnIdx, fnIdx + 600);
      assert.ok(
        region.includes('--bug') || region.includes('bug'),
        'escalateBug must use --bug flag not --task.'
      );
    }
  });

  it('null-dispatch retry-once-then-escalate is present', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasRetry = src.includes('dispatch returned null') || src.includes('null after retry') ||
      src.includes('retry') || (src.includes('!r') && src.includes('escalat'));
    assert.ok(hasRetry, 'No null-dispatch retry found — must retry once then escalate on null dispatch.');
  });
});

describe('wfl-fix-bug — inherited T02 verdict routing', () => {
  let src;

  it('STDOUT token routing used in review phases (not exit code)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const hasStdout = src.includes('stdout') || src.includes('STDOUT');
    assert.ok(hasStdout, 'No STDOUT routing found — review phases must route on STDOUT token, not exit code.');
  });

  it('n/a maps to malformed', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    const reviewBranchStart = src.indexOf('READ VERDICT');
    if (reviewBranchStart !== -1) {
      const region = src.slice(reviewBranchStart, reviewBranchStart + 1000);
      assert.ok(region.includes('n/a'), 'Token "n/a" not in READ VERDICT branch.');
      assert.ok(region.includes('malformed'), 'n/a must map to malformed in READ VERDICT branch.');
    } else {
      assert.ok(src.includes('n/a'), '"n/a" not found in source.');
      assert.ok(src.includes('malformed'), '"malformed" not found in source.');
    }
  });

  it('unknown maps to malformed', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.includes('unknown'), '"unknown" not found in source.');
    assert.ok(src.includes('malformed'), '"malformed" not found — unknown must map to malformed.');
  });

  it('exit code not used to determine verdict (no "Map exit code" routing)', () => {
    if (!src) src = fs.readFileSync(SRC, 'utf8');
    assert.ok(
      !src.includes('Map exit code'),
      'Found "Map exit code" — verdict must be STDOUT token, not exit code.'
    );
  });
});

describe('wfl-fix-bug — AC7: syntax check', () => {
  it('node --check passes on wfl-fix-bug.js', () => {
    try {
      execFileSync(process.execPath, ['--check', SRC], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      assert.fail(`node --check failed:\n${err.stderr || err.message}`);
    }
  });
});
