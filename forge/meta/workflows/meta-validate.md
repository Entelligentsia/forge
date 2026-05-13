---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: validate
context:
  architecture: false
  prior_summaries: none
  persona: summary
  master_index: false
  diff_mode: true
deps:
  personas: [qa-engineer]
  skills: [qa-engineer, generic]
  templates: []
  sub_workflows: []
  kb_docs: [architecture/stack.md]
  config_fields: [commands.test, paths.engineering]
---

# 🍵 Meta-Workflow: Validate Task

## Purpose

The Supervisor performs a final validation of the implementation against the acceptance criteria and the technical spec.

## Iron Laws

- Validate against the acceptance criteria as written; do not soften, expand, or reinterpret them. The validator's job is to catch what the implementer optimistically considered "done".
- Read `.forge/personas/qa-engineer.md` first; print the persona identity line (emoji, name, tagline) to stdout before any other tool use.
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

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase validate --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.

1. Load Context:
   - Read task prompt
   - Read approved PLAN.md
   - Read the implementation
   - Read PROGRESS.md

2. Validation:
   - Execute the "Acceptance Criteria" checklist from the plan
   - Verify that all technical constraints (e.g., performance, security) are met
   - Check for any regressions in related functionality

3. Verdict:
   - Write VALIDATION_REPORT.md using the format:
     **Verdict:** [Approved | Revision Required]
     - If Revision Required: list the failed criteria and required fixes
     - If Approved: confirm the task is validated

4. Finalize:
   - Update task status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status review-approved` (if Approved) or `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task {taskId} status code-revision-required` (if Revision Required)
   - Emit the complete event via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)

5. Emit Summary Sidecar:
   - Write `VALIDATION-SUMMARY.json` to the task directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what acceptance criteria were validated>",
       "findings":    ["<up to 12 bullets, 200 chars each — pass/fail per criterion>"],
       "verdict":     "<approved | revision>",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"VALIDATION_REPORT.md"
     }
     ```
   - Call:
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {task_id} validation \
       engineering/sprints/{sprint}/{task}/VALIDATION-SUMMARY.json
     ```
   - If set-summary exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```

## Friction Emit
Emit `type:friction` `{workflow:validate, persona:qa-engineer, issue}` per `_fragments/friction-emit.md`.

## Generation Instructions

- **Workflow Structure:** The generated `validate_task.md` must follow the strict "Algorithm" block format.
- **Verdict Detection:** The generated workflow MUST enforce the strict `**Verdict:** [Approved | Revision Required]` format.
- **Context Isolation:** Forbid inline execution of validation tests; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project-specific validation tools or smoke tests.
- **Token Reporting:** See `_fragments/finalize.md` — wire via `file_ref:`.
- **Diff-mode:** Generated workflow MUST include the diff-first read mode instruction (see plan PLAN.md A6).
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
