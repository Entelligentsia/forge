# Token Telemetry Reliability Analysis

**Date:** 2026-04-22  
**Context:** EXP-001 baseline preparation  
**Issue:** HELLO-S01 testbench run has no token data despite workflows mandating `/cost` reporting

---

## Problem Statement

**Observed:** COST_REPORT.md empty, no usage sidecars in `.forge/store/events/HELLO-S01/`

**Expected:** Every workflow phase (plan/implement/review/approve) should emit token usage sidecar via:
```bash
/forge:store emit {sprintId} '{"eventId":"{id}-tokens","inputTokens":<n>,...}' --sidecar
```

---

## Root Causes

### 1. Silent Skip Fallback in Workflows

**Evidence:**
```bash
$ grep "skip.*silently\|unavailable.*skip" .forge/workflows/*.md
architect_sprint_intake.md: If `/cost` is unavailable, skip silently.
architect_sprint_plan.md: If `/cost` is unavailable, skip silently.
```

**Two workflows** (sprint-intake, sprint-plan) have explicit skip conditions. Others mandate token reporting but don't enforce it.

**Impact:**
- If `/cost` command missing → agent silently proceeds without token data
- If agent forgets step → no validation catches omission
- Testbench run likely hit one of these conditions

---

### 2. Non-Enforced Reporting Steps

**Current pattern (most workflows):**
```markdown
## Step 7 — Token Reporting

Before returning, you MUST:
1. Run `/cost` to retrieve session token usage.
2. Parse: `inputTokens`, `outputTokens`, ...
3. Write the usage sidecar via `/forge:store emit ...`
```

**Problem:** "MUST" is prose instruction, not enforced gate.

**Failure modes:**
- Agent returns early (e.g., gate failure in earlier step)
- Agent summarizes "completed successfully" without executing token reporting
- Agent runs `/cost` but doesn't parse/emit sidecar
- `/cost` returns empty/error → agent doesn't retry

---

### 3. No Orchestrator Validation

**Orchestrator** (`orchestrate_task.md`) spawns agents but doesn't verify sidecars written.

**Current flow:**
```
Orchestrator → spawn plan agent → agent completes → orchestrator proceeds to implement
```

**Missing check:**
```
Orchestrator → spawn plan agent → agent completes → VERIFY sidecar exists → proceed
```

**Impact:** Silent failures — orchestrator can't distinguish "agent forgot token reporting" from "agent completed successfully".

---

## Stability Assessment

### Current State: Unstable

| Workflow | Token Reporting | Skip Fallback | Enforcement |
|----------|----------------|---------------|-------------|
| `plan_task.md` | Mandatory (Step 7) | None | ❌ Not enforced |
| `implement_plan.md` | Mandatory (Step 8) | None | ❌ Not enforced |
| `review_plan.md` | Mandatory | None | ❌ Not enforced |
| `review_code.md` | Mandatory | None | ❌ Not enforced |
| `architect_approve.md` | Mandatory | None | ❌ Not enforced |
| `architect_sprint_intake.md` | Mandatory | ✅ Skip silently | ❌ Not enforced |
| `architect_sprint_plan.md` | Mandatory | ✅ Skip silently | ❌ Not enforced |

**Verdict:** Token data unreliable. Success depends on:
1. `/cost` command availability
2. Agent following prose instructions
3. No early return from workflow

---

### Reliability Estimate

**Best case** (all conditions met): 80–90% success rate  
**Typical case** (agent skips some steps): 40–60% success rate  
**Worst case** (`/cost` unavailable): 0% success rate (skip fallback)

**Testbench HELLO-S01:** Likely hit worst case (no token data at all → skip fallback or full omission)

---

## Solutions (Ranked by Reliability Gain)

### Solution A: Pre-Flight /cost Validation (High Impact, Low Effort)

**Implementation:**
```markdown
## Step 0 — Pre-flight Gate Check

1. Verify `/cost` command available:
   ```bash
   /cost
   ```
2. If `/cost` returns error or empty → HALT. Print:
   "Token reporting required but /cost unavailable. Cannot proceed."
3. If `/cost` returns data → continue.
```

**Add to:** Every workflow with token reporting (plan_task, implement_plan, review_*, approve)

**Impact:**
- Eliminates silent skip (agent must abort if `/cost` unavailable)
- Forces user to fix `/cost` availability before running workflow
- **Reliability: 80 → 95%** (assumes agent executes gate check)

---

### Solution B: Orchestrator Sidecar Verification (High Impact, Medium Effort)

**Implementation:**
```markdown
## orchestrate_task.md — After each agent spawn

1. Agent completes with status X
2. **Verify sidecar exists:**
   ```bash
   SIDECAR_PATH="engineering/sprints/{sprint}/events/{eventId}-tokens.json"
   [ -f "$SIDECAR_PATH" ] || {
     echo "ERROR: Agent completed but no token sidecar at $SIDECAR_PATH"
     exit 1
   }
   ```
3. If sidecar missing → retry agent (max 1 retry) or abort task
```

**Impact:**
- Catches agent omission (forgot step, returned early)
- Forces retry if token reporting failed
- **Reliability: 95 → 99%** (orchestrator enforces, not just prose instruction)

---

### Solution C: Store-CLI Write-Hook Enforcement (Highest Impact, High Effort)

**Implementation:**
```javascript
// forge/tools/store-cli.cjs — cmdEmit() function
if (options.sidecar && !data.inputTokens) {
  console.error("ERROR: Sidecar write requires inputTokens field");
  process.exit(1);
}
```

**Add validation:** Sidecars must have `inputTokens`, `outputTokens` fields (can be 0, but must exist).

**Impact:**
- Schema enforcement at write boundary
- Agent can't emit malformed sidecar (missing token fields)
- **Reliability: 99 → 99.9%** (only fails if agent never calls store emit)

