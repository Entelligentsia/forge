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

# Validate Task
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
   - Update task status via `/forge:store update-status task {taskId} status review-approved` (if Approved) or `/forge:store update-status task {taskId} status code-revision-required` (if Revision Required)
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)

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