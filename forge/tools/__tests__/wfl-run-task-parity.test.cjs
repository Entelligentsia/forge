'use strict';

// wfl-run-task-parity.test.cjs — regression guard for FORGE-S28-T05
//
// Asserts structural invariants in wfl-run-task.js for the ten MED-severity
// parity gaps (#5–#14) without executing the workflow (string-invariant tests).
//
//   1. #5  friction drain instruction present in subagent prompt.
//   2. #6  session preflight check (preflight-status.json, forge-preflight.cjs, blob.ok).
//   3. #7  gate exit-code distinction (exit_code == 2 → gate_misconfigured).
//   4. #8  persona injection (persona-pack.json, ROLE_TO_NOUN).
//   5. #9  build-overlay.cjs instruction replaces stale raw MASTER_INDEX read.
//   6. #10 Review Loop Context block (Is final iteration).
//   7. #11 simplified retry prompt (simplified, subagent_retry, You MUST produce a result).
//   8. #12 three-cluster model resolution (ANTHROPIC_DEFAULT_OPUS_MODEL, single cluster, ROLE_TIER_DEFAULTS).
//   9. #13 on_revision field in RESOLVE_SCHEMA phases; revisionTarget uses it.
//  10. #14 eventId threading in JS loop (per-phase merge-sidecar removed — S38).
//  11. Syntax check: node --check passes.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SRC = path.resolve(
  __dirname, '..', '..', 'init', 'base-pack', 'workflows-js', 'wfl-run-task.js'
);

let src;
function getSrc() {
  if (!src) src = fs.readFileSync(SRC, 'utf8');
  return src;
}

describe('wfl-run-task-parity — source file exists', () => {
  it('source file exists and is readable', () => {
    assert.ok(fs.existsSync(SRC), `Source not found: ${SRC}`);
    src = fs.readFileSync(SRC, 'utf8');
    assert.ok(src.length > 100, 'Source file appears empty');
  });
});

describe('wfl-run-task-parity — Gap #5: friction drain instruction', () => {
  it('AC #5a: subagent prompt contains FRICTION-*.jsonl drain instruction', () => {
    const s = getSrc();
    assert.ok(
      s.includes('FRICTION-*.jsonl'),
      'No "FRICTION-*.jsonl" found — the prompt must instruct the subagent to drain friction records.'
    );
  });

  it('AC #5b: subagent prompt contains type:friction or type "friction" emit instruction', () => {
    const s = getSrc();
    const hasFrictionEmit = s.includes('type "friction"') || s.includes('type:friction') || s.includes('"friction"');
    assert.ok(
      hasFrictionEmit,
      'No friction emit instruction found — the prompt must instruct emitting type:friction events.'
    );
  });
});

describe('wfl-run-task-parity — Gap #6: session preflight check', () => {
  it('AC #6a: source contains preflight-status.json reference', () => {
    const s = getSrc();
    assert.ok(
      s.includes('preflight-status.json'),
      'No "preflight-status.json" found — session preflight check must be wired.'
    );
  });

  it('AC #6b: source contains forge-preflight.cjs reference', () => {
    const s = getSrc();
    assert.ok(
      s.includes('forge-preflight.cjs'),
      'No "forge-preflight.cjs" found — session preflight fallback must be wired.'
    );
  });

  it('AC #6c: source contains blob.ok check', () => {
    const s = getSrc();
    assert.ok(
      s.includes('blob.ok'),
      'No "blob.ok" found — session preflight halt condition must be wired.'
    );
  });
});

describe('wfl-run-task-parity — Gap #7: gate exit-code distinction', () => {
  it('AC #7: source distinguishes exit_code==2 from exit_code==1 (gate_misconfigured)', () => {
    const s = getSrc();
    const hasExit2 = s.includes('exit_code == 2') || s.includes('gate_misconfigured');
    assert.ok(
      hasExit2,
      'No exit_code==2 or gate_misconfigured distinction found — the prompt must distinguish gate failures from misconfigurations.'
    );
  });

  it('AC #7b: source contains gate_failed for exit_code==1', () => {
    const s = getSrc();
    assert.ok(
      s.includes('gate_failed'),
      'No "gate_failed" note found — exit_code==1 must produce note: "gate_failed: ...".'
    );
  });
});

describe('wfl-run-task-parity — Gap #8: persona/skill role-block injection', () => {
  it('AC #8a: source contains ROLE_TO_NOUN mapping', () => {
    const s = getSrc();
    assert.ok(
      s.includes('ROLE_TO_NOUN'),
      'No "ROLE_TO_NOUN" found — persona noun mapping must be present.'
    );
  });

  it('AC #8b: source contains persona-pack.json reference', () => {
    const s = getSrc();
    assert.ok(
      s.includes('persona-pack.json'),
      'No "persona-pack.json" found — role-block injection must reference persona-pack.json.'
    );
  });
});

