# PROGRESS — FORGE-S07-T07: Migrate all 16 meta-workflows to store custodian

🌱 *Forge Engineer*

**Task:** FORGE-S07-T07
**Sprint:** FORGE-S07

---

## Summary

Replaced all direct store-write instructions in 16 meta-workflow files with
store-custodian invocations (`/forge:store emit`, `/forge:store update-status`,
`/forge:store write`, `/forge:store merge-sidecar`). Corrected three invalid
sprint status values (`requirements-captured`, `planned`, `review-approved`)
to valid schema enum values (`planning`, `active`, `completed`). Corrected
invalid task status values (`review-pending`, `validated`) to valid schema
enum values. Removed the `commit_hash` update from meta-commit.md (field not
in task schema). Added sprint `taskIds` update to meta-sprint-plan.md.

## Syntax Check Results

No JS/CJS files were modified (all changes are Markdown). Syntax check is
not applicable.

```
N/A — no .js/.cjs files modified
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (7 sprint(s), 54 task(s), 14 bug(s)).
```

## Grep Verification

```
$ grep -r '.forge/store' forge/meta/workflows/
forge/meta/workflows/meta-plan-task.md:31:     - Schema changes to `.forge/store/` or `.forge/config.json` → material
forge/meta/workflows/meta-collate.md:24:   - Read all sprint/task/bug/event JSONs from `.forge/store/`
forge/meta/workflows/meta-orchestrate.md:68:1. Read the task manifest from `.forge/store/tasks/{TASK_ID}.json`.
forge/meta/workflows/meta-orchestrate.md:199:    sidecar_path = f".forge/store/events/{sprint_id}/_{event_id}_usage.json"  # used by merge-sidecar
forge/meta/workflows/meta-fix-bug.md:41:     read all events from `.forge/store/events/{bugId}/`, aggregate
forge/meta/workflows/meta-fix-bug.md:49:     This purges `.forge/store/events/{bugId}/` deterministically.
forge/meta/workflows/meta-retrospective.md:37:     accumulated events, then deletes `.forge/store/events/{sprintId}/`.
```

All remaining references are read instructions or prose context. Zero direct
write instructions remain.

## Files Changed

| File | Change |
|---|---|
| `forge/meta/workflows/meta-plan-task.md` | Replaced event emission, status update, and sidecar write instructions with custodian invocations |
| `forge/meta/workflows/meta-review-plan.md` | Replaced event emission, status update (with correct enum values), and sidecar write instructions |
| `forge/meta/workflows/meta-sprint-intake.md` | Replaced event emission, status update (`planning` not `requirements-captured`), and sidecar write |
| `forge/meta/workflows/meta-sprint-plan.md` | Replaced event emission, status update (`active` not `planned`), sidecar write, added task creation and sprint taskIds update |
| `forge/meta/workflows/meta-orchestrate.md` | Replaced event emission, sidecar write, sidecar merge (now uses `/forge:store merge-sidecar`), escalation status update, spawn_subagent prompt |
| `forge/meta/workflows/meta-retrospective.md` | Replaced event emission, status update, and sidecar write instructions |
| `forge/meta/workflows/meta-fix-bug.md` | Replaced event emission, bug status update, and sidecar write instructions |
| `forge/meta/workflows/meta-implement.md` | Replaced event emission, status update, and sidecar write instructions |
| `forge/meta/workflows/meta-validate.md` | Replaced event emission, status update (with correct enum values `review-approved`/`code-revision-required`), and sidecar write |
| `forge/meta/workflows/meta-approve.md` | Replaced event emission, status update, and sidecar write instructions |
| `forge/meta/workflows/meta-review-implementation.md` | Replaced event emission, status update (with correct enum values), and sidecar write |
| `forge/meta/workflows/meta-commit.md` | Replaced event emission, status update, sidecar write; removed `commit_hash` instruction (not in schema) |
| `forge/meta/workflows/meta-update-implementation.md` | Replaced event emission, status update, and sidecar write instructions |
| `forge/meta/workflows/meta-update-plan.md` | Replaced event emission, status update, and sidecar write instructions |
| `forge/meta/workflows/meta-review-sprint-completion.md` | Replaced event emission, status update (`completed` not `review-approved`), and sidecar write |
| `forge/meta/workflows/meta-collate.md` | Replaced event emission and sidecar write instructions |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| All 16 meta-workflow files updated | 〇 Pass | All 16 files modified |
| `grep -r '.forge/store'` finds zero write instructions | 〇 Pass | 7 residual read/prose references only |
| Event emission uses `/forge:store emit` | 〇 Pass | All 16 files |
| Sidecar write uses `/forge:store emit --sidecar` | 〇 Pass | All 16 files |
| Status update uses `/forge:store update-status` | 〇 Pass | All relevant files, with valid enum values |
| Task creation uses `/forge:store write task` | 〇 Pass | meta-sprint-plan.md |
| Sprint taskIds update via `/forge:store write sprint` | 〇 Pass | meta-sprint-plan.md |
| meta-orchestrate.md uses `/forge:store merge-sidecar` | 〇 Pass | Execution algorithm updated |
| meta-orchestrate.md escalation uses custodian | 〇 Pass | update-status for escalated |
| meta-commit.md no `commit_hash` instruction | 〇 Pass | Removed (field not in schema) |
| All status values valid against schema | 〇 Pass | Sprint: planning/active/completed/retrospective-done; Task: planned/review-approved/implemented/approved/committed/plan-revision-required/code-revision-required/escalated; Bug: fixed |
| `node --check` passes | 〇 Pass | N/A — no JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 Pass | Clean exit |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — deferred to T09
- [ ] Migration entry added to `forge/migrations.json` — deferred to T09
- [ ] Security scan run and report committed — deferred to T09

## Knowledge Updates

None required. No new architectural patterns were discovered.

## Notes

- Three sprint status values were corrected to valid schema enums during
  implementation: `requirements-captured` -> `planning`, `planned` -> `active`,
  `review-approved` -> `completed`. This was a necessary part of the migration
  because the custodian enforces schema validation on `update-status`.
- Two task status placeholders were replaced with valid enum values:
  `review-pending` -> `plan-revision-required` or `code-revision-required`,
  `validated` -> `review-approved`.
- The `commit_hash` field does not exist in the task schema
  (`additionalProperties: false`), so the update instruction was removed from
  meta-commit.md. This should be tracked as a future feature request if
  commit-hash tracking is desired.