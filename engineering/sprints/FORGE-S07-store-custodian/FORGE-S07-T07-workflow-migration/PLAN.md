# PLAN — FORGE-S07-T07: Migrate all 16 meta-workflows to store custodian

🌱 *Forge Engineer*

**Task:** FORGE-S07-T07
**Sprint:** FORGE-S07
**Estimate:** XL

---

## Objective

Replace every direct store-write instruction in the 16 meta-workflow files with
equivalent store-custodian invocations. After this task, no meta-workflow tells
the LLM to write, edit, or delete JSON files in `.forge/store/` directly — all
mutations go through `/forge:store` (skill) or `node "$FORGE_ROOT/tools/store-cli.cjs"` (CLI).

## Approach

Apply a systematic three-category substitution to each of the 16 meta-workflows:

1. **Event emission** — replace "Emit complete event to `.forge/store/events/...`"
   with "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"
2. **Sidecar writes** — replace "Write a sidecar file at `.forge/store/events/...`"
   with "Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`"
3. **Status updates** — replace "Update [entity] status to X"
   with "Update [entity] status via `/forge:store update-status {entity} {id} status X`"

Plus two special-case categories:
4. **Task/sprint creation** (meta-sprint-plan.md only) — replace "create task
   manifests" with "Create each task via `/forge:store write task '{task-json}'`"
   and "Set sprint status" with the custodian update-status command.
5. **Sidecar merge** (meta-orchestrate.md only) — replace the inline
   read-merge-delete pattern with `/forge:store merge-sidecar {sprintId} {eventId}`.