describe('wfl-run-task-parity — Gap #9: build-overlay replaces raw MASTER_INDEX read', () => {
  it('AC #9a: source contains build-overlay.cjs instruction', () => {
    const s = getSrc();
    assert.ok(
      s.includes('build-overlay.cjs'),
      'No "build-overlay.cjs" found — project context must use build-overlay.'
    );
  });

  it('AC #9b: source does NOT contain stale raw MASTER_INDEX.md read instruction in runPhase prompt', () => {
    const s = getSrc();
    // The stale instruction: 'Also read the task-scoped slice of `engineering/MASTER_INDEX.md` for project context.'
    const staleInstruction = 'Also read the task-scoped slice of `engineering/MASTER_INDEX.md` for project context.';
    assert.ok(
      !s.includes(staleInstruction),
      'Found stale raw MASTER_INDEX.md read instruction — it must be replaced with build-overlay.cjs.'
    );
  });
});

describe('wfl-run-task-parity — Gap #10: review loop context injection', () => {
  it('AC #10a: source contains "Review Loop Context" block', () => {
    const s = getSrc();
    assert.ok(
      s.includes('Review Loop Context'),
      'No "Review Loop Context" block found — review-loop context must be injected for REVIEW_ROLES phases.'
    );
  });

  it('AC #10b: source contains "Is final iteration" in review loop block', () => {
    const s = getSrc();
    assert.ok(
      s.includes('Is final iteration'),
      'No "Is final iteration" found — review loop context block must include final-iteration flag.'
    );
  });
});

describe('wfl-run-task-parity — Gap #11: simplified retry prompt + subagent_retry event', () => {
  it('AC #11a: source contains simplified retry logic (simplified flag)', () => {
    const s = getSrc();
    assert.ok(
      s.includes('simplified'),
      'No "simplified" flag found — simplified retry prompt must be wired.'
    );
  });

  it('AC #11b: source contains subagent_retry event', () => {
    const s = getSrc();
    assert.ok(
      s.includes('subagent_retry'),
      'No "subagent_retry" found — retry event must be emitted on null/empty dispatch.'
    );
  });

  it('AC #11c: source contains "You MUST produce a result" directive', () => {
    const s = getSrc();
    assert.ok(
      s.includes('You MUST produce a result'),
      'No "You MUST produce a result" found — simplified retry prompt must include this directive.'
    );
  });
});

describe('wfl-run-task-parity — Gap #12: three-cluster model resolution', () => {
  it('AC #12a: source contains ANTHROPIC_DEFAULT_OPUS_MODEL env var reference', () => {
    const s = getSrc();
    assert.ok(
      s.includes('ANTHROPIC_DEFAULT_OPUS_MODEL'),
      'No "ANTHROPIC_DEFAULT_OPUS_MODEL" found — cluster detection must check env vars.'
    );
  });

  it('AC #12b: source contains single-cluster inherit logic (returns undefined)', () => {
    const s = getSrc();
    // Single cluster: uniqueVals.size <= 1 → return undefined (inherit parent)
    const hasSingle = s.includes('single cluster') || s.includes('uniqueVals.size') || (s.includes('return undefined') && s.includes('cluster'));
    assert.ok(
      hasSingle,
      'No single-cluster inherit logic found — single-cluster must pass model=undefined.'
    );
  });

  it('AC #12c: source contains ROLE_TIER_DEFAULTS for unknown-cluster fallback', () => {
    const s = getSrc();
    assert.ok(
      s.includes('ROLE_TIER_DEFAULTS'),
      'No "ROLE_TIER_DEFAULTS" found — unknown-cluster fallback must use canonical model IDs.'
    );
  });

  it('AC #12d: source documents the env/process.env sandbox limitation as a deliberate deviation', () => {
    const s = getSrc();
    // The deviation documentation must explain the sandbox limitation
    const hasDeviation = s.includes('DELIBERATE DEVIATION') && (s.includes('process.env') || s.includes('env') && s.includes('sandbox'));
    assert.ok(
      hasDeviation,
      'No deliberate deviation documented for #12 env access — must document that env vars are unreliable in Pi workflow sandbox.'
    );
  });
});

describe('wfl-run-task-parity — Gap #13: on_revision field in RESOLVE_SCHEMA', () => {
  it('AC #13a: RESOLVE_SCHEMA phase items contain on_revision property', () => {
    const s = getSrc();
    assert.ok(
      s.includes('on_revision'),
      'No "on_revision" found — RESOLVE_SCHEMA phase items must have optional on_revision field.'
    );
  });

  it('AC #13b: revisionTarget() prefers on_revision over nearest-preceding fallback', () => {
    const s = getSrc();
    const revisionFnStart = s.indexOf('function revisionTarget');
    assert.ok(revisionFnStart !== -1, '"function revisionTarget" not found in source.');
    const revisionFnSrc = s.slice(revisionFnStart, revisionFnStart + 500);
    assert.ok(
      revisionFnSrc.includes('on_revision'),
      '"on_revision" not found in revisionTarget() — it must be preferred over nearest-preceding fallback.'
    );
  });
});

