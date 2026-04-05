# PLAN — FORGE-S01-T03: Orchestrator meta-workflow — subagent self-reporting and sidecar merge

**Task:** FORGE-S01-T03
**Sprint:** FORGE-S01
**Estimate:** M

---

## Objective

Update `forge/meta/workflows/meta-orchestrate.md` so that:

1. Each phase subagent is instructed to run `/cost` before returning, capture the
   token usage output, and write it as a sidecar JSON file at
   `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
2. The orchestrator's `emit_event` step is extended to check for the sidecar file
   after the subagent returns — if found, merge the five token fields into the event
   JSON and delete the sidecar; if absent, emit the event as before (graceful
   fallback, no error).
3. The Event Emission table in the meta-workflow is updated to document the new
   optional token fields.
4. The Generation Instructions section notes the sidecar merge pattern so that
   generated orchestrators include it.

The generated workflow at `.forge/workflows/orchestrate_task.md` is regenerated
from the meta-definition, so it will be updated in a subsequent `/forge:regenerate`
run (captured in T08). This task only touches the meta-definition.

## Approach

### Subagent self-reporting (additions to the meta-workflow)

After the existing Context Isolation section, add a **Token Self-Reporting** section
that instructs subagents to:

1. Run `/cost` immediately before returning.
2. Parse the output for the five fields:
   `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`,
   `estimatedCostUSD`.
3. Write a sidecar file: `.forge/store/events/{sprintId}/_{eventId}_usage.json`
   using the exact format from the acceptance criteria.
4. The sidecar filename uses a leading underscore to distinguish it from real
   event records and so that `validate-store.cjs` can skip it (consistent with the
   approach used for review verdicts — side-channel files are ephemeral and
   prefixed).

The `eventId` the subagent must use is derivable from the information already
passed in the subagent prompt (`{TASK_ID}`, role, action, and the start timestamp
recorded by the orchestrator). The prompt must include the `eventId` so the
subagent can name the sidecar correctly.

### Orchestrator sidecar merge (updated Execution Algorithm)

After `spawn_subagent()` returns, immediately before `emit_event(…, action="complete")`:

```
sidecar_path = ".forge/store/events/{sprintId}/_{eventId}_usage.json"
token_fields = {}
if file_exists(sidecar_path):
    token_fields = read_json(sidecar_path)
    delete_file(sidecar_path)
emit_event(task, phase, action="complete", extra_fields=token_fields)
```

The `emit_event` function merges any non-null fields from `token_fields` into the
event record before writing it. Missing or empty `token_fields` results in an event
without token data — this is valid per the schema (all five fields are optional).

### Prompt update

The subagent prompt must be extended from:

```
"Read `{phase.workflow}` and follow it. Task ID: {task_id}.
 Also read `engineering/MASTER_INDEX.md` for project state."
```

to:

```
"Read `{phase.workflow}` and follow it. Task ID: {task_id}.
 Also read `engineering/MASTER_INDEX.md` for project state.
 Before returning: run /cost, parse token usage, and write sidecar
 `.forge/store/events/{sprintId}/_{eventId}_usage.json`
 with fields: inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD."
```

The `eventId` is computed by the orchestrator before spawning and passed in the
prompt so the subagent can name the sidecar correctly.

### Event Emission table

Add the five optional token fields to the "Optional fields" note in the Event
Emission section of the meta-workflow.

### Generation Instructions

Add a bullet to the Generation Instructions section:

> - Include the sidecar merge pattern: after each subagent returns, check for
>   `_{eventId}_usage.json` in the events directory; if found, merge token fields
>   into the event record and delete the sidecar; if missing, emit without token
>   fields (graceful fallback).

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-orchestrate.md` | Add Token Self-Reporting section; update Execution Algorithm to include sidecar check/merge after spawn; update subagent prompt to include sidecar write instruction; update Event Emission table and Generation Instructions | Single artifact for this task per the task prompt |

## Plugin Impact Assessment

- **Version bump required?** Yes — bundled with T08 at sprint end. This task
  itself is a meta-definition change that will regenerate `orchestrate_task.md`
  in the user's project, which is a material workflow change.
- **Migration entry required?** Yes — `regenerate: ["workflows"]` so users know
  to run `/forge:regenerate` after the plugin update. Bundled with T08.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
  Bundled with T08 per the task prompt and sprint plan.
- **Schema change?** No — the five token fields were added by T01. This task
  only changes the Markdown meta-workflow.

## Testing Strategy

- Syntax check: not applicable (Markdown file only; no JS/CJS changes)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — run to
  confirm the store is still valid (no schema changes in this task)
- Manual smoke test: after implementing, inspect `forge/meta/workflows/meta-orchestrate.md`
  to verify:
  1. Sidecar write instruction appears in the subagent prompt
  2. Token Self-Reporting section is present and clear
  3. Execution Algorithm shows the sidecar check/merge step between spawn and emit_complete
  4. Event Emission table lists the optional token fields
  5. Generation Instructions bullet references the sidecar merge pattern

## Acceptance Criteria

- [ ] `forge/meta/workflows/meta-orchestrate.md` includes a Token Self-Reporting
  section instructing subagents to run `/cost`, parse output, and write
  `_{eventId}_usage.json` with the five-field format
- [ ] Subagent prompt in the Execution Algorithm includes the sidecar write instruction
  with the correct path template
- [ ] Execution Algorithm shows sidecar check and merge after `spawn_subagent()` and
  before `emit_event(…, action="complete")`
- [ ] If sidecar is found: token fields are merged into the event JSON, sidecar is deleted
- [ ] If sidecar is missing: event emitted without token fields (no error, graceful fallback)
- [ ] Event Emission table's optional fields row includes all five token fields
- [ ] Generation Instructions include a bullet about the sidecar merge pattern
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update` to get the updated plugin, then
  `/forge:regenerate` (or the `--regenerate workflows` flag during update) to
  refresh `.forge/workflows/orchestrate_task.md` in their projects.
- **Backwards compatibility:** Fully backwards-compatible. Token fields are optional
  in the event schema (T01). If a subagent does not write the sidecar (e.g. older
  subagent or `/cost` not available), the orchestrator falls back silently — existing
  events without token fields remain valid.