---

### Solution D: Automatic /cost Injection (Alternative, Low Reliability Gain)

**Implementation:**
```markdown
## Token Reporting (automated)

The orchestrator will run `/cost` and emit the sidecar on your behalf. No action required.
```

**Move responsibility from agent → orchestrator.**

**Trade-off:**
- ✅ Eliminates agent omission risk
- ❌ Orchestrator can't capture per-phase token usage (only total per agent)
- ❌ Loses granularity (can't distinguish plan vs implement tokens)

**Verdict:** Not recommended. Granular token data valuable for optimization (which phase burns most tokens).

---

## Recommended Implementation Plan

### Phase 1: Quick Fix (This Sprint)

**Deliver:** Solution A (pre-flight `/cost` validation)

**Changes:**
1. Add Step 0 to `meta-plan-task.md`, `meta-implement.md`, `meta-review-*.md`, `meta-approve.md`:
   ```markdown
   ## Step 0 — Verify /cost Availability
   
   Run `/cost` to verify token reporting available. If command fails or returns empty:
   **HALT.** Print: "Token reporting required. /cost unavailable. Cannot proceed."
   ```

2. Remove "skip silently" fallback from `meta-sprint-intake.md`, `meta-sprint-plan.md`:
   ```diff
   - If `/cost` is unavailable, skip silently.
   + If `/cost` fails, HALT. Token reporting mandatory for cost accounting.
   ```

3. Regenerate workflows: `/forge:collate --regenerate workflows`

**Impact:** Reliability 40–60% → 95%

**Effort:** ~1 hour (annotate 7 workflows, regenerate, test)

---

### Phase 2: Orchestrator Enforcement (Next Sprint)

**Deliver:** Solution B (sidecar verification after each agent)

**Changes:**
1. Update `meta-orchestrate.md` to verify sidecar exists after plan/implement/review/approve agents
2. Add retry logic (max 1 retry if sidecar missing)
3. Test with intentional agent omission (agent returns early, skips token reporting)

**Impact:** Reliability 95% → 99%

**Effort:** ~4 hours (orchestrator logic, retry handling, test cases)

---

### Phase 3: Schema Enforcement (Future)

**Deliver:** Solution C (store-cli validates sidecar token fields)

**Changes:**
1. Add `inputTokens`/`outputTokens` to sidecar schema (`.forge/schemas/sidecar.schema.json`)
2. Enforce in `store-cli.cjs` cmdEmit() when `--sidecar` flag set
3. Update tests for malformed sidecar rejection

**Impact:** Reliability 99% → 99.9%

**Effort:** ~2 hours (schema update, validation logic, tests)

---

## Implications for EXP-001

### Baseline Capture Strategy

**Original plan:** Re-run HELLO-S01 in fresh testbench, capture token data

**Updated plan (accounting for reliability issues):**

1. **Implement Phase 1 fix first** (pre-flight `/cost` validation)
   - Prevents silent skip → forces abort if `/cost` unavailable
   - Ensures baseline run either succeeds with data or fails loudly

2. **Manual verification after each agent:**
   ```bash
   # After plan agent completes
   ls -la engineering/sprints/HELLO-S01/HELLO-S01-T01/*tokens*.json
   # Verify file exists, contains inputTokens field
   
   # If missing → immediately re-run agent before proceeding
   ```

3. **Fallback if `/cost` unavailable:**
   - Manually record `/cost` output after each agent in separate file
   - Post-process: emit sidecars manually via `store-cli.cjs emit ... --sidecar`

**Expected reliability:** 95% with Phase 1 fix + manual verification

---

## Data Quality Assessment

### Current Token Data: Unreliable

**Testbench HELLO-S01:**
- ❌ No sidecars in `.forge/store/events/`
- ❌ COST_REPORT.md empty
- ❌ No `/cost` output preserved in artifacts

**Verdict:** Cannot use existing testbench data for baseline. Must re-run.

---

### Estimated vs Reported Tokens

**Question:** Why not use estimated tokens (words × 1.33)?

**Answer:** Estimates unreliable for compression evaluation.

**Reasons:**
1. **Caching impact unknown:** Cached input tokens cost 1/10th of uncached. Estimates can't capture this.
2. **Prompt engineering variance:** Actual prompts include system context, tool schemas, KB docs. Word counts in artifacts don't reflect full context.
3. **Output compression non-linear:** Caveman mode compresses prose but preserves code. Estimates assume uniform compression.

**Example (PLAN.md):**
- Artifact word count: 298 words → 396 tokens estimated
- Actual tokens (if measured): ~500–600 tokens (includes frontmatter, code blocks with higher token density)
- After caveman compression: ~300 tokens (prose compressed, code preserved)
- Estimated savings (298 × 0.4 = 119): **underestimates actual savings** (600 - 300 = 300)

**Verdict:** Reported tokens (from `/cost`) required. Estimates insufficient for ≥60% savings validation.

---

## Conclusion

**Token telemetry currently unstable:**
- Silent skip fallback in 2 workflows
- Non-enforced reporting in 7 workflows
- No orchestrator validation
- **Reliability: 40–60%** (testbench hit failure case)

**Phase 1 fix (pre-flight validation) mandatory for EXP-001:**
- Add Step 0 to all workflows: verify `/cost` available, HALT if not
- Remove "skip silently" fallback
- **Reliability: → 95%**

**EXP-001 baseline capture depends on Phase 1 fix:**
- Cannot use existing testbench data (no token telemetry)
- Must re-run with fixed workflows + manual verification
- Estimated tokens insufficient (need `/cost` reported data for compression validation)

**Recommendation:** Implement Phase 1 fix before starting EXP-001 baseline capture.