describe('wfl-run-task-parity — Gap #14: eventId threading (sidecar removed FORGE-S38)', () => {
  it('AC #14a: per-phase merge-sidecar dispatch is REMOVED', () => {
    const s = getSrc();
    // The token-sidecar merge was removed: its only writer (the pi-runtime
    // usage-hook) does not exist in the Claude Code Workflow path, so every
    // merge found no sidecar and merely burned an agent dispatch per phase.
    // Token accounting for this path is handled deterministically outside the
    // per-phase loop. Guard against the dead dispatch reappearing.
    // Guard the actual DISPATCH (a prose mention of the removal in a comment is fine):
    // no mergeSidecar() helper, and no agent instructed to invoke merge-sidecar.
    assert.ok(
      !s.includes('mergeSidecar(') && !s.includes('"command": "merge-sidecar"') && !s.includes('store-cli.cjs merge-sidecar'),
      'merge-sidecar dispatch found — it was removed (no sidecar writer exists in the Workflow path).'
    );
  });

  it('AC #14b: eventId uses _complete suffix (not _start) — token usage lands on COMPLETE event', () => {
    const s = getSrc();
    assert.ok(
      s.includes('_complete'),
      'No "_complete" suffix found in eventId — must use _complete (not _start) since token usage lands on COMPLETE event.'
    );
    assert.ok(
      !s.includes('_${taskId}_${p.role}_start'),
      'Found _start suffix in eventId template — must be _complete.'
    );
  });

  it('AC #14c: eventId is passed into runPhase() call in the loop', () => {
    const s = getSrc();
    // runPhase should be called with eventId option
    assert.ok(
      s.includes('eventId }') || s.includes('eventId, }') || s.includes('eventId\n') || s.includes('{ firstPhase: isFirstPhase, eventId }'),
      'eventId not threaded into runPhase() — must pass eventId so subagent and mergeSidecar agree on sidecar filename.'
    );
  });

  it('AC #14d: runPhase accepts eventId parameter', () => {
    const s = getSrc();
    // runPhase signature must include eventId parameter
    assert.ok(
      s.includes('eventId = null') || s.includes('eventId = undefined'),
      'runPhase() does not accept eventId — signature must include { ..., eventId } option.'
    );
  });

  it('AC #14e: subagent prompt stamps the threaded eventId on the COMPLETE event', () => {
    const s = getSrc();
    // The driver-agreed eventId must be stamped on the subagent's COMPLETE event
    // so downstream token-accounting can match the event deterministically.
    assert.ok(
      s.includes('Use eventId='),
      'No eventId-anchored COMPLETE-event instruction found — subagent must stamp the driver-agreed eventId.'
    );
  });
});

describe('wfl-run-task-parity — FORGE-BUG-041: StructuredOutput schema must be object-typed', () => {
  // The workflow runtime registers the StructuredOutput tool using each agent()
  // call's `schema` option as the tool's input_schema. The Anthropic API rejects
  // any tool whose input_schema.type !== 'object' (HTTP 400), so a non-object
  // top-level schema makes the subagent unable to ever call StructuredOutput,
  // and the workflow throws after the nudge limit. Guard every inline schema
  // literal in the source.
  it('no inline agent() schema literal uses a non-object top-level type', () => {
    const s = getSrc();
    const re = /schema:\s*\{\s*type:\s*'([^']+)'/g;
    const offenders = [];
    let m;
    while ((m = re.exec(s)) !== null) {
      if (m[1] !== 'object') offenders.push(m[1]);
    }
    assert.deepEqual(
      offenders, [],
      `Found agent() schema literal(s) with non-object top-level type: ${JSON.stringify(offenders)}. ` +
      `StructuredOutput input_schema.type must be 'object' (or omit the schema for free-text return).`
    );
  });

  it("does not contain the broken schema: { type: 'string' } literal", () => {
    const s = getSrc();
    assert.ok(
      !/schema:\s*\{\s*type:\s*'string'\s*\}/.test(s),
      "Found schema: { type: 'string' } — invalid StructuredOutput input_schema (must be object). " +
      'See FORGE-BUG-041: this caused every wfl:run-task phase to escalate after the plan phase.'
    );
  });
});

