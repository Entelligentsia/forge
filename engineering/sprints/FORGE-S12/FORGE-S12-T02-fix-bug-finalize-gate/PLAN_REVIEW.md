# PLAN REVIEW — FORGE-S12-T02: Fix-bug Finalize phase gate — collate must succeed before bug closes

*Forge Supervisor*

**Task:** FORGE-S12-T02

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies the gap in the fix-bug workflow: no gate prevents a bug from reaching `fixed` status without collate having produced its `INDEX.md` artifact. The proposed fix adds a declarative `finalize` phase gate to `meta-fix-bug.md` and updates the Algorithm's step 6 to run `preflight-gate.cjs --phase finalize --bug {bugId}` before the status update. This is minimal, well-scoped, and leverages the existing gate infrastructure.

## Feasibility

The approach is realistic. The `preflight-gate.cjs` tool already supports `artifact` directives and bug-scope state resolution (via `--bug`). The `meta-fix-bug.md` workflow already has phase gates for other phases (plan-fix, review-plan, implement, review-code, approve, commit), so adding a `finalize` gate follows established patterns. Two new test cases cover the success and failure paths.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — material change to distributed workflow behavior requires version bump.
- **Migration entry targets correct?** Yes — `regenerate: ["workflows"]` is correct; users need the updated fix_bug.md workflow.
- **Security scan requirement acknowledged?** Yes — `forge/` is modified.

## Security

No security risks. The change adds a declarative gate (Markdown) and two unit tests. No executable code is introduced in hooks, tools, or commands. The gate uses the existing `preflight-gate.cjs` tool with no new trust boundaries.

## Architecture Alignment

- The `finalize` phase gate follows the same pattern as all other phase gates in `meta-fix-bug.md` and `meta-orchestrate.md`.
- The `artifact` directive with `{bug}` substitution is already supported by `parse-gates.cjs` and `preflight-gate.cjs`.
- No schema changes — the gate is purely declarative in the workflow Markdown.

## Testing Strategy

Adequate. The plan specifies:
- 2 new unit tests in `preflight-gate.test.cjs` for the finalize gate
- Full test suite regression check
- Manual smoke test for the fix-bug workflow

---

## If Approved

### Advisory Notes

- The `artifact` path `{engineering}/bugs/{bug}/INDEX.md` correctly uses the `{bug}` template variable, which resolves to the bug's directory slug at runtime.
- Ensure the Algorithm step 6 update explicitly mentions exit code 2 (misconfiguration) escalation, matching the existing pattern in other phase gate checks in the workflow.
- The gate is placed after the collate call (step 6, after purging events) — this ordering is correct because collate must run first to produce the INDEX.md artifact that the gate then verifies.