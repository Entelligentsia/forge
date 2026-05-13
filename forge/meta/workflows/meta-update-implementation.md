---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
audience: subagent
phase: update-impl
context:
  architecture: false
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [engineer]
  skills: [engineer, generic]
  templates: [PROGRESS_TEMPLATE]
  sub_workflows: [review_code]
  kb_docs: [architecture/stack.md]
  config_fields: [commands.test, paths.engineering]
---

# 🌱 Meta-Workflow: Update Implementation

## Purpose

Update the implementation of a task based on a "Revision Required" verdict from a review phase.

## Iron Laws

- Address every "Revision Required" item from the review artifact at the correct code location; do not paper over them with comments. If a finding is wrong, escalate rather than ignore.
- Read `.forge/personas/engineer.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
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
   - Read current implementation (code)
   - Read the review artifact (CODE_REVIEW.md or VALIDATION_REPORT.md)
   - Read the approved PLAN.md

2. Analysis:
   - Map the "Revision Required" items to specific code locations
   - Determine if the required changes necessitate a plan update

3. Implementation:
   - Apply the necessary fixes/changes
   - Verify the changes using the **resolved test command** from `commands.test` in `.forge/config.json` (i.e. `` `${commands.test}` ``, e.g. `.venv/bin/python -m pytest`). Template placeholder: {{TEST_COMMAND}}. Do NOT invoke bare `python` / `python3` — the project interpreter is rarely on `$PATH`.
   - Update PROGRESS.md with a summary of the revisions

4. Finalize:
   - Update task status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status implemented`
   - Emit the complete event via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `update_implementation.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of fix logic; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project-specific verification commands.
- **Token Reporting:** See `_fragments/finalize.md` — wire via `file_ref:`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