describe('wfl-run-task-parity — LOW #19: emitSkip task_skipped event', () => {
  it('AC #19a: source contains emitSkip function (task_skipped event helper)', () => {
    const s = getSrc();
    assert.ok(
      s.includes('emitSkip'),
      'No "emitSkip" found — LOW #19 requires an emitSkip() agent helper for task_skipped events.'
    );
  });

  it('AC #19b: emitSkip is called in the SKIP_STATUS pre-task guard', () => {
    const s = getSrc();
    // The SKIP_STATUS guard must call emitSkip before returning.
    const skipGuardStart = s.indexOf('SKIP_STATUS.includes(resolved.taskStatus)');
    assert.ok(skipGuardStart !== -1, 'No SKIP_STATUS guard found in source.');
    const guardBody = s.slice(skipGuardStart, skipGuardStart + 400);
    assert.ok(
      guardBody.includes('emitSkip'),
      'emitSkip not called in SKIP_STATUS guard — LOW #19 requires emitSkip before early-return.'
    );
  });

  it('AC #19c: emitSkip emits a task-dispatch type event with action skip', () => {
    const s = getSrc();
    const emitSkipStart = s.indexOf('function emitSkip(');
    assert.ok(emitSkipStart !== -1, '"function emitSkip" not found in source.');
    const emitSkipBody = s.slice(emitSkipStart, emitSkipStart + 800);
    assert.ok(
      emitSkipBody.includes('task-dispatch') || emitSkipBody.includes('task_skipped'),
      'emitSkip() must emit a task-dispatch type event — LOW #19.'
    );
    assert.ok(
      emitSkipBody.includes('"skip"') || emitSkipBody.includes("'skip'") || emitSkipBody.includes('action.*skip'),
      'emitSkip() must use action:"skip" — LOW #19.'
    );
  });
});

describe('wfl-run-task-parity — LOW #20: writeback in default pipeline', () => {
  it('AC #20a: resolve-agent prompt includes writeback in hardcoded default pipeline', () => {
    const s = getSrc();
    assert.ok(
      s.includes('writeback'),
      'No "writeback" found — LOW #20 requires writeback step in the hardcoded default pipeline.'
    );
  });

  it('AC #20b: writeback maps to collator_agent.md (status-safe), NOT update_implementation.md', () => {
    const s = getSrc();
    // writeback is the COLLATOR phase (meta-orchestrate § role-to-persona:
    // writeback -> collator). It must map to collator_agent.md — which writes
    // markdown views only and does NOT touch task status. Mapping it to
    // update_implementation.md (the engineer revision-applier) set status back
    // to "implemented" after approve, tripping commit-task.cjs's "requires
    // approved" precondition and escalating every task at commit.
    // Match the literal arrow-mapping form (not prose that merely mentions both).
    assert.ok(
      s.includes('writeback→collator_agent.md'),
      'writeback must map to collator_agent.md (status-safe KB writeback).'
    );
    assert.ok(
      !s.includes('writeback→update_implementation.md'),
      'writeback must NOT map to update_implementation.md — it resets status to "implemented" and breaks commit.'
    );
  });
});

describe('wfl-run-task-parity — LOW #21: Progress-Monitor IPC structural limitation comment', () => {
  it('AC #21: source contains structural-limitation comment for Progress-Monitor IPC', () => {
    const s = getSrc();
    const hasComment = s.includes('Progress-Monitor') || s.includes('STRUCTURAL LIMITATION') || s.includes('#21');
    assert.ok(
      hasComment,
      'No structural-limitation comment for #21 (Progress-Monitor IPC) found — LOW #21 requires documentation.'
    );
  });
});

describe('wfl-run-task-parity — LOW #22: BANNER_MAP constant', () => {
  it('AC #22a: source contains BANNER_MAP constant', () => {
    const s = getSrc();
    assert.ok(
      s.includes('BANNER_MAP'),
      'No "BANNER_MAP" found — LOW #22 requires a BANNER_MAP constant for phase-announcement log identity.'
    );
  });

  it('AC #22b: BANNER_MAP contains forge-architect and forge-engineer entries', () => {
    const s = getSrc();
    assert.ok(
      s.includes('forge-architect') && s.includes('forge-engineer'),
      'BANNER_MAP must contain forge-architect and forge-engineer persona labels — LOW #22.'
    );
  });

  it('AC #22c: BANNER_MAP is used in the phase-start log line', () => {
    const s = getSrc();
    assert.ok(
      s.includes('BANNER_MAP[') || s.includes('banner'),
      'BANNER_MAP not referenced in phase-start log — LOW #22 requires using it in the phase-announcement log.'
    );
  });
});

describe('wfl-run-task-parity — Syntax check', () => {
  it('node --check passes on wfl-run-task.js', () => {
    try {
      execFileSync(process.execPath, ['--check', SRC], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      assert.fail(`node --check failed:\n${err.stderr || err.message}`);
    }
  });
});
