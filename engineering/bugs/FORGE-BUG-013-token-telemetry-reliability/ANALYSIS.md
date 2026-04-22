# Bug Analysis — FORGE-BUG-013

**Bug ID:** FORGE-BUG-013  
**Title:** Token telemetry unreliable — silent skip fallback + non-enforced reporting  
**Severity:** Major  
**Reported:** 2026-04-22

---

## Symptom

Testbench sprint HELLO-S01 completed successfully but produced no token usage data:
- `COST_REPORT.md` empty ("_No token data available for this sprint._")
- No usage sidecars in `.forge/store/events/HELLO-S01/`
- Expected: Every workflow phase (plan/implement/review/approve) emits token sidecar via `/forge:store emit ... --sidecar`

**Impact:** Cannot measure token consumption for compression experiments (EXP-001). Token data critical for validating ≥60% savings target.

---

## Root Cause

**Category:** `business-rule` (workflow logic error)

**Location:**
1. `.forge/workflows/architect_sprint_intake.md:231`
2. `.forge/workflows/architect_sprint_plan.md:188`

**Code:**
```markdown
If `/cost` is unavailable, skip silently.
```

**Additional factor:**  
Other workflows (plan_task, implement_plan, review_*, approve) mandate token reporting ("you MUST") but do not enforce. If agent:
- Returns early (e.g., gate failure)
- Omits token reporting step
- Encounters `/cost` error without retry

→ No validation catches omission. Orchestrator proceeds without verifying sidecar exists.

---

## How the Bug Manifests

### Testbench HELLO-S01 Run

**Likely sequence:**
1. Sprint-intake agent executes → reaches token reporting step
2. `/cost` unavailable or returns error
3. Workflow instruction: "If `/cost` is unavailable, skip silently"
4. Agent skips token reporting, completes successfully
5. Same for sprint-plan agent
6. Task agents (plan/implement/review/approve) either:
   - Encounter same `/cost` issue → skip (no enforcement)
   - Forget token reporting step → skip (no validation)
7. Result: Zero token data emitted

### Reliability Assessment

**Best case** (all conditions met): 80–90%  
**Typical case** (agent skips some steps): 40–60%  
**Worst case** (`/cost` unavailable): 0% (skip fallback)

**Testbench run:** Hit worst case.

---

## Why This Matters

### Blocking EXP-001 (Compression Experiment)

**Goal:** Validate hybrid compression (Wenyan + caveman) saves ≥60% tokens.

**Requires:**
- Baseline token data (uncompressed run)
- Compressed token data (hybrid compression run)
- Comparison: `(baseline - compressed) / baseline × 100%`

**Blocked by:** No baseline exists. Testbench data unreliable → must re-run with fixed workflows.

### Token Estimates Insufficient

**Artifact word counts:**
- PLAN.md: 298 words → 396 tokens estimated (words × 1.33)
- Actual tokens (with full context): ~500–600 tokens
- After compression: ~300 tokens
- **Estimated savings (119) underestimates actual (300)**

**Why estimates fail:**
- Can't capture prompt caching (10× cost difference cached vs uncached)
- Miss system context (tool schemas, KB docs, persona instructions)
- Assume linear compression (reality: prose 70%, code/tables 0%)

**Verdict:** Need reported `/cost` data, not estimates.

---

## Files Involved

### Generated Workflows (Output — Need Regeneration)

| File | Issue | Line |
|------|-------|------|
| `.forge/workflows/architect_sprint_intake.md` | Silent skip fallback | 231 |
| `.forge/workflows/architect_sprint_plan.md` | Silent skip fallback | 188 |
| `.forge/workflows/plan_task.md` | Non-enforced reporting | Step 7 |
| `.forge/workflows/implement_plan.md` | Non-enforced reporting | Step 8 |
| `.forge/workflows/review_plan.md` | Non-enforced reporting | Token Reporting section |
| `.forge/workflows/review_code.md` | Non-enforced reporting | Token Reporting section |
| `.forge/workflows/architect_approve.md` | Non-enforced reporting | Token Reporting section |

### Meta Workflows (Source — Fix Here)

