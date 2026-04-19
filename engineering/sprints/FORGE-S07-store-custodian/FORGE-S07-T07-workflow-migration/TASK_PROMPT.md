# FORGE-S07-T07: Migrate all 16 meta-workflows to store custodian

**Sprint:** FORGE-S07
**Estimate:** XL
**Pipeline:** default

---

## Objective

Update all 16 meta-workflow files in `forge/meta/workflows/` to replace direct
store write instructions (telling the LLM to use Write/Edit tools on `.forge/store/`
paths) with references to the store custodian skill (`/forge:store`) or CLI
(`node "$FORGE_ROOT/tools/store-cli.cjs"`). After this task, no meta-workflow
instructs the LLM to directly write, edit, or delete JSON files in `.forge/store/`.

## Acceptance Criteria

1. All 16 meta-workflow files are updated per the replacement table below
2. `grep -r '.forge/store' forge/meta/workflows/` finds **zero** occurrences of
   direct file-path write instructions (path strings that tell the LLM to write to
   that location are removed; references that merely describe what the custodian
   writes are acceptable prose context)
3. Every event emission instruction now reads: "Emit the complete event via
   `/forge:store emit {sprintId} '{event-json}'`"
4. Every sidecar write instruction now reads: "Write the usage sidecar via
   `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`"
5. Every status update instruction now reads: "Update {entity} status via
   `/forge:store update-status {entity} {id} status {value}`"
6. Every task/sprint creation instruction now reads: "Create via
   `/forge:store write {entity} '{json}'`"
7. The sprint-plan workflow (meta-sprint-plan.md) Step 4 writes sprint and task
   records via `/forge:store write sprint ...` and `/forge:store write task ...`
8. `node --check` passes on any CJS files touched (none expected — all .md)

## Affected Files

All 16 meta-workflow files:

1. `forge/meta/workflows/meta-plan-task.md`
2. `forge/meta/workflows/meta-review-plan.md`
3. `forge/meta/workflows/meta-sprint-intake.md`
4. `forge/meta/workflows/meta-sprint-plan.md`
5. `forge/meta/workflows/meta-orchestrate.md`
6. `forge/meta/workflows/meta-retrospective.md`
7. `forge/meta/workflows/meta-fix-bug.md`
8. `forge/meta/workflows/meta-implement.md`
9. `forge/meta/workflows/meta-validate.md`
10. `forge/meta/workflows/meta-approve.md`
11. `forge/meta/workflows/meta-review-implementation.md`
12. `forge/meta/workflows/meta-commit.md`
13. `forge/meta/workflows/meta-update-implementation.md`
14. `forge/meta/workflows/meta-update-plan.md`
15. `forge/meta/workflows/meta-review-sprint-completion.md`
16. `forge/meta/workflows/meta-collate.md`

## Replacement Pattern

Read each workflow and apply these substitutions wherever applicable:

| Current instruction | Replacement |
|---------------------|-------------|
| "Emit complete event to `.forge/store/events/{sprintId}/`" | "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`" |
| "Write a sidecar file at `.forge/store/events/.../_{eventId}_usage.json`" | "Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`" |
| "Update task status to X" (implies direct file edit) | "Update task status via `/forge:store update-status task {taskId} status X`" |
| "Update bug status to X" | "Update bug status via `/forge:store update-status bug {bugId} status X`" |
| "Update sprint status to X" | "Update sprint status via `/forge:store update-status sprint {sprintId} status X`" |
| "Create task manifests for all planned tasks" | "Create each task via `/forge:store write task '{task-json}'`" |
| "Write sprint JSON to `.forge/store/sprints/`" | "Write sprint record via `/forge:store write sprint '{json}'`" |

Do not change prose context that merely names a store path for human documentation
purposes. Only change **executable instructions** that tell the LLM to write files.

## Context

Requirements R6, AC1. See `docs/requirements/store-custodian.md` Section R6 for
the full replacement table and the list of affected workflows.

The sprint-plan meta-workflow (Step 4) currently instructs writing sprint/task JSON
directly. It should be updated to use `/forge:store write sprint ...` and
`/forge:store write task ...` for each entity.

The meta-collate.md workflow Step 7 emits the plan event — update that to use the
custodian.

The meta-orchestrate.md workflow emits events for each pipeline phase — update those.

## Plugin Artifacts Involved

- `forge/meta/workflows/meta-plan-task.md`
- `forge/meta/workflows/meta-review-plan.md`
- `forge/meta/workflows/meta-sprint-intake.md`
- `forge/meta/workflows/meta-sprint-plan.md`
- `forge/meta/workflows/meta-orchestrate.md`
- `forge/meta/workflows/meta-retrospective.md`
- `forge/meta/workflows/meta-fix-bug.md`
- `forge/meta/workflows/meta-implement.md`
- `forge/meta/workflows/meta-validate.md`
- `forge/meta/workflows/meta-approve.md`
- `forge/meta/workflows/meta-review-implementation.md`
- `forge/meta/workflows/meta-commit.md`
- `forge/meta/workflows/meta-update-implementation.md`
- `forge/meta/workflows/meta-update-plan.md`
- `forge/meta/workflows/meta-review-sprint-completion.md`
- `forge/meta/workflows/meta-collate.md`

## Operational Impact

- **Version bump:** Required (included in T09)
- **Regeneration:** `workflows` — users must run `/forge:update` to get updated workflows
  in their `.forge/workflows/` directory
- **Security scan:** Required (included in T09)
