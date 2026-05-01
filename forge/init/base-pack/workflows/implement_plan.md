---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
audience: subagent
phase: implement
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
  kb_docs: [architecture/stack.md, architecture/routing.md]
  config_fields: [commands.test, paths.engineering]
---

# Implement Plan

## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase implement --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.
1. Load Context:
   - Read the approved PLAN.md
   - Read business domain docs relevant to the task

2. Implementation:
   - Execute plan steps incrementally
   - Perform "compile/check" after each significant change
   - Ensure all new code follows established project patterns

3. Verification:
   - Run syntax verification: {SYNTAX_CHECK}
   - Run test suite: {TEST_COMMAND}
   - Run build if frontend assets modified: {BUILD_COMMAND}

4. Documentation:
   - Write PROGRESS.md containing:
     - Summary of changes
     - Test evidence (copy of output)
     - Files changed manifest

5. Knowledge Writeback:
   - Update architecture/domain/stack-checklist if discoveries were made
   - Tag updates: `<!-- Discovered during {TASK_ID} — {date} -->`

6. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status implemented`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)

7. Emit Summary Sidecar:
   - Write `IMPLEMENTATION-SUMMARY.json` to the task directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what this implementation delivered>",
       "key_changes": ["<up to 12 bullets, 200 chars each — files changed, key decisions>"],
       "verdict":     "n/a",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"PROGRESS.md"
     }
     ```
   - Call:
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {task_id} implementation \
       engineering/sprints/{sprint}/{task}/IMPLEMENTATION-SUMMARY.json
     ```
   - If set-summary exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```