**Prose references** that merely describe what the custodian writes (not
instructions to the LLM) are left unchanged, per the acceptance criteria.
**Read instructions** that reference `.forge/store/` paths are also left
unchanged — the custodian provides a `read` command, but the task prompt
explicitly scopes this migration to write instructions only.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-plan-task.md` | Replace event emission, status update, and sidecar write instructions | Lines 42, 43, 57 |
| `forge/meta/workflows/meta-review-plan.md` | Replace event emission, status update, and sidecar write instructions | Lines 40, 41, 55 |
| `forge/meta/workflows/meta-sprint-intake.md` | Replace event emission, status update, and sidecar write instructions | Lines 32, 33, 47 |
| `forge/meta/workflows/meta-sprint-plan.md` | Replace event emission, status update, sidecar write, and task creation instructions | Lines 35, 40, 43, 73 |
| `forge/meta/workflows/meta-orchestrate.md` | Replace event emission, sidecar write, sidecar merge, and escalation status update instructions | Lines 118, 199, 214, 287, 323 |
| `forge/meta/workflows/meta-retrospective.md` | Replace event emission, status update, and sidecar write instructions | Lines 34, 40, 56 |
| `forge/meta/workflows/meta-fix-bug.md` | Replace event emission, bug status update, and sidecar write instructions | Lines 53, 54, 69 |
| `forge/meta/workflows/meta-implement.md` | Replace event emission, status update, and sidecar write instructions | Lines 42, 43, 57 |
| `forge/meta/workflows/meta-validate.md` | Replace event emission, status update, and sidecar write instructions | Lines 35, 36, 50 |
| `forge/meta/workflows/meta-approve.md` | Replace event emission, status update, and sidecar write instructions | Lines 35, 36, 50 |
| `forge/meta/workflows/meta-review-implementation.md` | Replace event emission, status update, and sidecar write instructions | Lines 42, 43, 57 |
| `forge/meta/workflows/meta-commit.md` | Replace event emission, status update, and sidecar write instructions | Lines 31, 35, 48 |
| `forge/meta/workflows/meta-update-implementation.md` | Replace event emission, status update, and sidecar write instructions | Lines 32, 33, 46 |
| `forge/meta/workflows/meta-update-plan.md` | Replace event emission, status update, and sidecar write instructions | Lines 32, 33, 46 |
| `forge/meta/workflows/meta-review-sprint-completion.md` | Replace event emission, status update, and sidecar write instructions | Lines 34, 35, 48 |
| `forge/meta/workflows/meta-collate.md` | Replace event emission and sidecar write instructions | Lines 30, 42 |

## Plugin Impact Assessment

- **Version bump required?** Yes — but deferred to T09 (Release Engineering). This task modifies 16 meta-workflow files in `forge/meta/`, which are material changes that alter the generated workflow behaviour for all users. The version bump, migration entry, and security scan are all included in T09.
- **Migration entry required?** Yes — deferred to T09. The `regenerate` list must include `"workflows"` so users get the updated workflows via `/forge:update`.
- **Security scan required?** Yes — deferred to T09. All `forge/` changes require a security scan.
- **Schema change?** No — no schema files are modified.

## Per-File Change Detail

### 1. meta-plan-task.md

**Algorithm block:**
- "Update task status to `planned`" becomes "Update task status via `/forge:store update-status task {taskId} status planned`"
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- "Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`." becomes "Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`"

### 2. meta-review-plan.md

**Algorithm block:**
- "Update task status (e.g., `review-approved` or `review-pending`)" becomes "Update task status via `/forge:store update-status task {taskId} status review-approved` (if Approved) or `/forge:store update-status task {taskId} status plan-revision-required` (if Revision Required)"
  (Note: `review-pending` is not a valid task status; the correct failure state after
  plan review is `plan-revision-required`.)
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction (same pattern as above)

### 3. meta-sprint-intake.md

**Algorithm block:**
- "Update sprint status to `requirements-captured`" becomes "Update sprint status via `/forge:store update-status sprint {sprintId} status planning`"
  (Note: `requirements-captured` is not a valid sprint status in the schema. The valid
  transition is to keep the sprint in `planning` during intake; it transitions to `active`
  when sprint-plan assigns tasks.)
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 4. meta-sprint-plan.md

**Algorithm block (Step 4):**
- "Update the store: create task manifests for all planned tasks" becomes "Create each task via `/forge:store write task '{task-json}'`"
- After creating all tasks: "Update the sprint record with all new task IDs via `/forge:store write sprint '{updated-sprint-json}'` (the sprint JSON must include the complete `taskIds` array with all newly created task IDs)"
- "Set sprint status to `planned`" becomes "Update sprint status via `/forge:store update-status sprint {sprintId} status active`"
  (Note: `planned` is not a valid sprint status in the schema. The valid transition
  is `planning` to `active` when the plan is complete and tasks are assigned.)
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 5. meta-orchestrate.md (most complex)

**Token Self-Reporting section (line ~118):**
- "Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`" becomes "Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`"

**Execution Algorithm (lines ~199, ~214):**
- `sidecar_path = f".forge/store/events/{sprint_id}/_{event_id}_usage.json"` — replace the inline sidecar-path computation and subsequent read-merge-delete block with: "Merge the sidecar into the canonical event via `/forge:store merge-sidecar {sprintId} {eventId}`"
- The `spawn_subagent` prompt text that tells the subagent to "write sidecar `.forge/store/events/{sprint_id}/_{event_id}_usage.json`" becomes "write the usage sidecar via `/forge:store emit {sprint_id} '{sidecar-json}' --sidecar`"

**Escalation Procedure (line ~287):**
- "Update the task store: set `status` to `escalated`" becomes "Update task status via `/forge:store update-status task {taskId} status escalated`"

**Event Emission section (line ~323):**
- "Every phase emits a structured event to `.forge/store/events/{sprintId}/`." becomes "Every phase emits a structured event via `/forge:store emit {sprintId} '{event-json}'`."

**Note:** The Pipeline Resolution section (line 68) references "Read the task manifest from `.forge/store/tasks/{TASK_ID}.json`" — this is a **read** instruction, not a write instruction. Per the acceptance criteria, read instructions are left unchanged.

### 6. meta-retrospective.md

**Algorithm block:**
- "Update sprint status to `retrospective-done`" becomes "Update sprint status via `/forge:store update-status sprint {sprintId} status retrospective-done`"
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

**Note:** The `collate.cjs --purge-events` reference is already a deterministic CLI invocation and is out of scope for this migration (it is a tool call, not a direct store write by the LLM).

### 7. meta-fix-bug.md

**Algorithm block:**
- "Update bug status to `fixed`" becomes "Update bug status via `/forge:store update-status bug {bugId} status fixed`"
- "Emit 'complete' event to `.forge/store/events/{bugId}/`" becomes "Emit the complete event via `/forge:store emit {bugId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

**Note:** The "read all events from `.forge/store/events/{bugId}/`" reference is a read instruction and is left unchanged.

### 8. meta-implement.md

**Algorithm block:**
- "Update task status to `implemented`" becomes "Update task status via `/forge:store update-status task {taskId} status implemented`"
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 9. meta-validate.md

**Algorithm block:**
- "Update task status (e.g., `validated` or `review-pending`)" becomes "Update task status via `/forge:store update-status task {taskId} status review-approved` (if Approved) or `/forge:store update-status task {taskId} status code-revision-required` (if Revision Required)"
  (Note: `validated` and `review-pending` are not valid task statuses. The correct
  success state after validation is `review-approved`; the failure state is
  `code-revision-required`.)
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 10. meta-approve.md

**Algorithm block:**
- "Update task status to `approved`" becomes "Update task status via `/forge:store update-status task {taskId} status approved`"
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 11. meta-review-implementation.md

**Algorithm block:**
- "Update task status (e.g., `review-approved` or `review-pending`)" becomes "Update task status via `/forge:store update-status task {taskId} status review-approved` (if Approved) or `/forge:store update-status task {taskId} status code-revision-required` (if Revision Required)"
  (Note: `review-pending` is not a valid task status; the correct failure state after
  code review is `code-revision-required`.)
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 12. meta-commit.md

**Algorithm block:**
- "Update task status to `committed`" becomes "Update task status via `/forge:store update-status task {taskId} status committed`"
- Remove "Update the task's `commit_hash` field in the store" — the `commit_hash`
  field does not exist in the task schema (`additionalProperties: false`), so
  writing it via the custodian would be rejected. This instruction should be
  removed from the generated workflow. If `commit_hash` tracking is needed in
  the future, it requires a separate schema change to add the field.
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 13. meta-update-implementation.md

**Algorithm block:**
- "Update task status to `implemented`" becomes "Update task status via `/forge:store update-status task {taskId} status implemented`"
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 14. meta-update-plan.md

**Algorithm block:**
- "Update task status to `planned`" becomes "Update task status via `/forge:store update-status task {taskId} status planned`"
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 15. meta-review-sprint-completion.md

**Algorithm block:**
- "Update sprint status to `review-approved`" becomes "Update sprint status via `/forge:store update-status sprint {sprintId} status completed`"
  (Note: `review-approved` is not a valid sprint status. The valid transition
  is `active` to `completed` when all tasks are committed and the sprint is
  ready for retrospective.)
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

### 16. meta-collate.md

**Algorithm block:**
- "Emit 'complete' event to `.forge/store/events/{sprintId}/`" becomes "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"

**Generation Instructions:**
- Sidecar write instruction → custodian sidecar instruction

**Note:** The "Read all sprint/task/bug/event JSONs from `.forge/store/`" reference is a read instruction and is left unchanged.

## Residual `.forge/store` References (Acceptable)

After the migration, the following `.forge/store` references will remain in the
meta-workflows. These are all **read** or **prose context** references, not write
instructions, and are acceptable per the acceptance criteria:

| File | Reference | Type |
|---|---|---|
| `meta-plan-task.md` | "Schema changes to `.forge/store/`" | Prose context |
| `meta-orchestrate.md` | "Read the task manifest from `.forge/store/tasks/`" | Read instruction |
| `meta-orchestrate.md` | "reads all context from disk... writes artifacts/status to disk" | Prose description |
| `meta-collate.md` | "Read all sprint/task/bug/event JSONs from `.forge/store/`" | Read instruction |
| `meta-fix-bug.md` | "read all events from `.forge/store/events/{bugId}/`" | Read instruction |
| `meta-fix-bug.md` | "This purges `.forge/store/events/{bugId}/` deterministically" | Prose context (describes what collate.cjs does) |
| `meta-retrospective.md` | "deletes `.forge/store/events/{sprintId}/`" | Prose context (describes what collate.cjs does) |

## Testing Strategy

- Syntax check: No JS/CJS files are modified (all changes are `.md` files), so `node --check` is not applicable.
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — no schema changes, expected to exit 0.
- Grep verification: `grep -r '.forge/store' forge/meta/workflows/` — must find zero direct file-path **write** instructions. Residual read/prose references are acceptable (see table above).
- Manual spot-check: Verify each of the 16 files contains the custodian invocations and no direct write instructions.

## Acceptance Criteria

- [ ] All 16 meta-workflow files are updated per the per-file change detail above
- [ ] `grep -r '.forge/store' forge/meta/workflows/` finds zero direct file-path write instructions (residual read/prose references are acceptable)
- [ ] Every event emission instruction reads: "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`"
- [ ] Every sidecar write instruction reads: "Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`"
- [ ] Every status update instruction reads: "Update {entity} status via `/forge:store update-status {entity} {id} status {value}`"
- [ ] Every task/sprint creation instruction reads: "Create each task via `/forge:store write task '{task-json}'`" (meta-sprint-plan.md Step 4)
- [ ] The meta-sprint-plan.md includes updating the sprint record with new task IDs via `/forge:store write sprint '{updated-sprint-json}'`
- [ ] The meta-orchestrate.md uses `/forge:store merge-sidecar` for sidecar merge instead of inline read-merge-delete
- [ ] The meta-orchestrate.md escalation procedure uses `/forge:store update-status` for status changes
- [ ] The meta-commit.md no longer includes a `commit_hash` update instruction (field not in schema)
- [ ] All status values used in custodian invocations are valid against the schema enums:
  - Sprint: `planning`, `active`, `completed`, `retrospective-done`, `blocked`, `partially-completed`, `abandoned`
  - Task: `draft`, `planned`, `plan-approved`, `implementing`, `implemented`, `review-approved`, `approved`, `committed`, `plan-revision-required`, `code-revision-required`, `blocked`, `escalated`, `abandoned`
  - Bug: `reported`, `triaged`, `in-progress`, `fixed`, `verified`
- [ ] `node --check` passes on all modified JS/CJS files (none expected)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update` after installing the next Forge version (T09's version bump). The migration entry will specify `regenerate: ["workflows"]`, so `/forge:update` will regenerate `.forge/workflows/` from the updated meta-workflows.
- **Backwards compatibility:** Fully compatible. The generated workflows will produce identical store mutations — they just route through the custodian instead of direct writes. No data format changes.