---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
audience: subagent
phase: update-plan
context:
  architecture: false
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: [PLAN_TEMPLATE]
  sub_workflows: [review_plan]
  kb_docs: [architecture/stack.md]
  config_fields: [paths.engineering]
---

# 🌱 Meta-Workflow: Update Plan

## Purpose

Update the implementation plan of a task based on a "Revision Required" verdict from the plan review phase.

## Iron Laws

- Address every numbered finding in the review artifact. Do not silently drop items; if a finding is wrong, note the reason in the revised plan rather than ignoring it.
- Read `.forge/personas/architect.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
- All store I/O via `forge_store` (or `node "$FORGE_ROOT/tools/store-cli.cjs"`). Never edit `.forge/store/*.json` directly.

## Store-Write Verification

Every `forge_store` write MUST succeed before advancing. If `store-cli` exits
non-zero or the `PreToolUse` write-boundary hook blocks the call (exit 2):

1. Parse the structured error (names the offending field + schema file).
2. Correct the JSON to satisfy the schema.
3. Retry. Repeat up to 3 times.
4. After 3 failures, halt and escalate with original payload, corrected payload, and all error messages.

Never set `FORGE_SKIP_WRITE_VALIDATION=1` — operator-only emergency switch.

## Algorithm

```
1. Load Context:
   - Read the original task prompt
   - Read the current PLAN.md
   - Read the review artifact (PLAN_REVIEW.md)

2. Analysis:
   - Review the numbered, actionable items in the review artifact
   - Determine where the plan was insufficient or incorrect

3. Revision:
   - Update PLAN.md to address all review findings
   - Ensure the revised plan remains aligned with the task prompt
   - Update the "Operational Impact" or "Testing Strategy" if the revision changed them

4. Finalize:
   - Update task status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status planned`
   - Emit the complete event (canonical shape — required fields: `eventId, taskId, sprintId, role, action, phase, iteration, startTimestamp, endTimestamp, durationMinutes, model`; see `_fragments/event-emission-schema.md`. Do NOT invent `{type:"complete", verdict, timestamp}` — that shape is rejected. Run `node "$FORGE_ROOT/tools/store-cli.cjs" describe event` if unsure) via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `update_plan.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of plan revision; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference the project's plan template.
- **Token Reporting:** See `_fragments/finalize.md` — wire via `file_ref:`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