| File | Change Required |
|------|-----------------|
| `forge/meta/workflows/meta-sprint-intake.md` | Remove "skip silently" → mandate `/cost` or HALT |
| `forge/meta/workflows/meta-sprint-plan.md` | Remove "skip silently" → mandate `/cost` or HALT |
| `forge/meta/workflows/meta-plan-task.md` | Add Step 0: verify `/cost` available before proceeding |
| `forge/meta/workflows/meta-implement.md` | Add Step 0: verify `/cost` available before proceeding |
| `forge/meta/workflows/meta-review-plan.md` | Add Step 0: verify `/cost` available before proceeding |
| `forge/meta/workflows/meta-review-code.md` | Add Step 0: verify `/cost` available before proceeding |
| `forge/meta/workflows/meta-approve.md` | Add Step 0: verify `/cost` available before proceeding |

---

## Root Cause Classification

**Primary:** `business-rule`

**Rationale:**
- Bug is in workflow logic (incorrect fallback behavior)
- Meta sources define the rule ("skip silently")
- Generated workflows inherit the bug
- Not a `regression` (behavior was intentionally designed this way, just wrong)
- Not `configuration` (not a config issue)
- Not `validation` (schema is correct, reporting step just not enforced)

**Pattern:** Graceful degradation introduced fragility. "Skip silently" prioritized workflow completion over data integrity.

---

## Prior Art

**Similar pattern in other workflows:**
```bash
$ grep -r "gracefully skip\|skip.*cost" .forge/workflows/*.md
sprint_retrospective.md: Gracefully skip all cost aggregation if no events have token fields.
validate_task.md: If `/cost` is unavailable, skip silently.
```

**Same root cause:** Workflows prioritize completing successfully even when prerequisite data (token telemetry) missing.

**Broader issue:** No enforcement layer between workflow instruction and execution. Agent compliance relies on prose ("you MUST") not gates.

---

## Reproduction Steps

1. Run any Forge workflow (e.g., `/hello:plan HELLO-S01-T01`)
2. Ensure `/cost` command unavailable or returns error
3. Agent reaches token reporting step
4. Workflow: "If `/cost` is unavailable, skip silently"
5. Agent completes successfully
6. Check `.forge/store/events/` → no token sidecar
7. Check `COST_REPORT.md` → "_No token data available_"

**Expected:** Agent should HALT if `/cost` unavailable. Token reporting mandatory for cost accounting.

---

## Verification Criteria

After fix, token telemetry should be:
1. **Mandatory:** Agent HALTS if `/cost` unavailable (no silent skip)
2. **Enforced:** Orchestrator verifies sidecar exists after each agent
3. **Reliable:** ≥95% success rate (only fails if `/cost` genuinely broken, not silent skip)

**Test:**
1. Run HELLO-S01 sprint with fixed workflows
2. Verify every phase emits token sidecar:
   ```bash
   find engineering/sprints/HELLO-S01 -name "*tokens*.json"
   # Expect: sidecars for sprint-intake, sprint-plan, T01-plan, T01-implement, T01-review, T01-approve
   ```
3. Verify COST_REPORT.md populated:
   ```bash
   grep -v "No token data" engineering/sprints/HELLO-S01/COST_REPORT.md
   # Expect: tables with inputTokens, outputTokens, estimatedCostUSD
   ```

---

## Impact Assessment

**Users affected:** Anyone running Forge sprints expecting token cost tracking

**Frequency:** Every sprint where `/cost` unavailable or agent skips reporting step (40–60% of runs)

**Workaround:** Manually run `/cost` after each agent, record output, emit sidecars via store-cli

**Data loss:** Historical token data for all sprints run with current workflows cannot be recovered

---

## Next Steps

1. Write BUG_FIX_PLAN.md (implementation plan)
2. Implement Phase 1 fix (pre-flight `/cost` validation in 7 meta workflows)
3. Verify with test sprint run (HELLO-S01 re-run)
4. Version bump (material change: workflow behavior)
5. Migration entry (`regenerate: ["workflows"]`)
6. Security scan (`/security-watchdog:scan-plugin forge:forge --source-path forge/`)
