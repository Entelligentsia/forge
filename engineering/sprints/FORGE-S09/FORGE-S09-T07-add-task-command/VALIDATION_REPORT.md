# VALIDATION REPORT — FORGE-S09-T07: Add-task mid-sprint command

🍵 *Forge QA Engineer*

**Task:** FORGE-S09-T07

---

**Verdict:** Approved

---

## Acceptance Criteria Validation

| # | Criterion | Evidence | Result |
|---|-----------|----------|--------|
| 1 | `/forge:add-task` creates properly slotted task with store entry, directory, and TASK_PROMPT.md | `forge/commands/add-task.md` Steps 5-6: `mkdir -p`, TASK_PROMPT.md template fill, `store-cli.cjs write task` | PASS |
| 2 | Mini-intake captures requirements, acceptance criteria, and estimate | Step 2: title, objective, acceptance criteria, estimate, pipeline — all captured in interview | PASS |
| 3 | Tasks can be added to any sprint (not just current) | Step 1: `--sprint <ID>` argument + sprint selection from all active/planning sprints | PASS |
| 4 | Command assigns next sequential task ID | Step 3: reads sprint taskIds, extracts max T-number, increments by 1 | PASS |
| 5 | Sprint JSON updated with new task ID in `taskIds` | Step 7: reads sprint via store-cli, appends task ID, writes back | PASS |
| 6 | Collate runs after task addition | Step 8: `node "$FORGE_ROOT/tools/collate.cjs"` | PASS |
| 7 | `node --check` passes on all modified JS/CJS files | No JS/CJS files modified — N/A | PASS |
| 8 | Version bump to 0.9.13 | `forge/.claude-plugin/plugin.json` version = `0.9.13` | PASS |
| 9 | Migration entry added | `forge/migrations.json` has 0.9.12 → 0.9.13 entry, regenerate: ["commands"] | PASS |
| 10 | Security scan report exists | `docs/security/scan-v0.9.13.md` — SAFE TO USE | PASS |

## Edge Case Checks

- **No-npm rule:** No non-built-in `require()` calls introduced. PASS.
- **Hook exit discipline:** N/A — no hooks modified.
- **Schema `additionalProperties: false`:** N/A — no schema changes.
- **Backwards compatibility:** Fully additive. No existing commands, schemas, or workflows altered. Users on 0.9.12 can safely run `/forge:update`. PASS.

## Regression Check

- No JS/CJS files modified — syntax check N/A.
- No schema files modified — validate-store N/A.
- No regressions introduced.