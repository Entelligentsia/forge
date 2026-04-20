# PLAN — FORGE-S12-T02: Fix-bug Finalize phase gate — collate must succeed before bug closes

*Forge Engineer*

**Task:** FORGE-S12-T02
**Sprint:** FORGE-S12
**Estimate:** S

---

## Objective

Add a Finalize phase gate to the fix-bug workflow (`meta-fix-bug.md`) that verifies `INDEX.md` exists in the bug's engineering directory before allowing the workflow to mark the bug as `fixed`. This ensures collate must succeed before a bug can close, preventing bugs from reaching resolved status without up-to-date knowledge-base artifacts.

## Approach

The fix adds a declarative `finalize` phase gate block to `meta-fix-bug.md` and updates the Finalize step in the Algorithm section to run `preflight-gate.cjs --phase finalize --bug {bugId}` before updating the bug status. The gate leverages the existing `preflight-gate.cjs` tool and the `artifact` directive to check for `{engineering}/bugs/{bug}/INDEX.md` existence. Two new tests in `preflight-gate.test.cjs` verify the gate blocks when INDEX.md is missing and passes when it exists.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-fix-bug.md` | Add finalize phase gate block; update Algorithm step 6 to run preflight gate before marking bug as fixed | Prevents bugs from closing without collate producing INDEX.md |
| `forge/tools/__tests__/preflight-gate.test.cjs` | Add 2 tests for the finalize gate (blocks when missing, passes when present) | Verify the new gate works correctly |

## Plugin Impact Assessment

- **Version bump required?** Yes — changes distributed workflow behavior (new phase gate in fix-bug workflow)
- **Migration entry required?** Yes — `regenerate: ["workflows"]` (users need updated fix_bug.md)
- **Security scan required?** Yes — changes `forge/`
- **Schema change?** No — no schema files modified

## Testing Strategy

- Syntax check: N/A — no JS/CJS executable files modified (only Markdown workflow and test file)
- Test suite: `node --test forge/tools/__tests__/preflight-gate.test.cjs` — verify 2 new tests pass
- Full test suite: `node --test forge/tools/__tests__/*.test.cjs` — verify no regressions
- Manual smoke test: Run `/forge:fix-bug` on a test project and verify the finalize gate blocks if collate did not produce INDEX.md

## Acceptance Criteria

- [ ] Running the fix-bug workflow end-to-end produces INDEX.md — Finalize gate blocks otherwise
- [ ] The Finalize gate checks for `{bugDir}/INDEX.md` existence before allowing `resolved` status
- [ ] If INDEX.md is missing, the workflow escalates rather than marking the bug as fixed
- [ ] If exit code 2 (misconfiguration), the workflow escalates immediately
- [ ] `node --test forge/tools/__tests__/preflight-gate.test.cjs` passes (including 2 new tests)
- [ ] All existing tests pass: `node --test forge/tools/__tests__/*.test.cjs`

## Operational Impact

- **Distribution:** Users must run `/forge:update` to regenerate the updated `fix_bug.md` workflow
- **Backwards compatibility:** Fully backwards-compatible — the finalize gate adds a safety check; existing workflows that already produce INDEX.md are unaffected