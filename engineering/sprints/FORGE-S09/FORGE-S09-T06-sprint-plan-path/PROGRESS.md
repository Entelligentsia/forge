# PROGRESS — FORGE-S09-T06: SPRINT_PLAN.md output path in meta-sprint-plan

🌱 *Forge Engineer*

**Task:** FORGE-S09-T06
**Sprint:** FORGE-S09

---

## Summary

Fixed `forge/meta/workflows/meta-sprint-plan.md` Step 4 Documentation to replace
the bare `Generate SPRINT_PLAN.md` line with an explicit, imperative-form path
instruction: `Write SPRINT_PLAN.md to \`engineering/sprints/{sprintId}/SPRINT_PLAN.md\``.
Bumped version to 0.9.4, added migration entry targeting `workflows:architect_sprint_plan`,
ran security scan (106 files — SAFE TO USE), and updated README security table.

## Syntax Check Results

Not applicable — no JS/CJS files were modified in this task. The change is
Markdown-only (`forge/meta/workflows/meta-sprint-plan.md`).

## Store Validation Results

Not applicable — no `.schema.json` files were modified. `validate-store --dry-run`
is only required when schema files change.

## Files Changed

| File | Change |
|---|---|
| `forge/meta/workflows/meta-sprint-plan.md` | Step 4: replaced `Generate SPRINT_PLAN.md` with `Write SPRINT_PLAN.md to \`engineering/sprints/{sprintId}/SPRINT_PLAN.md\`` |
| `forge/.claude-plugin/plugin.json` | Bumped version 0.9.3 → 0.9.4 |
| `forge/migrations.json` | Added migration entry `"0.9.3"` → `"0.9.4"` with `regenerate: ["workflows:architect_sprint_plan"]` |
| `docs/security/scan-v0.9.4.md` | New security scan report for v0.9.4 |
| `README.md` | Added 0.9.4 row to Security Scan History table |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `meta-sprint-plan.md` Step 4 explicitly states output path `engineering/sprints/{sprintId}/SPRINT_PLAN.md` | 〇 Pass | Line now reads: `Write SPRINT_PLAN.md to \`engineering/sprints/{sprintId}/SPRINT_PLAN.md\`` |
| Path specification is clear and unambiguous | 〇 Pass | Imperative form with backtick path template — no prose-only mention |
| Version bumped to 0.9.4 in `forge/.claude-plugin/plugin.json` | 〇 Pass | Version field updated from 0.9.3 to 0.9.4 |
| Migration entry added for 0.9.3 → 0.9.4 with `regenerate: ["workflows:architect_sprint_plan"]` | 〇 Pass | Entry keyed at `"0.9.3"` in `forge/migrations.json` |
| Security scan report saved to `docs/security/scan-v0.9.4.md` | 〇 Pass | Full report written at that path |
| README security table updated with 0.9.4 row | 〇 Pass | New row prepended above 0.9.3 |
| `node --check` passes | 〇 Pass | N/A — no JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 Pass | N/A — no schema files modified |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.9.3 → 0.9.4)
- [x] Migration entry added to `forge/migrations.json` (`regenerate: ["workflows:architect_sprint_plan"]`)
- [x] Security scan run and report committed (`docs/security/scan-v0.9.4.md`)

## Prompt Injection Scan

The changed line `- Write SPRINT_PLAN.md to \`engineering/sprints/{sprintId}/SPRINT_PLAN.md\`` was
inspected for prompt-injection patterns. No instructions to ignore prior rules, dump env vars,
curl external URLs, or redirect behaviour were found. Change is a plain path template instruction.

## Knowledge Updates

None. No surprises were encountered during implementation. The fix was exactly as scoped in the PLAN.

## Notes

Per the PLAN_REVIEW advisory note #2: the dogfooding project's
`.forge/workflows/architect_sprint_plan.md` currently lacks a SPRINT_PLAN.md generation
step entirely. After this version bump lands and is available to users, running
`/forge:regenerate workflows:architect_sprint_plan` in the dogfooding project will update
it. This is a user action — not done here per two-layer architecture boundary.
