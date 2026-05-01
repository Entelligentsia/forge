---
requirements:
  reasoning: High
  context: Medium
  speed: Low
audience: subagent
phase: plan
context:
  architecture: true
  prior_summaries: delta
  persona: summary
  master_index: false
  diff_mode: false
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: [PLAN_TEMPLATE, TASK_PROMPT_TEMPLATE]
  sub_workflows: [review_plan]
  kb_docs: [architecture/stack.md]
  config_fields: [commands.test, paths.engineering]
---

# Plan Task

## Algorithm

```

0. Pre-flight Gate Check:
   - Resolve FORGE_ROOT (`node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`).
   - Run: `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase plan --task {taskId}`
   - Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
   - Exit 2 (misconfiguration) → print stderr and HALT.
   - Exit 0 → continue.
1. Load Context:
   - Read task prompt (source of truth)
   - Query the store for this task and any related entities:
     ```sh
     node "$FORGE_ROOT/tools/store-cli.cjs" nlp "{taskId} with sprint with feature"
     ```
     Use store results directly if they include title, status, sprint, and excerpt.
   - Read the architecture summary from your injected context (if present).
   - Read business domain docs relevant to the task
   - Read stack checklist

2. Research:
   - Identify files for modification (Glob, Grep, Read)
   - Map existing patterns in the target area
   - Identify existing tests to be maintained or expanded
   - Identify whether the change is **material** (triggers version bump) or not:
     - Bug fixes to any command, hook, tool spec, or workflow → material
     - Tool-spec changes that alter generated tool behaviour → material
     - Command-file changes that alter behaviour → material
     - Hook changes → material
     - Schema changes to `.forge/store/` or `.forge/config.json` → material
     - Docs-only changes → NOT material

3. Plan:
   - Generate PLAN.md using the project plan template
   - Ensure inclusion of: Objective, Approach, Files to Modify, Data Model Changes, Testing Strategy, Acceptance Criteria, and Operational Impact

4. Knowledge Writeback:
   - If new patterns were discovered, update architecture or business domain docs

5. Finalize:
   - Update task status via `/forge:store update-status task {taskId} status planned`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)

6. Emit Summary Sidecar:
   - Write `PLAN-SUMMARY.json` to the task directory with the following shape:
     ```json
     {
       "objective":   "<one sentence — what this plan sets out to build>",
       "key_changes": ["<up to 12 bullets, 200 chars each>"],
       "verdict":     "n/a",
       "written_at":  "<current ISO 8601 timestamp>",
       "artifact_ref":"PLAN.md"
     }
     ```
   - Call:
     ```
     node "$FORGE_ROOT/tools/store-cli.cjs" set-summary {task_id} plan \
       engineering/sprints/{sprint}/{task}/PLAN-SUMMARY.json
     ```
   - If set-summary exits non-zero, fix the sidecar JSON and retry. Do not proceed without a valid summary.
```
