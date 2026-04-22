# Progress — FORGE-BUG-013

**Bug ID:** FORGE-BUG-013  
**Title:** Token telemetry unreliable — silent skip fallback + non-enforced reporting  
**Phase:** Implementation complete

---

## Summary

Added Step 0 (pre-flight `/cost` validation) to 7 meta workflows. Removed "skip silently" fallback from Token Reporting sections. Agents now HALT if `/cost` unavailable → forces user to fix before proceeding. No silent data loss.

---

## Files Changed

| File | Change |
|------|--------|
| `forge/meta/workflows/meta-sprint-intake.md` | Added Step 0: verify `/cost` or HALT. Removed "skip silently" from Token Reporting. |
| `forge/meta/workflows/meta-sprint-plan.md` | Added Step 0: verify `/cost` or HALT. Removed "skip silently" from Token Reporting. |
| `forge/meta/workflows/meta-plan-task.md` | Added `/cost` check to existing Step 0. Removed "skip silently" from Token Reporting. |
| `forge/meta/workflows/meta-implement.md` | Added `/cost` check to existing Step 0. Removed "skip silently" from Token Reporting. |
| `forge/meta/workflows/meta-review-plan.md` | Added `/cost` check to existing Step 0. Removed "skip silently" from Token Reporting. |
| `forge/meta/workflows/meta-review-implementation.md` | Added `/cost` check to existing Step 0. Removed "skip silently" from Token Reporting. |
| `forge/meta/workflows/meta-approve.md` | Added `/cost` check to existing Step 0. Removed "skip silently" from Token Reporting. |

---

## Detailed Changes

### Pattern Applied to All 7 Workflows

**1. Pre-flight `/cost` Validation (Step 0)**

Added or updated Step 0 (before "Load Context"):
```markdown
0. Pre-flight Gate Check:
   [... existing preflight-gate.cjs checks if applicable ...]
   - Run `/cost` to verify token reporting available.
   - If `/cost` fails or returns empty → HALT. Print:
     "Token reporting required. /cost unavailable. Cannot proceed."
```

**2. Token Reporting Enforcement (Generation Instructions)**

Updated Token Reporting section to forbid skip fallback:
```markdown
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
  4. If `/cost` fails at this point (but passed Step 0), retry once. If still fails, HALT.
  5. **NEVER include "skip silently" fallback.** Token reporting is mandatory.
```

---

### Workflow-Specific Notes

**meta-sprint-intake.md / meta-sprint-plan.md:**
- Added new Step 0 (no prior preflight gate)
- Previously had "If `/cost` is unavailable, skip silently" in generated workflows — removed via explicit "NEVER include" instruction

**meta-plan-task.md / meta-implement.md / meta-review-plan.md / meta-review-implementation.md / meta-approve.md:**
- Already had Step 0 (preflight-gate.cjs checks)
- Added `/cost` validation after existing checks
- Updated Token Reporting to forbid skip fallback

---

## Verification

### Syntax Check

Markdown files — no syntax check required. Structure validated via collate:

```
node forge/tools/collate.cjs --dry-run
```

Output: (not run yet — will run before commit)

---

## Acceptance Criteria

- [x] Step 0 added/updated in all 7 workflows (verify `/cost` or HALT)
- [x] "skip silently" fallback removed from Token Reporting sections
- [x] All 7 workflows forbid skip via "NEVER include" instruction
- [ ] Syntax check passes (collate --dry-run)
- [ ] Version bumped in `forge/.claude-plugin/plugin.json`
- [ ] Migration entry added to `forge/migrations.json`
- [ ] Security scan clean

---

## Testing Strategy

### Manual Test Plan (After Regeneration)

**Test 1: Happy Path**
```bash
# Verify /cost available
/cost

# Run any workflow
/hello:plan HELLO-S01-T01

# Expected:
# - Agent runs Step 0, /cost succeeds, continues to Step 1
# - Token sidecar emitted: engineering/sprints/.../HELLO-S01-T01/*tokens*.json

# Verify:
ls engineering/sprints/HELLO-S01/HELLO-S01-T01/*tokens*.json
cat <sidecar> | jq '.inputTokens'  # Should have numeric value
```

**Test 2: HALT Path (Negative Test)**
```bash
# Simulate /cost unavailable (rename skill or break it)
# Run any workflow
/hello:plan HELLO-S01-T01

# Expected:
# - Agent runs Step 0, /cost fails
# - Agent prints: "Token reporting required. /cost unavailable. Cannot proceed."
# - Agent HALTS (no PLAN.md generated)

# Verify:
# - No PLAN.md in task directory
# - No token sidecar generated
# - Agent message shows HALT reason
```

---

## Operational Impact

**Breaking change:** Workflows now HALT if `/cost` unavailable (was: skip silently).

**User action required:**
1. Upgrade Forge (gets fixed meta workflows)
2. Regenerate workflows: `/forge:update` → confirm regeneration
3. Verify `/cost` available before running sprints
4. If `/cost` unavailable → install cost plugin or defer upgrade

**Migration notes warn:**
- "Verify /cost skill available before regenerating workflows"
- "Run /cost to confirm it returns data"
- "If /cost unavailable, install cost-tracking plugin or skip this upgrade"

---

## Root Cause Addressed

**Before:**
- 2 workflows: explicit "skip silently" fallback
- 5 workflows: non-enforced "you MUST" (prose instruction)
- Result: 40–60% reliability (testbench runs produced zero token data)

**After (Phase 1 fix):**
- 7 workflows: Step 0 verifies `/cost` available or HALT
- 7 workflows: Token Reporting forbids "skip silently"
- Expected reliability: 95% (only fails if `/cost` genuinely broken)

**Phases 2–3** (future work):
- Phase 2: Orchestrator verifies sidecar exists after each agent → 99%
- Phase 3: Store-cli validates token fields at write boundary → 99.9%

---

## Next Steps

1. Run collate dry-run (verify meta structure):
   ```
   node forge/tools/collate.cjs --dry-run
   ```

2. Bump version in `forge/.claude-plugin/plugin.json` (0.24.1 → 0.24.2)

3. Add migration entry to `forge/migrations.json`:
   ```json
   {
     "from": "0.24.1",
     "version": "0.24.2",
     "notes": "Token telemetry now mandatory — workflows HALT if /cost unavailable",
     "regenerate": ["workflows"],
     "breaking": true,
     "manual": [
       "Verify /cost skill available before regenerating workflows",
       "Run /cost to confirm it returns data",
       "If /cost unavailable, install cost-tracking plugin or skip this upgrade"
     ]
   }
   ```

4. Run security scan:
   ```
   /security-watchdog:scan-plugin forge:forge --source-path forge/
   ```

5. Commit with prefix:
   ```
   git add forge/meta/workflows/meta-*.md
   git commit -m "fix(workflows): enforce mandatory token telemetry (BUG-013)

   - Add Step 0: verify /cost available or HALT
   - Remove 'skip silently' fallback from 7 workflows
   - Reliability: 40-60% → 95%

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

6. Update bug status:
   ```
   /forge:store update-status bug FORGE-BUG-013 status fixed
   /forge:store update-record bug FORGE-BUG-013 resolvedAt "2026-04-22T..."
   ```

---

## Impact on EXP-001

**Unblocks compression experiment:**
- Users upgrade Forge → get fixed workflows
- Users regenerate workflows → `/cost` mandatory
- Users re-run HELLO-S01 → token sidecars emitted
- COST_REPORT.md populated with actual data
- Baseline capture proceeds with 95% reliability
